import { lang } from '../data/settings'
import { de } from './de'
import { en } from './en'

const dicts = { de, en } as const
export type Key = keyof typeof de

/** Übersetzt anhand der aktuellen Sprache (Signal => Komponenten rendern bei Wechsel neu). Fällt auf Deutsch zurück. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s: string = (dicts[lang.value] as Record<string, string>)[key] ?? de[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}
