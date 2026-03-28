# Platform intelligence (production-grade)

Two layers:

1. **Live API** — `GET /admin/ml-insights` (NestJS): health index, Shannon entropy, 7‑day signups, actionable recommendations. Powers the MUI admin **Platform intelligence** page.
2. **Python pipeline** — Scheduled exports: Ridge forecasts + 95% bands, IsolationForest anomaly, correlation heatmaps, executive one-pager.

## Python setup

```bash
cd scripts/platform-charts
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Run exporter

```powershell
$env:ADMIN_JWT="token"
$env:API_URL="http://localhost:3000"
python generate_platform_charts.py --out ./exports
```

| Output | Description |
|--------|-------------|
| **`00_executive_dashboard.png`** | One-board executive summary (health, pillars, badges, volume, recommendations) |
| `01`–`04` | Baseline charts |
| `05` | Health radar |
| `06` | Forecasts + **95% residual confidence band** |
| `07` | Correlation heatmap (≥4 history points) |
| `08` | Anomaly report |
| `09` | Badge concentration |
| **`ml_report.json`** | `schema_version: 2.0`, health, forecast, anomaly, **recommendations** |

### History (critical for ML quality)

Each run appends `exports/history/snapshot_*.json`. **Schedule daily.**

```powershell
python seed_demo_history.py ./exports/history   # 12 demo points
```

Flags: `--no-history` (no append), `--out`, `--api`.

## Architecture

```
admin/dashboard     → raw counts
admin/ml-insights   → TypeScript mirror of health + recs (+ Mongo 7d signups)
Python pipeline     → time-series ML on history folder
```

## Stack

`numpy`, `pandas`, `scikit-learn` (Ridge, IsolationForest, StandardScaler), `scipy.stats.entropy`, `seaborn`, `matplotlib`, `requests`.
