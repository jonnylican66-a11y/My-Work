# Northstar SaaS Dashboard

A responsive SaaS workspace built with the Next.js App Router and a separate Express REST API. It includes signed, HTTP-only cookie sessions; a protected dashboard; responsive revenue and activity charts; and searchable, filterable, paginated user management with validated create, edit, and delete operations.

## Project structure

```text
app/
  dashboard/page.tsx       Protected dashboard route
  login/page.tsx           Validated sign-in form
  api/chat/                 Existing optional assistant API
  api/tools/                Existing optional assistant tools API
  globals.css               Responsive dashboard and login styles
  layout.tsx                Root layout and metadata
  page.tsx                  Redirects to /dashboard
backend/
  server.js                 Express auth, metrics, and users REST API
  package.json              Independent API dependencies and scripts
  .env.example              API environment template
components/
  Dashboard.tsx             Navigation, KPIs, charts, user table, CRUD modal
lib/
  api.ts                    Typed frontend API client and shared data types
middleware.ts               Verifies the signed session before dashboard access
.env.example                Next.js environment template
```

## Requirements

- Node.js 20.9 or newer and npm
- Two local terminal sessions to run Next.js and Express concurrently

## Install and configure

From the project root in PowerShell:

```powershell
npm install
npm --prefix backend install
Copy-Item .env.example .env.local
Copy-Item backend\.env.example backend\.env
```

Generate one random session secret and put the **same value** in `JWT_SECRET` in both `.env.local` and `backend\.env`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

The example login is `admin@northstar.io` / `northstar-demo-2026`. Set `DEMO_EMAIL` and `DEMO_PASSWORD` in `backend\.env` to change it. These example credentials are for local development only; production startup rejects them. Set `NODE_ENV=production`, use a unique, high-entropy `JWT_SECRET`, and serve the application over HTTPS before deployment.

## Run locally

Start each service in its own terminal, from the project root:

```powershell
npm run dev
```

```powershell
npm run dev:api
```

Open [http://localhost:3000](http://localhost:3000). The API health check is available at [http://localhost:4000/api/health](http://localhost:4000/api/health). To use different ports or hosts, update `NEXT_PUBLIC_API_URL` in `.env.local` and `FRONTEND_ORIGIN` in `backend\.env`.

## Verify and build

```powershell
npm run typecheck
npm run build
```

For a production build, start Next.js with `npm start` and the API with `npm run start:api`. Configure `NEXT_PUBLIC_API_URL`, `FRONTEND_ORIGIN`, `JWT_SECRET`, `DEMO_EMAIL`, and `DEMO_PASSWORD` for the deployment environment.

## Publish with Vercel and Render

The repository includes [`render.yaml`](./render.yaml) for deploying the Express API as a Render web service. The Next.js app proxies its authentication, users, metrics, and health requests to the backend during the Vercel build. This keeps the browser requests same-origin so the `HttpOnly` session cookie works without third-party-cookie settings.

1. Push this project to a GitHub repository and import it into Vercel. Keep the Next.js project root set to the repository root and use the default `npm install` / `npm run build` settings.
2. In Vercel, set `NEXT_PUBLIC_API_URL` to `/api`, `BACKEND_API_URL` to the Render service origin (for example `https://northstar-api.onrender.com`, with no `/api` suffix), and `JWT_SECRET` to a fresh random secret of at least 32 bytes. Set `DEMO_EMAIL` and `DEMO_PASSWORD` to unique values. Apply these variables to Production and redeploy.
3. In Render, create a Blueprint from the same repository and select `render.yaml`. Set the prompted `FRONTEND_ORIGIN` to the exact Vercel production origin (for example `https://your-project.vercel.app`), and set `JWT_SECRET`, `DEMO_EMAIL`, and `DEMO_PASSWORD` to the exact same values used in Vercel. Use a distinct, high-entropy password for the public demo.
4. Copy the Render service origin into Vercel's `BACKEND_API_URL`, redeploy Vercel, then check `https://your-render-service.onrender.com/api/health` and sign in on the Vercel production URL.

The workspace currently has no Git remote configured, so it cannot be imported into either hosting provider until a GitHub repository is connected. The API stores users in process memory and uses a single configured demo account; changes reset when the Render process restarts. Use a durable database and real user authentication before treating the published demo as a production SaaS.

## API overview

All endpoints are prefixed by `/api`. A successful login issues an eight-hour, `HttpOnly`, `SameSite=Lax` signed cookie; the token is validated by both the API and Next.js middleware. API errors use `{ "error": { "message": "..." } }`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check |
| `POST` | `/api/auth/login` | Validate demo credentials and issue a session |
| `GET` | `/api/auth/me` | Read the current session |
| `POST` | `/api/auth/logout` | Clear the session |
| `GET` | `/api/users` | List workspace members |
| `POST` | `/api/users` | Add a validated member |
| `PUT` | `/api/users/:id` | Update a member |
| `DELETE` | `/api/users/:id` | Remove a member |
| `GET` | `/api/metrics` | Read KPI and chart data |

## Implementation notes

- Login form: `app/login/page.tsx`
- Protected route and session verification: `middleware.ts`
- Dashboard layout, charts, searchable/filterable/paginated table, and create/edit modal: `components/Dashboard.tsx`
- Typed API client and loading/error handling: `lib/api.ts`
- Express routes, validation, origin checks, rate-limited login, and signed sessions: `backend/server.js`

The API seeds sample members in memory to make the demo usable immediately. User changes are visible across the dashboard while the API process is running, but are reset when it restarts; connect a durable database and a production identity provider before using this sample with real customer data. The existing optional assistant endpoints remain in `app/api`; their OpenAI-compatible provider configuration is documented in `.env.example`.
