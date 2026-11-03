# ADR-001: Protokoll-Bibliothek

Status: vorgeschlagen (Phase 0) · Datum: 2026-11-03

## Entscheidung

Eigene, dünne, typisierte Protokollschicht (`src/protocol/`) plus eigenes `Transport`-Interface
(`src/transport/`). Keine Laufzeit-Abhängigkeit von `@liamcottle/meshcore.js` oder `meshcore-ts`.
Beide Libs (MIT) dienten als Gegenprobe; Layouts wurden gegen die Firmware
(`examples/companion_radio/MyMesh.cpp`, `FIRMWARE_VER_CODE 14`) verifiziert, nicht gegen die Libs.

## Bewertung

| Kriterium | `@liamcottle/meshcore.js` 1.15.0 | `meshcore-ts` 1.0.3 | Eigenbau |
|---|---|---|---|
| Typisierung | keine (reines JS, keine `.d.ts`) | ja | ja |
| Wartung | offiziell (meshcore-dev), aktiv (Commit 2026-10) | 1 Maintainer, Repo mit 1 Commit (2026-08), `package.json` 0.0.0, README mit Platzhaltern | – |
| Telemetrie (0x8B + CayenneLPP) | ja | ja | ja |
| RX-Log (0x88) | ja | Konstante vorhanden | ja |
| Kanäle | ja | ja | ja |
| Repeater-Login / Status / Binary-Req | ja | ja | später (Phase 2) |
| Neuere FW-Befehle (v14 `RUN_CLI_COMMAND` 66) | nein | nein | bei Bedarf |
| Transport | an Protokoll gekoppelt, `alert()` im Lib-Code | gekoppelt, `alert()` | austauschbar (Pflicht wegen Capacitor, Phase 4) |
| BLE-Schreibzugriffe | **nicht serialisiert** (`fixme: GATT operation already in progress`) | Warteschlange nur für Message-Sync | ein Befehl gleichzeitig, durchgängig |

## Begründung

1. **Transport austauschbar** war Vorgabe. Beide Libs verschmelzen Verbindung und Protokoll;
   ein Capacitor-BLE-Transport müsste dort hineingepatcht werden.
2. **Robustheit auf Mobilgeräten:** Unserialisierte GATT-Writes sind bei Chrome-Android/Bluefy
   ein bekanntes Risiko; der Client erzwingt „ein Befehl, eine Antwort, Timeout".
3. **Umfang ist klein:** Phase 0–3 brauchen ~15 Befehle und ~12 Frame-Typen (~300 Zeilen),
   dafür ist eine Fremdabhängigkeit mit Wartungsrisiko nicht gerechtfertigt.
4. **Nachteil:** Wir pflegen Layouts bei Firmware-Änderungen selbst. Gegenmaßnahme:
   Parser sind längenprüfend (werfen statt raten), unbekannte Codes bleiben als `unknown` sichtbar,
   Vitest-Fixtures dokumentieren das Layout.

## Verworfen

- `meshcore.js` direkt nutzen: gute Referenz, aber untypisiert und transportgekoppelt.
- `meshcore-ts` nutzen: passende API, aber Wartungs-/Reifegrad nicht belastbar (Single-Maintainer, README-Platzhalter).
- `@dpup/meshcore-ts`: nur TCP/Serial, kein Web Bluetooth.

## Revisionskriterium

Wenn `meshcore-ts` (oder ein offizielles TS-Paket) einen Transport-Adapter-Vertrag bekommt und
mehrere aktive Maintainer, neu bewerten.
