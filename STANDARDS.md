# Standards & References — Fake News Analysis

This document lists the international standards, organizations, and academic benchmarks that inform how VerifyAI evaluates news credibility. There is no single global standard for misinformation detection; instead, the field draws from fact-checking codes of practice, content-provenance specifications, journalism trust frameworks, and ML research benchmarks.

VerifyAI's design intentionally aligns with these references so that its scoring, transparency, and methodology are defensible against recognised industry norms.

---

## 1. Fact-Checking Standards

### IFCN — International Fact-Checking Network
- **Body:** Poynter Institute (USA)
- **Standard:** [IFCN Code of Principles](https://ifcncodeofprinciples.poynter.org/)
- **Five commitments:** non-partisanship and fairness, transparency of sources, transparency of funding and organisation, transparency of methodology, open and honest corrections policy.
- **Relevance to VerifyAI:** the explainability layer (flagging reasons, headline-body consistency, sentiment) maps to the *transparency of methodology* commitment.

### EFCSN — European Fact-Checking Standards Network
- **Body:** European fact-checkers consortium
- **Standard:** [EFCSN Code of Standards](https://efcsn.com/code-of-standards/)
- **Relevance:** the EU counterpart to the IFCN code; signatories are recognised under the EU Code of Practice on Disinformation.

---

## 2. Content Provenance & Authenticity

### C2PA — Coalition for Content Provenance and Authenticity
- **Body:** Adobe, Microsoft, BBC, Intel, Sony, Truepic and others
- **Standard:** [C2PA Technical Specification](https://c2pa.org/specifications/)
- **Purpose:** cryptographically signed manifests describing how a piece of media was created and edited — designed to detect manipulated images, video, and AI-generated content.
- **Relevance:** complementary to VerifyAI's text-based classification; useful when extending the platform to media forensics.

### Project Origin
- **Body:** BBC, CBC/Radio-Canada, Microsoft, The New York Times
- **Status:** merged into C2PA.

---

## 3. Journalism Trust Frameworks

### JTI — Journalism Trust Initiative
- **Body:** Reporters Without Borders (RSF) with CEN (European Committee for Standardization)
- **Standard:** [CWA 17493](https://www.cencenelec.eu/) — *Journalism Trust Initiative* workshop agreement.
- **Purpose:** machine-readable indicators of editorial process, ownership, and ethics for news outlets.
- **Relevance:** informs the *source reliability* feature in `analytics/sources`.

### NewsGuard
- **Body:** NewsGuard Technologies (commercial)
- **Standard:** [NewsGuard 9 Criteria](https://www.newsguardtech.com/ratings/rating-process-criteria/) — does not repeatedly publish false content, gathers and presents information responsibly, regularly corrects errors, handles news vs. opinion, avoids deceptive headlines, discloses ownership and financing, clearly labels advertising, reveals who's in charge, names content creators.

---

## 4. Regulatory Frameworks

### EU Code of Practice on Disinformation (2022)
- **Body:** European Commission
- **Reference:** [EU Code of Practice on Disinformation](https://digital-strategy.ec.europa.eu/en/policies/code-practice-disinformation)
- **Status:** strengthened code under the **Digital Services Act (DSA)**, applicable to large online platforms.

### Digital Services Act (DSA)
- **Reference:** Regulation (EU) 2022/2065 — sets transparency, risk-assessment, and content-moderation duties for online platforms operating in the EU.

---

## 5. Academic Benchmarks (used for model evaluation)

| Dataset / Benchmark | Source | Purpose |
|---------------------|--------|---------|
| **ISOT Fake News Dataset** | University of Victoria (ISOT Research Lab) | Training corpus used by VerifyAI (~44,000 Reuters / unreliable-source articles) |
| **LIAR** | Wang, W. Y. (2017), UC Santa Barbara | 12.8K PolitiFact-labelled short statements, 6-class labels |
| **FakeNewsNet** | Shu, K. et al., Arizona State University | News content + social context (tweets, user features) |
| **FEVER** | University of Sheffield + Amazon | Fact extraction and verification against Wikipedia |
| **CheckThat! Lab (CLEF)** | Conference and Labs of the Evaluation Forum | Annual benchmark for check-worthiness, claim verification, and fake news detection |

---

## 6. Methodology Used by VerifyAI

VerifyAI does **not** claim certification under any of the standards above. It is an academic capstone project that adopts their *principles* as design constraints:

| Principle (origin) | Implementation in VerifyAI |
|--------------------|----------------------------|
| Transparency of methodology (IFCN) | Public README documenting the 3-model ensemble, weights, and pipeline |
| Explainability (IFCN, EU DSA Art. 27) | `/api/v1/analysis/{id}/explain` returns flagging reasons, sentiment, sensationalism, and headline-body consistency |
| Reproducibility (academic norm) | Training pipeline (`ml_engine/train.py`) is deterministic given the seed; metrics saved to `model_metrics.json` |
| Source reliability tracking (JTI / NewsGuard) | `analytics/sources` aggregates per-domain credibility statistics |
| Corrections policy (IFCN) | Admins can retrain models and override classifications via the admin console |

---

## 7. Further Reading

- Wardle, C. & Derakhshan, H. (2017). *Information Disorder: Toward an interdisciplinary framework for research and policymaking.* Council of Europe.
- Lazer, D. M. J. et al. (2018). *The science of fake news.* Science, 359(6380), 1094–1096.
- Zhou, X. & Zafarani, R. (2020). *A Survey of Fake News: Fundamental Theories, Detection Methods, and Opportunities.* ACM Computing Surveys.
- Shu, K. et al. (2017). *Fake News Detection on Social Media: A Data Mining Perspective.* SIGKDD Explorations.
