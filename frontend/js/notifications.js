/* MediCare AI — notifications page (/notifications/me, PUT /notifications/{id}/read) */

let allNotifications = [];
let notifTab = 'all';

function renderNotificationList() {
  const list = document.getElementById('notifications-list');
  list.setAttribute('aria-busy', 'false');
  const unread = allNotifications.filter((n) => !n.read);
  document.getElementById('unread-count').textContent = unread.length;
  document.getElementById('mark-all').disabled = unread.length === 0;
  const items = notifTab === 'unread' ? unread : allNotifications;

  if (!items.length) {
    list.innerHTML = stateBlock({ icon: 'bell', title: notifTab === 'unread' ? 'No unread notifications' : "You're all caught up", text: 'Appointment updates will appear here.' });
    hydrateIcons(list);
    return;
  }
  list.innerHTML = `<ul style="list-style:none;margin:0;padding:0">${items.map((n) => `
    <li class="flex items-start gap-3 px-5 py-4" style="border-bottom:1px solid #EDF2F4;${n.read ? '' : 'background:#F3FAFA'}">
      <span class="state-icon" style="margin:0;width:38px;height:38px">${icon(NOTIFICATION_ICONS[n.type] || 'bell', { size: 19 })}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold" style="margin:0">${esc(n.title)}${n.read ? '' : ' <span class="badge badge-brand" style="margin-left:6px">New</span>'}</p>
        <p class="text-sm text-muted" style="margin:2px 0 0">${esc(n.message)}</p>
        <p class="text-xs text-faint" style="margin:6px 0 0">${esc(formatDateTime(n.createdAt))}</p></div>
      ${n.read ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-read="${n.id}">Mark as read</button>`}
    </li>`).join('')}</ul>`;
  list.querySelectorAll('[data-read]').forEach((b) => b.addEventListener('click', () => markAsRead(b)));
}

async function loadNotifications() {
  const list = document.getElementById('notifications-list');
  list.setAttribute('aria-busy', 'true');
  list.innerHTML = skeletonRows(3);
  try { allNotifications = await apiFetch('/notifications/me'); renderNotificationList(); }
  catch (err) { showError(list, err.message, loadNotifications); }
}

async function markAsRead(button) {
  const restore = setLoading(button, 'Saving…');
  try {
    await apiFetch(`/notifications/${button.dataset.read}/read`, { method: 'PUT' });
    const n = allNotifications.find((x) => String(x.id) === button.dataset.read);
    if (n) n.read = true;
    renderNotificationList();
  } catch (err) { showToast(err.message, 'error'); restore(); }
}

async function markAllRead() {
  const btn = document.getElementById('mark-all');
  const pending = allNotifications.filter((n) => !n.read);
  const restore = setLoading(btn, 'Marking…');
  const results = await Promise.allSettled(pending.map((n) => apiFetch(`/notifications/${n.id}/read`, { method: 'PUT' })));
  results.forEach((r, i) => { if (r.status === 'fulfilled') pending[i].read = true; });
  const failed = results.filter((r) => r.status === 'rejected').length;
  restore();
  hydrateIcons(btn);
  renderNotificationList();
  if (failed) showToast(`${failed} notification${failed > 1 ? 's' : ''} couldn't be updated. Try again.`, 'error');
  else showToast('All notifications marked as read');
}

async function initNotificationsPage() {
  if (!Auth.requireAuth()) return;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['Notifications']] });
  initTabs(document.getElementById('notif-tabs'), (tab) => { notifTab = tab; renderNotificationList(); });
  document.getElementById('mark-all').addEventListener('click', markAllRead);
  await loadNotifications();
}
