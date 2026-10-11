/* MediCare AI — app shell
   Fetches shared HTML fragments (sidebar, topbar, public navbar) and injects them into placeholder
   elements, then wires the pieces that need JavaScript: mobile drawer, notification popover, user
   menu, global search, breadcrumbs and the floating assistant launcher. Requires the page to be
   served over http(s), not file:// — see frontend/README.md. */

async function loadPartial(targetSelector, partialPath) {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  try {
    const response = await fetch(partialPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    target.innerHTML = await response.text();
    hydrateIcons(target);
  } catch (err) {
    console.error(`Failed to load partial ${partialPath}`, err);
    target.innerHTML = '<p style="padding:16px;font-size:14px">Navigation failed to load. Serve the frontend over http:// (not file://) and refresh.</p>';
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-lazy="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.dataset.lazy = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** Highlights the sidebar/navbar link matching the current page filename. */
function highlightActiveNav() {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const active = link.getAttribute('data-nav-link') === current;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}

const ROLE_LABELS = { PATIENT: 'Patient', DOCTOR: 'Doctor', ADMIN: 'Administrator' };

/** Fills in the user's name/role/initials wherever the sidebar/topbar expects them. */
function populateUserChrome() {
  const user = Auth.getUser();
  if (!user) return;
  document.querySelectorAll('[data-user-name]').forEach((el) => (el.textContent = user.fullName));
  document.querySelectorAll('[data-user-role]').forEach((el) => (el.textContent = user.role));
  document.querySelectorAll('[data-user-role-label]').forEach((el) => (el.textContent = ROLE_LABELS[user.role] || user.role));
  document.querySelectorAll('[data-user-initial]').forEach((el) => {
    el.textContent = user.fullName ? user.fullName.charAt(0).toUpperCase() : '?';
  });
  document.querySelectorAll('[data-logout]').forEach((el) => el.addEventListener('click', () => Auth.logout()));
}

/** Hides any element with data-roles="ADMIN,DOCTOR" unless the current user's role is listed.
 *  This is presentation only — the backend enforces the real permissions. */
function applyRoleVisibility() {
  const user = Auth.getUser();
  const role = user ? user.role : null;
  document.querySelectorAll('[data-roles]').forEach((el) => {
    const allowed = el.getAttribute('data-roles').split(',').map((r) => r.trim());
    if (!role || !allowed.includes(role)) el.classList.add('hidden');
  });
}

/* ---------- Mobile drawer ---------- */

function initDrawer() {
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.querySelector('[data-open-nav]');
  if (!sidebar || !openBtn) return;
  let scrim = null;

  function open() {
    sidebar.classList.add('open');
    scrim = document.createElement('div');
    scrim.className = 'sidebar-scrim';
    scrim.addEventListener('click', close);
    document.body.appendChild(scrim);
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    sidebar.querySelector('a, button').focus();
  }
  function close() {
    sidebar.classList.remove('open');
    if (scrim) { scrim.remove(); scrim = null; }
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  openBtn.addEventListener('click', open);
  sidebar.querySelectorAll('[data-close-nav], .nav-link').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar.classList.contains('open')) { close(); openBtn.focus(); } });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) close(); });
}

/* ---------- Popovers ---------- */

function initPopover(rootId, buttonId, popId, onOpen) {
  const root = document.getElementById(rootId);
  const btn = document.getElementById(buttonId);
  const pop = document.getElementById(popId);
  if (!root || !btn || !pop) return;

  function setOpen(open) {
    pop.classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', String(open));
    if (open && onOpen) onOpen();
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.popover').forEach((p) => { if (p !== pop) p.classList.add('hidden'); });
    setOpen(pop.classList.contains('hidden'));
  });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.classList.contains('hidden')) { setOpen(false); btn.focus(); } });
}

/* ---------- Notifications ---------- */

const NOTIFICATION_ICONS = { APPOINTMENT: 'calendar-days', HEALTH_ALERT: 'siren', DOCTOR_MESSAGE: 'message-circle', SYSTEM: 'bell' };
let cachedNotifications = [];

function updateNotificationCount() {
  const unread = cachedNotifications.filter((n) => !n.read).length;
  const badge = document.getElementById('notif-count');
  if (!badge) return;
  badge.textContent = unread > 9 ? '9+' : String(unread);
  badge.classList.toggle('hidden', unread === 0);
  document.getElementById('notif-btn')?.setAttribute('aria-label', unread ? `Notifications, ${unread} unread` : 'Notifications');
}

