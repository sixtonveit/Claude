// Regelkern: reiner Spielzustand und Jahresablauf, ohne DOM. Alles Zufällige läuft über s.rng.

export type Terrain = 'water' | 'grass' | 'forest' | 'mountain' | 'sand';
export type BType = 'residenz' | 'dorf' | 'markt' | 'muehle' | 'speicher' | 'burg' | 'palast' | 'dom';
export type Bonus = 'balanced' | 'military' | 'mining' | 'farming' | 'justice' | 'trade' | 'mountains' | 'wine';

export interface Tile { t: Terrain; o: number; b?: BType; p?: number }
export interface Person { name: string; age: number; female: boolean; married?: boolean }
export interface EventCard { kind: string; title: string; text: string }
export interface HouseDef { id: string; name: string; color: string; bonus: Bonus; bonusText: string }

export interface Summary {
  tax: number; markets: number; fines: number; other: number;
  court: number; army: number; interest: number; net: number;
  popStart: number; popEnd: number; born: number; died: number; starved: number; immig: number; emig: number;
  eaten: number; spoiled: number;
}

export interface House {
  idx: number; def: HouseDef; human: boolean; alive: boolean;
  ruler: Person; spouse: Person | null; children: Person[]; generation: number;
  taler: number; korn: number; ha: number; pop: number; rep: number;
  tax: number; justice: number; ration: number;
  soldiers: number; mercs: number; titleIdx: number;
  warred: boolean; plague: boolean; harvest: number;
  events: EventCard[]; last: Summary | null;
}

export interface Offer { id: number; person: Person; from: number; dowryTaler: number; dowryHa: number }
export interface Weather { id: string; name: string; f: number; text: string }
export interface Battle {
  year: number; a: number; d: number; aTroops: number; dTroops: number;
  aStr: number; dStr: number; win: boolean; tiles: number; plunder: number; aLoss: number; dLoss: number;
}
export interface Report {
  year: number; summary: Summary | null; endEvents: EventCard[]; news: string[]; battles: Battle[];
  weather: Weather; harvest: number; events: EventCard[];
}

export interface GameState {
  v: 1; rng: number; year: number; startYear: number; W: number; H: number; map: Tile[];
  houses: House[]; alliances: string[]; difficulty: number;
  weather: Weather; kornPrice: number; landPrice: number;
  offers: Offer[]; nextId: number; news: string[]; chronicle: { year: number; text: string }[];
  battles: Battle[]; report: Report | null; over: { won: boolean; text: string } | null;
}

export const HOUSE_DEFS: HouseDef[] = [
  { id: 'bayern', name: 'Bayern', color: '#2f6fe0', bonus: 'balanced', bonusText: '+5 % auf alle Einnahmen' },
  { id: 'brandenburg', name: 'Brandenburg', color: '#e0402f', bonus: 'military', bonusText: 'Truppen kämpfen 20 % stärker' },
  { id: 'sachsen', name: 'Sachsen', color: '#2fa84f', bonus: 'mining', bonusText: 'Jeder Berg bringt 300 Taler Silber' },
  { id: 'wuerttemberg', name: 'Württemberg', color: '#eba312', bonus: 'farming', bonusText: '+20 % Ernte' },
  { id: 'hessen', name: 'Hessen', color: '#8a4fe0', bonus: 'justice', bonusText: 'Strenge Justiz vertreibt halb so viele' },
  { id: 'holstein', name: 'Holstein', color: '#12aaa7', bonus: 'trade', bonusText: 'Bessere Preise beim Kornhandel' },
  { id: 'tirol', name: 'Tirol', color: '#f2701f', bonus: 'mountains', bonusText: 'Die Burg verteidigt doppelt' },
  { id: 'pfalz', name: 'Pfalz', color: '#d9479a', bonus: 'wine', bonusText: '+8 % Steuern, Volk ist zufriedener' },
];

export const TITLES_M = ['Freiherr', 'Graf', 'Fürst', 'Herzog', 'Kurfürst', 'König', 'Kaiser'];
export const TITLES_F = ['Freifrau', 'Gräfin', 'Fürstin', 'Herzogin', 'Kurfürstin', 'Königin', 'Kaiserin'];
export const JUSTICE = ['', 'Milde', 'Gerecht', 'Streng', 'Grausam'];

const NAMES_M = ['Friedrich', 'Wilhelm', 'Karl', 'Ludwig', 'Maximilian', 'Johann', 'Georg', 'Leopold', 'August', 'Ernst', 'Christian', 'Albrecht', 'Moritz', 'Heinrich', 'Philipp', 'Joseph'];
const NAMES_F = ['Sophie', 'Charlotte', 'Luise', 'Amalie', 'Wilhelmine', 'Karoline', 'Auguste', 'Elisabeth', 'Friederike', 'Henriette', 'Maria', 'Dorothea', 'Christine', 'Johanna', 'Theresia', 'Margarethe'];
const GENTRY = ['von Eschenbach', 'von Lindau', 'von Hohenfels', 'von Rabenstein', 'zu Waldeck', 'von Greifenstein', 'zu Falkenberg', 'von Sternberg', 'von Tannenau', 'zu Rosenthal'];

export const WEATHERS: Weather[] = [
  { id: 'duerre', name: 'Dürre', f: 0.35, text: 'Kein Regen seit dem Frühjahr. Die Felder sind verdorrt.' },
  { id: 'nass', name: 'Verregneter Sommer', f: 0.65, text: 'Viel Regen, das Korn fault auf dem Halm.' },
  { id: 'normal', name: 'Gewöhnliches Jahr', f: 1, text: 'Ein Jahr wie viele. Die Ernte ist ordentlich.' },
  { id: 'gut', name: 'Gutes Jahr', f: 1.25, text: 'Sonne und Regen zur rechten Zeit.' },
  { id: 'rekord', name: 'Rekordernte', f: 1.6, text: 'Die Scheunen quellen über.' },
];
const WEATHER_P = [0.1, 0.2, 0.4, 0.2, 0.1];

