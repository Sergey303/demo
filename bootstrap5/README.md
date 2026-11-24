# Bootstrap 5 Dashboard Shell Demo

Compact, frontend-only dashboard demonstrating how to extend an existing React and Bootstrap 5 application without replacing its UI foundation.

## Demo

### Desktop

Workspace switching, page navigation, profile editing and display settings.

[![Desktop dashboard demo showing workspace switching, navigation, profile editing and settings](docs/media/desktop-demo.gif)](docs/media/desktop-demo.gif)

[Open the desktop GIF at full resolution](docs/media/desktop-demo.gif).

### Mobile

Responsive pages and the mobile navigation drawer.

<a href="docs/media/mobile-demo.gif">
  <img src="docs/media/mobile-demo.gif" width="320" alt="Mobile dashboard demo showing navigation, profile pages and the professional profile form">
</a>

[Open the mobile GIF at full resolution](docs/media/mobile-demo.gif).

## Features

- Responsive layout: desktop sidebar and **native Bootstrap 5 Offcanvas** on mobile.
- Six connected routes, navigation and breadcrumbs driven by a single route registry.
- In-memory workspace selection (personal, product team and research).
- Profile details and an editable professional profile with inline validation and accessible feedback.
- Overview, activity and display settings using fictional demonstration data.
- Semantic HTML, keyboard navigation and mobile-menu focus restoration.
- Subtle action-button ripple feedback that respects reduced-motion preferences.

No backend, authentication, RBAC, API, persistence or real customer data is included.

## Quick walkthrough

**Desktop (about 30–40 seconds)**

1. Open `/dashboard` to see the shared shell, sidebar, breadcrumbs and workspace overview.
2. Open **Work contexts** and select a different workspace; the current context updates in the header and dashboard.
3. Navigate to **Profile → Professional profile**, edit a field, save and return to **Profile** to see the updated values. Entering an invalid experience value (for example, 123 years) shows an immediate error.
4. Open **Settings** and toggle the compact-card and description options. The preview updates without resizing its surrounding panels.

**Mobile (about 15 seconds)**

1. Switch the viewport to 375 × 812 CSS pixels and open `/dashboard`.
2. Open the Bootstrap Offcanvas navigation, choose a page and see the menu close.
3. Open it again and press **Escape** to close it and restore keyboard focus.

All data is fictitious. Saving the professional profile updates its read-only view within the
current browser session (until a full page reload). Workspace selection is also held in memory.

## Code map

For a focused source review, these are the best starting points:

| Concern                                         | Implementation                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Responsive shell and native Bootstrap Offcanvas | [`src/shell/DashboardShell.tsx`](src/shell/DashboardShell.tsx)                   |
| Shared route registry                           | [`src/routes.ts`](src/routes.ts)                                                 |
| Navigation and breadcrumbs                      | [`src/navigation/`](src/navigation/)                                             |
| Typed workspace state and selector              | [`src/context/`](src/context/)                                                   |
| Form state and validation                       | [`src/forms/ProfessionalProfileForm.tsx`](src/forms/ProfessionalProfileForm.tsx) |
| Lightweight button ripple                       | [`src/ui/buttonRipple.ts`](src/ui/buttonRipple.ts)                               |
| Browser, interaction and layout tests           | [`tests/`](tests/)                                                               |

## Run locally

Requires Node.js `^20.19.0 || >=22.12.0` and npm.

```bash
npm ci
npm run dev
```

The URL is printed by Vite. A production build can be verified with:

```bash
npm run check
npm run check:e2e
npm run lint
npm run build
```

## Latest verified result

Last locally verified: **12 October 2026**, on the demo repository.

- **219/219 Playwright tests passed** across Chromium, Firefox and WebKit (73 per engine).
- The suite includes **108 route × viewport × engine combinations** (6 routes × 6 widths × 3 engines), plus **111 additional interaction and layout tests**.
- Checks cover navigation, mobile Offcanvas and focus restoration, profile save-to-view behavior, immediate experience validation, workspace selection, the settings preview, button feedback, and natural page scrolling.
- TypeScript checks, ESLint, Prettier and the Vite production build passed.

These are results for this standalone demo, **not** an acceptance report for another application's requirements. Lighthouse scores have **not** been measured. Playwright's WebKit engine is not the Safari browser on Apple hardware.

## Browser tests

Playwright covers all six routes at 320, 375, 768, 1024, 1280 and 1440 CSS pixels. It also checks native Offcanvas / keyboard focus, workspace selection, form validation, fixed preview dimensions, pointer affordances and action icons.

By default, tests run in Chromium:

```bash
npx playwright install chromium
npm run test:e2e
```

For the **full three-browser matrix**, first install all browsers, then enable Chromium, Firefox and WebKit explicitly. That tests **108 route × viewport × engine combinations** plus the additional functional checks. If any browser is missing, the run fails instead of silently omitting a browser.

```bash
npx playwright install chromium firefox webkit
FULL_BROWSER_MATRIX=true npm run test:e2e -- --workers=1
```

PowerShell equivalent (after installing the browsers):

```powershell
$env:FULL_BROWSER_MATRIX = "true"
npm run test:e2e -- --workers=1
Remove-Item Env:FULL_BROWSER_MATRIX
```

Playwright WebKit tests the WebKit engine, not the Safari application on Apple hardware. Only checks actually executed should be reported as passed.

## Routes

| Route                             | Page                          |
| --------------------------------- | ----------------------------- |
| `/dashboard`                      | Dashboard home                |
| `/dashboard/overview`             | Workspace overview            |
| `/dashboard/profile`              | User profile                  |
| `/dashboard/profile/professional` | Editable professional profile |
| `/dashboard/work-contexts`        | Workspace selection           |
| `/dashboard/settings`             | Local display preferences     |

## Architecture

- **One route registry** in `src/routes.ts` drives the router, navigation and breadcrumbs.
- **One shared shell** in `src/shell/` provides responsive layout and accepts navigation, breadcrumbs, context selection and page content as slots.
- **Bootstrap-first UI:** the navigation drawer uses the Bootstrap Offcanvas JavaScript API and releases instances/listeners when unmounted. CSS overrides are narrowly scoped.
- **Feature boundaries:** navigation, forms, context state and individual pages remain separate.
- **Predictable data flow:** workspace state lives in a typed React context. Unsaved form edits live in the form, while the saved profile lives in a shared React context. Changes are ephemeral and reset when the page reloads.
- **Verification:** TypeScript, ESLint, production build and Playwright browser checks.

This is an independent demonstration with invented data, not an implementation of a private customer project.

Evidence-range contract: shared validation rejects nonfinite or reversed audio timecodes and invalid document offsets before rendering search results or citations. Offline regression: `node --test tests/evidence-contract.test.mjs` (Node 24 verified).
