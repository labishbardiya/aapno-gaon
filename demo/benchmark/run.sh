#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
population=${1:-50000}
mode=${2:-cached}
duration=${3:-20s}
case "$population" in 3000|10000|50000|100000) ;; *) exit 2 ;; esac
case "$mode" in cached) cache=on ;; baseline) cache=off ;; *) exit 2 ;; esac
database="load_${population}_${mode}_$$"
app=aapno-load-app
result_dir="$(pwd)/results/${population}-${mode}"
mkdir -p "$result_dir"
cleanup() {
  docker rm -f "$app" >/dev/null 2>&1 || true
  docker exec aapno-load-db dropdb -U postgres --if-exists "$database" >/dev/null
}
docker exec aapno-load-db createdb -U postgres -T loadsnapshot "$database"
trap cleanup EXIT
photo=$(base64 < fixture.jpg | tr -d '\n')
docker exec -i aapno-load-db psql -U postgres -d "$database" -v ON_ERROR_STOP=1 -v rows="$((population / 5))" -v photo="$photo" < history.sql >/dev/null
docker run -d --name "$app" --network aapno-load -p 127.0.0.1:3197:3000 \
  -e DATABASE_URL="postgresql://postgres:load-only@aapno-load-db/$database" \
  -e RECEIPT_SECRET="$(openssl rand -hex 32)" -e PUBLIC_OVERVIEW_CACHE="$cache" -e VERCEL=1 \
  aapno-gaon:benchmark >/dev/null
for i in {1..20}; do
  if curl -fsS http://127.0.0.1:3197/api/health >/dev/null 2>&1; then break; fi
  sleep 0.5
done
for days in 7 30 90; do curl -fsS "http://127.0.0.1:3197/overview?days=$days" >/dev/null; done
docker exec aapno-load-db psql -U postgres -d "$database" -c 'select pg_stat_statements_reset()' >/dev/null
exit_status=0
docker run --rm --user 0 --network aapno-load -v "$PWD:/bench:ro" -v "$result_dir:/results" \
  -e POPULATION="$population" -e DURATION="$duration" grafana/k6:1.6.1 \
  run --quiet /bench/workload.js || exit_status=$?
docker exec aapno-load-db psql -U postgres -d "$database" -Atc "
select json_build_object(
  'overviewQueries', coalesce(sum(calls) filter (where query like '%count(r.id)%' and query like '%group by w.id%'),0),
  'allQueries', coalesce(sum(calls),0),
  'dbQueryTimeMs', coalesce(round(sum(total_exec_time)::numeric,1),0),
  'syntheticHistory', $((population / 5)),
  'k6Exit', $exit_status)
from pg_stat_statements where dbid=(select oid from pg_database where datname=current_database());" | tee "$result_dir/db.json"
exit "$exit_status"
