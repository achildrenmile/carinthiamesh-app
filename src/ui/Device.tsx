import { useState } from 'preact/hooks'
import { db } from '../data/db'
import { channelSecret, hexToBytes } from '../data/preset'
import { t } from '../i18n'
import { battery, deviceInfo, getClient, lastRx, rawLog, refreshChannels, refreshBattery, rxLogCount, selfInfo } from '../session'
import { toHex } from '../protocol/reader'
import { useLive } from './hooks'

function useAction() {
  const [msg, setMsg] = useState('')
  const [bad, setBad] = useState(false)
  const run = async (fn: () => Promise<unknown>) => {
    setMsg(t('ob_busy')); setBad(false)
    try { await fn(); setMsg(t('dev_ok')) } catch (e) { setBad(true); setMsg(e instanceof Error ? e.message : String(e)) }
  }
  return { msg, bad, run }
}

export function Device() {
  const self = selfInfo.value, dev = deviceInfo.value
  const { msg, bad, run } = useAction()
  const [name, setName] = useState(self?.name ?? '')
  const [freq, setFreq] = useState(String(self?.freqMHz ?? ''))
  const [bw, setBw] = useState(String(self?.bwKHz ?? ''))
  const [sf, setSf] = useState(String(self?.sf ?? ''))
  const [cr, setCr] = useState(String(self?.cr ?? ''))
  const [tx, setTx] = useState(String(self?.txPowerDbm ?? ''))
  const [lat, setLat] = useState(String(self?.lat ?? ''))
  const [lon, setLon] = useState(String(self?.lon ?? ''))
  const [chIdx, setChIdx] = useState('1')
  const [chName, setChName] = useState('')
  const [chKey, setChKey] = useState('')
  const channels = useLive(() => db.channels.toArray(), [], [])!
  if (!self || !dev) return null
  const num = (s: string) => { const n = Number(s.replace(',', '.')); if (!Number.isFinite(n)) throw new Error(`Ungültige Zahl: ${s}`); return n }

  return <>
    <h2>{t('dev_title')}</h2>
    {msg && <p class={bad ? 'err' : 'okc'}>{msg}</p>}

    <div class="card">
      <h3>{t('dev_info')}</h3>
      <div>{dev.model} · {dev.version} · Protokoll v{dev.fwVer}</div>
      <div class="muted">Build {dev.build} · Kontakte max. {dev.maxContacts} · Kanäle max. {dev.maxChannels}{dev.repeat != null && ` · Repeat ${dev.repeat ? 'an' : 'aus'}`}</div>
      <div class="muted" style="word-break:break-all">Public Key: {toHex(self.publicKey)}</div>
      <div>{t('dev_battery')}: {battery.value != null ? `${(battery.value / 1000).toFixed(2)} V` : '–'}
        {' '}<button class="secondary" style="min-height:2rem;padding:.2rem .6rem" onClick={() => void refreshBattery()}>↻</button></div>
    </div>

    <div class="card">
      <label>{t('dev_name')}</label>
      <div class="row"><input value={name} maxLength={31} onInput={e => setName((e.target as HTMLInputElement).value)} />
        <button class="fit" onClick={() => run(() => getClient().setName(name.trim()))}>{t('save')}</button></div>
    </div>

    <div class="card">
      <h3>{t('dev_radio')}</h3>
      <div class="row"><div><label>{t('dev_freq')}</label><input inputMode="decimal" value={freq} onInput={e => setFreq((e.target as HTMLInputElement).value)} /></div>
        <div><label>{t('dev_bw')}</label><input inputMode="decimal" value={bw} onInput={e => setBw((e.target as HTMLInputElement).value)} /></div></div>
      <div class="row"><div><label>{t('dev_sf')}</label><input inputMode="numeric" value={sf} onInput={e => setSf((e.target as HTMLInputElement).value)} /></div>
        <div><label>{t('dev_cr')}</label><input inputMode="numeric" value={cr} onInput={e => setCr((e.target as HTMLInputElement).value)} /></div></div>
      <button class="big" onClick={() => run(async () => { await getClient().setRadio(num(freq), num(bw), num(sf), num(cr)) })}>{t('dev_apply')}</button>
      <label>{t('dev_tx')} (max. {self.maxTxPowerDbm})</label>
      <div class="row"><input inputMode="numeric" value={tx} onInput={e => setTx((e.target as HTMLInputElement).value)} />
        <button class="fit" onClick={() => run(() => getClient().setTxPower(num(tx)))}>{t('save')}</button></div>
      <p class="muted">Aktuell am Gerät: {self.freqMHz} MHz · {self.bwKHz} kHz · SF{self.sf} · CR{self.cr}</p>
    </div>

    <div class="card">
      <h3>{t('dev_pos')}</h3>
      <div class="row"><div><label>{t('dev_lat')}</label><input inputMode="decimal" value={lat} onInput={e => setLat((e.target as HTMLInputElement).value)} /></div>
        <div><label>{t('dev_lon')}</label><input inputMode="decimal" value={lon} onInput={e => setLon((e.target as HTMLInputElement).value)} /></div></div>
      <button class="big" onClick={() => run(() => getClient().setPosition(num(lat), num(lon)))}>{t('save')}</button>
      <div class="row"><button class="secondary" onClick={() => run(() => getClient().advert(true))}>{t('dev_flood')}</button>
        <button class="secondary" onClick={() => run(() => getClient().advert(false))}>{t('dev_zerohop')}</button></div>
    </div>

    <div class="card">
      <h3>{t('dev_channels')}</h3>
      {channels.map(c => <div key={c.index} class="muted" style="word-break:break-all">#{c.index} <strong>{c.name}</strong> · {c.secretHex}</div>)}
      <p class="muted">{t('dev_ch_warn')}</p>
      <div class="row"><div><label>{t('dev_ch_idx')}</label><input inputMode="numeric" value={chIdx} onInput={e => setChIdx((e.target as HTMLInputElement).value)} /></div>
        <div><label>{t('dev_ch_name')}</label><input value={chName} onInput={e => setChName((e.target as HTMLInputElement).value)} /></div></div>
      <label>{t('dev_ch_secret')}</label>
      <input value={chKey} autocomplete="off" onInput={e => setChKey((e.target as HTMLInputElement).value)} />
      <button class="big" onClick={() => run(async () => {
        const secret = chKey.trim() ? hexToBytes(chKey) : await channelSecret({ name: chName, hashtag: true })
        await getClient().setChannel(num(chIdx), chName, secret); await refreshChannels()
      })}>{t('dev_ch_add')}</button>
    </div>

    <div class="card">
      <h3>{t('dev_rxlog')}</h3>
      <div>{rxLogCount.value} {lastRx.value && `· SNR ${lastRx.value.snr} dB · RSSI ${lastRx.value.rssi} dBm · ${lastRx.value.len} Byte`}</div>
      <h3>{t('dev_rawlog')}</h3>
      <pre class="log">{rawLog.value.join('\n')}</pre>
      <button class="secondary" onClick={() => void navigator.clipboard.writeText(rawLog.value.join('\n'))}>Kopieren</button>
    </div>

    <button class="danger big" onClick={() => run(() => getClient().reboot())}>{t('dev_reboot')}</button>
  </>
}
