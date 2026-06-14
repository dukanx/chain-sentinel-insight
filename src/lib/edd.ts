import type { Deposit } from "./mock-data";
import { formatDateTime } from "./format";

export interface RequestedDoc {
  id: string;
  label: string;
}

export type DocReview = "vendor" | "analyst";

export interface ReceivedDoc {
  id: string;
  name: string;
  kind: string;
  sizeKb: number;
  /** Who adjudicates this document: the KYC vendor (authenticity) or the analyst (substance). */
  review: DocReview;
}

export interface EddState {
  requestedAt: string; // ISO — when the RFI was sent
  dueAt: string; // ISO — customer deadline
  receivedAt?: string; // ISO — when documents arrived
}

const DUE_DAYS = 14;

export function newEddRequest(now: Date = new Date()): EddState {
  const due = new Date(now.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000);
  return { requestedAt: now.toISOString(), dueAt: due.toISOString() };
}

/**
 * The RFI checklist — what the customer is asked to provide. Varies by case
 * type so a mixer-tainted case asks for a mixer explanation, etc.
 */
export function requestedDocuments(d: Deposit): RequestedDoc[] {
  const docs: RequestedDoc[] = [
    { id: "sof", label: "Source-of-funds statement" },
    { id: "kyc", label: "Government ID (KYC refresh)" },
  ];

  if (d.signals.mixerInPath) {
    docs.push({
      id: "mixer",
      label: `Written explanation of ${d.signals.mixerLabel ?? "mixer"} exposure`,
    });
  } else {
    docs.push({ id: "counterparty", label: "Counterparty & transaction explanation" });
  }

  const exposed = parseFloat(d.signals.exposedVolume);
  if (Number.isFinite(exposed) && exposed >= 3) {
    docs.push({ id: "bank", label: "Bank / exchange withdrawal records" });
  }

  return docs;
}

// The KYC vendor (Sumsub/Onfido) auto-verifies identity authenticity; everything
// substantive (source of funds, explanations, records) is for the analyst to judge.
const FILE_FOR: Record<string, { name: string; kind: string; review: DocReview }> = {
  sof: { name: "source-of-funds.pdf", kind: "PDF", review: "analyst" },
  kyc: { name: "passport-scan.jpg", kind: "Image", review: "vendor" },
  mixer: { name: "mixer-usage-explanation.pdf", kind: "PDF", review: "analyst" },
  counterparty: { name: "counterparty-explanation.pdf", kind: "PDF", review: "analyst" },
  bank: { name: "exchange-withdrawals.csv", kind: "CSV", review: "analyst" },
};

function deterministicKb(seed: string, min = 90, max = 2600): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min));
}

/** The mock files the customer "uploaded", one per requested item. */
export function receivedDocuments(d: Deposit): ReceivedDoc[] {
  return requestedDocuments(d).map((r) => {
    const f = FILE_FOR[r.id] ?? { name: `${r.id}.pdf`, kind: "PDF", review: "analyst" as DocReview };
    return { id: r.id, name: f.name, kind: f.kind, sizeKb: deterministicKb(d.id + r.id), review: f.review };
  });
}

/** Faux document body for the in-app preview (demo only — no real files exist). */
export function documentPreview(doc: ReceivedDoc, d: Deposit): string {
  const date = formatDateTime(d.receivedAt);
  switch (doc.id) {
    case "kyc":
      return [
        "[ Identity document image — preview redacted for privacy ]",
        "",
        "Vendor: Sumsub · Check ID SBX-" + d.id.toUpperCase(),
        "Document: Passport (machine-readable zone verified)",
        "Liveness / face match: PASS",
        "Authenticity: PASS · not tampered",
        "Expiry: valid",
        "Watchlist / PEP screen: no hits",
      ].join("\n");
    case "sof":
      return [
        "SOURCE OF FUNDS — customer statement",
        "=".repeat(48),
        `Account holder: (KYC on file) · Case ${d.id.toUpperCase()}`,
        "",
        `Declared origin of the ${d.amount} ${d.token} deposit:`,
        "“Funds are proceeds from freelance invoices settled in",
        " crypto over the past 6 months, consolidated before",
        " transferring to your exchange.”",
        "",
        "Supporting: invoice PDFs (2), prior wallet history.",
        "Analyst must assess plausibility against on-chain taint.",
      ].join("\n");
    case "mixer":
      return [
        "EXPLANATION — privacy-tool / mixer exposure",
        "=".repeat(48),
        `Re: ${d.signals.mixerLabel ?? "mixer"} appearing ${d.signals.hopsToSanctioned} hop(s) upstream`,
        "",
        "“I used a privacy service for personal reasons and was",
        " unaware the upstream source was flagged. I did not",
        " transact directly with any sanctioned entity.”",
        "",
        "Analyst note: self-served explanations for mixer use are",
        "weak evidence — weigh against exposed volume & hops.",
      ].join("\n");
    case "counterparty":
      return [
        "COUNTERPARTY & TRANSACTION EXPLANATION",
        "=".repeat(48),
        `Case ${d.id.toUpperCase()} · ${date}`,
        "",
        "“The sending wallet belongs to an OTC desk I bought from.",
        " Attached is our chat and the trade confirmation.”",
        "",
        "Analyst must verify the OTC desk is not itself a pass-",
        "through for the flagged source.",
      ].join("\n");
    case "bank":
      return [
        "date,counterparty,direction,amount,currency",
        "2026-05-02,Kraken,withdrawal,12.40,SOL",
        "2026-05-19,Kraken,withdrawal,8.10,SOL",
        "2026-06-01,self-custody,transfer-in,5.50,SOL",
        "2026-06-12,(this exchange),deposit," + d.amount + "," + d.token,
        "",
        "# Analyst: reconcile these against the on-chain path.",
      ].join("\n");
    default:
      return "[ Document preview not available in demo ]";
  }
}

export function dueLabel(dueAt: string): { text: string; overdue: boolean } {
  const diff = new Date(dueAt).getTime() - Date.now();
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  if (diff <= 0) return { text: "Overdue", overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, overdue: false };
}
