export type TenantId = string;

export type SectorType = 'BANKING_VAULT' | 'DATA_CENTER' | 'HEALTHCARE_HOSPITAL' | 'TELECOM' | 'INDUSTRIAL_PLANT' | 'GOVERNMENT';

// Comprehensive Enterprise Roles Architecture
export type UserRole = 
  // Bank Client Organization Roles
  | 'BANK_SUPER_ADMIN'
  | 'BANK_REGIONAL_MANAGER'
  | 'BANK_BRANCH_MANAGER'
  | 'BANK_BRANCH_USER'
  | 'BANK_SECURITY_OFFICER'
  // Pioneer Enterprise Operations Roles
  | 'PIONEER_SUPER_ADMIN'
  | 'PIONEER_OPERATIONS_MANAGER'
  | 'PIONEER_DISPATCH_CONTROLLER'
  | 'PIONEER_REGIONAL_MANAGER'
  | 'PIONEER_INVENTORY_MANAGER'
  | 'PIONEER_COMPLIANCE_AUDITOR'
  // Field Force Execution Roles
  | 'FIELD_TECHNICIAN'
  | 'SENIOR_FIELD_ENGINEER'
  | 'FIELD_SUPERVISOR'
  // Backwards compatibility aliases
  | 'DISPATCH_CONTROLLER'
  | 'PIONEER_FIELD_ENGINEER'
  | 'COMPLIANCE_AUDITOR'
  | 'SYSTEM_ADMIN';

export type PortalType = 
  | 'BANK_PORTAL'
  | 'PIONEER_OPERATIONS'
  | 'PIONEER_NOC_DISPATCH'
  | 'TECHNICIAN_MOBILE'
  | 'BANK_SECURITY'
  | 'BANK_SECURITY_KIOSK'
  | 'COMPLIANCE_AUDIT'
  | 'AUDITOR_PORTAL'
  | 'SYSTEM_DIAGNOSTICS';

export type Permission =
  // Ticket Permissions
  | 'tickets:create'
  | 'tickets:view_all'
  | 'tickets:view_branch'
  | 'tickets:view_assigned'
  | 'tickets:assign'
  | 'tickets:update_status'
  | 'tickets:pause_resume_sla'
  // Gate Pass Permissions
  | 'gatepass:create'
  | 'gatepass:view'
  | 'gatepass:scan'
  | 'gatepass:approve_entry'
  | 'gatepass:record_exit'
  // FSR Permissions
  | 'fsr:create'
  | 'fsr:view'
  | 'fsr:verify'
  // Inventory Permissions
  | 'inventory:view_all'
  | 'inventory:view_van'
  | 'inventory:transfer'
  | 'inventory:reserve'
  | 'inventory:consume'
  // Asset & Telemetry Permissions
  | 'assets:view_all'
  | 'assets:view_branch'
  | 'assets:edit'
  | 'assets:swap_cell'
  | 'telemetry:view'
  | 'telemetry:simulate'
  // Governance & Administration Permissions
  | 'audit:view'
  | 'sla:manage'
  | 'system:diagnostics'
  | 'users:invite'
  | 'users:manage';

export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';

export interface EnterpriseInvitation {
  invitationId: string;
  inviteCode: string;
  email: string;
  organizationId: TenantId;
  organizationName: string;
  role: UserRole;
  portalType: PortalType;
  department?: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  technicianDetails?: {
    certifications: string[];
    serviceRegions: string[];
    phone?: string;
    cnic?: string;
  };
}

