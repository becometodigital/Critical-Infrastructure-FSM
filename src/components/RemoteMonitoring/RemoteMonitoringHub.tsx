import React, { useState, useEffect } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Radio,
  Gauge,
  Thermometer,
  Zap,
  BatteryCharging,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Server,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  Sliders,
} from 'lucide-react';
import {
  Asset,
  TenantId,
  AssetReading,
  ManufacturerFaultCode,
  TicketServiceType,
  PriorityLevel,
} from '../../types/fsm';

interface RemoteMonitoringHubProps {
  currentTenantId: TenantId;
  assets: Asset[];
  faultCodes: ManufacturerFaultCode[];
  onAutoTriggerTicket: (alarm: {
    assetId: string;
    branchId: string;
    faultCode: string;
    serviceType: TicketServiceType;
    priority: PriorityLevel;
    issueSummary: string;
    telemetryData: Record<string, any>;
  }) => void;
}

export const RemoteMonitoringHub: React.FC<RemoteMonitoringHubProps> = ({
  currentTenantId,
  assets,
  faultCodes,
  onAutoTriggerTicket,
}) => {
  const tenantAssets = assets.filter((a) => a.tenantId === currentTenantId);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(tenantAssets[0]?.assetId || '');
  
  // Real-time telemetry simulation state
  const selectedAsset = tenantAssets.find((a) => a.assetId === selectedAssetId) || tenantAssets[0];

  // Dynamic Telemetry Metrics
  const [inverterTemp, setInverterTemp] = useState<number>(selectedAsset?.liveTemperatureC || 38.4);
  const [dcImpedance, setDcImpedance] = useState<number>(selectedAsset?.currentImpedanceMohm || 10.5);
  const [upsLoadPct, setUpsLoadPct] = useState<number>(selectedAsset?.liveLoadPercentage || 65.0);
  const [dcVoltage, setDcVoltage] = useState<number>(selectedAsset?.ratedVoltageV || 400.0);
  const [frequencyHz, setFrequencyHz] = useState<number>(50.02);
  const [isSimulatingAnomaly, setIsSimulatingAnomaly] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [protocolView, setProtocolView] = useState<'SNMP_V3' | 'MODBUS_TCP' | 'RAW_REGISTERS'>('SNMP_V3');

  // Sync state if selected asset changes
  useEffect(() => {
    if (selectedAsset) {
      setInverterTemp(selectedAsset.liveTemperatureC || 36.5);
      setDcImpedance(selectedAsset.currentImpedanceMohm || 10.5);
      setUpsLoadPct(selectedAsset.liveLoadPercentage || 60.0);
      setActiveAlert(null);
    }
  }, [selectedAssetId]);

  // Telemetry Heartbeat simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSimulatingAnomaly) {
        // Minor natural fluctuations
        setInverterTemp((prev) => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
        setUpsLoadPct((prev) => Math.min(95, Math.max(30, +(prev + (Math.random() * 1.2 - 0.6)).toFixed(1))));
        setFrequencyHz((prev) => +(50.0 + (Math.random() * 0.08 - 0.04)).toFixed(2));
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isSimulatingAnomaly]);

  // Anomaly Injection Simulators
  const triggerBatteryImpedanceFault = () => {
    setIsSimulatingAnomaly(true);
    setDcImpedance(15.9);
    setInverterTemp(44.2);
    setActiveAlert('ERR_ELEKTRA_B12: Battery Impedance Surge > 15.8 mΩ (Critical Degradation)');
    
    // Auto-create ticket via Gateway rule
    onAutoTriggerTicket({
      assetId: selectedAsset.assetId,
      branchId: selectedAsset.branchId,
      faultCode: 'ERR_ELEKTRA_B12',
      serviceType: 'BATTERY_REPLACEMENT',
      priority: 'CRITICAL',
      issueSummary: `[AUTO-INGESTION: SNMPv3 Gateway] Battery String A cell exceeded 15.9 mΩ (51% drift over 10.5 mΩ baseline) & 44.2°C thermal rise. Pre-failure auto-dispatch triggered.`,
      telemetryData: {
        impedanceMohm: 15.9,
        temperatureC: 44.2,
        baselineMohm: 10.5,
        thresholdMohm: 13.65,
        snmpOid: '.1.3.6.1.4.1.9344.1.2.4.1.15',
        timestamp: new Date().toISOString(),
      },
    });
  };

  const triggerInverterOvertempFault = () => {
    setIsSimulatingAnomaly(true);
    setInverterTemp(84.6);
    setUpsLoadPct(88.5);
    setActiveAlert('ERR_ELEKTRA_F41: Inverter Heatsink Thermal Overload (84.6°C)');
    
    onAutoTriggerTicket({
      assetId: selectedAsset.assetId,
      branchId: selectedAsset.branchId,
      faultCode: 'ERR_ELEKTRA_F41',
      serviceType: 'EMERGENCY_BREAKDOWN',
      priority: 'CRITICAL',
      issueSummary: `[AUTO-INGESTION: MODBUS-TCP Gateway] Inverter Bridge IGBT temperature spiked to 84.6°C (Threshold 82.0°C). System transferred to Static Bypass. Cooling fan check required.`,
      telemetryData: {
        inverterTempC: 84.6,
        thresholdC: 82.0,
        loadPct: 88.5,
        modbusRegister: '40012 (HOLDING_REG_IGBT_TEMP)',
        timestamp: new Date().toISOString(),
      },
    });
  };

  const resetTelemetry = () => {
    setIsSimulatingAnomaly(false);
    setInverterTemp(37.2);
    setDcImpedance(10.5);
    setUpsLoadPct(62.0);
    setActiveAlert(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
            Pioneer System IoT Telemetry & Fleet Intelligence Engine
          </div>
          <h2 className="text-xl font-semibold text-white">
            Live UPS Remote Monitoring (SNMPv3 • MODBUS-TCP • RS485 • GPRS)
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Continuous millisecond parameter polling for Elektra industrial systems up to 3.2 MVA. Automatically detects pre-failure degradation, matches manufacturer fault codes, and auto-dispatches before power failure occurs.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Gateway Online (0.8s Heartbeat)</span>
          </div>
        </div>
      </div>

      {/* Asset Selector & Quick Telemetry KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Asset Selector Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block uppercase font-mono">
            Select Online UPS Fleet Asset
          </label>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-cyan-300 text-xs font-semibold rounded-lg p-2.5 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {tenantAssets.map((a) => (
              <option key={a.assetId} value={a.assetId}>
                [{a.productSeries}] {a.modelNumber} ({a.capacityKva || 0} kVA)
              </option>
            ))}
          </select>

          {selectedAsset && (
            <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1.5 font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Protocol:</span>
                <span className="text-cyan-300 font-bold">{selectedAsset.communicationCard || 'SNMP_V3'}</span>
              </div>
              <div className="flex justify-between">
                <span>Gateway IP:</span>
                <span className="text-slate-200">{selectedAsset.snmpIpAddress || '10.240.50.114'}</span>
              </div>
              <div className="flex justify-between">
                <span>Architecture:</span>
                <span className="text-amber-300">{selectedAsset.redundancyMode}</span>
              </div>
              <div className="flex justify-between">
                <span>AMC Coverage:</span>
                <span className="text-emerald-400 font-semibold">{selectedAsset.contractType}</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Gauges */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5"><Thermometer className="w-4 h-4 text-rose-400" /> Inverter IGBT Temp</span>
            <span className={`font-bold ${inverterTemp > 75 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {inverterTemp > 75 ? 'HIGH' : 'NORMAL'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {inverterTemp}°C
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${inverterTemp > 75 ? 'bg-rose-500' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min(100, (inverterTemp / 100) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">Threshold: 82.0°C (Auto-Bypass Trip)</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5"><BatteryCharging className="w-4 h-4 text-amber-400" /> Battery Impedance</span>
            <span className={`font-bold ${dcImpedance >= 13.65 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {dcImpedance >= 13.65 ? 'DEGRADED (+51%)' : 'HEALTHY'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {dcImpedance} mΩ
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${dcImpedance >= 13.65 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (dcImpedance / 20) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">Baseline: 10.5 mΩ • Alert: ≥ 13.65 mΩ</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5"><Gauge className="w-4 h-4 text-cyan-400" /> True Active Load</span>
            <span className="text-cyan-300 font-bold">{frequencyHz} Hz</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {upsLoadPct}% <span className="text-xs text-slate-400 font-normal">({((selectedAsset?.capacityKw || 400) * (upsLoadPct / 100)).toFixed(0)} kW)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${upsLoadPct}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">3-Phase Balanced (L1: 33%, L2: 34%, L3: 33%)</span>
        </div>

      </div>

      {/* Anomaly Alarm Simulation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Proactive Failure Simulation Testing Engine
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate live hardware drift to verify autonomous telemetry ingestion, fault-code matching, and auto-dispatching.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={triggerBatteryImpedanceFault}
              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-semibold transition cursor-pointer"
            >
              Simulate Battery Surge (15.9mΩ)
            </button>
            <button
              onClick={triggerInverterOvertempFault}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-mono font-semibold transition cursor-pointer"
            >
              Simulate Inverter Overheat (84°C)
            </button>
            {isSimulatingAnomaly && (
              <button
                onClick={resetTelemetry}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {activeAlert && (
          <div className="mt-3 p-3 bg-rose-950/80 border border-rose-800 rounded-lg flex items-center justify-between text-xs text-rose-200 font-mono animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{activeAlert}</span>
            </div>
            <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
              AUTONOMOUS TICKET GENERATED
            </span>
          </div>
        )}
      </div>

      {/* Protocol Telemetry Stream & Manufacturer Diagnostic Knowledge Base */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Telemetry Gateway Stream */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Live Protocol Frame Inspector
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              {(['SNMP_V3', 'MODBUS_TCP', 'RAW_REGISTERS'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setProtocolView(mode)}
                  className={`px-2 py-0.5 rounded transition ${
                    protocolView === mode
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 max-h-[360px] overflow-y-auto space-y-2">
            {protocolView === 'SNMP_V3' && (
              <div className="space-y-1.5 text-[11px]">
                <div className="text-slate-500">// SNMPv3 USM AuthPriv (SHA-256 / AES-128) - OID Walk</div>
                <div className="text-cyan-300">GET .1.3.6.1.4.1.9344.1.1.1.0 (upsIdentModel) = "Elektra-Max 500kVA"</div>
                <div className="text-emerald-400">GET .1.3.6.1.4.1.9344.1.2.1.0 (upsBatteryStatus) = {dcImpedance >= 13.65 ? '3 (batteryDepleted/Fault)' : '2 (batteryNormal)'}</div>
                <div className="text-amber-300">GET .1.3.6.1.4.1.9344.1.2.4.0 (upsEstimatedMinutesRemaining) = "142 minutes"</div>
                <div className="text-slate-200">GET .1.3.6.1.4.1.9344.1.2.5.0 (upsBatteryVoltage) = "{dcVoltage.toFixed(1)} VDC"</div>
                <div className="text-rose-400">GET .1.3.6.1.4.1.9344.1.2.7.0 (upsBatteryTemperature) = "{inverterTemp}°C"</div>
                <div className="text-cyan-300">GET .1.3.6.1.4.1.9344.1.4.4.1 (upsOutputPercentLoad) = "{upsLoadPct}%"</div>
                <div className="text-slate-400">GET .1.3.6.1.4.1.9344.1.3.3.1 (upsInputFrequency) = "{frequencyHz} Hz"</div>
                <div className="text-slate-500 text-[10px] mt-2">// Next poll in 800ms... CRC32: 0x8F9A1B</div>
              </div>
            )}

            {protocolView === 'MODBUS_TCP' && (
              <div className="space-y-1.5 text-[11px]">
                <div className="text-slate-500">// MODBUS-TCP Frame [SlaveID: 1, Function Code: 0x03 (Read Holding Registers)]</div>
                <div>Reg 40001 (SYS_STATUS_WORD) : 0x0001 [INVERTER_ON_LOAD]</div>
                <div>Reg 40002 (INVERTER_VOLTAGE_PH_A) : 230.4 V</div>
                <div>Reg 40003 (INVERTER_VOLTAGE_PH_B) : 230.1 V</div>
                <div>Reg 40004 (INVERTER_VOLTAGE_PH_C) : 230.8 V</div>
                <div className={inverterTemp > 75 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  Reg 40012 (IGBT_HEATSINK_TEMP) : {inverterTemp} °C {inverterTemp > 75 && '--> TRIP_ALARM'}
                </div>
                <div className={dcImpedance >= 13.65 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                  Reg 40024 (STRING_A_INTERNAL_RES) : {dcImpedance} mΩ
                </div>
                <div>Reg 40030 (TOTAL_KWH_DELIVERED) : 1,489,204 kWh</div>
              </div>
            )}

            {protocolView === 'RAW_REGISTERS' && (
              <div className="space-y-1 text-[11px] text-slate-400">
                <div>[0x00] 00 01 00 00 00 06 01 03 9C 40 00 08</div>
                <div>[0x0C] 00 01 00 00 00 13 01 03 10 00 01 09 00 08 FE 09 04</div>
                <div className="text-cyan-400">[GPRS-TELEMETRY] Payload Signed HMAC-SHA256: e8f92a1c998b31d044...</div>
                <div className="text-emerald-400">[DRY-CONTACT-CARD] PIN 1 (Mains Fail): LOW | PIN 2 (Bypass Active): LOW | PIN 3 (Common Alarm): {isSimulatingAnomaly ? 'HIGH' : 'LOW'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Authoritative Manufacturer Knowledge Base */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Pioneer Manufacturer Knowledge Base
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-400">
              Official SOPs
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {faultCodes.map((fc) => (
              <div
                key={fc.code}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300">{fc.code}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    {fc.severity}
                  </span>
                </div>

                <div className="font-semibold text-slate-200 text-[11px]">{fc.title}</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{fc.description}</p>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-300 space-y-1 font-mono">
                  <div className="text-cyan-400 font-bold">Standard Model Procedure:</div>
                  {fc.recommendedProcedure.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="text-slate-400">{p}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
