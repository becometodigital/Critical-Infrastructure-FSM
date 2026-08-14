import React, { useState } from 'react';
import {
  Layers,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Clock,
  ShieldAlert,
  Sliders,
  TrendingUp,
  Cpu,
  Radio,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Asset, AssetType, TenantId } from '../../types/fsm';

interface AssetTopologyTreeProps {
  currentTenantId: TenantId;
  assets: Asset[];
  onSwapBatteryCell: (parentBankId: string, oldCellId: string, newSerial: string) => void;
  onRecordImpedance: (assetId: string, impedanceVal: number, voltageVal: number) => void;
}

export const AssetTopologyTree: React.FC<AssetTopologyTreeProps> = ({
  currentTenantId,
  assets,
  onSwapBatteryCell,
  onRecordImpedance,
}) => {
  const tenantAssets = assets.filter((a) => a.tenantId === currentTenantId);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(tenantAssets[0]?.assetId || '');
  const [isSwapModalOpen, setIsSwapModalOpen] = useState<boolean>(false);
  const [cellToSwap, setCellToSwap] = useState<Asset | null>(null);
  const [newSerialInput, setNewSerialInput] = useState<string>('PIO-BAT-12V-100AH-FRESH-01');
  
  // Quick Impedance Test Input
  const [testImpedance, setTestImpedance] = useState<number>(14.5);
  const [testVoltage, setTestVoltage] = useState<number>(12.6);

  // Flattened lookup
  const allFlattenedAssets: Asset[] = [];
  const collectAssets = (list: Asset[]) => {
    for (const item of list) {
      allFlattenedAssets.push(item);
      if (item.children) {
        collectAssets(item.children);
      }
    }
  };
  collectAssets(tenantAssets);

  const selectedAsset = allFlattenedAssets.find((a) => a.assetId === selectedAssetId) || tenantAssets[0];

  // Historical impedance degradation mockup for selected asset
  const degradationData = [
    { month: 'Install (M0)', impedance: selectedAsset?.baselineImpedanceMohm || 10.5, voltage: 13.2, limit: (selectedAsset?.baselineImpedanceMohm || 10.5) * 1.3 },
    { month: 'M6 Review', impedance: 10.8, voltage: 13.0, limit: (selectedAsset?.baselineImpedanceMohm || 10.5) * 1.3 },
    { month: 'M12 PM', impedance: 11.2, voltage: 12.8, limit: (selectedAsset?.baselineImpedanceMohm || 10.5) * 1.3 },
    { month: 'M24 PM', impedance: 12.1, voltage: 12.6, limit: (selectedAsset?.baselineImpedanceMohm || 10.5) * 1.3 },
    { month: 'M36 Audit', impedance: 13.2, voltage: 12.4, limit: (selectedAsset?.baselineImpedanceMohm || 10.5) * 1.3 },
    { month: 'Latest Reading', impedance: selectedAsset?.currentImpedanceMohm || 14.8, voltage: 12.1, limit: (selectedAsset?.baselineImpedanceMohm || 10.5) * 1.3 },
  ];

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellToSwap || !cellToSwap.parentAssetId) return;
    onSwapBatteryCell(cellToSwap.parentAssetId, cellToSwap.assetId, newSerialInput);
    setIsSwapModalOpen(false);
    setCellToSwap(null);
  };

  // Render a recursive tree node
  const renderAssetNode = (node: Asset, depth: number = 0) => {
    const isSelected = node.assetId === selectedAssetId;
    const hasWarning = node.status === 'DEGRADED' || node.status === 'CRITICAL_FAULT';
    const isOverBaseline =
      node.currentImpedanceMohm &&
      node.baselineImpedanceMohm &&
      node.currentImpedanceMohm >= node.baselineImpedanceMohm * 1.3;

    return (
      <div key={node.assetId} className="space-y-1">
        <div
          onClick={() => setSelectedAssetId(node.assetId)}
          className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition border ${
            isSelected
              ? 'bg-slate-800 border-cyan-500/60 shadow-md text-white font-medium'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
          }`}
          style={{ marginLeft: `${depth * 18}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 shrink-0">
              {node.assetType}
            </span>
            <span className="truncate font-semibold text-slate-100">{node.modelNumber}</span>
            <span className="text-slate-400 font-mono text-[11px] truncate">({node.serialNumber})</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {node.currentImpedanceMohm && (
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                  isOverBaseline ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800' : 'bg-slate-800 text-emerald-400'
                }`}
              >
                {node.currentImpedanceMohm} mΩ
              </span>
            )}

            <span
              className={`w-2.5 h-2.5 rounded-full ${
                node.status === 'OPERATIONAL'
                  ? 'bg-emerald-400'
                  : node.status === 'DEGRADED'
                  ? 'bg-amber-400'
                  : 'bg-rose-500 animate-ping'
              }`}
              title={node.status}
            />

            {node.assetType === 'BATTERY_UNIT' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCellToSwap(node);
                  setIsSwapModalOpen(true);
                }}
                className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-cyan-900 border border-slate-700 text-cyan-300 transition"
              >
                Swap Cell
              </button>
            )}
          </div>
        </div>

        {/* Child recursive nodes */}
        {node.children && node.children.map((child) => renderAssetNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            Critical Power Asset Hierarchy & Parallel Redundancy
          </div>
          <h2 className="text-xl font-semibold text-white">
            Industrial UPS Topology (Up to 3.2 MVA Parallel Grid) & Battery Strings
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Supports N+1, N+2, and 2N dual-bus parallel architectures, SNMPv3/MODBUS telemetry cards, and nested VRLA/AGM cell degradation curves.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">REDUNDANCY MODE</span>
            <span className="text-amber-400 font-bold">{selectedAsset?.redundancyMode || 'STANDALONE'}</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">COMMUNICATION</span>
            <span className="text-cyan-400 font-bold">{selectedAsset?.communicationCard || 'SNMP_V3'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Tree Hierarchy vs Right Analytics / Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Recursive Topology Tree (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">
                Asset Hierarchy Tree (SQL CTE)
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              WITH RECURSIVE
            </span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {tenantAssets.map((rootAsset) => renderAssetNode(rootAsset, 0))}
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400">
            💡 <strong>Pioneer Architecture Note:</strong> Multi-MVA parallel systems track individual module load balancing, synchronizing bypass thyristors and battery string float voltages.
          </div>
        </div>

        {/* Right Column: Selected Asset Details & Impedance Degradation Chart (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Asset Telemetry Card */}
          {selectedAsset && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-semibold border border-cyan-800">
                      {selectedAsset.assetType}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {selectedAsset.modelNumber}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Series: <strong className="text-slate-200">{selectedAsset.productSeries}</strong> • Serial: <strong className="text-cyan-300 font-mono">{selectedAsset.serialNumber}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full font-mono border ${
                    selectedAsset.status === 'OPERATIONAL'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : selectedAsset.status === 'DEGRADED'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}>
                    {selectedAsset.status}
                  </span>
                </div>
              </div>

              {/* Asset Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Rating / Capacity</span>
                  <span className="font-bold text-slate-200 text-sm">
                    {selectedAsset.capacityKva ? `${selectedAsset.capacityKva} kVA` : selectedAsset.ratedVoltageV ? `${selectedAsset.ratedVoltageV} V` : 'N/A'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Redundancy Arch</span>
                  <span className="font-bold font-mono text-sm text-amber-300 truncate">
                    {selectedAsset.redundancyMode}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Telemetry Protocol</span>
                  <span className="font-semibold text-cyan-300 font-mono text-sm">
                    {selectedAsset.communicationCard || 'SNMP_V3'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">AMC Contract Tier</span>
                  <span className="font-semibold text-emerald-400 font-mono text-sm truncate">
                    {selectedAsset.contractSla?.replace(/_/g, ' ') || '4-Hour'}
                  </span>
                </div>
              </div>

              {/* Degradation Chart */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span>Time-Series Internal Resistance (mΩ) Degradation Curve</span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                    Threshold: 13.65 mΩ (+30%)
                  </span>
                </div>

                <div className="h-56 w-full bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={degradationData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[8, 18]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      />
                      <ReferenceLine y={13.65} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '30% Critical Threshold', fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }} />
                      <Line type="monotone" dataKey="impedance" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4, fill: '#38bdf8' }} name="Measured Impedance (mΩ)" />
                      <Line type="monotone" dataKey="voltage" stroke="#34d399" strokeWidth={1.5} dot={false} name="Terminal Voltage (V)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Record Live Reading Simulator */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" /> Test Reading Simulator (Field Ingestion)
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Impedance:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={testImpedance}
                      onChange={(e) => setTestImpedance(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none"
                    />
                    <span className="text-slate-400 font-mono">mΩ</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Voltage:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={testVoltage}
                      onChange={(e) => setTestVoltage(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-300 focus:outline-none"
                    />
                    <span className="text-slate-400 font-mono">V</span>
                  </div>

                  <button
                    onClick={() => onRecordImpedance(selectedAsset.assetId, testImpedance, testVoltage)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow transition cursor-pointer"
                  >
                    Commit Measurement
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Battery Cell Replacement Modal */}
      {isSwapModalOpen && cellToSwap && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-cyan-400 border-b border-slate-800 pb-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <h3 className="text-base font-bold text-white">Execute Battery Cell Replacement</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Replacing battery cell <strong className="text-cyan-300 font-mono">{cellToSwap.serialNumber}</strong> in parent bank <strong className="text-slate-100 font-mono">{cellToSwap.parentAssetId}</strong>.
            </p>

            <form onSubmit={handleSwapSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  New Pioneer / Yuasa Cell Barcode Serial
                </label>
                <input
                  type="text"
                  required
                  value={newSerialInput}
                  onChange={(e) => setNewSerialInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-cyan-300 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
                >
                  Commit Replacement & Reset Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
