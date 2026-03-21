import { t } from "../../i18n/index.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import type { AgentsListResult } from "../types.ts";

export type SessionHistoryListItem = {
  index: number;
  time: number;
  /** Transcript / display id (fallback: store key). */
  sessionId: string;
  /** Canonical gateway session store key (use for RPC). */
  sessionKey: string;
  /** Short label from list metadata. */
  summary?: string;
};

export type SessionManagementListItem = SessionHistoryListItem;

export type HistorySessionDetail = {
  agentId: string;
  sessionId: string;
  transcript: unknown[];
};

export type SessionManagementState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  agentsList: AgentsListResult | null;
  sessionManagementLoading: boolean;
  sessionManagementError: string | null;
  sessionManagementAgentId: string | null;
  sessionManagementItems: SessionManagementListItem[];
  sessionManagementTotal: number;
  sessionManagementPage: number;
  sessionManagementPageSize: number;
  sessionManagementStartDate: string;
  sessionManagementEndDate: string;
  sessionManagementSelectedIds: string[];
  sessionManagementActionBusy: boolean;
  sessionManagementConflictPolicy: "skip" | "overwrite";
  sessionSummaries: Record<string, string>;
  sessionSummaryGeneratingKey: string | null;
  historySessionAgentId: string | null;
  historySessionId: string | null;
  /** Canonical store key for sessions.get / delete (preferred over agentId+sessionId). */
  historySessionKey: string | null;
  historySessionLoading: boolean;
  historySessionError: string | null;
  historySessionDetail: HistorySessionDetail | null;
};

const DEFAULT_AGENT_ID = "main";
const SESSION_LIST_FETCH_LIMIT = 2000;

function resolveDefaultAgentId(agentsList: AgentsListResult | null): string | null {
  return agentsList?.defaultId ?? agentsList?.agents?.[0]?.id ?? null;
}

function utcDayStartMs(isoDate: string): number {
  return new Date(`${isoDate.trim()}T00:00:00.000Z`).getTime();
}

function utcDayEndMs(isoDate: string): number {
  return new Date(`${isoDate.trim()}T23:59:59.999Z`).getTime();
}

function pickListSummary(row: {
  derivedTitle?: string;
  lastMessagePreview?: string;
  displayName?: string;
}): string | undefined {
  const title = row.derivedTitle?.trim();
  if (title) {
    return title.length > 120 ? `${title.slice(0, 117)}…` : title;
  }
  const preview = row.lastMessagePreview?.trim();
  if (preview) {
    return preview.length > 120 ? `${preview.slice(0, 117)}…` : preview;
  }
  const name = row.displayName?.trim();
  if (name) {
    return name.length > 120 ? `${name.slice(0, 117)}…` : name;
  }
  return undefined;
}

export async function loadSessionManagementShell(state: SessionManagementState) {
  state.sessionManagementError = null;
  if (!state.sessionManagementAgentId) {
    state.sessionManagementAgentId = resolveDefaultAgentId(state.agentsList) ?? DEFAULT_AGENT_ID;
  }
  if (!state.historySessionAgentId) {
    state.historySessionAgentId = state.sessionManagementAgentId;
  }
}

export async function loadSessionHistoryList(state: SessionManagementState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.sessionManagementLoading) {
    return;
  }
  const agentId =
    state.sessionManagementAgentId ?? resolveDefaultAgentId(state.agentsList) ?? DEFAULT_AGENT_ID;
  state.sessionManagementLoading = true;
  state.sessionManagementError = null;
  try {
    const res = await state.client.request<{
      sessions: Array<{
        key: string;
        sessionId?: string;
        updatedAt: number | null;
        derivedTitle?: string;
        lastMessagePreview?: string;
        displayName?: string;
      }>;
    }>("sessions.list", {
      agentId,
      limit: SESSION_LIST_FETCH_LIMIT,
      includeDerivedTitles: true,
      includeLastMessage: true,
    });
    let sessions = res.sessions ?? [];
    if (state.sessionManagementStartDate?.trim()) {
      const start = utcDayStartMs(state.sessionManagementStartDate);
      sessions = sessions.filter((s) => (s.updatedAt ?? 0) >= start);
    }
    if (state.sessionManagementEndDate?.trim()) {
      const end = utcDayEndMs(state.sessionManagementEndDate);
      sessions = sessions.filter((s) => (s.updatedAt ?? 0) <= end);
    }
    const total = sessions.length;
    const page = Math.max(1, state.sessionManagementPage);
    const pageSize = Math.max(1, state.sessionManagementPageSize);
    const startIdx = (page - 1) * pageSize;
    const slice = sessions.slice(startIdx, startIdx + pageSize);
    state.sessionManagementItems = slice.map((row, i) => ({
      index: startIdx + i + 1,
      time: row.updatedAt ?? 0,
      sessionId: row.sessionId?.trim() || row.key,
      sessionKey: row.key,
      summary: pickListSummary(row),
    }));
    state.sessionManagementTotal = total;
  } catch (err) {
    state.sessionManagementError = String(err);
  } finally {
    state.sessionManagementLoading = false;
  }
}

