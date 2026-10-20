#!/usr/bin/env node
/**
 * Incolo Systems 2.0 — static site build.
 *
 *   site/pages/*.html      page bodies (first line: <!--page {json front matter} -->)
 *   site/partials/*.html   shared header, footer, dialog, form, final CTA
 *   data/*.json            programs + pillars (one source of truth)
 *   scripts/templates/     generated pages: /solutions/<slug>, /programs/<slug>
 *   → dist/                what Express serves
 *
 * Template syntax (deliberately tiny):
 *   {{key}}                         variable
 *   {{> partial k=v k2=v2}}         include, with optional string params
 *   {{#key}} … {{/key}}             block kept only if key is truthy
 *
 * Usage: node scripts/build.mjs [--watch]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync, watch } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pillarPage } from './templates/pillar.mjs';
import { programPage } from './templates/program.mjs';
import { esc, programOptions, seoLinks } from './templates/shared.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(join(ROOT, '.env')); } catch { /* no .env: use defaults */ }
const SITE = join(ROOT, 'site');
const DIST = join(ROOT, 'dist');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

// Site-wide SEO/social settings are committed in data/site.json so a deploy can never
// drop them; env vars (from .env) only override.
const CFG = readJson('data/site.json');
const SITE_URL = (process.env.SITE_URL || CFG.siteUrl).replace(/\/$/, '');
const LINKEDIN = process.env.LINKEDIN_URL || CFG.linkedin || '';
const GOOGLE_VERIFY = process.env.GOOGLE_SITE_VERIFICATION || CFG.googleSiteVerification || '';
const BING_VERIFY = process.env.BING_SITE_VERIFICATION || CFG.bingSiteVerification || '';
const FB_APP_ID = process.env.FACEBOOK_APP_ID || CFG.facebookAppId || '';

function render(tpl, vars, partials, depth = 0) {
  if (depth > 8) throw new Error('Partial nesting too deep');
  tpl = tpl.replace(/\{\{>\s*([\w-]+)((?:\s+\w+=[^\s}]+)*)\s*\}\}/g, (_, name, args) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    const local = { ...vars };
    for (const [, k, v] of args.matchAll(/(\w+)=([^\s}]+)/g)) local[k] = v;
    return render(partials[name], local, partials, depth + 1);
  });
  tpl = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, inner) => (vars[k] ? inner : ''));
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const ld = (obj) => `  <script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>\n`;

function structuredData(urlPath, crumbs) {
  const o = CFG.organization;
  let out = '';
  if (urlPath === '/') {
    out += ld({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: CFG.name,
      url: SITE_URL + '/',
      logo: SITE_URL + o.logo,
      email: o.email,
      telephone: o.telephone,
      slogan: o.slogan,
      address: { '@type': 'PostalAddress', addressLocality: o.locality, addressRegion: o.region, addressCountry: o.country },
      ...(LINKEDIN ? { sameAs: [LINKEDIN] } : {}),
    });
    out += ld({ '@context': 'https://schema.org', '@type': 'WebSite', name: CFG.name, url: SITE_URL + '/' });
  }
  if (crumbs && crumbs.length) {
    out += ld({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [['/', 'Home'], ...crumbs].map(([u, n], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE_URL + u })),
    });
  }
  return out;
}

