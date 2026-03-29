---
name: savechat
description: Archive current session to sessions.json so it appears in the session list. Use when the user says "savechat", "save chat", "保存对话", "归档对话", or wants to save/archive the current conversation before starting a new one.
---

# Save Chat

Archive the current session to sessions.json so it appears in the session list.

## Steps

1. Read the current session info from `~/.openclaw/agents/main/sessions/sessions.json` (key `agent:main:main`)
2. Extract: `sessionId`, `sessionFile`, `updatedAt`, `startedAt`, `model`, `channel`/`lastChannel`
3. Check if `agent:main:archived:<sessionId>` already exists in sessions.json — if so, reply that this session is already saved and do nothing further
4. Generate a display title from the session file: read the first user message from the `.jsonl` file and use first ~50 chars as title
5. Write an archived entry to sessions.json using key `agent:main:archived:<sessionId>` with:
   - `sessionId` — original session UUID
   - `title` — generated from first user message
   - `sessionFile` — path to the .jsonl (even if it gets .reset suffix later, the base path is useful)
   - `updatedAt` — original timestamp
   - `startedAt` — original timestamp
   - `model` — model used
   - `channel` — channel (e.g. webchat)
   - `status`: "archived"
6. Reply to the user confirming the archive is done, and remind them to run `/new` if they want to start a fresh conversation

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
