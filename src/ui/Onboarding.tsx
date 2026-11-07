import { useState } from 'preact/hooks'
import { channelSecret, loadPreset, radioComplete, type Preset } from '../data/preset'
import { lang, saveLang, saveOnboarded, saveMode } from '../data/settings'
import { db } from '../data/db'
import { t } from '../i18n'
import { ConnectDiagnose } from './ConnectDiagnose'
import { browserSupport, connState, connect, deviceInfo, getClient, refreshChannels, selfInfo } from '../session'

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function Onboarding() {
  const [step, setStep] = useState<Step>(0)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [preset, setPreset] = useState<Preset | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())
  const support = browserSupport()

  const run = async (fn: () => Promise<void>, next?: Step) => {
    setBusy(true); setErr('')
    try { await fn(); if (next != null) setStep(next) } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const prep = async () => {
    if (!preset) {
      const p = await loadPreset('at')
      setPreset(p)
      setSelectedChannels(new Set(p.channels.map(ch => ch.name)))
      return p
    }
    return preset
  }

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
  }, 5)

  const joinSelectedChannels = () => run(async () => {
    const p = await prep()
    const c = getClient()
    const max = deviceInfo.value?.maxChannels ?? 1
    await refreshChannels()
    const existing = await db.channels.toArray()
    for (const ch of p.channels) {
      if (!selectedChannels.has(ch.name)) continue
      if (existing.some(e => e.name === ch.name)) continue
      const used = new Set((await db.channels.toArray()).map(e => e.index))
      let idx = 0; while (used.has(idx)) idx++
      if (idx >= max) throw new Error(`Keine Kanalplätze mehr frei (${max})`)
      await c.setChannel(idx, ch.name, await channelSecret(ch))
      await refreshChannels()
    }
  }, 6)

  return <main style="max-width:34rem;margin:0 auto;padding-top:2.5rem;animation:fadeIn .45s cubic-bezier(0.16, 1, 0.3, 1) both">
    <div style="text-align:right;margin-bottom:1rem">
      <button class="secondary" style="min-height:2.2rem;padding:.25rem .9rem;font-size:0.85rem" onClick={() => void saveLang(lang.value === 'de' ? 'en' : 'de')}>
        {lang.value === 'de' ? 'English' : 'Deutsch'}
      </button>
    </div>

    {/* Step 0: Welcome Start Screen */}
    {step === 0 && <div class="card" style="padding:2rem 1.5rem;text-align:center">
      <div style="font-size:3rem;margin-bottom:1rem">📡</div>
      <h1 style="font-size:1.75rem;margin-bottom:0.75rem">{t('ob_welcome')}</h1>
      <p style="color:var(--muted);font-size:1.05rem;line-height:1.6;margin-bottom:2rem">{t('ob_welcome_text')}</p>
      <button class="big" onClick={() => setStep(1)}>{t('ob_start')}</button>
    </div>}

    {/* Step 1: Mode Selection */}
    {step === 1 && <>
      <h1>{t('ob_mode_title')}</h1>
      <p>{t('ob_mode_text')}</p>
      <div style="display:flex;flex-direction:column;gap:1rem;margin-top:1.5rem">
        <button class="big" onClick={() => { void saveMode('simple'); setStep(2) }}>
          <strong>{t('ob_mode_simple')}</strong>
          <div style="font-weight:normal;font-size:0.9rem;opacity:0.85;margin-top:0.25rem">{t('set_mode_simple_desc')}</div>
        </button>
        <button class="big secondary" onClick={() => { void saveMode('tinkerer'); setStep(2) }}>
          <strong>{t('ob_mode_tinkerer')}</strong>
          <div style="font-weight:normal;font-size:0.9rem;opacity:0.85;margin-top:0.25rem">{t('set_mode_tinkerer_desc')}</div>
        </button>
      </div>
    </>}

    {/* Step 2: Connect Radio */}
    {step === 2 && <>
      <h1>{t('ob_step1')}</h1><p>{t('ob_step1_text')}</p>
      {!support.ok && <div class="banner">{t(support.reason === 'ios' ? 'support_ios' : 'support_other')}</div>}
      {connState.value !== 'ready'
        ? <button class="big" disabled={!support.ok || busy || connState.value === 'connecting'} onClick={() => run(() => connect(), undefined)}>
            {connState.value === 'connecting' ? t('connecting') : t('connect')}</button>
        : <><p class="okc">✓ {t('connected')}: {selfInfo.value?.name}</p><button class="big" onClick={() => { setName(selfInfo.value?.name ?? ''); setStep(3) }}>{t('next')}</button></>}
      {err && <p class="err">{err}</p>}
      <ConnectDiagnose />
    </>}

    {/* Step 3: Name */}
    {step === 3 && <>
      <h1>{t('ob_step2')}</h1><p>{t('ob_step2_text')}</p>
      <label>{t('ob_name')}</label>
      <input value={name} maxLength={31} onInput={e => setName((e.target as HTMLInputElement).value)} />
      <button class="big" disabled={busy || !name.trim()} onClick={() => run(async () => { await getClient().setName(name.trim()); await prep() }, 4)}>{busy ? t('ob_busy') : t('next')}</button>
      {err && <p class="err">{err}</p>}
    </>}

    {/* Step 4: Radio Setup */}
    {step === 4 && <>
      <h1>{t('ob_step3')}</h1>
      <p>{preset && !radioComplete(preset.radio) ? t('ob_step3_missing') : t('ob_step3_text')}</p>
      <button class="big" disabled={busy} onClick={applyRadio}>{busy ? t('ob_busy') : preset && !radioComplete(preset.radio) ? t('next') : t('ob_apply')}</button>
      {err && <p class="err">{err}</p>}
    </>}

    {/* Step 5: Channels Selection */}
    {step === 5 && <>
      <h1>{t('ob_step4')}</h1>
      <p>{preset && preset.channels.length ? t('ob_step4_text') : t('ob_step4_none')}</p>
      {preset && preset.channels.length > 0 && <div style="display:flex;flex-direction:column;gap:.6rem;margin:1.2rem 0">
        {preset.channels.map(ch => {
          const checked = selectedChannels.has(ch.name)
          return <label key={ch.name} style="display:flex;align-items:center;gap:.9rem;padding:.9rem 1.1rem;background:var(--card);border:1px solid var(--line);cursor:pointer;margin:0">
            <input type="checkbox" checked={checked} style="width:1.3rem;height:1.3rem;min-height:auto;accent-color:var(--accent)" onChange={e => {
              const next = new Set(selectedChannels)
              if ((e.target as HTMLInputElement).checked) next.add(ch.name)
              else next.delete(ch.name)
              setSelectedChannels(next)
            }} />
            <div>
              <strong>#{ch.name}</strong>
              <div class="muted" style="font-size:0.88rem;margin-top:0.2rem">{ch.hashtag ? 'Hashtag-Kanal' : 'Gesicherter Kanal'}</div>
            </div>
          </label>
        })}
      </div>}
      <button class="big" disabled={busy} onClick={joinSelectedChannels}>{busy ? t('ob_busy') : t('next')}</button>
      {err && <p class="err">{err}</p>}
    </>}

    {/* Step 6: Done */}
    {step === 6 && <div class="card" style="padding:2rem 1.5rem;text-align:center">
      <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
      <h1 style="font-size:1.75rem;margin-bottom:0.75rem">{t('ob_done')}</h1>
      <p style="color:var(--muted);font-size:1.05rem;line-height:1.6;margin-bottom:2rem">{t('ob_done_text')}</p>
      <button class="big" onClick={() => { void saveOnboarded(true); location.hash = '#/chat' }}>{t('ob_start')}</button>
    </div>}
  </main>
}
