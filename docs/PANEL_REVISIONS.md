# VerifyAI — Response to Panel Feedback (Major Revisions)

**Verdict received:** *Accepted with Major Revisions — enhancements to project context
needed; student re-presents to panel within two weeks to avoid rejection.*

This document responds, point by point, to the five required actions from the panel.
Each action lists **what was required**, **what we did**, and **where to verify it** in
the codebase, so the work is defensible during the re-presentation.

> **Project in one line.** VerifyAI is an intelligent system that analyzes and
> classifies digital content (news text/links) to detect and mitigate misinformation,
> in **English and Kinyarwanda**, with an explainable verdict (REAL / UNCERTAIN / FAKE).

---

## Summary table

| # | Required action | Status | Primary evidence |
|---|-----------------|--------|------------------|
| 1 | Improve & retrain the AI model | ✅ Done | [`ml_engine/train.py`](../backend/ml_engine/train.py), [`debias_dataset.py`](../backend/ml_engine/debias_dataset.py), [`model_metrics.json`](../backend/ml_engine/models_store/model_metrics.json) |
| 2 | Select & justify a specific case study | ✅ Done | §2 below + [`kinyarwanda_samples.md`](kinyarwanda_samples.md) |
| 3 | Comprehensive testing (accuracy/precision/recall/F1) | ✅ Done | [`model_metrics.json`](../backend/ml_engine/models_store/model_metrics.json), [`models.md`](models.md) |
| 4 | Detect & classify **Kinyarwanda** fake news | ✅ Done | [`train_kinyarwanda.py`](../backend/ml_engine/train_kinyarwanda.py), [`language.py`](../backend/ml_engine/language.py) |
| 5 | Update system, report & presentation | ✅ Done | [`models.md`](models.md), this document, live demo |

---

## Action 1 — Improve and retrain the AI model

**Required:** *Improve and retrain the AI model to enhance accuracy in detecting and
classifying misinformation across different types of digital content.*

**What we did:**

- **Models we trained ourselves, from scratch** — all weights/vocabulary learned
  here from our own data ([`train.py`](../backend/ml_engine/train.py),
  [`train_kinyarwanda.py`](../backend/ml_engine/train_kinyarwanda.py)):
  - **Naive Bayes** — TF-IDF (word + bigram) + `MultinomialNB`.
  - **LSTM** — bidirectional RNN over word-order sequences (PyTorch), embeddings
    learned from scratch.
  - **Kinyarwanda** — dedicated TF-IDF (word + character n-grams) + Logistic
    Regression (see Action 4).

  > **These three are the models we trained ourselves** and are the basis of the
  > system's verdicts. DistilBERT is also available as a *fine-tuned* option, but it
  > reuses a **pretrained** `distilbert-base-uncased` backbone (only a thin head +
  > last layers are tuned), so it is not a from-scratch model of ours.
- **De-biasing before training** to fix a real accuracy trap: raw ISOT leaks its
  sources (real articles open with `(Reuters) -`; fakes carry `21st Century Wire` /
  Getty banners). [`debias_dataset.py`](../backend/ml_engine/debias_dataset.py) strips
  these tells so the models learn **language patterns, not the publisher's name**.
- **Weighted ensemble at inference** with Naive Bayes anchored heavier than the LSTM,
  because the LSTM over-learned wire-service *style* and over-flagged short, informal
  but genuine news ([`inference.py`](../backend/ml_engine/inference.py)).
- **Retrainable in production** — admins can retrain from a new dataset via
  `POST /api/admin/ml-retrain/` without redeploying.

**Different types of digital content:** the pipeline accepts **pasted text** and
**article links** (`input_type: text | url`), auto-detects language, and routes to the
correct model.

---

## Action 2 — Select and justify a specific case study

**Required:** *Clearly select and justify a specific case study, explaining its
relevance and how it supports the problem statement and system validation.*

**Case study selected: misinformation in Rwandan online news (English + Kinyarwanda),
using the ISOT "Fake and Real News" corpus as the training base and a curated set of
Rwandan-context samples for validation.**

**Why this case study is relevant:**

- **Matches the problem statement.** The problem is the spread of misinformation in
  digital content consumed locally. Rwanda's media is **bilingual (English +
  Kinyarwanda)**, and no off-the-shelf detector covers Kinyarwanda — so the case study
  directly motivates the Kinyarwanda extension in Action 4.
- **Realistic misinformation patterns.** The validation samples in
  [`kinyarwanda_samples.md`](kinyarwanda_samples.md) are built around the hoax patterns
  that actually circulate locally: miracle cures, "get rich instantly" schemes,
  impossible events, and *"the government is hiding it"* conspiracy framing.
- **Supports system validation.** Each sample has an **expected label** and a **live
  verdict** from the deployed API (`https://api-verifyai.isiri.rw`), so the case study
  is not hypothetical — it is a reproducible acceptance test of the running system.

**Honest scope boundary (stated up front for the defense):** the models classify
**writing style and linguistic patterns**, not verified real-world facts — there is no
external fact-checking step. A well-written fabrication can still read as REAL. This is
why the middle band exists (UNCERTAIN → human review) rather than a hard binary.

---

## Action 3 — Comprehensive testing and evaluation metrics

**Required:** *Conduct comprehensive testing using appropriate datasets and evaluation
metrics (e.g., accuracy, precision, recall, F1-score).*

