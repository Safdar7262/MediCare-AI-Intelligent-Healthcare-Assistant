# Setup Instructions — MediCare AI

This walks through getting the whole stack (PostgreSQL → Spring Boot backend →
static frontend) running on your machine for local development.

## 1. Prerequisites

- Java 17 (JDK)
- Maven 3.9+ (or use the included `mvnw` wrapper if you add one)
- PostgreSQL 14+
- Node.js is **not** required — the frontend is plain HTML/CSS/JS served statically
- An OpenAI or Google Gemini API key (optional — the chatbot works without one,
  it just returns a placeholder reply telling you a key isn't configured yet)

## 2. Database

Create the database and load the schema:

```bash
createdb medicare_ai
psql -U postgres -d medicare_ai -f database/schema.sql
```

This creates all tables/enums and seeds one admin, one doctor, and one patient
(see `database/schema.sql` for the seed rows — the seeded password hashes are
placeholders, so register fresh accounts through the app instead of trying to
log in as the seed users directly).

## 3. Backend configuration

All configurable values live in `backend/src/main/resources/application.yml`
and read from environment variables with sane local defaults:

| Variable | Purpose | Local default |
|---|---|---|
| `JWT_SECRET` | Signs JWTs — must be 32+ characters | a placeholder string (change for anything beyond local dev) |
| `JWT_EXPIRATION_MS` | Token lifetime in ms | `86400000` (24h) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API | `http://localhost:5500,http://127.0.0.1:5500` |
| `UPLOAD_DIR` | Where uploaded reports are stored on disk | `./uploads/reports` |
| `app.ai.provider` | `openai` or `gemini` | `openai` |
| `OPENAI_API_KEY` | OpenAI key (if using OpenAI) | none |
| `GEMINI_API_KEY` | Gemini key (if using Gemini) | none |

Set the datasource credentials in `application.yml` (or override via
`SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` env vars) to match
your local Postgres setup.

### Windows / PowerShell note

If you're setting environment variables for a single run in PowerShell, use:

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:JWT_SECRET="a-much-longer-random-string-than-this-example"
mvn spring-boot:run
```

(`set VAR=value` is the cmd.exe syntax and won't work in PowerShell — this was
the issue from the earlier Maven build troubleshooting session.)

## 4. Run the backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The API starts on `http://localhost:8080`. Confirm it's up:

```bash
curl http://localhost:8080/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
```

You should get a 401 with a JSON error body (not a connection error) — that
confirms the app booted and Spring Security is wired correctly.

## 5. Run the frontend

The frontend is static, but it **must be served over HTTP, not opened as a
`file://` URL** — the partial loader (`components.js`) uses `fetch()` to pull
in `sidebar.html`/`topbar.html`/`public-navbar.html`, and browsers block
`fetch()` on the `file://` scheme.

Pick any static server. From the `frontend/` folder:

```bash
# Python (built-in, no install needed)
python3 -m http.server 5500

# or Node, if you have it
npx serve -l 5500
```

Then open `http://localhost:5500/html/landing.html`.

If your backend runs anywhere other than `http://localhost:8080/api`, set this
in the browser console (or add a small inline script before `api.js` loads on
each page) before testing:

```js
window.MEDICARE_API_BASE_URL = 'http://your-backend-host:8080/api';
```

## 6. First run checklist

1. Open `landing.html`, click **Register**, create a PATIENT account.
2. Log in — you should land on `dashboard.html` with your name in the welcome banner.
3. Open the **AI Chatbot** page and send a message. If no AI key is configured
   you'll get a placeholder reply — that's expected, not a bug.
4. Register a second account as DOCTOR, then log in as your PATIENT account
   and book an appointment with that doctor from the Doctors page.
5. To test the ADMIN role, you'll need to manually update a user's role in
   the database (`UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE email = '...';`),
   since admin accounts aren't self-registrable by design.

## 7. Common issues

**CORS errors in the browser console** — make sure the origin you're serving
the frontend from (e.g. `http://localhost:5500`) is listed in
`CORS_ALLOWED_ORIGINS`.

**File uploads fail with a 500** — the backend needs write access to
`UPLOAD_DIR`; it creates the folder automatically but the parent directory
must be writable.

**Chatbot replies are generic / not calling a real model** — check that
`app.ai.provider` matches the key you set (`openai` + `OPENAI_API_KEY`, or
`gemini` + `GEMINI_API_KEY`), and that the key itself is valid.



<!-- First run Backend -->
cd backend
mvn clean install
mvn spring-boot:run 

<!-- Then come  frontend-->
cd frontend
npx serve -l(L) 5500
ok to proceed click yes
