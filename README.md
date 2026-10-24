# Bollywood Antakshari Tournament Web App

React/Vite tournament app: admin, projector, teams, rounds, media library, offline sync, and an optional **local buzzer server** (Phase 6).

## Local development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## GitHub Pages build

Set the repository subpath when building:

```bash
# Example: repo name Bollywood-Antakshari
set BASE_PATH=/Bollywood-Antakshari/
npm run build
```

Deploy the `dist` folder to GitHub Pages. Hash routing (`#/projector`) avoids server rewrite rules.

## Routes

| Hash route       | Purpose              |
|------------------|----------------------|
| `#/admin/config` | Game configuration   |
| `#/admin/play`   | Playing screen (anchor) |
| `#/rounds`       | Round library        |
| `#/media`        | Media library        |
| `#/projector`    | Audience display     |
| `#/split-test`   | Split-screen test    |
| `#/teams`        | Redirects to config  |
| `#/buzzer-mobile` | Team phone buzzer (query `?server=http://IP:3847`) |

## Buzzer system (Phase 6)

The quiz works **without** the buzzer server (manual scoring, demo buzzer simulation). For live races:

1. **Install** root and server deps: `npm install` and `npm run buzzer-server:install`
2. **Start buzzer server** (laptop): `npm run buzzer-server:start`
3. **Start frontend**: `npm run dev`
4. In **Admin**, turn **Buzzer ON**, set server URL to `http://<laptop-ip>:3847`, confirm **Server connected**
5. Open **Projector**; use **Next Question / Arm**, then phones buzz via QR/link

Optional env for default server URL in the built app:

```bash
set VITE_BUZZER_SERVER_URL=http://192.168.1.10:3847
npm run dev
```

### Find laptop IP (Windows)

```text
ipconfig
```

Use the **IPv4 Address** of your Wi‑Fi or hotspot adapter (e.g. `192.168.x.x`). It may change when you reconnect — update Admin and refresh phone links.

### Troubleshooting

| Issue | What to try |
|-------|-------------|
| Admin shows server error | Start `npm run buzzer-server:start`; check port 3847 not in use |
| Phone cannot connect | Same Wi‑Fi/hotspot; use laptop IP not `localhost`; firewall allow 3847 |
| QR opens wrong host | Set correct server URL in Admin first — QR encodes that URL |
| GitHub Pages only | Static site works; **run buzzer server locally** on quiz night |

Details: [`buzzer-server/README.md`](buzzer-server/README.md).

## Offline use (Phase 5)

After a **production** build is served once (`npm run build` then `npm run preview`), the service worker caches the app shell (JS/CSS/HTML). Game data stays in **localStorage**; imported media stays in **IndexedDB** (not in the service worker).

1. Load the app online and use it once so the SW installs.
2. Disconnect the network and refresh — core UI should load if cached.
3. Teams, rounds, and scores persist via localStorage; media requires prior import on the same browser.

**Browser gestures:** projector video/audio still needs a user click on the projector tab when autoplay is blocked. Reloading the projector pauses playback until Play is pressed again.
