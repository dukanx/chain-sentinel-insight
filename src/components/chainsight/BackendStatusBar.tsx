import { AlertCircle, Loader2, RefreshCw, Server } from "lucide-react";
import { loadRiskDeposits, useDepositLoadSource } from "@/lib/deposit-store";

export function BackendStatusBar() {
  const { source, error } = useDepositLoadSource();

  if (source === "live") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-verdict-cleared/30 bg-verdict-cleared-soft/40 px-4 py-2 text-sm">
        <Server className="size-4 text-verdict-cleared" />
        <span>
          <strong className="font-medium">Live risk API</strong> — deposits loaded from Python backend
          (port 8000).
        </span>
      </div>
    );
  }

  if (source === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-surface px-4 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>
          Loading deposits from risk API… first boot can take up to a minute while the graph builds.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <strong className="font-medium text-amber-950 dark:text-amber-100">
            Offline demo data
          </strong>
          <p className="text-xs text-amber-900/80 dark:text-amber-100/80 mt-0.5">
            Risk API not reachable{error ? ` (${error})` : ""}. Showing bundled seed cases. For live
            graphs, run <code className="font-mono">npm run api</code> in a second terminal, then
            retry.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void loadRiskDeposits(true)}
        className="inline-flex items-center gap-1.5 rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <RefreshCw className="size-3.5" />
        Retry API
      </button>
    </div>
  );
}
