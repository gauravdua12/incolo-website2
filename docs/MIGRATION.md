# Migration plan: incolo.si → website 2.0

**Goal:** replace the live single-page site with website 2.0 on the same OCI server. The domain, nginx, TLS certificates, mailboxes and Facebook verification stay as they are. Downtime is about 5 seconds (one service restart), and rollback is one command.

**Approach:** install 2.0 alongside the current site, test it on a spare port, then switch the systemd service over. The old folder is never modified, so rollback just switches back.

---

## What was checked on production (2026-10-20)

| Item | Live incolo.si | Website 2.0 |
|---|---|---|
| Facebook domain verification | 2 meta tags (`u7ly77vf…`, `50g3uvbt…`), **only on the server, not in the old repo** | Both tags are in `data/site.json` and rendered on every page. The build **fails** if either is missing from the homepage. |
| Rich previews (WhatsApp, Facebook, LinkedIn, X) | og:title/description/url/image (+secure_url, type, 1200×630, alt), twitter:card | Same set plus `og:locale` and `twitter:image:alt`, with per-page titles and URLs. Same image URL `/media/og-image.jpg` (118 KB, under WhatsApp's ~600 KB limit), so cached previews stay valid. |
| Google: canonical | `https://incolo.si/` | Every page has a canonical link to its clean URL on `https://incolo.si` |
| Google: robots.txt | Allow all + sitemap | Same |
| Google: sitemap.xml | 1 URL | 13 URLs (home, programs, contact, 3 solutions, 7 programs) |
| Google: verification | **None found** (no `google-site-verification` tag; Search Console must be DNS-verified or not set up) | Optional slot: put the token in `data/site.json → googleSiteVerification` |
| Structured data | None | Organization + WebSite (home), BreadcrumbList (inner pages) |
| Domain redirects | `www.incolo.si`, `http://`, `incolosystems.com`, `www.incolosystems.com` → `https://incolo.si/` (nginx) | Unchanged: nginx isn't touched |
| Old URLs | `/` and `/index.html` | `/` unchanged. `/index.html` → 301 to `/`, `/contact.php` → 301 to `/contact` |
| Server | nginx 1.20 → Node/Express on `127.0.0.1:3000`, service `incolo` | Same port and service, new folder |

> **Google HTML-file check:** if Search Console was verified with an uploaded `googleXXXXXXXX.html` file, it can't be detected from outside. On the server, run `ls /home/opc/incolo-site/google*.html`. If it exists, copy it into `site/` in the repo before go-live (step 2.4).

---

## Phase 1: Prepare (no impact on the live site)

**1.1 SSH in and check Node.** Website 2.0 needs **Node 20 or newer** (nodemailer 10).
```bash
node -v
```
If it shows v20 or newer, skip to 1.2. Otherwise, upgrade from the **NodeSource** repo the server already uses. Don't use Oracle's `dnf module install nodejs:22`: it conflicts with NodeSource's `nsolid` packages, and dnf aborts with "none of the providers can be installed" (nothing gets changed).
```bash
sudo dnf module disable -y nodejs
sudo dnf install -y nodejs --disablerepo=nodesource-nsolid
node -v && sudo systemctl restart incolo && curl -sI http://127.0.0.1:3000/ | head -1
```
Expect `v20…` and `HTTP/1.1 200 OK`. The current site runs fine on Node 20, so this upgrade is safe to do first.

**1.2 Back up everything the new site must inherit.**
```bash
cd /home/opc
mkdir -p backups && tar czf backups/incolo-site-$(date +%F).tgz incolo-site
sudo cp /etc/nginx/conf.d/incolo.conf backups/incolo.conf.$(date +%F)
sudo cp /etc/systemd/system/incolo.service backups/incolo.service.$(date +%F)
ls -la incolo-site/.env incolo-site/leads.jsonl incolo-site/google*.html 2>/dev/null
```

**1.3 Move enquiries to a shared location,** so old and new versions write to the same file.
```bash
mkdir -p /home/opc/incolo-data
cp /home/opc/incolo-site/leads.jsonl /home/opc/incolo-data/leads.jsonl 2>/dev/null || touch /home/opc/incolo-data/leads.jsonl
chmod 600 /home/opc/incolo-data/leads.jsonl
```

**1.4 Install website 2.0 next to the old site.**
```bash
cd /home/opc
git clone https://github.com/gauravdua12/incolo-website2.git incolo-site2
cd incolo-site2
npm ci --omit=dev
```

**1.5 Carry over the secrets.** This reuses the working SMTP settings.
```bash
cp /home/opc/incolo-site/.env .env
cat >> .env <<'EOF'
SITE_URL=https://incolo.si
LEADS_FILE=/home/opc/incolo-data/leads.jsonl
EOF
chmod 600 .env
grep -E '^(CONTACT_TO|SMTP_HOST|SMTP_USER|SITE_URL|LEADS_FILE)=' .env
```

**1.6 Build.** The build checks that the Facebook tags, OG tags, canonical link and structured data are present, and stops with an error if anything is missing.
```bash
npm run build
# expect: "built 14 pages → dist/ … · SEO/social guard passed"
```

**1.7 Test on a spare port** while the live site keeps running on 3000.
```bash
PORT=3001 node server.js &
bash scripts/verify-prod.sh http://127.0.0.1:3001     # expect: All checks passed.
kill %1
```

---

## Phase 2: Cut over (about 5 seconds)

**2.1 Point the service at a symlink,** so future switches and rollbacks are a one-liner. This is a one-time change.
```bash
ln -sfn /home/opc/incolo-site2 /home/opc/incolo-current
sudo sed -i 's#^WorkingDirectory=.*#WorkingDirectory=/home/opc/incolo-current#' /etc/systemd/system/incolo.service
sudo systemctl daemon-reload
```

**2.2 Switch.**
```bash
sudo systemctl restart incolo
sudo systemctl status incolo --no-pager      # "active (running)"
journalctl -u incolo -n 20 --no-pager        # "Incolo site listening on http://127.0.0.1:3000"
```

**2.3 Verify production.**
```bash
bash /home/opc/incolo-site2/scripts/verify-prod.sh https://incolo.si
```
Then send one real enquiry through `https://incolo.si/contact` and confirm the email arrives at `business@incolosystems.com`, and that a line was added to `/home/opc/incolo-data/leads.jsonl`.

**2.4 (Only if 1.2 found a `google*.html` file)** Copy it into the repo's `site/` folder, commit, then run `git pull && npm run build && sudo systemctl restart incolo`.

---

## Phase 3: Refresh link previews and search indexes (same day)

| Where | What to do |
|---|---|
| **Facebook Sharing Debugger** (developers.facebook.com/tools/debug) | Enter `https://incolo.si/` and click **Scrape Again**. This refreshes the preview for Facebook, Messenger and Instagram links. |
| **Meta Business Suite → Brand safety → Domains** | Confirm `incolo.si` still shows **Verified**. The tags are unchanged, so it should. |
| **WhatsApp** | WhatsApp caches previews per URL. To check the new preview immediately, share `https://incolo.si/?v=2` in a chat with yourself. Plain links refresh on their own over time. |
| **LinkedIn Post Inspector** (linkedin.com/post-inspector) | Inspect `https://incolo.si/` to refresh LinkedIn's cache. |
| **Google Search Console** | Sitemaps → submit `https://incolo.si/sitemap.xml` (now 13 URLs). URL Inspection → **Request indexing** for `/`, `/programs` and `/solutions/production-systems`. |
| **Google Rich Results Test** (search.google.com/test/rich-results) | Test `https://incolo.si/` (Organization) and one program page (Breadcrumb). |
| **Bing Webmaster Tools** (optional) | Import from Google Search Console, or put the token in `data/site.json → bingSiteVerification`. |

---

## Rollback (any time, under a minute)

```bash
ln -sfn /home/opc/incolo-site /home/opc/incolo-current
sudo systemctl restart incolo
```
The old site runs exactly as before. Enquiries made on 2.0 remain in `/home/opc/incolo-data/leads.jsonl`. Note that the old site writes to its own `leads.jsonl`.

---

## Deploying future updates

```bash
cd /home/opc/incolo-site2
git pull
npm ci --omit=dev          # only needed when package.json changed
npm run build              # always: pages are generated from site/ + data/
sudo systemctl restart incolo
bash scripts/verify-prod.sh https://incolo.si
```

**Never edit HTML on the server.** Production-only changes, like the Facebook tags were, get lost on the next deploy. Make them in the repo instead:

- Verification tokens and social settings → `data/site.json`
- Page copy → `site/pages/*.html`
- Programs and pillars → `data/*.json`
- Header, footer and dialog → `site/partials/*.html`

---

## What can break, and what guards it

| Risk | Guard |
|---|---|
| Facebook domain verification lost | Tags live in the repo (`data/site.json`). The build fails without them, and `verify-prod.sh` checks them. |
| Broken WhatsApp/Facebook preview | Same OG image URL. The build and verifier check og:title/description/image, and the verifier checks image size. |
| Old Google result 404s | Only `/` was indexed and it's unchanged. `/index.html` and `/contact.php` 301-redirect. |
| Enquiries not emailed | `.env` copied from the old site (step 1.5). Every lead is written to disk before the email is sent. |
| `dist/` missing after `git pull` | `server.js` refuses to start without `dist/` and logs "Run npm run build first". |
| Old Node version | Checked in step 1.1. `package.json` declares `"node": ">=20"`. |
| nginx or SELinux | Unchanged. The same port (3000) and `httpd_can_network_connect` setting apply. |