export interface UserAccount {
  userId: string;
  fullName: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  portalType: PortalType;
  organizationId: TenantId;
  organizationName: string;
  branchId?: string; // For branch-specific users (Bank Branch Manager, Branch User, Security Desk)
  branchName?: string;
  technicianId?: string; // For Field Technicians
  permissions: Permission[];
  phoneNumber?: string;
  cnicNumber?: string; // For security ID verification (masked in client-facing views)
  designation: string;
  status?: AccountStatus;
  isActive: boolean;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserSession {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  portalType: PortalType;
  activeTenantId: TenantId;
  allowedTenantIds: TenantId[];
  branchId?: string;
  branchName?: string;
  technicianId?: string;
  permissions: Permission[];
  designation: string;
  jwtToken: string;
  expiresAt: string;
}

export interface Tenant {
  tenantId: TenantId;
  bankName?: string; // Used as Client/Organization Name
  name?: string; // Compatibility alias
  code?: string;
  contractType?: string;
  slaTier?: string;
  slaResponseMinutes?: number;
  slaResolutionHours?: number;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  ntnNumber?: string;
  activeAssetsCount?: number;
  activeTicketsCount?: number;
  complianceScore?: number;
  primaryContactName?: string;
  portalTheme?: string;
  isActive?: boolean;
  sector?: SectorType;
  licenseCode?: string;
  region?: string;
  activeBranches?: number;
  totalAssets?: number;
  slaComplianceRate?: number;
  currency?: 'PKR' | 'USD' | 'EUR' | 'AED';
  hourlyPenaltyRate?: number;
  internalDispatchTargetMinutes?: number; // e.g. 5 min
  createdAt: string;
}

export type CriticalityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export interface Branch {
  branchId: string;
  tenantId: TenantId;
  branchCode: string;
  branchName: string;
  managerName?: string;
  managerPhone?: string;
  contactPersonName?: string;
  powerAssetIds?: string[];
  criticalityTier?: string;
  sector?: SectorType;
  criticalityLevel?: CriticalityLevel;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number; // Configurable per branch (e.g. 30m, 50m, 100m)
  city: string;
  address: string;
  securityContact: string;
  isActive: boolean;
  operatingHours?: {
    open: string;
    close: string;
    is24Hours: boolean;
  };
}

export type AssetType = 
  | 'UPS_SYSTEM' 
  | 'BATTERY_BANK' 
  | 'BATTERY_UNIT' 
  | 'AVR_MODULE'
  | 'STATIC_SWITCH'
  | 'ISOLATION_TRANSFORMER'
  | 'SNMP_GATEWAY';

export type AssetStatus = 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL_FAULT' | 'MAINTENANCE_REQUIRED' | 'OFFLINE' | 'DECOMMISSIONED';

export type CommunicationProtocol = 'SNMP_V3' | 'MODBUS_TCP' | 'MODBUS_RTU_RS485' | 'RS232' | 'GPRS_GATEWAY' | 'DRY_CONTACT';
export type ParallelRedundancyMode = 'STANDALONE' | 'PARALLEL_N_PLUS_1' | 'PARALLEL_N_PLUS_2' | '2N_DUAL_BUS' | 'HOT_STANDBY' | 'N_PLUS_1';
export type ContractType = 'COMPREHENSIVE_AMC' | 'NON_COMPREHENSIVE_AMC' | 'STANDARD_WARRANTY' | 'EXTENDED_WARRANTY' | 'EXPIRED_CHARGEABLE';
export type ContractSlaTier = 'FOUR_HOUR_ONSITE' | 'NEXT_DAY' | 'NEXT_BUSINESS_DAY' | 'CUSTOM_MISSION_CRITICAL';

export interface ThreePhasePowerReading {
  inputVoltagePh1: number;
  inputVoltagePh2: number;
  inputVoltagePh3: number;
  inputFrequencyHz: number;
  outputVoltagePh1: number;
  outputVoltagePh2: number;
  outputVoltagePh3: number;
  outputFrequencyHz: number;
  loadCurrentPh1A: number;
  loadCurrentPh2A: number;
  loadCurrentPh3A: number;
  activePowerKw: number;
  apparentPowerKva: number;
  powerFactor: number;
  thdCurrentPercentage: number;
  thdVoltagePercentage: number;
}

export interface AssetReading {
  readingId: string;
  assetId: string;
  tenantId: TenantId;
  recordedAt: string;
  gatewayProtocol: CommunicationProtocol;
  
  // Internal Resistance & Cell Telemetry (in mΩ)
  impedanceMohm: number; // milliohm (mΩ)
  voltageV: number;
  temperatureC: number;
  
  // 3-Phase Industrial UPS Power Metrics
  threePhase?: ThreePhasePowerReading;
  loadPercentage?: number;
  frequencyHz?: number;
  
  // DC Bus & Battery Subsystem
  dcBusVoltageV?: number;
  batteryCurrentA?: number;
  batteryFloatVoltageV?: number;
  batterySocPercentage?: number; // 0-100%
  batterySohPercentage?: number; // 0-100%
  remainingBackupMinutes?: number;
  
