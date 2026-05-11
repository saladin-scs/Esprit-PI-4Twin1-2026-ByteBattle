"""Data preprocessing and feature engineering for ML models"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from typing import Tuple, List, Dict, Optional


class DataProcessor:
    """Handles data preprocessing, feature engineering, and validation"""

    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.feature_names: List[str] = []
        self.pca: Optional[PCA] = None

    def preprocess_user_challenge_data(
        self, df: pd.DataFrame, target_col: str = "ratingChange"
    ) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Preprocess user-challenge performance data for ML models.

        Args:
            df: DataFrame with user challenge data
            target_col: Column name for prediction target

        Returns:
            X (features), y (target), feature_names
        """
        df = df.copy()

        # Remove duplicates
        df.drop_duplicates(inplace=True)

        # Define target variable
        if target_col == "ratingChange":
            y = (df["ratingChange"] > 0).astype(int)
        elif "newRating" in df.columns and "oldRating" in df.columns:
            y = (df["newRating"] > df["oldRating"]).astype(int)
        else:
            raise ValueError(f"Cannot create target from available columns")

        # Columns that would leak information
        leakage_cols = [
            "oldRating",
            "newRating",
            "ratingChange",
            "success",
            "handle",
            "contestId",
            "startTimeSeconds",
            "ratingUpdateTimeSeconds",
        ]

        # Safe numeric features (known before contest result)
        safe_numeric_features = [
            "problems_solved_num",
            "rating",
            "global_rank",
            "contribution",
            "contestants_count",
            "durationSeconds",
            "friendOfCount",
            "registrationTimeSeconds",
        ]

        features_num = [f for f in safe_numeric_features if f in df.columns]

        # Safe categorical features
        safe_cat_features = ["country", "city", "organization", "rank", "maxRank", "type", "phase"]
        cat_cols = [c for c in safe_cat_features if c in df.columns]

        # Fill NaN values
        for col in features_num:
            if df[col].isnull().any():
                df[col].fillna(df[col].median(), inplace=True)

        for col in cat_cols:
            if df[col].isnull().any():
                df[col].fillna("Unknown", inplace=True)

        # Encode categorical features
        encoded_features = []
        for col in cat_cols:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
            df[f"{col}_enc"] = self.label_encoders[col].fit_transform(df[col].astype(str))
            encoded_features.append(f"{col}_enc")

        # Combine all features
        all_features = features_num + encoded_features
        self.feature_names = all_features
        X = df[all_features].copy()

        return X.values, y.values, self.feature_names

    def create_user_embeddings(
        self, df: pd.DataFrame, n_components: int = 2
    ) -> Tuple[np.ndarray, pd.Index]:
        """
        Create user embeddings using PCA for clustering/similarity.

        Args:
            df: User feature matrix (rows=users, cols=features)
            n_components: Number of PCA components

        Returns:
            Embeddings array, user indices
        """
        X_scaled = self.scaler.fit_transform(df.values)
        self.pca = PCA(n_components=n_components)
        embeddings = self.pca.fit_transform(X_scaled)
        return embeddings, df.index

    def get_feature_importance_interpretation(self, importance_scores: dict) -> str:
        """Generate human-readable interpretation of feature importance"""
        top_features = sorted(importance_scores.items(), key=lambda x: x[1], reverse=True)[:5]
        return ", ".join([f"{name}: {score:.3f}" for name, score in top_features])
