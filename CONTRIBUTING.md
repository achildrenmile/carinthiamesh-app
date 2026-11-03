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

### Pull-Request-Strategie

Ziel: Der Hauptzweig läuft immer, und viele Leute können parallel arbeiten, ohne sich im Weg zu stehen.

**Grundprinzip: ein Hauptzweig, kurze Branches.** `main` ist immer lauffähig, denn jeder Merge wird über GitHub Pages veröffentlicht. Es gibt keinen langlebigen `develop`-Zweig.

1. **Idee zuerst besprechen** (Issue oder Telegram), wenn die Änderung mehr als einen Nachmittag kostet oder Protokoll, Preset oder Datenbank betrifft.
2. **Fork oder Branch.** Externe forken; Maintainer branchen direkt. Branch-Namen: `feature/<thema>`, `fix/<thema>`, `docs/<thema>`, `test/<thema>`.
3. **Klein halten.** Ein PR = ein Thema, am besten unter ~400 Zeilen. Große Vorhaben in Schritte teilen, die einzeln lauffähig sind.
4. **Früh als Entwurf öffnen** („Draft"), wenn du Feedback willst. Aus dem Entwurf wird ein normaler PR, sobald `npm run typecheck && npm test && npm run build` grün ist.
5. **Titel = künftige Commit-Zeile**, mit Präfix: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`. Beispiel: `fix: Telemetrie-Antwort wird bei kurzem LPP-Puffer nicht mehr verworfen`.
6. **Squash-Merge.** Jeder PR wird zu **einem** Commit auf `main`; Zwischen-Commits dürfen unordentlich sein.
7. **Auf `main` aktuell halten:** vor der Review `git rebase main` oder `main` in den Branch mergen. Konflikte löst die Autorin bzw. der Autor.

**Review**

- Mindestens **eine Freigabe** einer anderen Person, bevor gemergt wird. Eigene PRs nicht selbst freigeben und nicht ohne Review mergen (Ausnahme: Tippfehler in Doku).
- Reviewen heißt: Verstehe ich es? Ist es getestet? Stimmt die Protokoll-Quelle? Hält es den Einfach-Modus einfach? Kein Geschmacksstreit über Stil, den Prettier oder TypeScript klären könnten.
- Wir antworten in der Regel **innerhalb einer Woche**. Ohne Bewegung seit 30 Tagen schließen wir PRs freundlich (wieder öffnen jederzeit möglich).
- Kritik betrifft den Code, nie die Person ([Verhaltenskodex](CODE_OF_CONDUCT.md)).

**Besondere Sorgfalt (CODEOWNERS erzwingt die Review eines Maintainers)**

| Bereich | Warum | Zusätzlich verlangt |
|---|---|---|
| `src/protocol/`, `src/transport/`, `src/client.ts`, `src/session.ts` | Fehler hier wirken am Gerät und sind ohne Funkgerät schwer zu sehen | Firmware-Quelle (Datei und Zeile), Test mit Frames, Angabe „am Gerät getestet: ja/nein" |
| `src/observer/` | Sendet Daten an einen gemeinsamen Broker | Format gegen [observer-format.md](docs/observer-format.md); nie ungefragt mehr senden |
| `public/presets/` | Betrifft **alle Geräte im Netz** (falscher Wert = taub für alle anderen) | Verweis auf die Änderung im [Wiki](https://wiki.carinthiamesh.com/netz/einstellungen); Absprache im Netz **vor** dem Merge |
| `src/data/db.ts` (Schema) | Bestehende Nutzerdaten dürfen nicht verloren gehen | Dexie-Migration (neue `version(n)`), nie alte Version ändern |

**„Am Gerät nicht erprobt" ist erlaubt, aber sichtbar.** Ein PR darf ohne Funkgerät gemergt werden, wenn Tests und Review stimmen. Er bekommt dann das Label `ungetestet-am-geraet`, und die Funktion steht in [docs/features.md](docs/features.md) als 🔧. Ein Gerätetest-Bericht (Issue-Vorlage) oder ein Folge-PR hebt sie auf ✅. Vor einem Release sollte kein Kernpfad (Verbinden, Senden, Empfangen) mehr 🔧 sein.

**Labels:** `bug`, `enhancement`, `geraetetest`, `ungetestet-am-geraet`, `needs-device-test`, `i18n`, `docs`, `good first issue`, `help wanted`, `blocked`, `conduct`.

**Releases:** Versionen nach [SemVer](https://semver.org/lang/de/) als GitHub-Release (`v0.2.0`). Release-Notizen stammen aus den PR-Titeln. Pre-1.0 darf sich alles ändern; Datenmigration bleibt trotzdem Pflicht.

**Abhängigkeits-PRs (Dependabot):** Patch- und Minor-Updates mit grüner CI dürfen nach kurzem Blick gemergt werden; Major-Updates (z. B. Dexie, Preact, mqtt.js) wie normale PRs prüfen und im Browser anklicken.

**Für Maintainer: Einstellungen in GitHub** (Repository → Settings)

- Branch protection auf `main`: PR erforderlich, 1 Freigabe, CODEOWNERS-Review, Status-Check `test` (CI) erforderlich, Branch muss aktuell sein, keine Force-Pushes.
- Nur Squash-Merge erlauben, Branch nach dem Merge löschen.
- Pages: Quelle „GitHub Actions". Private Vulnerability Reporting einschalten. Discussions aktivieren (Fragen und Ideen), Issues für konkrete Aufgaben.

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
