# 📌 Working Context — Learn Blazingly Fast

> Living continuity doc. Read this first when resuming work. It captures **what's in
> flight, what's verified, and how to pick up** — so an interrupted session doesn't
> start from a blank slate. Update it at the end of any meaningful work chunk.

**Last updated:** 2026-09-03
**Repo:** `/Users/emmanuelekundayo/Documents/Learning-Platform` (macOS) · branch `main`
**See also:** [`MINDMAP.md`](./MINDMAP.md) for architecture.

---

## Current Status: ✅ Green, Verified & Secure

| Check | Result |
|---|---|
| `npm test` (`vitest run`) | **66 tests / 6 files passing** |
| `node scripts/validate_concepts.js` | **424 / 424 concepts successfully validated (0 errors)** |
| `node scripts/validate_prerequisites.js` | **18 / 18 concepts with prerequisites validated** |
| `npm run build` (`vite build`) | **passes with optimized `manualChunks`** (~21s) |
| `npm run lint` | **0 errors, 45 warnings** (down from 101) |
| `npm audit` | **8 vulnerabilities** (down from 15; remaining are dev-only or require breaking upgrades) |
| `npm run server` | Express API on port 3001 with auth, Helmet, rate limiting, CORS, input validation |
| `npm run dev` | Frontend on port 5173 with Vite proxy configured |

---

## What was built & polished (Full Platform Completion)

1. **Concept Pages & Visualization Engine**:
   - Slug/ID resolution in `conceptStore.js` and `projectStore.js` (fixed 404s on related concept links).
   - All 15 visualization types active with `StepControls`, playback controls, annotations, and responsive layout.

2. **Micro-Exercise Engine (All 5 Types)**:
   - `FillInBlank.jsx` — Monaco Editor + Pyodide runtime with term validator fallback.
   - `ComplexityQuiz.jsx` — Interactive Time & Space Big-O selector.
   - `SpotTheBug.jsx` — Line-click bug detection and diagnosis selector.
   - `OrderSteps.jsx` — Interactive pseudocode and algorithm step ordering with visual validation.
   - `TraceOutput.jsx` — Prediction of return values and output with variable state trace.
   - All 5 types registered in `Concept.jsx` and exported from `src/components/exercises/index.js`.

3. **Code Playground (`/playground`)**:
   - Dual-language runner: Python (Pyodide WASM) + JavaScript (sandboxed in `<iframe sandbox="allow-scripts">`).
   - Challenge test harness and dual-editor comparison mode.

4. **Roadmaps, Math Tricks & Cheatsheets**:
   - 4 career roadmaps with progress tracking and certificate generator.
   - 28 cheatsheets with syntax highlighting, search/filter, and one-click copy.
   - Interactive Math Tricks catalog with animated matplotlib plots via Pyodide.

5. **Leaderboard & Reviews**:
   - Express API with Helmet, rate limiting, CORS, input validation, body size limits.
   - Vercel serverless functions (`api/reviews.js`, `api/support-status.js`) hardened with same validation.
   - Vite proxy rules in `vite.config.js` for `/api/reviews` and `/api/leaderboard`.

6. **Production Build & Code-Splitting**:
   - `manualChunks` in `vite.config.js` (`vendor-core`, `vendor-d3`, `vendor-framer`, `vendor-export`, `vendor-monaco`).

---

## Security Hardening (2026-09-03)

1. **Express Server** (`server/index.js`):
   - `helmet()` for security headers (CSP, X-Frame-Options, HSTS).
   - `express-rate-limit` — 100 req/15min general, 20 req/15min on writes.
   - `express.json({ limit: '10kb' })` body size cap.
   - CORS with configurable `ALLOWED_ORIGINS` env var.
   - Input sanitization: `sanitizeString()`, `sanitizeInt()`, email regex validation.
   - Reviews no longer store phone/email PII.

2. **Playground Sandbox** (`src/utils/sandbox.js`):
   - User JS runs in `<iframe sandbox="allow-scripts">` — no DOM/cookie/localStorage access.
   - Communication via `postMessage` only. Frame destroyed after each run.

