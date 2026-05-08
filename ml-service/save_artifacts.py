import pandas as pd
import argparse
import os
import logging
from app.recommender.trainer import RecommenderTrainer

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description='Build ByteBattle Recommender Artifacts')
    parser.add_argument('--input-data', type=str, required=True, help='Path to user interactions CSV (e.g. user_ratings.csv)')
    parser.add_argument('--output-path', type=str, default='./models/recommender_artifacts.pkl', help='Output path for .pkl file')
    parser.add_argument('--components', type=int, default=50, help='PCA components')
    parser.add_argument('--clusters', type=int, default=10, help='KMeans clusters')
    
    args = parser.parse_args()

    if not os.path.exists(args.input_data):
        logger.error(f"Input file not found: {args.input_data}")
        return

    logger.info(f"Loading data from {args.input_data}...")
    df = pd.read_csv(args.input_data)
    
    # The trainer expects 'handle' and 'contestId'
    # Mapping existing columns if necessary
    if 'userId' in df.columns and 'handle' not in df.columns:
        df = df.rename(columns={'userId': 'handle'})
    if 'itemId' in df.columns and 'contestId' not in df.columns:
        df = df.rename(columns={'itemId': 'contestId'})

    trainer = RecommenderTrainer(n_components=args.components, n_clusters=args.clusters)
    trainer.train(df, args.output_path)

if __name__ == '__main__':
    main()
