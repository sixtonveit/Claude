// Low-Poly-Grafik im Polytopia-Stil: alles als SVG-Strings, Licht von links oben.

export interface O { x: number; y: number; s: number }
type Pt = [number, number];
const A = 50, B = 25;
const f1 = (n: number) => n.toFixed(1);

export function sh(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export function poly(pts: Pt[], fill: string, extra = ''): string {
  return `<polygon points="${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="${fill}"${extra}/>`;
}
export function rect(x: number, y: number, w: number, h: number, fill: string): string {
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fill}"/>`;
}
export const P = (o: O, u: number, v: number, z = 0): Pt => [o.x + (u - v) * A * o.s, o.y + (u + v) * B * o.s - z * o.s];

export function tile(o: O, i: number, j: number, top: string, opt: { t?: number; z?: number; side?: string } = {}): string {
  const t = opt.t ?? 14, z = opt.z ?? 0, side = opt.side || '#8a5f3a';
  const q = (u: number, v: number, zz: number) => P(o, u, v, zz);
  return poly([q(i - .5, j + .5, z), q(i + .5, j + .5, z), q(i + .5, j + .5, z - t), q(i - .5, j + .5, z - t)], sh(side, .05))
    + poly([q(i + .5, j - .5, z), q(i + .5, j + .5, z), q(i + .5, j + .5, z - t), q(i + .5, j - .5, z - t)], sh(side, -.25))
    + poly([q(i - .5, j - .5, z), q(i + .5, j - .5, z), q(i + .5, j + .5, z), q(i - .5, j + .5, z)], top);
}
export function box(o: O, u0: number, v0: number, u1: number, v1: number, z0: number, z1: number, c: string): string {
  const q = (u: number, v: number, z: number) => P(o, u, v, z);
  return poly([q(u0, v1, z0), q(u1, v1, z0), q(u1, v1, z1), q(u0, v1, z1)], c)
    + poly([q(u1, v0, z0), q(u1, v1, z0), q(u1, v1, z1), q(u1, v0, z1)], sh(c, -.22))
    + poly([q(u0, v0, z1), q(u1, v0, z1), q(u1, v1, z1), q(u0, v1, z1)], sh(c, .22));
}
function gableU(o: O, u0: number, v0: number, u1: number, v1: number, z: number, h: number, c: string, wall: string): string {
  const q = (u: number, v: number, zz: number) => P(o, u, v, zz), vm = (v0 + v1) / 2;
  return poly([q(u0, v0, z), q(u1, v0, z), q(u1, vm, z + h), q(u0, vm, z + h)], sh(c, .15))
    + poly([q(u0, v1, z), q(u1, v1, z), q(u1, vm, z + h), q(u0, vm, z + h)], c)
    + poly([q(u1, v0, z), q(u1, v1, z), q(u1, vm, z + h)], sh(wall, -.22));
}
function gableV(o: O, u0: number, v0: number, u1: number, v1: number, z: number, h: number, c: string, wall: string): string {
  const q = (u: number, v: number, zz: number) => P(o, u, v, zz), um = (u0 + u1) / 2;
  return poly([q(u0, v0, z), q(u0, v1, z), q(um, v1, z + h), q(um, v0, z + h)], sh(c, .15))
    + poly([q(u1, v0, z), q(u1, v1, z), q(um, v1, z + h), q(um, v0, z + h)], sh(c, -.2))
    + poly([q(u0, v1, z), q(u1, v1, z), q(um, v1, z + h)], wall);
}
function pyr(o: O, u0: number, v0: number, u1: number, v1: number, z: number, h: number, c: string): string {
  const q = (u: number, v: number, zz: number) => P(o, u, v, zz), ap = q((u0 + u1) / 2, (v0 + v1) / 2, z + h);
  return poly([q(u0, v1, z), q(u1, v1, z), ap], c) + poly([q(u1, v0, z), q(u1, v1, z), ap], sh(c, -.25));
}
const winL = (o: O, ua: number, ub: number, v: number, za: number, zb: number, c = '#2d3448') => poly([P(o, ua, v, za), P(o, ub, v, za), P(o, ub, v, zb), P(o, ua, v, zb)], c);
const winR = (o: O, u: number, va: number, vb: number, za: number, zb: number, c = '#232a3b') => poly([P(o, u, va, za), P(o, u, vb, za), P(o, u, vb, zb), P(o, u, va, zb)], c);
const tri2 = (x: number, y: number, w: number, h: number, c: string) => poly([[x, y], [x - w / 2, y + h], [x, y + h]], sh(c, .12)) + poly([[x, y], [x + w / 2, y + h], [x, y + h]], sh(c, -.18));

