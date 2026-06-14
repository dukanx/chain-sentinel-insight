import { useState } from "react";
import { createPortal } from "react-dom";
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Eye,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import {
  requestedDocuments,
  receivedDocuments,
  documentPreview,
  dueLabel,
  type EddState,
  type ReceivedDoc,
} from "@/lib/edd";
import { formatDateTime } from "@/lib/format";

interface Props {
  deposit: Deposit;
  column?: KanbanColumn;
  edd?: EddState;
}

const KIND_ICON: Record<string, LucideIcon> = {
  PDF: FileText,
  Image: FileImage,
  CSV: FileSpreadsheet,
};

function ReviewBadge({ review }: { review: ReceivedDoc["review"] }) {
  if (review === "vendor") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verdict-cleared-soft/70 text-verdict-cleared px-1.5 py-0.5 text-[10px] font-medium">
        <ShieldCheck className="size-3" />
        Verified · Sumsub
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-col-awaiting/15 text-col-awaiting px-1.5 py-0.5 text-[10px] font-medium">
      <Eye className="size-3" />
      Needs your review
    </span>
  );
}

export function DocumentsPanel({ deposit, column, edd }: Props) {
  const received = column === "ready";
  const requested = requestedDocuments(deposit);
  const files = received ? receivedDocuments(deposit) : [];
  const due = edd ? dueLabel(edd.dueAt) : null;
  const [preview, setPreview] = useState<ReceivedDoc | null>(null);

  return (
    <div className="rounded-lg border bg-surface p-5 animate-float-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-col-awaiting" />
          <h2 className="text-sm font-medium">Enhanced due diligence</h2>
        </div>
        {received ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verdict-cleared-soft/70 text-verdict-cleared px-2.5 py-0.5 text-xs font-medium">
            <CheckCircle2 className="size-3.5" />
            Documents received
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-col-awaiting/15 text-col-awaiting px-2.5 py-0.5 text-xs font-medium">
            <Clock className="size-3.5" />
            Awaiting customer
            {due && <span className={due.overdue ? "text-verdict-blocked" : ""}>· {due.text}</span>}
          </span>
        )}
      </div>

      {/* RFI checklist */}
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
        Requested (RFI)
      </div>
      <ul className="space-y-1.5">
        {requested.map((doc) => (
          <li key={doc.id} className="flex items-center gap-2 text-sm">
            {received ? (
              <CheckCircle2 className="size-4 shrink-0 text-verdict-cleared" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground/40" />
            )}
            <span className={received ? "" : "text-foreground/85"}>{doc.label}</span>
          </li>
        ))}
      </ul>

      {received ? (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Uploaded {edd?.receivedAt ? `· ${formatDateTime(edd.receivedAt)}` : ""}
            </div>
            <span className="text-[10px] text-muted-foreground">via Verification Center (Sumsub)</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {files.map((f) => {
              const Icon = KIND_ICON[f.kind] ?? File;
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setPreview(f)}
                  className="flex items-start gap-2.5 rounded-md border bg-surface-2/50 px-3 py-2 text-left transition-colors hover:bg-accent hover:border-foreground/20"
                >
                  <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {f.kind} · {f.sizeKb} KB
                    </div>
                    <div className="mt-1">
                      <ReviewBadge review={f.review} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Identity is auto-verified by the KYC vendor; source-of-funds &amp; explanations are for
            your judgment. Click a document to preview.
          </p>
        </div>
      ) : (
        <div className="mt-3 text-xs text-muted-foreground">
          RFI emailed to the customer with a secure upload link — deposit funds held until
          source-of-funds evidence is reviewed.
        </div>
      )}

      {preview &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setPreview(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] rounded-xl border bg-surface shadow-2xl flex flex-col animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3 border-b flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{preview.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {preview.kind} · {preview.sizeKb} KB
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <ReviewBadge review={preview.review} />
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="rounded-md border p-1.5 hover:bg-accent"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {documentPreview(preview, deposit)}
              </pre>
              <div className="px-5 py-2.5 border-t text-[10px] text-muted-foreground">
                Demo preview — synthetic content, not a real customer document.
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
