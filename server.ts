import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// In-memory prototype state store; production adapters should provide PostgreSQL, Redis and object storage.
import {
  INITIAL_TENANTS,
  INITIAL_BRANCHES,
  INITIAL_ASSETS,
  INITIAL_TECHNICIANS,
  INITIAL_TICKETS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INVENTORY_STOCK,
  INITIAL_INVENTORY_LEDGER,
  INITIAL_OUTBOX_EVENTS,
  INITIAL_AUDIT_LOGS,
} from './src/data/mockDatabase';

import {
  INITIAL_USER_ACCOUNTS,
  ROLE_PERMISSIONS,
  getPortalForRole,
} from './src/data/usersDatabase';

import {
  Tenant,
  Branch,
  Asset,
  Ticket,
  Technician,
  InventoryItem,
  InventoryStock,
  InventoryLedgerEntry,
  OutboxEvent,
  AuditLog,
  TenantId,
  UserSession,
  UserAccount,
  UserRole,
  Permission,
  GatePassRecord,
  FSRSubmission,
  BatteryLifecycleRecord,
} from './src/types/fsm';

// State references
let tenants: Tenant[] = [...INITIAL_TENANTS];
let branches: Branch[] = [...INITIAL_BRANCHES];
let assets: Asset[] = [...INITIAL_ASSETS];
let technicians: Technician[] = [...INITIAL_TECHNICIANS];
let tickets: Ticket[] = [...INITIAL_TICKETS];
let inventoryItems: InventoryItem[] = [...INITIAL_INVENTORY_ITEMS];
let inventoryStocks: InventoryStock[] = [...INITIAL_INVENTORY_STOCK];
let inventoryLedger: InventoryLedgerEntry[] = [...INITIAL_INVENTORY_LEDGER];
let outboxEvents: OutboxEvent[] = [...INITIAL_OUTBOX_EVENTS];
let auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let batteryLifecycleLedger: BatteryLifecycleRecord[] = [];
let gatePassRecords: GatePassRecord[] = [];
let fsrSubmissions: FSRSubmission[] = [];

// User Accounts & Active Token Store
let userAccounts: UserAccount[] = [...INITIAL_USER_ACCOUNTS];
const activeSessions: Map<string, UserSession> = new Map();

// -------------------------------------------------------------
// Cryptographic Security Utilities (PBKDF2 + HMAC-SHA256 JWT)
// -------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? crypto.randomBytes(32).toString('hex') : '');
const GATEPASS_SECRET = process.env.GATEPASS_SECRET || (process.env.NODE_ENV !== 'production' ? crypto.randomBytes(32).toString('hex') : '');
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || !GATEPASS_SECRET)) {
  throw new Error('JWT_SECRET and GATEPASS_SECRET must be configured in production.');
}

// PBKDF2 with SHA-512, 100,000 iterations for secure password hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.includes(':')) {
    // Direct match check for initial legacy seeding, then migrate to PBKDF2
    return password === storedHash;
  }
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
  } catch {
    return false;
  }
}

function validatePasswordPolicy(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 12) return 'Password must be at least 12 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return null;
}

// Cryptographically signed session token (HMAC-SHA256)
export function signJwtToken(payload: object, expiresInSec: number = 7 * 86400): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSec,
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwtToken(token: string): any | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }
    return payload;
  } catch {
    return null;
  }
}

// Initialize and hash all pre-seeded user passwords securely
userAccounts.forEach((user) => {
  if (user.passwordHash && !user.passwordHash.includes(':')) {
    user.passwordHash = hashPassword(user.passwordHash);
  }
  user.status = 'ACTIVE';
});

// Single-use Corporate Invitations Store
let enterpriseInvitations: any[] = [
  {
    invitationId: 'inv-noc-01',
    inviteCode: 'PIONEER-NOC-8821',
    email: 'dispatch.engineer@pioneersystem.com',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Power Systems HQ',
    role: 'PIONEER_DISPATCH_CONTROLLER',
    portalType: 'PIONEER_OPERATIONS',
    department: 'NOC & Spatial Dispatch Operations',
    isUsed: false,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: 'usr-superadmin-01',
  },
  {
    invitationId: 'inv-ops-02',
    inviteCode: 'PIONEER-OPS-4910',
    email: 'ops.lead@pioneersystem.com',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Power Systems HQ',
    role: 'PIONEER_OPERATIONS_MANAGER',
    portalType: 'PIONEER_OPERATIONS',
    department: 'Operations & SLA Assurance',
    isUsed: false,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: 'usr-superadmin-01',
  },
  {
    invitationId: 'inv-inv-03',
    inviteCode: 'PIONEER-INV-3372',
    email: 'spares.controller@pioneersystem.com',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Central Logistics Hub',
    role: 'PIONEER_INVENTORY_MANAGER',
    portalType: 'PIONEER_OPERATIONS',
    department: 'Central Spares Logistics',
    isUsed: false,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: 'usr-superadmin-01',
  },
  {
    invitationId: 'inv-tech-04',
    inviteCode: 'TECH-CERTIFIED-9182',
    email: 'field.lead@pioneersystem.com',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Field Services Division',
    role: 'FIELD_TECHNICIAN',
    portalType: 'TECHNICIAN_MOBILE',
    department: 'Field Engineering Force',
    isUsed: false,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: 'usr-superadmin-01',
    technicianDetails: {
      certifications: ['ELEKTRA_3.2MVA', 'UPS_PARALLEL', 'BATTERY_IMPEDANCE_LEVEL2'],
      serviceRegions: ['ISB-CAPITAL', 'RAWALPINDI-NORTH', 'LAHORE-CENTRAL'],
      phone: '+92 300 5566778',
      cnic: '35201-9988776-3',
    },
  },
];

// Helper for HMAC-SHA256 Gatepass
function createHmacToken(payload: string): string {
  return crypto.createHmac('sha256', GATEPASS_SECRET).update(payload).digest('hex');
}

// -------------------------------------------------------------
// MFA Challenge & Password Reset Challenge Stores
// -------------------------------------------------------------
interface MfaChallenge {
  userId: string;
  email: string;
  otpHash: string;
  tempToken: string;
  expiresAt: number;
  attempts: number;
  simulatedDeliveryNotice?: string;
}
const mfaChallenges = new Map<string, MfaChallenge>();

interface PasswordResetChallenge {
  challengeId: string;
  userId: string;
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
}
const passwordResetChallenges = new Map<string, PasswordResetChallenge>();

// Rate Limiting Store
interface RateLimitTracker {
  attempts: number;
  firstAttemptTime: number;
  lockedUntil?: number;
}
const loginRateLimiter = new Map<string, RateLimitTracker>();

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const tracker = loginRateLimiter.get(key);
  if (!tracker) {
    loginRateLimiter.set(key, { attempts: 1, firstAttemptTime: now });
    return { allowed: true };
  }

  if (tracker.lockedUntil && now < tracker.lockedUntil) {
    return { allowed: false, waitSeconds: Math.ceil((tracker.lockedUntil - now) / 1000) };
  }

  if (now - tracker.firstAttemptTime > windowMs) {
    loginRateLimiter.set(key, { attempts: 1, firstAttemptTime: now });
    return { allowed: true };
  }

  tracker.attempts += 1;
  if (tracker.attempts > maxAttempts) {
    tracker.lockedUntil = now + windowMs;
    return { allowed: false, waitSeconds: Math.ceil(windowMs / 1000) };
  }

  return { allowed: true };
}

function resetRateLimit(key: string) {
  loginRateLimiter.delete(key);
}

// -------------------------------------------------------------
// Authentication & Authoritative Tenant Scope Middleware
// -------------------------------------------------------------
interface AuthenticatedRequest extends Request {
  userSession?: UserSession;
  currentTenantId?: TenantId;
}