export interface BuildDef { type: BType; name: string; cost: number; text: string; minHa: number; sections?: number }
export const BUILD_DEFS: BuildDef[] = [
  { type: 'markt', name: 'Marktplatz', cost: 2000, minHa: 4000, text: '+12 % Steuern und 300 Taler im Jahr. Ein Markt je 4.000 ha.' },
  { type: 'muehle', name: 'Mühle', cost: 2500, minHa: 5000, text: '+8 % Ernte und 250 Taler im Jahr. Eine Mühle je 5.000 ha.' },
  { type: 'speicher', name: 'Kornspeicher', cost: 1000, minHa: 0, text: 'Weniger Verderb und Rattenfraß. Höchstens 2.' },
  { type: 'burg', name: 'Burg', cost: 6000, minHa: 12000, text: 'Verteidigung ×1,5 und Ansehen. Ab 12.000 ha.' },
  { type: 'palast', name: 'Palast', cost: 8000, minHa: 15000, sections: 4, text: 'In 4 Abschnitten. Pflicht ab Kurfürst. Ab 15.000 ha.' },
  { type: 'dom', name: 'Dom', cost: 10000, minHa: 18000, sections: 4, text: 'In 4 Abschnitten. Mildert die Pest. Pflicht ab König. Ab 18.000 ha.' },
];

export const RECRUIT_COST = 20, SOLDIER_UPKEEP = 6, MERC_COST = 60, MERC_UPKEEP = 20;
export const HA_PER_TILE = 1000;

