# Service and CLI workspace

[![Deploy to Rigbox](https://rigbox.dev/deploy.svg)](https://rigbox.dev/deploy?repo=rigbox-dev%2Frigbox-examples&ref=main&path=mixed-app%2Frig.yaml)

Deploy a Python HTTP service alongside the `workspace-info` command. Open the workspace terminal or SSH and run `workspace-info` after deployment.

Use the deploy button to fork this repository and create a workspace, or select an existing workspace and confirm root-filesystem replacement. Persistent volumes are retained.

For local CLI deployment, run `rig deploy` from this directory.

## Persistent app releases

The manifest uses `workspace.deployment.strategy: incremental`. Deployment stages app files separately from your editable checkout, then briefly restarts affected services on their original ports. The workspace, SSH sessions, and unrelated files stay in place. App rollback restores a retained release, not database contents or external side effects.
