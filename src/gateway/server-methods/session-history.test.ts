import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/sessions/paths.js", () => ({
  resolveSessionTranscriptPathInDir: vi.fn((sessionId: string, dir: string) =>
    path.join(dir, `${sessionId}.jsonl`),
  ),
  resolveSessionTranscriptsDirForAgent: vi.fn((agentId?: string) => {
    const root = process.env.OPENCLAW_SESSION_HISTORY_TEST_DIR ?? os.tmpdir();
    return path.join(root, "agents", agentId ?? "main", "sessions");
  }),
}));

const mockPaths = await import("../../config/sessions/paths.js");
const { sessionHistoryHandlers } = await import("./session-history.js");

async function runHandler(
  method:
    | "sessionHistory.list"
    | "sessionHistory.get"
    | "sessionHistory.import"
    | "sessionHistory.export"
    | "sessionHistory.reindex",
  params: Record<string, unknown>,
) {
  const respond = vi.fn();
  const handler = sessionHistoryHandlers[method];
  await handler({
    params,
    respond,
  } as unknown as Parameters<typeof handler>[0]);
  return respond;
}

describe("sessionHistory.list", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `session-history-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    fs.mkdirSync(testDir, { recursive: true });
    vi.mocked(mockPaths.resolveSessionTranscriptsDirForAgent).mockReturnValue(testDir);
  });

  it("returns empty list when dir does not exist", async () => {
    const subDir = path.join(os.tmpdir(), `nonexistent-${Date.now()}`);
    vi.mocked(mockPaths.resolveSessionTranscriptsDirForAgent).mockReturnValue(subDir);

    const respond = await runHandler("sessionHistory.list", {});
    expect(respond).toHaveBeenCalledWith(true, { items: [], total: 0 });
  });

  it("returns sessions sorted by mtime desc with pagination", async () => {
    fs.writeFileSync(
      path.join(testDir, "a.jsonl.reset.2026-01-01T00-00-00.000Z"),
      '{"message":{}}\n',
    );
    fs.writeFileSync(
      path.join(testDir, "b.jsonl.reset.2026-01-02T00-00-00.000Z"),
      '{"message":{}}\n',
    );
    fs.writeFileSync(
      path.join(testDir, "c.jsonl.reset.2026-01-03T00-00-00.000Z"),
      '{"message":{}}\n',
    );

    const respond = await runHandler("sessionHistory.list", { page: 1, pageSize: 2 });
    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        total: 3,
        items: expect.arrayContaining([
          expect.objectContaining({
            sessionId: expect.any(String),
            time: expect.any(Number),
            index: expect.any(Number),
          }),
          expect.objectContaining({
            sessionId: expect.any(String),
            time: expect.any(Number),
            index: expect.any(Number),
          }),
        ]),
      }),
    );
    const call = respond.mock.calls[0];
    expect(call[1].items).toHaveLength(2);
    expect(call[1].total).toBe(3);
  });

  it("filters by startDate and endDate", async () => {
    const old = path.join(testDir, "old.jsonl.reset.2026-03-05T00-00-00.000Z");
    const mid = path.join(testDir, "mid.jsonl.reset.2026-03-08T00-00-00.000Z");
    const recent = path.join(testDir, "recent.jsonl.reset.2026-03-10T00-00-00.000Z");
    fs.writeFileSync(old, "");
    fs.writeFileSync(mid, "");
    fs.writeFileSync(recent, "");

    const base = new Date("2026-03-10T12:00:00Z").getTime();
    fs.utimesSync(old, new Date(base - 86400_000 * 5), new Date(base - 86400_000 * 5));
    fs.utimesSync(mid, new Date(base - 86400_000 * 2), new Date(base - 86400_000 * 2));
    fs.utimesSync(recent, new Date(base), new Date(base));

    const respond = await runHandler("sessionHistory.list", {
      startDate: "2026-03-08",
      endDate: "2026-03-11",
    });
    expect(respond).toHaveBeenCalledWith(true, expect.any(Object));
    const payload = respond.mock.calls[0][1];
    expect(payload.total).toBe(2);
  });
});

describe("sessionHistory.get", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `session-history-get-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    fs.mkdirSync(testDir, { recursive: true });
    vi.mocked(mockPaths.resolveSessionTranscriptsDirForAgent).mockReturnValue(testDir);
    vi.mocked(mockPaths.resolveSessionTranscriptPathInDir).mockImplementation(
      (sessionId: string, dir: string) => path.join(dir, `${sessionId}.jsonl`),
    );
  });

  it("returns transcript messages", async () => {
    const transcriptPath = path.join(testDir, "sess-1.jsonl");
    fs.writeFileSync(
      transcriptPath,
      '{"message":{"role":"user","content":[{"type":"text","text":"Hi"}]}}\n{"message":{"role":"assistant","content":[{"type":"text","text":"Hello"}]}}\n',
    );

    vi.doMock("../session-utils.fs.js", () => ({
      readSessionMessages: vi.fn(() => [
        { role: "user", content: [{ type: "text", text: "Hi" }] },
        { role: "assistant", content: [{ type: "text", text: "Hello" }] },
      ]),
    }));

    const respond = await runHandler("sessionHistory.get", {
      agentId: "main",
      sessionId: "sess-1",
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ transcript: expect.any(Array) }),
    );
  });
});

