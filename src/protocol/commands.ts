import { Cmd } from './constants'

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