3. **Vercel Security Headers** (`vercel.json`):
   - `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
   - `Cache-Control: immutable` on `assets/` for static files.

4. **Dependency Audit**:
   - `npm audit fix` patched 7 vulnerabilities (15 → 8). Remaining require breaking upgrades (Vite 8, React Router 7).

---

## Reliability Improvements (2026-09-03)

1. **Error Boundary** (`src/components/ui/ErrorBoundary.jsx`):
   - Class component wrapping entire `<Routes>` tree in `App.jsx`.
   - Catches render crashes with fallback UI (Try Again / Go Home).
   - Dev-only stack trace display.

2. **Unhandled Promises Fixed**:
   - `App.jsx`: `loadData()` wrapped in try/catch.
   - `Leaderboard.jsx`: `handleOptOut` fetch wrapped in try/catch.

---

## Code Quality (2026-09-03)

- **Stale files removed**: `tmp/`, `build_log.txt`, `build_output.txt`, 4 migration scripts in `scripts/`.
- **Shared Monaco config** extracted to `src/utils/monacoConfig.js` (was duplicated in Playground + FillInBlank).
- **12 files cleaned** of unused imports (`useNavigate`, `useCallback`, `useMemo`, `useState`, `useAuthStore`, `initPyodide`).
- **ESLint config improved**: false positive fix for `motion` JSX usage, `argsIgnorePattern`.
- **Lint**: 101 warnings → 45 warnings, 0 errors.

---

## New Features (2026-09-03)

1. **Authentication System**:
   - JWT-based auth with httpOnly cookies (`server/auth.js`).
   - Register, login, logout, profile update endpoints.
   - `requireAuth` and `optionalAuth` middleware (`server/middleware.js`).
   - Database abstraction layer (`server/store.js`) — JSON-file-backed Store class.
   - Frontend `AuthModal` component with Sign In / Sign Up tabs.
   - `authStore.js` upgraded to use API calls with backward compatibility.
   - Reviews now require authentication; leaderboard supports optional auth.

2. **Mobile Responsive Polish**:
   - Visualization components (ArrayBars, GraphCanvas) scale down on mobile.
   - SVG/Canvas containers use `overflow-x-auto` for horizontal scroll.
   - Exercise sections use responsive padding (`px-3 sm:px-5`).
   - Most components already used `viewBox` + `width="100%"` for responsiveness.

3. **Search UX**:
   - Filter pills: All / Concepts / Projects / Cheat Sheets (type-based faceting).
   - Matched text highlighting with `<mark>` tags in result titles.
   - Improved empty state with search tips.
   - Keyboard navigation (↑↓ Enter Escape) already functional.

4. **Onboarding Tour**:
   - 5-step guided tour (Welcome, Browse, Playground, Progress, Start).
   - Trigger button (bottom-right `?`) for first-time users.
   - Tour completion persisted in localStorage (`lbf_onboarding_complete`).
   - Keyboard navigation (Enter/Space/Escape/Arrow keys).

5. **Concept Prerequisites**:
   - 18 concepts now have prerequisite links (e.g., Dijkstra → BFS, A* → BFS + Dijkstra).
   - Concept pages show prerequisite cards with completion status.
   - Validation script: `node scripts/validate_prerequisites.js` (18/18 passing).

6. **Cheatsheet PDF Export**:
   - "Export PDF" button on cheatsheet detail pages.
   - Uses `html2canvas` + `jsPDF` for paginated A4 landscape PDFs.

7. **Open Graph / SEO**:
   - `<SEO>` component renders OG + Twitter meta tags via `react-helmet-async`.
   - Per-page meta: Home, Concept, Browse, CheatSheet, Projects, Roadmaps, Playground, Leaderboard, Math.
   - Dynamic meta for concept/project/cheatsheet/roadmap detail pages.

8. **Dark/Light Theme Toggle**:
   - Zustand store (`src/store/themeStore.js`) with localStorage persistence.
   - CSS custom properties switch surface colors based on `.dark` class on `<html>`.
   - Flash-prevention script in `index.html` reads theme before React renders.
   - `ThemeToggle` button in Layout header (Sun/Moon icons from lucide-react).
   - Tailwind `darkMode: 'class'` strategy; light theme defaults, dark overrides.

9. **Progress Sync to Auth**:
   - Server endpoints: `GET /api/progress` and `PUT /api/progress` (require auth).
   - Progress saved per-user in `server/data/progress/<email>.json`.
   - Debounced sync (2s) after `recordAttempt` and `markViewed` when logged in.
   - Merge strategy: server wins if it has more passed exercises.
   - `syncFromServer()` called on auth init in `App.jsx`.
   - localStorage remains primary; server sync is supplementary.

10. **Dynamic OG Images**:
    - `api/og.js` Vercel serverless function generates SVG-based OG images.
    - Domain-colored accents, grid pattern, title, domain badge, category, branding.
    - URLs: `/api/og?title=...&domain=...&category=...`
    - Cache-Control headers for CDN caching.

11. **API Versioning**:
    - All REST endpoints moved under `/api/v1/` prefix.
    - Server routes, Vercel serverless functions, frontend fetch calls, and Vite proxy all updated.
    - `api/og` kept at `/api/og` (image generator, not REST).

12. **Vite 8 Upgrade**:
    - Vite 5.4 → 8.2 (Rolldown-powered bundler).
    - `@vitejs/plugin-react` 4.7 → 6.1.
    - Config: `build.rollupOptions` → `build.rolldownOptions`.
    - Build time improved (~7s vs ~21s).

13. **E2E Tests (Playwright)**:
    - 16 tests across 4 files: navigation, concept, search, playground.
    - `npm run test:e2e` / `npm run test:e2e:ui` scripts added.
    - Config: `playwright.config.js` with Chromium, headless, webServer auto-start.

14. **React Router v7 Upgrade**:
    - `react-router-dom@6` → `react-router@7.18.3` (library mode, backwards-compatible).
    - All 19 source files updated imports from `react-router-dom` → `react-router`.
    - Cheatsheet code examples left as-is (educational content).
    - Build passes, 66 tests passing.

---

## How to run / verify

```bash
npm test                             # vitest run — 66 passing
node scripts/validate_concepts.js    # 424 concepts passing
node scripts/validate_prerequisites.js  # 18 prerequisites passing
npm run lint                         # 0 errors, 45 warnings
npm run typecheck                    # tsc --noEmit (0 errors)
npm run build                        # optimized production build (~7s)
npm run server                       # backend API server (port 3001)
npm run dev                          # frontend dev server (port 5173)
npm run test:e2e                     # Playwright E2E tests (16 tests)
```

---

## TypeScript Migration (STARTED 2026-09-03)

> Infrastructure set up; only 3 example files converted. Plain JS still works alongside TS.

1. **TypeScript deps installed**: `typescript` v6.0.3, `@types/react`, `@types/react-dom`, `@types/node`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`.
2. **`tsconfig.json` created**: strict, ES2022, bundler resolution, `@/*` path alias, `noEmit`, `noUncheckedIndexedAccess`.
3. **`vite.config.js`**: added `resolve.alias` `@` → `./src`.
4. **`eslint.config.js`**: added TypeScript section for `src/**/*.{ts,tsx}` using `@typescript-eslint` recommended rules.
5. **`package.json`**: added `"typecheck": "tsc --noEmit"`.
6. **Converted files** (3 examples):
   - `src/store/themeStore.js` → `.ts` — Zustand typed `Theme`/`ThemeState`.
   - `src/utils/seo.js` → `.ts` — `Concept`/`Project`/`Cheatsheet`/`Roadmap`/`PageMeta`/`ArticleMeta` interfaces.
   - `src/components/ui/ThemeToggle.jsx` → `.tsx` — no structural change needed.
7. Imports in `Layout.jsx` and all `src/pages/*` updated (extensionless resolution).

**Next steps**: incrementally convert more `src/utils/*`, `src/store/*`, and `src/components/ui/*` to `.ts`/`.tsx`, then broader migration. Full list in Known Gaps below.

---

## Known Gaps / Next Steps

> Almost feature-complete. Remaining work is incremental polish.

### High Priority (Product Completeness)
- [ ] **Concept progress persistence** — `progressStore.js` uses localStorage; lost on clear. Auth progress sync not yet implemented.
- [ ] **TypeScript migration** — infra set up, only 3 example files converted. Continue converting `src/utils/*`, `src/store/*`, `src/components/ui/*` next.

### Medium Priority (UX)
- [ ] **Social sharing images** — OG meta tags exist but no dynamic OG image generation per concept.
