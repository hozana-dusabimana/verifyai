"""
Model Training Script for VerifyAI.

Trains three models on the Fake/Real News dataset:
1. Naive Bayes (TF-IDF features)
2. LSTM (word embeddings)
3. DistilBERT (fine-tuned transformer)

Usage:
    python -m ml_engine.train
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models_store')
os.makedirs(MODELS_DIR, exist_ok=True)


def preprocess_dataframe(df):
    """Preprocess the entire dataset."""
    from .preprocessing import preprocess_text

    print("Preprocessing texts...")
    clean_texts = []
    for i, text in enumerate(df['text']):
        clean, _ = preprocess_text(str(text))
        clean_texts.append(clean)
        if (i + 1) % 5000 == 0:
            print(f"  Preprocessed {i+1}/{len(df)} articles")

    df = df.copy()
    df['clean_text'] = clean_texts
    df = df[df['clean_text'].str.len() > 10]
    return df


def evaluate_model(name, y_true, y_pred, y_prob=None):
    """Compute and print evaluation metrics."""
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred)
    rec = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)

    metrics = {
        'accuracy': round(acc, 4),
        'precision': round(prec, 4),
        'recall': round(rec, 4),
        'f1_score': round(f1, 4),
    }

    print(f"\n{'='*50}")
    print(f"  {name} Results")
    print(f"{'='*50}")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1-Score:  {f1:.4f}")
    print(classification_report(y_true, y_pred, target_names=['REAL', 'FAKE']))

    return metrics


# ============================================================
# 1. NAIVE BAYES TRAINING
# ============================================================

def train_naive_bayes(X_train_text, X_test_text, y_train, y_test):
    """Train Naive Bayes on TF-IDF features."""
    print("\n" + "="*60)
    print("  TRAINING NAIVE BAYES (TF-IDF)")
    print("="*60)

    start = time.time()

    # Fit TF-IDF
    tfidf = TfidfVectorizer(max_features=10000, ngram_range=(1, 2), sublinear_tf=True)
    X_train_tfidf = tfidf.fit_transform(X_train_text)
    X_test_tfidf = tfidf.transform(X_test_text)

    # Train
    nb = MultinomialNB(alpha=0.1)
    nb.fit(X_train_tfidf, y_train)

    # Evaluate
    y_pred = nb.predict(X_test_tfidf)
    y_prob = nb.predict_proba(X_test_tfidf)[:, 1]
    metrics = evaluate_model("Naive Bayes", y_test, y_pred, y_prob)

    # Save
    joblib.dump(tfidf, os.path.join(MODELS_DIR, 'tfidf_vectorizer.joblib'))
    joblib.dump(nb, os.path.join(MODELS_DIR, 'naive_bayes.joblib'))

    elapsed = time.time() - start
    print(f"  Training time: {elapsed:.1f}s")
    metrics['training_time'] = round(elapsed, 1)

    return metrics


# ============================================================
# 2. LSTM TRAINING
# ============================================================

def train_lstm(X_train_text, X_test_text, y_train, y_test, max_words=20000, max_len=200, epochs=3):
    """Train LSTM model on tokenized sequences."""
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset

    print("\n" + "="*60)
    print("  TRAINING LSTM")
    print("="*60)

    start = time.time()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"  Device: {device}")

    # Build vocabulary from training data
    print("  Building vocabulary...")
    word_freq = {}
    for text in X_train_text:
        for word in str(text).split():
            word_freq[word] = word_freq.get(word, 0) + 1

    # Keep top max_words
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:max_words]
    word_to_idx = {w: i+2 for i, (w, _) in enumerate(sorted_words)}  # 0=pad, 1=unk
    vocab_size = len(word_to_idx) + 2

    # Save vocabulary
    joblib.dump(word_to_idx, os.path.join(MODELS_DIR, 'lstm_vocab.joblib'))

    def texts_to_sequences(texts):
        sequences = []
        for text in texts:
            seq = [word_to_idx.get(w, 1) for w in str(text).split()[:max_len]]
            # Pad
            if len(seq) < max_len:
                seq = seq + [0] * (max_len - len(seq))
            sequences.append(seq)
        return np.array(sequences)

    X_train_seq = texts_to_sequences(X_train_text)
    X_test_seq = texts_to_sequences(X_test_text)

    # Create DataLoaders
    train_dataset = TensorDataset(
        torch.LongTensor(X_train_seq),
        torch.FloatTensor(y_train.values)
    )
    test_dataset = TensorDataset(
        torch.LongTensor(X_test_seq),
        torch.FloatTensor(y_test.values)
    )
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=64)

    # Define LSTM model
    class FakeNewsLSTM(nn.Module):
        def __init__(self, vocab_size, embed_dim=128, hidden_dim=128, num_layers=2):
            super().__init__()
            self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
            self.lstm = nn.LSTM(embed_dim, hidden_dim, num_layers=num_layers,
                                batch_first=True, dropout=0.3, bidirectional=True)
            self.dropout = nn.Dropout(0.5)
            self.fc = nn.Linear(hidden_dim * 2, 1)

        def forward(self, x):
            embedded = self.embedding(x)
            lstm_out, (hidden, _) = self.lstm(embedded)
            # Concatenate final forward and backward hidden states
            hidden_cat = torch.cat((hidden[-2], hidden[-1]), dim=1)
            output = self.dropout(hidden_cat)
            return self.fc(output).squeeze(1)

    model = FakeNewsLSTM(vocab_size).to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    # Train
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            total_loss += loss.item()
            predicted = (torch.sigmoid(outputs) > 0.5).float()
            correct += (predicted == batch_y).sum().item()
            total += batch_y.size(0)

        train_acc = correct / total
        print(f"  Epoch {epoch+1}/{epochs} — Loss: {total_loss/len(train_loader):.4f}, Acc: {train_acc:.4f}")

    # Evaluate
    model.eval()
    all_preds = []
    all_probs = []
    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x = batch_x.to(device)
            outputs = model(batch_x)
            probs = torch.sigmoid(outputs).cpu().numpy()
            preds = (probs > 0.5).astype(int)
            all_probs.extend(probs)
            all_preds.extend(preds)

    metrics = evaluate_model("LSTM", y_test, np.array(all_preds), np.array(all_probs))

    # Save model
    save_data = {
        'model_state_dict': model.state_dict(),
        'vocab_size': vocab_size,
        'max_len': max_len,
    }
    torch.save(save_data, os.path.join(MODELS_DIR, 'lstm_model.pt'))

    elapsed = time.time() - start
    print(f"  Training time: {elapsed:.1f}s")
    metrics['training_time'] = round(elapsed, 1)

    return metrics


# ============================================================
# 3. DISTILBERT TRAINING
# ============================================================

def train_distilbert(X_train_text, X_test_text, y_train, y_test, epochs=2, max_len=256, batch_size=16):
    """Fine-tune DistilBERT for fake news classification."""
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset
    from transformers import DistilBertTokenizer, DistilBertModel

    print("\n" + "="*60)
    print("  TRAINING DISTILBERT")
    print("="*60)

    start = time.time()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"  Device: {device}")

    # Use a subset for faster training on CPU
    train_size = min(len(X_train_text), 8000)
    test_size = min(len(X_test_text), 2000)

    X_train_sub = X_train_text.iloc[:train_size].reset_index(drop=True)
    y_train_sub = y_train.iloc[:train_size].reset_index(drop=True)
    X_test_sub = X_test_text.iloc[:test_size].reset_index(drop=True)
    y_test_sub = y_test.iloc[:test_size].reset_index(drop=True)

    print(f"  Using {train_size} training / {test_size} test samples")

    # Load tokenizer
    print("  Loading DistilBERT tokenizer...")
    tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')

    class NewsDataset(Dataset):
        def __init__(self, texts, labels, tokenizer, max_len):
            self.texts = texts
            self.labels = labels
            self.tokenizer = tokenizer
            self.max_len = max_len

        def __len__(self):
            return len(self.texts)

        def __getitem__(self, idx):
            text = str(self.texts.iloc[idx])[:1000]  # Truncate long texts
            encoding = self.tokenizer(
                text, truncation=True, padding='max_length',
                max_length=self.max_len, return_tensors='pt'
            )
            return {
                'input_ids': encoding['input_ids'].squeeze(),
                'attention_mask': encoding['attention_mask'].squeeze(),
                'label': torch.tensor(self.labels.iloc[idx], dtype=torch.float)
            }

    train_dataset = NewsDataset(X_train_sub, y_train_sub, tokenizer, max_len)
    test_dataset = NewsDataset(X_test_sub, y_test_sub, tokenizer, max_len)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size)

    # Define classifier on top of DistilBERT
    class DistilBertClassifier(nn.Module):
        def __init__(self):
            super().__init__()
            self.bert = DistilBertModel.from_pretrained('distilbert-base-uncased')
            # Freeze most BERT layers for faster training
            for param in list(self.bert.parameters())[:-20]:
                param.requires_grad = False
            self.dropout = nn.Dropout(0.3)
            self.fc = nn.Linear(768, 1)

        def forward(self, input_ids, attention_mask):
            outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
            cls_output = outputs.last_hidden_state[:, 0, :]  # [CLS] token
            dropped = self.dropout(cls_output)
            return self.fc(dropped).squeeze(1)

    print("  Loading DistilBERT model...")
    model = DistilBertClassifier().to(device)
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=2e-5, weight_decay=0.01
    )

    # Train
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for batch_idx, batch in enumerate(train_loader):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)

            optimizer.zero_grad()
            outputs = model(input_ids, attention_mask)
            loss = criterion(outputs, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            total_loss += loss.item()
            predicted = (torch.sigmoid(outputs) > 0.5).float()
            correct += (predicted == labels).sum().item()
            total += labels.size(0)

            if (batch_idx + 1) % 50 == 0:
                print(f"    Batch {batch_idx+1}/{len(train_loader)} — Loss: {loss.item():.4f}")

        train_acc = correct / total
        print(f"  Epoch {epoch+1}/{epochs} — Loss: {total_loss/len(train_loader):.4f}, Acc: {train_acc:.4f}")

    # Evaluate
    model.eval()
    all_preds = []
    all_probs = []
    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            outputs = model(input_ids, attention_mask)
            probs = torch.sigmoid(outputs).cpu().numpy()
            preds = (probs > 0.5).astype(int)
            all_probs.extend(probs)
            all_preds.extend(preds)

    metrics = evaluate_model("DistilBERT", y_test_sub, np.array(all_preds), np.array(all_probs))

    # Save only the classifier head weights (BERT base stays in HuggingFace cache)
    # This saves ~250MB of disk space
    head_state = {
        'dropout.weight': model.dropout.weight if hasattr(model.dropout, 'weight') else None,
        'fc.weight': model.fc.weight.data,
        'fc.bias': model.fc.bias.data,
    }
    # Also save the unfrozen BERT layer weights that were fine-tuned
    bert_finetuned = {}
    for name, param in model.bert.named_parameters():
        if param.requires_grad:
            bert_finetuned[name] = param.data
    torch.save({
        'head_state': head_state,
        'bert_finetuned': bert_finetuned,
        'max_len': max_len,
    }, os.path.join(MODELS_DIR, 'distilbert_model.pt'))

    elapsed = time.time() - start
    print(f"  Training time: {elapsed:.1f}s")
    metrics['training_time'] = round(elapsed, 1)

    return metrics


# ============================================================
# MAIN TRAINING PIPELINE
# ============================================================

def train_all(dataset_path=None):
    """Train all three models and save metrics."""
    from .download_dataset import load_dataset

    # Load dataset
    if dataset_path:
        df = pd.read_csv(dataset_path)
    else:
        df = load_dataset()

    print(f"\nDataset loaded: {len(df)} articles")
    print(f"Label distribution: {dict(df['label'].value_counts())}")

    # Preprocess
    df = preprocess_dataframe(df)
    print(f"After preprocessing: {len(df)} articles")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        df['clean_text'], df['label'],
        test_size=0.2, random_state=42, stratify=df['label']
    )

    # Also keep raw text for DistilBERT
    X_train_raw = df.loc[X_train.index, 'text']
    X_test_raw = df.loc[X_test.index, 'text']

    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    all_metrics = {}

    # 1. Naive Bayes
    all_metrics['naive_bayes'] = train_naive_bayes(X_train, X_test, y_train, y_test)

    # 2. LSTM
    all_metrics['lstm'] = train_lstm(X_train, X_test, y_train, y_test)

    # 3. DistilBERT
    all_metrics['distilbert'] = train_distilbert(
        X_train_raw, X_test_raw, y_train, y_test
    )

    # Save metrics
    metrics_path = os.path.join(MODELS_DIR, 'model_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(all_metrics, f, indent=2)
    print(f"\nAll metrics saved to {metrics_path}")

    # Summary
    print("\n" + "="*60)
    print("  TRAINING COMPLETE — SUMMARY")
    print("="*60)
    for model_name, m in all_metrics.items():
        print(f"  {model_name:15s} — Acc: {m['accuracy']:.4f}, F1: {m['f1_score']:.4f}")

    return all_metrics


if __name__ == '__main__':
    # Allow running from backend directory: python -m ml_engine.train
    train_all()
