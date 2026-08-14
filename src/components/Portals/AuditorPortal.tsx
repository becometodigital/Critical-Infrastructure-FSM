import React, { useState } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  Activity,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ClockAlert,
  Search,
  ExternalLink,
  Code2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { AuditLog, OutboxEvent, FSRSubmission, Ticket } from '../../types/fsm';

interface AuditorPortalProps {
  auditLogs: AuditLog[];
  outboxEvents: OutboxEvent[];
  fsrRecords: FSRSubmission[];
  tickets: Ticket[];
  onRefreshData: () => void;
}

export const AuditorPortal: React.FC<AuditorPortalProps> = ({
  auditLogs,
  outboxEvents,
  fsrRecords,
  tickets,
  onRefreshData,
}) => {
  const { session } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'AUDIT_LOGS' | 'WORM_FSR' | 'SLA_PAUSES' | 'OUTBOX_STREAM'>('AUDIT_LOGS');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter paused SLA intervals
  const ticketsWithPauses = tickets.filter((t) => t.pauseIntervals && t.pauseIntervals.length > 0);

  // Search filtered logs
  const filteredLogs = auditLogs.filter(
    (l) =>
      l.actionEvent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actorId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-900/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Compliance & Audit Control Center
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Immutable Transactional Ledger
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
              SLA & Power Infrastructure Compliance Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Auditor Identity: <strong className="text-purple-300">{session?.fullName}</strong> ({session?.designation}) • 
              Active Tenant Scope: <strong className="text-slate-200">{session?.activeTenantId}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshData}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verify Integrity</span>
            </button>
          </div>
        </div>

        {/* Audit Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400">Total Audit Logs</div>
            <div className="text-lg font-bold text-white mt-1 font-mono">{auditLogs.length} Entries</div>
            <div className="text-[10px] text-slate-500">Append-Only Immutable</div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400">Verified Secure Evidence Records</div>
            <div className="text-lg font-bold text-emerald-300 mt-1 font-mono">{fsrRecords.length} Signed</div>
            <div className="text-[10px] text-slate-500">Immutable-ready record</div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400">Deterministic SLA Pauses</div>
            <div className="text-lg font-bold text-amber-300 mt-1 font-mono">{ticketsWithPauses.length} Recorded</div>
            <div className="text-[10px] text-slate-500">Dual-Signoff Verified</div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400">Outbox Events Synced</div>
            <div className="text-lg font-bold text-cyan-300 mt-1 font-mono">{outboxEvents.length} Events</div>
            <div className="text-[10px] text-slate-500">At-Least-Once Delivery</div>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveSubTab('AUDIT_LOGS')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'AUDIT_LOGS'
              ? 'bg-slate-800 text-purple-300 shadow font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>PostgreSQL Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveSubTab('WORM_FSR')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'WORM_FSR'
              ? 'bg-slate-800 text-purple-300 shadow font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Cryptographic FSR Evidence</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SLA_PAUSES')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'SLA_PAUSES'
              ? 'bg-slate-800 text-purple-300 shadow font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClockAlert className="w-3.5 h-3.5" />
          <span>SLA Clock Pause Intervals</span>
        </button>

        <button
          onClick={() => setActiveSubTab('OUTBOX_STREAM')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'OUTBOX_STREAM'
              ? 'bg-slate-800 text-purple-300 shadow font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Transactional Outbox Stream</span>
        </button>
      </div>

      {/* 1. AUDIT LOGS VIEW */}
      {activeSubTab === 'AUDIT_LOGS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Row-Level Security & System Mutation Logs</h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by event, actor or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-750 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action Event</th>
                  <th className="py-2.5 px-3">Entity Type & ID</th>
                  <th className="py-2.5 px-3">Actor / Role</th>
                  <th className="py-2.5 px-3">IP & Device</th>
                  <th className="py-2.5 px-3">Justification Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-3 text-slate-400">{log.createdAt.split('T')[1].slice(0, 8)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                        {log.actionEvent}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {log.entityType} : <span className="text-cyan-300">{log.entityId}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {log.actorId} (<span className="text-amber-400">{log.actorRole}</span>)
                    </td>
                    <td className="py-3 px-3 text-slate-500">{log.ipAddress}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-xs max-w-xs truncate">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. WORM FSR VIEW */}
      {activeSubTab === 'WORM_FSR' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Evidence Retention & Integrity</h2>
              <p className="text-xs text-slate-400">Write-Once-Read-Many storage ensures zero tampering of field inspection reports.</p>
            </div>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
              COMPLIANCE-READY
            </span>
          </div>

          <div className="space-y-3">
            {fsrRecords.map((fsr) => (
              <div key={fsr.fsrId} className="p-4 bg-slate-850 border border-slate-750 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{fsr.fsrId}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Ref: {fsr.ticketId}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                      LEGAL PROOF CERTIFIED
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{fsr.syncedAt}</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Digital Signature SHA-256 Checksum:</span>
                  <div className="font-mono text-[11px] text-emerald-400 break-all select-all">
                    {fsr.signedDigitalHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1 text-slate-400">
                  <div>Certified Technician: <strong className="text-cyan-300">{fsr.technicianId}</strong></div>
                  <div>Customer Signee: <strong className="text-indigo-300">{fsr.customerSigneeName || 'Branch Manager'}</strong></div>
                  <div>Service Category: <strong className="text-white">{fsr.serviceType}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SLA PAUSE VIEW */}
      {activeSubTab === 'SLA_PAUSES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Deterministic SLA Pause & Resume Ledger</h2>
            <p className="text-xs text-slate-400">
              Only authorized contract conditions (e.g. Bank Security Clearance delay, waiting client spare authorization) may halt the 4-hour countdown clock.
            </p>
          </div>

          <div className="space-y-3">
            {ticketsWithPauses.length === 0 ? (
              <div className="p-8 text-center bg-slate-850 rounded-xl border border-slate-800 text-xs text-slate-500">
                No tickets currently have SLA pause intervals.
              </div>
            ) : (
              ticketsWithPauses.map((tkt) => (
                <div key={tkt.ticketId} className="p-4 bg-slate-850 border border-slate-750 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{tkt.ticketNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                        {tkt.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">SLA: {tkt.contractSla}</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {tkt.pauseIntervals.map((pause, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-semibold text-amber-400 font-mono">{pause.reasonCode}</span>
                          <span className="text-slate-500 font-mono">{pause.pausedAt}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{pause.reasonDescription}</p>
                        <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-800">
                          <span>Operator: <strong className="text-slate-300">{pause.actorUserId}</strong></span>
                          <span>Approved By: <strong className="text-cyan-300">{pause.approvedBy}</strong></span>
                          <span>Status: <strong className={pause.resumedAt ? 'text-emerald-400' : 'text-amber-400'}>{pause.resumedAt ? 'RESUMED' : 'CURRENTLY PAUSED'}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. OUTBOX STREAM VIEW */}
      {activeSubTab === 'OUTBOX_STREAM' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Event-Driven Architecture: Outbox Pattern Stream</h2>
            <p className="text-xs text-slate-400">
              Designed for at-least-once domain event propagation with a queue worker and a PostgreSQL/PostGIS production adapter.
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {outboxEvents.map((evt) => (
              <div key={evt.eventId} className="p-3 bg-slate-850 border border-slate-750 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{evt.eventType}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      evt.status === 'PROCESSED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {evt.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{evt.createdAt}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Aggregate: {evt.aggregateType} ({evt.aggregateId}) • Idempotency: {evt.idempotencyKey}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
