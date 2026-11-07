import { useState } from 'preact/hooks'
import { db } from '../data/db'
import { mode } from '../data/settings'
import { t } from '../i18n'
import { connState, getClient, refreshContacts } from '../session'
import { Contact_Tinkerer } from './ContactTinkerer'
import { ago, contactTypeLabel } from './format'
import { useLive } from './hooks'

export function Contacts({ arg }: { arg: string }) {
  return arg ? <Detail id={arg} /> : <List />
}

function List() {
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const all = useLive(() => db.contacts.orderBy('name').toArray(), [], [])!
  const filtered = mode.value === 'simple' ? all.filter(c => c.type !== 2) : all
  const list = filtered.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
  const persons = list.filter(c => c.type !== 2)
  const repeaters = list.filter(c => c.type === 2)

  const advert = async () => {
    try { await getClient().advert(true); setMsg(t('advert_sent')); setTimeout(() => void refreshContacts().catch(() => undefined), 3000) }
    catch (e) { setMsg(String(e)) }
  }
  return <>
    <h2>{t('contacts_title')}</h2>
    <input type="search" placeholder={t('contacts_search')} value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
    <button class="secondary big" disabled={connState.value !== 'ready'} onClick={advert}>{t('advert_send')}</button>
    {msg && <p class="muted">{msg}</p>}
    {all.length === 0 && <p class="muted">{t('contacts_empty')}</p>}
    <div class="list">
      {persons.length > 0 && <>
        {mode.value === 'tinkerer' && <h3 style="margin:.8rem 0 .4rem;font-size:.95rem;color:var(--muted)">{t('contacts_title')}</h3>}
        {persons.map(c => <a class="item" key={c.key} href={`#/contacts/${c.key}`}>
          <strong>{c.name || c.key.slice(0, 8)}</strong>
          <div class="sub">{contactTypeLabel(c.type)}{c.lastAdvert ? ` · ${ago(c.lastAdvert * 1000)}` : ''}</div>
        </a>)}
      </>}
      {mode.value === 'tinkerer' && repeaters.length > 0 && <>
        <h3 style="margin:1.4rem 0 .4rem;font-size:.95rem;color:var(--muted)">{t('type_repeater')}</h3>
        {repeaters.map(c => <a class="item" key={c.key} href={`#/contacts/${c.key}`}>
          <strong>{c.name || c.key.slice(0, 8)}</strong>
          <div class="sub">{contactTypeLabel(c.type)}{c.lastAdvert ? ` · ${ago(c.lastAdvert * 1000)}` : ''}</div>
        </a>)}
      </>}
    </div>
  </>
}

function Detail({ id }: { id: string }) {
  const c = useLive(() => db.contacts.get(id), [id])
  if (!c) return <p><a href="#/contacts">← {t('contacts_title')}</a></p>
  return <>
    <p><a href="#/contacts">← {t('contacts_title')}</a></p>
    <h2>{c.name}</h2>
    <div class="card">
      <div>{contactTypeLabel(c.type)}</div>
      {c.lastAdvert > 0 && <div class="muted">{ago(c.lastAdvert * 1000)}</div>}
      {(c.lat || c.lon) ? <div class="muted">{c.lat.toFixed(4)}, {c.lon.toFixed(4)}</div> : null}
    </div>
    {c.type === 1 && <a class="btn big" style="display:block;text-align:center;text-decoration:none" href={`#/chat/dm:${c.key.slice(0, 12)}`}>{t('contact_message')}</a>}
    {mode.value === 'tinkerer' && <Contact_Tinkerer contact={c} />}
  </>
}
