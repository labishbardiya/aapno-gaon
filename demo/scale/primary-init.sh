#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 -U postgres -c "create role demo_replicator with replication login password 'replication-demo-only'"
printf '%s\n' 'host replication demo_replicator all scram-sha-256' >> "$PGDATA/pg_hba.conf"
for file in /schema/*.sql /fixtures/seed.sql /fixtures/sample-reports.sql; do
  psql -v ON_ERROR_STOP=1 -U postgres -f "$file"
done
