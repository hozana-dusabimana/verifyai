"""
NLP Preprocessing Module for VerifyAI.

Handles tokenization, lemmatization, stop-word removal, and text cleaning.
"""

import re
import string

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize


# Ensure NLTK data is available
for resource in ['punkt_tab', 'stopwords', 'wordnet']:
    try:
        nltk.data.find(f'tokenizers/{resource}' if 'punkt' in resource else f'corpora/{resource}')
    except LookupError:
        nltk.download(resource, quiet=True)

_lemmatizer = WordNetLemmatizer()
_stop_words = set(stopwords.words('english'))

# Sensationalism indicators
SENSATIONAL_WORDS = {
    'shocking', 'breaking', 'explosive', 'bombshell', 'outrage', 'outrageous',
    'unbelievable', 'incredible', 'horrifying', 'terrifying', 'devastating',
    'scandal', 'exposed', 'revealed', 'secret', 'urgent', 'warning',
    'alert', 'emergency', 'crisis', 'destroyed', 'slammed', 'blasted',
    'murdered', 'killed', 'dead', 'dying', 'catastrophe', 'disaster',
    'nightmare', 'chaos', 'panic', 'fury', 'rage', 'insane', 'crazy',
    'exclusive', 'massive', 'huge', 'epic', 'ultimate', 'absolutely',
    'totally', 'completely', 'literally', 'must-see', 'must-read',
    'you-wont-believe', 'mind-blowing', 'jaw-dropping', 'game-changing',
}

# Clickbait patterns
CLICKBAIT_PATTERNS = [
    r"you won'?t believe",
    r"what happens next",
    r"this is why",
    r"here'?s what",
    r"the truth about",
    r"exposed[!.:]",
    r"\d+ reasons? why",
    r"doctors hate",
    r"one weird trick",
]


def clean_text(text):
    """Basic text cleaning: remove URLs, HTML tags, special chars."""
    if not text or not isinstance(text, str):
        return ''

    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def preprocess_text(text):
    """
    Full NLP preprocessing pipeline.

    Returns:
        tuple: (clean_text_str, tokens_list)
    """
    cleaned = clean_text(text)
    lowered = cleaned.lower()

    # Tokenize
    tokens = word_tokenize(lowered)

    # Remove punctuation and stop words, lemmatize
    processed_tokens = []
    for token in tokens:
        if token in string.punctuation:
            continue
        if token in _stop_words:
            continue
        if len(token) < 2:
            continue
        lemma = _lemmatizer.lemmatize(token)
        processed_tokens.append(lemma)

    clean_str = ' '.join(processed_tokens)
    return clean_str, processed_tokens


def compute_sensationalism_score(text):
    """
    Compute a sensationalism score (0-1) based on linguistic features.

    Analyzes:
    - Presence of sensational/clickbait words
    - Excessive punctuation (!!!, ???, ALL CAPS)
    - Clickbait patterns
    """
    if not text:
        return 0.0

    text_lower = text.lower()
    words = text_lower.split()
    word_count = max(len(words), 1)

    score = 0.0

    # Sensational word density
    sensational_count = sum(1 for w in words if w.strip(string.punctuation) in SENSATIONAL_WORDS)
    sensational_density = sensational_count / word_count
    score += min(sensational_density * 5, 0.3)  # Max 0.3 from this

    # Excessive punctuation
    exclamation_count = text.count('!')
    question_count = text.count('?')
    excessive_punct = (exclamation_count + question_count) / max(len(text), 1)
    score += min(excessive_punct * 50, 0.2)  # Max 0.2

    # ALL CAPS words (excluding short words)
    caps_words = sum(1 for w in text.split() if w.isupper() and len(w) > 2)
    caps_ratio = caps_words / word_count
    score += min(caps_ratio * 2, 0.2)  # Max 0.2

    # Clickbait pattern matches
    clickbait_matches = sum(1 for p in CLICKBAIT_PATTERNS if re.search(p, text_lower))
    score += min(clickbait_matches * 0.1, 0.3)  # Max 0.3

    return min(score, 1.0)


def compute_headline_body_consistency(title, body):
    """
    Compute cosine similarity between headline and body text.

    Returns a score 0-1 where 1 means high consistency.
    """
    if not title or not body:
        return 0.5  # Neutral if no title

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    try:
        vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([title, body[:2000]])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity)
    except Exception:
        return 0.5


def extract_top_keywords(text, n=10):
    """Extract top N keywords using TF-IDF."""
    if not text or len(text.split()) < 3:
        return []

    from sklearn.feature_extraction.text import TfidfVectorizer

    try:
        vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray()[0]

        # Get top N by score
        top_indices = scores.argsort()[-n:][::-1]
        keywords = [feature_names[i] for i in top_indices if scores[i] > 0]
        return keywords
    except Exception:
        return []
