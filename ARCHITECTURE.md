# ByteBattle - Modular and Scalable Architecture

This document describes the project's **component-based** architecture (frontend and backend), separation-of-concerns principles, maintainability goals, and best practices targeting **production** and **enterprise** quality.

---

## 1. Guiding Principles

- **Modularity**: features are split into independent, reusable modules/components.
- **Separation of concerns**: each layer (API, auth, UI, etc.) has a clear, limited role.
- **Testability**: modules can be tested in isolation (mocks, injected dependencies).
- **Extensibility**: add new features without changing core system behavior.
- **Security**: centralized auth, guards, input validation, and no client-side secrets.
- **Performance**: lazy loading, caching, and module-specific optimizations.

---

## 2. Backend (NestJS)

### 2.1 Folder Structure

```
backend/src/
├── main.ts                 # Bootstrap, global pipe, CORS, Swagger
├── app.module.ts           # Root: business modules + config imports
├── config/                 # Environment config and validation
│   └── validation.ts
├── core/                   # Shared core (guards, decorators, filters, interceptors)
│   ├── guards/             # Guard re-export / central usage
│   ├── decorators/         # Business decorators (roles, user, etc.)
│   └── index.ts
├── auth/                   # Authentication module
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   └── ...
├── users/                   # Users module (profile, account, activity)
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.public.controller.ts
│   ├── users.service.ts
│   ├── schemas/
│   └── dto/
├── admin/                   # Admin module (admin interfaces)
│   ├── admin.module.ts
│   ├── admin.controller.ts
│   └── admin.service.ts
├── security-events/         # Security events module (audit)
├── challenges/              # Challenges module
├── competitions/            # Competitions module
├── code-execution/          # Code execution module
├── feedback/                # Feedback / AI module
├── leaderboard/             # Leaderboard module
├── achievements/            # Achievements / badges module
├── ai/                      # AI module (challenge generation, etc.)
└── chat/                    # Chat module (WebSocket)
```

### 2.2 Layer Roles

| Layer | Role | Examples |
|--------|------|----------|
| **Core** | Cross-cutting elements: guards, decorators, exception filters, interceptors. | `JwtAuthGuard`, `RolesGuard`, `@Roles()` |
| **Config** | Environment variables, startup validation. | `validateConfig`, `ConfigModule` |
| **Business module** | Isolated functional domain: controller + service + DTOs + schemas. | `AuthModule`, `UsersModule`, `AdminModule` |
| **API** | HTTP (and WebSocket) controllers exposing stable contracts (DTOs, HTTP codes). | REST routes, Swagger |

### 2.3 Per-Module Rules

- **One module = one domain** (auth, users, admin, challenges, ...).
- **Controller**: receives requests, validates DTOs, delegates to **service**.
- **Service**: business logic and data access, with no direct HTTP dependency.
- **DTOs**: typed and validated inputs/outputs (`class-validator`).
- **Schemas**: data models (Mongoose) kept in their owning module.
- **Exports**: a module exports only what others need (e.g. `AuthService`, `UsersService`).

### 2.4 Security

- **Authentication**: JWT (access + refresh), Passport strategies (local, Google, GitHub), 2FA.
- **Authorization**: guards (`JwtAuthGuard`, `RolesGuard`) and `@Roles()` decorator.
- **Data safety**: global validation (`ValidationPipe`), no arbitrary fields (whitelist).
- **Rate limiting**: applied in `main.ts` (excluding Swagger routes when needed).
- **CORS**: explicitly configured by environment.

### 2.5 Module Dependencies

- `AppModule` imports: `ConfigModule`, `MongooseModule`, `AuthModule`, `AdminModule` (plus other business modules as needed).
- `AuthModule` imports: `UsersModule`, `SecurityEventsModule`, `PassportModule`, `JwtModule`.
- `AdminModule` imports: `MongooseModule` (User), and optionally `UsersModule` if services are reused.
- Other modules (challenges, competitions, etc.) are progressively added to `AppModule` to expose routes.

---

## 3. Frontend (React + Vite)

### 3.1 Folder Structure (feature-based + shared)

```
frontend/src/
├── main.tsx
├── App.tsx
├── index.css
│
├── core/                    # App core (API, root store, auth)
│   ├── api/                 # HTTP client and API layer
│   │   ├── client.ts        # Shared Axios instance, interceptors
│   │   ├── auth.api.ts
│   │   ├── users.api.ts
│   │   ├── admin.api.ts
│   │   └── index.ts
│   ├── store/               # Redux root
│   │   ├── store.ts
│   │   ├── hooks.ts         # useAppDispatch, useAppSelector
│   │   └── index.ts
│   └── routes/              # Centralized route definition
│       ├── routes.tsx
│       └── index.ts
│
├── shared/                  # Reusable elements (UI, types, hooks)
│   ├── components/          # Generic UI components
│   │   ├── ui/              # Buttons, inputs, modals, etc.
│   │   └── layout/          # Layout, Navbar, Footer
│   ├── hooks/               # Reusable hooks
│   ├── types/               # Shared types and constants
│   └── utils/               # Pure helpers
│
└── features/                # One folder per business domain
   ├── auth/                # Authentication
    │   ├── components/
    │   ├── pages/           # Login, Register, ForgotPassword, etc.
   │   ├── slice/           # authSlice (or store/auth)
    │   └── index.ts
   ├── user/                # User profile, settings
    │   ├── components/
    │   ├── pages/
    │   └── index.ts
   ├── admin/               # Admin interface
    │   ├── pages/
    │   └── index.ts
    ├── challenges/
    ├── competitions/
    ├── leaderboard/
    └── ...
```