  // Subsystem Operational States
  inverterStatus?: 'NORMAL' | 'OVERLOAD' | 'OFF' | 'FAULT';
  rectifierStatus?: 'FLOAT' | 'BOOST' | 'OFF' | 'FAULT';
  bypassStatus?: 'STATIC_BYPASS_OFF' | 'STATIC_BYPASS_ENGAGED' | 'MANUAL_BYPASS';
  activeAlarmCode?: string | null;
  activeAlarmSeverity?: 'NONE' | 'INFO' | 'WARNING' | 'CRITICAL';
  
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface TelemetryAlertRule {
  ruleId: string;
  parameter: 'IMPEDANCE' | 'TEMPERATURE' | 'DC_BUS_OVERVOLTAGE' | 'INVERTER_OVERTEMP' | 'BYPASS_ACTIVE' | 'BATTERY_LOW';
  thresholdValue: number;
  operator: '>' | '<' | '==';
  autoCreateTicket: boolean;
  ticketPriority: TicketPriority;
  ticketType: TicketServiceType;
}

export interface BatteryLifecycleRecord {
  recordId: string;
  tenantId: TenantId;
  parentBankId: string;
  oldAssetId: string;
  oldSerialNumber: string;
  replacementAssetId: string;
  newSerialNumber: string;
  removalReason: string;
  lastMeasuredImpedanceMohm: number;
  removedAt: string;
  replacedByTechId: string;
  dispositionStatus: 'RETURNED_TO_DEPOT' | 'RECYCLED_SCRAPPED' | 'UNDER_WARRANTY_RMA';
}

export interface Asset {
  assetId: string;
  tenantId: TenantId;
  branchId: string;
  parentAssetId?: string | null;
  assetType: AssetType;
  
  // Pioneer Industrial Asset Specifications
  productSeries: string; // e.g. 'Elektra-Max 3.2MVA', 'Elektra-HP Industrial', 'Opto-Pro AVR', 'Pioneer-VRLA'
  manufacturer: string;  // e.g. 'Pioneer System / Elektra', 'Yuasa Industrial', 'Socomec'
  modelNumber: string;
  serialNumber: string;
  firmwareVersion?: string;
  
  // Power & Electrical Ratings
  capacityKva?: number;
  capacityKw?: number;
  inputPhase?: '1-Phase' | '3-Phase';
  outputPhase?: '1-Phase' | '3-Phase';
  ratedVoltageV?: number;
  
  // Parallel / Redundancy Architecture
  redundancyMode: ParallelRedundancyMode;
  parallelUnitCount?: number;
  
  // Battery Bank Specifics
  batteryChemistry?: 'VRLA_AGM' | 'GEL' | 'TUBULAR' | 'LITHIUM_LIFEPO4' | 'NICKEL_CADMIUM';
  batteryFloatVoltageV?: number;
  batteryQuantity?: number;
  batteryAhRating?: number;
  expectedReplacementDate?: string;
  
  // IoT & Telemetry Gateway Specs
  communicationCard?: CommunicationProtocol;
  snmpIpAddress?: string;
  modbusSlaveId?: number;
  gatewayStatus?: 'CONNECTED_ONLINE' | 'INTERMITTENT' | 'COMMUNICATION_LOST' | 'DISABLED';
  lastTelemetryHeartbeat?: string;
  
  // Lifecycle & Warranty/AMC Contract
  contractType: ContractType;
  contractSla: ContractSlaTier;
  warrantyExpiry: string;
  amcExpiry: string;
  installDate: string;
  commissioningDate?: string;
  
  // Live State & Health
  status: AssetStatus;
  baselineImpedanceMohm?: number; // Baseline in mΩ
  currentImpedanceMohm?: number;  // Current in mΩ
  warningThresholdMultiplier?: number; // e.g. 1.10 (+10% for warning)
  criticalThresholdMultiplier?: number; // e.g. 1.20 (+20% for critical degradation)
  liveTemperatureC?: number;
  liveLoadPercentage?: number;
  lastTestedAt?: string;
  isActive: boolean;
  decommissionedAt?: string | null;
  
  // Documentation & Schematics
  manualUrl?: string;
  singleLineDiagramUrl?: string;
  
