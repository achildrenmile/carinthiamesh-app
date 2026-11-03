import Dexie, { type Table } from 'dexie'
import type { LppValue } from '../protocol/cayenne'

export interface MessageRow {
  id?: number
  scope: string               // 'ch:<idx>' oder 'dm:<pubkey-prefix-hex12>'
  outgoing: boolean
  sender?: string             // Name bei Kanalnachrichten ("Name: Text" wird getrennt)
  text: string
  ts: number                  // Unix-Sekunden (Gerätezeit der Nachricht)
  receivedAt: number          // ms, lokal
  snr?: number
  pathLen?: number            // 255 = direkt
  status?: 'sending' | 'sent' | 'failed' | 'acked'
  ackTag?: number
}
export interface ContactRow {
  key: string                 // Public Key hex (64)
  name: string; type: number; flags: number; outPathLen: number
  lat: number; lon: number; lastAdvert: number
}
export interface ChannelRow { index: number; name: string; secretHex: string }
export interface TelemetryRow {
  id?: number
  prefix: string              // 12 Hex-Zeichen
  ts: number                  // ms
  values: LppValue[]
}
export interface OutboxRow { id?: number; topic: string; payload: string; ts: number }
export interface KvRow { key: string; value: unknown }

class AppDb extends Dexie {
  messages!: Table<MessageRow, number>
  contacts!: Table<ContactRow, string>
  channels!: Table<ChannelRow, number>
  telemetry!: Table<TelemetryRow, number>
  outbox!: Table<OutboxRow, number>
  kv!: Table<KvRow, string>
  constructor(name = 'carinthiamesh') {
    super(name)
    this.version(1).stores({
      messages: '++id, scope, ts, ackTag',
      contacts: 'key, name, type',
      channels: 'index',
      telemetry: '++id, [prefix+ts], prefix, ts',
      outbox: '++id, ts',
      kv: 'key',
    })
  }
}
export const db = new AppDb()

export async function getKv<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key)
  return (row?.value as T | undefined) ?? fallback
}
export const setKv = (key: string, value: unknown) => db.kv.put({ key, value })

export const OUTBOX_LIMIT = 5000
/** Offline-Puffer des Observers; ältestes fliegt raus, damit IndexedDB nicht unbegrenzt wächst. */
export async function enqueueOutbox(topic: string, payload: string) {
  await db.outbox.add({ topic, payload, ts: Date.now() })
  const n = await db.outbox.count()
  if (n > OUTBOX_LIMIT) {
    const old = await db.outbox.orderBy('id').limit(n - OUTBOX_LIMIT).primaryKeys()
    await db.outbox.bulkDelete(old)
  }
}
