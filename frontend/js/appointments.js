/* MediCare AI — appointments page (role-aware)
   PATIENT: view, reschedule (PUT /appointments/{id}/reschedule), cancel (PUT .../cancel).
   DOCTOR: accept / complete / decline via PUT .../status. ADMIN: read-only recent list.
   Booking itself now lives in book.html (guided flow) and uses the same POST /appointments. */

let allAppointments = [];
const view = { tab: 'upcoming', q: '', page: 1 };
const APPT_PAGE_SIZE = 10;
let currentRole = null;

const isOpen = (a) => ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(a.status);

function inTab(a, tab) {
  if (tab === 'upcoming') return isOpen(a); // open requests stay here until completed or cancelled, so doctors can close out past visits
  if (tab === 'completed') return a.status === 'COMPLETED';
  if (tab === 'cancelled') return a.status === 'CANCELLED';
  return true;
}

function visibleAppointments() {
  const q = view.q.trim().toLowerCase();
  return allAppointments.filter((a) => inTab(a, view.tab)
    && (!q || `${a.patientName} ${a.doctorName} ${a.specialization || ''} ${a.symptoms || ''}`.toLowerCase().includes(q)))
    .sort((a, b) => view.tab === 'upcoming'
      ? appointmentTimestamp(a) - appointmentTimestamp(b)
      : appointmentTimestamp(b) - appointmentTimestamp(a));
}

function actionButtons(a) {
  const btn = (attr, label, cls = 'btn-secondary') => `<button type="button" class="btn ${cls} btn-sm" ${attr}="${a.id}">${label}</button>`;
  const parts = [btn('data-details', 'Details', 'btn-ghost')];
  if (currentRole === 'PATIENT' && isOpen(a)) parts.push(btn('data-reschedule', 'Reschedule'), btn('data-cancel', 'Cancel', 'btn-danger-outline'));
  if (currentRole === 'DOCTOR' && isOpen(a)) {
    if (a.status === 'PENDING') parts.push(btn('data-accept', 'Accept', 'btn-primary'));
    else parts.push(btn('data-complete', 'Mark completed', 'btn-primary'));
    parts.push(btn('data-decline', a.status === 'PENDING' ? 'Decline' : 'Cancel', 'btn-danger-outline'));
  }
  return `<div class="flex flex-wrap gap-2 justify-end">${parts.join('')}</div>`;
}

