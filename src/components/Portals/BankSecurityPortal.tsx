import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Clock,
  Building,
  RefreshCw,
  Search,
  Check,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { GatePassRecord, Ticket, Technician } from '../../types/fsm';
import { FsmApiClient } from '../../utils/apiClient';

interface BankSecurityPortalProps {
  gatePasses: GatePassRecord[];
  tickets: Ticket[];
  technicians: Technician[];
  onRefreshData: () => void;
}

export const BankSecurityPortal: React.FC<BankSecurityPortalProps> = ({
  gatePasses,
  tickets,
  technicians,
  onRefreshData,
}) => {
  const { session } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [guardName, setGuardName] = useState(session?.fullName || 'Head Security Officer Tariq');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentCheckedIn, setRecentCheckedIn] = useState<any[]>([]);

  const handleVerify = async (tokenToUse?: string) => {
    const rawToken = tokenToUse || tokenInput;
    if (!rawToken) return;

    setLoading(true);
    setVerificationResult(null);

    try {
      const res = await FsmApiClient.verifyGatePass(
        rawToken.trim(),
        session?.branchId || 'br-hbl-01',
        guardName,
        'ALLOW_ENTRY'
      );
      setVerificationResult({ success: true, data: res });
      setRecentCheckedIn((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          techName: res.technicianName,
          cnic: res.technicianCnic,
          ticketId: res.ticketId,
          officer: guardName,
        },
        ...prev,
      ]);
      setTokenInput('');
      onRefreshData();
    } catch (err: any) {
      setVerificationResult({
        success: false,
        reason: err.message || 'Cryptographic HMAC mismatch. Gate pass is counterfeit or expired.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Bank Physical Access Terminal */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-900/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Critical Infrastructure Physical Access Point
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                HMAC-SHA256 Cryptographic Gate Pass Scanner
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-purple-400" />
              Bank Security & UPS Room Entry Kiosk
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Location: <strong className="text-slate-200">{session?.branchName || 'Lahore Main Corporate Center'}</strong> • 
              Security Desk Operator: <strong className="text-purple-300">{session?.fullName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshData}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Station</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: QR / HMAC Verification Scanner Terminal */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-semibold text-white">Technician Gate Pass Verification & Check-In</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">STATION ID: SEC-KIOSK-01</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Verifying Security Officer Name
                </label>
                <input
                  type="text"
                  value={guardName}
                  onChange={(e) => setGuardName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-750 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Branch Gate Location
                </label>
                <input
                  type="text"
                  disabled
                  value={`${session?.branchName || 'Lahore Main Branch'} - Server Room Level B1`}
                  className="w-full bg-slate-850 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Scan QR Code / Paste Base64 HMAC Gate Pass Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Gate Pass Token (e.g. dGt0LTAwMTp0ZWNoLTAx...)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-750 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleVerify()}
                  disabled={loading || !tokenInput}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-purple-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {loading ? 'Validating Signature...' : 'Authorize Entry'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Validates cryptographic token integrity against OpsGrid Security Verification Service. Rejects forged or expired passes.
              </p>
            </div>

            {/* Verification Result Callout */}
            {verificationResult && (
              <div className={`p-4 rounded-xl border transition ${
                verificationResult.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}>
                {verificationResult.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>ENTRY GRANTED: Cryptographic Gate Pass Authenticated</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-emerald-900/60">
                      <div><span className="text-slate-400 block text-[10px]">Technician:</span> <strong className="text-white">{verificationResult.data.technicianName}</strong></div>
                      <div><span className="text-slate-400 block text-[10px]">National CNIC:</span> <strong className="font-mono text-cyan-300">{verificationResult.data.technicianCnic}</strong></div>
                      <div><span className="text-slate-400 block text-[10px]">Work Order:</span> <strong className="font-mono text-white">{verificationResult.data.ticketId}</strong></div>
                      <div><span className="text-slate-400 block text-[10px]">Entry Logged:</span> <strong className="text-emerald-400 font-mono">VERIFIED</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-rose-400">ENTRY DENIED: Signature Validation Failed</div>
                      <div className="text-xs text-rose-300/90">{verificationResult.reason}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick 1-Click Passes Ready for Verification */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Issued Passes Waiting at Guard Desk (1-Click Test)
              </h3>

              <div className="space-y-2">
                {gatePasses.length === 0 ? (
                  <p className="text-xs text-slate-500">No active gate passes issued for this branch right now.</p>
                ) : (
                  gatePasses.map((gp) => (
                    <div
                      key={gp.gatePassId}
                      className="p-3 bg-slate-850 border border-slate-750 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{gp.technicianName}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            CNIC: {gp.technicianCnicOrId}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            gp.status === 'CHECKED_IN' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-purple-950 text-purple-300 border border-purple-800'
                          }`}>
                            {gp.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{gp.purpose}</p>
                      </div>

                      <button
                        onClick={() => handleVerify(gp.token)}
                        disabled={gp.status === 'CHECKED_IN'}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          gp.status === 'CHECKED_IN'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 cursor-default'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30'
                        }`}
                      >
                        {gp.status === 'CHECKED_IN' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Checked In</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Authorize</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Col: Physical Access Audit Ledger */}
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Live Physical Entry Log</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Audited
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Real-time immutable log of certified field engineers currently inside the secure UPS room:
            </p>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {recentCheckedIn.length === 0 ? (
                <div className="p-6 text-center bg-slate-850 rounded-xl border border-slate-800 text-xs text-slate-500">
                  No check-ins during this session yet.
                </div>
              ) : (
                recentCheckedIn.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-850 border border-slate-750 rounded-xl space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-white">{item.techName}</strong>
                      <span className="text-[10px] font-mono text-cyan-400">{item.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">CNIC: <strong className="text-slate-300 font-mono">{item.cnic}</strong></div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-750">
                      <span>Ref: <strong className="font-mono text-slate-400">{item.ticketId}</strong></span>
                      <span>Officer: <strong className="text-purple-300">{item.officer}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 text-xs">
            <h3 className="font-semibold text-white flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4" /> Bank Security Protocol Notice
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              All field engineers entering the battery or switchgear rooms must present their National ID (CNIC) matching the cryptographic token. Any unverified entry triggers a critical security compliance breach report.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
