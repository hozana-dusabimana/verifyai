# VerifyAI — Machine Learning Models

This document describes the AI models VerifyAI trains and uses to detect fake news:
**what they are, how we trained them, how they work at prediction time, and which
journalistic standards they help us enforce.**

> **Scope.** This document covers the models we train ourselves from our own data.
> Naive Bayes and the LSTM are built entirely in-house — their vocabulary and weights
> are all learned here.

All model code lives in [`backend/ml_engine/`](../backend/ml_engine/):

| File | Role |
|------|------|
| `train.py` | Trains the models, writes artifacts + metrics |
| `inference.py` | Loads models, runs the weighted ensemble prediction |
| `preprocessing.py` | Text cleaning, sensationalism, headline–body consistency |
| `features.py` | Sentiment / explainability signals |
| `download_dataset.py` | Pulls the ISOT dataset from Kaggle |
| `debias_dataset.py` | Strips source-leak artifacts before training |
| `models_store/` | Trained artifacts (`*.joblib`, `*.pt`) + `model_metrics.json` |

---

## 1. The models at a glance

VerifyAI combines **two independently-trained classifiers** into an ensemble. Each one
reads text differently, so a blind spot in one is covered by the other.

| Model | Family | What it reads | Trained how | Relative weight |
|-------|--------|---------------|-------------|-----------------|
| **Naive Bayes** | Probabilistic (scikit-learn) | TF-IDF word/bigram frequencies | **From scratch** | **~71 %** |
| **LSTM** | Bidirectional RNN (PyTorch) | Word-order sequences | **From scratch** | **~29 %** |

### Why Naive Bayes carries more weight

Naive Bayes is deliberately the heavier vote. On our training data the neural LSTM
over-learned the *writing style* of wire-service journalism and tends to mark short or
informal — but genuinely real — news as fake. Naive Bayes, running on the de-biased
TF-IDF features, generalizes more honestly, so it anchors the ensemble.

---

## 2. The dataset and how we cleaned it

- **Source:** Kaggle's **ISOT "Fake and Real News" dataset** (~44,000 labelled
  articles, `0 = real`, `1 = fake`), downloaded via
  [`download_dataset.py`](../backend/ml_engine/download_dataset.py).
- **De-biasing (critical):** The raw ISOT data leaks its sources. Almost every *real*
  article opens with `(Reuters) -`; many *fakes* carry `Featured image` / Getty /
  `21st Century Wire` banners. Left in, the models would just learn *"is this
  Reuters?"* instead of real language patterns.
  [`debias_dataset.py`](../backend/ml_engine/debias_dataset.py) strips these tells so
  the models must learn actual linguistic signals.
