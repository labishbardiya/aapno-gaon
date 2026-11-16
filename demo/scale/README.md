# Four-instance Docker demo

Run these commands from this directory with Docker Desktop, curl, and jq available.

```sh
docker compose -p aapno-scale up -d --build --wait
bash verify.sh
```

Open http://127.0.0.1:3195. The verification script shows one Redis miss served by the PostgreSQL standby and hits on the other instances. It submits a synthetic report, verifies the row on the primary and standby, then stops and restarts app-4 to demonstrate request delivery through the surviving instances.

Public overview cache entries expire after 30 seconds. The replica receives writes through asynchronous streaming replication. Submissions, staff actions, and private tracking use the primary.

The synthetic staff accounts use `@demo.example` with the password `DhindaDemo2026`.

| Account prefix | Responsibility |
| --- | --- |
| coordinator | Admin and unmatched queue |
| water | Water |
| works | Roads and streetlights |
| sanitation | Waste, drainage, waterlogging, and sanitation |

These credentials belong to a local authentication simulator. The database and Redis ports are private to the Compose network. Only the Nginx port is published, on loopback. All four app instances share the same host.
