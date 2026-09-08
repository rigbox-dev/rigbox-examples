# n8n — Rigbox example

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=n8n%2Frig.yaml)

[n8n](https://n8n.io) is the well-known self-hosted **workflow-automation**
product: a visual editor where you wire up triggers, app integrations, and
code nodes into automations that run on a schedule or webhook. This example
runs the real, unmodified n8n on Rigbox — the app UI is n8n's own, not the
shared example design language.

## Persistent app releases

This manifest uses `workspace.deployment.strategy: incremental`. n8n 2.22.6 is pinned in `package.json` and its lockfile. Dependencies install inside the managed release, without sudo or a global npm install. The workspace and SSH sessions remain in place when the app updates.

`start.sh` puts n8n user data in Rigbox's persistent `RIGBOX_APP_DATA_DIR`, outside the release directory. Keep at least the declared 2GiB RAM and 8GiB disk; the first dependency installation can still take several minutes. App rollback does not reverse n8n database migrations. Existing image-based deployments need a separate reviewed migration and data handoff; this manifest does not automatically import `/home/developer/data`.

## Deploy and verify

```bash
cd n8n && rig deploy
```

Open the n8n app URL, create the owner account, and add a workflow. Deploy again and verify the workflow remains available. n8n listens on port 8080; Rigbox checks `/healthz` with a 120-second startup timeout. Its SQLite database and encryption key live under the persistent user folder, so preserve that folder when performing any separate workspace migration.
