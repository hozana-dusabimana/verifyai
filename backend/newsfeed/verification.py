"""Source-corroboration checks for community news posts.

Two signals beyond the ML style verdict:

- Specificity: a verifiable story names concrete actors — organizations,
  places, people. A body with zero named entities ("the regional transport
  authority", "officials") cannot be checked against anything.
- Source match: the cited source URL must resolve, and its page text must
  overlap the submitted story. Catches both dead/fake links and real links
  pasted onto an unrelated story.
"""

import logging

logger = logging.getLogger(__name__)

# Entity labels that make a story checkable. DATE/TIME/MONEY etc. are
# deliberately excluded — "next month" or "Tuesday" verifies nothing.
SPECIFIC_ENTITY_LABELS = {'PERSON', 'ORG', 'GPE', 'LOC', 'FAC', 'NORP', 'EVENT'}

_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load('en_core_web_sm', disable=['lemmatizer', 'tagger'])
    return _nlp


def count_named_entities(text):
    """Count specific named entities in the text. Returns None when the NER
    model is unavailable so callers can fail open rather than block the wire."""
    if not text:
        return 0
    try:
        doc = _get_nlp()(text[:5000])
    except Exception:
        logger.exception('NER model unavailable; skipping specificity check.')
        return None
    return sum(1 for ent in doc.ents if ent.label_ in SPECIFIC_ENTITY_LABELS)


def compute_source_match(content, source_url):
    """Fetch the source URL and return TF-IDF cosine similarity between its
    page text and the submitted story. Returns None when the page cannot be
    fetched or yields no comparable text."""
    if not source_url:
        return None

    from analysis.tasks import _fetch_url_content

    page_text = _fetch_url_content(source_url)
    if not page_text or len(page_text.strip()) < 50:
        return None

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    try:
        vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        matrix = vectorizer.fit_transform([content[:5000], page_text[:5000]])
        return float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
    except Exception:
        logger.exception('Source match computation failed for %s', source_url)
        return None
