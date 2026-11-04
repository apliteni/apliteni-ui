/* The rig behind stories/table-edge-shade.test.js: a PNG reader for screenshots, and
 * the phone containment reading. Nothing is asserted here. The gate next door does the
 * asserting. Same shape as stories/lib/tap-zone.js.
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

/** What a page at a phone width reads: how wide the document is against the
 *  viewport, and each table scroll frame's own width and scroll range. */
export const PHONE_FIT = () => ({
  view: window.innerWidth,
  page: document.documentElement.scrollWidth,
  frames: [...document.querySelectorAll('.ui-table-scroll')].map((f) => ({
    width: f.clientWidth,
    range: f.scrollWidth - f.clientWidth,
    spare: f.scrollWidth - Math.ceil(f.querySelector('.ui-table')?.getBoundingClientRect().width ?? f.scrollWidth),
  })),
});

/** What is wrong with one PHONE_FIT reading, as lines: a page wider than the screen,
 *  a frame that scrolls past its table, or, where the story must scroll, a frame the
 *  table does not scroll inside. */
export const phoneFitFindings = (fit, mustScroll = false) => [
  ...(fit.page > fit.view ? [`the page is ${fit.page}px wide on a ${fit.view}px screen`] : []),
  ...(fit.frames.length ? [] : ['no table scroll frame on the page']),
  ...(mustScroll ? fit.frames : []).filter((f) => f.range <= 0).map((f) => `a ${f.width}px frame has no scroll range`),
  ...fit.frames.filter((f) => f.spare > 1).map((f) => `a frame scrolls ${f.spare}px past its table`),
];

/** The mutation the containment check must catch: a frame that does not clip, so
 *  the table widens the page instead of scrolling inside it. */
export const FRAME_UNCLIPPED = '.ui-table-scroll { overflow: visible !important; }';
/** A frame whose min-content is its table's, so the table widens the card and the page. */
export const FRAME_FLOORLESS = '.ui-table-scroll { display: block !important; }';

/** The two #770 defects, put back. A frame under a header that does not stick is not the
 *  containing block of its screen-reader label, so the label widens the page. A closed
 *  tooltip keeps its box, so the frame scrolls past its table. */
export const LABEL_ESCAPES = '.ui-table-scroll, .ui-table-scroll th { position: static !important; }';
export const CLOSED_TIP_BOX = '.ui-tip:not(.is-open) { display: flex !important; }';

/** A card's table frame, focused by keyboard or at rest: its box, its corner radius,
 *  its ring colour, the card's ground and the room between the table and the frame's
 *  bottom edge. Null when the page has no frame directly in a card. */
export const CARD_FRAME = (focus) => {
  const f = document.querySelector('.ui-card > .ui-table-scroll');
  if (!f) return null;
  if (focus) f.focus({ focusVisible: true });
  else f.blur();
  const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const s = getComputedStyle(f);
  const b = f.getBoundingClientRect();
  return {
    x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height,
    radius: Math.max(...['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map((k) => parseFloat(s[`border${k}Radius`]) || 0)),
    focused: f.matches(':focus-visible'),
    ring: rgb(s.outlineColor),
    ground: rgb(getComputedStyle(f.parentElement).backgroundColor),
    below: b.bottom - f.querySelector('.ui-table').getBoundingClientRect().bottom,
  };
};

/** What is wrong with a card frame in a full-page screenshot, as lines. Focused, each
 *  side's ring band must show the ring colour. At rest, the side bands must show the
 *  card's ground, so no edge line shows. The table must reach the frame's bottom.
 *  Limits: it samples one line 2px in from each edge, every 2px, and skips each corner's
 *  radius plus 4px, where the curve leaves the line. A tolerance of 40 per channel
 *  takes the ring's anti-aliasing and no other colour. */
export function cardFrameFindings(img, frame) {
  const out = [];
  if (frame.below > 0.5) out.push(`the frame has ${frame.below}px below its table`);
  const want = frame.focused ? frame.ring : frame.ground;
  const near = (p) => p.every((v, i) => Math.abs(v - want[i]) <= (frame.focused ? 40 : 2));
  const skip = frame.radius + 4;
  const along = (from, to) => { const at = []; for (let v = from + skip; v < to - skip; v += 2) at.push(v); return at; };
  const sides = {
    left: along(frame.y, frame.y + frame.h).map((y) => [frame.x + 2, y]),
    right: along(frame.y, frame.y + frame.h).map((y) => [frame.x + frame.w - 2.5, y]),
    ...(frame.focused ? {
      top: along(frame.x, frame.x + frame.w).map((x) => [x, frame.y + 2]),
      bottom: along(frame.x, frame.x + frame.w).map((x) => [x, frame.y + frame.h - 2.5]),
    } : {}),
  };
  for (const [side, points] of Object.entries(sides)) {
    const miss = points.filter(([x, y]) => !near(pixelAt(img, x, y))).length;
    if (miss) out.push(`${frame.focused ? 'focused' : 'at rest'}, ${side}: ${miss} of ${points.length} samples are not ${frame.focused ? 'the ring' : "the card's ground"}`);
  }
  return out;
}

/** The three defects the card frame check must catch: a frame with no bands, which lets
 *  the sticky header cover the ring, a band that paints a line at rest, and a band below
 *  the table. */
export const FRAME_BANDLESS = '.ui-card > .ui-table-scroll { border-width: 0 !important; }';
export const FRAME_EDGE_LINE = '.ui-card > .ui-table-scroll { border-color: var(--border) !important; }';
export const FRAME_GAP_BELOW = '.ui-card > .ui-table-scroll { border-bottom-width: var(--space-1) !important; }';
