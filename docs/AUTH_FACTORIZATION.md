# Estrategia de Factorización — Auth & UI Compartido

---

## 1. Situación Actual

### Mapa de Productos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INFRAESTRUCTURA AUTH                             │
│                                                                         │
│  tordo/apps/auth        → Microservicio de autenticación centralizado   │
│  tordo/libs/auth        → Librería: entidades, JWT, guards, mappers    │
│  tordo/libs/commons     → Librería: ApiResponse, DB utils, bootstrap   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         PRODUCTOS                                       │
│                                                                         │
│  tordo (ERP)            → Usa apps/auth como microservicio              │
│                            Usa libs/auth para validar JWT en cada app   │
│                                                                         │
│  aquila (Admin UI)      → Frontend Angular para admin de usuarios       │
│                            Login contra tordo/apps/auth                  │
│                            CRUD Users/Roles/Permissions/Elements         │
│                                                                         │
│  birdport (Ecommerce)   → Usa libs/auth para guards y decorators       │
│                            Admin: login con token de tordo/apps/auth    │
│                            Store: login propio (CustomerAuthLogic)       │
│                            libs/auth local (guardias simplificadas)      │
│                                                                         │
│  tordo.one (SaaS OT)   → NUEVO — necesita auth multi-tenant            │
│                            No usa microservicio separado (monolito)      │
│                            Necesita admin de usuarios integrado          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Auth Actual

```
                    ┌──────────────────┐
                    │  tordo/apps/auth │  ← Microservicio centralizado
                    │  (RS256 + JWKS)  │
                    └────────┬─────────┘
                             │ emite JWT
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │   tordo    │  │   aquila   │  │  birdport  │
     │  (ERP ms)  │  │ (admin UI) │  │(ecommerce) │
     └────────────┘  └────────────┘  └────────────┘
                                            │
                                            │ customer JWT propio
                                            ▼
                                     ┌────────────┐
                                     │   store    │
                                     │(customers) │
                                     └────────────┘
```

---

## 2. Análisis de lo Reutilizable

### Backend (`@tordo/auth` lib)

| Componente | tordo | birdport | tordo.one | Factorizar? |
|------------|:-----:|:--------:|:---------:|:-----------:|
| Entidades (User, Role, Permission, Element, Feature) | ✅ | ❌ (usa solo guards) | ✅ | Sí — core auth |
| Entidad CustomerUser | ❌ | ✅ | ❌ | No aplica |
| JWT Strategy (RS256, JWKS, session) | ✅ | Parcial (solo verify) | ✅ | Sí — core auth |
| JwtAuthGuard | ✅ | ❌ (usa DualAuthGuard) | ✅ | Sí — core auth |
| DualAuthGuard (admin + customer) | ❌ | ✅ | ❌ | Solo birdport |
| CurrentUser decorator | ✅ | ✅ | ✅ | Sí — core auth |
| CustomerAuthLogic | ❌ | ✅ | ❌ | Solo birdport |
| SessionActivityService | ✅ | ❌ | ✅ | Sí — core auth |
| AuthService (login completo) | ✅ | ❌ | ✅ (simplificado) | Copiar y adaptar |
| Licencias (License, LicenseEntitlement) | ✅ | ❌ | ❌ | Solo tordo ERP |

### Frontend (`aquila` auth-admin)

| Componente | aquila | birdport/admin | tordo.one | Factorizar? |
|------------|:------:|:--------------:|:---------:|:-----------:|
| Login component | ✅ | ✅ (propio) | ✅ | Sí — lib UI |
| User CRUD (list, dialog, bulk) | ✅ | ❌ | ✅ | Sí — lib UI |
| Role CRUD | ✅ | ❌ | ✅ | Sí — lib UI |
| Permission Manager (tree) | ✅ | ❌ | ✅ | Sí — lib UI |
| Element CRUD | ✅ | ❌ | ✅ | Sí — lib UI |
| AuthService (angular) | ✅ | ✅ (propio) | ✅ | Sí — lib UI |
| Auth Guard (angular) | ✅ | ✅ (propio) | ✅ | Sí — lib UI |
| Auth Interceptor | ✅ | ✅ (propio) | ✅ | Sí — lib UI |

---

## 3. Propuesta de Factorización

### Opción A: Librería publicada en NPM privado (RECOMENDADA)

```
arc-github/
├── tordo/                    # ERP (existente)
│   ├── libs/auth/            # @tordo/auth → se refactoriza como @arc/auth-core
│   └── ...
├── aquila/                   # Admin UI (existente) → consume @arc/ui-auth
├── birdport/                 # Ecommerce (existente) → consume @arc/auth-core
├── tordo.one/                # SaaS OT (nuevo) → consume @arc/auth-core + @arc/ui-auth
└── libs/                     # ← NUEVO monorepo de libs compartidas
    ├── auth-core/            # @arc/auth-core — Backend auth compartido
    └── ui-auth/              # @arc/ui-auth — Frontend auth components
```

