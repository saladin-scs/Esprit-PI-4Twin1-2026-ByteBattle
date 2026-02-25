# ByteBattle – Architecture modulaire et scalable

Ce document décrit l’architecture **component-based** du projet (frontend et backend), les principes de séparation des responsabilités, la maintenabilité et les bonnes pratiques visant un niveau **production** et **enterprise**.

---

## 1. Principes directeurs

- **Modularité** : fonctionnalités découpées en modules/composants indépendants et réutilisables.
- **Séparation des responsabilités** : une couche (API, auth, UI, etc.) a un rôle clair et limité.
- **Testabilité** : modules testables en isolation (mocks, dépendances injectées).
- **Extensibilité** : ajout de features sans modifier le cœur du système.
- **Sécurité** : auth centralisée, guards, validation des entrées, pas de secrets côté client.
- **Performance** : lazy loading, cache, optimisations ciblées par module.

---

## 2. Backend (NestJS)

### 2.1 Structure des dossiers

```
backend/src/
├── main.ts                 # Bootstrap, pipe global, CORS, Swagger
├── app.module.ts           # Racine : import des modules métier + config
├── config/                 # Configuration et validation d’environnement
│   └── validation.ts
├── core/                   # Noyau partagé (guards, decorators, filters, interceptors)
│   ├── guards/             # Réexport / usage central des guards
│   ├── decorators/         # Décorateurs métier (roles, user, etc.)
│   └── index.ts
├── auth/                   # Module Authentification
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   └── ...
├── users/                   # Module Utilisateurs (profil, compte, activité)
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.public.controller.ts
│   ├── users.service.ts
│   ├── schemas/
│   └── dto/
├── admin/                   # Module Administration (interfaces admin)
│   ├── admin.module.ts
│   ├── admin.controller.ts
│   └── admin.service.ts
├── security-events/         # Module Événements de sécurité (audit)
├── challenges/              # Module Défis
├── competitions/            # Module Compétitions
├── code-execution/          # Module Exécution de code
├── feedback/                # Module Feedback / IA
├── leaderboard/             # Module Classements
├── achievements/            # Module Succès / badges
├── ai/                      # Module IA (génération de défis, etc.)
└── chat/                    # Module Chat (WebSocket)
```

### 2.2 Rôles des couches

| Couche | Rôle | Exemples |
|--------|------|----------|
| **Core** | Éléments transverses : guards, décorateurs, filtres d’exception, interceptors. | `JwtAuthGuard`, `RolesGuard`, `@Roles()` |
| **Config** | Variables d’environnement, validation au démarrage. | `validateConfig`, `ConfigModule` |
| **Module métier** | Domaine fonctionnel isolé : controller + service + DTOs + schémas. | `AuthModule`, `UsersModule`, `AdminModule` |
| **API** | Contrôleurs HTTP (et WebSocket) exposent uniquement des contrats stables (DTOs, codes HTTP). | Routes REST, Swagger |

### 2.3 Règles par module

- **Un module = un domaine** (auth, users, admin, challenges, …).
- **Controller** : reçoit les requêtes, valide les DTOs, délègue au **service**.
- **Service** : logique métier, accès données, pas de dépendance directe à HTTP.
- **DTOs** : entrées/sorties typées et validées (`class-validator`).
- **Schémas** : modèles de données (Mongoose) dans le module qui en est propriétaire.
- **Exports** : un module n’exporte que ce dont d’autres modules ont besoin (ex. `AuthService`, `UsersService`).

### 2.4 Sécurité

- **Authentification** : JWT (access + refresh), stratégies Passport (local, Google, GitHub), 2FA.
- **Autorisation** : guards (`JwtAuthGuard`, `RolesGuard`) et décorateur `@Roles()`.
- **Données** : validation globale (`ValidationPipe`), pas de champs arbitraires (whitelist).
- **Rate limiting** : appliqué dans `main.ts` (hors routes Swagger si besoin).
- **CORS** : configuré de façon explicite selon l’environnement.

### 2.5 Dépendances entre modules

- `AppModule` importe : `ConfigModule`, `MongooseModule`, `AuthModule`, `AdminModule`, (autres modules métier selon besoin).
- `AuthModule` importe : `UsersModule`, `SecurityEventsModule`, `PassportModule`, `JwtModule`.
- `AdminModule` importe : `MongooseModule` (User), éventuellement `UsersModule` si réutilisation de services.
- Les autres modules (challenges, competitions, etc.) sont ajoutés au fur et à mesure dans `AppModule` pour activer leurs routes.

---

## 3. Frontend (React + Vite)

### 3.1 Structure des dossiers (feature-based + shared)

```
frontend/src/
├── main.tsx
├── App.tsx
├── index.css
│
├── core/                    # Cœur applicatif (API, store racine, auth)
│   ├── api/                 # Client HTTP et couche API
│   │   ├── client.ts        # Instance Axios partagée, interceptors
│   │   ├── auth.api.ts
│   │   ├── users.api.ts
│   │   ├── admin.api.ts
│   │   └── index.ts
│   ├── store/               # Redux root
│   │   ├── store.ts
│   │   ├── hooks.ts         # useAppDispatch, useAppSelector
│   │   └── index.ts
│   └── routes/              # Définition centralisée des routes
│       ├── routes.tsx
│       └── index.ts
│
├── shared/                  # Éléments réutilisables (UI, types, hooks)
│   ├── components/          # Composants UI génériques
│   │   ├── ui/              # Boutons, inputs, modals, etc.
│   │   └── layout/          # Layout, Navbar, Footer
│   ├── hooks/               # Hooks réutilisables
│   ├── types/               # Types et constantes partagés
│   └── utils/               # Helpers purs
│
└── features/                # Un dossier par domaine métier
    ├── auth/                # Authentification
    │   ├── components/
    │   ├── pages/           # Login, Register, ForgotPassword, etc.
    │   ├── slice/           # authSlice (ou store/auth)
    │   └── index.ts
    ├── user/                # Profil utilisateur, paramètres
    │   ├── components/
    │   ├── pages/
    │   └── index.ts
    ├── admin/               # Interface admin
    │   ├── pages/
    │   └── index.ts
    ├── challenges/
    ├── competitions/
    ├── leaderboard/
    └── ...
```

