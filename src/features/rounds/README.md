# Round library (Phase 3)

- Round definitions live in `gameState.roundLibrary` with stable `id` values.
- `selectedRoundId` marks the round chosen for upcoming tournament/match use.
- Scoring rules are configurable per round; automatic match scoring is Phase 4+.
- Starter templates are seeded only when no `roundLibrary` exists in persisted state.
- The data model is a flat array intended to scale to ~65+ round ideas after approval.
