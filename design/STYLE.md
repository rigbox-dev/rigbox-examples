# Rigbox examples — shared design language

Every example is a different stack, but they should read as **one product family**.
That consistency comes entirely from `design/tokens.css` + the rules here. Don't
invent new colors, spacing, or component shapes — use the tokens and the `rb-*`
utility classes.

## The one rule

Each app ships a **byte-for-byte copy** of `design/tokens.css` (the build step
copies it in — see CONTRACT.md per stack) and links/imports it. Do **not** edit the
copy. If you think a token is missing, you almost certainly don't need it; compose
the existing `rb-*` classes instead.

## Page skeleton (identical across all seven)

```html
<header class="rb-header">
  <span class="rb-title">Product Name</span>
  <span class="rb-badge">Rigbox example</span>
</header>

<main class="rb-container">      <!-- add .rb-wide for dashboard-style pages -->
  <div class="rb-card rb-stack">
    <h1>…</h1>
    …
  </div>
</main>

<footer class="rb-footer">
  A Rigbox example · built with <em>&lt;stack&gt;</em> ·
  <a href="https://rigbox.dev">rigbox.dev</a>
</footer>
```

- **Header**: product name on the left, the `rb-badge` ("Rigbox example") on the
  right. Same on every app.
- **Footer**: always `A Rigbox example · built with <stack> · rigbox.dev`, filling
  in the real stack (e.g. "Python · FastAPI", "Ruby on Rails", "Next.js").
- **Body**: one centered `rb-container`; content lives in `rb-card`s.

## Components (use these, don't restyle)

| Need | Class |
|---|---|
| Panel / section | `rb-card` (stack them; `rb-card + rb-card` auto-spaces) |
| Primary action | `rb-btn` |
| Secondary action | `rb-btn rb-btn-ghost` |
| Text / number / email input | `rb-input` |
| Multi-line | `rb-textarea` |
| Dropdown | `rb-select` |
| Labeled field | `rb-field` > `rb-label` + control + optional `rb-hint` |
| Status chip | `rb-pill` (+ `rb-pill-ok` / `rb-pill-warn` / `rb-pill-danger`) |
| De-emphasized text | `rb-muted` |
| IDs / code / URLs | `rb-mono` |
| Vertical rhythm | `rb-stack` (spaces direct children) |
| Inline group | `rb-row` |

## Tone

Calm, developer-product aesthetic (think Linear / Vercel / Stripe docs): lots of
whitespace, one accent (iris `--rb-accent`), status communicated with `rb-pill`,
never more than one primary `rb-btn` per card. Light by default; the tokens already
provide a `prefers-color-scheme: dark` variant — don't hand-roll dark mode.

## What each UI must show

Beyond looking consistent, every app's UI should make its **headline capability**
legible at a glance — e.g. the AI chat shows the active model alias as a pill, the
blog shows its current theme/flavor, the param-heavy app reflects its configured
values, the multi-app shows which sibling it's talking to over loopback. The UI is
the demo; surface the thing the example exists to demonstrate.
