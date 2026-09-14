/* Compare two shots by their pixels, because a byte count answers a different
 * question: how many samples differ, by how much, and where. No decoder
 * dependency — this reads what the rig's Chrome writes and nothing else.
 *
 * argv: <a.png> <b.png> [maxDelta]
 * Exits non-zero when any sample differs by more than maxDelta (default 0).
 *
 * why: scripts/evidence/README.md
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** { width, height, channels, data } from a PNG Chrome wrote. */
function decode(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} is not a PNG`);
  let head;
  const idat = [];
  for (let at = 8; at < buf.length;) {
    const len = buf.readUInt32BE(at);
    const kind = buf.toString('ascii', at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      head = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colour: body[9],
        interlace: body[12],
      };
    } else if (kind === 'IDAT') idat.push(body);
    at += len + 12;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[head.colour];
  if (head.depth !== 8 || !channels || head.interlace) {
    throw new Error(`${file}: depth ${head.depth}, colour type ${head.colour}, interlace `
      + `${head.interlace} — this reads what the rig's Chrome writes, and nothing else`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = head.width * channels;
  const out = Buffer.alloc(stride * head.height);
  // Undo the per-row filter. Each row is prefixed by its filter type, and the
  // predictors read the reconstructed bytes rather than the filtered ones.
  for (let y = 0; y < head.height; y++) {
    const type = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let add = 0;
      if (type === 1) add = a;
      else if (type === 2) add = b;
      else if (type === 3) add = (a + b) >> 1;
      else if (type === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
      } else if (type !== 0) throw new Error(`${file}: row ${y} has filter ${type}`);
      out[y * stride + x] = (src[x] + add) & 0xff;
    }
  }
  return { ...head, channels, data: out };
}

const [fileA, fileB, bound = '0'] = process.argv.slice(2);
const a = decode(fileA);
const b = decode(fileB);
if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) {
  console.log(`different frames: ${a.width}x${a.height}x${a.channels} vs ${b.width}x${b.height}x${b.channels}`);
  process.exit(1);
}

let differing = 0;
let max = 0;
const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
for (let i = 0; i < a.data.length; i++) {
  const d = Math.abs(a.data[i] - b.data[i]);
  if (!d) continue;
  differing++;
  if (d > max) max = d;
  const pixel = Math.floor(i / a.channels);
  const x = pixel % a.width;
  const y = Math.floor(pixel / a.width);
  box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
  box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
}

const total = a.data.length;
const where = differing ? ` in x∈[${box.x0},${box.x1}] y∈[${box.y0},${box.y1}]` : '';
console.log(`${differing} of ${total} samples differ, max delta ${max}${where}`);
process.exit(max > Number(bound) ? 1 : 0);
