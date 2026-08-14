# AGENTS.md — SIGIZI Backend (re-be) Context & Directives

> **SYSTEM INSTRUCTION:** ALL AI AGENTS WORKING ON THIS REPOSITORY MUST READ AND ADHERE TO THE FOLLOWING ARCHITECTURAL GUIDELINES AND CONSTRAINTS. DO NOT DEVIATE WITHOUT EXPLICIT USER OVERRIDE.

---

## 1. Project Overview

**Project:** SIGIZI — Sistem Informasi Gizi Program Makan Bergizi Gratis
**Competition:** Gemastik 2026
**Tagline:** Transparansi berbasis computer vision untuk Program Makan Bergizi Gratis (MBG)

### What SIGIZI Does

SIGIZI is a public-facing information and verification system for Indonesia's national free school meal program (Program MBG). It bridges the transparency gap between:
- **SPPG** (Satuan Pelayanan Pemenuhan Gizi — community kitchen units) that prepare and distribute meals
- **Schools** that receive and monitor meals
- **The public / parents** who need visibility into what children are eating and its nutritional value

The core innovation: uploaded meal photos are no longer passive archives. They are fed through a **Food Recognition & Nutrition Analysis** pipeline (computer vision) to automatically verify what was served, estimate portion sizes, and cross-check against SPPG-reported menus.

### Domain Glossary (Bahasa Indonesia)

| Term | Meaning |
|---|---|
| MBG | Program Makan Bergizi Gratis — the national free school meal program |
| SPPG | Satuan Pelayanan Pemenuhan Gizi — the community kitchen unit |
| Sekolah | School / partner school receiving meals |
| Menu | Weekly/daily meal plan published by SPPG |
| Dokumentasi | Meal photo documentation uploaded by SPPG or school |
| Laporan | School report/rating submitted to SPPG |
| Notifikasi | Notification, feedback, or complaint from school to SPPG |
| CV / Computer Vision | The ML food recognition service (separate Python/FastAPI service) |
| Inferensi | ML inference — the process of analyzing a photo through the CV model |
| TKPI | Tabel Komposisi Pangan Indonesia — national food nutrition reference table |
| BGN | Badan Gizi Nasional — the national nutrition authority |
| Confidence Score | ML model's confidence in its food classification result |
| Flag | A report automatically flagged because detected nutrition differs significantly from what was reported |

---

## 2. System Architecture

SIGIZI uses a **microservices architecture** with a clear separation of concerns:

```
┌──────────────────────────────────────────────────────────────┐
│                        User Layer                            │
│            SPPG │ Sekolah │ Publik/Orang Tua │ Admin BGN    │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                     Frontend (re-)                           │
│     React + Vite │ Leaflet.js │ Axios                       │
│   Dashboard SPPG │ Dashboard Sekolah │ Peta Interaktif      │
└────────────────────────────┬─────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼─────────────────────────────────┐
│               Backend Core (THIS REPO — re-be)               │
│       Node.js + Express 5 + TypeScript + Drizzle ORM        │
│  Core: Menu │ User │ Sekolah │ SPPG │ Laporan │ Notifikasi  │
│  CV Inference Gateway  ←── proxies to ML service            │
└──────┬───────────────────────────────────────┬───────────────┘
       │                                       │ HTTP/gRPC
┌──────▼──────────┐              ┌─────────────▼──────────────┐
│   PostgreSQL    │              │  ML Service (Python)        │
│  + Drizzle ORM  │              │  FastAPI + PyTorch          │
│  Supabase-hosted│              │  Food Classification        │
└─────────────────┘              │  Portion Estimation         │
                                 │  Nutrition Lookup (TKPI)    │
                                 └────────────────────────────┘
                                          │
                                 ┌────────▼───────────┐
                                 │   Object Storage    │
                                 │  Cloudinary / S3    │
                                 │  (meal photos)      │
                                 └────────────────────┘
```

