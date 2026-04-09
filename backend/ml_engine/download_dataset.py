"""
Download the Fake and Real News dataset from Kaggle.

Dataset: clmentbisaillon/fake-and-real-news-dataset
Contains ~44,000 articles labeled as REAL or FAKE.
"""

import os
import sys
import pandas as pd

DATASET_DIR = os.path.join(os.path.dirname(__file__), 'datasets')


def download_dataset():
    """Download dataset using kagglehub and return combined DataFrame."""
    import kagglehub

    os.makedirs(DATASET_DIR, exist_ok=True)

    combined_path = os.path.join(DATASET_DIR, 'news_dataset.csv')
    if os.path.exists(combined_path):
        print(f"Dataset already exists at {combined_path}")
        return pd.read_csv(combined_path)

    print("Downloading dataset from Kaggle...")
    path = kagglehub.dataset_download("clmentbisaillon/fake-and-real-news-dataset")
    print(f"Dataset downloaded to: {path}")

    # Load and combine
    fake_path = os.path.join(path, 'Fake.csv')
    true_path = os.path.join(path, 'True.csv')

    fake_df = pd.read_csv(fake_path)
    true_df = pd.read_csv(true_path)

    fake_df['label'] = 1  # 1 = fake
    true_df['label'] = 0  # 0 = real

    combined = pd.concat([fake_df, true_df], ignore_index=True)
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)

    # Keep only relevant columns
    combined = combined[['title', 'text', 'label']]
    combined = combined.dropna(subset=['text'])
    combined = combined[combined['text'].str.len() > 50]

    combined.to_csv(combined_path, index=False)
    print(f"Combined dataset saved: {len(combined)} articles")

    return combined


def load_dataset():
    """Load the dataset from local cache or download if needed."""
    combined_path = os.path.join(DATASET_DIR, 'news_dataset.csv')
    if os.path.exists(combined_path):
        return pd.read_csv(combined_path)
    return download_dataset()


if __name__ == '__main__':
    df = download_dataset()
    print(f"\nDataset shape: {df.shape}")
    print(f"Label distribution:\n{df['label'].value_counts()}")
