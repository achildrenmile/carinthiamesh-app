import { useEffect, useRef, useState } from 'preact/hooks'
import { db, type MessageRow } from '../data/db'
import { mode } from '../data/settings'
import { t } from '../i18n'
import { connState, sendChannelMessage, sendDirectMessage } from '../session'
import { hops } from './format'
import { useLive } from './hooks'

const MAX_LEN = 133 // Zeichenlimit für Kanalnachrichten laut Companion-Doku

export function Chat({ arg }: { arg: string }) {
  return arg ? <Thread scope={decodeURIComponent(arg)} /> : <ConversationList />
}

function ConversationList() {
  const channels = useLive(() => db.channels.orderBy('index').toArray(), [], [])!
  const contacts = useLive(() => db.contacts.toArray(), [], [])!
  const dmScopes = useLive(async () => {
    const rows = await db.messages.where('scope').startsWith('dm:').toArray()
    return [...new Set(rows.map(r => r.scope))]
  }, [], [])!
  const nameOf = (prefix: string) => contacts.find(c => c.key.startsWith(prefix))?.name ?? prefix
  return <>
    <h2>{t('chat_title')}</h2>
    <h3>{t('chat_channels')}</h3>
    <div class="list">
      {channels.length === 0 && <p class="muted">{t('chat_no_channels')}</p>}
      {channels.map(c => <a class="item" key={c.index} href={`#/chat/ch:${c.index}`}>{c.name}</a>)}
    </div>
    {dmScopes.length > 0 && <>
      <h3>{t('chat_direct')}</h3>
      <div class="list">{dmScopes.map(s => <a class="item" key={s} href={`#/chat/${s}`}>{nameOf(s.slice(3))}</a>)}</div>
    </>}
  </>
}

function Thread({ scope }: { scope: string }) {
  const msgs = useLive(() => db.messages.where('scope').equals(scope).sortBy('receivedAt'), [scope], [])!
  const title = useLive(async () => {
    if (scope.startsWith('ch:')) return (await db.channels.get(Number(scope.slice(3))))?.name ?? scope
    return (await db.contacts.filter(c => c.key.startsWith(scope.slice(3))).first())?.name ?? scope.slice(3)
  }, [scope], scope)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView() }, [msgs.length])

  const send = async (e: Event) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setText(''); setErr('')
    try {
      if (scope.startsWith('ch:')) await sendChannelMessage(Number(scope.slice(3)), body)
      else {
        const c = await db.contacts.filter(x => x.key.startsWith(scope.slice(3))).first()
        if (!c) throw new Error('Kontakt unbekannt')
        await sendDirectMessage(c.key, body)
      }
    } catch (ex) { setErr(ex instanceof Error ? ex.message : String(ex)) }
  }

  return <>
    <div style="position:sticky;top:0;background:var(--bg);z-index:5;padding:.5rem 0 1rem;display:flex;align-items:center;gap:1rem;border-bottom:1px solid var(--line);margin-bottom:1rem">
      <a href="#/chat" class="btn secondary" style="min-height:2.4rem;padding:.3rem 1rem;font-size:0.85rem">← {t('nav_chat')}</a>
      <h2 style="margin:0;font-size:1.2rem">{title}</h2>
    </div>
    {msgs.length === 0 && <p class="muted">{t('chat_empty')}</p>}
    <div class="thread">{msgs.map(m => <Bubble key={m.id} m={m} />)}<div ref={end} /></div>
    {err && <p class="err">{err}</p>}
    <form class="composer" onSubmit={send}>
      <input value={text} maxLength={MAX_LEN} placeholder={t('chat_placeholder')} onInput={e => setText((e.target as HTMLInputElement).value)} />
      <button type="submit" disabled={connState.value !== 'ready' || !text.trim()}>{t('chat_send')}</button>
    </form>
  </>
}

function Bubble({ m }: { m: MessageRow }) {
  const time = new Date(m.ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  let status = ''
  if (m.status === 'failed') status = t('chat_failed')
  else if (m.status === 'sending') status = t('chat_sending')
  else if (m.status === 'acked') {
    const hopInfo = m.pathLen != null ? (m.pathLen === 255 ? t('chat_hops_direct') : t('chat_relayed', { n: m.pathLen & 63 })) : ''
    status = `${t('chat_acked')}${hopInfo ? ` (${hopInfo})` : ''}`
  } else if (m.status === 'sent') {
    const hopInfo = m.pathLen != null ? (m.pathLen === 255 ? t('chat_hops_direct') : t('chat_relayed', { n: m.pathLen & 63 })) : ''
    status = `${t('chat_sent')}${hopInfo ? ` (${hopInfo})` : ''}`
  }

  return <div class={`bubble${m.outgoing ? ' mine' : ''}`}>
    {m.sender && <strong>{m.sender}<br /></strong>}
    {m.text}
    <div class="meta">
      {time}{m.outgoing && status ? ` · ${status}` : ''}
      {!m.outgoing && mode.value === 'tinkerer' && ` · SNR ${m.snr ?? '–'} dB · ${hops(m.pathLen)}`}
      {!m.outgoing && mode.value === 'simple' && m.pathLen != null && m.pathLen !== 255 && ` · ${t('chat_relayed', { n: m.pathLen & 63 })}`}
    </div>
  </div>
}
