import { describe, expect, it } from 'vitest'
import { latestAndDelta, sparklinePoints, toCsv, toSeries } from '../src/data/telemetry'

const rows = [
  { prefix: 'aabbccddeeff', ts: 2000, values: [{ channel: 1, type: 116, name: 'voltage', value: 3.9 }, { channel: 1, type: 136, name: 'gps', value: [1, 2, 3] }] },
  { prefix: 'aabbccddeeff', ts: 1000, values: [{ channel: 1, type: 116, name: 'voltage', value: 4.0 }] },
]
describe('Telemetrie', () => {
  it('sortiert nach Zeit, überspringt Vektorwerte, liefert Delta', () => {
    const s = toSeries(rows)
    expect(s).toHaveLength(1)
    expect(s[0]!.points.map(p => p.v)).toEqual([4.0, 3.9])
    expect(latestAndDelta(s[0]!)).toEqual({ current: 3.9, delta: -0.1 })
  })
  it('erster Abruf hat kein Delta', () => {
    expect(latestAndDelta({ key: 'k', label: 'x', unit: '', points: [{ ts: 1, v: 5 }] })).toEqual({ current: 5, delta: null })
  })
  it('Sparkline braucht >= 2 Punkte; konstante Reihe bleibt im Rahmen', () => {
    expect(sparklinePoints([{ v: 1 }])).toBe('')
    const pts = sparklinePoints([{ v: 3 }, { v: 3 }, { v: 3 }]).split(' ').map(p => Number(p.split(',')[1]))
    expect(pts.every(y => y >= 0 && y <= 28)).toBe(true)
  })
  it('CSV: Kopfzeile, Escaping, Vektorwerte', () => {
    const csv = toCsv(rows, () => 'AT-KL, "Test"')
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('timestamp,node,prefix,channel,type,value,unit')
    expect(lines[1]).toBe('1970-01-01T00:00:01.000Z,"AT-KL, ""Test""",aabbccddeeff,1,voltage,4,V')
    expect(lines.some(l => l.includes('gps,1 2 3'))).toBe(true)
  })
})
