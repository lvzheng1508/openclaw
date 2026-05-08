# myclaw 快捷命令迁移文档

目标：在任意新机器上快速拥有以下无参命令。

- `myclaw run`：后台启动 gateway，并自动尝试打开本地控制台
- `myclaw stop`：稳定停止 gateway（按端口 + 进程链）
- `myclaw status`：查看运行状态 + 最近日志
- `myclaw restart`：重启并等待端口就绪

---

## 1) 将函数加入 `~/.zshrc`

把下面整段复制到 `~/.zshrc`（建议放在文件末尾）：

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
      local pids
      command myclaw gateway stop >/dev/null 2>&1 || true
      pids=$(lsof -tiTCP:18789 -sTCP:LISTEN 2>/dev/null)
      if [ -n "$pids" ]; then
        kill $pids 2>/dev/null || true
        sleep 1
        kill -9 $pids 2>/dev/null || true
        pkill -f "myclaw gateway run" 2>/dev/null || true
        echo "myclaw gateway stopped"
      else
        pkill -f "myclaw gateway run" 2>/dev/null && echo "myclaw gateway stopped" || echo "no running gateway found"
      fi
      ;;
    status)
      local pids
      pids=$(lsof -tiTCP:18789 -sTCP:LISTEN 2>/dev/null)
      if [ -n "$pids" ]; then
        echo "myclaw gateway is running (pid: $pids, port: 18789)"
      else
        local boot_pids
        boot_pids=$(pgrep -f "myclaw gateway run|openclaw\\s*$" | tr '\n' ' ' | sed 's/[[:space:]]*$//')
        if [ -n "$boot_pids" ]; then
          echo "myclaw gateway is starting (pid: $boot_pids)"
        else
          echo "myclaw gateway is not running"
        fi
      fi
      if [ -f /tmp/myclaw-gateway.log ]; then
        echo "--- recent log ---"
        command tail -n 10 /tmp/myclaw-gateway.log
      fi
      ;;
    restart)
      myclaw stop
      sleep 1
      myclaw run
      for i in $(seq 1 30); do
        nc -z 127.0.0.1 18789 2>/dev/null && break
        sleep 1
      done
      myclaw status
      ;;
    ""|-h|--help)
      echo "usage: myclaw run|stop|status|restart|<openclaw args...>"
      ;;
    *)
      command myclaw "$@"
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

## 4) 设计说明（为什么这样写）

- `run` 使用 `nohup ... &`，保证关闭终端后进程仍在
- `stop` 优先按端口 `18789` 找 PID，避免“进程名不一致”导致停不掉
- `status` 同时判断“已监听”和“启动中（尚未监听）”
- `restart` 增加等待端口就绪，减少刚启动时误判

---

## 5) 常见问题

- `myclaw stop` 无效  
  先执行 `myclaw status` 看 PID；如果有残留可手工：
  `lsof -tiTCP:18789 -sTCP:LISTEN | xargs kill -9`

- `run` 后打不开网页  
  先看日志：`tail -n 50 /tmp/myclaw-gateway.log`

- 端口冲突  
  `lsof -nP -iTCP:18789 -sTCP:LISTEN` 查占用方