export function tree(o: O, u: number, v: number, k = 1): string {
  k *= o.s; const [x, y] = P(o, u, v);
  return rect(x - 3 * k, y - 12 * k, 6 * k, 12 * k, '#7a4f2e') + tri2(x, y - 46 * k, 30 * k, 26 * k, '#3f9a45') + tri2(x, y - 60 * k, 22 * k, 22 * k, '#4aa84e');
}
export function pine(o: O, u: number, v: number, k = 1): string {
  k *= o.s; const [x, y] = P(o, u, v);
  return rect(x - 2.5 * k, y - 10 * k, 5 * k, 10 * k, '#6b4428') + tri2(x, y - 40 * k, 24 * k, 32 * k, '#2f7f4a') + tri2(x, y - 54 * k, 16 * k, 22 * k, '#368c52');
}
export function mountain(o: O, u: number, v: number, k = 1): string {
  k *= o.s; const [x, y] = P(o, u, v);
  return tri2(x - 18 * k, y - 50 * k, 62 * k, 58 * k, '#8d96a3') + tri2(x + 14 * k, y - 72 * k, 74 * k, 80 * k, '#a3abb6')
    + poly([[x + 14 * k, y - 72 * k], [x + 1 * k, y - 58 * k], [x + 8 * k, y - 54 * k], [x + 14 * k, y - 60 * k]], '#ffffff')
    + poly([[x + 14 * k, y - 72 * k], [x + 27 * k, y - 58 * k], [x + 20 * k, y - 55 * k], [x + 14 * k, y - 60 * k]], '#dfe6ee');
}
export function rows(o: O, i: number, j: number, c: string): string {
  let s = '';
  for (let k = 1; k < 5; k++) {
    const a = P(o, i - .45, j - .5 + k / 5), b = P(o, i + .45, j - .5 + k / 5);
    s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${c}" stroke-width="${3 * o.s}" stroke-linecap="round"/>`;
  }
  return s;
}
export function sheaf(o: O, u: number, v: number, k = 1): string {
  k *= o.s; const [x, y] = P(o, u, v);
  return tri2(x, y - 20 * k, 14 * k, 20 * k, '#e3a92f') + rect(x - 7 * k, y - 11 * k, 14 * k, 3 * k, '#b07a22');
}
export function waves(o: O, i: number, j: number): string {
  const [x, y] = P(o, i, j, -6);
  return `<path d="M${f1(x - 14 * o.s)} ${f1(y)} q${7 * o.s} ${-5 * o.s} ${14 * o.s} 0 t${14 * o.s} 0" fill="none" stroke="#9fe0f5" stroke-width="${2.5 * o.s}" stroke-linecap="round" opacity=".8"/>`;
}

export const TC: Record<string, string> = { grass: '#74c043', field: '#ebc23f', dry: '#b98a52', forest: '#5aa83a', mountain: '#86bd55', sand: '#e9d797', water: '#34a6dc' };
export function terrain(o: O, kind: string, i: number, j: number, seed = 0): string {
  if (kind === 'water') return tile(o, i, j, TC.water, { z: -6, t: 8, side: '#2b7fb3' }) + (seed % 4 === 0 ? waves(o, i, j) : '');
  if (kind === 'sand') return tile(o, i, j, TC.sand, { side: '#b7955f' });
  let s = tile(o, i, j, TC[kind] || TC.grass);
  if (kind === 'field') s += rows(o, i, j, '#d4a52f');
  if (kind === 'dry') s += rows(o, i, j, '#94683b');
  return s;
}

