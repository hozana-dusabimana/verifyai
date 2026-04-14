"""
Inference Engine for VerifyAI.

Loads trained models and runs ensemble prediction on new text.
"""

import os
import json
import numpy as np
import joblib
import torch
import torch.nn as nn

from .preprocessing import preprocess_text, clean_text, compute_sensationalism_score, compute_headline_body_consistency, extract_top_keywords
from .features import compute_sentiment

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models_store')

# Singleton model cache
_models = {}


def _get_device():
    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')


def _load_naive_bayes():
    """Load Naive Bayes model and TF-IDF vectorizer."""
    if 'naive_bayes' not in _models:
        nb = joblib.load(os.path.join(MODELS_DIR, 'naive_bayes.joblib'))
        tfidf = joblib.load(os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib'))
        _models['naive_bayes'] = (nb, tfidf)
    return _models['naive_bayes']


def _load_lstm():
    """Load LSTM model."""
    if 'lstm' not in _models:
        checkpoint = torch.load(
            os.path.join(MODELS_DIR, 'lstm_model.pt'),
            map_location=_get_device(),
            weights_only=False,
        )
        vocab = joblib.load(os.path.join(MODELS_DIR, 'lstm_vocab.joblib'))
        vocab_size = checkpoint['vocab_size']
        max_len = checkpoint['max_len']

        class FakeNewsLSTM(nn.Module):
            def __init__(self, vocab_size, embed_dim=128, hidden_dim=128, num_layers=2):
                super().__init__()
                self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
                self.lstm = nn.LSTM(embed_dim, hidden_dim, num_layers=num_layers,
                                    batch_first=True, dropout=0.3, bidirectional=True)
                self.dropout = nn.Dropout(0.5)
                self.fc = nn.Linear(hidden_dim * 2, 1)

            def forward(self, x):
                embedded = self.embedding(x)
                lstm_out, (hidden, _) = self.lstm(embedded)
                hidden_cat = torch.cat((hidden[-2], hidden[-1]), dim=1)
                output = self.dropout(hidden_cat)
                return self.fc(output).squeeze(1)

        model = FakeNewsLSTM(vocab_size).to(_get_device())
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        _models['lstm'] = (model, vocab, max_len)
    return _models['lstm']


def _load_distilbert():
    """Load DistilBERT model with fine-tuned head."""
    if 'distilbert' not in _models:
        from transformers import DistilBertTokenizer, DistilBertModel

        checkpoint = torch.load(
            os.path.join(MODELS_DIR, 'distilbert_model.pt'),
            map_location=_get_device(),
            weights_only=False,
        )
        max_len = checkpoint['max_len']

        class DistilBertClassifier(nn.Module):
            def __init__(self):
                super().__init__()
                self.bert = DistilBertModel.from_pretrained('distilbert-base-uncased')
                self.dropout = nn.Dropout(0.3)
                self.fc = nn.Linear(768, 1)

            def forward(self, input_ids, attention_mask):
                outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
                cls_output = outputs.last_hidden_state[:, 0, :]
                dropped = self.dropout(cls_output)
                return self.fc(dropped).squeeze(1)

        tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
        model = DistilBertClassifier().to(_get_device())

        # Load fine-tuned weights
        head_state = checkpoint['head_state']
        model.fc.weight.data = head_state['fc.weight']
        model.fc.bias.data = head_state['fc.bias']

        bert_finetuned = checkpoint.get('bert_finetuned', {})
        bert_state = model.bert.state_dict()
        bert_state.update(bert_finetuned)
        model.bert.load_state_dict(bert_state)

        model.eval()
        _models['distilbert'] = (model, tokenizer, max_len)
    return _models['distilbert']


def predict_naive_bayes(text):
    """Run Naive Bayes inference. Returns fake probability."""
    nb, tfidf = _load_naive_bayes()
    clean_text, _ = preprocess_text(text)
    features = tfidf.transform([clean_text])
    prob = nb.predict_proba(features)[0][1]  # Probability of class 1 (fake)
    return float(prob)


def predict_lstm(text):
    """Run LSTM inference. Returns fake probability."""
    model, vocab, max_len = _load_lstm()
    device = _get_device()

    clean_text, _ = preprocess_text(text)
    words = clean_text.split()[:max_len]
    seq = [vocab.get(w, 1) for w in words]
    if len(seq) < max_len:
        seq = seq + [0] * (max_len - len(seq))

    input_tensor = torch.LongTensor([seq]).to(device)
    with torch.no_grad():
        output = model(input_tensor)
        prob = torch.sigmoid(output).cpu().item()
    return float(prob)


def predict_distilbert(text):
    """Run DistilBERT inference. Returns fake probability."""
    model, tokenizer, max_len = _load_distilbert()
    device = _get_device()

    normalized = clean_text(text)[:1000]
    encoding = tokenizer(
        normalized,
        truncation=True, padding='max_length',
        max_length=max_len, return_tensors='pt'
    )
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)

    with torch.no_grad():
        output = model(input_ids, attention_mask)
        prob = torch.sigmoid(output).cpu().item()
    return float(prob)


