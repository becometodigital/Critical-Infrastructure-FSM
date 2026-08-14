import React from 'react';
import {
  Compass,
  Layers,
  FileCheck2,
  KeyRound,
  ClockAlert,
  Boxes,
  Activity,
  Code2,
  Radio,
  CalendarCheck,
  BatteryCharging,
  Building2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PortalType } from '../types/fsm';
import { useAuth } from '../utils/AuthContext';

export type ActiveTab =
  | 'bank_dashboard'
  | 'security_kiosk'
  | 'auditor_suite'
  | 'dispatch'
  | 'remote_monitoring'
  | 'battery_management'
  | 'pm_lifecycle'
  | 'topology'
  | 'fsr'
  | 'gatepass'
  | 'sla'
  | 'inventory'
  | 'outbox'
  | 'architecture';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  criticalAlertCount: number;
  outboxPendingCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  criticalAlertCount,
  outboxPendingCount,
}) => {
  const { session } = useAuth();
  const portal = session?.portalType || 'PIONEER_NOC_DISPATCH';

  // Define full tab catalog
  const allTabs = [
    // Bank Specific
    {
      id: 'bank_dashboard' as ActiveTab,
      label: 'Branch Power Status & Service Requests',
      shortLabel: 'Branch Ops',
      icon: Building2,
      badge: 'Branch Scoped',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      portals: ['BANK_PORTAL'],
    },
    // Security Kiosk Specific
    {
      id: 'security_kiosk' as ActiveTab,
      label: 'Physical Access & Gate Pass Terminal',
      shortLabel: 'Security Kiosk',
      icon: KeyRound,
      badge: 'QR Scanner',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      portals: ['BANK_SECURITY_KIOSK'],
    },
    // Auditor Specific
    {
      id: 'auditor_suite' as ActiveTab,
      label: 'SLA Performance & Audit Trail',
      shortLabel: 'Audit Suite',
      icon: ShieldCheck,
      badge: 'Compliance Trail',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      portals: ['AUDITOR_PORTAL'],
    },

    // Pioneer Operational Modules
    {
      id: 'dispatch' as ActiveTab,
      label: 'Spatial Dispatch Control',
      shortLabel: 'Dispatch',
      icon: Compass,
      badge: null,
      portals: ['PIONEER_NOC_DISPATCH'],
    },
    {
      id: 'remote_monitoring' as ActiveTab,
      label: 'Live Telemetry & Diagnostics',
      shortLabel: 'Telemetry',
      icon: Radio,
      badge: 'Live Data',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'BANK_PORTAL'],
    },
    {
      id: 'battery_management' as ActiveTab,
      label: 'Battery Strings & Cell Operations',
      shortLabel: 'Battery Ops',
      icon: BatteryCharging,
      badge: 'Cell Health',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'TECHNICIAN_MOBILE'],
    },
    {
      id: 'pm_lifecycle' as ActiveTab,
      label: 'Preventive Maintenance & AMC',
      shortLabel: 'PM & AMC',
      icon: CalendarCheck,
      badge: 'Schedules',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'AUDITOR_PORTAL'],
    },
    {
      id: 'topology' as ActiveTab,
      label: 'Asset Topology & Hierarchy',
      shortLabel: 'Assets',
      icon: Layers,
      badge: criticalAlertCount > 0 ? `${criticalAlertCount} Degraded` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      portals: ['PIONEER_NOC_DISPATCH'],
    },
    {
      id: 'fsr' as ActiveTab,
      label: 'Field Service Reports & Sign-offs',
      shortLabel: 'FSR Reports',
      icon: FileCheck2,
      badge: 'Digital Audit',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'TECHNICIAN_MOBILE', 'AUDITOR_PORTAL'],
    },
    {
      id: 'gatepass' as ActiveTab,
      label: 'Gate Pass Authorizations',
      shortLabel: 'Gate Pass',
      icon: KeyRound,
      badge: 'Access Control',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'BANK_PORTAL'],
    },
    {
      id: 'sla' as ActiveTab,
      label: 'SLA Matrix & Timers',
      shortLabel: 'SLA Timers',
      icon: ClockAlert,
      badge: 'SLA Engine',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'AUDITOR_PORTAL'],
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'Van Parts Stock & Requests',
      shortLabel: 'Van Stock',
      icon: Boxes,
      badge: 'Spares',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'TECHNICIAN_MOBILE'],
    },
    {
      id: 'outbox' as ActiveTab,
      label: 'System Events & Audit Logs',
      shortLabel: 'System Events',
      icon: Activity,
      badge: outboxPendingCount > 0 ? `${outboxPendingCount} Pending` : 'Synced',
      badgeColor:
        outboxPendingCount > 0
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      portals: ['PIONEER_NOC_DISPATCH', 'AUDITOR_PORTAL'],
    },
    {
      id: 'architecture' as ActiveTab,
      label: 'System Diagnostics & Schema',
      shortLabel: 'Diagnostics',
      icon: Code2,
      badge: 'Admin Only',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      portals: ['PIONEER_NOC_DISPATCH'],
    },
  ];

  // Filter tabs for the active portal
  const visibleTabs = allTabs.filter(
    (t) =>
      session?.role === 'PIONEER_SUPER_ADMIN' ||
      session?.role === 'SYSTEM_ADMIN' ||
      t.portals.includes(portal)
  );

  return (
    <nav id="primary-navigation" className="bg-slate-900/90 border-b border-slate-800 sticky top-[65px] z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center space-x-1 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-inner font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${
                      tab.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
