# rigbox-examples

Tiny apps that demonstrate Rigbox's `rig.yaml` surface end to end. Each one is deployable with a single command from inside the example directory:

```bash
cd <example>
rig app deploy --workspace <your-workspace>
```

## Examples

### [`ai-chat/`](./ai-chat/)

FastAPI passthrough chat against an OpenAI-compatible endpoint, demonstrating the `ai: managed: true` block. The CLI injects `OPENAI_BASE_URL` + `OPENAI_API_KEY=managed-by-rigbox` into the systemd unit's env, so the same source code routes through the managed proxy without any proxy-specific code.

```yaml
ai:
  managed: true
```

### [`sample-node-app/`](./sample-node-app/)

Minimal Node.js HTTP server that exercises the basic `rig app deploy` flow (no managed AI, no blue-green, no custom domain). Reference for the smallest valid `rig.yaml`.

## Layout convention

Each example directory is self-contained:

```
<example>/
  rig.yaml      # what gets deployed
  <source>      # one or more source files
  README.md     # what it does and why it's here
```

`rig.yaml`'s `install:` block installs whatever runtime the example needs (FastAPI, Node, etc.). No extra `package.json` / `requirements.txt` needed — keeping examples deliberately single-purpose so the file you read top-to-bottom is the whole picture.

## Live verification

These samples are also smoke-tested against `api.rigbox.dev` during PR review (see commit messages). If you're adding a new example, include the deploy + curl invocation that proved it works.
