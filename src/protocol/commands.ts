import { Cmd, TxtType } from './constants'

const bytes = (...b: number[]) => Uint8Array.from(b)
const u32le = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b }
const concat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((a, x) => a + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length } return o }

/** APP_START: 1 Byte Code, 7 reservierte Bytes, dann App-Name (Firmware verlangt len >= 8). */
export const appStart = (appName = 'carinthiamesh') =>
  concat(bytes(Cmd.AppStart), new Uint8Array(7), new TextEncoder().encode(appName))
export const deviceQuery = (appTargetVer = 3) => bytes(Cmd.DeviceQuery, appTargetVer)
export const setDeviceTime = (epochSecs: number) => concat(bytes(Cmd.SetDeviceTime), u32le(epochSecs))
export const getDeviceTime = () => bytes(Cmd.GetDeviceTime)
export const getContacts = (since?: number) => since ? concat(bytes(Cmd.GetContacts), u32le(since)) : bytes(Cmd.GetContacts)
export const getChannel = (idx: number) => bytes(Cmd.GetChannel, idx)
export const getBattAndStorage = () => bytes(Cmd.GetBattAndStorage)
/** Telemetrie von Kontakt: Code, 3 reservierte Bytes, 32-Byte-Pubkey. Antwort kommt asynchron als Push 0x8B. */
export const telemetryReq = (pubKey: Uint8Array) => concat(bytes(Cmd.SendTelemetryReq, 0, 0, 0), pubKey)
export const syncNextMessage = () => bytes(Cmd.SyncNextMessage)

const text = (t: string) => new TextEncoder().encode(t)
const fixed = (t: string, n: number) => { const o = new Uint8Array(n); o.set(text(t).slice(0, n - 1)); return o }
const i32le = (n: number) => u32le(n | 0)

export const sendChannelMsg = (idx: number, msg: string, epochSecs: number) =>
  concat(bytes(Cmd.SendChannelTxtMsg, TxtType.Plain, idx), u32le(epochSecs), text(msg))
export const sendDirectMsg = (pubKey: Uint8Array, msg: string, epochSecs: number, attempt = 0, txtType: number = TxtType.Plain) =>
  concat(bytes(Cmd.SendTxtMsg, txtType, attempt), u32le(epochSecs), pubKey.slice(0, 6), text(msg))
export const setAdvertName = (name: string) => concat(bytes(Cmd.SetAdvertName), text(name))
export const setAdvertLatLon = (lat: number, lon: number) =>
  concat(bytes(Cmd.SetAdvertLatLon), i32le(Math.round(lat * 1e6)), i32le(Math.round(lon * 1e6)))
/** freq in MHz, bw in kHz – Firmware erwartet kHz bzw. Hz als u32. */
export const setRadioParams = (freqMHz: number, bwKHz: number, sf: number, cr: number) =>
  concat(bytes(Cmd.SetRadioParams), u32le(Math.round(freqMHz * 1000)), u32le(Math.round(bwKHz * 1000)), bytes(sf, cr))
export const setTxPower = (dbm: number) => bytes(Cmd.SetTxPower, dbm & 0xff)
export const sendSelfAdvert = (flood: boolean) => bytes(Cmd.SendSelfAdvert, flood ? 1 : 0)
/** Kanal-Secret ist immer 16 Byte; Name 32 Byte nullterminiert (Firmware: len >= 2+32+16). */
export const setChannel = (idx: number, name: string, secret: Uint8Array) => {
  if (secret.length !== 16) throw new RangeError('Kanal-Secret muss 16 Byte lang sein')
  return concat(bytes(Cmd.SetChannel, idx), fixed(name, 32), secret)
}
export const sendLogin = (pubKey: Uint8Array, password: string) => concat(bytes(Cmd.SendLogin), pubKey, text(password))
export const sendStatusReq = (pubKey: Uint8Array) => concat(bytes(Cmd.SendStatusReq), pubKey)
export const reboot = () => concat(bytes(Cmd.Reboot), text('reboot'))