### 3.2 Rôles des couches

| Couche | Rôle | Exemples |
|--------|------|----------|
| **Core** | API client unique, store Redux racine, définition des routes. | `api/client.ts`, `store/store.ts`, `routes/routes.tsx` |
| **Shared** | Composants UI, layout, types, hooks et utils sans logique métier. | `Button`, `Layout`, `Navbar`, types `User`, `FullProfile` |
| **Features** | Domaine métier : pages, composants spécifiques, slices Redux, appels API du domaine. | `auth/`, `user/`, `admin/`, `challenges/` |

### 3.3 Règles par feature

- **Feature = un domaine** (auth, user, admin, challenges, …).
- **Pages** : écrans rattachés aux routes ; ils utilisent les composants de la feature ou de `shared`.
- **Components** : composants spécifiques au domaine (ex. `EditProfileModal` dans `user`).
- **API** : les appels du domaine peuvent être dans `core/api/<domain>.api.ts` ou dans la feature ; une seule source de vérité pour le client HTTP (`core/api/client.ts`).
- **State** : slices Redux par domaine (auth, challenges, competitions, etc.) enregistrés dans `core/store`.

### 3.4 Sécurité et performance

- **Token** : stocké de façon sécurisée (ex. mémoire ou cookie si possible) ; interceptor dans `core/api/client.ts` ajoute `Authorization` depuis le stockage.
- **Routes protégées** : composant `ProtectedRoute` dans `shared/components/ProtectedRoute.tsx` – vérifie `auth.isAuthenticated` et redirige vers `/login` si besoin. À envelopper autour des routes privées (ex. `/settings/*`, `/admin/*`).
- **Admin** : route(s) réservée(s) aux rôles admin ; vérification côté backend obligatoire ; frontend peut en plus utiliser `ProtectedRoute` + vérification du rôle dans la page.
- **Performance** : lazy loading des routes par feature (`React.lazy`), code splitting par bundle.

### 3.5 Extensibilité

- Nouvelle feature : nouveau dossier sous `features/`, pages + composants + éventuellement slice et API.
- Nouvelle route : ajout dans `core/routes`.
- Nouveau composant UI générique : dans `shared/components/ui` (ou `layout`).
- Nouveau type partagé : dans `shared/types`.

---

## 4. Contrats API (Frontend ↔ Backend)

- **Backend** : Swagger (`/api`) comme référence des endpoints, DTOs et réponses.
- **Frontend** : types TypeScript alignés sur les DTOs et réponses (idéalement générés ou définis dans `shared/types` / `core/api`).
- **Erreurs** : format d’erreur commun (ex. `{ statusCode, message, error }`) ; le client les gère de façon centralisée (interceptor, toast, page d’erreur).

---

## 5. Qualité et maintenabilité

- **Tests** : tests unitaires sur services (backend) et composants/logique (frontend) ; tests e2e sur les parcours critiques.
- **Linting / format** : ESLint, Prettier, règles communes pour backend et frontend.
- **Revues** : changements par feature, respect des limites de modules (pas d’import circulaire).
- **Documentation** : README par repo, ce fichier ARCHITECTURE.md, commentaires sur les décisions non évidentes.

---

## 6. Résumé

| Aspect | Backend | Frontend |
|--------|---------|----------|
| **Unité de découpage** | Module NestJS (controller + service + DTOs + schémas) | Feature (pages + components + slice + API) |
| **Partagé** | `core/` (guards, decorators), `config/` | `core/` (api, store, routes), `shared/` (UI, types, hooks) |
| **Sécurité** | JWT, guards, ValidationPipe, rate limit | Token, ProtectedRoute, appels API authentifiés |
| **Extension** | Nouveau module + import dans `AppModule` | Nouvelle feature + routes + éventuellement slice et API |

Cette architecture vise une **séparation claire des responsabilités**, une **évolution par modules/features** et une base **maintenable et testable** pour un déploiement en production.

---

## 7. Guide d’extension

### Backend – Ajouter un module métier

1. Créer un dossier `src/<module>/` avec au minimum :
   - `<module>.module.ts` (imports, controllers, providers, exports),
   - `<module>.controller.ts`,
   - `<module>.service.ts`,
   - `dto/` et/ou `schemas/` si besoin.
2. Pour les routes protégées : importer les guards depuis `../core` (`JwtAuthGuard`, `RolesGuard`, `@Roles()`).
3. Enregistrer le module dans `app.module.ts` : `imports: [ ..., <Module> ]`.

### Frontend – Ajouter une feature

1. Créer un dossier `src/features/<feature>/` avec :
   - `pages/`, `components/`, et éventuellement `slice/`, `hooks/`.
2. Ajouter les routes dans `core/routes/AppRoutes.tsx`.
3. Si la feature a des appels API : ajouter `core/api/<feature>.api.ts` (en utilisant `apiClient` depuis `./client`) et l’exporter dans `core/api/index.ts`.
4. Créer `features/<feature>/index.ts` (barrel) pour réexporter les éléments publics de la feature.