// ---------- Zufall ----------
export function rand(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (s: GameState, a: number, b: number) => a + Math.floor(rand(s) * (b - a + 1));
const pick = <T>(s: GameState, arr: T[]): T => arr[Math.floor(rand(s) * arr.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---------- Hilfen ----------
export const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
export const titleOf = (h: House, idx = h.titleIdx) => (h.ruler.female ? TITLES_F : TITLES_M)[idx];
export const rulerName = (h: House) => `${titleOf(h)} ${h.ruler.name} von ${h.def.name}`;
export const human = (s: GameState) => s.houses[0];
export const allyKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export const allied = (s: GameState, a: number, b: number) => s.alliances.includes(allyKey(a, b));
export function tilesOf(s: GameState, i: number): number[] {
  const r: number[] = [];
  s.map.forEach((t, k) => { if (t.o === i) r.push(k); });
  return r;
}
export function count(s: GameState, i: number, b: BType): number {
  let n = 0;
  for (const t of s.map) if (t.o === i && t.b === b) n += b === 'palast' || b === 'dom' ? t.p || 0 : 1;
  return n;
}
const isFree = (t: Tile) => !t.b || t.b === 'dorf';
const buildable = (t: Tile) => t.t !== 'water' && t.t !== 'mountain' && isFree(t);
function neighbors(s: GameState, k: number): number[] {
  const x = k % s.W, y = Math.floor(k / s.W), r: number[] = [];
  if (x > 0) r.push(k - 1);
  if (x < s.W - 1) r.push(k + 1);
  if (y > 0) r.push(k - s.W);
  if (y < s.H - 1) r.push(k + s.W);
  return r;
}
// Abstand jeder Landkachel zum Gebiet eines Hauses (BFS über Land)
function distFrom(s: GameState, i: number): number[] {
  const d = s.map.map(() => Infinity), q: number[] = [];
  s.map.forEach((t, k) => { if (t.o === i) { d[k] = 0; q.push(k); } });
  while (q.length) {
    const k = q.shift()!;
    for (const n of neighbors(s, k)) if (s.map[n].t !== 'water' && d[n] === Infinity) { d[n] = d[k] + 1; q.push(n); }
  }
  return d;
}
function residenz(s: GameState, i: number): number {
  const k = s.map.findIndex(t => t.o === i && t.b === 'residenz');
  return k >= 0 ? k : tilesOf(s, i)[0] ?? 0;
}
const manhattan = (s: GameState, a: number, b: number) => Math.abs((a % s.W) - (b % s.W)) + Math.abs(Math.floor(a / s.W) - Math.floor(b / s.W));
export const freeLand = (s: GameState) => s.map.filter(t => t.o < 0 && t.t !== 'water').length;

// Kacheln an die Hektar anpassen: 1 Kachel je 1.000 ha (gerundet)
export function syncTiles(s: GameState, i: number) {
  const h = s.houses[i];
  const target = Math.max(1, Math.round(h.ha / HA_PER_TILE));
  let owned = tilesOf(s, i);
  if (owned.length < target) {
    const d = distFrom(s, i);
    const free = s.map.map((t, k) => k).filter(k => s.map[k].o < 0 && s.map[k].t !== 'water' && d[k] < Infinity)
      .sort((a, b) => d[a] - d[b] || a - b);
    for (const k of free.slice(0, target - owned.length)) s.map[k].o = i;
  } else if (owned.length > target) {
    const r = residenz(s, i);
    const rem = owned.filter(k => isFree(s.map[k]) && k !== r).sort((a, b) => manhattan(s, b, r) - manhattan(s, a, r));
    for (const k of rem.slice(0, owned.length - target)) { s.map[k].o = -1; delete s.map[k].b; }
  }
  owned = tilesOf(s, i);
  // Dörfer: je 1.500 Einwohner ein Dorf auf freiem Land
  const r = residenz(s, i);
  const villages = owned.filter(k => s.map[k].b === 'dorf');
  const want = Math.min(Math.floor(h.pop / 1500), villages.length + owned.filter(k => !s.map[k].b && buildable(s.map[k])).length);
  if (villages.length > want) villages.slice(want).forEach(k => delete s.map[k].b);
  else {
    const spots = owned.filter(k => !s.map[k].b && s.map[k].t !== 'mountain' && s.map[k].t !== 'water' && s.map[k].t !== 'forest')
      .sort((a, b) => manhattan(s, a, r) - manhattan(s, b, r) || a - b);
    // jede zweite freie Kachel bleibt Feld, Dörfer etwas abseits der Residenz
    for (const k of spots.filter((_, n) => n % 2 === 1).slice(0, want - villages.length)) s.map[k].b = 'dorf';
  }
}

export function maxBuyHa(s: GameState, h: House): number {
  return Math.max(0, (tilesOf(s, h.idx).length + freeLand(s)) * HA_PER_TILE + 499 - h.ha);
}
export function maxSellHa(s: GameState, h: House): number {
  const owned = tilesOf(s, h.idx), r = residenz(s, h.idx);
  const fixed = owned.filter(k => !isFree(s.map[k]) || k === r).length;
  return Math.max(0, h.ha - Math.max(HA_PER_TILE, fixed * HA_PER_TILE - 499));
}

// ---------- Neues Spiel ----------
export interface NewGameOpts { seed: number; house: number; name: string; female: boolean; opponents: number; difficulty: number }

function person(s: GameState, female: boolean, age: number): Person {
  return { name: pick(s, female ? NAMES_F : NAMES_M), age, female };
}

export function newGame(o: NewGameOpts): GameState {
  const W = 15, H = 15;
  const s: GameState = {
    v: 1, rng: o.seed | 0, year: 1700, startYear: 1700, W, H, map: [], houses: [], alliances: [], difficulty: o.difficulty,
    weather: WEATHERS[2], kornPrice: 100, landPrice: 35, offers: [], nextId: 1, news: [], chronicle: [], battles: [], report: null, over: null,
  };
  const cx = (W - 1) / 2, cy = (H - 1) / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / cx, dy = (y - cy) / cy;
    const d = Math.hypot(dx, dy) * 0.72 + Math.max(Math.abs(dx), Math.abs(dy)) * 0.28 + rand(s) * 0.22;
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    s.map.push({ t: edge || d > 1.02 ? 'water' : 'grass', o: -1 });
  }
  s.map.forEach((t, k) => {
    if (t.t !== 'grass') return;
    const r = rand(s);
    if (r < 0.13) t.t = 'forest';
    else if (r < 0.21) t.t = 'mountain';
    else if (neighbors(s, k).some(n => s.map[n].t === 'water') && r < 0.4) t.t = 'sand';
  });
  const starts = [[3, 3], [W - 4, H - 4], [W - 4, 3], [3, H - 4]];
  const others = HOUSE_DEFS.map((_, i) => i).filter(i => i !== o.house);
  const chosen = [o.house];
  while (chosen.length < 1 + o.opponents) chosen.push(others.splice(Math.floor(rand(s) * others.length), 1)[0]);
  chosen.forEach((di, i) => {
    const [sx, sy] = starts[i];
    for (let y = sy - 1; y <= sy + 1; y++) for (let x = sx - 1; x <= sx + 1; x++) {
      const t = s.map[y * W + x];
      if (t.t === 'water' || t.t === 'mountain') t.t = 'grass';
    }
    const k = sy * W + sx;
    s.map[k].t = 'grass'; s.map[k].o = i; s.map[k].b = 'residenz';
    const female = i === 0 ? o.female : rand(s) < 0.2;
    const ruler = i === 0 ? { name: o.name, age: 24, female } : person(s, female, ri(s, 20, 30));
    s.houses.push({
      idx: i, def: HOUSE_DEFS[di], human: i === 0, alive: true, ruler, spouse: null, children: [], generation: 1,
      taler: 15000, korn: 1500, ha: 10000, pop: 2000, rep: 50, tax: 20, justice: 2, ration: 0,
      soldiers: 30, mercs: 0, titleIdx: 0, warred: false, plague: false, harvest: 0, events: [], last: null,
    });
    syncTiles(s, i);
  });
  beginYear(s);
  return s;
}

// ---------- Jahresbeginn ----------
function harvestOf(s: GameState, h: House): number {
  const mills = count(s, h.idx, 'muehle');
  return Math.round(h.ha * 0.3 * s.weather.f * (1 + 0.08 * mills) * (h.def.bonus === 'farming' ? 1.2 : 1));
}

export function beginYear(s: GameState) {
  let r = rand(s), wi = 0;
  while (r > WEATHER_P[wi] && wi < WEATHERS.length - 1) { r -= WEATHER_P[wi]; wi++; }
  s.weather = WEATHERS[wi];
  s.kornPrice = clamp(Math.round((100 / Math.pow(s.weather.f, 1.3)) * (0.8 + rand(s) * 0.45)), 20, 430);
  s.landPrice = clamp(Math.round(s.landPrice * 0.6 + (22 + rand(s) * 40) * 0.4), 16, 70);
  s.battles = [];
  for (const h of s.houses) {
    if (!h.alive) continue;
    h.events = []; h.warred = false; h.plague = false;
    h.harvest = harvestOf(s, h);
    h.korn += h.harvest;
    rollEvent(s, h);
    h.ration = Math.min(h.korn, h.pop);
  }
  makeOffers(s);
  const me = human(s);
  const rep = s.report;
  s.report = {
    year: s.year, summary: rep?.summary ?? null, endEvents: rep?.endEvents ?? [], news: rep?.news ?? [], battles: rep?.battles ?? [],
    weather: s.weather, harvest: me.harvest, events: me.events.slice(),
  };
}

function rollEvent(s: GameState, h: House) {
  const r = rand(s);
  const ev = (kind: string, title: string, text: string) => h.events.push({ kind, title, text });
  if (r < 0.12) {
    const sp = count(s, h.idx, 'speicher') > 0;
    const loss = Math.round(h.korn * (sp ? 0.08 : 0.22));
    h.korn -= loss;
    ev('ratten', 'Ratten im Speicher', `Ratten haben ${fmt(loss)} Scheffel Korn gefressen.${sp ? ' Der Kornspeicher hat Schlimmeres verhindert.' : ' Ein Kornspeicher hätte geholfen.'}`);
  } else if (r < 0.17) {
    const domDone = count(s, h.idx, 'dom') >= 4;
    const dead = Math.round(h.pop * (domDone ? 0.06 : 0.14));
    h.pop -= dead; h.plague = true;
    ev('pest', 'Die Pest', `${fmt(dead)} Menschen sind gestorben.${domDone ? ' Die Mönche des Doms pflegten die Kranken.' : ''} Auch die Fürstenfamilie ist in Gefahr.`);
  } else if (r < 0.22 && h.taler > 1000) {
    const loss = Math.round(h.taler * 0.1);
    h.taler -= loss;
    ev('feuer', 'Großbrand', `Ein Feuer hat ein Viertel der Stadt zerstört. Der Wiederaufbau kostet ${fmt(loss)} Taler.`);
  } else if (r < 0.27) {
    const g = ri(s, 20, 50) * 100;
    h.taler += g;
    ev('erbschaft', 'Eine Erbschaft', `Ein entfernter Verwandter hinterlässt ${fmt(g)} Taler.`);
  } else if (r < 0.31) {
    const m = tilesOf(s, h.idx).filter(k => s.map[k].t === 'mountain').length;
    if (m > 0) { const g = 1500 * m; h.taler += g; ev('silber', 'Silberfund', `In den Bergen wurde Silber gefunden: ${fmt(g)} Taler.`); }
  }
}

function makeOffers(s: GameState) {
  s.offers = [];
  const me = human(s);
  if (!me.alive || me.spouse || me.ruler.age < 16) return;
  const n = ri(s, 2, 3);
  const houses = s.houses.filter(h => h.alive && !h.human && h.titleIdx <= me.titleIdx + 1);
  for (let k = 0; k < n; k++) {
    const fromHouse = houses.length && rand(s) < 0.5 ? pick(s, houses) : null;
    const p = person(s, !me.ruler.female, clamp(me.ruler.age + ri(s, -8, 3), 16, 40));
    const rank = fromHouse ? fromHouse.titleIdx + 1 : ri(s, 0, 1);
    const dowryTaler = Math.round((1500 + 1500 * rank + rand(s) * 1500) * (0.6 + me.rep / 100) / 100) * 100;
    const dowryHa = fromHouse ? 0 : pick(s, [0, 1000, 1000, 2000]);
    if (fromHouse && s.offers.some(o => o.from === fromHouse.idx)) continue;
    s.offers.push({ id: s.nextId++, person: p, from: fromHouse ? fromHouse.idx : -1, dowryTaler, dowryHa });
  }
}
export const offerHouseName = (s: GameState, o: Offer) => (o.from >= 0 ? `Haus ${s.houses[o.from].def.name}` : `Landadel, ${o.person.name.length % 2 ? GENTRY[o.id % GENTRY.length] : GENTRY[(o.id + 3) % GENTRY.length]}`);

// ---------- Aktionen ----------
export interface Result { ok: boolean; msg?: string }
const fail = (msg: string): Result => ({ ok: false, msg });

export const kornBuyPrice = (s: GameState, h: House) => s.kornPrice * (h.def.bonus === 'trade' ? 0.9 : 1);
export const kornSellPrice = (s: GameState, h: House) => s.kornPrice * (h.def.bonus === 'trade' ? 0.95 : 0.85);
export const kornCost = (s: GameState, h: House, amt: number) => Math.ceil((amt / 100) * kornBuyPrice(s, h));

export function buyKorn(s: GameState, h: House, amt: number): Result {
  const c = kornCost(s, h, amt);
  if (amt <= 0) return fail('Keine Menge.');
  if (c > h.taler) return fail('Nicht genug Taler.');
  h.taler -= c; h.korn += amt;
  return { ok: true };
}
export function sellKorn(s: GameState, h: House, amt: number): Result {
  if (amt <= 0 || amt > h.korn) return fail('So viel Korn hast du nicht.');
  h.taler += Math.floor((amt / 100) * kornSellPrice(s, h)); h.korn -= amt;
  if (h.ration > h.korn) h.ration = h.korn;
  return { ok: true };
}
export function buyLand(s: GameState, h: House, ha: number): Result {
  const c = ha * s.landPrice;
  if (ha <= 0) return fail('Keine Menge.');
  if (ha > maxBuyHa(s, h)) return fail('Es gibt kein freies Land mehr. Erobere es!');
  if (c > h.taler) return fail('Nicht genug Taler.');
  h.taler -= c; h.ha += ha; syncTiles(s, h.idx);
  return { ok: true };
}
export function sellLand(s: GameState, h: House, ha: number): Result {
  if (ha <= 0 || ha > maxSellHa(s, h)) return fail('Bebautes Land kann nicht verkauft werden.');
  h.taler += Math.floor(ha * s.landPrice * 0.8); h.ha -= ha; syncTiles(s, h.idx);
  return { ok: true };
}

export function buildLimit(s: GameState, h: House, b: BType): number {
  switch (b) {
    case 'markt': return Math.floor(h.ha / 4000);
    case 'muehle': return Math.floor(h.ha / 5000);
    case 'speicher': return 2;
    case 'burg': return h.ha >= 12000 ? 1 : 0;
    case 'palast': return h.ha >= 15000 ? 4 : 0;
    case 'dom': return h.ha >= 18000 ? 4 : 0;
    default: return 0;
  }
}
function buildSpot(s: GameState, h: House): number {
  const r = residenz(s, h.idx);
  const c = tilesOf(s, h.idx).filter(k => buildable(s.map[k]))
    .sort((a, b) => (s.map[a].b ? 1 : 0) - (s.map[b].b ? 1 : 0) || manhattan(s, a, r) - manhattan(s, b, r) || a - b);
  return c.length ? c[0] : -1;
}
export function canBuild(s: GameState, h: House, b: BType): Result {
  const def = BUILD_DEFS.find(d => d.type === b)!;
  if (h.ha < def.minHa) return fail(`Braucht ${fmt(def.minHa)} ha Land.`);
  const have = count(s, h.idx, b), lim = buildLimit(s, h, b);
  if (have >= lim) return fail(def.sections ? 'Fertig gebaut.' : 'Mehr geht mit deinem Land nicht.');
  if (h.taler < def.cost) return fail('Nicht genug Taler.');
  if (!(def.sections && have > 0) && buildSpot(s, h) < 0) return fail('Kein freier Bauplatz. Kaufe Land.');
  return { ok: true };
}
export function build(s: GameState, h: House, b: BType): Result {
  const c = canBuild(s, h, b);
  if (!c.ok) return c;
  const def = BUILD_DEFS.find(d => d.type === b)!;
  h.taler -= def.cost;
  const ex = def.sections ? s.map.find(t => t.o === h.idx && t.b === b) : undefined;
  if (ex) ex.p = (ex.p || 0) + 1;
  else {
    const k = buildSpot(s, h);
    const t = s.map[k];
    if (t.t === 'forest') t.t = 'grass';
    t.b = b; if (def.sections) t.p = 1;
  }
  syncTiles(s, h.idx);
  return { ok: true };
}

export const maxSoldiers = (h: House) => Math.floor(h.pop * 0.15);
export function recruit(s: GameState, h: House, n: number): Result {
  n = Math.min(n, maxSoldiers(h) - h.soldiers);
  if (n <= 0) return fail('Nicht mehr als 15 % des Volkes können dienen.');
  if (n * RECRUIT_COST > h.taler) return fail('Nicht genug Taler.');
  h.taler -= n * RECRUIT_COST; h.soldiers += n; h.pop -= n;
  return { ok: true };
}
export function dismiss(s: GameState, h: House, n: number): Result {
  n = Math.min(n, h.soldiers);
  if (n <= 0) return fail('Keine Soldaten.');
  h.soldiers -= n; h.pop += n;
  return { ok: true };
}
export function hire(s: GameState, h: House, n: number): Result {
  if (n * MERC_COST > h.taler) return fail('Nicht genug Taler.');
  h.taler -= n * MERC_COST; h.mercs += n;
  return { ok: true };
}
export function fire(s: GameState, h: House, n: number): Result {
  n = Math.min(n, h.mercs);
  if (n <= 0) return fail('Keine Söldner.');
  h.mercs -= n;
  return { ok: true };
}
export function strength(s: GameState, h: House, defending: boolean): number {
  let v = (h.soldiers + 2 * h.mercs) * (h.def.bonus === 'military' ? 1.2 : 1);
  if (defending) { v += h.pop * 0.004; if (count(s, h.idx, 'burg') > 0) v *= h.def.bonus === 'mountains' ? 2 : 1.5; }
  return v;
}

function transferTiles(s: GameState, from: number, to: number, n: number): number {
  const d = distFrom(s, to), r = residenz(s, from);
  const keep = 2;
  const cand = tilesOf(s, from).filter(k => k !== r && (!s.map[k].b || ['dorf', 'markt', 'muehle', 'speicher'].includes(s.map[k].b!)))
    .sort((a, b) => d[a] - d[b] || a - b);
  const moved = Math.max(0, Math.min(n, cand.length, tilesOf(s, from).length - keep));
  for (const k of cand.slice(0, moved)) { s.map[k].o = to; if (s.map[k].b === 'dorf') delete s.map[k].b; }
  return moved;
}

export function declareWar(s: GameState, ai: number, di: number): Battle | Result {
  const a = s.houses[ai], d = s.houses[di];
  if (!d.alive || ai === di) return fail('Kein gültiges Ziel.');
  if (allied(s, ai, di)) return fail('Mit diesem Haus bist du verschwägert.');
  if (a.warred) return fail('Nur ein Feldzug pro Jahr.');
  if (a.soldiers + a.mercs < 10) return fail('Du brauchst mindestens 10 Mann.');
  a.warred = true;
  const aTroops = a.soldiers + a.mercs, dTroops = d.soldiers + d.mercs;
  const aStr = strength(s, a, false) * (0.75 + rand(s) * 0.5);
  const dStr = Math.max(1, strength(s, d, true) * (0.75 + rand(s) * 0.5));
  const win = aStr > dStr;
  const lose = (h: House, f: number) => {
    const ls = Math.round(h.soldiers * f), lm = Math.round(h.mercs * f);
    h.soldiers -= ls; h.mercs -= lm; return ls + lm;
  };
  let tiles = 0, plunder = 0, aLoss: number, dLoss: number;
  if (win) {
    const pct = clamp(0.1 + 0.15 * (aStr / dStr - 1), 0.1, 0.3);
    tiles = transferTiles(s, di, ai, Math.max(1, Math.round(tilesOf(s, di).length * pct)));
    a.ha += tiles * HA_PER_TILE; d.ha = Math.max(HA_PER_TILE, d.ha - tiles * HA_PER_TILE);
    plunder = Math.max(0, Math.round(d.taler * 0.12));
    d.taler -= plunder; a.taler += plunder;
    aLoss = lose(a, clamp(0.25 * (dStr / aStr), 0.05, 0.3)); dLoss = lose(d, 0.5);
    d.pop = Math.round(d.pop * 0.97);
    a.rep = clamp(a.rep - 2, 0, 100);
    syncTiles(s, ai); syncTiles(s, di);
  } else {
    aLoss = lose(a, 0.45); dLoss = lose(d, 0.15);
    a.rep = clamp(a.rep - 4, 0, 100);
  }
  const b: Battle = { year: s.year, a: ai, d: di, aTroops, dTroops, aStr, dStr, win, tiles, plunder, aLoss, dLoss };
  s.battles.push(b);
  s.news.push(win
    ? `${a.def.name} besiegt ${d.def.name} und erobert ${fmt(tiles * HA_PER_TILE)} ha Land.`
    : `${a.def.name} greift ${d.def.name} an und wird zurückgeschlagen.`);
  return b;
}

export function acceptOffer(s: GameState, id: number): Result {
  const me = human(s), o = s.offers.find(x => x.id === id);
  if (!o || me.spouse) return fail('Dieses Angebot gilt nicht mehr.');
  me.spouse = { ...o.person, married: true };
  me.taler += o.dowryTaler;
  if (o.dowryHa) { const ha = Math.min(o.dowryHa, maxBuyHa(s, me)); me.ha += ha; syncTiles(s, 0); }
  if (o.from >= 0 && !allied(s, 0, o.from)) s.alliances.push(allyKey(0, o.from));
  s.news.push(`Hochzeit: ${me.ruler.name} von ${me.def.name} heiratet ${o.person.name} (${offerHouseName(s, o)}).`);
  me.rep = clamp(me.rep + 3, 0, 100);
  s.offers = [];
  return { ok: true };
}
export function marryChild(s: GameState, ci: number, hi: number): Result {
  const me = human(s), c = me.children[ci], h = s.houses[hi];
  if (!c || c.married || c.age < 16) return fail('Dieses Kind kann noch nicht heiraten.');
  if (!h?.alive || h.human) return fail('Kein gültiges Haus.');
  c.married = true;
  if (!allied(s, 0, hi)) s.alliances.push(allyKey(0, hi));
  const gift = 1000 * (h.titleIdx + 1);
  me.taler += gift;
  s.news.push(`${c.name} von ${me.def.name} heiratet ins Haus ${h.def.name}. Die Häuser sind nun verbündet.`);
  return { ok: true, msg: `Bündnis mit ${h.def.name}. Brautgeld: ${fmt(gift)} Taler.` };
}

// ---------- Titel ----------
export interface Req { label: string; ok: boolean }
export interface TitleReq { ha: number; markt: number; muehle: number; pop: number; burg?: number; palast?: number; dom?: number; taler?: number }
export const TITLE_REQ: (TitleReq | null)[] = [
    null,
    { ha: 12000, markt: 1, muehle: 1, pop: 2500 },
    { ha: 15000, markt: 2, muehle: 2, burg: 1, pop: 3500 },
    { ha: 18000, markt: 3, muehle: 3, pop: 4500, taler: 30000 },
    { ha: 21000, markt: 4, muehle: 4, palast: 2, pop: 5500 },
    { ha: 23000, markt: 5, muehle: 4, palast: 4, dom: 2, pop: 6500, taler: 60000 },
    { ha: 25000, markt: 6, muehle: 5, palast: 4, dom: 4, pop: 7500, taler: 100000 },
];
export function titleReqs(s: GameState, h: House, idx: number): Req[] {
  const T = TITLE_REQ[idx];
  if (!T) return [];
  const r: Req[] = [];
  r.push({ label: `${fmt(T.ha)} ha Land (${fmt(h.ha)})`, ok: h.ha >= T.ha });
  r.push({ label: `${fmt(T.pop)} Einwohner (${fmt(h.pop)})`, ok: h.pop >= T.pop });
  r.push({ label: `${T.markt} Marktplätze (${count(s, h.idx, 'markt')})`, ok: count(s, h.idx, 'markt') >= T.markt });
  r.push({ label: `${T.muehle} Mühlen (${count(s, h.idx, 'muehle')})`, ok: count(s, h.idx, 'muehle') >= T.muehle });
  if ('burg' in T) r.push({ label: 'Eine Burg', ok: count(s, h.idx, 'burg') >= 1 });
  if ('palast' in T) r.push({ label: `Palast ${T.palast === 4 ? 'fertig' : 'zur Hälfte'} (${count(s, h.idx, 'palast')}/4)`, ok: count(s, h.idx, 'palast') >= T.palast! });
  if ('dom' in T) r.push({ label: `Dom ${T.dom === 4 ? 'fertig' : 'zur Hälfte'} (${count(s, h.idx, 'dom')}/4)`, ok: count(s, h.idx, 'dom') >= T.dom! });
  if ('taler' in T) r.push({ label: `${fmt(T.taler!)} Taler in der Kasse (${fmt(h.taler)})`, ok: h.taler >= T.taler! });
  return r;
}

// ---------- Prognosen (auch für die Oberfläche) ----------
export function mood(h: House, ration = h.ration): number {
  const r = h.pop > 0 ? ration / h.pop : 1;
  return 50 + (r - 1) * 80 - (h.tax - 20) * 2 - (h.justice - 2) * 10 * (h.def.bonus === 'justice' ? 0.5 : 1) + (h.rep - 50) * 0.4 + (h.def.bonus === 'wine' ? 6 : 0);
}
export function moodLabel(m: number): string {
  return m < 15 ? 'Aufruhr' : m < 35 ? 'Murren' : m < 60 ? 'Zufrieden' : 'Jubel';
}
export function income(s: GameState, h: House) {
  const markets = count(s, h.idx, 'markt'), mills = count(s, h.idx, 'muehle');
  const mult = (h.def.bonus === 'balanced' ? 1.05 : 1) * (h.human ? 1 : [0.9, 1, 1.15][s.difficulty]);
  const tax = h.pop * 0.15 * h.tax * (1 + 0.12 * markets) * (h.def.bonus === 'wine' ? 1.08 : 1) * mult;
  const mk = (300 * markets + 250 * mills) * mult;
  const fines = h.pop * 0.25 * (h.justice - 1) * mult;
  const other = h.def.bonus === 'mining' ? tilesOf(s, h.idx).filter(k => s.map[k].t === 'mountain').length * 300 : 0;
  const court = 400 + h.titleIdx * 500 + count(s, h.idx, 'palast') * 150;
  const army = h.soldiers * SOLDIER_UPKEEP + h.mercs * MERC_UPKEEP;
  return { tax: Math.round(tax), markets: Math.round(mk), fines: Math.round(fines), other, court, army };
}

export const capacity = (s: GameState, h: House) => h.ha * 0.35 * (1 + 0.05 * count(s, h.idx, 'markt'));

// ---------- Jahresende ----------
// Bevölkerungsentwicklung bis Jahresende (ohne Zufall), auch für die Vorschau
export function popForecast(s: GameState, h: House, ration = h.ration) {
  const pop = h.pop, r = pop > 0 ? Math.min(ration, h.korn) / pop : 1;
  const cap = capacity(s, h);
  const room = clamp(((cap - pop) / cap) * 3, -0.5, 1);
  const jf = h.def.bonus === 'justice' ? 0.5 : 1;
  const born = Math.round(pop * 0.032 * Math.min(1, r));
  const died = Math.round(pop * 0.02);
  const immig = r > 1 ? Math.round(pop * Math.min(r - 1, 0.8) * 0.12 * Math.max(0, room) * (h.rep / 50)) : 0;
  const starved = r < 1 ? Math.round(pop * (1 - r) * 0.3) : 0;
  const emig = Math.round(pop * (r < 0.9 ? (0.9 - r) * 0.15 : 0) + pop * 0.012 * Math.max(0, h.justice - 2) * jf
    + pop * 0.005 * Math.max(0, h.tax - 25) + Math.max(0, pop - cap) * 0.1);
  const repDelta = clamp((r - 1) * 20, -10, 6) - (h.justice - 2) * 3 * jf - Math.max(0, h.tax - 25) * 0.4;
  return { born, died, immig, starved, emig, delta: born + immig - died - starved - emig, repDelta };
}

function simulate(s: GameState, h: House) {
  const sum: Summary = { tax: 0, markets: 0, fines: 0, other: 0, court: 0, army: 0, interest: 0, net: 0, popStart: h.pop, popEnd: 0, born: 0, died: 0, starved: 0, immig: 0, emig: 0, eaten: 0, spoiled: 0 };
  const ev = (kind: string, title: string, text: string) => h.events.push({ kind, title, text });
  const pop = h.pop;
  const ration = clamp(Math.round(h.ration), 0, h.korn);
  const f = popForecast(s, h, ration);
  h.korn -= ration; sum.eaten = ration;
  const r = pop > 0 ? ration / pop : 1;
  sum.born = f.born; sum.died = f.died; sum.immig = f.immig; sum.starved = f.starved; sum.emig = f.emig;
  const jf = h.def.bonus === 'justice' ? 0.5 : 1;
  // Geld
  const inc = income(s, h);
  Object.assign(sum, inc);
  sum.interest = h.taler < 0 ? Math.round(-h.taler * 0.1) : 0;
  sum.net = inc.tax + inc.markets + inc.fines + inc.other - inc.court - inc.army - sum.interest;
  h.taler += sum.net;
  h.pop = Math.max(100, pop + sum.born + sum.immig - sum.died - sum.starved - sum.emig);
  sum.popEnd = h.pop;
  // Verderb
  const sp = count(s, h.idx, 'speicher');
  sum.spoiled = Math.round(h.korn * (sp ? 0.05 : 0.12));
  h.korn -= sum.spoiled;
  // Ansehen und Stimmung
  const m = mood(h, ration);
  h.rep = clamp(h.rep + clamp((r - 1) * 20, -10, 6) - (h.justice - 2) * 3 * jf - Math.max(0, h.tax - 25) * 0.4 + (count(s, h.idx, 'burg') ? 0.5 : 0), 0, 100);
  h.rep += ((h.def.bonus === 'wine' ? 60 : 50) - h.rep) * 0.05;
  if (r < 0.75) ev('hunger', 'Hungersnot', `${fmt(sum.starved)} Menschen sind verhungert. Das Volk ist verbittert.`);
  if (m < 15 && rand(s) < 0.5 && h.taler > 0) {
    const loss = Math.round(h.taler * 0.25);
    h.taler -= loss; h.rep = clamp(h.rep - 5, 0, 100);
    ev('aufstand', 'Aufstand', `Das Volk stürmt die Amtsstuben. ${fmt(loss)} Taler sind verloren. Senke Steuern oder verteile mehr Korn.`);
    if (!h.human) s.news.push(`Aufstand in ${h.def.name}!`);
  }
  if (h.taler < 0 && h.mercs > 0) {
    ev('sold', 'Söldner ohne Sold', `Deine Kasse ist leer. ${fmt(h.mercs)} Söldner sind zum Nachbarn übergelaufen.`);
    h.mercs = 0;
  }
  h.last = sum;
}

function deathP(age: number) { return age < 35 ? 0.008 : age < 50 ? 0.02 : age < 60 ? 0.05 : age < 70 ? 0.1 : 0.2; }

function family(s: GameState, h: House) {
  const ev = (kind: string, title: string, text: string) => h.events.push({ kind, title, text });
  h.ruler.age++; if (h.spouse) h.spouse.age++;
  h.children.forEach(c => c.age++);
  if (h.spouse && rand(s) < deathP(h.spouse.age) * (h.plague ? 2 : 1)) {
    ev('tod', `${h.spouse.name} ist gestorben`, `Der Hof trauert. Du kannst wieder heiraten.`);
    h.spouse = null;
  }
  if (h.spouse) {
    const mother = h.ruler.female ? h.ruler : h.spouse;
    if (mother.age <= 42 && h.children.length < 7 && rand(s) < 0.32) {
      const c = person(s, rand(s) < 0.5, 0);
      h.children.push(c);
      ev('geburt', c.female ? 'Eine Tochter!' : 'Ein Sohn!', `${c.name} ist geboren. Die Erbfolge ist ${h.children.length > 1 ? 'gut' : ''} gesichert.`.replace('  ', ' '));
    }
  }
  h.children = h.children.filter(c => {
    if (rand(s) < (c.age < 6 ? 0.03 : 0.008)) { ev('tod', `${c.name} ist gestorben`, `Das Kind wurde nur ${c.age} Jahre alt.`); return false; }
    return true;
  });
  if (rand(s) < deathP(h.ruler.age) * (h.plague ? 2.5 : 1)) {
    const old = h.ruler;
    const heirIdx = h.children.reduce((best, c, i) => (best < 0 || c.age > h.children[best].age ? i : best), -1);
    if (heirIdx >= 0) {
      const heir = h.children.splice(heirIdx, 1)[0];
      const wasMarried = !!heir.married;
      h.ruler = { name: heir.name, age: heir.age, female: heir.female };
      h.spouse = wasMarried ? person(s, !heir.female, heir.age + ri(s, -3, 3)) : null;
      if (h.spouse) h.spouse.married = true;
      h.generation++;
      ev('tod', `${old.name} ist tot`, `${old.name} starb mit ${old.age} Jahren. ${heir.name} übernimmt mit ${heir.age} Jahren${heir.age < 16 ? ' unter Vormundschaft' : ''} die Herrschaft und den Titel.`);
      s.news.push(`${old.name} von ${h.def.name} ist gestorben. Neue${h.ruler.female ? ' Herrscherin' : 'r Herrscher'}: ${heir.name}.`);
    } else {
      h.alive = false;
      ev('tod', `${old.name} ist tot`, `${old.name} starb mit ${old.age} Jahren ohne Erben. Das Haus ${h.def.name} ist erloschen.`);
      s.news.push(`Das Haus ${h.def.name} ist ausgestorben. Sein Land fällt an niemanden.`);
      s.map.forEach(t => { if (t.o === h.idx) { t.o = -1; delete t.b; delete t.p; } });
      s.alliances = s.alliances.filter(k => !k.split('-').includes(String(h.idx)));
      if (h.human) s.over = { won: false, text: `${old.name} ist ohne Erben gestorben. Dein Haus ist erloschen.` };
    }
  }
}

function checkTitle(s: GameState, h: House) {
  if (!h.alive || h.titleIdx >= 6) return;
  const next = h.titleIdx + 1;
  if (titleReqs(s, h, next).every(r => r.ok)) {
    h.titleIdx = next;
    h.rep = clamp(h.rep + 5, 0, 100);
    h.events.push({ kind: 'titel', title: `${titleOf(h)}!`, text: `${h.ruler.name} von ${h.def.name} trägt nun den Titel ${titleOf(h)}.` });
    s.news.push(`${h.ruler.name} von ${h.def.name} wird ${titleOf(h)}.`);
    if (next === 6) s.over = { won: h.human, text: h.human ? `${h.ruler.name} von ${h.def.name} wird ${h.ruler.female ? 'zur' : 'zum'} ${titleOf(h)} gekrönt!` : `${h.ruler.name} von ${h.def.name} hat sich die Kaiserkrone gesichert. Das Spiel ist verloren.` };
  }
}

// ---------- Computer-Fürsten ----------
export function aiTurn(s: GameState, h: House) {
  const diff = s.difficulty;
  h.tax = [18, 20, 22][diff] + (h.def.bonus === 'military' ? 2 : 0);
  h.justice = 2;
  const need = Math.round(h.pop * 1.08);
  if (h.korn < need) {
    const amt = Math.min(need - h.korn, Math.floor((h.taler * 0.6) / Math.max(1, kornBuyPrice(s, h)) * 100 / 100) * 100);
    if (amt > 0) buyKorn(s, h, amt);
  }
  h.ration = Math.min(h.korn, need);
  const spare = Math.floor((h.korn - h.ration - h.pop * 0.3) / 100) * 100;
  if (spare > 200 && s.kornPrice >= 90) sellKorn(s, h, spare);
  const reserve = 2000 + h.titleIdx * 1500;
  const order: BType[] = ['muehle', 'markt', 'speicher', 'burg', 'palast', 'dom', 'markt', 'muehle'];
  for (const b of order) {
    const def = BUILD_DEFS.find(d => d.type === b)!;
    if (b === 'speicher' && count(s, h.idx, 'speicher') >= 1) continue;
    let guard = 0;
    while (guard++ < 4 && h.taler - def.cost >= reserve * 0.5 && canBuild(s, h, b).ok) build(s, h, b);
  }
  if (h.taler > reserve + s.landPrice * 1000) {
    const ha = Math.min(3000, Math.floor(((h.taler - reserve) * 0.5) / s.landPrice / 100) * 100);
    buyLand(s, h, Math.min(ha, maxBuyHa(s, h)));
  }
  const target = Math.round(h.pop * (h.def.bonus === 'military' ? 0.07 : 0.04) * (1 + diff * 0.2));
  if (h.soldiers < target) recruit(s, h, Math.min(target - h.soldiers, Math.floor((h.taler * 0.3) / RECRUIT_COST)));
  if (diff === 2 && h.taler > 20000 && h.mercs < h.soldiers * 0.3) hire(s, h, Math.round(h.soldiers * 0.1));
  if (s.year - s.startYear >= 4 && !h.warred) {
    const aggression = [0.1, 0.18, 0.28][diff] * (h.def.bonus === 'military' ? 1.6 : 1);
    const my = strength(s, h, false);
    const targets = s.houses.filter(o => o.alive && o.idx !== h.idx && !allied(s, h.idx, o.idx))
      .sort((a, b) => strength(s, a, true) - strength(s, b, true));
    if (targets.length && my > strength(s, targets[0], true) * 1.3 && rand(s) < aggression) declareWar(s, h.idx, targets[0].idx);
  }
  if (!h.spouse && h.ruler.age >= 16 && rand(s) < 0.4) {
    h.spouse = { ...person(s, !h.ruler.female, h.ruler.age + ri(s, -6, 2)), married: true };
    h.taler += 2000;
  }
}

function aiAlliances(s: GameState) {
  const ai = s.houses.filter(h => h.alive && !h.human);
  if (ai.length < 2 || rand(s) > 0.08) return;
  const a = pick(s, ai), b = pick(s, ai.filter(x => x !== a));
  if (allied(s, a.idx, b.idx)) return;
  s.alliances.push(allyKey(a.idx, b.idx));
  s.news.push(`Hochzeit zwischen den Häusern ${a.def.name} und ${b.def.name}. Sie sind nun verbündet.`);
}

export function endYear(s: GameState) {
  if (s.over) return;
  for (const h of s.houses) if (h.alive && !h.human) aiTurn(s, h);
  aiAlliances(s);
  const me = human(s);
  me.events = [];
  for (const h of s.houses) {
    if (!h.alive) continue;
    if (!h.human) h.events = [];
    simulate(s, h);
    family(s, h);
    if (h.alive) { checkTitle(s, h); syncTiles(s, h.idx); }
  }
  const battles = s.battles.filter(b => b.d === 0);
  s.report = { year: s.year, summary: me.last, endEvents: me.events.slice(), news: s.news.slice(), battles, weather: s.weather, harvest: 0, events: [] };
  for (const n of s.news) s.chronicle.push({ year: s.year, text: n });
  if (s.chronicle.length > 80) s.chronicle.splice(0, s.chronicle.length - 80);
  s.news = [];
  if (s.over) return;
  s.year++;
  beginYear(s);
}
