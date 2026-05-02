# VerifyAI — ML Engine

Deep-dive into how the AI works inside VerifyAI: which models we use, how each one is wired internally (node-by-node), how they are combined, and what data flows through them at inference time.

This document covers the contents of [backend/ml_engine/](.) — everything under the `ml_engine` package that powers fake-news detection.

---

## 1. High-level pipeline

A submission travels through a 7-stage pipeline orchestrated by Celery in [analysis/tasks.py](../analysis/tasks.py). Stages 3–6 live inside this `ml_engine` package.

```
                           ┌─────────────────────────────┐
   user submits text/url/  │  Stage 1: Input Validation  │
   file via REST API  ───► │  Stage 2: Content Fetching  │
                           │  Stage 3: Preprocessing     │  ◄── preprocessing.py
                           │  Stage 4: Feature Extract.  │  ◄── features.py
                           │  Stage 5: Model Inference   │  ◄── inference.py
                           │  Stage 6: Score Generation  │  ◄── inference.py (ensemble)
                           │  Stage 7: Persist & Notify  │
                           └─────────────────────────────┘
                                          │
                                          ▼
                              AnalysisResult row +
                              optional Alert row
```

The entry point is [`predict_ensemble(text, title)`](inference.py) — it runs three independently-trained models, averages their fake-probabilities with fixed weights, and packages the answer plus explainability metadata.

---

## 2. The three models

We do **not** use a single end-to-end model. We use a heterogeneous ensemble so a weakness in one architecture is offset by another.

| Model        | Family               | Input representation     | Strength                                | Weight |
| ------------ | -------------------- | ------------------------ | --------------------------------------- | ------ |
| Naive Bayes  | Probabilistic        | TF-IDF unigrams+bigrams  | Robust word-frequency signal            | 0.50   |
| LSTM         | Recurrent NN         | Word index sequences     | Sequential / narrative structure        | 0.20   |
| DistilBERT   | Transformer (frozen) | Sub-word tokens (WordPiece) | Contextual / semantic understanding  | 0.30   |

