# Contributing to Vislet

Welcome! This guide helps beginner and intermediate developers get started quickly.

## Quick start

```bash
git clone https://github.com/FarhanUrban/vislet.git
cd vislet
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173 — the app runs in **mock mode** by default (no Firebase setup needed).

## Folder map

| I want to edit… | Go here |
|---|---|
| Login / signup screens | `src/features/auth/components/` |
| Onboarding steps | `src/features/onboarding/components/` |
| Document scan / upload | `src/features/documents/components/` |
| Payment screen | `src/features/payments/components/` |
| Dashboard | `src/features/dashboard/components/` |
| Rejection screens | `src/features/admin-rejections/components/` |
| Shared buttons, inputs, cards | `src/components/` |
| Page layouts (auth, onboarding, app shell) | `src/layouts/` |
| Routes (URLs) | `src/router/index.ts` |
| API / Firebase calls | `src/services/` |
| Fake data for development | `src/services/mocks/` |
| Pinia stores | `src/features/<feature>/store.ts` |
| TypeScript types | `src/types/` or `src/features/<feature>/types.ts` |

## Data flow

Every screen follows the same pattern:

```
View (thin wrapper)
  → Feature Component (UI + user actions)
    → Pinia Store (state, loading, errors)
      → Service (Firebase or mock)
```

**Rule:** Components and stores never import Firebase directly. Always go through `src/services/`.

## Debugging

### Vue DevTools

Install the [Vue DevTools](https://devtools.vuejs.org/) browser extension. Pinia stores show `user`, `isLoading`, `error`, and feature-specific state.

### Console logs

Mock services log every call with a prefix like `[authService] mock signIn`. Open the browser console to trace what happened.

### Mock mode toggle

In `.env`:

```
VITE_USE_MOCK_SERVICES=true   # no Firebase needed
VITE_USE_MOCK_SERVICES=false  # requires real Firebase credentials
```

### Common issues

| Problem | Fix |
|---|---|
| "Please complete onboarding first" | Go through `/onboarding/*` routes or check localStorage key `vislet_onboarding` |
| Blank page after build | Check browser console; ensure `npm run build` succeeded |
| Firebase errors | Confirm `.env` has valid keys and `VITE_USE_MOCK_SERVICES=false` |

## Code style

Follow the patterns in existing files:

1. **`<script setup>` order:** imports → props/emits → stores → refs → functions → lifecycle
2. **Stores:** always expose `isLoading` and `error` for async actions
3. **Templates:** keep logic in computed/functions, not inline in template
4. **Naming:** `AppButton` (shared), `LoginForm` (feature), `LoginView` (route page)
5. **Tailwind:** use design tokens (`text-navy`, `bg-accent-orange`) — no hardcoded hex in components

## Branch naming

```
feature/<track>-<short-desc>
```

Examples: `feature/documents-scan-upload`, `feature/auth-google-signin`

## PR checklist

Before opening a pull request:

- [ ] Changes stay inside your assigned `features/` folder (or `components/` / `layouts/` for Track 6)
- [ ] No direct Firebase imports in components or stores
- [ ] Async flows have `isLoading` + `error` in the store
- [ ] Mock mode still works with default `.env.example` values
- [ ] New env vars added to `.env.example` and `src/env.d.ts`
- [ ] Component is under ~150 lines (split if larger)

## Firebase setup (when ready)

1. Create a project at [Firebase Console](https://console.firebase.google.com) (Spark/free plan)
2. Enable **Authentication** (Email + Google), **Firestore**, **Storage**, **Hosting**
3. Copy web app config into `.env`
4. Set `VITE_USE_MOCK_SERVICES=false`
5. Deploy: `npm run build && firebase deploy --only hosting`
