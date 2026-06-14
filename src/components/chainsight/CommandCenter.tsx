import { useEffect, useMemo, useRef, useState } from "react";
import type { Deposit } from "@/lib/mock-data";
import {
  buildTriageQueue,
  computeHeroMetrics,
  isWalletSendDeposit,
  walletSendAlert,
  type OpsAlert,
} from "@/lib/demo-ops-metrics";
import { useAuditLog } from "@/lib/audit-log";
import { HeroMetrics } from "./HeroMetrics";
import { AlertFeed } from "./AlertFeed";

interface Props {
  deposits: Deposit[];
  onOpenCase: (caseId: string) => void;
}

export function CommandCenter({ deposits, onOpenCase }: Props) {
  const [liveAlerts, setLiveAlerts] = useState<OpsAlert[]>([]);
  const seenWalletIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const audit = useAuditLog();

  const metrics = useMemo(() => computeHeroMetrics(deposits), [deposits]);
  const alerts = useMemo(() => {
    const merged = [...liveAlerts, ...buildTriageQueue(deposits)];
    // A wallet send can be present in both lists; keep the first (live) copy.
    const seen = new Set<string>();
    return merged
      .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [deposits, liveAlerts]);

  // Surface a wallet-initiated send at the top of the feed the moment it lands.
  useEffect(() => {
    const fresh = deposits.filter(
      (d) => isWalletSendDeposit(d) && !seenWalletIds.current.has(d.id),
    );
    for (const d of fresh) seenWalletIds.current.add(d.id);
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    if (fresh.length > 0) {
      setLiveAlerts((prev) => [...fresh.map(walletSendAlert), ...prev].slice(0, 8));
    }
  }, [deposits]);

  const sarCount = audit.filter((e) => e.action === "SAR_DRAFT_GENERATED").length;

  return (
    <div className="space-y-5">
      <HeroMetrics metrics={metrics} />
      <AlertFeed alerts={alerts} onOpenCase={onOpenCase} />
      <p className="text-xs text-muted-foreground text-center">
        {audit.length} analyst action{audit.length === 1 ? "" : "s"} logged · {sarCount} SAR draft
        {sarCount === 1 ? "" : "s"} this session · all figures derived from screened deposits.
      </p>
    </div>
  );
}
