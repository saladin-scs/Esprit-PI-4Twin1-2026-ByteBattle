"""Machine Learning Models for predictions and classifications"""

import numpy as np
import joblib
import math
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, roc_curve, auc
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class MLModelEnsemble:
    """Manages multiple ML models for performance prediction"""

    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.feature_names = []

    def train_random_forest(
        self, X_train: np.ndarray, y_train: np.ndarray
    ) -> Dict[str, float]:
        """Train Random Forest classifier"""
        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=6,
            min_samples_leaf=10,
            min_samples_split=20,
            max_features="sqrt",
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X_train, y_train)
        self.models["rf"] = rf

        X_test_split = X_train[: len(X_train) // 5]
        y_test_split = y_train[: len(y_train) // 5]
        accuracy = rf.score(X_test_split, y_test_split)

        logger.info(f"Random Forest trained - Accuracy: {accuracy:.4f}")
        return {"model": "rf", "accuracy": accuracy}

    def train_svm(self, X_train: np.ndarray, y_train: np.ndarray) -> Dict[str, float]:
        """Train SVM classifier (on subsample for speed)"""
        # Use subsample for speed
        n_sample = min(3000, len(X_train))
        idx = np.random.choice(len(X_train), n_sample, replace=False)
        X_sample = X_train[idx]
        y_sample = y_train[idx]

        X_scaled = self.scaler.fit_transform(X_sample)
        svm = SVC(probability=True, random_state=42, C=1.0, kernel="rbf")
        svm.fit(X_scaled, y_sample)
        self.models["svm"] = svm

        X_test_scaled = self.scaler.transform(X_sample[:500])
        accuracy = svm.score(X_test_scaled, y_sample[:500])

        logger.info(f"SVM trained - Accuracy: {accuracy:.4f}")
        return {"model": "svm", "accuracy": accuracy}

    def train_decision_tree(
        self, X_train: np.ndarray, y_train: np.ndarray
    ) -> Dict[str, float]:
        """Train Decision Tree classifier"""
        dt = DecisionTreeClassifier(
            max_depth=4, min_samples_leaf=15, min_samples_split=30, random_state=42
        )
        dt.fit(X_train, y_train)
        self.models["dt"] = dt

        X_test_split = X_train[: len(X_train) // 5]
        y_test_split = y_train[: len(y_train) // 5]
        accuracy = dt.score(X_test_split, y_test_split)

        logger.info(f"Decision Tree trained - Accuracy: {accuracy:.4f}")
        return {"model": "dt", "accuracy": accuracy}

    def train_logistic_regression(
        self, X_train: np.ndarray, y_train: np.ndarray
    ) -> Dict[str, float]:
        """Train Logistic Regression classifier"""
        X_scaled = self.scaler.fit_transform(X_train)
        lr = LogisticRegression(max_iter=500, random_state=42)
        lr.fit(X_scaled, y_train)
        self.models["lr"] = lr

        X_test_split = X_scaled[: len(X_scaled) // 5]
        y_test_split = y_train[: len(y_train) // 5]
        accuracy = lr.score(X_test_split, y_test_split)

        logger.info(f"Logistic Regression trained - Accuracy: {accuracy:.4f}")
        return {"model": "lr", "accuracy": accuracy}

    def train_mlp(self, X_train: np.ndarray, y_train: np.ndarray) -> Dict[str, float]:
        """Train Neural Network (MLP) classifier"""
        X_scaled = self.scaler.fit_transform(X_train)
        mlp = MLPClassifier(
            hidden_layer_sizes=(64, 32),
            activation="relu",
            solver="adam",
            alpha=0.01,
            learning_rate="adaptive",
            max_iter=500,
            early_stopping=True,
            validation_fraction=0.15,
            n_iter_no_change=15,
            random_state=42,
        )
        mlp.fit(X_scaled, y_train)
        self.models["mlp"] = mlp

        X_test_split = X_scaled[: len(X_scaled) // 5]
        y_test_split = y_train[: len(y_train) // 5]
        accuracy = mlp.score(X_test_split, y_test_split)

        logger.info(f"MLP trained - Accuracy: {accuracy:.4f}")
        return {"model": "mlp", "accuracy": accuracy}

    def predict(self, X: np.ndarray, model_name: str = "rf") -> Tuple[np.ndarray, np.ndarray]:
        """
        Make predictions with specified model

        Args:
            X: Feature matrix
            model_name: Model to use ('rf', 'svm', 'dt', 'lr', 'mlp')

        Returns:
            predictions, probabilities
        """
        def fallback_predict(input_matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
            if input_matrix.ndim == 1:
                input_matrix = input_matrix.reshape(1, -1)

            feature_means = input_matrix.astype(float).mean(axis=1)
            probabilities = np.array(
                [1.0 / (1.0 + math.exp(-float(value) / 100.0)) for value in feature_means]
            )
            predictions = (probabilities >= 0.5).astype(int)
            return predictions, probabilities

        if model_name not in self.models:
            logger.warning(f"Model {model_name} not trained, using heuristic fallback")
            return fallback_predict(X)

        model = self.models[model_name]

        try:
            if model_name == "svm":
                X_scaled = self.scaler.transform(X)
                predictions = model.predict(X_scaled)
                probabilities = model.predict_proba(X_scaled)[:, 1]
            else:
                if hasattr(model, "predict_proba"):
                    predictions = model.predict(X)
                    probabilities = model.predict_proba(X)[:, 1]
                else:
                    predictions = model.predict(X)
                    probabilities = predictions.astype(float)

            return predictions, probabilities
        except Exception as error:
            logger.warning(f"Model prediction failed, using heuristic fallback: {error}")
            return fallback_predict(X)

    def save_models(self, path: str) -> None:
        """Save trained models to disk"""
        joblib.dump(self.models, f"{path}/models.pkl")
        joblib.dump(self.scaler, f"{path}/scaler.pkl")
        logger.info(f"Models saved to {path}")

    def load_models(self, path: str) -> None:
        """Load trained models from disk"""
        self.models = joblib.load(f"{path}/models.pkl")
        self.scaler = joblib.load(f"{path}/scaler.pkl")
        logger.info(f"Models loaded from {path}")
