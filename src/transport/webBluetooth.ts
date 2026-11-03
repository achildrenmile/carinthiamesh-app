import { BLE } from '../protocol/constants'
import type { Transport } from './transport'

export class WebBluetoothTransport implements Transport {
  readonly kind = 'web-bluetooth' as const
  private device?: BluetoothDevice
  private rx?: BluetoothRemoteGATTCharacteristic
  private frameCb: (f: Uint8Array) => void = () => {}
  private discCb: () => void = () => {}

  static isSupported() { return typeof navigator !== 'undefined' && 'bluetooth' in navigator }

  async connect() {
    if (!WebBluetoothTransport.isSupported()) throw new Error('Web Bluetooth nicht verfügbar')
    this.device = await navigator.bluetooth.requestDevice({ filters: [{ services: [BLE.service] }] })
    this.device.addEventListener('gattserverdisconnected', () => this.discCb())
    const server = await this.device.gatt!.connect()
    const service = await server.getPrimaryService(BLE.service)
    this.rx = await service.getCharacteristic(BLE.rx)
    const tx = await service.getCharacteristic(BLE.tx)
    tx.addEventListener('characteristicvaluechanged', ev => {
      const v = (ev.target as BluetoothRemoteGATTCharacteristic).value!
      // Kopie: der Puffer gehört dem Browser und kann wiederverwendet werden.
      this.frameCb(new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)))
    })
    await tx.startNotifications()
  }

  async disconnect() { this.device?.gatt?.disconnect() }
  async send(frame: Uint8Array) { await this.rx!.writeValueWithResponse(frame as BufferSource) }
  onFrame(cb: (f: Uint8Array) => void) { this.frameCb = cb }
  onDisconnect(cb: () => void) { this.discCb = cb }
  get deviceName() { return this.device?.name }
}
