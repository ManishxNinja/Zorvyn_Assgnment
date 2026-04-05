# Finance Dashboard API

Backend for a finance dashboard: **Express**, **TypeScript**, **Prisma**, **PostgreSQL** (e.g. [Neon](https://neon.tech)), **JWT** auth, and **role-based access control** (RBAC).

## Roles and assumptions

| Role | Dashboard (aggregates) | Financial records (CRUD / list) | User management |
|------|------------------------|----------------------------------|-----------------|
| **VIEWER** | Yes (scoped to own user id; typically empty if they never created records) | No | No |
| **ANALYST** | Yes (own data) | Yes (create/read/update/delete **own** records) | No |
| **ADMIN** | Yes (**org-wide**: all users’ records) | Yes (all records; optional `userId` on create/list) | Yes |

- **Viewer** is limited to **dashboard aggregate APIs** only; they **cannot** call `/records` (returns `403`).
- **Inactive** users (`INACTIVE`) cannot log in; JWT auth reloads the user on each request.
- **Soft delete for users:** `DELETE /users/:id` sets `status` to `INACTIVE` (cannot target your own account).

## Prerequisites

- Node.js **20+**
- A PostgreSQL database (this project targets **Neon** via `DATABASE_URL`)

## Setup

1. **Clone / copy** this project and install dependencies:

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env` and set:

   - `DATABASE_URL` — from the Neon dashboard (URI usually includes `sslmode=require`).
   - `JWT_SECRET` — long random string for signing tokens.

3. **Database schema** — create the initial migration and apply it:

   ```bash
   npx prisma migrate dev --name init
   ```

   For production or CI against an existing database:

   ```bash
   npx prisma migrate deploy
   ```

4. **Generate Prisma Client** (also runs on `migrate dev`; if needed):

   ```bash
   npx prisma generate
   ```

5. **Seed** a default admin user (optional; override with env vars):

   ```bash
   npx prisma db seed
   ```

   Defaults: `admin@example.com` / `ChangeMeAdmin1!` (change via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

6. **Run the API:**

   ```bash
   npm run dev
   ```

   Server defaults to `http://localhost:3000` (override with `PORT`).

## Demo frontend (React + Vite)

A small UI in [`frontend/`](frontend/) helps you explore the API: login, dashboard metrics, records (analyst/admin), and user admin (admin only).

1. Keep the API running on port **3000** (or set `VITE_API_URL` to match).

2. In another terminal:

   ```bash
   cd frontend
   cp .env.example .env   # optional; default API is http://localhost:3000
   npm install
   npm run dev
   ```

3. Open the URL Vite prints (usually `http://localhost:5173`). Use **Sign up** for a new VIEWER account, or sign in with a seeded/admin-created user.

The UI stores the JWT in `localStorage` and hides **Records** / **Users** navigation based on role.

## API overview

All routes except `POST /auth/login`, `POST /auth/register`, and `GET /health` require:

```http
Authorization: Bearer <access_token>
```

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | `{ "email", "password" }` → `{ accessToken, user, ... }` |
| POST | `/auth/register` | `{ "email", "password" }` (min 8 chars) → creates **VIEWER**, returns same token shape as login (`201`) |

### Users (ADMIN only)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create user (`email`, `password`, `role`, `status`) |
| GET | `/users` | Paginated list (`skip`, `take`) |
| GET | `/users/:id` | Get user |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Soft-delete (set inactive) |

### Financial records (ANALYST, ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/records` | Create (`amount`, `type` INCOME\|EXPENSE, `category`, `entryDate` YYYY-MM-DD, optional `notes`; ADMIN may set `userId`) |
| GET | `/records` | List with filters: `fromDate`, `toDate`, `category`, `type`, `userId` (admin only), pagination |
| GET | `/records/:id` | Get one |
| PATCH | `/records/:id` | Update |
| DELETE | `/records/:id` | Hard delete |

### Dashboard (VIEWER, ANALYST, ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/summary` | Optional `from`, `to` (dates) → `totalIncome`, `totalExpense`, `net` |
| GET | `/dashboard/by-category` | Category totals (optional date range) |
| GET | `/dashboard/trends` | Required `granularity=week|month`, `from`, `to` |
| GET | `/dashboard/recent` | `limit` (default 10) — recent transactions in scope |

### Health

| Method | Path |
|--------|------|
| GET | `/health` |

## Error responses

JSON shape: `{ "error": string, "code"?: string, ... }` with appropriate HTTP status (`400`, `401`, `403`, `404`, `409`, `500`).

## Tradeoffs

- JWT-only auth (no refresh-token rotation in this baseline).
- Hard delete on financial records; user “delete” is soft via status.
- Dashboard **trends** use PostgreSQL `date_trunc` via Prisma `$queryRaw` for week/month buckets.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled app |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run db:seed` | Run seed |
| `npm run db:studio` | Prisma Studio |
