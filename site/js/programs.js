/* AI Programs directory: search, filters, URL state. Program data comes from data/programs.json, inlined at build time. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const GROUPS = [
    { key: 'industry', label: 'Industry', options: [
      ['pharma', 'Pharma'], ['automotive', 'Automotive'], ['discrete', 'Discrete'], ['batch', 'Batch & Process'],
      ['thermal', 'Thermal / Heat-Exchangers'], ['hvac', 'HVAC & Refrigeration'], ['utilities', 'Utilities & Critical Assets'] ] },
    { key: 'outcome', label: 'Business outcome', options: [
      ['quality', 'Quality & defect reduction'], ['uptime', 'Uptime & maintenance'], ['oee', 'Throughput & OEE'],
      ['delivery', 'On-time delivery'], ['energy', 'Energy & scrap'], ['design', 'Engineering & design time'], ['compliance', 'Compliance & audit trail'] ] },
    { key: 'capability', label: 'AI capability', options: [
      ['vision', 'Computer vision'], ['predictive', 'Predictive ML'], ['agentic', 'Agentic / copilot'], ['design', 'Design automation'] ] },
    { key: 'data', label: 'Data source', options: [
      ['cameras', 'Cameras & vision'], ['sensors', 'Sensors (vibration, temperature, current, pressure)'], ['scada', 'SCADA / MES'],
      ['erp', 'ERP, BOM & stock'], ['process', 'Process parameters'], ['specs', 'Coil specs & design rules'] ] },
  ];

  const PROGRAMS = JSON.parse(document.getElementById('programs-data').textContent);
  PROGRAMS.forEach((p, i) => (p.order = i));

  const params = new URLSearchParams(location.search);
  const state = { q: params.get('q') || '', sort: 'rec' };
  GROUPS.forEach((g) => (state[g.key] = new Set((params.get(g.key) || '').split(',').filter(Boolean))));

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const icon = (id, cls = 'ic-sm') => `<svg class="${cls}"><use href="/media/icons.svg#${id}"/></svg>`;

  const matches = (p, skipKey) => {
    if (state.q) {
      const hay = [p.title, p.desc, ...p.chips, ...p.outcomes, p.capabilityLabel].join(' ').toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return GROUPS.every((g) => g.key === skipKey || !state[g.key].size || p[g.key].some((v) => state[g.key].has(v)));
  };

  /* ---------- Filter sidebar ---------- */
  const groupsEl = $('#filterGroups');
  groupsEl.innerHTML = GROUPS.map((g) => `
    <details class="fgroup" open>
      <summary><span class="eyebrow">${g.label}</span>${icon('chevron-down')}</summary>
      <ul>${g.options.map(([v, l]) => `
        <li><label data-k="${g.key}" data-v="${v}"><input type="checkbox" value="${v}" name="${g.key}" />${esc(l)}<span class="count"></span></label></li>`).join('')}
      </ul>
    </details>`).join('');
  groupsEl.addEventListener('change', (e) => {
    const cb = e.target; const set = state[cb.name];
    cb.checked ? set.add(cb.value) : set.delete(cb.value);
    render();
  });

  /* ---------- Cards ---------- */
  const card = (p) => `
    <article class="pcard">
      <a class="pcard-media${p.svg ? ' svg' : ''}" href="/programs/${p.slug}" aria-label="${esc(p.title)}">
        <img src="${p.img}" alt="" loading="lazy" />${p.isNew ? '<span class="new">NEW</span>' : ''}
      </a>
      <div class="pcard-body">
        <div class="pcard-kicker"><span class="mono">${p.id}</span>·<span>${esc(p.capabilityLabel)}</span></div>
        <h3><a href="/programs/${p.slug}">${esc(p.title)}</a></h3>
        <div class="tags">${p.chips.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
        <p class="desc">${esc(p.desc)}</p>
        <ul class="outcomes">${p.outcomes.map((o) => `<li>${icon('check')}${esc(o)}</li>`).join('')}</ul>
        <div class="pcard-foot">
          <div class="pcard-meta">${(p.meta || [['shield', 'On-prem or private cloud'], ['clock', 'Pilot in 4–8 wks']]).map(([i, t]) => `<span>${icon(i)}${t}</span>`).join('')}</div>
          <div class="pcard-actions">
            <a class="btn btn-secondary" href="/programs/${p.slug}">View program ${icon('arrow-up-right', 'ic-sm go')}</a>
            <a class="btn btn-primary" href="/contact?program=${p.id}" data-open-modal data-program="${p.id}">Request a pilot</a>
          </div>
        </div>
      </div>
    </article>`;

  const inlineCta = `
    <div class="inline-cta">
      <div><h3>Don't see your use case?</h3><p>Describe the line, asset or workflow, and we'll map it to an existing program or scope a new one. More programs are in the pipeline.</p></div>
      <a class="btn btn-primary btn-md" href="/contact" data-open-modal>Scope your use case</a>
    </div>`;

  const empty = `
    <div class="empty">
      <h3>No programs match those filters.</h3>
      <p>Try removing a filter, or tell us what you're trying to solve.</p>
      <div><button class="btn btn-secondary btn-md" type="button" data-clear>Clear filters</button><a class="btn btn-primary btn-md" href="/contact" data-open-modal>Scope your use case</a></div>
    </div>`;

  /* ---------- Render ---------- */
  const render = () => {
    let list = PROGRAMS.filter((p) => matches(p));
    if (state.sort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (state.sort === 'new') list = [...list].sort((a, b) => b.order - a.order);

    const html = list.map(card);
    if (list.length) html.splice(Math.min(3, list.length), 0, inlineCta);
    $('#results').innerHTML = list.length ? html.join('') : empty;
    $('#count').innerHTML = `Showing <b>${list.length}</b> program${list.length === 1 ? '' : 's'}`;

    // Facet counts: what each option would return given the other filters
    document.querySelectorAll('.fgroup label').forEach((l) => {
      const { k, v } = l.dataset;
      const n = PROGRAMS.filter((p) => matches(p, k) && p[k].includes(v)).length;
      l.querySelector('.count').textContent = n;
      l.classList.toggle('zero', n === 0);
      l.querySelector('input').checked = state[k].has(v);
    });

    // Active chips
    const chips = [];
    if (state.q) chips.push(['q', state.q, `“${state.q}”`]);
    GROUPS.forEach((g) => state[g.key].forEach((v) => chips.push([g.key, v, g.options.find((o) => o[0] === v)?.[1] || v])));
    $('#activeFilters').innerHTML = chips.map(([k, v, l]) => `<button type="button" data-k="${k}" data-v="${esc(v)}">${esc(l)}${icon('x')}</button>`).join('');
    const nFilters = chips.length;
    $('#filterCount').textContent = nFilters ? `(${nFilters})` : '';

    // URL state
    const u = new URLSearchParams();
    if (state.q) u.set('q', state.q);
    GROUPS.forEach((g) => state[g.key].size && u.set(g.key, [...state[g.key]].join(',')));
    history.replaceState(null, '', u.toString() ? `?${u}` : location.pathname);
  };

  const clearAll = () => { state.q = ''; $('#q').value = ''; GROUPS.forEach((g) => state[g.key].clear()); render(); };

  $('#q').value = state.q;
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); state.q = $('#q').value.trim(); render(); });
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = $('#q').value.trim(); render(); }, 180); });
  document.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { state.q = b.dataset.q; $('#q').value = state.q; render(); }));
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('#clearAll').addEventListener('click', clearAll);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear]')) clearAll();
    const chip = e.target.closest('#activeFilters button');
    if (chip) {
      const { k, v } = chip.dataset;
      if (k === 'q') { state.q = ''; $('#q').value = ''; } else state[k].delete(v);
      render();
    }
  });

  // Mobile bottom sheet
  const filters = $('#filters');
  $('#openFilters').addEventListener('click', () => filters.classList.add('sheet-open'));
  $('#applyFilters').addEventListener('click', () => filters.classList.remove('sheet-open'));

  render();
})();
