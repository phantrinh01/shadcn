# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan dự án

Đây là template **Next.js 16 (App Router) dashboard** với TypeScript, shadcn/ui, Tailwind CSS v4, Firebase (Firestore + Auth + Storage + Admin), và Zustand. Cấu trúc theo pattern multi-feature: mỗi feature có service layer, components, và mock data riêng.

## Tech Stack

| Category      | Choice                                                       |
| ------------- | ------------------------------------------------------------ |
| Framework     | Next.js 16.2 (App Router) + Turbopack                        |
| Language      | TypeScript 5.9                                               |
| Styling       | Tailwind CSS v4 + CSS variables                              |
| UI Library    | shadcn/ui (style: `new-york`) — `@shadcn/react` + Radix      |
| Icons         | lucide-react                                                 |
| Tables        | @tanstack/react-table 8.21.3                                 |
| Forms         | react-hook-form + @hookform/resolvers + zod                  |
| State         | Zustand 5.0.9                                                |
| Auth/Database | NextAuth.js v5 (Credentials) + Firebase Auth + Firestore     |
| Storage       | Firebase Storage + Firebase Admin SDK                        |
| Charts        | Recharts 3.x                                                 |
| Theme         | next-themes + custom ThemeProvider + SidebarConfigProvider   |
| Toast         | sonner 2.x                                                   |
| Date          | date-fns 4.x + react-day-picker 10.x                         |

## Commands

Từ `package.json`:

| Lệnh              | Mục đích                                |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Chạy dev server (Next.js + Turbopack)   |
| `npm run build`   | Production build                        |
| `npm run start`   | Chạy production build                   |
| `npm run lint`    | ESLint (next lint)                      |
| `npx tsc --noEmit`| Type-check toàn project (không emit JS) |

**Không có test framework** — project này không cấu hình Jest/Vitest. Khi verify thay đổi: dùng `npx tsc --noEmit` cho type-safety và `npm run build` để kiểm tra build sạch.

## Cấu trúc thư mục

```text
src/
  app/                          # Next.js App Router
    (auth)/                     # Route group: không sidebar
      sign-in/, sign-up/, forgot-password/
      errors/                   # forbidden, internal-server-error, not-found, unauthorized, under-maintenance
    api/auth/[...nextauth]/     # NextAuth API route handlers (GET/POST)
    (private)/                  # Route group: có sidebar + auth-bắt-buộc (xem proxy.ts)
      dashboard/, dashboard-2/  # dashboard-3 đã được gộp vào dashboard-2
      tasks/, users/, chat/, calendar/
      mock-data/                # Firestore seed UI
      settings/                 # user, account, appearance, notifications, connections
    landing/                    # Public landing page
    layout.tsx                  # Root layout (ThemeProvider, SidebarConfigProvider, AuthProvider)
  components/
    ui/                         # shadcn/ui components + wrappers (chart, calendar, command-search, …)
    app-sidebar.tsx, site-header.tsx, site-footer.tsx
    theme-provider.tsx, mode-toggle.tsx, theme-customizer.tsx
    auth-provider.tsx           # NextAuth SessionProvider wrapper
    dynamic-imports.ts          # Dynamic import các thư viện nặng
  modules/                      # Feature modules — xem "Module Pattern"
    tasks/, users/, chat/, calendar/, dashboard-1/, dashboard-2/, settings/
  lib/
    firebase/
      client.ts                 # Firebase client (app, auth, db, storage) — validate env lúc load
      admin.ts                  # Firebase Admin SDK (auth, db) — lazy init, hỗ trợ split env + JSON service account
      auth.ts                   # signIn/signUp helpers (client-side)
      firestore-query.ts        # getFirestoreCollection (Firestore + mock fallback)
    utils.ts                    # cn() helper (clsx + tailwind-merge)
    fonts.ts                    # Inter font config
  contexts/
    theme-context.ts            # ThemeProviderContext (dark/light/system)
    sidebar-context.tsx         # SidebarConfigProvider + useSidebarConfig
  hooks/                        # use-theme, use-sidebar-config, use-mobile, use-fullscreen, …
  types/
    next-auth.d.ts              # NextAuth types & module augmentation
    theme.ts, theme-customizer.ts
  config/                       # Static config (theme data, customizer constants)
  utils/                        # tweakcn/shadcn theme presets
  auth.config.ts                # NextAuth edge-compatible base configuration
  auth.ts                       # NextAuth node-compatible main initialization
  proxy.ts                      # Next.js 16 route protection proxy (NextAuth session check)
```

