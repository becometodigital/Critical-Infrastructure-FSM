import React, { useState } from 'react';
import { AlertTriangle, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Branch, Asset, TenantId, PriorityLevel } from '../../types/fsm';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenantId: TenantId;
  branches: Branch[];
  assets: Asset[];
  onCreateTicket: (ticketData: {
    branchId: string;
    assetId: string;
    priority: PriorityLevel;
    issueSummary: string;
  }) => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  currentTenantId,
  branches,
  assets,
  onCreateTicket,
}) => {
  if (!isOpen) return null;

  const tenantBranches = branches.filter((b) => b.tenantId === currentTenantId);
  const tenantAssets = assets.filter((a) => a.tenantId === currentTenantId);

  const [branchId, setBranchId] = useState<string>(tenantBranches[0]?.branchId || '');
  const [assetId, setAssetId] = useState<string>(tenantAssets[0]?.assetId || '');
  const [priority, setPriority] = useState<PriorityLevel>('CRITICAL');
  const [issueSummary, setIssueSummary] = useState<string>(
    'UPS Inverter Static Bypass SCR over-temperature alarm (78°C). Battery String B impedance drifted to 15.2 mΩ (+45%).'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !assetId) return;
    onCreateTicket({
      branchId,
      assetId,
      priority,
      issueSummary,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Simulate Critical Alarm / Generate Ticket
              </h3>
              <p className="text-xs text-slate-400">
                Emits a transactional outbox event and schedules the SLA policy
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div>
            <label className="text-slate-300 block mb-1 font-medium">Target Banking Branch:</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
              required
            >
              {tenantBranches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  [{b.criticalityLevel}] {b.branchName} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-medium">Critical Infrastructure Asset:</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-cyan-500"
              required
            >
              {tenantAssets.map((a) => (
                <option key={a.assetId} value={a.assetId}>
                  [{a.assetType}] {a.modelNumber} ({a.serialNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-medium">SLA Priority Level:</label>
            <div className="grid grid-cols-4 gap-2">
              {(['CRITICAL', 'HIGH', 'NORMAL', 'LOW'] as PriorityLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setPriority(lvl)}
                  className={`py-2 rounded-lg font-mono font-bold text-[11px] transition ${
                    priority === lvl
                      ? lvl === 'CRITICAL'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                        : 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-medium">Incident Summary / Telemetry Alarm:</label>
            <textarea
              rows={3}
              value={issueSummary}
              onChange={(e) => setIssueSummary(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            ⚡ <strong>Event Sourcing:</strong> Creation atomically inserts into <code className="text-cyan-300 font-mono">tickets</code> and <code className="text-cyan-300 font-mono">outbox_events</code> within a single ACID transaction.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg cursor-pointer"
            >
              Emit TicketCreated Event
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
