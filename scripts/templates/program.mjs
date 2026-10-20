// /programs/<slug> — program detail page.
import { esc, icon, tile, breadcrumbs, frame, pilotCta, miniCard, residency, phases, finalCta } from './shared.mjs';

export function programPage(p, programs, pillars) {
  const pillar = pillars.find((x) => x.slug === p.pillar);
  const related = programs.filter((x) => x.pillar === p.pillar && x.id !== p.id);
  const fill = programs.filter((x) => x.pillar !== p.pillar && x.id !== p.id);
  const show = [...related, ...fill].slice(0, 3);
  const meta = p.meta || [['shield', 'On-prem or private cloud'], ['clock', 'Pilot in 4–8 wks']];
  const d = p.detail;

  return `  <main id="main" class="program-page">
    <section class="page-hero detail-hero">
      <div class="netbg" aria-hidden="true"><span class="glow"></span><svg class="lines" data-net="detail"></svg></div>
      <div class="container detail-grid">
        <div>
          ${breadcrumbs([['/', 'Home'], ['/programs', 'AI Programs'], ['', p.title]])}
          <div class="pcard-kicker"><span class="mono">${p.id}</span>·<span>${esc(p.capabilityLabel)}</span>·<a href="/solutions/${pillar.slug}">${esc(pillar.name)}</a>${p.isNew ? '<span class="new-pill">NEW</span>' : ''}</div>
          <h1 class="h1">${esc(p.title)}</h1>
          <p class="lede">${esc(p.desc)}</p>
          <div class="tags">${p.chips.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
          <div class="hero-actions left">
            ${pilotCta(p, 'Request a pilot', 'btn btn-primary btn-lg')}
            <a class="btn btn-secondary btn-lg" href="/programs">Browse all programs</a>
          </div>
          <div class="pcard-meta">${meta.map(([i, t]) => `<span>${icon(i)}${esc(t)}</span>`).join('')}</div>
        </div>
        <div class="reveal">${frame(p, { tall: true })}</div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head reveal"><span class="eyebrow">Outcomes</span><h2 class="h2">What changes on your line.</h2></div>
        <div class="outcome-grid reveal${p.outcomes.length === 3 ? ' three' : ''}">
          ${p.outcomes.map((o, i) => `<article class="outcome-card"><span class="num">0${i + 1}</span>${icon('check', 'ic')}<p>${esc(o)}</p></article>`).join('\n          ')}
        </div>
      </div>
    </section>
${d ? `
    <section class="section" style="padding-top:0">
      <div class="container detail-two">
        <div class="reveal">
          <span class="eyebrow">Inputs</span>
          <h2 class="h2">${esc(d.inputsTitle)}</h2>
          <dl class="inputs">${d.inputs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </div>
        <div class="reveal">
          <span class="eyebrow">Design rules</span>
          <h2 class="h2">${esc(d.rulesTitle)}</h2>
          <ul class="rules">${d.rules.map((r) => `<li>${icon('check')}<span>${esc(r)}</span></li>`).join('')}</ul>
        </div>
      </div>
    </section>` : ''}
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head reveal"><span class="eyebrow">Integrations</span><h2 class="h2">What it connects to.</h2></div>
        <div class="connects reveal">
          ${p.connects.map(([ic, l]) => `<div class="integration">${icon(ic, '')}<span>${esc(l)}</span></div>`).join('\n          ')}
        </div>
      </div>
    </section>
${residency('Your data, your residency.')}${phases('From scoping call to a working pilot.', 'pilot')}
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head reveal"><span class="eyebrow">Related</span><h2 class="h2">Related programs.</h2></div>
        <div class="mini-grid reveal">${show.map(miniCard).join('')}
        </div>
      </div>
    </section>

${finalCta}
  </main>`;
}
