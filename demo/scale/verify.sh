#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
base=http://127.0.0.1:3195
compose() { docker compose -p "${COMPOSE_PROJECT_NAME:-aapno-scale}" "$@"; }
sql() { compose exec -T "$1" psql -U postgres -At -v ON_ERROR_STOP=1 -c "$2"; }

test "$(sql primary 'select pg_is_in_recovery()')" = f
test "$(sql replica 'select pg_is_in_recovery()')" = t

compose exec -T redis redis-cli DEL 'public-overview:v1:30:' >/dev/null
seen=
misses=0
for i in {1..4}; do
  response=$(curl -fsS "$base/api/demo/overview")
  echo "$response" | jq -c '{instance,cache,source}'
  seen="$seen $(jq -r .instance <<< "$response")"
  if jq -e '.cache == "MISS" and .source == "replica"' <<< "$response" >/dev/null; then
    misses=$((misses + 1))
  else
    jq -e '.cache == "HIT" and .source == "redis"' <<< "$response" >/dev/null
  fi
done
test "$misses" = 1
for instance in app-1 app-2 app-3 app-4; do [[ "$seen" == *"$instance"* ]]; done

key=$(uuidgen)
receipt=$(curl -fsS "$base/api/reports" -H "Idempotency-Key: $key" -H 'Content-Type: application/json' \
  --data '{"wardId":1,"category":"water","landmark":"Demo standpipe","description":"Low pressure at the demo standpipe"}')
ticket=$(jq -er '.ticketCode | select(test("^MS-[A-Z0-9]+$"))' <<< "$receipt")
query="select count(*) from mysociety.reports where ticket_code='$ticket'"
test "$(sql primary "$query")" = 1
for i in {1..20}; do
  if [ "$(sql replica "$query")" = 1 ]; then break; fi
  sleep 0.5
done
test "$(sql replica "$query")" = 1
echo "$ticket written to primary and observed on standby"
curl -fsS "$base$(jq -er .receiptUrl <<< "$receipt")" | grep -F -o "$ticket" >/dev/null

compose stop app-4 >/dev/null
trap 'compose start app-4 >/dev/null' EXIT
for i in {1..5}; do
  curl -fsS "$base/api/demo/overview" | jq -ec 'select(.instance != "app-4") | {instance,cache,source}'
done
echo 'Load balancer kept serving after app-4 stopped.'
