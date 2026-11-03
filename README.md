# carinthiamesh-app

**MeshCore-Client von CarinthiaMesh** – eine Web-App (PWA), mit der du dein MeshCore-Funkgerät per Bluetooth
vom Browser aus bedienst. Das Netz heißt MeshCore; CarinthiaMesh ist die Initiative dahinter in Kärnten.
Mitmachen kann jeder, mit oder ohne Verein.

> Screenshots folgen nach dem ersten Gerätetest (ohne Gerät lassen sich die Bildschirme nicht sinnvoll abbilden).

## Was kann sie?

- **Einfach-Modus (Standard):** Assistent in vier Schritten (verbinden, Name, Österreich-Preset, Kanäle), danach nur
  Chat, Kontakte und Karte – große Knöpfe, keine Fachbegriffe.
- **Tüftler-Modus:** Geräte- und Funkeinstellungen, Kanalschlüssel, Pfade/Hops/SNR, Rohdaten-Protokoll,
  Repeater-Login und -Befehle, Messwerte mit Verlauf (aktueller Wert, Änderung, Mini-Grafik, CSV/JSON-Export).
- **Mobiler Observer (Tüftler):** gehörte Pakete per MQTT über WebSocket an einen Broker deiner Wahl,
  mit optionalem Handy-Standort und Offline-Puffer. Details: [docs/observer-format.md](docs/observer-format.md).
- Deutsch und Englisch, Installierbar als App, Daten bleiben lokal im Browser (IndexedDB).

## Unterstützte Browser

| Plattform | Browser |
|---|---|
| Android | Chrome |
| iPhone / iPad | **Bluefy** (Safari kann kein Web Bluetooth – die App weist darauf hin) |
| Desktop | Chrome, Edge |

Web Bluetooth braucht HTTPS (oder `localhost`).

**Wichtig:** Im Browser endet der Observer-Betrieb, sobald der Bildschirm ausgeht oder die App im Hintergrund ist.
Dauerbetrieb im Hintergrund soll später die native Variante bringen ([ADR-002](docs/ADR-002-native.md)).

## Funk-Preset eintragen

Die Funkparameter stehen **nicht** im Code, sondern in [`public/presets/at.json`](public/presets/at.json).
Vorbelegt mit den Werten aus dem [CarinthiaMesh-Wiki](https://wiki.carinthiamesh.com/netz/einstellungen) (869,618 MHz, 62,5 kHz, SF8, CR8, Path-Hash 2 Byte, Multi-Acks, Kanal `#at-ktn`). Steht ein Funkwert auf `null`, lässt der Assistent ihn unverändert. Standardkanäle
trägst du im selben File ein (`secretHex` oder `"hashtag": true`).
Keine Zugangsdaten ins Repo! Broker-Zugang gibt jeder in der App ein.

## Entwickeln

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Protokoll-, Observer-, Telemetrie- und UI-Tests (Vitest)
npm run build      # statische Seite in dist/
```

Aufbau: `src/protocol` (Frames, gegen Firmware verifiziert) · `src/transport` (austauschbar: Web Bluetooth, später Capacitor) ·
`src/client.ts` (ein Befehl gleichzeitig) · `src/session.ts` · `src/observer` · `src/ui`.
Entscheidungen: [ADR-001](docs/ADR-001-protokoll-lib.md), [Spike-Ergebnis](docs/spike-ergebnis.md), [Gerätetest](docs/geraetetest.md).

## Betrieb

Statische Seite, ohne Backend. Zwei Wege: **GitHub Pages** (Workflow `pages.yml`, HTTPS inklusive) oder Container hinter nginx ([Dockerfile](Dockerfile), [deploy/](deploy/)).
Bekannt: Kartenkacheln kommen von openstreetmap.org (die IP des Nutzers geht dorthin).

## Lizenz

MIT
