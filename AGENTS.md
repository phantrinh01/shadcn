# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

Next.js 16 (App Router, Turbopack) admin dashboard template: TypeScript 5.9, Tailwind CSS v4 (CSS-variable theming), shadcn/ui (`new-york` style), TanStack Table v8, Firebase (Auth + Firestore + Storage + Admin SDK), NextAuth v5 (Credentials), Zustand, react-hook-form + zod, Recharts, sonner, date-fns. UI text and error messages are in **Vietnamese**.

## Commands

| Command            | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Dev server (Next.js + Turbopack)                    |
| `npm run build`    | Production build                                    |
| `npm run lint`     | ESLint (`next/core-web-vitals` + `next/typescript`) |
| `npx tsc --noEmit` | Type-check the whole project                        |

**There is no test framework** (no Jest/Vitest). Verify changes with `npx tsc --noEmit` and `npm run build`. There is no single-test command.

## Code Style (enforced by Prettier on save)

`.prettierrc`: **no semicolons**, double quotes, 2-space indent, 80-char width, `es5` trailing commas, LF. The editor auto-formats on save — if a `SearchReplace` fails to match a file you touched earlier, re-read it first; it was likely reformatted (e.g. single→double quotes, one object property per line).

- Path alias: `@/*` → `./src/*`.
- Always merge Tailwind classes with `cn()` from `@/lib/utils` — never template literals for conditional classes.
- Functional components + hooks only; prefer Server Components, add `"use client"` only when state/interaction is required.
- Heavy libraries are dynamically imported via `src/components/dynamic-imports.ts`.

## Architecture: Authentication & Authorization

The auth chain spans five files — understand it before touching any of them:

1. **Firebase client Auth** (`src/lib/firebase/auth.ts`, `client.ts`) handles sign-in/sign-up in the browser and produces a Firebase ID token.
2. **NextAuth CredentialsProvider** (`src/auth.ts`) verifies that token server-side via the Firebase REST endpoint `identitytoolkit.googleapis.com/v1/accounts:lookup` (deliberately _not_ firebase-admin, so login works without Admin SDK creds).
3. **Role loading** (`src/lib/auth/user-access.ts`): `getUserAuthorization()` reads the `users` profile doc + `users_roles` assignments via the **Admin SDK** and returns `{ roles, isAdmin }`. The jwt callback re-fetches roles on every token refresh, so role changes propagate without re-login. `session.user` is augmented with `id`, `roles: string[]`, `isAdmin` (see `src/types/next-auth.d.ts`).
4. **Route protection** (`src/proxy.ts`): Next.js 16's `proxy` (this repo does **not** use `middleware.ts`). `/api/*` routes are skipped (they self-protect); auth pages redirect logged-in users to `/dashboard`; everything else requires a session; `/admin/*` additionally requires `hasAdminAccess`.
5. **Permission helpers** (`src/lib/auth/permissions.ts`): `hasAdminAccess()` (admin role `role-admin`, `isAdmin` flag, or hardcoded `ADMIN_EMAIL = admin@claudecode.ai`) and `hasDocumentManagerAccess()` (`role-document-manager`, admins implicit).

`src/auth.config.ts` is the edge-compatible base config (no Firebase imports); `src/auth.ts` extends it with providers — keep this split.

### Per-feature authorization models (they differ — don't unify blindly)

- **Customers — true RLS**: every doc carries `userId`; services (`src/modules/customers/services/customer-services.ts`) wait for the restored Firebase session (`waitForAuth()`), then query `where("userId", "==", uid)`. `firestore.rules` enforces ownership server-side (public unauthenticated create is allowed only with `userId == ""` for the lead-capture form).
- **Documents — client-side RBAC, no RLS**: `folders`/`documents` collections are open to any authenticated user in `firestore.rules`; mutations are gated in the UI via `hasDocumentManagerAccess(session?.user)` (see `src/app/(private)/documents/page.tsx`). Documents use **soft delete** (`deletedAt`) filtered in `getDocuments()`.
- **Admin users API** (`src/app/api/admin/users/`): server routes guard with `getAdminApiErrorResponse()` from `src/lib/auth/admin-api.ts` (401 no session / 403 not admin) and operate via Admin SDK (`joinAuthAndProfile` merges Auth `UserRecord` + Firestore profile).

## Architecture: Data Layer

