# Local tunnel

Expose a small HTTP service running on your laptop through a Rigbox HTTPS URL.
This example demonstrates a foreground tunnel: it uses Python's standard library,
binds only `127.0.0.1`, and has no deployment manifest or dependencies to install.

This example accompanies the privately developed tunnel feature. It requires the
matching CLI and an enabled Rigbox tunnel service; customer availability waits
for the release security and reliability checks.

In one terminal:

```bash
cd local-tunnel
python3 server.py --port 3000
```

In another terminal, sign in and start the private tunnel:

```bash
rig login
rig tunnel --port 3000
```

Review the first-use warning and open the HTTPS URL printed after the connector
is ready. Sign in with the owner's Rigbox browser account. The API key used by the
CLI does not become a browser viewer cookie. Keep both processes running; Ctrl-C
in the tunnel terminal stops exposure.

To share a session, use its ID from `rig tunnel ls`:

```bash
rig tunnel share --tunnel TUNNEL_ID --emails colleague@example.com
rig tunnel share --tunnel TUNNEL_ID --private
```

Invited viewers sign in and accept with a verified email. Acceptance binds their
Rigbox user ID; an email address alone does not grant access.

Public sharing requires a separate confirmation for the current session:

```bash
rig tunnel share --tunnel TUNNEL_ID --public
```

Unattended use requires `--acknowledge-exposure`; public use additionally requires
`--acknowledge-public`. Those flags accept the risks explained below.

Viewers can invoke every feature of a tunneled app, including file access, debug
tools, and commands that the app exposes. Rigbox does not sandbox your app or
laptop. This demo deliberately has only explicit static routes, `/healthz`, and
a 4 KiB `/echo` endpoint; it never serves arbitrary paths or logs requests.

For a separate static-file experiment, use a dedicated directory containing only
files you intend to share:

```bash
mkdir -p share-only
python3 -m http.server 3000 --bind 127.0.0.1 --directory share-only
```

Python's file server follows symlinks, so inspect that directory and remove links
to files outside it. Do not run it from your home directory or a repository with
credentials. Its directory option does not create a filesystem sandbox.

The public edge and connector use verified HTTPS/WSS. The demo's last hop is HTTP
on literal loopback. Local HTTPS is optional and always validates certificates;
see [the tunnel guide](https://docs.rigbox.dev/guides/local-tunnels).
