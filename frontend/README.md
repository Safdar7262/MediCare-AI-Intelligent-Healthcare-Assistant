# MediCare AI — frontend

Plain HTML + Tailwind (CDN) + vanilla JavaScript, as before. No build step and no new npm dependencies.

## Run it

Serve the `frontend` folder over HTTP (partials are fetched at runtime, so `file://` will not work) on a port the backend allows for CORS (5500 or 5501 by default):

```bash
cd frontend
npx serve -l 5500 .        # or VS Code "Live Server" on 5500
# open http://localhost:5500/html/landing.html
```

Backend: `http://localhost:8080/api`. Override with `<script>window.MEDICARE_API_BASE_URL = '…'</script>` before `api.js`.
Tailwind and Google Fonts load from their CDNs, so the first load needs internet access.

## Structure

- `html/` pages: landing, login, register, dashboard, doctors, **doctor** (profile, new), **book** (guided booking, new), appointments, chatbot, patients, reports (records), profile, notifications, admin, **404**, **unauthorized** (new)
- `partials/` sidebar, topbar, public navbar (injected at runtime)
- `css/styles.css` design tokens and components (buttons, fields, badges, dialogs, tables, chat…)
- `js/icons.js` vendored Lucide icons (no icon CDN) · `js/api.js` API client, auth, formatters · `js/ui.js` dialogs, validation, states, availability helpers · `js/components.js` app shell · `js/chat.js` assistant (page + floating widget) · one script per page

## Needs backend work (not changed, because the backend is out of scope)

| Area | Gap | Effect in the UI |
|---|---|---|
| Slot availability | No endpoint lists a doctor's booked slots to patients | Slots come from the doctor's working days/hours. A clash returns HTTP 409 and is handled on submit. |
| Reschedule | `PUT /appointments/{id}/reschedule` does no clash or ownership check | UI offers only the doctor's working days/hours; the server could still double-book. |
| Booking date | `@Future` means same-day booking is rejected | Dates start tomorrow. |
| Forgot password | `/auth/forgot-password` is a stub (sends nothing) | Login shows an honest "not available yet" dialog instead of claiming an email was sent. |
| Reviews, clinic address, consultation type (online/in-person), verified badge | No fields | Not shown. Nothing invented. Rating appears only when above 0. |
| Doctor photos | `profileImageUrl` exists, but there's no upload endpoint | Doctors can paste a photo link in Profile; initials otherwise. |
| Access control | `GET /reports/patient/{id}` and `GET /medical-records/patient/{id}` check only that the caller is logged in, not that they own the record | **Security issue to fix in the backend.** Hiding UI is not protection. |
| Dark theme | Not implemented (would need consistent coverage) | Light theme only. |

## What is frontend-only

Recently viewed doctors (browser localStorage), reminders (derived from your real appointments), search/filter/sort/pagination (client-side over the API lists).

## Changes worth knowing

- Currency is now ₹ everywhere (it mixed $ and ₹).
- API-provided text is HTML-escaped (previously inserted raw, an XSS risk).
- Wrong password on login no longer triggers the "session expired" logout loop.
- `appointments.html?doctorId=` redirects to the new booking flow.
- Removed: the non-functional "Continue with Google" button and unverified landing statistics (doctor counts, "4.8★", etc.).
