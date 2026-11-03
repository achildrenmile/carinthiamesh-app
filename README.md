# carinthiamesh-app

[![CI](https://github.com/achildrenmile/carinthiamesh-app/actions/workflows/ci.yml/badge.svg)](https://github.com/achildrenmile/carinthiamesh-app/actions/workflows/ci.yml)
[![Lizenz: MIT](https://img.shields.io/badge/Lizenz-MIT-blue.svg)](LICENSE)

**MeshCore-Client von [CarinthiaMesh](https://carinthiamesh.com)** – eine Web-App, mit der du dein MeshCore-Funkgerät per Bluetooth direkt im Browser bedienst. Ohne Store, ohne Installation, auf Wunsch als App auf dem Startbildschirm.

## Worum es geht

MeshCore ist ein Funknetz für **Textnachrichten ohne Handynetz, ohne Internet und ohne laufende Kosten**. In Kärnten wächst es seit einiger Zeit; **CarinthiaMesh** ist die Initiative dahinter. Mitmachen kann jeder – mit oder ohne Verein, ohne Mitgliedschaft, ohne Funklizenz. Ein Gerät kostet ab etwa 20 €.

Typisch dafür: am Berg und beim Wandern, wo das Handynetz aufgibt, bei Übungen und Ausflügen, als Vorsorge für den Fall, dass Strom oder Mobilfunk ausfallen, und als Hobby – Reichweiten testen, Standorte suchen, das Netz wachsen sehen.

Das Funkgerät kann alles außer bedienen. Dafür ist eine App da: Sie zeigt Kontakte, Kanäle und Nachrichten, das Gerät macht den Funk. Diese hier ist eine davon – gebaut **von der Community, für die Community**.

Alles zum Netz, zu Geräten und Einstellungen steht im **[CarinthiaMesh-Wiki](https://wiki.carinthiamesh.com)**. Neu dabei? Dort beginnt der **[Schnellstart](https://wiki.carinthiamesh.com/schnellstart)** (in 30 Minuten im Netz). Fragen und Absprachen laufen in der [Telegram-Gruppe](https://t.me/+iG58z0aZ6u5iZWM0), im Funknetz auf dem Kanal `#at-ktn`.

## Wie die Idee entstanden ist

> Entwurf auf Basis des Wikis und der Projektunterlagen. Wer die Geschichte besser kennt: bitte ergänzen (siehe [CONTRIBUTING.md](CONTRIBUTING.md)).

Das [Wiki vergleicht vier Apps](https://wiki.carinthiamesh.com/apps) für MeshCore. Alle sind gut, aber jede lässt etwas offen, das uns in Kärnten immer wieder begegnet:

- **Einstieg:** Wer neu ist, muss vier Funkwerte, Path-Hash, Multi-Acks und den Kanal richtig setzen. Ein falscher Wert fühlt sich wie ein Hardwaredefekt an („Gerät läuft, App verbindet, aber es kommt nie eine Nachricht"). Ein Assistent, der das mit dem österreichischen Preset in einem Rutsch erledigt, spart genau diese Fehlersuche.
- **iPhone:** Auf iOS berichten Nutzer von Bluetooth-Verbindungen, die unbemerkt abreißen. Ein Web-Client, der mit Bluefy läuft und dessen Verhalten offen dokumentiert ist, macht solche Fragen überprüfbar.
- **Messwerte:** Die Telemetrie von Repeatern (Batteriespannung, Temperatur) zeigt den aktuellen Wert, aber kaum den Verlauf. Gerade bei Solarbetrieb über den Winter, einem Thema, zu dem das Wiki noch Erfahrungswerte sucht, ist der Verlauf das Interessante.
- **Beobachten:** Die [Node-Karte](https://map.carinthiamesh.com/) lebt von Observern, die mithören und jedes Paket melden. Dafür braucht es bisher einen Node im WLAN und einen Rechner, der durchläuft ([Observer-Stack](https://github.com/achildrenmile/carinthiameshobserver)). Ein Handy, das unterwegs mithört, würde Lücken füllen – zum Beispiel im Lavanttal und im Osten, aus denen bisher kaum jemand meldet.

Aus diesen vier Punkten wurde der Plan: **ein Client im Browser, der Anfänger an die Hand nimmt, Tüftlern alles zeigt, Messwerte aufhebt und optional als Observer mithört**. Browserbasiert, damit niemand etwas installieren muss und jede:r mitbauen kann; später dieselbe Codebasis als native App für den Hintergrundbetrieb.

Der erste Schritt war ein Spike gegen die Firmware (nicht nur gegen die Doku), um zu klären, was das Protokoll überhaupt hergibt – etwa, dass der Companion empfangene Rohpakete samt SNR und RSSI an die App weitergibt. Nachzulesen in [docs/spike-ergebnis.md](docs/spike-ergebnis.md).

## Was die App kann

- **Einfach-Modus (Standard):** Assistent in vier Schritten (verbinden, Name, Österreich-Preset, Kanäle), danach nur Chat, Kontakte und Karte – große Knöpfe, keine Fachbegriffe.
- **Tüftler-Modus:** Geräte- und Funkeinstellungen, Kanalschlüssel, Pfade/Hops/SNR, Rohdaten-Protokoll, Repeater-Login und -Befehle, Messwerte mit Verlauf (aktueller Wert, Änderung, Mini-Grafik, CSV/JSON-Export).
- **Mobiler Observer (Tüftler):** gehörte Pakete per MQTT über WebSocket an einen Broker deiner Wahl, mit optionalem Handy-Standort und Offline-Puffer. Details: [docs/observer-format.md](docs/observer-format.md).
- Deutsch und Englisch; Daten bleiben lokal im Browser (IndexedDB).

Alle Funktionen mit ehrlichem Status (getestet / am Gerät noch nicht erprobt / geplant): **[docs/features.md](docs/features.md)**.

> **Ehrlicher Stand:** Die App ist gebaut und getestet (Parser, Observer-Format, Telemetrie, UI-Gerüst), aber **noch nicht am echten Funkgerät erprobt**. Genau dafür suchen wir Mitstreiter – siehe unten.

## Unterstützte Browser

| Plattform | Browser |
|---|---|
| Android | Chrome |
| iPhone / iPad | **Bluefy** (Safari kann kein Web Bluetooth – die App weist darauf hin) |
| Desktop | Chrome, Edge |

Web Bluetooth braucht HTTPS (oder `localhost`).

**Wichtig:** Im Browser endet der Observer-Betrieb, sobald der Bildschirm ausgeht oder die App im Hintergrund ist. Dauerbetrieb im Hintergrund soll später die native Variante bringen ([ADR-002](docs/ADR-002-native.md)).

## Funk-Preset

Die Funkparameter stehen **nicht** im Code, sondern in [`public/presets/at.json`](public/presets/at.json). Sie sind mit den Werten aus dem [Wiki](https://wiki.carinthiamesh.com/netz/einstellungen) vorbelegt: 869,618 MHz, 62,5 kHz, SF8, CR8, Path-Hash 2 Byte, Multi-Acks und der Kanal `#at-ktn`. Steht ein Funkwert auf `null`, lässt der Assistent ihn unverändert. Ändert das Netz seine Werte, ändert sich nur diese Datei.

Keine Zugangsdaten ins Repo! Den Broker-Zugang gibt jeder in der App ein (Zugang über die [Telegram-Gruppe](https://t.me/+iG58z0aZ6u5iZWM0) anfragen, siehe [Observer](https://wiki.carinthiamesh.com/observer)).

## Mitmachen – gemeinsam bauen, bis sie passt

Die App wächst mit der Community. Am meisten hilft ein **Gerätetest** mit deinem Companion (Issue-Vorlage „Gerätetest-Bericht"), besonders in Bluefy auf dem iPhone. Dazu Verständlichkeit prüfen, übersetzen, Fehler melden oder Code beitragen. Alles Weitere steht in [CONTRIBUTING.md](CONTRIBUTING.md). Es gilt der [Verhaltenskodex](CODE_OF_CONDUCT.md); Sicherheitsthemen: [SECURITY.md](SECURITY.md).

Alles läuft auf GitHub: Code, Issues, Diskussionen, Tests (Actions) und Hosting (Pages) – ohne eigenen Server.

## Entwickeln

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Protokoll-, Observer-, Telemetrie- und UI-Tests (Vitest)
npm run build      # statische Seite in dist/
```

Aufbau: `src/protocol` (Frames, gegen Firmware verifiziert) · `src/transport` (austauschbar: Web Bluetooth, später Capacitor) · `src/client.ts` (ein Befehl gleichzeitig) · `src/session.ts` · `src/observer` · `src/ui`.
Entscheidungen: [ADR-001](docs/ADR-001-protokoll-lib.md), [Spike-Ergebnis](docs/spike-ergebnis.md), [Gerätetest](docs/geraetetest.md).

## Betrieb

Statische Seite, kein Backend. Standard ist **GitHub Pages** (Workflow [`pages.yml`](.github/workflows/pages.yml), HTTPS inklusive). Alternativ als Container hinter nginx ([Dockerfile](Dockerfile), [deploy/](deploy/)).
Bekannt: Kartenkacheln kommen von openstreetmap.org (die IP des Nutzers geht dorthin).

## Lizenz und Betreiber

Ein Projekt von **[CarinthiaMesh](https://carinthiamesh.com)** – der Initiative für das MeshCore-Netz in Kärnten.

[MIT](LICENSE) – frei nutzbar, veränderbar und weitergebbar. Das Projekt steht nicht in Verbindung mit dem MeshCore-Projekt selbst; „MeshCore" bezeichnet hier das Funknetz bzw. Protokoll.
