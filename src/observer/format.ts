import { type MeshPacket, decodePacket, isFlood, packetHash } from '../protocol/packet'
import { toHex } from '../protocol/reader'

/**
 * Uplink-Payload im Format von meshcoretomqtt (alle Werte als Strings).
 * Quelle der Feldnamen: README meshcoretomqtt/Observer-Stack; Feldbedeutungen teils abgeleitet –
 * siehe docs/observer-format.md. Die App trägt zusätzlich optional `lat`/`lon` des Handys ein.
 */
export interface PacketUplink {
  origin: string; origin_id: string; timestamp: string; type: 'PACKET'; direction: 'rx'
  time: string; date: string; len: string; packet_type: string; route: 'F' | 'D'
  payload_len: string; raw: string; SNR: string; RSSI: string; score: string; hash: string
  path?: string; lat?: string; lon?: string
}

export interface RxLog { snr: number; rssi: number; raw: Uint8Array }

const pad = (n: number) => String(n).padStart(2, '0')

export async function buildPacketUplink(
  rx: RxLog, node: { name: string; publicKeyHex: string }, at: Date, pos?: { lat: number; lon: number },
): Promise<PacketUplink | null> {
  const p: MeshPacket | null = decodePacket(rx.raw)
  if (!p) return null // kaputte Pakete nicht hochladen
  const out: PacketUplink = {
    origin: node.name,
    origin_id: node.publicKeyHex.toUpperCase(),
    timestamp: at.toISOString().replace('Z', ''),
    type: 'PACKET', direction: 'rx',
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`,
    date: `${at.getDate()}/${at.getMonth() + 1}/${at.getFullYear()}`,
    len: String(rx.raw.length),
    packet_type: String(p.payloadType),
    route: isFlood(p) ? 'F' : 'D',
    payload_len: String(p.payload.length),
    raw: toHex(rx.raw).toUpperCase(),
    SNR: String(rx.snr), RSSI: String(rx.rssi),
    score: '1000',
    hash: await packetHash(rx.raw, p),
  }
  if (p.hopCount) out.path = Array.from({ length: p.hopCount }, (_, i) =>
    toHex(p.path.slice(i * p.hashSize, (i + 1) * p.hashSize)).toUpperCase()).join(' -> ')
  if (pos) { out.lat = pos.lat.toFixed(5); out.lon = pos.lon.toFixed(5) }
  return out
}

export const packetTopic = (iata: string, pubKeyHex: string) => `meshcore/${iata.toUpperCase()}/${pubKeyHex.toUpperCase()}/packets`
export const statusTopic = (iata: string, pubKeyHex: string) => `meshcore/${iata.toUpperCase()}/${pubKeyHex.toUpperCase()}/status`
