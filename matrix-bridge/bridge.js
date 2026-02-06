const { WechatyBuilder } = require("wechaty");
const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const qrcodeTerminal = require("qrcode-terminal");

// Configuration
const CONFIG = {
  // OpenClaw Gateway Config
  OPENCLAW_WEBHOOK: process.env.OPENCLAW_WEBHOOK || "http://localhost:18789/api/webhook/incoming",
  BRIDGE_PORT: process.env.BRIDGE_PORT || 3000,

  // Wechaty Config (Default to Wechaty Web Protocol for testing, change to PadLocal for production)
  PUPPET: process.env.WECHATY_PUPPET || "wechaty-puppet-wechat",
  PUPPET_TOKEN: process.env.WECHATY_PUPPET_TOKEN || "",

  // Security
  API_KEY: process.env.BRIDGE_API_KEY || "default_secret_key",
};

// --- Part 1: Wechaty Bot ---

const bot = WechatyBuilder.build({
  name: "my-wechat-bot",
  puppet: CONFIG.PUPPET,
  puppetOptions: {
    token: CONFIG.PUPPET_TOKEN,
  },
});

bot.on("scan", (qrcode, status) => {
  console.log(
    `Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`,
  );
  qrcodeTerminal.generate(qrcode, { small: true });
});

bot.on("login", (user) => {
  console.log(`User ${user} logged in`);
});

bot.on("message", async (msg) => {
  // Filter out self-messages and system messages
  if (msg.self()) return;
  if (msg.type() !== bot.Message.Type.Text) return; // Currently only robustly support text

  const contact = msg.talker();
  const room = msg.room();

  // Context ID: Direct message uses contact ID, Group message uses Room ID
  const contextId = room ? room.id : contact.id;
  const senderName = contact.name();
  const contextName = room ? await room.topic() : senderName;

  console.log(`Received message from ${senderName}: ${msg.text()}`);

  try {
    // Forward to OpenClaw
    await axios.post(CONFIG.OPENCLAW_WEBHOOK, {
      id: msg.id, // Message ID
      text: msg.text(), // Content
      sender: {
        id: contact.id,
        name: senderName,
      },
      context: {
        id: contextId,
        name: contextName,
        isGroup: !!room,
      },
      bridgePort: CONFIG.BRIDGE_PORT, // Tell OpenClaw how to reply back (optional metadata)
    });
  } catch (error) {
    console.error("Failed to forward message to OpenClaw:", error.message);
  }
});

// --- Part 2: HTTP Server for Replies ---

const app = express();
app.use(bodyParser.json());

// Endpoint for OpenClaw to call back
// Expected body: { "contextId": "...", "text": "..." }
app.post("/send", async (req, res) => {
  const { contextId, text, apiKey } = req.body;

  if (apiKey && apiKey !== CONFIG.API_KEY) {
    return res.status(403).json({ error: "Invalid API Key" });
  }

  if (!contextId || !text) {
    return res.status(400).json({ error: "Missing contextId or text" });
  }

  try {
    // Determine if it's a contact or a room
    // Note: This is a simplified logic. In production, you might want to store type mappings.
    let target = await bot.Contact.find({ id: contextId });
    if (!target) {
      target = await bot.Room.find({ id: contextId });
    }

    if (target) {
      await target.say(text);
      console.log(`Sent reply to ${contextId}: ${text}`);
      return res.json({ success: true });
    } else {
      console.error(`Target not found: ${contextId}`);
      return res.status(404).json({ error: "Target contact/room not found" });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Start services
(async () => {
  await bot.start();
  app.listen(CONFIG.BRIDGE_PORT, () => {
    console.log(`Bridge Server listening on port ${CONFIG.BRIDGE_PORT}`);
    console.log(`Webhook target: ${CONFIG.OPENCLAW_WEBHOOK}`);
  });
})();
