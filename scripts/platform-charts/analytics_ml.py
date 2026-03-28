"""
ByteBattle platform analytics — ML & statistical layer.

- Time-series history for forecasting & anomaly detection
- Shannon entropy (badge diversity), engagement signals
- sklearn: LinearRegression forecasts, IsolationForest / z-score anomalies
- Composite platform health score (interpretable sub-scores)
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import entropy as shannon_entropy
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler


def _g(g: dict) -> dict:
    return g or {}


def badge_entropy(data: dict) -> float:
    badges = _g(data.get("gamification")).get("topBadges") or []
    if not badges:
        return 0.0
    counts = np.array([max(0, int(b.get("count", 0))) for b in badges], dtype=float)
    s = counts.sum()
    if s <= 0:
        return 0.0
    p = counts / s
    p = p[p > 0]
    return float(shannon_entropy(p))


def snapshot_to_features(data: dict) -> dict[str, float]:
    g = _g(data.get("gamification"))
    ch = data.get("challenges") or {}
    comp = data.get("competitions") or {}
    sub = data.get("submissions") or {}

    tu = float(g.get("totalUsers") or 0)
    wb = float(g.get("usersWithBadges") or 0)
    return {
        "totalUsers": tu,
        "usersWithBadges": wb,
        "averageXp": float(g.get("averageXp") or 0),
        "maxXp": float(g.get("maxXp") or 0),
        "challenges_published": float(ch.get("published") or 0),
        "challenges_total": float(ch.get("total") or 0),
        "competitions_active": float(comp.get("active") or 0),
        "competitions_total": float(comp.get("total") or 0),
        "submissions_challenges": float(sub.get("challenges") or 0),
        "submissions_competitions": float(sub.get("competitions") or 0),
        "badge_entropy": badge_entropy(data),
        "engagement_rate": wb / max(tu, 1.0),
    }


def append_history(history_dir: Path, data: dict) -> Path:
    history_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = history_dir / f"snapshot_{ts}.json"
    path.write_text(
        json.dumps({"captured_at": datetime.now(timezone.utc).isoformat(), "data": data}, indent=2),
        encoding="utf-8",
    )
    return path


def load_history(history_dir: Path, max_files: int = 200) -> pd.DataFrame:
    if not history_dir.is_dir():
        return pd.DataFrame()
    rows = []
    for p in sorted(history_dir.glob("snapshot_*.json"))[-max_files:]:
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
            feats = snapshot_to_features(raw["data"])
            feats["t_index"] = len(rows)
            feats["captured_at"] = raw.get("captured_at", "")
            rows.append(feats)
        except (json.JSONDecodeError, KeyError, OSError):
            continue
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows)


def max_badge_entropy(n_categories: int) -> float:
    if n_categories <= 1:
        return 0.0
    p = np.ones(n_categories) / n_categories
    return float(shannon_entropy(p))


def health_score(data: dict, hist: pd.DataFrame) -> dict[str, Any]:
    f = snapshot_to_features(data)
    tu, wb = f["totalUsers"], f["usersWithBadges"]
    eng = min(100.0, f["engagement_rate"] * 180.0) if tu else 0.0
    ch_t = max(f["challenges_total"], 1)
    content = min(100.0, (f["challenges_published"] / ch_t) * 100.0)
    subs = f["submissions_challenges"] + f["submissions_competitions"]
    activity = min(100.0, 25.0 * math.log1p(subs))
    badges = _g(data.get("gamification")).get("topBadges") or []
    n_bad = len(badges)
    div_raw = f["badge_entropy"] / max(max_badge_entropy(max(n_bad, 2)), 0.01)
    diversity = min(100.0, div_raw * 100.0)
    growth_signal = 50.0
    if len(hist) >= 3:
        y = hist["totalUsers"].values
        if y[-1] > y[0]:
            growth_signal = min(100.0, 50 + (y[-1] - y[0]) / max(y[0], 1) * 30)
        elif y[-1] < y[0]:
            growth_signal = max(20.0, 50 - (y[0] - y[-1]) / max(y[0], 1) * 30)

    scores = {
        "engagement": round(eng, 1),
        "content_health": round(content, 1),
        "activity": round(activity, 1),
        "badge_diversity": round(diversity, 1),
        "growth_trajectory": round(growth_signal, 1),
    }
    overall = (
        scores["engagement"] * 0.22
        + scores["content_health"] * 0.18
        + scores["activity"] * 0.22
        + scores["badge_diversity"] * 0.18
        + scores["growth_trajectory"] * 0.20
    )
    scores["overall_health_0_100"] = round(overall, 1)
    if overall >= 75:
        scores["tier"] = "strong"
    elif overall >= 55:
        scores["tier"] = "healthy"
    elif overall >= 40:
        scores["tier"] = "watch"
    else:
        scores["tier"] = "early / ramp-up"
    return scores


def forecast_metric(hist: pd.DataFrame, column: str, horizon: int = 5) -> dict[str, Any] | None:
    if hist.empty or column not in hist.columns or len(hist) < 2:
        return None
    y = hist[column].astype(float).values
    n = len(y)
    if np.allclose(y, y[0]):
        return {
            "metric": column,
            "method": "flat",
            "next_values": [float(y[-1])] * horizon,
            "r2": 1.0,
        }
    X = np.arange(n).reshape(-1, 1)
    model = Ridge(alpha=1.0)
    model.fit(X, y)
    r2 = float(model.score(X, y))
    X_future = np.arange(n, n + horizon).reshape(-1, 1)
    pred = np.maximum(0, model.predict(X_future)).tolist()
    resid = y - model.predict(X)
    sigma = float(np.std(resid)) if n > 2 else 0.0
    band_hi = [float(p + 1.96 * sigma) for p in pred]
    band_lo = [float(max(0, p - 1.96 * sigma)) for p in pred]
    return {
        "metric": column,
        "method": "ridge_trend",
        "next_values": pred,
        "ci95_low": band_lo,
        "ci95_high": band_hi,
        "r2": round(r2, 4),
    }


def anomaly_latest(hist: pd.DataFrame) -> dict[str, Any]:
    feature_cols = [
        "totalUsers",
        "usersWithBadges",
        "averageXp",
        "submissions_challenges",
        "submissions_competitions",
        "badge_entropy",
        "engagement_rate",
    ]
    if hist.empty or len(hist) < 2:
        return {"status": "insufficient_history", "n_samples": len(hist)}
    df = hist[feature_cols].copy().replace([np.inf, -np.inf], np.nan).fillna(0)
    if len(hist) >= 6:
        scaler = StandardScaler()
        X = scaler.fit_transform(df.values)
        iso = IsolationForest(random_state=42, contamination=min(0.15, 2 / max(len(hist), 3)))
        iso.fit(X)
        scores = iso.decision_function(X)
        pred = iso.predict(X)
        latest_score = float(scores[-1])
        latest_flag = int(pred[-1])
        return {
            "status": "isolation_forest",
            "latest_anomaly": latest_flag == -1,
            "decision_function_latest": round(latest_score, 4),
            "interpretation": "negative = more anomalous vs history" if latest_score < 0 else "within typical cluster",
        }
    # z-score on last row vs previous mean/std
    last = df.iloc[-1].values.astype(float)
    prev = df.iloc[:-1].values.astype(float)
    mu = prev.mean(axis=0)
    sigma = prev.std(axis=0) + 1e-9
    z = np.abs((last - mu) / sigma).max()
    return {
        "status": "max_zscore_vs_past",
        "max_abs_zscore": round(float(z), 2),
        "likely_anomaly": z > 3.0,
    }


def multi_forecast_summary(hist: pd.DataFrame) -> dict[str, Any]:
    out = {}
    for col in ["totalUsers", "submissions_challenges", "submissions_competitions"]:
        fc = forecast_metric(hist, col, horizon=5)
        if fc:
            out[col] = fc
    return out


def validate_dashboard(d: dict) -> list[str]:
    errs = []
    if not isinstance(d, dict):
        return ["response_not_object"]
    if "gamification" not in d:
        errs.append("missing_gamification")
    if "challenges" not in d:
        errs.append("missing_challenges")
    return errs


def build_recommendations(data: dict, health: dict[str, Any]) -> list[str]:
    f = snapshot_to_features(data)
    g = _g(data.get("gamification"))
    comp = data.get("competitions") or {}
    rec: list[str] = []
    if f["totalUsers"] >= 5 and health.get("engagement", 100) < 35:
        rec.append("Low badge adoption — promote first-solve rewards and badge gallery.")
    if health.get("content_health", 100) < 50 and f["challenges_total"] > 0:
        rec.append("Increase published vs draft challenges to deepen the catalog.")
    if health.get("activity", 100) < 35 and f["totalUsers"] >= 3:
        rec.append("Run a featured contest week to lift submission volume.")
    if health.get("badge_diversity", 100) < 40 and len(g.get("topBadges") or []) >= 3:
        rec.append("Badge distribution is skewed — diversify achievement paths.")
    if int(comp.get("active") or 0) == 0 and int(comp.get("total") or 0) > 0:
        rec.append("No active competitions — schedule one for engagement spikes.")
    if not rec:
        rec.append("Snapshot balanced — keep daily exports for forecast & anomaly models.")
    return rec


def build_ml_report(data: dict, history_dir: Path) -> dict[str, Any]:
    append_history(history_dir, data)
    hist = load_history(history_dir)
    h = health_score(data, hist)
    report: dict[str, Any] = {
        "schema_version": "2.0",
        "health": h,
        "features_current": snapshot_to_features(data),
        "history_samples": len(hist),
        "forecast": multi_forecast_summary(hist),
        "anomaly": anomaly_latest(hist),
        "recommendations": build_recommendations(data, h),
    }
    return report
