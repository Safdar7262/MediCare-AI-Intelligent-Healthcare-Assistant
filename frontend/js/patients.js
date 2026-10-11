/* MediCare AI — patient management (ADMIN / DOCTOR). Uses /patients endpoints; access is enforced by the backend. */

let allPatients = [];
const pview = { q: '', page: 1 };
const PATIENT_PAGE = 10;

function visiblePatients() {
  const q = pview.q.trim().toLowerCase();
  return allPatients.filter((p) => !q || `${p.fullName} ${p.currentDisease || ''}`.toLowerCase().includes(q));
}

function renderPatients() {
  const container = document.getElementById('patients-list');
  container.setAttribute('aria-busy', 'false');
  const list = visiblePatients();
  const { slice, page, pages } = paginate(list, pview.page, PATIENT_PAGE);
  pview.page = page;
  if (!list.length) {
    container.innerHTML = stateBlock({
      icon: pview.q ? 'search' : 'users', title: pview.q ? 'No patients match your search' : 'No patients yet',
      text: pview.q ? 'Try a different name or condition.' : 'Patients who register will appear here.',
    });
    hydrateIcons(container);
    document.getElementById('patients-pager').innerHTML = '';
    return;
  }
  container.innerHTML = `<div class="table-wrap"><table class="table stack">
    <thead><tr><th>Patient</th><th>Age</th><th>Gender</th><th>Condition</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
    <tbody>${slice.map((p) => `<tr>
      <td data-label="Patient"><span class="flex items-center gap-3" style="justify-content:inherit">${avatarHtml(p.fullName, null, 'sm')}<span class="font-semibold">${esc(p.fullName)}<span class="block text-xs text-muted" style="font-weight:400">${esc(p.email || '')}</span></span></span></td>
      <td data-label="Age">${esc(p.age ?? '—')}</td>
      <td data-label="Gender">${esc(p.gender ? String(p.gender).charAt(0) + String(p.gender).slice(1).toLowerCase() : '—')}</td>
      <td data-label="Condition">${esc(p.currentDisease || '—')}</td>
      <td data-label="Status"><span class="badge ${p.status === 'ACTIVE' ? 'badge-completed' : 'badge-neutral'}">${esc(p.status ? p.status.charAt(0) + p.status.slice(1).toLowerCase() : '—')}</span></td>
      <td class="cell-actions"><div class="flex flex-wrap gap-2 justify-end">
        <a href="reports.html?patientId=${p.id}" class="btn btn-ghost btn-sm">${icon('file-text', { size: 15 })}Records</a>
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${p.id}" aria-label="Edit ${esc(p.fullName)}">${icon('pencil', { size: 15 })}Edit</button>
        <button type="button" class="btn btn-danger-outline btn-sm" data-delete="${p.id}" aria-label="Delete ${esc(p.fullName)}">${icon('trash-2', { size: 15 })}</button></div></td>
    </tr>`).join('')}</tbody></table></div>`;
  renderPager(document.getElementById('patients-pager'), { page, pages, total: list.length, size: PATIENT_PAGE }, (n) => { pview.page = n; renderPatients(); });
  container.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEditPatient(b.dataset.edit)));
  container.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deletePatient(b.dataset.delete)));
}

async function loadPatients() {
  const container = document.getElementById('patients-list');
  container.setAttribute('aria-busy', 'true');
  container.innerHTML = skeletonRows(5);
  try { allPatients = await apiFetch('/patients'); renderPatients(); }
  catch (err) { showError(container, err.message, loadPatients); }
}

