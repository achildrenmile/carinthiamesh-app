# Observer-Uplink-Format

Die App sendet RX-Log-Pushes (`0x88`) im Format von `meshcoretomqtt`, wie es der CarinthiaMesh-Observer-Stack nutzt.

**Topic:** `meshcore/<IATA>/<PUBLIC_KEY>/packets` · Status (retained, mit Last-Will `offline`): `meshcore/<IATA>/<PUBLIC_KEY>/status`
`PUBLIC_KEY` = 64 Hex-Zeichen, **Großbuchstaben**, vom verbundenen Companion.

**Payload (alle Werte Strings):**
`origin, origin_id, timestamp (ISO, lokal), type="PACKET", direction="rx", time, date (d/m/yyyy), len, packet_type, route (F|D), payload_len, raw (Hex), SNR, RSSI, score="1000", hash, [path]` plus App-Erweiterung `lat, lon` (nur mit Opt-in).

## Was verifiziert ist und was nicht
- **Header/Pfad/Typ/Hash** sind gegen die Firmware (`Packet.cpp`) implementiert und getestet (synthetische Pakete).
- **Feldnamen** stammen aus der meshcoretomqtt-README; Bedeutungen von `score` und `time/date`-Zeitzone sind **abgeleitet**. `score` wird konstant `1000` gesendet.
- **Status-Payload** ist in der Quelle nicht dokumentiert. Die App sendet `{status, origin, origin_id, firmware_version, radio, client_version}`; das **Radio-Format** (`freq,bw,sf,cr`) ist geraten. **Vor Produktivbetrieb gegen einen echten Observer-Status auf dem Broker vergleichen** (`mosquitto_sub -t 'meshcore/+/+/status' -v`).
- `lat/lon` sind keine Felder des Originals; Auswerter, die strikt validieren, könnten sie ablehnen.

## Grenzen (Firmware)
- Pakete, deren Rahmen (Paket + 3 Byte) 176 Byte überschreitet, liefert der Companion nicht (`logRxRaw`). Sie fehlen im Uplink.
- Keine Zeitstempel vom Gerät: Die App stempelt mit der Empfangszeit.
- Nur bei bestehender BLE-Verbindung; nur empfangene Pakete.

## Betrieb im Browser
Chrome und Bluefy pausieren BLE/Netzwerk bei Bildschirm-aus bzw. Hintergrund. Der Observer endet dann, bis die Seite wieder vorn ist. Lösung: Phase 4 (`ADR-002-native.md`).
Zugangsdaten werden nur lokal in IndexedDB gespeichert (im Klartext, wie jedes Browser-Formular – kein Schutz gegen jemanden mit Zugriff aufs Gerät).
