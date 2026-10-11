# Deployment Guide — MediCare AI

This covers taking the three pieces (Postgres, Spring Boot API, static
frontend) from local dev to a live deployment. The specific platforms named
below (Render, Railway, Vercel, Netlify) are examples — the same shape of
setup works on most PaaS providers.

## Overview

```
[ Browser ]  →  [ Static frontend host ]  →  [ Spring Boot API ]  →  [ PostgreSQL ]
                  (Vercel/Netlify/S3)         (Render/Railway/Fly.io)   (managed Postgres)
```

The frontend never talks to the database directly — it only calls the
backend's REST API, so the frontend host and backend host can live on
completely different platforms as long as CORS is configured correctly.

## 1. Database

Use any managed Postgres (Render Postgres, Railway Postgres, Supabase, AWS
RDS, etc). After provisioning:

```bash
psql "<connection-string-from-your-provider>" -f database/schema.sql
```

Keep the connection string somewhere safe — you'll need it as
`SPRING_DATASOURCE_URL` (plus username/password) in the next step.

## 2. Backend (Spring Boot)

### Build

```bash
cd backend
mvn clean package -DskipTests
```

This produces `target/healthcare-chatbot-backend-<version>.jar`.

### Deploy (example: Render or Railway)

1. Create a new Web Service from your Git repo, root directory `backend/`.
2. Build command: `mvn clean package -DskipTests`
3. Start command: `java -jar target/*.jar`
4. Set environment variables (all read by `application.yml`):

   | Variable | Notes |
   |---|---|
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<host>:<port>/<db>` |
   | `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | from your DB provider |
   | `JWT_SECRET` | a long random string — generate with `openssl rand -base64 48` |
   | `JWT_EXPIRATION_MS` | e.g. `86400000` for 24h |
   | `CORS_ALLOWED_ORIGINS` | your deployed frontend's URL, e.g. `https://medicareai.vercel.app` |
   | `UPLOAD_DIR` | a writable path; see the persistent-storage note below |
   | `app.ai.provider` | `openai` or `gemini` |
   | `OPENAI_API_KEY` or `GEMINI_API_KEY` | your provider's key |
   | `PORT` | most PaaS providers inject this automatically; Spring Boot honors `SERVER_PORT` if you need to map it |

5. Deploy. Confirm with `curl https://<your-backend-url>/api/auth/login -X POST ...`
   the same way as in the local setup guide.

### A note on file storage in production

`ReportServiceImpl` stores uploaded files on local disk under `UPLOAD_DIR`.
That's fine for a single long-running container, but most PaaS free/hobby
tiers use ephemeral filesystems — uploaded files disappear on redeploy or
restart. For anything beyond a demo, swap the storage layer for an object
store (S3, Cloudflare R2, or your provider's blob storage) behind the same
`ReportService` interface, so only `ReportServiceImpl` needs to change.

## 3. Frontend (static hosting)

The frontend is plain HTML/CSS/JS with no build step, which makes it a good
fit for any static host.

### Deploy (example: Vercel or Netlify)

1. Point the project at the `frontend/` directory.
2. No build command needed (static files only) — just set the output/publish
   directory to `frontend/`.
3. Before deploying, set the backend URL the frontend should call. The
   cleanest way is a tiny config file loaded before `api.js` on every page:

   ```html
   <!-- frontend/js/env.js -->
   <script>
     window.MEDICARE_API_BASE_URL = 'https://your-backend-url.onrender.com/api';
   </script>
   ```

   Add `<script src="../js/env.js"></script>` right before
   `<script src="../js/api.js"></script>` on every page, and gitignore
   `env.js` if you want different values per environment without committing
   secrets (note: this is a public base URL, not a secret, but keeping it out
   of version control still makes per-environment config easier).

4. Set `landing.html` (or an `index.html` that redirects to it) as the entry
   point, since most static hosts expect `index.html` at the root.

### CORS

Once both are deployed, update the backend's `CORS_ALLOWED_ORIGINS` to the
real frontend URL (not `localhost`) and redeploy the backend — CORS
mismatches between the deployed frontend and backend are the most common
post-deploy issue.

## 4. Smoke test in production

1. Visit the deployed frontend, register a PATIENT account.
2. Log in, confirm the dashboard loads real data (not just skeletons forever
   — that usually means the API base URL or CORS is misconfigured).
3. Send a chatbot message and confirm you get either a real AI reply or the
   "not configured yet" placeholder (not a network error).
4. Upload a report and re-download it to confirm file storage round-trips.

## 5. Going further (optional hardening)

- Put the backend behind HTTPS (most PaaS providers do this automatically;
  if self-hosting, use a reverse proxy like Caddy or Nginx with Let's Encrypt).
- Rotate `JWT_SECRET` and shorten `JWT_EXPIRATION_MS` for production use.
- Add a managed object store for report uploads (see note above).
- Set up basic uptime monitoring/alerting on the backend's health endpoint.
- Run `mvn clean install` with tests enabled in CI before each deploy, once
  you've added a test suite.
