# Frontend architecture (`apps/front`)

Angular **standalone** (v19), rutas en `app.routes.ts`, estilos **SCSS**.

## API base URL

- **Producción / Docker:** `environment.ts` → `apiBaseUrl: '/api'` (nginx del contenedor `web` hace proxy a Nest).
- **Desarrollo (`ng serve`):** `environment.development.ts` → también `/api`; `proxy.conf.json` reenvía a `http://localhost:3000`.

## Estructura prevista

```text
src/
├── app/
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── …
├── environments/
└── (añadir) features/ o modules/ por dominio: incidencias, auth, dashboard, …
```

Mantén llamadas HTTP al API bajo `environment.apiBaseUrl` para no acoplar host/puerto.
