import * as C from './protocol/commands'
import { appStart, deviceQuery, getChannel, getContacts, getDeviceTime, setDeviceTime, telemetryReq } from './protocol/commands'
import { type ChannelInfo, type ChannelMsg, type ContactMsg, type Contact, type DeviceInfo, type Frame, type SelfInfo, isPush, parseFrame } from './protocol/frames'

import type { Transport } from './transport/transport'

const TIMEOUT_MS = 5000

type Pending = { accept: (f: Frame) => 'done' | 'more' | 'skip'; resolve: (f: Frame[]) => void; reject: (e: Error) => void; frames: Frame[]; timer: number }

/**
 * Companion-Client: genau ein Befehl gleichzeitig (Doku + GATT erlauben nichts anderes),
 * Pushes (>= 0x80) laufen getrennt über onPush und werden nie als Antwort gewertet.
 */
export class Client {
  private pending?: Pending
  private chain: Promise<unknown> = Promise.resolve()
  private pushCbs: Array<(f: Frame) => void> = []
  onRaw: (dir: 'tx' | 'rx', bytes: Uint8Array) => void = () => {}

  constructor(private t: Transport) {
    t.onFrame(raw => this.handle(raw))
  }

  onPush(cb: (f: Frame) => void) { this.pushCbs.push(cb) }

  private handle(raw: Uint8Array) {
    this.onRaw('rx', raw)
    let frame: Frame
    try { frame = parseFrame(raw) } catch (e) { frame = { kind: 'unknown', code: raw[0] ?? -1, payload: raw } }
    if (isPush(raw)) { this.pushCbs.forEach(cb => cb(frame)); return }
    const p = this.pending
    if (!p) { this.pushCbs.forEach(cb => cb(frame)); return } // unerwartete Antwort sichtbar machen
    const verdict = p.accept(frame)
    if (verdict === 'skip') return
    p.frames.push(frame)
    if (verdict === 'done') { clearTimeout(p.timer); this.pending = undefined; p.resolve(p.frames) }
  }

  /** Sendet einen Befehl und sammelt Antwortframes, bis `isLast` true liefert. */
  private request(cmd: Uint8Array, isLast: (f: Frame) => boolean = () => true): Promise<Frame[]> {
    const run = () => new Promise<Frame[]>((resolve, reject) => {
      const timer = window.setTimeout(() => { this.pending = undefined; reject(new Error(`Timeout bei Befehl ${cmd[0]}`)) }, TIMEOUT_MS)
      this.pending = { accept: f => (f.kind === 'err' || isLast(f) ? 'done' : 'more'), resolve, reject, frames: [], timer }
      this.onRaw('tx', cmd)
      this.t.send(cmd).catch(e => { clearTimeout(timer); this.pending = undefined; reject(e) })
    })
    const next = this.chain.then(run, run)
    this.chain = next.catch(() => {})
    return next
  }

  private async one<K extends Frame['kind']>(cmd: Uint8Array, kind: K): Promise<Extract<Frame, { kind: K }>> {
    const [f] = await this.request(cmd, x => x.kind === kind)
    if (f?.kind === 'err') throw new Error(`Gerät meldet Fehler ${f.code}`)
    return f as Extract<Frame, { kind: K }>
  }

  async start(): Promise<{ self: SelfInfo; device: DeviceInfo }> {
    const self = (await this.one(appStart(), 'selfInfo')).info
    const device = (await this.one(deviceQuery(), 'deviceInfo')).info
    return { self, device }
  }

  /** Zeit nur vorwärts: Firmware lehnt secs < aktuelle Gerätezeit mit ILLEGAL_ARG ab. */
  async syncTime(): Promise<{ deviceBefore: number; result: 'set' | 'device-ahead' }> {
    const deviceBefore = (await this.one(getDeviceTime(), 'currTime')).epoch
    const [r] = await this.request(setDeviceTime(Math.floor(Date.now() / 1000)))
    return { deviceBefore, result: r?.kind === 'ok' ? 'set' : 'device-ahead' }
  }

