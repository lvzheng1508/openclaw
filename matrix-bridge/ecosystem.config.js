module.exports = {
  apps: [
    {
      name: "bridge-01",
      script: "./bridge.js",
      env: {
        BRIDGE_PORT: 3001,
        OPENCLAW_WEBHOOK: "http://localhost:18789/api/webhook/incoming",
        // Using Wechaty Web Protocol (Free but unstable) for Demo
        // For production, use 'wechaty-puppet-padlocal' and provide a token
        WECHATY_PUPPET: "wechaty-puppet-wechat",
        WECHATY_PUPPET_TOKEN: "",
      },
    },
    {
      name: "claw-01",
      // Assuming 'openclaw' command is available globally or adjust path
      script: "openclaw",
      args: "gateway --port 18789",
      env: {
        // Isolate storage for this instance
        OPENCLAW_HOME: "./data/bot_01",
      },
    },
    // Example for a second account
    /*
    {
      name: "bridge-02",
      script: "./bridge.js",
      env: {
        BRIDGE_PORT: 3002,
        OPENCLAW_WEBHOOK: "http://localhost:18790/api/webhook/incoming",
        WECHATY_PUPPET: "wechaty-puppet-padlocal",
        WECHATY_PUPPET_TOKEN: "your_pad_token_here"
      }
    },
    {
      name: "claw-02",
      script: "openclaw",
      args: "gateway --port 18790",
      env: {
        OPENCLAW_HOME: "./data/bot_02"
      }
    }
    */
  ],
};
