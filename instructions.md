# Healthcare Web App — Doctolib-Inspired (Detailed Build Prompt)

This document is a comprehensive, step-by-step prompt/spec for building a modern healthcare web application inspired by Doctolib (France) for another country. It defines product goals, user journeys, UI/UX guidance, architecture (React frontend, FastAPI backend), authentication for doctors and patients, PostgreSQL database schema, Redis caching, APIs, security, testing, CI/CD, and acceptance criteria.

## 1) Product vision and goals

- Vision: Make it easy, safe, and fast for patients to find practitioners, view availability, and book or manage appointments online. Enable doctors to manage schedules, appointments, and patient communications.
- Primary goals (MVP):
	- Public homepage with search for doctors by specialty, city/region, language, and next availability.
	- Patient area: sign up/login, profile, browse/search doctors, book/reschedule/cancel appointments, receive reminders.
	- Doctor area: sign up/login, profile with specialties and practice info, manage availability and appointments, view patient list for upcoming slots.
	- Dedicated auth for patients and doctors with proper authorization boundaries.
	- Admin verification flow for doctors (basic manual verification, v1.1).
- Constraints: High privacy, secure storage and transport of personal data, responsive experience on mobile and desktop.
- Audience and locales: Built for a third country; support at least 2 languages (e.g., French + local language) and local date/time formatting .

## 2) Scope (MVP vs. later)

- MVP (v1.0):
	- Homepage with search and featured specialties.
	- Patient auth + profile; Doctor auth + profile; role-based access.
	- Doctor discovery: filter by specialty, city/region, language, next availability.
	- Appointment booking: choose slot from doctor availability; create, reschedule, cancel; reminders via email; basic ICS file for calendar add.
	- Doctor availability management: recurring schedule + exceptions (vacation/holidays).
	- Basic notifications (email only in MVP; SMS optional later).
	- Basic admin: approve doctor accounts (toggle verified), manage specialties list.
- v1.1+: SMS notifications, doctor document verification workflow, patient medical files upload, insurance info, ratings/reviews (with moderation), teleconsultation, payments.

## 3) Users, roles, and key journeys

- Roles: Patient, Doctor, Admin.
- Patient journeys:
	- Search for a doctor by specialty and location; open profile; pick a slot; confirm booking; receive email confirmation and reminder.
	- Manage appointments: view list, reschedule/cancel respecting policy (e.g., 24h cutoff).
	- Manage profile: contact info, preferred language, consents.
- Doctor journeys:
	- Register and submit profile (specialty, clinic address, languages, bio, fees), wait for admin verification.
	- Set weekly recurring availability and exceptions; manage appointments (confirm, add notes/labels); block off time.
	- View upcoming appointments and patient info relevant for the visit.
- Admin journeys:
	- Review/verify doctor accounts; manage specialties list; view basic system metrics.

## 4) UX/UI guidelines (modern with warm colors)

- Brand tone: warm, trustworthy, health-focused. Use a warm primary color with calming neutrals.
- Suggested palette:
	- Primary: #FF7A59 (warm coral) or #F59E0B (amber)
	- Secondary: #10B981 (emerald) for success/availability
	- Neutrals: #111827 (text), #374151, #6B7280, #E5E7EB, #F9FAFB (backgrounds)
	- Accents: #3B82F6 (links), #F87171 (errors)
- Typography: Inter or Source Sans 3 for readability; strong contrast, at least 16px base.
- Layout:
	- Homepage: hero search bar, specialty grid, how it works, trust signals.
	- Patient area: dashboard (upcoming appointments), profile, appointments list.
	- Doctor area: dashboard (today/this week), availability calendar, appointments board, profile editor.
- Components: search inputs with autosuggest, doctor cards with photo/specialty/location/next-slot, calendar/slot picker, forms with clear validation.
- Accessibility: WCAG 2.1 AA; keyboard navigation; focus outlines; ARIA labels.
- Responsiveness: mobile-first; test breakpoints at 360px, 768px, 1024px, 1280px.

## 5) System architecture

- Frontend: React 18 (Vite), TypeScript, React Router, TanStack Query for server state, TailwindCSS or CSS-in-JS. i18n via react-i18next.
- Backend: FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0, Alembic migrations, Uvicorn ASGI.
- Auth: OAuth2 Password with JWT access + refresh tokens; role-based authorization (patient/doctor/admin). Store refresh tokens as httpOnly secure cookies; access token in Authorization header (Bearer). CSRF protection for state-changing requests when using cookies.
- Database: PostgreSQL (>=14).
- Cache/infra: Redis (>=6) for caching, rate limiting, and session/refresh token blacklist.
- Storage: Local or S3-compatible for assets (doctor photos). Medical documents are out-of-scope for MVP; plan for encrypted storage later.
- Emails: SMTP relay in dev; pluggable provider (e.g., SendGrid/Mailgun) in prod.
- Observability: structured logging (JSON), request/response logging with redactions, health checks, Prometheus metrics via middleware.

