import {
  Tenant,
  Branch,
  Asset,
  Ticket,
  Technician,
  AuditLog,
  TenantId,
  UserSession,
  UserAccount,
  FSRSubmission,
  GatePassRecord,
  SlaPauseReasonCode,
  Permission,
} from '../types/fsm';

const BASE_URL = '/api';

export class FsmApiClient {
  private static activeSession: UserSession | null = null;
  private static token: string = '';
  private static currentTenantId: TenantId = 'tenant-hbl-001';

  public static initializeAuth() {
    try {
      // Auth is intentionally memory-only. Do not persist bearer tokens in browser storage.
      this.token = '';
      this.activeSession = null;
    } catch (e) {
      console.warn('Could not read session from localStorage', e);
    }
  }

  public static setSession(session: UserSession | null) {
    this.activeSession = session;
    if (session) {
      this.token = session.jwtToken;
      this.currentTenantId = session.activeTenantId;
      // Deliberately do not persist credentials in localStorage/sessionStorage.
    } else {
      this.token = '';
      // Nothing persisted to clear.
    }
  }

  public static getSession(): UserSession | null {
    return this.activeSession;
  }

  public static setTenantContext(tenantId: TenantId) {
    if (this.activeSession && this.activeSession.allowedTenantIds.includes(tenantId)) {
      this.currentTenantId = tenantId;
      this.activeSession.activeTenantId = tenantId;
    }
  }

  public static getTenantContext(): TenantId {
    return this.currentTenantId;
  }

  public static hasPermission(permission: Permission): boolean {
    if (!this.activeSession) return false;
    if (this.activeSession.role === 'PIONEER_SUPER_ADMIN' || this.activeSession.role === 'SYSTEM_ADMIN') {
      return true;
    }
    return this.activeSession.permissions?.includes(permission) ?? false;
  }

