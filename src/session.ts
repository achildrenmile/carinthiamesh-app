import { signal } from '@preact/signals'
import { Client } from './client'
import { db, type ContactRow } from './data/db'
import { observer, telemetryIntervalSec } from './data/settings'
import type { Observer } from './observer/observer'
import { parseLpp } from './protocol/cayenne'
import type { DeviceInfo, Frame, SelfInfo, TelemetryPush } from './protocol/frames'
import { toHex } from './protocol/reader'
import { WebBluetoothTransport } from './transport/webBluetooth'
import type { Transport } from './transport/transport'

export type ConnState = 'idle' | 'connecting' | 'ready' | 'lost'
export const connState = signal<ConnState>('idle')
export const connError = signal('')
export const selfInfo = signal<SelfInfo | null>(null)
export const deviceInfo = signal<DeviceInfo | null>(null)
export const battery = signal<number | null>(null)
export const rxLogCount = signal(0)
export const lastRx = signal<{ snr: number; rssi: number; len: number; at: number } | null>(null)
export const rawLog = signal<string[]>([])
export const RAW_LOG_MAX = 300

let client: Client | null = null
let transport: Transport | null = null
let obs: Observer | null = null
let telemetryTimer: number | undefined
const telemetryWaiters = new Map<string, (t: TelemetryPush) => void>()

export const hex12 = (b: Uint8Array) => toHex(b.slice(0, 6))
const pushRaw = (line: string) => { rawLog.value = [...rawLog.value.slice(-(RAW_LOG_MAX - 1)), line] }

export function getClient(): Client {
  if (!client || connState.value !== 'ready') throw new Error('Nicht mit einem Gerät verbunden')
  return client
}

/** Prüfen, ob dieser Browser Web Bluetooth kann; sonst Hinweis (iOS -> Bluefy). */
export function browserSupport(): { ok: true } | { ok: false; reason: 'ios' | 'other' } {
  if (WebBluetoothTransport.isSupported()) return { ok: true }
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return { ok: false, reason: ios ? 'ios' : 'other' }
}

export async function connect(t: Transport = new WebBluetoothTransport()) {
  connError.value = ''
  connState.value = 'connecting'
  try {
    await t.connect()
    transport = t
    t.onDisconnect(() => void onLost())
    client = new Client(t)
    client.onRaw = (dir, b) => pushRaw(`${new Date().toISOString().slice(11, 23)} ${dir === 'tx' ? '→' : '←'} ${toHex(b)}`)
    client.onPush(f => void onPush(f))
    const { self, device } = await client.start()
    selfInfo.value = self
    deviceInfo.value = device
    connState.value = 'ready'
    // Zeit nur vorwärts: "device-ahead" ist kein Fehler.
    await client.syncTime().catch(() => undefined)
    await refreshContacts()
    await refreshChannels()
    await drainMessages()
    void refreshBattery()
    void startObserverIfEnabled()
    restartTelemetryTimer()
  } catch (e) {
    connError.value = e instanceof Error ? e.message : String(e)
    connState.value = 'idle'
    await t.disconnect().catch(() => undefined)
    throw e
  }
}

export async function disconnect() {
  await stopObserver()
  clearInterval(telemetryTimer)
  await transport?.disconnect().catch(() => undefined)
  client = null; transport = null
  connState.value = 'idle'
}

async function onLost() {
  clearInterval(telemetryTimer)
  await stopObserver()
  client = null
  if (connState.value !== 'idle') connState.value = 'lost'
}

export async function refreshBattery() {
  try { const f = await getClient().batteryMv(); battery.value = f } catch { /* optional */ }
}

export async function refreshContacts() {
  const list = await getClient().contacts()
  await db.transaction('rw', db.contacts, async () => {
    await db.contacts.clear()
    await db.contacts.bulkPut(list.map<ContactRow>(c => ({
      key: toHex(c.publicKey), name: c.name, type: c.type, flags: c.flags, outPathLen: c.outPathLen,
      lat: c.lat, lon: c.lon, lastAdvert: c.lastAdvert })))
  })
}

export async function refreshChannels() {
  const list = await getClient().channels(deviceInfo.value?.maxChannels ?? 1)
  await db.transaction('rw', db.channels, async () => {
    await db.channels.clear()
    await db.channels.bulkPut(list.filter(c => c.name).map(c => ({ index: c.index, name: c.name, secretHex: toHex(c.secret) })))
  })
}