const PLATFORM_GLOBAL_ROLES: UserRole[] = ['PIONEER_SUPER_ADMIN', 'SYSTEM_ADMIN'];
const SERVICE_PROVIDER_ROLES: UserRole[] = [
  'PIONEER_OPERATIONS_MANAGER',
  'PIONEER_DISPATCH_CONTROLLER',
  'PIONEER_REGIONAL_MANAGER',
  'PIONEER_INVENTORY_MANAGER',
  'PIONEER_COMPLIANCE_AUDITOR',
  'DISPATCH_CONTROLLER',
  'COMPLIANCE_AUDITOR',
];

function allowedTenantIdsForUser(user: UserAccount): TenantId[] {
  if (PLATFORM_GLOBAL_ROLES.includes(user.role)) return tenants.map((t) => t.tenantId);
  if (SERVICE_PROVIDER_ROLES.includes(user.role)) return tenants.map((t) => t.tenantId);
  return [user.organizationId];
}

function canAccessTenant(session: UserSession, tenantId: TenantId): boolean {
  return session.allowedTenantIds.includes(tenantId);
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Corporate authentication session required. Please sign in to access this resource.',
    });
  }

  // Sessions are revocable server-side. Do not resurrect a revoked token from its signature alone.
  let session = activeSessions.get(token);

  if (session && Date.parse(session.expiresAt) <= Date.now()) {
    activeSessions.delete(token);
    session = undefined;
  }

  // Strict: If no valid signed session, reject with 401 Unauthorized (NO FALLBACK)
  if (!session) {
    return res.status(401).json({
      error: 'UNAUTHORIZED_OR_EXPIRED',
      message: 'Your session has expired or is invalid. Please sign in again.',
    });
  }

  req.userSession = session;

  // Header workspace switch is ONLY permitted if the user's allowedTenantIds contains it
  const requestedTenant = req.headers['x-tenant-id'] as TenantId;
  if (requestedTenant && session.allowedTenantIds.includes(requestedTenant)) {
    req.currentTenantId = requestedTenant;
  } else {
    req.currentTenantId = session.activeTenantId;
  }

  next();
};