// ---------- Gebäude ----------
function house(o: O, u: number, v: number, c: string, k = 1): string {
  const a = .17 * k;
  return box(o, u - a, v - a, u + a, v + a, 0, 16 * k, '#efe3c8') + winL(o, u - .05, u + .05, v + a, 3, 10 * k, '#6b4a2e') + gableU(o, u - a - .02, v - a - .03, u + a + .02, v + a + .03, 16 * k, 13 * k, c, '#efe3c8');
}
export function village(o: O, u: number, v: number, c: string): string {
  return house(o, u - .18, v - .2, c, .9) + house(o, u + .2, v - .12, c, .8) + house(o, u - .12, v + .2, c, 1);
}
export function manor(o: O, u: number, v: number, c: string): string {
  const w = '#f1e6cf';
  return box(o, u - .3, v - .2, u + .3, v + .2, 0, 28, w) + winL(o, u - .2, u - .1, v + .2, 8, 20) + winL(o, u + .05, u + .15, v + .2, 8, 20) + winR(o, u + .3, v - .08, v + .04, 8, 20)
    + gableU(o, u - .32, v - .23, u + .32, v + .23, 28, 18, c, w) + flag(o, u + .15, v, 44, c);
}
export function mill(o: O, u: number, v: number, c: string): string {
  const [hx, hy] = P(o, u + .12, v + .12, 58);
  const s = box(o, u - .12, v - .12, u + .12, v + .12, 0, 52, '#e8dcc2') + winL(o, u - .03, u + .04, v + .12, 6, 20, '#6b4a2e') + pyr(o, u - .15, v - .15, u + .15, v + .15, 52, 26, c);
  let bl = '';
  for (let r = 0; r < 4; r++) bl += `<g transform="rotate(${r * 90 + 20} ${f1(hx)} ${f1(hy)})">${rect(hx - 2.5 * o.s, hy - 44 * o.s, 5 * o.s, 42 * o.s, '#7a4f2e')}${rect(hx + 2 * o.s, hy - 42 * o.s, 10 * o.s, 30 * o.s, '#f4efe1')}</g>`;
  return s + `<g class="blades">${bl}<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(46 * o.s)}" fill="none"/></g><circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(4 * o.s)}" fill="#5a3a20"/>`;
}
function stall(o: O, u: number, v: number, c: string): string {
  const a = .11;
  return box(o, u - a, v - a, u + a, v + a, 0, 8, '#a8743f') + box(o, u - a + .02, v - a + .02, u - a + .04, v - a + .04, 8, 22, '#7a4f2e') + box(o, u + a - .04, v + a - .04, u + a - .02, v + a - .02, 8, 22, '#7a4f2e') + gableU(o, u - a - .03, v - a - .03, u + a + .03, v + a + .03, 22, 8, c, '#f4efe1');
}
export function market(o: O, u: number, v: number, c: string): string {
  return poly([P(o, u - .42, v - .42, 1), P(o, u + .42, v - .42, 1), P(o, u + .42, v + .42, 1), P(o, u - .42, v + .42, 1)], '#d9cdb0')
    + stall(o, u - .2, v - .2, c) + stall(o, u + .2, v - .18, '#f2b53b') + box(o, u - .06, v - .06, u + .06, v + .06, 0, 7, '#9aa3ad')
    + poly([P(o, u - .04, v - .04, 7), P(o, u + .04, v - .04, 7), P(o, u + .04, v + .04, 7), P(o, u - .04, v + .04, 7)], '#3aa7d9')
    + stall(o, u - .15, v + .22, '#e9566a') + box(o, u + .18, v + .16, u + .28, v + .26, 0, 9, '#c79a5a');
}
export function granary(o: O, u: number, v: number, _c?: string): string {
  let s = '';
  for (const du of [-.25, .25]) for (const dv of [-.15, .15]) s += box(o, u + du - .03, v + dv - .03, u + du + .03, v + dv + .03, 0, 8, '#6b4428');
  return s + box(o, u - .3, v - .2, u + .3, v + .2, 8, 34, '#b07a45') + winL(o, u - .06, u + .06, v + .2, 12, 28, '#5a3a20') + gableU(o, u - .33, v - .24, u + .33, v + .24, 34, 20, '#8a5a32', '#b07a45');
}
function tower(o: O, u: number, v: number, a: number, h: number, c: string, roof: string, rh = 22): string {
  return box(o, u - a, v - a, u + a, v + a, 0, h, c) + winL(o, u - .02, u + .02, v + a, h - 16, h - 7) + pyr(o, u - a - .02, v - a - .02, u + a + .02, v + a + .02, h, rh, roof);
}
export function flag(o: O, u: number, v: number, z: number, c: string): string {
  const [x, y] = P(o, u, v, z);
  return `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(y - 26 * o.s)}" stroke="#5a3a20" stroke-width="${2 * o.s}"/>` + poly([[x, y - 26 * o.s], [x + 18 * o.s, y - 21 * o.s], [x, y - 15 * o.s]], c);
}
export function castle(o: O, u: number, v: number, c: string): string {
  const st = '#c9cdd3';
  let s = tower(o, u - .36, v - .36, .09, 40, st, c);
  s += box(o, u - .36, v - .38, u + .36, v - .32, 0, 26, st) + box(o, u - .38, v - .36, u - .32, v + .36, 0, 26, st);
  s += tower(o, u + .36, v - .36, .09, 40, st, c) + tower(o, u - .36, v + .36, .09, 40, st, c);
  s += box(o, u - .16, v - .16, u + .16, v + .16, 0, 62, '#d6dade') + winL(o, u - .06, u + .06, v + .16, 40, 52) + winR(o, u + .16, v - .06, v + .06, 40, 52) + pyr(o, u - .19, v - .19, u + .19, v + .19, 62, 34, c) + flag(o, u, v, 96, c);
  s += box(o, u - .36, v + .32, u + .36, v + .38, 0, 26, st) + box(o, u + .32, v - .36, u + .38, v + .36, 0, 26, st) + winL(o, u - .06, u + .06, v + .38, 0, 16, '#5a3a20');
  return s + tower(o, u + .36, v + .36, .09, 40, st, c);
}
export function palace(o: O, u: number, v: number, c: string): string {
  const w = '#f1e6cf', g = '#f2b53b';
  let s = box(o, u - .42, v - .42, u - .18, v + .06, 0, 34, w) + gableV(o, u - .44, v - .44, u - .16, v + .08, 34, 14, '#5f6f8f', w);
  s += box(o, u - .3, v - .18, u + .42, v + .18, 0, 44, w);
  for (let k = 0; k < 5; k++) { const uu = u - .24 + k * .13; s += winL(o, uu, uu + .06, v + .18, 14, 32); }
  s += winR(o, u + .42, v - .1, v - .03, 14, 32) + winR(o, u + .42, v + .03, v + .1, 14, 32);
  s += gableU(o, u - .32, v - .2, u + .44, v + .2, 44, 16, '#5f6f8f', w);
  s += box(o, u - .06, v - .06, u + .1, v + .1, 44, 64, w) + pyr(o, u - .09, v - .09, u + .13, v + .13, 64, 26, g) + flag(o, u + .02, v + .02, 90, c);
  s += box(o, u + .18, v + .18, u + .42, v + .42, 0, 34, w) + winL(o, u + .24, u + .36, v + .42, 10, 26) + winR(o, u + .42, v + .24, v + .36, 10, 26) + gableV(o, u + .16, v + .16, u + .44, v + .44, 34, 14, '#5f6f8f', w);
  return s;
}
export function dom(o: O, u: number, v: number, _c?: string): string {
  const w = '#e4ddd0', r = '#7d6b8f';
  let s = box(o, u - .44, v - .16, u + .16, v + .16, 0, 50, w);
  for (let k = 0; k < 4; k++) { const uu = u - .38 + k * .14; s += winL(o, uu, uu + .05, v + .16, 14, 38, '#4b6aa8'); }
  s += gableU(o, u - .46, v - .18, u + .16, v + .18, 50, 30, r, w);
  s += box(o, u - .2, v - .36, u - .02, v + .36, 0, 46, w) + gableV(o, u - .22, v - .38, u, v + .38, 46, 26, r, w);
  for (const vv of [-.28, .2]) s += box(o, u + .16, v + vv, u + .38, v + vv + .12, 0, 92, w) + winR(o, u + .38, v + vv + .03, v + vv + .09, 62, 80, '#4b6aa8') + winL(o, u + .22, u + .32, v + vv + .12, 62, 80, '#4b6aa8') + pyr(o, u + .14, v + vv - .02, u + .4, v + vv + .14, 92, 46, r);
  s += box(o, u + .16, v - .16, u + .38, v + .2, 0, 58, w);
  const [rx, ry] = P(o, u + .38, v + .02, 38);
  s += `<ellipse cx="${f1(rx)}" cy="${f1(ry)}" rx="${f1(8 * o.s)}" ry="${f1(11 * o.s)}" fill="#4b6aa8"/>` + winR(o, u + .38, v - .04, v + .08, 0, 20, '#5a3a20');
  const [cx, cy] = P(o, u + .27, v + .02, 58);
  return s + rect(cx - 1.5 * o.s, cy - 22 * o.s, 3 * o.s, 22 * o.s, '#f2b53b') + rect(cx - 7 * o.s, cy - 16 * o.s, 14 * o.s, 3 * o.s, '#f2b53b');
}
// Baustelle für Palast und Dom (1–3 von 4 Abschnitten)
export function site(o: O, u: number, v: number, p: number, label: string): string {
  const h = 10 + p * 12;
  let s = box(o, u - .32, v - .28, u + .32, v + .28, 0, h, '#e4ddd0');
  for (const [a, b] of [[-.36, -.32], [.36, -.32], [-.36, .32], [.36, .32]]) s += box(o, u + a - .015, v + b - .015, u + a + .015, v + b + .015, 0, h + 20, '#9a6a3c');
  const [x, y] = P(o, u, v, h + 30);
  return s + `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="Fredoka,system-ui" font-weight="700" font-size="${f1(15 * o.s)}" fill="#fff" stroke="#3a2a1a" stroke-width="${f1(3 * o.s)}" paint-order="stroke">${label} ${p}/4</text>`;
}

