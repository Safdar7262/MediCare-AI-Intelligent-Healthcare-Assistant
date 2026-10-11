/* MediCare AI — reusable UI building blocks
   Dialogs (focus-trapped, Esc to close), confirm prompts, loading/empty/error states, field
   validation helpers, pagination and the doctor-availability helpers used by booking.
   Depends on icons.js and api.js. */

/* ---------------- Buttons ---------------- */

/** Disables a button and swaps its label for a spinner. Returns a function that restores it. */
function setLoading(button, loadingLabel) {
  const original = button.innerHTML;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.innerHTML = `${icon('loader-circle', { size: 16, cls: 'spinner' })}<span>${esc(loadingLabel)}</span>`;
  return () => {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.innerHTML = original;
  };
}

function debounce(fn, wait = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

/* ---------------- Dialogs ---------------- */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let dialogCount = 0;

/**
 * Opens an accessible dialog. `body` and `footer` are HTML strings (escape API data first).
 * Returns { el, close }. Closing restores focus to whatever opened it.
 */
function openModal({ title, body = '', footer = '', size = '', onClose, labelledBy }) {
  const opener = document.activeElement;
  const id = `dlg-${++dialogCount}`;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${size === 'lg' ? 'modal-lg' : ''}" role="dialog" aria-modal="true" aria-labelledby="${labelledBy || id}">
      <div class="modal-head">
        <h2 id="${id}">${esc(title)}</h2>
        <button type="button" class="btn btn-ghost btn-icon" data-modal-close aria-label="Close dialog">${icon('x', { size: 20 })}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  const modal = backdrop.querySelector('.modal');

  function close(result) {
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    if (!document.querySelector('.modal-backdrop')) document.body.style.overflow = '';
    if (opener && opener.focus) opener.focus();
    if (onClose) onClose(result);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...modal.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey, true);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', () => close()));
  hydrateIcons(backdrop);

  const firstField = modal.querySelector('.modal-body input, .modal-body select, .modal-body textarea');
  (firstField || modal.querySelector('[data-modal-close]')).focus();
  return { el: modal, close };
}

/** Promise-based confirmation. Resolves true only if the person confirms. */
function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Keep it', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const { el, close } = openModal({
      title,
      body: `<p style="margin:0;color:var(--muted);font-size:15px">${esc(message)}</p>`,
      footer: `<button type="button" class="btn btn-secondary" data-no>${esc(cancelLabel)}</button>
               <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(confirmLabel)}</button>`,
      onClose: () => done(false),
    });
    el.querySelector('[data-no]').addEventListener('click', () => close());
    el.querySelector('[data-yes]').addEventListener('click', () => { done(true); close(); });
  });
}

/* ---------------- States ---------------- */

function stateBlock({ icon: glyph = 'inbox', title, text = '', action = '', error = false }) {
  return `
    <div class="state" role="${error ? 'alert' : 'status'}">
      <div class="state-icon ${error ? 'is-error' : ''}">${icon(glyph, { size: 24 })}</div>
      <h3>${esc(title)}</h3>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${action}
    </div>`;
}

function skeletonLines(n = 3) {
  return Array.from({ length: n }, (_, i) =>
    `<div class="skeleton" style="height:14px;width:${i === n - 1 ? '60%' : '100%'};margin-bottom:10px"></div>`).join('');
}

function skeletonCards(n = 3, height = 180) {
  return Array.from({ length: n }, () => `<div class="skeleton" style="height:${height}px;border-radius:12px"></div>`).join('');
}

function skeletonRows(n = 4) {
  return Array.from({ length: n }, () =>
    `<div style="padding:16px 20px;border-bottom:1px solid var(--line)">${skeletonLines(2)}</div>`).join('');
}

/** Renders an error state with a Retry button wired to `retry`. */
function showError(container, message, retry) {
  container.innerHTML = stateBlock({
    icon: 'circle-alert', error: true, title: "Couldn't load this",
    text: message, action: retry ? '<button type="button" class="btn btn-secondary" data-retry>Try again</button>' : '',
  });
  hydrateIcons(container);
  if (retry) container.querySelector('[data-retry]').addEventListener('click', retry);
}

/* ---------------- Doctor avatar ---------------- */

