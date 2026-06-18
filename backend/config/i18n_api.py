"""Lightweight API message localization (English / Kinyarwanda).

The frontend SPA and the Civic Wire portal both send an ``Accept-Language``
header (``en`` or ``rw``). ``ApiMessageTranslationMiddleware`` runs last on the
response, parses the JSON envelope, and replaces any string that exactly matches
a known English message with its Kinyarwanda equivalent — covering ``error``
fields, DRF serializer field errors, and the newsfeed ``error_message``
publication-gate reasons without touching a single view.

We deliberately avoid Django's gettext/.po toolchain here: the GNU ``msgfmt``/
``xgettext`` binaries aren't available on the deploy host, and the set of
user-facing API strings is small and static. Exact-match is safe — anything not
in the table passes through unchanged (English).
"""
import json

# English source string -> Kinyarwanda translation.
MESSAGES = {
    # ── Authentication / accounts ──────────────────────────────────────
    'Invalid credentials.': 'Imyirondoro yo kwinjira ntiyemewe.',
    'Account is locked. Try again later.': 'Konti yahagaritswe by\'agateganyo. Ongera ugerageze nyuma.',
    'Authentication required.': 'Birasaba kwemeza umwirondoro.',
    'Admin permission required.': 'Birasaba uburenganzira bw\'umuyobozi.',
    'Refresh token required.': 'Hakenewe token yo kuvugurura.',
    'Invalid or expired refresh token.': 'Token yo kuvugurura ntiyemewe cyangwa yarengeje igihe.',
    'Invalid reset token.': 'Token yo guhindura ijambobanga ntiyemewe.',
    'Reset token has expired.': 'Token yo guhindura ijambobanga yarengeje igihe.',
    'Invalid verification token.': 'Token yo kugenzura ntiyemewe.',
    'Authorization code required.': 'Hakenewe kode y\'uburenganzira.',
    'Failed to exchange authorization code.': 'Guhana kode y\'uburenganzira byanze.',
    'Failed to fetch user info.': 'Gukura amakuru y\'umukoresha byanze.',
    'Current password is incorrect.': 'Ijambobanga rigezweho si ryo.',
    'User not found.': 'Umukoresha ntiyabonetse.',
    'API key not found.': 'Urufunguzo rwa API ntirwabonetse.',
    'You cannot change your own role.': 'Ntushobora guhindura uruhare rwawe bwite.',
    'You cannot deactivate your own account.': 'Ntushobora guhagarika konti yawe bwite.',
    # ── Organizations / members ────────────────────────────────────────
    'Organization not found.': 'Ikigo nticyabonetse.',
    'Member not found in your organization.': 'Umunyamuryango ntiyabonetse mu kigo cyawe.',
    'Query parameter "name" is required.': 'Igipimo "name" kirakenewe.',
    # ── Alerts ─────────────────────────────────────────────────────────
    'Alert not found.': 'Imenyesha ntiryabonetse.',
    'Alert not found in your organization.': 'Imenyesha ntiryabonetse mu kigo cyawe.',
    "action must be 'resolve' or 'escalate'.": "igikorwa kigomba kuba 'resolve' cyangwa 'escalate'.",
    # ── Analysis ───────────────────────────────────────────────────────
    'Analysis not found.': 'Isesengura ntiryabonetse.',
    'Text must be at least 20 characters.': 'Inyandiko igomba kuba nibura inyuguti 20.',
    'Maximum 50 articles per bulk submission.': 'Ntarengwa ni inkuru 50 kuri buri kohereza rimwe.',
    'Analysis failed.': 'Isesengura ryanze.',
    'Analysis currently supports English content only. Kinyarwanda support is coming soon.':
        'Isesengura kuri ubu rikora ku nyandiko z\'Icyongereza gusa. '
        'Gufasha Ikinyarwanda biraza vuba.',
    'Analysis currently supports English and Kinyarwanda content only.':
        'Isesengura kuri ubu rikora ku nyandiko z\'Icyongereza n\'Ikinyarwanda gusa.',
    'Kinyarwanda model not trained yet. An admin must train it before '
    'Kinyarwanda content can be analyzed.':
        'Icyitegererezo cy\'Ikinyarwanda ntikiratozwa. Umuyobozi agomba '
        'kugitoza mbere yuko inyandiko z\'Ikinyarwanda zisesengurwa.',
    # ── ML / admin ─────────────────────────────────────────────────────
    'ML models not trained yet. Please train models first.':
        'Ibyitegererezo bya ML ntibirimo gutozwa. Banza utoze ibyitegererezo.',
    'Dataset not found.': 'Urutonde rw\'amakuru ntirwabonetse.',
    'Training job not found.': 'Umurimo wo gutoza ntiwabonetse.',
    'Model retraining started. Track progress on this page.':
        'Kongera gutoza icyitegererezo byatangiye. Kurikirana aho bigeze kuri iyi paji.',
    # ── Newsfeed: submission validation ────────────────────────────────
    'Post not found.': 'Inkuru ntiyabonetse.',
    'Headline too short. Use a descriptive headline of at least 10 characters.':
        'Umutwe w\'inkuru ni mugufi cyane. Koresha umutwe usobanura inkuru w\'nibura inyuguti 10.',
    'Headline too long. Use a concise headline of at most 200 characters — details belong in the story content.':
        'Umutwe w\'inkuru ni murumure cyane. Koresha umutwe ugufi w\'inyuguti 200 nk\'ikirenga — '
        'ibisobanuro birambuye bigomba kuba mu mubiri w\'inkuru.',
    'Content too short. Minimum 50 characters required for verification.':
        'Inyandiko ni ngufi cyane. Hakenewe nibura inyuguti 50 kugira ngo igenzurwe.',
    'Content too long. Maximum 50,000 characters allowed.':
        'Inyandiko ni ndende cyane. Ntarengwa ni inyuguti 50,000.',
    # ── Newsfeed: publication-gate reasons (stored in error_message) ───
    'Headline does not match the story content. The AI verified the story body, but the headline appears unrelated to it.':
        'Umutwe w\'inkuru ntuhuye n\'ibikubiye mu nkuru. AI yagenzuye umubiri w\'inkuru, '
        'ariko umutwe usa n\'utajyanye na wo.',
    'Story lacks verifiable specifics: it names no organization, place, or person that could be checked.':
        'Inkuru ibura ibimenyetso bishobora kugenzurwa: ntivuga ikigo, ahantu, cyangwa umuntu '
        'wagenzurwa.',
    'The cited source could not be retrieved for verification. Check the link and resubmit.':
        'Inkomoko yatanzwe ntiyashoboye kuboneka ngo igenzurwe. Reba ihuza wongere wohereze.',
    'The story does not match the content of the cited source. Cite the article the story is actually based on.':
        'Inkuru ntihuye n\'ibikubiye mu nkomoko yatanzwe. Tanga inkuru y\'inkomoko inkuru yawe yashingiyeho.',
    'Rejected by editorial review.': 'Byanzwe n\'isuzuma ry\'abanditsi.',
    # ── DRF defaults that may surface as `detail` ─────────────────────
    'Authentication credentials were not provided.':
        'Imyirondoro yo kwemeza umwirondoro ntiyatanzwe.',
    'You do not have permission to perform this action.':
        'Nta burenganzira ufite bwo gukora iki gikorwa.',
    'Not found.': 'Ntibyabonetse.',
}