  children?: Asset[];
}

export type TicketServiceType = 
  | 'EMERGENCY_BREAKDOWN'
  | 'PREVENTIVE_MAINTENANCE'
  | 'BATTERY_REPLACEMENT'
  | 'INSTALLATION_COMMISSIONING'
  | 'LOAD_BANK_TEST'
  | 'POWER_ANALYSIS_QUALITY'
  | 'THERMOGRAPHY_SAFETY_AUDIT'
  | 'WARRANTY_INSPECTION'
  | 'AMC_ROUTINE_VISIT'
  | 'REMOTE_DIAGNOSTIC';

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL' | 'LOW';
export type PriorityLevel = TicketPriority;

export type TicketStatus = 
  | 'NEW' 
  | 'ASSIGNED' 
  | 'TRAVELING' 
  | 'ARRIVED_GEOFENCED' 
  | 'SECURITY_CHECKED_IN'
  | 'IN_PROGRESS' 
  | 'PAUSED_FOR_PARTS' 
  | 'PAUSED_SECURITY_CLEARANCE' 
  | 'PENDING_CUSTOMER_VERIFICATION'
  | 'COMPLETED' 
  | 'VERIFIED_CLOSED';

export type SlaPauseReasonCode = 
  | 'WAITING_BANK_CLEARANCE'
  | 'WAITING_CRITICAL_SPARE'
  | 'SITE_POWER_UNAVAILABLE'
  | 'CUSTOMER_REQUESTED_RESCHEDULE'
  | 'FORCE_MAJEURE';

export interface PauseInterval {
  pauseId: string;
  pausedAt: string;
  resumedAt: string | null;
  reasonCode: SlaPauseReasonCode;
  reasonDescription: string;
  actorUserId: string;
  approvedBy: string;
  evidenceRef?: string;
}

export interface Ticket {
  ticketId: string;
  ticketNumber: string;
  tenantId: TenantId;
  branchId: string;
  assetId: string;
  serviceType: TicketServiceType;
  priority: TicketPriority;
  status: TicketStatus;
  issueSummary: string;
  
  // Telemetry Ingestion Source
  isAutoGeneratedFromTelemetry?: boolean;
  triggeringFaultCode?: string; // e.g. 'ERR_ELEKTRA_F41: Inverter Bridge Over-temp'
  
  // Contract Context
  contractType: ContractType;
  contractSla: ContractSlaTier;
  isCoveredUnderAmc: boolean;
  
  // SLAs Tracking
  internalDispatchTargetMinutes: number; // e.g. 5
  dispatchSlaDeadline: string;
  customerSlaDeadline: string;
  
  assignedTechnicianId?: string | null;
  idempotencyKey: string;
  createdAt: string;
  assignedAt?: string;
  arrivedAt?: string;
  securityCheckedInAt?: string;
  resolvedAt?: string;
  completedAt?: string;
  pauseIntervals: PauseInterval[];
  reservedParts: string[]; // List of specific Item IDs reserved for this ticket
  requiredPartsSummary?: { itemId: string; itemName: string; quantity: number }[];
  
