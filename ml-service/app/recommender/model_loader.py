import os
from dataclasses import dataclass
from typing import Any

import joblib
import pandas as pd


@dataclass
class RecommenderArtifacts:
    user_sample: pd.DataFrame
    global_similarity: pd.DataFrame
    user_pca: Any
    pca: Any
    kmeans: Any
    feature_names: list[str]


def load_recommender_artifacts(path: str) -> RecommenderArtifacts:
    absolute_path = os.path.abspath(path)
    if not os.path.exists(absolute_path):
        raise FileNotFoundError(f'Recommender artifact not found at {absolute_path}')

    payload = joblib.load(absolute_path)

    if not isinstance(payload, dict):
        raise ValueError('Recommender artifact file must contain a dict of artifacts')

    return RecommenderArtifacts(
        user_sample=payload['user_sample'],
        global_similarity=payload['global_similarity'],
        user_pca=payload['user_pca'],
        pca=payload['pca'],
        kmeans=payload['kmeans'],
        feature_names=payload.get('feature_names', []),
    )