## Module Pattern

Mỗi feature theo cùng cấu trúc. **`tasks`** là canonical reference (đầy đủ nhất):

```text
src/app/(private)/<feature>/page.tsx        # Route
src/modules/<feature>/
  services/
    types/<feature>-types.ts               # zod schema + TypeScript interfaces
    <feature>-mock-data.ts                 # Static mock data (import JSON)
    <feature>-services.ts                  # Firestore query helpers dùng getFirestoreCollection
    <feature>-<role>-services.ts           # Feature-specific services (chart/statistics/…)
    mock-data-services.ts                  # Seeder (optional)
    data/<feature>.json                    # JSON data file (optional)
  components/
    data-table.tsx                         # Tanstack Table wrapper
    columns.tsx, data-table-column-header.tsx
    data-table-toolbar.tsx                 # Search, filter selects, add button
    data-table-faceted-filter.tsx          # Command-palette filter
    data-table-pagination.tsx
    data-table-view-options.tsx            # Column visibility toggle
    data-table-row-actions.tsx             # Dropdown: view/edit/delete
    add-<feature>-modal.tsx                # Create dialog
    stat-cards.tsx                         # Optional stat cards
```

Các modules hiện có: **tasks** (đầy đủ nhất), **users** (react-hook-form + zod), **chat** (Zustand store), **calendar** (date normalization), **dashboard-1**, **dashboard-2**, **settings**.

## Quy ước quan trọng

### Route groups & auth

- Có **3 route group**: `(auth)` (public, không sidebar), `(private)` (yêu cầu đăng nhập, có sidebar), `landing` (public).
- **KHÔNG dùng `(dashboard)`** — codebase dùng `(private)`. `proxy.ts` chạy ở edge check NextAuth session.
- API routes (`/api/*`) bypass auth trong proxy — public APIs chịu trách nhiệm tự bảo vệ (xem mục API Routes).

### API Routes (public/CORS)

API routes công khai (vd. form submit) phải tuân thủ:

**CORS Headers** khai báo một lần trong file:

```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
```

**OPTIONS handler** cho mọi route để hỗ trợ preflight:

```typescript
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
```

**Response pattern** — luôn truyền `CORS_HEADERS`, status code chuẩn (`201` create, `200` read/update, `400` invalid, `500` server), body có `success` (boolean) + `message` (string) + `errors` (object, optional).

```typescript
const parsed = CustomerFormSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json(
    { success: false, message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors },
    { status: 400, headers: CORS_HEADERS }
  )
}
// … success → status: 201, headers: CORS_HEADERS
```

### Firebase Firestore (client-side)

- **Collection naming**: số nhiều, snake_case (`tasks`, `users`, `conversations`, `messages`).
- **Mock data fallback**: luôn truyền mock array làm fallback — service dùng `getFirestoreCollection(name, fallback)`. Hàm này thử Firestore, nếu empty/lỗi thì trả `fallback`.
- **No real-time**: **KHÔNG dùng** `onSnapshot`.
- **CRUD pattern**: KHÔNG viết direct Firestore CRUD trong service — xử lý trên local state (callback pattern ở component).
- **Timestamps**: `serverTimestamp()` khi seed dữ liệu mock.
- **Client vs Admin**: components/pages chỉ dùng `client.ts`. Admin SDK ở `lib/firebase/admin.ts` chỉ dành cho server-side scripts.

### Firebase Admin SDK (`src/lib/firebase/admin.ts`)

