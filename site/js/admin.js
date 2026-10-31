/* /admin: sign in, edit booking settings, see upcoming bookings. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const api = async (method, url, body) => {
    const res = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    const d = await res.json().catch(() => ({ ok: false, message: `HTTP ${res.status}` }));
    return { status: res.status, ...d };
  };
  const setStatus = (el, text, ok) => { el.textContent = text; el.className = 'form-status ' + (ok ? 'is-ok' : 'is-err'); };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const form = $('#settingsForm');
  let current = null;

  function fill(s) {
    current = s;
    form.invitees.value = s.invitees.join('\n');
    form.blackoutDates.value = s.blackoutDates.join('\n');
    for (const k of ['organizerName', 'organizerEmail', 'startTime', 'endTime', 'timezone', 'bufferMinutes', 'minNoticeHours', 'windowDays', 'meetingTitle', 'meetingNote']) form[k].value = s[k];
    if (![...form.slotMinutes.options].some((o) => o.value === String(s.slotMinutes))) form.slotMinutes.add(new Option(`${s.slotMinutes} minutes`, s.slotMinutes));
    form.slotMinutes.value = String(s.slotMinutes);
    $$('#workDays input').forEach((c) => { c.checked = s.workDays.includes(Number(c.value)); });
  }

  function read() {
    const lines = (v) => v.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
    return {
      ...current,
      invitees: lines(form.invitees.value),
      blackoutDates: lines(form.blackoutDates.value),
      organizerName: form.organizerName.value.trim(),
      organizerEmail: form.organizerEmail.value.trim(),
      workDays: $$('#workDays input:checked').map((c) => Number(c.value)),
      startTime: form.startTime.value,
      endTime: form.endTime.value,
      timezone: form.timezone.value.trim(),
      slotMinutes: Number(form.slotMinutes.value),
      bufferMinutes: Number(form.bufferMinutes.value),
      minNoticeHours: Number(form.minNoticeHours.value),
      windowDays: Number(form.windowDays.value),
      meetingTitle: form.meetingTitle.value.trim(),
      meetingNote: form.meetingNote.value.trim(),
    };
  }

  function renderStatus(st) {
    const g = { google: ['ok', 'Google Calendar connected'], 'dry-run': ['warn', 'Google: dry run (no real events)'], 'not-configured': ['warn', 'Google Calendar not configured'] }[st.google];
    $('#statusRow').innerHTML =
      `<span class="pill-status ${g[0]}">${g[1]}</span>` +
      `<span class="pill-status ${st.smtp ? 'ok' : 'warn'}">${st.smtp ? 'Email (SMTP) configured' : 'Email (SMTP) not configured: invites will not be sent'}</span>`;
    $('#files').textContent = `Settings: ${st.settingsFile} · Bookings: ${st.bookingsFile}`;
  }

  function renderBookings(list) {
    const tbody = $('#bookings tbody');
    $('#bookings').hidden = !list.length;
    $('#bookingsEmpty').hidden = !!list.length;
    const tz = current?.timezone || 'Asia/Kolkata';
    const when = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
    tbody.innerHTML = list.map((b) => `<tr>
      <td>${esc(when(b.start))}${b.dryRun ? '<small>dry run</small>' : ''}${b.mailed ? '' : '<small>invite email not sent</small>'}</td>
      <td>${esc(b.name)}<small>${esc(b.designation)}, ${esc(b.company)}</small><small><a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.phone ? ' · ' + esc(b.phone) : ''}</small></td>
      <td>${esc(b.challenge.length > 160 ? b.challenge.slice(0, 160) + '…' : b.challenge)}${b.program ? `<small>${esc(b.program)}</small>` : ''}</td>
      <td><a href="${esc(b.meetLink)}" target="_blank" rel="noopener">Join</a>${b.htmlLink ? `<small><a href="${esc(b.htmlLink)}" target="_blank" rel="noopener">Calendar</a></small>` : ''}</td>
    </tr>`).join('');
  }

  async function loadDash() {
    const st = await api('GET', '/api/admin/state');
    if (st.status === 401) return showLogin();
    fill(st.settings);
    renderStatus(st.status);
    renderBookings(st.upcoming);
    $('#loginCard').hidden = true;
    $('#dash').hidden = false;
    $('#logout').hidden = false;
  }

  function showLogin() {
    $('#dash').hidden = true;
    $('#logout').hidden = true;
    $('#loginCard').hidden = false;
    $('#password').focus();
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const st = $('.form-status', e.target);
    const r = await api('POST', '/api/admin/login', { password: $('#password').value });
    $('#password').value = '';
    if (r.ok) { st.textContent = ''; loadDash(); } else setStatus(st, r.message || 'Sign-in failed.', false);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await api('PUT', '/api/admin/settings', { settings: read() });
    if (r.status === 401) return showLogin();
    if (r.ok) { fill(r.settings); setStatus($('#saveStatus'), 'Saved. The booking calendar uses these settings now.', true); }
    else setStatus($('#saveStatus'), r.message || 'Could not save.', false);
  });

  $('#testGoogle').addEventListener('click', async () => {
    setStatus($('#testStatus'), 'Testing…', true);
    const r = await api('POST', '/api/admin/test-google');
    if (r.status === 401) return showLogin();
    setStatus($('#testStatus'), r.detail || r.message || 'No response.', r.ok);
  });

  $('#logout').addEventListener('click', async () => { await api('POST', '/api/admin/logout'); showLogin(); });

  (async () => {
    const s = await api('GET', '/api/admin/session');
    if (!s.enabled) { $('#disabledCard').hidden = false; return; }
    if (s.loggedIn) loadDash(); else showLogin();
  })();
})();
