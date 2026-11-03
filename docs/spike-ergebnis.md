# Phase-0-Spike – Ergebnis

Stand: 2026-11-03 · Firmware-Referenz: MeshCore `main` (Merge 2026-10-15), `FIRMWARE_VER_CODE 14`

> **Wichtig – was geprüft wurde und was nicht:** Alle Aussagen unten stammen aus dem
> Firmware-Quellcode und der Doku. **Es wurde noch kein echtes Gerät angesprochen**, weder in
> Chrome noch in Bluefy (kein Companion/Browser in dieser Umgebung). Die Spike-Seite ist gebaut,
> typgeprüft und die Parser sind getestet – aber mit synthetischen Frames, nicht mit Aufzeichnungen.
> Die Hardware-Tests stehen als Checkliste unten und brauchen dich.

## Spike-Seite

`npm run dev` bzw. `npm run build` → `index.html`. Ablauf: Verbinden → `APP_START` → `DEVICE_QUERY(3)`
→ Zeit lesen/setzen → Kontakte + Kanäle → Telemetrie an ersten Repeater. Jeder Frame (→ / ←) wird als
Hex ins Log geschrieben; „Log kopieren" liefert die echten Fixtures für die Tests.
Auf Browsern ohne Web Bluetooth (Safari/iOS) erscheint ein Hinweis auf Bluefy.

## Punkt 2: RX-Log-Push – **positiv** (Phase 3 ist machbar)

Doku sagt nur „RF log data, kann ignoriert werden", ohne Layout. Quelle ist die Firmware
(`MyMesh::logRxRaw`, `MyMesh.cpp:291`):

```
0x88 | snr_x4 (i8) | rssi (i8) | rohes Mesh-Paket (Rest des Frames)
```

- SNR = `i8 / 4` dB, RSSI = `i8` dBm (auf ganze dBm gerundet, nur 1 Byte).
- Rohbytes = das komplette empfangene LoRa-Paket (Header, Pfad, Payload, verschlüsselt) – genau das, was ein Observer-Uplink braucht.
- Gesendet wird **nur bei bestehender App-Verbindung** und nur, wenn `len + 3 <= 176` (`MAX_FRAME_SIZE`). **Größere Pakete werden verworfen, nicht gekürzt.** Das ist eine echte Lücke für Phase 3 (lange Pakete fehlen im Uplink) – bitte beim Gerätetest beobachten.
- Kein Opt-in nötig; die Firmware sendet es unaufgefordert. Es ist **kein Zeitstempel** enthalten (App-Empfangszeit verwenden) und **nur empfangene** Pakete, nicht eigene Sendungen.

## Punkt 3: Telemetrie – CayenneLPP, asynchron

- Anfrage an Kontakt/Repeater: `CMD 39 | 00 00 00 | pubkey(32)` → sofort `RESP_SENT (6)` mit `tag`/Timeout, später **Push `0x8B`**:
  `0x8B | reserved | pubkey_prefix(6) | CayenneLPP…`. Die Firmware markiert Cmd 39 als „can deprecate" zugunsten `CMD_SEND_BINARY_REQ (50)` mit Request-Typ `0x03` (Antwort dann `0x8C`). **Offen:** welchen Weg die Repeater-Firmware dauerhaft unterstützt – beide testen.
- Eigene Telemetrie: `CMD 39` mit Länge 4 (ohne Pubkey) → sofortiger `0x8B`-Push mit Batteriespannung, MCU-Temperatur, Sensoren.
- Format **CayenneLPP, Big-Endian** (Rest des Protokolls ist Little-Endian). Wichtige Typen: Spannung (116, 0,01 V), Temperatur (103, 0,1 °C), Luftfeuchte (104), Druck (115), GPS (136). Parser: `src/protocol/cayenne.ts`.
- Antwort ist an einen einzigen offenen Request gekoppelt (`pending_telemetry`, `clearPendingReqs()`): **parallele Abfragen mehrerer Repeater sind nicht möglich**, sie müssen nacheinander laufen (relevant für Phase 2 Intervall).

## Punkt 1: Handshake & Listen (aus Quellcode verifiziert, am Gerät offen)