Lazy-initialized singleton, export `getAdminApp`, `getAdminAuth`, `getAdminDb`. Đọc env theo thứ tự ưu tiên:

1. Split vars: `FIREBASE_ADMIN_PROJECT_ID` + `FIREBASE_ADMIN_CLIENT_EMAIL` + `FIREBASE_ADMIN_PRIVATE_KEY` (escape `\n` trong key).
2. JSON blob: `FIREBASE_SERVICE_ACCOUNT_KEY` chứa toàn bộ service account.
3. Application Default Credentials (ADC) — cho Cloud Run/Functions.

### Page types

- **Server pages** (async): gọi service trực tiếp, `await` data, truyền vào components. VD: `dashboard`, `calendar`.
- **Client pages** (`"use client"`): khởi tạo state với mock data, fetch Firestore trong `useEffect`, quản lý state cục bộ. VD: `tasks`, `users`, `chat`.

### Auth flow

- Firebase Client Auth xử lý luồng đăng nhập/đăng ký ở frontend.
- NextAuth `CredentialsProvider` xác thực Firebase ID Token phía server qua Firebase REST `/accounts:lookup` (không dùng firebase-admin cho login flow).
- `src/proxy.ts` bảo vệ route trong Next.js 16 bằng cách check NextAuth session cookie. Auth page (`/sign-in`, `/sign-up`, `/forgot-password`) + `/landing` được allow khi logged-out.
- NextAuth config split: `auth.config.ts` (edge-compatible, không import firebase) + `auth.ts` (node, có providers).

### Form validation

Dùng `react-hook-form` + `@hookform/resolvers/zod`. Định nghĩa schema với zod, dùng `zodResolver` trong `useForm`. Error messages tiếng Việt ở `src/lib/firebase/auth.ts`.

### Other conventions

- **cn() utility**: luôn dùng `cn()` từ `@/lib/utils` để merge Tailwind classes — KHÔNG dùng template literals cho conditional classes.
- **Path alias**: `@/*` → `./src/*` (`tsconfig.json`).
- **Functional components + hooks** — không dùng React class components.
- **Server components ưu tiên**, chỉ `"use client"` khi cần interaction/state.
- Dynamic import trong `src/components/dynamic-imports.ts` cho thư viện nặng.
- Recharts cho charts, tanstack/react-table cho tables, sonner cho toasts, date-fns cho date.

## Environment Variables

Xem `.env.example` đầy đủ. Nhóm chính:

**Client Firebase** (Next.js client-side, prefix `NEXT_PUBLIC_`):
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`.

`client.ts` validate các biến bắt buộc lúc load — thiếu sẽ throw ngay lúc boot.

**Server (NextAuth + Admin)** (server-only):

- `AUTH_SECRET` — NextAuth session secret.
- `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` — Admin SDK split form (private key phải giữ `\n` escape).
- `FIREBASE_SERVICE_ACCOUNT_KEY` — full JSON blob (fallback).
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — cho notification integrations.

## Thêm feature mới

Khi thêm feature mới, tham khảo skill **`nextjs-firebase-feature`** tại `.claude/skills/nextjs-firebase-feature/SKILL.md`. Các bước chính:

1. Tạo types với zod schema
2. Tạo mock data (array of items)
3. Tạo service dùng `getFirestoreCollection`
4. Tạo columns, row actions, toolbar, pagination, view options
5. Tạo data table (Tanstack Table)
6. Tạo add modal
7. Tạo stat cards (optional)
8. Tạo page ghép mọi thứ lại (route đặt trong `src/app/(private)/<feature>/`)
9. Chạy `npx tsc --noEmit` kiểm tra TypeScript
10. Chạy `npm run dev` xác nhận hoạt động

## Lưu ý khi làm việc

- Không commit internal Firestore config hoặc private keys.
- Error messages Firebase tiếng Việt đặt trong `auth.ts`.
- Mock data seeder chạy phía server, dùng `client.ts` (không cần Admin SDK) cho flow chính.
- Nếu thêm feature mới: đọc `SKILL.md` trước khi code.
