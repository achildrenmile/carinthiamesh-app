export interface Preset {
  id: string; name: { de: string; en: string }
  radio: { freqMHz: number | null; bwKHz: number | null; sf: number | null; cr: number | null; txPowerDbm: number | null }
  channels: Array<{ name: string; secretHex?: string; hashtag?: boolean }>
  pathHashMode?: number | null   // 0 = 1 Byte, 1 = 2 Byte, 2 = 3 Byte
  multiAcks?: number | null      // 0 oder 1 zusätzliche ACKs
  iata: string | null
  brokerHost?: string
}
export type RadioPreset = Preset['radio']

export const radioComplete = (r: RadioPreset): r is { [K in keyof RadioPreset]: number } =>
  r.freqMHz != null && r.bwKHz != null && r.sf != null && r.cr != null

export async function loadPreset(id = 'at'): Promise<Preset> {
  const res = await fetch(`${import.meta.env.BASE_URL}presets/${id}.json`)
  if (!res.ok) throw new Error(`Preset ${id} nicht ladbar (${res.status})`)
  return res.json()
}

export const hexToBytes = (hex: string) => {
  const clean = hex.replace(/\s+/g, '')
  if (!/^([0-9a-fA-F]{2})+$/.test(clean)) throw new Error('Ungültiger Hex-String')
  return Uint8Array.from(clean.match(/../g)!, h => parseInt(h, 16))
}

/** Kanalschlüssel eines Preset-Kanals: explizit als Hex oder (bei #Hashtag) erste 16 Byte SHA-256 des Namens. */
export async function channelSecret(c: Preset['channels'][number]): Promise<Uint8Array> {
  if (c.secretHex) { const b = hexToBytes(c.secretHex); if (b.length !== 16) throw new Error(`Kanal ${c.name}: Schlüssel muss 16 Byte haben`); return b }
  if (c.hashtag) return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(c.name))).slice(0, 16)
  throw new Error(`Kanal ${c.name}: weder secretHex noch hashtag angegeben`)
}
