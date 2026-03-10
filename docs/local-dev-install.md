# Local Dev Install (myclaw)

This guide sets up a local `myclaw` command that points to this repo, with convenient `run`/`stop` shortcuts. Follow these steps on any new machine after cloning the repo.

## Prerequisites

- Node 22+ and npm
- Repo cloned to a local path (e.g. `~/cursor/openclaw`)
- `dist/` already built (`pnpm build`) or present from a previous build

## Steps

### 1. Register the `myclaw` bin

Add `myclaw` as an alias for the existing `openclaw` entry point in `package.json`:

```json
"bin": {
  "openclaw": "openclaw.mjs",
  "myclaw": "openclaw.mjs"
},
```

Then install globally from the repo root:

```bash
npm install -g .
```

Verify:

```bash
which myclaw
myclaw --version
```

### 2. Add shell shortcuts to `~/.zshrc`

Append the following to `~/.zshrc`:

```zsh
# myclaw shortcuts
myclaw() {
  case "$1" in
    run)
      nohup command myclaw gateway run > /tmp/myclaw-gateway.log 2>&1 &
      echo "myclaw gateway started (pid $!), log: /tmp/myclaw-gateway.log"
      (for i in $(seq 1 30); do
        nc -z 127.0.0.1 18789 2>/dev/null && open "http://127.0.0.1:18789/" && break
        sleep 1
      done) &
      ;;
    stop)
      pkill -9 -f openclaw-gateway && echo "myclaw gateway stopped" || echo "no running gateway found"
      ;;
    *)
      command myclaw "$@"
      ;;
  esac
}
```

Reload the shell:

```bash
source ~/.zshrc
```

## Usage

| Command        | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `myclaw run`   | Start gateway in background; auto-opens `http://127.0.0.1:18789/` once ready |
| `myclaw stop`  | Kill the running gateway process                                             |
| `myclaw <cmd>` | Pass-through to the normal `myclaw` / `openclaw` CLI                         |

Gateway log: `/tmp/myclaw-gateway.log`

## After pulling updates

If `dist/` changes (e.g. after `pnpm build`), the global install already points to the local files — no reinstall needed.

If `package.json` changes (e.g. new bin entries or deps), re-run:

```bash
npm install -g .
```
