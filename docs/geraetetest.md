# Gerätetest-Protokoll (Chrome / Bluefy)

Ausgefüllt wird dieses Dokument nach dem Test am echten Companion. **Bis dahin ist nichts davon bestätigt.**

| Prüfpunkt | Chrome Android | Chrome Desktop | Bluefy iOS |
|---|---|---|---|
| Picker zeigt Gerät | | | |
| Pairing/PIN | | | |
| APP_START + DEVICE_QUERY | | | |
| Frames ≤ 176 B als *eine* Notification | | | |
| Zeit setzen (set / device-ahead) | | | |
| Kontakte + Kanäle | | | |
| Nachricht senden (Kanal) / empfangen | | | |
| Direktnachricht + ACK | | | |
| RX-Log-Zähler steigt | | | |
| Telemetrie Repeater (0x8B) | | | |
| Observer → MQTT (Bildschirm an) | | | |
| Verhalten bei Bildschirm-aus | | | |
| Reconnect nach Abbruch | | | |

## Abweichungen Bluefy
(hier eintragen; bekannte Fragen: `writeValueWithResponse` vs. `writeValue`, MTU, Picker-Verhalten, PWA-Installation, Hintergrund)
