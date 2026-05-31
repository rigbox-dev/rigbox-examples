# Scheduled Digest

A scheduled job runner built as a **single TypeScript process on Node 22** (run via
`tsx`). One process does two jobs at once: it runs a background interval loop and
serves an HTTP status page plus `/healthz` on `0.0.0.0:8080`.

## The capability this demonstrates

**A long-lived background worker whose `/healthz` stays green, configured by a
validated number param.** Every `INTERVAL_MINUTES` the worker appends a digest entry
(timestamp + a computed summary) to a log file at `$DATA_DIR/digest.log`. That log
lives under `DATA_DIR=/home/developer/data`, so the digest history **survives
redeploys** even though the synced app directory is wiped each time. The interval is
set through a server-validated `number` param, live-editable without a code change.

## Deploy

```bash
cd scheduled-digest && rig deploy
```

No env or secrets required. Install is just `npm install` (a couple of small dev
dependencies), so the build is fast.

## What to look at after deploy

- Open the app URL — the status page (auto-refreshes every 15s) shows the current
  **interval** as a pill, a **next-run countdown**, the **last run time**, and the
  most recent ~10 digest entries read back from the log file.
- Hit `GET /healthz` — returns `200` with JSON describing the last run
  (`runCount`, `lastRunAt`, `lastSummary`, `nextRunInSeconds`).
- Flip the schedule live without redeploying:

  ```bash
  rig app param set interval_minutes=1
  ```

  After the worker restarts it appends a new entry every minute; older entries from
  before the change remain in `digest.log` because the log is under `DATA_DIR`.

## Files

- `worker.ts` — the whole app: interval loop + HTTP server (status page + `/healthz`).
- `static/tokens.css` — byte-for-byte copy of the shared design tokens, served at
  `/tokens.css`.
- `rig.yaml` — single-app manifest with the `interval_minutes` number param.
