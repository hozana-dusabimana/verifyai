"""Translate a balanced subset of the English ISOT news dataset to Kinyarwanda.

Builds the training corpus for the Kinyarwanda fake-news model. We machine-
translate (Google, via deep-translator) a balanced sample of title+body text to
Kinyarwanda and cache it to ``news_dataset_rw.csv``.

Resumable: progress is appended to the cache as it completes, so re-running picks
up where it left off (handy if the translation endpoint rate-limits). Parallelized
with a small thread pool and per-item retry/backoff.

Usage:
    python -m ml_engine.translate_dataset --per-class 1000 --workers 8
"""
import os
import csv
import time
import argparse
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
from deep_translator import GoogleTranslator

DATA_DIR = os.path.join(os.path.dirname(__file__), 'datasets')
SRC = os.path.join(DATA_DIR, 'news_dataset.csv')
OUT = os.path.join(DATA_DIR, 'news_dataset_rw.csv')

_write_lock = threading.Lock()


def build_subset(per_class, seed=42):
    df = pd.read_csv(SRC).dropna(subset=['text', 'label'])
    df['combined'] = (
        df['title'].fillna('').astype(str) + '. ' + df['text'].fillna('').astype(str)
    ).str.strip()
    df = df[df['combined'].str.len() > 40]
    real = df[df['label'] == 0].sample(n=per_class, random_state=seed)
    fake = df[df['label'] == 1].sample(n=per_class, random_state=seed)
    sub = pd.concat([real, fake]).reset_index().rename(columns={'index': 'orig_idx'})
    return sub[['orig_idx', 'label', 'combined']]


def truncate(s, n):
    return ' '.join(str(s).split())[:n]


def translate_one(text, target='rw'):
    for attempt in range(4):
        try:
            out = GoogleTranslator(source='en', target=target).translate(text)
            return out or ''
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return ''


def load_done():
    done = set()
    if os.path.exists(OUT):
        with open(OUT, encoding='utf-8', newline='') as f:
            for row in csv.DictReader(f):
                done.add(int(row['orig_idx']))
    return done


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--per-class', type=int, default=1000)
    ap.add_argument('--max-chars', type=int, default=600)
    ap.add_argument('--workers', type=int, default=8)
    args = ap.parse_args()

    sub = build_subset(args.per_class)
    done = load_done()
    todo = [r for r in sub.itertuples(index=False) if int(r.orig_idx) not in done]
    print(f"subset={len(sub)} already_done={len(done)} to_translate={len(todo)}", flush=True)

    new_file = not os.path.exists(OUT)
    f = open(OUT, 'a', encoding='utf-8', newline='')
    writer = csv.writer(f)
    if new_file:
        writer.writerow(['orig_idx', 'label', 'text_rw'])
        f.flush()

    done_count = 0

    def work(r):
        rw = translate_one(truncate(r.combined, args.max_chars))
        return int(r.orig_idx), int(r.label), rw

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(work, r) for r in todo]
        for fut in as_completed(futures):
            idx, label, rw = fut.result()
            if rw:
                with _write_lock:
                    writer.writerow([idx, label, rw])
                    done_count += 1
                    if done_count % 50 == 0:
                        f.flush()
                        print(f"  translated {done_count}/{len(todo)}", flush=True)

    f.flush()
    f.close()
    total = len(load_done())
    print(f"DONE. total_translated_rows={total} -> {OUT}", flush=True)


if __name__ == '__main__':
    main()
