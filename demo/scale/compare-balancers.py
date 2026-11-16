"""Compare four algorithms with the same local, read-only workload."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import json
import os
from subprocess import check_output
from time import monotonic
from urllib.request import urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--requests', type=int, default=1200)
parser.add_argument('--workers', type=int, default=24)
args = parser.parse_args()
if args.requests < 1 or args.workers < 1:
    parser.error('requests and workers must be positive')

project = os.getenv('COMPOSE_PROJECT_NAME', 'aapno-scale')
algorithms = {'round robin': 3195, 'least connections': 3201,
              'IP hash': 3202, 'random two': 3203}
containers = {f'app-{i}': f'{project}-app-{i}-1' for i in range(1, 5)}
upstreams = {}
for name, container in containers.items():
    result = check_output(['docker', 'inspect', container])
    networks = json.loads(result)[0]['NetworkSettings']['Networks']
    upstreams.update({f"{network['IPAddress']}:3000": name for network in networks.values()})


def cpu_ms(container):
    data = check_output(['docker', 'exec', container, 'cat', '/sys/fs/cgroup/cpu.stat'])
    return int(dict(line.split() for line in data.decode().splitlines())['usage_usec']) / 1000


def request(port, index):
    path = '/register' if index % 3 == 0 else '/overview'
    with urlopen(f'http://127.0.0.1:{port}{path}', timeout=15) as response:
        body = response.read()
        if path == '/overview' and b'Reports received in the last' not in body:
            raise RuntimeError('Overview returned no totals')
        return upstreams[response.headers['X-Demo-Upstream'].split(', ')[-1]]


print('Algorithm          seconds   ' + '   '.join(f'{name} req / CPU ms' for name in containers))
for algorithm, port in algorithms.items():
    for i in range(12):
        request(port, i)
    before = {name: cpu_ms(container) for name, container in containers.items()}
    started = monotonic()
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        counts = Counter(executor.map(lambda index: request(port, index), range(args.requests)))
    elapsed = monotonic() - started
    after = {name: cpu_ms(container) for name, container in containers.items()}
    cells = '   '.join(f'{counts[name]:5} / {after[name]-before[name]:7.1f}' for name in containers)
    print(f'{algorithm:18} {elapsed:7.2f}   {cells}', flush=True)
