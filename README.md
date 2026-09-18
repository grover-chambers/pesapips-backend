# PesaPips

Private-tool trading platform: FastAPI backend + Vite/React frontend, local-first. Runs entirely on this machine — no cloud services required.

## Quickstart

```bash
./run_local.sh
```

Then open:
- UI: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

Login (local seed users):
- Admin: `brayanodira@gmail.com` / `!Nc0rr3k7`
- Demo:  `demo@pesapips.com` / `demo1234`

## Prerequisites (one-time on a fresh machine)

1. PostgreSQL 16+ running on `localhost:5432`.
   ```bash
   sudo -u postgres psql <<'SQL'
   CREATE ROLE pesapips_user LOGIN PASSWORD 'pesapips_local_2026';
   CREATE DATABASE pesapips_db OWNER pesapips_user;
   SQL
   ```
2. Python 3.13 + dependencies: `cd backend && pip install -r requirements.txt`
3. Node 22 + frontend deps: `cd frontend && npm install`
4. `.env` file in `backend/` (copy from `backend/.env.example` and fill `SECRET_KEY`, `FERNET_KEY`).

`run_local.sh` applies Alembic migrations and seeds local users automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `./run_local.sh` | Backend (`:8000`) + frontend (`:5173`) |
| `./run_local.sh --backend` | API only |
| `./run_local.sh --frontend` | UI only |
| `./run_local.sh --agent` | Local prop-eval agent (paper/advisor mode, blocks) |
| `python3 -m pytest` | Run the test suite (from `backend/`) |
| `python3 -m alembic upgrade head` | Apply DB migrations (from `backend/`) |
| `python3 -m alembic revision -m "..."` | Generate a new migration (from `backend/`) |
| `cd frontend && npm run lint` | ESLint on the frontend |
| `cd frontend && npm run build` | Production build of the frontend |

Layout: backend code lives in `backend/` (`app/`, `alembic/`, `scripts/`, ...), the web UI in `frontend/`. Logs land in `/tmp/pesapips/`.

See [AGENTS.md](./AGENTS.md) for the full agent operating guide (architecture, known issues, conventions).
