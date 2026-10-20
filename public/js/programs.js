/* AI Programs directory: search, filters, URL state. In the build this data moves to data/programs.json. */
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
  const CAP_LABEL = { vision: 'Computer vision', predictive: 'Predictive ML', agentic: 'Agentic / copilot', design: 'Design automation' };

  const PROGRAMS = [
    { id: 'P-01', icon: 'scan', title: 'AI Visual Inspection', img: 'media/programs/p01-visual-inspection.jpg',
      chips: ['Pharma', 'Automotive', 'Discrete'],
      desc: 'Edge-deployed computer vision trained on line-specific defect libraries (surface, dimensional, print and assembly-completeness), with sub-second inference and a human-in-the-loop review queue.',
      outcomes: ['Reduced escaped-defect rate and less end-of-line manual sampling', 'Audit-ready defect trail suitable for GMP and OEM reviews'],
      industry: ['pharma', 'automotive', 'discrete'], outcome: ['quality', 'compliance'], capability: ['vision'], data: ['cameras'] },
    { id: 'P-02', icon: 'package', title: 'Packaging & Bin-Count Verification', img: 'media/programs/p02-packaging-bincount.jpg',
      chips: ['Discrete & Batch', 'Pre-Dispatch QC'],
      desc: 'Vision-based AI counts each piece as it is placed and checks the final count against target before a container is sealed, with an auditable photo record and a logged override for exceptions.',
      outcomes: ['Miscounts caught at the packing station in seconds, not at the customer dock', 'Photo-backed proof of what shipped, with no added paperwork'],
      industry: ['discrete', 'batch'], outcome: ['quality', 'compliance'], capability: ['vision'], data: ['cameras'] },
    { id: 'P-03', icon: 'wrench', title: 'Predictive Maintenance', img: 'media/programs/p03-predictive-maintenance.jpg',
      chips: ['Rotating Equipment', 'Utilities', 'Critical Assets'],
      desc: 'Vibration, temperature, current and pressure data streamed to on-premise ML models trained on asset-specific failure signatures, with remaining-useful-life alerts and CMMS/EAM work-order integration.',
      outcomes: ['Fewer unplanned stoppages on critical lines and utilities', 'Shift from calendar-based to condition-based maintenance'],
      industry: ['utilities'], outcome: ['uptime'], capability: ['predictive'], data: ['sensors'] },
    { id: 'P-04', icon: 'calendar', title: 'Production Planning', img: 'media/programs/p04-production-planning.jpg',
      chips: ['Multi-Product', 'Batch & Discrete'],
      desc: 'Agentic re-planning that proposes revised schedules when an order changes. A plain-language interface lets planners request a build plan or dispatch report, checked against the BOM and live stock before anything is committed.',
      outcomes: ['Improved on-time delivery against customer commitments', 'Minutes, not hours, to turn a request into an approval-ready order'],
      industry: ['discrete', 'batch'], outcome: ['delivery'], capability: ['agentic'], data: ['erp'] },
    { id: 'P-05', icon: 'activity', title: 'Real-Time Shop-Floor Monitoring', img: 'media/programs/p05-shop-floor-monitoring.jpg',
      chips: ['Multi-Line Visibility', 'OEE'],
      desc: 'Real-time OEE, throughput and quality dashboards built on your existing SCADA/MES data and deployed on-premise, with an AI copilot that flags anomalies as they emerge and Andon-style escalation.',
      outcomes: ['Slowdowns caught within the hour, not at shift-end', 'Single real-time view of OEE across lines and shifts'],
      industry: [], outcome: ['oee'], capability: ['agentic'], data: ['scada'] },
    { id: 'P-06', icon: 'flame', title: 'Brazing Furnace Optimization', img: 'media/programs/p06-brazing-furnace.jpg',
      chips: ['Automotive Thermal', 'Heat-Exchangers'],
      desc: 'ML models trained on furnace zone temperatures, belt speed and atmosphere against downstream leak-test results, recommending parameter adjustments to hold the optimal thermal profile as load and product mix vary.',
      outcomes: ['Reduced scrap and rework from weak or over-brazed joints', 'Lower energy per unit through tighter thermal-profile control'],
      industry: ['automotive', 'thermal'], outcome: ['quality', 'energy'], capability: ['predictive'], data: ['process', 'sensors'] },
    { id: 'P-07', icon: 'route', title: 'Heat-Exchanger Circuit Router', img: 'media/programs/p07-circuit-router.svg', svg: true, isNew: true,
      chips: ['Heat-Exchangers', 'HVAC & Refrigeration Coils'],
      desc: "Generates refrigerant circuit (CKT) routing layouts for fin-and-tube heat exchangers from the coil grid, target circuits, parity, flow direction and dummy holes. It applies the design team's bend, drainage and coverage rules, balances circuit sizes across the face, and exports an SVG/PDF reference with every run saved for audit and reuse.",
      outcomes: ['Circuit layouts generated in one step instead of drawn by hand', 'Design rules enforced on every layout, with deviations explained', 'Every run stored with inputs and output for traceability'],
      meta: [['shield', 'Runs fully offline on your PC or plant server'], ['check', 'Delivered to a heat-exchanger OEM']],
      industry: ['thermal', 'hvac'], outcome: ['design', 'compliance'], capability: ['design'], data: ['specs'] },
  ];
  PROGRAMS.forEach((p, i) => (p.order = i));

  const params = new URLSearchParams(location.search);
  const state = { q: params.get('q') || '', sort: 'rec' };
  GROUPS.forEach((g) => (state[g.key] = new Set((params.get(g.key) || '').split(',').filter(Boolean))));

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const icon = (id, cls = 'ic-sm') => `<svg class="${cls}"><use href="media/icons.svg#${id}"/></svg>`;

  const matches = (p, skipKey) => {
    if (state.q) {
      const hay = [p.title, p.desc, ...p.chips, ...p.outcomes, CAP_LABEL[p.capability[0]]].join(' ').toLowerCase();
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
      <a class="pcard-media${p.svg ? ' svg' : ''}" href="#" data-open-modal data-program="${p.id}" aria-label="${esc(p.title)}">
        <img src="${p.img}" alt="" loading="lazy" />${p.isNew ? '<span class="new">NEW</span>' : ''}
      </a>
      <div class="pcard-body">
        <div class="pcard-kicker"><span class="mono">${p.id}</span>·<span>${CAP_LABEL[p.capability[0]]}</span></div>
        <h3>${esc(p.title)}</h3>
        <div class="tags">${p.chips.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
        <p class="desc">${esc(p.desc)}</p>
        <ul class="outcomes">${p.outcomes.map((o) => `<li>${icon('check')}${esc(o)}</li>`).join('')}</ul>
        <div class="pcard-foot">
          <div class="pcard-meta">${(p.meta || [['shield', 'On-prem or private cloud'], ['clock', 'Pilot in 4–8 wks']]).map(([i, t]) => `<span>${icon(i)}${t}</span>`).join('')}</div>
          <div class="pcard-actions">
            <a class="btn btn-secondary" href="#" data-open-modal data-program="${p.id}">View program ${icon('arrow-up-right', 'ic-sm go')}</a>
            <a class="btn btn-primary" href="#" data-open-modal data-program="${p.id}">Request a pilot</a>
          </div>
        </div>
      </div>
    </article>`;

  const inlineCta = `
    <div class="inline-cta">
      <div><h3>Don't see your use case?</h3><p>Describe the line, asset or workflow, and we'll map it to an existing program or scope a new one. More programs are in the pipeline.</p></div>
      <a class="btn btn-primary btn-md" href="#" data-open-modal>Scope your use case</a>
    </div>`;

  const empty = `
    <div class="empty">
      <h3>No programs match those filters.</h3>
      <p>Try removing a filter, or tell us what you're trying to solve.</p>
      <div><button class="btn btn-secondary btn-md" type="button" data-clear>Clear filters</button><a class="btn btn-primary btn-md" href="#" data-open-modal>Scope your use case</a></div>
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
