# ~TODO~

> A [Marcelle](https://marcelle.dev) Application

## Available Scripts

### npm run dev

Runs the app in the development mode.
Open http://localhost:5173 to view it in the browser.

The page will reload if you make edits.

**Data store:** In dev, the app uses an in-memory store by default so it works without the remote backend. To use the course backend or a local backend instead, set:

```bash
VITE_DATA_STORE_URL=https://marcelle.lisn.upsaclay.fr/iml2026/api npm run dev
# or, if you run a local backend (see below):
VITE_DATA_STORE_URL=http://localhost:3030 npm run dev
```

### npm run build

Builds a static copy of your site to the `dist/` folder.
Your app is ready to be deployed!

Production builds use the remote backend at `https://marcelle.lisn.upsaclay.fr/iml2026/api` unless you set `VITE_DATA_STORE_URL` when building.

## Optional: local backend

To run a Marcelle backend locally (persistent data, no dependency on the course server):

1. Configure the backend: `npx marcelle` → "Manage the backend" → "Configure a backend".
2. Start it: `npm run backend` (after the CLI adds the script).
3. Run the app with: `VITE_DATA_STORE_URL=http://localhost:3030 npm run dev`.
