import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  ArrowRightLeft,
  Truck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  History,
  Shield,
} from 'lucide-react';
import {
  TenantId,
  Technician,
  InventoryItem,
  InventoryStock,
  InventoryLedgerEntry,
} from '../../types/fsm';

interface VanStockLedgerProps {
  currentTenantId: TenantId;
  technicians: Technician[];
  inventoryItems: InventoryItem[];
  ledgerEntries: InventoryLedgerEntry[];
  onTransferToVan: (technicianId: string, itemId: string, quantity: number) => void;
  onReservePart: (technicianId: string, itemId: string, quantity: number, ticketId: string) => void;
}

export const VanStockLedger: React.FC<VanStockLedgerProps> = ({
  currentTenantId,
  technicians,
  inventoryItems,
  ledgerEntries,
  onTransferToVan,
  onReservePart,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>(technicians[0]?.technicianId || '');
  const [selectedItemId, setSelectedItemId] = useState<string>(inventoryItems[0]?.itemId || '');
  const [transferQty, setTransferQty] = useState<number>(2);
  const [isLockingVisualActive, setIsLockingVisualActive] = useState<boolean>(false);

  const selectedTech = technicians.find((t) => t.technicianId === selectedTechId) || technicians[0];
  const selectedItem = inventoryItems.find((i) => i.itemId === selectedItemId) || inventoryItems[0];

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLockingVisualActive(true);
    setTimeout(() => {
      onTransferToVan(selectedTech.technicianId, selectedItem.itemId, transferQty);
      setIsLockingVisualActive(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4" />
            Atomic Van Stock & Double-Entry Ledger Engine
          </div>
          <h2 className="text-xl font-semibold text-white">
            Pessimistic Row-Locking Stock Allocation & Immutable Ledger
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Enforces strict transactional database locks (<code className="text-cyan-300 font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">SELECT ... FOR UPDATE</code>) on serialized inventory to guarantee zero double-allocation across parallel dispatches.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">CONCURRENCY LOCK</span>
            <span className="text-amber-400 font-bold">PESSIMISTIC_WRITE</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">LEDGER MODEL</span>
            <span className="text-emerald-400 font-bold">Double-Entry FIFO</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Van Inventory & Transfer vs Right Double-Entry Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Technician Van Inventory (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">
                Mobile Van Stock Levels
              </h3>
            </div>
            
            {/* Tech Selector */}
            <select
              id="select-tech-van"
              aria-label="Technician for Van Stock"
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              {technicians.map((t) => (
                <option key={t.technicianId} value={t.technicianId}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Van Stock Table */}
          <div className="space-y-3">
            {selectedTech.vanInventory.map((item) => (
              <div
                key={item.itemId}
                className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/70 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-xs text-white">{item.itemName}</div>
                  <div className="text-[11px] font-mono text-cyan-300 mt-0.5">Part: {item.partNumber}</div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">Available</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {item.quantityAvailable} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">Reserved</span>
                    <span className="text-base font-bold font-mono text-amber-400">
                      {item.quantityReserved} units
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transfer Form with SELECT FOR UPDATE Visualizer */}
          <form onSubmit={handleTransfer} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                Transfer Stock: Central Warehouse → Van
              </span>
              {isLockingVisualActive && (
                <span className="text-[10px] font-mono bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-700 animate-pulse flex items-center gap-1">
                  <Lock className="w-3 h-3" /> SELECT FOR UPDATE ACQUIRED
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Select Catalog Item:</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded p-2 focus:outline-none"
                >
                  {inventoryItems.map((i) => (
                    <option key={i.itemId} value={i.itemId}>
                      {i.partNumber} (${i.unitCostUsd})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Transfer Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded p-2 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLockingVisualActive}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
            >
              {isLockingVisualActive ? 'Acquiring Lock & Committing...' : 'Execute Double-Entry Transfer'}
            </button>
          </form>

        </div>

        {/* Right Column: Immutable Double-Entry Ledger Stream (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">
                Immutable Inventory Movements
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
              AUDIT COMPLIANT
            </span>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {ledgerEntries.map((entry) => (
              <div
                key={entry.ledgerId}
                className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">{entry.itemName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {entry.transactionType} ({entry.quantity} units)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>
                    {entry.sourceType} ({entry.sourceId}) ➔ {entry.destinationType} ({entry.destinationId})
                  </span>
                  <span className="text-slate-500">
                    {new Date(entry.recordedAt).toLocaleTimeString()}
                  </span>
                </div>

                {entry.referenceTicketId && (
                  <div className="text-[10px] text-amber-300 font-mono">
                    Ref Ticket: {entry.referenceTicketId}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
            ⚖️ <strong>Double-Entry Rule:</strong> Stock cannot be created or destroyed. Every allocation is represented as debit from source and credit to target location with operator audit linkage.
          </div>

        </div>

      </div>

    </div>
  );
};
