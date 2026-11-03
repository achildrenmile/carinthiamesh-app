# Mitmachen

Schön, dass du mitbauen willst. Die App ist ein Gemeinschaftsprojekt rund um das MeshCore-Netz in Kärnten – **mit oder ohne Verein, mit oder ohne Programmierkenntnisse**. Gebaut wird, bis sie für alle passt.

## Ohne Code helfen (sehr gefragt)

| Was | Wie |
|---|---|
| **Am Gerät testen** | Die App wurde bisher **ohne echtes Funkgerät** gebaut. Jeder Test mit deinem Companion hilft: Issue „Gerätetest-Bericht" ausfüllen, Tabelle in [docs/geraetetest.md](docs/geraetetest.md) ergänzen. |
| **Bluefy / iOS** | Wer ein iPhone hat: bitte Verbindung, Senden, Empfangen und Hintergrundverhalten in Bluefy prüfen und Abweichungen melden. |
| **Verständlichkeit** | Versteht jemand ohne Technikhintergrund den Einfach-Modus? Wo bleibt man hängen? Issue „Verbesserung" mit Screenshot. |
| **Übersetzen** | Texte stehen in `src/i18n/de.ts` und `en.ts`. Neue Sprache = neue Datei + Eintrag in `src/i18n/index.ts`. |
| **Wiki-Abgleich** | Stimmen Preset und Kanäle noch mit dem [Wiki](https://wiki.carinthiamesh.com) überein? Abweichung melden. |

## Mit Code helfen

```bash
git clone https://github.com/achildrenmile/carinthiamesh-app
cd carinthiamesh-app
npm install
npm run dev            # http://localhost:5173
npm run typecheck && npm test
```

Web Bluetooth braucht **Chrome oder Edge**, `localhost` zählt als sicherer Kontext. Ohne Funkgerät lassen sich Parser, Observer-Format, Telemetrie und UI-Gerüst testen; für alles andere brauchst du einen MeshCore-Companion.

### Aufbau

| Pfad | Zweck |
|---|---|
| `src/protocol/` | Frames, Befehle, Paket-Dekodierung, CayenneLPP. **Reine Funktionen, keine Browser-APIs.** |
| `src/transport/` | Austauschbarer Transport (Web Bluetooth; später Capacitor). Neue Transporte implementieren `Transport`. |
| `src/client.ts` | Ein Befehl gleichzeitig, Timeouts, Push-Trennung |
| `src/session.ts` | Verbinden, Sync, Nachrichten, Telemetrie, Observer-Steuerung |
| `src/observer/` | MQTT-Uplink, Offline-Puffer |
| `src/data/` | Dexie-Schema, Einstellungen, Preset, Telemetrie-Auswertung |
| `src/ui/`, `src/i18n/` | Oberfläche (Preact), Texte |
| `public/presets/` | Funk-Preset als Datei, nicht im Code |

### Regeln, die uns Ärger ersparen

1. **Protokoll nur gegen die Firmware verifizieren**, nicht gegen die Doku allein. Die [Companion-Doku](https://docs.meshcore.io/companion_protocol/) ist „in development". Quelle im PR nennen (Datei und Zeile in `examples/companion_radio/MyMesh.cpp`).
2. **Parser werfen statt zu raten.** Zu kurze oder unbekannte Frames dürfen nie stillschweigend falsch gelesen werden.
3. **Tests für jeden Parser** in `tests/` (Vitest). Echte, am Gerät aufgezeichnete Frames sind besser als konstruierte – bitte als Fixture beilegen und im Test kennzeichnen. **Vorher Kanalschlüssel, Public Keys und Namen schwärzen, wenn sie privat sind.**
4. **Keine Zugangsdaten ins Repo**: keine Broker-Passwörter, Tokens, privaten Kanalschlüssel. Auch nicht in Tests oder Screenshots.
5. **Wenn das Protokoll etwas nicht hergibt, sagen wir das**, statt es per Umweg nachzubauen. Wir patchen keine Firmware.
6. **Einfach-Modus bleibt einfach**: keine Fachbegriffe, große Knöpfe. Technisches gehört in den Tüftler-Modus.
7. **Texte immer über `t('…')`**, nie fest im Markup. Neue Schlüssel in `de.ts` **und** `en.ts`.
8. **Nicht vertrauenswürdige Daten** (Kontakt- und Kanalnamen, Nachrichten kommen aus dem Funknetz) nie als HTML einfügen.
9. **Sendezeit ist knapp.** Nichts einbauen, das ungefragt oder in Schleifen sendet.

### Ablauf

1. Für größere Änderungen vorher ein Issue anlegen oder in der Community-Runde fragen – spart doppelte Arbeit.
2. Branch vom aktuellen `main`: `feature/<thema>` oder `fix/<thema>`.
3. Kleine, nachvollziehbare Commits, Beschreibung auf Deutsch oder Englisch.
4. Vor dem PR: `npm run typecheck && npm test && npm run build`.
5. Pull Request mit der Vorlage. Was du am echten Gerät getestet hast und was **nicht**, gehört ehrlich hinein.
6. Mindestens eine Person schaut drüber, bevor gemergt wird. Autor:innen mergen ihre eigenen PRs nicht ohne Review, außer bei reinen Tippfehlern.

### Größere Themen, bei denen Hilfe willkommen ist

- Gerätetest in Bluefy und Dokumentation der Abweichungen
- Verhalten bei MTU < Framegröße (Notifications werden eventuell geteilt)
- Reconnect-Strategie nach Verbindungsabbruch
- Phase 4: nativer Wrapper (siehe [ADR-002](docs/ADR-002-native.md))
- Repeater-Verwaltung (Regionen, Konfiguration) im Tüftler-Modus
- Barrierefreiheit (Screenreader, Kontrast, Schriftgrößen)

## Verhalten

Es gilt der [Verhaltenskodex](CODE_OF_CONDUCT.md). Sicherheitslücken bitte **nicht** öffentlich melden, siehe [SECURITY.md](SECURITY.md).

## Lizenz

Mit deinem Beitrag stimmst du zu, dass er unter der [MIT-Lizenz](LICENSE) des Projekts steht.
