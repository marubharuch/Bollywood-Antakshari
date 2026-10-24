# Bollywood Antakshari — Admin & Show Flow (ગુજરાતી નોંધ)

આ દસ્તાવેજ પ્રોજેક્ટ ફાઇલોના વિશ્લેષણ પર આધારિત છે: **Admin શું કરે**, **ટુર્નામેન્ટ કેવી રીતે નક્કી કરવું**, **રાઉન્ડ અને પ્રશ્નો કેવી રીતે સેટ કરવા**, અને **શો દિવસે કેવી રીતે ચલાવવું**.

**તારીખ:** ઓક્ટોબર 2026  
**સ્ટેક:** React + Vite + Tailwind · HashRouter (`#/...`) · સ્ટેટ `localStorage` માં

---

## 1. એપનો ઉદ્દેશ (ટૂંકમાં)

લાઇવ **Bollywood Antakshari ટુર્નામેન્ટ** માટે:

| ભાગ | શું કરે |
|-----|---------|
| **Admin** | ટુર્નામેન્ટ, ટીમ, રાઉન્ડ પ્લાન, પ્રશ્ન પસંદગી, સ્કોર, ટાઇમર |
| **Projector** | પ્રેક્ષકો માટે મોટી સ્ક્રીન (પ્રશ્ન, સ્કોર, વિડિયો, ઇન્ટ્રો) |
| **Buzzer (ઓપ્શનલ)** | ફોનથી બઝર — `buzzer-server/` |

બધું એક **game state** થી સિંક થાય છે (`gameStateStore` + `BroadcastChannel`).

---

## 2. મુખ્ય URL (Hash routes)

| URL | ઉપયોગ |
|-----|--------|
| `#/admin/config` | **Tournament dashboard** — ઇવેન્ટ સાઇઝ, સ્ટેજ લિંક, દરેક ટુર્નામેન્ટ ખોલવું |
| `#/admin/stage/quarter_final` | Quarter Final **સ્ટેજ પ્લાન** (QF1–4 બધા માટે એક જ પ્લાન) |
| `#/admin/stage/semi_final` | Semi Final સ્ટેજ પ્લાન (SF1–2) |
| `#/admin/stage/grand_finale` | Grand Finale સ્ટેજ પ્લાન |
| `#/admin/tournament/ti-quarter-final-1` | **એક ટુર્નામેન્ટ** — ટીમ, પ્રશ્ન પસંદગી, Save & validate, Start |
| `#/admin/play` | **Playing Screen** — લાઇવ એન્કર |
| `#/rounds` | **Round Library** — રાઉન્ડ બનાવો/એડિટ, પ્રશ્નો |
| `#/media` | **Media Library** — ઓડિયો/વિડિયો ફાઇલો |
| `#/projector` | પ્રોજેક્ટર ડિસ્પ્લે |
| `#/split-test` | એડમિન + પ્રોજેક્ટર એક સ્ક્રીન પર ટેસ્ટ |

ડિફોલ્ટ ખુલે છે: `#/admin/config`

**ચલાવવું:**

```bash
npm install
npm run dev
```

---

## 3. પ્રોજેક્ટ ફાઇલો — શું ક્યાં છે?

### 3.1 સ્ટેટ (ડેટા ક્યાં સેવ થાય)

| પાથ | અર્થ |
|-----|------|
| `src/state/gameStateStore.js` | બધા એક્શન: ટુર્નામેન્ટ, પ્લે, સ્કોર, રાઉન્ડ સેવ |
| `src/state/initialGameState.js` | ડિફોલ્ટ સ્ટેટ, રાઉન્ડ લાઇબ્રેરી લોડ |
| `src/state/mergeGameState.js` | સિંક/ઇમ્પોર્ટ વખતે મર્જ |
| `src/state/sync/gameSync.js` | localStorage + BroadcastChannel |

**મહત્વના સ્ટેટ ભાગ:**

- `roundLibrary` — બધા રાઉન્ડ ટેમ્પલેટ + પ્રશ્નો  
- `stageProfiles` — QF / SF / GF માટે **કયા રાઉન્ડ ક્રમમાં** અને **કેટલા પ્રશ્ન**  
- `tournamentInstances` — 7 ટુર્નામેન્ટ (QF1–4, SF1–2, GF) — **અલગ ટીમ અને સ્કોર**  
- `tournamentEventSettings.activeQuarterFinalCount` — **0–4** Quarter Finals  
- `activeTournamentInstanceId` — હમણાં કયું ટુર્નામેન્ટ એડિટ/પ્લે થાય છે  

### 3.2 ટુર્નામેન્ટ

