# Funktionen

**Status-Legende**
- ✅ **getestet**: automatisierte Tests laufen (Parser, Format, Auswertung, UI-Gerüst in jsdom)
- 🔧 **gebaut, am Gerät nicht erprobt**: Code vorhanden, noch nie mit einem echten Companion oder in Bluefy ausgeführt
- ⏳ **geplant**, ❌ **nicht enthalten**

> Bis zum ersten Gerätetest ([geraetetest.md](geraetetest.md)) ist alles, was ein Funkgerät braucht, 🔧.

## Verbinden

| Funktion | Status |
|---|---|
| Verbindung per Web Bluetooth (Chrome Android/Desktop, Edge, Bluefy) | 🔧 |
| Handshake (App-Start, Geräteinfo), Gerätezeit nur vorwärts setzen | 🔧 (Befehle ✅) |
| Hinweis „Bluefy verwenden" auf iPhone/iPad ohne Web Bluetooth | ✅ |
| Anzeige „Verbindung verloren", Knopf zum erneuten Verbinden | 🔧 |
| Ein Befehl gleichzeitig, Zeitüberschreitung nach 5 s | 🔧 |
| Automatisches Wiederverbinden | ❌ |
| Web Serial (USB) für Desktop | ❌ (Transport-Schnittstelle steht bereit) |

## Einfach-Modus (Standard)

| Funktion | Status |
|---|---|
| Assistent: verbinden → Name → Funk-Preset → Kanäle → fertig | 🔧 |
| Funk-Preset aus Datei ([`at.json`](../public/presets/at.json)), vorbelegt nach Wiki: 869,618 MHz / 62,5 kHz / SF8 / CR8, Path-Hash 2 Byte, Multi-Acks | ✅ (Datei, Befehle) / 🔧 (Anwenden) |
| Standardkanal `#at-ktn` automatisch beitreten (Schlüssel wird berechnet, gegen Wiki-Wert geprüft) | ✅ / 🔧 |
| Nur Chat, Kontakte, Karte und Einstellungen sichtbar | ✅ |
| Große Knöpfe, keine Fachbegriffe, deutsche Texte | ✅ |

## Chat

| Funktion | Status |
|---|---|
| Kanalnachrichten senden und empfangen | 🔧 (Parser ✅) |
| Direktnachrichten an Personen, Status „Wird gesendet / Gesendet / Angekommen / Nicht gesendet" | 🔧 |
| Eingehende Nachrichten automatisch vom Gerät abholen | 🔧 |
| Absender bei Kanalnachrichten getrennt angezeigt, Zeitstempel | 🔧 |
| Zeichenlimit 133 im Eingabefeld | ✅ |
| Nachrichten bleiben lokal gespeichert und offline lesbar (IndexedDB) | ✅ |
| Tüftler: SNR und Hops je Nachricht | 🔧 |
| Nachrichten erneut senden, Benachrichtigungen, Bilder/Anhänge | ❌ |

## Kontakte und Karte

| Funktion | Status |
|---|---|
| Kontaktliste mit Suche, Typ (Person/Repeater/Raum), „zuletzt gehört" | 🔧 |
| „Mich im Netz bekannt machen" (Advert) | 🔧 |
| Karte mit Kontakten und eigener Position (Kärnten als Startansicht, Repeater rot) | 🔧 |
| Kontakte hinzufügen, löschen, importieren/exportieren | ❌ |
| Karte offline | ❌ (Kacheln von openstreetmap.org) |

## Tüftler-Modus

| Funktion | Status |
|---|---|
| Geräteinfo: Modell, Firmware, Protokollversion, Public Key, Akku | 🔧 |
| Gerätename, Funkparameter (Frequenz, Bandbreite, SF, CR), Sendeleistung, Standort setzen | ✅ (Befehle) / 🔧 |
| Advert als Flood oder nur an Nachbarn | 🔧 |
| Kanäle anzeigen und setzen (Schlüssel als Hex oder `#Hashtag` aus dem Namen) | ✅ / 🔧 |
| Rohdaten-Protokoll (gesendete/empfangene Frames als Hex, letzte 300), kopierbar | 🔧 |
| Zähler und letzter Wert empfangener Pakete (SNR, RSSI, Länge) | 🔧 |
| Kontakt: Public Key, Pfadlänge, Flags | 🔧 |
| Repeater-Login mit Passwort, Repeater-Befehle (Antwort im Direkt-Chat) | 🔧 |
| Gerät neu starten | 🔧 |

## Messwerte (Telemetrie)

| Funktion | Status |
|---|---|
| Messwerte von Repeatern/Sensoren abrufen (Antwort asynchron, immer nur eine Anfrage gleichzeitig) | 🔧 |
| Lesen von CayenneLPP: Spannung, Temperatur, Luftfeuchte, Druck, Strom, Helligkeit, Höhe, GPS u. a. | ✅ |
| Jede Antwort mit Zeitstempel gespeichert | ✅ |
| Anzeige: aktueller Wert, Änderung zum letzten Abruf, Mini-Grafik je Messwert | ✅ |
| Regelmäßiger Abruf (5/15/30/60 min) für gewählte Knoten, solange verbunden und Seite offen | 🔧 |
| Export als CSV und JSON | ✅ |
| Große Diagramme, Zeiträume wählen, Warnschwellen | ❌ |

## Mobiler Observer (Tüftler)

| Funktion | Status |
|---|---|
| Empfangene Pakete per MQTT über WebSocket (wss) an einen Broker senden | 🔧 |
| Topic und Payload im Format des CarinthiaMesh-Observers (`meshcore/<IATA>/<PUBKEY>/packets`), Status mit Last-Will | ✅ (Format) / 🔧 |
| Paket-Hash und Pfad aus dem Rohpaket berechnet, defekte Pakete werden verworfen | ✅ |
| Handy-Standort anhängen (nur mit Zustimmung) | 🔧 |
| Offline-Puffer (bis 5000 Pakete), Nachsenden bei Verbindung | 🔧 |
| Anzeige Status, gesendet, gepuffert, verworfen | 🔧 |
| Zugangsdaten nur lokal im Browser, nie im Repo | ✅ |
| Betrieb bei ausgeschaltetem Bildschirm oder im Hintergrund | ❌ (Browser-Grenze, siehe [ADR-002](ADR-002-native.md)) |
| Pakete über 176 Byte | ❌ (liefert die Firmware nicht) |

## Allgemein

| Funktion | Status |
|---|---|
| Installierbare Web-App (PWA) mit Offline-Start | 🔧 |
| Deutsch und Englisch, Umschalter | ✅ |
| Hell/Dunkel nach Systemeinstellung | 🔧 |
| Alle lokalen Daten löschen | 🔧 |
| Hosting über GitHub Pages | ⏳ (Workflow vorhanden, Repo noch nicht veröffentlicht) |
| Native Android-/iOS-App mit Hintergrundbetrieb | ⏳ (nur Konzept) |

## Bewusst nicht enthalten

Firmware flashen, Repeater-Regionen verwalten, Gruppen-Datenkanäle, Sprach-/Bildübertragung. Wenn das Protokoll etwas nicht hergibt, sagen wir es, statt es per Umweg nachzubauen.
