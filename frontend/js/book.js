/* MediCare AI — guided booking flow (patients only)
   1 Doctor → 2 Date & time → 3 Your details → 4 Review → confirmation.
   The request goes to the existing POST /appointments. The confirmation screen is rendered only
   after the backend returns success; any failure keeps the person on the review step with the
   server's message. Slots are generated from the doctor's working days/hours because the backend
   exposes no list of already-booked slots; a clash (HTTP 409) is caught on submit. */

const STEPS = ['Doctor', 'Date & time', 'Your details', 'Review'];
const booking = { doctors: [], doctor: null, date: '', time: '', symptoms: '', step: 0, submitting: false, taken: new Set(), search: '' };

function renderStepper() {
  const el = document.getElementById('stepper');
  el.hidden = booking.step >= STEPS.length;
  el.innerHTML = STEPS.map((name, i) => {
    const cls = i < booking.step ? 'is-done' : i === booking.step ? 'is-current' : '';
    return `<li class="step ${cls}" ${i === booking.step ? 'aria-current="step"' : ''}>
      <span class="step-dot">${i < booking.step ? icon('check', { size: 14, stroke: 3 }) : i + 1}</span>
      <span class="step-name">${name}</span>${i < STEPS.length - 1 ? '<span class="step-bar" aria-hidden="true"></span>' : ''}</li>`;
  }).join('');
}

function doctorSummary(d) {
  return `<div class="flex items-center gap-3">
    ${avatarHtml(d.fullName, d.profileImageUrl, 'lg')}
    <div class="min-w-0"><p class="font-bold" style="margin:0">${esc(drName(d.fullName))}</p>
    <p class="text-sm text-brand-700 font-semibold" style="margin:0">${esc(d.specialization || 'General practice')}</p>
    <p class="text-sm text-muted" style="margin:0">Fee ${esc(formatMoney(d.consultationFee))}${d.availableDays ? ` · ${esc(describeAvailableDays(d.availableDays))}` : ''}</p></div></div>`;
}

function navButtons({ back = true, nextLabel = 'Continue', nextDisabled = false, nextId = 'next-btn' } = {}) {
  return `<div class="flex flex-wrap gap-3 justify-between" style="margin-top:24px">
    ${back ? '<button type="button" class="btn btn-secondary" id="back-btn">' + icon('arrow-left', { size: 18 }) + 'Back</button>' : '<span></span>'}
    <button type="button" class="btn btn-primary" id="${nextId}" ${nextDisabled ? 'disabled' : ''}>${nextLabel}</button></div>`;
}

/* ---------- Step 1: doctor ---------- */
function renderStepDoctor(root) {
  const q = booking.search.toLowerCase();
  const list = booking.doctors.filter((d) => `${d.fullName} ${d.specialization || ''}`.toLowerCase().includes(q));
  root.innerHTML = `
    <section class="card card-pad" aria-labelledby="s1">
      <h2 id="s1" class="text-lg font-bold" style="margin:0 0 14px">Who would you like to see?</h2>
      <div class="field" style="margin-bottom:14px"><label for="doc-search" class="sr-only">Search doctors</label>
        <div class="relative"><span class="input-icon-glyph">${icon('search', { size: 18 })}</span>
        <input id="doc-search" type="search" class="input input-icon" placeholder="Search by name or specialty" value="${esc(booking.search)}" autocomplete="off" /></div></div>
      <div role="radiogroup" aria-label="Doctors" class="grid gap-2" style="max-height:420px;overflow-y:auto;padding:2px">
        ${list.length ? list.map((d) => `
          <button type="button" role="radio" aria-checked="${booking.doctor && booking.doctor.id === d.id}" data-doc="${d.id}" class="card flex items-center gap-3 text-left" style="padding:12px 14px;cursor:pointer;box-shadow:none;font:inherit;${booking.doctor && booking.doctor.id === d.id ? 'border-color:var(--brand);background:var(--brand-tint)' : ''}">
            ${avatarHtml(d.fullName, d.profileImageUrl, 'md')}
            <span class="min-w-0 flex-1"><span class="block font-semibold">${esc(drName(d.fullName))}</span>
            <span class="block text-sm text-muted">${esc(d.specialization || 'General practice')} · ${esc(formatMoney(d.consultationFee))}</span></span>
            ${booking.doctor && booking.doctor.id === d.id ? icon('circle-check', { size: 22, cls: 'text-brand-600' }) : ''}
          </button>`).join('') : stateBlock({ icon: 'search', title: 'No doctors match', text: 'Try a different name or specialty.' })}
      </div>
      ${navButtons({ back: false, nextDisabled: !booking.doctor })}
    </section>`;
  root.querySelector('#doc-search').addEventListener('input', debounce((e) => { booking.search = e.target.value; const pos = e.target.selectionStart; renderStepDoctor(root); const s = root.querySelector('#doc-search'); s.focus(); s.setSelectionRange(pos, pos); }, 150));
  root.querySelectorAll('[data-doc]').forEach((b) => b.addEventListener('click', () => {
    const picked = booking.doctors.find((d) => String(d.id) === b.dataset.doc);
    if (!booking.doctor || booking.doctor.id !== picked.id) { booking.date = ''; booking.time = ''; }
    booking.doctor = picked;
    renderStepDoctor(root);
  }));
  root.querySelector('#next-btn').addEventListener('click', () => go(1));
}

