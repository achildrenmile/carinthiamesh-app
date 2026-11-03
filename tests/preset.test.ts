// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { channelSecret, hexToBytes, radioComplete } from '../src/data/preset'
import { toHex } from '../src/protocol/reader'

describe('Preset', () => {
  it('Hashtag-Kanal: Testvektor aus companion_protocol.md (#test)', async () => {
    expect(toHex(await channelSecret({ name: '#test', hashtag: true }))).toBe('9cd8fcf22a47333b591d96a2b848b73f')
  })
  it('Hex-Schlüssel muss 16 Byte haben', async () => {
    await expect(channelSecret({ name: 'x', secretHex: 'aabb' })).rejects.toThrow(/16 Byte/)
    expect(hexToBytes('aa BB')).toEqual(Uint8Array.of(0xaa, 0xbb))
    expect(() => hexToBytes('zz')).toThrow()
  })
  it('Funk-Preset mit null-Werten gilt als unvollständig', () => {
    expect(radioComplete({ freqMHz: null, bwKHz: null, sf: null, cr: null, txPowerDbm: null })).toBe(false)
    expect(radioComplete({ freqMHz: 869.6, bwKHz: 62.5, sf: 8, cr: 8, txPowerDbm: null })).toBe(true)
  })
})
