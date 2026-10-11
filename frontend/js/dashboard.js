/* MediCare AI — dashboard, role-aware (PATIENT / DOCTOR / ADMIN)
   statusBadge() lives in api.js. Every number and row here comes from the existing endpoints:
   /appointments/me, /appointments/doctor/me, /patients/me, /reports/patient/{id},
   /notifications/me, /admin/stats, /admin/appointments/recent. */

const RECENT_DOCTORS_KEY = 'medicareai_recent_doctors'; // frontend-only convenience, set on doctor profile views

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function setHeader(title, sub, actionsHtml = '') {
  document.getElementById('greeting').textContent = title;
  document.getElementById('greeting-sub').textContent = sub;
  const actions = document.getElementById('head-actions');
  actions.innerHTML = actionsHtml;
  hydrateIcons(actions);
}

function renderStats(cards) {
  const el = document.getElementById('stats');
  el.setAttribute('aria-busy', 'false');
  el.innerHTML = cards.map((c) => `
    <div class="card stat">
      <div class="stat-icon">${icon(c.icon, { size: 20 })}</div>
      <div class="stat-value">${esc(c.value)}</div>
      <div class="stat-label">${esc(c.label)}</div>
    </div>`).join('');
}

function panel(title, bodyHtml, linkHtml = '') {
  return `<section class="card" aria-label="${esc(title)}"><div class="card-head"><h2>${esc(title)}</h2>${linkHtml}</div>${bodyHtml}</section>`;
}

function appointmentItem(a, role) {
  const who = role === 'DOCTOR' || role === 'ADMIN' ? a.patientName : drName(a.doctorName);
  const sub = role === 'ADMIN' ? `${a.patientName} with ${drName(a.doctorName)}` : (a.specialization || (role === 'DOCTOR' ? 'Appointment' : 'General'));
  return `
    <li class="flex items-center gap-3 px-5 py-3" style="border-bottom:1px solid #EDF2F4">
      ${avatarHtml(role === 'ADMIN' ? a.patientName : (role === 'DOCTOR' ? a.patientName : a.doctorName), null, 'md')}
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold" style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(role === 'ADMIN' ? a.patientName : who)}</p>
        <p class="text-sm text-muted" style="margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(sub)}</p>
      </div>
      <div class="text-right" style="flex-shrink:0">
        <p class="text-sm font-semibold" style="margin:0">${esc(formatDate(a.appointmentDate, { day: 'numeric', month: 'short' }))}, ${esc(formatTime(a.appointmentTime))}</p>
        <div style="margin-top:4px">${statusBadge(a.status)}</div>
      </div>
    </li>`;
}

function appointmentList(items, role, emptyState) {
  if (!items.length) return emptyState;
  return `<ul style="list-style:none;margin:0;padding:0">${items.map((a) => appointmentItem(a, role)).join('')}</ul>`;
}

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];
const isActive = (a) => ACTIVE_STATUSES.includes(a.status);
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }

/* ---------------- Patient ---------------- */