/* ---------- Step 2: date & time ---------- */
function renderStepWhen(root) {
  const d = booking.doctor;
  const schedule = slotsFor(d);
  const dates = upcomingDates(d, 21);
  const anyDay = dates.some((x) => x.available);
  const slots = booking.date ? schedule : [];

  root.innerHTML = `
    <section class="card card-pad" aria-labelledby="s2">
      <div style="margin-bottom:20px">${doctorSummary(d)}</div>
      <hr class="divider" style="margin-bottom:20px" />
      ${!schedule.length || !anyDay ? `<div class="callout is-warn">${icon('triangle-alert', { size: 18 })}<span>${esc(drName(d.fullName))} hasn’t published working days and hours, so a time can’t be chosen online. Please choose another doctor.</span></div>` : `
      <h2 id="s2" class="text-lg font-bold" style="margin:0 0 12px">Pick a date</h2>
      <div class="date-strip" role="radiogroup" aria-label="Available dates">
        ${dates.map((x) => `<button type="button" role="radio" class="date-chip" data-date="${x.iso}" aria-checked="${booking.date === x.iso}" ${x.available ? '' : 'disabled aria-disabled="true"'} aria-label="${esc(x.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }))}${x.available ? '' : ', doctor not available'}">
          <span class="dow">${x.date.toLocaleDateString('en-IN', { weekday: 'short' })}</span><span class="dom">${x.date.getDate()}</span><span class="mon">${x.date.toLocaleDateString('en-IN', { month: 'short' })}</span></button>`).join('')}
      </div>
      <p class="field-hint">Dates when the doctor doesn’t work are greyed out. Same-day booking isn’t available.</p>

      <h2 class="text-lg font-bold" style="margin:24px 0 12px">Pick a time</h2>
      ${booking.date ? `<div class="slot-grid" role="radiogroup" aria-label="Available times on ${esc(formatDate(booking.date))}">
        ${slots.map((t) => { const taken = booking.taken.has(`${booking.date}|${t}`); return `<button type="button" role="radio" class="slot ${taken ? 'is-taken' : ''}" data-time="${t}" aria-checked="${booking.time === t}" ${taken ? 'disabled' : ''}>${esc(formatTime(t))}</button>`; }).join('')}
      </div>
      <p class="field-hint">Times follow the doctor’s working hours. If someone has already booked a time, we’ll tell you when you confirm.</p>`
        : '<p class="text-muted" style="margin:0">Choose a date to see times.</p>'}`}
      ${navButtons({ nextDisabled: !(booking.date && booking.time) })}
    </section>`;
  root.querySelectorAll('[data-date]').forEach((b) => b.addEventListener('click', () => { booking.date = b.dataset.date; booking.time = ''; renderStepWhen(root); root.querySelector(`[data-date="${booking.date}"]`)?.focus(); }));
  root.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', () => { booking.time = b.dataset.time; renderStepWhen(root); root.querySelector(`[data-time="${booking.time}"]`)?.focus(); }));
  root.querySelector('#back-btn').addEventListener('click', () => go(-1));
  root.querySelector('#next-btn').addEventListener('click', () => go(1));
}

