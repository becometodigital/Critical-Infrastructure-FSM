import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { LiveDispatchMap } from './components/CommandCenter/LiveDispatchMap';
import { AssetTopologyTree } from './components/Assets/AssetTopologyTree';
import { FieldServiceReport } from './components/FieldExecution/FieldServiceReport';
import { GatePassManager } from './components/GatePass/GatePassManager';
import { SlaEscalationDashboard } from './components/SLA/SlaEscalationDashboard';
import { VanStockLedger } from './components/Inventory/VanStockLedger';
import { OutboxEventStream } from './components/Outbox/OutboxEventStream';
import { ArchitectureBlueprint } from './components/Architecture/ArchitectureBlueprint';
import { MobileTerminalModal } from './components/MobileSimulator/MobileTerminalModal';
import { NewTicketModal } from './components/Modals/NewTicketModal';

// Pioneer Enterprise & Role-Specific Portal Modules
import { RemoteMonitoringHub } from './components/RemoteMonitoring/RemoteMonitoringHub';
import { BatteryBankManager } from './components/Batteries/BatteryBankManager';
import { PreventiveAndLifecycleManager } from './components/PreventiveMaintenance/PreventiveAndLifecycleManager';
import { BankBranchPortal } from './components/Portals/BankBranchPortal';
import { BankSecurityPortal } from './components/Portals/BankSecurityPortal';
import { AuditorPortal } from './components/Portals/AuditorPortal';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthScreen } from './components/Auth/AuthScreen';

import {
  INITIAL_TENANTS,
  INITIAL_BRANCHES,
  INITIAL_ASSETS,
  INITIAL_TECHNICIANS,
  INITIAL_TICKETS,
  INITIAL_OUTBOX_EVENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_INVENTORY_LEDGER,
  INITIAL_MANUFACTURER_FAULT_CODES,
  INITIAL_PREVENTIVE_PLANS,
  INITIAL_INSTALLATION_JOBS,
  INITIAL_GATE_PASSES,
  INITIAL_FSR_RECORDS,
} from './data/mockDatabase';
import {
  TenantId,
  Ticket,
  Asset,
  OutboxEvent,
  AuditLog,
  InventoryLedgerEntry,
  PriorityLevel,
  PreventiveMaintenancePlan,
  TicketServiceType,
  UserRole,
  SlaPauseReasonCode,
  GatePassRecord,
  FSRSubmission,
} from './types/fsm';
import { FsmApiClient } from './utils/apiClient';
import { AuthProvider, useAuth } from './utils/AuthContext';
import { BRAND } from './config/brand';