| પાથ | અર્થ |
|-----|------|
| `src/features/tournament/tournamentRegistry.js` | 7 ટુર્નામેન્ટ ID, 3 સ્ટેજ પ્રોફાઇલ |
| `src/features/tournament/stageProfileModel.js` | સ્ટેજ પર રાઉન્ડ સ્લોટ, validation, planned rounds બનાવવું |
| `src/features/tournament/questionAllocation.js` | પ્રશ્ન/શબ્દ યુનિક ફાળવણી (સ્ટેજ + શો વ્યાપી શબ્દ) |
| `src/features/tournament/tournamentModel.js` | પ્લે દરમ્યાન પ્રશ્ન ક્યૂ, સ્કોર, રાઉન્ડ સ્ટેટસ |
| `src/features/tournament/tournamentInstanceModel.js` | દરેક ટુર્નામેન્ટનું બંડલ + `questionBankSelections` |

### 3.3 રાઉન્ડ અને પ્રશ્ન

| પાથ | અર્થ |
|-----|------|
| `src/features/rounds/roundModel.js` | રાઉન્ડ ડેફિનિશન, `questionBankId` |
| `src/features/rounds/roundQuestionModel.js` | પ્રતિ પ્રશ્ન: `word`, `mediaId`, `anchorNotes`, … |
| `src/features/rounds/mainRoundType.js` | પ્રકાર: **શબ્દ**, Audio, Video, સાદી અંતાક્ષરી, … |
| `src/pages/RoundLibraryPage.jsx` | UI: `#/rounds` |

### 3.4 શબ્દ રાઉન્ડ — બે સ્ત્રોત

| સ્ત્રોત | ફાઇલ | શું છે |
|--------|------|--------|
| **Mukhada Question Bank (32)** | `src/features/questionBank/mukhadaWordBank32.js` | પ્રી-ડિફાઇન્ડ 32 શબ્દ + જૂની/નવી ગીત |
| **Hindi Word Library (40)** | `hindiWordLibraryBatch1.js` + `batch2.js` | ખાલી હોય તો લાઇબ્રેરીમાં દેખાશે નહીં — તમે ભરો |
| **રાઉન્ડ ટેમ્પલેટ** | `questionBankRoundInstall.js` | `Word-in-Mukhada Round`, `Gait Gata Chal Double Round` |

### 3.5 મીડિયા, પ્રોજેક્ટર, બઝર

| પાથ | અર્થ |
|-----|------|
| `src/features/media/` | IndexedDB માં ફાઇલો |
| `src/pages/ProjectorPage.jsx` | પ્રોજેક્ટર |
| `src/pages/admin/PlayingScreenPage.jsx` | એન્કર પ્લે ફ્લો |
| `buzzer-server/` | ઓપ્શનલ Socket.io બઝર |

### 3.6 ઇમ્પોર્ટ/એક્સપોર્ટ

| પાથ | અર્થ |
|-----|------|
| `src/features/migration/tournamentExportModel.js` | JSON એક્સપોર્ટ (v2: stage + instances) |
| `TournamentDataMigrationPanel` | ટુર્નામેન્ટ કોન્ફિગ પેજ પર |

---

## 4. સંપૂર્ણ ફ્લો — શો માટે તૈયારી (એક વખત અથવા અપડેટ)

```
[Round Library + Media]  →  [Stage Profiles]  →  [Dashboard: QF count]
         ↓                          ↓
    પ્રશ્ન/મીડિયા તૈયાર     QF/SF/GF માટે રાઉન્ડ ક્રમ
         ↓
[દરેક Tournament: Teams + Question selection + Save & validate]
         ↓
[Playing Screen + Projector]  →  લાઇવ શો
```

### પગલું A — Round Library (`#/rounds`)

1. **નવો રાઉન્ડ** અથવા ટેમ્પલેટ એડિટ કરો.  
2. **Round type** પસંદ કરો (ઉદા. **શબ્દ**, Audio, Video, સાદી અંતાક્ષરી).  
3. સ્કોર, ટાઇમર, બઝર ON/OFF સેટ કરો.  
4. **Questions** — પ્રશ્ન ઉમેરો (નીચે વિભાગ 6).  

**આપોઆપ ઉમેરાતા રાઉન્ડ (કોડમાં):**

- `Word-in-Mukhada Round` — 32-word bank લિંક  
- `Gait Gata Chal Double Round` — એ જ bank, ડબલ પોઇન્ટ  

### પગલું B — Media Library (`#/media`)

Audio / Video / Image રાઉન્ડ માટે ફાઇલો **અહીં ઇમ્પોર્ટ** કરો. પ્રશ્ન એડિટરમાં `mediaId` પસંદ થાય છે.

