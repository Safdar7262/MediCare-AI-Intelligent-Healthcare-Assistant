/* MediCare AI — medical records: uploaded reports (/reports) and the clinical history (/medical-records).
   Shows only what the API returns. Patients see their own; doctors/admins arrive from the Patients page
   with ?patientId=. Nothing here is logged or cached. */

let currentPatientId = null;
let recordRole = null;

const FILE_ICON = { PDF: 'file-text', JPG: 'file-image', JPEG: 'file-image', PNG: 'file-image' };
const MAX_UPLOAD = 10 * 1024 * 1024; // matches the backend's 10MB multipart limit
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

function reportRows(reports) {
  if (!reports.length) return stateBlock({ icon: 'file-text', title: 'No reports uploaded yet', text: 'Upload lab results, scans or other documents as PDF, JPG or PNG.' });
  return `<ul style="list-style:none;margin:0;padding:0">${reports.map((r) => `
    <li class="flex items-center gap-3 px-5 py-3" style="border-bottom:1px solid #EDF2F4">
      <span class="state-icon" style="margin:0;width:40px;height:40px">${icon(FILE_ICON[String(r.fileType).toUpperCase()] || 'file', { size: 20 })}</span>
      <div class="min-w-0 flex-1"><p class="text-sm font-semibold" style="margin:0;overflow-wrap:anywhere">${esc(r.reportName)}</p>
        <p class="text-xs text-muted" style="margin:0">${esc(r.reportDate ? formatDate(r.reportDate) : '')}${r.uploadedByName ? ` · uploaded by ${esc(r.uploadedByName)}` : ''}</p></div>
      <button type="button" class="btn btn-secondary btn-sm" data-download="${r.id}" aria-label="Download ${esc(r.reportName)}">${icon('download', { size: 15 })}<span class="sm-up">Download</span></button>
    </li>`).join('')}</ul>`;
}

function recordCards(records) {
  if (!records.length) return stateBlock({ icon: 'clipboard-list', title: 'No medical history yet', text: 'Diagnoses and prescriptions added by your doctors will appear here.' });
  return `<ul style="list-style:none;margin:0;padding:0">${[...records].sort((a, b) => String(b.recordDate).localeCompare(String(a.recordDate))).map((r) => `
    <li class="px-5 py-4" style="border-bottom:1px solid #EDF2F4">
      <div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-bold" style="margin:0">${esc(formatDate(r.recordDate))}</p>
        <p class="text-sm text-muted" style="margin:0">${r.doctorName ? esc(drName(r.doctorName)) : ''}</p></div>
      <dl class="grid gap-3" style="margin:12px 0 0">
        ${r.diagnosis ? `<div><dt class="text-xs text-faint">Diagnosis</dt><dd style="margin:2px 0 0;white-space:pre-line">${esc(r.diagnosis)}</dd></div>` : ''}
        ${r.prescription ? `<div><dt class="text-xs text-faint">Prescription</dt><dd style="margin:2px 0 0;white-space:pre-line">${esc(r.prescription)}</dd></div>` : ''}
        ${r.notes ? `<div><dt class="text-xs text-faint">Doctor’s notes</dt><dd style="margin:2px 0 0;white-space:pre-line">${esc(r.notes)}</dd></div>` : ''}
      </dl></li>`).join('')}</ul>`;
}

function uploadCard() {
  return `<section class="card card-pad" aria-labelledby="up-h" style="margin-bottom:16px">
    <h2 id="up-h" class="text-base font-bold" style="margin:0 0 12px">Upload a report</h2>
    <form id="upload-form" class="flex flex-wrap items-end gap-3" novalidate>
      <div class="field" style="flex:1;min-width:240px"><label for="upload-file">File (PDF, JPG or PNG, up to 10 MB)</label>
        <input id="upload-file" class="input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" style="padding:7px 10px" /></div>
      <button type="submit" class="btn btn-primary">${icon('upload', { size: 18 })}Upload</button>
    </form></section>`;
}

async function loadRecords() {
  const body = document.getElementById('records-body');
  body.innerHTML = '<div class="skeleton" style="height:240px;border-radius:12px"></div>';
  const [reps, recs] = await Promise.allSettled([apiFetch(`/reports/patient/${currentPatientId}`), apiFetch(`/medical-records/patient/${currentPatientId}`)]);

  body.innerHTML = `${uploadCard()}
    <section class="card"><div class="px-4 pt-2"><div class="tabs" role="tablist" aria-label="Record type" id="rec-tabs">
      <button class="tab" role="tab" data-tab="reports" aria-selected="true">Reports<span class="count">${reps.status === 'fulfilled' ? reps.value.length : '–'}</span></button>
      <button class="tab" role="tab" data-tab="history" aria-selected="false" tabindex="-1">Medical history<span class="count">${recs.status === 'fulfilled' ? recs.value.length : '–'}</span></button></div></div>
      <div id="rec-panel"></div></section>`;
  const panel = document.getElementById('rec-panel');
  const renderTab = (tab) => {
    const res = tab === 'reports' ? reps : recs;
    if (res.status === 'rejected') { showError(panel, res.reason.message, loadRecords); return; }
    panel.innerHTML = tab === 'reports' ? reportRows(res.value) : recordCards(res.value);
    hydrateIcons(panel);
    panel.querySelectorAll('[data-download]').forEach((b) => b.addEventListener('click', () => downloadReport(b)));
  };
  initTabs(document.getElementById('rec-tabs'), renderTab)(document.querySelector('#rec-tabs [data-tab="reports"]'));
  initUpload();
  hydrateIcons(body);
}

