import { useState } from 'preact/hooks'
import type { ContactRow } from '../data/db'
import { t } from '../i18n'
import { fetchTelemetry, getClient } from '../session'
import { hexToBytes } from '../data/preset'

/** Tüftler-Bereich eines Kontakts: Rohdaten, Telemetrie-Abruf, Repeater-Login und -CLI. */
export function Contact_Tinkerer({ contact }: { contact: ContactRow }) {
  const [pw, setPw] = useState('')
  const [cmd, setCmd] = useState('')
  const [out, setOut] = useState('')
  const key = hexToBytes(contact.key)
  const run = async (fn: () => Promise<unknown>) => { setOut(t('ob_busy')); try { await fn(); setOut(t('dev_ok')) } catch (e) { setOut(String(e instanceof Error ? e.message : e)) } }
  return <div class="card">
    <h3>Tüftler</h3>
    <div class="muted" style="word-break:break-all">Public Key: {contact.key}</div>
    <div class="muted">Pfadlänge: {contact.outPathLen === 255 ? 'unbekannt (Flood)' : contact.outPathLen} · Flags: 0x{contact.flags.toString(16)}</div>
    <button class="secondary big" onClick={() => run(() => fetchTelemetry(contact.key))}>{t('tel_fetch')}</button>
    {contact.type !== 1 && <>
      <label>{t('dev_login')}</label>
      <div class="row"><input type="password" placeholder={t('dev_password')} value={pw} onInput={e => setPw((e.target as HTMLInputElement).value)} />
        <button class="fit" onClick={() => run(() => getClient().login(key, pw))}>Login</button></div>
      <label>{t('dev_cli')}</label>
      <div class="row"><input value={cmd} placeholder="ver" onInput={e => setCmd((e.target as HTMLInputElement).value)} />
        <button class="fit" onClick={() => run(() => getClient().repeaterCli(key, cmd))}>{t('dev_cli_send')}</button></div>
      <p class="muted">Die Antwort des Repeaters erscheint als Nachricht im Direkt-Chat.</p>
    </>}
    {out && <p class="muted">{out}</p>}
  </div>
}