**Dataset & protocol:** ISOT (~44,000 labelled articles), **80/20 stratified split**,
`random_state=42` ([`train.py:499-502`](../backend/ml_engine/train.py#L499-L502)).
Metrics are computed on the held-out **test split** and written to
[`model_metrics.json`](../backend/ml_engine/models_store/model_metrics.json).

| Model | Trained by us | Accuracy | Precision | Recall | F1-score |
|-------|:---:|----------|-----------|--------|----------|
| Naive Bayes (EN) | ✅ from scratch | 0.9655 | 0.9677 | 0.9651 | 0.9664 |
| LSTM (EN) | ✅ from scratch | 0.9484 | 0.9476 | 0.9493 | 0.9485 |
| **Kinyarwanda (RW)** | ✅ from scratch | **0.9471** | **0.9681** | **0.9239** | **0.9455** |
| DistilBERT (EN) | fine-tuned pretrained | 0.9900 | 0.9904 | 0.9904 | 0.9904 |

All four metrics (accuracy, precision, recall, F1) are reported per model, exactly as
requested. The **three from-scratch models we trained** (Naive Bayes, LSTM,
Kinyarwanda) are the ones that back the system's verdicts; DistilBERT is listed for
completeness but reuses a pretrained backbone. Kinyarwanda additionally reports
`train_samples=1584`, `test_samples=397`.

> ⚠️ **Reality check (we say this at the defense, not hide it).** These are
> **test-split** numbers on ISOT (US-politics-heavy, 2016–17). On live, real-world
> articles end-to-end accuracy is closer to **~80%**, with a known ceiling on
> well-written, plausible hoaxes. This honesty is itself part of the system-validation
> story — see [`models.md`](models.md) §3.

**Beyond offline metrics:** real-world validation via the live samples in
[`kinyarwanda_samples.md`](kinyarwanda_samples.md), each run against the deployed API
with its actual verdict recorded (e.g. F1 "miracle cure" → FAKE ~18; R1 road-repair
report → REAL ~80).

---

## Action 4 — Detect and classify fake news written in Kinyarwanda

**Required:** *Extend the system to accurately detect and classify fake news written in
Kinyarwanda.*

**What we did — a dedicated Kinyarwanda pipeline:**

1. **Corpus.** Machine-translated the ISOT corpus into Kinyarwanda
   ([`translate_dataset.py`](../backend/ml_engine/translate_dataset.py) →
   `news_dataset_rw.csv`).
2. **Model.** TF-IDF combining **word 1–2 grams + character 3–5 grams** (char n-grams
   handle Kinyarwanda's agglutinative morphology and translation noise) → Logistic
   Regression with `class_weight='balanced'`
   ([`train_kinyarwanda.py`](../backend/ml_engine/train_kinyarwanda.py)).
3. **Language routing.** [`language.py`](../backend/ml_engine/language.py) auto-detects
   `en` / `rw` / `other` with a dependency-free stopword-ratio heuristic that **fails
   open** to English, and routes Kinyarwanda text to the Kinyarwanda model. The user
   passes **no language flag** — detection is automatic.
4. **Result:** accuracy **0.9471**, F1 **0.9455** on the held-out Kinyarwanda split,
   and confirmed working on the live API (see the samples doc).

**Known limitation (disclosed):** the model is trained on *machine-translated* news,
not native Kinyarwanda journalism, so it is reliable on blatant hoaxes but conservative
on genuine plain reporting (some real articles land in UNCERTAIN). The roadmap is to
fine-tune on native Kinyarwanda text as it is collected.

---

## Action 5 — Update system, report, and presentation

**Required:** *Update the system, report, and presentation to clearly demonstrate
improvements, results, and system effectiveness before the next defense.*

**System** — retrained models + new Kinyarwanda path deployed and live at
`https://verifyai.isiri.rw` (API `https://api-verifyai.isiri.rw`); admin retrain/health
endpoints available.

**Report / documentation** — this repo now carries:
- [`models.md`](models.md) — full model, dataset, ensemble, and inference reference.
- [`kinyarwanda_samples.md`](kinyarwanda_samples.md) — reproducible bilingual test set
  with live verdicts.
- **This document** — a direct, itemized answer to the panel's five actions.

**Presentation / demo checklist for the re-presentation:**
1. Show an **English** hoax → FAKE, and a real article → REAL.
2. Show a **Kinyarwanda** hoax (e.g. F1 "amazi ahindutse zahabu") → FAKE, and a real
   report (R1) → REAL — proving the Kinyarwanda extension works end-to-end.
3. Show the **metrics table** (Action 3) and the **explainability panel** (per-model
   scores, sensationalism, headline–body consistency, top keywords, flagging reasons).
4. State the **honest ~80% real-world ceiling** and how the UNCERTAIN band + human
   review handle it — turning a limitation into a designed safeguard.

---

## How to reproduce (for the panel)

```bash
# 1. Retrain the English models on the (de-biased) ISOT dataset
cd backend
python -m ml_engine.train

# 2. Build the Kinyarwanda corpus and train the Kinyarwanda model
python -m ml_engine.translate_dataset
python -m ml_engine.train_kinyarwanda

# 3. Inspect the metrics that back Action 3
cat ml_engine/models_store/model_metrics.json
```

For the model internals and journalistic-standards mapping, see
[`models.md`](models.md).
