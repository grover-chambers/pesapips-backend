# PesaPips — Agent Operating Guide

Read this before touching the codebase. It is the source of truth for how to run, test, and lint this project locally.

## Stack

- **Backend**: FastAPI 0.135 + SQLAlchemy 2 + Alembic + Celery (workers, optional) + Pydantic v2. Python 3.13.
- **Frontend**: Vite 8 + React 19 + react-router 7 + TanStack Query 5. Node 22.
- **Database**: PostgreSQL (local). Default: `postgresql://pesapips_user:pesapips_local_2026@localhost:5432/pesapips_db`.
- **Cache/queue (optional)**: Redis at `redis://localhost:6379/0`. Backend boots fine without it; only Celery workers and a couple of features need it.
- **LLM (optional)**: local Ollama at `http://localhost:11434/v1`. The prop-eval agent and TradingAgents framework use it. Backend boots without Ollama.

## Run locally

One command — provisions nothing, just launches what's already migrated:

```bash
./run_local.sh
```

- Backend: http://localhost:8000  (Swagger at `/docs`, health at `/health`)
- Frontend: http://localhost:5173
- Logs: `/tmp/pesapips/{backend.log,frontend.log}`

Flags: `--backend`, `--frontend`, `--agent` (prop-eval advisor, blocks), `--help` for the header.

The launcher is **idempotent**: rerunning is safe; it migrates then starts only what isn't already running.

### First-time setup (only needed once on a fresh machine)

1. PostgreSQL must be installed and running on `localhost:5432`.
2. Create the local role + database (one time, as the postgres superuser):
   ```bash
   sudo -u postgres psql <<'SQL'
   CREATE ROLE pesapips_user LOGIN PASSWORD 'pesapips_local_2026';
   CREATE DATABASE pesapips_db OWNER pesapips_user;
   SQL
   ```
3. Install Python deps: `cd backend && pip install -r requirements.txt` (or just create a venv: `python3 -m venv venv && venv/bin/pip install -r requirements.txt`).
4. Install frontend deps: `cd frontend && npm install`.
5. Copy `backend/.env.example` to `backend/.env` and fill `SECRET_KEY` and `FERNET_KEY` (see `.env.example` for the one-liner generator). `DATABASE_URL` is already defaulting to the local Postgres.

The DB migrations + local seed users (`admin`/`demo`) are applied automatically by `run_local.sh`.

### Seed credentials (local only)

- Admin: `brayanodira@gmail.com` / `!Nc0rr3k7`
- Demo:  `demo@pesapips.com` / `demo1234`

See `backend/scripts/seed_local.py`. Re-running the seed is idempotent.

## Test

```bash
(cd backend && python3 -m pytest)               # whole suite
(cd backend && python3 -m pytest tests/ -v)      # explicit
```

Frontend:

```bash
cd frontend && npm run lint                           # eslint
```

## Lint / format

No project-level Python linter is configured yet. Keep PEP 8 and `ruff check .` works against the codebase. Frontend lint: `cd frontend && npm run lint`.

## Typecheck

FastAPI + Pydantic v2 give runtime validation; no static typechecker is configured. If adding one, use `mypy app/` (already in `requirements.txt` indirectly via typing-extensions).

## Migrations

```bash
(cd backend && python3 -m alembic upgrade head)      # apply
(cd backend && python3 -m alembic current)           # show current revision
(cd backend && python3 -m alembic history)           # show chain
(cd backend && python3 -m alembic revision -m "...") # autogenerate a new revision
```

The migration chain is linear and unbroken:
`07803e85e442 (base)` → `a1b2c3d4e5f6` → `b7f3c9a1d2e4` → `c4d5e6f7a8b9 (head)`.

`backend/alembic/env.py` reads `DATABASE_URL` from `settings` (i.e., `backend/.env`). The `sqlalchemy.url` line in `backend/alembic.ini` is only a fallback and should stay empty in committed history — see the security note below.

## Environment

`backend/.env` is gitignored. Required (no default): `DATABASE_URL`, `SECRET_KEY`, `FERNET_KEY`. Everything else has a safe default in `app/core/config.py`. The Settings model uses `pydantic-settings` with `env_file = ".env"` (resolved relative to the backend working directory).

## Project layout

```
backend/
  app/              FastAPI app
    main.py         entrypoint, lifespan startup, 21 routers mounted
    core/           config, database, security, encryption, instruments, sanitize
    models/         SQLAlchemy models (User, MT5Account, Strategy, Trade, ...)
    routers/        21 API routers (auth, mt5, trading, dashboard, signal, ...)
    services/       business logic (signal_engine, autorun_engine, prop_eval_engine, ...)
    workers/        Celery tasks
    mt5_bridge/     MT5 terminal bridge
  alembic/          migrations; env.py imports app.core.config.settings
  agent/            prop_eval_agent.py — local CLI agent (paper mode)
  scripts/          seed_local.py — idempotent local user seeder
  tests/            pytest suite (currently empty — see TODO)
  TradingAgents/    vendored multi-agent LLM framework
  strategies/       strategy definitions
  mt5_ea/           MT5 Expert Advisor files
  alembic.ini
  requirements.txt
  render.yaml       Render web service definition (production)
frontend/           Vite + React 19 app
run_local.sh        local launcher (backend ops run from backend/)
```

## Architecture notes

- `app/main.py` `lifespan` starts: `restore_autorun_sessions`, `regime_scanner`, `news_filter` cache prime. Each is wrapped in try/except — a failure logs but **does not** crash startup. Check `/tmp/pesapips/backend.log` if a feature misbehaves.
- `app/core/database.py` auto-enables `sslmode=require` only when the URL contains `neon.tech`. Local Postgres needs no SSL.
- Vite proxy (`frontend/vite.config.js`) forwards only `/auth` to the backend. All other API calls use `VITE_API_URL` (`http://localhost:8000` in `.env.development`). CORS on the backend accepts `http://localhost:5173` by default.
- TradingAgents + the prop-eval agent are optional local-mode extras. The main web app does not import or start them.

## Known issues / TODOs (do not reopen without checking here)

- **`backend/alembic.ini` line 3 has a hardcoded Neon production DB URL committed to git history.** The live password must be rotated and the line replaced with an env-var lookup. `alembic/env.py` already reads from `settings.DATABASE_URL`, so the hardcoded value is purely a stale fallback — safe to blank.
- **`frontend/.env.local` contains a stale Vercel OIDC JWT** — gitignored (covered by `*.local`), but should be deleted from the working copy.
- **`backend/tests/` is empty.** No automated test coverage. Add tests before changing `signal_engine.py` or `prop_eval_engine.py`.
- **`backend/requirements.txt` numba==0.61.2 / llvmlite==0.44** may lag CPython 3.13. If a fresh venv install fails on those, drop them — they're transitive deps of `pandas-ta` and not directly imported by the web app.
- **`run_local.sh` uses system `python3`, not `venv/bin/python`.** Ensure system Python has the deps installed, or replace `python3` with `"$PWD/venv/bin/python3"` in the launcher.

## Git workflow

- `main` is the only long-lived branch. Commit style: `type: subject` (e.g. `fix: database sslmode conflict`, `feat: local-first prop-eval engine`).
- Never commit `.env`, `local_backup.dump`, `*.log`, `node_modules/`, `dist/`, `.vercel/`. All are gitignored.