**This repository (`re-be`) is the Backend Core only.** The ML service is a separate Python/FastAPI project. This backend communicates with the ML service as a client via an internal HTTP gateway.

### Graceful Degradation Principle

If the ML service is unavailable (timeout / error), the system **MUST NOT** fail the user's upload. Instead:
1. Store the photo and manual SPPG input as-is.
2. Mark the analysis status as `'pending'` or `'failed'`.
3. Retry or allow manual re-trigger of CV analysis later.

Never block a core user action (menu submission, photo upload) on ML availability.

---

## 3. Tech Stack (Strict)

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (via `tsx` in dev, `tsc` + `node` in prod) |
| **Framework** | [Express 5](https://expressjs.com/) (`express@^5`) |
| **Language** | TypeScript — strict mode (`"strict": true` in `tsconfig.json`) |
| **Database** | PostgreSQL hosted on Supabase (pooled connection) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm/postgres-js` driver) |
| **Auth** | JWT (`jsonwebtoken`) — Bearer token via `Authorization` header |
| **File Storage** | Multer + Cloudinary (`multer-storage-cloudinary`) |
| **ML Gateway** | Internal HTTP client that proxies photo analysis requests to the Python/FastAPI ML service |
| **Env** | `dotenv` loaded via `src/config/loadEnv` |
| **Dev Scripts** | `npm run dev` (tsx watch), `npm run build` (tsc), `npm run db:generate`, `npm run db:push` |
| **Deployment** | Docker Compose (dev) → VPS/Railway/Render (production) |

---

## 4. The "Golden Rules" (Violations = Immediate Rejection)

### Rule 1 — The Standard Express Router Pattern

**ALWAYS** use `Router()` from `express` in route files. **NEVER** create a new `express()` app instance inside a module. App-level setup belongs only in `src/app.ts`.

```typescript
// src/routes/exampleRoutes.ts — CORRECT
import { Router } from 'express';
const router = Router();
export default router;
```

### Rule 2 — The Controller Purity Rule

Controllers are the **only** layer that reads from `req` and writes to `res`. They must:
- Extract inputs from `req` (body, query, params, `req.user`, `req.file`)
- Call a **Service** function, passing **primitives or plain objects only** — NOT the full `req`/`res`
- Return a structured JSON response

**NEVER** import `db` directly inside a controller. Database access belongs in **Services**.

```typescript
// CORRECT — controller is thin
export const createMenu = async (req: Request, res: Response): Promise<any> => {
  const { status, data } = await createMenuService(req.user!.id, req.body);
  return res.status(status).json(data);
};
```

### Rule 3 — The Service Isolation Rule

Services contain **all business logic**. Rules:
- Services **may** import and use `db` directly (established pattern in this repo)
- Services accept **plain typed parameters**, never Express `Request`/`Response`
- Services return `{ status: number, data: object }` — the controller maps this to the HTTP response
- Services should be testable without an HTTP environment

```typescript
// CORRECT — service returns { status, data }
export const getMenuService = async (menuId: string) => {
  const [menu] = await db.select().from(menus).where(eq(menus.id, menuId));
  if (!menu) return { status: 404, data: { success: false, message: 'Menu tidak ditemukan' } };
  return { status: 200, data: { success: true, data: menu } };
};
```

### Rule 4 — The Auth Middleware Chain Rule

Protected routes **MUST** use this middleware chain in exact order:
1. `verifyToken` — validates JWT, attaches `req.user: JwtPayload`
2. `requireRole(...)` — authorizes by role (`'sppg'`, `'school'`)

```typescript
router.post('/menu', verifyToken, requireRole('sppg'), handler);
```

> `'sekolah'` is a legacy alias for `'school'`, normalized internally by `roleMiddleware`. Accept it at route level for backward compatibility but use `'school'` in all new code.

### Rule 5 — The Error Middleware Rule

**NEVER** swallow all errors with a generic `res.status(500)`. Re-`throw` unknown errors so they bubble up to `errorMiddleware` (registered last in `src/app.ts`).

```typescript
} catch (error: any) {
  if (error?.code === '23505') return res.status(409).json({ success: false, message: 'Data duplikat' });
  throw error; // let errorMiddleware handle unknown errors
}
```

### Rule 6 — The UUID Validation Rule

**ALWAYS** validate UUID path/query params with `isUuid()` from `src/utils/uuid.ts` before querying the DB.

```typescript
import { isUuid } from '../utils/uuid';
if (!isUuid(id)) return res.status(400).json({ success: false, message: 'Format ID tidak valid' });
```

### Rule 7 — The Consistent Response Shape Rule

All API responses **MUST** follow this shape:

```json
// Success
{ "success": true, "data": { ... }, "message": "optional success message" }