### 3.2 Layer Roles

| Layer | Role | Examples |
|--------|------|----------|
| **Core** | Single API client, root Redux store, centralized route definition. | `api/client.ts`, `store/store.ts`, `routes/routes.tsx` |
| **Shared** | UI components, layout, types, hooks, and utils without business logic. | `Button`, `Layout`, `Navbar`, `User`, `FullProfile` |
| **Features** | Business domain: pages, specific components, Redux slices, domain API calls. | `auth/`, `user/`, `admin/`, `challenges/` |

### 3.3 Per-Feature Rules

- **Feature = one domain** (auth, user, admin, challenges, ...).
- **Pages**: route-linked screens using feature or `shared` components.
- **Components**: domain-specific components (e.g. `EditProfileModal` in `user`).
- **API**: domain calls can live in `core/api/<domain>.api.ts` or feature files; keep a single HTTP client source of truth (`core/api/client.ts`).
- **State**: domain Redux slices (auth, challenges, competitions, etc.) registered in `core/store`.

### 3.4 Security and Performance

- **Token**: stored securely (memory or cookie when possible); interceptor in `core/api/client.ts` injects `Authorization`.
- **Protected routes**: `ProtectedRoute` in `shared/components/ProtectedRoute.tsx` checks `auth.isAuthenticated` and redirects to `/login` if required. Wrap private routes (e.g. `/settings/*`, `/admin/*`).
- **Admin**: admin-only routes; backend role checks are mandatory; frontend can additionally check role in route/page guards.
- **Performance**: lazy loading routes by feature (`React.lazy`), bundle-level code splitting.

### 3.5 Extensibility

- New feature: add a folder under `features/` with pages + components + optional slice and API.
- New route: add it in `core/routes`.
- New generic UI component: place it in `shared/components/ui` (or `layout`).
- New shared type: place it in `shared/types`.

---

## 4. API Contracts (Frontend ↔ Backend)

- **Backend**: Swagger (`/api`) is the reference for endpoints, DTOs, and responses.
- **Frontend**: TypeScript types aligned with DTOs and API responses (ideally generated or defined in `shared/types` / `core/api`).
- **Errors**: shared error format (e.g. `{ statusCode, message, error }`); client handles centrally (interceptor, toast, error page).

---

## 5. Quality and Maintainability

- **Tests**: unit tests for services (backend) and components/logic (frontend); e2e tests for critical paths.
- **Linting / formatting**: ESLint, Prettier, shared backend/frontend rules.
- **Reviews**: feature-scoped changes and module boundaries respected (no circular imports).
- **Documentation**: per-repo README, this ARCHITECTURE.md, and comments for non-obvious decisions.

---

## 6. Summary

| Aspect | Backend | Frontend |
|--------|---------|----------|
| **Decomposition unit** | NestJS module (controller + service + DTOs + schemas) | Feature (pages + components + slice + API) |
| **Shared** | `core/` (guards, decorators), `config/` | `core/` (api, store, routes), `shared/` (UI, types, hooks) |
| **Security** | JWT, guards, ValidationPipe, rate limit | Token, ProtectedRoute, authenticated API calls |
| **Extension** | New module + import in `AppModule` | New feature + routes + optional slice and API |

This architecture targets **clear separation of concerns**, **module/feature-based evolution**, and a **maintainable, testable** foundation for production deployment.

---

## 7. Extension Guide

### Backend - Add a Business Module

1. Create `src/<module>/` with at least:
   - `<module>.module.ts` (imports, controllers, providers, exports),
   - `<module>.controller.ts`,
   - `<module>.service.ts`,
   - `dto/` and/or `schemas/` if needed.
2. For protected routes, import guards from `../core` (`JwtAuthGuard`, `RolesGuard`, `@Roles()`).
3. Register the module in `app.module.ts`: `imports: [ ..., <Module> ]`.

### Frontend - Add a Feature

1. Create `src/features/<feature>/` with:
   - `pages/`, `components/`, and optionally `slice/`, `hooks/`.
2. Add routes in `core/routes/AppRoutes.tsx`.
3. If the feature has API calls, add `core/api/<feature>.api.ts` (using `apiClient` from `./client`) and export it in `core/api/index.ts`.
4. Create `features/<feature>/index.ts` (barrel) to re-export the feature's public elements.
