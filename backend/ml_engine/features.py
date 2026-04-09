"""
Feature Extraction Module for VerifyAI.

Extracts TF-IDF vectors, sentiment scores, and other NLP features.
"""

import os
import joblib
import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from .preprocessing import preprocess_text, compute_sensationalism_score, compute_headline_body_consistency

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models_store')

_sentiment_analyzer = SentimentIntensityAnalyzer()
_tfidf_vectorizer = None


def get_tfidf_vectorizer():
    """Load the trained TF-IDF vectorizer from disk."""
    global _tfidf_vectorizer
    if _tfidf_vectorizer is None:
        path = os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib')
        if os.path.exists(path):
            _tfidf_vectorizer = joblib.load(path)
        else:
            raise FileNotFoundError(
                "TF-IDF vectorizer not found. Please train models first."
            )
    return _tfidf_vectorizer


def compute_sentiment(text):
    """
    Compute VADER sentiment score.

    Returns:
        dict with 'compound', 'pos', 'neg', 'neu' scores
    """
    if not text:
        return {'compound': 0.0, 'pos': 0.0, 'neg': 0.0, 'neu': 1.0}
    scores = _sentiment_analyzer.polarity_scores(text)
    return scores


def extract_tfidf_features(text):
    """
    Extract TF-IDF feature vector for a single text.

    Returns:
        numpy array of TF-IDF features
    """
    clean_text, _ = preprocess_text(text)
    vectorizer = get_tfidf_vectorizer()
    return vectorizer.transform([clean_text])


def extract_all_features(text, title=''):
    """
    Extract all NLP features for a given text.

    Returns:
        dict with all feature values
    """
    # Preprocess
    clean_text, tokens = preprocess_text(text)

    # Sentiment analysis
    sentiment = compute_sentiment(text)

    # Sensationalism
    sensationalism = compute_sensationalism_score(text)

    # Headline-body consistency
    consistency = compute_headline_body_consistency(title, text)

    # Determine emotional tone from sentiment
    compound = sentiment['compound']
    if compound > 0.3:
        emotional_tone = 'Positive'
    elif compound < -0.3:
        emotional_tone = 'Negative'
    else:
        emotional_tone = 'Neutral'

    return {
        'clean_text': clean_text,
        'tokens': tokens,
        'sentiment_compound': sentiment['compound'],
        'sentiment_pos': sentiment['pos'],
        'sentiment_neg': sentiment['neg'],
        'sentiment_neu': sentiment['neu'],
        'sensationalism_score': sensationalism,
        'headline_body_consistency': consistency,
        'emotional_tone': emotional_tone,
        'word_count': len(tokens),
    }
