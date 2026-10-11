# Backend – MediCare AI

Spring Boot 3.2 / Java 17 backend. Layered MVC: `controller` → `service` →
`serviceimpl` → `repository` → `entity`, with `dto` for API contracts,
`security` for JWT, and `exception` for centralized error handling.

## Prerequisites

- JDK 17
- Maven 3.9+ (or use the wrapper once added)
- PostgreSQL running locally with the schema from `../database/schema.sql` applied

## Running locally

1. Create the database and apply the schema:
   ```bash
   createdb medicare_ai
   psql -U postgres -d medicare_ai -f ../database/schema.sql
   ```

2. Set the required environment variables (the JWT secret in particular must
   not be left as the placeholder value outside of local dev):

   **macOS / Linux (bash):**
   ```bash
   export DB_USERNAME=postgres
   export DB_PASSWORD=your_password
   export JWT_SECRET=a-long-random-string-at-least-32-characters
   ```

   **Windows (PowerShell):** use `$env:` and set each variable in the same
   session you run Maven from — variables set in one PowerShell window don't
   carry over to a new one:
   ```powershell
   $env:DB_USERNAME = "postgres"
   $env:DB_PASSWORD = "your_password"
   $env:JWT_SECRET   = "a-long-random-string-at-least-32-characters"
   ```

3. Build and run:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

   On Windows, if `mvn` isn't recognized, confirm `JAVA_HOME` and Maven's
   `bin` folder are both on `PATH` for the current PowerShell session
   (`$env:Path`), and that they point at JDK 17, not an older JDK that might
   also be installed.

4. The API is available at `http://localhost:8080`.

## Try it with Postman

```
POST /api/auth/register
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+10000000000",
  "role": "PATIENT"
}

POST /api/auth/login
{ "email": "jane@example.com", "password": "SecurePass123" }
```

Copy the `token` from the login response and set it as a Bearer token on:
```
GET /api/users/me
```
to confirm the JWT filter is authenticating requests correctly.

## What's implemented so far

- Entities for all 9 tables, mapped 1:1 against `database/schema.sql`.
- Repositories for every entity.
- JWT auth: register, login, `GET /api/users/me` as a protected smoke-test
  endpoint, role-based access rules in `SecurityConfig`.
- Global exception handling with consistent JSON error responses.

## Coming next

Full CRUD controllers for patients, doctors, appointments, medical records,
reports, and notifications, plus the AI chatbot endpoint — these reuse the
same entities/repositories already in place here.
