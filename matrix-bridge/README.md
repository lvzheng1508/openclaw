# OpenClaw Matrix Bridge (Personal WeChat Integration)

This creates a bridge between Personal WeChat (via [Wechaty](https://wechaty.js.org/)) and OpenClaw, allowing OpenClaw to control personal WeChat accounts.

## Architecture

```
[ WeChat App ] <--> [ Wechaty Bridge (Node.js) ] <--> [ OpenClaw Gateway ] <--> [ LLM ]
```

1.  **Wechaty Bridge**:
    - Logs into WeChat (iPad/Web protocol).
    - Forwards incoming messages to OpenClaw via Webhook.
    - Exposes an HTTP server (`POST /send`) for OpenClaw to send replies.
2.  **OpenClaw**:
    - Processes the message as a standard chat event.
    - Executes Agent logic / Tools.
    - Sends reply commands back to the Bridge.

## Quick Start

### 1. Installation

```bash
cd matrix-bridge
npm install
```

### 2. Configuration

Edit `ecosystem.config.js` to configure your bots.

- **bridge-01**: The Wechaty process. set `WECHATY_PUPPET` and `TOKEN`.
- **claw-01**: The OpenClaw process. set `OPENCLAW_HOME` for data isolation.

### 3. Run

Requires [PM2](https://pm2.keymetrics.io/) installed (`npm install -g pm2`).

```bash
pm2 start ecosystem.config.js
```

### 4. Scan QR Code

Check the logs to see the QR code for login:

```bash
pm2 logs bridge-01
```

## Important Notes

- **Protocol Choice**: The default config uses `wechaty-puppet-wechat` (Web Protocol), which is free but **highly likely to be blocked** by WeChat or not support new accounts. For production stability, you **MUST** purchase a Token for `wechaty-puppet-padlocal` or `wechaty-puppet-gewechat`.
- **Multi-Account**: Uncomment the `bridge-02` / `claw-02` sections in `ecosystem.config.js` to add more accounts.
