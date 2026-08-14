import React, { useState } from 'react';
import {
  Activity,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Radio,
  FileCode,
  Shield,
  Layers,
  Database,
} from 'lucide-react';
import { OutboxEvent, AuditLog, TenantId } from '../../types/fsm';

interface OutboxEventStreamProps {
  currentTenantId: TenantId;
  outboxEvents: OutboxEvent[];
  auditLogs: AuditLog[];
  onProcessOutboxBatch: () => void;
}

export const OutboxEventStream: React.FC<OutboxEventStreamProps> = ({
  currentTenantId,
  outboxEvents,
  auditLogs,
  onProcessOutboxBatch,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<OutboxEvent | null>(outboxEvents[0] || null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(auditLogs[0] || null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const pendingEventsCount = outboxEvents.filter((e) => e.status === 'PENDING').length;

  const handleBatchProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onProcessOutboxBatch();
      setIsProcessing(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            Transactional Outbox Pattern & Audit Trail
          </div>
          <h2 className="text-xl font-semibold text-white">
            Dual-Write Free Domain Event Publishing & Forensic Audit Streams
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Atomic commit writes state changes and domain events to <code className="text-cyan-300 font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">outbox_events</code> within the same ACID transaction. An event worker can process batches via <code className="text-emerald-300 font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">SELECT ... FOR UPDATE SKIP LOCKED</code>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <button
            onClick={handleBatchProcess}
            disabled={isProcessing || pendingEventsCount === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-lg shadow transition cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Process Batch (SKIP LOCKED)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Outbox Events Queue vs Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Transactional Outbox Events (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">
                Transactional Outbox Queue
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
              {pendingEventsCount} Pending / {outboxEvents.length} Total
            </span>
          </div>

          {/* Outbox List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {outboxEvents.map((evt) => {
              const isSelected = selectedEvent?.eventId === evt.eventId;
              return (
                <div
                  key={evt.eventId}
                  onClick={() => setSelectedEvent(evt)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/60 shadow-md text-white font-medium'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700">
                        {evt.aggregateType}
                      </span>
                      <span className="font-bold text-white">{evt.eventType}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      evt.status === 'PROCESSED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                    }`}>
                      {evt.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-400">
                    <span>AggID: {evt.aggregateId}</span>
                    <span>{new Date(evt.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Event Payload Inspection */}
          {selectedEvent && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Domain Event Payload ({selectedEvent.eventId}):</span>
                <span className="text-cyan-400">JSONB</span>
              </div>
              <pre className="p-2.5 bg-slate-900 rounded font-mono text-[10px] text-cyan-300 overflow-x-auto border border-slate-800 max-h-36">
                {JSON.stringify(selectedEvent.payload, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Right Column: Immutable PostgreSQL Audit Trail (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">
                Audit Trail
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
              IMMUTABLE
            </span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {auditLogs.map((log) => {
              const isSelected = selectedAuditLog?.logId === log.logId;
              return (
                <div
                  key={log.logId}
                  onClick={() => setSelectedAuditLog(log)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/60 shadow-md text-white font-medium'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        log.actionEvent === 'INSERT'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}>
                        {log.actionEvent}
                      </span>
                      <span className="font-bold text-white">{log.entityType} ({log.entityId})</span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-400">
                    <span>Actor: {log.actorId} [{log.actorRole}]</span>
                    <span>IP: {log.ipAddress}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Audit Log Diff Inspection */}
          {selectedAuditLog && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Row Diff State ({selectedAuditLog.logId}):</span>
                <span className="text-emerald-400">Trigger Captured</span>
              </div>
              <pre className="p-2.5 bg-slate-900 rounded font-mono text-[10px] text-emerald-300 overflow-x-auto border border-slate-800 max-h-36">
                {JSON.stringify({ old: selectedAuditLog.oldValues, new: selectedAuditLog.newValues }, null, 2)}
              </pre>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
