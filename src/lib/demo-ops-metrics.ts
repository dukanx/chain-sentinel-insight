import type { Deposit } from "./mock-data";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "halted_auto_freeze" | "pending_review" | "monitoring" | "cleared";

export interface HeroMetrics {
  volumeMonitoredUsd: number;
  activeHolds: number;
  pendingAlerts: number;
  falsePositiveRate: number;
}

export interface OpsAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  summary: string;
  timestamp: string;
  status: AlertStatus;
  caseId?: string;
  wallet?: string;
  amount?: string;
  jurisdiction?: string;
}

const BASE_VOLUME = 847.2;
const BASE_HOLDS = 11;
const BASE_PENDING = 5;
const BASE_FP_RATE = 4.2;

const SYNTHETIC_ALERTS: OpsAlert[] = [
  {
    id: "syn-1",
    severity: "medium",
    title: "Elevated geo-risk login",
    summary: "3 sessions from flagged RU VPN range in 15 minutes.",
    timestamp: new Date(Date.now() - 1000 * 45).toISOString(),
    status: "monitoring",
    jurisdiction: "RU",
  },
  {
    id: "syn-2",
    severity: "low",
    title: "Fiat rail velocity tick",
    summary: "Unusual micro-wire pattern on EUR corridor — monitoring.",
    timestamp: new Date(Date.now() - 1000 * 120).toISOString(),
    status: "monitoring",
    jurisdiction: "DE",
  },
];

export function buildSeedAlerts(deposits: Deposit[]): OpsAlert[] {
  const fromDeposits: OpsAlert[] = deposits
    .map((d) => {
      if (d.directHit) {
        return {
          id: `alert-${d.id}`,
          severity: "critical" as const,
          title: "Direct sanctions match",
          summary: `${d.signals.sanctionLabel ?? "OFAC-listed entity"} — deposit halted at off-ramp.`,
          timestamp: d.receivedAt,
          status: "halted_auto_freeze" as const,
          caseId: d.id,
          wallet: d.sender,
          amount: `${d.amount} ${d.token}`,
        };
      }
      if (d.signals.mixerInPath) {
        return {
          id: `alert-${d.id}`,
          severity: "high" as const,
          title: "Obfuscation: mixer in path",
          summary: `Interaction with ${d.signals.mixerLabel ?? "known mixer"} — deposit pending review.`,
          timestamp: d.receivedAt,
          status: "pending_review" as const,
          caseId: d.id,
          wallet: d.sender,
          amount: `${d.amount} ${d.token}`,
        };
      }
      if (d.behavioralAlert?.type === "velocity_structuring") {
        const b = d.behavioralAlert;
        return {
          id: `alert-${d.id}`,
          severity: "high" as const,
          title: "Velocity: peel chain / structuring",
          summary: `${b.tx_count} micro-transactions in ${b.window_hours}h — avg ${b.avg_amount_sol.toFixed(2)} SOL.`,
          timestamp: d.receivedAt,
          status: "pending_review" as const,
          caseId: d.id,
          wallet: d.sender,
        };
      }
      if (d.verdict === "REVIEW") {
        return {
          id: `alert-${d.id}`,
          severity: "medium" as const,
          title: "Indirect sanctions exposure",
          summary: `${d.signals.hopsToSanctioned} hops from ${d.signals.sanctionLabel ?? "sanctioned source"}.`,
          timestamp: d.receivedAt,
          status: "pending_review" as const,
          caseId: d.id,
          wallet: d.sender,
        };
      }
      if (d.factors.some((f) => f.type === "quarantine")) {
        return {
          id: `alert-${d.id}`,
          severity: "low" as const,
          title: "Dust quarantine cleared",
          summary: "Unsolicited dust isolated — wallet not flagged.",
          timestamp: d.receivedAt,
          status: "cleared" as const,
          caseId: d.id,
          wallet: d.sender,
        };
      }
      return null;
    })
    .filter(Boolean) as OpsAlert[];

  const fiatAlert: OpsAlert = {
    id: "alert-fiat-ir",
    severity: "high",
    title: "Fiat rail spike — IR corridor",
    summary: "14 SWIFT-origin flags in 6 hours from high-risk jurisdiction.",
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    status: "monitoring",
    jurisdiction: "IR",
  };

  return [...fromDeposits, fiatAlert, ...SYNTHETIC_ALERTS].sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2, low: 3 };
    const diff = sev[a.severity] - sev[b.severity];
    if (diff !== 0) return diff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export function computeHeroMetrics(deposits: Deposit[], jitter = 0): HeroMetrics {
  const blocked = deposits.filter((d) => d.verdict === "BLOCKED").length;
  const review = deposits.filter((d) => d.verdict === "REVIEW").length;
  return {
    volumeMonitoredUsd: BASE_VOLUME + jitter * 0.1,
    activeHolds: BASE_HOLDS + blocked,
    pendingAlerts: BASE_PENDING + review,
    falsePositiveRate: BASE_FP_RATE,
  };
}

export const SEVERITY_ORDER: AlertSeverity[] = ["critical", "high", "medium", "low"];

export function nextSyntheticAlert(): OpsAlert {
  const pool = [
    {
      severity: "low" as const,
      title: "Baseline anomaly scan",
      summary: "Routine chain scan completed — 2 wallets queued for monitoring.",
      status: "monitoring" as const,
    },
    {
      severity: "medium" as const,
      title: "Bridge withdrawal pattern",
      summary: "Cross-chain module (roadmap): simulated Wormhole exit flagged for review.",
      status: "monitoring" as const,
    },
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: `syn-live-${Date.now()}`,
    ...pick,
    timestamp: new Date().toISOString(),
  };
}
