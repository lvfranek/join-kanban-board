# 📋 Join

A task manager inspired by the Kanban system. Create and organize tasks using drag and drop, assign users and categories to keep your team aligned and productive. Built as an Angular single-page app that runs on either Supabase or a self-hosted MariaDB backend.

![Join Kanban Board](public/join.png)

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Live Demo](#live-demo)
- [Installation](#️-installation)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [Tests](#tests)
- [Deployment](#deployment)
- [License](#license)

## Tech Stack

- `Angular` (standalone components, signals, lazy-loaded routes)
- `TypeScript`
- `SCSS`
- `Taiga UI`
- `Supabase` (default backend)
- `Express` + `MariaDB` (optional self-hosted backend)
- `Vitest`

## Features

- **Kanban board** — create, edit and organize tasks in status columns.
- **Drag and drop** — move tasks between columns with the Angular CDK.
- **Task details** — priority, category, subtasks, due date and assigned contacts.
- **Contacts** — manage the people tasks can be assigned to.
- **Summary dashboard** — task counts per status and the next upcoming deadline.
- **Auth** — email registration and login, plus a guest login that needs no account.
- **Swappable backend** — the same app runs against Supabase or an Express/MariaDB API, selected by one environment variable.

## Live Demo

[join-phi-lemon.vercel.app](https://join-phi-lemon.vercel.app/) — use "Guest login" to try it without an account.

## ⚙️ Installation

**Prerequisites:** Node.js 20+, npm 11+, and either a Supabase project or a local MariaDB instance.

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/lvfranek/Join.git
   cd Join
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in the values for your backend. For Supabase set `DB_PROVIDER=supabase`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`; for MariaDB set `DB_PROVIDER=mariadb` and the `MARIADB_*` plus `JWT_SECRET` values.

4. Set up the database schema — see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for Supabase or [docs/MARIADB_SETUP.md](docs/MARIADB_SETUP.md) for MariaDB.

5. Only when using MariaDB, start the API in a second terminal:

   ```bash
   cd server
   npm install
   npm run migrate && npm run seed
   npm run dev
   ```

6. Start the app:

   ```bash
   npm start
   ```

   Open `http://localhost:4200/`. The app reloads automatically when you change a source file.

## Environment Variables

All variables live in `.env` at the project root. `npm start` and `npm run build` run `scripts/set-env.js`, which writes the browser-safe values into the generated Angular environment file.

| Variable | Description | Required |
|---|---|---|
| `DB_PROVIDER` | Backend to use: `supabase` or `mariadb` | Yes |
| `SUPABASE_URL` | Supabase project URL | With `supabase` |
| `SUPABASE_ANON_KEY` | Supabase public anon key | With `supabase` |
| `SUPABASE_SERVICE_KEY` | Service key for seeding scripts, server-side only | No |
| `API_URL` | Base URL of the Express API | With `mariadb` |
| `MARIADB_HOST` / `MARIADB_PORT` | MariaDB connection host and port | With `mariadb` |
| `MARIADB_USER` / `MARIADB_PASSWORD` | MariaDB credentials | With `mariadb` |
| `MARIADB_DATABASE` | MariaDB database name | With `mariadb` |
| `MARIADB_CONNECTION_LIMIT` | Connection pool size | No |
| `JWT_SECRET` | Secret used by the API to sign auth tokens | With `mariadb` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` | No |
| `SERVER_PORT` | Port the Express API listens on | No |
| `CORS_ORIGIN` | Allowed origin for the API, e.g. `http://localhost:4200` | With `mariadb` |

Only `DB_PROVIDER`, `API_URL`, `SUPABASE_URL` and `SUPABASE_ANON_KEY` ever reach the browser. Every other variable is read by the Node backend and the setup scripts.

## Available Scripts

| Command | What it does |
|---|---|
| `npm start` | Generates the environment file and serves the app on port 4200 |
| `npm run build` | Generates the environment file and builds to `dist/` |
| `npm run watch` | Development build that rebuilds on change |
| `npm test` | Runs the unit tests with Vitest |
| `npm run set-env` | Writes the Angular environment file from `.env` |

In `server/`: `npm run dev` (API with watch mode), `npm run migrate` (create schema), `npm run seed` (seed an admin user), `npm start` (API without watch).

## Architecture

The Angular app never talks to a database directly. Services in `src/app/core/services` expose one interface for tasks, contacts and auth, and dispatch to the backend chosen by `DB_PROVIDER`.

```
Angular SPA ──┬── Supabase JS client ──── Supabase (Postgres + Auth)
              └── HTTP ──── Express API ──── MariaDB
```

Routes are lazy-loaded and split into a public shell (welcome, help, legal pages), an authenticated area guarded by `authGuard` (summary, board, add task, contacts) and an auth shell guarded by `guestGuard` (login, register).

## Tests

Unit tests cover the routed feature components, shared components and the Supabase service. They run in jsdom via Vitest:

```bash
npm test
```

## Deployment

The app is deployed on Vercel as a static Angular build. Set the same environment variables in the Vercel project settings — `scripts/set-env.js` reads them from `process.env` when no `.env` file is present — and use `npm run build` with `dist/demo-join/browser` as the output directory. The MariaDB backend in `server/` is not part of the Vercel deployment; the hosted demo runs on Supabase.

## License

MIT — see [LICENSE](LICENSE).
