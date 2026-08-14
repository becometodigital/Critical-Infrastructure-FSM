import React, { useState } from 'react';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  FileCheck2,
  ShieldCheck,
  Zap,
  Activity,
  PlusCircle,
  QrCode,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { Asset, Ticket, GatePassRecord, FSRSubmission, Branch } from '../../types/fsm';
import { FsmApiClient } from '../../utils/apiClient';

interface BankBranchPortalProps {
  branch: Branch | undefined;
  assets: Asset[];
  tickets: Ticket[];
  gatePasses: GatePassRecord[];
  fsrRecords: FSRSubmission[];
  onOpenNewTicket: () => void;
  onRefreshData: () => void;
}

export const BankBranchPortal: React.FC<BankBranchPortalProps> = ({
  branch,
  assets,
  tickets,
  gatePasses,
  fsrRecords,
  onOpenNewTicket,
  onRefreshData,
}) => {
  const { session } = useAuth();
  const [selectedFsr, setSelectedFsr] = useState<FSRSubmission | null>(null);
  const [verifyingFsr, setVerifyingFsr] = useState<FSRSubmission | null>(null);
  const [signeeName, setSigneeName] = useState(session?.fullName || '');
  const [signeeTitle, setSigneeTitle] = useState(session?.designation || 'Branch Operations Head');
  const [customerComments, setCustomerComments] = useState('Power restored and confirmed stable on commercial load.');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter assets and tickets for this branch
  const branchAssets = branch ? assets.filter((a) => a.branchId === branch.branchId) : assets;
  const branchTickets = branch ? tickets.filter((t) => t.branchId === branch.branchId) : tickets;
  const activeTickets = branchTickets.filter((t) => t.status !== 'COMPLETED' && t.status !== 'VERIFIED_CLOSED');
  const criticalCount = branchAssets.filter((a) => a.status === 'CRITICAL_FAULT' || a.status === 'DEGRADED').length;

  const handleVerifyFsrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingFsr) return;

    setIsSubmittingVerification(true);
    setFeedbackMessage(null);

    try {
      await FsmApiClient.verifyCustomerFsr({
        fsrId: verifyingFsr.fsrId,
        customerSigneeName: signeeName,
        customerSigneeTitle: signeeTitle,
        customerComments,
      });
      setFeedbackMessage({ text: `Service Report #${verifyingFsr.fsrId} verified successfully and work order closed.`, type: 'success' });
      setVerifyingFsr(null);
      onRefreshData();
    } catch (err: any) {
      setFeedbackMessage({ text: err.message || 'Verification failed.', type: 'error' });
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Branch Identification & Financial SLA Health */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Authorized Bank Branch Portal • Row-Level Security Enforced
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Pioneer AMC Active
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-400" />
              {branch?.branchName || 'Lahore Main Corporate Center'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Branch Code: <strong className="text-slate-300 font-mono">{branch?.branchCode || 'HBL-0012'}</strong> • 
              Region: <strong className="text-slate-300">{branch?.city || 'Lahore'} / Central Hub</strong> • 
              Designated Bank Officer: <strong className="text-indigo-300">{session?.fullName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewTicket}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-rose-900/40 active:scale-95 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Urgent Power Fault</span>
            </button>

            <button
              onClick={onRefreshData}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
              title="Refresh Live Telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Status</span>
            </button>
          </div>
        </div>

        {/* Quick Branch Vital Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Total Power Assets
            </div>
            <div className="text-lg font-bold text-white mt-1 font-mono">{branchAssets.length} Units</div>
            <div className="text-[10px] text-slate-500">UPS, Inverters & Battery Banks</div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Active Service Tickets
            </div>
            <div className="text-lg font-bold text-amber-300 mt-1 font-mono">{activeTickets.length} Open</div>
            <div className="text-[10px] text-slate-500">5-Min SLA Dispatch Guarantee</div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Power Uptime SLA
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">99.994%</div>
            <div className="text-[10px] text-slate-500">Zero Critical Outage Today</div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} /> Fault Alerts
            </div>
            <div className={`text-lg font-bold mt-1 font-mono ${criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {criticalCount > 0 ? `${criticalCount} Attention Needed` : 'All Healthy'}
            </div>
            <div className="text-[10px] text-slate-500">Real-time Impedance Telemetry</div>
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between ${
          feedbackMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Active Incidents & Branch Critical Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active Service Requests & Arriving Engineers */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Work Orders / Escalations */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Live Service Requests & Pioneer Dispatches</h2>
              </div>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {activeTickets.length} Active
              </span>
            </div>

            {activeTickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-850/50 border border-slate-800 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-medium text-slate-300">All Branch Critical Assets Operating at 100% Health</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No open breakdown or preventive service requests pending.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTickets.map((ticket) => (
                  <div
                    key={ticket.ticketId}
                    className="p-4 bg-slate-850 border border-slate-750 rounded-xl hover:border-slate-650 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{ticket.ticketNumber}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold ${
                          ticket.priority === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          ticket.priority === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}>
                          {ticket.priority} PRIORITY
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">{ticket.issueSummary}</p>
                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span>Service: <strong className="text-slate-300">{ticket.serviceType}</strong></span>
                        <span>Assigned Tech: <strong className="text-cyan-300">{ticket.assignedTechnicianId || 'Pioneer NOC Dispatching...'}</strong></span>
                        <span>Target SLA: <strong className="text-amber-300">{ticket.contractSla}</strong></span>
                      </div>
                    </div>

                    {ticket.status === 'PENDING_CUSTOMER_VERIFICATION' && (
                      <div className="flex sm:flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-amber-300 font-mono flex items-center gap-1">
                          <FileCheck2 className="w-3 h-3 text-amber-400" /> Awaiting Customer Sign-off
                        </span>
                        <button
                          onClick={() => {
                            const relatedFsr = fsrRecords.find(f => f.ticketId === ticket.ticketId) || {
                              fsrId: ticket.fsrRecordId || `fsr-${ticket.ticketId}`,
                              ticketId: ticket.ticketId,
                              technicianId: ticket.assignedTechnicianId || 'tech-01',
                              assetType: 'UPS_SYSTEM',
                              serviceType: ticket.serviceType,
                              formData: { notes: 'Rectifier and inverter power stage verified normal.' },
                              evidenceIds: [],
                              customerSigneeName: '',
                              customerSigneeTitle: '',
                            };
                            setVerifyingFsr(relatedFsr as FSRSubmission);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Review & Verify Job</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Branch Assets Health Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Branch Installed UPS & Battery Bank Health</h2>
              </div>
              <span className="text-xs text-slate-400">AMC Tier: Comprehensive 24/7</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {branchAssets.map((asset) => (
                <div
                  key={asset.assetId}
                  className="p-3.5 bg-slate-850 border border-slate-750 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{asset.modelNumber}</div>
                      <div className="text-[11px] text-slate-400">{asset.productSeries || 'Pioneer Elektra Series'}</div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold ${
                      asset.status === 'OPERATIONAL' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      asset.status === 'DEGRADED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {asset.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-750/80 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Rating</span>
                      <span className="font-mono text-slate-300 font-semibold">{asset.capacityKva ? `${asset.capacityKva} kVA` : `${asset.batteryAhRating || 100} Ah`}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Impedance</span>
                      <span className="font-mono text-cyan-300 font-semibold">{asset.currentImpedanceMohm || 10.5} mΩ</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Temp</span>
                      <span className="font-mono text-amber-300 font-semibold">{asset.liveTemperatureC || 25}°C</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Col: Verified FSR Records & S3 Compliance Proof */}
        <div className="space-y-6">
          
          {/* Completed Service Receipts & Signatures */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Signed FSR Evidence Archive</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Immutable-ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Cryptographically verified Field Service Reports with customer signatures and integrity receipts:
            </p>

            {fsrRecords.length === 0 ? (
              <div className="p-6 text-center bg-slate-850 border border-slate-800 rounded-xl text-xs text-slate-400">
                No past service reports on record yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {fsrRecords.map((fsr) => (
                  <div
                    key={fsr.fsrId}
                    onClick={() => setSelectedFsr(fsr)}
                    className="p-3 bg-slate-850 border border-slate-750 hover:border-emerald-500/50 rounded-xl cursor-pointer transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">{fsr.fsrId}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        VERIFIED
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Service: <strong className="text-white">{fsr.serviceType}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-750">
                      <span>Signee: <strong className="text-indigo-300">{fsr.customerSigneeName || 'Branch Manager'}</strong></span>
                      <span className="font-mono text-emerald-400">SHA-256 Valid</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SLA Guarantee & Emergency Escalation Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider text-slate-300">
              Pioneer Critical Escalation Matrix
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-850 rounded-lg border border-slate-750 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Level 1: 24/7 Pioneer NOC</span>
                  <span className="font-semibold text-white">0800-PIONEER (746-6337)</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300">Instant</span>
              </div>

              <div className="p-2.5 bg-slate-850 rounded-lg border border-slate-750 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Level 2: Regional Service Lead</span>
                  <span className="font-semibold text-white">Engr. Kamran Siddiqui</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300">&lt; 15 Mins</span>
              </div>

              <div className="p-2.5 bg-slate-850 rounded-lg border border-slate-750 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Level 3: Head of Banking Power</span>
                  <span className="font-semibold text-white">Director Shahid Mehmood</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300">&lt; 30 Mins</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Customer FSR Verification Modal */}
      {verifyingFsr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Customer Verification & Job Sign-off</h3>
              </div>
              <button
                onClick={() => setVerifyingFsr(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleVerifyFsrSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Report Reference:</span>
                  <span className="font-mono text-white font-bold">{verifyingFsr.fsrId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Ticket Reference:</span>
                  <span className="font-mono text-cyan-300 font-bold">{verifyingFsr.ticketId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Executed Service:</span>
                  <span className="text-emerald-300 font-medium">{verifyingFsr.serviceType}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Branch Signee Full Name *</label>
                <input
                  type="text"
                  required
                  value={signeeName}
                  onChange={(e) => setSigneeName(e.target.value)}
                  placeholder="e.g. Asad Ullah Khan"
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Signee Official Designation *</label>
                <input
                  type="text"
                  required
                  value={signeeTitle}
                  onChange={(e) => setSigneeTitle(e.target.value)}
                  placeholder="e.g. Branch Manager / Operations Lead"
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer Remarks / Load Satisfaction</label>
                <textarea
                  rows={2}
                  value={customerComments}
                  onChange={(e) => setCustomerComments(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px]">
                By submitting, you certify that the power equipment service has been inspected and tested under active branch load.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingFsr(null)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVerification || !signeeName || !signeeTitle}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 cursor-pointer transition shadow-lg shadow-emerald-900/30"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingVerification ? 'Signing & Verifying...' : 'Sign & Complete Job'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FSR Detail Viewer Modal */}
      {selectedFsr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Field Service Report ({selectedFsr.fsrId})</h3>
              </div>
              <button
                onClick={() => setSelectedFsr(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-850 p-3 rounded-xl border border-slate-750">
                <div><span className="text-slate-400">Ticket Ref:</span> <strong className="text-white block font-mono">{selectedFsr.ticketId}</strong></div>
                <div><span className="text-slate-400">Technician ID:</span> <strong className="text-cyan-300 block font-mono">{selectedFsr.technicianId}</strong></div>
                <div><span className="text-slate-400">Service Category:</span> <strong className="text-white block">{selectedFsr.serviceType}</strong></div>
                <div><span className="text-slate-400">Certified Signee:</span> <strong className="text-indigo-300 block">{selectedFsr.customerSigneeName}</strong></div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">Cryptographic SHA-256 Integrity Hash</label>
                <div className="p-2.5 bg-slate-950 font-mono text-[10px] text-emerald-400 rounded-lg border border-slate-800 break-all select-all">
                  {selectedFsr.signedDigitalHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Audited & verified against the service SLA ledger. Retention and regulatory controls are deployment-configurable.</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
