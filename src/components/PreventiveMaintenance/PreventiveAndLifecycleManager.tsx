import React, { useState } from 'react';
import {
  CalendarCheck,
  ShieldCheck,
  Zap,
  ClockAlert,
  FileCheck2,
  AlertTriangle,
  Plus,
  Play,
  RotateCw,
  Search,
  CheckCircle2,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  PreventiveMaintenancePlan,
  InstallationCommissioningJob,
  Asset,
  TenantId,
  Ticket,
  ContractType,
  ContractSlaTier,
} from '../../types/fsm';

interface PreventiveAndLifecycleManagerProps {
  currentTenantId: TenantId;
  assets: Asset[];
  pmPlans: PreventiveMaintenancePlan[];
  commissioningJobs: InstallationCommissioningJob[];
  tickets: Ticket[];
  onGeneratePMTicket: (plan: PreventiveMaintenancePlan) => void;
  onAdvanceCommissioningStage: (jobId: string) => void;
}

export const PreventiveAndLifecycleManager: React.FC<PreventiveAndLifecycleManagerProps> = ({
  currentTenantId,
  assets,
  pmPlans,
  commissioningJobs,
  tickets,
  onGeneratePMTicket,
  onAdvanceCommissioningStage,
}) => {
  const [activeTab, setActiveTab] = useState<'pm_schedule' | 'commissioning' | 'contracts'>('pm_schedule');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tenantAssets = assets.filter((a) => a.tenantId === currentTenantId);
  const tenantPmPlans = pmPlans.filter((p) => p.tenantId === currentTenantId);
  const tenantCommissioning = commissioningJobs.filter((c) => c.tenantId === currentTenantId);

  const stagesList = [
    'SITE_SURVEY',
    'INFRA_PREPARATION',
    'RIGGING_INSTALL',
    'ELECTRICAL_CABLING',
    'COMMISSIONING',
    'LOAD_BANK_100',
    'SIGN_OFF',
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4" />
            Asset Lifecycle & Preventive Maintenance Engine
          </div>
          <h2 className="text-xl font-semibold text-white">
            Pioneer Preventive Maintenance (PM), Load Bank Testing & AMC Contracts
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Automates quarterly & annual preventive maintenance cycles, full-load bank test execution, site installation workflows, and multi-tier AMC SLA tracking.
          </p>
        </div>

        {/* Navigation Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          {[
            { id: 'pm_schedule', label: 'PM Schedules', icon: CalendarCheck },
            { id: 'commissioning', label: 'Commissioning & Load Bank', icon: Zap },
            { id: 'contracts', label: 'AMC & SLA Contracts', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Preventive Maintenance View */}
      {activeTab === 'pm_schedule' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-mono block">Scheduled PM Plans</span>
              <span className="text-2xl font-bold text-white font-mono mt-1 block">
                {tenantPmPlans.length} Assets
              </span>
              <span className="text-[11px] text-emerald-400 font-mono mt-1 block">
                ✓ 100% Calendar Adherence
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-mono block">Overdue PM Visits</span>
              <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
                {tenantPmPlans.filter((p) => p.isOverdue).length} Due
              </span>
              <span className="text-[11px] text-amber-300 font-mono mt-1 block">
                Requires Dispatch Action
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-mono block">Inspection Scope Coverage</span>
              <span className="text-2xl font-bold text-cyan-400 font-mono mt-1 block">
                5 Critical Steps
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                Thermal, Impedance, Torque, Busbars & Firmware
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-cyan-400" />
                Active Preventive Maintenance Routines
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Quarterly & Monthly Recurring Schedules
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenantPmPlans.map((plan) => (
                <div
                  key={plan.planId}
                  className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{plan.assetName}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      plan.isOverdue ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {plan.isOverdue ? 'OVERDUE' : `DUE: ${plan.nextDueDate}`}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Frequency:</span>
                      <span className="text-cyan-300">{plan.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Service Date:</span>
                      <span className="text-slate-300">{plan.lastServiceDate}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <span className="text-cyan-400 font-bold block text-[10px] font-mono uppercase">
                      Mandatory Scope of Work:
                    </span>
                    {plan.scopeOfWork.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onGeneratePMTicket(plan)}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate Preventive Maintenance Ticket</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Installation & Commissioning View */}
      {activeTab === 'commissioning' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Site Installation, Rigging & 100% Load Bank Testing Stages
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  End-to-end commissioning tracker for industrial Elektra systems prior to commercial handover.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {tenantCommissioning.map((job) => {
                const currentStageIdx = stagesList.indexOf(job.stage);
                const progressPct = Math.round(((currentStageIdx + 1) / stagesList.length) * 100);

                return (
                  <div key={job.jobId} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400">{job.jobId}</span>
                          <span className="text-xs font-semibold text-white">{job.assetModel}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Capacity: {job.capacityKva} kVA • Target Go-Live: {job.targetLiveDate}
                        </span>
                      </div>

                      <button
                        onClick={() => onAdvanceCommissioningStage(job.jobId)}
                        disabled={job.stage === 'SIGN_OFF'}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold font-mono transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Advance Stage</span>
                      </button>
                    </div>

                    {/* Stage Stepper */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {stagesList.map((stageName, idx) => {
                        const isDone = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        return (
                          <div
                            key={stageName}
                            className={`p-2 rounded-lg border text-center transition ${
                              isCurrent
                                ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                                : isDone
                                ? 'bg-slate-900 border-emerald-800 text-emerald-400'
                                : 'bg-slate-900/40 border-slate-800 text-slate-600'
                            }`}
                          >
                            <span className="text-[9px] font-mono block text-slate-400">Step 0{idx + 1}</span>
                            <span className="text-[10px] font-mono uppercase tracking-tight block mt-0.5 truncate">
                              {stageName.replace(/_/g, ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. AMC & Warranty Contracts View */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Contractual AMC & Warranty SLA Tiers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated coverage verification: 4-Hour Onsite, Next Day, and Next Business Day.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tenantAssets.map((asset) => (
                <div
                  key={asset.assetId}
                  className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-300">{asset.modelNumber}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      {asset.contractSla.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contract:</span>
                      <span className="text-amber-300">{asset.contractType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Warranty Expiry:</span>
                      <span>{asset.warrantyExpiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">AMC Expiry:</span>
                      <span className="text-emerald-400">{asset.amcExpiry}</span>
                    </div>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Parts Included in Contract:</span>
                    <span className="text-emerald-400 font-bold">YES (COMPREHENSIVE)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
