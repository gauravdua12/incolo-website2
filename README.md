# Incolo Systems: website 2.0

The incolo.si website. It uses keychain.com's layout and component system with Incolo's content and blue palette. Pages are static HTML built from partials and JSON data, served by Express, which also handles the contact form. There are no third-party runtime requests (fonts, icons and scripts are self-hosted), and the only outbound connection is the SMTP relay.

## Run locally

```bash
npm install
npm run dev        # builds, watches, serves http://127.0.0.1:4100
```

Without `SMTP_HOST` in `.env`, enquiries are saved to `leads.jsonl` but no email is sent.

## Layout

```
site/pages/        page bodies: index, programs, contact, 404 (first line = JSON front matter)
site/partials/     header, footer, scoping-call dialog, contact form, final CTA
site/styles|js|fonts|media/   assets (copied as-is)
data/site.json     SEO + social settings: canonical URL, OG image, Facebook/Google verification
data/programs.json the 7 AI programs (directory, detail pages, form options)
data/pillars.json  the 3 solution pages
scripts/build.mjs  → dist/ (pages, sitemap.xml, robots.txt; fails if SEO/social tags go missing)
scripts/templates/ generated pages: /solutions/<slug>, /programs/<slug>
scripts/verify-prod.sh  read-only smoke test for any running instance
server.js          Express: clean URLs, security headers, POST /api/contact
docs/              BLUEPRINT.md (design + copy), MIGRATION.md (go-live runbook), mockups/
```

## Common edits

| Change | Where |
|---|---|
| Homepage or programs copy | `site/pages/*.html` |
| Add or edit a program | `data/programs.json` (detail page, directory card and form option update automatically) |
| Verification tags, OG image, canonical domain | `data/site.json` |
| Header, footer, dialog | `site/partials/*.html` |
| Colours, type, spacing | `site/styles/tokens.css` |

After any change: `npm run build` (the dev server does this automatically).

## Deploy

See [docs/MIGRATION.md](docs/MIGRATION.md) for the first go-live and for routine updates (`git pull && npm ci --omit=dev && npm run build && sudo systemctl restart incolo`).
