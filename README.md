# MGC Client Portal

A business management web application for MG Consulting clients and administrators. Clients manage their appointments, contracts, invoices, and documents; administrators manage users, resources, and contract signing workflows.

Built on **Next.js 15 (App Router)** and **React 19**, with **Supabase** for authentication, database, and storage, plus integrations for e‑signature (Zoho Sign), scheduling (Calendly), and transactional email (Resend).

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, Geist fonts
- **UI:** Radix UI primitives, lucide‑react icons (selected MUI packages available)
- **Auth & Data:** Supabase SSR helpers (`@supabase/ssr`) and client SDK (`@supabase/supabase-js`)
- **Storage:** Supabase Storage buckets for contracts, signed contracts, resources, and client documents
- **Integrations:** Zoho Sign, Zoho WorkDrive, Calendly, Resend email

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file with the required variables (see [Environment Variables](#environment-variables)).
3. Apply the database schema — run the contents of `supabase-schema.sql` in the Supabase SQL editor.
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the local development server   |
| `npm run build`   | Production build                     |
| `npm run start`   | Serve the production build           |
| `npm run lint`    | Run ESLint                           |
| `npm run doc:pdf` | Render Markdown docs to PDF          |

## Architecture

- **App Router:** Pages under `src/app/**` split into client and server components.
- **Global providers:** `AuthProvider` wraps the app to expose `user`, `profile`, and `signOut` (`src/app/layout.tsx`, `src/hooks/use-auth.tsx`).
- **Middleware:** Centralized routing and access control (`src/middleware.ts`).
- **Supabase clients:**
  - Browser client — `src/lib/supabase.ts`
  - Server client — `createServerSupabaseClient` (`src/lib/supabase-server.ts`)
  - Admin client (service role) — `createAdminSupabaseClient` (`src/lib/supabase-server.ts`)
- **API routes:** `src/app/api/**` for auth, documents, resources, contracts, support, and webhooks.

## Authentication & RBAC

The app uses Supabase Auth with a simple role‑based access model:

- Users are stored in `auth.users` and mirrored in `public.profiles`.
- A primary `role` column on `profiles` (`client`, `provider`, `admin`, `support`, `super_admin`) drives access, with optional additional roles via `public.role_assignments`.
- Row Level Security policies ensure clients only access their own data while admins can manage globally.
- Sessions are cookie‑based and auto‑refreshed in the browser.

Middleware enforces access:
- Unauthenticated access to the dashboard redirects to `/login`.
- Admins are redirected from common entry points to `/admin`.
- Suspended users are redirected to `/suspended`.

To create an admin, set `profiles.role = 'admin'` for a user (or insert an `admin` row into `role_assignments`), then visit `/admin`.

## Key Routes

- **Client dashboard** (`/mgdashboard`) — overview with quick actions
  - Resources — `/mgdashboard/resources`
  - Appointments — `/mgdashboard/appointments` (Calendly)
  - Contracts — `/mgdashboard/contracts` (Zoho Sign)
  - Sessions & recaps — `/mgdashboard/sessions`
  - Subscription — `/mgdashboard/subscribe`
- **Admin panel** (`/admin`) — users/roles, resources, contracts, client uploads, support
- **Auth** — `/login`, `/register`, `/register/verify`, `/register/forgotpassword`
- **Booking** — `/book`, `/book/[handle]`

## Core Workflows

- **Registration:** Client submits details and receives an email verification code; verified via `/api/auth/verify-otp`. A WorkDrive folder is auto‑created on signup.
- **Login:** Credentials posted to `/api/auth/login`; on success the client lands on `/mgdashboard`.
- **Client documents:**
  - List — `GET /api/client/documents`
  - Upload — `POST /api/client/documents/upload` with `title`, `description`, and file
  - Open — `GET /api/client-documents/[id]/url` (returns a signed URL)
  - Delete — `DELETE /api/client/documents/[id]`
- **Contracts (Zoho Sign):**
  - Admin uploads contract files to the `contracts` Storage bucket.
  - `POST /api/contracts/[id]/start-sign` creates or resumes a Zoho request and returns an embedded signing URL when available.
  - Signed documents are stored in the `contracts-signed` bucket.

## Environment Variables

Place secrets in `.env.local` (never commit this file).

**Supabase**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Storage buckets** (override defaults if needed)
```
SUPABASE_CLIENT_DOCS_BUCKET=client-documents
SUPABASE_CONTRACTS_BUCKET=contracts
SUPABASE_SIGNED_CONTRACTS_BUCKET=contracts-signed
SUPABASE_RESOURCES_BUCKET=resources
```

**Zoho Sign / WorkDrive**
```
ZOHO_REGION=com            # com | eu | in
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
SIGN_EMBED_HOST=           # your site origin, used for embedded signing
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

## Data Model (key tables)

- `profiles`, `role_assignments`
- `companies`, `appointments`
- `invoices`, `payments`
- `support_tickets`, `messages`
- `subscription_tiers`, `user_subscriptions`, `service_components`, `service_component_access`
- `contracts`, `session_recaps`, `resources`
- `client_documents` (client‑submitted docs, stored in the `client-documents` bucket)

The full schema lives in [`supabase-schema.sql`](./supabase-schema.sql).

## Project Structure (selected)

```
src/
  app/
    layout.tsx        Root layout, wraps children with AuthProvider
    api/**            REST endpoints (auth, documents, contracts, resources, support, webhooks)
    admin/**          Admin panel pages
    mgdashboard/**    Client dashboard pages
    register/**       Registration & verification flows
    book/**           Booking pages
  components/**        UI components (navbar, sidebar, tables, forms)
  hooks/use-auth.tsx  Auth context/provider
  lib/
    supabase.ts       Browser client
    supabase-server.ts Server & admin (service‑role) clients
    zoho.ts           Zoho Sign API helpers
  middleware.ts       Routing & role‑based access decisions
scripts/              Utility scripts (admin creation, doc→PDF)
```

## Deployment

- Configure all environment variables in your hosting platform (e.g. Vercel).
- Set `SIGN_EMBED_HOST` to your production origin and add that origin to Zoho Sign's **Allowed Domains** for embedded signing.
- Ensure server routes that call Zoho run in the Node.js runtime (`runtime = 'nodejs'`).

## Troubleshooting

- **Missing Supabase envs:** Browser/server clients throw descriptive errors — confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
- **Zoho token errors:** Verify `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, and `ZOHO_REGION`; watch for rate‑limit or invalid‑token messages.
- **PDF validation failures:** Contract uploads must be standard, unencrypted PDFs; oversized files are rejected.
- **Embedded signing URL not returned:** Ensure `SIGN_EMBED_HOST` matches a Zoho allowed domain; check the `start-sign` response hints.
