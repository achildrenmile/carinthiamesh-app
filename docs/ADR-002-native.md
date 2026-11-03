# ADR-002: Native Wrapper (Phase 4) – Konzept, nicht umgesetzt

Status: Konzept · Datum: 2026-11-03

## Ziel
Observer-Betrieb auch bei ausgeschaltetem Bildschirm. Im Browser (Chrome wie Bluefy) pausiert das
System BLE-Verbindung und Timer, sobald die Seite nicht mehr im Vordergrund ist – das lässt sich
mit einer PWA nicht umgehen.

## Ansatz
Dieselbe Codebasis in **Capacitor**. Der Seam existiert bereits: `src/transport/transport.ts`.

- Neuer `CapacitorBleTransport` (Plugin z. B. `@capacitor-community/bluetooth-le`), gleiche Schnittstelle
  `connect/send/onFrame/onDisconnect`. `protocol/`, `client.ts`, `session.ts`, UI bleiben unverändert.
- **Android:** Foreground-Service (Typ `connectedDevice`) hält BLE + MQTT am Leben; Dauer-Notification
  „Observer aktiv"; Berechtigungen `BLUETOOTH_CONNECT/SCAN`, `POST_NOTIFICATIONS`, `ACCESS_FINE_LOCATION`
  (nur für Handy-GPS im Observer). Akku-Optimierung für die App ausnehmen lassen (Hinweis im UI).
  Der Dienst müsste Observer-Logik (RX-Log → MQTT) **nativ oder in einem Headless-WebView** ausführen, weil
  die WebView im Hintergrund gedrosselt wird. Empfehlung: Observer-Kern (`observer/format.ts`,
  MQTT) als kleine Kotlin-Komponente spiegeln und per Test-Vektoren aus `tests/packet.test.ts` gegen das TS-Original prüfen.
- **iOS:** Hintergrund-BLE ist möglich (`bluetooth-central` Background Mode), aber nur mit Einschränkungen:
  Core Bluetooth weckt die App bei Notifications, die Laufzeit pro Wake ist begrenzt, ein dauerhafter
  MQTT-WebSocket wird vom System nach kurzer Zeit beendet. Realistisch ist ein „best effort"-Observer;
  zuverlässiger Dauerbetrieb ist auf iOS nicht zu erwarten. Vor jeder Zusage mit TestFlight messen.
- Offline-Puffer (`outbox` in IndexedDB) bleibt die Antwort auf Lücken; bei nativer Variante in SQLite.

## Offene Entscheidungen
1. Observer nativ duplizieren vs. Headless-WebView – Aufwand vs. Wartung.
2. Play-Store-Veröffentlichung (Foreground-Service-Deklaration) vs. nur APK/F-Droid.
3. iOS überhaupt anbieten, oder bei Bluefy bleiben.

## Nicht jetzt
Kein Code. Voraussetzung ist ein bestätigter Gerätetest der PWA (siehe `docs/geraetetest.md`).
