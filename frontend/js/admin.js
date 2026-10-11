/* MediCare AI — admin panel (/admin/stats, /admin/appointments/recent). statusBadge() lives in api.js. */

function renderAdminStats(stats) {
  const container = document.getElementById('admin-stats');
  container.setAttribute('aria-busy', 'false');
  const cards = [
    ['Total users', stats.totalUsers, 'users'], ['Active patients', stats.activePatients, 'user-round'],
    ['Active doctors', stats.activeDoctors, 'stethoscope'], ['Total appointments', stats.totalAppointments, 'calendar-days'],
    ['Reports uploaded', stats.reportsUploaded, 'file-text'], ['Chatbot messages', stats.chatbotMessagesExchanged, 'message-circle'],
  ];
  container.innerHTML = cards.map(([label, value, ic]) => `<div class="card stat"><div class="stat-icon">${icon(ic, { size: 20 })}</div><div class="stat-value">${esc(value ?? '—')}</div><div class="stat-label">${label}</div></div>`).join('');
}

function renderRecentAppointments(appointments) {
  const el = document.getElementById('admin-recent');
  el.setAttribute('aria-busy', 'false');
  if (!appointments.length) { el.innerHTML = stateBlock({ icon: 'calendar-days', title: 'No appointments yet', text: 'Bookings made on the platform will appear here.' }); hydrateIcons(el); return; }
  el.innerHTML = `<div class="table-wrap"><table class="table stack"><thead><tr><th>Patient</th><th>Doctor</th><th>When</th><th>Specialty</th><th>Status</th></tr></thead><tbody>
    ${appointments.map((a) => `<tr><td data-label="Patient" class="font-semibold">${esc(a.patientName)}</td><td data-label="Doctor">${esc(drName(a.doctorName))}</td>
      <td data-label="When">${esc(formatDate(a.appointmentDate))}, ${esc(formatTime(a.appointmentTime))}</td><td data-label="Specialty">${esc(a.specialization || '—')}</td><td data-label="Status">${statusBadge(a.status)}</td></tr>`).join('')}</tbody></table></div>`;
}

async function loadAdmin() {
  document.getElementById('admin-stats').innerHTML = skeletonCards(6, 112);
  document.getElementById('admin-recent').innerHTML = skeletonRows(4);
  try {
    const [stats, recent] = await Promise.all([apiFetch('/admin/stats'), apiFetch('/admin/appointments/recent?limit=10')]);
    renderAdminStats(stats);
    renderRecentAppointments(recent);
  } catch (err) {
    document.getElementById('admin-stats').innerHTML = '';
    showError(document.getElementById('admin-recent'), err.message, loadAdmin);
  }
}

async function initAdminPage() {
  if (!Auth.requireRole(['ADMIN'])) return;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['Admin panel']] });
  await loadAdmin();
}
