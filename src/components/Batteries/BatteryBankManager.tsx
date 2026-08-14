import React, { useState } from 'react';
import {
  BatteryCharging,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  TrendingDown,
  Calendar,
  Layers,
  Thermometer,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Asset, TenantId } from '../../types/fsm';

interface BatteryBankManagerProps {
  currentTenantId: TenantId;
  assets: Asset[];
  onSwapBatteryCell: (parentBankId: string, oldCellId: string, newSerial: string) => void;
  onRecordImpedance: (assetId: string, impedanceVal: number, voltageVal: number) => void;
}

export const BatteryBankManager: React.FC<BatteryBankManagerProps> = ({
  currentTenantId,
  assets,
  onSwapBatteryCell,
  onRecordImpedance,
}) => {
  const tenantAssets = assets.filter((a) => a.tenantId === currentTenantId);

  // Extract all battery units recursively
  const extractBatteries = (list: Asset[]): Asset[] => {
    let result: Asset[] = [];
    for (const a of list) {
      if (a.assetType === 'BATTERY_UNIT' || a.assetType === 'BATTERY_BANK') {
        result.push(a);
      }
      if (a.children) {
        result = result.concat(extractBatteries(a.children));
      }
    }
    return result;
  };

  const allBatteries = extractBatteries(tenantAssets);
  const batteryCells = allBatteries.filter((b) => b.assetType === 'BATTERY_UNIT');
  
  // Dynamic threshold calculation vs baseline
  const criticalCells = batteryCells.filter((b) => {
    const baseline = b.baselineImpedanceMohm || 10.5;
    const current = b.currentImpedanceMohm || baseline;
    const driftPct = ((current - baseline) / baseline) * 100;
    return driftPct >= 20.0; // +20% Critical IEEE 1188 threshold
  });

  const warningCells = batteryCells.filter((b) => {
    const baseline = b.baselineImpedanceMohm || 10.5;
    const current = b.currentImpedanceMohm || baseline;
    const driftPct = ((current - baseline) / baseline) * 100;
    return driftPct >= 10.0 && driftPct < 20.0;
  });

  const replacementDueCount = batteryCells.filter(
    (b) => b.expectedReplacementDate && new Date(b.expectedReplacementDate) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  ).length;

  const [selectedCell, setSelectedCell] = useState<Asset | null>(batteryCells[0] || null);
  const [newSerialInput, setNewSerialInput] = useState<string>('PIO-BAT-12V-100AH-FRESH-01');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);

  const handleCellSwapSubmit = async () => {
    if (!selectedCell) return;
    setIsSubmittingSwap(true);
    try {
      await onSwapBatteryCell(
        selectedCell.parentAssetId || 'ast-bank-01a',
        selectedCell.assetId,
        newSerialInput
      );
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <BatteryCharging className="w-4 h-4" />
            Specialized Battery Health & Replacement Management
          </div>
          <h2 className="text-xl font-semibold text-white">
            Pioneer VRLA / AGM & Gel Battery String Fleet Analytics
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Internal cell impedance tracking ($m\Omega$ baseline comparison), IEEE 1188 drift alerts ($+10\%$ warning, $+20\%$ critical), string voltage balancing, and immutable battery ledger updates.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{criticalCells.length} Critical Drift Cells (+20% Drift)</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-mono block">Monitored Battery Units</span>
          <span className="text-2xl font-bold text-white font-mono mt-1 block">
            {batteryCells.length} Cells
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            VRLA 12V 100Ah High-Rate
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-mono block">Critical Impedance (≥ +20%)</span>
          <span className="text-2xl font-bold text-rose-400 font-mono mt-1 block">
            {criticalCells.length} Units
          </span>
          <span className="text-[11px] text-rose-300 font-mono mt-1 block">
            IEEE 1188 Replacement Trigger
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-mono block">Warning Degradation (≥ +10%)</span>
          <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
            {warningCells.length} Units
          </span>
          <span className="text-[11px] text-amber-300 font-mono mt-1 block">
            Schedule Discharge Test
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-mono block">Float Life Expiry (&lt;60 Days)</span>
          <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
            {replacementDueCount} Units
          </span>
          <span className="text-[11px] text-cyan-300 font-mono mt-1 block">
            Proactive Bank Overhaul
          </span>
        </div>

      </div>

      {/* Main Grid: Battery String Map & Cell Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: String & Cell Visualizer */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              DC Battery String Cell Matrix
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Click cell to inspect impedance drift
            </span>
          </div>

          {/* Cell Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {batteryCells.map((cell) => {
              const baseline = cell.baselineImpedanceMohm || 10.5;
              const current = cell.currentImpedanceMohm || baseline;
              const driftPct = ((current - baseline) / baseline) * 100;
              const isCritical = driftPct >= 20.0;
              const isWarning = driftPct >= 10.0 && driftPct < 20.0;
              const isSelected = selectedCell?.assetId === cell.assetId;

              return (
                <button
                  key={cell.assetId}
                  onClick={() => setSelectedCell(cell)}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/30'
                      : isCritical
                      ? 'border-rose-700 bg-rose-950/20 hover:bg-rose-950/40'
                      : isWarning
                      ? 'border-amber-700 bg-amber-950/20 hover:bg-amber-950/40'
                      : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {cell.modelNumber}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isCritical ? 'bg-rose-900 text-rose-200' : isWarning ? 'bg-amber-900 text-amber-200' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {driftPct > 0 ? `+${driftPct.toFixed(1)}%` : `${driftPct.toFixed(1)}%`}
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-bold text-white font-mono">
                    {current.toFixed(2)} mΩ
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                    <span>Base: {baseline.toFixed(1)} mΩ</span>
                    <span className={isCritical ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      {cell.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center justify-between">
            <span>Formula: <code className="text-cyan-300 font-mono">Drift % = ((Current_mΩ - Baseline_mΩ) / Baseline_mΩ) * 100</code></span>
            <span className="text-emerald-400 font-mono">IEEE Standard 1188</span>
          </div>
        </div>

        {/* Right: Selected Cell Diagnostic & Immutable Replacement Panel */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase mb-1">
              <Zap className="w-4 h-4" />
              Cell Diagnostic & Replacement Ledger
            </div>
            <h3 className="text-base font-semibold text-white">
              {selectedCell ? selectedCell.serialNumber : 'Select a Battery Cell'}
            </h3>
          </div>

          {selectedCell ? (
            <div className="space-y-4">
              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Current Impedance</span>
                  <span className="text-lg font-bold font-mono text-rose-400">
                    {(selectedCell.currentImpedanceMohm || 10.5).toFixed(2)} mΩ
                  </span>
                  <span className="text-[10px] text-slate-500 block">Baseline: {(selectedCell.baselineImpedanceMohm || 10.5).toFixed(2)} mΩ</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Cell Open Voltage</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {selectedCell.ratedVoltageV || 12.0} V DC
                  </span>
                  <span className="text-[10px] text-slate-500 block">Float charge nominal</span>
                </div>
              </div>

              {/* Immutable Replacement Card */}
              <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase font-mono">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Execute Immutable Cell Replacement
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Decommissions serial <code className="text-slate-200 font-mono">{selectedCell.serialNumber}</code> and registers new battery asset in string without destructive record overwriting.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-300">
                    New Battery Serial Number:
                  </label>
                  <input
                    type="text"
                    value={newSerialInput}
                    onChange={(e) => setNewSerialInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. PIO-BAT-12V-100AH-SN-9988"
                  />
                </div>

                <button
                  onClick={handleCellSwapSubmit}
                  disabled={isSubmittingSwap}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingSwap ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingSwap ? 'Recording Ledger...' : 'Commit Battery Swap to Ledger'}</span>
                </button>
              </div>

              {/* Quick Impedance Simulator */}
              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-xs space-y-2">
                <span className="text-slate-300 font-medium block">Simulate Measurement Probe Reading:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRecordImpedance(selectedCell.assetId, 10.6, 12.8)}
                    className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[11px] text-emerald-300 font-mono transition cursor-pointer"
                  >
                    Set Normal (10.6 mΩ)
                  </button>
                  <button
                    onClick={() => onRecordImpedance(selectedCell.assetId, 14.8, 11.2)}
                    className="flex-1 py-1 px-2 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 rounded text-[11px] text-rose-300 font-mono transition cursor-pointer"
                  >
                    Set Degraded (14.8 mΩ)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select a battery unit from the left panel.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
