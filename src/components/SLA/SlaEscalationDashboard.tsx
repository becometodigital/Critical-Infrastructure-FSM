import React, { useState, useEffect } from 'react';
import {
  ClockAlert,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { TenantId, Ticket, Branch, PriorityLevel, SlaPauseReasonCode, Tenant } from '../../types/fsm';
import {
  evaluateTicketSla,
  getSlaTargets,
  formatMinutesToHhMm,
} from '../../utils/slaCalculator';

interface SlaEscalationDashboardProps {
  currentTenantId: TenantId;
  tenants: Tenant[];
  tickets: Ticket[];
  branches: Branch[];
  onPauseTicket: (ticketId: string, reasonCode: SlaPauseReasonCode, description: string) => void;
  onResumeTicket: (ticketId: string) => void;
}

export const SlaEscalationDashboard: React.FC<SlaEscalationDashboardProps> = ({
  currentTenantId,
  tenants,
  tickets,
  branches,
  onPauseTicket,
  onResumeTicket,
}) => {
  const currentTenant = tenants.find((t) => t.tenantId === currentTenantId) || tenants[0];
  const tenantTickets = tickets.filter((t) => t.tenantId === currentTenantId);

  const [pauseModalTicket, setPauseModalTicket] = useState<Ticket | null>(null);
  const [selectedReasonCode, setSelectedReasonCode] = useState<SlaPauseReasonCode>('WAITING_BANK_CLEARANCE');
  const [pauseReasonDescription, setPauseReasonDescription] = useState<string>(
    'Bank security checkpoint clearance delayed for vault power room escort.'
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Tick every 10 seconds to update live countdowns
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  const handlePauseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseModalTicket) return;
    onPauseTicket(pauseModalTicket.ticketId, selectedReasonCode, pauseReasonDescription);
    setPauseModalTicket(null);
  };

  const currencySymbol = currentTenant.currency === 'PKR' ? '₨' : currentTenant.currency === 'USD' ? '$' : '€';
  const hourlyRate = currentTenant.hourlyPenaltyRate || 50000;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <ClockAlert className="w-4 h-4" />
            Deterministic SLA Engine & Escalation Policy
          </div>
          <h2 className="text-xl font-semibold text-white">
            High-Precision MTTA/MTTR Timers with Verified Pause Intervals & Penalty Governance
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Calculates net elapsed duration (T_net = T_elapsed - Σ ΔT_pause) to trigger scheduled escalation jobs at 50% (L1 Warning), 75% (L2 Escalation), and 100% (L3 Breach with contractual penalties for {currentTenant.bankName}).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">CONTRACT HOURLY PENALTY</span>
            <span className="text-amber-400 font-bold">{currencySymbol} {hourlyRate.toLocaleString()} / Hr</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">INTERNAL DISPATCH TARGET</span>
            <span className="text-cyan-400 font-bold">{currentTenant.internalDispatchTargetMinutes || 5} Mins</span>
          </div>
        </div>
      </div>

      {/* Live SLA Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Active Critical Infrastructure SLA Matrix
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Auto-refresh: 10s • System Clock: {currentTime.toLocaleTimeString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="pb-3 px-3">Ticket Ref</th>
                <th className="pb-3 px-3">Branch & Criticality</th>
                <th className="pb-3 px-3">Priority</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Net Elapsed / Target</th>
                <th className="pb-3 px-3">SLA Progress</th>
                <th className="pb-3 px-3">Escalation Tier</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {tenantTickets.map((ticket) => {
                const branch = branches.find((b) => b.branchId === ticket.branchId);
                const sla = evaluateTicketSla(ticket, branch?.criticalityLevel || 'P2', currentTime);
                const isPaused = ticket.status === 'PAUSED_FOR_PARTS' || ticket.status === 'PAUSED_SECURITY_CLEARANCE';
                const penaltyAmt = (sla.overdueMinutes / 60) * (hourlyRate / (ticket.priority === 'CRITICAL' ? 1 : ticket.priority === 'HIGH' ? 1.5 : 2));

                return (
                  <tr key={ticket.ticketId} className="hover:bg-slate-800/40 transition">
                    
                    {/* Ticket Ref */}
                    <td className="py-3.5 px-3 font-mono">
                      <span className="text-cyan-300 font-semibold">{ticket.ticketNumber}</span>
                      <div className="text-[10px] text-slate-400 font-sans truncate max-w-[180px]">
                        {ticket.issueSummary}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-200">{branch?.branchName.substring(0, 24)}...</span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Criticality: <strong className="text-slate-200">{branch?.criticalityLevel}</strong>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          ticket.priority === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : ticket.priority === 'HIGH'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                          ticket.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isPaused
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>

                    {/* Net Elapsed / Target */}
                    <td className="py-3.5 px-3 font-mono">
                      <div className="text-slate-200">
                        {formatMinutesToHhMm(sla.netElapsedMinutes)} / {formatMinutesToHhMm(sla.targetResolutionMinutes)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total Paused: {formatMinutesToHhMm(sla.totalPausedMinutes)}
                      </div>
                    </td>

                    {/* SLA Progress Bar */}
                    <td className="py-3.5 px-3 w-40">
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            sla.isBreached
                              ? 'bg-rose-500'
                              : sla.percentUsed >= 75
                              ? 'bg-amber-500'
                              : 'bg-cyan-500'
                          }`}
                          style={{ width: `${Math.min(100, sla.percentUsed)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        {sla.percentUsed.toFixed(1)}% Used
                      </span>
                    </td>

                    {/* Escalation Tier */}
                    <td className="py-3.5 px-3">
                      {sla.isBreached ? (
                        <div className="flex flex-col">
                          <span className="text-rose-400 font-bold font-mono text-[11px] flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-rose-500" />
                            L3 BREACH
                          </span>
                          <span className="text-[10px] text-rose-300 font-mono">
                            Penalty: {currencySymbol} {Math.round(penaltyAmt).toLocaleString()}
                          </span>
                        </div>
                      ) : sla.percentUsed >= 75 ? (
                        <span className="text-amber-400 font-bold font-mono text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          L2 Escalation (75%)
                        </span>
                      ) : sla.percentUsed >= 50 ? (
                        <span className="text-cyan-300 font-medium font-mono text-[11px]">
                          L1 Warning (50%)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          On Schedule
                        </span>
                      )}
                    </td>

                    {/* Actions: Pause / Resume */}
                    <td className="py-3.5 px-3 text-right">
                      {ticket.status !== 'COMPLETED' && (
                        <>
                          {isPaused ? (
                            <button
                              onClick={() => onResumeTicket(ticket.ticketId)}
                              className="px-2.5 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-xs font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <PlayCircle className="w-3 h-3" />
                              <span>Resume SLA</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setPauseModalTicket(ticket)}
                              className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 text-xs font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <PauseCircle className="w-3 h-3" />
                              <span>Pause SLA</span>
                            </button>
                          )}
                        </>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Pause Reason Modal */}
      {pauseModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-purple-400 font-mono text-xs uppercase font-bold">
              <PauseCircle className="w-4 h-4" />
              SLA Clock Pause Authorization
            </div>
            <h3 className="text-base font-semibold text-white">
              Pause SLA for {pauseModalTicket.ticketNumber}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pausing the SLA stops MTTR penalty accumulation. All pause intervals are audit-logged with reason code and require regulatory justification.
            </p>

            <form onSubmit={handlePauseSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Reason Code (Regulatory Standard):
                </label>
                <select
                  value={selectedReasonCode}
                  onChange={(e) => setSelectedReasonCode(e.target.value as SlaPauseReasonCode)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="WAITING_BANK_CLEARANCE">Waiting Bank Security / Vault Clearance</option>
                  <option value="WAITING_CRITICAL_SPARE">Waiting Critical Spare (Dispatched from Depot)</option>
                  <option value="SITE_POWER_UNAVAILABLE">Site Power / Grid Unavailable for Cutover</option>
                  <option value="CUSTOMER_REQUESTED_RESCHEDULE">Customer Requested Reschedule</option>
                  <option value="FORCE_MAJEURE">Force Majeure (Extreme Weather / Roadblock)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Detailed Justification / Evidence Note:
                </label>
                <textarea
                  rows={3}
                  value={pauseReasonDescription}
                  onChange={(e) => setPauseReasonDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPauseModalTicket(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 shadow transition cursor-pointer"
                >
                  Commit SLA Pause
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