function renderAppointments() {
  const list = visibleAppointments();
  const { slice, page, pages } = paginate(list, view.page, APPT_PAGE_SIZE);
  view.page = page;
  const container = document.getElementById('appt-list');
  container.setAttribute('aria-busy', 'false');

  ['upcoming', 'completed', 'cancelled', 'all'].forEach((t) => {
    document.getElementById(`c-${t}`).textContent = allAppointments.filter((a) => inTab(a, t)).length;
  });

  if (!list.length) {
    const searching = !!view.q;
    const emptyText = { upcoming: 'No upcoming appointments.', completed: 'No completed appointments yet.', cancelled: 'No cancelled appointments.', all: 'No appointments yet.' }[view.tab];
    container.innerHTML = stateBlock({
      icon: searching ? 'search' : 'calendar-days',
      title: searching ? 'No appointments match your search' : emptyText,
      text: searching ? 'Try a different name or word.' : (currentRole === 'PATIENT' && view.tab === 'upcoming' ? 'Book a visit with a doctor to see it here.' : ''),
      action: !searching && currentRole === 'PATIENT' && view.tab === 'upcoming' ? '<a href="doctors.html" class="btn btn-primary">Find a doctor</a>' : '',
    });
    hydrateIcons(container);
    document.getElementById('appt-pager').innerHTML = '';
    return;
  }

  const withLabel = currentRole === 'DOCTOR' ? 'Patient' : 'Doctor';
  container.innerHTML = `
    <div class="table-wrap"><table class="table stack">
      <thead><tr><th>${withLabel}</th><th>Date &amp; time</th><th>Specialty</th><th>Reason</th><th>Status</th>${currentRole === 'ADMIN' ? '' : '<th><span class="sr-only">Actions</span></th>'}</tr></thead>
      <tbody>${slice.map((a) => `
        <tr>
          <td data-label="${withLabel}"><span class="flex items-center gap-3" style="justify-content:inherit">${avatarHtml(currentRole === 'DOCTOR' ? a.patientName : a.doctorName, null, 'sm')}<span class="font-semibold">${esc(currentRole === 'DOCTOR' ? a.patientName : drName(a.doctorName))}${currentRole === 'ADMIN' ? `<span class="block text-xs text-muted" style="font-weight:400">Patient: ${esc(a.patientName)}</span>` : ''}</span></span></td>
          <td data-label="When"><span class="block font-semibold">${esc(formatDate(a.appointmentDate))}</span><span class="text-muted">${esc(formatTime(a.appointmentTime))}</span></td>
          <td data-label="Specialty">${esc(a.specialization || '—')}</td>
          <td data-label="Reason" style="max-width:240px"><span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(a.symptoms || '—')}</span></td>
          <td data-label="Status">${statusBadge(a.status)}</td>
          ${currentRole === 'ADMIN' ? '' : `<td class="cell-actions">${actionButtons(a)}</td>`}
        </tr>`).join('')}</tbody></table></div>`;
  renderPager(document.getElementById('appt-pager'), { page, pages, total: list.length, size: APPT_PAGE_SIZE }, (p) => { view.page = p; renderAppointments(); });

  const find = (id) => allAppointments.find((x) => String(x.id) === String(id));
  container.querySelectorAll('[data-details]').forEach((b) => b.addEventListener('click', () => showDetails(find(b.dataset.details))));
  container.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => cancelAppointment(find(b.dataset.cancel))));
  container.querySelectorAll('[data-reschedule]').forEach((b) => b.addEventListener('click', () => openReschedule(find(b.dataset.reschedule))));
  container.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => changeStatus(find(b.dataset.accept), 'CONFIRMED', 'Appointment confirmed', b)));
  container.querySelectorAll('[data-complete]').forEach((b) => b.addEventListener('click', () => changeStatus(find(b.dataset.complete), 'COMPLETED', 'Marked as completed', b)));
  container.querySelectorAll('[data-decline]').forEach((b) => b.addEventListener('click', () => declineAppointment(find(b.dataset.decline))));
}

function showDetails(a) {
  const row = (ic, label, value) => `<div>${icon(ic, { size: 20, cls: 'text-brand-600' })}<div><dt>${label}</dt><dd style="font-weight:500">${value}</dd></div></div>`;
  openModal({
    title: 'Appointment details',
    body: `<dl class="summary-list">
      ${row('stethoscope', 'Doctor', `${esc(drName(a.doctorName))}${a.specialization ? `, ${esc(a.specialization)}` : ''}`)}
      ${row('user-round', 'Patient', esc(a.patientName))}
      ${row('calendar-days', 'Date', esc(formatDate(a.appointmentDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))}
      ${row('clock', 'Time', esc(formatTime(a.appointmentTime)))}
      ${row('circle-dot', 'Status', statusBadge(a.status))}
      ${row('clipboard-list', 'Reason for visit', a.symptoms ? esc(a.symptoms) : '<span class="text-muted">Not provided</span>')}
      ${a.notes ? row('notebook-pen', 'Doctor’s notes', esc(a.notes)) : ''}
    </dl>`,
    footer: '<button type="button" class="btn btn-secondary" data-modal-close>Close</button>',
  });
}

async function loadMyAppointments() {
  const container = document.getElementById('appt-list');
  container.setAttribute('aria-busy', 'true');
  container.innerHTML = skeletonRows(4);
  try {
    if (currentRole === 'ADMIN') allAppointments = await apiFetch('/admin/appointments/recent?limit=20');
    else allAppointments = await apiFetch(currentRole === 'DOCTOR' ? '/appointments/doctor/me' : '/appointments/me');
    renderAppointments();
  } catch (err) {
    showError(container, err.message, loadMyAppointments);
  }
}

async function cancelAppointment(a) {
  const ok = await confirmDialog({
    title: 'Cancel this appointment?',
    message: `Your visit with ${drName(a.doctorName)} on ${formatDate(a.appointmentDate)} at ${formatTime(a.appointmentTime)} will be cancelled.`,
    confirmLabel: 'Cancel appointment', cancelLabel: 'Keep appointment', danger: true,
  });
  if (!ok) return;
  try {
    await apiFetch(`/appointments/${a.id}/cancel`, { method: 'PUT' });
    showToast('Appointment cancelled');
    loadMyAppointments();
  } catch (err) { showToast(err.message, 'error'); }
}