// Error
{ "success": false, "message": "Pesan error yang jelas dalam Bahasa Indonesia" }
```

### Rule 8 — The Drizzle-Only Schema Rule

**NEVER** write raw SQL. All DB interaction must use the Drizzle ORM query builder. The single source of truth for the DB schema is `src/db/skema.ts`. After editing it, always run `npm run db:generate` then `npm run db:push`.

### Rule 9 — The Drizzle Transaction Rule

Multi-table write operations **MUST** use `db.transaction(async (tx) => { ... })`. Always use `tx` inside the callback — never the outer `db`.

```typescript
await db.transaction(async (tx) => {
  const [newUser] = await tx.insert(users).values(...).returning();
  await tx.insert(sppg).values({ userId: newUser.id, ... });
});
```

### Rule 10 — The ML Gateway Isolation Rule

**ALL** communication with the Python ML service must go through a dedicated gateway module (e.g., `src/services/cvGateway.ts` or `src/infra/mlGateway.ts`). Controllers and other services **MUST NOT** make direct HTTP calls to the ML service. The gateway must implement:
- Configurable ML service URL (from env: `ML_SERVICE_URL`)
- Timeout handling
- Graceful fallback on failure (return `null` or a `pending` status — never throw to the user)

```typescript
// src/services/cvGateway.ts
export const analyzeFood = async (imageUrl: string): Promise<CVAnalysisResult | null> => {
  try {
    const res = await fetch(`${process.env.ML_SERVICE_URL}/analyze`, { ... });
    return await res.json();
  } catch {
    return null; // graceful degradation
  }
};
```

### Rule 11 — The `req.user` Type Augmentation Rule

The `req.user` type is globally augmented in `src/types/express.d.ts`. **NEVER** cast `req` to `any`. Access user data via `req.user?.id`, `req.user?.role`.

---

## 5. Directory Structure (The Map)

```text
re-be/
├── drizzle/                   # Auto-generated migration SQL (DO NOT hand-edit)
├── src/
│   ├── app.ts                 # Express app: middleware, routes, error handler registration
│   ├── index.ts               # Server entry point (listen)
│   ├── config/
│   │   └── loadEnv.ts         # dotenv init (imported first in app.ts & db/index.ts)
│   ├── db/
│   │   ├── index.ts           # Drizzle client export (`db`)
│   │   ├── skema.ts           # ALL Drizzle table & enum definitions — single source of truth
│   │   ├── mockDb.ts          # In-memory mock for tests/dev
│   │   └── seed/              # Seed scripts
│   ├── controllers/           # HTTP layer — reads req, calls service, writes res
│   │   ├── authControllers.ts
│   │   ├── laporanController.ts
│   │   ├── menuController.ts
│   │   ├── publicControllers.ts
│   │   ├── schoolControllers.ts
│   │   ├── sppgControllers.ts
│   │   └── uploadController.ts
│   ├── services/              # Business logic layer — no req/res allowed
│   │   ├── auth.service.ts
│   │   ├── laporan.service.ts
│   │   ├── csvParserService.ts
│   │   ├── uploadService.ts
│   │   └── cvGateway.ts       # [TO ADD] ML service HTTP client — all CV calls go here
│   ├── routes/                # Express Router definitions
│   │   ├── authRoutes.ts
│   │   ├── schoolRoutes.ts
│   │   ├── sppgRoutes.ts
│   │   ├── laporanRoutes.ts
│   │   ├── menuRoutes.ts
│   │   ├── notifikasiRoutes.ts
│   │   ├── publicRoutes.ts
│   │   └── uploadRoutes.ts
│   ├── middlewares/
│   │   ├── authMiddleware.ts      # verifyToken — JWT validation
│   │   ├── roleMiddleware.ts      # requireRole(...) — RBAC guard
│   │   ├── errorMiddleware.ts     # Global error handler (must be last in app.ts)
│   │   ├── uploadMiddleware.ts    # Cloudinary/Multer image storage
│   │   └── csvUploadMiddleware.ts # CSV file upload (menu bulk import)
│   ├── types/
│   │   ├── express.d.ts           # Augments Express Request with `user: JwtPayload`
│   │   ├── user.type.ts           # JwtPayload type
│   │   └── laporan.type.ts        # LaporanStatus type
│   ├── utils/
│   │   └── uuid.ts                # isUuid() helper
│   └── contracts/
│       └── openapi.yaml           # OpenAPI/Swagger contract (keep in sync with implementation)
├── drizzle.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## 6. Database Schema Summary