// ---------- Figuren ----------
export type Role = 'farmer' | 'monk' | 'soldier' | 'merc' | 'noble' | 'kaiser';
export function person(x: number, y: number, k: number, c: string, role: Role, flip = false): string {
  const cl = sh(c, .12), cd = sh(c, -.22), skin = '#f2c6a0', skd = '#dfa982', dk = '#2b2f3a';
  let back = '', g = '', front = '';
  const pants = role === 'monk' ? '#6b4a2e' : '#3b3346';
  if (role === 'kaiser') back += poly([[-17, -38], [17, -38], [22, 0], [-22, 0]], '#b3282d') + poly([[0, -38], [17, -38], [22, 0], [0, 0]], '#951f24');
  if (role === 'noble') back += poly([[-15, -38], [15, -38], [19, -4], [-19, -4]], sh(c, -.35));
  g += rect(-8, -14, 6, 14, pants) + rect(2, -14, 6, 14, sh(pants, -.25));
  if (role === 'monk') g += poly([[-12, -36], [0, -36], [0, 0], [-14, 0]], '#8a6440') + poly([[0, -36], [12, -36], [14, 0], [0, 0]], '#6e4f31') + rect(-12, -20, 24, 3, '#c9a36a');
  else g += poly([[-11, -36], [0, -36], [0, -12], [-11, -12]], role === 'kaiser' ? '#f4efe6' : cl) + poly([[0, -36], [11, -36], [11, -12], [0, -12]], role === 'kaiser' ? '#dcd5c8' : cd);
  if (role === 'kaiser') for (const [a, b] of [[-7, -30], [4, -26], [-5, -20], [6, -17]]) g += rect(a, b, 2, 3, dk);
  if (role === 'soldier') g += `<path d="M-10 -35 L10 -14 M10 -35 L-10 -14" stroke="#f4efe1" stroke-width="2.5"/>`;
  if (role === 'merc') g += rect(-11, -30, 11, 4, '#f2b53b') + rect(0, -22, 11, 4, '#e9566a');
  g += rect(-15, -34, 4, 15, role === 'monk' ? '#8a6440' : cl) + rect(11, -34, 4, 15, role === 'monk' ? '#6e4f31' : cd) + rect(-15, -20, 4, 4, skin) + rect(11, -20, 4, 4, skd);
  g += rect(-10, -56, 10, 20, skin) + rect(0, -56, 10, 20, skd) + rect(-6, -49, 3, 4, dk) + rect(3, -49, 3, 4, dk);
  if (role === 'farmer') {
    front += `<line x1="17" y1="0" x2="17" y2="-52" stroke="#7a4f2e" stroke-width="3"/><path d="M11 -52 V-60 M17 -52 V-62 M23 -52 V-60 M11 -52 H23" stroke="#8a8f99" stroke-width="2.5" fill="none"/>`;
    g += poly([[-17, -55], [17, -55], [12, -60], [-12, -60]], '#e8c66a') + poly([[-8, -60], [8, -60], [7, -67], [-7, -67]], '#d9b04f');
  }
  if (role === 'soldier') {
    front += rect(15, -60, 3, 58, '#6b4428') + `<line x1="16.5" y1="-60" x2="16.5" y2="-76" stroke="#c9cdd3" stroke-width="2"/>`;
    g += poly([[-15, -55], [15, -55], [0, -68]], '#22252e') + poly([[-15, -55], [15, -55], [13, -57], [-13, -57]], '#f2b53b');
  }
  if (role === 'merc') {
    front += `<line x1="18" y1="0" x2="18" y2="-92" stroke="#7a4f2e" stroke-width="3"/>` + poly([[18, -104], [14, -92], [22, -92]], '#c9cdd3');
    g += poly([[-14, -54], [-10, -62], [0, -67], [0, -54]], '#c3cad3') + poly([[0, -67], [10, -62], [14, -54], [0, -54]], '#9aa3ad') + `<circle cx="2" cy="-70" r="4" fill="#e9566a"/><circle cx="-2" cy="-74" r="4" fill="#f2b53b"/>`;
  }
  if (role === 'monk') g += poly([[-12, -36], [-12, -58], [0, -62], [0, -56], [-10, -56], [-10, -36]], '#8a6440') + poly([[0, -62], [12, -58], [12, -36], [10, -36], [10, -56], [0, -56]], '#6e4f31');
  if (role === 'noble') {
    g += `<circle cx="-11" cy="-50" r="4.5" fill="#f4f1e8"/><circle cx="-11" cy="-42" r="4" fill="#f4f1e8"/><circle cx="11" cy="-50" r="4.5" fill="#dcd8cc"/><circle cx="11" cy="-42" r="4" fill="#dcd8cc"/>` + rect(-10, -59, 20, 5, '#ece8dc');
    front += `<line x1="17" y1="-18" x2="17" y2="-44" stroke="#f2b53b" stroke-width="3"/><circle cx="17" cy="-46" r="3" fill="#f2b53b"/>`;
  }
  if (role === 'kaiser') {
    g += rect(-12, -40, 24, 5, '#f4efe6');
    g += poly([[-11, -56], [11, -56], [11, -62], [-11, -62]], '#f2b53b') + poly([[-11, -62], [-8, -70], [-5, -62]], '#f2b53b') + poly([[-3, -62], [0, -72], [3, -62]], '#f2b53b') + poly([[5, -62], [8, -70], [11, -62]], '#d99a22')
      + `<circle cx="0" cy="-59" r="2" fill="#e9566a"/><circle cx="-7" cy="-59" r="1.6" fill="#3fc3dc"/><circle cx="7" cy="-59" r="1.6" fill="#3fc3dc"/>`;
    front += `<circle cx="-15" cy="-22" r="5" fill="#f2b53b"/><path d="M-15 -27 V-33 M-18 -30 H-12" stroke="#f2b53b" stroke-width="2"/><line x1="15" y1="-16" x2="19" y2="-52" stroke="#f2b53b" stroke-width="3"/><circle cx="19" cy="-54" r="3.5" fill="#f2b53b"/>`;
  }
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${flip ? -k : k},${k})">${back}${g}${front}</g>`;
}
export function lady(x: number, y: number, k: number, c: string, crown = false): string {
  const cl = sh(c, .15), cd = sh(c, -.2), skin = '#f2c6a0', skd = '#dfa982', dk = '#2b2f3a', hair = '#8a5a32';
  let g = poly([[-10, -36], [0, -36], [0, 0], [-19, 0]], cl) + poly([[0, -36], [10, -36], [19, 0], [0, 0]], cd) + rect(-10, -24, 20, 3, '#f4efe1');
  g += rect(-14, -34, 4, 14, cl) + rect(10, -34, 4, 14, cd) + rect(-14, -20, 4, 4, skin) + rect(10, -20, 4, 4, skd);
  g += rect(-12, -58, 4, 22, hair) + rect(8, -58, 4, 22, sh(hair, -.2));
  g += rect(-10, -56, 10, 20, skin) + rect(0, -56, 10, 20, skd) + rect(-6, -49, 3, 4, dk) + rect(3, -49, 3, 4, dk);
  g += rect(-11, -61, 22, 7, hair);
  if (crown) g += poly([[-7, -61], [-4, -67], [-1, -61]], '#f2b53b') + poly([[1, -61], [4, -67], [7, -61]], '#d99a22');
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${k})">${g}</g>`;
}
export function child(x: number, y: number, k: number, c: string, female: boolean): string {
  return female ? lady(x, y, k * 0.62, c) : person(x, y, k * 0.62, c, 'noble');
}
export function rat(x: number, y: number, k: number): string {
  return `<g transform="translate(${x},${y}) scale(${k})"><path d="M-12 -2 q-14 -2 -20 -12" stroke="#e7a3a8" stroke-width="2" fill="none"/>` + poly([[-13, 0], [-6, -10], [0, -11], [0, 0]], '#8d96a3') + poly([[0, -11], [8, -9], [15, -2], [16, 0], [0, 0]], '#6f7884') + `<circle cx="6" cy="-11" r="3.5" fill="#e7a3a8"/><circle cx="11" cy="-6" r="1.4" fill="#22252e"/></g>`;
}
export function heart(x: number, y: number, k: number, c: string): string {
  return `<path transform="translate(${x},${y}) scale(${k})" d="M0 6 L-8 -2 A4.5 4.5 0 0 1 0 -8 A4.5 4.5 0 0 1 8 -2 Z" fill="${c}"/>`;
}
export const shadow = (x: number, y: number, w: number) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${w}" ry="${w * .35}" fill="#000" opacity=".15"/>`;
export function flame(x: number, y: number, k: number): string {
  return `<g transform="translate(${x},${y}) scale(${k})">` + poly([[0, -30], [-10, 0], [10, 0]], '#ff7a2f') + poly([[0, -18], [-5, 0], [5, 0]], '#ffd34d') + '</g>';
}
export function coins(x: number, y: number, k: number): string {
  let s = '';
  for (const [dx, dy] of [[-14, -2], [0, -6], [12, 0], [-4, 6], [8, -12]]) s += `<circle cx="${f1(x + dx * k)}" cy="${f1(y + dy * k)}" r="${f1(6 * k)}" fill="#f2b53b" stroke="#cf8f1f" stroke-width="${f1(k)}"/>`;
  return s;
}

