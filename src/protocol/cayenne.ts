import { Reader } from './reader'

export interface LppValue { channel: number; type: number; name: string; value: number | number[] }

const i24 = (v: DataView, o: number) => ((v.getUint8(o) << 16) | (v.getUint8(o + 1) << 8) | v.getUint8(o + 2)) << 8 >> 8

// Big-Endian (anders als der Rest des Protokolls). Typen laut CayenneLPP / MeshCore-Sensorcode.
const TYPES: Record<number, { name: string; size: number; read: (r: DataView) => number | number[] }> = {
  0: { name: 'digital_in', size: 1, read: v => v.getUint8(0) },
  1: { name: 'digital_out', size: 1, read: v => v.getUint8(0) },
  2: { name: 'analog_in', size: 2, read: v => v.getInt16(0) / 100 },
  3: { name: 'analog_out', size: 2, read: v => v.getInt16(0) / 100 },
  101: { name: 'luminosity', size: 2, read: v => v.getUint16(0) },
  102: { name: 'presence', size: 1, read: v => v.getUint8(0) },
  103: { name: 'temperature', size: 2, read: v => v.getInt16(0) / 10 },
  104: { name: 'humidity', size: 1, read: v => v.getUint8(0) / 2 },
  115: { name: 'pressure', size: 2, read: v => v.getUint16(0) / 10 },
  116: { name: 'voltage', size: 2, read: v => v.getInt16(0) / 100 },
  117: { name: 'current', size: 2, read: v => v.getUint16(0) / 1000 },
  118: { name: 'frequency', size: 4, read: v => v.getUint32(0) },
  120: { name: 'percentage', size: 1, read: v => v.getUint8(0) },
  121: { name: 'altitude', size: 2, read: v => v.getInt16(0) },
  113: { name: 'accelerometer', size: 6, read: v => [v.getInt16(0) / 1000, v.getInt16(2) / 1000, v.getInt16(4) / 1000] },
  136: { name: 'gps', size: 9, read: v => [i24(v, 0) / 10000, i24(v, 3) / 10000, i24(v, 6) / 100] },
}

/** Zerlegt einen LPP-Puffer. Unbekannter Typ => Abbruch; bereits Gelesenes bleibt erhalten. */
export function parseLpp(bytes: Uint8Array): { values: LppValue[]; unparsedTail: Uint8Array } {
  const r = new Reader(bytes)
  const values: LppValue[] = []
  while (r.remaining >= 2) {
    const start = r.pos
    const channel = r.u8()
    const type = r.u8()
    if (channel === 0 && type === 0) break // Füllbytes am Ende
    const def = TYPES[type]
    if (!def || r.remaining < def.size) { r.pos = start; break }
    const raw = r.take(def.size)
    values.push({ channel, type, name: def.name, value: def.read(new DataView(raw.buffer)) })
  }
  return { values, unparsedTail: bytes.slice(r.pos) }
}
