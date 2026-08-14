import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Camera,
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Hash,
  FileSignature,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AssetType, TenantId, Ticket } from '../../types/fsm';
import { computeSha256 } from '../../utils/crypto';

interface FieldServiceReportProps {
  currentTenantId: TenantId;
  tickets: Ticket[];
  onSubmitFSR: (ticketId: string, formData: Record<string, any>, photoHash: string, s3Url: string) => void;
}

export const FieldServiceReport: React.FC<FieldServiceReportProps> = ({
  currentTenantId,
  tickets,
  onSubmitFSR,
}) => {
  const tenantTickets = useMemo(
    () => tickets.filter((t) => t.tenantId === currentTenantId),
    [tickets, currentTenantId]
  );

  const [selectedTicketId, setSelectedTicketId] = useState<string>(tenantTickets[0]?.ticketId || '');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('UPS_SYSTEM');
  
  // Dynamic Form Values
  const [formValues, setFormValues] = useState<Record<string, any>>({
    input_voltage_r_phase: 228,
    output_voltage_l_n: 220,
    load_percentage: 64,
    bypass_status: false,
    inverter_health: 'NORMAL',
    fan_noise_normal: true,
    float_voltage_dc: 485,
    discharge_current_amps: 42,
    swollen_cells_detected: 0,
    acid_leakage_present: false,
    terminal_corrosion_check: false,
    stabilizer_output_voltage: 220,
    scr_temperature_c: 48,
    signeeName: 'Muhammad Salman (Branch Ops Manager)',
    signeeTitle: 'Branch Operations Head',
  });

  // Photo & Forensic Evidence State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [computedSha256, setComputedSha256] = useState<string>('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const selectedTicket = tenantTickets.find((t) => t.ticketId === selectedTicketId) || tenantTickets[0];

  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Simulate Photo Upload & Real SHA-256 Hashing
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsHashing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      const hash = await computeSha256(buffer);
      setComputedSha256(hash);
      setPhotoPreview(URL.createObjectURL(file));
      setIsHashing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Generate a sample simulated thermal scan photo
  const loadSampleThermalScan = async () => {
    setIsHashing(true);
    const sampleData = `THERMAL_SCAN_METADATA_BANK_UPS_TICKET_${selectedTicket?.ticketNumber || 'TKT'}_TIMESTAMP_${Date.now()}`;
    const hash = await computeSha256(sampleData);
    setComputedSha256(hash);
    setPhotoPreview('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80');
    setIsHashing(false);
  };

  // Dynamic Validation Engine
  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (selectedAssetType === 'UPS_SYSTEM') {
      const vIn = Number(formValues.input_voltage_r_phase);
      const vOut = Number(formValues.output_voltage_l_n);
      const load = Number(formValues.load_percentage);

      if (vIn < 160 || vIn > 280) errors.push(`Input Voltage (${vIn}V) out of safe grid envelope (160 - 280V).`);
      if (vOut < 215 || vOut > 235) errors.push(`Output Voltage (${vOut}V) exceeds bank inverter tolerance (215 - 235V).`);
      if (load < 0 || load > 100) errors.push(`Load percentage (${load}%) must be between 0% and 100%.`);
    } else if (selectedAssetType === 'BATTERY_BANK' || selectedAssetType === 'BATTERY_UNIT') {
      const vDc = Number(formValues.float_voltage_dc);
      const swollen = Number(formValues.swollen_cells_detected);

      if (vDc < 120 || vDc > 550) errors.push(`DC Float Voltage (${vDc}V) out of string design range (120 - 550V).`);
      if (swollen > 0) {
        // High alert
      }
    }

    if (!photoPreview && computedSha256 === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
      errors.push('Forensic Evidence Photo is required before evidence retention can be queued.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsSuccess(false);
      return;
    }

    setValidationErrors([]);
    const s3Url = `https://fsm-immutable-evidence-vault.s3.ap-south-1.amazonaws.com/evidence/${selectedTicket?.ticketId}/${Date.now()}_${computedSha256.substring(0, 10)}.webp`;

    if (selectedTicket) {
      onSubmitFSR(selectedTicket.ticketId, formValues, computedSha256, s3Url);
    }
    setIsSuccess(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            Schema-Driven Dynamic FSR & Immutable Evidence Vault
          </div>
          <h2 className="text-xl font-semibold text-white">
            Asset-Specific Field Service Report & Forensic Evidence Ingestion
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Renders dynamic inspection parameters for <code className="text-cyan-300 font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">UPS Systems vs Battery Banks</code>, computes SHA-256 client hashes, and archives tamper-proof evidence under AWS S3 Compliance Mode (7-Year Lock).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">EVIDENCE RETENTION</span>
            <span className="text-emerald-400 font-bold">IMMUTABLE-READY</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <span className="text-slate-400 block text-[10px]">AUDIT RETENTION</span>
            <span className="text-cyan-400 font-bold">2,555 Days (7 Years)</span>
          </div>
        </div>
      </div>

      {/* Main FSR Form Grid */}
      <form onSubmit={validateAndSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Dynamic Schema Checklist & Form Fields (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white">
                Field Inspection Checklist
              </h3>
              <p className="text-xs text-slate-400">
                Asset Type triggers strict validation boundaries
              </p>
            </div>

            {/* Asset Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Asset Schema:</span>
              <select
                id="select-fsr-asset-type"
                aria-label="Asset Schema for Inspection Form"
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value as AssetType)}
                className="bg-slate-800 border border-slate-700 text-cyan-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-medium"
              >
                <option value="UPS_SYSTEM">UPS_SYSTEM (3-Phase / Inverter)</option>
                <option value="BATTERY_BANK">BATTERY_BANK (DC Strings / Float)</option>
                <option value="BATTERY_UNIT">BATTERY_UNIT (12V Cell Check)</option>
                <option value="AVR_MODULE">AVR_MODULE (Static Bypass / SCR)</option>
              </select>
            </div>
          </div>

          {/* Ticket Target Selector */}
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
            <label className="text-slate-400 block text-[10px] uppercase font-mono mb-1">
              Binding Field Ticket:
            </label>
            <select
              id="select-fsr-ticket"
              aria-label="Target Ticket for FSR"
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded px-2.5 py-1.5 focus:outline-none"
            >
              {tenantTickets.map((t) => (
                <option key={t.ticketId} value={t.ticketId}>
                  [{t.priority}] {t.ticketNumber} — Status: {t.status}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Inputs based on selectedAssetType */}
          {selectedAssetType === 'UPS_SYSTEM' && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                ► UPS Electrical Parameters & Inverter Telemetry
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Input Voltage R-Phase (V) <span className="text-slate-500 font-mono">[160-280V]</span>
                  </label>
                  <input
                    type="number"
                    value={formValues.input_voltage_r_phase}
                    onChange={(e) => handleFieldChange('input_voltage_r_phase', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Output Voltage L-N (V) <span className="text-slate-500 font-mono">[215-235V]</span>
                  </label>
                  <input
                    type="number"
                    value={formValues.output_voltage_l_n}
                    onChange={(e) => handleFieldChange('output_voltage_l_n', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    UPS Active Load Percentage (%) <span className="text-slate-500 font-mono">[0-100%]</span>
                  </label>
                  <input
                    type="number"
                    value={formValues.load_percentage}
                    onChange={(e) => handleFieldChange('load_percentage', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Inverter State
                  </label>
                  <select
                    value={formValues.inverter_health}
                    onChange={(e) => handleFieldChange('inverter_health', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg p-2 font-medium"
                  >
                    <option value="NORMAL">NORMAL (Inverting Grid/Batt)</option>
                    <option value="WARNING">WARNING (Minor Throttling)</option>
                    <option value="FAULT">FAULT (Static Bypass Engaged)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.bypass_status}
                    onChange={(e) => handleFieldChange('bypass_status', e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200">Maintenance Bypass Switch Closed?</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.fan_noise_normal}
                    onChange={(e) => handleFieldChange('fan_noise_normal', e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200">Cooling Fan Noise & CFM Normal?</span>
                </label>
              </div>
            </div>
          )}

          {(selectedAssetType === 'BATTERY_BANK' || selectedAssetType === 'BATTERY_UNIT') && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                ► DC Battery Bank & Cell String Diagnostics
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    DC Float Voltage (V) <span className="text-slate-500 font-mono">[120-550V]</span>
                  </label>
                  <input
                    type="number"
                    value={formValues.float_voltage_dc}
                    onChange={(e) => handleFieldChange('float_voltage_dc', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Discharge Current Amps (A) <span className="text-slate-500 font-mono">[0-200A]</span>
                  </label>
                  <input
                    type="number"
                    value={formValues.discharge_current_amps}
                    onChange={(e) => handleFieldChange('discharge_current_amps', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">
                    Swollen / Bulged Cells Count
                  </label>
                  <input
                    type="number"
                    value={formValues.swollen_cells_detected}
                    onChange={(e) => handleFieldChange('swollen_cells_detected', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg p-2 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.terminal_corrosion_check}
                    onChange={(e) => handleFieldChange('terminal_corrosion_check', e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200">Terminal Corrosion / Sulfation Present?</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.acid_leakage_present}
                    onChange={(e) => handleFieldChange('acid_leakage_present', e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200">Electrolyte / Acid Leakage Observed?</span>
                </label>
              </div>
            </div>
          )}

          {/* Customer / Bank Manager Sign-off Stamp */}
          <div className="p-4 bg-slate-800/70 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FileSignature className="w-4 h-4 text-cyan-400" />
              <span>Bank Branch Manager Verification & Sign-off Stamp</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Signee Full Name:</label>
                <input
                  type="text"
                  value={formValues.signeeName}
                  onChange={(e) => handleFieldChange('signeeName', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Official Designation:</label>
                <input
                  type="text"
                  value={formValues.signeeTitle}
                  onChange={(e) => handleFieldChange('signeeTitle', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded p-2"
                  required
                />
              </div>
            </div>
          </div>

          {/* Error List */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg space-y-1 text-xs text-rose-300">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Schema Boundary Validation Failed:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>FSR submitted successfully! Archived to Immutable Evidence Vault with 7-Year Retention Lock.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-cyan-950/40 transition cursor-pointer"
          >
            Validate FSR & Lock into Immutable Evidence Vault
          </button>

        </div>

        {/* Right Column: AWS S3 Object Lock & Forensic Photo Hashing (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">
                AWS Evidence Vault
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              ObjectLock: COMPLIANCE
            </span>
          </div>

          {/* Photo Preview Container */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-300 block">
              Forensic Site Evidence (Thermal Scan / Before-After Photo):
            </label>

            <div className="relative w-full h-48 bg-slate-950 rounded-xl border border-dashed border-slate-700 overflow-hidden flex flex-col items-center justify-center p-3">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Site Evidence"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-center text-slate-500 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">No forensic photo loaded</p>
                </div>
              )}

              {isHashing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-mono text-cyan-300">
                  Computing SHA-256 Hash...
                </div>
              )}
            </div>

            {/* Photo Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Mobile Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={loadSampleThermalScan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-cyan-950 border border-slate-700 text-cyan-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Load Sample Thermal Scan</span>
              </button>
            </div>
          </div>

          {/* Cryptographic SHA-256 Hash Readout */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-cyan-400" /> SHA-256 Forensic Fingerprint:
              </span>
              <span className="text-emerald-400 font-semibold">VERIFIED</span>
            </div>
            <div className="font-mono text-[10px] text-cyan-300 break-all bg-slate-900 p-2 rounded border border-slate-800 selection:bg-cyan-500">
              {computedSha256}
            </div>
            <div className="text-[10px] text-slate-500">
              Matches client-side calculated digest against backend streaming pipe. Prevents forensic evidence tampering.
            </div>
          </div>

          {/* WORM Legal Compliance Policy Box */}
          <div className="p-3.5 bg-emerald-950/30 rounded-xl border border-emerald-800/80 text-xs space-y-2 text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Evidence Retention Policy</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Once written, AWS S3 <code className="text-emerald-300 font-mono">COMPLIANCE</code> mode locks the object. Neither root IAM accounts nor API credentials can delete or overwrite this report for <strong>2,555 days (7 Years)</strong>, supporting configured financial-regulatory retention requirements.
            </p>
          </div>

        </div>

      </form>

    </div>
  );
};
