# Bollywood Antakshari Tournament Web App

Phase 1: Admin panel, projector display, demo scoring, and cross-tab sync (no backend).

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
| `#/` or `#/admin` | Admin control panel |
| `#/projector`    | Audience display     |
| `#/split-test`   | Split-screen test    |
| `#/teams`        | Team management      |
| `#/rounds`       | Round library        |
| `#/media`        | Music library        |

## Offline use (Phase 5)

After a **production** build is served once (`npm run build` then `npm run preview`), the service worker caches the app shell (JS/CSS/HTML). Game data stays in **localStorage**; imported media stays in **IndexedDB** (not in the service worker).

1. Load the app online and use it once so the SW installs.
2. Disconnect the network and refresh — core UI should load if cached.
3. Teams, rounds, and scores persist via localStorage; media requires prior import on the same browser.

**Browser gestures:** projector video/audio still needs a user click on the projector tab when autoplay is blocked. Reloading the projector pauses playback until Play is pressed again.
