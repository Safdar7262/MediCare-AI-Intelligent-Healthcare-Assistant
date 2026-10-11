# MediCare AI – Intelligent Healthcare Assistant

A full-stack AI healthcare chatbot platform: Spring Boot + PostgreSQL backend,
Tailwind CSS frontend, JWT auth with role-based access (Patient / Doctor / Admin),
and an AI symptom-checker chatbot (OpenAI/Gemini).

## Folder structure

```
healthcare-chatbot/
│
├── frontend/
│   ├── html/          # 11 pages: landing, login, register, dashboard, chatbot,
│   │                  # patients, doctors, appointments, reports, profile, admin
│   │                  # (+ a bonus notifications page linked from the topbar bell)
│   ├── partials/      # sidebar.html, topbar.html, public-navbar.html — injected at runtime
│   ├── css/           # styles.css — animations, scrollbar, glassmorphism utility
│   ├── js/            # api.js + components.js (shared), one file per page otherwise
│   └── assets/
│       ├── images/
│       └── icons/
│
├── backend/
│   └── src/main/
│       ├── java/com/medicareai/
│       │   ├── controller/    # 10 REST controllers — Auth, User, Patient, Doctor,
│       │   │                  # Appointment, Notification, Report, MedicalRecord, Admin, Chatbot
│       │   ├── service/       # interfaces
│       │   ├── serviceimpl/   # implementations, incl. OpenAiChatClient / GeminiChatClient
│       │   ├── repository/    # Spring Data JPA repositories
│       │   ├── entity/        # JPA entities (mirrors database/schema.sql)
│       │   ├── dto/           # request/response DTOs
│       │   ├── security/      # JWT filter, provider, UserDetailsService
│       │   ├── config/        # SecurityConfig, CORS, RestTemplate
│       │   └── exception/     # GlobalExceptionHandler, custom exceptions
│       └── resources/         # application.yml
│
├── database/
│   ├── schema.sql           # full PostgreSQL schema (tables, enums, indexes, seed data)
│   └── sample_queries.sql   # reference queries the service layer uses
│
└── docs/
    ├── setup-instructions.md     # local dev setup, end to end
    └── deployment-guide.md       # production deployment (DB, backend, frontend)
```

## Database

Run the schema against an empty PostgreSQL database:

```bash
createdb medicare_ai
psql -U postgres -d medicare_ai -f database/schema.sql
```

Tables: `roles`, `users`, `patients`, `doctors`, `appointments`, `medical_records`,
`chat_history`, `notifications`, `reports`.

Design notes:
- `users` is the shared identity table for all three roles; `patients` and `doctors`
  are 1:1 extension tables holding role-specific fields. This keeps auth logic
  (login, JWT, password reset) in one place while letting Patient/Doctor entities
  in Spring Boot stay clean.
- PostgreSQL `ENUM` types are used for `appointment_status`, `chat_sender`,
  `notification_type`, `report_file_type`, and `gender_type` instead of free-text
  columns, so invalid states are rejected at the database level.
- Seed data includes one admin, one doctor, and one patient with placeholder
  password hashes — replace these via real registration once auth is wired up.

## Tech stack

| Layer    | Technology                                   |
|----------|-----------------------------------------------|
| Frontend | HTML5, Tailwind CSS, vanilla JavaScript       |
| Backend  | Spring Boot 3.x (Java 17), layered MVC + DTOs |
| Database | PostgreSQL                                    |
| Auth     | JWT, role-based access (PATIENT/DOCTOR/ADMIN) |
| AI       | OpenAI API or Gemini API (chatbot + symptom checker) |

## Getting started

See `docs/setup-instructions.md` for the full local setup (database → backend
→ frontend) and `docs/deployment-guide.md` for taking it to production.
`frontend/README.md` has frontend-specific notes (it must be served over
HTTP, not opened as a `file://` URL, since the shared sidebar/topbar are
loaded at runtime via `fetch()`). `backend/README.md` covers backend-specific
run instructions, including a Windows/PowerShell note for setting env vars.

## Current status

All four phases are complete:
1. ✅ Project skeleton + database schema
2. ✅ Backend — entities, repositories, DTOs, JWT auth
3. ✅ Backend — CRUD for patients/doctors/appointments/reports/medical records,
   admin stats, and the AI chatbot (OpenAI or Gemini, with emergency-keyword
   detection and session history)
4. ✅ Frontend — all 11 pages, wired to the live API

This was built end to end in a sandbox without network access for `mvn
compile`/`npm install`, so the Java was checked with brace/paren-balance
sweeps rather than a real compile. Run `mvn clean install` locally before
relying on it — see the troubleshooting section in `docs/setup-instructions.md`
if you hit anything.