### Opción B: Git submodules (más complejo, menos recomendado)

### Opción C: Copiar y adaptar (más simple, menos mantenible)

---

## 4. Diseño de Librerías Compartidas

### `@arc/auth-core` (Backend — NestJS)

Extraer de `tordo/libs/auth` solo lo que es universal:

```
@arc/auth-core/
├── src/
│   ├── entities/
│   │   ├── user.entity.ts           # User base (sin schema fijo)
│   │   ├── role.entity.ts
│   │   ├── permission.entity.ts
│   │   ├── element.entity.ts
│   │   ├── feature.entity.ts
│   │   ├── session.entity.ts
│   │   ├── user-role.entity.ts
│   │   └── user-business.entity.ts
│   ├── jwt/
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-jwks-auth.guard.ts
│   │   ├── jwt.strategy.ts          # Configurable (public key O jwks uri)
│   │   ├── jwt-session.strategy.ts
│   │   └── jwt-auth-base.module.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── current-company.decorator.ts
│   │   └── public.decorator.ts
│   ├── services/
│   │   ├── jwt-custom.service.ts
│   │   └── session-activity.service.ts
│   ├── mappers/
│   │   ├── user.map.ts
│   │   ├── role.map.ts
│   │   ├── permission.map.ts
│   │   └── element.map.ts
│   └── index.ts
├── package.json              # @arc/auth-core
└── tsconfig.json
```

**Qué NO incluye:**
- `License`, `LicenseEntitlement` → solo tordo ERP
- `CustomerUser`, `CustomerAuthLogic` → solo birdport
- `DualAuthGuard` → solo birdport
- Lógica de login (cada producto tiene la suya)

**Configuración por producto:**

```typescript
// tordo.one — usa directamente la entidad con schema 'public'
@Entity({ schema: 'public' })
export class User extends BaseUser { /* ... */ }

// tordo ERP — usa schema 'auth'
@Entity({ schema: 'auth' })
export class User extends BaseUser { /* ... */ }
```

Solución: las entidades de `@arc/auth-core` NO definen `schema` — cada producto lo configura:

```typescript
// En @arc/auth-core
@Entity() // sin schema
export class User { /* campos base */ }

// En tordo.one, se usa tal cual (schema default = public)
// En tordo ERP, se configura el DataSource con schema: 'auth'
```

---

### `@arc/ui-auth` (Frontend — Angular)

Extraer de `aquila/features/auth-admin`:

```
@arc/ui-auth/
├── src/
│   ├── components/
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.html
│   │   │   └── login.component.scss
│   │   ├── users/
│   │   │   ├── user-list.component.ts
│   │   │   ├── user-dialog.component.ts
│   │   │   ├── password-dialog.component.ts
│   │   │   └── bulk-upload-dialog.component.ts
│   │   ├── roles/
│   │   │   ├── role-list.component.ts
│   │   │   └── role-dialog.component.ts
│   │   ├── permissions/
│   │   │   └── permission-manager.component.ts
│   │   └── elements/
│   │       └── element-dialog.component.ts
│   ├── services/
│   │   ├── auth.service.ts           # Login, token, session — configurable
│   │   └── auth-admin.service.ts     # CRUD users/roles/permissions
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── interceptors/
│   │   └── auth.interceptor.ts
│   ├── models/
│   │   └── auth.models.ts
│   └── index.ts
├── package.json              # @arc/ui-auth
└── tsconfig.json
```

**Configuración por producto:**

```typescript
// Cada app provee su config via InjectionToken
export interface AuthUiConfig {
  apiBaseUrl: string;           // '/api' | 'http://auth.tordo.local'
  loginEndpoint: string;        // '/auth/login' | '/login'
  tokenStorageKey: string;      // 'tordo_one_token' | 'bpa_token'
  redirectAfterLogin: string;   // '/dashboard' | '/aquila/dashboard'
  showLicenseColumn: boolean;   // true en aquila, false en tordo.one
  showBusinessColumn: boolean;  // true en aquila, false en tordo.one
}
```

---

## 5. Cómo queda cada producto

### tordo (ERP) — Sin cambios inmediatos

```
tordo/
├── apps/auth/          # Microservicio auth — se mantiene
├── libs/auth/          # Se refactoriza: deps internas → @arc/auth-core
└── ...                 # El resto igual
```

