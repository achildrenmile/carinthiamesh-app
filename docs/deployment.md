# Bauen und Veröffentlichen

## Wo läuft die App?

**https://achildrenmile.github.io/carinthiamesh-app/** (GitHub Pages, HTTPS – Pflicht für Web Bluetooth).

Es gibt kein Backend. Die Seite ist reines HTML/JS/CSS; Daten bleiben im Browser des Nutzers.

## Wie wird sie gebaut?

Jeder Push auf `main` startet den Workflow [`pages.yml`](../.github/workflows/pages.yml):

1. Code auschecken, Node 24 einrichten, `npm ci`
2. `npm run typecheck && npm test` – schlägt eines fehl, wird **nichts** veröffentlicht
3. `npm run build` mit `BASE_URL=/carinthiamesh-app/` (Vite, erzeugt `dist/` inklusive Service Worker und Manifest)
4. `dist/` als Pages-Artefakt hochladen und mit `actions/deploy-pages` veröffentlichen

Zusätzlich prüft [`ci.yml`](../.github/workflows/ci.yml) jeden Pull Request (Typecheck, Tests, Build). Auf `main` baut es außerdem ein Container-Image (`ghcr.io/achildrenmile/carinthiamesh-app`) für den optionalen Betrieb hinter nginx.

Ein Lauf dauert etwa eine Minute; Status unter **Actions** im Repo. Manuell anstoßen: Actions → *pages* → *Run workflow*.

## Lokal bauen

```bash
npm ci
npm run build                                   # Ausgabe in dist/, Basis "/"
BASE_URL=/carinthiamesh-app/ npm run build      # wie auf GitHub Pages
npm run preview -- --host                       # dist/ ausprobieren
```

`BASE_URL` muss zum Ort passen, an dem die Seite liegt: `/carinthiamesh-app/` bei der Projektseite, `/` bei einer eigenen Domain.

## Einmalige Einstellung im Repo

Settings → Pages → **Source: GitHub Actions** (ist bereits gesetzt).

## Eigene Domain (optional)

1. DNS: `CNAME` von z. B. `app.carinthiamesh.com` auf `achildrenmile.github.io`
2. Settings → Pages → Custom domain eintragen, „Enforce HTTPS" aktivieren
3. In `pages.yml` `BASE_URL` auf `/` stellen

## Anderer Betrieb: Container

[`Dockerfile`](../Dockerfile) baut die Seite und liefert sie mit nginx aus (Port 8080, ohne Root). nginx setzt zusätzlich Sicherheits-Header (CSP, Permissions-Policy), die GitHub Pages nicht setzen kann. Kubernetes-Beispiele liegen in [`deploy/k8s/`](../deploy/k8s/). Der Image-Build wurde bisher nicht lokal getestet.

## Aktualisierungen bei Nutzern

Die App ist eine PWA mit Service Worker (`autoUpdate`): Nach einer neuen Version lädt der Browser sie beim nächsten Start im Hintergrund und wechselt beim darauffolgenden Öffnen. Wer Probleme nach einem Update hat, schließt die App ganz oder leert die Websitedaten.