// Permission Enforcement Gate
const requirePermission = (permission: Permission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const session = req.userSession;
    if (!session) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication session required.' });
    }

    if (session.role === 'PIONEER_SUPER_ADMIN' || session.role === 'SYSTEM_ADMIN') {
      return next(); // Super admin bypass
    }

    if (!session.permissions || !session.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
        message: `Action denied. Required permission: '${permission}'. Your role: '${session.role}'.`,
      });
    }

    next();
  };
};

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// 1. User Login with Email & Password (PBKDF2 Verified + Real MFA Challenge)
app.post('/api/auth/login', (req, res) => {
  const { email, password, mfaCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Corporate email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rateLimitCheck = checkRateLimit(`login:${normalizedEmail}`);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: 'TOO_MANY_ATTEMPTS',
      message: `Account locked due to consecutive failed attempts. Please retry in ${rateLimitCheck.waitSeconds} seconds.`,
    });
  }

  const user = userAccounts.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid corporate email or password.' });
  }

  if (user.isActive === false || user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'ACCOUNT_DEACTIVATED', message: 'Your corporate account has been suspended by the platform administrator.' });
  }

  // Reset rate limit on valid password
  resetRateLimit(`login:${normalizedEmail}`);

  // MFA Challenge for users with MFA enabled
  if (user.mfaEnabled && !mfaCode) {
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHmac('sha256', JWT_SECRET).update(rawOtp).digest('hex');
    const tempToken = signJwtToken({ userId: user.userId, pendingMfa: true }, 300); // 5 min temp challenge

    mfaChallenges.set(tempToken, {
      userId: user.userId,
      email: user.email,
      otpHash,
      tempToken,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      simulatedDeliveryNotice: `Corporate 2FA Token: ${rawOtp}`,
    });

    return res.json({
      mfaRequired: true,
      tempToken,
      email: user.email,
      challengeExpiryMinutes: 5,
      deliveryChannel: 'Corporate SMS / Authenticator App',
      message: 'Two-factor authentication challenge issued. Enter your time-sensitive 6-digit verification code.',
    });
  }

  // Generate cryptographically signed session JWT token
  const token = signJwtToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  const session: UserSession = {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    portalType: user.portalType,
    activeTenantId: user.organizationId,
    allowedTenantIds:
      allowedTenantIdsForUser(user),
    branchId: user.branchId,
    branchName: user.branchName,
    technicianId: user.technicianId,
    permissions: user.permissions,
    designation: user.designation,
    jwtToken: token,
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  };

  activeSessions.set(token, session);
  user.lastLoginAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Welcome back, ${user.fullName}`,
    session,
    user: {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      portalType: user.portalType,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      branchId: user.branchId,
      branchName: user.branchName,
      technicianId: user.technicianId,
      designation: user.designation,
    },
  });
});

// 2. Real MFA Challenge Verification
app.post('/api/auth/verify-mfa', (req, res) => {
  const { tempToken, mfaCode } = req.body;

  if (!tempToken || !mfaCode) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Verification token and 6-digit MFA code are required.' });
  }

  const challenge = mfaChallenges.get(tempToken);
  if (!challenge || Date.now() > challenge.expiresAt) {
    mfaChallenges.delete(tempToken);
    return res.status(401).json({ error: 'CHALLENGE_EXPIRED', message: 'MFA challenge has expired. Please sign in again.' });
  }

  if (challenge.attempts >= 3) {
    mfaChallenges.delete(tempToken);
    return res.status(403).json({ error: 'MAX_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Challenge invalidated.' });
  }

  challenge.attempts += 1;
  const providedOtpHash = crypto.createHmac('sha256', JWT_SECRET).update(mfaCode.trim()).digest('hex');

  if (providedOtpHash !== challenge.otpHash) {
    return res.status(401).json({
      error: 'INVALID_MFA_CODE',
      message: `Invalid 6-digit code. ${3 - challenge.attempts} attempts remaining.`,
    });
  }

  // Successfully verified OTP: delete challenge
  mfaChallenges.delete(tempToken);

  const user = userAccounts.find((u) => u.userId === challenge.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'INVALID_USER', message: 'User account not found or suspended.' });
  }

  const token = signJwtToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  const session: UserSession = {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    portalType: user.portalType,
    activeTenantId: user.organizationId,
    allowedTenantIds:
      allowedTenantIdsForUser(user),
    branchId: user.branchId,
    branchName: user.branchName,
    technicianId: user.technicianId,
    permissions: user.permissions,
    designation: user.designation,
    jwtToken: token,
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  };

  activeSessions.set(token, session);
  user.lastLoginAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Two-factor authentication verified successfully.',
    session,
    user,
  });
});

// 3. Bank Client Organization Onboarding (Creates brand new Tenant, Branch, and Admin account)
app.post('/api/auth/register-bank', (req, res) => {
  const {
    organizationName,
    ntnNumber,
    headOfficeAddress,
    adminFullName,
    adminEmail,
    adminPhone,
    password,
  } = req.body;

  if (!organizationName || !adminEmail || !password || !adminFullName) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Organization name, admin name, email, and password are required.' });
  }
  const passwordError = validatePasswordPolicy(password);
  if (passwordError) return res.status(400).json({ error: 'WEAK_PASSWORD', message: passwordError });

  const normalizedEmail = adminEmail.trim().toLowerCase();
  const existing = userAccounts.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'USER_EXISTS', message: 'An account with this corporate email already exists.' });
  }

  // 1. Generate unique Tenant ID and new Tenant Record
  const tenantSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 12);
  const tenantId: TenantId = `tenant-${tenantSlug}-${Date.now().toString().slice(-4)}` as TenantId;
  const tenantCode = organizationName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'BANK';

  const newTenant: Tenant = {
    tenantId,
    name: organizationName.trim(),
    code: tenantCode,
    contractType: 'COMPREHENSIVE_AMC',
    slaTier: 'FOUR_HOUR_ONSITE',
    slaResponseMinutes: 15,
    slaResolutionHours: 4,
    contactEmail: normalizedEmail,
    contactPhone: adminPhone || '+92 42 111-222-333',
    address: headOfficeAddress || 'Commercial HQ, Corporate Financial District',
    ntnNumber: ntnNumber || `NTN-${Math.floor(1000000 + Math.random() * 9000000)}`,
    activeAssetsCount: 2,
    activeTicketsCount: 0,
    complianceScore: 99.8,
    primaryContactName: adminFullName,
    portalTheme: 'NAVY_ENTERPRISE',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  tenants.push(newTenant);

  // 2. Create designated Main Branch for this new bank tenant
  const branchId = `br-${tenantCode.toLowerCase()}-01`;
  const newBranch: Branch = {
    branchId,
    tenantId,
    branchName: `${organizationName.trim()} Main Corporate Center`,
    branchCode: `${tenantCode}-001`,
    city: 'Lahore',
    address: headOfficeAddress || 'Main Commercial Boulevard, Corporate Hub',
    latitude: 31.5204,
    longitude: 74.3587,
    managerName: adminFullName,
    managerPhone: adminPhone || '+92 300 1122334',
    securityContact: 'Bank Security Desk',
    powerAssetIds: [],
    isActive: true,
    criticalityTier: 'TIER_1_HEADQUARTERS',
  };
  branches.push(newBranch);

  // 3. Create primary UPS and Battery Assets assigned to this new branch & tenant
  const upsAssetId = `ast-ups-${tenantCode.toLowerCase()}-01`;
  const batteryAssetId = `ast-bat-${tenantCode.toLowerCase()}-01`;

  const newUps: Asset = {
    assetId: upsAssetId,
    tenantId,
    branchId,
    assetType: 'UPS_SYSTEM',
    productSeries: 'Elektra-Max Industrial Modular UPS',
    manufacturer: 'Pioneer System / Elektra',
    modelNumber: 'ELK-3.2MVA-MOD',
    serialNumber: `ELK-${tenantCode}-${Math.floor(1000 + Math.random() * 9000)}`,
    capacityKva: 3200,
    ratedVoltageV: 400,
    batteryChemistry: 'VRLA_AGM',
    redundancyMode: 'N_PLUS_1',
    contractType: 'COMPREHENSIVE_AMC',
    contractSla: 'FOUR_HOUR_ONSITE',
    warrantyExpiry: new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0],
    amcExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: 'OPERATIONAL',
    installDate: new Date().toISOString().split('T')[0],
    baselineImpedanceMohm: 8.5,
    currentImpedanceMohm: 8.5,
    liveTemperatureC: 24.5,
    isActive: true,
    lastTestedAt: new Date().toISOString(),
    children: [],
  };

  const newBat: Asset = {
    assetId: batteryAssetId,
    tenantId,
    branchId,
    parentAssetId: upsAssetId,
    assetType: 'BATTERY_BANK',
    productSeries: 'Pioneer High-Rate VRLA AGM String',
    manufacturer: 'Pioneer Energy Systems',
    modelNumber: 'BAT-12V-100AH-STR',
    serialNumber: `STR-${tenantCode}-${Math.floor(1000 + Math.random() * 9000)}`,
    capacityKva: 480,
    ratedVoltageV: 480,
    batteryChemistry: 'VRLA_AGM',
    batteryAhRating: 100,
    redundancyMode: 'STANDALONE',
    contractType: 'COMPREHENSIVE_AMC',
    contractSla: 'FOUR_HOUR_ONSITE',
    warrantyExpiry: new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0],
    amcExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: 'OPERATIONAL',
    installDate: new Date().toISOString().split('T')[0],
    baselineImpedanceMohm: 8.8,
    currentImpedanceMohm: 8.8,
    liveTemperatureC: 25.0,
    isActive: true,
    lastTestedAt: new Date().toISOString(),
    children: [],
  };

  newBranch.powerAssetIds = [upsAssetId, batteryAssetId];
  assets.push(newUps, newBat);

  // 4. Create designated Admin Account
  const userId = `usr-bank-${Date.now().toString().slice(-4)}`;
  const newAccount: UserAccount = {
    userId,
    fullName: adminFullName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: 'BANK_BRANCH_MANAGER',
    portalType: 'BANK_PORTAL',
    organizationId: tenantId,
    organizationName: organizationName.trim(),
    branchId: newBranch.branchId,
    branchName: newBranch.branchName,
    phoneNumber: adminPhone,
    designation: 'Branch Operations Head',
    permissions: ROLE_PERMISSIONS['BANK_BRANCH_MANAGER'],
    status: 'ACTIVE',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  userAccounts.push(newAccount);

  const token = signJwtToken({
    userId,
    email: normalizedEmail,
    role: newAccount.role,
    organizationId: tenantId,
  });

  const session: UserSession = {
    userId,
    fullName: adminFullName,
    email: newAccount.email,
    role: newAccount.role,
    portalType: newAccount.portalType,
    activeTenantId: tenantId,
    allowedTenantIds: [tenantId],
    branchId: newBranch.branchId,
    branchName: newBranch.branchName,
    permissions: newAccount.permissions,
    designation: newAccount.designation,
    jwtToken: token,
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  };

  activeSessions.set(token, session);

  res.status(201).json({
    success: true,
    message: `Enterprise bank organization '${organizationName}' initialized with dedicated tenant scope and branch infrastructure.`,
    session,
    user: newAccount,
  });
});

// 4. Verify Single-Use Enterprise Invitation Code
app.post('/api/auth/verify-invite', (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ error: 'MISSING_CODE', message: 'Invitation code is required.' });
  }

  const invite = enterpriseInvitations.find(
    (inv) => inv.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase()
  );

  if (!invite) {
    return res.status(404).json({ error: 'INVALID_INVITATION', message: 'Invitation code not found or invalid.' });
  }

  if (invite.isUsed) {
    return res.status(410).json({ error: 'INVITATION_ALREADY_USED', message: 'This invitation code has already been redeemed.' });
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: 'INVITATION_EXPIRED', message: 'This invitation token has expired.' });
  }

  res.json({
    isValid: true,
    email: invite.email,
    role: invite.role,
    organizationName: invite.organizationName,
    department: invite.department,
    expiresAt: invite.expiresAt,
  });
});

// 5. Redeem Enterprise Invitation (Authoritative Role & Organization Assignment)
app.post('/api/auth/redeem-invite', (req, res) => {
  const { inviteCode, fullName, password, phone, cnicNumber } = req.body;
  const passwordError = validatePasswordPolicy(password);
  if (passwordError) return res.status(400).json({ error: 'WEAK_PASSWORD', message: passwordError });

  if (!inviteCode || !fullName || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Invitation code, full name, and password are required.' });
  }

  const invite = enterpriseInvitations.find(
    (inv) => inv.inviteCode.toUpperCase() === inviteCode.trim().toUpperCase()
  );

  if (!invite || invite.isUsed || new Date(invite.expiresAt).getTime() < Date.now()) {
    return res.status(403).json({
      error: 'INVALID_OR_EXPIRED_INVITATION',
      message: 'Invalid, used, or expired enterprise invitation code.',
    });
  }

  const existing = userAccounts.find((u) => u.email.toLowerCase() === invite.email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'USER_EXISTS', message: 'An account with this invitation email already exists.' });
  }

  const userId = `usr-${invite.role.toLowerCase().slice(0, 8)}-${Date.now().toString().slice(-4)}`;
  let technicianId: string | undefined;

  // If this invitation is for a Field Technician, create corresponding technician operational record
  if (invite.role === 'FIELD_TECHNICIAN') {
    technicianId = `tech-${Date.now().toString().slice(-3)}`;
    technicians.push({
      technicianId,
      tenantId: 'tenant-pioneer-004',
      fullName,
      email: invite.email.toLowerCase(),
      phone: phone || invite.technicianDetails?.phone || '+92 300 0000000',
      primaryPhone: phone || invite.technicianDetails?.phone || '+92 300 0000000',
      cnicOrIdNumber: cnicNumber || invite.technicianDetails?.cnic || '35202-0000000-0',
      currentLatitude: 31.5204,
      currentLongitude: 74.3587,
      lastKnownLocation: {
        latitude: 31.5204,
        longitude: 74.3587,
        updatedAt: new Date().toISOString(),
        gpsAccuracyMeters: 4.5,
      },
      isOnline: true,
      isSuspended: false,
      activeTicketsCount: 0,
      maxTicketCapacity: 3,
      certifications: invite.technicianDetails?.certifications || ['ELEKTRA_3.2MVA', 'UPS_SYSTEM', 'BATTERY_BANK'],
      skills: ['UPS_PARALLEL_SYSTEMS', 'BATTERY_IMPEDANCE_TESTING', 'SNMP_MODBUS_INTEGRATION'],
      serviceRegions: invite.technicianDetails?.serviceRegions || ['ISB-CAPITAL', 'RAWALPINDI-NORTH', 'LAHORE-CENTRAL'],
      ratingScore: 5.0,
      vanStockLevel: 'HEALTHY',
      vanInventory: [
        {
          itemId: 'item-bat-01',
          itemName: 'Pioneer 12V 100Ah VRLA AGM Battery Cell',
          partNumber: 'BAT-12V-100AH',
          quantityAvailable: 4,
          quantityReserved: 0,
        },
      ],
    });
  }

  // Pre-assigned role from invitation record (User CANNOT choose or escalate their role)
  const newAccount: UserAccount = {
    userId,
    fullName,
    email: invite.email.toLowerCase(),
    passwordHash: hashPassword(password),
    role: invite.role,
    portalType: invite.portalType,
    organizationId: invite.organizationId,
    organizationName: invite.organizationName,
    technicianId,
    phoneNumber: phone,
    cnicNumber,
    designation: invite.department || 'Enterprise Power Engineer',
    permissions: ROLE_PERMISSIONS[invite.role] || ROLE_PERMISSIONS['PIONEER_DISPATCH_CONTROLLER'],
    status: 'ACTIVE',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  userAccounts.push(newAccount);

  invite.isUsed = true;
  invite.usedAt = new Date().toISOString();
  invite.usedByUserId = userId;

  const token = signJwtToken({
    userId,
    email: newAccount.email,
    role: newAccount.role,
    organizationId: newAccount.organizationId,
  });

  const session: UserSession = {
    userId,
    fullName: newAccount.fullName,
    email: newAccount.email,
    role: newAccount.role,
    portalType: newAccount.portalType,
    activeTenantId: newAccount.organizationId,
    allowedTenantIds:
      newAccount.role.startsWith('PIONEER_') ||
      newAccount.role.startsWith('FIELD_') ||
      newAccount.role === 'SYSTEM_ADMIN' ||
      newAccount.role === 'DISPATCH_CONTROLLER'
        ? ['tenant-hbl-001', 'tenant-scb-002', 'tenant-citi-003', 'tenant-pioneer-004', ...tenants.map(t => t.tenantId)]
        : [newAccount.organizationId],
    technicianId,
    permissions: newAccount.permissions,
    designation: newAccount.designation,
    jwtToken: token,
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  };

  activeSessions.set(token, session);

  res.status(201).json({
    success: true,
    message: `Enterprise invitation redeemed successfully. Role '${invite.role}' authorized.`,
    session,
    user: newAccount,
  });
});

// 6. Generate New Enterprise Invitation (Requires users:invite permission + Role Escalation Prevention)
app.post('/api/auth/create-invitation', authMiddleware, requirePermission('users:invite'), (req: AuthenticatedRequest, res) => {
  const { email, role, department, certifications, serviceRegions } = req.body;
  const session = req.userSession!;

  if (!email || !role) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Target email and role are required to issue an invitation.' });
  }

  // Prevent role escalation and cross-tenant invitation creation.
  if (session.role !== 'PIONEER_SUPER_ADMIN' && session.role !== 'SYSTEM_ADMIN') {
    const bankInviteRoles: UserRole[] = ['BANK_BRANCH_USER', 'BANK_SECURITY_OFFICER'];
    const serviceProviderInviteRoles: UserRole[] = ['FIELD_TECHNICIAN', 'PIONEER_DISPATCH_CONTROLLER', 'PIONEER_INVENTORY_MANAGER'];
    const allowedInviteRoles = session.role.startsWith('BANK_') ? bankInviteRoles : serviceProviderInviteRoles;
    if (!allowedInviteRoles.includes(role as UserRole)) {
      return res.status(403).json({
        error: 'ROLE_ESCALATION_BLOCKED',
        message: 'Your administrative tier cannot issue this role invitation.',
      });
    }
  }

  const targetTenant = tenants.find((t) => t.tenantId === session.activeTenantId);
  if (!targetTenant) return res.status(400).json({ error: 'TENANT_NOT_FOUND', message: 'Active tenant context is invalid.' });

  const prefix = role.includes('TECH') ? 'TECH-CERT' : role.includes('NOC') ? 'PIONEER-NOC' : role.includes('BANK_') ? 'BANK-USER' : 'PIONEER-INV';
  const inviteCode = `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const invitationId = `inv-${Date.now()}`;

  const newInvitation = {
    invitationId,
    inviteCode,
    email: email.trim().toLowerCase(),
    organizationId: session.activeTenantId,
    organizationName: targetTenant.name,
    role: role as UserRole,
    portalType: getPortalForRole(role as UserRole),
    department: department || 'Field Operations Division',
    isUsed: false,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: session.userId,
    technicianDetails: role === 'FIELD_TECHNICIAN' ? {
      certifications: certifications || ['ELEKTRA_3.2MVA', 'UPS_SYSTEM'],
      serviceRegions: serviceRegions || ['ISB-CAPITAL', 'LAHORE-CENTRAL'],
    } : undefined,
  };

  enterpriseInvitations.unshift(newInvitation);

  res.status(201).json({
    success: true,
    message: `Invitation issued for ${email}. Single-use code: ${inviteCode}`,
    invitation: newInvitation,
  });
});

