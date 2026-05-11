from typing import Dict, List

import pandas as pd

from app.recommender.model_loader import RecommenderArtifacts


class RecommenderEngine:
    def __init__(self, artifacts: RecommenderArtifacts) -> None:
        self.artifacts = artifacts
        self.user_sample = artifacts.user_sample
        self.global_similarity = artifacts.global_similarity
        self.item_similarity = getattr(artifacts, 'item_similarity', None)

    def _assert_user_exists(self, user_id: str) -> None:
        if user_id not in self.user_sample.index:
            raise KeyError(f'Unknown user handle: {user_id}')

    def get_item_similarities(self, item_id: str, n_similar: int = 5) -> List[Dict[str, object]]:
        if self.item_similarity is None or item_id not in self.item_similarity.index:
            return []
        
        similar_items = self.item_similarity.loc[item_id].sort_values(ascending=False)
        similar_items = similar_items.drop(labels=[item_id], errors='ignore').head(n_similar)
        
        return [{
            'itemId': str(id),
            'score': float(score),
            'title': None,
            'difficulty': None,
            'tags': [],
            'xpReward': None,
            'languages': [],
        } for id, score in similar_items.items()]

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
            # Cold start for unknown users: Return most popular items they haven't seen (all are unseen for new users)
            # Popularity is defined as items with the most interactions in our dataset
            popularity = self.user_sample.sum(axis=0).sort_values(ascending=False)
            fallback_items = popularity.head(n_recommendations).index.tolist()
            
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
            # Fallback if no similar users found
            popularity = self.user_sample.sum(axis=0).drop(index=list(seen_items), errors='ignore').sort_values(ascending=False)
            fallback_items = popularity.head(n_recommendations).index.tolist()
            return [{
                'itemId': str(item_id),
                'score': 0.0,
                'title': None,
                'difficulty': None,
                'tags': [],
                'xpReward': None,
                'languages': [],
            } for item_id in fallback_items]

        weights = self._weight_matrix(user_id, neighbors)
        neighbor_matrix = self.user_sample.loc[neighbors]

        # Calculate weighted scores from similar users
        score_series = neighbor_matrix.mul(weights, axis=0).sum(axis=0)
        similarity_total = max(weights.sum(), 1e-8)
        score_series = score_series / similarity_total
        
        # Filter out items the user has already seen
        score_series = score_series.drop(index=list(seen_items), errors='ignore')
        
        # Sort and take top N
        score_series = score_series.sort_values(ascending=False)

        recommendations = []
        for item_id, score in score_series.head(n_recommendations).items():
            if score > 0: # Only recommend items with some positive signal
                recommendations.append({
                    'itemId': str(item_id),
                    'score': float(score),
                    'title': None,
                    'difficulty': None,
                    'tags': [],
                    'xpReward': None,
                    'languages': [],
                })
        
        # If we have fewer than requested, fill with popular items
        if len(recommendations) < n_recommendations:
            already_rec = {r['itemId'] for r in recommendations}
            popularity = self.user_sample.sum(axis=0).drop(index=list(seen_items | already_rec), errors='ignore').sort_values(ascending=False)
            for item_id, _ in popularity.head(n_recommendations - len(recommendations)).items():
                recommendations.append({
                    'itemId': str(item_id),
                    'score': 0.0,
                    'title': None,
                    'difficulty': None,
                    'tags': [],
                    'xpReward': None,
                    'languages': [],
                })

        return recommendations
