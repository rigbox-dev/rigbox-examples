# Multi-app workspace

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=multi-app%2Frig.yaml)

Deploy two independent Python HTTP services on ports 8080 and 8081 in one workspace.

Use the deploy button to fork this repository and create a workspace, or select an existing workspace and confirm root-filesystem replacement. Persistent volumes are retained.

For local CLI deployment, run `rig deploy` from this directory.

## Persistent app releases

The manifest uses `workspace.deployment.strategy: incremental`. Deployment stages app files separately from your editable checkout, then briefly restarts affected services on their original ports. The workspace, SSH sessions, and unrelated files stay in place. App rollback restores a retained release, not database contents or external side effects.