def predict_ensemble(text, title=''):
    """
    Run the full ensemble prediction pipeline.

    Returns a dict with all scores, classification, and explainability data.
    """
    # Individual model predictions (fake probabilities)
    nb_score = predict_naive_bayes(text)
    lstm_score = predict_lstm(text)
    bert_score = predict_distilbert(text)

    # Weighted ensemble: NB 50%, LSTM 20%, DistilBERT 30%
    # NB is upweighted because LSTM/BERT learned Reuters-style artifacts from
    # the ISOT training set and mislabel short, informal real news as fake.
    ensemble_fake_prob = (nb_score * 0.50) + (lstm_score * 0.20) + (bert_score * 0.30)

    # Credibility score
    credibility_score = round((1 - ensemble_fake_prob) * 100, 2)

    # Classification
    if credibility_score <= 15:
        classification = 'FAKE'
    elif credibility_score <= 50:
        classification = 'UNCERTAIN'
    else:
        classification = 'REAL'

    # Confidence
    confidence = round(abs(credibility_score - 50) * 2, 2)
    confidence = min(confidence, 100.0)

    # NLP features
    sentiment = compute_sentiment(text)
    sensationalism = compute_sensationalism_score(text)
    consistency = compute_headline_body_consistency(title, text)

    # Emotional tone
    compound = sentiment['compound']
    if compound > 0.3:
        emotional_tone = 'Positive'
    elif compound < -0.3:
        emotional_tone = 'Negative'
    else:
        emotional_tone = 'Neutral'

    # Top keywords
    top_keywords = extract_top_keywords(text, n=10)

    # Flagging reasons (explainability)
    flagging_reasons = _generate_flagging_reasons(
        ensemble_fake_prob, nb_score, lstm_score, bert_score,
        sensationalism, consistency, sentiment['compound']
    )

    return {
        'naive_bayes_score': round(nb_score, 4),
        'lstm_score': round(lstm_score, 4),
        'distilbert_score': round(bert_score, 4),
        'ensemble_score': round(ensemble_fake_prob, 4),
        'credibility_score': credibility_score,
        'classification': classification,
        'confidence': confidence,
        'sentiment_score': round(sentiment['compound'], 4),
        'emotional_tone': emotional_tone,
        'sensationalism_score': round(sensationalism, 4),
        'headline_body_consistency': round(consistency, 4),
        'top_keywords': top_keywords,
        'flagging_reasons': flagging_reasons,
    }


def _generate_flagging_reasons(ensemble_prob, nb_score, lstm_score, bert_score,
                                sensationalism, consistency, sentiment):
    """Generate plain-language explainability reasons."""
    reasons = []

    if ensemble_prob > 0.7:
        reasons.append(
            'Multiple ML models strongly indicate this content is likely fabricated or misleading.'
        )
    elif ensemble_prob > 0.5:
        reasons.append(
            'ML ensemble analysis suggests this content has characteristics commonly found in misinformation.'
        )

    if bert_score > 0.7:
        reasons.append(
            'Deep learning (DistilBERT) analysis detected language patterns typical of fake news articles.'
        )

    if lstm_score > 0.7:
        reasons.append(
            'Sequential text analysis (LSTM) found suspicious narrative structure and word patterns.'
        )

    if nb_score > 0.7:
        reasons.append(
            'Statistical word analysis (Naive Bayes) flagged unusual term frequency patterns.'
        )

    if sensationalism > 0.6:
        reasons.append(
            f'High sensationalism detected ({sensationalism:.0%}) — excessive use of emotional or clickbait language.'
        )

    if consistency < 0.3:
        reasons.append(
            'Headline does not match the body content, a common tactic in misleading articles.'
        )

    if sentiment < -0.5:
        reasons.append(
            'Strongly negative emotional tone detected, which is common in fabricated outrage content.'
        )
    elif sentiment > 0.7:
        reasons.append(
            'Unusually positive tone detected, which may indicate promotional or propaganda content.'
        )

    if not reasons:
        reasons.append('No major concerns detected. Content appears credible based on AI analysis.')

    return reasons


def get_model_info():
    """Get information about loaded models and their metrics."""
    metrics_path = os.path.join(MODELS_DIR, 'model_metrics.json')
    metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            metrics = json.load(f)

    models_available = {
        'naive_bayes': os.path.exists(os.path.join(MODELS_DIR, 'naive_bayes.joblib')),
        'lstm': os.path.exists(os.path.join(MODELS_DIR, 'lstm_model.pt')),
        'distilbert': os.path.exists(os.path.join(MODELS_DIR, 'distilbert_model.pt')),
        'tfidf_vectorizer': os.path.exists(os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib')),
    }

    return {
        'models_available': models_available,
        'all_ready': all(models_available.values()),
        'metrics': metrics,
        'ensemble_weights': {
            'naive_bayes': 0.50,
            'lstm': 0.20,
            'distilbert': 0.30,
        },
    }


def clear_model_cache():
    """Clear cached models from memory (used after retraining)."""
    global _models
    _models = {}
