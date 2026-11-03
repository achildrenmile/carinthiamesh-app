import mqtt, { type MqttClient } from 'mqtt'
import { db, enqueueOutbox } from '../data/db'
import type { ObserverSettings } from '../data/settings'
import { observerState, observerStats } from './state'
import { buildPacketUplink, packetTopic, statusTopic, type RxLog } from './format'


interface Node { name: string; publicKeyHex: string; firmware?: string; radio?: string }

/**
 * Mobiler Observer: leitet RX-Log-Pushes des Companions per MQTT-over-WebSocket weiter.
 * Läuft nur, solange die Seite im Vordergrund ist (Browser pausiert BLE/Timer im Hintergrund).
 */
export class Observer {
  private client?: MqttClient
  private pos?: { lat: number; lon: number }
  private watchId?: number
  private flushing = false

  constructor(private cfg: ObserverSettings, private node: Node) {}

  start() {
    const { url, username, password, iata } = this.cfg
    if (!url || !iata) { observerState.value = 'error'; observerStats.value = { ...observerStats.value, lastError: 'URL und IATA-Code fehlen' }; return }
    observerState.value = 'connecting'
    if (this.cfg.withGps && 'geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        p => { this.pos = { lat: p.coords.latitude, lon: p.coords.longitude } },
        e => { observerStats.value = { ...observerStats.value, lastError: `GPS: ${e.message}` } },
        { enableHighAccuracy: false, maximumAge: 30_000 })
    }
    const sTopic = statusTopic(iata, this.node.publicKeyHex)
    this.client = mqtt.connect(url, {
      username: username || undefined, password: password || undefined,
      clientId: `carinthiamesh-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 5000, connectTimeout: 15_000, keepalive: 30,
      will: { topic: sTopic, payload: this.statusPayload('offline'), qos: 1, retain: true },
    })
    this.client.on('connect', () => {
      observerState.value = 'online'
      this.client!.publish(sTopic, this.statusPayload('online'), { qos: 1, retain: true })
      void this.flush()
    })
    this.client.on('close', () => { if (observerState.value !== 'off') observerState.value = 'offline' })
    this.client.on('error', e => { observerState.value = 'error'; observerStats.value = { ...observerStats.value, lastError: e.message } })
  }

  private statusPayload(status: 'online' | 'offline') {
    return JSON.stringify({ status, origin: this.node.name, origin_id: this.node.publicKeyHex.toUpperCase(),
      firmware_version: this.node.firmware, radio: this.node.radio, client_version: 'carinthiamesh-app/0.1' })
  }

  async handleRx(rx: RxLog) {
    const uplink = await buildPacketUplink(rx, this.node, new Date(), this.cfg.withGps ? this.pos : undefined)
    if (!uplink) { observerStats.value = { ...observerStats.value, dropped: observerStats.value.dropped + 1 }; return }
    const topic = packetTopic(this.cfg.iata, this.node.publicKeyHex)
    const payload = JSON.stringify(uplink)
    if (this.client?.connected && !this.flushing) {
      this.client.publish(topic, payload, { qos: 0 }, err => { if (err) void this.buffer(topic, payload) })
      observerStats.value = { ...observerStats.value, sent: observerStats.value.sent + 1 }
    } else await this.buffer(topic, payload)
  }

  private async buffer(topic: string, payload: string) {
    await enqueueOutbox(topic, payload)
    observerStats.value = { ...observerStats.value, buffered: await db.outbox.count() }
  }

  /** Nachsenden in der Reihenfolge der Aufzeichnung; bricht beim ersten Fehler ab. */
  async flush() {
    if (this.flushing || !this.client?.connected) return
    this.flushing = true
    try {
      for (;;) {
        const batch = await db.outbox.orderBy('id').limit(50).toArray()
        if (!batch.length) break
        for (const row of batch) {
          if (!this.client?.connected) return
          await new Promise<void>((res, rej) => this.client!.publish(row.topic, row.payload, { qos: 1 }, e => (e ? rej(e) : res())))
          await db.outbox.delete(row.id!)
          observerStats.value = { ...observerStats.value, sent: observerStats.value.sent + 1 }
        }
      }
    } catch { /* bleibt im Puffer, nächster connect versucht es erneut */ } finally {
      this.flushing = false
      observerStats.value = { ...observerStats.value, buffered: await db.outbox.count() }
    }
  }

  async stop() {
    observerState.value = 'off'
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId)
    const c = this.client
    if (c?.connected) c.publish(statusTopic(this.cfg.iata, this.node.publicKeyHex), this.statusPayload('offline'), { qos: 1, retain: true })
    await new Promise<void>(r => (c ? c.end(false, {}, () => r()) : r()))
  }
}
