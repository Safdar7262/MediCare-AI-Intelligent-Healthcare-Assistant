/* MediCare AI — login & registration form handlers */

function redirectAfterLogin() {
  window.location.href = 'dashboard.html';
}

/** Already signed in? Skip the form. Also surfaces the one-time message left by Auth.logout(). */
function handleAuthPageEntry() {
  const flash = sessionStorage.getItem(Auth.FLASH_KEY);
  if (flash) {
    sessionStorage.removeItem(Auth.FLASH_KEY);
    showToast(flash, 'info');
  }
  if (Auth.isLoggedIn()) redirectAfterLogin();
}

function initForgotPassword() {
  const link = document.getElementById('forgot-link');
  if (!link) return;
  link.addEventListener('click', () => {
    // The backend's /auth/forgot-password is a stub (it does not send email yet), so we do not
    // pretend a reset link was sent. See docs in frontend/README.md → "Needs backend work".
    openModal({
      title: 'Reset your password',
      body: `<p style="margin:0 0 12px;color:var(--muted)">Password reset by email isn't available yet on this server.</p>
             <p style="margin:0;color:var(--muted)">If you can't log in, ask your administrator to reset your password. If you remember it, you can change it any time from <strong>Profile &amp; settings</strong> after logging in.</p>`,
      footer: '<button type="button" class="btn btn-primary" data-modal-close>Got it</button>',
    });
  });
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  handleAuthPageEntry();
  initPasswordToggles(form);
  initForgotPassword();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    const button = form.querySelector('button[type="submit"]');
    const restore = setLoading(button, 'Logging in…');

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.value.trim(),
          password: form.password.value,
        }),
      });
      Auth.saveSession(data);
      redirectAfterLogin();
    } catch (err) {
      showToast(err.message, 'error');
      setFieldError(form.password, err.message);
      restore();
      form.password.focus();
    }
  });
}

function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;
  handleAuthPageEntry();
  initPasswordToggles(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const valid = validateForm(form, {
      confirmPassword: (v) => (v !== form.password.value ? 'Passwords do not match.' : ''),
    });
    if (!valid) return;

    const button = form.querySelector('button[type="submit"]');
    const restore = setLoading(button, 'Creating account…');

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName.value.trim(),
          email: form.email.value.trim(),
          phoneNumber: form.phoneNumber.value.trim(),
          password: form.password.value,
          role: form.role.value,
        }),
      });
      Auth.saveSession(data);
      redirectAfterLogin();
    } catch (err) {
      showToast(err.message, 'error');
      restore();
    }
  });
}
