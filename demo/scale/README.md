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

### Show live CPU in Docker Desktop

Open **Containers**, expand the Compose project, and keep the CPU column or a container's **Stats** tab visible. Run one command at a time. Each command spreads 6,000 read requests over about 15 seconds, so the CPU view has time to update.

```sh
export COMPOSE_PROJECT_NAME=aapno-scale-check
python3 compare-balancers.py --algorithm round-robin       --requests 6000 --workers 24 --seconds 15
python3 compare-balancers.py --algorithm ip-hash           --requests 6000 --workers 24 --seconds 15
python3 compare-balancers.py --algorithm least-connections --requests 6000 --workers 24 --seconds 15
python3 compare-balancers.py --algorithm power-of-two      --requests 6000 --workers 24 --seconds 15
```

Use the name of your running Compose project if it differs. For a terminal CPU view, use `docker stats` with the four app container names. The live view shows sampled CPU percent. The comparison script measures accumulated CPU time during each request batch and counts the requests each instance served.

In one local rehearsal, each algorithm received 6,000 requests in 15 seconds from one source IP. Each cell shows requests served and CPU time in milliseconds.

| Algorithm | App 1 | App 2 | App 3 | App 4 |
| --- | ---: | ---: | ---: | ---: |
| Round robin | 1500 / 6494.7 | 1500 / 5165.3 | 1500 / 5670.7 | 1500 / 6220.1 |
| Least connections | 1473 / 6248.4 | 1510 / 5153.1 | 1526 / 5034.2 | 1491 / 6034.7 |
| IP hash | 0 / 9.3 | 0 / 26.8 | 6000 / 12535.0 | 0 / 8.2 |
| Power of two choices | 1488 / 6629.9 | 1520 / 5609.1 | 1506 / 5439.3 | 1486 / 6607.0 |

Show round robin first and IP hash second. Point to the four containers during each run. With round robin, all four containers handle part of the workload. With one source IP and IP hash, one container handles the workload. The sample compares CPU distribution for this workload.
