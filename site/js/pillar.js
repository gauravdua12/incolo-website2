/* Solution pillar pages: capability tabs + sticky sub-nav with scroll-spy. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Tabs (ARIA tabs pattern: click, arrow keys, Home/End) ---------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (n === undefined) return;
        e.preventDefault();
        select(tabs[(n + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- Sub-nav: highlight the section in view; show its CTA once the hero has scrolled away ---------- */
  const subnav = $('#subnav');
  if (!subnav) return;
  const links = $$('nav a', subnav);
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((s) => spy.observe(s));

  const heroCta = $('.pillar-hero .hero-actions');
  if (heroCta) {
    new IntersectionObserver(([en]) => subnav.classList.toggle('show-cta', !en.isIntersecting)).observe(heroCta);
  }
})();
