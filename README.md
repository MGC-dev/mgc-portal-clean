# MGC Client Portal

A business‑management web application for **MG Consulting** clients and administrators.

- **Clients** register, verify by email, subscribe to service tiers, book appointments, sign contracts, upload/download documents, and raise support requests.
- **Administrators** manage users and roles, upload resources and contracts, review client documents, run the contract‑signing workflow, and manage a shared WorkDrive.

Built on **Next.js 15 (App Router)** and **React 19**, with **Supabase** for authentication, database, and storage, and deep integrations across the **Zoho** suite (Sign, WorkDrive, Bigin/CRM), **Calendly** scheduling, **Retell** voice AI, and **Resend** transactional email.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Integrations](#integrations)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Authentication & RBAC](#authentication--rbac)
- [Application Routes](#application-routes)
- [API Reference](#api-reference)
- [Core Workflows](#core-workflows)
- [Environment Variables](#environment-variables)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer          | Technology                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router), React 19, TypeScript 5                            |
| Styling        | Tailwind CSS v4, `tw-animate-css`, Geist fonts                             |
| UI             | Radix UI primitives, lucide‑react / react‑feather icons, selected MUI      |
| Motion / 3D    | Framer Motion, React Three Fiber + drei, Swiper                            |
| Data & charts  | Recharts, date‑fns, react‑big‑calendar, react‑day‑picker                  |
| Forms          | react‑hook‑form                                                            |
| Auth & data    | Supabase (`@supabase/ssr`, `@supabase/supabase-js`), NextAuth (peer)      |
| Email          | Resend                                                                     |
| HTTP           | axios, node‑fetch, form‑data                                               |

> **Node.js 20+** is recommended (types pinned to `@types/node@20`).

## Integrations

| Service            | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| **Supabase**       | Auth, Postgres database, Storage buckets, Row Level Security            |
| **Zoho Sign**      | Embedded contract e‑signature workflow                                  |
| **Zoho WorkDrive** | Per‑client document folders, auto‑created on signup                     |
| **Zoho Bigin/CRM** | Client records; leads created from voice calls                          |
| **Calendly**       | Appointment scheduling and webhook sync                                 |
| **Retell**         | Voice‑AI webhook that creates/updates Zoho CRM leads from call metadata |
| **Resend**         | Transactional email (verification codes, welcome, support)             |

---

## Getting Started

**Prerequisites:** Node.js 20+, npm, and a Supabase project.

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment** — create `.env.local` with the required variables (see [Environment Variables](#environment-variables)).
3. **Apply the database schema** — open the Supabase SQL editor and run the contents of [`supabase-schema.sql`](./supabase-schema.sql). This creates the tables, RLS policies, and storage buckets.
4. **Create an admin user** (optional, for admin‑panel access):
   ```bash
   node scripts/create-admin.mjs <email> <password> "Full Name"
   ```
5. **Run the dev server**
   ```bash
   npm run dev
   ```
6. Open **http://localhost:3000**. (If port 3000 is busy, Next.js will pick the next free port.)

## Scripts

| Command                       | Description                                              |
| ----------------------------- | ------------------------------------------------------- |
| `npm run dev`                 | Start the local development server                      |
| `npm run build`               | Production build                                        |
| `npm run start`               | Serve the production build                              |
| `npm run lint`                | Run ESLint (Next.js config)                             |
| `npm run doc:pdf`             | Render a Markdown file to PDF via Puppeteer             |
| `node scripts/create-admin.mjs …` | Create a pre‑confirmed admin user in Supabase       |

`scripts/zoho-embedded-express.js` is a standalone Express sample for generating a Zoho Sign embedded signing URL — useful for testing Zoho credentials outside the app.

---

## Architecture

- **App Router** — pages and route handlers live under `src/app/**`, split into client and server components.
- **Global provider** — `AuthProvider` wraps the app and exposes `user`, `profile`, and `signOut` (`src/app/layout.tsx`, `src/hooks/use-auth.tsx`).
- **Middleware** (`src/middleware.ts`) — runs on **all** routes (pages and `/api`). It refreshes the Supabase session cookie before any handler runs, then applies page‑level routing/redirect logic. API routes are passed through without redirects.
- **Supabase clients** (`src/lib`):
  - Browser client — `supabase.ts`
  - Server client — `createServerSupabaseClient` (`supabase-server.ts`)
  - Admin client (service role, server‑only) — `createAdminSupabaseClient` (`supabase-server.ts`)
  - Cookie adapter — `supabase-cookies.ts`
- **Domain helpers** (`src/lib`): `zoho.ts` (Sign), `zoho-workdrive.ts` (WorkDrive), `appointments.ts` / `scheduling.ts` (Calendly), `resources.ts`, `otp-store.ts` (email verification codes), `auth-fetch.ts` (authenticated client fetch).

## Authentication & RBAC

The app uses **Supabase Auth** with a role‑based access model:

- Users live in `auth.users` and are mirrored in `public.profiles`.
- A primary `role` column on `profiles` — `client`, `provider`, `admin`, `support`, `super_admin` — drives access, with optional additional roles via `public.role_assignments`.
- **Row Level Security** ensures clients only reach their own rows, while admins manage globally.
- Sessions are cookie‑based and auto‑refreshed in the browser and in middleware.

**Middleware redirect rules** (`src/middleware.ts`):

| Situation                                             | Result                          |
| ----------------------------------------------------- | ------------------------------- |
| Unauthenticated user hits `/mgdashboard` or `/admin`  | → `/login`                      |
| Suspended user (any page)                             | → `/suspended`                  |
| Admin / super_admin lands on `/login` or `/mgdashboard` | → `/admin`                    |
| Non‑admin hits `/admin`                               | → `/mgdashboard`                |

To promote a user to admin, set `profiles.role = 'admin'` (or add an `admin` row to `role_assignments`), or run `scripts/create-admin.mjs`.

---

## Application Routes

### Public / auth
| Route                        | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `/`                          | Landing page                             |
| `/login`                     | Sign in                                  |
| `/register`                  | Client registration                      |
| `/register/verify`           | Email OTP verification                   |
| `/register/forgotpassword`   | Password reset request                   |
| `/suspended`                 | Shown to suspended accounts              |
| `/book`, `/book/[handle]/[event]` | Public Calendly‑backed booking      |

### Client dashboard (`/mgdashboard`)
| Route                        | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `/mgdashboard`               | Overview & quick actions                 |
| `/mgdashboard/appointments`  | Appointments (Calendly)                  |
| `/mgdashboard/contracts`     | Contracts & e‑signing (Zoho Sign)        |
| `/mgdashboard/documents`     | Upload & manage client documents         |
| `/mgdashboard/resources`     | Shared resources                         |
| `/mgdashboard/sessions`      | Session recaps                           |
| `/mgdashboard/billing`       | Billing & invoices                       |
| `/mgdashboard/subscribe`     | Subscribe to a service tier              |
| `/mgdashboard/addon`         | Add‑on service components                |
| `/mgdashboard/company`       | Company profile                          |
| `/mgdashboard/questions`     | Support requests                         |

### Admin panel (`/admin`)
| Route                        | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `/admin`                     | Admin home                               |
| `/admin/users`               | User & role management                   |
| `/admin/clients`             | Client records (Bigin/CRM)               |
| `/admin/contracts`           | Contract management & signing            |
| `/admin/resources`           | Resource uploads                         |
| `/admin/client-uploads`      | Review client‑submitted documents        |
| `/admin/support`             | Support queue                            |

---

## API Reference

All endpoints live under `src/app/api/**`. Highlights:

**Auth** — `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/generate-signup-link`, `/api/auth/callback`, `/api/auth/callback/zoho`

**Client documents** — `GET /api/client/documents` · `POST /api/client/documents/upload` · `DELETE /api/client/documents/[id]` · `GET /api/client-documents/[id]/url` (signed URL)

**Contracts** — `/api/contracts/list` · `/api/contracts/[id]/start-sign` · `/api/contracts/[id]/sign` · `/api/contracts/[id]/sign-url` · `/api/contracts/[id]/signed-url` · `/api/contracts/[id]/status` · `/api/contracts/[id]/download`

**Admin** — `/api/admin/users` · `/api/admin/clients` · `/api/admin/contracts` (+ `/upload`, `/[id]/link-zoho`) · `/api/admin/client-documents` · `/api/admin/resources/upload` · `/api/admin/support/list` · `/api/admin/suspend-user` · `/api/admin/unsuspend-user` · `/api/admin/delete-user` · `/api/admin/workdrive/*`

**Resources & support** — `/api/resources` · `/api/profile` · `/api/support`, `/api/support/recent`

**Scheduling** — `/api/calendly/events` · `/api/calendly/webhook`, `/api/calendly/webhook/register`

**WorkDrive** — `/api/workdrive/files`, `/api/workdrive/download`

**Zoho & billing** — `/api/zoho/init`, `/api/zoho/subscribe`, `/api/zoho/capture` · `/api/zoho-callback` · `/api/oauth/callback`

**Webhooks** — `/api/zoho-sign/webhook`, `/api/zoho-webhook`, `/api/retell-webhook`

**Diagnostics** (dev aids) — `/api/diagnostics/auth`, `/api/diagnostics/supabase`, `/api/sign`

---

## Core Workflows

- **Registration & onboarding**
  1. Client submits the registration form.
  2. A one‑time code is emailed (Resend); the client verifies at `/register/verify` via `POST /api/auth/verify-otp`.
  3. On successful verification, a **WorkDrive folder** is auto‑created and a **Bigin/CRM** record is set up for the client, followed by a welcome email.

- **Login** — credentials post to `/api/auth/login`; on success the client lands on `/mgdashboard` (admins are redirected to `/admin`).

- **Client documents** — list, upload (`title`, `description`, file), open via short‑lived signed URL, and delete. Files are stored in the `client-documents` Storage bucket; admins review them at `/admin/client-uploads`.

- **Contracts (Zoho Sign)**
  1. An admin uploads a contract PDF to the `contracts` bucket.
  2. `POST /api/contracts/[id]/start-sign` creates or resumes a Zoho Sign request and returns an embedded signing URL when available.
  3. The client signs in‑app; the completed document is stored in the `contracts-signed` bucket and status is tracked via `/api/contracts/[id]/status`.

- **Scheduling** — appointments are booked through Calendly; `/api/calendly/webhook` keeps the portal in sync.

- **Voice‑AI leads (Retell → Zoho CRM)** — `/api/retell-webhook` receives call metadata and creates or updates a matching lead in Zoho CRM (keyed on a Retell call‑ID field).

---

## Environment Variables

Place all secrets in `.env.local`. **This file is git‑ignored — never commit it.**

**Supabase**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Storage buckets** (override defaults only if you renamed them)
```
SUPABASE_CLIENT_DOCS_BUCKET=client-documents
SUPABASE_CONTRACTS_BUCKET=contracts
SUPABASE_SIGNED_CONTRACTS_BUCKET=contracts-signed
SUPABASE_RESOURCES_BUCKET=resources
```

**Zoho (Sign / WorkDrive / CRM)**
```
ZOHO_REGION=com            # com | eu | in
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
SIGN_EMBED_HOST=           # your site origin, used for embedded signing
RETELL_CALL_FIELD_API_NAME=Retell_Call_ID   # CRM field used to match calls
```

**Site URLs**
```
NEXT_PUBLIC_SITE_URL=      # or SITE_URL — used when inferring host for embeds
```

**Email (Resend)**
```
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_SUPPORT_EMAIL= # or SUPPORT_TO_EMAIL
```

**Calendly**
```
CALENDLY_API_TOKEN=
NEXT_PUBLIC_CALENDLY_URL=
```

**Misc**
```
NEXT_PUBLIC_SUPPORT_PHONE= # shown on the /suspended page
```

---

## Data Model

Key tables (full definitions in [`supabase-schema.sql`](./supabase-schema.sql)):

- **Identity & access** — `profiles`, `role_assignments`
- **Business** — `companies`, `appointments`, `invoices`, `payments`
- **Support** — `support_tickets`, `messages`
- **Subscriptions** — `subscription_tiers`, `user_subscriptions`, `service_components`, `service_component_access`
- **Content** — `contracts`, `session_recaps`, `resources`, `client_documents`

Storage buckets: `client-documents`, `contracts`, `contracts-signed`, `resources`.

---

## Project Structure

```
src/
  app/
    layout.tsx           Root layout — wraps children in AuthProvider
    middleware.ts        (src/) session refresh + role-based routing
    page.tsx             Landing page
    api/**               Route handlers (auth, contracts, documents, admin, webhooks…)
    admin/**             Admin panel (own layout.tsx)
    mgdashboard/**       Client dashboard (own layout.tsx)
    register/**          Registration + OTP verification + password reset
    book/**              Public Calendly booking
    login, suspended, auth, loading-demo
  components/
    ui/**                Design-system primitives (button, dialog, table, calendar…)
    navbar, sidebar, admin-sidebar, *-form, contract-signing-modal, calendly-widget …
  hooks/
    use-auth.tsx         Auth context/provider
    use-appointments.tsx Appointment data hook
  lib/
    supabase.ts          Browser client
    supabase-server.ts   Server + service-role admin clients
    supabase-cookies.ts  Cookie adapter for SSR
    zoho.ts              Zoho Sign helpers
    zoho-workdrive.ts    Zoho WorkDrive helpers
    appointments.ts, scheduling.ts, resources.ts, otp-store.ts, auth-fetch.ts, utils.ts
scripts/
  create-admin.mjs       Create a confirmed admin user
  md-to-pdf.js           Markdown → PDF (npm run doc:pdf)
  zoho-embedded-express.js  Standalone Zoho Sign embed sample
public/                  Static assets
supabase-schema.sql      Database schema, RLS policies, buckets
```

---

## Deployment

- Deploy to **Vercel** (or any Node host); configure every variable from [Environment Variables](#environment-variables) in the platform's settings.
- Set `SIGN_EMBED_HOST` to your production origin and add that origin to Zoho Sign's **Allowed Domains** for embedded signing.
- Ensure route handlers that call Zoho run in the **Node.js runtime** (`export const runtime = 'nodejs'`).
- `next.config.ts` sets `eslint.ignoreDuringBuilds: true`, so lint errors won't block production builds — run `npm run lint` in CI to catch them.
- Register the Calendly, Zoho, and Retell webhooks against your deployed URLs.

## Troubleshooting

- **Missing Supabase envs** — browser/server clients throw descriptive errors; confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Middleware silently no‑ops session refresh when they're absent.
- **Zoho token errors** — verify `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, and `ZOHO_REGION`; watch for rate‑limit or invalid‑token responses.
- **Embedded signing URL not returned** — ensure `SIGN_EMBED_HOST` matches a Zoho allowed domain; inspect the `start-sign` response hints.
- **PDF validation failures** — contract uploads must be standard, unencrypted PDFs; oversized files are rejected.
- **Redirect loops / wrong landing page** — check the user's `profiles.role` and `suspended` flag against the middleware rules above.
- **Diagnostics** — hit `/api/diagnostics/auth` and `/api/diagnostics/supabase` to sanity‑check the session and database connection.