### પગલું C — Stage Configuration (સ્ટેજ પ્લાન)

Dashboard પરથી:

- **Quarter Final Configuration** → `#/admin/stage/quarter_final`  
- **Semi Final Configuration** → `semi_final`  
- **Grand Finale Configuration** → `grand_finale`  

દરેક સ્ટેજ પર:

1. **+ Round name** થી લાઇબ્રેરીમાંથી રાઉન્ડ ઉમેરો (ક્રમ મહત્વનો).  
2. **Questions per tournament** / **Words to use** — આ સ્ટેજમાં **દરેક ટુર્નામેન્ટમાં કેટલા પ્રશ્ન** (ઉદા. 10).  
3. Shuffle questions / team turns ઓપ્શન.  
4. **Save** — validation લીલી હોવી જોઈએ.  

**નોંધ:** QF1, QF2, QF3, QF4 **એક જ** Quarter Final stage પ્લાન શેર કરે; SF1–2 એક જ Semi પ્લાન; GF અલગ.

### પગલું D — Tournament Dashboard (`#/admin/config`)

1. **Quarter Finals:** `0` થી `4` — ઇવેન્ટમાં કેટલા QF ચાલુ (0 = ફક્ત SF + GF).  
2. દરેક **સક્રિય** ટુર્નામેન્ટ કાર્ડ પર **Open / Configure** થી આગળ વધો.

---

## 5. ટુર્નામેન્ટ કેવી રીતે નક્કી કરવું (દરેક QF / SF / GF)

URL ઉદાહરણ: `#/admin/tournament/ti-semi-final-1`

| ટુર્નામેન્ટ ID | નામ |
|----------------|-----|
| `ti-quarter-final-1` … `4` | Quarter Final 1–4 |
| `ti-semi-final-1`, `ti-semi-final-2` | Semi Final 1–2 |
| `ti-grand-finale` | Grand Finale |

**દરેક ટુર્નામેન્ટ માટે અલગ:**

- ટીમો અને નામ/રંગ  
- સ્કોર અને પ્રગતિ  
- (જરૂર હોય તો) **Question library setup** — bank રાઉન્ડ માટે શબ્દ પસંદગી  

**પગલા:**

1. **Load this tournament to edit teams** — જો એડિટ મોડમાં ન હોવું.  
2. **Number of teams** + ટીમ ઉમેરો/એડિટ.  
3. જો સ્ટેજમાં **Word-in-Mukhada** / **Gait Gata Chal** હોય → **Question library setup** વિભાગ:  
   - *Available questions in library: 32*  
   - સ્લાઇડર/નંબર: કેટલા શબ્દ આ સેશનમાં (ઉદા. 10)  
   - **Random pick** અથવા **Pick manually**  
4. **Save & validate** — પ્રશ્ન પૂલ ચેક, planned rounds બને.  
5. **Start tournament** → આપોઆપ **Playing Screen** (`#/admin/play`).  

જો “question pool” warning આવે → બીજા ટુર્નામેન્ટે એ જ શબ્દ વપરાયા હોઈ શકે; count ઘટાડો અથવા reuse ઓપ્શન (જો દેખાય).

---

## 6. રાઉન્ડના પ્રશ્નો કેવી રીતે નક્કી કરવા

### 6.1 સામાન્ય રાઉન્ડ (`#/rounds` → Questions)

| પ્રકાર | શું ભરવું |
|--------|-----------|
| **શબ્દ (WORD)** | Word/phrase, Anchor notes, Accepted answer, Song reference (optional) |
| **મલ્ટી-શબ્દ** | 3 સ્લોટમાં શબ્દ |
| **Audio / Video** | Media + start/end segment |
| **Image** | Media + clue |
| **સાદી અંતાક્ષરી** | અલગ પ્રશ્ન લિસ્ટ નથી — ટીમ સ્કોર ચાલુ |

**Include** ચેકબોક્સ — કયા પ્રશ્ન **eligible**; સ્ટેજ પરની count એમાંથી લે છે.

### 6.2 Mukhada bank (32 શબ્દ) — કોડ + Admin UI

- **ડેટા સંપાદન:** `src/features/questionBank/mukhadaWordBank32.js`  
  ફોર્મેટ: `word`, `oldSong` (pre-2000), `newSong` (post-2020).  
- **પસંદગી UI:** ટુર્નામેન્ટ કોન્ફિગ → **Question library setup** (વિભાગ 5).  
- **પ્લે:** Save & validate પછી પસંદ શબ્દો `allocatedQuestionIds` થી snapshot માં જાય — **Playing Screen લોજિક બદલાતું નથી**.

