import { useSyncExternalStore } from "react";
import { deposits as seedDeposits, type Deposit, type Verdict } from "./mock-data";
import {
  getRiskDeposits,
  screenTransfer,
  type RiskRunnerResult,
  type RiskRunnerVerdict,
} from "./api/risk.functions";
import { OFFLINE_FALLBACK_DEPOSITS } from "./fallback-deposits";

const RISK_API_BASE_URL =
  (typeof process !== "undefined" && process.env.RISK_API_BASE_URL) || "http://127.0.0.1:8000";

export type DepositLoadSource = "loading" | "live" | "offline" | "error";

let state: Deposit[] = [...seedDeposits];
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let hydratedFromBackend = false;
let pendingLocalAdds: Deposit[] = [];
let loadSource: DepositLoadSource = "loading";
let loadError: string | null = null;
const loadSourceListeners = new Set<() => void>();

// Cross-tab live alerts: the demo wallet usually runs in its own tab/window,
// so its in-memory store is separate from the dashboard's. A BroadcastChannel
// (plus a localStorage fallback for browsers/contexts where it's flaky) lets a
// wallet-initiated send surface on the dashboard tab the moment it lands — no
// navigation needed.
const DEPOSIT_RELAY_KEY = "chainsight:deposit-relay";
const depositChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("chainsight-deposits") : null;

/** Push a freshly screened deposit to other tabs of the same origin. */
function relayDeposit(d: Deposit) {
  depositChannel?.postMessage({ type: "deposit:add", deposit: d });
  try {
    // The value must change for the `storage` event to fire in other tabs.
    localStorage.setItem(DEPOSIT_RELAY_KEY, JSON.stringify({ deposit: d, ts: Date.now() }));
  } catch {
    // localStorage may be unavailable (private mode, quota) — channel still covers it.
  }
}

let announcements: Deposit[] = [];
const announcementListeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function emitAnnouncements() {
  for (const l of announcementListeners) l();
}

function emitLoadSource() {
  for (const l of loadSourceListeners) l();
}

function setLoadSource(source: DepositLoadSource, error: string | null = null) {
  loadSource = source;
  loadError = error;
  emitLoadSource();
}

function applyDeposits(
  deposits: Deposit[],
  source: DepositLoadSource,
  error: string | null = null,
) {
  hydratedFromBackend = source === "live";
  depositStore.replaceAll([...pendingLocalAdds, ...deposits]);
  pendingLocalAdds = [];
  setLoadSource(source, error);
}

async function fetchFromRiskApi(timeoutMs = 120_000): Promise<RiskRunnerResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${RISK_API_BASE_URL}/api/risk/deposits`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Risk API error: ${response.status}`);
    }
    return (await response.json()) as RiskRunnerResult[];
  } finally {
    clearTimeout(timer);
  }
}

export const depositStore = {
  getAll(): Deposit[] {
    return state;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  add(d: Deposit, opts?: { announce?: boolean; broadcast?: boolean }) {
    // De-dupe so a deposit echoed back across tabs isn't added twice.
    if (state.some((existing) => existing.id === d.id)) return;
    if (!hydratedFromBackend) {
      pendingLocalAdds = [d, ...pendingLocalAdds];
    }
    state = [d, ...state];
    if (opts?.announce) {
      announcements = [...announcements, d];
      emitAnnouncements();
    }
    emit();
    // Relay live deposits to other tabs unless this add *is* a relay.
    if (opts?.broadcast !== false) {
      relayDeposit(d);
    }
  },
  replaceAll(deposits: Deposit[]) {
    state = deposits;
    emit();
  },
  getAnnouncements(): Deposit[] {
    return announcements;
  },
  subscribeAnnouncements(fn: () => void) {
    announcementListeners.add(fn);
    return () => announcementListeners.delete(fn);
  },
  dismissAnnouncement(id: string) {
    announcements = announcements.filter((a) => a.id !== id);
    emitAnnouncements();
  },
  getLoadSource(): DepositLoadSource {
    return loadSource;
  },
  getLoadError(): string | null {
    return loadError;
  },
  subscribeLoadSource(fn: () => void) {
    loadSourceListeners.add(fn);
    return () => loadSourceListeners.delete(fn);
  },
};

// Receive live deposits relayed from another tab (e.g. the demo wallet) so they
// surface in the dashboard feed and pop the alert. `broadcast: false` prevents an
// echo loop; the store's id de-dupe absorbs the channel/localStorage overlap.
function receiveRelayedDeposit(d: Deposit) {
  depositStore.add(d, { announce: true, broadcast: false });
}

if (depositChannel) {
  depositChannel.onmessage = (event: MessageEvent) => {
    const msg = event.data as { type?: string; deposit?: Deposit } | null;
    if (msg?.type === "deposit:add" && msg.deposit) {
      receiveRelayedDeposit(msg.deposit);
    }
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== DEPOSIT_RELAY_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue) as { deposit?: Deposit };
      if (parsed.deposit) receiveRelayedDeposit(parsed.deposit);
    } catch {
      // Ignore malformed relay payloads.
    }
  });
}

export function useDeposits(): Deposit[] {
  return useSyncExternalStore(depositStore.subscribe, depositStore.getAll, depositStore.getAll);
}

export function useDepositLoadSource(): { source: DepositLoadSource; error: string | null } {
  const source = useSyncExternalStore(
    depositStore.subscribeLoadSource,
    depositStore.getLoadSource,
    depositStore.getLoadSource,
  );
  const error = useSyncExternalStore(
    depositStore.subscribeLoadSource,
    depositStore.getLoadError,
    depositStore.getLoadError,
  );
  return { source, error };
}

