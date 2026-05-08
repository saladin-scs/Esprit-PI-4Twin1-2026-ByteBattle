import joblib
import os
import pandas as pd
from typing import NamedTuple, List, Optional

class RecommenderArtifacts(NamedTuple):
    user_sample: pd.DataFrame
    global_similarity: pd.DataFrame
    item_similarity: Optional[pd.DataFrame]
    user_pca: any
    pca: any
    kmeans: any
    feature_names: List[str]

def load_artifacts(path: str) -> RecommenderArtifacts:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model artifacts not found at {path}")
    
    data = joblib.load(path)
    
    return RecommenderArtifacts(
        user_sample=data.get('user_sample'),
        global_similarity=data.get('global_similarity'),
        item_similarity=data.get('item_similarity'),
        user_pca=data.get('user_pca'),
        pca=data.get('pca'),
        kmeans=data.get('kmeans'),
        feature_names=data.get('feature_names', [])
    )
