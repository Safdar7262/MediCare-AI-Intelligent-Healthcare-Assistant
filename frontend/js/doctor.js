/* MediCare AI — doctor profile page (GET /doctors/{id})
   Shows only what the backend stores: photo URL, qualification, experience, fee, working days and
   hours, bio and rating (rating only when above zero). The backend has no clinic address,
   consultation-type or patient-review fields, so those sections are intentionally absent. */

const RECENT_DOCTORS_KEY_PROFILE = 'medicareai_recent_doctors';

function rememberViewedDoctor(doctor) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_DOCTORS_KEY_PROFILE) || '[]').filter((d) => String(d.id) !== String(doctor.id));
    list.unshift({ id: doctor.id, name: doctor.fullName, specialization: doctor.specialization });
    localStorage.setItem(RECENT_DOCTORS_KEY_PROFILE, JSON.stringify(list.slice(0, 5)));
  } catch (e) { /* storage unavailable: skip */ }
}

function renderDoctorProfile(doctor, role) {
  const root = document.getElementById('profile-root');
  root.setAttribute('aria-busy', 'false');
  const rating = Number(doctor.rating) > 0 ? Number(doctor.rating).toFixed(1) : null;
  const dates = upcomingDates(doctor, 28).filter((d) => d.available).slice(0, 5);
  const hasSchedule = !!(doctor.availableFrom && doctor.availableTo);
  const canBook = role === 'PATIENT';

  root.innerHTML = `
    <div class="grid gap-5 lg:grid-cols-3 items-start">
      <div class="lg:col-span-2 grid gap-5">
        <section class="card card-pad" aria-labelledby="doc-name">
          <div class="flex flex-wrap gap-5 items-start">
            ${avatarHtml(doctor.fullName, doctor.profileImageUrl, 'xl')}
            <div class="flex-1" style="min-width:220px">
              <h1 id="doc-name" class="page-title" style="font-size:28px">${esc(drName(doctor.fullName))}</h1>
              <p class="text-brand-700 font-semibold" style="margin:4px 0 0;font-size:16px">${esc(doctor.specialization || 'General practice')}</p>
              ${doctor.qualification ? `<p class="text-muted" style="margin:2px 0 0">${esc(doctor.qualification)}</p>` : ''}
              <div class="flex flex-wrap gap-2" style="margin-top:14px">
                ${doctor.experienceYears != null ? `<span class="badge badge-neutral">${esc(doctor.experienceYears)} years of experience</span>` : ''}
                ${rating ? `<span class="badge badge-neutral">${icon('star', { size: 13 })}${rating} rating</span>` : ''}
              </div>
            </div>
          </div>
        </section>

        <section class="card card-pad" aria-labelledby="about-h">
          <h2 id="about-h" class="text-base font-bold" style="margin:0 0 8px">About</h2>
          ${doctor.bio ? `<p class="text-muted" style="margin:0;white-space:pre-line;max-width:70ch">${esc(doctor.bio)}</p>`
            : '<p class="text-muted" style="margin:0">This doctor hasn’t added a description yet.</p>'}
        </section>

        <section class="card" aria-labelledby="details-h">
          <div class="card-head"><h2 id="details-h">Practice details</h2></div>
          <dl class="summary-list card-pad" style="margin:0">
            <div>${icon('stethoscope', { size: 20, cls: 'text-brand-600' })}<div><dt>Specialty</dt><dd>${esc(doctor.specialization || 'General practice')}</dd></div></div>
            <div>${icon('calendar-days', { size: 20, cls: 'text-brand-600' })}<div><dt>Working days</dt><dd>${esc(doctor.availableDays ? describeAvailableDays(doctor.availableDays) : 'Not specified')}</dd></div></div>
            <div>${icon('clock', { size: 20, cls: 'text-brand-600' })}<div><dt>Working hours</dt><dd>${hasSchedule ? `${esc(formatTime(doctor.availableFrom))} – ${esc(formatTime(doctor.availableTo))}` : 'Not specified'}</dd></div></div>
            <div>${icon('id-card', { size: 20, cls: 'text-brand-600' })}<div><dt>Consultation fee</dt><dd>${esc(formatMoney(doctor.consultationFee))}</dd></div></div>
          </dl>
        </section>
      </div>

      <aside class="card" aria-labelledby="book-h" style="position:sticky;top:calc(var(--topbar-h) + 16px)">
        <div class="card-head"><h2 id="book-h">${canBook ? 'Book an appointment' : 'Availability'}</h2></div>
        <div class="card-pad grid gap-4">
          ${dates.length && hasSchedule ? `
            <div>
              <p class="text-sm font-semibold" style="margin:0 0 8px">Upcoming dates</p>
              <div class="flex flex-wrap gap-2">${dates.map((d) => `<span class="badge badge-neutral">${esc(d.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }))}</span>`).join('')}</div>
              <p class="field-hint">Hours: ${esc(formatTime(doctor.availableFrom))} – ${esc(formatTime(doctor.availableTo))}. A time is only confirmed once the doctor accepts your request.</p>
            </div>`
          : `<div class="callout is-warn">${icon('triangle-alert', { size: 18 })}<span>This doctor hasn’t published working days and hours yet, so online booking isn’t available.</span></div>`}
          ${canBook
            ? `<a href="book.html?doctorId=${doctor.id}" class="btn btn-primary btn-lg btn-block ${hasSchedule ? '' : 'hidden'}">${icon('calendar-plus', { size: 18 })}Book appointment</a>`
            : '<p class="text-sm text-muted" style="margin:0">Only patient accounts can book appointments.</p>'}
        </div>
      </aside>
    </div>`;
}

async function initDoctorProfilePage() {
  if (!Auth.requireAuth()) return;
  const role = Auth.getUser().role;
  const id = new URLSearchParams(window.location.search).get('id');
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], [role === 'PATIENT' ? 'Find a doctor' : 'Doctors', 'doctors.html'], ['Profile']] });
  const root = document.getElementById('profile-root');
  if (!id) {
    root.innerHTML = `<div class="card">${stateBlock({ icon: 'search', title: 'No doctor selected', text: 'Choose a doctor from the list to see their profile.', action: '<a href="doctors.html" class="btn btn-primary">Browse doctors</a>' })}</div>`;
    return;
  }
  async function load() {
    root.innerHTML = '<div class="skeleton" style="height:220px;border-radius:12px"></div>';
    try {
      const doctor = await apiFetch(`/doctors/${encodeURIComponent(id)}`);
      renderDoctorProfile(doctor, role);
      renderBreadcrumbs([['Dashboard', 'dashboard.html'], [role === 'PATIENT' ? 'Find a doctor' : 'Doctors', 'doctors.html'], [drName(doctor.fullName)]]);
      document.title = `${drName(doctor.fullName)} – MediCare AI`;
      if (role === 'PATIENT') rememberViewedDoctor(doctor);
    } catch (err) {
      const notFound = /find|found|404/i.test(err.message);
      root.innerHTML = '<div class="card"></div>';
      if (notFound) root.firstElementChild.innerHTML = stateBlock({ icon: 'search', title: 'Doctor not found', text: 'This profile may have been removed.', action: '<a href="doctors.html" class="btn btn-primary">Browse doctors</a>' });
      else showError(root.firstElementChild, err.message, load);
    }
    hydrateIcons(root);
  }
  await load();
}
