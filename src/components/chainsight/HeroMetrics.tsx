import { TrendingUp, Lock, Bell, Target } from "lucide-react";
import type { HeroMetrics as HeroMetricsData } from "@/lib/demo-ops-metrics";
import { CountUp } from "./CountUp";

interface Props {
  metrics: HeroMetricsData;
}

export function HeroMetrics({ metrics }: Props) {
  const stats = [
    {
      label: "Volume monitored",
      sub: "Last 24h (simulated)",
      value: metrics.volumeMonitoredUsd,
      accent: "text-foreground",
      iconWrap: "bg-primary/10 text-primary",
      icon: TrendingUp,
      kind: "volume" as const,
    },
    {
      label: "Active holds / freezes",
      sub: "Custodial demo count",
      value: metrics.activeHolds,
      accent: "text-verdict-blocked",
      iconWrap: "bg-verdict-blocked-soft text-verdict-blocked",
      icon: Lock,
      kind: "count" as const,
    },
    {
      label: "Pending alerts",
      sub: "Queue + review cases",
      value: metrics.pendingAlerts,
      accent: "text-verdict-review",
      iconWrap: "bg-verdict-review-soft text-verdict-review",
      icon: Bell,
      kind: "count" as const,
    },
    {
      label: "False positive rate",
      sub: "Dust quarantine excluded",
      value: metrics.falsePositiveRate,
      accent: "text-verdict-cleared",
      iconWrap: "bg-verdict-cleared-soft text-verdict-cleared",
      icon: Target,
      kind: "rate" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="animate-float-in rounded-xl border bg-surface px-5 py-4 flex items-center justify-between shadow-sm hover:shadow-md hover:border-foreground/15 transition-all"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className={`mt-1 text-3xl font-mono font-semibold tabular-nums ${s.accent}`}>
                {s.kind === "volume" ? (
                  `$${metrics.volumeMonitoredUsd.toFixed(1)}M`
                ) : s.kind === "rate" ? (
                  `${metrics.falsePositiveRate.toFixed(1)}%`
                ) : (
                  <CountUp value={s.value} />
                )}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">{s.sub}</div>
            </div>
            <span className={`grid place-items-center size-10 rounded-xl ${s.iconWrap}`}>
              <Icon className="size-5" />
            </span>
          </div>
        );
      })}
    </div>
  );
}
