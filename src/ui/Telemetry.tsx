import { useState } from 'preact/hooks'
import { db } from '../data/db'
import { latestAndDelta, sparklinePoints, toCsv, toJson, toSeries } from '../data/telemetry'
import { saveTelemetryInterval, telemetryIntervalSec } from '../data/settings'
import { t } from '../i18n'
import { fetchTelemetry, restartTelemetryTimer } from '../session'
import { ago } from './format'
import { download, useLive } from './hooks'

const INTERVALS = [0, 300, 900, 1800, 3600]

export function Telemetry() {
  const contacts = useLive(() => db.contacts.filter(c => c.type !== 1).toArray(), [], [])!
  const watch = useLive(async () => ((await db.kv.get('telemetryWatch'))?.value as string[] | undefined) ?? [], [], [])!
  const toggleWatch = async (key: string) => {
    const next = watch.includes(key) ? watch.filter(k => k !== key) : [...watch, key]
    await db.kv.put({ key: 'telemetryWatch', value: next })
  }
  const exportAll = async (kind: 'csv' | 'json') => {
    const rows = await db.telemetry.orderBy('ts').toArray()
    const all = await db.contacts.toArray()
    const nameOf = (p: string) => all.find(c => c.key.startsWith(p))?.name ?? p
    const stamp = new Date().toISOString().slice(0, 10)
    if (kind === 'csv') download(`messwerte-${stamp}.csv`, 'text/csv', toCsv(rows, nameOf))
    else download(`messwerte-${stamp}.json`, 'application/json', toJson(rows))
  }
  return <>
    <h2>{t('tel_title')}</h2>
    <label>{t('tel_interval')}</label>
    <select value={telemetryIntervalSec.value} onChange={async e => { await saveTelemetryInterval(Number((e.target as HTMLSelectElement).value)); restartTelemetryTimer() }}>
      {INTERVALS.map(s => <option value={s}>{s === 0 ? t('tel_interval_off') : `${s / 60} min`}</option>)}
    </select>
    <p class="muted">Das Intervall gilt nur, solange die Seite offen und das Gerät verbunden ist. Es wird jeweils nur ein Repeater gleichzeitig abgefragt.</p>
    <div class="row">
      <button class="secondary" onClick={() => void exportAll('csv')}>{t('tel_export_csv')}</button>
      <button class="secondary" onClick={() => void exportAll('json')}>{t('tel_export_json')}</button>
    </div>
    <h3>{t('tel_repeaters')}</h3>
    {contacts.length === 0 && <p class="muted">{t('tel_none')}</p>}
    {contacts.map(c => <NodeCard key={c.key} keyHex={c.key} name={c.name} watched={watch.includes(c.key)} onWatch={() => void toggleWatch(c.key)} />)}
  </>
}

function NodeCard({ keyHex, name, watched, onWatch }: { keyHex: string; name: string; watched: boolean; onWatch: () => void }) {
  const prefix = keyHex.slice(0, 12)
  const rows = useLive(() => db.telemetry.where('prefix').equals(prefix).toArray(), [prefix], [])!
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const series = toSeries(rows)
  const last = rows.reduce((m, r) => Math.max(m, r.ts), 0)
  const fetchNow = async () => { setBusy(true); setErr(''); try { await fetchTelemetry(keyHex) } catch { setErr(t('tel_error')) } finally { setBusy(false) } }
  return <div class="card">
    <div class="row"><strong>{name}</strong>
      <button class="fit" disabled={busy} onClick={fetchNow}>{busy ? t('tel_waiting') : t('tel_fetch')}</button></div>
    <label style="font-weight:400"><input type="checkbox" style="width:auto;min-height:0" checked={watched} onChange={onWatch} /> {t('tel_watch')}</label>
    {err && <div class="err">{err}</div>}
    {last > 0 && <div class="muted">{t('tel_when')}: {ago(last)}</div>}
    {series.map(s => {
      const ld = latestAndDelta(s)!
      return <div class="row" key={s.key} style="margin-top:.4rem">
        <div>{s.label}<div class="muted">{t('tel_current')}: <strong>{ld.current} {s.unit}</strong>
          {ld.delta != null && <> · {t('tel_delta')}: {ld.delta > 0 ? '+' : ''}{ld.delta} {s.unit}</>}</div></div>
        <svg class="spark fit" viewBox="0 0 120 28"><polyline points={sparklinePoints(s.points)} /></svg>
      </div>
    })}
  </div>
}
