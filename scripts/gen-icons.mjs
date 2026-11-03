// Genereert dependency-vrije placeholder PWA-icons (paarse achtergrond + witte "SJ").
// Output: packages/frontend/public/{icon-192.png,icon-512.png,favicon.ico}
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../packages/frontend/public')

const BG = [15, 12, 41, 255] // #0f0c29
const FG = [255, 255, 255, 255]

// 5x7 bitmap font voor S en J.
const GLYPHS = {
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
}

function renderRGBA(size) {
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = BG[0]
    buf[i * 4 + 1] = BG[1]
    buf[i * 4 + 2] = BG[2]
    buf[i * 4 + 3] = BG[3]
  }

  // "SJ" gecentreerd tekenen. Letter = 5 cols x 7 rows, 1 col tussenruimte.
  const cols = 5 + 1 + 5
  const rows = 7
  const px = Math.floor((size * 0.62) / cols) // pixelblok-grootte
  const totalW = cols * px
  const totalH = rows * px
  const offsetX = Math.floor((size - totalW) / 2)
  const offsetY = Math.floor((size - totalH) / 2)

  const drawGlyph = (glyph, gx) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 5; c++) {
        if (glyph[r][c] !== '1') continue
        const x0 = offsetX + (gx + c) * px
        const y0 = offsetY + r * px
        for (let yy = 0; yy < px; yy++) {
          for (let xx = 0; xx < px; xx++) {
            const x = x0 + xx
            const y = y0 + yy
            const idx = (y * size + x) * 4
            buf[idx] = FG[0]
            buf[idx + 1] = FG[1]
            buf[idx + 2] = FG[2]
            buf[idx + 3] = FG[3]
          }
        }
      }
    }
  }

  drawGlyph(GLYPHS.S, 0)
  drawGlyph(GLYPHS.J, 6)
  return buf
}

// ── PNG encoding ────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // 10-12 = compression/filter/interlace = 0

  // Scanlines met filter-byte 0 per rij.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ICO die een 32x32 PNG omvat (geldig vanaf Windows Vista).
function encodeIco(png32) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = icon
  header.writeUInt16LE(1, 4) // count
  const entry = Buffer.alloc(16)
  entry[0] = 32 // width
  entry[1] = 32 // height
  entry[2] = 0 // palette
  entry[3] = 0 // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bpp
  entry.writeUInt32LE(png32.length, 8) // size
  entry.writeUInt32LE(6 + 16, 12) // offset
  return Buffer.concat([header, entry, png32])
}

mkdirSync(OUT_DIR, { recursive: true })

const png192 = encodePng(192, renderRGBA(192))
const png512 = encodePng(512, renderRGBA(512))
const png32 = encodePng(32, renderRGBA(32))

writeFileSync(resolve(OUT_DIR, 'icon-192.png'), png192)
writeFileSync(resolve(OUT_DIR, 'icon-512.png'), png512)
writeFileSync(resolve(OUT_DIR, 'favicon.ico'), encodeIco(png32))

console.log('Icons gegenereerd in', OUT_DIR)
