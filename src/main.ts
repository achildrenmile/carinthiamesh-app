import { Client } from './client'
import { parseLpp } from './protocol/cayenne'
import { toHex } from './protocol/reader'
import type { Contact, DeviceInfo } from './protocol/frames'
import { WebBluetoothTransport } from './transport/webBluetooth'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const logEl = $('log')
const log = (...a: unknown[]) => {
  logEl.textContent += `${new Date().toISOString().slice(11, 23)} ${a.map(x => typeof x === 'string' ? x : JSON.stringify(x, (_, v) => v instanceof Uint8Array ? toHex(v) : v)).join(' ')}\n`
  logEl.scrollTop = logEl.scrollHeight
}

// Umgebungserkennung: Safari/iOS-Standardbrowser hat kein Web Bluetooth -> auf Bluefy hinweisen.
const ua = navigator.userAgent
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
$('env').textContent = WebBluetoothTransport.isSupported()
  ? `Web Bluetooth verfügbar · ${ua}`
  : isIOS
    ? 'Dieser Browser unterstützt kein Web Bluetooth. Auf iPhone/iPad bitte Bluefy verwenden.'
    : 'Web Bluetooth nicht verfügbar. Bitte Chrome oder Edge nutzen.'

let client: Client
let device: DeviceInfo
let contacts: Contact[] = []
let rxCount = 0
const enable = () => ['time', 'lists', 'telemetry'].forEach(id => ($<HTMLButtonElement>(id).disabled = false))
const guard = (fn: () => Promise<void>) => async () => { try { await fn() } catch (e) { log('FEHLER', String(e)) } }

$('connect').onclick = guard(async () => {
  const t = new WebBluetoothTransport()
  t.onDisconnect(() => log('Verbindung getrennt'))
  await t.connect()
  log('BLE verbunden', t.deviceName ?? '')
  client = new Client(t)
  client.onRaw = (dir, b) => log(dir === 'tx' ? '→' : '←', toHex(b))
  client.onPush(f => {
    if (f.kind === 'logRx') {
      rxCount++
      $('rxcount').textContent = String(rxCount)
      $('rxlog').textContent = `SNR ${f.data.snr} dB, RSSI ${f.data.rssi} dBm, ${f.data.raw.length} Byte`
    } else if (f.kind === 'telemetry') {
      log('TELEMETRIE von', toHex(f.data.pubKeyPrefix), parseLpp(f.data.lpp))
    } else log('PUSH', f)
  })
  const { self, device: d } = await client.start()
  device = d
  log('SELF_INFO', self)
  log('DEVICE_INFO', d)
  enable()
})

$('time').onclick = guard(async () => log('Zeit', await client.syncTime()))

$('lists').onclick = guard(async () => {
  contacts = await client.contacts()
  log(`${contacts.length} Kontakte`, contacts.map(c => ({ name: c.name, type: c.type, key: toHex(c.publicKey).slice(0, 12), pathLen: c.outPathLen })))
  log('Kanäle', (await client.channels(device.maxChannels ?? 1)).map(c => ({ idx: c.index, name: c.name })))
})

$('telemetry').onclick = guard(async () => {
  const target = contacts.find(c => c.type === 2) // 2 = Repeater
  if (!target) return log('Kein Repeater in der Kontaktliste – erst „Kontakte“ laden.')
  log('Telemetrie-Anfrage an', target.name, await client.requestTelemetry(target.publicKey))
})

$('copy').onclick = () => navigator.clipboard.writeText(logEl.textContent ?? '')
