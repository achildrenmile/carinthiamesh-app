import { useState } from 'preact/hooks'
import { db } from '../data/db'
import { lang, mode, observer, saveLang, saveMode, saveObserver, saveOnboarded, type ObserverSettings } from '../data/settings'
import { t } from '../i18n'
import { connState, startObserverIfEnabled, stopObserver } from '../session'
import { observerState, observerStats } from '../observer/state'

const STATE_KEY = { off: 'obs_off', connecting: 'obs_connecting', online: 'obs_online', offline: 'obs_offline', error: 'obs_error' } as const

export function Settings() {
  const [o, setO] = useState<ObserverSettings>(observer.value)
  const set = <K extends keyof ObserverSettings>(k: K, v: ObserverSettings[K]) => setO({ ...o, [k]: v })
  const applyObserver = async () => {
    const next = { ...o, iata: o.iata.trim().toUpperCase().slice(0, 3), url: o.url.trim() }
    await saveObserver(next)
    if (next.enabled && connState.value === 'ready') await startObserverIfEnabled()
    else await stopObserver()
  }
  const reset = async () => {
    if (!confirm(t('set_reset_confirm'))) return
    await Promise.all([db.messages.clear(), db.contacts.clear(), db.channels.clear(), db.telemetry.clear(), db.outbox.clear(), db.kv.clear()])
    await saveOnboarded(false)
  }
  return <>
    <h2>{t('set_title')}</h2>
    <div class="card">
      <h3>{t('set_mode')}</h3>
      <div class="seg">
        <button class={mode.value === 'simple' ? 'on' : ''} onClick={() => void saveMode('simple')}>{t('set_mode_simple')}</button>
        <button class={mode.value === 'tinkerer' ? 'on' : ''} onClick={() => void saveMode('tinkerer')}>{t('set_mode_tinkerer')}</button>
      </div>
      <p class="muted">{mode.value === 'simple' ? t('set_mode_simple_desc') : t('set_mode_tinkerer_desc')}</p>
    </div>
    <div class="card">
      <h3>{t('set_lang')}</h3>
      <div class="seg">
        <button class={lang.value === 'de' ? 'on' : ''} onClick={() => void saveLang('de')}>Deutsch</button>
        <button class={lang.value === 'en' ? 'on' : ''} onClick={() => void saveLang('en')}>English</button>
      </div>
    </div>
    {mode.value === 'tinkerer' && <div class="card">
      <h3>{t('set_observer')}</h3>
      <p class="muted">{t('set_observer_desc')}</p>
      <div class="banner">{t('set_obs_bg')}</div>
      <label style="font-weight:400"><input type="checkbox" style="width:auto;min-height:0" checked={o.enabled} onChange={e => set('enabled', (e.target as HTMLInputElement).checked)} /> {t('set_obs_enabled')}</label>
      <label>{t('set_obs_url')}</label>
      <input value={o.url} placeholder="wss://mqtt.carinthiamesh.com:443/…" autocapitalize="off" onInput={e => set('url', (e.target as HTMLInputElement).value)} />
      <label>{t('set_obs_user')}</label>
      <input value={o.username} autocomplete="off" autocapitalize="off" onInput={e => set('username', (e.target as HTMLInputElement).value)} />
      <label>{t('set_obs_pass')}</label>
      <input type="password" value={o.password} autocomplete="off" onInput={e => set('password', (e.target as HTMLInputElement).value)} />
      <p class="muted">{t('set_obs_secret')}</p>
      <label>{t('set_obs_iata')}</label>
      <input value={o.iata} maxLength={3} autocapitalize="characters" onInput={e => set('iata', (e.target as HTMLInputElement).value)} />
      <label style="font-weight:400"><input type="checkbox" style="width:auto;min-height:0" checked={o.withGps} onChange={e => set('withGps', (e.target as HTMLInputElement).checked)} /> {t('set_obs_gps')}</label>
      <button class="big" onClick={() => void applyObserver()}>{t('save')}</button>
      <div class="muted">{t('set_obs_state')}: {t(STATE_KEY[observerState.value])} · {t('set_obs_sent')}: {observerStats.value.sent} · {t('set_obs_buffered')}: {observerStats.value.buffered} · {t('set_obs_dropped')}: {observerStats.value.dropped}
        {observerStats.value.lastError && <div class="err">{observerStats.value.lastError}</div>}</div>
    </div>}
    <div class="card">
      <button class="danger big" onClick={() => void reset()}>{t('set_reset')}</button>
      <p class="muted">CarinthiaMesh · MIT · v0.1</p>
    </div>
  </>
}
