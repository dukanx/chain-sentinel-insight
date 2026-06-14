import { useEffect, useMemo, useRef, useState } from "react";
import type { Deposit } from "@/lib/mock-data";
import {
  buildSeedAlerts,
  computeHeroMetrics,
  isWalletSendDeposit,
  nextSyntheticAlert,
  walletSendAlert,
  type OpsAlert,
} from "@/lib/demo-ops-metrics";
import { DEMO_LIVE_TICK_MS } from "@/lib/config";
import { HeroMetrics } from "./HeroMetrics";
import { AlertFeed } from "./AlertFeed";

interface Props {
  deposits: Deposit[];
  onOpenCase: (caseId: string) => void;
}

export function CommandCenter({ deposits, onOpenCase }: Props) {
  const [jitter, setJitter] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState<OpsAlert[]>([]);
  const seenWalletIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const metrics = useMemo(() => computeHeroMetrics(deposits, jitter), [deposits, jitter]);
  const alerts = useMemo(() => {
    const merged = [...liveAlerts, ...buildSeedAlerts(deposits)];
    // A wallet send can be present in both lists; keep the first (live) copy.
    const seen = new Set<string>();
    return merged
      .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      // Chronological — newest first — regardless of severity.
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [deposits, liveAlerts]);

  // Surface a wallet-initiated send at the top of the feed the moment it lands.
  useEffect(() => {
    const fresh = deposits.filter(
      (d) => isWalletSendDeposit(d) && !seenWalletIds.current.has(d.id),
    );
    for (const d of fresh) seenWalletIds.current.add(d.id);
    // On first render, just record existing sends — they already show via
    // buildSeedAlerts; only genuinely new arrivals get pinned to the top.
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    if (fresh.length > 0) {
      setLiveAlerts((prev) => [...fresh.map(walletSendAlert), ...prev].slice(0, 8));
    }
  }, [deposits]);

  useEffect(() => {
    const metricsTimer = setInterval(() => {
      setJitter((j) => (j + 1) % 5);
    }, 10_000);

    const alertTimer = setInterval(() => {
      setLiveAlerts((prev) => [nextSyntheticAlert(), ...prev].slice(0, 5));
    }, DEMO_LIVE_TICK_MS);

    return () => {
      clearInterval(metricsTimer);
      clearInterval(alertTimer);
    };
  }, []);

  return (
    <div className="space-y-5">
      <HeroMetrics metrics={metrics} />
      <AlertFeed alerts={alerts} onOpenCase={onOpenCase} />
      <p className="text-xs text-muted-foreground text-center">
        Single-chain Solana demo — production monitors multi-chain jump services (roadmap).
      </p>
    </div>
  );
}
