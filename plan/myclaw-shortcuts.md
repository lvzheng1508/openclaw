# myclaw 快捷命令文档

目标：在任意新机器上快速拥有以下无参命令。

- `myclaw run`：后台启动 gateway，并自动尝试打开本地控制台
- `myclaw stop`：稳定停止 gateway（按端口 + 进程链）
- `myclaw status`：查看运行状态 + 最近日志
- `myclaw restart`：重启并等待端口就绪

> **前提**：已通过 npm 全局安装 openclaw（见第 5 节）

---

## 1) 将函数加入 `~/.zshrc`

把下面整段复制到 `~/.zshrc`（建议放在文件末尾）：

```zsh
# myclaw shortcuts
myclaw() {
  local gateway_port="${MYCLAW_GATEWAY_PORT:-18789}"

  case "$1" in
    run)
      nohup openclaw gateway > ~/.openclaw/gateway.log 2>&1 &
      echo "myclaw gateway started (pid $!), log: ~/.openclaw/gateway.log"
      (for i in $(seq 1 30); do
        nc -z 127.0.0.1 "$gateway_port" 2>/dev/null && open "http://127.0.0.1:${gateway_port}/" && break
        sleep 1
      done) &
      ;;
    stop)
      local pids pid
      # launchd-managed installs only; nohup foreground runs ignore this.
      openclaw gateway stop >/dev/null 2>&1 || true

      pids=$(lsof -tiTCP:"$gateway_port" -sTCP:LISTEN 2>/dev/null)
      if [ -n "$pids" ]; then
        for pid in ${(f)pids}; do
          kill "$pid" 2>/dev/null || true
        done
        sleep 1
        pids=$(lsof -tiTCP:"$gateway_port" -sTCP:LISTEN 2>/dev/null)
        if [ -n "$pids" ]; then
          for pid in ${(f)pids}; do
            kill -9 "$pid" 2>/dev/null || true
          done
        fi
      fi

      pkill -f "openclaw gateway" 2>/dev/null || true
      sleep 1

      if lsof -tiTCP:"$gateway_port" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "myclaw gateway still listening on port ${gateway_port}"
        echo "try: lsof -tiTCP:${gateway_port} -sTCP:LISTEN | xargs kill -9"
        return 1
      fi
      if pgrep -f "openclaw gateway" >/dev/null 2>&1; then
        echo "myclaw gateway processes still running"
        echo "try: pkill -9 -f 'openclaw gateway'"
        return 1
      fi
      echo "myclaw gateway stopped"
      ;;
    status)
      local pids boot_pids
      pids=$(lsof -tiTCP:"$gateway_port" -sTCP:LISTEN 2>/dev/null)
      if [ -n "$pids" ]; then
        echo "myclaw gateway is running (pid: $pids, port: ${gateway_port})"
      else
        boot_pids=$(pgrep -f "openclaw gateway" | tr '\n' ' ' | sed 's/[[:space:]]*$//')
        if [ -n "$boot_pids" ]; then
          echo "myclaw gateway is starting (pid: $boot_pids)"
        else
          echo "myclaw gateway is not running"
        fi
      fi
      if [ -f ~/.openclaw/gateway.log ]; then
        echo "--- recent log ---"
        tail -n 10 ~/.openclaw/gateway.log
      fi
      ;;
    restart)
      myclaw stop || true
      sleep 1
      myclaw run
      for i in $(seq 1 30); do
        nc -z 127.0.0.1 "$gateway_port" 2>/dev/null && break
        sleep 1
      done
      myclaw status
      ;;
    ""|-h|--help)
      echo "usage: myclaw run|stop|status|restart|<openclaw args...>"
      ;;
    *)
      openclaw "$@"
      ;;
  esac
}
```

---

## 2) 立即生效

注意：每次修改完 `~/.zshrc` 后，当前终端不会自动加载新函数，必须执行下面命令，或者直接新开一个终端窗口。

```zsh
source ~/.zshrc
```

---

## 3) 验证

```zsh
myclaw run
myclaw status
myclaw stop
myclaw status
```

预期：

- `run` 后看到 `myclaw gateway started ...`
- `status` 显示 running 或 starting
- `stop` 后显示 `myclaw gateway stopped`
- 最后 `status` 显示 `not running`

---

## 4) 升级与回滚

### 升级到最新稳定版

```zsh
# 方式一：官方升级命令（推荐）
openclaw update

# 方式二：手动 npm 升级
npm update -g openclaw@latest

# 升级后建议运行健康检查
openclaw doctor
```

### 切换发布频道

```zsh
openclaw update --channel stable   # 稳定版（默认）
openclaw update --channel beta     # 测试版
openclaw update --channel dev      # 开发版（最前沿）
```

### 回滚到指定版本

```zsh
# 查看所有可用历史版本
npm view openclaw versions

# 降级到指定版本（例如）
npm install -g openclaw@2026.5.14

# 回滚后重启
myclaw restart
```

---

## 5) 安装（标准全局安装方式）

> 运行环境：Node 22+ 或 Node 24（推荐）

```zsh
npm install -g openclaw@latest

# 验证安装
openclaw doctor
```

数据工作区默认在 `~/.openclaw`，包含聊天历史、渠道配置、Skills 等所有状态，全局安装会自动继承，无需重新配置。

---

## 6) 设计说明（为什么这样写）

- `run` 使用 `nohup ... &`，保证关闭终端后进程仍在
- 日志写入 `~/.openclaw/gateway.log`，重启 Mac 不会丢失（避免 `/tmp` 被清空）
- `stop` 优先按端口 `18789` 找 PID，避免"进程名不一致"导致停不掉
- `status` 同时判断"已监听"和"启动中（尚未监听）"
- `restart` 增加等待端口就绪，减少刚启动时误判
- `myclaw <其他参数>` 会直接透传给 `openclaw`，无需额外记命令

---

## 7) 常见问题

- `myclaw stop` 无效  
  先执行 `myclaw status` 看 PID；若仍残留可手工：

  ```zsh
  lsof -tiTCP:18789 -sTCP:LISTEN | xargs kill -9
  pkill -9 -f 'openclaw gateway'
  ```

- `run` 后打不开网页  
  先看日志：`tail -n 50 ~/.openclaw/gateway.log`

- 端口冲突  
  `lsof -nP -iTCP:18789 -sTCP:LISTEN` 查占用方
