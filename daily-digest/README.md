# daily-digest

A **scheduled worker** — the canonical "background loop on an interval" shape, the simplest possible answer to "I want this to run every N seconds/minutes/hours."

The work is a background loop; the HTTP surface exists only because the platform health-checks every app. This file pattern (worker + `/healthz`) is how every non-HTTP service ends up looking on Rigbox.

## What it shows

- **The background-worker shape** — the *real* job is a `setInterval` writing to `/home/developer/data/digest.log`. No HTTP requests drive it.
- **Why workers still declare `port:`** — every Rigbox app is health-checked. The worker mounts a 30-line HTTP surface that returns 200 on `/healthz` and shows the last 50 log lines on `/`.
- **State outside the rsync zone** — the log lives in `/home/developer/data/`, not `<DEPLOY_ROOT>/<slug>/`, so it accumulates across redeploys.
- **`params:` for schedule tuning** — `tick_seconds` defaults to 60 but you can crank it to 5 for a live demo or 86400 for a real daily cadence.

## Deploy

`rig deploy` reads the top-level `rig.yaml`, spawns a fresh workspace (or
reuses the one recorded in `.rig.lock`), and installs the app:

```bash
cd daily-digest
rig deploy
```

Deploy prints the workspace name and the app URL, e.g.:

```
✓ Deployed!
  Workspace: upbeat-sloth
  • daily-digest  →  https://daily-digest-<workspace-id>.rigbox.dev  (active)
```

Watch it tick:

```bash
DIGEST=https://daily-digest-<workspace-id>.rigbox.dev
curl "$DIGEST"     # shows label, interval, tick count, and the last 50 lines
```

The app is private by default, so curling the public URL unauthenticated
returns a 302 to the login page. Use `rig app logs --app daily-digest` to
watch ticks fire, or SSH in (below) to hit `http://localhost:5101` directly.

After 60 seconds with the default interval you'll see a second tick. Set
`tick_seconds=5` for faster feedback:

```bash
rig app param set --app daily-digest tick_seconds=5
rig app restart --app daily-digest   # restart picks up the new env value
```

The worker then resumes ticking on the new schedule. (`rig.yaml` is the
source of truth — a later `rig deploy` resets params to their defaults.)

## Inspect the raw log

The log file persists across redeploys because it lives outside the working directory. SSH in to read it directly:

```bash
ssh "$(rig workspace ssh-info --workspace <ws> --output json | jq -r .ssh_target)" \
  -- cat /home/developer/data/digest.log
```

## Real cron semantics

`setInterval(tick, N)` is wall-clock relative to process start, not aligned to clock-of-day. For "midnight UTC every day" semantics, the worker would compute `delay = nextMidnightMs - Date.now()` on each tick and use `setTimeout`. Out of scope for this example — the lesson is the **shape** (background loop + `/healthz`), not the scheduling algorithm.

## Layout

```
daily-digest/
├── rig.yaml         # port 5101, params: tick_seconds + log_label
├── digest.js        # setInterval + minimal HTTP surface
└── README.md
```

## Requirements

Latest CLI (v0.12.20+):

```bash
curl -fsSL https://rigbox.dev/install.sh | bash
```