async function loadPatientDashboard(user) {
  const me = await apiFetch('/patients/me').catch(() => null);
  const [apptRes, reportRes, notifRes] = await Promise.allSettled([
    apiFetch('/appointments/me'),
    me ? apiFetch(`/reports/patient/${me.id}`) : Promise.reject(new Error('no profile')),
    apiFetch('/notifications/me'),
  ]);
  if (apptRes.status === 'rejected') throw apptRes.reason;
  const appointments = apptRes.value;
  const reports = reportRes.status === 'fulfilled' ? reportRes.value : null;
  const notifications = notifRes.status === 'fulfilled' ? notifRes.value : null;

  const upcoming = appointments.filter((a) => isActive(a) && appointmentTimestamp(a) >= startOfToday())
    .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));
  const history = [...appointments].sort((a, b) => appointmentTimestamp(b) - appointmentTimestamp(a));
  const unread = notifications ? notifications.filter((n) => !n.read) : null;

  setHeader(`${greeting()}, ${user.fullName.split(' ')[0]}`,
    upcoming.length ? `You have ${upcoming.length} upcoming appointment${upcoming.length > 1 ? 's' : ''}.` : 'Nothing booked yet. Find a doctor when you’re ready.',
    '<a href="doctors.html" class="btn btn-primary"><i data-icon="calendar-plus" data-size="18"></i>Book an appointment</a>');

  renderStats([
    { label: 'Upcoming appointments', value: upcoming.length, icon: 'calendar-check' },
    { label: 'Total appointments', value: appointments.length, icon: 'calendar-days' },
    { label: 'Reports on file', value: reports ? reports.length : '—', icon: 'file-text' },
    { label: 'Unread notifications', value: unread ? unread.length : '—', icon: 'bell' },
  ]);

  const next = upcoming[0];
  const nextHtml = next ? `
    <section class="card" aria-label="Next appointment">
      <div class="card-head"><h2>Next appointment</h2>${statusBadge(next.status)}</div>
      <div class="card-pad flex flex-wrap items-center gap-5">
        ${avatarHtml(next.doctorName, null, 'lg')}
        <div class="flex-1" style="min-width:200px">
          <p class="text-lg font-bold" style="margin:0">${esc(drName(next.doctorName))}</p>
          <p class="text-muted" style="margin:2px 0 10px">${esc(next.specialization || 'General practice')}</p>
          <div class="grid gap-1">
            <div class="meta-row">${icon('calendar-days', { size: 16 })}${esc(formatDate(next.appointmentDate))}</div>
            <div class="meta-row">${icon('clock', { size: 16 })}${esc(formatTime(next.appointmentTime))}</div>
          </div>
        </div>
        <a href="appointments.html" class="btn btn-secondary">Manage</a>
      </div>
    </section>` : panel('Next appointment', stateBlock({
      icon: 'calendar-plus', title: 'No upcoming appointments',
      text: 'Book a visit with a doctor and it will appear here.',
      action: '<a href="doctors.html" class="btn btn-primary">Find a doctor</a>',
    }));

  const recentHtml = panel('Appointment history', appointmentList(history.slice(0, 5), 'PATIENT', stateBlock({
    icon: 'history', title: 'No appointments yet', text: 'Your past and current appointments will be listed here.',
  })), appointments.length > 5 ? '<a href="appointments.html" class="link text-sm">View all</a>' : '');
  document.getElementById('primary').innerHTML = nextHtml + recentHtml;

  /* Secondary column: quick actions, reminders, recently viewed doctors */
  const actions = [
    ['doctors.html', 'stethoscope', 'Find a doctor'],
    ['appointments.html', 'calendar-days', 'My appointments'],
    ['reports.html', 'file-text', 'Medical records'],
    ['chatbot.html', 'message-circle', 'Ask the assistant'],
  ];
  const quick = panel('Quick actions', `<div class="grid grid-cols-2 gap-2 p-4">${actions.map(([href, ic, label]) =>
    `<a href="${href}" class="card flex flex-col gap-2 p-3" style="box-shadow:none;text-decoration:none;color:var(--ink)"><span class="state-icon" style="margin:0;width:36px;height:36px">${icon(ic, { size: 18 })}</span><span class="text-sm font-semibold">${label}</span></a>`).join('')}</div>`);

  const soon = upcoming.filter((a) => appointmentTimestamp(a) - Date.now() < 48 * 3600 * 1000 && appointmentTimestamp(a) >= startOfToday());
  const reminders = soon.map((a) => `
    <li class="flex gap-3 px-5 py-3" style="border-bottom:1px solid #EDF2F4">${icon('clock', { size: 18, cls: 'text-brand-600' })}
      <p class="text-sm" style="margin:0"><strong>${esc(drName(a.doctorName))}</strong> on ${esc(formatDate(a.appointmentDate, { weekday: 'short', day: 'numeric', month: 'short' }))} at ${esc(formatTime(a.appointmentTime))}</p></li>`).join('');
  const notes = (unread || []).slice(0, 3).map((n) => `
    <li class="flex gap-3 px-5 py-3" style="border-bottom:1px solid #EDF2F4">${icon('bell', { size: 18, cls: 'text-brand-600' })}
      <div><p class="text-sm font-semibold" style="margin:0">${esc(n.title)}</p><p class="text-sm text-muted" style="margin:0">${esc(n.message)}</p></div></li>`).join('');
  const reminderBody = (reminders || notes)
    ? `<ul style="list-style:none;margin:0;padding:0">${reminders}${notes}</ul>`
    : stateBlock({ icon: 'bell', title: 'All caught up', text: 'Reminders and unread updates will show here.' });
  const reminderPanel = panel('Reminders', reminderBody, '<a href="notifications.html" class="link text-sm">All notifications</a>');

  let recentDoctors = [];
  try { recentDoctors = JSON.parse(localStorage.getItem(RECENT_DOCTORS_KEY) || '[]').slice(0, 3); } catch (e) { /* ignore corrupt value */ }
  const recentDocPanel = recentDoctors.length ? panel('Recently viewed', `<ul style="list-style:none;margin:0;padding:0">${recentDoctors.map((d) => `
    <li><a href="doctor.html?id=${encodeURIComponent(d.id)}" class="menu-item" style="padding:12px 20px;gap:12px">${avatarHtml(d.name, null, 'sm')}<span><span class="block text-sm font-semibold">${esc(drName(d.name))}</span><span class="block text-xs text-muted">${esc(d.specialization || 'General practice')}</span></span></a></li>`).join('')}</ul>`) : '';

  document.getElementById('secondary').innerHTML = quick + reminderPanel + recentDocPanel;
}

