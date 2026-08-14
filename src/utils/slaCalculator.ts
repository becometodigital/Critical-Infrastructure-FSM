import { PauseInterval, TicketPriority, Ticket, CriticalityLevel } from '../types/fsm';

export interface SLARule {
  priority: TicketPriority;
  responseTargetMins: number;   // MTTA Target (Mean Time To Acknowledge)
  resolutionTargetMins: number; // MTTR Target (Mean Time To Resolve)
  penaltyPerBreachHourUsd: number;
}

export const BANK_SLA_CONFIG: Record<TicketPriority, SLARule> = {
  CRITICAL: {
    priority: 'CRITICAL',
    responseTargetMins: 15,
    resolutionTargetMins: 120,
    penaltyPerBreachHourUsd: 500,
  },
  HIGH: {
    priority: 'HIGH',
    responseTargetMins: 30,
    resolutionTargetMins: 240,
    penaltyPerBreachHourUsd: 250,
  },
  MEDIUM: {
    priority: 'MEDIUM',
    responseTargetMins: 45,
    resolutionTargetMins: 360,
    penaltyPerBreachHourUsd: 150,
  },
  NORMAL: {
    priority: 'NORMAL',
    responseTargetMins: 60,
    resolutionTargetMins: 480,
    penaltyPerBreachHourUsd: 100,
  },
  LOW: {
    priority: 'LOW',
    responseTargetMins: 120,
    resolutionTargetMins: 1440,
    penaltyPerBreachHourUsd: 50,
  },
};

export function getSlaTargets(priority: TicketPriority): SLARule {
  return BANK_SLA_CONFIG[priority] || BANK_SLA_CONFIG.NORMAL;
}

export function formatMinutesToHhMm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function calculatePenaltyUsd(overdueMinutes: number, priority: TicketPriority): number {
  if (overdueMinutes <= 0) return 0;
  const rule = BANK_SLA_CONFIG[priority] || BANK_SLA_CONFIG.NORMAL;
  const hours = Math.ceil(overdueMinutes / 60);
  return hours * rule.penaltyPerBreachHourUsd;
}

/**
 * Calculates net elapsed active working minutes, deducting paused periods
 */
export function calculateNetElapsedMinutes(
  createdAtStr: string,
  resolvedAtStr?: string,
  pauseIntervals: PauseInterval[] = [],
  referenceTime?: Date
): {
  grossMinutes: number;
  pausedMinutes: number;
  netMinutes: number;
} {
  const start = new Date(createdAtStr).getTime();
  const end = resolvedAtStr
    ? new Date(resolvedAtStr).getTime()
    : (referenceTime ? referenceTime.getTime() : Date.now());

  const grossMs = Math.max(0, end - start);
  const grossMinutes = Math.floor(grossMs / (1000 * 60));

  let pausedMs = 0;
  for (const p of pauseIntervals) {
    const pStart = new Date(p.pausedAt).getTime();
    const pEnd = p.resumedAt ? new Date(p.resumedAt).getTime() : end;
    if (pEnd > pStart) {
      pausedMs += (pEnd - pStart);
    }
  }

  const pausedMinutes = Math.floor(pausedMs / (1000 * 60));
  const netMinutes = Math.max(0, grossMinutes - pausedMinutes);

  return {
    grossMinutes,
    pausedMinutes,
    netMinutes,
  };
}

export interface TicketSlaEvaluation {
  targetResolutionMinutes: number;
  netElapsedMinutes: number;
  totalPausedMinutes: number;
  remainingMinutes: number;
  percentUsed: number;
  isBreached: boolean;
  overdueMinutes: number;
  tier: 'L0_NORMAL' | 'L1_WARNING_50' | 'L2_ESCALATION_75' | 'L3_BREACH_100';
}

/**
 * Evaluates ticket SLA progression against criticality and pause intervals
 */
export function evaluateTicketSla(
  ticket: Ticket,
  criticalityLevel: CriticalityLevel = 'P2',
  referenceTime?: Date
): TicketSlaEvaluation {
  const rule = getSlaTargets(ticket.priority);
  
  // Apply multiplier for critical branch rating (P1 gets faster MTTR)
  let targetMins = rule.resolutionTargetMins;
  if (criticalityLevel === 'P1') {
    targetMins = Math.floor(targetMins * 0.75); // 25% tighter SLA for P1
  }

  const { pausedMinutes, netMinutes } = calculateNetElapsedMinutes(
    ticket.createdAt,
    ticket.completedAt,
    ticket.pauseIntervals || [],
    referenceTime
  );

  const percentUsed = Math.min(200, (netMinutes / targetMins) * 100);
  const isBreached = netMinutes > targetMins;
  const overdueMinutes = isBreached ? netMinutes - targetMins : 0;
  const remainingMinutes = Math.max(0, targetMins - netMinutes);

  let tier: 'L0_NORMAL' | 'L1_WARNING_50' | 'L2_ESCALATION_75' | 'L3_BREACH_100' = 'L0_NORMAL';
  if (isBreached) {
    tier = 'L3_BREACH_100';
  } else if (percentUsed >= 75) {
    tier = 'L2_ESCALATION_75';
  } else if (percentUsed >= 50) {
    tier = 'L1_WARNING_50';
  }

  return {
    targetResolutionMinutes: targetMins,
    netElapsedMinutes: netMinutes,
    totalPausedMinutes: pausedMinutes,
    remainingMinutes,
    percentUsed,
    isBreached,
    overdueMinutes,
    tier,
  };
}
