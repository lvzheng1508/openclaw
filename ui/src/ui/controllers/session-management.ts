import type { GatewayBrowserClient } from "../gateway.ts";
import type { AgentsListResult } from "../types.ts";

export type SessionHistoryListItem = {
  index: number;
  time: number;
  sessionId: string;
};

export type SessionHistoryListResult = {
  items: SessionHistoryListItem[];
  total: number;
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
  historySessionAgentId: string | null;
  historySessionId: string | null;
  historySessionLoading: boolean;
  historySessionError: string | null;
  historySessionDetail: HistorySessionDetail | null;
};

function resolveDefaultAgentId(agentsList: AgentsListResult | null): string | null {
  return agentsList?.defaultId ?? agentsList?.agents?.[0]?.id ?? null;
}

export async function loadSessionManagementShell(state: SessionManagementState) {
  state.sessionManagementError = null;
  if (!state.sessionManagementAgentId) {
    state.sessionManagementAgentId = resolveDefaultAgentId(state.agentsList);
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
  const agentId = state.sessionManagementAgentId ?? resolveDefaultAgentId(state.agentsList);
  if (!agentId) {
    return;
  }
  state.sessionManagementLoading = true;
  state.sessionManagementError = null;
  try {
    const res = await state.client.request<SessionHistoryListResult>("sessionHistory.list", {
      agentId,
      page: state.sessionManagementPage,
      pageSize: state.sessionManagementPageSize,
      ...(state.sessionManagementStartDate && {
        startDate: state.sessionManagementStartDate,
      }),
      ...(state.sessionManagementEndDate && {
        endDate: state.sessionManagementEndDate,
      }),
    });
    if (res) {
      state.sessionManagementItems = res.items;
      state.sessionManagementTotal = res.total;
    }
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
  if (!agentId || !sessionId?.trim()) {
    state.historySessionDetail = null;
    return;
  }
  state.historySessionLoading = true;
  state.historySessionError = null;
  state.historySessionDetail = null;
  try {
    const res = await state.client.request<{ transcript: unknown[] }>("sessionHistory.get", {
      agentId,
      sessionId: sessionId.trim(),
    });
    if (res) {
      state.historySessionDetail = {
        agentId,
        sessionId: sessionId.trim(),
        transcript: res.transcript,
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
  conflictPolicy: "skip" | "overwrite",
): Promise<void> {
  if (!state.client || !state.connected || !isFileSystemAccessSupported()) {
    return;
  }
  if (state.sessionManagementActionBusy) {
    return;
  }
  const agentId = state.sessionManagementAgentId ?? resolveDefaultAgentId(state.agentsList);
  if (!agentId) {
    return;
  }
  let handles: FileSystemFileHandle[];
  try {
    handles = await (
      window as unknown as {
        showOpenFilePicker: (opts?: object) => Promise<FileSystemFileHandle[]>;
      }
    ).showOpenFilePicker({
      types: [
        {
          description: "JSONL transcript files",
          accept: { "application/jsonlines": [".jsonl"], "text/plain": [".jsonl"] },
        },
      ],
      multiple: true,
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      return;
    }
    state.sessionManagementError = String(err);
    return;
  }
  state.sessionManagementError = null;
  const files: { name: string; contentBase64: string }[] = [];
  for (const h of handles) {
    const file = await h.getFile();
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let base64 = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      const chunk = bytes.subarray(i, Math.min(i + 8192, bytes.length));
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64 = btoa(base64);
    files.push({ name: file.name, contentBase64: base64 });
  }
  if (files.length === 0) {
    return;
  }
  state.sessionManagementActionBusy = true;
  try {
    const res = await state.client.request<{
      results: { name: string; ok: boolean; skipped?: boolean }[];
    }>("sessionHistory.import", { agentId, files, conflictPolicy });
    if (res?.results) {
      const imported = res.results.filter((r) => r.ok).length;
      const skipped = res.results.filter((r) => r.skipped).length;
      state.sessionManagementError = null;
      if (skipped > 0) {
        state.sessionManagementError = `Imported ${imported}, skipped ${skipped} (already exist).`;
      }
    }
  } catch (err) {
    state.sessionManagementError = String(err);
  } finally {
    state.sessionManagementActionBusy = false;
  }
}

export async function exportSessionHistory(
  state: SessionManagementState,
  sessionIds: string[],
): Promise<void> {
  if (
    !state.client ||
    !state.connected ||
    sessionIds.length === 0 ||
    !isFileSystemAccessSupported()
  ) {
    return;
  }
  if (state.sessionManagementActionBusy) {
    return;
  }
  const agentId = state.sessionManagementAgentId ?? resolveDefaultAgentId(state.agentsList);
  if (!agentId) {
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
    const res = await state.client.request<{ files: { name: string; contentBase64: string }[] }>(
      "sessionHistory.export",
      { agentId, sessionIds },
    );
    if (!res?.files?.length) {
      return;
    }
    for (const f of res.files) {
      const handle = await dirHandle.getFileHandle(f.name, { create: true });
      const w = await handle.createWritable();
      const decoded = atob(f.contentBase64);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      await w.write(bytes);
      await w.close();
    }
  } catch (err) {
    state.sessionManagementError = String(err);
  } finally {
    state.sessionManagementActionBusy = false;
  }
}

export async function rebuildSessionIndex(state: SessionManagementState): Promise<void> {
  if (!state.client || !state.connected || state.sessionManagementActionBusy) {
    return;
  }
  const agentId = state.sessionManagementAgentId ?? resolveDefaultAgentId(state.agentsList);
  state.sessionManagementActionBusy = true;
  try {
    await state.client.request("sessionHistory.reindex", { agentId: agentId ?? undefined });
    state.sessionManagementError = null;
  } catch (err) {
    state.sessionManagementError = String(err);
  } finally {
    state.sessionManagementActionBusy = false;
  }
}
