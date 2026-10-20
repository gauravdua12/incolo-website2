#!/usr/bin/env bash
# Smoke-test a running Incolo site (local, staging port, or production).
#   bash scripts/verify-prod.sh https://incolo.si
#   bash scripts/verify-prod.sh http://127.0.0.1:3001
# Read-only: it never submits the contact form. Exit code = number of failed checks.
set -u
BASE="${1:-https://incolo.si}"; BASE="${BASE%/}"
fail=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=$((fail+1)); }
code() { curl -s -o /dev/null -m 15 -w '%{http_code}' "$1"; }

echo "Pages ($BASE)"
for p in / /programs /contact /solutions/production-systems /solutions/advisory /solutions/process-modernization \
         /programs/visual-inspection /programs/packaging-bin-count /programs/predictive-maintenance \
         /programs/production-planning /programs/shop-floor-monitoring /programs/brazing-furnace-optimization \
         /programs/circuit-router /sitemap.xml /robots.txt /favicon.svg /healthz; do
  c=$(code "$BASE$p"); [ "$c" = 200 ] && ok "$p 200" || bad "$p → $c (expected 200)"
done
c=$(code "$BASE/this-page-does-not-exist"); [ "$c" = 404 ] && ok "unknown URL → 404" || bad "unknown URL → $c (expected 404)"
c=$(code "$BASE/index.html"); [ "$c" = 301 ] && ok "/index.html → 301" || bad "/index.html → $c (expected 301)"
for p in /.env /server.js /leads.jsonl /package.json; do
  c=$(code "$BASE$p"); [ "$c" = 404 ] && ok "$p not exposed" || bad "$p → $c (must be 404)"
done

echo "Homepage head: verification, previews, indexing"
HOME_HTML=$(curl -s -m 15 "$BASE/")
need() { printf '%s' "$HOME_HTML" | grep -qF -- "$1" && ok "$2" || bad "$2 missing"; }
need 'name="facebook-domain-verification" content="u7ly77vfjfrfaieozxr0kae71ck3vm"' 'Facebook domain verification #1'
need 'name="facebook-domain-verification" content="50g3uvbtysx4iel2c7149tyax3m6o3"' 'Facebook domain verification #2'
need 'property="og:title"'        'og:title'
need 'property="og:description"'  'og:description'
need 'property="og:image" content="https://' 'og:image (absolute https URL)'
need 'property="og:image:width" content="1200"' 'og:image:width'
need 'name="twitter:card" content="summary_large_image"' 'twitter:card'
need 'rel="canonical"'            'canonical link'
need '"@type":"Organization"'     'Organization structured data'
printf '%s' "$HOME_HTML" | grep -q 'name="robots" content="noindex"' && bad 'homepage is noindex!' || ok 'homepage indexable'

echo "Indexing files"
curl -s -m 15 "$BASE/robots.txt" | grep -q '^Sitemap: ' && ok 'robots.txt lists the sitemap' || bad 'robots.txt has no Sitemap line'
n=$(curl -s -m 15 "$BASE/sitemap.xml" | grep -c '<loc>'); [ "$n" -ge 13 ] && ok "sitemap.xml has $n URLs" || bad "sitemap.xml has $n URLs (expected ≥ 13)"

echo "OG image (the one the homepage advertises)"
OG=$(printf '%s' "$HOME_HTML" | grep -o 'property="og:image" content="[^"]*"' | head -1 | sed 's/.*content="//; s/"$//')
OG_PATH="/${OG#*://*/}"   # fetch from $BASE so this also works before DNS/cutover
read -r oc sz ct < <(curl -s -o /dev/null -m 15 -w '%{http_code} %{size_download} %{content_type}\n' "$BASE$OG_PATH")
[ "$oc" = 200 ] && ok "$OG_PATH → 200 ($ct)" || bad "$OG_PATH → $oc"
[ "${sz:-0}" -gt 0 ] && [ "${sz:-0}" -lt 600000 ] && ok "${sz} bytes (< 600 KB for WhatsApp)" || bad "og image size ${sz:-0}"

echo; [ "$fail" = 0 ] && echo "All checks passed." || echo "$fail check(s) failed."
exit "$fail"