### 6.3 Hindi 40-word library (જો ભરો તો)

- `hindiWordLibraryBatch1.js` + `batch2.js` માં એન્ટ્રી  
- રાઉન્ડ ID: `round-hindi-word-library-40`  
- `npm run word-library:report` — merge રિપોર્ટ  

---

## 7. શો દિવસે — કેવી રીતે ચલાવવું (રમાડવું)

### પહેલાં

1. Laptop પર `npm run dev` (અથવા production build + preview).  
2. બીજી સ્ક્રીન/ટેબ: `#/projector`  
3. (ઓપ્શનલ) Buzzer server + Admin માં Buzzer ON.  

### Playing Screen (`#/admin/play`)

સામાન્ય ક્રમ:

1. **Tournament select** — જે QF/SF/GF ચાલુ કરવું હોય તે પસંદ (ફક્ત **active** ઇવેન્ટના ટુર્નામેન્ટ).  
2. પહેલી વાર: **Grand Opening Intro** પ્રોજેક્ટર પર (skip/replay Admin પર).  
3. **Round select** — પ્લાનમાંથી રાઉન્ડ **Play** અથવા **Skip**.  
4. **Round intro** (ઓટો, જો ON).  
5. **Start Round** → **Question pick** (નંબર કાર્ડ) → **Question live**:  
   - ટાઇમર, ટીમ ટર્ન, મીડિયા, બઝર, સ્કોર  
   - Reveal answer, Next question  
6. રાઉન્ડ પૂરું → પાછા round list; આગળનો રાઉન્ડ ખુલે.  

**પ્રોજેક્ટર પર:** સ્કોર, પ્રશ્ન શબ્દ/ક્લૂ, વિડિયો પ્રશ્ન,during video compact score strip.

**સ્કોર બટન:** Current team / round / all rounds — પ્રોજેક્ટર પર દેખાડો.

### ટુર્નામેન્ટ બદલવું

Dashboard અથવા Playing Screen પર બીજું ટુર્નામેન્ટ પસંદ કરો — **ટીમ અને સ્કોર અલગ** રહે છે.

### Pause / Stop / Complete

Playing Screen / Admin પર ટુર્નામેન્ટ સ્ટેટસ કંટ્રોલ (જેમ લાઇબ્રેરી UI માં છે).

---

## 8. Admin ચેકલિસ્ટ (ટૂંકી)

| # | કામ | ક્યાં |
|---|-----|------|
| 1 | રાઉન્ડ + પ્રશ્ન/મીડિયા તૈયાર | `#/rounds`, `#/media` |
| 2 | QF/SF/GF સ્ટેજ પર રાઉન્ડ ક્રમ + પ્રશ્ન સંખ્યા | `#/admin/stage/...` |
| 3 | કેટલા Quarter Finals | `#/admin/config` |
| 4 | દરેક ટુર્નામેન્ટ: ટીમ + bank પસંદગી (જો લાગુ) | `#/admin/tournament/...` |
| 5 | Save & validate + Start | ટુર્નામેન્ટ પેજ |
| 6 | Projector ખોલો | Admin → Open Projector |
| 7 | લાઇવ | `#/admin/play` |

---

## 9. સામાન્ય સમસ્યાઓ

| સમસ્યા | શું કરવું |
|--------|-----------|
| Stage “not ready” | સ્ટેજ પર ઓછામાં ઓછું 1 રાઉન્ડ + question count ≤ eligible |
| Question pool short | ઓછા પ્રશ્ન પસંદ કરો; અથવા બીજા QF પર એ જ શબ્દ વપરાયેલ હોય (શબ્દ રાઉન્ડ શો-વ્યાપી યુનિક) |
| શબ્દ રાઉન્ડ ખાલી | Bank રાઉન્ડ સ્ટેજમાં ઉમેર્યું? ટુર્નામેન્ટ પર Save & validate? |
| પ્રોજેક્ટર અપડેટ ન થાય | સમાન browser, BroadcastChannel; રિફ્રેશ બંને ટેબ |
| બઝર કામ ન કરે | `npm run buzzer-server:start`, IP URL, same Wi‑Fi |

---

## 10. સંબંધિત જૂની નોંધ

વધુ ટેક્નિકલ વિગત (PWA, buzzer, intros): `NOTES_ATYAR_SUDHI.md`  
ઇંગ્લિશ README: `README.md`

---

*આ ફાઇલ Admin ઓપરેશન માટે છે. કોડ બદલાય તો `src/App.jsx` routes અને `tournamentRegistry.js` ફરી ચેક કરો.*
