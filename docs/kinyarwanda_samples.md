# VerifyAI — Kinyarwanda Test Samples (Real / Fake)

Sample Kinyarwanda news items for testing and demoing VerifyAI's Kinyarwanda
analysis path. Each sample has a **title**, a **body**, an **expected label**,
and — where we ran it — the **actual live verdict** from
`https://api-verifyai.isiri.rw`.

> **How verdicts map:** the model returns a `credibility_score` (0–100).
> `> 60` → **REAL**, `40–60` → **UNCERTAIN**, `≤ 40` → **FAKE**.
> Label convention inside the model: `1 = fake`, `0 = real`.

> ⚠️ **Honest caveat (read before a demo).** The Kinyarwanda model is trained on
> *machine-translated* news, not native Kinyarwanda journalism. It is **reliable
> on blatant hoaxes** but **conservative on genuine plain reporting** (real
> articles sometimes land in UNCERTAIN). It judges *writing style/patterns*, not
> real-world facts — a well-written fabrication can read as REAL. See
> [models.md](models.md) for details.

---

## How to test

**Via the UI:** sign in at `https://verifyai.isiri.rw`, open **Analyze**, paste
the **title + body together**, submit.

**Via the API:**

```bash
# 1) get a token
TOKEN=$(curl -s -X POST https://api-verifyai.isiri.rw/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"journalist@verifyai.demo","password":"JournoDemo!2026"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['access'])")

# 2) submit a sample (paste title + body in "content")
curl -s -X POST https://api-verifyai.isiri.rw/api/v1/analysis/submit \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"input_type":"text","content":"<TITLE>. <BODY>","source_name":"test"}'
```

The language is **auto-detected** — Kinyarwanda text is routed to the dedicated
Kinyarwanda model automatically; you don't pass any language flag.

---

## ✅ Real news samples (expected: REAL)

### R1 — Umuhanda Kigali–Musanze
> Guverinoma y'u Rwanda yatangaje ko imirimo yo gusana umuhanda uhuza Kigali na
> Musanze igeze ku rugero rushimishije. Minisiteri y'Ibikorwa Remezo ivuga ko uyu
> mushinga ugamije korohereza abagenzi n'ubucuruzi hagati y'imijyi. Imirimo
> iteganyijwe kurangira mu mwaka utaha.

- **Expected:** REAL · **Live verdict:** ✅ **REAL** (credibility ≈ 80)

### R2 — Ikoranabuhanga mu burezi
> Minisiteri y'Uburezi yatangije gahunda yo gushyira mudasobwa mu mashuri
> yisumbuye yo mu cyaro. Iyi gahunda igamije kongera ubumenyi bw'ikoranabuhanga
> ku banyeshuri no kubafasha kwiga neza. Abarimu na bo bahawe amahugurwa yo
> gukoresha ibi bikoresho.

- **Expected:** REAL · **Live verdict:** ⚠️ **UNCERTAIN** (credibility ≈ 54)
  — example of the "conservative on plain reporting" caveat.

### R3 — Amavubi yatsinze umukino
> Ikipe y'igihugu y'u Rwanda mu mupira w'amaguru, Amavubi, yatsinze umukino
> w'inshuti wateguwe mu rwego rwo kwitegura amarushanwa. Umutoza yavuze ko
> abakinnyi bagaragaje imbaraga nziza kandi ko bakomeje gutozwa.

- **Expected:** REAL · **Live verdict:** ⚠️ **UNCERTAIN**, leaning fake
  (credibility ≈ 46) — a known weak spot (short, plain sports report).

### R4 — Umuganda wo kubaka amazu
> Abaturage bo mu Karere ka Gicumbi bitabiriye umuganda rusange wo kubaka amazu
> y'abatishoboye. Umuyobozi w'akarere yashimiye abaturage ubwitange bwabo
> avuga ko gahunda izakomeza mu mezi atatu ari imbere kugira ngo imiryango
> myinshi ibone aho kuba heza.

- **Expected:** REAL · *(not yet run live — add to your test set)*

