# url-shortener — Python · Django

A tiny link shortener: paste a long URL, get a short code, follow `/<code>` for a
302 redirect that bumps a click counter. Built on Django + gunicorn with the link
table in SQLite.

## The capability it demonstrates

**The full Rigbox validated-param set — one of every param type.** This example
exists to show how each param type is declared in `rig.yaml`, validated
server-side, and read by the app from its `envVar`:

| Type | Param | envVar | Notes |
|---|---|---|---|
| `url` | `default_redirect_url` | `DEFAULT_REDIRECT_URL` | where unknown codes redirect |
| `string` | `site_name` | `SITE_NAME` | `validationPattern ^[A-Za-z0-9 ]{2,32}$`; shown in header |
| `number` | `max_links` | `MAX_LINKS` | `validationPattern ^[0-9]+$` |
| `boolean` | `require_https` | `REQUIRE_HTTPS` | rejects `http://` targets when on |
| `select` | `id_strategy` | `ID_STRATEGY` | `random` (6 chars) vs `sequential` (0001…) |
| `email` | `admin_email` | `ADMIN_EMAIL` | server-validated address |
| `secret` | `admin_token` | `ADMIN_TOKEN` | `sensitive: true`, masked in the UI/CLI |
| `textarea` | `welcome_message` | `WELCOME_MESSAGE` | intro copy shown above the form |

`site_name`, `welcome_message`, `require_https`, `id_strategy`, and `max_links`
are all reflected live in the UI so you can see a param change take effect.

## Deploy

```bash
cd url-shortener && rig deploy
```

No required env — every value has a default. (`admin_token` is a `secret` param
you can set later; it is unset by default.)

Expected build time: ~30–60s (pip install of Django + gunicorn + whitenoise,
then `migrate` + `collectstatic`).

## What to look at after deploy

- The app URL: a shorten form, the configured `site_name` in the header, the
  `welcome_message`, and pills showing `require_https` / `id_strategy` /
  `<count> / max_links`.
- Create a link, then click the `rb-mono` short code — it 302-redirects and the
  click count increments on the list.
- Flip a param and watch the UI change:
  ```bash
  rig app param set site_name="My Links"
  rig app param set id_strategy=sequential
  rig app param set require_https=true
  ```

## Server-side param rejection (the point of this example)

The platform validates params **before** they reach the app. Bad values are
rejected at `param set` time, not silently accepted:

```bash
rig app param set admin_email=not-an-email     # rejected: invalid email
rig app param set default_redirect_url=ftp://x # rejected: invalid url
rig app param set site_name="!!"               # rejected: fails ^[A-Za-z0-9 ]{2,32}$
rig app param set max_links=lots               # rejected: fails ^[0-9]+$
```

## Persistence

The SQLite DB lives at `$DATA_DIR/db.sqlite3` (`DATA_DIR=/home/developer/data`),
outside the synced app dir, so **created links survive redeploys**. `migrate`
runs in `install:` to create the DB/schema.

## Notes

- Binds `0.0.0.0:5100` via gunicorn; `GET /healthz` returns 200.
- `ALLOWED_HOSTS=['*']`, `DEBUG=False` — it runs behind the Rigbox gateway.
- Static `tokens.css` is served by WhiteNoise at `/static/shortener/tokens.css`.
