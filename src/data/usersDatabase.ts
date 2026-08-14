import { UserAccount, UserRole, PortalType, Permission, TenantId } from '../types/fsm';

// Default Role Permissions Mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Bank Roles
  BANK_SUPER_ADMIN: [
    'tickets:create',
    'tickets:view_all',
    'tickets:view_branch',
    'gatepass:create',
    'gatepass:view',
    'fsr:view',
    'fsr:verify',
    'assets:view_all',
    'assets:view_branch',
    'telemetry:view',
    'audit:view',
    'users:invite',
  ],
  BANK_REGIONAL_MANAGER: [
    'tickets:create',
    'tickets:view_all',
    'tickets:view_branch',
    'gatepass:create',
    'gatepass:view',
    'fsr:view',
    'fsr:verify',
    'assets:view_all',
    'assets:view_branch',
    'telemetry:view',
  ],
  BANK_BRANCH_MANAGER: [
    'tickets:create',
    'tickets:view_branch',
    'gatepass:create',
    'gatepass:view',
    'fsr:view',
    'fsr:verify',
    'assets:view_branch',
    'telemetry:view',
  ],
  BANK_BRANCH_USER: [
    'tickets:create',
    'tickets:view_branch',
    'gatepass:view',
    'fsr:view',
    'assets:view_branch',
  ],
  BANK_SECURITY_OFFICER: [
    'gatepass:view',
    'gatepass:scan',
    'gatepass:approve_entry',
    'gatepass:record_exit',
  ],

  // Pioneer Roles
  PIONEER_SUPER_ADMIN: [
    'tickets:create',
    'tickets:view_all',
    'tickets:view_branch',
    'tickets:view_assigned',
    'tickets:assign',
    'tickets:update_status',
    'tickets:pause_resume_sla',
    'gatepass:create',
    'gatepass:view',
    'gatepass:scan',
    'gatepass:approve_entry',
    'gatepass:record_exit',
    'fsr:create',
    'fsr:view',
    'fsr:verify',
    'inventory:view_all',
    'inventory:view_van',
    'inventory:transfer',
    'inventory:reserve',
    'inventory:consume',
    'assets:view_all',
    'assets:view_branch',
    'assets:edit',
    'assets:swap_cell',
    'telemetry:view',
    'telemetry:simulate',
    'audit:view',
    'sla:manage',
    'system:diagnostics',
    'users:invite',
    'users:manage',
  ],
  PIONEER_OPERATIONS_MANAGER: [
    'tickets:create',
    'tickets:view_all',
    'tickets:assign',
    'tickets:update_status',
    'tickets:pause_resume_sla',
    'gatepass:create',
    'gatepass:view',
    'fsr:view',
    'fsr:verify',
    'inventory:view_all',
    'inventory:reserve',
    'assets:view_all',
    'assets:swap_cell',
    'telemetry:view',
    'telemetry:simulate',
    'audit:view',
    'sla:manage',
    'users:invite',
  ],
  PIONEER_DISPATCH_CONTROLLER: [
    'tickets:create',
    'tickets:view_all',
    'tickets:assign',
    'tickets:update_status',
    'tickets:pause_resume_sla',
    'gatepass:create',
    'gatepass:view',
    'fsr:view',
    'inventory:view_all',
    'inventory:reserve',
    'assets:view_all',
    'telemetry:view',
    'telemetry:simulate',
    'sla:manage',
  ],
  PIONEER_REGIONAL_MANAGER: [
    'tickets:view_all',
    'tickets:assign',
    'gatepass:view',
    'fsr:view',
    'inventory:view_all',
    'assets:view_all',
    'telemetry:view',
    'sla:manage',
  ],
  PIONEER_INVENTORY_MANAGER: [
    'inventory:view_all',
    'inventory:view_van',
    'inventory:transfer',
    'inventory:reserve',
    'assets:view_all',
    'fsr:view',
    'audit:view',
  ],
  PIONEER_COMPLIANCE_AUDITOR: [
    'tickets:view_all',
    'gatepass:view',
    'fsr:view',
    'fsr:verify',
    'assets:view_all',
    'telemetry:view',
    'audit:view',
  ],

  // Field Roles
  FIELD_TECHNICIAN: [
    'tickets:view_assigned',
    'tickets:update_status',
    'gatepass:view',
    'fsr:create',
    'fsr:view',
    'inventory:view_van',
    'inventory:consume',
    'assets:view_branch',
    'assets:swap_cell',
  ],
  SENIOR_FIELD_ENGINEER: [
    'tickets:view_assigned',
    'tickets:update_status',
    'gatepass:view',
    'fsr:create',
    'fsr:view',
    'inventory:view_van',
    'inventory:consume',
    'assets:view_branch',
    'assets:swap_cell',
    'telemetry:view',
  ],
  FIELD_SUPERVISOR: [
    'tickets:view_all',
    'tickets:view_assigned',
    'tickets:assign',
    'tickets:update_status',
    'gatepass:view',
    'fsr:create',
    'fsr:view',
    'fsr:verify',
    'inventory:view_all',
    'inventory:view_van',
    'inventory:consume',
    'assets:view_all',
    'assets:swap_cell',
    'telemetry:view',
  ],

  // Legacy Aliases
  DISPATCH_CONTROLLER: [
    'tickets:create',
    'tickets:view_all',
    'tickets:assign',
    'tickets:update_status',
    'tickets:pause_resume_sla',
    'gatepass:create',
    'gatepass:view',
    'fsr:view',
    'inventory:view_all',
    'inventory:reserve',
    'assets:view_all',
    'telemetry:view',
    'telemetry:simulate',
    'sla:manage',
  ],
  PIONEER_FIELD_ENGINEER: [
    'tickets:view_assigned',
    'tickets:update_status',
    'gatepass:view',
    'fsr:create',
    'fsr:view',
    'inventory:view_van',
    'inventory:consume',
    'assets:view_branch',
    'assets:swap_cell',
  ],
  COMPLIANCE_AUDITOR: [
    'tickets:view_all',
    'gatepass:view',
    'fsr:view',
    'fsr:verify',
    'assets:view_all',
    'telemetry:view',
    'audit:view',
  ],
  SYSTEM_ADMIN: [
    'tickets:create',
    'tickets:view_all',
    'tickets:view_branch',
    'tickets:view_assigned',
    'tickets:assign',
    'tickets:update_status',
    'tickets:pause_resume_sla',
    'gatepass:create',
    'gatepass:view',
    'gatepass:scan',
    'gatepass:approve_entry',
    'gatepass:record_exit',
    'fsr:create',
    'fsr:view',
    'fsr:verify',
    'inventory:view_all',
    'inventory:view_van',
    'inventory:transfer',
    'inventory:reserve',
    'inventory:consume',
    'assets:view_all',
    'assets:view_branch',
    'assets:edit',
    'assets:swap_cell',
    'telemetry:view',
    'telemetry:simulate',
    'audit:view',
    'sla:manage',
    'system:diagnostics',
    'users:invite',
    'users:manage',
  ],
};