function renderNotificationPopover() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const items = cachedNotifications.slice(0, 6);
  if (!items.length) {
    list.innerHTML = stateBlock({ icon: 'bell', title: "You're all caught up", text: 'Appointment updates will show up here.' });
    hydrateIcons(list);
    return;
  }
  list.innerHTML = items.map((n) => `
    <div class="flex gap-3 px-4 py-3" style="border-bottom:1px solid #EDF2F4;${n.read ? '' : 'background:#F3FAFA'}">
      <span class="state-icon" style="width:34px;height:34px;margin:0;border-radius:9px;flex-shrink:0">${icon(NOTIFICATION_ICONS[n.type] || 'bell', { size: 17 })}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold" style="margin:0">${esc(n.title)}</p>
        <p class="text-sm text-muted" style="margin:2px 0 0">${esc(n.message)}</p>
        <p class="text-xs text-faint" style="margin:4px 0 0">${esc(timeAgo(n.createdAt))}${n.read ? '' : ` · <button type="button" class="link text-xs" data-mark-read="${n.id}" style="background:none;border:0;cursor:pointer;padding:0;font-family:inherit">Mark as read</button>`}</p>
      </div>
    </div>`).join('');
  list.querySelectorAll('[data-mark-read]').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await apiFetch(`/notifications/${btn.dataset.markRead}/read`, { method: 'PUT' });
      const n = cachedNotifications.find((x) => String(x.id) === btn.dataset.markRead);
      if (n) n.read = true;
      updateNotificationCount();
      renderNotificationPopover();
    } catch (err) { showToast(err.message, 'error'); }
  }));
}

async function loadNotificationSummary() {
  try {
    cachedNotifications = await apiFetch('/notifications/me');
    updateNotificationCount();
  } catch (err) {
    console.error('Notifications unavailable:', err.message);
  }
}

/* ---------- Search, breadcrumbs ---------- */

function initGlobalSearch() {
  const role = Auth.getUser()?.role;
  const form = document.getElementById('global-search');
  const input = document.getElementById('global-search-input');
  const shortcut = document.getElementById('search-shortcut');
  if (!form || !input) return;
  const target = role === 'DOCTOR' ? 'patients.html' : 'doctors.html';
  input.placeholder = role === 'DOCTOR' ? 'Search patients' : 'Search doctors or specialties';
  if (shortcut) shortcut.href = target;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    window.location.href = `${target}${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  });
}

/** crumbs: [['Dashboard', 'dashboard.html'], ['Appointments']] — last item is the current page. */
function renderBreadcrumbs(crumbs) {
  const nav = document.getElementById('breadcrumbs');
  if (!nav) return;
  const all = crumbs && crumbs.length ? crumbs : [[document.title.split('–')[0].trim()]];
  nav.innerHTML = all.map(([label, href], i) => {
    const last = i === all.length - 1;
    const part = last || !href ? `<span aria-current="page">${esc(label)}</span>` : `<a href="${esc(href)}">${esc(label)}</a>`;
    return (i ? `${icon('chevron-right', { size: 14, cls: 'text-faint' })}` : '') + part;
  }).join('');
}

/* ---------- Assistant launcher (every signed-in page except the full chat page) ---------- */

function initChatLauncher() {
  if (window.location.pathname.split('/').pop() === 'chatbot.html') return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chat-launcher';
  btn.setAttribute('aria-label', 'Open AI health assistant');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = `${icon('message-circle', { size: 22 })}<span class="sm-up">Ask the assistant</span>`;
  btn.addEventListener('click', async () => {
    try {
      await loadScript('../js/chat.js');
      ChatWidget.open(btn);
    } catch (err) {
      showToast('The assistant could not be loaded. Refresh and try again.', 'error');
    }
  });
  document.body.appendChild(btn);
}

/**
 * Call from each signed-in page once the DOM is ready:
 *   initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['Appointments']] });
 * It loads the sidebar + topbar partials, then wires nav highlighting and user info — in that
 * order, since highlighting/user-fill need the partials' markup to exist first.
 */
async function initDashboardChrome(options = {}) {
  await Promise.all([
    loadPartial('#sidebar-container', '../partials/sidebar.html'),
    loadPartial('#topbar-container', '../partials/topbar.html'),
  ]);
  highlightActiveNav();
  populateUserChrome();
  applyRoleVisibility();
  initDrawer();
  initGlobalSearch();
  renderBreadcrumbs(options.crumbs);
  initPopover('user-root', 'user-btn', 'user-pop');
  initPopover('notif-root', 'notif-btn', 'notif-pop', renderNotificationPopover);
  initChatLauncher();
  loadNotificationSummary();
}

async function initPublicChrome() {
  await loadPartial('#navbar-container', '../partials/public-navbar.html');
  const btn = document.getElementById('public-menu-btn');
  const menu = document.getElementById('public-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', String(open));
      btn.innerHTML = icon(open ? 'x' : 'menu', { size: 20 });
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.classList.add('hidden')));
  }
}
