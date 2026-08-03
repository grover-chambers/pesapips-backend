#!/usr/bin/env bash
# PesaPips — private-tool local launcher.
#
#   ./run_local.sh              # backend (:8000) + frontend (:5173)
#   ./run_local.sh --backend    # API only
#   ./run_local.sh --frontend   # UI only (needs backend running)
#   ./run_local.sh --agent      # local prop-eval agent (advisor/paper mode)
#
# Everything runs on this machine: local Postgres, local backend, local
# frontend, local Ollama. No cloud services required.
set -euo pipefail

cd "$(dirname "$0")"

DB_URL="${DATABASE_URL:-postgresql://pesapips_user:pesapips_local_2026@localhost:5432/pesapips_db}"
BACKEND_PORT=8000
FRONTEND_PORT=5173
LOG_DIR=/tmp/pesapips
mkdir -p "$LOG_DIR"

log()  { printf '\033[1;33m[pesapips]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[pesapips] %s\033[0m\n' "$*" >&2; exit 1; }

# ── Preflight ────────────────────────────────────────────────────────
preflight() {
  if ! command -v psql >/dev/null 2>&1; then
    fail "psql not found. Install PostgreSQL first: sudo apt install postgresql"
  fi
  if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    fail "Postgres is not accepting connections on localhost:5432. Start it: sudo service postgresql start"
  fi
  if ! python3 -c "import fastapi, sqlalchemy" >/dev/null 2>&1; then
    fail "Python deps missing. Install them: pip install -r requirements.txt"
  fi
  if ! curl -s -m 2 "$DB_URL" >/dev/null 2>&1; then :; fi
  log "preflight OK (Postgres up, deps present)"
}

# ── Migrate + seed ───────────────────────────────────────────────────
db_migrate() {
  log "applying migrations..."
  python3 -m alembic upgrade head
  log "seeding local users (admin + demo)..."
  python3 scripts/seed_local.py
}

# ── Backend ──────────────────────────────────────────────────────────
start_backend() {
  if curl -s -m 2 http://localhost:$BACKEND_PORT/ >/dev/null 2>&1; then
    log "backend already running on :$BACKEND_PORT"
    return
  fi
  log "starting backend on :$BACKEND_PORT"
  setsid nohup python3 -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" \
    > "$LOG_DIR/backend.log" 2>&1 < /dev/null &
  for _ in $(seq 1 30); do
    curl -s -m 1 http://localhost:$BACKEND_PORT/ >/dev/null 2>&1 && { log "backend ready"; return; }
    sleep 1
  done
  fail "backend failed to start — see $LOG_DIR/backend.log"
}

# ── Frontend ─────────────────────────────────────────────────────────
start_frontend() {
  if ! command -v npm >/dev/null 2>&1; then
    fail "npm not found. Install Node.js first."
  fi
  log "starting frontend on :$FRONTEND_PORT (vite dev)"
  ( cd frontend && setsid nohup npm run dev -- --port "$FRONTEND_PORT" --strictPort \
      > "$LOG_DIR/frontend.log" 2>&1 < /dev/null & )
  for _ in $(seq 1 30); do
    curl -s -m 1 -o /dev/null http://localhost:$FRONTEND_PORT/ 2>/dev/null && { log "frontend ready at http://localhost:$FRONTEND_PORT"; return; }
    sleep 1
  done
  fail "frontend failed to start — see $LOG_DIR/frontend.log"
}

# ── Agent ────────────────────────────────────────────────────────────
start_agent() {
  shift 2>/dev/null || true
  log "starting prop-eval agent (paper/advisor mode) — Ctrl+C to stop"
  exec python3 agent/prop_eval_agent.py "$@"
}

case "${1:-}" in
  --backend)  preflight; db_migrate; start_backend; log "API:  http://localhost:$BACKEND_PORT/docs" ;;
  --frontend) start_frontend ;;
  --agent)    start_agent ;;
  --help|-h)  grep '^#' "$0" | sed 's/^# \{0,1\}//' ; exit 0 ;;
  "")
    preflight
    db_migrate
    start_backend
    start_frontend
    log "ALL SYSTEMS LOCAL"
    log "  API:  http://localhost:$BACKEND_PORT/docs"
    log "  UI:   http://localhost:$FRONTEND_PORT   (admin / demo creds in scripts/seed_local.py)"
    log "  logs: $LOG_DIR/"
    ;;
  *) fail "unknown flag: $1 (try --help)" ;;
esac
