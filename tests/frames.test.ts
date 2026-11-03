import { describe, expect, it } from 'vitest'
import { parseLpp } from '../src/protocol/cayenne'
import { appStart, setDeviceTime, telemetryReq } from '../src/protocol/commands'
import { isPush, parseFrame } from '../src/protocol/frames'

// HINWEIS: Alle Frames hier sind SYNTHETISCH – byteweise nach dem Layout in
// examples/companion_radio/MyMesh.cpp (FW-Ver 14) gebaut, nicht vom Gerät aufgezeichnet.
// Sobald echte Frames vorliegen (Spike-Log), hier als Fixtures ergänzen.
const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]
const pad = (s: string, n: number) => { const b = new Uint8Array(n); b.set(new TextEncoder().encode(s)); return [...b] }

describe('Befehle', () => {
  it('APP_START: Code, 7 reservierte Bytes, Name', () => {
    const f = appStart('abc')
    expect([...f.slice(0, 8)]).toEqual([1, 0, 0, 0, 0, 0, 0, 0])
    expect(new TextDecoder().decode(f.slice(8))).toBe('abc')
    expect(f.length).toBeGreaterThanOrEqual(8) // Firmware: len >= 8
  })
  it('SET_DEVICE_TIME little-endian', () => {
    expect([...setDeviceTime(0x01020304)]).toEqual([6, 4, 3, 2, 1])
  })
  it('Telemetrie-Request: 3 reservierte Bytes vor dem Pubkey', () => {
    const f = telemetryReq(new Uint8Array(32).fill(7))
    expect(f.length).toBe(36)
    expect([...f.slice(0, 4)]).toEqual([39, 0, 0, 0])
  })
})

describe('Antworten', () => {
  it('LOG_RX_DATA: SNR×4 (signed), RSSI (signed), Rohbytes', () => {
    const f = parseFrame(Uint8Array.from([0x88, 0xf6 /* -10 -> -2.5 dB */, 0xb0 /* -80 */, 1, 2, 3]))
    expect(f).toEqual({ kind: 'logRx', data: { snr: -2.5, rssi: -80, raw: Uint8Array.from([1, 2, 3]) } })
  })
  it('Pushes erkennt man am High-Bit', () => {
    expect(isPush(Uint8Array.of(0x88))).toBe(true)
    expect(isPush(Uint8Array.of(0x05))).toBe(false)
  })
  it('SELF_INFO', () => {
    const lat = -1_000_000 // Vorzeichen prüfen
    const bytes = Uint8Array.from([
      5, 1, 20, 22, ...new Array(32).fill(0xaa), ...u32(lat), ...u32(14_300_000), 1, 0, 0x15, 0,
      ...u32(869_618), ...u32(62_500), 8, 8, ...new TextEncoder().encode('AT-KL-Test'),
    ])
    const f = parseFrame(bytes)
    if (f.kind !== 'selfInfo') throw new Error('falscher Typ')
    expect(f.info).toMatchObject({ txPowerDbm: 20, maxTxPowerDbm: 22, lat: -1, lon: 14.3, freqMHz: 869.618, bwKHz: 62.5, sf: 8, cr: 8, name: 'AT-KL-Test', telemetryMode: 0x15 })
  })
  it('DEVICE_INFO v14', () => {
    const f = parseFrame(Uint8Array.from([13, 14, 50, 8, ...u32(123456), ...pad('01 Jan 2026', 12), ...pad('Heltec V3', 40), ...pad('v1.2.3', 20), 0, 1]))
    if (f.kind !== 'deviceInfo') throw new Error('falscher Typ')
    expect(f.info).toMatchObject({ fwVer: 14, maxContacts: 100, maxChannels: 8, blePin: 123456, model: 'Heltec V3', version: 'v1.2.3', repeat: false, pathHashMode: 1 })
  })
  it('DEVICE_INFO v2 (alt) hat nur fwVer', () => {
    expect(parseFrame(Uint8Array.of(13, 2))).toEqual({ kind: 'deviceInfo', info: { fwVer: 2 } })
  })
  it('CONTACT', () => {
    const f = parseFrame(Uint8Array.from([3, ...new Array(32).fill(1), 2, 0, 3, ...new Array(64).fill(0), ...pad('AT-VK-Gerlitzen', 32), ...u32(1700000000), ...u32(46_600_000), ...u32(13_900_000), ...u32(1700000001)]))
    if (f.kind !== 'contact') throw new Error('falscher Typ')
    expect(f.contact).toMatchObject({ type: 2, outPathLen: 3, name: 'AT-VK-Gerlitzen', lat: 46.6, lon: 13.9, lastAdvert: 1700000000 })
  })
  it('CHANNEL_INFO', () => {
    const f = parseFrame(Uint8Array.from([18, 0, ...pad('Public', 32), ...new Array(16).fill(9)]))
    if (f.kind !== 'channelInfo') throw new Error('falscher Typ')
    expect(f.channel).toMatchObject({ index: 0, name: 'Public' })
  })
  it('TELEMETRY-Push trennt Pubkey-Präfix und LPP', () => {
    const f = parseFrame(Uint8Array.from([0x8b, 0, 1, 2, 3, 4, 5, 6, 1, 116, 0x01, 0xa4]))
    if (f.kind !== 'telemetry') throw new Error('falscher Typ')
    expect([...f.data.pubKeyPrefix]).toEqual([1, 2, 3, 4, 5, 6])
    expect([...f.data.lpp]).toEqual([1, 116, 1, 164])
  })
  it('zu kurze Frames werfen statt Müll zu liefern', () => {
    expect(() => parseFrame(Uint8Array.of(5, 1, 2))).toThrow(RangeError)
  })
  it('unbekannter Code bleibt erhalten', () => {
    expect(parseFrame(Uint8Array.of(0x99, 1, 2))).toMatchObject({ kind: 'unknown', code: 0x99 })
  })
})