// ---------- Krone (Titel 0–6) ----------
export function crown(idx: number, x: number, y: number, k: number): string {
  const G = '#f2b53b', Gd = '#cf8f1f';
  let g = '';
  if (idx === 3 || idx === 4) g += poly([[-20, -14], [20, -14], [16, -44], [-16, -44]], idx === 4 ? '#b3282d' : '#7d2a6b') + poly([[0, -14], [20, -14], [16, -44], [0, -44]], idx === 4 ? '#951f24' : '#62205a');
  if (idx === 6) g += poly([[-22, -14], [22, -14], [22, -44], [-22, -44]], '#b3282d');
  g += rect(-22, -14, 22, 12, G) + rect(0, -14, 22, 12, Gd);
  if (idx === 3 || idx === 4) g += rect(-22, -16, 44, 6, '#f4efe6') + [-16, -6, 4, 14].map(a => rect(a, -14, 2, 3, '#22252e')).join('');
  const pts = idx === 0 ? 3 : idx === 1 || idx === 2 || idx === 5 ? 5 : 0;
  for (let p = 0; p < pts; p++) {
    const px = -18 + p * (36 / (pts - 1));
    g += idx === 0 ? `<circle cx="${px}" cy="-17" r="3.5" fill="#f4efe6"/>`
      : idx === 1 ? `<circle cx="${px}" cy="-20" r="4" fill="#f4efe6"/><line x1="${px}" y1="-14" x2="${px}" y2="-17" stroke="${G}" stroke-width="2"/>`
        : poly([[px - 6, -14], [px, -30 - (p % 2 ? 0 : 6)], [px + 6, -14]], px < 0 ? G : Gd) + `<circle cx="${px}" cy="${-31 - (p % 2 ? 0 : 6)}" r="2.5" fill="${p % 2 ? '#f4efe6' : '#e9566a'}"/>`;
  }
  if (idx === 5) g += `<path d="M-18 -30 Q0 -58 18 -30" fill="none" stroke="${G}" stroke-width="4"/><circle cx="0" cy="-48" r="4" fill="${G}"/><path d="M0 -52 V-60 M-4 -56 H4" stroke="${G}" stroke-width="2.5"/>`;
  if (idx === 3 || idx === 4) g += `<circle cx="0" cy="-48" r="4" fill="${G}"/>`;
  if (idx === 6) {
    for (let p = 0; p < 4; p++) { const px = -22 + p * 11; g += poly([[px, -14], [px + 11, -14], [px + 11, -46], [px + 5.5, -52], [px, -46]], p < 2 ? G : Gd) + `<circle cx="${px + 5.5}" cy="-34" r="3" fill="${['#e9566a', '#3fc3dc', '#46a85a', '#e9566a'][p]}"/>`; }
    g += `<path d="M-16 -50 Q0 -78 16 -50" fill="none" stroke="${G}" stroke-width="4"/><path d="M0 -64 V-82 M-6 -76 H6" stroke="${G}" stroke-width="3.5"/>`;
  }
  return `<g transform="translate(${f1(x)},${f1(y)}) scale(${k})">${g}</g>`;
}

