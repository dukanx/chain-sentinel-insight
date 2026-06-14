import { Layers, Inbox, Ban, Lock, type LucideIcon } from "lucide-react";
import type { HeroMetrics as HeroMetricsData } from "@/lib/demo-ops-metrics";
import { CountUp } from "./CountUp";

interface Props {
  metrics: HeroMetricsData;
}

export function HeroMetrics({ metrics }: Props) {
  const stats: {
    label: string;
    sub: string;
    value: number;
    display?: string;
    accent: string;
    iconWrap: string;
    icon: LucideIcon;
  }[] = [
    {
      label: "Deposits today",
      sub: "Screened this session",
      value: metrics.screened,
      accent: "text-foreground",
      iconWrap: "bg-primary/10 text-primary",
      icon: Layers,
    },
    {
      label: "Needs review",
      sub: "Awaiting analyst",
      value: metrics.pendingReview,
      accent: "text-verdict-review",
      iconWrap: "bg-verdict-review-soft text-verdict-review",
      icon: Inbox,
    },
    {
      label: "Blocked",
      sub: "Halted at off-ramp",
      value: metrics.blocked,
      accent: "text-verdict-blocked",
      iconWrap: "bg-verdict-blocked-soft text-verdict-blocked",
      icon: Ban,
    },
    {
      label: "Funds on hold",
      sub: "Review + blocked, not credited",
      value: metrics.fundsOnHoldSol,
      display: `${metrics.fundsOnHoldSol.toFixed(2)} SOL`,
      accent: "text-foreground",
      iconWrap: "bg-col-awaiting/15 text-col-awaiting",
      icon: Lock,
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
                {s.display ?? <CountUp value={s.value} />}
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
