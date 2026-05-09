"""Clustering and user segmentation for matchmaking and analytics"""

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from typing import Tuple, Dict, List
import logging

logger = logging.getLogger(__name__)


class UserClustering:
    """Handle user clustering for segmentation and matchmaking"""

    def __init__(self):
        self.kmeans = None
        self.dbscan = None
        self.scaler = StandardScaler()
        self.X_scaled = None
        self.cluster_labels = None

    def fit_kmeans(
        self, X: np.ndarray, n_clusters: int = 3, random_state: int = 42
    ) -> Dict:
        """
        Fit K-Means clustering

        Args:
            X: Feature matrix
            n_clusters: Number of clusters
            random_state: Random seed

        Returns:
            Clustering results
        """
        self.X_scaled = self.scaler.fit_transform(X)
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
        self.cluster_labels = self.kmeans.fit_predict(self.X_scaled)

        unique, counts = np.unique(self.cluster_labels, return_counts=True)
        cluster_dist = {f"cluster_{i}": int(count) for i, count in zip(unique, counts)}

        logger.info(f"K-Means fitted with {n_clusters} clusters: {cluster_dist}")
        return {"n_clusters": n_clusters, "distribution": cluster_dist}

    def fit_dbscan(
        self, X: np.ndarray, eps: float = 1.5, min_samples: int = 10
    ) -> Dict:
        """
        Fit DBSCAN clustering

        Args:
            X: Feature matrix
            eps: Epsilon parameter
            min_samples: Minimum samples parameter

        Returns:
            Clustering results
        """
        if self.X_scaled is None:
            self.X_scaled = self.scaler.fit_transform(X)

        self.dbscan = DBSCAN(eps=eps, min_samples=min_samples)
        self.cluster_labels = self.dbscan.fit_predict(self.X_scaled)

        n_clusters = len(set(self.cluster_labels)) - (1 if -1 in self.cluster_labels else 0)
        n_noise = list(self.cluster_labels).count(-1)

        logger.info(f"DBSCAN fitted: {n_clusters} clusters, {n_noise} noise points")
        return {
            "n_clusters": n_clusters,
            "n_noise": n_noise,
            "noise_percentage": float(n_noise / len(self.cluster_labels) * 100),
        }

    def get_user_cluster(
        self, user_features: np.ndarray, algorithm: str = "kmeans"
    ) -> int:
        """
        Assign user to cluster

        Args:
            user_features: User feature vector
            algorithm: 'kmeans' or 'dbscan'

        Returns:
            Cluster label
        """
        if self.kmeans is None and self.dbscan is None:
            feature_sum = float(np.asarray(user_features, dtype=float).sum())
            return int(abs(feature_sum)) % 3

        user_scaled = self.scaler.transform([user_features])

        if algorithm == "kmeans" and self.kmeans:
            return int(self.kmeans.predict(user_scaled)[0])
        elif algorithm == "dbscan" and self.dbscan:
            return int(self.dbscan.fit_predict(user_scaled)[0])

        raise ValueError(f"Algorithm {algorithm} not fitted")

    def get_cluster_members(
        self, cluster_id: int, user_ids: List[str], algorithm: str = "kmeans"
    ) -> List[str]:
        """Get all users in a cluster"""
        if self.cluster_labels is None:
            raise ValueError("No clustering fitted")

        member_indices = np.where(self.cluster_labels == cluster_id)[0]
        return [user_ids[i] for i in member_indices if i < len(user_ids)]

    def suggest_matchup(
        self, user_id: str, user_features: np.ndarray, user_ids: List[str], n_suggestions: int = 3
    ) -> List[str]:
        """
        Suggest opponent users for matchup based on cluster similarity

        Args:
            user_id: Target user ID
            user_features: Target user features
            user_ids: All user IDs
            n_suggestions: Number of suggestions

        Returns:
            List of suggested opponent user IDs
        """
        if self.cluster_labels is None:
            return [uid for uid in user_ids if uid != user_id][:n_suggestions]

        user_cluster = self.get_user_cluster(user_features, algorithm="kmeans")
        cluster_members = self.get_cluster_members(user_cluster, user_ids, algorithm="kmeans")

        # Remove self and return suggestions
        suggestions = [uid for uid in cluster_members if uid != user_id]
        return suggestions[:n_suggestions]