All tables are in `src/db/skema.ts`. Do not define schema anywhere else.

| Table | Purpose |
|---|---|
| `users` | Auth accounts. Role: `'sppg'` or `'school'` |
| `sppg` | SPPG (community kitchen) profiles, 1-to-1 with `users` |
| `schools` | School profiles, 1-to-1 with `users`, optionally linked to an SPPG |
| `menus` | Daily/weekly meal plans published by SPPG. Includes nutrition fields (calories, protein, fat, carbs, fiber) |
| `menu_upload_history` | History of CSV bulk-menu uploads |
| `meal_documentation` | Meal photo documentation uploaded by SPPG or school |
| `school_reports` | School ratings & notes submitted to their partner SPPG |
| `notifications` | Notifications, feedback, and complaints from schools to SPPG |

**Enums:**
- `role`: `'sppg' | 'school'`
- `sppg_status`: `'active' | 'inactive' | 'maintenance'`
- `report_status`: `'submitted' | 'received' | 'reviewed'`
- `notification_type`: `'notification' | 'feedback' | 'complaint'`
- `notification_status`: `'new' | 'received' | 'reviewed'`
- `menu_upload_status`: `'success' | 'failed'`

**IDs:** All PKs are `uuid` via `defaultRandom()`. Always treat as `string` in TypeScript.

**Planned Schema Extensions (SIGIZI CV Feature):**

When adding CV analysis results, extend `meal_documentation` or create a separate `cv_analysis_results` table with fields such as:
- `detectedFoods` — JSON array of detected food items with confidence scores
- `estimatedCalories`, `estimatedProtein`, `estimatedFat`, `estimatedCarbs` — CV-estimated nutrition
- `analysisStatus` — `'pending' | 'processing' | 'completed' | 'failed'`
- `matchScore` — cross-check score between CV result and SPPG-reported menu
- `isFlagged` — boolean, true if discrepancy exceeds threshold
- `flagReason` — text explanation of flag

---

## 7. Authentication & Authorization

### JWT Payload Shape

```typescript
// src/types/user.type.ts
interface JwtPayload {
  id: string;     // users.id (UUID)
  email: string;
  role: 'sppg' | 'school';
}
```

### Role-Based Access Summary

| Action | Role Required |
|---|---|
| Register / Login | Public |
| View SPPG profiles & menus | Public |
| View school info | Public |
| Access public dashboard / map | Public |
| Submit menu, upload photo docs | `sppg` |
| Upload CSV bulk menu | `sppg` |
| Submit laporan / rating | `school` |
| View school dashboard | `school` |
| Edit own profile | `sppg` or `school` (own data only) |

