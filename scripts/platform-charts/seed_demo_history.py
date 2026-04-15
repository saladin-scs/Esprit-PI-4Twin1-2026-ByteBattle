#!/usr/bin/env python3
"""Create synthetic history from current API response (for ML demo / testing)."""
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))
from analytics_ml import snapshot_to_features  # noqa: E402


def main() -> int:
    api = os.environ.get("API_URL", "http://localhost:3000")
    token = os.environ.get("ADMIN_JWT")
    if not token:
        print("Set ADMIN_JWT", file=sys.stderr)
        return 1
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "exports/history")
    out.mkdir(parents=True, exist_ok=True)

    r = requests.get(f"{api.rstrip('/')}/admin/dashboard", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    r.raise_for_status()
    base = r.json()
    feats = snapshot_to_features(base)
    random.seed(42)
    now = datetime.now(timezone.utc)
    for i in range(12):
        t = now - timedelta(days=11 - i)
        noise = 1.0 + (i * 0.02) + random.uniform(-0.03, 0.05)
        d = json.loads(json.dumps(base))
        g = d.setdefault("gamification", {})
        g["totalUsers"] = max(1, int(feats["totalUsers"] * noise * (0.85 + i * 0.012)))
        g["usersWithBadges"] = min(g["totalUsers"], int(feats["usersWithBadges"] * noise * (0.9 + i * 0.01)))
        g["averageXp"] = max(0, int(feats["averageXp"] + i * 3 + random.randint(-5, 8)))
        s = d.setdefault("submissions", {})
        s["challenges"] = max(0, int(feats["submissions_challenges"] + i * 2 + random.randint(0, 5)))
        s["competitions"] = max(0, int(feats["submissions_competitions"] + i + random.randint(0, 3)))
        ts = t.strftime("%Y%m%dT%H%M%SZ")
        (out / f"snapshot_{ts}.json").write_text(
            json.dumps({"captured_at": t.isoformat(), "data": d}, indent=2),
            encoding="utf-8",
        )
    print(f"Wrote 12 synthetic snapshots to {out.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
