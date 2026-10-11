/* MediCare AI — shared API client
   Loaded on every page (after icons.js) before the page-specific script. Handles the JWT
   lifecycle, a fetch() wrapper that attaches the Authorization header, formatting helpers and
   the toast/status-badge helpers used across pages.

   Contract with the backend is unchanged: same base URL convention, same endpoints, same
   ApiResponse envelope, same token storage keys. */

const API_BASE_URL = window.MEDICARE_API_BASE_URL ||
  (['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:8080/api'
    : 'https://YOUR-REAL-SERVICE.onrender.com/api');

    
const Auth = {
  TOKEN_KEY: 'medicareai_token',
  USER_KEY: 'medicareai_user',
  FLASH_KEY: 'medicareai_flash',

  saveSession(authResponse) {
    localStorage.setItem(Auth.TOKEN_KEY, authResponse.token);
    localStorage.setItem(Auth.USER_KEY, JSON.stringify({
      id: authResponse.userId,
      fullName: authResponse.fullName,
      email: authResponse.email,
      role: authResponse.role,
    }));
  },

  getToken() {
    return localStorage.getItem(Auth.TOKEN_KEY);
  },

  getUser() {
    try {
      const raw = localStorage.getItem(Auth.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Stored user record is unreadable; clearing the session.');
      localStorage.removeItem(Auth.USER_KEY);
      return null;
    }
  },

  isLoggedIn() {
    return !!Auth.getToken();
  },

  /** Clears the session and returns to the login page. `reason` shows once as a toast there. */
  logout(reason) {
    localStorage.removeItem(Auth.TOKEN_KEY);
    localStorage.removeItem(Auth.USER_KEY);
    if (reason) sessionStorage.setItem(Auth.FLASH_KEY, reason);
    window.location.href = 'login.html';
  },

  /** Call at the top of any page that requires a logged-in user. */
  requireAuth() {
    if (!Auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  /** Call on pages restricted to specific roles, e.g. requireRole(['ADMIN']). The backend
   *  enforces the same rules; this only decides what the browser shows. */
  requireRole(allowedRoles) {
    if (!Auth.requireAuth()) return false;
    const user = Auth.getUser();
    if (!user || !allowedRoles.includes(user.role)) {
      window.location.href = 'unauthorized.html';
      return false;
    }
    return true;
  },
};

/* ------------------------------------------------------------------ */
/* Fetch wrapper                                                       */
/* ------------------------------------------------------------------ */

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Wraps fetch() with the API base URL, JSON handling, the Authorization header, a timeout and
 * readable errors. Throws an Error whose message can be shown to the person as-is. Resolves to
 * `body.data` for JSON responses, or the raw Response for downloads.
 */
async function apiFetch(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.headers || {}) };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const isFormData = fetchOptions.body instanceof FormData;
  if (!isFormData && fetchOptions.body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    throw new Error("Can't reach the server. Check your connection and that the backend is running.");
  } finally {
    clearTimeout(timer);
  }

  // A 401 on the auth endpoints means wrong credentials, not an expired session.
  if (response.status === 401 && !path.startsWith('/auth/')) {
    Auth.logout('Your session expired. Please log in again.');
    throw new Error('Your session expired. Please log in again.');
  }

  // Downloads (e.g. report files) return raw blobs, not the ApiResponse envelope.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) throw httpError(httpErrorMessage(response.status), response.status);
    return response;
  }

  const body = await response.json();
  if (!response.ok || body.success === false) {
    const fieldErrors = body.fieldErrors && Object.values(body.fieldErrors);
    throw httpError((fieldErrors && fieldErrors[0]) || body.message || httpErrorMessage(response.status), response.status);
  }
  return body.data;
}

/** Error carrying the HTTP status, so callers can react (e.g. 409 = slot already taken). */
function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function httpErrorMessage(status) {
  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 409) return 'That conflicts with an existing record.';
  if (status >= 500) return 'The server ran into a problem. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

/* ------------------------------------------------------------------ */
/* Formatting helpers (dates are plain local dates; never shifted by UTC) */
/* ------------------------------------------------------------------ */

/** Escapes text before it is placed in an HTML template. Use for every API-provided string. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** "09:00:00" | "09:00" | [9, 0] → "09:00" */
function normalizeTime(t) {
  if (t == null || t === '') return '';
  if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1] ?? 0).padStart(2, '0')}`;
  return String(t).slice(0, 5);
}

/** "14:30" → "2:30 PM" */
function formatTime(t) {
  const n = normalizeTime(t);
  if (!n) return '—';
  const [h, m] = n.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "2026-10-14" | [2026, 10, 14] → local Date at midnight (no UTC drift). */
function parseDate(d) {
  if (!d) return null;
  const [y, m, day] = Array.isArray(d) ? d : String(d).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Local Date → "YYYY-MM-DD" (what the backend's LocalDate expects). */
function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(d, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = parseDate(d);
  return date ? date.toLocaleDateString('en-IN', opts) : '—';
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0) : value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function timeAgo(value) {
  const d = new Date(Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0) : value);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days} day${days > 1 ? 's' : ''} ago` : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Appointment as a sortable timestamp (local). */
function appointmentTimestamp(a) {
  const date = parseDate(a.appointmentDate);
  if (!date) return 0;
  const [h, m] = (normalizeTime(a.appointmentTime) || '00:00').split(':').map(Number);
  date.setHours(h, m, 0, 0);
  return date.getTime();
}

function formatMoney(amount) {
  if (amount == null || amount === '') return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/** "Dr." prefix without doubling it when the stored name already has one. */
function drName(name) {
  const n = String(name || '').trim();
  return /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`;
}

function initialsOf(name) {
  return String(name || '?').replace(/^dr\.?\s+/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/* ------------------------------------------------------------------ */
/* Shared UI helpers                                                   */
/* ------------------------------------------------------------------ */

/* Appointment status pill, shared by dashboard, appointments, and admin pages. */
function statusBadge(status) {
  const map = {
    PENDING: ['badge-pending', 'Pending'],
    CONFIRMED: ['badge-confirmed', 'Confirmed'],
    COMPLETED: ['badge-completed', 'Completed'],
    CANCELLED: ['badge-cancelled', 'Cancelled'],
    RESCHEDULED: ['badge-rescheduled', 'Rescheduled'],
  };
  const [cls, label] = map[status] || ['badge-neutral', esc(status || 'Unknown')];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* Toast helper used across pages for the real result of an operation. */
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  container.setAttribute('aria-live', 'polite');

  const glyph = { success: 'circle-check', error: 'circle-alert', info: 'info' }[type] || 'info';
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `${typeof icon === 'function' ? icon(glyph, { size: 18 }) : ''}<span></span>`;
  toast.querySelector('span').textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, type === 'error' ? 6000 : 3500);
}
