# Project notes — RETIRED repo (`olena-filatova/lenafilatova-website`)

> 🛑 **THIS REPO IS RETIRED — do not make website changes here.**
> The live site for `lenafilatova.co.uk` is the **Astro rebuild** in
> **`olena-filatova/lenafilatova-astro-preview`** (cutover executed 13 Jul 2026;
> see that repo's `CUTOVER.md` and `CLAUDE.md`). ALL fixes, content and features
> go to that repo. Deploys from this repo only reach
> `olena-filatova.github.io/lenafilatova-website/` — visitors never see them.
> This repo must NOT contain a `CNAME` file and its Pages custom domain must
> stay unset, otherwise it can steal the domain back from the live site.
> Kept for history and as the source the Astro site was ported from (Divhunt
> builder: `<x-dc>` wrapper, `{{ }}` / `<sc-if>` / `<sc-for>` templates,
> client-side rendering via `support.js`).

## Embedded Metabolic Food Calculator (inline widget, not an iframe)
The calculator is a **separate app** in repo `olena-filatova/helsico`, served at
`https://calculator.lenafilatova.co.uk`. It is embedded here as an inline widget:

- **Loader** (in `<helmet>`, ~line 39):
  `<script defer src="https://calculator.lenafilatova.co.uk/widget.js"></script>`
- **Mount point** inside the `<sc-if value="{{ isResCalc }}">` calculator view (~line 401):
  `<div data-metabolic-calculator></div>`
- A "not loading? open in new tab" fallback link points to the same address (~line 418).

The widget renders into that `<div>` in a **Shadow DOM** (styles isolated from the
site). Because Divhunt draws the calculator view only when the visitor navigates to
it, the widget script uses a `MutationObserver` to mount whenever the container
appears. **If the calculator ever shows blank after clicking around, it's this
mount timing** — the fix lives in the `helsico` repo (`widget/index.tsx`).

History: was previously an `<iframe src="https://helsico.vercel.app">`; replaced with
the inline widget, then repointed from `helsico.vercel.app` to `calculator.lenafilatova.co.uk`.

## Working branches
Each Claude session works on its own `claude/*` branch; changes land on `main`
via squash-merged PRs.
