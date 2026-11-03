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
    <p><a href="#/chat">← {t('nav_chat')}</a></p>
    <h2>{title}</h2>
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
  const status = m.status === 'failed' ? t('chat_failed') : m.status === 'sending' ? t('chat_sending') : m.status === 'acked' ? t('chat_acked') : m.status === 'sent' ? t('chat_sent') : ''
  return <div class={`bubble${m.outgoing ? ' mine' : ''}`}>
    {m.sender && <strong>{m.sender}<br /></strong>}
    {m.text}
    <div class="meta">
      {time}{m.outgoing && status ? ` · ${status}` : ''}
      {!m.outgoing && mode.value === 'tinkerer' && ` · SNR ${m.snr ?? '–'} dB · ${hops(m.pathLen)}`}
    </div>
  </div>
}