  async contacts(): Promise<Contact[]> {
    const frames = await this.request(getContacts(), f => f.kind === 'endOfContacts')
    return frames.flatMap(f => (f.kind === 'contact' ? [f.contact] : []))
  }

  async channels(max: number): Promise<ChannelInfo[]> {
    const out: ChannelInfo[] = []
    for (let i = 0; i < max; i++) {
      const [f] = await this.request(getChannel(i), x => x.kind === 'channelInfo')
      if (f?.kind === 'channelInfo') out.push(f.channel)
      else if (f?.kind === 'err' && f.code === 2) continue // Slot leer
      else break
    }
    return out
  }

  /** Quittung (Sent) kommt synchron; die eigentliche Antwort als Push 0x8B über onPush. */
  async requestTelemetry(pubKey: Uint8Array) {
    return (await this.one(telemetryReq(pubKey), 'sent')).sent
  }

  async batteryMv(): Promise<number> {
    const f = await this.one(C.getBattAndStorage(), 'battery')
    return f.millivolts
  }

  /** Führt einen Befehl aus, der mit OK/Sent/Fehler antwortet. Wirft bei Fehlerantwort. */
  async exec(cmd: Uint8Array): Promise<Frame> {
    const [f] = await this.request(cmd, x => x.kind === 'ok' || x.kind === 'sent')
    if (f?.kind === 'err') throw new Error(`Gerät meldet Fehler ${f.code}`)
    return f!
  }

  /** Holt die nächste wartende Nachricht; null wenn die Warteschlange leer ist. */
  async nextMessage(): Promise<{ kind: 'contact'; msg: ContactMsg } | { kind: 'channel'; msg: ChannelMsg } | null> {
    const [f] = await this.request(C.syncNextMessage(), x => x.kind === 'contactMsg' || x.kind === 'channelMsg' || x.kind === 'noMoreMessages')
    if (!f || f.kind === 'noMoreMessages') return null
    if (f.kind === 'contactMsg') return { kind: 'contact', msg: f.msg }
    if (f.kind === 'channelMsg') return { kind: 'channel', msg: f.msg }
    if (f.kind === 'err') throw new Error(`Gerät meldet Fehler ${f.code}`)
    return null
  }

  sendChannelMessage(idx: number, text: string) { return this.exec(C.sendChannelMsg(idx, text, Math.floor(Date.now() / 1000))) }
  sendDirectMessage(pubKey: Uint8Array, text: string) { return this.exec(C.sendDirectMsg(pubKey, text, Math.floor(Date.now() / 1000))) }
  setName(name: string) { return this.exec(C.setAdvertName(name)) }
  setRadio(freqMHz: number, bwKHz: number, sf: number, cr: number) { return this.exec(C.setRadioParams(freqMHz, bwKHz, sf, cr)) }
  setTxPower(dbm: number) { return this.exec(C.setTxPower(dbm)) }
  setPosition(lat: number, lon: number) { return this.exec(C.setAdvertLatLon(lat, lon)) }
  setChannel(idx: number, name: string, secret: Uint8Array) { return this.exec(C.setChannel(idx, name, secret)) }
  advert(flood: boolean) { return this.exec(C.sendSelfAdvert(flood)) }
  login(pubKey: Uint8Array, password: string) { return this.exec(C.sendLogin(pubKey, password)) }
  /** Reboot hat keine Antwort – das Gerät trennt die Verbindung. */
  async reboot() { this.onRaw('tx', C.reboot()); await this.t.send(C.reboot()) }
  /** Repeater-CLI: Textnachricht Typ CLI_DATA (1) an einen eingeloggten Repeater; Antwort kommt als Kontakt-Nachricht. */
  repeaterCli(pubKey: Uint8Array, cmd: string) { return this.exec(C.sendDirectMsg(pubKey, cmd, Math.floor(Date.now() / 1000), 0, 1)) }
}
