"""Local sanity check of the freshly retrained DistilBERT (no saturation?)."""
from ml_engine.inference import clear_model_cache, predict_distilbert, predict_ensemble

clear_model_cache()

cases = [
    ("REAL", "Alphabet stock sale",
     "Alphabet, Google's parent company, announced a plan to sell 80 billion dollars in stock to finance its artificial intelligence efforts, including a 10 billion dollar sale to Berkshire Hathaway. Analysts said the move would help fund new data centres and chip purchases over the coming years."),
    ("REAL", "Prison overcrowding",
     "Belgium, one of Europe's richest countries, is grappling with a deepening prison overcrowding crisis. Bilal, 34, served time in five prisons where nine-square-metre cells housed three to four detainees, with scabies and bed bugs spreading widely as inmate numbers climbed and budgets failed to keep pace."),
    ("FAKE", "Onion Trump/Epstein satire",
     "Growing visibly emotional as he recounted the trauma surfaced by the Justice Department's release of files, a tearful President Donald Trump told reporters Wednesday he had been sex-trafficked by disgraced financier Jeffrey Epstein, claiming Epstein pressured him into sexual activity from 1987 until the offender's death in 2019."),
    ("FAKE", "Pope endorses Trump hoax",
     "Pope Francis has broken with tradition and chosen to endorse a US presidential candidate for the first time in history, according to a statement released by the Vatican. The Pope urged Catholics around the world to follow his guidance at the ballot box. The statement was confirmed as authentic by the Vatican press office."),
]

print(f"{'EXP':5} {'BERT%':>6} {'NB%':>6} {'LSTM%':>6} {'CRED%':>6} {'CLASS':10} SOURCE")
print("-" * 78)
for exp, label, text in cases:
    bert = predict_distilbert(text) * 100
    d = predict_ensemble(text)
    print(f"{exp:5} {bert:6.1f} {d['naive_bayes_score']*100:6.1f} {d['lstm_score']*100:6.1f} "
          f"{d['credibility_score']:6.1f} {d['classification']:10} {label}")