### Middleware Chain Example

```typescript
// Public
router.get('/', getAllSppgPublic);

// Authenticated only
router.get('/me', verifyToken, getMyProfile);

// Role-restricted
router.post('/menu', verifyToken, requireRole('sppg'), createMenu);
router.post('/reports', verifyToken, requireRole('school', 'sekolah'), createLaporan);
```

---

## 8. CV Inference Gateway Pattern

The CV gateway (`src/services/cvGateway.ts`) is the **single integration point** for the Python ML service. All CV calls flow through it.

### Expected ML Service Contract

The ML service (Python/FastAPI) exposes:

```
POST {ML_SERVICE_URL}/analyze
Body: { imageUrl: string }

Response: {
  detectedFoods: Array<{ name: string; confidence: number; portionGrams: number }>;
  estimatedNutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrate: number;
  };
  processingTimeMs: number;
}
```

### Gateway Implementation Pattern

```typescript
// src/services/cvGateway.ts
export interface CVAnalysisResult {
  detectedFoods: { name: string; confidence: number; portionGrams: number }[];
  estimatedNutrition: { calories: number; protein: number; fat: number; carbohydrate: number };
}

export const analyzeFood = async (imageUrl: string): Promise<CVAnalysisResult | null> => {
  const ML_URL = process.env.ML_SERVICE_URL;
  if (!ML_URL) return null; // graceful degradation if not configured

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const res = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // timeout or network error → graceful fallback
  }
};
```

---

## 9. Standardized Patterns

### 9.1 Pagination

```typescript
const page = Number(req.query.page) || 1;
const pageSize = Number(req.query.pageSize) || 10;
const offset = (page - 1) * pageSize;

// Response
{
  "success": true,
  "data": {
    "currentPage": page,
    "totalPages": Math.ceil(total / pageSize),
    "data": rows
  }
}
```

### 9.2 Role-Aware Queries

1. Read `req.user?.id` and `req.user?.role` in the controller
2. Pass them as primitives to the service
3. Service resolves the role-specific profile (SPPG or School) first, then scopes the domain query

### 9.3 Partial PATCH Updates (Null-Safe)

Use the established helper pattern from `auth.service.ts`:
- `undefined` — field not in payload, skip update
- `null` — field explicitly cleared, set to `NULL` in DB
- a value — update with that value

Always include `updatedAt: new Date()` in every `.set()` call for tables that have an `updatedAt` column.

### 9.4 Drizzle Query Pattern

```typescript
// Single row
const [row] = await db.select().from(table).where(eq(table.id, id));
if (!row) return { status: 404, data: { success: false, message: '...' } };

// Insert & return
const [inserted] = await db.insert(table).values({ ... }).returning();

// Update
await db.update(table).set({ field: value, updatedAt: new Date() }).where(eq(table.id, id));

// Parallel independent queries (performance)
const [sppgData, reportsData] = await Promise.all([
  db.select().from(sppg).where(eq(sppg.id, sppgId)),
  db.select().from(schoolReports).where(eq(schoolReports.sppgId, sppgId)),
]);
```

### 9.5 CV Analysis Post-Upload Flow

When a photo is uploaded (SPPG or School), the standard flow is:
1. Store photo to Cloudinary → get `photoUrl`
2. Persist the `meal_documentation` record with `analysisStatus: 'pending'`
3. Return `201` to the user immediately
4. Call `analyzeFood(photoUrl)` asynchronously (do not `await` in the request handler, or use a background job)
5. On CV result: update `meal_documentation` with detected foods, estimated nutrition, match score, and flag status

---

## 10. Environment Variables