/* ---------- Step 3: details ---------- */
function renderStepDetails(root) {
  const user = Auth.getUser();
  root.innerHTML = `
    <section class="card card-pad" aria-labelledby="s3">
      <h2 id="s3" class="text-lg font-bold" style="margin:0 0 14px">Confirm your details</h2>
      <form id="details-form" class="grid gap-4" novalidate>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="field"><label for="pt-name">Name</label><input class="input" id="pt-name" value="${esc(user.fullName)}" readonly /></div>
          <div class="field"><label for="pt-email">Email</label><input class="input" id="pt-email" value="${esc(user.email)}" readonly /></div>
        </div>
        <p class="field-hint" style="margin-top:-8px">These come from your account. Update them in <a href="profile.html" class="link">Profile &amp; settings</a>.</p>
        <div class="field"><label for="symptoms">Reason for visit <span class="opt">(optional)</span></label>
          <textarea class="input" id="symptoms" name="symptoms" maxlength="500" placeholder="Briefly describe what’s going on, such as symptoms or how long they’ve lasted.">${esc(booking.symptoms)}</textarea>
          <p class="field-hint">Only share what the doctor needs. Don’t include ID or payment details.</p></div>
      </form>
      ${navButtons()}
    </section>`;
  const ta = root.querySelector('#symptoms');
  ta.addEventListener('input', () => { booking.symptoms = ta.value; });
  root.querySelector('#back-btn').addEventListener('click', () => go(-1));
  root.querySelector('#next-btn').addEventListener('click', () => { booking.symptoms = ta.value.trim(); go(1); });
}

/* ---------- Step 4: review & submit ---------- */
function renderStepReview(root, errorMessage = '') {
  const d = booking.doctor;
  root.innerHTML = `
    <section class="card card-pad" aria-labelledby="s4">
      <h2 id="s4" class="text-lg font-bold" style="margin:0 0 16px">Review your request</h2>
      ${errorMessage ? `<div class="callout is-danger" role="alert" style="margin-bottom:16px">${icon('circle-alert', { size: 18 })}<span>${esc(errorMessage)}</span></div>` : ''}
      <dl class="summary-list">
        <div>${icon('stethoscope', { size: 20, cls: 'text-brand-600' })}<div><dt>Doctor</dt><dd>${esc(drName(d.fullName))}, ${esc(d.specialization || 'General practice')}</dd></div></div>
        <div>${icon('calendar-days', { size: 20, cls: 'text-brand-600' })}<div><dt>Date</dt><dd>${esc(formatDate(booking.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</dd></div></div>
        <div>${icon('clock', { size: 20, cls: 'text-brand-600' })}<div><dt>Time</dt><dd>${esc(formatTime(booking.time))}</dd></div></div>
        <div>${icon('id-card', { size: 20, cls: 'text-brand-600' })}<div><dt>Consultation fee</dt><dd>${esc(formatMoney(d.consultationFee))} <span class="text-sm text-muted" style="font-weight:400">· not charged online</span></dd></div></div>
        <div>${icon('clipboard-list', { size: 20, cls: 'text-brand-600' })}<div><dt>Reason for visit</dt><dd style="font-weight:500">${booking.symptoms ? esc(booking.symptoms) : '<span class="text-muted">Not provided</span>'}</dd></div></div>
      </dl>
      <div class="callout" style="margin-top:20px">${icon('info', { size: 18 })}<span>This sends a request to the doctor. Your appointment starts as <strong>Pending</strong> and is confirmed when the doctor accepts it.</span></div>
      ${navButtons({ nextLabel: 'Send request', nextId: 'confirm-btn' })}
    </section>`;
  root.querySelector('#back-btn').addEventListener('click', () => go(-1));
  root.querySelector('#confirm-btn').addEventListener('click', submitBooking);
}

