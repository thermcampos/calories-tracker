# AGENTS.md

## Project Overview

Food Tracker is a client-side PWA for tracking daily food intake, calories, and macronutrients. It is a single-page TypeScript application built with Vite, targeting Brazilian Portuguese users. All data is stored in Appwrite (BaaS). The app also uses Anthropic Claude AI to fetch detailed nutrition info (vitamins, minerals, benefits) for selected foods, with responses cached in `localStorage`.

- **Stack**: TypeScript, Vite, vanilla HTML/CSS, no framework.
- **Backend**: Appwrite (auth + document DB).
- **AI**: Anthropic Claude SDK (`@anthropic-ai/sdk`).
- **Deployment**: Static build (`dist/`) deployed via rsync to a VPS (`/srv/sites/calories-tracker`).
- **Live URL**: https://calories-tracker.lightroasted.vps-kinghost.net

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (default port 5173). |
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Preview the production build locally. |

No test suite, no lint script, no formatter configured.

---

## Environment Variables

All required at build time (Vite prefixes with `VITE_`). Copy `src/.env.example` to `.env` and fill in:

```
VITE_APPWRITE_ENDPOINT=
VITE_APPWRITE_PROJECT_ID=
VITE_APPWRITE_DBID=
VITE_APPWRITE_FOODENTRIESID=
VITE_APPWRITE_USERSETTINGSID=
VITE_APPWRITE_MONTLYCALORIESID=
VITE_APPWRITE_SHAREDDAYSID=
VITE_CLAUDE_API_KEY=
```

**Important**: `VITE_APPWRITE_PROJECT_ID` is also hardcoded in `src/appwrite.ts` (line 9) as `"684ac3bf000ee8950f5a"`. The `client.setProject()` call uses this literal, not the env var. The endpoint and collection IDs do come from env vars.

---

## Project Structure

```
calories-tracker/
├── src/
│   ├── index.ts           # Main entry: auth init, event listeners, food logic, calendar, settings
│   ├── types.ts           # Shared TypeScript types
│   ├── appwrite.ts        # Appwrite client, auth class, DB class
│   ├── auth.ts            # Auth UI helpers (show/hide forms, toggle login/register)
│   ├── state.ts           # Global mutable appState object
│   ├── foodDatabase.ts    # Hardcoded local food array (per 100g, Brazilian names)
│   ├── claudeService.ts   # Claude AI nutrition fetcher + localStorage cache
│   ├── dateUtils.ts       # Timezone-aware current date via timeapi.io
│   ├── DomUtils.ts        # Typed DOM getters that throw if element missing
│   ├── Utils.ts           # UI helpers: loading, mobile menu, search nav, icons
│   └── vite-env.d.ts      # Vite client types
├── index.html             # Single-page markup (auth modal, landing, app content, settings)
├── style.css              # Main styles
├── auth.css               # Auth-related styles
├── settings.css           # Settings page styles
├── assets/                # PWA icons (many sizes)
├── vite.config.js         # Vite + PWA plugin config
├── package.json
├── tsconfig.json
└── .github/workflows/
    ├── ci.yml             # PR build check
    └── deploy.yml         # Build + rsync deploy on push to main
```

---

## Architecture & Control Flow

### Entry Point (`src/index.ts`)

1. Registers the PWA service worker via `virtual:pwa-register`.
2. On `DOMContentLoaded`, calls `initializeAuth()`.
3. `initializeAuth()` checks for `?share=<id>` in the URL. If present, loads a shared read-only view (no login required).
4. Otherwise, checks Appwrite session. If logged in → `showMainApp()` → `initTimezone()` → `selectDate(selectedDate)`. If not → show auth forms.

### Auth (`src/appwrite.ts`, `src/auth.ts`)

- `AppwriteAuth` class wraps Appwrite `Account` methods (register, login, logout, getCurrentUser, isLoggedIn).
- `AppwriteDB` class wraps Appwrite `Databases` for all collections.
- `auth.ts` only handles DOM class toggling for showing/hiding login/register forms and the auth modal.

### State (`src/state.ts`)

A single mutable object `appState` holds:
- `currentHighlightIndex` (keyboard search nav)
- `searchTimeout`, `searchResults`
- `calendarMonthlyCalories` (for calendar dots)
- `isSharedView`, `sharedData`
- `userTimezone`, `todayDateString`

This is the only global state; everything else is local variables in `index.ts`.

### Food Data (`src/foodDatabase.ts`)

Hardcoded array of ~140 Brazilian foods with per-100g macros. Each item has:
- `name` (Portuguese), `nameEn` (English)
- `info`: `calories`, `protein`, `fat`, `carbs`, `fiber`, `category`, `alkaline`, `bestFor`
- Categories: `fats`, `proteins`, `carbs`, `leaves`, `fruits`, `low carb`, `dairy`

Portions are calculated by multiplying per-100g values by `grams / 100`.

### Search & Selection

- Real-time search on `foodSearchInput` with a 300ms debounce (`QUICK_DELAY`).
- Searches both Portuguese and English names, with accent-insensitive matching via `getCleanName()` (strips `áãâêéóúç`).
- Keyboard navigation (up/down arrows) updates `appState.currentHighlightIndex`.
- Selecting a food shows a preview card with calculated macros for the entered gram amount.

