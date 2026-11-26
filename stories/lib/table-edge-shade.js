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

/** A card's table frame, focused by keyboard or at rest: its box, its corner radii,
 *  its ring colour, the card's ground and the room between the table and the frame's
 *  bottom edge. Null when the page has no frame directly in a card. A light card paints
 *  no fill, so its ground is the first ancestor that paints one. */
export const CARD_FRAME = (focus) => {
  const f = document.querySelector('.ui-card > .ui-table-scroll');
  if (!f) return null;
  if (focus) f.focus({ focusVisible: true });
  else f.blur();
  const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  // The light card is transparent (#850): the page's ground shows through, and a
  // transparent background reads as rgba(0,0,0,0), which the gate would compare
  // against as black. Resolve the real painted ground by walking up to the
  // nearest ancestor that paints a background.
  const painted = (el) => {
    for (let node = el; node; node = node.parentElement) {
      const c = getComputedStyle(node).backgroundColor;
      const parts = c.match(/[\d.]+/g);
      if (!parts) continue;
      const alpha = parts.length > 3 ? Number(parts[3]) : 1;
      if (alpha > 0) return parts.slice(0, 3).map(Number);
    }
    return [0, 0, 0];
  };
  const s = getComputedStyle(f);
  const b = f.getBoundingClientRect();
  return {
    x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height,
    corners: Object.fromEntries(['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map((k) => [k, parseFloat(s[`border${k}Radius`]) || 0])),
    focused: f.matches(':focus-visible'),
    ring: rgb(s.outlineColor),
    // The ring band's size and its inner edge from the border edge, read from the outline
    // the ring tokens draw. The scroll ring is inward, so its offset is negative and the
    // band sits inset-width..inset in from each border edge. why: docs/foundations.md#the-focus-ring
    band: f.matches(':focus-visible') ? { inset: Math.abs(parseFloat(s.outlineOffset) || 0), width: parseFloat(s.outlineWidth) || 0 } : null,
    ground: painted(f.parentElement),
    below: b.bottom - f.querySelector('.ui-table').getBoundingClientRect().bottom,
    range: f.scrollWidth - f.clientWidth,
  };
};

/** What is wrong with a card frame in a full-page screenshot, as lines. Focused, each
 *  side's ring band must show the ring colour. At rest, the side bands must show the
 *  card's ground, so no edge line shows. The table must reach the frame's bottom.
 *  Limits: it samples one line in from each edge, every 2px, and skips each corner's
 *  radius plus 4px, where the curve leaves the line. Focused, it also samples each
 *  rounded corner's arc at the ring band's middle, every 5 degrees, so a cell painted
 *  square over a corner shows (#782). A corner under 4px is not sampled. A tolerance of
 *  40 per channel takes the ring's anti-aliasing and no other colour. */
export function cardFrameFindings(img, frame) {
  const out = [];
  if (frame.below > 0.5) out.push(`the frame has ${frame.below}px below its table`);
  const want = frame.focused ? frame.ring : frame.ground;
  const near = (p) => p.every((v, i) => Math.abs(v - want[i]) <= (frame.focused ? 40 : 2));
  const skip = Math.max(...Object.values(frame.corners)) + 4;
  const along = (from, to) => { const at = []; for (let v = from + skip; v < to - skip; v += 2) at.push(v); return at; };
  // The ring the frame draws is an inward outline, so its band runs inset-width..inset in
  // from each border edge. It is read from the frame's computed outline — the ring tokens
  // — not a constant, because #885 moved the band from 2px at a 1px gap to 1px at a 2px
  // gap and a constant kept sampling the old place. A 1px band can straddle a pixel
  // boundary, so each sample is the whole band: a side misses only when no pixel across
  // the band is the ring. why: docs/foundations.md#the-focus-ring
  const band = frame.focused ? frame.band : null;
  const across = (edge, sign) => {
    if (!band) return [sign > 0 ? edge + 2 : edge - 2.5];
    const inner = band.inset;              // the band's inner edge, in from the border edge
    const outer = band.inset - band.width; // its outer edge
    const lo = sign > 0 ? edge + outer : edge - inner;
    const hi = sign > 0 ? edge + inner : edge - outer;
    const idx = [];
    for (let i = Math.round(lo); i < Math.round(hi); i += 1) idx.push(i);
    return idx.length ? idx : [Math.round(lo)];
  };
  const strips = {
    left: along(frame.y, frame.y + frame.h).map((y) => across(frame.x, 1).map((x) => [x, y])),
    right: along(frame.y, frame.y + frame.h).map((y) => across(frame.x + frame.w, -1).map((x) => [x, y])),
    ...(frame.focused ? {
      top: along(frame.x, frame.x + frame.w).map((x) => across(frame.y, 1).map((y) => [x, y])),
      bottom: along(frame.x, frame.x + frame.w).map((x) => across(frame.y + frame.h, -1).map((y) => [x, y])),
    } : {}),
  };
  if (frame.focused) {
    const { x, y, w, h } = frame;
    const at = { TopLeft: [x, y, -1, -1], TopRight: [x + w, y, 1, -1], BottomLeft: [x, y + h, -1, 1], BottomRight: [x + w, y + h, 1, 1] };
    for (const [corner, r] of Object.entries(frame.corners)) {
      if (r < 4) continue;
      const [cx, cy, dx, dy] = at[corner];
      const mid = band ? band.inset - band.width / 2 : 2;
      const groups = [];
      // The band is 1px and curves here, so its solid pixels step along the diagonal
      // rather than one pixel per angle. Each sample is a 5x5 box at the band's middle;
      // the corner misses only when none of the twenty-five pixels is the ring.
      for (let a = 5; a <= 85; a += 5) {
        const t = (a * Math.PI) / 180;
        const px = cx - dx * r + dx * (r - mid) * Math.cos(t);
        const py = cy - dy * r + dy * (r - mid) * Math.sin(t);
        const cands = [];
        for (let oy = -2; oy <= 2; oy += 1) {
          for (let ox = -2; ox <= 2; ox += 1) cands.push([px + ox, py + oy]);
        }
        groups.push(cands);
      }
      strips[`the ${corner.replace(/([a-z])([A-Z])/, '$1 $2').toLowerCase()} corner`] = groups;
    }
  }
  for (const [side, groups] of Object.entries(strips)) {
    const miss = groups.filter((pts) => !pts.some(([x, y]) => near(pixelAt(img, x, y)))).length;
    if (miss) out.push(`${frame.focused ? 'focused' : 'at rest'}, ${side}: ${miss} of ${groups.length} samples are not ${frame.focused ? 'the ring' : "the card's ground"}`);
  }
  return out;
}

/** The four defects the card frame check must catch: a frame with no bands, which lets
 *  the sticky header cover the ring, a frame with no top band, which lets the header
 *  paint square over the ring's top corners, a band that paints a line at rest, and a
 *  band below the table. */
export const FRAME_BANDLESS = '.ui-card > .ui-table-scroll { border-width: 0 !important; }';
export const FRAME_TOPLESS = '.ui-card > .ui-table-scroll { border-top-width: 0 !important; }';
export const FRAME_EDGE_LINE = '.ui-card > .ui-table-scroll { border-color: var(--border) !important; }';
export const FRAME_GAP_BELOW = '.ui-card > .ui-table-scroll { border-bottom-width: var(--space-1) !important; }';
