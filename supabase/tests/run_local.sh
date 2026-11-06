#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
container="survey-db-test-$(date +%s)-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17 >/dev/null
until docker logs "$container" 2>&1 | grep -q "PostgreSQL init process complete"; do sleep 1; done
until docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
for file in supabase/tests/supabase_stub.sql supabase/migrations/20261105000000_initial_schema.sql supabase/seed.sql; do
  echo "Applying $file"
  docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$root/$file"
done
echo "Running supabase/tests/rls_checks.sql"
output="$(docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$root/supabase/tests/rls_checks.sql")"
printf '%s\n' "$output"
if printf '%s\n' "$output" | grep -Eq '\| (FAIL|NOT RUN)([[:space:]]|$)'; then
  echo "One or more checks failed or did not run." >&2
  exit 1
fi

echo "Running Docker-only concurrency checks"
python3 "$root/supabase/tests/concurrency_checks.py" "$container"
