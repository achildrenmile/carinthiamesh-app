import { toHex } from './reader'

/** Mesh-Paket auf der Funkstrecke (Packet.cpp readFrom/writeTo). */
export interface MeshPacket {
  routeType: number          // 0 transport-flood, 1 flood, 2 direct, 3 transport-direct
  payloadType: number        // 0..15 (0x04 = Advert, 0x05 = Gruppentext, ...)
  version: number
  transportCodes?: [number, number]
  hashSize: number           // Bytes pro Hop im Pfad (1..3)
  hopCount: number
  path: Uint8Array
  payload: Uint8Array
}

export const isFlood = (p: MeshPacket) => p.routeType === 0 || p.routeType === 1
export const PAYLOAD_TYPE_TRACE = 0x09

/** Gibt null zurück, wenn das Paket nicht dem Wire-Format entspricht (statt zu raten). */
export function decodePacket(raw: Uint8Array): MeshPacket | null {
  if (raw.length < 3) return null
  let i = 0
  const header = raw[i++]!
  const routeType = header & 3
  let transportCodes: [number, number] | undefined
  if (routeType === 0 || routeType === 3) {
    if (raw.length < 5) return null
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
    transportCodes = [dv.getUint16(i, true), dv.getUint16(i + 2, true)]
    i += 4
  }
  const pathLenByte = raw[i++]!
  const hopCount = pathLenByte & 63
  const hashSize = (pathLenByte >> 6) + 1
  if (hashSize === 4 || hopCount * hashSize > 64) return null
  const pathBytes = hopCount * hashSize
  if (i + pathBytes >= raw.length) return null // Firmware verlangt mind. 1 Byte Payload
  return {
    routeType, payloadType: (header >> 2) & 15, version: (header >> 6) & 3, transportCodes,
    hashSize, hopCount, path: raw.slice(i, i + pathBytes), payload: raw.slice(i + pathBytes),
  }
}

/** Paket-Hash wie Packet::calculatePacketHash: SHA-256 über Typ [+ Pfadlänge bei TRACE] + Payload, erste 8 Byte. */
export async function packetHash(raw: Uint8Array, p: MeshPacket): Promise<string> {
  const pathLenByte = (p.hashSize - 1) << 6 | p.hopCount
  const head = p.payloadType === PAYLOAD_TYPE_TRACE ? [p.payloadType, pathLenByte] : [p.payloadType]
  const buf = new Uint8Array(head.length + p.payload.length)
  buf.set(head); buf.set(p.payload, head.length)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
  return toHex(digest.slice(0, 8)).toUpperCase()
}