// 7. Request Password Reset (Out-of-band delivery simulation: DOES NOT expose raw token in response)
app.post('/api/auth/request-password-reset', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'MISSING_EMAIL', message: 'Email address is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resetRate = checkRateLimit(`reset:${normalizedEmail}`, 3, 15 * 60 * 1000);
  if (!resetRate.allowed) return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS', message: 'Too many reset requests. Please try again later.' });
  const user = userAccounts.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (user) {
    const rawResetCode = crypto.randomInt(100000, 999999).toString();
    const codeHash = crypto.createHmac('sha256', JWT_SECRET).update(rawResetCode).digest('hex');
    const challengeId = `rst-${Date.now()}`;

    passwordResetChallenges.set(challengeId, {
      challengeId,
      userId: user.userId,
      email: user.email,
      codeHash,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 min expiry
      attempts: 0,
      used: false,
    });
  }

  // Consistent message returned without exposing token (prevents email enumeration & bypass)
  res.json({
    success: true,
    message: 'If this corporate email exists in our system, password reset instructions and challenge token have been dispatched.',
  });
});

// 8. Complete Password Reset
app.post('/api/auth/reset-password', (req, res) => {
  const { email, resetCode, newPassword } = req.body;
  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Corporate email, 6-digit reset code, and new password are required.' });
  }
  const passwordError = validatePasswordPolicy(newPassword);
  if (passwordError) return res.status(400).json({ error: 'WEAK_PASSWORD', message: passwordError });

  const normalizedEmail = email.trim().toLowerCase();
  const providedHash = crypto.createHmac('sha256', JWT_SECRET).update(resetCode.trim()).digest('hex');

  let validChallenge: PasswordResetChallenge | null = null;
  let validChallengeKey: string | null = null;

  for (const [key, challenge] of passwordResetChallenges.entries()) {
    if (challenge.email.toLowerCase() === normalizedEmail && !challenge.used && Date.now() <= challenge.expiresAt) {
      if (challenge.codeHash === providedHash) {
        validChallenge = challenge;
        validChallengeKey = key;
        break;
      } else {
        challenge.attempts += 1;
        if (challenge.attempts >= 3) {
          passwordResetChallenges.delete(key);
        }
      }
    }
  }

  if (!validChallenge || !validChallengeKey) {
    return res.status(401).json({ error: 'INVALID_RESET_CODE', message: 'Invalid or expired password reset challenge code.' });
  }

  const user = userAccounts.find((u) => u.userId === validChallenge!.userId);
  if (!user) {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User account not found.' });
  }

  user.passwordHash = hashPassword(newPassword);
  validChallenge.used = true;
  passwordResetChallenges.delete(validChallengeKey);
  resetRateLimit(`reset:${normalizedEmail}`);

  // Revoke all existing sessions for this user
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === user.userId) {
      activeSessions.delete(token);
    }
  }

  res.json({
    success: true,
    message: 'Password reset successfully. Please sign in with your new corporate credentials.',
  });
});

