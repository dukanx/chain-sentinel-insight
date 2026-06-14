import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
      <FlaskConical className="size-4 shrink-0 text-amber-600" />
      <span>
        <strong className="font-medium">Pitch prototype</strong> — synthetic data, simulated feeds, no
        real regulatory filings or wallet enforcement.
      </span>
    </div>
  );
}