### R5 — Isuku n'isukura by'amazi
> Ikigo gishinzwe amazi n'isukura cyatangaje ko cyongereye umubare w'abaturage
> bagezweho n'amazi meza mu cyaro. Raporo y'ikigo igaragaza ko ibikorwa remezo
> by'amazi byagutse mu turere dutandukanu, bikagabanya indwara ziterwa
> n'amazi atameze neza.

- **Expected:** REAL · *(not yet run live)*

---

## ❌ Fake news samples (expected: FAKE)

### F1 — Amazi y'inzuzi ahindutse zahabu
> Abahanga bavuze ko amazi yo mu ruzi rwa Nyabarongo yahindutse zahabu mu ijoro
> rimwe, kandi ko abaturage benshi bagiye gukira ako kanya nta kazi bakoze.
> Abayobozi basabye abantu kwihutira kuvoma amazi mbere y'uko ahinduka indi
> nyuma y'iminsi itatu.

- **Expected:** FAKE · **Live verdict:** ✅ **FAKE** (credibility ≈ 28)

### F2 — Imiti ikiza indwara zose
> Umugabo umwe yavuze ko yavumbuye umuti ukize indwara zose ku isi mu munsi umwe
> gusa, kandi ko nta muganga ukeneye ukundi. Avuga ko uwo muti ukorwa mu rwego
> rw'ibanga kandi ko leta itifuza ko abantu bawumenya.

- **Expected:** FAKE · **Live verdict:** ✅ **FAKE** (credibility ≈ 18–20)

### F3 — Inyenyeri igiye kugwa ku isi
> Ababisha bavuga ko inyenyeri nini igiye kugwa ku Rwanda mu cyumweru gitaha
> ikazasenya umujyi wose mu masegonda make. Bati abantu bose bagomba guhunga
> ako kanya batwaye amafaranga yabo yose, kuko leta yabihishe ngo idatera
> ubwoba.

- **Expected:** FAKE · *(not yet run live — classic "hidden disaster" hoax)*

### F4 — Telefoni ikora amafaranga
> Hari ubutumwa buvuga ko hari porogaramu nshya ya telefoni ihindura buri
> ijambo wanditse rikaba amafaranga ajya kuri konti yawe ako kanya, kandi ko
> abayikoresheje bose bahise bakira mu minsi mike. Bati ihute uyikuremo mbere
> y'uko ivaho.

- **Expected:** FAKE · *(not yet run live — "get rich instantly" scam pattern)*

---

## What makes the fakes detectable

The hoaxes above lean on patterns the model picks up well:

- **Physically impossible events** (water turns to gold, a star will destroy a city).
- **Miracle cures** ("one medicine cures every disease in a single day").
- **Get-rich-instantly** claims.
- **"The government is hiding it"** conspiracy framing and **urgency** ("act now,
  before it disappears").

Genuine reports (R1–R5) are calm, attributed (a ministry, an official, a
district), and describe ordinary, plausible activities — which is exactly why the
model rates them higher, though short ones can still land in UNCERTAIN.

---

## Quick reference table

| ID | Title | Expected | Live verdict |
|----|-------|----------|--------------|
| R1 | Umuhanda Kigali–Musanze | REAL | ✅ REAL (~80) |
| R2 | Ikoranabuhanga mu burezi | REAL | ⚠️ UNCERTAIN (~54) |
| R3 | Amavubi yatsinze umukino | REAL | ⚠️ UNCERTAIN (~46) |
| R4 | Umuganda wo kubaka amazu | REAL | _not run_ |
| R5 | Isuku n'isukura by'amazi | REAL | _not run_ |
| F1 | Amazi ahindutse zahabu | FAKE | ✅ FAKE (~28) |
| F2 | Imiti ikiza indwara zose | FAKE | ✅ FAKE (~18) |
| F3 | Inyenyeri igiye kugwa ku isi | FAKE | _not run_ |
| F4 | Telefoni ikora amafaranga | FAKE | _not run_ |
