# Project notes — lenafilatova.co.uk (repo: `olena-filatova/lenafilatova-website`)

Static website for Lena Filatova (evidence-based women's health). Built with the
**Divhunt** visual builder — note the `<x-dc>` wrapper, `<helmet>` head block,
`support.js` runtime, and template syntax (`{{ }}`, `<sc-if>`, `<sc-for>`).
Content is hydrated/rendered client-side by `support.js`.

- **Hosting:** GitHub Pages (see `CNAME` → `lenafilatova.co.uk`). Apex is canonical;
  `www` redirects to it. DNS is managed at **Namecheap**.
- **Deploy:** merge to `main` → GitHub Pages rebuilds (allow a minute or two + CDN cache).
- `index.html` is the single large page (~440 KB); EN content plus `ua/` for Ukrainian.

> ⚠️ **NEVER delete the `CNAME` file or touch the repo's Pages custom-domain setting.**
> On 13 Jul 2026 the file was deleted (via the GitHub UI/API — likely an automated
> cleanup); Pages kept "deploying" but lenafilatova.co.uk silently served a frozen
> old snapshot for a day and none of the merged fixes reached visitors. Restored in
> PR #57. If the live site ever seems to ignore merged changes, check `CNAME` exists
> on `main` and Settings → Pages shows the custom domain, before debugging anything else.

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
