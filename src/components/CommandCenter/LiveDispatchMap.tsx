import React, { useState, useMemo } from 'react';
import {
  Compass,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  UserCheck,
  ShieldCheck,
  Radar,
  Sliders,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Branch, Technician, Ticket, TenantId, Asset } from '../../types/fsm';
import {
  calculatePostgisDistanceMeters,
  calculatePostgisDistanceKm,
  validateBranchGeofence,
  calculateCandidateScore,
} from '../../utils/postgis';

interface LiveDispatchMapProps {
  currentTenantId: TenantId;
  branches: Branch[];
  technicians: Technician[];
  tickets: Ticket[];
  assets: Asset[];
  onAssignTechnician: (ticketId: string, technicianId: string) => void;
  onRecordGeofenceCheck: (ticketId: string, allowed: boolean, distanceMeters: number) => void;
}

export const LiveDispatchMap: React.FC<LiveDispatchMapProps> = ({
  currentTenantId,
  branches,
  technicians,
  tickets,
  assets,
  onAssignTechnician,
  onRecordGeofenceCheck,
}) => {
  const tenantBranches = useMemo(
    () => branches.filter((b) => b.tenantId === currentTenantId),
    [branches, currentTenantId]
  );
  const tenantTickets = useMemo(
    () => tickets.filter((t) => t.tenantId === currentTenantId),
    [tickets, currentTenantId]
  );

  const [selectedBranchId, setSelectedBranchId] = useState<string>(tenantBranches[0]?.branchId || '');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(tenantTickets[0]?.ticketId || '');
  
  // Geofence Test Simulator Controls
  const [simTechLat, setSimTechLat] = useState<number>(24.8608);
  const [simTechLng, setSimTechLng] = useState<number>(67.0012);
  const [simAccuracy, setSimAccuracy] = useState<number>(8.5);
  const [simMockLocation, setSimMockLocation] = useState<boolean>(false);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(50.0);

  const selectedBranch = tenantBranches.find((b) => b.branchId === selectedBranchId) || tenantBranches[0];
  const selectedTicket = tenantTickets.find((t) => t.ticketId === selectedTicketId) || tenantTickets[0];

  // Geofence Evaluation against selected branch
  const geofenceResult = useMemo(() => {
    if (!selectedBranch) return null;
    return validateBranchGeofence(
      { latitude: simTechLat, longitude: simTechLng },
      { latitude: selectedBranch.latitude, longitude: selectedBranch.longitude },
      simAccuracy,
      simMockLocation,
      geofenceRadius
    );
  }, [selectedBranch, simTechLat, simTechLng, simAccuracy, simMockLocation, geofenceRadius]);

  // Candidate Scoring for the selected ticket
  const candidateRankings = useMemo(() => {
    if (!selectedBranch || !selectedTicket) return [];
    
    // Find asset type required for this ticket
    const ticketAsset = assets.find((a) => a.assetId === selectedTicket.assetId);
    const requiredType = ticketAsset?.assetType || 'UPS_SYSTEM';

    return technicians
      .map((tech) => {
        const distanceKm = calculatePostgisDistanceKm(
          { latitude: tech.currentLatitude, longitude: tech.currentLongitude },
          { latitude: selectedBranch.latitude, longitude: selectedBranch.longitude }
        );
        const skillMatch = tech.certifications.includes(requiredType);
        const scoreBreakdown = calculateCandidateScore(distanceKm, skillMatch, tech.activeTicketsCount);
        
        // Parts check in van
        const hasParts = tech.vanInventory.some((item) => item.quantityAvailable > 0);

        return {
          tech,
          distanceKm: Math.round(distanceKm * 100) / 100,
          skillMatch,
          hasParts,
          ...scoreBreakdown,
        };
      })
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }, [selectedBranch, selectedTicket, technicians, assets]);

  // Set coordinates to branch location presets
  const snapToBranch = (inside: boolean) => {
    if (!selectedBranch) return;
    if (inside) {
      // 15 meters away (inside 50m geofence)
      setSimTechLat(selectedBranch.latitude + 0.00012);
      setSimTechLng(selectedBranch.longitude + 0.0001);
    } else {
      // 320 meters away (outside 50m geofence)
      setSimTechLat(selectedBranch.latitude + 0.0028);
      setSimTechLng(selectedBranch.longitude + 0.002);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Spatial Intelligence & PostGIS Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Radar className="w-4 h-4" />
              Spatial Dispatch Intelligence Engine
            </div>
            <h2 className="text-xl font-semibold text-white">
              Branch Geofencing & Deterministic Spatial Candidate Scoring
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Calculates technician routing via <code className="text-cyan-300 font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">ST_Distance(::geography)</code>, verifies hardware-level anti-spoofing flags, and executes atomic van stock reservations without client-side coordinate tampering.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">GEOFENCE THRESHOLD</span>
              <span className="text-emerald-400 font-bold">50.0 Meters (Strict)</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">SPATIAL PROJECTION</span>
              <span className="text-cyan-400 font-bold">EPSG:4326 (WGS 84)</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-slate-400 block text-[10px]">ACTIVE BRANCHES</span>
              <span className="text-white font-bold">{tenantBranches.length} Hubs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Spatial Radar / Map Visualizer & Candidate Scoring Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: PostGIS Radar & Geofence Simulator (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Spatial Radar Visualizer Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  Spatial Proximity Radar (Spatial Intelligence View)
                </h3>
              </div>
              
              {/* Branch Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Target Branch:</span>
                <select
                  id="select-branch-target"
                  aria-label="Target Branch for Spatial Radar"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
                >
                  {tenantBranches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      [{b.criticalityLevel}] {b.branchName.substring(0, 32)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Simulated PostGIS Spatial Radar Canvas/SVG */}
            <div className="relative w-full h-72 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center p-4">
              
              {/* Grid Lines */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Range Rings (50m, 100m, 500m, 2000m) */}
              <div className="absolute w-20 h-20 rounded-full border border-emerald-500/50 bg-emerald-500/5 flex items-center justify-center pointer-events-none">
                <span className="absolute -top-4 text-[9px] font-mono text-emerald-400 bg-slate-900/90 px-1 rounded">50m Geofence Lock</span>
              </div>
              <div className="absolute w-36 h-36 rounded-full border border-slate-700/60 pointer-events-none" />
              <div className="absolute w-56 h-56 rounded-full border border-slate-800 pointer-events-none" />

              {/* Crosshair Axes */}
              <div className="absolute inset-x-0 top-1/2 border-t border-slate-800/80 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 border-l border-slate-800/80 pointer-events-none" />

              {/* Center: Target Branch Pin */}
              <div className="absolute z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/30 animate-pulse">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="mt-1 bg-slate-900/95 border border-cyan-500/50 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-md">
                  {selectedBranch?.branchCode} ({selectedBranch?.criticalityLevel})
                </div>
              </div>

              {/* Technician Marker Positioned Based on Distance */}
              {geofenceResult && (
                <div
                  className="absolute z-20 transition-all duration-500 flex flex-col items-center"
                  style={{
                    transform: `translate(${
                      geofenceResult.distanceMeters > 50
                        ? Math.min(110, geofenceResult.distanceMeters / 3)
                        : (geofenceResult.distanceMeters / 50) * 25
                    }px, ${
                      geofenceResult.distanceMeters > 50
                        ? -Math.min(100, geofenceResult.distanceMeters / 3.5)
                        : -(geofenceResult.distanceMeters / 50) * 20
                    }px)`,
                  }}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 ${
                      geofenceResult.allowed
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-emerald-500/40'
                        : 'bg-rose-500/30 border-rose-400 text-rose-300 shadow-rose-500/40'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="mt-1 bg-slate-900/95 border border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-200 whitespace-nowrap shadow">
                    Tech: {geofenceResult.distanceMeters.toFixed(1)}m away
                  </div>
                </div>
              )}

              {/* Status Pill on Radar */}
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>LAT: {selectedBranch?.latitude.toFixed(4)}, LNG: {selectedBranch?.longitude.toFixed(4)}</span>
              </div>
            </div>

            {/* Selected Branch Details */}
            <div className="mt-4 p-3.5 bg-slate-800/60 border border-slate-700/70 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Facility</span>
                <span className="font-medium text-slate-200">{selectedBranch?.branchName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Criticality & Ops</span>
                <span className="font-semibold text-emerald-300">
                  {selectedBranch?.criticalityLevel} • {selectedBranch?.operatingHours.is24Hours ? '24x7 Continuous' : '08:30 - 18:00'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Site Contact</span>
                <span className="text-slate-300">{selectedBranch?.securityContact}</span>
              </div>
            </div>
          </div>

          {/* Interactive 50-Meter Geofence Verification Terminal */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">
                  Geofenced Attendance Verification
                </h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ST_Distance(location::geography)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              
              {/* Coordinate Controls */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Simulated Tech Latitude:</span>
                  <span className="font-mono text-cyan-300">{simTechLat.toFixed(6)}</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={simTechLat}
                  onChange={(e) => setSimTechLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Simulated Tech Longitude:</span>
                  <span className="font-mono text-cyan-300">{simTechLng.toFixed(6)}</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={simTechLng}
                  onChange={(e) => setSimTechLng(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

            </div>

            {/* Preset Position Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-slate-400 self-center">Position Presets:</span>
              <button
                onClick={() => snapToBranch(true)}
                className="px-2.5 py-1 text-xs rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-medium transition cursor-pointer"
              >
                ✓ Inside Vault (15m)
              </button>
              <button
                onClick={() => snapToBranch(false)}
                className="px-2.5 py-1 text-xs rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-medium transition cursor-pointer"
              >
                ✕ Outside Boundary (320m)
              </button>
              <button
                onClick={() => setSimMockLocation(!simMockLocation)}
                className={`px-2.5 py-1 text-xs rounded border font-medium transition cursor-pointer ${
                  simMockLocation
                    ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {simMockLocation ? '⚠ Fake GPS Active (Simulated Mock)' : 'Fake GPS Disabled (Clean OS)'}
              </button>
            </div>

            {/* Real-time Verification Output Banner */}
            {geofenceResult && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                  geofenceResult.allowed
                    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}
              >
                {geofenceResult.allowed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {geofenceResult.allowed ? 'GEOFENCE CHECK-IN AUTHORIZED' : 'CHECK-IN BLOCKED / SECURITY EXCEPTION'}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700">
                      Distance: {geofenceResult.distanceMeters.toFixed(1)}m / Max: {geofenceRadius}m
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-slate-300">
                    {geofenceResult.message}
                  </p>

                  {/* Commit Check-In Button */}
                  {selectedTicket && (
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-mono text-slate-400">
                        Target Ticket: {selectedTicket.ticketNumber} ({selectedTicket.priority})
                      </span>
                      <button
                        id="btn-commit-geofence"
                        onClick={() =>
                          onRecordGeofenceCheck(
                            selectedTicket.ticketId,
                            geofenceResult.allowed,
                            geofenceResult.distanceMeters
                          )
                        }
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow transition cursor-pointer ${
                          geofenceResult.allowed
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-800 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {geofenceResult.allowed ? 'Lock Geofenced Attendance' : 'Log Geofence Rejection Event'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Dynamic Candidate Scoring & Dispatch Allocation (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-full">
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  Candidate Scoring Matrix
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                Score: S_prox + S_skill - S_load
              </span>
            </div>

            {/* Target Ticket Selector */}
            <div className="p-3 bg-slate-800/70 border border-slate-700/80 rounded-lg mb-4 text-xs">
              <label className="text-slate-400 block text-[10px] font-mono uppercase mb-1">
                Active Ticket to Dispatch:
              </label>
              <select
                id="select-ticket-dispatch"
                aria-label="Active Ticket to Dispatch"
                value={selectedTicketId}
                onChange={(e) => setSelectedTicketId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
              >
                {tenantTickets.map((t) => (
                  <option key={t.ticketId} value={t.ticketId}>
                    [{t.priority}] {t.ticketNumber} — Status: {t.status}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[11px] text-slate-300 line-clamp-2">
                {selectedTicket?.issueSummary}
              </div>
            </div>

            {/* Candidate List Ranked by Composite Score */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[440px] pr-1">
              {candidateRankings.map((c, idx) => {
                const isAssigned = selectedTicket?.assignedTechnicianId === c.tech.technicianId;
                return (
                  <div
                    key={c.tech.technicianId}
                    className={`p-3.5 rounded-xl border transition-all ${
                      idx === 0
                        ? 'bg-slate-800/90 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                        : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-semibold text-xs text-white">
                            {c.tech.fullName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-2">
                          <span>Dist: <strong className="text-slate-200 font-mono">{c.distanceKm} km</strong></span>
                          <span>•</span>
                          <span>Active Jobs: <strong className="text-slate-200 font-mono">{c.tech.activeTicketsCount}</strong></span>
                        </div>
                      </div>

                      {/* Composite Score Badge */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono block">COMPOSITE SCORE</span>
                        <span className={`text-base font-bold font-mono ${
                          c.compositeScore >= 70 ? 'text-emerald-400' : c.compositeScore >= 40 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {c.compositeScore.toFixed(1)} / 100
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded border ${
                        c.skillMatch
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}>
                        {c.skillMatch ? '✓ Certified Match (+30)' : '✕ No Exact Cert (+0)'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        Prox: +{c.proximityPoints}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                        Load: -{c.workloadPenalty}
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${
                        c.hasParts
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}>
                        {c.hasParts ? 'Van Stock Ready' : 'Van Stock Low'}
                      </span>
                    </div>

                    {/* Dispatch Button */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/60">
                      <span className="text-[10px] text-slate-400">
                        {c.tech.phone}
                      </span>

                      {isAssigned ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Assigned & Reserved
                        </span>
                      ) : (
                        <button
                          id={`btn-dispatch-${c.tech.technicianId}`}
                          onClick={() => onAssignTechnician(selectedTicket.ticketId, c.tech.technicianId)}
                          className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded shadow transition active:scale-95 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Assign & Reserve Van Part</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Algorithmic Weighting Footer Note */}
            <div className="mt-4 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Spatial scoring rule:</strong> Proximity decays linearly by distance (50 max), skill certification adds +30 points, while active work penalty (-10/ticket) prevents technician burnout.
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