  private static getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': this.currentTenantId,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // --- Auth APIs ---
  public static async login(
    email: string,
    password: string,
    mfaCode?: string
  ): Promise<{
    success?: boolean;
    mfaRequired?: boolean;
    tempToken?: string;
    session?: UserSession;
    user?: UserAccount;
    message?: string;
  }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mfaCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed.');
    }
    if (data.session) {
      this.setSession(data.session);
    }
    return data;
  }

  public static async verifyMfa(tempToken: string, mfaCode: string): Promise<{ success: boolean; session: UserSession; user: UserAccount; message?: string }> {
    const res = await fetch(`${BASE_URL}/auth/verify-mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, mfaCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Two-factor verification failed.');
    }
    if (data.session) {
      this.setSession(data.session);
    }
    return data;
  }

  public static async verifyInvite(inviteCode: string): Promise<{
    isValid: boolean;
    email: string;
    role: string;
    organizationName: string;
    department: string;
    expiresAt: string;
  }> {
    const res = await fetch(`${BASE_URL}/auth/verify-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Invalid or expired invitation code.');
    }
    return data;
  }

  public static async redeemInvite(payload: {
    inviteCode: string;
    fullName: string;
    password: string;
    phone?: string;
    cnicNumber?: string;
  }): Promise<{ success: boolean; session: UserSession; user: UserAccount; message?: string }> {
    const res = await fetch(`${BASE_URL}/auth/redeem-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to redeem invitation.');
    }
    if (data.session) {
      this.setSession(data.session);
    }
    return data;
  }

  public static async createInvitation(payload: {
    email: string;
    role: string;
    department?: string;
    certifications?: string[];
    serviceRegions?: string[];
  }): Promise<{ success: boolean; invitation: any; message?: string }> {
    const res = await fetch(`${BASE_URL}/auth/create-invitation`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to issue invitation.');
    }
    return data;
  }

  public static async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to request password reset.');
    }
    return data;
  }

  public static async resetPassword(email: string, resetCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetCode, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset password.');
    }
    return data;
  }

  public static async registerBank(payload: {
    organizationName: string;
    ntnNumber?: string;
    headOfficeAddress?: string;
    adminFullName: string;
    adminEmail: string;
    adminPhone?: string;
    password: string;
    assignedBranchId?: string;
  }): Promise<{ success: boolean; session: UserSession; user: UserAccount; message?: string }> {
    const res = await fetch(`${BASE_URL}/auth/register-bank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed.');
    }
    this.setSession(data.session);
    return data;
  }

  public static async fetchDemoAccounts(): Promise<{ demoAccounts: any[] }> {
    const res = await fetch(`${BASE_URL}/auth/demo-accounts`);
    return res.json();
  }

  public static async fetchCurrentMe(): Promise<{ session: UserSession; userAccount: UserAccount; activeTenant: Tenant }> {
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error('Failed to retrieve active session.');
    }
    return res.json();
  }

  public static async logout() {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (e) {
      console.warn('Logout API failed', e);
    }
    this.setSession(null);
  }

  // --- Operational APIs ---
  public static async checkHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
  }

  public static async getTenants(): Promise<{ tenants: Tenant[] }> {
    const res = await fetch(`${BASE_URL}/tenants`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async getBranches(): Promise<{ branches: Branch[] }> {
    const res = await fetch(`${BASE_URL}/branches`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async getAssets(): Promise<{ assets: Asset[] }> {
    const res = await fetch(`${BASE_URL}/assets`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async getTickets(): Promise<{ tickets: Ticket[] }> {
    const res = await fetch(`${BASE_URL}/tickets`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async createTicket(payload: {
    branchId: string;
    assetId: string;
    priority: string;
    issueSummary: string;
    serviceType: string;
  }): Promise<{ success: boolean; ticket: Ticket }> {
    const res = await fetch(`${BASE_URL}/tickets/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create ticket.');
    }
    return data;
  }

  public static async getTechnicians(): Promise<{ technicians: Technician[] }> {
    const res = await fetch(`${BASE_URL}/technicians`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async getAuditLogs(): Promise<{ auditLogs: AuditLog[] }> {
    const res = await fetch(`${BASE_URL}/audit/logs`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async getGatePasses(): Promise<{ gatePasses: GatePassRecord[] }> {
    const res = await fetch(`${BASE_URL}/gatepass/list`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async getFsrRecords(): Promise<{ fsrRecords: FSRSubmission[] }> {
    const res = await fetch(`${BASE_URL}/fsr/list`, { headers: this.getHeaders() });
    return res.json();
  }

  public static async ingestTelemetry(data: {
    assetId: string;
    impedanceMohm: number;
    voltageV: number;
    temperatureC: number;
    loadPercentage?: number;
    inverterStatus?: string;
    rectifierStatus?: string;
    bypassStatus?: string;
    activeAlarmCode?: string;
  }) {
    const res = await fetch(`${BASE_URL}/telemetry/ingest`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  public static async smartAssignTechnician(ticketId: string, technicianId: string, selectedPartIds: string[]) {
    const res = await fetch(`${BASE_URL}/dispatch/smart-assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ticketId, technicianId, selectedPartIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Dispatch assignment failed.');
    }
    return data;
  }

  public static async swapBatteryCell(
    parentBankId: string,
    oldCellId: string,
    newSerialNumber: string,
    techId?: string,
    reason?: string
  ) {
    const res = await fetch(`${BASE_URL}/assets/battery-swap`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ parentBankId, oldCellId, newSerialNumber, techId, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Battery swap failed.');
    }
    return data;
  }

  public static async verifyGatePass(token: string, branchId: string, officerName?: string, action: 'VERIFY' | 'ALLOW_ENTRY' = 'ALLOW_ENTRY') {
    const res = await fetch(`${BASE_URL}/gatepass/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token, branchId, officerName, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.reason || data.message || 'Gate pass verification failed.');
    }
    return data;
  }

  public static async submitFSR(payload: {
    ticketId: string;
    technicianId: string;
    assetType: string;
    serviceType: string;
    formData: Record<string, any>;
    evidenceIds: string[];
    customerSigneeName?: string;
    customerSigneeTitle?: string;
  }) {
    const res = await fetch(`${BASE_URL}/fsr/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'FSR submission failed.');
    }
    return data;
  }

  public static async verifyCustomerFsr(payload: {
    fsrId: string;
    customerSigneeName?: string;
    customerSigneeTitle?: string;
    customerComments?: string;
  }) {
    const res = await fetch(`${BASE_URL}/fsr/verify-customer`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'FSR customer verification failed.');
    }
    return data;
  }

  public static async pauseSLA(
    ticketId: string,
    reasonCode: SlaPauseReasonCode,
    reasonDescription: string
  ) {
    const res = await fetch(`${BASE_URL}/sla/pause`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ticketId, reasonCode, reasonDescription }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'SLA pause failed.');
    }
    return data;
  }

  public static async resumeSLA(ticketId: string) {
    const res = await fetch(`${BASE_URL}/sla/resume`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ticketId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'SLA resume failed.');
    }
    return data;
  }

  public static async processOutboxBatch() {
    const res = await fetch(`${BASE_URL}/outbox/process-batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({}),
    });
    return res.json();
  }
}

// Auto-initialize on load
FsmApiClient.initializeAuth();