Copy `.env.example` to `.env` before running.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooled: `?sslmode=require`) |
| `PORT` | Server port (default: `3000`) |
| `JWT_SECRET` | JWT signing secret — **change in production** |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `ML_SERVICE_URL` | Internal URL of the Python/FastAPI ML service (e.g., `http://ml-service:8000`) |

> **Supabase Note:** The DB client uses `prepare: false` to disable prepared statements — required for the Supabase PgBouncer pooler. Do not remove this option from `src/db/index.ts`.

---

## 11. Development Workflow

### Running Locally

```bash
npm install
cp .env.example .env   # Fill in credentials
npm run dev            # tsx watch — auto-restarts on change
```

### Database Workflow

```bash
# After editing src/db/skema.ts:
npm run db:generate    # Generate migration SQL in /drizzle
npm run db:push        # Apply to database

# Seed:
npm run db:seed
```

### Adding a New Feature

1. **Schema** — Edit `src/db/skema.ts`, run `db:generate` + `db:push`
2. **Types** — Add to `src/types/` if needed
3. **Service** — Create `src/services/[domain].service.ts` with pure business logic
4. **Controller** — Create `src/controllers/[domain]Controller.ts` (HTTP layer only)
5. **Routes** — Create `src/routes/[domain]Routes.ts` with correct auth middleware
6. **Register** — Mount in `src/app.ts` with `app.use('/api/[domain]', [domain]Routes)`
7. **Docs** — Update `src/contracts/openapi.yaml`

### Functional Requirements Tracker

| ID | Feature | Status |
|---|---|---|
| FR-01 | SPPG upload foto & input menu harian | Implemented (uploadController, menuController) |
| FR-02 | Preprocessing gambar (ML side) | ML Service — out of scope for this repo |
| FR-03 | Klasifikasi jenis makanan (CV) | ML Service + cvGateway.ts integration |
| FR-04 | Estimasi porsi/berat | ML Service + cvGateway.ts integration |
| FR-05 | Hitung kalori/protein/lemak/karbohidrat (TKPI) | ML Service + store result in DB |
| FR-06 | Cross-check deteksi vs. laporan manual SPPG | Backend — match score logic in service |
| FR-07 | Flag laporan dengan selisih signifikan | Backend — flag threshold logic in service |
| FR-08 | Dashboard transparansi publik | Frontend + publicControllers.ts |
| FR-09 | Confidence score hasil deteksi | Stored from CV result, exposed via API |
| FR-10 | Feedback koreksi SPPG (human-in-the-loop) | Needs new PATCH endpoint for CV result correction |
| FR-11 | Peta sebaran SPPG dengan status verifikasi | publicControllers.ts + lat/lng from sppg table |
| FR-12 | Laporan periodik BGN | Future — reporting/export endpoint |

---

## 12. Common Anti-Patterns (REJECT IMMEDIATELY)

| Anti-Pattern | Correct Approach |
|---|---|
| Importing `db` in a controller | Move all DB access to the service layer |
| Passing `req` or `res` to a service | Extract primitives in controller, pass them |
| Making direct HTTP calls to the ML service from a controller or non-gateway service | Route ALL CV calls through `cvGateway.ts` |
| Failing the entire upload request when ML service is unavailable | Graceful degradation — save data, mark status `'pending'` |
| Catching all errors with `res.status(500)` | Re-`throw` unknown errors; let `errorMiddleware` handle them |
| Using `req.query.id` directly as a UUID in a query | Validate with `isUuid()` first |
| Creating a new `express()` inside a module | Use `Router()` in route files |
| Writing raw SQL strings | Use Drizzle ORM query builder |
| Multi-table writes without a transaction | Use `db.transaction(async (tx) => { ... })` |
| Blocking the user response on ML inference time | Fire CV analysis async; respond to user immediately |
| Forgetting `updatedAt: new Date()` on DB updates | Always include in `.set()` for tables with `updatedAt` |
| Storing sensitive student data (biometrics, faces) | System follows privacy-by-design — meal photos only, no personal data |