/** Uses the profile image the backend stores, if any; otherwise initials. No stock photos are invented. */
function avatarHtml(name, imageUrl, size = 'md') {
  const img = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="" loading="lazy" onerror="this.remove()">`
    : '';
  return `<span class="avatar avatar-${size}" aria-hidden="true">${img}<span>${esc(initialsOf(name))}</span></span>`;
}

/* ---------------- Forms ---------------- */

function clearFieldErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach((el) => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
}

/** Shows an inline error under a field and links it for screen readers. */
function setFieldError(input, message) {
  const field = input.closest('.field') || input.parentElement;
  field.querySelectorAll('.field-error').forEach((el) => el.remove());
  const id = `err-${input.name || input.id}-${Math.random().toString(36).slice(2, 6)}`;
  const p = document.createElement('p');
  p.className = 'field-error';
  p.id = id;
  p.innerHTML = `${icon('circle-alert', { size: 14 })}<span></span>`;
  p.querySelector('span').textContent = message;
  (input.closest('.input-wrap') || input).insertAdjacentElement('afterend', p);
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', id);
}

/** Validates required/email/minlength/match constraints. Returns true when the form is valid and focuses the first problem. */
function validateForm(form, extra = {}) {
  clearFieldErrors(form);
  let firstBad = null;
  const fail = (input, msg) => { setFieldError(input, msg); if (!firstBad) firstBad = input; };

  form.querySelectorAll('input, select, textarea').forEach((input) => {
    if (input.type === 'hidden' || input.disabled) return;
    const value = (input.value || '').trim();
    const label = (input.closest('.field')?.querySelector('label')?.childNodes[0]?.textContent || input.name || 'This field').trim();
    if (input.required && !value) return fail(input, `${label} is required.`);
    if (value && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return fail(input, 'Enter a valid email address, like name@example.com.');
    if (value && input.minLength > 0 && value.length < input.minLength) return fail(input, `${label} must be at least ${input.minLength} characters.`);
    if (value && input.type === 'number') {
      if (input.min !== '' && Number(value) < Number(input.min)) return fail(input, `${label} must be ${input.min} or more.`);
    }
    if (extra[input.name]) { const msg = extra[input.name](value); if (msg) fail(input, msg); }
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

/** Wires every .toggle-password button to show/hide the input it sits next to. */
function initPasswordToggles(root = document) {
  root.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-wrap').querySelector('input');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', String(show));
      btn.innerHTML = icon(show ? 'eye-off' : 'eye', { size: 18 });
    });
  });
}

/* ---------------- Pagination ---------------- */

function paginate(items, page, size) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { slice: items.slice((current - 1) * size, current * size), page: current, pages };
}

function renderPager(container, { page, pages, total, size }, onChange) {
  if (pages <= 1) { container.innerHTML = ''; return; }
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  container.innerHTML = `
    <nav class="flex items-center justify-between gap-3 px-4 py-3" aria-label="Pagination">
      <p class="text-sm text-muted m-0">Showing ${from}–${to} of ${total}</p>
      <div class="flex gap-2">
        <button type="button" class="btn btn-secondary btn-sm" data-prev ${page <= 1 ? 'disabled' : ''}>${icon('chevron-left', { size: 16 })}Previous</button>
        <button type="button" class="btn btn-secondary btn-sm" data-next ${page >= pages ? 'disabled' : ''}>Next${icon('chevron-right', { size: 16 })}</button>
      </div>
    </nav>`;
  container.querySelector('[data-prev]').addEventListener('click', () => onChange(page - 1));
  container.querySelector('[data-next]').addEventListener('click', () => onChange(page + 1));
}

/* ---------------- Tabs (roving keyboard support) ---------------- */

function initTabs(tablist, onSelect) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  function select(tab, focus) {
    tabs.forEach((t) => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
    if (focus) tab.focus();
    onSelect(tab.dataset.tab);
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (dir) { e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true); }
    });
  });
  return select;
}

/* ---------------- Doctor availability ----------------
   The backend stores free-text `availableDays` (seed data uses 'MON,TUE,WED,THU,FRI'; the admin
   form suggests 'Mon–Fri') plus availableFrom/availableTo. It has NO endpoint that lists a
   doctor's already-booked slots to patients, so slots below are generated from the doctor's
   stated hours and a clash is only discovered when the booking request is rejected. */

const DAY_INDEX = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Returns a Set of weekday numbers (0=Sun) or null when the text can't be understood. */
function parseAvailableDays(text) {
  if (!text || !String(text).trim()) return null;
  const t = String(text).toUpperCase().replace(/[–—]|\bTO\b/g, '-').replace(/\s+/g, '');
  if (/^(DAILY|EVERYDAY|ALL)$/.test(t)) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const days = new Set();
  const key = (s) => DAY_INDEX[s.slice(0, 3)];
  for (const part of t.split(/[,;/&]+/).filter(Boolean)) {
    if (part.includes('-')) {
      const [a, b] = part.split('-');
      const start = key(a), end = key(b);
      if (start === undefined || end === undefined) return null;
      for (let d = start; ; d = (d + 1) % 7) { days.add(d); if (d === end) break; }
    } else {
      const d = key(part);
      if (d === undefined) return null;
      days.add(d);
    }
  }
  return days.size ? days : null;
}

/** Human-readable version of the stored days, e.g. "Mon – Fri" or "Mon, Wed, Fri". */
function describeAvailableDays(text) {
  const set = parseAvailableDays(text);
  if (!set) return text || 'Not specified';
  const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d));
  if (order.length === 7) return 'Every day';
  const contiguous = order.length > 2 && order.every((d, i) => i === 0 || ((d + 6) % 7 === order[i - 1]));
  return contiguous ? `${short[order[0]]} – ${short[order[order.length - 1]]}` : order.map((d) => short[d]).join(', ');
}

/** Bookable dates starting tomorrow (the backend requires a future date). */
function upcomingDates(doctor, count = 21) {
  const allowed = parseAvailableDays(doctor.availableDays);
  const out = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 1; i <= count; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i);
    out.push({ date: d, iso: toISODate(d), available: !allowed || allowed.has(d.getDay()) });
  }
  return out;
}

/** 30-minute slots between availableFrom and availableTo ("HH:MM" strings). */
function slotsFor(doctor, stepMinutes = 30) {
  const from = normalizeTime(doctor.availableFrom);
  const to = normalizeTime(doctor.availableTo);
  if (!from || !to) return [];
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const slots = [];
  for (let m = toMin(from); m + stepMinutes <= toMin(to); m += stepMinutes) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return slots;
}
