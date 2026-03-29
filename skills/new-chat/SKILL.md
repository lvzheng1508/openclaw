---
name: new-chat
description: Archive current session and start a new chat. Use when the user says "newchat", "new chat", "开新对话", "新对话", or wants to save the current conversation and start fresh.
---

# New Chat

Archive the current session to sessions.json and start a new conversation.

## Steps

1. Read the current session info from `~/.openclaw/agents/main/sessions/sessions.json` (key `agent:main:main`)
2. Extract: `sessionId`, `sessionFile`, `updatedAt`, `startedAt`, `model`, `channel`/`lastChannel`
3. Generate a display title from the session file: read the first user message from the `.jsonl` file and use first ~50 chars as title
4. Write an archived entry to sessions.json using key `agent:main:archived:<sessionId>` with:
   - `sessionId` — original session UUID
   - `title` — generated from first user message
   - `sessionFile` — path to the .jsonl (even if it gets .reset suffix later, the base path is useful)
   - `updatedAt` — original timestamp
   - `startedAt` — original timestamp
   - `model` — model used
   - `channel` — channel (e.g. webchat)
   - `status`: "archived"
5. Execute `/new` to reset the conversation

## sessions.json Format

The archived entry should follow this minimal structure:

```json
{
  "agent:main:archived:<sessionId>": {
    "sessionId": "<uuid>",
    "title": "<first user message truncated>",
    "updatedAt": 1234567890,
    "startedAt": 1234567890,
    "model": "model-name",
    "channel": "webchat",
    "status": "archived",
    "sessionFile": "/path/to/session.jsonl"
  }
}
```

## Notes

- Do NOT overwrite the `agent:main:main` key — only add a new archived key
- If there's no meaningful first user message (e.g. heartbeat), use "Untitled" as title
- Keep the archived entries lightweight — the full conversation history lives in the .jsonl files