export async function loadHistorySessionDetail(state: SessionManagementState) {
  if (!state.client || !state.connected) {
    return;
  }
  const agentId = state.historySessionAgentId ?? resolveDefaultAgentId(state.agentsList);
  const sessionId = state.historySessionId;
  const sessionKey =
    state.historySessionKey?.trim() ||
    (agentId && sessionId?.trim() ? `agent:${agentId}:${sessionId.trim()}` : "");
  if (!agentId || !sessionKey) {
    state.historySessionDetail = null;
    return;
  }
  state.historySessionLoading = true;
  state.historySessionError = null;
  state.historySessionDetail = null;
  try {
    const res = await state.client.request<{ messages: unknown[] }>("sessions.get", {
      key: sessionKey,
    });
    if (res) {
      state.historySessionDetail = {
        agentId,
        sessionId: sessionId?.trim() || sessionKey,
        transcript: res.messages ?? [],
      };
    }
  } catch (err) {
    state.historySessionError = String(err);
  } finally {
    state.historySessionLoading = false;
  }
}

export async function loadHistorySessionShell(state: SessionManagementState) {
  state.historySessionError = null;
  if (!state.historySessionAgentId) {
    state.historySessionAgentId =
      state.sessionManagementAgentId ?? resolveDefaultAgentId(state.agentsList);
  }
}

function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

export async function importSessionHistory(
  state: SessionManagementState,
  _conflictPolicy: "skip" | "overwrite",
): Promise<void> {
  if (!state.client || !state.connected || !isFileSystemAccessSupported()) {
    return;
  }
  if (state.sessionManagementActionBusy) {
    return;
  }
  void _conflictPolicy;
  state.sessionManagementError = t("sessionManagement.importUnavailable");
}

function safeExportFileName(sessionKey: string): string {
  const base = sessionKey.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  const trimmed = base.length > 120 ? base.slice(0, 120) : base;
  return `${trimmed || "session"}.jsonl`;
}

export async function exportSessionHistory(
  state: SessionManagementState,
  sessionKeys: string[],
): Promise<void> {
  if (
    !state.client ||
    !state.connected ||
    sessionKeys.length === 0 ||
    !isFileSystemAccessSupported()
  ) {
    return;
  }
  if (state.sessionManagementActionBusy) {
    return;
  }
  let dirHandle: FileSystemDirectoryHandle;
  try {
    dirHandle = await (
      window as unknown as {
        showDirectoryPicker: (opts?: object) => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker({ mode: "readwrite" });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      return;
    }
    state.sessionManagementError = String(err);
    return;
  }
  state.sessionManagementError = null;
  state.sessionManagementActionBusy = true;
  try {
    for (const key of sessionKeys) {
      const res = await state.client.request<{ messages: unknown[] }>("sessions.get", { key });
      const messages = res.messages ?? [];
      const jsonl = `${messages.map((m) => JSON.stringify(m)).join("\n")}\n`;
      const name = safeExportFileName(key);
      const handle = await dirHandle.getFileHandle(name, { create: true });
      const w = await handle.createWritable();
      await w.write(jsonl);
      await w.close();
    }
  } catch (err) {
    state.sessionManagementError = String(err);
  } finally {
    state.sessionManagementActionBusy = false;
  }
}

export async function generateSessionSummary(
  state: SessionManagementState,
  agentId: string,
  sessionKey: string,
): Promise<void> {
  if (!state.client || !state.connected || state.sessionSummaryGeneratingKey) {
    return;
  }
  const key = `${agentId}:${sessionKey}`;
  state.sessionSummaryGeneratingKey = key;
  state.sessionManagementError = null;
  try {
    const res = await state.client.request<{
      previews: Array<{ items: Array<{ text: string }> }>;
    }>("sessions.preview", {
      keys: [sessionKey],
      limit: 6,
      maxChars: 400,
    });
    const preview = res.previews?.[0];
    const text =
      preview?.items
        ?.map((item) => item.text?.trim())
        .filter(Boolean)
        .join(" ") ?? "";
    if (text) {
      state.sessionSummaries = { ...state.sessionSummaries, [key]: text };
    }
  } catch (err) {
    state.sessionManagementError = String(err);
  } finally {
    state.sessionSummaryGeneratingKey = null;
  }
}

export async function deleteSessionHistory(
  state: SessionManagementState,
  _agentId: string,
  sessionKey: string,
): Promise<void> {
  if (!state.client || !state.connected || state.sessionManagementActionBusy) {
    return;
  }
  void _agentId;
  const key = sessionKey?.trim();
  if (!key) {
    return;
  }
  state.sessionManagementActionBusy = true;
  state.sessionManagementError = null;
  try {
    await state.client.request<{ ok: boolean }>("sessions.delete", {
      key,
      deleteTranscript: true,
    });
  } catch (err) {
    state.sessionManagementError = String(err);
    return;
  } finally {
    state.sessionManagementActionBusy = false;
  }
}

export async function rebuildSessionIndex(state: SessionManagementState): Promise<void> {
  if (!state.client || !state.connected || state.sessionManagementActionBusy) {
    return;
  }
  state.sessionManagementActionBusy = true;
  try {
    state.sessionManagementError = t("sessionManagement.rebuildUnavailable");
  } finally {
    state.sessionManagementActionBusy = false;
  }
}
