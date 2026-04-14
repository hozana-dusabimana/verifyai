# VerifyAI - AI-Powered Fake News Detection Platform

VerifyAI is a full-stack web application that detects misinformation using an ensemble of three machine learning models. It provides journalists, governments, and citizens with credibility scores, explainable flagging reasons, and real-time alerts for suspicious content.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router v7, Tailwind CSS 3, Recharts, Lucide Icons, Axios |
| Backend | Django 4.2 LTS, Django REST Framework, SimpleJWT |
| Database | MySQL / MariaDB (via XAMPP) |
| ML Engine | PyTorch, Transformers (HuggingFace), scikit-learn, NLTK, VADER |
| Task Queue | Celery (runs synchronously in dev via `CELERY_TASK_ALWAYS_EAGER`) |
| Build Tool | Vite |

## Project Structure

```
verifyai/
├── backend/
│   ├── accounts/               # User model, auth, API keys
│   ├── analysis/               # Article submission, ML pipeline, export
│   ├── alerts/                 # Alert CRUD, notification preferences
│   ├── analytics/              # Summary stats, trends, sources, keywords
│   ├── administration/         # System health, audit logs, datasets, ML admin
│   ├── ml_engine/              # Machine learning models and training scripts
│   │   ├── models_store/       # Trained model weights (git-ignored)
│   │   ├── datasets/           # Downloaded training data (git-ignored)
│   │   ├── download_dataset.py # Kaggle dataset downloader
│   │   ├── preprocessing.py    # NLP text preprocessing
│   │   ├── features.py         # Feature extraction (TF-IDF, sentiment)
│   │   ├── train.py            # Model training pipeline
│   │   └── inference.py        # Model loading and ensemble prediction
│   ├── config/                 # Django settings, URLs, Celery, WSGI
│   ├── schema.sql              # Full database schema (raw SQL)
│   ├── requirements.txt        # Python dependencies
│   └── manage.py               # Django CLI
├── frontend/
│   ├── src/
│   │   ├── components/         # Navbar, DashboardLayout
│   │   ├── contexts/           # AuthContext (JWT state management)
│   │   ├── pages/              # All application pages
│   │   │   ├── admin/          # Admin panel (health, users, datasets, ML models)
│   │   │   └── *.jsx           # User-facing pages
│   │   └── services/
│   │       └── api.js          # Axios instance, JWT interceptors, all API modules
│   ├── vite.config.js          # Dev proxy to Django backend
│   └── package.json
└── README.md
```

---

## How the AI Works

### Overview

VerifyAI uses a **3-model ensemble** to classify news articles as **REAL**, **UNCERTAIN**, or **FAKE**. Each model brings different strengths:

| Model | Weight | Strength |
|-------|--------|----------|
| Naive Bayes (TF-IDF) | 20% | Fast statistical word-frequency analysis |
| Bidirectional LSTM | 35% | Captures sequential patterns and narrative structure |
| DistilBERT (fine-tuned) | 45% | Deep contextual language understanding |

The final credibility score is computed as:

```
ensemble_fake_prob = (NB * 0.20) + (LSTM * 0.35) + (DistilBERT * 0.45)
credibility_score  = (1 - ensemble_fake_prob) * 100
```

**Classification bands:**
- **0-30%** credibility = **FAKE**
- **31-60%** credibility = **UNCERTAIN**
- **61-100%** credibility = **REAL**

### The 7-Stage Analysis Pipeline

When a user submits an article (text, URL, or file), the system runs a Celery async pipeline:

1. **Input Validation** - Check content length (50-50,000 chars)
2. **Content Fetching** - For URLs: extract text via newspaper3k (with BeautifulSoup fallback). For files: extract text from PDFs (PyPDF2) or plain text
3. **Preprocessing** - NLTK tokenization, lemmatization, stop-word removal, URL/HTML stripping
4. **Feature Extraction** - TF-IDF vectorization, VADER sentiment, sensationalism scoring, headline-body consistency
5. **Model Inference** - Run all 3 models (NB, LSTM, DistilBERT) and compute ensemble score
6. **Score Generation** - Compute credibility score, classification, confidence, and explainability reasons
7. **Persistence & Notify** - Save results to database; auto-create alerts for low-credibility content

### NLP Features (Beyond Classification)

