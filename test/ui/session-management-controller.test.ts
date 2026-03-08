import { beforeEach, describe, expect, it, vi } from "vitest";

let loadSessionHistoryList: (state: SessionManagementState) => Promise<void>;
let loadHistorySessionDetail: (state: SessionManagementState) => Promise<void>;
let rebuildSessionIndex: (state: SessionManagementState) => Promise<void>;

type SessionManagementState = {
  client: { request: (method: string, params?: object) => Promise<unknown> } | null;
  connected: boolean;
  sessionManagementLoading: boolean;
  sessionManagementError: string | null;
  sessionManagementAgentId: string | null;
  sessionManagementItems: { index: number; time: number; sessionId: string }[];
  sessionManagementTotal: number;
  sessionManagementPage: number;
  sessionManagementPageSize: number;
  sessionManagementActionBusy: boolean;
  agentsList: { agents: { id: string }[]; defaultId?: string } | null;
  historySessionAgentId: string | null;
  historySessionId: string | null;
  historySessionDetail: { transcript: unknown[] } | null;
};

beforeEach(async () => {
  const mod = await import("../../ui/src/ui/controllers/session-management.ts");
  loadSessionHistoryList = mod.loadSessionHistoryList;
  loadHistorySessionDetail = mod.loadHistorySessionDetail;
  rebuildSessionIndex = mod.rebuildSessionIndex;
});

function createState(overrides: Partial<SessionManagementState> = {}): SessionManagementState {
  return {
    client: null,
    connected: false,
    sessionManagementLoading: false,
    sessionManagementError: null,
    sessionManagementAgentId: null,
    sessionManagementItems: [],
    sessionManagementTotal: 0,
    sessionManagementPage: 1,
    sessionManagementPageSize: 50,
    sessionManagementActionBusy: false,
    agentsList: { agents: [{ id: "main" }], defaultId: "main" },
    historySessionAgentId: null,
    historySessionId: null,
    historySessionDetail: null,
    ...overrides,
  };
}

describe("session-management controller", () => {
  it("loadSessionHistoryList calls sessionHistory.list and populates items", async () => {
    const state = createState({
      client: {
        request: vi.fn().mockResolvedValue({
          items: [
            { index: 1, time: 1000, sessionId: "sess-1" },
            { index: 2, time: 2000, sessionId: "sess-2" },
          ],
          total: 2,
        }),
      },
      connected: true,
      sessionManagementAgentId: "main",
    });

    await loadSessionHistoryList(state);

    expect(state.client?.request).toHaveBeenCalledWith("sessionHistory.list", expect.any(Object));
    expect(state.sessionManagementItems).toHaveLength(2);
    expect(state.sessionManagementItems[0].sessionId).toBe("sess-1");
    expect(state.sessionManagementTotal).toBe(2);
    expect(state.sessionManagementLoading).toBe(false);
  });

  it("loadSessionHistoryList does nothing when not connected", async () => {
    const state = createState({
      client: { request: vi.fn() },
      connected: false,
    });

    await loadSessionHistoryList(state);

    expect(state.client?.request).not.toHaveBeenCalled();
  });

  it("loadHistorySessionDetail calls sessionHistory.get and populates detail", async () => {
    const state = createState({
      client: {
        request: vi.fn().mockResolvedValue({
          transcript: [{ role: "user", content: [] }],
        }),
      },
      connected: true,
      historySessionAgentId: "main",
      historySessionId: "sess-1",
    });

    await loadHistorySessionDetail(state);

    expect(state.client?.request).toHaveBeenCalledWith("sessionHistory.get", {
      agentId: "main",
      sessionId: "sess-1",
    });
    expect(state.historySessionDetail).toBeDefined();
    expect(state.historySessionDetail?.transcript).toHaveLength(1);
    expect(state.historySessionLoading).toBe(false);
  });

  it("loadHistorySessionDetail does nothing when sessionId is empty", async () => {
    const state = createState({
      client: { request: vi.fn() },
      connected: true,
      historySessionAgentId: "main",
      historySessionId: "",
    });

    await loadHistorySessionDetail(state);

    expect(state.client?.request).not.toHaveBeenCalled();
    expect(state.historySessionDetail).toBeNull();
  });

  it("rebuildSessionIndex calls sessionHistory.reindex", async () => {
    const state = createState({
      client: { request: vi.fn().mockResolvedValue({ ok: true }) },
      connected: true,
      sessionManagementAgentId: "main",
    });

    await rebuildSessionIndex(state);

    expect(state.client?.request).toHaveBeenCalledWith("sessionHistory.reindex", {
      agentId: "main",
    });
  });
});