export function useDepositAnnouncements(): Deposit[] {
  return useSyncExternalStore(
    depositStore.subscribeAnnouncements,
    depositStore.getAnnouncements,
    depositStore.getAnnouncements,
  );
}

export function loadRiskDeposits(force = false): Promise<void> {
  if (force) {
    loadPromise = null;
  }
  if (!loadPromise) {
    setLoadSource("loading");
    loadPromise = (async () => {
      let results: RiskRunnerResult[] | null = null;
      let lastError = "Unknown error";

      try {
        results = await getRiskDeposits();
      } catch (serverFnError) {
        lastError = serverFnError instanceof Error ? serverFnError.message : String(serverFnError);
        try {
          results = await fetchFromRiskApi();
        } catch (directError) {
          lastError = directError instanceof Error ? directError.message : String(directError);
        }
      }

      if (results && results.length > 0) {
        applyDeposits(results.map(mapRiskResultToDeposit), "live");
        return;
      }

      console.warn("Risk backend unavailable; using offline demo deposits.", lastError);
      applyDeposits(OFFLINE_FALLBACK_DEPOSITS, "offline", lastError);
    })().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to load deposits", error);
      applyDeposits(OFFLINE_FALLBACK_DEPOSITS, "error", message);
    });
  }
  return loadPromise;
}

function mapVerdict(verdict: RiskRunnerVerdict): Verdict {
  if (verdict === "MATCH") return "BLOCKED";
  if (verdict === "REVIEW") return "REVIEW";
  return "CLEARED";
}

function columnFor(result: RiskRunnerResult): Deposit["initialColumn"] {
  if (result.verdict !== "REVIEW") return undefined;
  return result.identity_link ? "awaiting" : "pending";
}

function graphFor(result: RiskRunnerResult): Deposit["graph"] {
  const displayAddress = (address?: string) => {
    if (!address) return "";
    if (address.length <= 18) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const displayLabel = (label: string, address?: string) => {
    const raw = label.trim();
    if (!raw || raw === "Unknown wallet" || raw === "synthetic_wallet") {
      return displayAddress(address) || "Wallet";
    }
    return raw;
  };

  return {
    nodes: result.transaction_graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: displayLabel(node.data.label, node.data.address),
        address: node.data.address ?? "",
      },
    })),
    edges: result.transaction_graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      className: edge.className,
      type: edge.type ?? "smoothstep",
    })),
  };
}

function mapRiskResultToDeposit(result: RiskRunnerResult, index: number): Deposit {
  const uiVerdict = mapVerdict(result.verdict);
  const hopsToSanctioned = result.signal_breakdown.hops_to_sanctioned;

  return {
    id: `risk-${String(index + 1).padStart(3, "0")}`,
    sender: result.checked_wallet,
    amount: result.quarantine
      ? String(result.quarantine.quarantined_amount_sol)
      : result.deposit_amount.toFixed(result.deposit_amount < 1 ? 4 : 2),
    token: "SOL",
    receivedAt: new Date(Date.now() - index * 1000 * 60 * 11).toISOString(),
    riskScore: result.risk_score,
    verdict: uiVerdict,
    directHit: result.verdict === "MATCH",
    factors: result.risk_factors,
    auditNote: result.audit_note,
    signals: {
      hopsToSanctioned,
      mixerInPath: result.signal_breakdown.mixer_in_path,
      mixerLabel: result.signal_breakdown.mixer_label ?? undefined,
      exposedVolume: `${result.signal_breakdown.exposed_volume_sol.toFixed(4)} SOL`,
      hopsTraced: result.signal_breakdown.hops_traced,
      sanctionLabel: result.signal_breakdown.sanction_label ?? undefined,
      txVelocity: result.behavioral_alert
        ? `${result.behavioral_alert.tx_count} tx / ${result.behavioral_alert.window_hours}h`
        : undefined,
    },
    behavioralAlert: result.behavioral_alert,
    graph: graphFor(result),
    initialColumn: columnFor(result),
    assigneeId: uiVerdict === "REVIEW" ? "mr" : undefined,
  };
}

export async function createWalletDepositFromBackend(opts: {
  sender: string;
  amount: string;
  token: string;
  recipient: string;
}): Promise<Deposit> {
  const parsedAmount = Number.parseFloat(opts.amount);
  const result = await screenTransfer({
    data: {
      sender_wallet: opts.sender,
      recipient_wallet: opts.recipient,
      amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0.1,
      token: opts.token.toUpperCase(),
    },
  });
  const mapped = mapRiskResultToDeposit(result, state.length + 1);
  const id = `dep-w-${Math.random().toString(36).slice(2, 7)}`;

  const graph = mapped.graph
    ? {
        ...mapped.graph,
        nodes: mapped.graph.nodes.map((node) => {
          if (node.id !== "sender") return node;
          const data = (node.data ?? {}) as Record<string, unknown>;
          return {
            ...node,
            data: {
              ...data,
              address: opts.sender,
            },
          };
        }),
      }
    : mapped.graph;

  return {
    ...mapped,
    id,
    sender: opts.sender,
    amount: opts.amount,
    token: opts.token.toUpperCase(),
    receivedAt: new Date().toISOString(),
    riskScore: 75,
    verdict: "REVIEW",
    initialColumn: "pending",
    assigneeId: "mr",
    factors: [
      {
        type: "policy",
        text: `Outbound send to ${opts.recipient} submitted for screening before the off-ramp.`,
      },
      ...mapped.factors,
    ],
    auditNote: `Wallet-initiated send of ${opts.amount} ${opts.token.toUpperCase()} to ${opts.recipient}. ${mapped.auditNote}`,
    signals: {
      ...mapped.signals,
      exposedVolume: `${mapped.signals.exposedVolume} · request ${opts.amount} ${opts.token.toUpperCase()}`,
    },
    graph,
  };
}
