import type { ComponentChildren } from 'preact'
import { browserSupport, connState, connect } from '../session'
import { ConnectDiagnose } from './ConnectDiagnose'
import { t } from '../i18n'

/** Zeigt Browser-Hinweis (iOS -> Bluefy) bzw. Verbinden-Knopf. `soft`: gespeicherte Daten bleiben auch offline sichtbar. */
export function ConnectGate({ children, soft }: { children: ComponentChildren; soft?: boolean }) {
  const support = browserSupport()
  const ready = connState.value === 'ready'
  if (ready || soft) {
    return <>
      {!support.ok && <div class="banner">{t(support.reason === 'ios' ? 'support_ios' : 'support_other')}</div>}
      {!ready && support.ok && connState.value !== 'connecting' && (
        <button class="big" onClick={() => void connect().catch(() => undefined)}>{t('connect')}</button>)}
      <ConnectDiagnose />
      {children}
    </>
  }
  return <div class="card">
    {!support.ok ? <p>{t(support.reason === 'ios' ? 'support_ios' : 'support_other')}</p> :
      <button class="big" disabled={connState.value === 'connecting'} onClick={() => void connect().catch(() => undefined)}>
        {connState.value === 'connecting' ? t('connecting') : t('connect')}</button>}
    <ConnectDiagnose />
  </div>
}