### Meal Periods

Food entries are grouped into `MealPeriod`s:
`pre-workout`, `breakfast`, `second-breakfast`, `lunch`, `snacks`, `dinner`, `night-snacks`.

Each entry is stored in Appwrite with `time` (HH:MM) and `date` (YYYY-MM-DD). The UI groups entries by period based on the `time` field.

### Calendar

- A custom-built calendar renders days for the current month.
- Days with food entries show a dot and total calories.
- Clicking a day calls `selectDate()` to load that day's entries.
- Monthly calorie totals are fetched from the `monthlyCalories` collection (one doc per day with `totalCalories`).

### Settings / Goals

- `UserSettings` collection stores both global settings (body weight, height, BMI, timezone) and named nutrition goals.
- Global settings are identified by the absence of `goalName`.
- Goals have `goalName`, macro targets, and `isActive`. Only one goal can be active at a time.
- The settings page also shows AI nutrition cache stats and allows clearing the cache.

### AI Nutrition (`src/claudeService.ts`)

- When the user enables the AI checkbox and selects a food, `getNutritionInfo(foodName)` is called.
- It calls Claude Haiku with a prompt requesting vitamins, minerals, benefits, and notes in Brazilian Portuguese, formatted as JSON.
- Results are cached in `localStorage` with key prefix `nutrition_cache_<foodName>_<grams>`.
- The cache is cleared via a button in settings.

### Sharing

- Users can share a day's food log. This creates a doc in the `sharedDays` collection with a unique `shareId`.
- The share link is `?share=<shareId>`.
- Shared views are read-only and do not require authentication.

### Timezone Handling (`src/dateUtils.ts`)

- If the user sets a timezone in settings, `getCurrentDate()` fetches the current date from `timeapi.io` for that timezone.
- Falls back to browser local time if the API fails or no timezone is set.
- This ensures the "today" date is correct for users in different timezones.

---

## Build / Deploy

- **CI** (`.github/workflows/ci.yml`): Runs `npm ci` + `npm run build` on PRs to `main`. Uses self-hosted runner `easynode-debian`.
- **Deploy** (`.github/workflows/deploy.yml`): Same build, then rsyncs `dist/` to `deploy@<host>:/srv/sites/calories-tracker/`. Also runs on `workflow_dispatch` and push to `main`.
- Both workflows inject Appwrite and Claude secrets as env vars during build.

---

## Code Conventions

- **Imports**: Mix of `.js` extensions (`./types.js`, `./appwrite.js`) and extensionless (`./DomUtils`, `./auth`). The Vite/TS config uses `"moduleResolution": "bundler"`, so both work. Follow existing pattern in each file.
- **DOM access**: Prefer typed helpers from `DomUtils.ts` (`getInputById`, `getDivById`, `getButtonById`). These throw if the element is missing, which is useful for catching typos but can crash if elements are conditionally rendered.
- **Error handling**: Most async operations wrap errors in `try/catch`, show `swal` alert to user, and `console.error` details.
- **Logging**: Uses `console.debug` for successful operations and `console.error` for failures.
- **Styles**: Three separate CSS files (`style.css`, `auth.css`, `settings.css`) loaded in `index.html`. No CSS preprocessor.
- **No tests**: There is no test framework configured.

---

## Important Gotchas

1. **Hardcoded Appwrite Project ID**: `src/appwrite.ts:9` hardcodes the project ID. If the Appwrite project changes, this must be updated manually.
2. **PWA plugin disabled in dev**: `vite.config.js` has `devOptions: { enabled: false }`. Service worker and PWA features only work in preview/production builds. Do not expect PWA behavior during `npm run dev`.
3. **Date timezone offset logic**: Appwrite stores dates as `YYYY-MM-DD` strings derived from `new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()`. This converts local time to UTC midnight before extracting the date string. Be careful when modifying date handling.
4. **Shared view bypasses auth**: The `?share=` query param completely skips the auth flow. Any changes to auth initialization must preserve this behavior.
5. **Claude model is pinned**: `claudeService.ts` uses `claude-haiku-4-5-20251001`. If this model is deprecated, the call will fail.
6. **Food database is static**: All food data is in a single hardcoded array. Adding new foods requires editing `foodDatabase.ts` directly.
7. **No routing library**: All "views" (landing, auth modal, app content, settings, shared view) are sections in `index.html` shown/hidden via CSS `hidden` class. State is managed by DOM visibility, not a router.
8. **Bulk delete uses `deleteUserSettings`**: In `index.ts`, `handleBulkDelete` calls `fetchUserSettings`, which internally calls `AppwriteDB.deleteUserSettings`. This naming is confusing but intentional for that specific flow.
9. **Monthly calories day calculation changed after 2025-10-31**: `fetchCaloriesCurrentMonth` has a conditional that changes how the day value is calculated for dates on or after Oct 31, 2025. This affects calendar dot positioning.
10. **Vite config `include` field**: `vite.config.js` has `include: ['src', 'vite-end.d.ts']` at the top level of the config object. This is non-standard Vite config but appears to work with the current setup.
