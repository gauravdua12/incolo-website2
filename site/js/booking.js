/* Scoping-call booking: calendar → time slot → details → confirmation. Talks to /api/slots and /api/book. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // One shared fetch of availability (refreshed after 2 min or after a clash).
  let cache = null;
  async function loadSlots(force) {
    if (!force && cache && Date.now() - cache.at < 120000) return cache.data;
    const res = await fetch('/api/slots', { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({ ok: false }));
    if (!res.ok || !data.ok) throw Object.assign(new Error(data.message || 'unavailable'), { status: res.status });
    cache = { at: Date.now(), data };
    return data;
  }

  const fmt = (tz, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts });
  const keyToDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
  const monthKey = (key) => key.slice(0, 7);
  const sameOffset = (tz, iso) => fmt(tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) ===
    fmt(visitorTz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

  function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const grid = $('.bk-grid', root), monthEl = $('.bk-month', root), slotsEl = $('.bk-slots', root);
    const timesTitle = $('.bk-times-title', root), tzEl = $('.bk-tz', root), note = $('.bk-note', root);
    const form = $('.bk-form', root), status = $('.form-status', form), btn = $('button[type="submit"]', form), btnLabel = $('.btn-label', form);
    let data = null, month = null, selectedDate = null, selectedSlot = null;

    const show = (step) => {
      $$('[data-step]', root).forEach((el) => { el.hidden = el.dataset.step !== step; });
      $$('[data-step-label]', root).forEach((li) => li.classList.toggle('on', li.dataset.stepLabel === step));
      const order = ['pick', 'form', 'done'];
      $$('[data-step-label]', root).forEach((li) => li.classList.toggle('done', order.indexOf(li.dataset.stepLabel) < order.indexOf(step)));
    };

    const days = () => new Map(data.days.map((d) => [d.date, d.slots]));
    const months = () => [...new Set(data.days.map((d) => monthKey(d.date)))];

    function renderMonth() {
      const avail = days();
      const [y, m] = month.split('-').map(Number);
      monthEl.textContent = fmt('UTC', { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 15)));
      const first = new Date(Date.UTC(y, m - 1, 1));
      const lead = (first.getUTCDay() + 6) % 7; // Monday-first grid
      const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<span class="bk-day empty"></span>');
      for (let d = 1; d <= count; d++) {
        const key = `${month}-${String(d).padStart(2, '0')}`;
        const has = avail.has(key);
        const label = fmt('UTC', { weekday: 'long', day: 'numeric', month: 'long' }).format(keyToDate(key));
        cells.push(has
          ? `<button type="button" class="bk-day avail${key === selectedDate ? ' sel' : ''}" data-date="${key}" aria-pressed="${key === selectedDate}" aria-label="${label}, available">${d}</button>`
          : `<span class="bk-day" aria-hidden="true">${d}</span>`);
      }
      grid.innerHTML = cells.join('');
      const ms = months();
      $('[data-month="-1"]', root).disabled = ms.indexOf(month) <= 0;
      $('[data-month="1"]', root).disabled = ms.indexOf(month) >= ms.length - 1;
    }

    function renderSlots() {
      if (!selectedDate) { slotsEl.innerHTML = ''; timesTitle.textContent = 'Select a date to see times'; return; }
      const list = days().get(selectedDate) || [];
      timesTitle.textContent = fmt('UTC', { weekday: 'long', day: 'numeric', month: 'long' }).format(keyToDate(selectedDate));
      slotsEl.innerHTML = list.map((iso) => {
        const main = fmt(data.timezone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
        const local = sameOffset(data.timezone, iso) ? '' : `<small>${fmt(visitorTz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))} your time</small>`;
        return `<button type="button" class="bk-slot" data-start="${iso}">${main}${local}</button>`;
      }).join('');
    }

    async function refresh(force) {
      note.hidden = false;
      note.classList.remove('is-err');
      note.textContent = 'Loading available times…';
      try {
        data = await loadSlots(force);
        $$('.bk-duration').forEach((el) => { el.textContent = data.slotMinutes; });
        if (data.organizer) {
          $$('[data-bk-organizer]').forEach((el) => { el.textContent = `${data.organizer.name} (${data.organizer.email})`; });
          $$('[data-bk-organizer-email]').forEach((el) => { el.textContent = data.organizer.email; });
        }
        const tzName = data.timezone === 'Asia/Kolkata' ? 'IST (India)' : data.timezone;
        tzEl.textContent = `Times in ${tzName}${data.days.length && !sameOffset(data.timezone, data.days[0].slots[0]) ? ', with your local time below' : ''}.`;
        if (!data.days.length) { note.textContent = 'No times are open right now. Please email business@incolosystems.com and we will find one.'; grid.innerHTML = ''; return; }
        note.hidden = true;
        if (!selectedDate || !days().has(selectedDate)) selectedDate = data.days[0].date;
        month = monthKey(selectedDate);
        renderMonth();
        renderSlots();
      } catch (e) {
        note.classList.add('is-err');
        note.innerHTML = 'Online booking is unavailable right now. Email <a href="mailto:business@incolosystems.com">business@incolosystems.com</a> or call <a href="tel:+919920323832">+91 99203 23832</a> and we\'ll set up the call.';
      }
    }

    root.addEventListener('click', (e) => {
      const nav = e.target.closest('.bk-nav');
      if (nav) {
        const ms = months();
        month = ms[Math.min(ms.length - 1, Math.max(0, ms.indexOf(month) + Number(nav.dataset.month)))];
        renderMonth();
        return;
      }
      const day = e.target.closest('.bk-day.avail');
      if (day) { selectedDate = day.dataset.date; renderMonth(); renderSlots(); $('.bk-slot', slotsEl)?.focus(); return; }
      const slot = e.target.closest('.bk-slot');
      if (slot) {
        selectedSlot = slot.dataset.start;
        form.elements.start.value = selectedSlot;
        const d = new Date(selectedSlot);
        const tzLabel = data.timezone === 'Asia/Kolkata' ? 'IST' : data.timezone;
        let text = `${fmt(data.timezone, { weekday: 'short', day: 'numeric', month: 'short' }).format(d)} · ${fmt(data.timezone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)} ${tzLabel}`;
        if (!sameOffset(data.timezone, selectedSlot)) text += ` (${fmt(visitorTz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)} your time)`;
        $('.bk-chosen-label', root).textContent = text;
        status.textContent = ''; status.className = 'form-status';
        show('form');
        form.elements.name.focus();
        return;
      }
      if (e.target.closest('.bk-change')) { show('pick'); return; }
      if (e.target.closest('.bk-again')) { show('pick'); refresh(true); }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.disabled = true; btnLabel.textContent = 'Booking…';
      status.textContent = ''; status.className = 'form-status';
      try {
        const res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'fetch' },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.ok && d.booking) {
          $('.bk-done-when', root).textContent = $('.bk-chosen-label', root).textContent;
          $('.bk-done-msg', root).textContent = d.message;
          const link = $('.bk-meet-link', root);
          link.href = d.booking.meetLink; link.textContent = d.booking.meetLink.replace(/^https:\/\//, '');
          const ics = $('.bk-ics', root);
          if (ics.href.startsWith('blob:')) URL.revokeObjectURL(ics.href);
          ics.href = URL.createObjectURL(new Blob([d.ics], { type: 'text/calendar' }));
          form.reset();
          cache = null;
          show('done');
          $('.bk-done', root).focus();
        } else {
          status.textContent = d.message || 'Something went wrong. Please try again.';
          status.classList.add('is-err');
          if (d.refresh) { await refresh(true); setTimeout(() => show('pick'), 1800); }
        }
      } catch {
        status.textContent = 'Network error. Please try again, or email business@incolosystems.com.';
        status.classList.add('is-err');
      } finally {
        btn.disabled = false; btnLabel.textContent = 'Confirm booking';
      }
    });

    show('pick');
    refresh(false);
  }

  // The contact page shows the widget immediately; the dialog loads it when first opened.
  const inline = $('#c-booking');
  if (inline) init(inline);
  const modal = $('#scopeModal');
  if (modal) {
    const open = () => {
      const r = $('#m-booking');
      if (r.dataset.ready && !$('.bk-done', r).hidden) $('.bk-again', r).click(); // fresh start after a booking
      init(r);
    };
    modal.addEventListener('booking:open', open);
    if (modal.open) open();
  }
})();
