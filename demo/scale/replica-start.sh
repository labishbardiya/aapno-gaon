#!/bin/sh
set -eu
mkdir -p "$PGDATA"
chown postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  export PGPASSWORD=replication-demo-only
  gosu postgres pg_basebackup -h primary -U demo_replicator -D "$PGDATA" -Fp -Xs -R
  printf "%s\n" "primary_conninfo = 'host=primary port=5432 user=demo_replicator password=replication-demo-only'" >> "$PGDATA/postgresql.auto.conf"
fi
exec gosu postgres postgres -c hot_standby=on
