import { useSyncExternalStore } from "react";
import { ANALYSTS, CURRENT_ANALYST } from "./config";

export type AuditAction =
  | "CASE_OPENED"
  | "CASE_CLOSED"
  | "DEPOSIT_BLOCKED"
  | "DEPOSIT_ACCEPTED"
  | "EDD_REQUESTED"
  | "DOCUMENTS_RECEIVED"
  | "AUDIT_NOTE_EDITED"
  | "SAR_DRAFT_GENERATED"
  | "SAR_DRAFT_EXPORTED";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  analystId: string;
  analystName: string;
  action: AuditAction;
  caseId?: string;
  wallet?: string;
  summary: string;
  metadata?: Record<string, string>;
}

const STORAGE_KEY = "chainsight-audit-log-v1";

function seedEntries(): AuditLogEntry[] {
  const now = Date.now();
  return [
    {
      id: "seed-1",
      timestamp: new Date(now - 1000 * 60 * 47).toISOString(),
      analystId: "jk",
      analystName: ANALYSTS.jk.name,
      action: "DEPOSIT_BLOCKED",
      caseId: "risk-001",
      wallet: "Swf8EfykLf9gTfioYikpCbLzzxJx959GRdL2ahe3c89C",
      summary: "Jordan Kim blocked deposit risk-001 — direct OFAC Lazarus cashout match.",
    },
    {
      id: "seed-2",
      timestamp: new Date(now - 1000 * 60 * 31).toISOString(),
      analystId: "ap",
      analystName: ANALYSTS.ap.name,
      action: "EDD_REQUESTED",
      caseId: "risk-007",
      summary: "Amir Patel requested EDD for identity-linked case risk-007.",
    },
    {
      id: "seed-3",
      timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
      analystId: "sc",
      analystName: ANALYSTS.sc.name,
      action: "DEPOSIT_ACCEPTED",
      caseId: "risk-008",
      summary: "Sofia Chen accepted quarantined dust case risk-008 — exposure isolated.",
    },
    {
      id: "seed-4",
      timestamp: new Date(now - 1000 * 60 * 9).toISOString(),
      analystId: "mr",
      analystName: ANALYSTS.mr.name,
      action: "SAR_DRAFT_GENERATED",
      caseId: "risk-001",
      summary: "Maya Rivera generated SAR draft for blocked case risk-001.",
    },
  ];
}

function load(): AuditLogEntry[] {
  if (typeof sessionStorage === "undefined") return seedEntries();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuditLogEntry[];
  } catch {
    /* ignore */
  }
  return seedEntries();
}

let entries: AuditLogEntry[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 100)));
  }
}

function emit() {
  for (const l of listeners) l();
}

export const auditLog = {
  getAll(): AuditLogEntry[] {
    return entries;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  append(
    action: AuditAction,
    summary: string,
    opts?: { caseId?: string; wallet?: string; metadata?: Record<string, string>; analystId?: string },
  ) {
    const analyst = opts?.analystId ? ANALYSTS[opts.analystId] : CURRENT_ANALYST;
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      analystId: analyst?.id ?? CURRENT_ANALYST.id,
      analystName: analyst?.name ?? CURRENT_ANALYST.name,
      action,
      caseId: opts?.caseId,
      wallet: opts?.wallet,
      summary,
      metadata: opts?.metadata,
    };
    entries = [entry, ...entries].slice(0, 100);
    persist();
    emit();
    return entry;
  },
};

export function useAuditLog(): AuditLogEntry[] {
  return useSyncExternalStore(auditLog.subscribe, auditLog.getAll, auditLog.getAll);
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  CASE_OPENED: "Case opened",
  CASE_CLOSED: "Case closed",
  DEPOSIT_BLOCKED: "Deposit blocked",
  DEPOSIT_ACCEPTED: "Deposit accepted",
  EDD_REQUESTED: "EDD requested",
  DOCUMENTS_RECEIVED: "Documents received",
  AUDIT_NOTE_EDITED: "Audit note edited",
  SAR_DRAFT_GENERATED: "SAR draft generated",
  SAR_DRAFT_EXPORTED: "SAR draft exported",
};
