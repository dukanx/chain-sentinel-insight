import { ShieldAlert, ListChecks, CheckCircle2 } from "lucide-react";
import type { OpsAlert } from "@/lib/demo-ops-metrics";
import { formatRelative } from "@/lib/format";

const SEV_STYLE: Record<OpsAlert["severity"], string> = {
  critical: "bg-verdict-blocked text-verdict-blocked border-verdict-blocked/40",
  high: "bg-verdict-review-soft text-verdict-review border-verdict-review/40",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<OpsAlert["status"], string> = {
  halted_auto_freeze: "Halted — Auto-Freeze",
  pending_review: "Pending review",
  monitoring: "Monitoring",
  cleared: "Cleared",
};

interface Props {
  alerts: OpsAlert[];
  onOpenCase?: (caseId: string) => void;
}

export function AlertFeed({ alerts, onOpenCase }: Props) {
  return (
    <div className="rounded-xl border bg-surface overflow-hidden h-full flex flex-col">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="size-4 text-primary" />
          <h3 className="text-sm font-medium">Triage queue</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {alerts.length} item{alerts.length === 1 ? "" : "s"} · click to open
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground/70">
            <CheckCircle2 className="size-7 text-verdict-cleared/60" />
            <span className="text-sm">Queue clear — no deposits need attention.</span>
          </div>
        )}
        <ul className="divide-y">
          {alerts.map((alert) => {
            const critical = alert.severity === "critical";
            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => alert.caseId && onOpenCase?.(alert.caseId)}
                  className={`w-full text-left px-5 py-3 transition-colors hover:bg-accent/50 ${
                    critical ? "animate-pulse border-l-2 border-l-verdict-blocked bg-verdict-blocked-soft/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {critical && <ShieldAlert className="size-4 shrink-0 text-verdict-blocked" />}
                      <span
                        className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded border ${SEV_STYLE[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-sm font-medium truncate">{alert.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelative(alert.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed pl-0.5">
                    {alert.summary}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        alert.status === "halted_auto_freeze"
                          ? "bg-verdict-blocked text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABEL[alert.status]}
                    </span>
                    {alert.jurisdiction && (
                      <span className="text-[10px] text-muted-foreground">{alert.jurisdiction}</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
