# Sicherheit

## Sicherheitslücke melden

Bitte **nicht** als öffentliches Issue. Nutze auf GitHub „Security → Report a vulnerability" (private Meldung an die Maintainer). Beschreibe, was du gefunden hast und wie man es nachstellt – ohne echte Zugangsdaten oder Schlüssel.

## Was für uns sicherheitsrelevant ist

- **Nicht vertrauenswürdige Funkdaten:** Namen, Nachrichten und Kanalbezeichnungen kommen von beliebigen Teilnehmern. Sie dürfen nie als HTML oder Skript interpretiert werden.
- **Zugangsdaten:** Das MQTT-Passwort des Observers liegt im Klartext in der IndexedDB des Browsers. Das ist bekannt und dokumentiert; es schützt nicht vor Menschen mit Zugriff auf das Gerät.
- **Kanalschlüssel:** Werden lokal gespeichert und im Tüftler-Modus angezeigt. Private Schlüssel nie in Issues oder Logs posten (`CHANNEL_INFO`-Frames enthalten sie im Klartext).
- **Standort:** Handy-Standort wird nur mit ausdrücklicher Zustimmung und nur an den eingestellten Broker gesendet.

## Nicht im Umfang

Schwächen des MeshCore-Protokolls oder der Firmware selbst (z. B. dass Hashtag-Kanäle nicht privat sind) bitte an das [MeshCore-Projekt](https://github.com/meshcore-dev/MeshCore) melden.
