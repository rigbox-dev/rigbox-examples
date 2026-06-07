# Junie — Rigbox example

Runs [**Junie**](https://www.jetbrains.com/junie/) — JetBrains' AI coding agent
— on Rigbox. You SSH in and run `junie`. Junie distinguishes itself with a
JetBrains-bundled binary that ships with the npm package, so the install pulls
a chunky postinstall archive — by baking it into a `FROM rigbox-base` image
once, every deploy avoids the slow re-download.

## The single capability: a heavy postinstall, frozen into the image

The whole point here is **freezing a slow install once** so deploys boot fast.
Junie's npm package runs a postinstall step that fetches a JetBrains-bundled
binary archive — easily 30–60 seconds on a fresh VM. The `Dockerfile` is
`FROM rigbox-base` (the required base — the platform asserts the rigbox agent
+ systemd are present and rejects any other base at build time) and bakes the
fully-installed CLI into the image once:

```dockerfile
FROM rigbox-base
RUN su - developer -s /bin/bash -c 'npm install -g --no-fund --silent @jetbrains/junie-cli'
RUN ln -sfn /home/developer/.npm-global/bin/junie /usr/local/bin/junie
```

`rig.yaml` points at it with a `build:` block (no `install:`):

```yaml
build:
  dockerfile: Dockerfile
```

## SSH-in to use it

Junie is a TUI — there is **no web UI**. The app is declared with `kind: cli`,
so `rig.yaml` carries no `port`, `start`, or `health` — the platform doesn't
expect an HTTP front door. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
junie
```

## Managed AI via a baked custom LLM profile

Junie ignores the generic `OPENAI_*` env, so the AI backend is a **custom LLM
profile**: the image bakes `~/.junie/models/rigbox.json` (OpenAI-compatible,
pointed at the managed proxy) and selects it at every shell start.

```jsonc
// ~/.junie/models/rigbox.json — filename (minus .json) is the profile id
{ "id": "anthropic/claude-sonnet-4.5", "baseUrl": "http://172.16.0.1:9090/v1",
  "apiType": "OpenAICompletion", "apiKey": "managed-by-rigbox" }
```

```sh
# /etc/profile.d/junie-routing.sh, sourced by every login shell
export JUNIE_MODEL="custom:rigbox"
```

## Deploy

```bash
cd junie && rig deploy
```

No secret required — `ai: managed: true` routes Junie through the workspace's
managed AI proxy (your account's AI mode must be `managed`, which is the
default).

## Notes

- **Persistence: yes.** `~/.local/share/junie` (the cached JetBrains-bundled
  binary + agent state) lives on the workspace disk, outside the rsync zone —
  durable across redeploys.
- **No public UI.** `kind: cli` means there's no HTTP front door at all — the
  workspace is reachable only via SSH on the rigbox gateway.
- **Disk: 4096MB.** Sized to comfortably hold the JetBrains-bundled archive
  Junie downloads on top of any project repo you check out.
