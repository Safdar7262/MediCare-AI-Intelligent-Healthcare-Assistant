/* MediCare AI — doctors directory
   Visible to every signed-in role. Patients use it to find and book a doctor; admins also manage
   the roster (add / edit / remove) through the existing /doctors endpoints. Only data the backend
   actually returns is shown: no invented ratings, verification badges or availability. */

let allDoctors = [];
const filters = { q: '', specialty: '', sort: 'name', tomorrow: false, page: 1 };
const PAGE_SIZE = 9;

function nextDayAvailable(doctor) {
  const allowed = parseAvailableDays(doctor.availableDays);
  if (!allowed) return null; // unknown: don't claim anything
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return allowed.has(tomorrow.getDay());
}

function doctorCard(doctor, role) {
  const rating = Number(doctor.rating) > 0 ? Number(doctor.rating).toFixed(1) : null;
  const hours = doctor.availableFrom && doctor.availableTo ? `${formatTime(doctor.availableFrom)} – ${formatTime(doctor.availableTo)}` : '';
  const days = doctor.availableDays ? describeAvailableDays(doctor.availableDays) : '';

  const actions = role === 'ADMIN'
    ? `<div class="flex gap-2">
         <a href="doctor.html?id=${doctor.id}" class="btn btn-secondary btn-sm" style="flex:1">View</a>
         <button type="button" data-edit="${doctor.id}" class="btn btn-secondary btn-sm" aria-label="Edit ${esc(doctor.fullName)}">${icon('pencil', { size: 15 })}Edit</button>
         <button type="button" data-delete="${doctor.id}" class="btn btn-danger-outline btn-sm" aria-label="Remove ${esc(doctor.fullName)}">${icon('trash-2', { size: 15 })}</button>
       </div>`
    : `<div class="flex gap-2">
         <a href="doctor.html?id=${doctor.id}" class="btn btn-secondary btn-sm" style="flex:1">View profile</a>
         ${role === 'PATIENT' ? `<a href="book.html?doctorId=${doctor.id}" class="btn btn-primary btn-sm" style="flex:1">Book</a>` : ''}
       </div>`;

  return `
    <article class="card doctor-card">
      <div class="flex items-start gap-3">
        ${avatarHtml(doctor.fullName, doctor.profileImageUrl, 'lg')}
        <div class="min-w-0 flex-1">
          <h3 class="text-base font-bold" style="margin:0">${esc(drName(doctor.fullName))}</h3>
          <p class="text-sm text-brand-700 font-semibold" style="margin:2px 0 0">${esc(doctor.specialization || 'General practice')}</p>
          ${doctor.qualification ? `<p class="text-sm text-muted" style="margin:2px 0 0">${esc(doctor.qualification)}</p>` : ''}
        </div>
        ${rating ? `<span class="badge badge-neutral" title="Average rating">${icon('star', { size: 13 })}${rating}</span>` : ''}
      </div>
      <div class="grid gap-2">
        ${doctor.experienceYears != null ? `<div class="meta-row">${icon('briefcase-medical', { size: 16 })}${esc(doctor.experienceYears)} years of experience</div>` : ''}
        ${days ? `<div class="meta-row">${icon('calendar-days', { size: 16 })}${esc(days)}${hours ? ` · ${esc(hours)}` : ''}</div>` : ''}
        <div class="meta-row">${icon('id-card', { size: 16 })}Consultation fee ${esc(formatMoney(doctor.consultationFee))}</div>
      </div>
      ${actions}
    </article>`;
}

function filteredDoctors() {
  const q = filters.q.trim().toLowerCase();
  let list = allDoctors.filter((d) => {
    if (q && !`${d.fullName} ${d.specialization || ''}`.toLowerCase().includes(q)) return false;
    if (filters.specialty && (d.specialization || '') !== filters.specialty) return false;
    if (filters.tomorrow && nextDayAvailable(d) !== true) return false;
    return true;
  });
  const by = {
    name: (a, b) => a.fullName.localeCompare(b.fullName),
    experience: (a, b) => (b.experienceYears ?? -1) - (a.experienceYears ?? -1),
    'fee-asc': (a, b) => (a.consultationFee ?? Infinity) - (b.consultationFee ?? Infinity),
    'fee-desc': (a, b) => (b.consultationFee ?? -1) - (a.consultationFee ?? -1),
    rating: (a, b) => Number(b.rating || 0) - Number(a.rating || 0),
  };
  return list.sort(by[filters.sort]);
}

