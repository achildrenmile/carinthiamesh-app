/**
 * Austauschbarer Transport. Ein Frame = ein Companion-Protokoll-Frame (ohne Serial-Header).
 * Web Bluetooth liefert Frames direkt pro Notification; Web Serial / Capacitor-BLE
 * implementieren dasselbe Interface (Serial rahmt zusätzlich mit '<' / '>' + Länge).
 */
export interface Transport {
  readonly kind: 'web-bluetooth' | 'web-serial' | 'capacitor-ble'
  connect(): Promise<void>
  disconnect(): Promise<void>
  /** Sendet genau einen Frame. Aufrufer serialisiert (siehe Client). */
  send(frame: Uint8Array): Promise<void>
  onFrame(cb: (frame: Uint8Array) => void): void
  onDisconnect(cb: () => void): void
  /** Optional: Verbindungsschritte für die Fehlersuche. */
  log?: (msg: string) => void
}