describe('CayenneLPP (Big-Endian)', () => {
  it('Spannung + Temperatur', () => {
    const { values, unparsedTail } = parseLpp(Uint8Array.from([1, 116, 0x01, 0xa4 /* 4.20 V */, 1, 103, 0xff, 0x9c /* -10.0 °C */]))
    expect(values.map(v => [v.name, v.value])).toEqual([['voltage', 4.2], ['temperature', -10]])
    expect(unparsedTail.length).toBe(0)
  })
  it('GPS mit negativem Wert', () => {
    const { values } = parseLpp(Uint8Array.from([1, 136, 0xff, 0xff, 0xf6 /* -0.001 */, 0x00, 0x27, 0x10, 0x00, 0x00, 0x64]))
    expect(values[0]?.value).toEqual([-0.001, 1, 1])
  })
  it('unbekannter Typ stoppt, Gelesenes bleibt, Rest wird gemeldet', () => {
    const { values, unparsedTail } = parseLpp(Uint8Array.from([1, 116, 0x01, 0xa4, 2, 200, 9, 9]))
    expect(values).toHaveLength(1)
    expect([...unparsedTail]).toEqual([2, 200, 9, 9])
  })
})

import { setOtherParams, setPathHashMode, setRadioParams } from '../src/protocol/commands'
describe('Einstell-Befehle', () => {
  it('SET_RADIO_PARAMS: kHz bzw. Hz als u32 LE (869,618 MHz / 62,5 kHz / SF8 / CR8)', () => {
    expect([...setRadioParams(869.618, 62.5, 8, 8)]).toEqual([11, ...u32(869618), ...u32(62500), 8, 8])
  })
  it('Path-Hash-Mode und Other-Params', () => {
    expect([...setPathHashMode(1)]).toEqual([61, 0, 1])
    expect([...setOtherParams(0, 0x15, 2, 1)]).toEqual([38, 0, 0x15, 2, 1])
  })
})