function renderDoctors() {
  const role = Auth.getUser().role;
  const grid = document.getElementById('doctors-grid');
  const list = filteredDoctors();
  const { slice, page, pages } = paginate(list, filters.page, PAGE_SIZE);
  filters.page = page;
  grid.setAttribute('aria-busy', 'false');
  document.getElementById('results-count').textContent = list.length
    ? `${list.length} doctor${list.length === 1 ? '' : 's'}${filters.q || filters.specialty || filters.tomorrow ? ' match your search' : ''}`
    : '';

  if (!list.length) {
    const searching = filters.q || filters.specialty || filters.tomorrow;
    grid.innerHTML = `<div class="card" style="grid-column:1/-1">${stateBlock({
      icon: searching ? 'search' : 'stethoscope',
      title: searching ? 'No doctors match your search' : 'No doctors listed yet',
      text: searching ? 'Try a different name or specialty, or clear the filters.' : (role === 'ADMIN' ? 'Add the first doctor to get started.' : 'Check back soon.'),
      action: searching ? '<button type="button" class="btn btn-secondary" id="clear-filters">Clear filters</button>' : '',
    })}</div>`;
    document.getElementById('clear-filters')?.addEventListener('click', clearFilters);
    document.getElementById('doctors-pager').innerHTML = '';
    return;
  }

  grid.innerHTML = slice.map((d) => doctorCard(d, role)).join('');
  grid.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openDoctorEditor(b.dataset.edit)));
  grid.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deleteDoctor(b.dataset.delete)));
  renderPager(document.getElementById('doctors-pager'), { page, pages, total: list.length, size: PAGE_SIZE }, (p) => {
    filters.page = p; renderDoctors(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function clearFilters() {
  Object.assign(filters, { q: '', specialty: '', sort: 'name', tomorrow: false, page: 1 });
  document.getElementById('q').value = '';
  document.getElementById('specialty').value = '';
  document.getElementById('sort').value = 'name';
  const t = document.getElementById('avail-toggle'); t.setAttribute('aria-pressed', 'false');
  renderDoctors();
}

function populateSpecialties() {
  const select = document.getElementById('specialty');
  const names = [...new Set(allDoctors.map((d) => d.specialization).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All specialties</option>' + names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  select.value = filters.specialty;
}

function initFilters() {
  const q = document.getElementById('q');
  q.value = filters.q;
  q.addEventListener('input', debounce(() => { filters.q = q.value; filters.page = 1; renderDoctors(); }, 150));
  document.getElementById('specialty').addEventListener('change', (e) => { filters.specialty = e.target.value; filters.page = 1; renderDoctors(); });
  document.getElementById('sort').addEventListener('change', (e) => { filters.sort = e.target.value; filters.page = 1; renderDoctors(); });
  const toggle = document.getElementById('avail-toggle');
  toggle.addEventListener('click', () => {
    filters.tomorrow = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(filters.tomorrow));
    filters.page = 1; renderDoctors();
  });
}

async function loadDoctors() {
  const grid = document.getElementById('doctors-grid');
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = skeletonCards(6, 230);
  try {
    allDoctors = await apiFetch('/doctors');
    populateSpecialties();
    renderDoctors();
  } catch (err) {
    grid.innerHTML = `<div class="card" style="grid-column:1/-1"></div>`;
    showError(grid.firstElementChild, err.message, loadDoctors);
  }
}

/* ---------------- Admin: edit / add / remove ---------------- */

function timeInputValue(t) { return normalizeTime(t); }

function openDoctorEditor(id) {
  const doctor = allDoctors.find((d) => String(d.id) === String(id));
  if (!doctor) return;
  const { el, close } = openModal({
    title: `Edit ${drName(doctor.fullName)}`,
    size: 'lg',
    body: `<form id="edit-doctor-form" class="grid gap-3" novalidate>
      <div class="field"><label for="ed-spec">Specialization</label><input class="input" id="ed-spec" name="specialization" required value="${esc(doctor.specialization || '')}" /></div>
      <div class="field"><label for="ed-qual">Qualification</label><input class="input" id="ed-qual" name="qualification" value="${esc(doctor.qualification || '')}" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div class="field"><label for="ed-exp">Experience (years)</label><input class="input" id="ed-exp" type="number" name="experienceYears" min="0" value="${esc(doctor.experienceYears ?? '')}" /></div>
        <div class="field"><label for="ed-fee">Fee (₹)</label><input class="input" id="ed-fee" type="number" name="consultationFee" min="0" step="0.01" value="${esc(doctor.consultationFee ?? '')}" /></div>
      </div>
      <div class="field"><label for="ed-days">Available days</label><input class="input" id="ed-days" name="availableDays" placeholder="MON,TUE,WED,THU,FRI" value="${esc(doctor.availableDays || '')}" /><p class="field-hint">Use day codes like MON,WED,FRI or a range like Mon–Fri.</p></div>
      <div class="grid grid-cols-2 gap-3">
        <div class="field"><label for="ed-from">Available from</label><input class="input" id="ed-from" type="time" name="availableFrom" value="${timeInputValue(doctor.availableFrom)}" /></div>
        <div class="field"><label for="ed-to">Available until</label><input class="input" id="ed-to" type="time" name="availableTo" value="${timeInputValue(doctor.availableTo)}" /></div>
      </div>
      <div class="field"><label for="ed-bio">About <span class="opt">(optional)</span></label><textarea class="input" id="ed-bio" name="bio">${esc(doctor.bio || '')}</textarea></div>
    </form>`,
    footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" form="edit-doctor-form" class="btn btn-primary">Save changes</button>`,
  });
  const form = el.querySelector('#edit-doctor-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form, { availableTo: (v) => (v && form.availableFrom.value && v <= form.availableFrom.value ? 'End time must be after the start time.' : '') })) return;
    const submit = el.querySelector('button[type="submit"]');
    const restore = setLoading(submit, 'Saving…');
    // Backend only updates fields that are present, so empty inputs are omitted rather than sent as null/"".
    const payload = {};
    ['specialization', 'qualification', 'availableDays', 'bio', 'availableFrom', 'availableTo'].forEach((k) => { if (form[k].value.trim()) payload[k] = form[k].value.trim(); });
    if (form.experienceYears.value !== '') payload.experienceYears = Number(form.experienceYears.value);
    if (form.consultationFee.value !== '') payload.consultationFee = Number(form.consultationFee.value);
    try {
      await apiFetch(`/doctors/${doctor.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Doctor updated');
      close();
      loadDoctors();
    } catch (err) { showToast(err.message, 'error'); restore(); }
  });
}

async function deleteDoctor(id) {
  const doctor = allDoctors.find((d) => String(d.id) === String(id));
  const ok = await confirmDialog({
    title: `Remove ${doctor ? drName(doctor.fullName) : 'this doctor'}?`,
    message: 'They will be removed from the roster. This cannot be undone.',
    confirmLabel: 'Remove doctor', cancelLabel: 'Keep doctor', danger: true,
  });
  if (!ok) return;
  try {
    await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
    showToast('Doctor removed');
    loadDoctors();
  } catch (err) { showToast(err.message, 'error'); }
}

function openAddDoctor() {
  const { el, close } = openModal({
    title: 'Add a doctor',
    body: `<form id="add-doctor-form" class="grid gap-3" novalidate>
      <div class="field"><label for="ad-name">Full name</label><input class="input" id="ad-name" name="fullName" required autocomplete="off" /></div>
      <div class="field"><label for="ad-email">Email</label><input class="input" id="ad-email" type="email" name="email" required autocomplete="off" /></div>
      <div class="field"><label for="ad-phone">Phone number <span class="opt">(optional)</span></label><input class="input" id="ad-phone" name="phoneNumber" type="tel" autocomplete="off" /></div>
      <div class="field"><label for="ad-pass">Temporary password</label>
        <div class="input-wrap"><input class="input" id="ad-pass" type="password" name="password" required minlength="8" autocomplete="new-password" />
        <button type="button" class="btn btn-ghost btn-icon toggle" data-toggle-password aria-label="Show password" aria-pressed="false">${icon('eye', { size: 18 })}</button></div>
        <p class="field-hint">At least 8 characters. Specialization and other details can be added afterwards with Edit.</p></div>
    </form>`,
    footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" form="add-doctor-form" class="btn btn-primary">Add doctor</button>`,
  });
  const form = el.querySelector('#add-doctor-form');
  initPasswordToggles(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    const restore = setLoading(el.querySelector('button[type="submit"]'), 'Adding…');
    try {
      await apiFetch('/doctors', {
        method: 'POST',
        body: JSON.stringify({ fullName: form.fullName.value.trim(), email: form.email.value.trim(), phoneNumber: form.phoneNumber.value.trim(), password: form.password.value }),
      });
      showToast('Doctor added. Use Edit to set their specialization and hours.');
      close();
      loadDoctors();
    } catch (err) { showToast(err.message, 'error'); restore(); }
  });
}

async function initDoctorsPage() {
  if (!Auth.requireAuth()) return;
  const role = Auth.getUser().role;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], [role === 'PATIENT' ? 'Find a doctor' : 'Doctors']] });
  if (role !== 'PATIENT') {
    document.getElementById('doctors-title').textContent = 'Doctors';
    document.getElementById('doctors-sub').textContent = role === 'ADMIN' ? 'Browse and manage the care team.' : 'Browse the care team by specialty.';
  }
  const params = new URLSearchParams(window.location.search);
  filters.q = params.get('q') || '';
  initFilters();
  if (role === 'ADMIN') document.getElementById('add-doctor-btn').addEventListener('click', openAddDoctor);
  await loadDoctors();
}