// 9. Current Session Check
app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({
    session: req.userSession,
    userAccount: userAccounts.find((u) => u.userId === req.userSession?.userId),
    activeTenant: tenants.find((t) => t.tenantId === req.currentTenantId),
  });
});

// 10. Demo Accounts List (disabled in production; never exposes invitations or credentials)
app.get('/api/auth/demo-accounts', (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_MODE !== 'true') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  const safeProfiles = userAccounts.map((u) => ({
    userId: u.userId,
    fullName: u.fullName,
    role: u.role,
    portalType: u.portalType,
    organizationName: u.organizationName,
    branchName: u.branchName,
    designation: u.designation,
  }));
  res.json({ demoAccounts: safeProfiles });
});

// 11. Logout Endpoint (Session Revocation)
app.post('/api/auth/logout', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.userSession?.jwtToken) {
    activeSessions.delete(req.userSession.jwtToken);
  }
  res.json({ success: true, message: 'Logged out successfully. Cryptographic session revoked.' });
});

// -------------------------------------------------------------
// Operational API Endpoints (Protected by RBAC & Tenant RLS)
// -------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'opsgrid-cloud-fsm', timestamp: new Date().toISOString() });
});

app.get('/api/health/details', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;
  if (!PLATFORM_GLOBAL_ROLES.includes(session.role)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  res.json({
    status: 'healthy',
    version: '1.0.0',
    isolationMode: 'TENANT_SCOPED',
    tenantCount: tenants.length,
    activeTickets: tickets.filter(t => t.status !== 'VERIFIED_CLOSED').length,
    activeSessionsCount: activeSessions.size,
    serverTimestamp: new Date().toISOString(),
  });
});

// Tenants List (Scoped by user's permitted organizations)
app.get('/api/tenants', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;
  const allowed = tenants.filter(t => session.allowedTenantIds.includes(t.tenantId));
  res.json({ tenants: allowed });
});

// Branches (Scoped by Tenant and BranchId for branch users)
app.get('/api/branches', authMiddleware, (req: AuthenticatedRequest, res) => {
  const tenantId = req.currentTenantId!;
  const session = req.userSession!;

  let tenantBranches = branches.filter(b => b.tenantId === tenantId && b.isActive);

  if (session.branchId && (session.role === 'BANK_BRANCH_MANAGER' || session.role === 'BANK_BRANCH_USER' || session.role === 'BANK_SECURITY_OFFICER')) {
    tenantBranches = tenantBranches.filter(b => b.branchId === session.branchId);
  }

  res.json({ branches: tenantBranches });
});

// Assets Tree (Scoped by Tenant & Branch)
app.get('/api/assets', authMiddleware, (req: AuthenticatedRequest, res) => {
  const tenantId = req.currentTenantId!;
  const session = req.userSession!;

  let tenantAssets = assets.filter(a => a.tenantId === tenantId && a.isActive);

  if (session.branchId && (session.role === 'BANK_BRANCH_MANAGER' || session.role === 'BANK_BRANCH_USER' || session.role === 'BANK_SECURITY_OFFICER')) {
    tenantAssets = tenantAssets.filter(a => a.branchId === session.branchId);
  }

  res.json({ assets: tenantAssets });
});

// Tickets API (Role & Scope Protected)
app.get('/api/tickets', authMiddleware, (req: AuthenticatedRequest, res) => {
  const tenantId = req.currentTenantId!;
  const session = req.userSession!;

  let tenantTickets = tickets.filter(t => t.tenantId === tenantId);

  if (session.technicianId && session.role === 'FIELD_TECHNICIAN') {
    tenantTickets = tickets.filter(t => t.assignedTechnicianId === session.technicianId);
  } else if (session.branchId && (session.role === 'BANK_BRANCH_MANAGER' || session.role === 'BANK_BRANCH_USER' || session.role === 'BANK_SECURITY_OFFICER')) {
    tenantTickets = tenantTickets.filter(t => t.branchId === session.branchId);
  }

  res.json({ tickets: tenantTickets });
});

