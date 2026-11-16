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

## Compare load-balancing algorithms

Use Python 3 on the Docker Desktop host. The same four app containers serve all four loopback ports.

| Algorithm | Port |
| --- | --- |
| Round robin | 3195 |
| Least connections | 3201 |
| IP hash | 3202 |
| Power of two choices, using least connections | 3203 |

```sh
python3 compare-balancers.py --requests 1200 --workers 24
```

Set `COMPOSE_PROJECT_NAME` if you started the stack under a different project name. On the existing rehearsal stack, run:

```sh
COMPOSE_PROJECT_NAME=aapno-scale-check python3 compare-balancers.py --requests 1200 --workers 24
```

Each run sends the same mix of overview and register reads. The table reports how many requests each instance served and the increase in its container CPU time. CPU milliseconds are accumulated across cores. For example, 2,000 CPU ms over two elapsed seconds is about one fully used core on average.

On one source IP, IP hash sends requests to one instance. Round robin evenly distributes request counts. Least connections and power of two choices distribute work according to active connections. The exact CPU times can vary with caching, runtime warm-up and other activity. Repeat the runs before drawing performance conclusions.