## 6) Authentication and authorization (dedicated for each role)

- Registration endpoints for patient and doctor; doctor requires verification to become visible in search and to accept bookings.
- Password policy: min 12 chars, rate-limited attempts; hashing with Argon2id or bcrypt.
- JWT:
	- Access token TTL: 15 minutes; Refresh token TTL: 7–30 days (configurable per role).
	- Refresh token stored in httpOnly, Secure, SameSite=strict cookie; rotated on each refresh; old tokens invalidated in Redis blacklist.
- RBAC middleware: route-level role checks (e.g., only doctors can modify availability; only patients can create their appointments).
- Email verification required before booking or publishing a profile.

## 7) API design (FastAPI)

Base URL: /api/v1

- Auth
	- POST /auth/patient/register
	- POST /auth/doctor/register
	- POST /auth/login {email, password} -> {accessToken} + set-cookie refreshToken
	- POST /auth/refresh -> {accessToken}
	- POST /auth/logout -> clears refresh cookie; add to Redis blacklist
	- GET  /auth/me -> current user profile + roles

- Patients
	- GET  /patients/me
	- PUT  /patients/me
	- GET  /patients/me/appointments?status=&from=&to=&page=&limit=
	- POST /patients/me/appointments {doctorId, slotId}
	- PATCH/POST /patients/me/appointments/{id}/reschedule {slotId}
	- POST /patients/me/appointments/{id}/cancel {reason}

- Doctors
	- GET  /doctors/me
	- PUT  /doctors/me
	- GET  /doctors/me/availability
	- POST /doctors/me/availability (create recurring rules & exceptions)
	- DELETE /doctors/me/availability/{id}
	- GET  /doctors/me/appointments?status=&from=&to=
	- PATCH /doctors/me/appointments/{id} {status: confirmed|cancelled|completed}

- Search & directory
	- GET /specialties
	- GET /doctors?specialty=&city=&language=&date=&page=&limit=
	- GET /doctors/{id} -> profile + next 2 weeks of available slots

- Appointments (shared/admin)
	- GET /appointments/{id}

- Admin (v1.1)
	- GET  /admin/doctors?status=pending|verified
	- POST /admin/doctors/{id}/verify
	- GET  /metrics (admin only) -> operational counters and latency snapshots

Error model: { code, message, details? }. Use standard HTTP status codes.

## 8) Data model (PostgreSQL)

- users (id PK, email unique, password_hash, role enum [patient, doctor, admin], email_verified_at, created_at, updated_at)
- patients (user_id PK/FK->users.id, first_name, last_name, phone, preferred_language, date_of_birth, consents jsonb, created_at)
- doctors (user_id PK/FK->users.id, first_name, last_name, phone, bio, photo_url, verified boolean, clinic_id FK, created_at)
- clinics (id PK, name, address_line1, address_line2, city, region, postal_code, country, geolocation, phone)
- specialties (id PK, name, slug)
- doctor_specialties (doctor_id FK, specialty_id FK, PRIMARY KEY(doctor_id, specialty_id))
- languages (id PK, name, code)
- doctor_languages (doctor_id FK, language_id FK, PRIMARY KEY(doctor_id, language_id))
- availability_rules (id PK, doctor_id FK, weekday int (0-6), start_time time, end_time time, slot_minutes int)
- availability_exceptions (id PK, doctor_id FK, date date, reason, is_closed boolean)
- slots (id PK, doctor_id FK, start_timestamp timestamptz, end_timestamp timestamptz, status enum [free, reserved, blocked], unique(doctor_id, start_timestamp))
- appointments (id PK, patient_id FK, doctor_id FK, slot_id FK, status enum [booked, confirmed, cancelled, completed], reason text, created_at, updated_at)
- notifications (id PK, user_id FK, type, payload jsonb, status enum[pending,sent,failed], scheduled_for timestamptz)
- refresh_tokens (id PK, user_id FK, token_hash, revoked boolean, issued_at, expires_at)
- audit_logs (id PK, user_id FK null, action, resource, ip, user_agent, created_at, metadata jsonb)

