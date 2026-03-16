import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import type { SessionHistoryListItem } from "../controllers/session-management.ts";
import { formatMs } from "../format.ts";
import { pathForTab } from "../navigation.ts";
import type { AgentsListResult } from "../types.ts";

export type SessionManagementShellProps = {
  loading: boolean;
  error: string | null;
  connected: boolean;
  agentsList: AgentsListResult | null;
  selectedAgentId: string | null;
  items: SessionHistoryListItem[];
  total: number;
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  basePath: string;
  selectedIds: string[];
  conflictPolicy: "skip" | "overwrite";
  actionBusy: boolean;
  onAgentChange: (agentId: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onViewHistory: (agentId: string, sessionId: string) => void;
  onSwitchToChat: (agentId: string, sessionId: string) => void;
  onGenerateSummary: (agentId: string, sessionId: string) => void;
  onDelete: (agentId: string, sessionId: string) => void;
  summaries: Record<string, string>;
  summaryGeneratingKey: string | null;
  onSelectionToggle: (sessionId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onConflictPolicyChange: (value: "skip" | "overwrite") => void;
  onImport: () => void;
  onExport: () => void;
  onRebuildIndex: () => void;
};

export function renderSessionManagement(props: SessionManagementShellProps) {
  const agents = props.agentsList?.agents ?? [];
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  const canPrev = props.page > 1;
  const canNext = props.page < totalPages;

  return html`
    <section class="card">
      <div class="session-mgmt-header">
        <div>
          <div class="card-title">${t("sessionManagement.title")}</div>
          <div class="card-sub">${t("sessionManagement.subtitle")}</div>
        </div>
        <div class="session-mgmt-toolbar">
          <div class="session-mgmt-conflict">
            <span class="muted">${t("sessionManagement.conflict")}:</span>
            <select
              .value=${props.conflictPolicy}
              ?disabled=${props.actionBusy}
              @change=${(e: Event) =>
                props.onConflictPolicyChange(
                  (e.target as HTMLSelectElement).value as "skip" | "overwrite",
                )}
            >
              <option value="skip">${t("sessionManagement.skipExisting")}</option>
              <option value="overwrite">${t("sessionManagement.overwrite")}</option>
            </select>
          </div>
          <button
            class="btn"
            ?disabled=${props.actionBusy || !props.connected}
            @click=${props.onImport}
            title=${t("sessionManagement.importTitle")}
          >
            ${t("sessionManagement.import")}
          </button>
          <button
            class="btn"
            ?disabled=${props.actionBusy || !props.connected || props.selectedIds.length === 0}
            @click=${props.onExport}
            title=${t("sessionManagement.exportTitle")}
          >
            ${t("sessionManagement.exportWithCount", { count: String(props.selectedIds.length) })}
          </button>
          <button
            class="btn"
            ?disabled=${props.actionBusy || !props.connected}
            @click=${props.onRebuildIndex}
          >
            ${t("sessionManagement.rebuildIndex")}
          </button>
          <button
            class="btn"
            ?disabled=${props.loading || !props.connected}
            @click=${props.onRefresh}
          >
            ${props.loading ? t("sessionManagement.loading") : t("common.refresh")}
          </button>
        </div>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field">
          <span>${t("sessionManagement.agent")}</span>
          <select
            .value=${props.selectedAgentId ?? ""}
            @change=${(event: Event) =>
              props.onAgentChange((event.target as HTMLSelectElement).value)}
          >
            ${agents.map(
              (agent) => html`<option value=${agent.id}>${agent.name?.trim() || agent.id}</option>`,
            )}
          </select>
        </label>
        <label class="field">
          <span>${t("sessionManagement.startDate")}</span>
          <input
            type="date"
            .value=${props.startDate}
            @change=${(event: Event) =>
              props.onStartDateChange((event.target as HTMLInputElement).value)}
          />
        </label>
        <label class="field">
          <span>${t("sessionManagement.endDate")}</span>
          <input
            type="date"
            .value=${props.endDate}
            @change=${(event: Event) =>
              props.onEndDateChange((event.target as HTMLInputElement).value)}
          />
        </label>
      </div>

      ${
        props.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
          : nothing
      }

      ${
        !props.connected
          ? html`
              <div class="muted" style="margin-top: 12px">${t("sessionManagement.connectHint")}</div>
            `
          : html`
            <div class="row" style="margin-bottom: 8px; gap: 8px;">
              <button
                class="btn btn--sm"
                ?disabled=${props.items.length === 0}
                @click=${props.onSelectAll}
              >
                ${t("sessionManagement.selectAll")}
              </button>
              <button
                class="btn btn--sm"
                ?disabled=${props.selectedIds.length === 0}
                @click=${props.onClearSelection}
              >
                ${t("sessionManagement.clearWithCount", {
                  count: String(props.selectedIds.length),
                })}
              </button>
            </div>
            <div class="session-mgmt-table-wrap" style="margin-top: 16px;">
              ${
                props.items.length === 0
                  ? html`
                      <div class="muted" style="padding: 12px">${t("sessionManagement.noSessions")}</div>
                    `
                  : html`
                      <table class="session-mgmt-table">
                        <thead>
                          <tr>
                            <th class="session-mgmt-col-check"></th>
                            <th class="session-mgmt-col-index">${t("sessionManagement.colIndex")}</th>
                            <th class="session-mgmt-col-time">${t("sessionManagement.colTime")}</th>
                            <th class="session-mgmt-col-summary">${t("sessionManagement.colSummary")}</th>
                            <th class="session-mgmt-col-id">${t("sessionManagement.colSessionId")}</th>
                            <th class="session-mgmt-col-actions">${t("sessionManagement.colActions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${props.items.map((row) =>
                            renderRow(
                              row,
                              props.selectedAgentId ?? "",
                              props.basePath,
                              props.selectedIds,
                              props.summaries,
                              props.summaryGeneratingKey,
                              props.onViewHistory,
                              props.onSwitchToChat,
                              props.onGenerateSummary,
                              props.onDelete,
                              props.onSelectionToggle,
                            ),
                          )}
                        </tbody>
                      </table>
                    `
              }
            </div>
            <div class="row" style="margin-top: 12px; gap: 8px; align-items: center; justify-content: flex-end;">
              <span class="muted"
                >${t("sessionManagement.paginationSummary", {
                  total: String(props.total),
                  page: String(props.page),
                  totalPages: String(totalPages),
                })}</span
              >
              <button
                class="btn"
                ?disabled=${!canPrev || props.loading}
                @click=${() => props.onPageChange(props.page - 1)}
              >
                ${t("sessionManagement.previous")}
              </button>
              <button
                class="btn"
                ?disabled=${!canNext || props.loading}
                @click=${() => props.onPageChange(props.page + 1)}
              >
                ${t("sessionManagement.next")}
              </button>
            </div>
          `
      }
    </section>
  `;
}

function renderRow(
  row: SessionHistoryListItem,
  agentId: string,
  basePath: string,
  selectedIds: string[],
  summaries: Record<string, string>,
  summaryGeneratingKey: string | null,
  onViewHistory: (agentId: string, sessionId: string) => void,
  onSwitchToChat: (agentId: string, sessionId: string) => void,
  onGenerateSummary: (agentId: string, sessionId: string) => void,
  onDelete: (agentId: string, sessionId: string) => void,
  onSelectionToggle: (sessionId: string) => void,
) {
  const chatUrl = pathForTab("historySession", basePath);
  const checked = selectedIds.includes(row.sessionId);
  const summaryKey = `${agentId}:${row.sessionId}`;
  const summary = summaries[summaryKey] ?? row.summary ?? "";
  const isGenerating = summaryGeneratingKey === summaryKey;
  return html`
    <tr class="session-mgmt-row">
      <td class="session-mgmt-col-check">
        <input
          type="checkbox"
          .checked=${checked}
          @change=${() => onSelectionToggle(row.sessionId)}
          title=${t("sessionManagement.selectForExport")}
        />
      </td>
      <td class="session-mgmt-col-index">${row.index}</td>
      <td class="session-mgmt-col-time">${formatMs(row.time)}</td>
      <td class="session-mgmt-col-summary" title=${summary && summary !== "—" ? summary : ""}>
        <span class="muted session-mgmt-summary-text" style="font-size: 12px;">${summary || "—"}</span>
      </td>
      <td class="session-mgmt-col-id">
        <a
          href=${chatUrl}
          class="session-link"
          title=${row.sessionId}
          @click=${(e: Event) => {
            e.preventDefault();
            onViewHistory(agentId, row.sessionId);
          }}
        >
          ${row.sessionId.length > 25 ? `${row.sessionId.slice(0, 25)}…` : row.sessionId}
        </a>
      </td>
      <td class="session-mgmt-col-actions">
        <button class="btn btn--sm" @click=${() => onViewHistory(agentId, row.sessionId)}>
          ${t("sessionManagement.viewHistory")}
        </button>
        <button class="btn btn--sm" @click=${() => onSwitchToChat(agentId, row.sessionId)}>
          ${t("sessionManagement.switchToChat")}
        </button>
        <button
          class="btn btn--sm"
          ?disabled=${isGenerating}
          @click=${() => onGenerateSummary(agentId, row.sessionId)}
        >
          ${isGenerating ? t("sessionManagement.generating") : t("sessionManagement.generateSummary")}
        </button>
        <button class="btn btn--sm" @click=${() => onDelete(agentId, row.sessionId)}>
          ${t("sessionManagement.delete")}
        </button>
      </td>
    </tr>
  `;
}
