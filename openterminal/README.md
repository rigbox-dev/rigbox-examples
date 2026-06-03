# Open Terminal — Rigbox example

[Open Terminal](https://pypi.org/project/open-terminal/) is a sandboxed REST API
for running shell commands and managing files inside a Linux workspace — built
for AI agents and remote tooling that need a safe `/execute` endpoint instead of
raw SSH. This example runs the upstream Python package on Rigbox unchanged.

## The single capability: run Open Terminal reproducibly with a generated API key

This isn't a toy app we wrote — it's a real off-the-shelf product running on
the platform. What it demonstrates is the **reproducible Docker build plus
Rigbox-managed credentials**: the `Dockerfile` pip-installs `open-terminal` into
a venv at `/opt/openterminal` once, frozen into the image, and `rig.yaml` asks
Rigbox to generate an API key on first deploy:

```yaml
credentials:
  api_key:
    generate: true   # → injected as CRED_API_KEY
```

On boot, `start.sh` writes `$CRED_API_KEY` into `~/.config/open-terminal/config.toml`
and exec's `open-terminal run`. The key is stable across redeploys and shown
once in the deploy output — save it; you'll need it on every `Authorization: Bearer …`
request.

## Using it

```bash
# Run a shell command inside the sandbox
curl -X POST "https://<subdomain>.rigbox.dev/execute" \
  -H "Authorization: Bearer $CRED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"command": "echo hello && whoami"}'

# Write a file
curl -X POST "https://<subdomain>.rigbox.dev/files/write" \
  -H "Authorization: Bearer $CRED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"path": "/home/developer/hello.py", "content": "print(\"hi\")"}'
```

The `working_directory` param (default `/home/developer`) clamps the path the
API can read/write — patch it from the workspace UI and redeploy isn't needed.

## Deploy

```bash
cd openterminal && rig deploy
```