// Create Urgent Ticket (Requires tickets:create + Branch Scope Enforcement + Deduplication)
app.post('/api/tickets/create', authMiddleware, requirePermission('tickets:create'), (req: AuthenticatedRequest, res) => {
  const { branchId, assetId, priority, issueSummary, serviceType } = req.body;
  const session = req.userSession!;
  const tenantId = req.currentTenantId || session.activeTenantId;

  // Enforce branch scope for bank users
  const targetBranchId = session.branchId && session.role.startsWith('BANK_')
    ? session.branchId
    : branchId || session.branchId || branches.find(b => b.tenantId === tenantId)?.branchId || 'br-hbl-01';

  // Validate asset belongs to the branch
  const targetAsset = assets.find(a => a.assetId === assetId && a.tenantId === tenantId);
  const targetAssetId = targetAsset ? targetAsset.assetId : assets.find(a => a.branchId === targetBranchId)?.assetId || 'ast-ups-01';

  // Deduplication Check: if open critical incident already exists for same asset & branch, return it
  const existingOpenTicket = tickets.find(
    t => t.tenantId === tenantId &&
         t.branchId === targetBranchId &&
         t.assetId === targetAssetId &&
         t.status !== 'COMPLETED' &&
         t.status !== 'VERIFIED_CLOSED'
  );

  if (existingOpenTicket) {
    return res.status(200).json({
      success: true,
      deduplicated: true,
      ticket: existingOpenTicket,
      message: `Active service ticket #${existingOpenTicket.ticketNumber} already in progress for this asset. Escalation recorded.`,
    });
  }

  const newTicketId = `tkt-${Date.now().toString().slice(-4)}`;
  const now = new Date();
  const dispatchDeadline = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const customerDeadline = new Date(now.getTime() + (priority === 'CRITICAL' ? 4 : 24) * 3600 * 1000).toISOString();

  const newTicket: Ticket = {
    ticketId: newTicketId,
    ticketNumber: `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    tenantId,
    branchId: targetBranchId,
    assetId: targetAssetId,
    serviceType: serviceType || 'EMERGENCY_BREAKDOWN',
    priority: priority || 'HIGH',
    status: 'NEW',
    issueSummary: issueSummary || 'Critical power incident reported by authorized branch officer.',
    contractType: 'COMPREHENSIVE_AMC',
    contractSla: 'FOUR_HOUR_ONSITE',
    isCoveredUnderAmc: true,
    internalDispatchTargetMinutes: 5,
    dispatchSlaDeadline: dispatchDeadline,
    customerSlaDeadline: customerDeadline,
    assignedTechnicianId: null,
    idempotencyKey: `idem-${Date.now()}`,
    createdAt: now.toISOString(),
    pauseIntervals: [],
    reservedParts: [],
  };

  tickets.unshift(newTicket);

  outboxEvents.unshift({
    eventId: `evt-${Date.now()}`,
    tenantId: newTicket.tenantId,
    aggregateType: 'TICKET',
    aggregateId: newTicketId,
    eventType: 'TICKET_CREATED_BY_CUSTOMER',
    payload: {
      ticketNumber: newTicket.ticketNumber,
      createdBy: session.fullName,
      role: session.role,
    },
    status: 'PENDING',
    retryCount: 0,
    idempotencyKey: `idem-create-${newTicketId}`,
    createdAt: now.toISOString(),
  });

  res.status(201).json({ success: true, ticket: newTicket });
});

// Technicians API (Role Scoped: Bank users only see their assigned technicians)
app.get('/api/technicians', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;
  
  if (session.role.startsWith('BANK_') && session.role !== 'BANK_SECURITY_OFFICER') {
    const activeAssignedTechIds = tickets.filter(t => t.tenantId === req.currentTenantId && t.assignedTechnicianId).map(t => t.assignedTechnicianId);
    const sanitizedTechs = technicians.filter(t => activeAssignedTechIds.includes(t.technicianId)).map(t => ({
      technicianId: t.technicianId,
      fullName: t.fullName,
      primaryPhone: t.primaryPhone,
      skills: t.skills,
      ratingScore: t.ratingScore,
      lastKnownLocation: t.lastKnownLocation,
    }));
    return res.json({ technicians: sanitizedTechs });
  }

  if (session.role === 'FIELD_TECHNICIAN') {
    const selfOnly = technicians.filter(t => t.technicianId === session.technicianId);
    return res.json({ technicians: selfOnly });
  }

  res.json({ technicians });
});

// Intelligent Dispatch Assignment (Requires tickets:assign + Multi-tenant checks)
app.post('/api/dispatch/smart-assign', authMiddleware, requirePermission('tickets:assign'), (req: AuthenticatedRequest, res) => {
  const { ticketId, technicianId, selectedPartIds } = req.body;
  const session = req.userSession!;

  const ticket = tickets.find(t => t.ticketId === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: `Ticket ${ticketId} not found.` });
  }

  // Cross-tenant verification
  if (!canAccessTenant(session, ticket.tenantId) || ticket.tenantId !== req.currentTenantId) {
    return res.status(403).json({ error: 'CROSS_TENANT_VIOLATION', message: 'You cannot dispatch for a tenant outside your authorization.' });
  }

  const tech = technicians.find(t => t.technicianId === technicianId);
  if (!tech) {
    return res.status(404).json({ error: 'TECH_NOT_FOUND', message: `Technician ${technicianId} not found.` });
  }

  if (tech.isSuspended) {
    return res.status(400).json({ error: 'TECH_SUSPENDED', message: `Technician ${tech.fullName} is suspended.` });
  }

  const reservedItems: string[] = selectedPartIds || ticket.reservedParts || [];
  for (const itemId of reservedItems) {
    const vanItem = tech.vanInventory.find(v => v.itemId === itemId);
    if (vanItem && vanItem.quantityAvailable > 0) {
      vanItem.quantityAvailable -= 1;
      vanItem.quantityReserved += 1;

      inventoryLedger.unshift({
        ledgerId: `ledg-${Date.now()}-${itemId}`,
        tenantId: ticket.tenantId,
        itemId: itemId,
        itemName: vanItem.itemName,
        sourceType: 'TECH_VAN',
        sourceId: tech.technicianId,
        destinationType: 'BRANCH_SITE',
        destinationId: ticket.branchId,
        transactionType: 'RESERVATION',
        quantity: 1,
        referenceTicketId: ticket.ticketId,
        recordedAt: new Date().toISOString(),
        operatorUserId: req.userSession?.userId || 'system',
      });
    }
  }

  ticket.status = 'TRAVELING';
  ticket.assignedTechnicianId = tech.technicianId;
  ticket.assignedAt = new Date().toISOString();
  ticket.reservedParts = reservedItems;
  tech.activeTicketsCount += 1;

  const nonce = crypto.randomBytes(8).toString('hex');
  const validUntil = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
  const tokenPayload = `${ticket.ticketId}:${tech.technicianId}:${ticket.branchId}:${validUntil}:${nonce}`;
  const hmacSig = createHmacToken(tokenPayload);
  const gatePassToken = Buffer.from(`${tokenPayload}:${hmacSig}`).toString('base64');

  ticket.gatePassToken = gatePassToken;

  gatePassRecords.unshift({
    gatePassId: `gp-${Date.now()}`,
    token: gatePassToken,
    ticketId: ticket.ticketId,
    tenantId: ticket.tenantId,
    branchId: ticket.branchId,
    technicianId: tech.technicianId,
    technicianCnicOrId: tech.cnicOrIdNumber || '35202-9845123-5',
    technicianName: tech.fullName,
    purpose: `Critical FSM Power Restoration: ${ticket.serviceType}`,
    validFrom: new Date().toISOString(),
    validUntil,
    nonce,
    hmacSignature: hmacSig,
    status: 'ISSUED',
  });

  outboxEvents.unshift({
    eventId: `evt-dispatch-${Date.now()}`,
    tenantId: ticket.tenantId,
    aggregateType: 'TICKET',
    aggregateId: ticket.ticketId,
    eventType: 'TECHNICIAN_DISPATCHED',
    payload: { ticketId: ticket.ticketId, technicianId: tech.technicianId, gatePassIssued: true },
    status: 'PENDING',
    retryCount: 0,
    idempotencyKey: `idemp-disp-${ticket.ticketId}`,
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, ticket, technician: tech, gatePassToken });
});

// Gate Pass Verification (Requires gatepass:approve_entry or gatepass:scan + Station Scope)
app.post('/api/gatepass/verify', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;

  // Verify permission: allows gatepass:approve_entry OR gatepass:scan
  const hasPerm = session.permissions?.includes('gatepass:approve_entry') ||
                  session.permissions?.includes('gatepass:scan') ||
                  session.role === 'PIONEER_SUPER_ADMIN' ||
                  session.role === 'SYSTEM_ADMIN';

  if (!hasPerm) {
    return res.status(403).json({ error: 'FORBIDDEN', reason: 'Insufficient permissions for security gate pass verification.' });
  }

  const { token, officerName, action } = req.body;

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 6) {
      return res.status(400).json({ isValid: false, reason: 'Malformed QR gate pass format.' });
    }

    const [ticketId, techId, tokenBranchId, validUntilStr, nonce, hmacSignature] = parts;
    const validUntilMs = new Date(validUntilStr).getTime();

    if (Date.now() > validUntilMs) {
      return res.status(400).json({ isValid: false, isExpired: true, reason: 'Gate pass has expired.' });
    }

    const payload = `${ticketId}:${techId}:${tokenBranchId}:${validUntilStr}:${nonce}`;
    const expectedSig = createHmacToken(payload);
    if (hmacSignature !== expectedSig) {
      return res.status(401).json({ isValid: false, reason: 'Cryptographic HMAC mismatch. Token is counterfeit or tampered.' });
    }

    // Station Branch Scope Check: Security Guard cannot approve pass for a different branch
    if (session.branchId && session.role === 'BANK_SECURITY_OFFICER' && session.branchId !== tokenBranchId) {
      return res.status(403).json({
        isValid: false,
        reason: `Station Mismatch: This gate pass is issued for Branch '${tokenBranchId}', but your security kiosk is assigned to '${session.branchId}'.`,
      });
    }

    const ticket = tickets.find(t => t.ticketId === ticketId);
    const tech = technicians.find(t => t.technicianId === techId);

    if (action === 'ALLOW_ENTRY') {
      if (ticket) {
        ticket.status = 'IN_PROGRESS';
        ticket.securityCheckedInAt = new Date().toISOString();
        ticket.gatePassVerifiedAt = new Date().toISOString();
      }
      
      const record = gatePassRecords.find(g => g.ticketId === ticketId);
      if (record) {
        record.status = 'CHECKED_IN';
      }

      auditLogs.unshift({
        logId: `log-sec-${Date.now()}`,
        tenantId: ticket?.tenantId || session.activeTenantId,
        actorId: session.userId,
        actorRole: session.role,
        userSessionId: `sess-${session.userId}`,
        deviceId: 'BANK-SECURITY-KIOSK',
        requestId: `req-${Date.now()}`,
        correlationId: `gatepass-${ticketId}`,
        actionEvent: 'GATEPASS_SECURITY_ENTRY_APPROVED',
        entityType: 'GATEPASS',
        entityId: ticketId,
        oldValues: { status: 'ISSUED' },
        newValues: { status: 'CHECKED_IN', officer: officerName || session.fullName },
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Security-Kiosk/1.0',
        reason: 'Bank Security Officer verified technician biometric/CNIC credentials and cryptographic HMAC gate pass.',
        createdAt: new Date().toISOString(),
      });
    }

    res.json({
      isValid: true,
      ticketId,
      techId,
      technicianName: tech?.fullName || 'Certified Pioneer Engineer',
      technicianCnic: tech?.cnicOrIdNumber || '35202-9845123-5',
      branchId: tokenBranchId,
      validUntil: validUntilStr,
      verifiedAt: new Date().toISOString(),
      officerName: officerName || session.fullName,
    });
  } catch {
    res.status(400).json({ isValid: false, reason: 'Failed to parse gate pass QR token.' });
  }
});

// FSR Submission by Technician (Sets status to PENDING_CUSTOMER_VERIFICATION, does not mark completed yet!)
app.post('/api/fsr/submit', authMiddleware, requirePermission('fsr:create'), (req: AuthenticatedRequest, res) => {
  const { ticketId, technicianId, assetType, serviceType, formData, evidenceIds } = req.body;
  const session = req.userSession!;

  const ticket = tickets.find(t => t.ticketId === ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
  }

  // Cross-technician submission prevention
  const effectiveTechId = session.role === 'FIELD_TECHNICIAN' && session.technicianId
    ? session.technicianId
    : technicianId || session.technicianId || 'tech-01';

  const hashPayload = JSON.stringify({ ticketId, technicianId: effectiveTechId, formData, evidenceIds, timestamp: Date.now() });
  const digitalHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  const fsrId = `fsr-${Date.now()}`;
  const submission: FSRSubmission = {
    fsrId,
    ticketId,
    tenantId: ticket.tenantId,
    technicianId: effectiveTechId,
    assetType,
    serviceType,
    lifecycleStatus: 'CUSTOMER_PENDING',
    syncStatus: 'SYNCED',
    formData,
    evidenceIds: evidenceIds || [],
    clientUpdatedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    customerSigneeName: 'Pending Customer Verification',
    customerSigneeTitle: 'Branch Operations Signee',
    isVerified: false,
    signedDigitalHash: digitalHash,
  };

  fsrSubmissions.unshift(submission);

  // Ticket transitions to PENDING_CUSTOMER_VERIFICATION
  ticket.status = 'PENDING_CUSTOMER_VERIFICATION';
  ticket.resolvedAt = new Date().toISOString();
  ticket.fsrRecordId = fsrId;

  outboxEvents.unshift({
    eventId: `evt-fsr-${Date.now()}`,
    tenantId: ticket.tenantId,
    aggregateType: 'FSR',
    aggregateId: fsrId,
    eventType: 'FSR_SUBMITTED_AWAITING_CUSTOMER_VERIFICATION',
    payload: { fsrId, ticketId, digitalHash, technicianId: effectiveTechId },
    status: 'PENDING',
    retryCount: 0,
    idempotencyKey: `idemp-fsr-${fsrId}`,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Field Service Report submitted. Awaiting client branch manager verification & sign-off.',
    fsr: submission,
    ticket,
  });
});

// Customer FSR Verification (Authorized Bank Manager / Compliance Officer Sign-off)
app.post('/api/fsr/verify-customer', authMiddleware, requirePermission('fsr:verify'), (req: AuthenticatedRequest, res) => {
  const { fsrId, customerSigneeName, customerSigneeTitle, customerComments } = req.body;
  const session = req.userSession!;

  const fsr = fsrSubmissions.find(f => f.fsrId === fsrId);
  if (!fsr) {
    return res.status(404).json({ error: 'FSR_NOT_FOUND', message: 'Service report not found.' });
  }

  const ticket = tickets.find(t => t.ticketId === fsr.ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'TICKET_NOT_FOUND', message: 'Associated ticket not found.' });
  }

  // Branch Scope Check for bank users
  if (session.branchId && session.role.startsWith('BANK_') && ticket.branchId !== session.branchId) {
    return res.status(403).json({ error: 'BRANCH_SCOPE_MISMATCH', message: 'You can only verify service reports for your assigned branch.' });
  }

  fsr.customerSigneeName = customerSigneeName || session.fullName;
  fsr.customerSigneeTitle = customerSigneeTitle || session.designation || 'Branch Operations Head';
  fsr.isVerified = true;
  fsr.lifecycleStatus = 'VERIFIED';
  fsr.s3WormReceipt = `s3://pioneer-worm-vault-2026/${ticket.tenantId}/${ticket.ticketId}_verified.pdf.locked`;

  ticket.status = 'COMPLETED';
  ticket.completedAt = new Date().toISOString();

  const tech = technicians.find(t => t.technicianId === fsr.technicianId);
  if (tech && tech.activeTicketsCount > 0) {
    tech.activeTicketsCount -= 1;
  }

  auditLogs.unshift({
    logId: `log-fsr-${Date.now()}`,
    tenantId: ticket.tenantId,
    actorId: session.userId,
    actorRole: session.role,
    userSessionId: `sess-${session.userId}`,
    deviceId: 'WEB-PORTAL',
    requestId: `req-${Date.now()}`,
    correlationId: `fsr-${fsrId}`,
    actionEvent: 'FSR_CUSTOMER_VERIFIED',
    entityType: 'FSR',
    entityId: fsrId,
    oldValues: { isVerified: false, status: 'CUSTOMER_PENDING' },
    newValues: { isVerified: true, status: 'VERIFIED', signee: fsr.customerSigneeName },
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Web-Portal/1.0',
    reason: customerComments || 'Client Branch Manager confirmed power restoration and executed digital sign-off.',
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Field Service Report verified and job officially closed with audit trail.',
    fsr,
    ticket,
  });
});

// Battery Cell Swap (Requires assets:swap_cell + Scope Verification)
app.post('/api/assets/battery-swap', authMiddleware, requirePermission('assets:swap_cell'), (req: AuthenticatedRequest, res) => {
  const { parentBankId, oldCellId, newSerialNumber, techId, reason } = req.body;
  const session = req.userSession!;

  const flatten = (arr: Asset[]): Asset[] => {
    let result: Asset[] = [];
    for (const item of arr) {
      result.push(item);
      if (item.children) result = result.concat(flatten(item.children));
    }
    return result;
  };

  const allAssets = flatten(assets);
  const oldCell = allAssets.find(a => a.assetId === oldCellId);
  const parentBank = allAssets.find(a => a.assetId === parentBankId);

  if (!oldCell || !parentBank) {
    return res.status(404).json({ error: 'ASSET_NOT_FOUND', message: 'Old cell or parent bank not found.' });
  }

  // Tenant Scope Validation
  if (!canAccessTenant(session, oldCell.tenantId) || oldCell.tenantId !== req.currentTenantId || parentBank.tenantId !== req.currentTenantId) {
    return res.status(403).json({ error: 'CROSS_TENANT_VIOLATION', message: 'You cannot perform battery operations on a different tenant.' });
  }

  oldCell.status = 'DECOMMISSIONED';
  oldCell.isActive = false;
  oldCell.decommissionedAt = new Date().toISOString();

  const newCellId = `ast-cell-${Date.now()}`;
  const newCell: Asset = {
    assetId: newCellId,
    tenantId: oldCell.tenantId,
    branchId: oldCell.branchId,
    parentAssetId: parentBankId,
    assetType: 'BATTERY_UNIT',
    productSeries: oldCell.productSeries,
    manufacturer: oldCell.manufacturer,
    modelNumber: oldCell.modelNumber,
    serialNumber: newSerialNumber,
    capacityKva: oldCell.capacityKva,
    ratedVoltageV: oldCell.ratedVoltageV,
    batteryChemistry: oldCell.batteryChemistry,
    batteryAhRating: oldCell.batteryAhRating,
    redundancyMode: oldCell.redundancyMode,
    contractType: oldCell.contractType,
    contractSla: oldCell.contractSla,
    warrantyExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    amcExpiry: oldCell.amcExpiry,
    status: 'OPERATIONAL',
    installDate: new Date().toISOString().split('T')[0],
    baselineImpedanceMohm: 8.5,
    currentImpedanceMohm: 8.5,
    liveTemperatureC: 25.0,
    isActive: true,
    lastTestedAt: new Date().toISOString(),
  };

  if (parentBank.children) {
    parentBank.children = parentBank.children.map(c => c.assetId === oldCellId ? newCell : c);
    const maxImp = Math.max(...parentBank.children.map(c => c.currentImpedanceMohm || 8.5));
    parentBank.currentImpedanceMohm = maxImp;
    parentBank.status = maxImp > 13.65 ? 'DEGRADED' : 'OPERATIONAL';
  }

  const lifecycleRecord: BatteryLifecycleRecord = {
    recordId: `bat-rec-${Date.now()}`,
    tenantId: oldCell.tenantId,
    parentBankId,
    oldAssetId: oldCell.assetId,
    oldSerialNumber: oldCell.serialNumber,
    replacementAssetId: newCellId,
    newSerialNumber,
    removalReason: reason || 'Internal Resistance Degradation > 20% Baseline Threshold',
    lastMeasuredImpedanceMohm: oldCell.currentImpedanceMohm || 15.8,
    removedAt: new Date().toISOString(),
    replacedByTechId: techId || session.technicianId || 'tech-01',
    dispositionStatus: 'RETURNED_TO_DEPOT',
  };
  batteryLifecycleLedger.unshift(lifecycleRecord);

  res.json({ success: true, newAsset: newCell, lifecycleRecord });
});

// Telemetry Ingestion (Requires telemetry:simulate / telemetry:view + Strict Asset Scope)
app.post('/api/telemetry/ingest', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;
  const hasPerm = session.permissions?.includes('telemetry:simulate') ||
                  session.permissions?.includes('telemetry:view') ||
                  session.role === 'PIONEER_SUPER_ADMIN';

  if (!hasPerm) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permission for telemetry ingestion.' });
  }

  const { assetId, impedanceMohm, voltageV, temperatureC, activeAlarmCode } = req.body;
  const asset = assets.find(a => a.assetId === assetId);
  if (!asset) return res.status(404).json({ error: 'ASSET_NOT_FOUND' });

  // Cross-tenant protection
  if (!canAccessTenant(session, asset.tenantId) || asset.tenantId !== req.currentTenantId) {
    return res.status(403).json({ error: 'CROSS_TENANT_VIOLATION', message: 'You cannot inject telemetry into another organization asset.' });
  }

  const baseline = asset.baselineImpedanceMohm || 8.5;
  const driftPercentage = ((impedanceMohm - baseline) / baseline) * 100;
  asset.currentImpedanceMohm = impedanceMohm;
  asset.liveTemperatureC = temperatureC;

  if (driftPercentage >= 20.0 || activeAlarmCode) {
    asset.status = 'CRITICAL_FAULT';
  } else if (driftPercentage >= 10.0) {
    asset.status = 'DEGRADED';
  } else {
    asset.status = 'OPERATIONAL';
  }

  res.json({ success: true, driftPercentage: `${driftPercentage.toFixed(1)}%`, assetStatus: asset.status });
});

