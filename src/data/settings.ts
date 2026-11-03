import { signal } from '@preact/signals'
import { getKv, setKv } from './db'

export type Mode = 'simple' | 'tinkerer'
export interface ObserverSettings {
  enabled: boolean; url: string; username: string; password: string
  iata: string; withGps: boolean
}
export const defaultObserver: ObserverSettings = { enabled: false, url: '', username: '', password: '', iata: '', withGps: false }

export const mode = signal<Mode>('simple')
export const lang = signal<'de' | 'en'>('de')
export const onboarded = signal(false)
export const observer = signal<ObserverSettings>(defaultObserver)
export const telemetryIntervalSec = signal(0) // 0 = nur manuell

export async function loadSettings() {
  mode.value = await getKv<Mode>('mode', 'simple')
  lang.value = await getKv('lang', navigator.language.startsWith('en') ? 'en' : 'de')
  onboarded.value = await getKv('onboarded', false)
  observer.value = { ...defaultObserver, ...(await getKv<Partial<ObserverSettings>>('observer', {})) }
  telemetryIntervalSec.value = await getKv('telemetryIntervalSec', 0)
}
export const saveMode = (m: Mode) => { mode.value = m; return setKv('mode', m) }
export const saveLang = (l: 'de' | 'en') => { lang.value = l; return setKv('lang', l) }
export const saveOnboarded = (v: boolean) => { onboarded.value = v; return setKv('onboarded', v) }
export const saveObserver = (o: ObserverSettings) => { observer.value = o; return setKv('observer', o) }
export const saveTelemetryInterval = (s: number) => { telemetryIntervalSec.value = s; return setKv('telemetryIntervalSec', s) }
