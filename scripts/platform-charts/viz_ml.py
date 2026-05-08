"""ML / analytics visualizations (300 DPI, publication theme)."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from analytics_ml import load_history

PALETTE = ["#0c4a6e", "#0369a1", "#7c3aed", "#059669", "#d97706", "#dc2626"]

sns.set_theme(style="whitegrid", palette=PALETTE, font="sans-serif", rc={"axes.titlesize": 12})


def chart_health_radar(report: dict, out: Path) -> None:
    h = report.get("health") or {}
    labels = ["Engagement", "Content", "Activity", "Badge div.", "Growth"]
    values = [
        h.get("engagement", 0),
        h.get("content_health", 0),
        h.get("activity", 0),
        h.get("badge_diversity", 0),
        h.get("growth_trajectory", 0),
    ]
    values += values[:1]
    angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(7, 7), subplot_kw=dict(polar=True))
    ax.plot(angles, values, "o-", linewidth=2.5, color=PALETTE[0])
    ax.fill(angles, values, alpha=0.22, color=PALETTE[1])
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, size=10)
    ax.set_ylim(0, 100)
    tier = h.get("tier", "")
    overall = h.get("overall_health_0_100", 0)
    ax.set_title(f"Platform health index — {overall}/100 ({tier})", fontweight="bold", pad=20, size=13)
    fig.savefig(out / "05_health_radar.png", bbox_inches="tight", facecolor="white", dpi=300)
    plt.close(fig)


def chart_time_series_forecast(history_dir: Path, report: dict, out: Path) -> None:
    hist = load_history(history_dir)
    fc = report.get("forecast") or {}
    if hist.empty or len(hist) < 2:
        fig, ax = plt.subplots(figsize=(10, 4.5))
        ax.text(
            0.5,
            0.5,
            "Run this exporter on a schedule (e.g. daily)\nto build history → ML forecasts activate.",
            ha="center",
            va="center",
            fontsize=12,
            color="#475569",
        )
        ax.set_axis_off()
        fig.savefig(out / "06_forecast_ml.png", bbox_inches="tight", facecolor="white", dpi=300)
        plt.close(fig)
        return

    fig, axes = plt.subplots(1, 3, figsize=(14, 4.2))
    metrics = [
        ("totalUsers", "Registered users", "#0c4a6e"),
        ("submissions_challenges", "Challenge submissions", "#059669"),
        ("submissions_competitions", "Competition submissions", "#d97706"),
    ]
    t = np.arange(len(hist))
    for ax, (col, title, color) in zip(axes, metrics):
        y = hist[col].astype(float).values
        ax.scatter(t, y, color=color, s=36, zorder=3, edgecolors="white", linewidths=0.8)
        ax.plot(t, y, color=color, alpha=0.5, linewidth=1.5)
        info = fc.get(col)
        if info and info.get("next_values"):
            h = len(y)
            pred_t = np.arange(h, h + len(info["next_values"]))
            lo, hi = info.get("ci95_low"), info.get("ci95_high")
            if lo and hi and len(lo) == len(pred_t):
                ax.fill_between(pred_t, lo, hi, alpha=0.18, color="#dc2626", label="95% residual band")
            ax.plot(pred_t, info["next_values"], "--", color="#dc2626", linewidth=2.2, label="Ridge forecast")
            ax.scatter(pred_t[-1], info["next_values"][-1], color="#dc2626", s=90, zorder=4, marker="*", edgecolors="white")
        ax.set_title(title, fontweight="bold", size=11)
        ax.set_xlabel("Snapshot index")
        ax.grid(True, alpha=0.3)
        if info:
            ax.legend(loc="upper left", fontsize=7)
    fig.suptitle("Time series + Ridge trend forecast (next 5 steps)", fontsize=13, fontweight="bold", y=1.02)
    fig.tight_layout()
    fig.savefig(out / "06_forecast_ml.png", bbox_inches="tight", facecolor="white", dpi=300)
    plt.close(fig)


def chart_correlation_heatmap(history_dir: Path, out: Path) -> None:
    hist = load_history(history_dir)
    cols = [
        "totalUsers",
        "usersWithBadges",
        "averageXp",
        "submissions_challenges",
        "submissions_competitions",
        "badge_entropy",
        "engagement_rate",
    ]
    if hist.empty or len(hist) < 4:
        fig, ax = plt.subplots(figsize=(8, 3))
        ax.text(0.5, 0.5, "Need ≥4 historical snapshots for correlation heatmap", ha="center", va="center")
        ax.set_axis_off()
        fig.savefig(out / "07_feature_correlation.png", bbox_inches="tight", facecolor="white", dpi=300)
        plt.close(fig)
        return
    sub = hist[cols].corr()
    fig, ax = plt.subplots(figsize=(8.5, 7))
    sns.heatmap(
        sub,
        annot=True,
        fmt=".2f",
        cmap="RdBu_r",
        center=0,
        vmin=-1,
        vmax=1,
        square=True,
        linewidths=0.5,
        ax=ax,
        cbar_kws={"shrink": 0.6},
    )
    ax.set_title("Feature correlation matrix (historical snapshots)", fontweight="bold", pad=12)
    fig.tight_layout()
    fig.savefig(out / "07_feature_correlation.png", bbox_inches="tight", facecolor="white", dpi=300)
    plt.close(fig)


def chart_anomaly_panel(report: dict, out: Path) -> None:
    an = report.get("anomaly") or {}
    fig, ax = plt.subplots(figsize=(9, 3.5))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    lines = [
        "ANOMALY & DRIFT SIGNALS",
        f"Method: {an.get('status', 'n/a')}",
    ]
    if an.get("status") == "isolation_forest":
        lines.append(f"Latest point anomalous: {an.get('latest_anomaly')}")
        lines.append(f"Isolation score: {an.get('decision_function_latest')} ({an.get('interpretation')})")
    elif an.get("status") == "max_zscore_vs_past":
        lines.append(f"Max |z| vs prior snapshots: {an.get('max_abs_zscore')}")
        lines.append(f"Flag likely anomaly: {an.get('likely_anomaly')}")
    else:
        lines.append(str(an))
    y = 0.88
    for i, line in enumerate(lines):
        ax.text(0.05, y - i * 0.18, line, fontsize=12 if i == 0 else 11, fontweight="bold" if i == 0 else "normal", family="sans-serif")
    fig.savefig(out / "08_anomaly_report.png", bbox_inches="tight", facecolor="white", dpi=300)
    plt.close(fig)


def chart_badge_distribution_ml(data: dict, out: Path) -> None:
    """KDE-style bar + concentration metric."""
    badges = (data.get("gamification") or {}).get("topBadges") or []
    if len(badges) < 2:
        fig, ax = plt.subplots(figsize=(9, 3))
        ax.text(0.5, 0.5, "Insufficient badges for distribution analysis", ha="center", va="center")
        ax.set_axis_off()
        fig.savefig(out / "09_badge_distribution_ml.png", bbox_inches="tight", facecolor="white", dpi=300)
        plt.close(fig)
        return
    counts = np.array([b["count"] for b in badges[:15]], dtype=float)
    total = counts.sum()
    share = counts / max(total, 1)
    gini = 1 - np.sum(share**2)  # simplified concentration
    fig, ax = plt.subplots(figsize=(10, 4.5))
    x = np.arange(len(counts))
    ax.bar(x, share * 100, color=PALETTE[2], edgecolor="white", alpha=0.88)
    ax.set_xticks(x)
    ax.set_xticklabels([b["badgeId"][:14] for b in badges[:15]], rotation=35, ha="right", fontsize=8)
    ax.set_ylabel("% of badge-holders (top badges)")
    ax.set_title(f"Badge concentration (1-HHI proxy: {gini:.3f} — higher = more spread)", fontweight="bold")
    fig.tight_layout()
    fig.savefig(out / "09_badge_distribution_ml.png", bbox_inches="tight", facecolor="white", dpi=300)
    plt.close(fig)


def chart_executive_dashboard(data: dict, report: dict, out: Path) -> None:
    """Single 300 DPI board: KPIs + health + top badges + volume."""
    fig = plt.figure(figsize=(14, 10), facecolor="#fafafa")
    gs = fig.add_gridspec(2, 3, hspace=0.35, wspace=0.3, left=0.06, right=0.97, top=0.92, bottom=0.06)

    g = data.get("gamification") or {}
    sub, ch, comp = data.get("submissions") or {}, data.get("challenges") or {}, data.get("competitions") or {}
    h = report.get("health") or {}

    ax0 = fig.add_subplot(gs[0, 0])
    ax0.axis("off")
    overall = h.get("overall_health_0_100", 0)
    tier = h.get("tier", "")
    ax0.text(0.5, 0.85, "BYTEBATTLE PLATFORM", ha="center", fontsize=11, color="#64748b", fontweight="bold")
    ax0.text(0.5, 0.55, f"{overall}", ha="center", fontsize=42, fontweight="800", color=PALETTE[0])
    ax0.text(0.5, 0.28, f"Health index · {tier}", ha="center", fontsize=13, fontweight="bold")
    ax0.text(0.5, 0.12, f"Users {g.get('totalUsers', 0):,} · Subs {sub.get('challenges',0)+sub.get('competitions',0):,}", ha="center", fontsize=10, color="#475569")

    ax1 = fig.add_subplot(gs[0, 1])
    labels_r = ["Eng", "Cnt", "Act", "Div", "Grw"]
    vals_r = [
        h.get("engagement", 0),
        h.get("content_health", 0),
        h.get("activity", 0),
        h.get("badge_diversity", 0),
        h.get("growth_trajectory", 0),
    ]
    x = np.arange(len(labels_r))
    ax1.bar(x, vals_r, color=PALETTE[:5], edgecolor="white", linewidth=0.8)
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels_r, fontsize=9)
    ax1.set_ylim(0, 100)
    ax1.set_title("Health pillars (0–100)", fontweight="bold")
    ax1.set_ylabel("Score")

    ax2 = fig.add_subplot(gs[0, 2])
    badges = g.get("topBadges") or []
    if badges:
        top = badges[:6]
        ax2.barh(range(len(top)), [b["count"] for b in top], color=PALETTE[1], height=0.55)
        ax2.set_yticks(range(len(top)))
        ax2.set_yticklabels([b["badgeId"][:16] for b in top], fontsize=8)
        ax2.invert_yaxis()
        ax2.set_title("Top badges", fontweight="bold")
    else:
        ax2.text(0.5, 0.5, "No badges", ha="center", va="center")
        ax2.set_axis_off()

    ax3 = fig.add_subplot(gs[1, :2])
    cats = ["Ch.sub", "Co.sub", "Ch.pub", "Ch.tot", "Co.act", "Co.tot"]
    vals = [
        int(sub.get("challenges") or 0),
        int(sub.get("competitions") or 0),
        int(ch.get("published") or 0),
        int(ch.get("total") or 0),
        int(comp.get("active") or 0),
        int(comp.get("total") or 0),
    ]
    ax3.bar(cats, vals, color=PALETTE, edgecolor="white")
    ax3.set_title("Platform volume", fontweight="bold")
    ax3.tick_params(axis="x", rotation=15)

    ax4 = fig.add_subplot(gs[1, 2])
    ax4.axis("off")
    recs = report.get("recommendations") or ["—"]
    y0 = 0.92
    ax4.text(0.05, y0, "Recommendations", fontsize=12, fontweight="bold", transform=ax4.transAxes)
    for i, r in enumerate(recs[:5]):
        ax4.text(0.06, y0 - 0.14 - i * 0.16, f"• {r[:90]}{'…' if len(r) > 90 else ''}", fontsize=9, va="top", wrap=True, transform=ax4.transAxes, color="#334155")

    fig.suptitle("Executive dashboard — ByteBattle analytics", fontsize=15, fontweight="bold", y=0.98)
    fig.savefig(out / "00_executive_dashboard.png", bbox_inches="tight", facecolor="#fafafa", dpi=300)
    plt.close(fig)
