---
name: savechat
description: Archive current session to sessions.json so it appears in the session list. Use when the user says "savechat", "save chat", "保存对话", "归档对话", or wants to save/archive the current conversation before starting a new one.
---

# Save Chat

Archive the current session so it appears in the session list and retains full conversation history.

## Prerequisite

This skill only works in the **main session** (`agent:main:main`). If the current session key is not `agent:main:main`, reply that savechat is only available in the main session and do nothing further.

## Steps

1. Read the current session info from `~/.openclaw/agents/main/sessions/sessions.json` (key `agent:main:main`)
2. Extract: `sessionId`, `sessionFile`, `updatedAt`, `startedAt`, `model`, `channel`/`lastChannel`
3. Check if `agent:main:archived:<sessionId>` already exists in sessions.json — if so, reply that this session is already saved and do nothing further
4. Generate a display title from the session file: read the first user message from the `.jsonl` file and use first ~50 chars as title
5. Generate a new session UUID for the archived session (e.g. `python3 -c "import uuid; print(uuid.uuid4())"`)
6. Copy the current `.jsonl` session file to a new file with the new UUID:
   ```
   cp <current-session.jsonl> ~/.openclaw/agents/main/sessions/<new-uuid>.jsonl
   ```
   This preserves the full conversation history so that when the user switches back to this session, the context is intact.
7. Write an archived entry to sessions.json using key `agent:main:archived:<new-uuid>` with:
   - `sessionId` — the new UUID
   - `title` — generated from first user message
   - `sessionFile` — path to the new `.jsonl` file
   - `updatedAt` — original timestamp
   - `startedAt` — original timestamp
   - `model` — model used
   - `channel` — channel (e.g. webchat)
   - `status`: "archived"
8. Reply to the user confirming the archive is done, and remind them to run `/new` if they want to start a fresh conversation

## sessions.json Format

The archived entry should follow this minimal structure:

```json
{
  "agent:main:archived:<new-uuid>": {
    "sessionId": "<new-uuid>",
    "title": "<first user message truncated>",
    "updatedAt": 1234567890,
    "startedAt": 1234567890,
    "model": "model-name",
    "channel": "webchat",
    "status": "archived",
    "sessionFile": "~/.openclaw/agents/main/sessions/<new-uuid>.jsonl"
  }
}
```

## Notes

- Do NOT overwrite the `agent:main:main` key — only add a new archived key
- If there's no meaningful first user message (e.g. heartbeat), use "Untitled" as title
- **Always copy the full `.jsonl` content** to the new session file — this ensures conversation history is preserved when switching back
- The original session file (`agent:main:main`) is left untouched — `/new` will handle resetting it