| Feature | Method | Purpose |
|---------|--------|---------|
| Sentiment Analysis | VADER lexicon | Detects emotional manipulation |
| Sensationalism Score | Clickbait word density, excessive punctuation, ALL CAPS detection | Measures clickbait language |
| Headline-Body Consistency | TF-IDF cosine similarity between title and body | Catches misleading headlines |
| Keyword Extraction | TF-IDF term importance ranking | Identifies dominant topics |
| Flagging Reasons | Rule-based on all scores | Plain-language explainability |

### Model Architectures

#### 1. Naive Bayes (MultinomialNB)

- **Input:** TF-IDF vectors (10,000 features, unigrams + bigrams, sublinear TF)
- **Algorithm:** Multinomial Naive Bayes with alpha=0.1 smoothing
- **Output:** Probability of being fake
- **Speed:** Trains in ~42 seconds

#### 2. Bidirectional LSTM

- **Architecture:** Embedding(128d) → BiLSTM(2 layers, 128 hidden, dropout=0.3) → Dropout(0.5) → Linear(256→1)
- **Vocabulary:** Top 20,000 words from training data, max sequence length 200
- **Training:** 3 epochs, Adam optimizer (lr=0.001), BCEWithLogitsLoss, gradient clipping at 1.0
- **Output:** Sigmoid probability of being fake
- **Speed:** Trains in ~33 minutes on CPU

#### 3. DistilBERT (Fine-tuned Transformer)

- **Base:** `distilbert-base-uncased` from HuggingFace
- **Classifier Head:** [CLS] token → Dropout(0.3) → Linear(768→1)
- **Fine-tuning Strategy:** Freeze all but last 20 parameters of BERT encoder + train classifier head
- **Training:** 2 epochs, AdamW optimizer (lr=2e-5, weight_decay=0.01), 8,000 training samples
- **Disk Optimization:** Only saves classifier head + fine-tuned BERT layers (~37MB instead of ~250MB)
- **Speed:** Trains in ~115 minutes on CPU

### Training Dataset

