// Shared HTML fragments for generated pages.

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const icon = (id, cls = 'ic-sm') => `<svg class="${cls}"><use href="/media/icons.svg#${id}"/></svg>`;
export const tile = (id) => `<span class="icon-tile"><svg><use href="/media/icons.svg#${id}"/></svg></span>`;

export const programOptions = (programs) =>
  programs.map((p) => `            <option>${p.id} · ${esc(p.title)}</option>`).join('\n');

const SEO = [
  ['/programs?industry=pharma', 'AI visual inspection for pharma'],
  ['/programs?industry=automotive', 'AI visual inspection for automotive'],
  ['/programs/packaging-bin-count', 'Packaging count verification'],
  ['/programs?q=dispatch', 'Pre-dispatch QC automation'],
  ['/programs/predictive-maintenance', 'Predictive maintenance for rotating equipment'],
  ['/programs?industry=utilities', 'Predictive maintenance for utilities'],
  ['/programs/production-planning', 'AI production planning for batch manufacturing'],
  ['/programs/shop-floor-monitoring', 'Real-time OEE monitoring'],
  ['/programs?q=anomal', 'Shop-floor anomaly detection'],
  ['/programs/brazing-furnace-optimization', 'Brazing furnace optimization'],
  ['/programs/circuit-router', 'Heat-exchanger circuit routing automation'],
  ['/programs?industry=thermal', 'Heat-exchanger manufacturing AI'],
  ['/solutions/production-systems', 'On-premise AI for manufacturing'],
  ['/programs?capability=vision', 'Edge AI for quality inspection'],
  ['/programs?capability=agentic', 'Agentic AI for planners'],
  ['/programs?outcome=compliance', 'Audit-ready AI for GMP plants'],
];
export const seoLinks = () => SEO.map(([h, t]) => `          <a href="${h}">${esc(t)}</a>`).join('\n');

export const breadcrumbs = (items) =>
  `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([href, label], i) =>
    i === items.length - 1 ? `<span aria-current="page">${esc(label)}</span>` : `<a href="${href}">${esc(label)}</a><span>/</span>`).join('')}</nav>`;

export const frame = (p, { tall } = {}) => p.svg || p.heroSvg
  ? `<div class="frame"><div class="frame-inner svg-tile${tall ? ' tall' : ''}"><img src="${p.img || p.heroImg}" alt="${esc(p.alt || p.heroAlt)}" />
      <div class="svg-legend"><b>CKT view · 20 × 8 coil</b><span><i></i>Front bend</span><span><i class="dot"></i>Rear bend</span><span>20 circuits · 160 / 160 holes</span></div></div></div>`
  : `<div class="frame"><div class="frame-inner${tall ? ' tall' : ''}"><img src="${p.img || p.heroImg}" alt="${esc(p.alt || p.heroAlt)}" /></div></div>`;

export const pilotCta = (p, label = 'Request a pilot', cls = 'btn btn-primary') =>
  `<a class="${cls}" href="/contact?program=${encodeURIComponent(p.id)}" data-open-modal data-program="${p.id}">${label}</a>`;

/** Compact program card (pillar + detail "related" grids). */
export const miniCard = (p) => `
          <a class="mini-card" href="/programs/${p.slug}">
            <span class="mini-media${p.svg ? ' svg' : ''}"><img src="${p.img}" alt="" loading="lazy" />${p.isNew ? '<span class="new">NEW</span>' : ''}</span>
            <span class="mini-body">
              <span class="pcard-kicker"><span class="mono">${p.id}</span>·<span>${esc(p.capabilityLabel)}</span></span>
              <strong>${esc(p.title)}</strong>
              <span class="mini-desc">${esc(p.outcomes[0])}</span>
              <span class="link-arrow">View program ${icon('arrow-right')}</span>
            </span>
          </a>`;

/** Data-residency block: the customer chooses on-premise or private cloud. */
export const residency = (heading = 'Where it runs is your decision.') => `
    <section class="section residency-section" id="deployment">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">Data residency</span>
          <h2 class="h2">${heading}</h2>
          <p>AI that runs within your firewall, with your total control. On-premise or private cloud is your call, and we engineer for either.</p>
        </div>
        <div class="deploy-grid reveal">
          <article class="deploy-card">${tile('server')}<h3>Edge gateways</h3><p>Inference next to the camera or sensor, for sub-second decisions at the station.</p><span class="tag">On-premise</span></article>
          <article class="deploy-card">${tile('cpu')}<h3>Line-side compute</h3><p>One compact node per line, running inspection, counting and monitoring together.</p><span class="tag">On-premise</span></article>
          <article class="deploy-card">${tile('database')}<h3>Private plant servers</h3><p>Central models, dashboards and the copilot, inside your own network and under your own IT policies.</p><span class="tag">On-premise</span></article>
          <article class="deploy-card">${tile('lock')}<h3>Private cloud</h3><p>Your own cloud tenancy, inside your security perimeter, when that suits your IT strategy better.</p><span class="tag tag-accent">Private cloud</span></article>
        </div>
      </div>
    </section>`;

export const phases = (title = 'Three phases. Quality gates at every step.', id = 'engagement') => `
    <section class="section" id="${id}">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">From pilot to production</span>
          <h2 class="h2">${title}</h2>
        </div>
        <div class="phases reveal">
          <div class="phase"><span class="num">01</span><h3>Assess &amp; Design</h3><p>A scoping call and a short plant walk-through to pick one line, one asset or one workflow, define success metrics, and confirm data access.</p></div>
          <div class="phase"><span class="num">02</span><h3>Pilot &amp; Validate</h3><p>A working pilot on your line within 4–8 weeks, validated against the agreed metrics with a measurable business case.</p></div>
          <div class="phase"><span class="num">03</span><h3>Scale &amp; Govern</h3><p>Roll out across lines and plants with qualification protocols, audit trails and change-control governance.</p></div>
        </div>
      </div>
    </section>`;

export const finalCta = '{{> final-cta}}';