function openEditPatient(id) {
  const patient = allPatients.find((p) => String(p.id) === String(id));
  if (!patient) return;
  const { el, close } = openModal({
    title: `Edit ${patient.fullName}`,
    body: `<form id="edit-patient-form" class="grid gap-3" novalidate>
      <div class="field"><label for="ep-disease">Current condition</label><input class="input" id="ep-disease" name="currentDisease" value="${esc(patient.currentDisease || '')}" /></div>
      <div class="field"><label for="ep-blood">Blood group</label><input class="input" id="ep-blood" name="bloodGroup" maxlength="5" value="${esc(patient.bloodGroup || '')}" /></div>
      <div class="field"><label for="ep-addr">Address</label><input class="input" id="ep-addr" name="address" value="${esc(patient.address || '')}" /></div>
      <div class="field"><label for="ep-status">Status</label><select class="input" id="ep-status" name="status">
        ${['ACTIVE', 'INACTIVE'].map((s) => `<option value="${s}" ${(patient.status || 'ACTIVE') === s ? 'selected' : ''}>${s.charAt(0) + s.slice(1).toLowerCase()}</option>`).join('')}</select></div>
    </form>`,
    footer: '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" form="edit-patient-form" class="btn btn-primary">Save changes</button>',
  });
  const form = el.querySelector('#edit-patient-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const restore = setLoading(el.querySelector('button[type="submit"]'), 'Saving…');
    try {
      await apiFetch(`/patients/${patient.id}`, { method: 'PUT', body: JSON.stringify({
        currentDisease: form.currentDisease.value, bloodGroup: form.bloodGroup.value, address: form.address.value, status: form.status.value }) });
      showToast('Patient updated'); close(); loadPatients();
    } catch (err) { showToast(err.message, 'error'); restore(); }
  });
}

async function deletePatient(id) {
  const patient = allPatients.find((p) => String(p.id) === String(id));
  const ok = await confirmDialog({ title: `Delete ${patient ? patient.fullName : 'this patient'}?`, message: 'The patient record will be permanently deleted. This cannot be undone.', confirmLabel: 'Delete patient', cancelLabel: 'Keep record', danger: true });
  if (!ok) return;
  try { await apiFetch(`/patients/${id}`, { method: 'DELETE' }); showToast('Patient deleted'); loadPatients(); }
  catch (err) { showToast(err.message, 'error'); }
}

function openAddPatient() {
  const { el, close } = openModal({
    title: 'Add a patient',
    body: `<form id="add-patient-form" class="grid gap-3" novalidate>
      <div class="field"><label for="ap-name">Full name</label><input class="input" id="ap-name" name="fullName" required autocomplete="off" /></div>
      <div class="field"><label for="ap-email">Email</label><input class="input" id="ap-email" type="email" name="email" required autocomplete="off" /></div>
      <div class="field"><label for="ap-phone">Phone number <span class="opt">(optional)</span></label><input class="input" id="ap-phone" type="tel" name="phoneNumber" autocomplete="off" /></div>
      <div class="field"><label for="ap-pass">Temporary password</label><div class="input-wrap"><input class="input" id="ap-pass" type="password" name="password" required minlength="8" autocomplete="new-password" /><button type="button" class="btn btn-ghost btn-icon toggle" data-toggle-password aria-label="Show password" aria-pressed="false">${icon('eye', { size: 18 })}</button></div><p class="field-hint">At least 8 characters.</p></div>
    </form>`,
    footer: '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" form="add-patient-form" class="btn btn-primary">Add patient</button>',
  });
  const form = el.querySelector('#add-patient-form');
  initPasswordToggles(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    const restore = setLoading(el.querySelector('button[type="submit"]'), 'Adding…');
    try {
      await apiFetch('/patients', { method: 'POST', body: JSON.stringify({ fullName: form.fullName.value.trim(), email: form.email.value.trim(), phoneNumber: form.phoneNumber.value.trim(), password: form.password.value, role: 'PATIENT' }) });
      showToast('Patient added'); close(); loadPatients();
    } catch (err) { showToast(err.message, 'error'); restore(); }
  });
}

async function initPatientsPage() {
  if (!Auth.requireRole(['ADMIN', 'DOCTOR'])) return;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['Patients']] });
  pview.q = new URLSearchParams(window.location.search).get('q') || '';
  const search = document.getElementById('patient-search');
  search.value = pview.q;
  search.addEventListener('input', debounce(() => { pview.q = search.value; pview.page = 1; renderPatients(); }, 150));
  document.getElementById('add-patient-btn').addEventListener('click', openAddPatient);
  await loadPatients();
}
