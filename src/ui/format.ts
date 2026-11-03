import { t } from '../i18n'

export function ago(ts: number, now = Date.now()): string {
  const m = Math.floor((now - ts) / 60000)
  if (m < 1) return t('just_now')
  if (m < 60) return t('minutes_ago', { n: m })
  return t('hours_ago', { n: Math.floor(m / 60) })
}
export const contactTypeLabel = (type: number) =>
  type === 1 ? t('type_chat') : type === 2 ? t('type_repeater') : type === 3 ? t('type_room') : t('type_other')
export const hops = (pathLen: number | undefined) =>
  pathLen == null ? '' : pathLen === 255 ? t('chat_hops_direct') : t('chat_hops', { n: pathLen & 63 })
