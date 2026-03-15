import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { agentCommandFromIngress } from "../../commands/agent.js";
import { isSessionArchiveArtifactName } from "../../config/sessions/artifacts.js";
import {
  resolveSessionTranscriptPathInDir,
  resolveSessionTranscriptsDirForAgent,
} from "../../config/sessions/paths.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { defaultRuntime } from "../../runtime.js";
import {
  ErrorCodes,
  errorShape,
  validateSessionHistoryListParams,
  validateSessionHistoryGetParams,
  validateSessionHistoryImportParams,
  validateSessionHistoryExportParams,
  validateSessionHistoryReindexParams,
  validateSessionHistoryDeleteParams,
  validateSessionHistorySummarizeParams,
} from "../protocol/index.js";
import { readSessionMessages } from "../session-utils.fs.js";
import type { GatewayRequestHandlers } from "./types.js";
import { assertValidParams } from "./validation.js";

const SUMMARIES_FILENAME = "summaries.json";
const SUMMARY_MAX_CHARS = 25;
const ASSISTANT_TEXT_MAX_CHARS = 150;

function getSummariesPath(agentSessionsDir: string): string {
  return path.join(agentSessionsDir, SUMMARIES_FILENAME);
}

function readSummariesMap(agentSessionsDir: string): Record<string, string> {
  const p = getSummariesPath(agentSessionsDir);
  if (!fs.existsSync(p)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeSummariesMap(agentSessionsDir: string, map: Record<string, string>): void {
  fs.mkdirSync(agentSessionsDir, { recursive: true });
  const p = getSummariesPath(agentSessionsDir);
  fs.writeFileSync(p, JSON.stringify(map, null, 0), "utf-8");
}

function extractMessageText(msg: unknown): string {
  const m = msg as { content?: string | unknown[]; text?: string; role?: string };
  if (typeof m?.content === "string") {
    return m.content.trim();
  }
  if (Array.isArray(m?.content)) {
    return (m.content as { text?: string }[])
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join(" ")
      .trim();
  }
  if (typeof m?.text === "string") {
    return m.text.trim();
  }
  return "";
}

/** Skip internal Session Startup prompt so it is not used for summarization. */
function isSessionStartupUserMessage(text: string): boolean {
  const t = text.trim();
  return (
    t.includes("A new session was started via") ||
    t.includes("Execute your Session Startup sequence") ||
    t.includes("Session Startup sequence now")
  );
}

/** Strip Sender metadata and optional timestamp prefix from user message for cleaner summary input. */
function stripUserMessageMetadata(text: string): string {
  let t = text.trim();
  const senderMatch = t.match(
    /^Sender\s*\(untrusted\s*metadata\)\s*:\s*\n?```json[\s\S]*?```\s*\n?/i,
  );
  if (senderMatch) {
    t = t.slice(senderMatch[0].length).trim();
  }
  const timePrefix = t.match(/^\[\s*[^\]]+\]\s*/);
  if (timePrefix) {
    t = t.slice(timePrefix[0].length).trim();
  }
  return t;
}

/** Truncate long assistant text so the model focuses on theme, not verbatim copy. */
function truncateAssistantText(text: string): string {
  if (text.length <= ASSISTANT_TEXT_MAX_CHARS) {
    return text;
  }
  return text.slice(0, ASSISTANT_TEXT_MAX_CHARS) + "…";
}

/** Extract first 3 rounds (user+model) from transcript for summarization; skip Session Startup, strip user metadata. */
function formatFirstRoundsForSummary(messages: unknown[]): string {
  const parts: string[] = [];
  let roundCount = 0;
  for (const msg of messages) {
    const m = msg as { role?: string };
    const role = m?.role ?? "";
    let text = extractMessageText(msg);
    if (!text) {
      continue;
    }
    if (role === "user") {
      text = stripUserMessageMetadata(text);
      if (!text || isSessionStartupUserMessage(text)) {
        continue;
      }
      parts.push(`用户: ${text}`);
    } else if (role === "model" || role === "assistant") {
      text = truncateAssistantText(text);
      parts.push(`助手: ${text}`);
      roundCount++;
      if (roundCount >= 3) {
        break;
      }
    }
  }
  return parts.join("\n");
}

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
    const summaries = readSummariesMap(dir);
    const items = slice.map((r, i) => {
      const item: { index: number; time: number; sessionId: string; summary?: string } = {
        index: start + i + 1,
        time: r.mtimeMs,
        sessionId: r.sessionId,
      };
      const s = summaries[r.sessionId];
      if (typeof s === "string" && s) {
        item.summary = s;
      }
      return item;
    });
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

  "sessionHistory.summarize": async (opts) => {
    const { params, respond, context } = opts;
    if (
      !assertValidParams(
        params,
        validateSessionHistorySummarizeParams,
        "sessionHistory.summarize",
        respond,
      )
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

    const summaries = readSummariesMap(dir);
    const cached = summaries[sessionId];
    if (typeof cached === "string" && cached) {
      respond(true, { summary: cached });
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
    const text = formatFirstRoundsForSummary(messages);
    if (!text.trim()) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `no content to summarize for session: ${sessionId}`),
      );
      return;
    }

    const sessionKey = `agent:${agentId}:summary-${randomUUID()}`;
    const extraSystemPrompt =
      "你是一个摘要助手。请用5-15字概括以下对话的主题，输出一个标题式短语。不要抄写或复述对话中的原句。只输出概括结果，不要其他说明。";
    const deps = context.deps;

    try {
      const result = await agentCommandFromIngress(
        {
          message: text,
          sessionKey,
          extraSystemPrompt,
          deliver: false,
          bestEffortDeliver: false,
          senderIsOwner: true,
          agentId,
        },
        defaultRuntime,
        deps,
      );

      const payloads = (result as { payloads?: Array<{ text?: string }> } | null)?.payloads;
      let summary =
        Array.isArray(payloads) && payloads.length > 0
          ? payloads
              .map((p) => (typeof p.text === "string" ? p.text : ""))
              .join(" ")
              .trim()
          : "";
      if (!summary) {
        summary = "无内容";
      }
      if (summary.length > SUMMARY_MAX_CHARS) {
        summary = summary.slice(0, SUMMARY_MAX_CHARS);
      }

      summaries[sessionId] = summary;
      writeSummariesMap(dir, summaries);
      respond(true, { summary });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.UNAVAILABLE,
          `summarization failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  },

  "sessionHistory.delete": async (opts) => {
    const { params, respond } = opts;
    if (
      !assertValidParams(
        params,
        validateSessionHistoryDeleteParams,
        "sessionHistory.delete",
        respond,
      )
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
    try {
      fs.unlinkSync(filePath);
      const summaries = readSummariesMap(dir);
      if (sessionId in summaries) {
        delete summaries[sessionId];
        writeSummariesMap(dir, summaries);
      }
      respond(true, { ok: true });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to delete session: ${String(err)}`),
      );
    }
  },
};
