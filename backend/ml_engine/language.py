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


def looks_english(text, min_words=5):
    """Return True if ``text`` appears to be English (or is too short to judge).

    Returns False only when there's clear evidence the text is NOT English, so
    users aren't silently handed a meaningless verdict from English-only models.
    """
    words = [w.lower() for w in _WORD_RE.findall(text or '')]
    total = len(words)
    if total < min_words:
        return True  # too little signal — fail open

    en_hits = sum(1 for w in words if w in _EN_STOPWORDS)
    rw_hits = sum(1 for w in words if w in _RW_MARKERS)
    en_ratio = en_hits / total

    # Normal English prose carries a high share of function words.
    if en_ratio >= 0.08:
        return True
    # Clear non-English: Kinyarwanda markers present, or essentially no English
    # function words across a sizable block of text.
    if rw_hits >= 2 or (en_ratio < 0.02 and total >= 12):
        return False
    return True  # ambiguous → fail open
