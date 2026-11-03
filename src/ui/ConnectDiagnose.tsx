import { connectLog, connError } from '../session'
import { t } from '../i18n'

/** Zeigt nach einem fehlgeschlagenen Verbindungsversuch Hinweise und das Verbindungsprotokoll. */
export function ConnectDiagnose() {
  if (!connError.value && connectLog.value.length === 0) return null
  const text = connectLog.value.join('\n')
  return <div class="card">
    {connError.value && <p class="err">{connError.value}</p>}
    <strong>{t('conn_hint_title')}</strong>
    <ol class="muted">
      <li>{t('conn_hint_1')}</li>
      <li>{t('conn_hint_2')}</li>
      <li>{t('conn_hint_3')}</li>
    </ol>
    <pre class="log">{text}</pre>
    <button class="secondary" onClick={() => void navigator.clipboard.writeText(text)}>{t('conn_copy')}</button>
  </div>
}
