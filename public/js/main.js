/* Incolo Systems 2.0 — shared behaviour (no dependencies) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: scrolled state ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mega-menus (click + hover on desktop, Esc to close) ---------- */
  const triggers = $$('.nav-trigger[aria-controls]');
  const closeAll = (except) => triggers.forEach((t) => {
    if (t === except) return;
    t.setAttribute('aria-expanded', 'false');
    $('#' + t.getAttribute('aria-controls')).classList.remove('open');
  });
  const setOpen = (t, open) => {
    closeAll(t);
    t.setAttribute('aria-expanded', String(open));
    $('#' + t.getAttribute('aria-controls')).classList.toggle('open', open);
  };
  const desktop = () => matchMedia('(min-width: 961px)').matches;
  triggers.forEach((t) => {
    const item = t.closest('.nav-item');
    let timer;
    t.addEventListener('click', () => setOpen(t, t.getAttribute('aria-expanded') !== 'true'));
    item.addEventListener('mouseenter', () => { if (desktop()) { clearTimeout(timer); setOpen(t, true); } });
    item.addEventListener('mouseleave', () => { if (desktop()) timer = setTimeout(() => setOpen(t, false), 120); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.nav-item')) closeAll(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  /* ---------- Mobile menu ---------- */
  const toggle = $('#navToggle');
  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('.nav a').forEach((a) => a.addEventListener('click', () => { header.classList.remove('menu-open'); closeAll(); }));

  /* ---------- Network-line background (seeded, so it is stable between loads) ---------- */
  $$('svg[data-net]').forEach((svg, idx) => {
    let seed = 7 + idx * 31;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const W = 1440, H = 900, pts = [];
    for (let i = 0; i < 46; i++) pts.push([rnd() * W, rnd() * H]);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    let d = '';
    pts.forEach((p, i) => {
      pts.map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])])
        .filter(([j]) => j > i).sort((a, b) => a[1] - b[1]).slice(0, 2)
        .forEach(([j, dist]) => { if (dist < 320) d += `M${p[0] | 0} ${p[1] | 0}L${pts[j][0] | 0} ${pts[j][1] | 0}`; });
    });
    svg.innerHTML = `<path d="${d}" stroke="#cfdeee" stroke-width="1" fill="none"/>` +
      pts.map((p) => `<circle cx="${p[0] | 0}" cy="${p[1] | 0}" r="2.2" fill="#b9d0ec"/>`).join('');
  });

  /* ---------- Binary-digit texture (tagline band) ---------- */
  $$('svg[data-binary]').forEach((svg) => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const W = 1440, H = 360, step = 34;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    let out = '';
    for (let x = 18; x < W; x += step) {
      if (rnd() < 0.18) continue; // gaps between columns, like falling code
      const start = rnd() * H * 0.5;
      for (let y = 24 + start * 0.2; y < H; y += 36) {
        if (rnd() < 0.12) continue;
        const o = (0.07 + rnd() * 0.12).toFixed(2), fs = rnd() < 0.3 ? 14 : 22;
        out += `<text x="${x}" y="${y | 0}" font-size="${fs}" fill-opacity="${o}">${rnd() < 0.5 ? 0 : 1}</text>`;
      }
    }
    svg.innerHTML = `<g fill="#1d65cc" font-family="IBM Plex Mono, monospace">${out}</g>`;
  });

  /* ---------- Announcement pill rotation ---------- */
  const ann = $('#announceText');
  if (ann && !reduced) {
    const msgs = [
      ['Data residency, your choice: on-premise or private cloud', 'programs.html'],
      ['Industry 5.0: automations & AI solutions for all', 'index.html#tagline'],
      ['From scoping to a working pilot on one line in 4–8 weeks', 'programs.html'],
      ['New: Heat-Exchanger Circuit Router, now in use at a heat-exchanger OEM', 'programs.html?q=circuit'],
      ['New: Brazing Furnace Optimization program', 'programs.html?q=brazing'],
    ];
    let i = 0;
    setInterval(() => {
      ann.classList.add('out');
      setTimeout(() => {
        i = (i + 1) % msgs.length;
        ann.textContent = msgs[i][0];
        $('#announce').href = msgs[i][1];
        ann.classList.remove('out');
      }, 300);
    }, 4500);
  }

  /* ---------- Sticky showcase ---------- */
  const steps = $$('.sc-step');
  if (steps.length) {
    const texts = $$('.sc-text'), bars = $$('.sc-progress i');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const n = +en.target.dataset.step;
        texts.forEach((t) => t.classList.toggle('active', +t.dataset.step === n));
        bars.forEach((b, k) => b.classList.toggle('on', k <= n));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  /* ---------- "Just ask." typing prompt ---------- */
  const typed = $('#typed');
  if (typed) {
    const prompts = [
      'Why did OEE drop on Line 3 last shift?',
      'Draft a revised build plan for the changed order.',
      'Show escaped defects by station this week.',
      'Which assets are trending toward failure?',
    ];
    const sug = $('#askSuggest'), send = $('#send');
    prompts.forEach((p, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = p;
      b.addEventListener('click', () => { idx = k; restart(); });
      sug.appendChild(b);
    });
    let idx = 0, timer;
    const mark = () => $$('button', sug).forEach((b, k) => b.classList.toggle('on', k === idx));
    const restart = () => { clearTimeout(timer); typed.textContent = ''; mark(); type(0); };
    const type = (c) => {
      const s = prompts[idx];
      if (reduced) { typed.textContent = s; return; }
      if (c <= s.length) { typed.textContent = s.slice(0, c); timer = setTimeout(() => type(c + 1), 38 + Math.random() * 40); return; }
      send.classList.add('fire');
      setTimeout(() => send.classList.remove('fire'), 180);
      timer = setTimeout(() => { idx = (idx + 1) % prompts.length; restart(); }, 2600);
    };
    const start = new IntersectionObserver(([en]) => { if (en.isIntersecting) { restart(); start.disconnect(); } });
    start.observe(typed);
  }

  /* ---------- Why-Incolo carousel ---------- */
  const slides = $$('.why-slide');
  if (slides.length) {
    let cur = 0, auto;
    const show = (n) => {
      cur = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('active', k === cur));
    };
    const play = () => { if (!reduced) { clearInterval(auto); auto = setInterval(() => show(cur + 1), 7000); } };
    $('#whyPrev').addEventListener('click', () => { show(cur - 1); play(); });
    $('#whyNext').addEventListener('click', () => { show(cur + 1); play(); });
    play();
  }

  /* ---------- Scoping-call dialog ---------- */
  const modal = $('#scopeModal');
  const openModal = (program) => {
    if (!modal) return;
    const sel = $('#f-program');
    if (program && sel) [...sel.options].forEach((o) => { if (o.text.startsWith(program)) sel.value = o.value || o.text; });
    $('#formStatus').textContent = '';
    modal.showModal();
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-modal]');
    if (!t) return;
    e.preventDefault();
    closeAll(); header.classList.remove('menu-open');
    openModal(t.dataset.program);
  });
  $$('[data-close-modal]').forEach((b) => b.addEventListener('click', () => modal.close()));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
  $('#scopeForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    $('#formStatus').textContent = 'Mockup only: in the build this posts to /api/contact and emails business@incolosystems.com.';
  });
  window.incoloOpenModal = openModal;

  /* ---------- Reveal on scroll ---------- */
  const rv = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); rv.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => rv.observe(el));

  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
