/** Little-endian Lesezugriff auf einen Frame. Wirft bei Unterlauf, statt Müll zu liefern. */
export class Reader {
  private view: DataView
  pos = 0
  constructor(readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  get remaining() { return this.bytes.length - this.pos }
  private need(n: number) {
    if (this.remaining < n) throw new RangeError(`Frame zu kurz: ${n} Byte benötigt, ${this.remaining} übrig`)
  }
  u8() { this.need(1); return this.view.getUint8(this.pos++) }
  i8() { this.need(1); return this.view.getInt8(this.pos++) }
  u16() { this.need(2); const v = this.view.getUint16(this.pos, true); this.pos += 2; return v }
  u32() { this.need(4); const v = this.view.getUint32(this.pos, true); this.pos += 4; return v }
  i32() { this.need(4); const v = this.view.getInt32(this.pos, true); this.pos += 4; return v }
  take(n: number) { this.need(n); const v = this.bytes.slice(this.pos, this.pos + n); this.pos += n; return v }
  rest() { return this.take(this.remaining) }
  /** Feld fester Länge, UTF-8, bei erstem Nullbyte abgeschnitten. */
  cstr(n: number) {
    const raw = this.take(n)
    const end = raw.indexOf(0)
    return new TextDecoder().decode(end < 0 ? raw : raw.subarray(0, end))
  }
}

export const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
