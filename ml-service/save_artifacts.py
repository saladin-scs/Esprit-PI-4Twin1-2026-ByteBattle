import argparse
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity


def build_recommender_artifacts(input_path: str, output_path: str, n_components: int = 50, n_clusters: int = 12) -> None:
    df = pd.read_csv(input_path)
    required_columns = {'handle', 'contestId', 'rating'}
    if not required_columns.issubset(df.columns):
        raise ValueError(f'Input CSV must contain columns: {required_columns}')

    df = df.dropna(subset=['handle', 'contestId']).copy()
    df['contestId'] = df['contestId'].astype(str)
    df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0)

    user_contest = df.pivot_table(
        index='handle',
        columns='contestId',
        values='rating',
        aggfunc='max',
        fill_value=0,
    )

    scaler = StandardScaler(with_mean=False)
    scaled = scaler.fit_transform(user_contest)

    n_components = min(n_components, scaled.shape[1], scaled.shape[0])
    pca = PCA(n_components=n_components, random_state=42)
    user_pca = pca.fit_transform(scaled)

    n_clusters = min(n_clusters, scaled.shape[0])
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto').fit(user_pca)

    similarity = cosine_similarity(user_pca)
    global_similarity = pd.DataFrame(similarity, index=user_contest.index, columns=user_contest.index)

    artifacts = {
        'user_sample': user_contest,
        'global_similarity': global_similarity,
        'user_pca': user_pca,
        'pca': pca,
        'kmeans': kmeans,
        'feature_names': user_contest.columns.tolist(),
    }

    joblib.dump(artifacts, output_path)
    print(f'Artifacts saved to {output_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Create ML recommender artifacts from a CSV export.')
    parser.add_argument('--input-data', required=True, help='Path to the user contest rating CSV file')
    parser.add_argument('--output-path', default='./models/recommender_artifacts.pkl', help='Output path for serialized artifacts')
    parser.add_argument('--n-components', type=int, default=50, help='Number of PCA components')
    parser.add_argument('--n-clusters', type=int, default=12, help='Number of KMeans clusters')

    args = parser.parse_args()
    build_recommender_artifacts(args.input_data, args.output_path, args.n_components, args.n_clusters)