async function downloadReport(button) {
  const restore = setLoading(button, 'Preparing…');
  try {
    const response = await apiFetch(`/reports/${button.dataset.download}/download`, { timeoutMs: 120000 });
    const blob = await response.blob();
    const match = (response.headers.get('content-disposition') || '').match(/filename="?([^"]+)"?/);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = match ? match[1] : `report-${button.dataset.download}`;
    document.body.appendChild(link); link.click(); link.remove();
    window.URL.revokeObjectURL(url);
    showToast('Download started', 'info');
  } catch (err) { showToast(err.message, 'error'); }
  finally { restore(); hydrateIcons(button); }
}

function initUpload() {
  const form = document.getElementById('upload-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('upload-file');
    clearFieldErrors(form);
    const file = input.files[0];
    if (!file) return setFieldError(input, 'Choose a file to upload.');
    if (!ALLOWED.includes(file.type)) return setFieldError(input, 'Only PDF, JPG or PNG files can be uploaded.');
    if (file.size > MAX_UPLOAD) return setFieldError(input, 'That file is over 10 MB. Choose a smaller one.');
    const formData = new FormData();
    formData.append('patientId', currentPatientId);
    formData.append('file', file);
    const restore = setLoading(form.querySelector('button[type="submit"]'), 'Uploading…');
    try {
      await apiFetch('/reports/upload', { method: 'POST', body: formData, timeoutMs: 120000 });
      showToast('Report uploaded');
      loadRecords();
    } catch (err) { showToast(err.message, 'error'); restore(); hydrateIcons(form); }
  });
}

function openAddRecord() {
  const { el, close } = openModal({
    title: 'Add medical record',
    size: 'lg',
    body: `<form id="record-form" class="grid gap-3" novalidate>
      <div class="field"><label for="rec-dx">Diagnosis</label><textarea class="input" id="rec-dx" name="diagnosis"></textarea></div>
      <div class="field"><label for="rec-rx">Prescription</label><textarea class="input" id="rec-rx" name="prescription"></textarea></div>
      <div class="field"><label for="rec-notes">Notes</label><textarea class="input" id="rec-notes" name="notes"></textarea></div>
    </form>`,
    footer: '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" form="record-form" class="btn btn-primary">Save record</button>',
  });
  const form = el.querySelector('#record-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    if (!['diagnosis', 'prescription', 'notes'].some((k) => form[k].value.trim())) return setFieldError(form.diagnosis, 'Add a diagnosis, prescription or note.');
    const restore = setLoading(el.querySelector('button[type="submit"]'), 'Saving…');
    try {
      await apiFetch('/medical-records', { method: 'POST', body: JSON.stringify({
        patientId: currentPatientId, diagnosis: form.diagnosis.value.trim(), prescription: form.prescription.value.trim(), notes: form.notes.value.trim() }) });
      showToast('Medical record added'); close(); loadRecords();
    } catch (err) { showToast(err.message, 'error'); restore(); }
  });
}

async function initReportsPage() {
  if (!Auth.requireAuth()) return;
  recordRole = Auth.getUser().role;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], recordRole === 'PATIENT' ? ['Medical records'] : ['Patients', 'patients.html'], ...(recordRole === 'PATIENT' ? [] : [['Records']])] });
  const body = document.getElementById('records-body');
  try {
    if (recordRole === 'PATIENT') {
      currentPatientId = (await apiFetch('/patients/me')).id;
      document.getElementById('records-sub').textContent = 'Your reports, diagnoses and prescriptions in one place.';
    } else {
      const fromQuery = new URLSearchParams(window.location.search).get('patientId');
      currentPatientId = fromQuery ? Number(fromQuery) : null;
      if (!currentPatientId) {
        body.innerHTML = `<div class="card">${stateBlock({ icon: 'users', title: 'Choose a patient first', text: 'Open a patient’s records from the Patients page.', action: '<a href="patients.html" class="btn btn-primary">Go to patients</a>' })}</div>`;
        hydrateIcons(body);
        return;
      }
      const patient = await apiFetch(`/patients/${currentPatientId}`).catch(() => null);
      document.getElementById('records-title').textContent = patient ? `${patient.fullName}’s records` : 'Patient records';
      document.getElementById('records-sub').textContent = 'Reports and medical history for this patient.';
      const addBtn = document.getElementById('add-record-btn');
      addBtn.classList.remove('hidden');
      addBtn.addEventListener('click', openAddRecord);
    }
    await loadRecords();
  } catch (err) {
    body.innerHTML = '<div class="card"></div>';
    showError(body.firstElementChild, err.message, initReportsPage);
  }
}
