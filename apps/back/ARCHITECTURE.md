# Backend architecture (`apps/back`)

NestJS **API** with prefijo global **`/api`**, **ConfigModule** (`.env` / variables de entorno) y **TypeORM + PostgreSQL** cuando `SKIP_DATABASE` no está activo (en e2e Jest se omite la conexión real).

## Estructura prevista

```text
src/
├── main.ts              # bootstrap, CORS, prefijo api
├── app.module.ts        # Config + TypeORM + módulos raíz
├── app.controller.ts    # raíz (opcional; puedes mover a módulos)
├── health/              # comprobación de vida
├── common/              # guards, pipes, filters (añadir según necesidad)
└── modules/             # dominio: incidencias, usuarios, auth, …
    └── (feature modules con *.module.ts, controllers, services, entities)
```

## Convenciones

- **Entidades TypeORM** por módulo de dominio; `autoLoadEntities: true` en `AppModule`.
- **Migraciones** recomendadas en cuanto exista esquema estable; mantener `TYPEORM_SYNC=false` fuera de desarrollo.
- **E2E:** `test/jest-e2e.setup.ts` define `SKIP_DATABASE=true` para no exigir Postgres en `npm run test:e2e`.
