import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { renderMessageGroup } from "../chat/grouped-render.ts";
import { normalizeMessage, normalizeRoleForGrouping } from "../chat/message-normalizer.ts";
import { pathForTab } from "../navigation.ts";
import type { MessageGroup } from "../types/chat-types.ts";

export type HistorySessionShellProps = {
  loading: boolean;
  error: string | null;
  agentId: string | null;
  sessionId: string | null;
  transcript: unknown[];
  basePath: string;
  onBack: () => void;
  onSwitchToChat: () => void;
};

function buildTranscriptItems(transcript: unknown[]): Array<{ kind: "group"; item: MessageGroup }> {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (let i = 0; i < transcript.length; i++) {
    const msg = transcript[i];
    const normalized = normalizeMessage(msg);
    const role = normalizeRoleForGrouping(normalized.role);
    const timestamp = normalized.timestamp || Date.now();
    const key = `msg:${i}`;

    if (!currentGroup || currentGroup.role !== role) {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        kind: "group",
        key: `group:${role}:${key}`,
        role,
        messages: [{ message: msg, key }],
        timestamp,
        isStreaming: false,
      };
    } else {
      currentGroup.messages.push({ message: msg, key });
    }
  }
  if (currentGroup) {
    groups.push(currentGroup);
  }
  return groups.map((item) => ({ kind: "group" as const, item }));
}

export function renderHistorySession(props: HistorySessionShellProps) {
  const backUrl = pathForTab("sessionManagement", props.basePath);
  const items = buildTranscriptItems(props.transcript ?? []);

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="card-title">${t("historySession.title")}</div>
          <div class="card-sub">${t("historySession.subtitle")}</div>
        </div>
        <div class="row" style="gap: 8px;">
          <a href=${backUrl} class="btn" @click=${(e: Event) => {
            e.preventDefault();
            props.onBack();
          }}>
            ${t("historySession.backToList")}
          </a>
          <button
            class="btn primary"
            ?disabled=${!props.agentId || !props.sessionId || props.loading}
            @click=${props.onSwitchToChat}
          >
            ${t("historySession.switchToChat")}
          </button>
        </div>
      </div>

      ${
        props.error
          ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
          : nothing
      }

      <div class="row" style="margin-top: 14px; gap: 12px; flex-wrap: wrap;">
        <div class="pill">
          <span>${t("historySession.agent")}</span>
          <span class="mono">${props.agentId ?? t("common.na")}</span>
        </div>
        <div class="pill">
          <span>${t("historySession.session")}</span>
          <span class="mono">${props.sessionId ?? t("common.na")}</span>
        </div>
        <div class="pill">
          <span>${t("historySession.status")}</span>
          <span>${props.loading ? t("historySession.loading") : t("historySession.idle")}</span>
        </div>
      </div>

      <div class="chat-thread" role="log" style="margin-top: 16px; max-height: 60vh; overflow-y: auto;">
        ${
          props.loading
            ? html`
                <div class="muted">${t("historySession.loadingTranscript")}</div>
              `
            : items.length === 0
              ? html`
                  <div class="muted">${t("historySession.noMessages")}</div>
                `
              : items.map(({ item }) =>
                  renderMessageGroup(item, {
                    onOpenSidebar: undefined,
                    showReasoning: true,
                    assistantName: "Assistant",
                    assistantAvatar: null,
                  }),
                )
        }
      </div>
    </section>
  `;
}
