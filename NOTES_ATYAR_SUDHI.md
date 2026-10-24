# Bollywood Antakshari — અત્યાર સુધી તૈયાર થયેલું (Project Notes)

આ નોંધ **ડેવલપમેન્ટ સ્ટેટ** માટે છે: શું બન્યું છે, કેવી રીતે ચલાવવું, અને શું હજી મેન્યુઅલ ટેસ્ટ બાકી છે.

**તારીખ (નોંધ):** ઓક્ટોબર 2026  
**સ્ટેક:** React 19 + Vite 8 + Tailwind 4 + HashRouter (GitHub Pages friendly)

---

## 1. એપનો ઉદ્દેશ

લાઇવ **Bollywood Antakshari ટુર્નામેન્ટ** ચલાવવા માટે:

- **Admin (Anchor)** — ટીમ, રાઉન્ડ, સ્કોર, મીડિયા, બઝર કંટ્રોલ
- **Projector** — પ્રેક્ષકો માટે મોટી સ્ક્રીન (સ્કોરબોર્ડ, પ્રશ્ન, બઝર, QR, સિનેમેટિક ઇન્ટ્રો)
- **ફોન બઝર** — ઓપ્શનલ Socket.io સર્વર (`buzzer-server/`, પોર્ટ **3847**)

બધું એક **ગેમ સ્ટેટ** (`gameStateStore`) થી સિંક થાય છે — `localStorage` + `BroadcastChannel` (એડમિન ↔ પ્રોજેક્ટર ટેબ).

---

## 2. મુખ્ય રૂટ્સ (Hash URLs)

| રૂટ | શું છે |
|------|--------|
| `#/admin/config` | ગેમ કોન્ફિગ — ટીમ, ટુર્નામેન્ટ નામ, પ્લાનમાં રાઉન્ડ, Start tournament |
| `#/admin/play` | **Playing Screen** — લાઇવ એન્કર (રાઉન્ડ પસંદ, પ્રશ્ન, ટાઇમર, સ્કોર, બઝર) |
| `#/rounds` | Round Library — રાઉન્ડ બનાવો/એડિટ (પ્રશ્નો, રૂલ્સ, બઝર ફ્લેગ) |
| `#/media` | Music/Media Library — ફાઇલો IndexedDB માં |
| `#/projector` | પ્રોજેક્ટર ડિસ્પ્લે |
| `#/buzzer-mobile?server=http://IP:3847` | ટીમ ફોન બઝર |
| `#/split-test` | એડમિન + પ્રોજેક્ટર એક સ્ક્રીન પર ટેસ્ટ |

ડિફોલ્ટ: `#/admin/config`

---

## 3. લાઇવ ગેમ ફ્લો (Anchor steps)

`playSession.anchorStep` પર આધારિત:

1. **Tournament select** — પ્લાન પસંદ / ટુર્નામેન્ટ શરૂ  
   → Grand Opening Intro (પહેલી વાર તે ટુર્નામેન્ટ ID માટે) પ્રોજેક્ટર પર
2. **Round select** — પ્લાનમાંથી રાઉન્ડ શરૂ કે Skip  
   → Round Intro (~10s) જો **Auto round intro ON**
3. **Question live** — પ્રશ્ન નંબર, ટાઇમર (10s), ટીમ ટર્ન, મીડિયા, બઝર, સ્કોર, Next Question

**ટુર્નામેન્ટ મોડેલ:** `src/features/tournament/tournamentModel.js`  
- `plannedRounds` = લાઇબ્રેરી રાઉન્ડનો **snapshot** (પછી લાઇબ્રેરી બદલાય તો પ્લાન ન બદલાય)  
- પ્રશ્ન શફલ, ટીમ રોટેશન, રાઉન્ડ સ્ટેટસ (pending / active / completed / skipped)

**સ્ટેટ સ્ટોર:** `src/state/gameStateStore.js` + `initialGameState.js` + `mergeGameState.js`  
**હૂક:** `src/hooks/useGameState.js`

---

## 4. Projector સ્ક્રીન

**ફાઇલ:** `src/pages/ProjectorPage.jsx`

દર્શાવે છે:

- સ્ટેજ નામ, રાઉન્ડ, સ્કોરબોર્ડ
- પ્રશ્ન / જવાબ (hide flags મીડિયા પ્લેબેકથી)
- પ્લે ટાઇમર, કોન ટીમની વારી
- મીડિયા પ્લેયર
- બઝર બેનર (જ્યારે બઝર રાઉન્ડ + જીતનાર)
- **Buzzer QR** — ફક્ત જ્યારે `buzzerSystem.showQrOnProjector === true` (ડિફોલ્ટ **false**); એન્કર **Show QR / Hide QR** થી ચાલુ કરે

**ઉપર લેયર:** `ProjectorIntroLayer` — Grand / Round cinematic intro (full-screen, z-index 100)

---

## 5. Cinematic Intros (નવું — ઇન્ટિગ્રેટેડ)

### 5.1 Grand Opening (~26 સેકંડ)

- ટુર્નામેન્ટ **પસંદ/શરૂ** થાય ત્યારે **એક વાર** પ્રતિ `tournament.id`
- ટેક્સ્ટ ફ્લો: dark → stage effects → **DHRUV SHAH PRESENTS** → **BOLLYWOOD ANTAKSHARI** → **LET THE MUSIC BATTLE BEGIN!**
- પૂરું થયા પછી પ્રોજેક્ટર સામાન્ય UI (ઓવરલે હટે)
- **અનિમેશન:** CSS (`introAnimations.css`) + React — સ્ટેટિક ઇમેજ નહીં
- **ઓડિયો:** procedural Web Audio (`introAudio.js`) — કોઈ copyrighted Bollywood song નથી

### 5.2 Round Intro (~10 સેકંડ)

- `beginPlannedRound` પર ઓટો (જો auto ON)
- લાઇન્સ **game state** થી: `buildRoundIntroLines()` — ટુર્નામેન્ટ નામ + રાઉન્ડ નંબર; finale નામ માટે **THE GRAND FINALE**
- Grand intro ચાલુ હોય અને રાઉન્ડ શરૂ થાય → round intro **queue** (`pendingRoundIntroPlanId`), grand પછી ચાલે

### 5.3 Admin કંટ્રોલ (`IntroControlsPanel`)

- **Game Configuration** અને **Playing Screen** (compact) પર
- Sound ON/OFF, Skip Intro, Replay Opening, Replay Round Intro, Auto round intro ON/OFF, Volume (config પર)
- **Skip** — સ્કોર, બઝર, QR, રાઉન્ડ સ્ટેટ બદલતું નથી; ફક્ત intro બંધ + pending round intro resolve

### 5.4 સ્ટેટ ફીલ્ડ (`state.presentation`)

| ફીલ્ડ | અર્થ |
|--------|------|
| `soundEnabled` | ડિફોલ્ટ true |
| `volume` | 0–1, ડિફોલ્ટ 0.75 |
| `autoRoundIntro` | ડિફોલ્ટ true |
| `grandOpeningPlayedForTournamentId` | કયા ટુર્નામેન્ટ માટે opening થઈ ગયું |
| `pendingRoundIntroPlanId` | grand દરમ્યાન queue |
| `intro` | `kind`, `token`, `status`, `stageLine`, `roundLine`, … |

**સ્ટોર એક્શન્સ:** `patchPresentationSettings`, `skipIntroPlayback`, `finishIntroPlayback`, `replayGrandOpeningIntro`, `replayRoundIntro`

**મુખ્ય ફાઇલો:**

```
src/features/presentation/introModel.js
src/features/presentation/introAudio.js
src/components/projector/ProjectorIntroLayer.jsx
src/components/projector/intros/GrandOpeningIntro.jsx
src/components/projector/intros/RoundIntro.jsx
src/components/projector/intros/introAnimations.css
src/components/admin/IntroControlsPanel.jsx
```

**બિલ્ડ:** `npm run build` — સફળ (આગળનાં સેશનમાં); **લાઇવ બ્રાઉઝર QA** (autoplay, skip, offline) મેન્યુઅલ કરવું જોઈએ.

**જાણીતી મર્યાદા:**

