import type { LppValue } from '../protocol/cayenne'
import type { TelemetryRow } from './db'

export interface Series { key: string; label: string; unit: string; points: Array<{ ts: number; v: number }> }

const UNITS: Record<string, string> = { voltage: 'V', temperature: '°C', humidity: '%', pressure: 'hPa', percentage: '%', current: 'A', luminosity: 'lx', altitude: 'm' }

/** Zerlegt Telemetrie-Zeilen in Zeitreihen je (Kanal, Typ). Mehrkomponentige Werte (GPS, Beschleunigung) werden übersprungen. */
export function toSeries(rows: TelemetryRow[]): Series[] {
  const map = new Map<string, Series>()
  for (const row of [...rows].sort((a, b) => a.ts - b.ts)) {
    for (const v of row.values) {
      if (typeof v.value !== 'number') continue
      const key = `${v.channel}:${v.name}`
      let s = map.get(key)
      if (!s) { s = { key, label: v.name, unit: UNITS[v.name] ?? '', points: [] }; map.set(key, s) }
      s.points.push({ ts: row.ts, v: v.value })
    }
  }
  return [...map.values()]
}

/** Aktueller Wert und Differenz zum vorherigen Abruf. */
export function latestAndDelta(s: Series): { current: number; delta: number | null } | null {
  const n = s.points.length
  if (!n) return null
  const cur = s.points[n - 1]!.v
  return { current: cur, delta: n > 1 ? Math.round((cur - s.points[n - 2]!.v) * 1000) / 1000 : null }
}

/** SVG-Polylinie für eine Mini-Grafik. Konstante Reihe => Mittellinie. */
export function sparklinePoints(points: Array<{ v: number }>, w = 120, h = 28): string {
  if (points.length < 2) return ''
  const vs = points.map(p => p.v), min = Math.min(...vs), max = Math.max(...vs)
  const y = (v: number) => (max === min ? h / 2 : h - 2 - ((v - min) / (max - min)) * (h - 4))
  return points.map((p, i) => `${((i / (points.length - 1)) * w).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
}

const csvCell = (x: string | number) => /[",\n;]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x)

/** Eine Zeile pro Messwert (lang-Format): Zeit ISO, Knoten, Kanal, Typ, Wert, Einheit. */
export function toCsv(rows: TelemetryRow[], nameOf: (prefix: string) => string): string {
  const out = ['timestamp,node,prefix,channel,type,value,unit']
  for (const r of [...rows].sort((a, b) => a.ts - b.ts)) {
    for (const v of r.values) {
      const val = Array.isArray(v.value) ? v.value.join(' ') : v.value
      out.push([new Date(r.ts).toISOString(), nameOf(r.prefix), r.prefix, v.channel, v.name, val, UNITS[v.name] ?? ''].map(csvCell).join(','))
    }
  }
  return out.join('\n') + '\n'
}
export const toJson = (rows: TelemetryRow[]) => JSON.stringify(rows.map(r => ({ ...r, iso: new Date(r.ts).toISOString() })), null, 2)
export type { LppValue }
