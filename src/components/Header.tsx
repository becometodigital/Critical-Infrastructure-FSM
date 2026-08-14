import React from 'react';
import {
  Shield,
  Database,
  Radio,
  Smartphone,
  AlertTriangle,
  Lock,
  User,
  LogOut,
  UserCheck,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { Tenant, TenantId, UserRole, UserSession } from '../types/fsm';
import { useAuth } from '../utils/AuthContext';
import { BRAND } from '../config/brand';

interface HeaderProps {
  tenants: Tenant[];
  currentTenantId: TenantId;
  onSelectTenant: (tenantId: TenantId) => void;
  pendingOutboxCount: number;
  openMobileSimulator: () => void;
  openNewTicketModal: () => void;
  openAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tenants,
  currentTenantId,
  onSelectTenant,
  pendingOutboxCount,
  openMobileSimulator,
  openNewTicketModal,
  openAuthModal,
}) => {
  const { session, logout } = useAuth();
  const currentTenant = tenants.find((t) => t.tenantId === currentTenantId) || tenants[0];

  // Only explicitly authorized platform roles can switch tenant context
  const canSwitchTenants =
    session?.role.startsWith('PIONEER_') ||
    session?.role === 'SYSTEM_ADMIN' ||
    session?.role === 'DISPATCH_CONTROLLER';

  return (
    <header id="app-header" className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left: Brand & Core Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shadow-inner">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
                {BRAND.name}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RBAC : ACTIVE
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              {BRAND.tagline}
            </p>
          </div>
        </div>

        {/* Right: Authenticated Persona Card, Tenant RLS Context, Outbox Status, Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Active User Persona Badge / 1-Click Persona Switcher */}
          <button
            onClick={openAuthModal}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl px-3 py-1.5 transition shadow-sm cursor-pointer group text-left"
            title="Click to Switch Corporate Persona / Sign In"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              session?.role.startsWith('BANK_') ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
              session?.role.startsWith('FIELD_') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              session?.role.includes('AUDITOR') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
              'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}>
              {session?.fullName ? session.fullName.charAt(0) : 'U'}
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-cyan-400" />
                {session?.portalType.replace(/_/g, ' ') || 'PORTAL'}
              </span>
              <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition flex items-center gap-1">
                {session?.fullName || 'Sign In'}
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-cyan-300" />
              </span>
            </div>
          </button>

          {/* Tenant Selector (Strictly Locked for Bank Users, Multi-Tenant for Super Admin/Dispatch) */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
                <Database className="w-2.5 h-2.5 text-cyan-400" /> 
                {canSwitchTenants ? `RLS Scope (${currentTenant.licenseCode})` : 'Tenant Isolation'}
              </span>
              
              {canSwitchTenants ? (
                <select
                  id="tenant-context-select"
                  aria-label="Active Banking Tenant Context"
                  value={currentTenantId}
                  onChange={(e) => onSelectTenant(e.target.value as TenantId)}
                  className="bg-transparent text-xs font-medium text-cyan-300 focus:outline-none cursor-pointer pr-4"
                >
                  {tenants.map((t) => (
                    <option key={t.tenantId} value={t.tenantId} className="bg-slate-900 text-slate-200">
                      {t.bankName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-medium text-slate-200">
                  {currentTenant.bankName}
                </span>
              )}
            </div>
          </div>

          {/* Outbox Event Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/70 text-xs font-mono">
            <Radio className={`w-3.5 h-3.5 ${pendingOutboxCount > 0 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className="text-slate-400">Outbox:</span>
            <span className={pendingOutboxCount > 0 ? 'text-amber-300 font-semibold' : 'text-emerald-300'}>
              {pendingOutboxCount}
            </span>
          </div>

          {/* Trigger Alert / New Critical Ticket */}
          <button
            id="btn-simulate-ticket"
            onClick={openNewTicketModal}
            className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-medium px-3 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
            title="Simulate Critical UPS or Battery Fault"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Simulate Alarm</span>
          </button>

          {/* Launch Mobile Terminal Simulator */}
          <button
            id="btn-launch-mobile-sim"
            onClick={openMobileSimulator}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition shadow-md shadow-cyan-900/30 active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-100" />
            <span>Field Mobile</span>
          </button>

        </div>
      </div>
    </header>
  );
};