export function getPortalForRole(role: UserRole): PortalType {
  switch (role) {
    case 'BANK_SUPER_ADMIN':
    case 'BANK_REGIONAL_MANAGER':
    case 'BANK_BRANCH_MANAGER':
    case 'BANK_BRANCH_USER':
      return 'BANK_PORTAL';

    case 'BANK_SECURITY_OFFICER':
      return 'BANK_SECURITY_KIOSK';

    case 'FIELD_TECHNICIAN':
    case 'SENIOR_FIELD_ENGINEER':
    case 'FIELD_SUPERVISOR':
    case 'PIONEER_FIELD_ENGINEER':
      return 'TECHNICIAN_MOBILE';

    case 'PIONEER_COMPLIANCE_AUDITOR':
    case 'COMPLIANCE_AUDITOR':
      return 'AUDITOR_PORTAL';

    case 'PIONEER_SUPER_ADMIN':
    case 'SYSTEM_ADMIN':
      return 'PIONEER_OPERATIONS'; // Super admin default, with access to all including diagnostics

    case 'PIONEER_OPERATIONS_MANAGER':
    case 'PIONEER_DISPATCH_CONTROLLER':
    case 'PIONEER_REGIONAL_MANAGER':
    case 'PIONEER_INVENTORY_MANAGER':
    case 'DISPATCH_CONTROLLER':
    default:
      return 'PIONEER_OPERATIONS';
  }
}