- **Split:** 80 % train / 20 % test, **stratified** on the label, `random_state=42`
  ([`train.py:499-502`](../backend/ml_engine/train.py#L499-L502)).

---

## 3. How each model was trained

Entry point: `train_all()` in
[`train.py`](../backend/ml_engine/train.py#L466) → run with `python -m ml_engine.train`.

### 3.1 Naive Bayes — `train_naive_bayes()` ([train.py:138](../backend/ml_engine/train.py#L138))

1. Preprocess text (clean → lowercase → NLTK tokenize → drop stopwords/punctuation →
   lemmatize).
2. Vectorize with `TfidfVectorizer(max_features=10000, ngram_range=(1,2),
   sublinear_tf=True)` — unigrams **and** bigrams.
3. Fit `MultinomialNB(alpha=0.1)` (0.1 = light Laplace smoothing).
4. Save `tfidf_vectorizer.joblib` + `naive_bayes.joblib`.

Fast to train (~42 s) and fully interpretable: every word carries a learned
fake-vs-real weight.

### 3.2 LSTM — `train_lstm()` ([train.py:175](../backend/ml_engine/train.py#L175))

Architecture (`FakeNewsLSTM`):

```
token ids (200) → Embedding(vocab, 128, padding_idx=0)
                → BiLSTM(128, num_layers=2, dropout=0.3, bidirectional=True)
                → concat(final forward + backward hidden)  → (256)
                → Dropout(0.5) → Linear(256 → 1) → sigmoid → fake probability
```

Training recipe:
- Vocabulary built from the training set, **top 20,000 words** (`0=pad`, `1=unk`).
- Sequences truncated/padded to **200 tokens**.
- Loss `BCEWithLogitsLoss`, optimizer **Adam** (lr 1e-3), gradient clipping at 1.0,
  batch size 64, **3 epochs**.
- Saves `lstm_model.pt` (weights + `vocab_size`, `max_len`) and `lstm_vocab.joblib`.

Being bidirectional, it reads each article forwards and backwards, so it picks up
narrative structure and word order that bag-of-words Naive Bayes ignores.

### Test-set metrics (`models_store/model_metrics.json`)

| Model | Accuracy | Precision | Recall | F1 | Train time |
|-------|----------|-----------|--------|----|------------|
| Naive Bayes | 0.9655 | 0.9677 | 0.9651 | 0.9664 | 42 s |
| LSTM | 0.9984 | 0.9976 | 0.9993 | 0.9985 | ~33 min |

> ⚠️ **Reality check.** These near-perfect numbers are on the **ISOT test split**.
> On live, real-world articles, end-to-end accuracy is closer to **~80 %**, with a
> known ceiling on well-written, plausible hoaxes. ISOT is US-politics-heavy
> (2016–17), English-only, and the models judge *style*, not factual truth — there is
> no fact-checking step.

---

## 4. How prediction works (inference)

`predict_ensemble(text, title)` in
[`inference.py:161`](../backend/ml_engine/inference.py#L161) runs the full pipeline.
Models are **lazy-loaded singletons** (loaded once, cached in memory; GPU if
available); `clear_model_cache()` forces a reload after retraining.

1. **Each model returns a fake-probability** in `[0, 1]`: `nb_score`, `lstm_score`.
2. **Weighted blend** of the model scores into a single `ensemble` fake-probability,
   with Naive Bayes weighted more heavily than the LSTM (see §1).
3. **Credibility score** = `(1 − ensemble) × 100` → `[0, 100]`.
4. **Classification** ([inference.py:188-193](../backend/ml_engine/inference.py#L188-L193)):

   | Credibility | Verdict |
   |-------------|---------|
   | ≤ 40 | **FAKE** |
   | 40 – 60 | **UNCERTAIN** |
   | > 60 | **REAL** |

   The band is centred on the natural 50 % decision boundary so blatant hoaxes can
   actually be called FAKE, and widened to 40–60 so true-but-unsourced/encyclopedic
   text (which the ISOT models under-score) lands in UNCERTAIN rather than a hard FAKE.
5. **Confidence** = `max(credibility, 100 − credibility)` → `[50, 100]` — how sure the
   model is of the side it picked (not certainty of truth).

### Explainability signals (shown to users, *not* fed into the models)

| Signal | Source | Meaning |
|--------|--------|---------|
| **Sentiment / emotional tone** | VADER, `features.py` | Positive / Negative / Neutral tone |
| **Sensationalism score** | `compute_sensationalism_score()` | Clickbait words, `!!!`/`???`, ALL-CAPS, clickbait patterns |
| **Headline–body consistency** | `compute_headline_body_consistency()` | TF-IDF cosine similarity title↔body |
| **Top keywords** | `extract_top_keywords()` | TF-IDF top-10 terms |
| **Flagging reasons** | `_generate_flagging_reasons()` | Plain-language explanation of the verdict |

---

## 5. Which news standards these models help us uphold

The point of VerifyAI is not just a FAKE/REAL label — it is to operationalize core
**journalistic and information-integrity standards**. Each model/signal maps to one:

| Standard | What it means | How VerifyAI enforces it |
|----------|---------------|--------------------------|
| **Accuracy / factual reliability** | Content should not be fabricated or misleading | The ensemble credibility score + FAKE/UNCERTAIN/REAL verdict |
| **Headline integrity (no clickbait)** | The headline must reflect the body | Headline–body consistency score; low consistency is flagged |
| **Impartiality / neutral tone** | News reports facts, not manufactured outrage | VADER sentiment + sensationalism score flag emotionally loaded, ALL-CAPS, clickbait language |
| **Sourcing & corroboration** | Claims should be attributable and corroborated | Newsfeed publication gates (source corroboration + specificity), with UNCERTAIN steering unsourced text to editorial review instead of auto-publish |
| **Transparency / explainability** | Readers deserve to know *why* something was flagged | Per-model scores, top keywords, and plain-language flagging reasons are surfaced, not hidden |
| **Accountability / human oversight** | Automated calls must be reviewable | UNCERTAIN verdicts route to a human review queue; admins can retrain and unpublish |

In short: **Naive Bayes + LSTM → factual reliability**, **sensationalism + sentiment →
impartiality and headline integrity**, and the **explainability layer → transparency
and accountability**.

---

## 6. Operational quick reference

```bash
# Train (or retrain) the models from the ISOT dataset
cd backend
python -m ml_engine.train

# One-off prediction in Python
from ml_engine.inference import predict_ensemble
result = predict_ensemble("Article body…", title="Headline…")

# Model health / metrics
from ml_engine.inference import get_model_info
get_model_info()   # availability, metrics, ensemble weights
```

Admin endpoints (see [`backend/administration/views.py`](../backend/administration/views.py)):
`GET /api/admin/ml-models/`, `POST /api/admin/ml-retrain/`,
`GET /api/admin/ml-health/`, `POST /api/admin/ml-predict/`.