  geofenceCheckPassed?: boolean;
  gatePassToken?: string;
  gatePassVerifiedAt?: string;
  fsrRecordId?: string;
}

export interface Technician {
  technicianId: string;
  tenantId: TenantId;
  fullName: string;
  email: string;
  phone: string;
  primaryPhone?: string;
  cnicOrIdNumber?: string;
  currentLatitude: number;
  currentLongitude: number;
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
    gpsAccuracyMeters?: number;
  };
  isOnline: boolean;
  isSuspended: boolean;
  activeTicketsCount: number;
  maxTicketCapacity: number; // e.g. 3
  certifications: string[]; // e.g. ['ELEKTRA_3.2MVA', 'UPS_SYSTEM', 'BATTERY_BANK', 'THERMOGRAPHY_LEVEL2', 'LOAD_BANK_TEST']
  skills?: string[];
  serviceRegions: string[]; // e.g. ['ISB-CAPITAL', 'RAWALPINDI-NORTH', 'LAHORE-CENTRAL']
  ratingScore?: number;
  vanStockLevel?: string | number;
  vanInventory: {
    itemId: string;
    partNumber: string;
    itemName: string;
    quantityAvailable: number;
    quantityReserved: number;
  }[];
}

export interface InventoryItem {
  itemId: string;
  partNumber: string;
  itemName: string;
  category: 
    | 'BATTERY_CELL' 
    | 'UPS_BOARD' 
    | 'CAPACITOR' 
    | 'AVR_RELAY' 
    | 'FUSE' 
    | 'BREAKER'
    | 'SNMP_CARD'
    | 'COOLING_FAN'
    | 'SCR_MODULE'
    | 'ISOLATION_XFORM';
  manufacturer: string;
  unitCostUsd: number;
  compatibility: AssetType[];
}

export interface InventoryStock {
  stockId: string;
  itemId: string;
  tenantId: TenantId;
  warehouseId?: string;
  technicianId?: string;
  locationName: string;
  quantityAvailable: number;
  quantityReserved: number;
}

export interface InventoryLedgerEntry {
  ledgerId: string;
  tenantId: TenantId;
  itemId: string;
  itemName: string;
  sourceType: 'CENTRAL_WAREHOUSE' | 'TECH_VAN' | 'BRANCH_SITE';
  sourceId: string;
  destinationType: 'TECH_VAN' | 'BRANCH_SITE' | 'SCRAP' | 'CENTRAL_WAREHOUSE';
  destinationId: string;
  transactionType: 'TRANSFER' | 'RESERVATION' | 'CONSUMPTION' | 'RETURN';
  quantity: number;
  serialNumber?: string;
  referenceTicketId?: string;
  recordedAt: string;
  operatorUserId: string;
}

export interface OutboxEvent {
  eventId: string;
  tenantId: TenantId;
  aggregateType: 'TICKET' | 'INVENTORY' | 'GEOFENCE' | 'FSR' | 'SLA' | 'GATEPASS' | 'ASSET' | 'BATTERY_CELL' | 'TELEMETRY' | 'AMC_CONTRACT';
  aggregateId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  retryCount: number;
  idempotencyKey: string;
  createdAt: string;
  processedAt?: string | null;
}

export interface AuditLog {
  logId: string;
  tenantId: TenantId;
  actorId: string;
  actorRole: string;
  userSessionId: string;
  deviceId: string;
  requestId: string;
  correlationId: string;
  actionEvent: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
  reason?: string;
  createdAt: string;
}

export interface S3EvidenceRecord {
  evidenceId: string;
  ticketId: string;
  tenantId: TenantId;
  s3ObjectKey: string;
  s3Url: string;
  sha256Hash: string;
  mimeType: string;
  retentionUntil: string;
  retentionMode: 'COMPLIANCE';
  capturedAt: string;
  capturedBy: string;
  photoType: 
    | 'BEFORE_REPAIR' 
    | 'THERMAL_SCAN' 
    | 'IMPEDANCE_TEST' 
    | 'AFTER_REPAIR' 
    | 'FSR_SIGNATURE'
    | 'POWER_ANALYZER_GRAPH'
    | 'LOAD_BANK_DISCHARGE_CURVE';
}

export type FsrLifecycleStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'CUSTOMER_PENDING' 
  | 'VERIFIED' 
  | 'FINALIZED' 
  | 'AMENDED';

export type FsrSyncStatus = 'LOCAL' | 'QUEUED' | 'SYNCING' | 'SYNCED' | 'CONFLICT';

export interface FSRSubmission {
  fsrId: string;
  ticketId: string;
  tenantId?: TenantId;
  technicianId: string;
  assetType: AssetType | string;
  serviceType: TicketServiceType | string;
  lifecycleStatus?: FsrLifecycleStatus;
  syncStatus?: FsrSyncStatus;
  formData: Record<string, any>;
  evidenceIds: string[];
  clientUpdatedAt?: string;
  syncedAt?: string | null;
  customerSigneeName: string;
  customerSigneeTitle: string;
  isVerified?: boolean;
  signedDigitalHash?: string;
  s3WormReceipt?: string;
}

export interface GatePassRecord {
  gatePassId: string;
  token: string;
  ticketId: string;
  tenantId?: TenantId;
  branchId: string;
  branchName?: string;
  technicianId: string;
  technicianCnicOrId: string;
  technicianName: string;
  purpose: string;
  validFrom?: string;
  validUntil?: string;
  nonce?: string;
  hmacSignature?: string;
  status: 'ISSUED' | 'SCANNED_AT_GUARD' | 'ACCESS_GRANTED' | 'CHECKED_IN' | 'EXPIRED' | 'REVOKED';
  securityOfficerName?: string;
  verifiedAt?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export interface ManufacturerFaultCode {
  code: string;
  series: string;
  title: string;
  category: 'INVERTER' | 'RECTIFIER' | 'BATTERY_CIRCUIT' | 'BYPASS_SCR' | 'THERMAL' | 'COMMUNICATION';
  severity: 'CRITICAL_ALARM' | 'MAJOR_WARNING' | 'MINOR_ADVISORY';
  description: string;
  recommendedProcedure: string[];
  requiredSpares: { itemId: string; itemName: string; quantity: number }[];
  safetyPrecautions: string[];
}

export interface PreventiveMaintenancePlan {
  planId: string;
  tenantId: TenantId;
  branchId?: string;
  planTitle?: string;
  assetId: string;
  assetName: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  lastServiceDate: string;
  nextDueDate: string;
  scopeOfWork: string[];
  isOverdue: boolean;
}

export interface InstallationCommissioningJob {
  jobId: string;
  tenantId: TenantId;
  branchId: string;
  assetModel: string;
  capacityKva: number;
  stage: 'SITE_SURVEY' | 'INFRA_PREPARATION' | 'RIGGING_INSTALL' | 'ELECTRICAL_CABLING' | 'COMMISSIONING' | 'LOAD_BANK_100' | 'SIGN_OFF';
  targetLiveDate: string;
  assignedLeadEngineerId: string;
  checkpointsCompleted: number;
  totalCheckpoints: number;
}
