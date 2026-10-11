/* MediCare AI — profile & settings, adapts to PATIENT / DOCTOR / ADMIN
   Same endpoints as before: /patients/me, /doctors/me, /users/me/password. */

function loadProfileHeader() {
  const user = Auth.getUser();
  document.getElementById('profile-initial').textContent = user.fullName.charAt(0).toUpperCase();
  document.getElementById('profile-name').textContent = user.fullName;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-role-badge').textContent = ROLE_LABELS[user.role] || user.role;
}

async function loadPatientForm() {
  const data = await apiFetch('/patients/me');
  const form = document.getElementById('patient-form');
  document.getElementById('patient-card').classList.remove('hidden');
  ['bloodGroup', 'address', 'emergencyContact', 'currentDisease'].forEach((k) => { form[k].value = data[k] || ''; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const restore = setLoading(form.querySelector('button[type="submit"]'), 'Saving…');
    try {
      await apiFetch('/patients/me', { method: 'PUT', body: JSON.stringify({
        bloodGroup: form.bloodGroup.value.trim(), address: form.address.value.trim(),
        emergencyContact: form.emergencyContact.value.trim(), currentDisease: form.currentDisease.value.trim() }) });
      showToast('Profile updated');
    } catch (err) { showToast(err.message, 'error'); }
    finally { restore(); }
  });
}

async function loadDoctorForm() {
  const data = await apiFetch('/doctors/me');
  const form = document.getElementById('doctor-form');
  document.getElementById('doctor-card').classList.remove('hidden');
  ['specialization', 'qualification', 'availableDays', 'bio', 'profileImageUrl'].forEach((k) => { form[k].value = data[k] || ''; });
  form.experienceYears.value = data.experienceYears ?? '';
  form.consultationFee.value = data.consultationFee ?? '';
  form.availableFrom.value = normalizeTime(data.availableFrom);
  form.availableTo.value = normalizeTime(data.availableTo);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form, { availableTo: (v) => (v && form.availableFrom.value && v <= form.availableFrom.value ? 'End time must be after the start time.' : '') })) return;
    const restore = setLoading(form.querySelector('button[type="submit"]'), 'Saving…');
    // The backend only updates fields that are present, so blank inputs are left out.
    const payload = {};
    ['specialization', 'qualification', 'availableDays', 'bio', 'profileImageUrl', 'availableFrom', 'availableTo'].forEach((k) => { if (form[k].value.trim()) payload[k] = form[k].value.trim(); });
    if (form.experienceYears.value !== '') payload.experienceYears = Number(form.experienceYears.value);
    if (form.consultationFee.value !== '') payload.consultationFee = Number(form.consultationFee.value);
    try {
      await apiFetch('/doctors/me', { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Profile updated');
    } catch (err) { showToast(err.message, 'error'); }
    finally { restore(); }
  });
}

function initPasswordForm() {
  const form = document.getElementById('password-form');
  initPasswordToggles(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const valid = validateForm(form, {
      confirmPassword: (v) => (v !== form.newPassword.value ? 'Passwords do not match.' : ''),
      newPassword: (v) => (v && v === form.currentPassword.value ? 'Choose a password different from your current one.' : ''),
    });
    if (!valid) return;
    const restore = setLoading(form.querySelector('button[type="submit"]'), 'Updating…');
    try {
      await apiFetch('/users/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword: form.currentPassword.value, newPassword: form.newPassword.value }) });
      showToast('Password updated');
      form.reset();
    } catch (err) { showToast(err.message, 'error'); }
    finally { restore(); }
  });
}

async function initProfilePage() {
  if (!Auth.requireAuth()) return;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['Profile & settings']] });
  loadProfileHeader();
  initPasswordForm();
  const role = Auth.getUser().role;
  try {
    if (role === 'PATIENT') await loadPatientForm();
    else if (role === 'DOCTOR') await loadDoctorForm();
    // ADMIN has no extension profile beyond the base user record.
  } catch (err) { showToast(err.message, 'error'); }
  hydrateIcons();
}
