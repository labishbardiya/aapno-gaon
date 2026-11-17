#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

docker build -t aapno-gaon:benchmark ../..
docker network inspect aapno-load >/dev/null 2>&1 || docker network create aapno-load
if ! docker container inspect aapno-load-db >/dev/null 2>&1; then
  docker run -d --name aapno-load-db --network aapno-load \
    -e POSTGRES_PASSWORD=load-only postgres:17-alpine \
    -c shared_preload_libraries=pg_stat_statements
else
  docker start aapno-load-db >/dev/null
fi
for attempt in {1..30}; do
  if docker exec aapno-load-db pg_isready -h 127.0.0.1 -U postgres >/dev/null; then break; fi
  sleep 1
done
docker exec aapno-load-db pg_isready -h 127.0.0.1 -U postgres
if [ "$(docker exec aapno-load-db psql -U postgres -Atc "select count(*) from pg_database where datname='loadsnapshot'")" = 0 ]; then
  for file in ../../supabase/migrations/*.sql ../scale/seed.sql ../scale/sample-reports.sql; do
    docker exec -i aapno-load-db psql -U postgres -v ON_ERROR_STOP=1 < "$file"
  done
  docker exec aapno-load-db psql -U postgres -v ON_ERROR_STOP=1 -c 'create extension if not exists pg_stat_statements'
  docker exec aapno-load-db createdb -U postgres -T postgres loadsnapshot
fi
