# Infra — Docker (PostgreSQL + API + Web)

Compose file: `docker-compose.yml` in this folder.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)

## First run

From the **repository root**:

```powershell
Copy-Item infra\.env.example infra\.env
docker compose -f infra/docker-compose.yml --env-file infra/.env up --build
```

Or from **`infra/`**:

```powershell
Copy-Item .env.example .env
docker compose --env-file .env up --build
```

## URLs

| Service    | URL |
|------------|-----|
| Angular UI | http://localhost:8080 (nginx; `/api` proxied to Nest) |
| Nest API   | http://localhost:3001/api (host → contenedor; ver `API_PORT` en `infra/.env`) |
| PostgreSQL | Solo red Docker por defecto. Para exponer al host: ver `docker-compose.host-postgres.yml` |

## Health checks

- API: `GET http://localhost:3001/api/health` (o el `API_PORT` configurado)
- Through UI proxy: `GET http://localhost:8080/api/health`

## Postgres en el host (opcional)

Por defecto **no** se publica el puerto 5432 en `localhost` (evita conflictos). Para herramientas externas:

```powershell
docker compose -f infra/docker-compose.yml -f infra/docker-compose.host-postgres.yml --env-file infra/.env up -d
```

Variable opcional en `infra/.env`: `POSTGRES_PORT=15432` (o el que tengas libre).

## Local dev without Docker UI

1. Solo Postgres: `docker compose -f infra/docker-compose.yml --env-file infra/.env up -d postgres`  
   Si Nest corre **fuera** de Docker, añade el override de puertos y en `apps/back/.env` usa `DATABASE_HOST=localhost` y `DATABASE_PORT` igual a `POSTGRES_PORT`.
2. `apps/back`: copia `.env.example` → `.env`, `npm run start:dev`
3. `apps/front`: `npm start` (proxy a `http://localhost:3000`)

## Data volume

Postgres data persists in the named volume `postgres_data`. Remove with `docker compose ... down -v` if you want a clean database.
