# Buzzer module (Phase 6)

- **`buzzerModel.js`** — `buzzerSystem` settings (ON/OFF, server URL) and display `buzzer` state normalization.
- **`buzzerSocket.js`** — Socket.io client helpers for admin and mobile.
- **`IntegratedBuzzerPanel.jsx`** — Admin UI (connection status, arm/reset, QR link).
- **`BuzzerMobilePage.jsx`** — `#/buzzer-mobile?server=…` team buzzer UI.

Authoritative race results come from **`buzzer-server/`**, not BroadcastChannel.

**QR on projector:** `buzzerSystem.showQrOnProjector` (Anchor **Show QR** / **Hide QR**). Default off.

**Tournament sessions:** The buzzer server has a single shared room per process (no socket room IDs). Tournament name/id in the mobile URL is for labeling only. Only one live quiz should use a given server/port at a time; use separate ports for simultaneous events.
