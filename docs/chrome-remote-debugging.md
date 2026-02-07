# Chrome DevTools MCP when developing remotely (Chrome on local machine)

The Chrome DevTools MCP runs on the **remote** host. To use your **local** Chrome with it, use remote debugging + port forwarding.

## 1. Start Chrome locally with remote debugging

On your **local** machine, start Chrome with a debugging port (e.g. 9222):

- **macOS**:  
  `open -a "Google Chrome" --args --remote-debugging-port=9222`
- **Windows**:  
  `start chrome --remote-debugging-port=9222`
- **Linux**:  
  `google-chrome --remote-debugging-port=9222`

Leave this Chrome window open while you develop.

## 2. Forward port 9222 from remote to local

When you connect to the remote (SSH or Cursor Remote), make the remote’s `localhost:9222` point at your local Chrome.

**Option A – SSH with reverse port forward**

From your **local** machine:

```bash
ssh -R 9222:localhost:9222 user@your-remote-host
```

Then in Cursor, connect to the same host (or use the existing SSH session). The MCP on the remote will use `localhost:9222`, which is forwarded to your local Chrome.

**Option B – Cursor / VS Code Remote**

If you use “Remote - SSH” and don’t want to change your `ssh` command:

1. Add to your **local** `~/.ssh/config` for this host:

   ```
   Host your-remote-host
       RemoteForward 9222 localhost:9222
   ```

2. Reconnect to the remote. Port 9222 on the remote will be forwarded to `localhost:9222` on your machine (where Chrome is listening).

## 3. MCP config (already set)

Your `.cursor/mcp.json` is set to use the existing browser via:

```json
"--browserUrl=http://localhost:9222"
```

So the MCP does **not** try to launch Chrome on the remote; it connects to whatever is on `localhost:9222` on the remote, which (with the forward above) is your local Chrome.

## 4. Restart MCP after forwarding

After starting Chrome and establishing the port forward, restart the Chrome DevTools MCP (or reload Cursor) so it connects to `http://localhost:9222`.

## Quick check

- Local: Chrome running with `--remote-debugging-port=9222`.
- Local: SSH (or Cursor) connected with `-R 9222:localhost:9222` (or `RemoteForward 9222 localhost:9222`).
- Remote: MCP uses `--browserUrl=http://localhost:9222`.

Then the MCP on the remote will control your local Chrome.
