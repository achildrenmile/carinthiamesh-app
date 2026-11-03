import { signal } from '@preact/signals'
import { connState, connect, disconnect } from '../session'
import { mode, onboarded } from '../data/settings'
import { t, type Key } from '../i18n'
import { Chat } from './Chat'
import { Contacts } from './Contacts'
import { Device } from './Device'
import { lazy, Suspense } from 'preact/compat'
import { Onboarding } from './Onboarding'
import { Settings } from './Settings'
import { Telemetry } from './Telemetry'
import { ConnectGate } from './ConnectGate'

const MapView = lazy(() => import('./MapView').then(m => ({ default: m.MapView }))) // Leaflet erst bei Bedarf

const hash = signal(location.hash || '#/chat')
addEventListener('hashchange', () => { hash.value = location.hash || '#/chat' })

const TABS: Array<{ id: string; label: Key; tinkerer?: boolean }> = [
  { id: 'chat', label: 'nav_chat' }, { id: 'contacts', label: 'nav_contacts' }, { id: 'map', label: 'nav_map' },
  { id: 'telemetry', label: 'nav_telemetry', tinkerer: true }, { id: 'device', label: 'nav_device', tinkerer: true },
  { id: 'settings', label: 'nav_settings' },
]

export function App() {
  if (!onboarded.value) return <Onboarding />
  const [, page = 'chat', ...rest] = hash.value.replace(/^#\/?/, '/').split('/')
  const arg = rest.join('/')
  const state = connState.value
  const tabs = TABS.filter(x => !x.tinkerer || mode.value === 'tinkerer')

  return (
    <>
      <header class="top">
        <h1>CarinthiaMesh</h1>
        <span class="state">
          {state === 'ready' ? t('connected') : state === 'connecting' ? t('connecting') : state === 'lost' ? t('lost') : t('notConnected')}
          {' '}
          {state === 'ready'
            ? <button class="secondary" style="color:#fff;border-color:#fff;min-height:2.2rem;padding:.3rem .7rem" onClick={() => void disconnect()}>{t('disconnect')}</button>
            : state === 'connecting' ? null
            : <button style="min-height:2.2rem;padding:.3rem .7rem" onClick={() => void connect().catch(() => undefined)}>{state === 'lost' ? t('reconnect') : t('connect')}</button>}
        </span>
      </header>
      <main>
        {page === 'settings' ? <Settings /> :
          page === 'map' ? <Suspense fallback={<p>{t('loading')}</p>}><MapView /></Suspense> :
          page === 'contacts' ? <ConnectGate soft><Contacts arg={arg} /></ConnectGate> :
          page === 'telemetry' && mode.value === 'tinkerer' ? <ConnectGate soft><Telemetry /></ConnectGate> :
          page === 'device' && mode.value === 'tinkerer' ? <ConnectGate><Device /></ConnectGate> :
          <ConnectGate soft><Chat arg={arg} /></ConnectGate>}
      </main>
      <nav class="tabs">
        {tabs.map(x => <a key={x.id} href={`#/${x.id}`} class={page === x.id ? 'on' : ''}>{t(x.label)}</a>)}
      </nav>
    </>
  )
}
