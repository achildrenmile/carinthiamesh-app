import 'fake-indexeddb/auto'
import { render } from 'preact'
import { afterEach, describe, expect, it } from 'vitest'
import { loadSettings, saveLang, saveMode, saveOnboarded } from '../src/data/settings'
import { App } from '../src/ui/App'

const flush = () => new Promise(r => setTimeout(r, 50))
const root = () => { const el = document.createElement('div'); document.body.append(el); return el }

describe('UI Smoke (jsdom, ohne Gerät)', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('zeigt Onboarding mit Willkommenstext und weist iOS/ohne Web Bluetooth ab', async () => {
    await loadSettings(); await saveLang('de')
    const el = root(); render(<App />, el); await flush()
    expect(el.textContent).toContain('Willkommen im MeshCore-Netz')
    ;(el.querySelector('button.big') as HTMLButtonElement).click(); await flush()
    expect(el.textContent).toContain('Schritt 1 von 4')
    expect(el.textContent).toContain('Dieser Browser unterstützt kein Web Bluetooth') // jsdom hat kein navigator.bluetooth
    expect((el.querySelector('button.big') as HTMLButtonElement).disabled).toBe(true)
  })

  it('Einfach-Modus: Tabs Chat/Kontakte/Karte/Einstellungen, ohne Tüftler-Seiten', async () => {
    await saveOnboarded(true); await saveMode('simple')
    const el = root(); render(<App />, el); await flush()
    const tabs = [...el.querySelectorAll('nav.tabs a')].map(a => a.textContent)
    expect(tabs).toEqual(['Chat', 'Kontakte', 'Karte', 'Einstellungen'])
  })

  it('Tüftler-Modus zeigt Messwerte und Gerät', async () => {
    await saveMode('tinkerer')
    const el = root(); render(<App />, el); await flush()
    expect([...el.querySelectorAll('nav.tabs a')].map(a => a.textContent)).toContain('Messwerte')
    expect([...el.querySelectorAll('nav.tabs a')].map(a => a.textContent)).toContain('Gerät')
  })
})
