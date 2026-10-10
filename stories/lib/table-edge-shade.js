/* The rig behind stories/table-edge-shade.test.js: a scrolled table in front of a
 * real browser, read twice — once with the kit's shade and once with it stripped —
 * so the difference the two screenshots disagree on is the shade itself and nothing
 * the fixture's own content happens to paint underneath it. Nothing is asserted
 * here; the gate next door does the asserting. Same shape as stories/lib/tap-zone.js.
 */
import zlib from 'node:zlib';

/** A PNG screenshot buffer, decoded to raw RGBA. Playwright ships no pixel reader of
 * its own and image libraries are deliberately not a dependency (AGENTS.md), so this
 * reads the one shape `page.screenshot()` always returns: 8-bit, non-interlaced,
 * truecolour or truecolour+alpha. */
export function decodePNG(buf) {
  let offset = 8; // the eight-byte signature
  let width;
  let height;
  let colorType;
  const idat = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset); offset += 4;
    const type = buf.toString('ascii', offset, offset + 4); offset += 4;
    const data = buf.subarray(offset, offset + len); offset += len;
    offset += 4; // crc
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8) throw new Error(`table-edge-shade: unsupported PNG bit depth ${bitDepth}`);
      if (![2, 6].includes(colorType)) throw new Error(`table-edge-shade: unsupported PNG colour type ${colorType}`);
      if (interlace !== 0) throw new Error('table-edge-shade: an interlaced PNG is not supported');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const plane = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[pos]; pos += 1;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos + x];
      const a = x >= bpp ? plane[rowStart + x - bpp] : 0;
      const b = y > 0 ? plane[rowStart - stride + x] : 0;
      const c = (x >= bpp && y > 0) ? plane[rowStart - stride + x - bpp] : 0;
      let value;
      switch (filterType) {
        case 0: value = rawByte; break;
        case 1: value = rawByte + a; break;
        case 2: value = rawByte + b; break;
        case 3: value = rawByte + Math.floor((a + b) / 2); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = rawByte + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c));
          break;
        }
        default: throw new Error(`table-edge-shade: unknown PNG filter type ${filterType}`);
      }
      plane[rowStart + x] = value & 0xff;
    }
    pos += stride;
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, j = 0; i < plane.length; i += bpp, j += 4) {
    data[j] = plane[i];
    data[j + 1] = plane[i + 1];
    data[j + 2] = plane[i + 2];
    data[j + 3] = bpp === 4 ? plane[i + 3] : 255;
  }
  return { width, height, data };
}

/** The RGB at one pixel of a decoded image. */
export function pixelAt(img, x, y) {
  const i = (Math.round(y) * img.width + Math.round(x)) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

/** How much darker `after` reads than `before`, averaged over the three channels.
 *  Negative means `after` reads lighter, which is the dark theme's own direction —
 *  ink has nowhere to go on a near-black page, so the shade is answered by lightening
 *  instead (docs/foundations.md#colour-and-contrast). */
export const darkening = (before, after) =>
  ((before[0] - after[0]) + (before[1] - after[1]) + (before[2] - after[2])) / 3;

/** The CSS mutation that answers "what if the shade were not drawn": every mechanism
 *  — the right sticky pseudo, the left one this PR adds, and an engine too old for
 *  either that falls back to the radial pair — reads its colour from this one
 *  custom property, so forcing it transparent takes every one of them out at once
 *  without touching layout. */
export const STRIP_SHADE = '.ui-table-scroll { --table-edge: transparent !important; }';

const IDS = ['po_1TnpIsGmSZjqJIroiJNJ2tRz', 'po_1TnSuaGmSZjqJIroOzd7Mc6L', 'po_1TmNmjGmSZjqJIro7lHBO3ix'];
const COLUMNS = Array.from({ length: 6 }, (_, i) => `Payout ID ${i}`);

/** A sticky-header table wide enough that neither edge is ever reached at the
 *  measuring scroll position: unbreakable payout IDs, not a declared width, because
 *  a declared width on `.ui-table` loses to the kit's own `width: 100%` and renders
 *  no overflow at all — the same reason the galleries never write one by hand. */
export function fixtureHTML(theme, css) {
  const rows = [0, 1, 2]
    .map((r) => `<tr>${COLUMNS.map((_, i) => `<td>${IDS[(r + i) % IDS.length]}</td>`).join('')}</tr>`)
    .join('');
  return `<!doctype html><html lang="en" data-theme="${theme}"><head><style>`
    + 'html,body{margin:0;padding:0}#wrap{width:320px;margin:40px}'
    + `</style><style>${css}</style></head><body>`
    + '<div id="wrap"><div class="ui-table-scroll" tabindex="0" style="max-height:140px">'
    + `<table class="ui-table ui-table--sticky"><thead><tr>${COLUMNS.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`
    + `<tbody>${rows}</tbody></table></div></div></body></html>`;
}

/** Scrolled to the middle of its range, so columns remain on both sides and
 *  neither edge has been reached — the state docs/components.md promises a shade
 *  on. Returns the viewport geometry the caller needs to find row and edge pixels. */
export const CENTER_SCROLL = () => {
  const el = document.querySelector('.ui-table-scroll');
  el.scrollLeft = Math.round((el.scrollWidth - el.clientWidth) / 2);
  return { clientWidth: el.clientWidth, scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth };
};

/** Pixel coordinates of the four readings the gate takes, given the fixture's own
 *  40px margin and the scroller's measured width. 6px in from either edge sits
 *  inside the 12px (--space-3) shade band and outside the scroller's own 4px
 *  (--space-1) content padding. 14px and 70px down land on the header row and a
 *  body row respectively, for the `max-height:140px` fixture above. */
export function readingPoints(clientWidth) {
  const left = 40 + 6;
  const right = 40 + clientWidth - 6;
  return {
    'header left': [left, 40 + 14],
    'header right': [right, 40 + 14],
    'body left': [left, 40 + 70],
    'body right': [right, 40 + 70],
  };
}
