# Game state sync (Phase 5)

- **Publish**: full merged state to `localStorage` + `BroadcastChannel` + same-tab custom event.
- **Merge**: `mergeRemoteGameState()` preserves slices missing from malformed/partial payloads.
- **Rehydrate**: `rehydrateFromPersistence()` on projector open and when tab becomes visible.
- **Media blobs** are never stored in localStorage or the service worker cache.
