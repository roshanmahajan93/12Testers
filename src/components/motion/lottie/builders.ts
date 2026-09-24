/**
 * Original Lottie animations generated in code so they can be tinted per role at runtime.
 * Kept intentionally small: a few shape layers each. Coordinates are in a 200×200 canvas.
 */

type RGBA = [number, number, number, number];
type Json = Record<string, unknown>;

export function hexToRgba(hex: string, alpha = 1): RGBA {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

const still = (k: unknown) => ({ a: 0, k });
const ease = { o: { x: [0.33], y: [0] }, i: { x: [0.2], y: [1] } };
const overshoot = { o: { x: [0.3], y: [0] }, i: { x: [0.2], y: [1.35] } };

function anim(frames: { t: number; s: number[] }[], curve = ease): Json {
  return {
    a: 1,
    k: frames.map((f, idx) => (idx === frames.length - 1 ? { t: f.t, s: f.s } : { t: f.t, s: f.s, ...curve })),
  };
}

function transform(extra: Partial<Record<'p' | 's' | 'o' | 'r', Json>> = {}): Json {
  return {
    o: extra.o ?? still(100),
    r: extra.r ?? still(0),
    p: extra.p ?? still([100, 100, 0]),
    a: still([0, 0, 0]),
    s: extra.s ?? still([100, 100, 100]),
  };
}

const groupTransform = { ty: 'tr', p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100) };

function layer(ind: number, nm: string, shapes: Json[], ks: Json, op: number): Json {
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ks, ao: 0, shapes, ip: 0, op, st: 0, bm: 0 };
}

function ellipse(size: number, fill?: RGBA, stroke?: { c: RGBA; w: number }, offset: [number, number] = [0, 0]): Json {
  const items: Json[] = [{ ty: 'el', p: still(offset), s: still([size, size]) }];
  if (stroke) items.push({ ty: 'st', c: still(stroke.c), o: still(100), w: still(stroke.w), lc: 2, lj: 2 });
  if (fill) items.push({ ty: 'fl', c: still(fill), o: still(100), r: 1 });
  items.push(groupTransform);
  return { ty: 'gr', it: items };
}

function root(nm: string, op: number, layers: Json[]): Json {
  return { v: '5.7.4', fr: 60, ip: 0, op, w: 200, h: 200, nm, ddd: 0, assets: [], layers };
}

/** Circle pops in with overshoot, then a check mark draws itself. */
export function successAnimation(accent: string, onAccent: string): Json {
  const op = 90;
  const check = {
    ty: 'gr',
    it: [
      {
        ty: 'sh',
        ks: still({ i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-28, 2], [-8, 22], [30, -18]], c: false }),
      },
      { ty: 'tm', s: still(0), e: anim([{ t: 18, s: [0] }, { t: 42, s: [100] }]), o: still(0), m: 1 },
      { ty: 'st', c: still(hexToRgba(onAccent)), o: still(100), w: still(13), lc: 2, lj: 2 },
      groupTransform,
    ],
  };
  return root('success', op, [
    layer(1, 'check', [check], transform({ s: anim([{ t: 0, s: [0, 0, 100] }, { t: 22, s: [100, 100, 100] }], overshoot) }), op),
    layer(2, 'disc', [ellipse(116, hexToRgba(accent))], transform({ s: anim([{ t: 0, s: [0, 0, 100] }, { t: 22, s: [100, 100, 100] }], overshoot) }), op),
    layer(
      3,
      'halo',
      [ellipse(116, undefined, { c: hexToRgba(accent, 1), w: 4 })],
      transform({
        s: anim([{ t: 10, s: [100, 100, 100] }, { t: 60, s: [160, 160, 100] }]),
        o: anim([{ t: 10, s: [80] }, { t: 60, s: [0] }]),
      }),
      op,
    ),
  ]);
}

/** A soft card that bobs gently with an orbiting dot — used for empty lists. Loops. */
export function emptyAnimation(accent: string, muted: string): Json {
  const op = 120;
  const card = {
    ty: 'gr',
    it: [
      { ty: 'rc', p: still([0, 0]), s: still([96, 72]), r: still(16) },
      { ty: 'st', c: still(hexToRgba(muted)), o: still(100), w: still(4), lc: 2, lj: 2, d: [{ n: 'd', nm: 'dash', v: still(10) }, { n: 'g', nm: 'gap', v: still(8) }] },
      groupTransform,
    ],
  };
  const bob = anim([
    { t: 0, s: [100, 104, 0] },
    { t: 60, s: [100, 94, 0] },
    { t: 120, s: [100, 104, 0] },
  ]);
  const orbit = anim([
    { t: 0, s: [148, 70, 0] },
    { t: 40, s: [150, 128, 0] },
    { t: 80, s: [52, 132, 0] },
    { t: 120, s: [148, 70, 0] },
  ]);
  return root('empty', op, [
    layer(1, 'dot', [ellipse(16, hexToRgba(accent))], transform({ p: orbit }), op),
    layer(2, 'card', [card], transform({ p: bob }), op),
    layer(3, 'shadow', [ellipse(70, hexToRgba(muted, 0.25))], transform({ p: still([100, 160, 0]), s: still([100, 18, 100]) }), op),
  ]);
}

/** Expanding rings + sparkle dots bursting outward — end-of-day celebration. */
export function celebrateAnimation(a: string, b: string): Json {
  const op = 100;
  const layers: Json[] = [];
  let ind = 1;
  const colors = [a, b];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dx = Math.cos(angle) * 78;
    const dy = Math.sin(angle) * 78;
    layers.push(
      layer(
        ind++,
        `spark${i}`,
        [ellipse(i % 2 ? 10 : 14, hexToRgba(colors[i % 2]!))],
        transform({
          p: anim([{ t: 6, s: [100, 100, 0] }, { t: 46, s: [100 + dx, 100 + dy, 0] }]),
          o: anim([{ t: 6, s: [100] }, { t: 40, s: [100] }, { t: 60, s: [0] }]),
        }),
        op,
      ),
    );
  }
  for (let r = 0; r < 2; r++) {
    layers.push(
      layer(
        ind++,
        `ring${r}`,
        [ellipse(60, undefined, { c: hexToRgba(colors[r]!), w: 6 })],
        transform({
          s: anim([{ t: r * 12, s: [30, 30, 100] }, { t: 50 + r * 12, s: [260, 260, 100] }]),
          o: anim([{ t: r * 12, s: [100] }, { t: 50 + r * 12, s: [0] }]),
        }),
        op,
      ),
    );
  }
  return root('celebrate', op, layers);
}
