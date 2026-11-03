import { MAX_PATH_SIZE, Push, PUB_KEY_SIZE, Resp } from './constants'
import { Reader } from './reader'

export interface SelfInfo {
  advType: number; txPowerDbm: number; maxTxPowerDbm: number; publicKey: Uint8Array
  lat: number; lon: number; multiAcks: number; advLocPolicy: number; telemetryMode: number
  manualAddContacts: number; freqMHz: number; bwKHz: number; sf: number; cr: number; name: string
}
export interface DeviceInfo {
  fwVer: number; maxContacts?: number; maxChannels?: number; blePin?: number
  build?: string; model?: string; version?: string; repeat?: boolean; pathHashMode?: number
}
export interface Contact {
  publicKey: Uint8Array; type: number; flags: number; outPathLen: number; outPath: Uint8Array
  name: string; lastAdvert: number; lat: number; lon: number; lastMod: number
}
export interface ChannelInfo { index: number; name: string; secret: Uint8Array }
export interface LogRxData { snr: number; rssi: number; raw: Uint8Array }
export interface TelemetryPush { pubKeyPrefix: Uint8Array; lpp: Uint8Array }
export interface Sent { flood: boolean; tag: number; timeoutMs: number }

export type Frame =
  | { kind: 'ok'; value?: number }
  | { kind: 'err'; code: number }
  | { kind: 'contactsStart'; count: number }
  | { kind: 'contact'; contact: Contact }
  | { kind: 'endOfContacts'; mostRecentLastMod: number }
  | { kind: 'selfInfo'; info: SelfInfo }
  | { kind: 'sent'; sent: Sent }
  | { kind: 'currTime'; epoch: number }
  | { kind: 'noMoreMessages' }
  | { kind: 'battery'; millivolts: number; usedKb?: number; totalKb?: number }
  | { kind: 'deviceInfo'; info: DeviceInfo }
  | { kind: 'channelInfo'; channel: ChannelInfo }
  | { kind: 'advert'; publicKey: Uint8Array }
  | { kind: 'msgWaiting' }
  | { kind: 'logRx'; data: LogRxData }
  | { kind: 'telemetry'; data: TelemetryPush }
  | { kind: 'unknown'; code: number; payload: Uint8Array }

/** Push-Codes (>= 0x80) kommen unaufgefordert und dürfen nie als Antwort auf einen Befehl gewertet werden. */
export const isPush = (frame: Uint8Array) => (frame[0] ?? 0) >= 0x80

export function parseContact(r: Reader): Contact {
  const publicKey = r.take(PUB_KEY_SIZE)
  const type = r.u8(), flags = r.u8(), outPathLen = r.u8()
  const outPath = r.take(MAX_PATH_SIZE)
  const name = r.cstr(32)
  return {
    publicKey, type, flags, outPathLen, outPath, name,
    lastAdvert: r.u32(), lat: r.i32() / 1e6, lon: r.i32() / 1e6, lastMod: r.u32(),
  }
}

export function parseFrame(bytes: Uint8Array): Frame {
  const r = new Reader(bytes)
  const code = r.u8()
  switch (code) {
    case Resp.Ok: return { kind: 'ok', value: r.remaining >= 4 ? r.u32() : undefined }
    case Resp.Err: return { kind: 'err', code: r.remaining ? r.u8() : 0 }
    case Resp.ContactsStart: return { kind: 'contactsStart', count: r.u32() }
    case Resp.Contact: return { kind: 'contact', contact: parseContact(r) }
    case Resp.EndOfContacts: return { kind: 'endOfContacts', mostRecentLastMod: r.remaining >= 4 ? r.u32() : 0 }
    case Resp.SelfInfo: {
      const advType = r.u8(), txPowerDbm = r.u8(), maxTxPowerDbm = r.u8()
      const publicKey = r.take(PUB_KEY_SIZE)
      const lat = r.i32() / 1e6, lon = r.i32() / 1e6
      const multiAcks = r.u8(), advLocPolicy = r.u8(), telemetryMode = r.u8(), manualAddContacts = r.u8()
      const freqMHz = r.u32() / 1000, bwKHz = r.u32() / 1000
      const sf = r.u8(), cr = r.u8()
      const name = new TextDecoder().decode(r.rest())
      return { kind: 'selfInfo', info: { advType, txPowerDbm, maxTxPowerDbm, publicKey, lat, lon, multiAcks,
        advLocPolicy, telemetryMode, manualAddContacts, freqMHz, bwKHz, sf, cr, name } }
    }
    case Resp.Sent: return { kind: 'sent', sent: { flood: r.u8() === 1, tag: r.u32(), timeoutMs: r.u32() } }
    case Resp.CurrTime: return { kind: 'currTime', epoch: r.u32() }
    case Resp.NoMoreMessages: return { kind: 'noMoreMessages' }
    case Resp.BattAndStorage: {
      const millivolts = r.u16()
      return { kind: 'battery', millivolts, usedKb: r.remaining >= 8 ? r.u32() : undefined,
        totalKb: r.remaining >= 4 ? r.u32() : undefined }
    }
    case Resp.DeviceInfo: {
      const info: DeviceInfo = { fwVer: r.u8() }
      if (info.fwVer >= 3) {
        info.maxContacts = r.u8() * 2; info.maxChannels = r.u8(); info.blePin = r.u32()
        info.build = r.cstr(12); info.model = r.cstr(40); info.version = r.cstr(20)
      }
      if (info.fwVer >= 9 && r.remaining) info.repeat = r.u8() === 1
      if (info.fwVer >= 10 && r.remaining) info.pathHashMode = r.u8()
      return { kind: 'deviceInfo', info }
    }
    case Resp.ChannelInfo: return { kind: 'channelInfo', channel: { index: r.u8(), name: r.cstr(32), secret: r.take(16) } }
    case Push.Advert: return { kind: 'advert', publicKey: r.take(PUB_KEY_SIZE) }
    case Push.MsgWaiting: return { kind: 'msgWaiting' }
    case Push.LogRxData: return { kind: 'logRx', data: { snr: r.i8() / 4, rssi: r.i8(), raw: r.rest() } }
    case Push.TelemetryResponse: {
      r.u8() // reserved
      return { kind: 'telemetry', data: { pubKeyPrefix: r.take(6), lpp: r.rest() } }
    }
    default: return { kind: 'unknown', code, payload: r.rest() }
  }
}
