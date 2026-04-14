"""
Debias the ISOT Fake/Real News dataset.

The raw dataset has source-identifying artifacts that let models shortcut
the task: 99% of "real" articles begin with "(Reuters) -" or a dateline
prefix, and many "fake" articles contain "Featured image", "Getty Images",
or "21st Century Wire" banners. A model trained on the raw data learns
"does this look like Reuters?" rather than "is this true?".

This script removes those signatures and rebuilds the combined CSV used
by train.py.
"""

import os
import re
import pandas as pd

DATASET_DIR = os.path.join(os.path.dirname(__file__), 'datasets')
KAGGLE_CACHE = os.path.expanduser(
    '~/.cache/kagglehub/datasets/clmentbisaillon/fake-and-real-news-dataset/versions/1'
)

REAL_SIGNATURES = [
    re.compile(r'^[A-Z][A-Z .,/()-]{2,60}\s*\(Reuters\)\s*[-—–]\s*', re.MULTILINE),
    re.compile(r'\(Reuters\)\s*[-—–]?\s*'),
    re.compile(r'^[A-Z][A-Z .,/]{3,40}\s*[-—–]\s+(?=[A-Z])', re.MULTILINE),
]

FAKE_SIGNATURES = [
    re.compile(r'Featured image[^\n.]*[.\n]?', re.IGNORECASE),
    re.compile(r'Getty Images[^\n.]*[.\n]?', re.IGNORECASE),
    re.compile(r'21st Century Wire[^\n.]*[.\n]?', re.IGNORECASE),
    re.compile(r'Via\s+[A-Z][A-Za-z ]{2,30}\n'),
    re.compile(r'Image\s*(Source|Credit|via)[^\n.]*[.\n]?', re.IGNORECASE),
    re.compile(r'Photo\s*(Credit|via|by)[^\n.]*[.\n]?', re.IGNORECASE),
    re.compile(r'Screen(shot|grab)\s*(via|from)[^\n.]*[.\n]?', re.IGNORECASE),
    re.compile(r'https?://\S+'),
    re.compile(r'\[.*?\]'),
]


def strip_real_signatures(text):
    if not isinstance(text, str):
        return ''
    for pat in REAL_SIGNATURES:
        text = pat.sub('', text, count=1)
    return re.sub(r'\s+', ' ', text).strip()


def strip_fake_signatures(text):
    if not isinstance(text, str):
        return ''
    for pat in FAKE_SIGNATURES:
        text = pat.sub(' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def build_debiased_csv():
    os.makedirs(DATASET_DIR, exist_ok=True)

    fake_path = os.path.join(KAGGLE_CACHE, 'Fake.csv')
    true_path = os.path.join(KAGGLE_CACHE, 'True.csv')

    print(f'Loading {true_path}')
    true_df = pd.read_csv(true_path)
    print(f'Loading {fake_path}')
    fake_df = pd.read_csv(fake_path)

    print('Stripping real-article signatures (Reuters, datelines)...')
    true_df['text'] = true_df['text'].apply(strip_real_signatures)
    true_df['title'] = true_df['title'].fillna('').astype(str).apply(strip_real_signatures)
    true_df['label'] = 0

    print('Stripping fake-article signatures (Featured image, Getty, 21CW, URLs)...')
    fake_df['text'] = fake_df['text'].apply(strip_fake_signatures)
    fake_df['title'] = fake_df['title'].fillna('').astype(str).apply(strip_fake_signatures)
    fake_df['label'] = 1

    combined = pd.concat([true_df, fake_df], ignore_index=True)
    combined = combined[['title', 'text', 'label']]
    combined = combined.dropna(subset=['text'])
    combined = combined[combined['text'].str.len() > 50]
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)

    out_path = os.path.join(DATASET_DIR, 'news_dataset.csv')
    combined.to_csv(out_path, index=False)
    print(f'\nWrote {len(combined)} rows to {out_path}')
    print(f"Label distribution: {dict(combined['label'].value_counts())}")

    reuters_remaining = combined['text'].str.contains(r'\(Reuters\)', regex=True, na=False).sum()
    featured_remaining = combined['text'].str.contains(r'Featured image', case=False, na=False).sum()
    print(f'Remaining (Reuters): {reuters_remaining}, Featured image: {featured_remaining}')

    return combined


if __name__ == '__main__':
    build_debiased_csv()