| Schritt | Befehl | Antwort | Anmerkung |
|---|---|---|---|
| Start | `01` + 7×`00` + Name | `0x05 SELF_INFO` | Firmware verlangt `len >= 8` |
| Query | `16 03` | `0x0D DEVICE_INFO` | `maxChannels` Byte 3, `maxContacts = Byte2 × 2` |
| Zeit | `06` + u32 LE | `OK` oder `ERR(6)` | **Zeit lässt sich nur vorwärts setzen** (`secs >= curr`), sonst ILLEGAL_ARG – die UI darf das nicht als Fehler melden |
| Kontakte | `04` | `0x02` Start → n×`0x03` → `0x04` Ende | `BAD_STATE`, wenn noch ein Iterator läuft; erneutes `APP_START` setzt ihn zurück |
| Kanäle | `1F idx` | `0x12` oder `ERR(2)` | Leere Slots liefern NOT_FOUND – Schleife darf dort nicht abbrechen |

Kontakt-Frame: `03 | pubkey(32) | type | flags | outPathLen | outPath(64) | name(32) | lastAdvert u32 | lat i32/1e6 | lon i32/1e6 | lastMod u32`. `outPathLen = 0xFF` heißt „kein Pfad/Flood" (am Gerät prüfen).

## Abweichungen Doku ↔ Firmware

1. Doku: `RX_LOG (0x88)` „ignorierbar", **ohne Layout** → Layout siehe oben.
2. Doku nennt keine Layouts für `SET_DEVICE_TIME`, `GET_CONTACTS`, Telemetrie, `CURRENT_TIME`, Kontakt-Frames → aus Firmware abgeleitet.
3. Doku führt `DEVICE_QUERY` als `16 03`; die Firmware akzeptiert beliebiges `app_target_ver` (`len >= 2`), das V3-Nachrichtenformat gilt ab `>= 3`.
4. Doku-Kanalindex-Beispiele (1–7) ignorieren `max_channels` (1, 8 oder 40) – immer gegen `DEVICE_INFO` prüfen.
5. `Cmd 66 RUN_CLI_COMMAND` (v14) steht in der Firmware, nicht in der Doku und in keiner der beiden JS-Libs. Das ist die CLI des **eigenen** Companions, nicht Repeater-CLI (die läuft über Textnachricht Typ `CliData=1` nach Login).

## Offen / Risiken für den Gerätetest

- **Bluefy:** Gleicher Web-Bluetooth-Code; Abweichungen (Picker, MTU, Reconnect, Hintergrund) erst am Gerät belegbar. Erwartung: Bluefy kann gelegentlich `writeValueWithResponse` ablehnen – dann auf `writeValue` zurückfallen. **Das ist eine Erwartung, kein Befund.**
- **MTU/Frame-Größe:** Frames bis 176 Byte; ob Chrome-Android/Bluefy sie als *eine* Notification liefern oder aufteilen, ist ungeprüft. Ein zu kleiner MTU würde Parser mit „Frame zu kurz" scheitern lassen (sichtbar im Log, kein stilles Fehlparsen).
- **Pairing:** Companion fragt BLE-PIN (PIN steht in `DEVICE_INFO.blePin`; Standardwert nicht geprüft) – OS-Dialog, nicht von der App steuerbar.
- Hintergrundbetrieb: Browser pausiert BLE bei Bildschirm-aus – bestätigt Phase-3-Einschränkung, nicht getestet.

## Checkliste für deinen Gerätetest (Chrome Android/Desktop, Bluefy)

1. `npm run dev -- --host` bzw. HTTPS-Deploy öffnen (Web Bluetooth braucht Secure Context; `localhost` zählt).
2. „1 · Verbinden" → Log enthält `SELF_INFO` + `DEVICE_INFO`?
3. „2 · Zeit setzen" → `set` oder `device-ahead`?
4. „3 · Kontakte + Kanäle" → Anzahl plausibel?
5. Funkverkehr in der Nähe abwarten → Zähler „RX-Log" steigt? SNR/RSSI plausibel?
6. „4 · Telemetrie" → `TELEMETRIE von …` mit Spannung/Temperatur?
7. „Log kopieren" und mir schicken (ohne Pubkeys/Kanalschlüssel, falls privat – `CHANNEL_INFO` enthält den Secret!).

## Empfehlung

**Go für Phase 1**, sobald der Gerätetest ohne Überraschungen läuft; Phase 3 ist laut Firmware machbar mit der Einschränkung zu großer Pakete.
