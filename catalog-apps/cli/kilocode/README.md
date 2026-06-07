# Kilo Code — Rigbox example

Runs [**Kilo Code**](https://kilocode.ai) — an all-in-one AI coding CLI that
fronts 100+ providers behind one binary — on Rigbox. You SSH in and run
`kilocode`. Kilo CLI 1.0 is an [OpenCode](https://opencode.ai) fork, so its
provider, base URL, key, and model live in a config file — the image bakes one
pointed at Rigbox's **managed AI proxy**, with no API key to set.

## The single capability: a multi-provider agent, zero-key managed AI

The whole point here is **running a provider-agnostic AI CLI** wired up at
image-build time so a fresh SSH session is immediately ready. The `Dockerfile`
is `FROM rigbox-base` (the required base — the platform asserts the rigbox
agent + systemd are present and rejects any other base at build time), bakes
the npm-published CLI into the image, and drops a config file that points Kilo
at the workspace's managed AI proxy:

```dockerfile
FROM rigbox-base
RUN su - developer -s /bin/bash -c 'npm install -g --no-fund --silent @kilocode/cli'
RUN ln -sfn /home/developer/.npm-global/bin/kilocode /usr/local/bin/kilocode
```

`rig.yaml` points at it with a `build:` block (no `install:`):

```yaml
build:
  dockerfile: Dockerfile
```

## SSH-in to use it

Kilo Code is a TUI — there is **no web UI**. The app is declared with
`kind: cli`, so `rig.yaml` carries no `port`, `start`, or `health` — the
platform doesn't expect an HTTP front door. The real UX is SSH:

```bash
ssh "$(rig workspace ssh-info --workspace <name-or-id> --output json | jq -r .ssh_target)"
kilocode
```

## Managed AI via a baked provider config

Kilo CLI 1.0 (an OpenCode fork) configures providers in a file, not env vars —
the pre-1.0 `KILO_PROVIDER_TYPE` / `KILO_OPEN_ROUTER_API_KEY` vars no longer
exist. The image bakes `~/.config/kilo/opencode.json` with an
`openai-compatible` provider pointed at the managed proxy:

```jsonc
{
  "model": "openai-compatible/anthropic/claude-sonnet-4.5",
  "provider": {
    "openai-compatible": {
      "options": { "baseURL": "http://172.16.0.1:9090/v1", "apiKey": "managed-by-rigbox" }
    }
  }
}
```

`/etc/profile.d/kilocode-routing.sh` just exports `KILO_PROVIDER=openai-compatible`
so a stray interactive selection can't shadow the baked provider.

## Deploy

```bash
cd kilocode && rig deploy
```

No secret required — `ai: managed: true` routes Kilo through the workspace's
managed AI proxy (your account's AI mode must be `managed`, which is the
default).

## Notes

- **Persistence: yes.** `~/.local/share/kilo` (session state, project config)
  lives on the workspace disk, outside the rsync zone — durable across
  redeploys.
- **No public UI.** `kind: cli` means there's no HTTP front door at all — the
  workspace is reachable only via SSH on the rigbox gateway.
- **Pinned at image-build time.** The baked `opencode.json` selects the managed
  proxy and model; edit it (or drop a project-level `opencode.json`) to point
  Kilo at a different provider or model.