/* ---------------- Doctor ---------------- */

async function updateAppointmentStatus(id, status, successMessage) {
  await apiFetch(`/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  showToast(successMessage);
}

async function loadDoctorDashboard(user) {
  const appointments = await apiFetch('/appointments/doctor/me');
  const todayIso = toISODate(new Date());
  const today = appointments.filter((a) => String(a.appointmentDate).slice(0, 10) === todayIso && a.status !== 'CANCELLED')
    .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));
  const pending = appointments.filter((a) => a.status === 'PENDING').sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));
  const upcoming = appointments.filter((a) => isActive(a) && appointmentTimestamp(a) >= startOfToday() && !today.includes(a))
    .sort((a, b) => appointmentTimestamp(a) - appointmentTimestamp(b));

  setHeader(`${greeting()}, ${drName(user.fullName)}`,
    today.length ? `You have ${today.length} appointment${today.length > 1 ? 's' : ''} today.` : 'No appointments scheduled for today.',
    '<a href="appointments.html" class="btn btn-primary"><i data-icon="calendar-days" data-size="18"></i>Manage appointments</a>');

  renderStats([
    { label: 'Today', value: today.length, icon: 'calendar-check' },
    { label: 'Pending requests', value: pending.length, icon: 'clock' },
    { label: 'All appointments', value: appointments.length, icon: 'calendar-days' },
    { label: 'Unique patients', value: new Set(appointments.map((a) => a.patientId)).size, icon: 'users' },
  ]);

  const pendingRows = pending.slice(0, 5).map((a) => `
    <li class="px-5 py-4" style="border-bottom:1px solid #EDF2F4">
      <div class="flex items-start gap-3">
        ${avatarHtml(a.patientName, null, 'md')}
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold" style="margin:0">${esc(a.patientName)}</p>
          <p class="text-sm text-muted" style="margin:0">${esc(formatDate(a.appointmentDate))} at ${esc(formatTime(a.appointmentTime))}</p>
          ${a.symptoms ? `<p class="text-sm" style="margin:6px 0 0"><span class="text-faint">Reason:</span> ${esc(a.symptoms)}</p>` : ''}
        </div>
      </div>
      <div class="flex gap-2" style="margin-top:12px;justify-content:flex-end">
        <button type="button" class="btn btn-danger-outline btn-sm" data-decline="${a.id}">Decline</button>
        <button type="button" class="btn btn-primary btn-sm" data-accept="${a.id}">Accept</button>
      </div>
    </li>`).join('');

  const requestsPanel = panel('Appointment requests', pending.length
    ? `<ul style="list-style:none;margin:0;padding:0">${pendingRows}</ul>`
    : stateBlock({ icon: 'inbox', title: 'No pending requests', text: 'New requests from patients will show up here.' }),
  pending.length > 5 ? '<a href="appointments.html" class="link text-sm">View all</a>' : '');

  const todayPanel = panel('Today’s schedule', appointmentList(today, 'DOCTOR', stateBlock({
    icon: 'calendar-check', title: 'Nothing scheduled today', text: 'Your day is clear.',
  })));
  document.getElementById('primary').innerHTML = requestsPanel + todayPanel;

  document.getElementById('secondary').innerHTML = panel('Coming up', appointmentList(upcoming.slice(0, 5), 'DOCTOR', stateBlock({
    icon: 'calendar-days', title: 'No upcoming visits', text: 'Confirmed appointments after today appear here.',
  })), '<a href="appointments.html" class="link text-sm">View all</a>')
  + panel('Shortcuts', `<div class="grid gap-1 p-2">
      <a href="patients.html" class="menu-item" style="border-radius:8px">${icon('users', { size: 18 })}Patients</a>
      <a href="profile.html" class="menu-item" style="border-radius:8px">${icon('sliders-horizontal', { size: 18 })}Update availability</a>
      <a href="chatbot.html" class="menu-item" style="border-radius:8px">${icon('message-circle', { size: 18 })}AI assistant</a></div>`);

  const primary = document.getElementById('primary');
  primary.querySelectorAll('[data-accept]').forEach((btn) => btn.addEventListener('click', async () => {
    const restore = setLoading(btn, 'Accepting…');
    try { await updateAppointmentStatus(btn.dataset.accept, 'CONFIRMED', 'Appointment confirmed'); loadDashboardFor(user); }
    catch (err) { showToast(err.message, 'error'); restore(); }
  }));
  primary.querySelectorAll('[data-decline]').forEach((btn) => btn.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Decline this request?', message: 'The patient will be told the appointment was cancelled.', confirmLabel: 'Decline request', cancelLabel: 'Go back', danger: true });
    if (!ok) return;
    const restore = setLoading(btn, 'Declining…');
    try { await updateAppointmentStatus(btn.dataset.decline, 'CANCELLED', 'Request declined'); loadDashboardFor(user); }
    catch (err) { showToast(err.message, 'error'); restore(); }
  }));
}

/* ---------------- Admin ---------------- */

async function loadAdminDashboard(user) {
  const [stats, recent] = await Promise.all([
    apiFetch('/admin/stats'),
    apiFetch('/admin/appointments/recent?limit=6'),
  ]);
  setHeader(`${greeting()}, ${user.fullName.split(' ')[0]}`, 'Platform overview.',
    '<a href="admin.html" class="btn btn-secondary"><i data-icon="shield-check" data-size="18"></i>Admin panel</a>');
  renderStats([
    { label: 'Active patients', value: stats.activePatients, icon: 'users' },
    { label: 'Active doctors', value: stats.activeDoctors, icon: 'stethoscope' },
    { label: 'Total appointments', value: stats.totalAppointments, icon: 'calendar-days' },
    { label: 'Reports uploaded', value: stats.reportsUploaded, icon: 'file-text' },
  ]);
  document.getElementById('primary').innerHTML = panel('Recent appointments', appointmentList(recent, 'ADMIN', stateBlock({
    icon: 'calendar-days', title: 'No appointments yet', text: 'Bookings made on the platform will appear here.',
  })), '<a href="appointments.html" class="link text-sm">View all</a>');
  document.getElementById('secondary').innerHTML = panel('Manage', `<div class="grid gap-1 p-2">
    <a href="doctors.html" class="menu-item" style="border-radius:8px">${icon('stethoscope', { size: 18 })}Doctors</a>
    <a href="patients.html" class="menu-item" style="border-radius:8px">${icon('users', { size: 18 })}Patients</a>
    <a href="appointments.html" class="menu-item" style="border-radius:8px">${icon('calendar-days', { size: 18 })}Appointments</a>
    <a href="admin.html" class="menu-item" style="border-radius:8px">${icon('shield-check', { size: 18 })}Admin panel</a></div>`);
}

function loadDashboardFor(user) {
  const loader = user.role === 'ADMIN' ? loadAdminDashboard : user.role === 'DOCTOR' ? loadDoctorDashboard : loadPatientDashboard;
  return loader(user).catch((err) => {
    document.getElementById('stats').innerHTML = '';
    document.getElementById('secondary').innerHTML = '';
    showError(document.getElementById('primary'), err.message, () => loadDashboardFor(user));
    document.getElementById('greeting-sub').textContent = 'Something went wrong while loading.';
  });
}

async function initDashboard() {
  if (!Auth.requireAuth()) return;
  await initDashboardChrome({ crumbs: [['Dashboard']] });
  const user = Auth.getUser();
  document.getElementById('greeting').textContent = `${greeting()}, ${user.fullName.split(' ')[0]}`;
  await loadDashboardFor(user);
  hydrateIcons();
}