// SLA Pause & Resume
app.post('/api/sla/pause', authMiddleware, requirePermission('tickets:pause_resume_sla'), (req: AuthenticatedRequest, res) => {
  const { ticketId, reasonCode, reasonDescription } = req.body;
  const session = req.userSession!;

  const ticket = tickets.find(t => t.ticketId === ticketId);
  if (!ticket) return res.status(404).json({ error: 'TICKET_NOT_FOUND' });

  // Tenant check
  if (!canAccessTenant(session, ticket.tenantId) || ticket.tenantId !== req.currentTenantId) {
    return res.status(403).json({ error: 'CROSS_TENANT_VIOLATION' });
  }

  ticket.pauseIntervals.push({
    pauseId: `pause-${Date.now()}`,
    pausedAt: new Date().toISOString(),
    resumedAt: null,
    reasonCode,
    reasonDescription,
    actorUserId: session.userId,
    approvedBy: session.fullName,
  });

  ticket.status = reasonCode === 'WAITING_BANK_CLEARANCE' ? 'PAUSED_SECURITY_CLEARANCE' : 'PAUSED_FOR_PARTS';
  res.json({ success: true, ticket });
});

app.post('/api/sla/resume', authMiddleware, requirePermission('tickets:pause_resume_sla'), (req: AuthenticatedRequest, res) => {
  const { ticketId } = req.body;
  const session = req.userSession!;

  const ticket = tickets.find(t => t.ticketId === ticketId);
  if (!ticket) return res.status(404).json({ error: 'TICKET_NOT_FOUND' });

  if (!canAccessTenant(session, ticket.tenantId) || ticket.tenantId !== req.currentTenantId) {
    return res.status(403).json({ error: 'CROSS_TENANT_VIOLATION' });
  }

  const openPause = ticket.pauseIntervals.find(p => p.resumedAt === null);
  if (openPause) openPause.resumedAt = new Date().toISOString();
  ticket.status = 'IN_PROGRESS';
  res.json({ success: true, ticket });
});