function head({ title, description, ogDescription, canonical, v, noindex, urlPath, crumbs }) {
  const t = esc(title), d = esc(description), od = esc(ogDescription || description), img = SITE_URL + CFG.ogImage, alt = esc(CFG.ogImageAlt);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <meta name="theme-color" content="#ffffff" />
  ${noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${canonical}" />`}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <!-- Rich link previews (WhatsApp, Facebook, LinkedIn, X) -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(CFG.name)}" />
  <meta property="og:locale" content="${CFG.locale}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${od}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:secure_url" content="${img}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="${CFG.ogImageWidth}" />
  <meta property="og:image:height" content="${CFG.ogImageHeight}" />
  <meta property="og:image:alt" content="${alt}" />
${FB_APP_ID ? `  <meta property="fb:app_id" content="${esc(FB_APP_ID)}" />\n` : ''}  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${od}" />
  <meta name="twitter:image" content="${img}" />
  <meta name="twitter:image:alt" content="${alt}" />
  <!-- Ownership verification -->
${CFG.facebookDomainVerification.map((c) => `  <meta name="facebook-domain-verification" content="${esc(c)}" />`).join('\n')}
${GOOGLE_VERIFY ? `  <meta name="google-site-verification" content="${esc(GOOGLE_VERIFY)}" />\n` : ''}${BING_VERIFY ? `  <meta name="msvalidate.01" content="${esc(BING_VERIFY)}" />\n` : ''}${noindex ? '' : structuredData(urlPath, crumbs)}  <link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="/styles/tokens.css?v=${v}" />
  <link rel="stylesheet" href="/styles/main.css?v=${v}" />
  <noscript><style>.reveal{opacity:1 !important;transform:none !important;}</style></noscript>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
`;
}

function build() {
  const t0 = Date.now();
  const programs = readJson('data/programs.json');
  const pillars = readJson('data/pillars.json');
  const partials = Object.fromEntries(
    readdirSync(join(SITE, 'partials')).filter((f) => f.endsWith('.html'))
      .map((f) => [f.replace(/\.html$/, ''), readFileSync(join(SITE, 'partials', f), 'utf8')]),
  );

  // Asset version = hash of every CSS/JS file, so a deploy busts browser caches.
  const h = createHash('sha1');
  for (const dir of ['styles', 'js']) for (const f of readdirSync(join(SITE, dir)).sort()) h.update(readFileSync(join(SITE, dir, f)));
  const v = h.digest('hex').slice(0, 10);

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  for (const item of ['styles', 'js', 'fonts', 'media', 'favicon.svg']) cpSync(join(SITE, item), join(DIST, item), { recursive: true });

  const globals = {
    v,
    linkedin: LINKEDIN || '/contact',
    programOptions: programOptions(programs),
    seoLinks: seoLinks(),
    year: new Date().getFullYear(),
  };

  const urls = [];
  const emit = (urlPath, meta, body) => {
    const nav = meta.nav || '';
    const vars = {
      ...globals,
      navSolutions: nav === 'solutions' ? ' active' : '',
      navPrograms: nav === 'programs' ? ' active' : '',
      navWhy: nav === 'why' ? ' active' : '',
    };
    const canonical = SITE_URL + urlPath;
    const scripts = ['main', ...(meta.scripts || [])].map((s) => `  <script src="/js/${s}.js?v=${v}" defer></script>`).join('\n');
    const html = head({ ...meta, canonical, v, urlPath }) +
      render(`{{> header}}\n${body}\n{{> footer}}\n{{> modal}}\n`, vars, partials) +
      (meta.inlineData || '') + scripts + '\n</body>\n</html>\n';
    const out = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '') + '.html';
    mkdirSync(dirname(join(DIST, out)), { recursive: true });
    writeFileSync(join(DIST, out), html);
    if (!meta.noindex) urls.push(urlPath);
  };

  // 1. Hand-written pages
  for (const f of readdirSync(join(SITE, 'pages')).filter((x) => x.endsWith('.html'))) {
    const src = readFileSync(join(SITE, 'pages', f), 'utf8');
    const m = src.match(/^<!--page\s+(\{[\s\S]*?\})\s*-->\n?/);
    if (!m) throw new Error(`${f}: missing <!--page {…} --> front matter`);
    const meta = JSON.parse(m[1]);
    if (meta.programsData) {
      meta.inlineData = `  <script type="application/json" id="programs-data">${JSON.stringify(programs).replace(/</g, '\\u003c')}</script>\n`;
    }
    const name = f.replace(/\.html$/, '');
    emit(meta.path || (name === 'index' ? '/' : '/' + name), meta, src.slice(m[0].length));
  }

  // 2. Solution pillar pages
  for (const p of pillars) {
    emit(`/solutions/${p.slug}`, {
      title: p.title, description: p.description, nav: 'solutions', scripts: ['pillar'],
      crumbs: [[`/solutions/${p.slug}`, p.name]],
    }, pillarPage(p, pillars, programs));
  }

  // 3. Program detail pages
  for (const p of programs) {
    emit(`/programs/${p.slug}`, {
      title: `${p.title} | Incolo Systems`,
      description: p.desc.length > 155 ? p.desc.slice(0, p.desc.lastIndexOf(' ', 152)) + '…' : p.desc,
      nav: 'programs',
      crumbs: [['/programs', 'AI Programs'], [`/programs/${p.slug}`, p.title]],
    }, programPage(p, programs, pillars));
  }

  // 4. SEO files
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
  writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  // 5. Production guard: fail the build rather than ship a page that breaks link
  //    previews or Facebook domain verification.
  const home = readFileSync(join(DIST, 'index.html'), 'utf8');
  const required = [
    ...CFG.facebookDomainVerification.map((c) => `<meta name="facebook-domain-verification" content="${c}" />`),
    `<link rel="canonical" href="${SITE_URL}/" />`,
    `<meta property="og:image" content="${SITE_URL}${CFG.ogImage}" />`,
    '<meta property="og:title"', '<meta property="og:description"', '<meta name="twitter:card" content="summary_large_image" />',
    '"@type":"Organization"',
  ];
  const missing = required.filter((r) => !home.includes(r));
  if (missing.length) throw new Error('index.html is missing required head tags:\n  ' + missing.join('\n  '));
  if (!existsSync(join(DIST, CFG.ogImage))) throw new Error(`OG image ${CFG.ogImage} is missing from dist/`);

  console.log(`built ${urls.length + 1} pages → dist/ (v=${v}) in ${Date.now() - t0}ms · SEO/social guard passed`);
}

build();

if (process.argv.includes('--watch')) {
  let timer;
  const rebuild = () => { clearTimeout(timer); timer = setTimeout(() => { try { build(); } catch (e) { console.error(e.message); } }, 120); };
  for (const dir of ['site', 'data']) if (existsSync(join(ROOT, dir))) watch(join(ROOT, dir), { recursive: true }, rebuild);
  console.log('watching site/ and data/ …');
}
