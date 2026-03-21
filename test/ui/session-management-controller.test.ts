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
  sessionManagementItems: {
    index: number;
    time: number;
    sessionId: string;
    sessionKey: string;
  }[];
  sessionManagementTotal: number;
  sessionManagementPage: number;
  sessionManagementPageSize: number;
  sessionManagementStartDate: string;
  sessionManagementEndDate: string;
  sessionManagementActionBusy: boolean;
  agentsList: { agents: { id: string }[]; defaultId?: string } | null;
  historySessionAgentId: string | null;
  historySessionId: string | null;
  historySessionKey: string | null;
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
    sessionManagementStartDate: "",
    sessionManagementEndDate: "",
    sessionManagementActionBusy: false,
    agentsList: { agents: [{ id: "main" }], defaultId: "main" },
    historySessionAgentId: null,
    historySessionId: null,
    historySessionKey: null,
    historySessionDetail: null,
    ...overrides,
  };
}

describe("session-management controller", () => {
  it("loadSessionHistoryList calls sessions.list and populates items", async () => {
    const t0 = Date.UTC(2026, 2, 1, 12, 0, 0);
    const t1 = Date.UTC(2026, 2, 2, 12, 0, 0);
    const state = createState({
      client: {
        request: vi.fn().mockResolvedValue({
          sessions: [
            {
              key: "agent:main:sess-a",
              sessionId: "transcript-a",
              updatedAt: t0,
              derivedTitle: "A",
            },
            {
              key: "agent:main:sess-b",
              sessionId: "transcript-b",
              updatedAt: t1,
              derivedTitle: "B",
            },
          ],
        }),
      },
      connected: true,
      sessionManagementAgentId: "main",
    });

    await loadSessionHistoryList(state);

    expect(state.client?.request).toHaveBeenCalledWith(
      "sessions.list",
      expect.objectContaining({
        agentId: "main",
        includeDerivedTitles: true,
        includeLastMessage: true,
      }),
    );
    expect(state.sessionManagementItems).toHaveLength(2);
    expect(state.sessionManagementItems[0].sessionKey).toBe("agent:main:sess-a");
    expect(state.sessionManagementItems[0].sessionId).toBe("transcript-a");
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

  it("loadHistorySessionDetail calls sessions.get and populates detail", async () => {
    const state = createState({
      client: {
        request: vi.fn().mockResolvedValue({
          messages: [{ role: "user", content: [] }],
        }),
      },
      connected: true,
      historySessionAgentId: "main",
      historySessionId: "transcript-a",
      historySessionKey: "agent:main:sess-a",
    });

    await loadHistorySessionDetail(state);

    expect(state.client?.request).toHaveBeenCalledWith("sessions.get", {
      key: "agent:main:sess-a",
    });
    expect(state.historySessionDetail).toBeDefined();
    expect(state.historySessionDetail?.transcript).toHaveLength(1);
    expect(state.historySessionLoading).toBe(false);
  });

  it("loadHistorySessionDetail does nothing when session key is empty", async () => {
    const state = createState({
      client: { request: vi.fn() },
      connected: true,
      historySessionAgentId: "main",
      historySessionId: "",
      historySessionKey: null,
    });

    await loadHistorySessionDetail(state);

    expect(state.client?.request).not.toHaveBeenCalled();
    expect(state.historySessionDetail).toBeNull();
  });

  it("rebuildSessionIndex does not call removed sessionHistory.reindex", async () => {
    const state = createState({
      client: { request: vi.fn().mockResolvedValue({ ok: true }) },
      connected: true,
      sessionManagementAgentId: "main",
    });

    await rebuildSessionIndex(state);

    expect(state.client?.request).not.toHaveBeenCalled();
  });
});
