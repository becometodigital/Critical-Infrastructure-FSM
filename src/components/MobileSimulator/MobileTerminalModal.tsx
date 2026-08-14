import React, { useState } from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  MapPin,
  FileCheck2,
  Database,
  ArrowDownCircle,
  Clock,
} from 'lucide-react';
import { Technician, Ticket, TenantId } from '../../types/fsm';
import { computeSha256 } from '../../utils/crypto';

interface MobileTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenantId: TenantId;
  technicians: Technician[];
  tickets: Ticket[];
  onSyncOfflineQueue: (queuedActions: any[]) => void;
}

export const MobileTerminalModal: React.FC<MobileTerminalModalProps> = ({
  isOpen,
  onClose,
  currentTenantId,
  technicians,
  tickets,
  onSyncOfflineQueue,
}) => {
  if (!isOpen) return null;

  const [selectedTechId, setSelectedTechId] = useState<string>(technicians[0]?.technicianId || '');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeScreen, setActiveScreen] = useState<'tickets' | 'offline_db' | 'checkin'>('tickets');
  
  // Simulated Drift Local SQLite Storage
  const [offlineQueue, setOfflineQueue] = useState<Array<{ id: string; type: string; payload: any; timestamp: string }>>([
    {
      id: 'mut-001',
      type: 'TICKET_LOCAL_UPDATE',
      payload: { ticketId: 'tkt-001', status: 'IN_PROGRESS', localTimestamp: new Date().toISOString() },
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ]);

  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  const selectedTech = technicians.find((t) => t.technicianId === selectedTechId) || technicians[0];
  const techTickets = tickets.filter((t) => t.assignedTechnicianId === selectedTech.technicianId);

  const handleQueueOfflineAction = (type: string, payload: any) => {
    const newAction = {
      id: `mut-${Date.now()}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    setOfflineQueue((prev) => [...prev, newAction]);
    setSyncStatusMessage(`Action buffered locally to SQLCipher Encrypted SQLite.`);
  };

  const handleExecuteDeltaSync = () => {
    setSyncStatusMessage('Executing Delta Sync (LWW & Sequential FIFO)...');
    setTimeout(() => {
      onSyncOfflineQueue(offlineQueue);
      setOfflineQueue([]);
      setSyncStatusMessage('✓ All local Drift SQLite mutations successfully synchronized with the configured data service!');
      setTimeout(() => setSyncStatusMessage(null), 3000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col h-[700px]">
        
        {/* Mobile Device Status Bar */}
        <div className="bg-slate-950 px-5 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Flutter Drift (SQLCipher)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-sm">
              ✕
            </button>
          </div>
        </div>

        {/* Technician Profile Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Logged In Technician</span>
            <select
              aria-label="Select Technician for Mobile Simulation"
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-semibold rounded p-1"
            >
              {technicians.map((t) => (
                <option key={t.technicianId} value={t.technicianId}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Encrypted DB</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> 256-bit AES
            </span>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex border-b border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveScreen('tickets')}
            className={`flex-1 py-2.5 text-center transition ${
              activeScreen === 'tickets' ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Jobs ({techTickets.length})
          </button>
          <button
            onClick={() => setActiveScreen('offline_db')}
            className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1 ${
              activeScreen === 'offline_db' ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Drift Queue</span>
            {offlineQueue.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {offlineQueue.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          
          {syncStatusMessage && (
            <div className="p-3 bg-cyan-950/80 border border-cyan-800 rounded-xl text-xs text-cyan-200 font-mono">
              {syncStatusMessage}
            </div>
          )}

          {activeScreen === 'tickets' && (
            <div className="space-y-3">
              {techTickets.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No active tickets assigned to this technician.
                </div>
              ) : (
                techTickets.map((t) => (
                  <div
                    key={t.ticketId}
                    className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-300">{t.ticketNumber}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                        {t.priority}
                      </span>
                    </div>

                    <p className="text-slate-300 text-[11px]">{t.issueSummary}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-mono">Status: {t.status}</span>
                      
                      <button
                        onClick={() =>
                          handleQueueOfflineAction('START_DIAGNOSTICS', {
                            ticketId: t.ticketId,
                            status: 'IN_PROGRESS',
                          })
                        }
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-semibold shadow"
                      >
                        {isOnline ? 'Begin Service' : 'Queue Offline Action'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeScreen === 'offline_db' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" /> Pending Drift Mutations
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {offlineQueue.length} records in SQLite
                </span>
              </div>

              {offlineQueue.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  All local mutations synchronized. Drift DB clean.
                </div>
              ) : (
                <div className="space-y-2">
                  {offlineQueue.map((m) => (
                    <div key={m.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                      <div className="flex items-center justify-between text-cyan-400">
                        <span>{m.type}</span>
                        <span className="text-slate-500 text-[10px]">{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-400 truncate">{JSON.stringify(m.payload)}</div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleExecuteDeltaSync}
                disabled={offlineQueue.length === 0 || !isOnline}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Synchronize with the production data service</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Hardware Security: Keystore / KeyChain Biometric Shield Active
        </div>

      </div>
    </div>
  );
};
