# cabs-aggregator-dashboard

VIA VIP Aggregator Control — full [mojo-management-frontend](../mojo-management-frontend) UI (theme, analytics, customer care, ops) with **Config** pages backed by **cabs-aggregator**.

## Backends

| Area | Backend |
|------|---------|
| Login (ADMIN / OPS) | `cabs-aggregator` `/auth/v1/login` |
| Config — overview, booking links, markup | `cabs-aggregator` `/admin/v1/*` |
| Imported analytics / CX / ops pages | `VITE_domain` → viaVIP_API or management-backend |

Vite proxies `/auth`, `/admin`, `/v1`, `/health` → `http://127.0.0.1:4100`.

## Hosts

| Where | Dashboard | Aggregator (`VITE_API_BASE` / proxy) | Analytics (`VITE_domain`) |
| --- | --- | --- | --- |
| Local | http://localhost:5174 | proxy → http://127.0.0.1:4100 (`VITE_API_BASE` empty) | http://127.0.0.1:3002 |
| Dev host | https://aggregator-dashboard.bookairportcab.com | https://api-aggregator.bookairportcab.com | https://viavip-devapi.bookairportcab.com |

Copy `.env.example` → `.env` for local. Use `.env_production` values when building for the dev host.

## Login rights

- **ADMIN** → `user_rights: ALL` (Config + Analytics + full nav)
- **OPS** → Config + Analytics + charts

Demo aggregator admin: `agg_admin` / `agg_admin_secret`

## Run

```bash
# terminal 1 — aggregator
cd ../cabs-aggregator && npm start

# terminal 2 — viaVIP_API (for analytics pages)
cd ../viaVIP_API && npm run start-local

# terminal 3 — dashboard
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5174
