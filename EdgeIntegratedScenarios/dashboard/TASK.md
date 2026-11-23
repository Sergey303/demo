# EIS-00-UI — bundled evidence dashboard

Read-only React and Vite dashboard for the two checked-in version 1 snapshots.
The Vite config validates the files before bundling. Base SHA
`c2969b38c8a4c762eccab931a747701a4ea54881`.

Verified with Node 24.20.0 and npm 11.19.0: `npm ci --cache .npm-cache --no-audit --no-fund`,
`npm test` (6 passed), and `npm run build` (Vite 7.3.8).
A headless Chromium smoke check on the production preview covered status labels,
recorded figures, keyboard skip and source disclosure, horizontal overflow,
and page requests at 320px and 1280px.

- [ ] Add repeatable browser coverage for failure views and screen-reader checks.
- [ ] Add a version-specific reader when the evidence contract evolves.
