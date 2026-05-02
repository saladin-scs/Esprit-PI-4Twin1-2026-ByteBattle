#!/usr/bin/env python3
"""
ByteBattle platform intelligence pipeline:
  • Static HQ charts (matplotlib)
  • ML layer: health index, Ridge forecasts, IsolationForest anomaly, correlations
  • Append each run to history/ → richer models over time

Usage:
  set ADMIN_JWT=eyJ...
  python generate_platform_charts.py --out ./exports

Schedule daily (Task Scheduler / cron) for best forecast & anomaly quality.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Local imports (run from this directory)
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import matplotlib as mpl
import matplotlib.pyplot as plt
import requests

from analytics_ml import build_ml_report, build_recommendations, health_score, load_history, multi_forecast_summary, anomaly_latest, snapshot_to_features, validate_dashboard
from viz_ml import (
    chart_anomaly_panel,
    chart_badge_distribution_ml,
    chart_correlation_heatmap,
    chart_executive_dashboard,
    chart_health_radar,
    chart_time_series_forecast,
)

mpl.rcParams.update(
    {
        "figure.dpi": 150,
        "savefig.dpi": 300,
        "font.family": "sans-serif",
        "font.sans-serif": ["Segoe UI", "Helvetica Neue", "Arial", "DejaVu Sans"],
        "axes.titlesize": 14,
        "axes.labelsize": 11,
        "axes.facecolor": "#f8fafc",
        "figure.facecolor": "#ffffff",
        "axes.grid": True,
        "grid.alpha": 0.35,
    }
)

PALETTE = ["#0c4a6e", "#0369a1", "#7c3aed", "#059669", "#d97706", "#dc2626", "#64748b"]


def fetch_dashboard(api_url: str, token: str) -> dict:
    r = requests.get(
        f"{api_url.rstrip('/')}/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def chart_top_badges(data: dict, out: Path) -> None:
    badges = (data.get("gamification") or {}).get("topBadges") or []
    if not badges:
        fig, ax = plt.subplots(figsize=(10, 4))
        ax.text(0.5, 0.5, "No badge distribution data yet", ha="center", va="center", fontsize=14)
        ax.set_axis_off()
        fig.savefig(out / "01_top_badges.png", bbox_inches="tight", facecolor="white")
        plt.close(fig)
        return
    labels = [b["badgeId"][:24] + ("…" if len(b["badgeId"]) > 24 else "") for b in badges[:12]]
    counts = [b["count"] for b in badges[:12]]
    colors = [PALETTE[i % len(PALETTE)] for i in range(len(labels))]
    fig, ax = plt.subplots(figsize=(11, max(4, len(labels) * 0.45)))
    y = range(len(labels))
    ax.barh(y, counts, color=colors, height=0.65, edgecolor="white", linewidth=0.8)
    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    ax.set_xlabel("Users holding badge")
    ax.set_title("Top badges by adoption", fontweight="bold", pad=12)
    for i, v in enumerate(counts):
        ax.text(v + max(counts) * 0.01, i, str(v), va="center", fontsize=9, color="#334155")
    fig.savefig(out / "01_top_badges.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)


def chart_user_engagement(data: dict, out: Path) -> None:
    g = data.get("gamification") or {}
    total = int(g.get("totalUsers") or 0)
    with_b = int(g.get("usersWithBadges") or 0)
    without = max(0, total - with_b)
    fig, ax = plt.subplots(figsize=(7, 5))
    if total == 0:
        ax.text(0.5, 0.5, "No users yet", ha="center", va="center")
        ax.set_axis_off()
    else:
        ax.pie(
            [with_b, without],
            labels=[f"With badges\n{with_b}", f"No badges yet\n{without}"],
            autopct=lambda p: f"{p:.1f}%",
            colors=["#059669", "#cbd5e1"],
            explode=(0.02, 0),
            startangle=90,
            wedgeprops={"edgecolor": "white", "linewidth": 1.2},
        )
    ax.set_title("User badge engagement", fontweight="bold", pad=16)
    fig.savefig(out / "02_user_engagement.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)


def chart_platform_volume(data: dict, out: Path) -> None:
    sub, ch, comp = data.get("submissions") or {}, data.get("challenges") or {}, data.get("competitions") or {}
    categories = [
        "Challenge\nsubmissions",
        "Competition\nsubmissions",
        "Published\nchallenges",
        "Total\nchallenges",
        "Active\ncompetitions",
        "Total\ncompetitions",
    ]
    values = [
        int(sub.get("challenges") or 0),
        int(sub.get("competitions") or 0),
        int(ch.get("published") or 0),
        int(ch.get("total") or 0),
        int(comp.get("active") or 0),
        int(comp.get("total") or 0),
    ]
    fig, ax = plt.subplots(figsize=(11, 5.5))
    x = range(len(categories))
    bars = ax.bar(x, values, color=PALETTE[: len(categories)], edgecolor="white", linewidth=1)
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=9)
    ax.set_ylabel("Count")
    ax.set_title("Platform activity & content volume", fontweight="bold", pad=14)
    ymax = max(values + [1])
    for bar, v in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + ymax * 0.02, str(v), ha="center", fontsize=9, fontweight="bold")
    fig.savefig(out / "03_platform_volume.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)


def chart_xp_profile(data: dict, out: Path) -> None:
    g = data.get("gamification") or {}
    avg, mx, total = int(g.get("averageXp") or 0), int(g.get("maxXp") or 0), int(g.get("totalUsers") or 0)
    fig, ax = plt.subplots(figsize=(8, 4.5))
    metrics, vals, c = ["Avg XP", "Peak XP", "Users"], [avg, mx, total], ["#0369a1", "#7c3aed", "#0c4a6e"]
    bars = ax.bar(metrics, vals, color=c, width=0.55, edgecolor="white", linewidth=1)
    ax.set_title("Gamification snapshot", fontweight="bold", pad=14)
    for bar, v in zip(bars, vals):
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2, h + max(vals) * 0.02, f"{v:,}", ha="center", fontsize=11, fontweight="bold")
    fig.savefig(out / "04_xp_snapshot.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)


def main() -> int:
    p = argparse.ArgumentParser(description="ByteBattle platform charts + ML analytics")
    p.add_argument("--out", default="exports", help="Output root (charts + history/)")
    p.add_argument("--api", default=os.environ.get("API_URL", "http://localhost:3000"))
    p.add_argument("--no-history", action="store_true", help="Do not append to history (forecasts degraded)")
    args = p.parse_args()

    token = os.environ.get("ADMIN_JWT") or os.environ.get("BYTEBATTLE_ADMIN_TOKEN")
    if not token:
        print("Set ADMIN_JWT to a valid admin Bearer token.", file=sys.stderr)
        return 1

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    history_dir = out / "history"

    try:
        data = fetch_dashboard(args.api, token)
    except requests.HTTPError as e:
        print(f"API error: {e}", file=sys.stderr)
        return 1

    bad = validate_dashboard(data)
    if bad:
        print(f"Warning: dashboard schema {bad}", file=sys.stderr)

    if args.no_history:
        hist = load_history(history_dir)
        h = health_score(data, hist)
        report = {
            "schema_version": "2.0",
            "health": h,
            "features_current": snapshot_to_features(data),
            "history_samples": len(hist),
            "forecast": multi_forecast_summary(hist),
            "anomaly": anomaly_latest(hist),
            "recommendations": build_recommendations(data, h),
        }
    else:
        report = build_ml_report(data, history_dir)

    chart_executive_dashboard(data, report, out)
    chart_top_badges(data, out)
    chart_user_engagement(data, out)
    chart_platform_volume(data, out)
    chart_xp_profile(data, out)

    chart_health_radar(report, out)
    chart_time_series_forecast(history_dir, report, out)
    chart_correlation_heatmap(history_dir, out)
    chart_anomaly_panel(report, out)
    chart_badge_distribution_ml(data, out)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "GET /admin/dashboard + analytics_ml",
        "ml_report": report,
        "data": data,
    }
    (out / "dashboard_snapshot.json").write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    (out / "ml_report.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    print(f"Exported to {out.resolve()}")
    print("  00_executive_dashboard.png | 01–04 baseline | 05–09 ML | ml_report.json")
    print(f"  Health {report.get('health', {}).get('overall_health_0_100', '?')}/100 ({report.get('health', {}).get('tier', '')})")
    print(f"  History samples: {report.get('history_samples', 0)}")
    for r in report.get("recommendations", [])[:3]:
        print(f"  → {r[:100]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