- પેજ **refresh** intro વચ્ચે → `intro.playing` localStorage માં રહી શકે → intro ફરી દેખાઈ શકે
- રાઉન્ડ લેબલ = config માં લખેલું ટુર્નામેન્ટ નામ + રાઉન્ડ ક્રમ (જેમ કે "Quarter Final" નામ હોય તો તે જ stage line)

---

## 6. Buzzer સિસ્ટમ

- **સર્વર:** `buzzer-server/` — `npm run buzzer-server:install` પછી `npm run buzzer-server:start`
- **ફ્રન્ટ:** `buzzerModel.js`, `buzzerSocket.js`, `CompactBuzzerCard.jsx`, `useBuzzerAdmin.js`, `BuzzerMobilePage.jsx`
- Admin: Buzzer ON, server URL, Arm/Reset, simulation clients
- **QR પ્રોજેક્ટર પર:** optional flag `showQrOnProjector` (ડિફોલ્ટ off)
- સર્વર વગર: manual team + demo simulation ચાલે

વિગત: `buzzer-server/README.md`, `src/features/buzzer/README.md`

---

## 7. Media & Rounds

- **Rounds:** પ્રશ્નો, સ્કોરિંગ, બઝર on/off, rules — `roundModel.js`, Round Library UI
- **Media:** import → IndexedDB, projector/admin playback — `mediaModel.js`, `MediaEngine.jsx`
- Playing screen પર **AnchorMinimalMediaControls** — ફક્ત જ્યારે પ્રશ્નમાં `mediaId`

---

## 8. Offline / PWA

- `vite-plugin-pwa` — production build પછી shell cache
- ગેમ સ્ટેટ: `localStorage` (`gameSync.js`)
- મીડિયા: IndexedDB (SW માં નથી)
- Intro assets બહારથી ડાઉનલોડ નથી — CSS + Web Audio = offline friendly

---

## 9. ચલાવવાની ટૂંકી રીત (Quiz night)

```bash
npm install
npm run dev
# Buzzer જોઈએ તો:
npm run buzzer-server:install
npm run buzzer-server:start
```

1. Laptop પર `#/admin/config` — ટીમ, રાઉન્ડ પ્લાન, **Start tournament**
2. Projector display પર `#/projector` (અલગ ટેબ/બીજી સ્ક્રીન)
3. `#/admin/play` — રાઉન્ડ શરૂ, પ્રશ્નો, સ્કોર
4. Intro skip/sound — Playing Screen અથવા Config પર **Intros** પેનલ
5. Buzzer: server URL = `http://<laptop-IP>:3847`, QR projector પર જોઈએ તો Show QR

GitHub Pages: `BASE_PATH` set કરી `npm run build` — `README.md` જુઓ.

---

## 10. ફોલ્ડર સંક્ષિપ્ત મેપ

| એરિયા | પાથ |
|--------|------|
| Pages | `src/pages/`, `src/pages/admin/` |
| Projector UI | `src/components/projector/` |
| Admin shell | `src/components/admin/AdminShell.jsx`, `AdminNav.jsx` |
| State | `src/state/gameStateStore.js`, `sync/gameSync.js` |
| Tournament | `src/features/tournament/` |
| Presentation / intros | `src/features/presentation/`, `src/components/projector/intros/` |
| Buzzer | `src/features/buzzer/`, `buzzer-server/` |

---

## 11. Git / ડિપ્લોય

- ઘણા ફેરફારો **uncommitted** હોઈ શકે — push GitHub પર **યુઝર ન કહે ત્યાં સુધી ન કરવું**
- આ નોંધ ફાઇલ: `NOTES_ATYAR_SUDHI.md` (આ દસ્તાવેજ)

---

## 12. આગળ શું કરી શકાય (optional)

- Reload પર stuck `intro.playing` clear કરવાનો guard
- Stage naming માટે `buildRoundIntroLines` refine (Quarter/Semi/Final ફિક્સ્ડ લેબલ્સ)
- મેન્યુઅલ ટેસ્ટ ચેકલિસ્ટ: grand, દરેક round intro, skip, sound off, buzzer + QR + scoring એકસાથે

---

*આ નોંધ conversation / implementation સ્ટેટ પર આધારિત છે. કોડ બદલાય તો routes અથવા store એક્શન્સ verify કરી લો.*
