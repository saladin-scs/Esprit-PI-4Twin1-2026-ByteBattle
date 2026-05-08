from typing import Dict, List

import pandas as pd

from app.recommender.model_loader import RecommenderArtifacts


class RecommenderEngine:
    def __init__(self, artifacts: RecommenderArtifacts) -> None:
        self.artifacts = artifacts
        self.user_sample = artifacts.user_sample
        self.global_similarity = artifacts.global_similarity

    def _assert_user_exists(self, user_id: str) -> None:
        if user_id not in self.user_sample.index:
            raise KeyError(f'Unknown user handle: {user_id}')

    def _get_user_scores(self, user_id: str) -> pd.Series:
        return self.user_sample.loc[user_id]

    def _top_similar_users(self, user_id: str, n_similar: int) -> List[str]:
        self._assert_user_exists(user_id)
        similarity = self.global_similarity.loc[user_id].drop(labels=[user_id], errors='ignore')
        return similarity.nlargest(n_similar).index.tolist()

    def _weight_matrix(self, user_id: str, neighbors: List[str]) -> pd.Series:
        return self.global_similarity.loc[user_id, neighbors]

    def recommend(self, user_id: str, n_similar: int = 10, n_recommendations: int = 5) -> List[Dict[str, object]]:
        try:
            self._assert_user_exists(user_id)
        except KeyError:
            # Fallback for new/unknown users: return a randomized sample of popular items
            all_items = self.user_sample.columns.tolist()
            # In a real scenario, we'd pick items with most reviews/ratings
            fallback_items = pd.Series(all_items).sample(min(n_recommendations, len(all_items))).tolist()
            return [{
                'itemId': str(item_id),
                'score': 0.0,
                'title': None,
                'difficulty': None,
                'tags': [],
                'xpReward': None,
                'languages': [],
            } for item_id in fallback_items]

        user_ratings = self._get_user_scores(user_id)
        seen_items = set(user_ratings[user_ratings > 0].index)

        neighbors = self._top_similar_users(user_id, n_similar)
        if not neighbors:
            return []

        weights = self._weight_matrix(user_id, neighbors)
        neighbor_matrix = self.user_sample.loc[neighbors]

        score_series = neighbor_matrix.mul(weights, axis=0).sum(axis=0)
        similarity_total = max(weights.sum(), 1e-8)
        score_series = score_series / similarity_total
        score_series = score_series.drop(index=list(seen_items), errors='ignore')
        score_series = score_series.sort_values(ascending=False)

        recommendations = []
        for item_id, score in score_series.head(n_recommendations).items():
            recommendations.append({
                'itemId': str(item_id),
                'score': float(score),
                'title': None,
                'difficulty': None,
                'tags': [],
                'xpReward': None,
                'languages': [],
            })

        return recommendations