- **Read pattern**: `getFirestoreCollection(name, fallback)` / `getFirestoreDocumentCollection` (`src/lib/firebase/firestore-query.ts`) try Firestore and fall back to bundled mock arrays on empty/error, then `JSON.parse(JSON.stringify(...))` to strip Firestore types. Services for newer features (customers, documents) query Firestore directly instead.
- **No real-time**: never use `onSnapshot`. Client pages seed state from mock data, fetch in `useEffect`, and own mutations via local state + callbacks.
- **Client vs Admin SDK**: components/pages import only `@/lib/firebase/client` (`client.ts` validates `NEXT_PUBLIC_FIREBASE_*` env at load and throws on missing vars). `@/lib/firebase/admin` is server-only, lazy-init singleton; env priority: split vars (`FIREBASE_ADMIN_PROJECT_ID`/`CLIENT_EMAIL`/`PRIVATE_KEY`, keep `\n` escapes) → `FIREBASE_SERVICE_ACCOUNT_KEY` JSON blob → ADC.
- Collections are plural snake_case (`tasks`, `users`, `users_roles`, `customers`, `documents`, `folders`). Seed with `serverTimestamp()`.

## Architecture: Feature Module Pattern

Every feature duplicates the same shape — **`tasks` is the canonical reference**:

```text
src/app/(private)/<feature>/page.tsx     # route; client pages own state + fetch
src/modules/<feature>/
  services/
    types/<feature>-types.ts             # zod schemas + TS interfaces
    <feature>-mock-data.ts               # fallback data
    <feature>-services.ts                # Firestore helpers
  components/
    data-table.tsx, columns.tsx          # TanStack Table wrapper + ColumnDefs
    data-table-toolbar.tsx               # single-row: filter selects + search + reset | view options + add button
    data-table-pagination.tsx, data-table-view-options.tsx, data-table-row-actions.tsx
    add-<feature>-modal.tsx              # react-hook-form + zodResolver dialog
```

Existing modules: `tasks`, `users` (admin, react-hook-form+zod), `customers` (RLS), `documents` (RBAC + folder tree + Storage attachments), `chat` (Zustand), `calendar`, `dashboard-1`, `dashboard-2`, `settings`.

TanStack Table gotcha used here: toolbar filters must reference real column ids — a filter-only column (e.g. `gender` in `user-columns.tsx`) is declared with `filterFn: "equalsString"` and hidden via initial `columnVisibility` state. Default `includesString` filtering causes substring false-positives ("male" matches "female").

## Architecture: Theme System

Runtime CSS-variable injection, not build-time themes:

- `globals.css` `:root` defines the oklch palette + `--radius: 0.5rem` (default); `@theme inline` derives `--radius-sm/md/lg/xl` from `var(--radius)`.
- Presets live in `src/utils/theme-presets.ts` (single source, 10 curated presets) → `src/config/theme-data.ts` → applied by `src/hooks/use-theme-manager.ts` (`resetTheme()` then `setProperty` per var).
- **Presets are COLOR-ONLY**: they must never carry `radius`, `spacing` (Tailwind v4 padding/margin scale), or `letter-spacing`. Border radius is owned exclusively by the customizer's Radius control + `globals.css`; `resetTheme()` intentionally does not clear `--radius`.
- Only Inter is loaded (`src/lib/fonts.ts`); preset font stacks fall back to system fonts.

## API Route Conventions

Public API routes (`/api/*`) bypass the proxy and self-protect. Every route file declares one `CORS_HEADERS` const, exports an `OPTIONS()` preflight handler returning 204, and responds with `{ success: boolean, message: string, errors?: object }` + `CORS_HEADERS` (status: 201 create, 200 read/update, 400 validation via `zodSchema.safeParse` → `error.flatten().fieldErrors`, 401/403 via `getAdminApiErrorResponse`, 500 server).

## Route Map

- `(auth)` group: `sign-in`, `sign-up`, `forgot-password`, `errors/*` — no sidebar.
- `(private)` group: `dashboard`, `dashboard-2`, `tasks`, `calendar`, `chat`, `customers`, `documents`, `settings/*`, `admin/users` (role-gated), `resend`, `telegram` — wrapped by a client layout providing sidebar/header/footer + ThemeCustomizer.
- `/` is a client redirect to `/dashboard`. There is no landing page and no `(dashboard)` group — always use `(private)`.

## Environment Variables

See `.env.example`. Client: `NEXT_PUBLIC_FIREBASE_*` (7 vars, validated at boot). Server: `AUTH_SECRET` (NextAuth), `FIREBASE_ADMIN_*` or `FIREBASE_SERVICE_ACCOUNT_KEY`, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`, `RESEND_API_KEY`.

## Adding a Feature

Follow `.claude/skills/nextjs-firebase-feature/SKILL.md` (read it first): zod types → mock data → service (`getFirestoreCollection`) → columns/toolbar/pagination/view-options/row-actions → data table → add modal → optional stat cards → page under `src/app/(private)/<feature>/` → `npx tsc --noEmit`.