function AppContent() {
  const { session, switchTenant, isLoading } = useAuth();

  const [tenants] = useState(INITIAL_TENANTS);
  const currentTenantId = (session?.activeTenantId as TenantId) || 'tenant-hbl-001';
  const [activeTab, setActiveTab] = useState<ActiveTab>('bank_dashboard');

  // Application Data States
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [technicians, setTechnicians] = useState(INITIAL_TECHNICIANS);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [gatePasses, setGatePasses] = useState<GatePassRecord[]>(INITIAL_GATE_PASSES);
  const [fsrRecords, setFsrRecords] = useState<FSRSubmission[]>(INITIAL_FSR_RECORDS);
  const [outboxEvents, setOutboxEvents] = useState<OutboxEvent[]>(INITIAL_OUTBOX_EVENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [inventoryItems] = useState(INITIAL_INVENTORY_ITEMS);
  const [ledgerEntries, setLedgerEntries] = useState<InventoryLedgerEntry[]>(INITIAL_INVENTORY_LEDGER);
  const [faultCodes] = useState(INITIAL_MANUFACTURER_FAULT_CODES);
  const [pmPlans] = useState(INITIAL_PREVENTIVE_PLANS);
  const [commissioningJobs, setCommissioningJobs] = useState(INITIAL_INSTALLATION_JOBS);

  // Modals
  const [isMobileSimOpen, setIsMobileSimOpen] = useState<boolean>(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Auto-route active tab when portalType changes
  useEffect(() => {
    if (!session) return;
    if (session.portalType === 'BANK_PORTAL') {
      setActiveTab('bank_dashboard');
    } else if (session.portalType === 'BANK_SECURITY_KIOSK') {
      setActiveTab('security_kiosk');
    } else if (session.portalType === 'AUDITOR_PORTAL') {
      setActiveTab('auditor_suite');
    } else if (session.portalType === 'PIONEER_NOC_DISPATCH') {
      setActiveTab('dispatch');
    } else if (session.portalType === 'TECHNICIAN_MOBILE') {
      setActiveTab('dispatch');
    }
  }, [session?.portalType]);

  // Synchronize client context with API client whenever tenant or session changes
  const syncData = async () => {
    try {
      const [branchesRes, assetsRes, ticketsRes, techsRes, logsRes, gpRes, fsrRes] = await Promise.all([
        FsmApiClient.getBranches(),
        FsmApiClient.getAssets(),
        FsmApiClient.getTickets(),
        FsmApiClient.getTechnicians(),
        FsmApiClient.getAuditLogs(),
        FsmApiClient.getGatePasses().catch(() => ({ gatePasses: INITIAL_GATE_PASSES })),
        FsmApiClient.getFsrRecords().catch(() => ({ fsrRecords: INITIAL_FSR_RECORDS })),
      ]);
      if (branchesRes.branches?.length) setBranches(branchesRes.branches);
      if (assetsRes.assets?.length) setAssets(assetsRes.assets);
      if (ticketsRes.tickets?.length) setTickets(ticketsRes.tickets);
      if (techsRes.technicians?.length) setTechnicians(techsRes.technicians);
      if (logsRes.auditLogs?.length) setAuditLogs(logsRes.auditLogs);
      if (gpRes.gatePasses?.length) setGatePasses(gpRes.gatePasses);
      if (fsrRes.fsrRecords?.length) setFsrRecords(fsrRes.fsrRecords);
    } catch (err) {
      console.warn('Backend live sync fallback to local store:', err);
    }
  };

  useEffect(() => {
    FsmApiClient.setTenantContext(currentTenantId);
    syncData();
  }, [currentTenantId, session?.userId]);

  // Active branch for bank users
  const currentBranch = session?.branchId
    ? branches.find((b) => b.branchId === session.branchId)
    : branches[0];

  // Calculate live badges
  const tenantAssets = assets.filter((a) => a.tenantId === currentTenantId);
  const criticalDegradedCount = tenantAssets.filter(
    (a) => a.status === 'DEGRADED' || a.status === 'CRITICAL_FAULT'
  ).length;
  const pendingOutboxCount = outboxEvents.filter((e) => e.status === 'PENDING').length;

  // 1. Dispatch & Assign Technician
  const handleAssignTechnician = async (
    ticketId: string,
    technicianId: string,
    selectedPartIds: string[] = ['item-bat-01']
  ) => {
    const tech = technicians.find((t) => t.technicianId === technicianId);

    try {
      await FsmApiClient.smartAssignTechnician(ticketId, technicianId, selectedPartIds);
    } catch (e) {
      console.error('Dispatch assignment failed:', e);
      return;
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.ticketId === ticketId
          ? {
              ...t,
              assignedTechnicianId: technicianId,
              status: 'TRAVELING',
              assignedAt: new Date().toISOString(),
              reservedParts: selectedPartIds,
            }
          : t
      )
    );

    setTechnicians((prev) =>
      prev.map((t) =>
        t.technicianId === technicianId
          ? {
              ...t,
              activeTicketsCount: t.activeTicketsCount + 1,
              vanInventory: t.vanInventory.map((item) =>
                selectedPartIds.includes(item.itemId) && item.quantityAvailable > 0
                  ? {
                      ...item,
                      quantityAvailable: item.quantityAvailable - 1,
                      quantityReserved: item.quantityReserved + 1,
                    }
                  : item
              ),
            }
          : t
      )
    );

    const newEvent: OutboxEvent = {
      eventId: `evt-${Date.now()}`,
      tenantId: currentTenantId,
      aggregateType: 'TICKET',
      aggregateId: ticketId,
      eventType: 'DISPATCH_ASSIGNED',
      idempotencyKey: `idem-assign-${Date.now()}`,
      payload: {
        ticketId,
        technicianId,
        technicianName: tech?.fullName,
        allocatedParts: selectedPartIds,
      },
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    setOutboxEvents((prev) => [newEvent, ...prev]);

    const newAuditLog: AuditLog = {
      logId: `aud-${Date.now()}`,
      tenantId: currentTenantId,
      actorId: session?.userId || 'usr-dispatch-lead-01',
      actorRole: session?.role || 'PIONEER_DISPATCH_CONTROLLER',
      userSessionId: 'sess-active',
      deviceId: 'web-noc-console-01',
      requestId: `req-${Date.now()}`,
      correlationId: `corr-${ticketId}`,
      actionEvent: 'UPDATE',
      entityType: 'tickets',
      entityId: ticketId,
      oldValues: { status: 'NEW', assigned_technician_id: null },
      newValues: { status: 'TRAVELING', assigned_technician_id: technicianId },
      ipAddress: '192.168.10.45',
      userAgent: 'Pioneer-NOC/2026.2',
      reason: 'Spatial PostGIS closest certified engineer match',
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newAuditLog, ...prev]);
  };

  // 2. Geofence Check
  const handleRecordGeofenceCheck = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.ticketId === ticketId
          ? {
              ...t,
              status: 'ARRIVED',
              arrivedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // 3. Swap Battery Cell
  const handleSwapBatteryCell = async (parentBankId: string, oldCellId: string, newSerialNumber: string) => {
    try {
      await FsmApiClient.swapBatteryCell(parentBankId, oldCellId, newSerialNumber);
    } catch (e) {
      console.error('Battery cell swap failed:', e);
      return;
    }

    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.assetId === parentBankId && asset.batteryCells) {
          return {
            ...asset,
            status: 'OPERATIONAL',
            currentImpedanceMohm: 8.8,
            batteryCells: asset.batteryCells.map((cell) =>
              cell.cellId === oldCellId
                ? {
                    ...cell,
                    serialNumber: newSerialNumber,
                    internalResistanceMohm: 8.5,
                    status: 'HEALTHY',
                    installedDate: new Date().toISOString().split('T')[0],
                  }
                : cell
            ),
          };
        }
        return asset;
      })
    );

    const newEvent: OutboxEvent = {
      eventId: `evt-${Date.now()}`,
      tenantId: currentTenantId,
      aggregateType: 'BATTERY_CELL',
      aggregateId: oldCellId,
      eventType: 'BATTERY_CELL_SWAPPED',
      idempotencyKey: `idem-bat-swap-${Date.now()}`,
      payload: { parentBankId, oldCellId, newSerialNumber },
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    setOutboxEvents((prev) => [newEvent, ...prev]);
  };

  // 4. Record Impedance
  const handleRecordImpedance = async (assetId: string, newImpedance: number, newTemp?: number) => {
    try {
      await FsmApiClient.ingestTelemetry({
        assetId,
        impedanceMohm: newImpedance,
        voltageV: 415,
        temperatureC: newTemp || 26.0,
      });
    } catch (e) {
      console.error('Telemetry update failed:', e);
      return;
    }

    setAssets((prev) =>
      prev.map((a) =>
        a.assetId === assetId
          ? {
              ...a,
              currentImpedanceMohm: newImpedance,
              liveTemperatureC: newTemp || a.liveTemperatureC,
              status: newImpedance > 14.0 ? 'CRITICAL_FAULT' : newImpedance > 11.5 ? 'DEGRADED' : 'OPERATIONAL',
            }
          : a
      )
    );
  };

  // 5. Submit FSR
  const handleSubmitFSR = async (fsrData: any) => {
    try {
      await FsmApiClient.submitFSR(fsrData);
    } catch (e) {
      console.error('FSR submission failed:', e);
      return;
    }

    const newFsrSubmission: FSRSubmission = {
      fsrId: `fsr-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId: fsrData.ticketId,
      technicianId: fsrData.technicianId,
      assetType: fsrData.assetType || 'INDUSTRIAL_UPS',
      serviceType: fsrData.serviceType || 'EMERGENCY_REPAIR',
      formData: fsrData.formData,
      evidenceIds: fsrData.evidenceIds || [],
      customerSigneeName: fsrData.customerSigneeName,
      customerSigneeTitle: fsrData.customerSigneeTitle,
      signedDigitalHash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855_${Date.now()}`,
      syncedAt: new Date().toISOString(),
      s3WormReceipt: `s3://pioneer-worm-vault-2026/${currentTenantId}/${fsrData.ticketId}.pdf.locked`,
    };

    setFsrRecords((prev) => [newFsrSubmission, ...prev]);

    setTickets((prev) =>
      prev.map((t) =>
        t.ticketId === fsrData.ticketId
          ? {
              ...t,
              status: 'VERIFIED_CLOSED',
              completedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // 6. Pause SLA
  const handlePauseTicket = async (ticketId: string, reasonCode: SlaPauseReasonCode, reasonDescription: string) => {
    try {
      await FsmApiClient.pauseSLA(ticketId, reasonCode, reasonDescription);
    } catch (e) {
      console.error('SLA pause failed:', e);
      return;
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.ticketId === ticketId
          ? {
              ...t,
              status: 'SLA_PAUSED',
              pauseIntervals: [
                ...(t.pauseIntervals || []),
                {
                  pauseId: `pause-${Date.now()}`,
                  reasonCode,
                  reasonDescription,
                  pausedAt: new Date().toISOString(),
                  resumedAt: null,
                  actorUserId: session?.userId || 'usr-dispatch-lead-01',
                  approvedBy: 'Bank Compliance Desk',
                },
              ],
            }
          : t
      )
    );
  };

  // 7. Resume SLA
  const handleResumeTicket = async (ticketId: string) => {
    try {
      await FsmApiClient.resumeSLA(ticketId);
    } catch (e) {
      console.error('SLA resume failed:', e);
      return;
    }

    setTickets((prev) =>
      prev.map((t) => {
        if (t.ticketId === ticketId) {
          const updatedIntervals = (t.pauseIntervals || []).map((p, idx, arr) =>
            idx === arr.length - 1 && !p.resumedAt ? { ...p, resumedAt: new Date().toISOString() } : p
          );
          return {
            ...t,
            status: 'IN_PROGRESS',
            pauseIntervals: updatedIntervals,
          };
        }
        return t;
      })
    );
  };

  // 8. Auto-Trigger Ticket from IoT
  const handleAutoTriggerTicketFromIoT = (
    assetId: string,
    faultCode: string,
    description: string,
    priority: PriorityLevel
  ) => {
    const asset = assets.find((a) => a.assetId === assetId);
    const newTktId = `tkt-${Date.now().toString().slice(-4)}`;
    const newTicket: Ticket = {
      ticketId: newTktId,
      ticketNumber: `TKT-2026-IOT-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: currentTenantId,
      branchId: asset?.branchId || 'br-hbl-01',
      assetId,
      serviceType: 'EMERGENCY_BREAKDOWN',
      priority,
      status: 'NEW',
      issueSummary: `[IoT Alarm ${faultCode}] ${description}`,
      contractType: 'COMPREHENSIVE_AMC',
      contractSla: 'FOUR_HOUR_ONSITE',
      isCoveredUnderAmc: true,
      internalDispatchTargetMinutes: 5,
      dispatchSlaDeadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      customerSlaDeadline: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
      assignedTechnicianId: null,
      idempotencyKey: `idem-iot-${Date.now()}`,
      createdAt: new Date().toISOString(),
      pauseIntervals: [],
      reservedParts: [],
    };

    setTickets((prev) => [newTicket, ...prev]);
    setActiveTab('dispatch');
  };

  // 9. PM Ticket Generation
  const handleGeneratePMTicket = (plan: PreventiveMaintenancePlan) => {
    const newTktId = `tkt-pm-${Date.now().toString().slice(-4)}`;
    const newTicket: Ticket = {
      ticketId: newTktId,
      ticketNumber: `TKT-2026-PM-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: currentTenantId,
      branchId: plan.branchId,
      assetId: plan.assetId,
      serviceType: 'PREVENTIVE_MAINTENANCE',
      priority: 'MEDIUM',
      status: 'NEW',
      issueSummary: `Scheduled PM Routine: ${plan.planTitle}`,
      contractType: 'COMPREHENSIVE_AMC',
      contractSla: 'NEXT_BUSINESS_DAY',
      isCoveredUnderAmc: true,
      internalDispatchTargetMinutes: 60,
      dispatchSlaDeadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      customerSlaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      assignedTechnicianId: null,
      idempotencyKey: `idem-pm-${Date.now()}`,
      createdAt: new Date().toISOString(),
      pauseIntervals: [],
      reservedParts: [],
    };

    setTickets((prev) => [newTicket, ...prev]);
    setActiveTab('dispatch');
  };

  // 10. Advance Commissioning Stage
  const handleAdvanceCommissioningStage = (jobId: string) => {
    setCommissioningJobs((prev) =>
      prev.map((job) => {
        if (job.jobId === jobId) {
          const stages = ['SITE_SURVEY', 'PHYSICAL_INSTALLATION', 'LOAD_BANK_TESTING', 'HANDOVER_SIGN_OFF', 'COMPLETED'];
          const currentIndex = stages.indexOf(job.stage);
          const nextStage = stages[Math.min(currentIndex + 1, stages.length - 1)] as any;
          return {
            ...job,
            stage: nextStage,
            batteryLoadBankTested: nextStage === 'HANDOVER_SIGN_OFF' || nextStage === 'COMPLETED' ? true : job.batteryLoadBankTested,
          };
        }
        return job;
      })
    );
  };

  // 11. Transfer to Van
  const handleTransferToVan = (technicianId: string, itemId: string, quantity: number) => {
    const item = inventoryItems.find((i) => i.itemId === itemId);
    const newLedger: InventoryLedgerEntry = {
      ledgerId: `ledg-${Date.now()}`,
      tenantId: currentTenantId,
      itemId,
      itemName: item?.itemName || 'Industrial Spare',
      sourceType: 'CENTRAL_WAREHOUSE',
      sourceId: 'wh-khi-central',
      destinationType: 'TECH_VAN',
      destinationId: technicianId,
      transactionType: 'TRANSFER',
      quantity,
      recordedAt: new Date().toISOString(),
      operatorUserId: session?.userId || 'usr-warehouse-lead',
    };

    setLedgerEntries((prev) => [newLedger, ...prev]);
    setTechnicians((prev) =>
      prev.map((tech) =>
        tech.technicianId === technicianId
          ? {
              ...tech,
              vanInventory: tech.vanInventory.map((v) =>
                v.itemId === itemId ? { ...v, quantityAvailable: v.quantityAvailable + quantity } : v
              ),
            }
          : tech
      )
    );
  };

  // 12. Process Outbox Batch
  const handleProcessOutboxBatch = async () => {
    try {
      await FsmApiClient.processOutboxBatch();
    } catch (e) {
      console.error('Outbox processing failed:', e);
      return;
    }

    setOutboxEvents((prev) =>
      prev.map((e) => (e.status === 'PENDING' ? { ...e, status: 'PROCESSED', processedAt: new Date().toISOString() } : e))
    );
  };

  // 13. Create New Manual Ticket
  const handleCreateNewTicket = (ticketData: {
    branchId: string;
    assetId: string;
    priority: PriorityLevel;
    issueSummary: string;
  }) => {
    const newTktId = `tkt-${Date.now().toString().slice(-4)}`;
    const newTicket: Ticket = {
      ticketId: newTktId,
      ticketNumber: `TKT-2026-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: currentTenantId,
      branchId: ticketData.branchId,
      assetId: ticketData.assetId,
      serviceType: 'EMERGENCY_BREAKDOWN',
      priority: ticketData.priority,
      status: 'NEW',
      issueSummary: ticketData.issueSummary,
      contractType: 'COMPREHENSIVE_AMC',
      contractSla: 'FOUR_HOUR_ONSITE',
      isCoveredUnderAmc: true,
      internalDispatchTargetMinutes: 5,
      dispatchSlaDeadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      customerSlaDeadline: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
      assignedTechnicianId: null,
      idempotencyKey: `idem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      pauseIntervals: [],
      reservedParts: [],
    };

    setTickets((prev) => [newTicket, ...prev]);

    const newEvent: OutboxEvent = {
      eventId: `evt-${Date.now()}`,
      tenantId: currentTenantId,
      aggregateType: 'TICKET',
      aggregateId: newTktId,
      eventType: 'TICKET_CREATED',
      idempotencyKey: `idem-tkt-create-${Date.now()}`,
      payload: {
        ticketNumber: newTicket.ticketNumber,
        priority: newTicket.priority,
        branchId: newTicket.branchId,
        assetId: newTicket.assetId,
      },
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    setOutboxEvents((prev) => [newEvent, ...prev]);

    if (session?.portalType === 'BANK_PORTAL') {
      setActiveTab('bank_dashboard');
    } else {
      setActiveTab('dispatch');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xs font-mono tracking-wider uppercase text-slate-300">
          Initializing Enterprise Identity Context...
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* 1. Header with Authenticated Persona, Tenant RLS Context, Outbox Badge */}
      <Header
        tenants={tenants}
        currentTenantId={currentTenantId}
        onSelectTenant={switchTenant}
        pendingOutboxCount={pendingOutboxCount}
        openMobileSimulator={() => setIsMobileSimOpen(true)}
        openNewTicketModal={() => setIsNewTicketOpen(true)}
        openAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* 2. Architectural Tab Navigation Filtered by Active Role / Portal */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        criticalAlertCount={criticalDegradedCount}
        outboxPendingCount={pendingOutboxCount}
      />

      {/* 3. Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Role-Specific Portals */}
        {activeTab === 'bank_dashboard' && (
          <BankBranchPortal
            branch={currentBranch}
            assets={assets}
            tickets={tickets}
            gatePasses={gatePasses}
            fsrRecords={fsrRecords}
            onOpenNewTicket={() => setIsNewTicketOpen(true)}
            onRefreshData={syncData}
          />
        )}

        {activeTab === 'security_kiosk' && (
          <BankSecurityPortal
            gatePasses={gatePasses}
            tickets={tickets}
            technicians={technicians}
            onRefreshData={syncData}
          />
        )}

        {activeTab === 'auditor_suite' && (
          <AuditorPortal
            auditLogs={auditLogs}
            outboxEvents={outboxEvents}
            fsrRecords={fsrRecords}
            tickets={tickets}
            onRefreshData={syncData}
          />
        )}

        {/* Pioneer Operational Modules */}
        {activeTab === 'dispatch' && (
          <LiveDispatchMap
            currentTenantId={currentTenantId}
            branches={branches}
            technicians={technicians}
            tickets={tickets}
            assets={assets}
            onAssignTechnician={handleAssignTechnician}
            onRecordGeofenceCheck={handleRecordGeofenceCheck}
          />
        )}

        {activeTab === 'remote_monitoring' && (
          <RemoteMonitoringHub
            currentTenantId={currentTenantId}
            assets={assets}
            faultCodes={faultCodes}
            onAutoTriggerTicket={handleAutoTriggerTicketFromIoT}
          />
        )}

        {activeTab === 'battery_management' && (
          <BatteryBankManager
            currentTenantId={currentTenantId}
            assets={assets}
            onSwapBatteryCell={handleSwapBatteryCell}
            onRecordImpedance={handleRecordImpedance}
          />
        )}

        {activeTab === 'pm_lifecycle' && (
          <PreventiveAndLifecycleManager
            currentTenantId={currentTenantId}
            assets={assets}
            pmPlans={pmPlans}
            commissioningJobs={commissioningJobs}
            tickets={tickets}
            onGeneratePMTicket={handleGeneratePMTicket}
            onAdvanceCommissioningStage={handleAdvanceCommissioningStage}
          />
        )}

        {activeTab === 'topology' && (
          <AssetTopologyTree
            currentTenantId={currentTenantId}
            assets={assets}
            onSwapBatteryCell={handleSwapBatteryCell}
            onRecordImpedance={handleRecordImpedance}
          />
        )}

        {activeTab === 'fsr' && (
          <FieldServiceReport
            currentTenantId={currentTenantId}
            tickets={tickets}
            onSubmitFSR={handleSubmitFSR}
          />
        )}

        {activeTab === 'gatepass' && (
          <GatePassManager
            currentTenantId={currentTenantId}
            tickets={tickets}
            technicians={technicians}
          />
        )}

        {activeTab === 'sla' && (
          <SlaEscalationDashboard
            currentTenantId={currentTenantId}
            tenants={tenants}
            tickets={tickets}
            branches={branches}
            onPauseTicket={handlePauseTicket}
            onResumeTicket={handleResumeTicket}
          />
        )}

        {activeTab === 'inventory' && (
          <VanStockLedger
            currentTenantId={currentTenantId}
            technicians={technicians}
            inventoryItems={inventoryItems}
            ledgerEntries={ledgerEntries}
            onTransferToVan={handleTransferToVan}
            onReservePart={() => {}}
          />
        )}

        {activeTab === 'outbox' && (
          <OutboxEventStream
            currentTenantId={currentTenantId}
            outboxEvents={outboxEvents}
            auditLogs={auditLogs}
            onProcessOutboxBatch={handleProcessOutboxBatch}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureBlueprint />}

      </main>

      {/* 4. Interactive Modals */}
      <MobileTerminalModal
        isOpen={isMobileSimOpen}
        onClose={() => setIsMobileSimOpen(false)}
        currentTenantId={currentTenantId}
        technicians={technicians}
        tickets={tickets}
        onSyncOfflineQueue={() => {
          handleProcessOutboxBatch();
        }}
      />

      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        currentTenantId={currentTenantId}
        branches={branches}
        assets={assets}
        onCreateTicket={handleCreateNewTicket}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 5. Production Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs text-slate-400 py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <div>
            {BRAND.name} • {BRAND.product} • Multi-Tenant Security
          </div>
          <div className="text-slate-500">
            Enterprise API • RBAC • Audit Trail • SLA Automation
          </div>
        </div>
      </footer>

    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
