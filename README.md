# Numori Clips

**Free, open-source clipboard app with sync ability and truly multi-platform.**

## Tech Stack

- **Framework:** Nuxt 4 (Vue 3) — pure client-side SPA
- **Mobile:** Capacitor (iOS & Android)
- **Desktop:** Electron
- **Database:** Dexie (IndexedDB, client-side) + PostgreSQL (server-side)
- **Encryption:** End-to-end with AES-GCM via Web Crypto API
- **Styling:** Tailwind CSS + @tailwindcss/typography
- **i18n:** @nuxtjs/i18n
- **Icons:** Material Design Icons (MDI) via @nuxt/icon

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Start dev database (requires Docker)
npm run dev:db
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Nuxt dev server |
| `npm run dev:db` | Start PostgreSQL via Docker Compose |
| `npm run dev:desktop` | Run Electron in dev mode |
| `npm run dev:android` | Run on Android with live reload |
| `npm run dev:ios` | Run on iOS with live reload |
| `npm run build` | Build for production |
| `npm run build:desktop` | Build Electron app |
| `npm run build:phones` | Build for mobile (Capacitor sync) |
| `npm run test` | Run tests |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |

## Project Structure

```
numori-clips/
├── components/
│   ├── ui/                    # Generic UI components (Button, Modal, Input, etc.)
│   ├── settings/              # Settings modal and sections
│   ├── AppHeader.vue          # App header with navigation
│   ├── AuthModal.vue          # Login/register modal
│   ├── WelcomeWizard.vue      # First-time setup wizard
│   └── ...                    # Other generic components
├── composables/
│   ├── useAuth.js             # Authentication state and API calls
│   ├── useApi.js              # API fetch wrapper
│   ├── useAppLock.js          # App lock with biometrics
│   ├── useLocalePreferences.js # Editor and locale preferences
│   ├── usePlatform.js         # Platform detection (web/iOS/Android/Electron)
│   ├── useToast.js            # Toast notifications
│   └── ...                    # Other generic composables
├── server/
│   ├── api/auth/              # Authentication API endpoints
│   ├── utils/                 # Server utilities (db, auth, email, sessions)
│   └── plugins/               # Server plugins (migration, session purge)
├── utils/
│   ├── crypto.js              # E2E encryption (PBKDF2, AES-GCM)
│   └── normaliseName.js       # Name normalisation helpers
├── plugins/                   # Client plugins (back button, status bar, PWA)
├── electron/                  # Electron main process
├── i18n/locales/              # Translation files
├── pages/index.vue            # Main app page
├── db.js                      # Dexie (IndexedDB) schema
└── nuxt.config.ts             # Nuxt configuration
```

## License

[AGPL-3.0](LICENSE)
