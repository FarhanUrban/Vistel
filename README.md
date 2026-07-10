# Vislet

Vislet is a mobile-first web app that simplifies applying for visas and e-visas: it tells users what documents they need, checks/scans those documents, submits the application, handles payment, and tracks status in one dashboard.

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** + TypeScript
- **Vue Router 4** — code-split routes
- **Pinia** — feature-scoped stores
- **Tailwind CSS** — design tokens from our style guide
- **Firebase** — Auth, Firestore, Storage (with mock mode for local dev)
- **Firebase Hosting** — free-tier static deploy

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs in **mock mode** by default — no Firebase account needed to explore the UI.

See [CONTRIBUTING.md](CONTRIBUTING.md) for folder map, debugging tips, and PR checklist.

## Project structure

```
src/
├── components/            # Shared UI: AppButton, AppCard, AppInput, etc.
├── features/
│   ├── auth/              # Login, signup
│   ├── onboarding/        # Visa type, passport, destination
│   ├── documents/         # Scan, upload, required list
│   ├── payments/          # Fee breakdown, checkout (mock)
│   ├── dashboard/         # Waiting, interviews, completed
│   └── admin-rejections/  # Rejection reasons and status
├── layouts/               # AuthLayout, OnboardingLayout, AppShell
├── router/                # Route definitions
├── services/              # Firebase + mock wrappers
├── stores/                # Re-exports feature Pinia stores
├── types/                 # Shared TypeScript types
└── views/                 # Thin route pages
```

## Design tokens

| Token | Value | Use |
|---|---|---|
| `navy` | `#272727` | Primary text, headers |
| `black` | `#000000` | Dark surfaces, primary buttons |
| `accent-orange` | `#FFBC1F` | Primary CTA accents |
| `accent-blue` | `#86A5D9` | Secondary accents, links |
| Display font | Lexend Mega | Logo, big headlines |
| Body font | Inter | Everything else |
| `rounded-card` | 12px | Cards |
| `rounded-control` | 8px | Buttons, inputs |

## Routes

| Path | Screen |
|---|---|
| `/welcome` | Welcome |
| `/login` | Log in |
| `/signup` | Create account |
| `/onboarding/visa-type` | Visa type select |
| `/onboarding/passport-type` | Passport type |
| `/onboarding/additional-docs` | Additional documents |
| `/onboarding/destination` | Destination country |
| `/documents/scan` | Scan documents |
| `/documents/required-list` | Required documents list |
| `/payment` | Payment |
| `/payment/success` | Payment success |
| `/dashboard` | Dashboard |
| `/about` | About us |
| `/rejections/possible-reasons` | Possible rejection reasons |
| `/rejections/why-rejected` | Why you were rejected |
| `/rejections/waiting` | Waiting for e-visa check |

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Description |
|---|---|
| `VITE_USE_MOCK_SERVICES` | `true` = mock data, no Firebase needed |
| `VITE_FIREBASE_*` | Firebase web app config (when mock is off) |

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run format    # Prettier
```

## Deploy (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

Requires Firebase CLI (`npm install -g firebase-tools`) and a configured `.firebaserc` project.

## Feature tracks (parallel development)

Each track owns a `src/features/<name>/` folder. Developers only touch `router/index.ts` and `stores/index.ts` for cross-cutting registration.

| Track | Owns | Build order |
|---|---|---|
| 6 — Shared components | `components/`, `layouts/` | First |
| 1 — Auth & onboarding | `auth/`, `onboarding/` | After Track 6 |
| 3 — Payments | `payments/` | After Track 6 (parallel with Track 1) |
| 2 — Documents | `documents/` | After onboarding store is settled |
| 5 — Rejections | `admin-rejections/` | Parallel with Track 2 |
| 4 — Dashboard | `dashboard/` | Last (aggregation) |

## Working agreements

- Branch naming: `feature/<track>-<short-desc>`
- No edits to another track's `features/` folder without heads-up
- Components never call Firebase directly — use `services/*`
- Mock mode always available via `VITE_USE_MOCK_SERVICES=true`
- Never commit real API keys

## Locked decisions

- **Backend:** Firebase (Auth + Firestore + Storage)
- **Payments:** Mock for MVP (Stripe-ready service interface)
- **Hosting:** Firebase Hosting (free Spark tier)
- **Code style:** Beginner-friendly — explicit, flat, well-named

## License

Private — Urban Arts / Vislet team.
