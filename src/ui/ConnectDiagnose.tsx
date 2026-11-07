import { useState } from 'preact/hooks'
import { connectLog, connError } from '../session'
import { t } from '../i18n'

/** Zeigt nach einem fehlgeschlagenen Verbindungsversuch Hinweise und das Verbindungsprotokoll hinter einem Hilfe-Button. */
export function ConnectDiagnose() {
  const [open, setOpen] = useState(false)
  if (!connError.value && connectLog.value.length === 0) return null
  const text = connectLog.value.join('\n')
  return <div style="margin-top:1rem">
    {connError.value && <p class="err">{connError.value}</p>}
    <button class="secondary" style="min-height:2.2rem;padding:.3rem .9rem;font-size:0.85rem;border-radius:.6rem" onClick={() => setOpen(!open)}>
      {open ? t('help_hide') : t('help')} {connectLog.value.length > 0 ? `(${connectLog.value.length})` : ''}
    </button>
    {open && <div class="card" style="margin-top:.6rem">
      <strong>{t('conn_hint_title')}</strong>
      <ol class="muted" style="margin:.5rem 0;padding-left:1.2rem;font-size:0.9rem">
        <li>{t('conn_hint_1')}</li>
        <li>{t('conn_hint_2')}</li>
        <li>{t('conn_hint_3')}</li>
      </ol>
      <pre class="log">{text}</pre>
      <button class="secondary" style="margin-top:.5rem;font-size:0.85rem;min-height:2.4rem" onClick={() => void navigator.clipboard.writeText(text)}>{t('conn_copy')}</button>
    </div>}
  </div>
}