Indexes: email unique on users; GIN on metadata/payload where needed; composite indexes on search fields (specialty, city, language), slots(doctor_id, start_timestamp), appointments(doctor_id,start_timestamp), appointments(patient_id,start_timestamp).

## 9) Availability and slot generation

- Generate slots based on availability_rules for a rolling window (e.g., next 60 days) via background job.
- Prevent double booking with DB constraints: unique(doctor_id, start_timestamp) on slots; transactionally move slot from free->reserved->booked.
- Reschedule by freeing old slot and booking new one atomically.

## 10) Caching and performance (Redis)

- Cache keys and TTLs:
	- doctor:profile:{id} TTL 15m
	- doctor:nextSlots:{id} TTL 5m
	- search:doctors:{hash(filters)} TTL 5m
	- specialties:list TTL 24h
- Invalidation triggers: profile update, availability change, appointment create/cancel.
- Rate limiting: 100 req/15min per IP for public endpoints; tighter for auth (e.g., login 10/min per IP + per email).

## 11) Security, privacy, compliance

- Transport security: HTTPS everywhere; HSTS; secure cookies.
- Secrets management via environment variables; never hardcode.
- Data protection: PBKDF (Argon2id/bcrypt) for passwords; encrypt sensitive at-rest fields if needed later.
- Least privilege: separate DB user for app; read-only replicas for heavy reads later.
- Audit: log auth events, role changes, appointment lifecycle changes; protect logs.
- PII/PHI: minimize stored data; explicit consent flags; right to export/delete (v1.1 if required by local law).
- Input validation and output encoding; prevent injection; CORS restricted to frontend origin.

## 12) Frontend architecture (React)

- Stack: React 18 + Vite + TypeScript; React Router; TanStack Query; TailwindCSS.
- State: server data via Query; form state via React Hook Form + Zod for schema validation.
- Pages (routes):
	- / (Home)
	- /search (with query params)
	- /doctor/:id (doctor profile + slot picker)
	- /login, /register (patient)
	- /doctor/login, /doctor/register
	- /patient (dashboard), /patient/appointments, /patient/profile
	- /doctor (dashboard), /doctor/availability, /doctor/appointments, /doctor/profile
- Components: HeaderNav, Footer, SearchBar, DoctorCard, SlotPicker, AppointmentList, AvailabilityEditor, ProfileForm, Toasts.
- i18n: react-i18next with language switch; number/date formatting by locale.

## 13) Backend architecture (FastAPI)

- Structure:
	- app/main.py (FastAPI app, routes include, middleware)
	- app/config.py (settings via pydantic-settings)
	- app/db (session, models, migrations)
	- app/auth (schemas, hashing, JWT utils, dependencies)
	- app/routers (auth, patients, doctors, search, appointments, admin)
	- app/services (availability, booking, notifications)
	- app/schemas (Pydantic models)
	- app/tests (pytest)
- Migrations: Alembic with autogenerate and review process.
- Background tasks: FastAPI BackgroundTasks for lightweight jobs; consider RQ/Celery for scale later.

## 14) Notifications

- MVP: email confirmations and reminders.
- Events:
	- Appointment booked -> send both parties emails with ICS attachment.
	- Reminder 24h before appointment -> email to patient.
- Store in notifications table with status; retry policy (exponential backoff, max 3 attempts).

## 15) Validation rules and policies

- Appointment booking rules:
	- Cannot book past slots; cannot double book; cutoff for reschedule/cancel configurable (e.g., 24h).
	- Doctor must be verified and active to be bookable.
- Availability rules: slot size 10–60 minutes; ensure no overlaps; exceptions override recurring rules.
- Data validation via Zod (frontend) and Pydantic (backend) with consistent schemas.

## 16) Testing strategy

- Backend (pytest): unit tests for services (auth, availability, booking), API tests for endpoints with test DB; property tests for slot generation edge cases.
- Frontend (Vitest + React Testing Library): critical flows (search, view doctor, book slot), form validation, i18n toggles.
- E2E (Playwright or Cypress): happy paths for booking, reschedule, cancel.

## 17) DevOps, CI/CD, and environments

- Environments: dev, staging, prod.
- Docker: separate Dockerfiles for frontend and backend; docker-compose for local dev with Postgres and Redis.
- CI (GitHub Actions):
	- Backend job: lint (ruff/flake8), type-check (mypy), tests (pytest), build image.
	- Frontend job: lint (eslint), type-check (tsc), tests (vitest), build artifact.
	- On main: push images to registry; deploy to staging; manual approval to prod.

