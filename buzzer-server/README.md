# Buzzer server (Phase 6)

Local **Socket.io** server for first-buzz-wins races. Run this on the **same laptop** as the quiz admin during integrated mode. **GitHub Pages cannot host this** — it is Node.js only.

## Install

From the project root:

```bash
npm run buzzer-server:install
```

Or from this folder:

```bash
cd buzzer-server
npm install
```

## Start

```bash
npm run buzzer-server:start
```

Default: listen on `0.0.0.0:3847` (all interfaces). Health check: `http://localhost:3847/health`.

Environment (optional):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3847` | TCP port |
| `HOST` | `0.0.0.0` | Bind address |

## Connect phones

1. Find the laptop’s **local IPv4** (see root `README.md` — Windows `ipconfig`).
2. In **Admin → Buzzer system**, set server URL to `http://YOUR_LAPTOP_IP:3847` (not `localhost` on the phone).
3. Open the **Phone buzzer link** or scan the QR code on each phone (same Wi‑Fi or laptop hotspot).
4. If the IP changes, update the URL and refresh the mobile page.

## Firewall

Allow inbound TCP on port **3847** for private networks (Windows Defender Firewall → inbound rule).

## Behavior

- Admin registers as `admin`, syncs teams, **arms** a question, **resets** between questions.
- Mobile clients register with a team id; server accepts the **first** valid `buzz` for the armed question and locks others.
- Simulated buzzes (`admin:simulateBuzz`) use the same server logic for testing without phones.
