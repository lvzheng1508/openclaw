#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const procs = [];

function run(label, cmd, args, env) {
  const child = spawn(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  procs.push({ label, child });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.exitCode = 1;
      return;
    }
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });
  return child;
}

function shutdown(signal = "SIGTERM") {
  for (const { child } of procs) {
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  }
}

process.on("SIGINT", () => {
  shutdown("SIGTERM");
  process.exit(130);
});
process.on("SIGTERM", () => {
  shutdown("SIGTERM");
  process.exit(143);
});

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Gateway: watch + hot-restart on src changes (uses dev profile by default).
run("gateway", "pnpm", ["gateway:watch"], {
  OPENCLAW_PROFILE: "dev",
  CLAWDBOT_PROFILE: "dev",
});

// UI: Vite dev server (proxy/ports configured in ui/).
run("ui", "pnpm", ["ui:dev"]);