## 18) Acceptance criteria (MVP)

1. Homepage loads < 2s on 3G; search by specialty+city returns results with pagination.
2. Patient can register, verify email, login, view dashboard, and update profile.
3. Doctor can register, submit profile, and becomes searchable only after admin verification.
4. Patient can book a visible slot; both patient and doctor receive confirmation email with ICS; slot is no longer free.
5. Patient can reschedule/cancel within policy; slot states update transactionally; emails are sent.
6. Doctor can manage availability and exceptions; generated slots reflect changes within 1 minute.
7. Auth boundaries enforced: patients cannot access doctor-only endpoints and vice versa.
8. API documented via OpenAPI at /docs; responses validated; error model consistent.
9. Redis cache improves repeated search response time by >50% in dev measurements.
10. Basic admin can verify a doctor; verified doctors appear in search.

## 19) Non-functional requirements

- Availability: target 99.5%+ for MVP.
- Performance: p95 search request < 500ms (cached), < 1.5s (uncached); booking < 1s server time.
- Scalability: horizontal scaling for backend; sticky sessions not required due to stateless JWT access tokens.
- Accessibility: WCAG 2.1 AA.
- Privacy: explicit consent capture and clear privacy policy.

## 20) Assumptions & out-of-scope (MVP)

- No payments, insurance claims, or telemedicine video in MVP.
- SMS notifications are optional and may be added in v1.1 depending on local regulations/providers.
- Medical records storage and e-prescriptions are out-of-scope in MVP.

## 21) Implementation checklist (condensed)

- Backend
	- Project scaffolding, settings, DB connection, Alembic
	- Models and migrations (users, doctors, patients, clinics, specialties, availability, slots, appointments)
	- Auth (register, login, refresh, logout) with roles + email verification
	- Availability + slot generation service
	- Appointments service with transactional booking/reschedule/cancel
	- Search endpoints + caching
	- Notifications (email) + ICS
	- Rate limiting and audit logs

- Frontend
	- Vite + TS + Tailwind + Router + i18n setup
	- Global layout (header/footer), theme, and components
	- Pages: Home, Search, Doctor Profile, Auth, Patient area, Doctor area
	- API client with auth flows and token refresh
	- Forms with validation; toasts and error handling

- DevOps
	- Dockerfiles and docker-compose for dev
	- GitHub Actions for lint/test/build; deploy stubs

## 22) Sample payloads (abbreviated)

- POST /auth/patient/register
	- Request: { email, password, firstName, lastName, phone, preferredLanguage }
	- Response: 201 Created { id, email, role:"patient" }

- POST /auth/login
	- Request: { email, password }
	- Response: 200 OK { accessToken, user: { id, role } } + Set-Cookie: refreshToken=…; HttpOnly; Secure; SameSite=Strict

- POST /patients/me/appointments
	- Request: { doctorId, slotId, reason? }
	- Response: 201 Created { id, status:"booked", slot:{ start,end }, doctor:{…} }

## 23) Risks and mitigations

- Double booking under load -> strong DB constraints + transactional updates.
- Email deliverability -> verified sender domain + retries + fallbacks.
- Regulatory variance (third country) -> abstract consent and data-retention policies; document data flows.
- Performance hotspots in search -> precompute availability, use Redis caching and DB indexes.

---

Use this document as the master prompt for implementation. If a decision is missing, choose the simplest option consistent with the above and document it inline for later review.

## 24) Next implementation steps

- [x] Doctor availability management API: allow doctors to create recurring availability rules and exception windows, then materialize slots on a rolling horizon.
- [x] Patient appointment lifecycle: enable patients to book, reschedule, and cancel appointments with transactional slot updates and audit logging.
- [x] Notification pipeline: persist notification jobs and send email confirmations/reminders with ICS attachments tied to appointment events.
- [x] Admin verification workflow: provide admin endpoints to review doctor submissions and toggle verification status before exposure in search results.
- [x] Observability enhancements: expand structured logging beyond audits, expose metrics/health probes, and outline minimal dashboards for operations.
- [x] Modern homepage redesign: Tailwind-based layout with Framer Motion animations, responsive search hero, trust signals, and bilingual content.
- [x] Interfaces d’authentification patient/médecin : pages login & inscription modernes avec Tailwind, animations Framer Motion, validations Zod et onboarding multi-étapes.
- [x] Observabilité frontend : centre de diagnostics (logs + métriques clients) accessible via le tableau de bord admin.