async function submitBooking(e) {
  if (booking.submitting) return; // no duplicate requests
  booking.submitting = true;
  const btn = e.currentTarget;
  document.getElementById('back-btn').disabled = true;
  const restore = setLoading(btn, 'Sending request…');
  try {
    const appointment = await apiFetch('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        doctorId: Number(booking.doctor.id),
        appointmentDate: booking.date,
        appointmentTime: booking.time,
        symptoms: booking.symptoms,
      }),
    });
    booking.submitting = false;
    renderConfirmation(document.getElementById('wizard'), appointment);
  } catch (err) {
    booking.submitting = false;
    const root = document.getElementById('wizard');
    if (err.status === 409) {
      // The backend says this exact slot is taken: mark it so it can't be picked again here.
      booking.taken.add(`${booking.date}|${booking.time}`);
      booking.time = '';
      booking.step = 1;
      renderStepper();
      renderStepWhen(root);
      root.insertAdjacentHTML('afterbegin', `<div class="callout is-danger" role="alert" style="margin-bottom:16px">${icon('circle-alert', { size: 18 })}<span>That time was just taken. Please choose another time.</span></div>`);
      root.querySelector('[role="alert"]').scrollIntoView({ block: 'center' });
    } else {
      showToast(err.message, 'error');
      renderStepReview(root, err.message);
    }
  }
}

/* ---------- Confirmation (only after the backend accepted the request) ---------- */
function renderConfirmation(root, appt) {
  booking.step = STEPS.length;
  renderStepper();
  const d = booking.doctor;
  root.innerHTML = `
    <section class="card card-pad" aria-labelledby="done-h" style="text-align:center">
      <div class="state-icon" style="margin:0 auto 14px;width:56px;height:56px;background:var(--ok-tint);color:#1B6B3A">${icon('circle-check', { size: 30 })}</div>
      <h2 id="done-h" class="font-display" style="font-size:26px;margin:0 0 6px">Request sent</h2>
      <p class="text-muted" style="margin:0 auto 22px;max-width:46ch">${esc(drName(d.fullName))} will review your request. You’ll get a notification when it’s confirmed.</p>
      <dl class="summary-list" style="text-align:left;max-width:380px;margin:0 auto 24px;padding:18px;background:var(--mist);border-radius:12px">
        <div><div><dt>Doctor</dt><dd>${esc(drName(appt.doctorName || d.fullName))}</dd></div></div>
        <div><div><dt>When</dt><dd>${esc(formatDate(appt.appointmentDate || booking.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}, ${esc(formatTime(appt.appointmentTime || booking.time))}</dd></div></div>
        <div><div><dt>Status</dt><dd style="margin-top:4px">${statusBadge(appt.status || 'PENDING')}</dd></div></div>
        ${appt.id ? `<div><div><dt>Reference</dt><dd>#${esc(appt.id)}</dd></div></div>` : ''}
      </dl>
      <div class="flex flex-wrap gap-3 justify-center">
        <a href="appointments.html" class="btn btn-primary">View my appointments</a>
        <a href="dashboard.html" class="btn btn-secondary">Back to dashboard</a>
      </div>
    </section>`;
  document.getElementById('done-h').scrollIntoView({ block: 'center' });
  document.getElementById('done-h').setAttribute('tabindex', '-1');
  document.getElementById('done-h').focus();
}

/* ---------- Wizard controller ---------- */
function go(delta) {
  booking.step = Math.min(Math.max(0, booking.step + delta), STEPS.length - 1);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  const root = document.getElementById('wizard');
  renderStepper();
  [renderStepDoctor, renderStepWhen, renderStepDetails, renderStepReview][booking.step](root);
  hydrateIcons(root);
}

async function initBookingPage() {
  if (!Auth.requireRole(['PATIENT'])) return;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['Find a doctor', 'doctors.html'], ['Book an appointment']] });
  const root = document.getElementById('wizard');
  async function load() {
    root.innerHTML = '<div class="skeleton" style="height:320px;border-radius:12px"></div>';
    try {
      booking.doctors = await apiFetch('/doctors');
      const pre = new URLSearchParams(window.location.search).get('doctorId');
      const match = pre && booking.doctors.find((d) => String(d.id) === pre);
      if (match) { booking.doctor = match; booking.step = 1; }
      render();
    } catch (err) {
      root.innerHTML = '<div class="card"></div>';
      showError(root.firstElementChild, err.message, load);
    }
  }
  await load();
}