// Initial Enterprise Accounts
export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  // 1. Bank Branch Manager (HBL Gulberg)
  {
    userId: 'usr-bank-mgr-01',
    fullName: 'Tariq Mehmood',
    email: 'branch.manager@hbl.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'BANK_BRANCH_MANAGER',
    portalType: 'BANK_PORTAL',
    organizationId: 'tenant-hbl-001',
    organizationName: 'Habib Bank Limited (HBL)',
    branchId: 'br-hbl-01',
    branchName: 'HBL Islamic Prestige - Gulberg Main',
    phoneNumber: '+92 300 8421099',
    designation: 'Senior Branch Operations Manager',
    permissions: ROLE_PERMISSIONS['BANK_BRANCH_MANAGER'],
    isActive: true,
    createdAt: '2025-01-10T08:00:00Z',
  },

  // 2. Bank Security Officer (HBL Gulberg Gate)
  {
    userId: 'usr-bank-sec-01',
    fullName: 'Subedar (R) Muhammad Aslam',
    email: 'security.gulberg@hbl.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'BANK_SECURITY_OFFICER',
    portalType: 'BANK_SECURITY_KIOSK',
    organizationId: 'tenant-hbl-001',
    organizationName: 'Habib Bank Limited (HBL)',
    branchId: 'br-hbl-01',
    branchName: 'HBL Islamic Prestige - Gulberg Main',
    phoneNumber: '+92 321 4455880',
    cnicNumber: '35201-4412983-1',
    designation: 'Chief Security Officer & Access Controller',
    permissions: ROLE_PERMISSIONS['BANK_SECURITY_OFFICER'],
    isActive: true,
    createdAt: '2025-01-10T08:00:00Z',
  },

  // 3. Bank Regional Head (Standard Chartered Bank)
  {
    userId: 'usr-bank-reg-01',
    fullName: 'Ayesha Siddiqui',
    email: 'regional.head@scb.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'BANK_REGIONAL_MANAGER',
    portalType: 'BANK_PORTAL',
    organizationId: 'tenant-scb-002',
    organizationName: 'Standard Chartered Bank',
    phoneNumber: '+92 333 5129988',
    designation: 'Head of Banking Power & Infrastructure',
    permissions: ROLE_PERMISSIONS['BANK_REGIONAL_MANAGER'],
    isActive: true,
    createdAt: '2025-01-12T09:30:00Z',
  },

  // 4. Pioneer NOC Dispatch Controller
  {
    userId: 'usr-pioneer-disp-01',
    fullName: 'Engr. Zeeshan Haider',
    email: 'dispatch@pioneersystem.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'PIONEER_DISPATCH_CONTROLLER',
    portalType: 'PIONEER_OPERATIONS',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Power Systems HQ',
    phoneNumber: '+92 301 8877112',
    designation: 'NOC Dispatch Lead & Spatial Controller',
    permissions: ROLE_PERMISSIONS['PIONEER_DISPATCH_CONTROLLER'],
    isActive: true,
    createdAt: '2024-11-01T08:00:00Z',
  },

  // 5. Pioneer Operations Director
  {
    userId: 'usr-pioneer-ops-01',
    fullName: 'Kamran Farooq',
    email: 'operations.director@pioneersystem.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'PIONEER_OPERATIONS_MANAGER',
    portalType: 'PIONEER_OPERATIONS',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Power Systems HQ',
    phoneNumber: '+92 300 9922334',
    designation: 'Director of Field Operations & SLA Integrity',
    permissions: ROLE_PERMISSIONS['PIONEER_OPERATIONS_MANAGER'],
    isActive: true,
    createdAt: '2024-10-15T08:00:00Z',
  },

  // 6. Field Technician - Ahmed Khan
  {
    userId: 'usr-tech-01',
    fullName: 'Engr. Ahmed Khan',
    email: 'tech.ahmed@pioneersystem.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'FIELD_TECHNICIAN',
    portalType: 'TECHNICIAN_MOBILE',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Field Services Division',
    technicianId: 'tech-01',
    phoneNumber: '+92 300 1234567',
    cnicNumber: '35202-9845123-5',
    designation: 'Lead Power Systems Engineer (IEEE 1188 Certified)',
    permissions: ROLE_PERMISSIONS['FIELD_TECHNICIAN'],
    isActive: true,
    createdAt: '2025-01-01T08:00:00Z',
  },

  // 7. Field Technician - Bilal Tariq
  {
    userId: 'usr-tech-02',
    fullName: 'Bilal Tariq',
    email: 'tech.bilal@pioneersystem.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'FIELD_TECHNICIAN',
    portalType: 'TECHNICIAN_MOBILE',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Field Services Division',
    technicianId: 'tech-02',
    phoneNumber: '+92 321 7654321',
    cnicNumber: '35201-1234567-9',
    designation: 'Senior UPS & Modbus Specialist',
    permissions: ROLE_PERMISSIONS['FIELD_TECHNICIAN'],
    isActive: true,
    createdAt: '2025-01-05T08:00:00Z',
  },

  // 8. Pioneer Central Warehouse & Spares Manager
  {
    userId: 'usr-pioneer-inv-01',
    fullName: 'Raza Jafri',
    email: 'inventory.manager@pioneersystem.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'PIONEER_INVENTORY_MANAGER',
    portalType: 'PIONEER_OPERATIONS',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Central Logistics Hub',
    phoneNumber: '+92 345 6677889',
    designation: 'Chief Logistics & Spares Controller',
    permissions: ROLE_PERMISSIONS['PIONEER_INVENTORY_MANAGER'],
    isActive: true,
    createdAt: '2024-12-01T08:00:00Z',
  },

  // 9. Compliance & SLA Auditor
  {
    userId: 'usr-auditor-01',
    fullName: 'Sarah Mansoor, CISA',
    email: 'auditor.sarah@sbp-compliance.org',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'PIONEER_COMPLIANCE_AUDITOR',
    portalType: 'AUDITOR_PORTAL',
    organizationId: 'tenant-hbl-001',
    organizationName: 'Banking Sector Regulatory Oversight',
    phoneNumber: '+92 300 7711223',
    designation: 'Senior Infrastructure & SLA Auditor',
    permissions: ROLE_PERMISSIONS['PIONEER_COMPLIANCE_AUDITOR'],
    isActive: true,
    createdAt: '2025-01-15T08:00:00Z',
  },

  // 10. Pioneer Super Admin
  {
    userId: 'usr-superadmin-01',
    fullName: 'Administrator (Pioneer Global Platform)',
    email: 'admin@pioneersystem.com',
    passwordHash: '3ded55df7c57ee77d00dc624fbc30794:d82765f397cf4d29a510518e77c227f45f333f15e82d862f7364a72282ddb3053fa7e58756cfd07c0fe3445e20370d454333b0ab5251fd24522b5f923d29a2d7',
    role: 'PIONEER_SUPER_ADMIN',
    portalType: 'SYSTEM_DIAGNOSTICS',
    organizationId: 'tenant-pioneer-004',
    organizationName: 'Pioneer Power Systems Enterprise',
    phoneNumber: '+92 300 0000000',
    designation: 'Enterprise Platform Architect',
    permissions: ROLE_PERMISSIONS['PIONEER_SUPER_ADMIN'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];