// Audit Logs
app.get('/api/audit/logs', authMiddleware, requirePermission('audit:view'), (req: AuthenticatedRequest, res) => {
  res.json({ auditLogs: auditLogs.filter(l => l.tenantId === req.currentTenantId) });
});

// Outbox Processing Worker (Protected with system:diagnostics or super admin)
app.post('/api/outbox/process-batch', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;
  const hasPerm = session.permissions?.includes('system:diagnostics') || session.role === 'PIONEER_SUPER_ADMIN';
  if (!hasPerm) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Only background service accounts or administrators may invoke the outbox batch worker.' });
  }

  const pending = outboxEvents.filter(e => e.status === 'PENDING');
  pending.forEach(e => {
    e.status = 'PROCESSED';
    e.processedAt = new Date().toISOString();
  });
  res.json({ success: true, processedCount: pending.length });
});

// Gate Pass Records List (Strictly Scoped by Tenant & Branch)
app.get('/api/gatepass/list', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;
  const tenantId = req.currentTenantId!;

  let records = gatePassRecords.filter(g => g.tenantId === tenantId);

  if (session.branchId) {
    records = records.filter(r => r.branchId === session.branchId);
  }
  res.json({ gatePasses: records });
});

// FSR Records List (Strictly Scoped by Tenant, Branch, and Technician)
app.get('/api/fsr/list', authMiddleware, (req: AuthenticatedRequest, res) => {
  const session = req.userSession!;
  const tenantId = req.currentTenantId!;

  let records = fsrSubmissions.filter(f => f.tenantId === tenantId);

  if (session.technicianId && session.role === 'FIELD_TECHNICIAN') {
    records = records.filter(f => f.technicianId === session.technicianId);
  }
  res.json({ fsrRecords: records });
});

// -------------------------------------------------------------
// Vite Server / Static Fallback Integration
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OpsGrid Cloud FSM Server running on port ${PORT}`);
  });
}

startServer();
