import fs from "node:fs";
import path from "node:path";
import { isSessionArchiveArtifactName } from "../../config/sessions/artifacts.js";
import {
  resolveSessionTranscriptPathInDir,
  resolveSessionTranscriptsDirForAgent,
} from "../../config/sessions/paths.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import {
  ErrorCodes,
  errorShape,
  validateSessionHistoryListParams,
  validateSessionHistoryGetParams,
  validateSessionHistoryImportParams,
  validateSessionHistoryExportParams,
  validateSessionHistoryReindexParams,
} from "../protocol/index.js";
import { readSessionMessages } from "../session-utils.fs.js";
import type { GatewayRequestHandlers } from "./types.js";
import { assertValidParams } from "./validation.js";

const DEFAULT_AGENT_ID = "main";
const DEFAULT_PAGE_SIZE = 50;

function parseDateToMs(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00.000Z");
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

/** Returns sessionId (filename) for archive artifacts, null for primary .jsonl (current chat). */
function extractArchiveSessionIdFromFilename(name: string): string | null {
  if (!isSessionArchiveArtifactName(name)) {
    return null;
  }
  return name;
}

export const sessionHistoryHandlers: GatewayRequestHandlers = {
  "sessionHistory.list": async (opts) => {
    const { params, respond } = opts;
    if (
      !assertValidParams(params, validateSessionHistoryListParams, "sessionHistory.list", respond)
    ) {
      return;
    }
    const agentId = params.agentId?.trim() ? normalizeAgentId(params.agentId) : DEFAULT_AGENT_ID;
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? DEFAULT_PAGE_SIZE, 100);

    let dir: string;
    try {
      dir = resolveSessionTranscriptsDirForAgent(agentId);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to resolve sessions dir: ${String(err)}`),
      );
      return;
    }

    if (!fs.existsSync(dir)) {
      respond(true, { items: [], total: 0 });
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const rawItems: { sessionId: string; mtimeMs: number }[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const sessionId = extractArchiveSessionIdFromFilename(entry.name);
      if (!sessionId) {
        continue;
      }

      const filePath = path.join(dir, entry.name);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue;
      }
      rawItems.push({ sessionId, mtimeMs: stat.mtimeMs });
    }

    if (params.startDate || params.endDate) {
      const startMs = params.startDate ? parseDateToMs(params.startDate) : 0;
      const endMs = params.endDate
        ? parseDateToMs(params.endDate) + 86400_000 - 1
        : Number.POSITIVE_INFINITY;
      const filtered = rawItems.filter((r) => r.mtimeMs >= startMs && r.mtimeMs <= endMs);
      rawItems.length = 0;
      rawItems.push(...filtered);
    }

    rawItems.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const total = rawItems.length;
    const start = (page - 1) * pageSize;
    const slice = rawItems.slice(start, start + pageSize);
    const items = slice.map((r, i) => ({
      index: start + i + 1,
      time: r.mtimeMs,
      sessionId: r.sessionId,
    }));
    respond(true, { items, total });
  },

  "sessionHistory.get": async (opts) => {
    const { params, respond } = opts;
    if (
      !assertValidParams(params, validateSessionHistoryGetParams, "sessionHistory.get", respond)
    ) {
      return;
    }
    const agentId = normalizeAgentId(params.agentId);
    const sessionId = params.sessionId.trim();

    let dir: string;
    try {
      dir = resolveSessionTranscriptsDirForAgent(agentId);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to resolve sessions dir: ${String(err)}`),
      );
      return;
    }

    let filePath: string;
    if (isSessionArchiveArtifactName(sessionId)) {
      const base = path.basename(sessionId);
      if (base !== sessionId || base.includes("..")) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `invalid session id: ${sessionId}`),
        );
        return;
      }
      filePath = path.join(dir, sessionId);
    } else {
      try {
        filePath = resolveSessionTranscriptPathInDir(sessionId, dir);
      } catch {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `invalid session id: ${sessionId}`),
        );
        return;
      }
    }
    if (!fs.existsSync(filePath)) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `session transcript not found: ${sessionId}`),
      );
      return;
    }

    const messages = readSessionMessages(sessionId, undefined, filePath);
    respond(true, { transcript: messages });
  },

  "sessionHistory.import": async (opts) => {
    const { params, respond } = opts;
    if (
      !assertValidParams(
        params,
        validateSessionHistoryImportParams,
        "sessionHistory.import",
        respond,
      )
    ) {
      return;
    }
    const agentId = normalizeAgentId(params.agentId);
    const conflictPolicy = params.conflictPolicy ?? "skip";
    let dir: string;
    try {
      dir = resolveSessionTranscriptsDirForAgent(agentId);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to resolve sessions dir: ${String(err)}`),
      );
      return;
    }
    fs.mkdirSync(dir, { recursive: true });

    const results: { name: string; ok: boolean; skipped?: boolean }[] = [];
    for (const file of params.files) {
      const safeName = path.basename(file.name);
      if (!safeName || !safeName.endsWith(".jsonl")) {
        results.push({ name: file.name, ok: false });
        continue;
      }
      const targetPath = path.join(dir, safeName);
      const exists = fs.existsSync(targetPath);
      if (exists && conflictPolicy === "skip") {
        results.push({ name: file.name, ok: false, skipped: true });
        continue;
      }
      try {
        const buf = Buffer.from(file.contentBase64, "base64");
        fs.writeFileSync(targetPath, buf, "utf-8");
        results.push({ name: file.name, ok: true });
      } catch {
        results.push({ name: file.name, ok: false });
      }
    }
    respond(true, { results });
  },

  "sessionHistory.export": async (opts) => {
    const { params, respond } = opts;
    if (
      !assertValidParams(
        params,
        validateSessionHistoryExportParams,
        "sessionHistory.export",
        respond,
      )
    ) {
      return;
    }
    const agentId = normalizeAgentId(params.agentId);
    let dir: string;
    try {
      dir = resolveSessionTranscriptsDirForAgent(agentId);
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to resolve sessions dir: ${String(err)}`),
      );
      return;
    }

    const files: { name: string; contentBase64: string }[] = [];
    for (const sessionId of params.sessionIds) {
      const safeId = path.basename(sessionId.trim());
      if (!safeId || safeId.includes("..")) {
        continue;
      }
      try {
        const filePath = isSessionArchiveArtifactName(safeId)
          ? path.join(dir, safeId)
          : path.join(dir, `${safeId}.jsonl`);
        if (!fs.existsSync(filePath)) {
          continue;
        }
        const content = fs.readFileSync(filePath, "utf-8");
        const exportName = isSessionArchiveArtifactName(safeId) ? safeId : `${safeId}.jsonl`;
        files.push({
          name: exportName,
          contentBase64: Buffer.from(content, "utf-8").toString("base64"),
        });
      } catch {
        // skip failed reads
      }
    }
    respond(true, { files });
  },

  "sessionHistory.reindex": async (opts) => {
    const { params, respond } = opts;
    if (
      !assertValidParams(
        params,
        validateSessionHistoryReindexParams,
        "sessionHistory.reindex",
        respond,
      )
    ) {
      return;
    }
    // Stub: no index to rebuild for raw transcript listing.
    respond(true, { ok: true });
  },
};
