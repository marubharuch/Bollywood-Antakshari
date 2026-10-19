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
