import type { Deposit } from "./mock-data";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "halted_auto_freeze" | "pending_review" | "monitoring" | "cleared";

export interface HeroMetrics {
  screened: number;
  pendingReview: number;
  blocked: number;
  fundsOnHoldSol: number;
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

/** Deposits created by a send from the demo wallet carry a `dep-w-` id prefix. */
export function isWalletSendDeposit(d: Deposit): boolean {
  return d.id.startsWith("dep-w-");
}

/** Live alert for an outbound send screened from the demo wallet. */
export function walletSendAlert(d: Deposit): OpsAlert {
  return {
    id: `alert-${d.id}`,
    severity: "high",
    title: "Wallet send screened",
    summary: `Outbound ${d.amount} ${d.token} held at off-ramp — pending analyst review.`,
    timestamp: d.receivedAt,
    status: "pending_review",
    caseId: d.id,
    wallet: d.sender,
    amount: `${d.amount} ${d.token}`,
  };
}

/**
 * The triage queue — one alert per screened deposit that warrants attention,
 * derived entirely from real screening output (no synthetic/fiat noise).
 */
export function buildTriageQueue(deposits: Deposit[]): OpsAlert[] {
  const fromDeposits: OpsAlert[] = deposits
    .map((d) => {
      if (isWalletSendDeposit(d)) return walletSendAlert(d);
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

  return fromDeposits.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function parseAmount(amount: string): number {
  const n = parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

export function computeHeroMetrics(deposits: Deposit[]): HeroMetrics {
  const review = deposits.filter((d) => d.verdict === "REVIEW");
  const blocked = deposits.filter((d) => d.verdict === "BLOCKED");
  // Funds not credited to the customer: everything still under review or rejected.
  const onHold = [...review, ...blocked].reduce((sum, d) => sum + parseAmount(d.amount), 0);
  return {
    screened: deposits.length,
    pendingReview: review.length,
    blocked: blocked.length,
    fundsOnHoldSol: Math.round(onHold * 100) / 100,
  };
}
