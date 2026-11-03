import { useState } from 'preact/hooks'
import { channelSecret, loadPreset, radioComplete, type Preset } from '../data/preset'
import { lang, saveLang, saveOnboarded } from '../data/settings'
import { db } from '../data/db'
import { t } from '../i18n'
import { ConnectDiagnose } from './ConnectDiagnose'
import { browserSupport, connState, connect, deviceInfo, getClient, refreshChannels, selfInfo } from '../session'

type Step = 0 | 1 | 2 | 3 | 4 | 5

export function Onboarding() {
  const [step, setStep] = useState<Step>(0)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [preset, setPreset] = useState<Preset | null>(null)
  const support = browserSupport()
  const run = async (fn: () => Promise<void>, next?: Step) => {
    setBusy(true); setErr('')
    try { await fn(); if (next != null) setStep(next) } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const prep = async () => { if (!preset) setPreset(await loadPreset('at')); return preset ?? (await loadPreset('at')) }

  const applyRadio = () => run(async () => {
    const p = await prep(); setPreset(p)
    if (radioComplete(p.radio)) {
      const c = getClient()
      await c.setRadio(p.radio.freqMHz!, p.radio.bwKHz!, p.radio.sf!, p.radio.cr!)
      if (p.radio.txPowerDbm != null) await c.setTxPower(p.radio.txPowerDbm)
    }
    const c = getClient()
    if (p.pathHashMode != null) await c.setPathHashMode(p.pathHashMode)
    if (p.multiAcks != null && selfInfo.value) await c.setMultiAcks(selfInfo.value, p.multiAcks)
  }, 4)

  const joinChannels = () => run(async () => {
    const p = await prep()
    const c = getClient()
    const max = deviceInfo.value?.maxChannels ?? 1
    await refreshChannels()
    const existing = await db.channels.toArray()
    for (const ch of p.channels) {
      if (existing.some(e => e.name === ch.name)) continue
      const used = new Set((await db.channels.toArray()).map(e => e.index))
      let idx = 0; while (used.has(idx)) idx++
      if (idx >= max) throw new Error(`Keine Kanalplätze mehr frei (${max})`)
      await c.setChannel(idx, ch.name, await channelSecret(ch))
      await refreshChannels()
    }
  }, 5)

  return <main style="max-width:34rem;margin:0 auto;padding-top:2rem">
    <div style="text-align:right"><button class="secondary" style="min-height:2.2rem;padding:.2rem .8rem" onClick={() => void saveLang(lang.value === 'de' ? 'en' : 'de')}>{lang.value === 'de' ? 'English' : 'Deutsch'}</button></div>
    {step === 0 && <>
      <h1>{t('ob_welcome')}</h1><p>{t('ob_welcome_text')}</p>
      <button class="big" onClick={() => setStep(1)}>{t('next')}</button>
    </>}
    {step === 1 && <>
      <h1>{t('ob_step1')}</h1><p>{t('ob_step1_text')}</p>
      {!support.ok && <div class="banner">{t(support.reason === 'ios' ? 'support_ios' : 'support_other')}</div>}
      {connState.value !== 'ready'
        ? <button class="big" disabled={!support.ok || busy || connState.value === 'connecting'} onClick={() => run(() => connect(), undefined)}>
            {connState.value === 'connecting' ? t('connecting') : t('connect')}</button>
        : <><p class="okc">✓ {t('connected')}: {selfInfo.value?.name}</p><button class="big" onClick={() => { setName(selfInfo.value?.name ?? ''); setStep(2) }}>{t('next')}</button></>}
      {err && <p class="err">{err}</p>}
      <ConnectDiagnose />
    </>}
    {step === 2 && <>
      <h1>{t('ob_step2')}</h1><p>{t('ob_step2_text')}</p>
      <label>{t('ob_name')}</label>
      <input value={name} maxLength={31} onInput={e => setName((e.target as HTMLInputElement).value)} />
      <button class="big" disabled={busy || !name.trim()} onClick={() => run(async () => { await getClient().setName(name.trim()); await prep().then(setPreset) }, 3)}>{busy ? t('ob_busy') : t('next')}</button>
      {err && <p class="err">{err}</p>}
    </>}
    {step === 3 && <>
      <h1>{t('ob_step3')}</h1>
      <p>{preset && !radioComplete(preset.radio) ? t('ob_step3_missing') : t('ob_step3_text')}</p>
      <button class="big" disabled={busy} onClick={applyRadio}>{busy ? t('ob_busy') : preset && !radioComplete(preset.radio) ? t('next') : t('ob_apply')}</button>
      {err && <p class="err">{err}</p>}
    </>}
    {step === 4 && <>
      <h1>{t('ob_step4')}</h1>
      <p>{preset && preset.channels.length ? t('ob_step4_text') : t('ob_step4_none')}</p>
      <button class="big" disabled={busy} onClick={joinChannels}>{busy ? t('ob_busy') : t('next')}</button>
      {err && <p class="err">{err}</p>}
    </>}
    {step === 5 && <>
      <h1>{t('ob_done')}</h1><p>{t('ob_done_text')}</p>
      <button class="big" onClick={() => { void saveOnboarded(true); location.hash = '#/chat' }}>{t('ob_start')}</button>
    </>}
  </main>
}