export function buildingArt(o: O, u: number, v: number, b: string, c: string, p = 4): string {
  switch (b) {
    case 'residenz': return manor(o, u, v, c);
    case 'dorf': return village(o, u, v, c);
    case 'markt': return market(o, u, v, c);
    case 'muehle': return mill(o, u, v, c);
    case 'speicher': return granary(o, u, v, c);
    case 'burg': return castle(o, u, v, c);
    case 'palast': return p >= 4 ? palace(o, u, v, c) : site(o, u, v, p, 'Palast');
    case 'dom': return p >= 4 ? dom(o, u, v, c) : site(o, u, v, p, 'Dom');
    default: return '';
  }
}

// ---------- Ereignis-Bilder (300 × 170) ----------
const EV_BG: Record<string, [string, string]> = {
  ratten: ['#7a6a8e', '#4a3d5c'], pest: ['#64788a', '#34404d'], feuer: ['#d98a4a', '#7a3a2a'], erbschaft: ['#e0b75a', '#9a7429'],
  silber: ['#9aa9bd', '#5b6a80'], hunger: ['#a07a5a', '#5a4030'], aufstand: ['#b0505a', '#5e2730'], sold: ['#a88a5a', '#6a5030'],
  titel: ['#6a5ab0', '#2e2a63'], geburt: ['#f2b8c6', '#c77d95'], tod: ['#55607a', '#262c3d'], hochzeit: ['#f6c7c9', '#d48a96'],
  duerre: ['#e3a35a', '#a85d2a'], nass: ['#7a96b0', '#40566e'], normal: ['#8fd0e8', '#5aa9cc'], gut: ['#8fd88a', '#4c9e48'], rekord: ['#f0d36a', '#5aa94e'],
  sieg: ['#7aa4e0', '#2f4f8a'], niederlage: ['#9a6a6a', '#4a2a2a'],
};
export function eventArt(kind: string, color = '#2f6fe0', titleIdx = 0): string {
  const o: O = { x: 150, y: 115, s: 1.4 };
  const [c1, c2] = EV_BG[kind] || EV_BG.normal;
  let s = '';
  const t = (top: string) => tile(o, 0, 0, top);
  switch (kind) {
    case 'ratten': s = t('#9c7a4a') + granary(o, 0, 0) + rat(...P(o, -.15, .45), 1.3) + rat(...P(o, .35, .35), 1.1) + rat(...P(o, .5, -.05), .9); break;
    case 'pest': s = t('#6d8a52') + village(o, 0, 0, '#5f6f8f') + `<g opacity=".55" fill="#a6e07a"><circle cx="110" cy="70" r="18"/><circle cx="135" cy="58" r="22"/><circle cx="170" cy="66" r="18"/></g>`; break;
    case 'feuer': s = t('#7cc04a') + village(o, 0, 0, color) + flame(125, 75, 1.2) + flame(165, 70, 1.5) + flame(145, 88, 1); break;
    case 'erbschaft': case 'silber': s = t(kind === 'silber' ? '#86bd55' : '#7cc04a') + (kind === 'silber' ? mountain(o, -.1, -.1, .8) : '') + coins(165, 105, 1.6); break;
    case 'hunger': s = t('#b98a52') + rows(o, 0, 0, '#94683b') + person(...P(o, 0, .2), 1.1, color, 'farmer'); break;
    case 'aufstand': s = t('#7cc04a') + person(...P(o, -.25, .2), 1.1, '#46a85a', 'farmer') + person(...P(o, .15, .35), 1.1, '#46a85a', 'farmer') + person(...P(o, .3, -.05), 1, '#46a85a', 'farmer') + flame(205, 50, .8); break;
    case 'sold': s = t('#7cc04a') + person(...P(o, -.15, .15), 1.2, '#ef7d32', 'merc') + person(...P(o, .3, .2), 1.2, '#ef7d32', 'merc') + coins(85, 55, .8); break;
    case 'titel': s = crown(titleIdx, 150, 130, 2.2); break;
    case 'geburt': s = t('#7cc04a') + lady(...P(o, -.15, .1), 1.1, color) + child(...P(o, .25, .2), 1.1, color, false) + heart(200, 55, 1.6, '#e9566a'); break;
    case 'tod': s = t('#5f7a4a') + `<rect x="138" y="58" width="24" height="40" fill="#9aa3ad"/><rect x="150" y="58" width="12" height="40" fill="#7d8692"/><rect x="128" y="68" width="44" height="10" fill="#9aa3ad"/>`; break;
    case 'hochzeit': s = t('#7cc04a') + person(...P(o, -.2, .15), 1.1, color, 'noble') + lady(...P(o, .2, .25), 1.1, '#46a85a', true) + heart(150, 30, 1.6, '#e9566a'); break;
    case 'duerre': s = `<circle cx="220" cy="45" r="26" fill="#ffd34d"/>` + t('#b98a52') + rows(o, 0, 0, '#94683b'); break;
    case 'nass': s = t('#7cc04a') + rows(o, 0, 0, '#5f9a3a') + `<g stroke="#cfe6f5" stroke-width="2.5" stroke-linecap="round">${[70, 110, 150, 190, 230].map((x, i) => `<line x1="${x}" y1="${20 + i % 2 * 12}" x2="${x - 8}" y2="${44 + i % 2 * 12}"/>`).join('')}</g>`; break;
    case 'normal': s = t('#ebc23f') + rows(o, 0, 0, '#d4a52f') + sheaf(o, .1, .1); break;
    case 'gut': s = `<circle cx="220" cy="45" r="22" fill="#fff1a8"/>` + t('#ebc23f') + rows(o, 0, 0, '#d4a52f') + sheaf(o, -.15, -.05) + sheaf(o, .2, .15); break;
    case 'rekord': s = `<circle cx="222" cy="42" r="22" fill="#fff1a8"/>` + t('#ebc23f') + rows(o, 0, 0, '#d4a52f') + sheaf(o, -.2, -.1, 1.2) + sheaf(o, .2, .15, 1.2) + sheaf(o, .25, -.25) + sheaf(o, -.25, .25); break;
    case 'sieg': case 'niederlage': s = t('#7cc04a') + person(...P(o, -.2, .2), 1.1, color, 'soldier') + person(...P(o, .2, .1), 1.1, color, 'soldier', true) + flag(o, 0, -.2, 10, color); break;
  }
  return `<svg viewBox="0 0 300 170" role="img" style="background:linear-gradient(180deg,${c1},${c2})">${s}</svg>`;
}