- **Source:** [ISOT Fake News Dataset](https://www.kaggle.com/datasets/clmentbisaillon/fake-and-real-news-dataset) from Kaggle
- **Size:** ~44,000 articles (roughly balanced between real and fake)
- **Real News:** Reuters articles covering world news, politics, etc.
- **Fake News:** Articles from various unreliable sources flagged by Politifact and Wikipedia
- **Split:** 80% training / 20% testing, stratified by label

### Model Performance

| Model | Accuracy | Precision | Recall | F1-Score |
|-------|----------|-----------|--------|----------|
| Naive Bayes | 96.55% | 96.77% | 96.51% | 96.64% |
| LSTM | 99.84% | 99.76% | 99.93% | 99.85% |
| DistilBERT | 99.95% | 99.90% | 100.0% | 99.95% |

---

## Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- XAMPP (MySQL/MariaDB)
- Kaggle account (for dataset download)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd verifyai
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (happens automatically on first import, but you can pre-download)
python -c "import nltk; nltk.download('punkt_tab'); nltk.download('stopwords'); nltk.download('wordnet')"
```

### 3. Environment Variables

Create `backend/.env`:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
DB_NAME=verifyai
DB_USER=root
DB_PASSWORD=
DB_HOST=127.0.0.1
DB_PORT=3306
ALERT_CREDIBILITY_THRESHOLD=30
```

### 4. Database Setup

Start XAMPP and create the database:

```sql
CREATE DATABASE verifyai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run migrations:

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
```

### 5. Frontend Setup

```bash
cd frontend
npm install
```

### 6. Kaggle Configuration (Required for Training)

Create or edit `~/.kaggle/kaggle.json` (or `C:\Users\<user>\.kaggle\kaggle.json` on Windows):

```json
{
  "username": "your-kaggle-username",
  "key": "your-kaggle-api-key"
}
```

Get your API key from: Kaggle > Account > API > Create New Token

---

## How to Train the ML Models

### Quick Start (Train All Models)

From the `backend/` directory with the virtual environment activated:

```bash
python -m ml_engine.train
```

This single command will:
1. Download the dataset from Kaggle (~44,000 articles) if not already cached
2. Preprocess all articles (tokenize, lemmatize, remove stop words)
3. Train **Naive Bayes** on TF-IDF features (~42 seconds)
4. Train **LSTM** on tokenized sequences (~33 minutes on CPU)
5. Train **DistilBERT** with fine-tuning (~115 minutes on CPU)
6. Save all model weights to `ml_engine/models_store/`
7. Save evaluation metrics to `ml_engine/models_store/model_metrics.json`

**Total training time on CPU: ~2.5 hours**

### Step-by-Step Training

#### Step 1: Download the Dataset

```bash
python -m ml_engine.download_dataset
```

This downloads the ISOT Fake News Dataset from Kaggle, combines `Fake.csv` and `True.csv`, shuffles them, and saves the combined dataset. The dataset is cached in the Kaggle cache directory (`~/.cache/kagglehub/`).

#### Step 2: Train All Models

```bash
python -m ml_engine.train
```

#### Step 3: Verify Models

After training, the following files should exist in `backend/ml_engine/models_store/`:

| File | Size | Description |
|------|------|-------------|
| `naive_bayes.joblib` | ~314 KB | Trained Naive Bayes classifier |
| `tfidf_vectorizer.joblib` | ~338 KB | Fitted TF-IDF vectorizer (10K features) |
| `lstm_model.pt` | ~13 MB | LSTM model weights + vocabulary size |
| `lstm_vocab.joblib` | ~261 KB | Word-to-index vocabulary mapping |
| `distilbert_model.pt` | ~37 MB | DistilBERT classifier head + fine-tuned layers |
| `model_metrics.json` | ~451 B | Accuracy/precision/recall/F1 for all models |

### Retraining from the Admin Panel

Admins can retrain models through the web interface:

1. Log in as an admin user
2. Navigate to **Admin Console** > **ML Models**
3. Click **Retrain Models**
4. Optionally upload a new dataset first via **Dataset Manager**

This triggers an async Celery task that retrains all 3 models and reloads them into memory.

### Training on Custom Data

To train on your own dataset, prepare a CSV file with these columns:

| Column | Type | Description |
|--------|------|-------------|
| `title` | string | Article headline |
| `text` | string | Article body text |
| `label` | int | 0 = real, 1 = fake |

Then pass the path:

```python
from ml_engine.train import train_all
metrics = train_all(dataset_path='/path/to/your/dataset.csv')
```

---

## Running the Application

### Start the Backend

```bash
cd backend
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/v1/`.

### Start the Frontend (Development)

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173/` with API requests proxied to the backend.

### Build for Production

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (returns JWT) |
| POST | `/api/v1/auth/logout` | Logout (blacklist refresh token) |
| POST | `/api/v1/auth/refresh` | Refresh access token |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/analysis/submit` | Submit article for analysis (text, URL, or file) |
| GET | `/api/v1/analysis/{id}` | Get analysis result |
| GET | `/api/v1/analysis/{id}/status` | Check pipeline status |
| GET | `/api/v1/analysis/{id}/explain` | Get explainability details |
| GET | `/api/v1/analysis/history` | Get user's analysis history |
| GET | `/api/v1/analysis/{id}/export/pdf` | Export result as PDF |

### ML Engine (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ml/models` | Get model info and metrics |
| GET | `/api/v1/ml/health` | Check ML engine status |
| POST | `/api/v1/ml/retrain` | Trigger model retraining |
| POST | `/api/v1/ml/predict` | Direct model prediction (testing) |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/summary` | Dashboard summary statistics |
| GET | `/api/v1/analytics/trends` | Detection trends over time |
| GET | `/api/v1/analytics/sources` | Source reliability rankings |
| GET | `/api/v1/analytics/keywords` | Trending keywords in flagged content |

---

## Key Design Decisions

### Why 3 Models Instead of 1?

Each model captures different patterns:
- **Naive Bayes** excels at statistical word-level patterns and is extremely fast
- **LSTM** captures sequential relationships and narrative flow
- **DistilBERT** understands deep contextual meaning and nuance

The weighted ensemble reduces false positives/negatives that any single model might produce.

### Why DistilBERT Instead of Full BERT?

DistilBERT is 40% smaller and 60% faster than BERT while retaining 97% of its performance. This matters for CPU-only inference in a web application where response time is critical.

### Why Save Only the Classifier Head?

The base DistilBERT weights (~250MB) are already available from HuggingFace's model hub. We only save the classifier head + fine-tuned layers (~37MB), and reconstruct the full model at inference time by loading the base model from cache and applying our fine-tuned weights on top.

### Why CPU-Only?

The platform is designed to run on standard web servers without GPU requirements. PyTorch CPU inference for a single article takes 1-3 seconds, which is acceptable for a web application with async processing.

---

## News Submission Format

For accurate classification, submitted articles should follow a journalistic format. The models were trained on clean news text — stylistic noise (emojis, bullets, banners) can skew predictions.

### Recommended Structure

```
Title: <short, factual headline (5-15 words)>

Body: <2-6 sentences of plain prose. Include named sources,
specific figures, dates, and locations where possible.>
```

### Guidelines

| Do | Avoid |
|----|-------|
| Plain prose sentences | Bullet points, numbered lists |
| Named officials and organizations | Anonymous "they say" claims |
| Specific numbers, dates, places | Vague quantifiers ("many", "a lot") |
| Neutral reporting tone | ALL CAPS, `!!!`, clickbait phrases |
| Minimum 50 characters of body | Emojis, decorative symbols (`→`, `•`, `👉`) |
| At least one verifiable fact | Source-identifying banners ("Featured image", "Getty Images") |

### Example — Correctly Formatted Real News

**Title:** Trump announces US naval blockade of Iran after peace talks fail

**Body:**
> US President Donald Trump announced a naval blockade of Iran effective immediately, directing the military to seek and interdict any vessel that paid Iran's toll to cross the Strait of Hormuz. The blockade on traffic entering and leaving Iranian ports began at 10 a.m. ET on Monday, after weekend ceasefire talks in Islamabad, Pakistan collapsed. Vice President JD Vance, who led the American delegation, said the two sides failed to reach a deal, citing disagreement over nuclear weapon development. Brent crude has risen roughly 40% since the war began, with prices approaching $100 a barrel on Monday.

### Example — Poorly Formatted Input (will degrade prediction)

```
SHOCKING!!! Global economy hit by Iran conflict 👉
- Growth dropped ~3.1%
- Inflation rising
- Energy disruptions
This is confirmed real news!!!
```

Why this fails: clickbait punctuation, emoji, bullet formatting, and promotional phrasing ("confirmed real news") trigger sensationalism and fake-pattern features, even when the underlying facts are true.

### Input Normalization

The preprocessor automatically strips URLs, HTML tags, emojis, bullet symbols, hashtags, and `@mentions` before inference. You don't need to clean these yourself — but avoiding them in the submission gives the models the clearest possible signal.

### Sample URLs for Testing

When submitting via URL, the backend fetches the page with **newspaper3k** (BeautifulSoup fallback) and extracts title + body before running inference. The page must be publicly accessible; paywalled or JS-heavy pages may extract poorly.

**Established outlets — any recent article should classify as REAL:**

- https://www.reuters.com/world/
- https://apnews.com/
- https://www.bbc.com/news
- https://www.theguardian.com/world
- https://www.npr.org/sections/world/
- https://www.aljazeera.com/news/
- https://www.cnbc.com/world/

**Direct article examples:**

- https://www.nbcnews.com/world/iran/live-blog/live-updates-us-iran-fail-reach-deal-peace-talks-day-negotiations-rcna315918
- https://www.cnn.com/2026/04/13/world/live-news/iran-us-war-trump-hormuz
- https://www.cnbc.com/2026/04/12/trump-iran-war-strait-of-hormuz.html

**Tip:** If the scraper fails to extract an article (short text length, missing body), the submission will return an error before inference. In that case, copy the article text manually and submit as plain text instead.

---

## Troubleshooting

### Models Not Found Error

If you see `ML models not trained yet`, run the training pipeline:

```bash
cd backend
python -m ml_engine.train
```

### Kaggle Authentication Error

Ensure your `kaggle.json` file exists and has correct credentials. See the [Kaggle API docs](https://www.kaggle.com/docs/api) for setup.

### Out of Disk Space During Training

- The dataset is ~110MB (CSV)
- LSTM model: ~13MB, DistilBERT model: ~37MB
- HuggingFace caches the base DistilBERT model (~250MB) in `~/.cache/huggingface/`
- Total disk needed: ~500MB free recommended

### Slow Training on CPU

Training times on CPU:
- Naive Bayes: ~42 seconds
- LSTM: ~33 minutes
- DistilBERT: ~115 minutes

This is expected. For faster training, use a GPU-enabled machine and install `torch` with CUDA support.

---

## License

This project is developed for educational and research purposes.