def resolve_language(request):
    """Return 'rw' or 'en' from the request's Accept-Language header (default en)."""
    header = (request.META.get('HTTP_ACCEPT_LANGUAGE', '') or '').strip().lower()
    return 'rw' if header.startswith('rw') else 'en'


def _translate(value):
    """Recursively translate matching strings inside the response payload."""
    if isinstance(value, str):
        return MESSAGES.get(value, value)
    if isinstance(value, list):
        return [_translate(v) for v in value]
    if isinstance(value, dict):
        return {k: _translate(v) for k, v in value.items()}
    return value


class ApiMessageTranslationMiddleware:
    """Localize JSON API messages based on the Accept-Language header.

    Registered last in MIDDLEWARE so it runs after the response is rendered.
    Only touches JSON responses and only when Kinyarwanda is requested; English
    (and any unknown language) passes through untouched.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if resolve_language(request) != 'rw':
            return response

        content_type = response.get('Content-Type', '') or ''
        if 'application/json' not in content_type:
            return response

        content = getattr(response, 'content', b'')
        if not content:
            return response

        try:
            payload = json.loads(content)
        except (ValueError, TypeError):
            return response

        translated = _translate(payload)
        response.content = json.dumps(translated, ensure_ascii=False)
        response['Content-Length'] = str(len(response.content))
        return response
