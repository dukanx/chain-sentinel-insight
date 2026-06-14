export const REVIEW_THRESHOLD = 35;
export const BLOCK_THRESHOLD = 85;

export const INSTITUTION_NAME = "ChainSight Exchange";
export const DEMO_MODE = true;
export const DEMO_LIVE_TICK_MS = 25_000;

// Must stay in sync with EXCHANGE_HOT_WALLET in scripts/solana_risk_runner.py.
export const EXCHANGE_HOT_WALLET = "z9AL5864t9S8MfkszrWaQ6QGEA9J9EhH9QFf5m9EVpTk";
export const EXCHANGE_NAME = "ChainSight Exchange Hot Wallet";

export const KNOWN_LABELS = {
  ofacLazarus: "OFAC: Lazarus Group",
  ofacSdn: "OFAC SDN List",
  tornado: "Tornado Cash mixer",
  sanctionedExchange: "Sanctioned exchange (Garantex)",
} as const;

export interface Analyst {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatarBg: string;
  avatarText: string;
}

export const ANALYSTS: Record<string, Analyst> = {
  mr: {
    id: "mr",
    name: "Maya Rivera",
    initials: "MR",
    role: "Senior Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.06_255)]",
    avatarText: "text-[oklch(0.38_0.14_255)]",
  },
  jk: {
    id: "jk",
    name: "Jordan Kim",
    initials: "JK",
    role: "Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.07_30)]",
    avatarText: "text-[oklch(0.42_0.16_30)]",
  },
  ap: {
    id: "ap",
    name: "Amir Patel",
    initials: "AP",
    role: "Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.07_150)]",
    avatarText: "text-[oklch(0.38_0.14_150)]",
  },
  sc: {
    id: "sc",
    name: "Sofia Chen",
    initials: "SC",
    role: "Compliance Analyst",
    avatarBg: "bg-[oklch(0.92_0.07_300)]",
    avatarText: "text-[oklch(0.40_0.16_300)]",
  },
};

export const CURRENT_ANALYST: Analyst = ANALYSTS.mr;