describe("sessionHistory.import", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `session-history-import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    fs.mkdirSync(testDir, { recursive: true });
    vi.mocked(mockPaths.resolveSessionTranscriptsDirForAgent).mockReturnValue(testDir);
  });

  it("writes imported files and returns results", async () => {
    const content = '{"message":{"role":"user","content":[]}}\n';
    const contentBase64 = Buffer.from(content, "utf-8").toString("base64");

    const respond = await runHandler("sessionHistory.import", {
      agentId: "main",
      files: [{ name: "new-session.jsonl", contentBase64 }],
      conflictPolicy: "overwrite",
    });

    expect(respond).toHaveBeenCalledWith(true, {
      results: [{ name: "new-session.jsonl", ok: true }],
    });
    const targetPath = path.join(testDir, "new-session.jsonl");
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(fs.readFileSync(targetPath, "utf-8")).toBe(content);
  });

  it("skips existing files when conflictPolicy is skip", async () => {
    const existingPath = path.join(testDir, "existing.jsonl");
    fs.writeFileSync(existingPath, "original\n");

    const content = "new content";
    const contentBase64 = Buffer.from(content, "utf-8").toString("base64");

    const respond = await runHandler("sessionHistory.import", {
      agentId: "main",
      files: [{ name: "existing.jsonl", contentBase64 }],
      conflictPolicy: "skip",
    });

    expect(respond).toHaveBeenCalledWith(true, {
      results: [{ name: "existing.jsonl", ok: false, skipped: true }],
    });
    expect(fs.readFileSync(existingPath, "utf-8")).toBe("original\n");
  });
});

describe("sessionHistory.export", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `session-history-export-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    fs.mkdirSync(testDir, { recursive: true });
    vi.mocked(mockPaths.resolveSessionTranscriptsDirForAgent).mockReturnValue(testDir);
  });

  it("returns base64-encoded file contents for existing sessions", async () => {
    const sessPath = path.join(testDir, "sess-a.jsonl");
    fs.writeFileSync(sessPath, '{"message":{}}\n');

    const respond = await runHandler("sessionHistory.export", {
      agentId: "main",
      sessionIds: ["sess-a", "nonexistent"],
    });

    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ files: expect.any(Array) }),
    );
    const files = respond.mock.calls[0][1].files;
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("sess-a.jsonl");
    expect(Buffer.from(files[0].contentBase64, "base64").toString("utf-8")).toBe(
      '{"message":{}}\n',
    );
  });
});

describe("sessionHistory.reindex", () => {
  it("returns ok", async () => {
    const respond = await runHandler("sessionHistory.reindex", {});
    expect(respond).toHaveBeenCalledWith(true, { ok: true });
  });
});
