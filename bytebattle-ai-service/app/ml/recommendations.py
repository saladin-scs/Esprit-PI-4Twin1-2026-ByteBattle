"""Recommendation Engine for challenges based on collaborative filtering"""

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Collaborative filtering-based recommendation system"""

    def __init__(self):
        self.user_contest_matrix = None
        self.similarity_matrix = None
        self.similarity_df = None
        self.contests_info = None

    def build_user_contest_matrix(
        self, df: pd.DataFrame, user_col: str = "handle", contest_col: str = "contestId",
        score_col: str = "problems_solved_num"
    ) -> pd.DataFrame:
        """
        Build user-contest matrix from interaction data

        Args:
            df: DataFrame with user-contest interactions
            user_col: Column name for users
            contest_col: Column name for contests
            score_col: Column name for interaction score

        Returns:
            Pivoted user-contest matrix
        """
        df_clean = df[[user_col, contest_col, score_col]].dropna()

        matrix = df_clean.pivot_table(
            index=user_col, columns=contest_col, values=score_col, fill_value=0
        )

        self.user_contest_matrix = matrix
        logger.info(f"Built user-contest matrix: {matrix.shape}")
        return matrix

    def compute_user_similarity(self, n_users: Optional[int] = None) -> pd.DataFrame:
        """
        Compute cosine similarity between users

        Args:
            n_users: Max users to sample (for speed)

        Returns:
            Similarity DataFrame
        """
        if self.user_contest_matrix is None:
            raise ValueError("Build user-contest matrix first")

        # Sample if needed
        if n_users and len(self.user_contest_matrix) > n_users:
            user_sample = self.user_contest_matrix.sample(n_users, random_state=42)
        else:
            user_sample = self.user_contest_matrix

        similarity = cosine_similarity(user_sample)
        self.similarity_df = pd.DataFrame(
            similarity, index=user_sample.index, columns=user_sample.index
        )

        logger.info(f"Computed similarity for {len(user_sample)} users")
        return self.similarity_df

    def recommend_challenges(
        self,
        user_id: str,
        n_similar: int = 5,
        n_recommendations: int = 5,
        contests_metadata: Optional[pd.DataFrame] = None,
    ) -> List[Dict]:
        """
        Recommend challenges for a user based on similar users

        Args:
            user_id: Target user ID
            n_similar: Number of similar users to consider
            n_recommendations: Number of challenges to recommend
            contests_metadata: Optional metadata about contests

        Returns:
            List of recommended challenges with scores
        """
        if self.similarity_df is None:
            logger.warning("Similarity matrix not available, returning demo recommendations")
            return [
                {"contestId": "demo_1", "name": "Algorithm Warmup", "difficulty": "Easy", "score": 0.92},
                {"contestId": "demo_2", "name": "Data Structures Sprint", "difficulty": "Medium", "score": 0.87},
                {"contestId": "demo_3", "name": "Optimization Challenge", "difficulty": "Hard", "score": 0.81},
            ][:n_recommendations]

        if user_id not in self.similarity_df.index:
            logger.warning(f"User {user_id} not found in similarity matrix")
            return []

        # Find similar users
        similar_users = (
            self.similarity_df[user_id]
            .drop(user_id)
            .sort_values(ascending=False)
            .head(n_similar)
        )

        # Contests already done by target user
        contests_done = set(
            self.user_contest_matrix.loc[user_id][
                self.user_contest_matrix.loc[user_id] > 0
            ].index
        )

        # Score contests from similar users
        scores = {}
        for similar_id, similarity_score in similar_users.items():
            contests_similar = self.user_contest_matrix.loc[similar_id]
            for contest_id, problems_solved in contests_similar.items():
                if contest_id not in contests_done and problems_solved > 0:
                    if contest_id not in scores:
                        scores[contest_id] = 0
                    scores[contest_id] += similarity_score * problems_solved

        if not scores:
            logger.warning(f"No recommendations found for {user_id}")
            return []

        # Get top recommendations
        top_contests = sorted(scores.items(), key=lambda x: x[1], reverse=True)[
            :n_recommendations
        ]

        recommendations = []
        for contest_id, score in top_contests:
            rec = {
                "contestId": contest_id,
                "score": float(score),
                "similarity_users": len(similar_users),
            }

            # Add metadata if provided
            if contests_metadata is not None:
                metadata = contests_metadata[
                    contests_metadata.get("contestId") == contest_id
                ]
                if not metadata.empty:
                    rec["name"] = metadata.iloc[0].get("name", "Unknown")
                    rec["difficulty"] = metadata.iloc[0].get("difficulty", "Medium")

            recommendations.append(rec)

        logger.info(
            f"Generated {len(recommendations)} recommendations for user {user_id}"
        )
        return recommendations

    def get_similar_users(
        self, user_id: str, n_similar: int = 5
    ) -> List[Dict[str, float]]:
        """Get list of similar users with similarity scores"""
        if self.similarity_df is None:
            logger.warning("Similarity matrix not available, returning demo similar users")
            return [
                {"userId": "user_101", "similarity": 0.93},
                {"userId": "user_202", "similarity": 0.89},
                {"userId": "user_303", "similarity": 0.85},
            ][:n_similar]

        if user_id not in self.similarity_df.index:
            return []

        similar = self.similarity_df[user_id].drop(user_id).sort_values(ascending=False).head(n_similar)

        return [{"userId": uid, "similarity": float(score)} for uid, score in similar.items()]