/** Holt alle wartenden Nachrichten vom Gerät. Läuft nie doppelt. */
let draining = false
export async function drainMessages() {
  if (draining) return
  draining = true
  try {
    for (let i = 0; i < 500; i++) {
      const m = await getClient().nextMessage()
      if (!m) break
      if (m.kind === 'channel') {
        const sep = m.msg.text.indexOf(': ')
        const sender = sep > 0 && sep < 40 ? m.msg.text.slice(0, sep) : undefined
        await db.messages.add({ scope: `ch:${m.msg.channelIdx}`, outgoing: false, sender,
          text: sender ? m.msg.text.slice(sep + 2) : m.msg.text, ts: m.msg.timestamp, receivedAt: Date.now(),
          snr: m.msg.snr, pathLen: m.msg.pathLen })
      } else {
        const prefix = toHex(m.msg.senderPrefix)
        await db.messages.add({ scope: `dm:${prefix}`, outgoing: false, text: m.msg.text, ts: m.msg.timestamp,
          receivedAt: Date.now(), snr: m.msg.snr, pathLen: m.msg.pathLen })
      }
    }
  } finally { draining = false }
}

async function onPush(f: Frame) {
  switch (f.kind) {
    case 'msgWaiting': await drainMessages().catch(() => undefined); break
    case 'advert': await refreshContacts().catch(() => undefined); break
    case 'sendConfirmed': {
      const row = await db.messages.where({ ackTag: f.ack }).first().catch(() => undefined)
      if (row?.id != null) await db.messages.update(row.id, { status: 'acked' })
      break
    }
    case 'logRx':
      rxLogCount.value++
      lastRx.value = { snr: f.data.snr, rssi: f.data.rssi, len: f.data.raw.length, at: Date.now() }
      void obs?.handleRx(f.data)
      break
    case 'telemetry': await storeTelemetry(f.data); break
    default: pushRaw(`push ${f.kind}`)
  }
}

export async function sendChannelMessage(idx: number, text: string) {
  const id = await db.messages.add({ scope: `ch:${idx}`, outgoing: true, text, ts: Math.floor(Date.now() / 1000), receivedAt: Date.now(), status: 'sending' })
  try { await getClient().sendChannelMessage(idx, text); await db.messages.update(id, { status: 'sent' }) }
  catch (e) { await db.messages.update(id, { status: 'failed' }); throw e }
}

export async function sendDirectMessage(contactKey: string, text: string) {
  const id = await db.messages.add({ scope: `dm:${contactKey.slice(0, 12)}`, outgoing: true, text, ts: Math.floor(Date.now() / 1000), receivedAt: Date.now(), status: 'sending' })
  try {
    const f = await getClient().sendDirectMessage(Uint8Array.from(contactKey.match(/../g)!, h => parseInt(h, 16)), text)
    await db.messages.update(id, { status: 'sent', ackTag: f.kind === 'sent' ? f.sent.tag : undefined })
  } catch (e) { await db.messages.update(id, { status: 'failed' }); throw e }
}

/* ---------- Telemetrie ---------- */

async function storeTelemetry(t: TelemetryPush) {
  const prefix = toHex(t.pubKeyPrefix)
  const { values } = parseLpp(t.lpp)
  await db.telemetry.add({ prefix, ts: Date.now(), values })
  telemetryWaiters.get(prefix)?.(t)
}

/** Fragt Telemetrie eines Kontakts ab und wartet auf den asynchronen Push. Es ist immer nur eine Anfrage gleichzeitig offen. */
let telemetryBusy: Promise<unknown> = Promise.resolve()
export function fetchTelemetry(contactKey: string): Promise<void> {
  const run = async () => {
    const prefix = contactKey.slice(0, 12)
    const sent = await getClient().requestTelemetry(Uint8Array.from(contactKey.match(/../g)!, h => parseInt(h, 16)))
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { telemetryWaiters.delete(prefix); reject(new Error('Keine Antwort vom Gerät')) },
        Math.max(sent.timeoutMs * 2, 15_000))
      telemetryWaiters.set(prefix, () => { clearTimeout(timer); telemetryWaiters.delete(prefix); resolve() })
    })
  }
  const next = telemetryBusy.then(run, run)
  telemetryBusy = next.catch(() => {})
  return next
}

export function restartTelemetryTimer() {
  clearInterval(telemetryTimer)
  const s = telemetryIntervalSec.value
  if (!s) return
  telemetryTimer = window.setInterval(async () => {
    if (connState.value !== 'ready') return
    const watch = (await db.kv.get('telemetryWatch'))?.value as string[] | undefined
    for (const key of watch ?? []) await fetchTelemetry(key).catch(() => undefined)
  }, s * 1000)
}

/* ---------- Observer ---------- */

export async function startObserverIfEnabled() {
  const cfg = observer.value
  const self = selfInfo.value
  if (!cfg.enabled || !self) return
  await stopObserver()
  const { Observer } = await import('./observer/observer') // mqtt.js nur laden, wenn gebraucht
  obs = new Observer(cfg, {
    name: self.name, publicKeyHex: toHex(self.publicKey), firmware: deviceInfo.value?.version,
    radio: `${self.freqMHz},${self.bwKHz},${self.sf},${self.cr}`,
  })
  obs.start()
}
export async function stopObserver() { const o = obs; obs = null; await o?.stop() }