async function declineAppointment(a) {
  const ok = await confirmDialog({
    title: a.status === 'PENDING' ? 'Decline this request?' : 'Cancel this appointment?',
    message: `${a.patientName}’s appointment on ${formatDate(a.appointmentDate)} at ${formatTime(a.appointmentTime)} will be marked as cancelled and they’ll be notified.`,
    confirmLabel: a.status === 'PENDING' ? 'Decline request' : 'Cancel appointment', cancelLabel: 'Go back', danger: true,
  });
  if (ok) changeStatus(a, 'CANCELLED', 'Appointment cancelled');
}

async function changeStatus(a, status, message, button) {
  const restore = button ? setLoading(button, 'Saving…') : null;
  try {
    await apiFetch(`/appointments/${a.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    showToast(message);
    loadMyAppointments();
  } catch (err) {
    showToast(err.message, 'error');
    if (restore) restore();
  }
}

async function openReschedule(a) {
  // Offer the doctor's real working days/hours when we can load them; otherwise plain date/time inputs.
  let doctor = null;
  try { doctor = await apiFetch(`/doctors/${a.doctorId}`); } catch (e) { /* fall back to free inputs */ }
  const dates = doctor ? upcomingDates(doctor, 28).filter((d) => d.available) : [];
  const slots = doctor ? slotsFor(doctor) : [];
  const guided = dates.length && slots.length;
  const minDate = toISODate(new Date(Date.now() + 86400000));

  const { el, close } = openModal({
    title: 'Reschedule appointment',
    body: `<p class="text-muted" style="margin:0 0 14px">Currently ${esc(formatDate(a.appointmentDate))} at ${esc(formatTime(a.appointmentTime))} with ${esc(drName(a.doctorName))}.</p>
      <form id="resched-form" class="grid gap-3" novalidate>
        ${guided ? `
          <div class="field"><label for="rs-date">New date</label><select class="input" id="rs-date" name="appointmentDate" required>
            <option value="">Choose a date</option>${dates.map((d) => `<option value="${d.iso}">${esc(d.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))}</option>`).join('')}</select></div>
          <div class="field"><label for="rs-time">New time</label><select class="input" id="rs-time" name="appointmentTime" required>
            <option value="">Choose a time</option>${slots.map((t) => `<option value="${t}">${esc(formatTime(t))}</option>`).join('')}</select></div>`
        : `
          <div class="field"><label for="rs-date">New date</label><input class="input" id="rs-date" type="date" name="appointmentDate" min="${minDate}" required /></div>
          <div class="field"><label for="rs-time">New time</label><input class="input" id="rs-time" type="time" name="appointmentTime" required /></div>`}
      </form>`,
    footer: '<button type="button" class="btn btn-secondary" data-modal-close>Keep current time</button><button type="submit" form="resched-form" class="btn btn-primary">Confirm new time</button>',
  });
  const form = el.querySelector('#resched-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    const restore = setLoading(el.querySelector('button[type="submit"]'), 'Rescheduling…');
    try {
      await apiFetch(`/appointments/${a.id}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({ appointmentDate: form.appointmentDate.value, appointmentTime: form.appointmentTime.value }),
      });
      showToast('Appointment rescheduled');
      close();
      loadMyAppointments();
    } catch (err) { showToast(err.message, 'error'); restore(); }
  });
}

async function initAppointmentsPage() {
  if (!Auth.requireAuth()) return;
  currentRole = Auth.getUser().role;
  // Old links used appointments.html?doctorId=… for the inline form; send them to the guided flow.
  const legacyDoctor = new URLSearchParams(window.location.search).get('doctorId');
  if (legacyDoctor && currentRole === 'PATIENT') { window.location.replace(`book.html?doctorId=${encodeURIComponent(legacyDoctor)}`); return; }

  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['Appointments']] });
  if (currentRole === 'DOCTOR') document.getElementById('appt-sub').textContent = 'Review requests and manage your schedule.';
  initTabs(document.getElementById('appt-tabs'), (tab) => { view.tab = tab; view.page = 1; renderAppointments(); });
  document.getElementById('appt-search').addEventListener('input', debounce((e) => { view.q = e.target.value; view.page = 1; renderAppointments(); }, 150));
  await loadMyAppointments();
}
