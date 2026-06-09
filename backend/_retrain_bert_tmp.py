"""Temporary one-off: retrain ONLY DistilBERT on the debiased dataset and
update model_metrics.json. NB/LSTM are left untouched (already debiased)."""
import os, json, time
from sklearn.model_selection import train_test_split
from ml_engine.train import preprocess_dataframe, train_distilbert, MODELS_DIR
from ml_engine.download_dataset import load_dataset

t0 = time.time()
print("Loading debiased dataset...", flush=True)
df = load_dataset()
print(f"Loaded {len(df)} rows", flush=True)

df = preprocess_dataframe(df)
print(f"After preprocess: {len(df)} rows", flush=True)

X_train, X_test, y_train, y_test = train_test_split(
    df['clean_text'], df['label'], test_size=0.2, random_state=42, stratify=df['label'],
)
X_train_raw = df.loc[X_train.index, 'text']
X_test_raw = df.loc[X_test.index, 'text']

print("Training DistilBERT on debiased data...", flush=True)
metrics = train_distilbert(X_train_raw, X_test_raw, y_train, y_test)

mp = os.path.join(MODELS_DIR, 'model_metrics.json')
allm = json.load(open(mp)) if os.path.exists(mp) else {}
allm['distilbert'] = metrics
with open(mp, 'w') as f:
    json.dump(allm, f, indent=2)

print(f"DONE in {time.time()-t0:.0f}s :: {metrics}", flush=True)
