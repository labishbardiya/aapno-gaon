import json
import sys
from pathlib import Path

populations = [int(value) for value in sys.argv[1:]] or [3000, 10000, 50000, 100000]
root = Path(__file__).resolve().parent / "results"
print("| Residents | Burst target (req/s) | Achieved baseline → cached | Overall p95 (ms) | Overview SQL calls | HTTP errors | Dropped |")
print("| ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
for population in populations:
    runs = []
    for mode in ("baseline", "cached"):
        folder = root / f"{population}-{mode}"
        runs.append(json.loads((folder / "k6.json").read_text()) | json.loads((folder / "db.json").read_text()))
    before, after = runs

    def compare(key, fmt):
        return f"{before[key]:{fmt}} → {after[key]:{fmt}}"

    print(
        f"| {population:,} | {before['requestedRps']:.1f} | {compare('achievedRps', '.1f')} | "
        f"{compare('p95Ms', '.1f')} | {compare('overviewQueries', ',d')} | "
        f"{compare('httpErrorPct', '.1f')}% | {compare('dropped', 'd')} |"
    )
