This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication & RBAC

This app uses Supabase Auth with a simple RBAC model:

- Users are stored in `auth.users` and mirrored in `public.profiles`.
- Roles can be set in `public.profiles.role` (`client`, `provider`, `admin`, `support`, `super_admin`).
- Optional additional roles can be assigned via `public.role_assignments`.
- Row Level Security policies ensure clients only access their own data, while admins can manage globally.

### Environment Variables

Set the following in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_CLIENT_DOCS_BUCKET=client-documents
```

### Database Migration

Apply the SQL schema to your Supabase project using the SQL editor. Use the contents of `supabase-schema.sql`.

Key tables included:

- `profiles`, `role_assignments`
- `companies`, `appointments`
- `invoices`, `payments`
- `support_tickets`, `messages`
- `subscription_tiers`, `user_subscriptions`, `service_components`, `service_component_access`
- `contracts`, `session_recaps`, `resources`
- `client_documents` (client-submitted docs; stored in `client-documents` bucket)

### Admin Access

- Create an admin by setting `profiles.role = 'admin'` for a user, or inserting into `role_assignments` with role `admin`.
- Navigate to `/admin` (middleware restricts access to admins; non-admins are redirected).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# MG Client Portal — Comprehensive Documentation

## Overview

The MG Client Portal is a business management web application for clients and administrators. Clients can manage appointments, contracts, invoices, and documents; administrators can manage users, resources, and contract workflows. The app is built on Next.js App Router and integrates Supabase for authentication, database, and storage, with third‑party integrations for signing (Zoho Sign), scheduling (Calendly), and transactional email (Resend).

## Tech Stack

- Framework: `next@15` (App Router), `react@19`, `typescript`
- Styling: Tailwind CSS v4 (`@import "tailwindcss"` in `src/app/globals.css`), Geist fonts
- UI: Radix UI primitives, lucide‑react icons; selected MUI packages are available
- State/Auth: Supabase SSR helpers (`@supabase/ssr`) and client SDK (`@supabase/supabase-js`)
- Storage: Supabase Storage buckets for contracts, signed contracts, resources, and client documents
- Integrations: Zoho Sign, Calendly, Resend email

## Architecture

- App Router: Pages under `src/app/**` split into client and server components
- Global providers: `AuthProvider` wraps the app to expose `user`, `profile`, and `signOut` (`src/app/layout.tsx`, `src/hooks/use-auth.tsx`)
- Middleware: Centralized routing and access control (`src/middleware.ts`)
- Supabase clients:
  - Browser client: `src/lib/supabase.ts`
  - Server client: `createServerSupabaseClient` (`src/lib/supabase-server.ts`)
  - Admin client (service role): `createAdminSupabaseClient` (`src/lib/supabase-server.ts`)
- API routes: `src/app/api/**` for auth, documents, resources, contracts, support, and webhooks

## Authentication & RBAC

- Users authenticate via Supabase Auth; sessions persist in cookies and are auto‑refreshed in the browser
- Profiles are mirrored in `public.profiles` with a primary `role` column (`client`, `admin`, `support`, `super_admin`) and optional `role_assignments` for additional roles
- Middleware enforces access:
  - Redirects unauthenticated access to dashboard → `/login`
  - Redirects admins from common entry points to `/admin`
  - Redirects suspended users to `/suspended`

## Key Routes

- Client dashboard (`/mgdashboard`): Overview with quick actions and navigation
  - Resources: `/mgdashboard/resources`
  - Appointments: `/mgdashboard/appointments` (Calendly integration)
  - Billing & invoices: `/mgdashboard/billing`
  - Contracts: `/mgdashboard/contracts` (Zoho Sign workflows)
  - Documents: `/mgdashboard/documents` (upload and manage files)
  - Support: `/mgdashboard/questions`
  - Company profile: `/mgdashboard/company`
- Admin panel (`/admin`): User/role management, resources, contracts, client documents, support
- Auth pages: `/login`, `/register`, `/register/verify`, `/register/forgotpassword`
- Booking pages: `/book`, `/book/[handle]/[event]`

## Core Workflows

- Registration: Client fills details and receives a verification code via email; verification handled by `/api/auth/verify-otp`
- Login: Credentials are posted to `/api/auth/login`; upon success, client is navigated to `/mgdashboard`
- Client Documents:
  - List: `GET /api/client/documents`
  - Upload: `POST /api/client/documents/upload` with `title`, `description`, and file
  - Open: `GET /api/client-documents/[id]/url` returns a signed URL
  - Delete: `DELETE /api/client/documents/[id]`
- Contracts (Zoho Sign):
  - Admin uploads contract files to Supabase Storage (`contracts` bucket)
  - Start signing: `POST /api/contracts/[id]/start-sign` creates or resumes a Zoho request and returns an embedded signing URL when available
  - Signed documents are stored in `contracts-signed` bucket

## Environment Variables

Place secrets in `.env.local`. Categorized summary:

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Storage buckets (override names if needed):
  - `SUPABASE_CLIENT_DOCS_BUCKET` (default `client-documents`)
  - `SUPABASE_CONTRACTS_BUCKET` (default `contracts`)
  - `SUPABASE_SIGNED_CONTRACTS_BUCKET` (default `contracts-signed`)
  - `SUPABASE_RESOURCES_BUCKET` (default `resources`)
- Zoho Sign:
  - `ZOHO_REGION` (`com`, `eu`, `in`)
  - `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`
  - `SIGN_EMBED_HOST` (your site origin used for embedded signing)
- Site URLs:
  - `NEXT_PUBLIC_SITE_URL` or `SITE_URL` (used when inferring host for embeds)
- Email (Resend):
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - `NEXT_PUBLIC_SUPPORT_EMAIL` or `SUPPORT_TO_EMAIL`
- Calendly:
  - `CALENDLY_API_TOKEN`, `NEXT_PUBLIC_CALENDLY_URL`
- Misc:
  - `NEXT_PUBLIC_SUPPORT_PHONE` (used on `/suspended` page)

## Security & Access Control

- Cookie‑based sessions managed via Supabase SSR helpers; middleware reads cookies to compute access
- Role checks gate `/admin` routes and sensitive operations (e.g., contract workflows)
- Service role key is used only server‑side for privileged operations; never exposed to clients

## Directory Structure (selected)

- `src/app/layout.tsx` — Root layout, wraps children with `AuthProvider`
- `src/middleware.ts` — Routing and role‑based access decisions
- `src/lib/supabase.ts` — Browser client
- `src/lib/supabase-server.ts` — Server and admin clients
- `src/lib/zoho.ts` — Zoho Sign API integration helpers
- `src/components/*` — UI components including `navbar`, `sidebar`, tables, and form inputs
- `src/app/api/**` — REST endpoints for auth, documents, contracts, resources, support, and webhooks

## Local Development

1. Create `.env.local` with required variables (see Environment Variables)
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev` and open `http://localhost:3000`

## Deployment Notes

- Configure environment variables in your hosting platform
- Set `SIGN_EMBED_HOST` to your production origin and allow that origin in Zoho Sign’s “Allowed Domains” for embedded signing
- Use Vercel or similar; ensure server routes that call Zoho run in `runtime = 'nodejs'`

## Troubleshooting

- Supabase envs missing: Browser or server clients will throw descriptive errors; ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Zoho token errors: Verify `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, and region; watch for rate‑limit or invalid token messages
- PDF validation failures: Contract uploads must be standard, unencrypted PDFs; oversized files are rejected
- Embedded signing URL not returned: Ensure `SIGN_EMBED_HOST` matches a Zoho allowed domain; check `start-sign` response hints

## Data Model (key tables)

- `profiles`, `role_assignments`
- `companies`, `appointments`
- `invoices`, `payments`
- `support_tickets`, `messages`
- `subscription_tiers`, `user_subscriptions`, `service_components`, `service_component_access`
- `contracts`, `session_recaps`, `resources`
- `client_documents`

This documentation is intended to give developers and operators a clear map of the system’s components, configuration, and flows. For deeper details, inspect the files referenced above and the API routes under `src/app/api/**`.
