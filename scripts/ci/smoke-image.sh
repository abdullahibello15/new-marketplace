#!/usr/bin/env bash
# Smoke-tests the API image: no .env files inside, the api runs as non-root in Africa/Lagos time and
# answers /healthz against real Postgres and Redis, and the worker reaches Redis and stops cleanly on
# SIGTERM. Used by CI (.github/workflows/ci.yml); runs the same locally against compose:
#
#   npm run db:up && docker build -t zamani-api:local .
#   IMAGE=zamani-api:local NETWORK=zamani_default \
#     DATABASE_URL=postgres://zamani:zamani@postgres:5432/zamani REDIS_URL=redis://redis:6379 \
#     scripts/ci/smoke-image.sh
set -euo pipefail

: "${IMAGE:?set IMAGE}" "${NETWORK:?set NETWORK}" "${DATABASE_URL:?set DATABASE_URL}" "${REDIS_URL:?set REDIS_URL}"

run_env=(-e NODE_ENV=production -e LOG_LEVEL=info -e DATABASE_URL -e REDIS_URL)

cleanup() { docker rm -f smoke-api smoke-worker >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

fail() {
  echo "::error::$1"
  for c in smoke-api smoke-worker; do
    docker logs "$c" 2>/dev/null | sed "s/^/[$c] /" || true
  done
  exit 1
}

echo "--- the image has no .env files"
found=$(docker run --rm "$IMAGE" find / -xdev -name '.env*' -not -path '/proc/*' 2>/dev/null || true)
[ -z "$found" ] || fail "env files in the image: $found"
docker run --rm "$IMAGE" ls -a

echo "--- api: non-root, Africa/Lagos"
docker run -d --name smoke-api --network "$NETWORK" "${run_env[@]}" "$IMAGE" >/dev/null
uid=$(docker exec smoke-api id -u)
echo "uid=$uid ($(docker exec smoke-api id -un))"
[ "$uid" != 0 ] || fail "the api runs as root"
tz=$(docker exec smoke-api node -p 'process.env.TZ')
echo "TZ=$tz"
[ "$tz" = Africa/Lagos ] || fail "TZ is $tz, expected Africa/Lagos"

echo "--- api: GET /healthz is 200 with Postgres and Redis up"
probe="fetch('http://127.0.0.1:3000/healthz').then(async (r) => { console.log(r.status, await r.text()); process.exit(r.status === 200 ? 0 : 1) }, () => process.exit(1))"
healthy=
for _ in $(seq 1 30); do
  if docker exec smoke-api node -e "$probe"; then healthy=1; break; fi
  sleep 1
done
[ -n "$healthy" ] || fail "/healthz never returned 200"

echo "--- worker: connects to Redis"
docker run -d --name smoke-worker --network "$NETWORK" "${run_env[@]}" "$IMAGE" \
  node --enable-source-maps apps/api/dist/worker.js >/dev/null
connected=
for _ in $(seq 1 30); do
  if docker logs smoke-worker 2>&1 | grep -q '"msg":"worker connected to Redis"'; then connected=1; break; fi
  sleep 1
done
[ -n "$connected" ] || fail "the worker never connected to Redis"
docker logs smoke-worker 2>&1

echo "--- both stop cleanly on SIGTERM"
docker stop smoke-api smoke-worker >/dev/null
for c in smoke-api smoke-worker; do
  code=$(docker inspect "$c" --format '{{.State.ExitCode}}')
  echo "$c exit code $code"
  [ "$code" = 0 ] || fail "$c exited with $code after SIGTERM"
done
docker logs smoke-worker 2>&1 | grep -q '"msg":"worker stopped"' || fail "the worker did not log a clean stop"

echo "smoke test passed"