**Why these weights?** Naive Bayes is upweighted because the LSTM and DistilBERT picked up Reuters-style stylistic artifacts from the ISOT training set (see [debias_dataset.py](debias_dataset.py)) and over-confidently mark short / informal real news as fake. NB, operating on a debiased TF-IDF, generalises better. The weights are set in [inference.py:175](inference.py#L175).

Reported metrics on the held-out test split (see [models_store/model_metrics.json](models_store/model_metrics.json)):

| Model       | Accuracy | F1     | Train time |
| ----------- | -------- | ------ | ---------- |
| Naive Bayes | 0.9655   | 0.9664 | 42 s       |
| LSTM        | 0.9984   | 0.9985 | 33 min     |
| DistilBERT  | 0.9995   | 0.9995 | 115 min    |

> Note: Headline numbers reflect performance on the ISOT distribution. Real-world performance is lower, which is precisely why the ensemble is weighted toward NB.

---

## 3. How each model works (node-level)

### 3.1 Naive Bayes — the statistical baseline

Defined in [train.py:77-107](train.py#L77-L107), used in [inference.py:114-120](inference.py#L114-L120).

```
                       ┌──────────────────────┐
   raw text ──► clean_text() ──► preprocess_text() ──► clean tokens
                       └──────────────────────┘
                                  │
                                  ▼
        ┌────────────────────────────────────────────┐
        │  TF-IDF Vectorizer                         │
        │    max_features = 10 000                   │
        │    ngram_range  = (1, 2)  ← unigram+bigram │
        │    sublinear_tf = True                     │
        └────────────────────────────────────────────┘
                                  │  sparse vector ∈ ℝ^10000
                                  ▼
        ┌────────────────────────────────────────────┐
        │  MultinomialNB                             │
        │    α (Laplace smoothing) = 0.1             │
        │    classes: 0 = REAL, 1 = FAKE             │
        │    P(class | features) ∝                    │
        │       P(class) · ∏ P(word | class)         │
        └────────────────────────────────────────────┘
                                  │
                                  ▼
                  predict_proba()[0][1]   → fake probability ∈ [0,1]
```

**Why it works:** vocabulary distributions differ significantly between fabricated and real reporting. NB is the only model in the ensemble that does not learn position or context — it trusts word counts, which makes it surprisingly stable on short and out-of-distribution text.

---

### 3.2 LSTM — the sequential reader

Defined in [train.py:114-241](train.py#L114-L241), used in [inference.py:36-68](inference.py#L36-L68) and [inference.py:123-138](inference.py#L123-L138).

The LSTM models text as an **ordered sequence**, so it can pick up on narrative tics (run-on sentences, repeated insistence, reverse-chronology storytelling) that bag-of-words ignores.

#### Network nodes (forward pass)

```
input: token-id tensor   shape = (batch, 200)
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────┐
   │ Embedding                                         │
   │   vocab_size  → 20 002   (top-20k + <pad> + <unk>)│
   │   embed_dim   = 128                               │
   │   padding_idx = 0                                 │
   │   output shape = (batch, 200, 128)                │
   └───────────────────────────────────────────────────┘
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────┐
   │ LSTM (bidirectional, 2 layers)                    │
   │   input_dim  = 128                                │
   │   hidden_dim = 128 per direction                  │
   │   num_layers = 2                                  │
   │   dropout    = 0.3 between layers                 │
   │   bidirectional = True                            │
   │   final hidden state = concat(h_fwd, h_bwd)       │
   │   shape = (batch, 256)                            │
   └───────────────────────────────────────────────────┘
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────┐
   │ Dropout (p = 0.5) — regularisation                │
   └───────────────────────────────────────────────────┘
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────┐
   │ Linear (fully connected)                          │
   │   in  = 256                                       │
   │   out = 1                                         │
   └───────────────────────────────────────────────────┘
                                   │
                                   ▼
                       sigmoid()  →  fake probability
```

#### Training details

- Loss: `BCEWithLogitsLoss` (binary cross-entropy with logits)
- Optimiser: `Adam`, lr = 1e-3
- Gradient clipping at norm 1.0
- Batch size 64, 3 epochs

#### Inference details

Inputs come in as raw text → `preprocess_text()` → tokens. Tokens are mapped to vocab indices (out-of-vocab → `1`, padded to length 200 with `0`). The model state is checkpointed in [models_store/lstm_model.pt](models_store/lstm_model.pt); the vocab in [models_store/lstm_vocab.joblib](models_store/lstm_vocab.joblib).

---

### 3.3 DistilBERT — the transformer

Defined in [train.py:248-398](train.py#L248-L398), used in [inference.py:71-111](inference.py#L71-L111) and [inference.py:141-158](inference.py#L141-L158).

This is a **fine-tuned** `distilbert-base-uncased` from Hugging Face with a classifier head on top of the `[CLS]` token. We freeze almost all of BERT's parameters and unfreeze only the last 20 parameter tensors plus the head — gives most of the benefit at a fraction of the training cost.

#### Network nodes

```
input: WordPiece token ids        shape = (batch, 256)
       attention mask             shape = (batch, 256)
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────┐
   │ DistilBertModel ('distilbert-base-uncased')       │
   │   • Token + Position embeddings (dim = 768)       │
   │   • 6 × Transformer blocks                        │
   │       ├─ 12-head self-attention                   │
   │       ├─ Add & LayerNorm                          │
   │       ├─ FFN (768 → 3072 → 768, GELU)             │
   │       └─ Add & LayerNorm                          │
   │   • Most params FROZEN; last ~20 tensors unfrozen │
   │   output: last_hidden_state (batch, 256, 768)     │
   └───────────────────────────────────────────────────┘
                                   │
                                   ▼  take [CLS] token slot 0
                              (batch, 768)
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────┐
   │ Dropout (p = 0.3)                                 │
   └───────────────────────────────────────────────────┘
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────┐
   │ Linear  (768 → 1)                                 │
   └───────────────────────────────────────────────────┘
                                   │
                                   ▼
                       sigmoid()  →  fake probability
```

#### Training details

- Subset of 8 000 train / 2 000 test examples (CPU-friendly)
- Loss: `BCEWithLogitsLoss`
- Optimiser: `AdamW`, lr = 2e-5, weight_decay = 0.01
- Gradient clipping at norm 1.0
- Batch size 16, 2 epochs

#### Storage trick

Saving the full DistilBERT base would be ~250 MB. Instead we save **only the fine-tuned tensors** — the classifier head plus the small set of unfrozen BERT parameters — and rely on Hugging Face's cached `distilbert-base-uncased` weights for the frozen majority. See [train.py:378-392](train.py#L378-L392) for the save logic and [inference.py:99-107](inference.py#L99-L107) for the merge-on-load logic.

---

## 4. Preprocessing & feature extraction

Two modules support the ML models:

### [preprocessing.py](preprocessing.py)

- `clean_text()` strips URLs, HTML, emojis, hashtags, mentions, bullet glyphs.
- `preprocess_text()` lower-cases, tokenises (NLTK `word_tokenize`), drops stopwords/punctuation, lemmatises (`WordNetLemmatizer`). Used by NB and LSTM. DistilBERT bypasses this — its WordPiece tokenizer is its own preprocessing.
- `compute_sensationalism_score()` — heuristic 0–1 score combining sensational vocabulary density, excessive `!`/`?`, ALL-CAPS ratio, and clickbait regex matches.
- `compute_headline_body_consistency()` — TF-IDF cosine similarity between title and body. Low values flag headline–body mismatch.
- `extract_top_keywords()` — TF-IDF top-N for explainability.

### [features.py](features.py)

- `compute_sentiment()` — VADER polarity (`compound`, `pos`, `neg`, `neu`).
- `extract_all_features()` — bundles sentiment, sensationalism, consistency, and word count.

These features are not fed *into* the models; they are computed alongside them and surfaced in the result for explainability.

---

## 5. The ensemble — how scores are combined

[`predict_ensemble`](inference.py#L161) is the single function called by [analysis/tasks.py:85](../analysis/tasks.py#L85). It:

1. Calls `predict_naive_bayes`, `predict_lstm`, `predict_distilbert` — each returns a fake-probability ∈ [0, 1].
2. Combines them:
   ```
   ensemble_fake_prob = 0.50 · NB  +  0.20 · LSTM  +  0.30 · BERT
   credibility_score  = (1 − ensemble_fake_prob) × 100
   ```
3. Classifies the result:
   ```
   credibility ≤ 15  →  FAKE
   15 < credibility ≤ 50  →  UNCERTAIN
   credibility > 50  →  REAL
   ```
4. Computes a **confidence** value as the distance from the 50% boundary, doubled and clipped to 100.
5. Computes the explainability features (sentiment, sensationalism, consistency, keywords).
6. Generates plain-language **flagging reasons** in [`_generate_flagging_reasons()`](inference.py#L232).

The complete return shape is consumed by [`AnalysisResult`](../analysis/models.py#L35) in the database.

---

## 6. Model loading and caching

Models are loaded **lazily** by `_load_naive_bayes`, `_load_lstm`, `_load_distilbert`. The first prediction in a worker pays the load cost; subsequent predictions reuse the in-memory singleton via the `_models` dict in [inference.py:20](inference.py#L20). After retraining, [`clear_model_cache()`](inference.py#L313) is called to force a reload.

CUDA is auto-detected via `_get_device()` — uses GPU if available, else CPU.

---

## 7. Files in this package

```
ml_engine/
├── __init__.py
├── download_dataset.py    # Pulls ISOT Fake/Real News dataset from Kaggle
├── debias_dataset.py      # Strips Reuters/Getty/etc source-leak signatures
├── preprocessing.py       # NLP cleaning, lemmatisation, sensationalism, consistency
├── features.py            # VADER sentiment + feature bundle
├── train.py               # Trains all 3 models, saves to models_store/
├── inference.py           # Loads models + predict_ensemble() entry point
├── datasets/              # Cached news_dataset.csv (after download)
└── models_store/          # Trained artifacts
    ├── naive_bayes.joblib
    ├── tfidf_vectorizer.joblib
    ├── lstm_model.pt
    ├── lstm_vocab.joblib
    ├── distilbert_model.pt
    └── model_metrics.json
```

---

## 8. Operational notes

### Train (or retrain) all models

```bash
cd backend
python -m ml_engine.train
```

This runs `train_all()` in [train.py:405](train.py#L405) — downloads the dataset if missing, preprocesses, trains all three models, evaluates on a 20% test split, writes artifacts to `models_store/`.

Or, asynchronously via Celery:

```python
from analysis.tasks_ml import run_model_training
run_model_training.delay()
```

### Run a one-off prediction

```python
from ml_engine.inference import predict_ensemble
predict_ensemble("Article body text...", title="Optional title")
```

### Verify which models are ready

```python
from ml_engine.inference import get_model_info
get_model_info()
# {'all_ready': True, 'models_available': {...}, 'metrics': {...}, 'ensemble_weights': {...}}
```

The pipeline in [analysis/tasks.py:72](../analysis/tasks.py#L72) refuses to run if `all_ready` is False — admins must train models before submissions can complete.

---

## 9. Known limitations

- **Domain shift.** The ISOT dataset is overwhelmingly US politics, 2016–2017. Generalisation to other regions, languages, or topics is weaker than the metrics suggest.
- **English only.** The tokenizers, stopword lists, VADER lexicon, and DistilBERT base are all English. Non-English text will produce unreliable scores.
- **Length sensitivity.** LSTM truncates at 200 tokens; DistilBERT truncates at 256 sub-word tokens (~1 000 characters). Long-form investigative pieces are evaluated only on their opening section.
- **No fact-checking.** The models detect *style and language patterns* of fake news, not whether claims are factually true. Combining with an external fact-check source remains future work.
