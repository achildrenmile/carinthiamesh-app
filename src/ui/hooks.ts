import { liveQuery } from 'dexie'
import { useEffect, useState } from 'preact/hooks'

/** Dexie-liveQuery als Hook: rendert neu, sobald sich die Daten ändern. */
export function useLive<T>(query: () => Promise<T> | T, deps: unknown[] = [], initial?: T): T | undefined {
  const [value, setValue] = useState<T | undefined>(initial)
  useEffect(() => {
    const sub = liveQuery(query).subscribe({ next: setValue, error: e => console.error('liveQuery', e) })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

export function download(name: string, mime: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