Migración gradual: `libs/auth` importa y re-exporta desde `@arc/auth-core`, agregando las piezas específicas (License, UserBusiness con businessCode).

### aquila (Admin UI) — Migra componentes a `@arc/ui-auth`

```
aquila/
├── src/app/features/auth-admin/  # Se EXTRAE a @arc/ui-auth
└── ...                           # El resto usa la lib
```

### birdport (Ecommerce) — Mantiene su lib local liviana

```
birdport/
├── libs/auth/          # Se mantiene (DualAuthGuard es específico de ecommerce)
│                       # Opcionalmente importa @arc/auth-core para decorators
├── apps/api/
│   └── modules/store-auth/  # CustomerAuthLogic desde @tordo/auth (ya lo hace)
└── apps/admin/         # Login → usa @arc/ui-auth (config: apunta a tordo/apps/auth)
```

### tordo.one (SaaS OT) — Consume ambas librerías

```
tordo.one/
├── apps/back/
│   └── src/app/modules/auth/
│       ├── auth.module.ts         # Importa @arc/auth-core (entities, guards, jwt)
│       ├── auth.controller.ts     # Login endpoint (simplificado, sin licencias)
│       └── auth.service.ts        # Login logic (argon2, JWT, session)
├── apps/front/
│   └── src/app/features/admin/   # Importa @arc/ui-auth components
│       └── admin.routes.ts        # Lazy-load user-list, role-list, permissions
└── ...
```

---

## 6. Decisión Pragmática para el Corto Plazo

Crear una librería publicable requiere infraestructura (registry npm privado, CI para publicar, versionamiento). Para arrancar rápido:

### Fase 1 (Sprint 0): Copiar y adaptar

1. Copiar entidades + JWT + guards de `tordo/libs/auth` → `tordo.one/apps/back/src/app/modules/auth/`
2. Copiar componentes de `aquila/features/auth-admin/` → `tordo.one/apps/front/src/app/features/admin/`
3. Eliminar dependencias de License, DatabaseConnectionManager dinámico
4. Agregar tenantId

### Fase 2 (Post-MVP): Extraer a librería compartida

1. Crear repo `arc-github/libs` con `@arc/auth-core` y `@arc/ui-auth`
2. Publicar en GitHub Packages o npm privado
3. Refactorizar tordo, aquila, birdport y tordo.one para consumir la lib
4. CI que buildea y publica en cada push a libs/

---

## 7. Arquitectura Final de Auth

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        @arc/auth-core (npm lib)                          │
│  Entities | JWT Strategy | Guards | Decorators | Mappers                │
└────────┬────────────────────────────────┬───────────────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌─────────────────────┐
│ tordo/apps/auth │              │   tordo.one/back    │
│ (microservicio) │              │   (monolito auth)   │
│                 │              │                     │
│ + License logic │              │ + tenantId          │
│ + Multi-DB      │              │ + Row-level isolat. │
│ + JWKS server   │              │ + Simple session    │
└────────┬────────┘              └─────────────────────┘
         │ JWT RS256
         │ (misma clave privada)
         │
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
┌────────┐          ┌──────────┐
│ aquila │          │ birdport │
│(admin) │          │ (admin)  │
└────────┘          └──────────┘
    │                     │
    │  @arc/ui-auth       │  @arc/ui-auth (solo login)
    │  (full admin UI)    │
    ▼                     ▼
┌───────────────────────────────────────────────────┐
│              @arc/ui-auth (npm lib)                │
│  Login | Users | Roles | Permissions | Elements   │
│  AuthService | AuthGuard | Interceptor            │
└───────────────────────────────────────────────────┘
```

---

## 8. Decisión Final Recomendada

| Aspecto | Decisión |
|---------|----------|
| Auth backend para tordo.one | **Copiar** de `tordo/libs/auth` en Sprint 0, adaptar (eliminar License, agregar tenantId) |
| Admin UI para tordo.one | **Copiar** de `aquila/features/auth-admin` en Sprint 1 |
| Auth service centralizado | **No** — tordo.one tiene su propio login (monolito). No depende de tordo/apps/auth |
| Misma clave RSA | **Sí** — usar el mismo par de claves para que tokens sean intercambiables si en el futuro se integra |
| Librería compartida `@arc/auth-core` | **Post-MVP** — cuando los 3 productos estén estables, extraer lo común |
| Librería UI `@arc/ui-auth` | **Post-MVP** — misma lógica |
| birdport/libs/auth | **Mantener** como está — es liviano y específico (DualAuthGuard) |

Esto da velocidad al Sprint 0 y 1 sin bloquear en infraestructura de librerías, y deja la puerta abierta para factorizar después del MVP.
