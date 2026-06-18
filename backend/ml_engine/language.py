"""Best-effort, dependency-free language guardrail for the analysis pipeline.

The ML ensemble (Naive Bayes, LSTM, DistilBERT) is trained only on the English
ISOT news dataset and uses an English ``distilbert-base-uncased`` backbone, so a
verdict on non-English text (e.g. Kinyarwanda) is meaningless. Rather than ship a
heavy language-detection dependency, we use a stopword-ratio heuristic that
**fails open**: it only reports "not English" when there is clear evidence, so
legitimate English submissions are never blocked.
"""
import re

# Common English function words — present in virtually any English sentence.
_EN_STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
    'as', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its',
    'this', 'that', 'these', 'those', 'at', 'from', 'he', 'she', 'they', 'we',
    'you', 'i', 'his', 'her', 'their', 'our', 'has', 'have', 'had', 'will',
    'would', 'can', 'could', 'should', 'not', 'no', 'do', 'does', 'did', 'about',
    'after', 'before', 'said', 'says', 'than', 'then', 'there', 'which', 'who',
    'what', 'when', 'where', 'how', 'all', 'more', 'one', 'also', 'into', 'over',
    'out', 'up', 'if', 'so', 'because', 'while', 'during',
}

# High-frequency Kinyarwanda words / markers (Latin script, so token-based).
_RW_MARKERS = {
    'mu', 'ku', 'na', 'ni', 'ya', 'wa', 'ba', 'rya', 'cyane', 'kandi', 'ariko',
    'cyangwa', 'uyu', 'iyi', 'ibi', 'aba', 'nka', 'kuri', 'nta', 'byose',
    'abantu', 'umuntu', 'igihugu', 'leta', 'amakuru', 'none', 'ubu', 'ubwo',
    'perezida', 'rwanda', 'abanyarwanda', 'yagize', 'ko', 'ngo', 'bo', 'ese',
    'muri', 'hari', 'bya', 'rwa', 'nyuma', 'mbere', 'benshi', 'cyo', 'icyo',
}

_WORD_RE = re.compile(r"[A-Za-zÀ-ɏ']+")

# Keep only Latin letters + apostrophes (meaningful in Kinyarwanda: n', y', …).
_RW_CLEAN_RE = re.compile(r"[^a-zà-ÿ'\s]")


def detect_language(text, min_words=5):
    """Classify ``text`` as 'en', 'rw' (Kinyarwanda), or 'other'.

    Heuristic stopword-ratio detector — no external dependency. Designed to route
    analysis: 'rw' uses the Kinyarwanda model, 'en' the English ensemble, 'other'
    is rejected (unsupported). Fails toward 'en' when there's too little signal,
    so short legitimate English is never misrouted.
    """
    words = [w.lower() for w in _WORD_RE.findall(text or '')]
    total = len(words)
    if total < min_words:
        return 'en'  # too little signal — fail open to the default models

    en_hits = sum(1 for w in words if w in _EN_STOPWORDS)
    rw_hits = sum(1 for w in words if w in _RW_MARKERS)
    en_ratio = en_hits / total
    rw_ratio = rw_hits / total

    # Strong Kinyarwanda signal that outweighs any English function words.
    if rw_hits >= 2 and rw_ratio >= en_ratio:
        return 'rw'
    # Normal English prose carries a high share of function words.
    if en_ratio >= 0.08:
        return 'en'
    # Some Kinyarwanda markers present and little English → Kinyarwanda.
    if rw_hits >= 2:
        return 'rw'
    # Sizable text with almost no English function words and no rw markers →
    # some other language we don't support (e.g. French).
    if en_ratio < 0.02 and total >= 12:
        return 'other'
    return 'en'  # ambiguous → fail open


def looks_english(text, min_words=5):
    """Back-compat helper: True unless the text is clearly non-English."""
    return detect_language(text, min_words=min_words) == 'en'


def is_kinyarwanda(text, min_words=5):
    """True when the text is detected as Kinyarwanda."""
    return detect_language(text, min_words=min_words) == 'rw'


def clean_for_rw(text):
    """Light normalization for Kinyarwanda TF-IDF (lowercase, strip punctuation
    and digits, keep apostrophes, collapse whitespace). Shared by training and
    inference so features line up."""
    t = (text or '').lower()
    t = _RW_CLEAN_RE.sub(' ', t)
    return ' '.join(t.split())
