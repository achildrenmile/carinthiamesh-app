// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildPacketUplink, packetTopic } from '../src/observer/format'
import { decodePacket, packetHash } from '../src/protocol/packet'

// Synthetische Pakete nach Packet.cpp::writeTo (nicht vom Funk aufgezeichnet).
const flood = Uint8Array.from([0x15 /* flood, GRP_TXT(5) */, 0x02, 0xaa, 0xbb, 1, 2, 3, 4])
describe('decodePacket', () => {
  it('Flood-Paket mit 2 Hops à 1 Byte', () => {
    const p = decodePacket(flood)!
    expect(p).toMatchObject({ routeType: 1, payloadType: 5, hopCount: 2, hashSize: 1 })
    expect([...p.path]).toEqual([0xaa, 0xbb]); expect([...p.payload]).toEqual([1, 2, 3, 4])
  })
  it('Transport-Codes werden übersprungen', () => {
    const p = decodePacket(Uint8Array.from([0x10, 1, 0, 2, 0, 0x00, 9]))!
    expect(p.transportCodes).toEqual([1, 2]); expect([...p.payload]).toEqual([9])
  })
  it('Hash-Größe 2 Byte', () => {
    expect(decodePacket(Uint8Array.from([0x11, 0x41, 1, 2, 7]))).toMatchObject({ hashSize: 2, hopCount: 1 })
  })
  it('lehnt reservierte Hashgröße, fehlenden Payload und Zu-kurz ab', () => {
    expect(decodePacket(Uint8Array.from([0x11, 0xc1, 1, 2, 3, 4, 5]))).toBeNull()
    expect(decodePacket(Uint8Array.from([0x11, 0x01, 1]))).toBeNull()
    expect(decodePacket(Uint8Array.from([0x11]))).toBeNull()
  })
  it('Hash ist stabil, 16 Hex-Zeichen, pfadunabhängig', async () => {
    const a = await packetHash(flood, decodePacket(flood)!)
    const other = Uint8Array.from([0x15, 0x01, 0xcc, 1, 2, 3, 4])
    expect(a).toMatch(/^[0-9A-F]{16}$/)
    expect(await packetHash(other, decodePacket(other)!)).toBe(a)
  })
})
describe('Uplink', () => {
  it('liefert das meshcoretomqtt-Schema', async () => {
    const at = new Date(2026, 2, 16, 0, 7, 9)
    const u = await buildPacketUplink({ snr: 12.5, rssi: -48, raw: flood }, { name: 'Handy', publicKeyHex: 'ab'.repeat(32) }, at, { lat: 46.6, lon: 13.85 })
    expect(u).toMatchObject({ origin: 'Handy', type: 'PACKET', direction: 'rx', time: '00:07:09', date: '16/3/2026', len: '8', packet_type: '5', route: 'F', payload_len: '4', SNR: '12.5', RSSI: '-48', path: 'AA -> BB', lat: '46.60000' })
    expect(u!.raw).toBe('1502AABB01020304')
  })
  it('kaputtes Paket => null', async () => {
    expect(await buildPacketUplink({ snr: 0, rssi: 0, raw: Uint8Array.of(1) }, { name: 'x', publicKeyHex: '00' }, new Date())).toBeNull()
  })
  it('Topic', () => expect(packetTopic('klu', 'ab')).toBe('meshcore/KLU/AB/packets'))
})
