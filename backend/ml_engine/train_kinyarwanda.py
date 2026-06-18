"""Train the Kinyarwanda fake-news classifier.

Consumes the machine-translated corpus produced by ``translate_dataset.py``
(``news_dataset_rw.csv``) and trains a TF-IDF + Logistic Regression pipeline.
TF-IDF combines word n-grams with character n-grams — the latter help with
Kinyarwanda's agglutinative morphology and with noise from machine translation.

The result mirrors the English Naive Bayes component (a single joblib artifact
exposing ``predict_proba``), so inference stays simple. Label convention matches
the rest of the project: 1 = fake, 0 = real.

Usage:
    python -m ml_engine.train_kinyarwanda
"""
import os
import json
import time

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, classification_report,
)

from .language import clean_for_rw

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models_store')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'datasets')
RW_CSV = os.path.join(DATA_DIR, 'news_dataset_rw.csv')
MODEL_PATH = os.path.join(MODELS_DIR, 'kinyarwanda_model.joblib')
METRICS_PATH = os.path.join(MODELS_DIR, 'model_metrics.json')


def build_pipeline():
    """TF-IDF (word 1-2grams + char 3-5grams) -> Logistic Regression."""
    word_vec = TfidfVectorizer(
        analyzer='word', ngram_range=(1, 2), min_df=2,
        max_features=30000, sublinear_tf=True,
    )
    char_vec = TfidfVectorizer(
        analyzer='char_wb', ngram_range=(3, 5), min_df=2,
        max_features=30000, sublinear_tf=True,
    )
    features = FeatureUnion([('word', word_vec), ('char', char_vec)])
    clf = LogisticRegression(max_iter=2000, C=4.0, class_weight='balanced')
    return Pipeline([('tfidf', features), ('clf', clf)])


def train(progress_cb=None):
    def report(pct, msg):
        if progress_cb:
            try:
                progress_cb(pct, msg)
            except Exception:
                pass
        print(f"[{pct:3d}%] {msg}", flush=True)

    if not os.path.exists(RW_CSV):
        raise FileNotFoundError(
            f"{RW_CSV} not found. Run `python -m ml_engine.translate_dataset` first."
        )

    report(5, 'Loading translated corpus')
    df = pd.read_csv(RW_CSV).dropna(subset=['text_rw', 'label'])
    df['clean'] = df['text_rw'].map(clean_for_rw)
    df = df[df['clean'].str.len() > 10]
    df['label'] = df['label'].astype(int)
    if df['label'].nunique() < 2:
        raise ValueError('Need both fake (1) and real (0) examples to train.')
    print(f"  rows={len(df)} label_dist={dict(df['label'].value_counts())}", flush=True)

    X_train, X_test, y_train, y_test = train_test_split(
        df['clean'], df['label'], test_size=0.2, random_state=42, stratify=df['label'],
    )

    report(35, f'Training on {len(X_train)} samples')
    start = time.time()
    pipe = build_pipeline()
    pipe.fit(X_train, y_train)
    elapsed = time.time() - start

    report(80, 'Evaluating')
    y_pred = pipe.predict(X_test)
    metrics = {
        'accuracy': round(accuracy_score(y_test, y_pred), 4),
        'precision': round(precision_score(y_test, y_pred), 4),
        'recall': round(recall_score(y_test, y_pred), 4),
        'f1_score': round(f1_score(y_test, y_pred), 4),
        'training_time': round(elapsed, 1),
        'train_samples': int(len(X_train)),
        'test_samples': int(len(X_test)),
        'language': 'rw',
        'model_type': 'tfidf+logreg (translated ISOT)',
    }
    print(classification_report(y_test, y_pred, target_names=['REAL', 'FAKE']), flush=True)
    print(f"  accuracy={metrics['accuracy']} f1={metrics['f1_score']} time={elapsed:.1f}s", flush=True)

    report(92, 'Saving model + metrics')
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)

    all_metrics = {}
    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH) as f:
                all_metrics = json.load(f)
        except (ValueError, OSError):
            all_metrics = {}
    all_metrics['kinyarwanda'] = metrics
    with open(METRICS_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_metrics, f, indent=2, ensure_ascii=False)

    report(100, f"Done -> {MODEL_PATH}")
    return metrics


if __name__ == '__main__':
    train()
