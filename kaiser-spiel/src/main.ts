import {
  GameState, House, Battle, EventCard, newGame, endYear, human, fmt, titleOf, rulerName, HOUSE_DEFS, BUILD_DEFS, BType,
  buyKorn, sellKorn, buyLand, sellLand, kornCost, kornSellPrice, maxBuyHa, maxSellHa, freeLand, canBuild, build, count, buildLimit,
  recruit, dismiss, hire, fire, strength, maxSoldiers, declareWar, allied, acceptOffer, marryChild, offerHouseName,
  titleReqs, mood, moodLabel, income, capacity, kornBuyPrice, JUSTICE, TITLES_M, TITLES_F, RECRUIT_COST, MERC_COST, MERC_UPKEEP, SOLDIER_UPKEEP, Result, tilesOf,
} from './rules';
import * as art from './art';
import { ico } from './icons';

const KEY = 'kaiser-polytopia-v1';
const app = document.getElementById('app')!;
let S: GameState | null = null;
let sheet: string | null = null;
let sheetArg: unknown = null;
let confirmWar = -1;
type View = { x: number; y: number; w: number; h: number };
let view: View | null = null;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function load(): GameState | null {
  try { const j = localStorage.getItem(KEY); return j ? JSON.parse(j) as GameState : null; } catch { return null; }
}
function save() { try { if (S) localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* Speichern ist optional */ } }
function clearSave() { try { localStorage.removeItem(KEY); } catch { /* egal */ } }
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// ---------- Startbildschirm ----------
const startOpts = { house: 0, name: 'Friedrich', female: false, opponents: 3, difficulty: 1 };

function demoIsland(): string {
  const o: art.O = { x: 260, y: 70, s: .78 };
  const map = ['ggtmm', 'fgggm', 'ffggg', 'fggsw', 'ggsww'];
  let s = '';
  for (let d = 0; d < 9; d++) for (let i = 0; i < 5; i++) {
    const j = d - i; if (j < 0 || j > 4) continue;
    const ch = map[j][i];
    s += art.terrain(o, ch === 'f' ? 'field' : ch === 's' ? 'sand' : ch === 'w' ? 'water' : ch === 'm' ? 'mountain' : 'grass', i - 2, j - 2, i * 3 + j);
  }
  const c = HOUSE_DEFS[startOpts.house].color;
  s += art.tree(o, 0, -2) + art.pine(o, .25, -1.8, .8) + art.mountain(o, 1, -2, .8) + art.mountain(o, 2, -1, .7) + art.mountain(o, 2, -2, .9);
  s += art.castle(o, 0, -1, c) + art.village(o, 1, 0, c) + art.mill(o, -2, 1, c) + art.sheaf(o, -1, 0);
  s += art.person(...art.P(o, -.2, 1.1), .9, c, 'farmer') + art.person(...art.P(o, .4, .9), .9, c, 'soldier') + art.person(...art.P(o, 1, 1.6), 1.15, c, 'kaiser');
  return `<svg class="demo" viewBox="0 0 520 330" role="img" aria-label="Kleine Insel mit Burg, Mühle und dem Kaiser">${s}</svg>`;
}

function renderStart() {
  const saved = load();
  app.innerHTML = `
  <div class="start">
    <div class="start-art">${demoIsland()}</div>
    <div class="start-card">
      <h1>Kaiser</h1>
      <p class="sub">Vom Freiherrn zum Kaiser. Ein Wirtschaftsspiel nach dem Klassiker von 1984/1991.</p>
      ${saved && !saved.over ? `<button class="btn gold wide" data-act="continue">Weiterspielen · ${esc(rulerName(saved.houses[0]))}, ${saved.year}</button>` : ''}
      <h3>Dein Fürstenhaus</h3>
      <div class="houses">${HOUSE_DEFS.map((d, i) => `
        <button class="house ${i === startOpts.house ? 'on' : ''}" data-act="pickHouse" data-n="${i}" style="--hc:${d.color}" aria-pressed="${i === startOpts.house}">
          <i></i><b>${d.name}</b><span>${d.bonusText}</span></button>`).join('')}</div>
      <div class="formrow">
        <label for="rname">Name</label>
        <input id="rname" value="${esc(startOpts.name)}" maxlength="18" autocomplete="off">
        <div class="seg">${[['m', 'Fürst'], ['f', 'Fürstin']].map(([k, l]) => `<button data-act="pickSex" data-n="${k}" class="${(k === 'f') === startOpts.female ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="formrow">
        <label>Gegner</label>
        <div class="seg">${[1, 2, 3].map(n => `<button data-act="pickOpp" data-n="${n}" class="${n === startOpts.opponents ? 'on' : ''}">${n}</button>`).join('')}</div>
        <label>Stufe</label>
        <div class="seg">${['Leicht', 'Normal', 'Schwer'].map((l, n) => `<button data-act="pickDiff" data-n="${n}" class="${n === startOpts.difficulty ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <button class="btn wide" data-act="newGame">Neues Spiel beginnen</button>
      <p class="fine">Der Spielstand wird in diesem Browser gespeichert.</p>
    </div>
  </div>`;
}

// ---------- Karte ----------
function renderMap(s: GameState): string {
  const o: art.O = { x: s.H * 50, y: 25, s: 1 };
  const dry = s.weather.f < 0.7;
  let tiles = '', overlay = '', objs: [number, string][] = [];
  for (let d = 0; d < s.W + s.H - 1; d++) for (let x = 0; x < s.W; x++) {
    const y = d - x; if (y < 0 || y >= s.H) continue;
    const k = y * s.W + x, t = s.map[k], seed = x * 7 + y * 13;
    let kind: string = t.t;
    if (t.t === 'grass' && t.o >= 0 && !t.b && (x * 7 + y * 3) % 3 !== 0) kind = dry ? 'dry' : 'field';
    if (t.t === 'forest' || t.t === 'mountain') kind = t.t;
    tiles += art.terrain(o, kind, x, y, seed);
    if (t.t === 'forest') objs.push([d, art.tree(o, x - .12, y - .1, .85) + art.pine(o, x + .2, y + .12, .75)]);
    else if (t.t === 'mountain') objs.push([d, art.mountain(o, x, y, .85)]);
    else if (t.t === 'grass' && t.o < 0 && seed % 9 === 0) objs.push([d, art.tree(o, x + .15, y - .1, .7)]);
    if (t.b) {
      const h = s.houses[t.o];
      objs.push([d + .5, art.buildingArt(o, x, y, t.b, h ? h.def.color : '#888', t.p || 0)]);
    } else if (kind === 'field' && seed % 5 === 0) objs.push([d, art.sheaf(o, x + .1, y)]);
  }
  // Grenzen
  const own = (x: number, y: number) => (x < 0 || y < 0 || x >= s.W || y >= s.H) ? -2 : s.map[y * s.W + x].o;
  for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) {
    const w = own(x, y); if (w < 0) continue;
    const c = s.houses[w].def.color;
    overlay += art.poly([art.P(o, x - .5, y - .5), art.P(o, x + .5, y - .5), art.P(o, x + .5, y + .5), art.P(o, x - .5, y + .5)], c, ' opacity=".13"');
    const edges: [number, number, [number, number], [number, number]][] = [[0, -1, [-.5, -.5], [.5, -.5]], [1, 0, [.5, -.5], [.5, .5]], [0, 1, [.5, .5], [-.5, .5]], [-1, 0, [-.5, .5], [-.5, -.5]]];
    for (const [dx, dy, a, b] of edges) {
      if (own(x + dx, y + dy) === w) continue;
      const pa = art.P(o, x + a[0] * .94, y + a[1] * .94, 1), pb = art.P(o, x + b[0] * .94, y + b[1] * .94, 1);
      overlay += `<line x1="${pa[0].toFixed(1)}" y1="${pa[1].toFixed(1)}" x2="${pb[0].toFixed(1)}" y2="${pb[1].toFixed(1)}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
    }
  }
  objs = objs.sort((a, b) => a[0] - b[0]);
  const v = view ?? (view = landBounds(s));
  return `<svg id="map" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Karte des Reiches. Ziehen zum Verschieben, Mausrad oder zwei Finger zum Zoomen.">${tiles}${overlay}${objs.map(x => x[1]).join('')}</svg>`;
}
// Ausschnitt um das Land herum (ohne den Meeresrand)
function landBounds(s: GameState) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  s.map.forEach((t, k) => {
    if (t.t === 'water') return;
    const x = k % s.W, y = Math.floor(k / s.W), sx = s.H * 50 + (x - y) * 50, sy = 25 + (x + y) * 25;
    x0 = Math.min(x0, sx - 50); x1 = Math.max(x1, sx + 50); y0 = Math.min(y0, sy - 25); y1 = Math.max(y1, sy + 25);
  });
  return { x: x0 - 40, y: y0 - 110, w: x1 - x0 + 80, h: y1 - y0 + 150 };
}
function fitView() {
  if (!S) return;
  const full = landBounds(S), el = document.getElementById('mapwrap');
  const aspect = el && el.clientWidth ? el.clientHeight / el.clientWidth : full.h / full.w;
  const w = Math.max(full.w, full.h / aspect);
  setView({ x: full.x + full.w / 2 - w / 2, y: full.y + full.h / 2 - (w * aspect) / 2, w, h: w * aspect });
}
function focusHome() {
  if (!S || window.innerWidth >= 700) return;
  const k = S.map.findIndex(t => t.o === 0 && t.b === 'residenz');
  if (k < 0) return;
  const x = k % S.W, y = Math.floor(k / S.W), sx = S.H * 50 + (x - y) * 50, sy = 25 + (x + y) * 25;
  const w = landBounds(S).w * 0.5;
  setView({ x: sx - w / 2, y: sy - w / 2 - 40, w, h: w });
}
// Ausschnitt setzen: Seitenverhältnis wie der Bildschirm, Mitte bleibt im Land
function setView(v: View) {
  const full = landBounds(S!);
  const el = document.getElementById('mapwrap');
  const aspect = el && el.clientWidth ? el.clientHeight / el.clientWidth : v.h / v.w;
  const w = Math.max(260, Math.min(full.w * 1.4, v.w)), h = w * aspect;
  const cx = Math.max(full.x, Math.min(full.x + full.w, v.x + v.w / 2));
  const cy = Math.max(full.y, Math.min(full.y + full.h, v.y + v.h / 2));
  view = { x: cx - w / 2, y: cy - h / 2, w, h };
  document.getElementById('map')?.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
}
function zoomAt(f: number, px?: number, py?: number) {
  const v = view!;
  px ??= v.x + v.w / 2; py ??= v.y + v.h / 2;
  setView({ x: px - (px - v.x) * f, y: py - (py - v.y) * f, w: v.w * f, h: v.h * f });
}
function toSvg(cx: number, cy: number): [number, number] {
  const svg = document.getElementById('map') as unknown as SVGSVGElement, m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
  return [p.x, p.y];
}

// ---------- Spielbildschirm ----------
const short = (n: number) => { const a = Math.abs(n); return a >= 100000 ? `${Math.round(n / 1000)}k` : a >= 10000 ? `${(n / 1000).toFixed(1).replace('.', ',')}k` : fmt(n); };
const WEATHER_SHORT: Record<string, string> = { duerre: 'Dürre', nass: 'Regen', normal: 'Normal', gut: 'Gutes Jahr', rekord: 'Rekord' };
const RES: [string, string][] = [['taler', 'Taler'], ['korn', 'Korn'], ['land', 'Land'], ['volk', 'Volk'], ['ansehen', 'Ansehen']];
function chips(h: House): string {
  const v: Record<string, string> = { taler: short(h.taler), korn: short(h.korn), land: short(h.ha), volk: short(h.pop), ansehen: String(Math.round(h.rep)) };
  return RES.map(([k, l]) => `<button class="chip${popKind === k ? ' on' : ''}" data-act="pop" data-n="${k}" aria-label="${l}: ${v[k]}">${ico(k)}<b>${v[k]}</b></button>`).join('');
}
let popKind: string | null = null;
function popHtml(k: string): string {
  const s = S!, me = human(s), inc = income(s, me);
  const plus = inc.tax + inc.markets + inc.fines + inc.other, minus = inc.court + inc.army;
  const line = (l: string, v: string, cls = '') => `<span>${l}</span><b class="${cls}">${v}</b>`;
  const box = (title: string, big: string, text: string, rows: string) => `<div class="pop-h">${ico(k)}<div><small>${title}</small><b>${big}</b></div><button class="x sm" data-act="popClose" aria-label="Schließen">×</button></div><p>${text}</p><div class="ledger">${rows}</div>`;
  switch (k) {
    case 'taler': return box('Taler', fmt(me.taler), 'Deine Kasse. Damit kaufst du Korn und Land, baust und bezahlst Truppen.',
      line('Einnahmen (Prognose)', `+${fmt(plus)}`, 'pos') + line('Ausgaben (Prognose)', `−${fmt(minus)}`, 'neg') + line('Überschuss im Jahr', (plus - minus >= 0 ? '+' : '−') + fmt(Math.abs(plus - minus)), 'sum'));
    case 'korn': return box('Korn', `${fmt(me.korn)} Scheffel`, 'Jeder Einwohner isst einen Scheffel im Jahr. Was übrig bleibt, verdirbt langsam. Unter Volk legst du fest, wie viel verteilt wird.',
      line('Bedarf im Jahr', fmt(me.pop)) + line('Davon verteilt', fmt(Math.min(me.ration, me.korn))) + line('Ernte dieses Jahr', fmt(me.harvest)) + line('Kornpreis', `${s.kornPrice} T je 100`));
    case 'land': return box('Land', `${fmt(me.ha)} ha`, 'Je 1.000 ha eine Kachel auf der Karte. Land bringt Ernte, Platz für Einwohner und Bauplätze.',
      line('Kacheln', String(tilesOf(s, 0).length)) + line('Landpreis', `${s.landPrice} T je ha`) + line('Freie Kacheln im Reich', String(freeLand(s))) + line('Platz für Einwohner', fmt(capacity(s, me))));
    case 'volk': return box('Einwohner', fmt(me.pop), 'Mehr Einwohner zahlen mehr Steuern. Sie wachsen, wenn genug Korn da ist und Platz im Land.',
      line('Stimmung', moodLabel(mood(me))) + line('Platz für', fmt(capacity(s, me))) + line('Soldaten', fmt(me.soldiers)) + line('Söldner', fmt(me.mercs)));
    case 'ansehen': return box('Ansehen', `${Math.round(me.rep)} von 100`, 'Dein Ruf im Reich. Hohes Ansehen lockt Zuwanderer und bringt bessere Heiratsangebote.',
      line('Steigt durch', 'viel Korn, Titel, Burg') + line('Sinkt durch', 'Hunger, Steuern über 25 %, harte Justiz, Angriffe'));
  }
  return '';
}
function showPop(k: string | null) {
  popKind = popKind === k ? null : k;
  const p = document.getElementById('pop')!;
  p.hidden = !popKind;
  if (popKind) p.innerHTML = popHtml(popKind);
  document.getElementById('chips')!.innerHTML = chips(human(S!));
}
function renderGame() {
  const s = S!, me = human(s);
  popKind = null;
  const dk = (open: string, icon: string, label: string, dot = false) => `<button class="dk" data-open="${open}">${ico(icon)}<span>${label}</span>${dot ? '<em aria-label="neu"></em>' : ''}</button>`;
  app.innerHTML = `
  <div class="game" style="--hc:${me.def.color}">
    <div id="mapwrap">${renderMap(s)}</div>
    <header class="hud">
      <div class="chips" id="chips">${chips(me)}</div>
      <button class="badge" data-open="reich" aria-label="${esc(rulerName(me))}, Jahr ${s.year}. Reich und Titel öffnen">
        <svg viewBox="-28 -62 56 64" aria-hidden="true">${art.crown(me.titleIdx, 0, 0, me.titleIdx < 3 ? 1.25 : 1)}</svg>
        <span><b>${titleOf(me)}</b><small>${s.year} · ${WEATHER_SHORT[s.weather.id]}</small></span>
      </button>
    </header>
    <div class="pop" id="pop" hidden></div>
    <div class="zoom"><button data-act="zoomIn" aria-label="Hineinzoomen">+</button><button data-act="zoomOut" aria-label="Herauszoomen">−</button><button data-act="zoomFit" aria-label="Ganze Karte zeigen">⤢</button></div>
    <nav class="dock">
      ${dk('markt', 'markt', 'Markt')}${dk('volk', 'volkmenu', 'Volk')}${dk('bauen', 'bauen', 'Bauen')}${dk('militaer', 'militaer', 'Militär')}${dk('familie', 'familie', 'Familie', s.offers.length > 0 && !me.spouse)}${dk('reich', 'reich', 'Reich')}
      <button class="dk year" data-act="endYear">${ico('jahr')}<span>Jahr ›</span></button>
    </nav>
    <div class="sheet-back" id="sheetBack" hidden><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"><button class="x" data-act="close" aria-label="Schließen">×</button><div id="sheetBody"></div></section></div>
    <div class="toast" id="toast" role="status" hidden></div>
  </div>`;
  if (sheet) openSheet(sheet, sheetArg);
}
function refresh() {
  if (!S) return;
  const me = human(S);
  document.getElementById('chips')!.innerHTML = chips(me);
  document.getElementById('mapwrap')!.innerHTML = renderMap(S);
  if (popKind) document.getElementById('pop')!.innerHTML = popHtml(popKind);
  if (sheet) document.getElementById('sheetBody')!.innerHTML = sheetHtml(sheet, sheetArg);
  save();
}

// ---------- Handel ----------
type TKind = 'korn' | 'land';
const trade: Record<TKind, { mode: 'buy' | 'sell'; amt: number }> = { korn: { mode: 'buy', amt: 0 }, land: { mode: 'buy', amt: 0 } };
const r100 = (n: number) => Math.max(0, Math.floor(n / 100) * 100);
function tradeMax(k: TKind): number {
  const s = S!, me = human(s), t = trade[k];
  if (k === 'korn') {
    if (t.mode === 'sell') return r100(me.korn);
    let a = r100((me.taler * 100) / kornBuyPrice(s, me));
    while (a > 0 && kornCost(s, me, a) > me.taler) a -= 100;
    return a;
  }
  return t.mode === 'buy' ? r100(Math.min(me.taler / s.landPrice, maxBuyHa(s, me))) : r100(maxSellHa(s, me));
}
function tradeValue(k: TKind, amt: number): number {
  const s = S!, me = human(s), t = trade[k];
  if (k === 'korn') return t.mode === 'buy' ? kornCost(s, me, amt) : Math.floor((amt / 100) * kornSellPrice(s, me));
  return t.mode === 'buy' ? amt * s.landPrice : Math.floor(amt * s.landPrice * 0.8);
}
function tradePreview(k: TKind): string {
  const s = S!, me = human(s), t = trade[k], buy = t.mode === 'buy', v = tradeValue(k, t.amt), sg = buy ? -1 : 1;
  const arrow = (a: number, b: number, unit: string) => `${fmt(a)} <i>→</i> <b>${fmt(b)}</b> ${unit}`;
  const cash = `<div>${ico('taler')}<span>${arrow(me.taler, me.taler + sg * v, 'Taler')}</span></div>`;
  if (k === 'korn') {
    const after = me.korn - sg * t.amt;
    const enough = after >= me.pop ? `<em class="pos">reicht für dein Volk</em>` : `<em class="neg">es fehlen ${fmt(me.pop - after)} für dein Volk</em>`;
    return cash + `<div>${ico('korn')}<span>${arrow(me.korn, after, 'Scheffel')} · ${enough}</span></div>`;
  }
  const after = me.ha - sg * t.amt;
  return cash + `<div>${ico('land')}<span>${arrow(me.ha, after, 'ha')} · ${Math.max(1, Math.round(after / 1000))} Kacheln</span></div>`;
}
function tradeGoLabel(k: TKind): string {
  const t = trade[k], v = tradeValue(k, t.amt), unit = k === 'korn' ? 'Scheffel' : 'ha';
  return t.amt ? `${fmt(t.amt)} ${unit} ${t.mode === 'buy' ? 'kaufen' : 'verkaufen'} · ${t.mode === 'buy' ? '−' : '+'}${fmt(v)} T` : 'Menge wählen';
}
function tradePanel(k: TKind): string {
  const s = S!, me = human(s), t = trade[k], max = tradeMax(k);
  t.amt = Math.min(t.amt, max);
  const korn = k === 'korn';
  const price = korn ? s.kornPrice : s.landPrice;
  const [lo, hi] = korn ? [75, 130] : [30, 50];
  const tag = price < lo ? ['günstig', 'cheap'] : price > hi ? ['teuer', 'dear'] : ['normal', 'mid'];
  const tiles = tilesOf(s, 0).length;
  const quick: [string, number][] = [];
  if (korn && t.mode === 'buy') { quick.push([me.korn >= me.pop ? 'Bedarf gedeckt' : 'Bedarf decken', Math.ceil(Math.max(0, me.pop - me.korn) / 100) * 100]); quick.push(['Vorrat für 2 Jahre', Math.ceil(Math.max(0, 2 * me.pop - me.korn) / 100) * 100]); }
  if (korn && t.mode === 'sell') { quick.push(['Überschuss', r100(me.korn - me.pop)]); quick.push(['Alles', r100(me.korn)]); }
  if (!korn && t.mode === 'buy') quick.push(['+1 Kachel', Math.ceil(Math.max(100, (tiles + .5) * 1000 - me.ha) / 100) * 100], ['+3 Kacheln', Math.ceil(Math.max(100, (tiles + 2.5) * 1000 - me.ha) / 100) * 100]);
  if (!korn && t.mode === 'sell') quick.push(['−1 Kachel', Math.ceil(Math.max(100, me.ha - (tiles - .5) * 1000 + 1) / 100) * 100]);
  quick.push(['Höchstmenge', max]);
  const stock = korn
    ? `<div class="meter" title="Vorrat im Verhältnis zum Jahresbedarf"><i style="width:${Math.min(100, (me.korn / Math.max(1, me.pop)) * 50)}%"></i><s></s></div><p class="mtext">Vorrat <b>${fmt(me.korn)}</b> · Bedarf <b>${fmt(me.pop)}</b> im Jahr · Strich = 1 Jahr</p>`
    : `<p class="mtext">Du hast <b>${fmt(me.ha)} ha</b> auf <b>${tiles}</b> Kacheln. Je 1.000 ha eine Kachel. Noch ${freeLand(s)} freie Kacheln im Reich.</p>`;
  return `<div class="panel trade">
    <div class="row"><h3 class="ih">${ico(korn ? 'korn' : 'land')}${korn ? 'Korn' : 'Land'}</h3>
      <div class="pricebox"><span class="tag ${tag[1]}">${tag[0]}</span><b>${price} T</b><small>${korn ? 'je 100 Scheffel' : 'je Hektar'}</small></div></div>
    ${stock}
    <div class="seg full"><button data-act="tmode" data-k="${k}" data-n="buy" class="${t.mode === 'buy' ? 'on' : ''}">Kaufen</button><button data-act="tmode" data-k="${k}" data-n="sell" class="${t.mode === 'sell' ? 'on' : ''}">Verkaufen</button></div>
    <div class="stepper"><button class="round" data-act="tstep" data-k="${k}" data-n="-1" aria-label="Weniger" ${t.amt <= 0 ? 'disabled' : ''}>−</button>
      <output id="amt-${k}">${fmt(t.amt)} ${korn ? 'Scheffel' : 'ha'}</output>
      <button class="round" data-act="tstep" data-k="${k}" data-n="1" aria-label="Mehr" ${t.amt >= max ? 'disabled' : ''}>+</button></div>
    <input type="range" id="rng-${k}" min="0" max="${max}" step="100" value="${t.amt}" aria-label="Menge" ${max ? '' : 'disabled'}>
    <div class="quick">${quick.map(([l, n]) => `<button data-act="tset" data-k="${k}" data-n="${Math.min(n, max)}" ${n <= 0 || n > max ? 'disabled' : ''}>${l}</button>`).join('')}</div>
    <div class="preview" id="prev-${k}">${tradePreview(k)}</div>
    <button class="btn wide ${t.mode === 'sell' ? 'gold' : ''}" id="go-${k}" data-act="tgo" data-k="${k}" ${t.amt ? '' : 'disabled'}>${tradeGoLabel(k)}</button>
    ${max === 0 ? `<p class="hint">${t.mode === 'buy' ? (korn || maxBuyHa(s, me) >= 100 ? 'Dafür reichen deine Taler nicht.' : 'Es gibt kein freies Land mehr. Erobere es im Krieg.') : korn ? 'Du hast kein Korn zum Verkaufen.' : 'Bebautes Land kann nicht verkauft werden.'}</p>` : ''}
  </div>`;
}
function updateTrade(k: TKind) {
  const t = trade[k];
  document.getElementById(`amt-${k}`)!.textContent = `${fmt(t.amt)} ${k === 'korn' ? 'Scheffel' : 'ha'}`;
  document.getElementById(`prev-${k}`)!.innerHTML = tradePreview(k);
  const go = document.getElementById(`go-${k}`) as HTMLButtonElement;
  go.textContent = tradeGoLabel(k);
  go.disabled = !t.amt;
}
let toastTimer = 0;
function toast(msg: string) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { t.hidden = true; }, 2600);
}
function res(r: Result | Battle) { if ('ok' in r && !r.ok && r.msg) toast(r.msg); else if ('ok' in r && r.msg) toast(r.msg); refresh(); }

function openSheet(name: string, arg: unknown = null) {
  if (name === 'markt' && sheet !== 'markt') { trade.korn.amt = 0; trade.land.amt = 0; }
  sheet = name; sheetArg = arg; confirmWar = -1;
  if (popKind) showPop(null);
  const back = document.getElementById('sheetBack')!;
  document.getElementById('sheetBody')!.innerHTML = sheetHtml(name, arg);
  back.hidden = false;
  (back.querySelector('.sheet') as HTMLElement).scrollTop = 0;
  if (name === 'battle') playBattle();
}
function closeSheet() {
  const was = sheet;
  sheet = null; sheetArg = null;
  const back = document.getElementById('sheetBack'); if (back) back.hidden = true;
  if (was === 'report' && S?.over) renderEnd();
}

// ---------- Dialoge ----------
function card(e: EventCard, color: string, titleIdx: number): string {
  return `<figure class="ev">${art.eventArt(e.kind, color, titleIdx)}<figcaption><b>${esc(e.title)}</b><span>${esc(e.text)}</span></figcaption></figure>`;
}
const signed = (n: number) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));

function sheetHtml(name: string, arg: unknown): string {
  const s = S!, me = human(s), c = me.def.color;
  switch (name) {
    case 'report': {
      const r = s.report!;
      const sm = r.summary;
      let h = `<h2 id="sheetTitle">Anno ${r.year}</h2>`;
      if (sm) {
        h += `<h3>Bilanz ${r.year - 1}</h3><div class="ledger">
          <span>Steuern</span><b class="pos">${signed(sm.tax)}</b>
          <span>Märkte &amp; Mühlen</span><b class="pos">${signed(sm.markets)}</b>
          <span>Justiz (Strafgelder)</span><b class="pos">${signed(sm.fines)}</b>
          ${sm.other ? `<span>Silberminen</span><b class="pos">${signed(sm.other)}</b>` : ''}
          <span>Hofhaltung</span><b class="neg">${signed(-sm.court)}</b>
          <span>Heer</span><b class="neg">${signed(-sm.army)}</b>
          ${sm.interest ? `<span>Schuldzinsen</span><b class="neg">${signed(-sm.interest)}</b>` : ''}
          <span class="sum">Überschuss</span><b class="sum ${sm.net >= 0 ? 'pos' : 'neg'}">${signed(sm.net)} Taler</b>
        </div>
        <div class="ledger">
          <span>Geburten / Tote</span><b>+${fmt(sm.born)} / −${fmt(sm.died)}</b>
          <span>Zuzug / Abwanderung</span><b>+${fmt(sm.immig)} / −${fmt(sm.emig)}</b>
          ${sm.starved ? `<span>Verhungert</span><b class="neg">−${fmt(sm.starved)}</b>` : ''}
          <span>Korn gegessen / verdorben</span><b>${fmt(sm.eaten)} / ${fmt(sm.spoiled)}</b>
          <span class="sum">Einwohner</span><b class="sum">${fmt(sm.popStart)} → ${fmt(sm.popEnd)}</b>
        </div>`;
      }
      if (r.endEvents.length) h += `<div class="evs">${r.endEvents.map(e => card(e, c, me.titleIdx)).join('')}</div>`;
      if (r.battles.length) h += r.battles.map((b, i) => `<div class="warn"><b>${s.houses[b.a].def.name} hat dich angegriffen.</b> ${b.win ? `Du hast ${fmt(b.tiles * 1000)} ha Land und ${fmt(b.plunder)} Taler verloren.` : 'Deine Truppen haben den Angriff abgewehrt.'} <button class="btn small" data-act="watch" data-n="${i}">Schlacht ansehen</button></div>`).join('');
      h += `<h3>Das neue Jahr</h3><div class="evs">${card({ kind: r.weather.id, title: r.weather.name, text: `${r.weather.text} Ernte: ${fmt(r.harvest)} Scheffel Korn.` }, c, 0)}${r.events.map(e => card(e, c, me.titleIdx)).join('')}</div>`;
      if (r.news.length) h += `<h3>Nachrichten aus dem Reich</h3><ul class="news">${r.news.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
      if (r.year === s.startYear) h += `<p class="hint">Tipp: Im <b>Markt</b> handelst du Korn und Land, unter <b>Volk</b> verteilst du Korn und legst Steuern fest. Unter <b>Reich</b> siehst du, was für den nächsten Titel fehlt.</p>`;
      return h + `<button class="btn gold wide" data-act="close">Ans Werk</button>`;
    }
    case 'markt':
      return `<h2 id="sheetTitle">Markt</h2>${tradePanel('korn')}${tradePanel('land')}`;
    case 'volk': {
      const m = mood(me), inc = income(s, me);
      return `<h2 id="sheetTitle">Volk</h2>
        <div class="panel"><div class="row"><h3><label for="ration">Korn verteilen</label></h3><span class="mood m${moodLabel(m)}" id="moodPill">${moodLabel(m)}</span></div>
          <input type="range" id="ration" min="0" max="${me.korn}" step="50" value="${Math.min(me.ration, me.korn)}">
          <p id="rationTxt">${fmt(me.ration)} von ${fmt(me.korn)} Scheffel · Bedarf ${fmt(me.pop)}</p>
          <p class="hint">Weniger als der Bedarf: Hunger und Abwanderung. Mehr: Zuzug, Geburten und Ansehen.</p></div>
        <div class="panel"><div class="row"><h3><label for="tax">Steuern</label></h3><b id="taxTxt">${me.tax} %</b></div>
          <input type="range" id="tax" min="0" max="50" step="1" value="${me.tax}">
          <p id="incTxt">Erwartete Steuern: ${fmt(inc.tax)} Taler · Strafgelder: ${fmt(inc.fines)} Taler</p>
          <p class="hint">Über 25 % wandern Leute ab und das Ansehen sinkt.</p></div>
        <div class="panel"><h3>Justiz</h3><div class="seg">${[1, 2, 3, 4].map(n => `<button data-act="justice" data-n="${n}" class="${me.justice === n ? 'on' : ''}">${JUSTICE[n]}</button>`).join('')}</div>
          <p class="hint">Strenge Justiz bringt Strafgelder, vertreibt aber Menschen.</p></div>`;
    }
    case 'bauen': {
      const w = (b: BType) => { const o: art.O = { x: 60, y: 62, s: .62 }; return `<svg viewBox="0 0 120 90" aria-hidden="true">${art.tile(o, 0, 0, '#74c043')}${art.buildingArt(o, 0, 0, b, c, 4)}</svg>`; };
      return `<h2 id="sheetTitle">Bauen</h2><div class="builds">${BUILD_DEFS.map(d => {
        const can = canBuild(s, me, d.type), have = count(s, 0, d.type), lim = buildLimit(s, me, d.type);
        return `<div class="bcard">${w(d.type)}<div><h3>${d.name} <small>${have}/${d.sections ? 4 : lim}</small></h3><p>${d.text}</p>
          <button class="btn small" data-act="build" data-n="${d.type}" ${can.ok ? '' : 'disabled'}>${d.sections && have ? 'Abschnitt bauen' : 'Bauen'} · ${fmt(d.cost)} T</button>${can.ok ? '' : `<small class="why">${esc(can.msg!)}</small>`}</div></div>`;
      }).join('')}</div>`;
    }
    case 'militaer': {
      const others = s.houses.filter(h => h.alive && !h.human);
      const est = (h: House) => Math.round(strength(s, h, true) / 25) * 25;
      return `<h2 id="sheetTitle">Militär</h2>
        <div class="panel"><div class="row"><div><h3>Musketiere: ${fmt(me.soldiers)}</h3><p>Aus deinem Volk, ${RECRUIT_COST} T Werbung, ${SOLDIER_UPKEEP} T Sold im Jahr. Höchstens ${fmt(maxSoldiers(me))}.</p></div>
          <svg class="mini" viewBox="-30 -80 60 85" aria-hidden="true">${art.person(0, 0, 1, c, 'soldier')}</svg></div>
          <div class="btns"><button class="btn small" data-act="recruit" data-n="10">+10</button><button class="btn small" data-act="recruit" data-n="50">+50</button><button class="btn small" data-act="recruit" data-n="200">+200</button><button class="btn small ghost" data-act="dismiss" data-n="50">Entlassen 50</button></div></div>
        <div class="panel"><div class="row"><div><h3>Söldner: ${fmt(me.mercs)}</h3><p>Doppelt so stark. ${MERC_COST} T Handgeld, ${MERC_UPKEEP} T Sold. Ohne Geld laufen sie davon.</p></div>
          <svg class="mini" viewBox="-30 -105 60 110" aria-hidden="true">${art.person(0, 0, 1, '#ef7d32', 'merc')}</svg></div>
          <div class="btns"><button class="btn small" data-act="hire" data-n="10">+10</button><button class="btn small" data-act="hire" data-n="50">+50</button><button class="btn small ghost" data-act="fire" data-n="50">Entlassen 50</button></div></div>
        <div class="panel"><h3>Feldzug ${me.warred ? '<small>(dieses Jahr schon geführt)</small>' : ''}</h3>
          <p>Deine Angriffskraft: <b>${fmt(strength(s, me, false))}</b> · Verteidigung: <b>${fmt(strength(s, me, true))}</b>${count(s, 0, 'burg') ? ' (mit Burg)' : ''}</p>
          <div class="targets">${others.map(h => {
            const al = allied(s, 0, h.idx);
            const btn = al ? '<span class="tag">verbündet</span>' : confirmWar === h.idx
              ? `<button class="btn small red" data-act="war" data-n="${h.idx}">Wirklich angreifen!</button>`
              : `<button class="btn small" data-act="askWar" data-n="${h.idx}" ${me.warred || me.soldiers + me.mercs < 10 ? 'disabled' : ''}>Angreifen</button>`;
            return `<div class="target" style="--tc:${h.def.color}"><i></i><div><b>${esc(rulerName(h))}</b><small>${fmt(h.ha)} ha · Verteidigung etwa ${fmt(est(h))}</small></div>${btn}</div>`;
          }).join('')}</div>
          <p class="hint">Siegst du, eroberst du 10–30 % seines Landes und plünderst die Kasse. Verbündete (durch Heirat) kannst du nicht angreifen.</p></div>`;
    }
    case 'familie': {
      const r = me.ruler, sp = me.spouse;
      const pp = (fem: boolean, crown: boolean) => fem ? art.lady(0, 0, 1, c, crown) : art.person(0, 0, 1, c, 'noble');
      let h = `<h2 id="sheetTitle">Familie</h2><div class="fam">
        <div class="pcard"><svg viewBox="-30 -75 60 80" aria-hidden="true">${pp(r.female, true)}</svg><b>${esc(r.name)}</b><small>${titleOf(me)} · ${r.age} Jahre · ${me.generation}. Generation</small></div>
        <div class="pcard">${sp ? `<svg viewBox="-30 -75 60 80" aria-hidden="true">${sp.female ? art.lady(0, 0, 1, '#46a85a', true) : art.person(0, 0, 1, '#46a85a', 'noble')}</svg><b>${esc(sp.name)}</b><small>${sp.female ? 'Gemahlin' : 'Gemahl'} · ${sp.age} Jahre</small>` : `<div class="empty">♡</div><b>Unverheiratet</b><small>Ohne Erben endet dein Haus</small>`}</div>
      </div>`;
      h += `<h3>Kinder</h3>` + (me.children.length ? `<div class="kids">${me.children.map((k, i) => {
        const opts = s.houses.filter(x => x.alive && !x.human && !allied(s, 0, x.idx));
        const marry = !k.married && k.age >= 16 && opts.length ? `<div class="btns">${opts.map(x => `<button class="btn small ghost" data-act="marryChild" data-n="${i}" data-m="${x.idx}">Heirat mit ${x.def.name}</button>`).join('')}</div>` : '';
        return `<div class="kid"><svg viewBox="-20 -45 40 48" aria-hidden="true">${art.child(0, 0, 1, c, k.female)}</svg><div><b>${esc(k.name)}</b><small>${k.female ? 'Tochter' : 'Sohn'} · ${k.age} Jahre${k.married ? ' · verheiratet' : ''}${i === me.children.reduce((b, x, j) => (x.age > me.children[b].age ? j : b), 0) ? ' · Erbe' : ''}</small>${marry}</div></div>`;
      }).join('')}</div>` : `<p class="hint">Noch keine Kinder. Nach der Hochzeit kommt jedes Jahr mit etwas Glück Nachwuchs.</p>`);
      if (!sp && s.offers.length) {
        h += `<h3>Heiratsangebote ${s.year}</h3><div class="offers">${s.offers.map(o => `
          <div class="offer"><svg viewBox="-30 -75 60 80" aria-hidden="true">${o.person.female ? art.lady(0, 0, 1, o.from >= 0 ? s.houses[o.from].def.color : '#8a6440') : art.person(0, 0, 1, o.from >= 0 ? s.houses[o.from].def.color : '#8a6440', 'noble')}</svg>
          <div><b>${esc(o.person.name)}</b><small>${esc(offerHouseName(s, o))} · ${o.person.age} Jahre</small>
          <p>Mitgift: ${fmt(o.dowryTaler)} Taler${o.dowryHa ? ` und ${fmt(o.dowryHa)} ha Land` : ''}${o.from >= 0 ? ' · <b>Bündnis</b>' : ''}</p>
          <button class="btn small gold" data-act="marry" data-n="${o.id}">Heiraten</button></div></div>`).join('')}</div>`;
      } else if (!sp) h += `<p class="hint">Neue Angebote kommen jedes Jahr.</p>`;
      h += `<p class="hint">Heiraten in ein anderes Fürstenhaus macht euch zu Verbündeten. Kinder ab 16 Jahren kannst du selbst verheiraten. Stirbt dein Herrscher, erbt das älteste Kind.</p>`;
      return h;
    }
    case 'reich': {
      const next = me.titleIdx + 1;
      const reqs = titleReqs(s, me, next);
      const T = me.ruler.female ? TITLES_F : TITLES_M;
      let h = `<h2 id="sheetTitle">Reich</h2><div class="ladder">${T.map((t, i) => `<div class="${i <= me.titleIdx ? 'got' : i === next ? 'next' : ''}"><svg viewBox="-30 -90 60 95" aria-hidden="true">${art.crown(i, 0, 0, 1)}</svg><small>${t}</small></div>`).join('')}</div>`;
      if (next <= 6) h += `<div class="panel"><h3>Für den Titel ${T[next]}</h3><ul class="reqs">${reqs.map(r => `<li class="${r.ok ? 'ok' : ''}">${esc(r.label)}</li>`).join('')}</ul></div>`;
      h += `<h3>Die Fürstenhäuser</h3><div class="scroll"><table><thead><tr><th>Haus</th><th>Titel</th><th>Land</th><th>Volk</th><th>Truppen</th><th></th></tr></thead><tbody>${s.houses.map(x => `<tr class="${x.alive ? '' : 'dead'}"><td><i class="dot" style="background:${x.def.color}"></i>${x.def.name}</td><td>${x.alive ? titleOf(x) : 'erloschen'}</td><td>${fmt(x.ha)} ha</td><td>${fmt(x.pop)}</td><td>${x.human ? fmt(x.soldiers + x.mercs) : '?'}</td><td>${x.human ? 'du' : allied(s, 0, x.idx) ? 'verbündet' : ''}</td></tr>`).join('')}</tbody></table></div>`;
      h += `<h3>Chronik</h3><ul class="news">${s.chronicle.slice(-15).reverse().map(n => `<li><b>${n.year}</b> ${esc(n.text)}</li>`).join('') || '<li>Noch ist nichts geschehen.</li>'}</ul>`;
      return h + `<div class="btns"><button class="btn ghost" data-open="hilfe">Spielregeln</button><button class="btn ghost" data-act="menu">Hauptmenü</button></div>`;
    }
    case 'hilfe':
      return `<h2 id="sheetTitle">Spielregeln</h2><div class="rules">
        <p><b>Ziel:</b> Werde Kaiser oder Kaiserin, bevor es ein anderes Fürstenhaus schafft. Jede Runde ist ein Jahr.</p>
        <p><b>Korn:</b> Zu Jahresbeginn wird geerntet, je nach Wetter und Land. Jeder Einwohner isst einen Scheffel im Jahr. Verteile unter <b>Volk</b> genug, sonst hungern und fliehen die Leute.</p>
        <p><b>Geld:</b> Steuern, Märkte, Mühlen und Strafgelder bringen Taler. Hofhaltung und Truppen kosten. Im <b>Markt</b> handelst du Korn und Land zu schwankenden Preisen.</p>
        <p><b>Titel:</b> Am Jahresende prüft der Kaiserhof deine Verdienste. Unter <b>Reich</b> siehst du, was fehlt. Für König und Kaiser brauchst du Palast und Dom.</p>
        <p><b>Familie:</b> Heirate für Mitgift und Bündnisse. Sorge für Erben, denn auch Fürsten werden alt.</p>
        <p><b>Krieg:</b> Einmal im Jahr darfst du ein nicht verbündetes Haus angreifen. Die Schlacht entscheidet sich automatisch nach Truppenstärke, Burg und Glück.</p>
        <p><b>Ereignisse:</b> Ratten, Pest, Feuer und Aufstände treffen jeden. Kornspeicher und Dom mildern die Folgen.</p></div>
        <button class="btn wide" data-open="reich">Zurück</button>`;
    case 'battle': {
      const b = arg as Battle;
      const A = s.houses[b.a], D = s.houses[b.d];
      const n = (t: number) => Math.max(2, Math.min(7, Math.round(t / 25)));
      const side = (h: House, cnt: number, left: boolean) => {
        let g = '';
        for (let i = 0; i < cnt; i++) {
          const x = left ? 60 + (i % 4) * 34 + (i > 3 ? 17 : 0) : 540 - (i % 4) * 34 - (i > 3 ? 17 : 0), y = 200 + (i > 3 ? 18 : 0);
          g += art.person(x, y, 1, h.def.color, h.mercs > h.soldiers ? 'merc' : 'soldier', !left);
        }
        return g;
      };
      const meWin = (b.a === 0) === b.win;
      return `<h2 id="sheetTitle">Schlacht ${A.def.name} gegen ${D.def.name}</h2>
        <div class="battle" id="battle">
          <svg viewBox="0 0 600 240" role="img" aria-label="Schlacht">
            <rect x="0" y="170" width="600" height="70" fill="#8fd16a"/><rect x="0" y="166" width="600" height="8" fill="#74c043"/>
            ${art.flag({ x: 30, y: 172, s: 1.4 }, 0, 0, 0, A.def.color)}${art.flag({ x: 560, y: 172, s: 1.4 }, 0, 0, 0, D.def.color)}
            <g class="sideA ${b.win ? '' : 'loser'}">${side(A, n(b.aTroops), true)}</g>
            <g class="sideD ${b.win ? 'loser' : ''}">${side(D, n(b.dTroops), false)}</g>
            <g class="clash">${[[290, 120], [310, 150], [275, 160], [320, 125]].map(([x, y]) => art.poly([[x, y - 14], [x + 5, y - 4], [x + 15, y], [x + 5, y + 4], [x, y + 14], [x - 5, y + 4], [x - 15, y], [x - 5, y - 4]], '#ffd34d')).join('')}</g>
          </svg>
        </div>
        <div class="outcome" id="outcome">
          <h3 class="${meWin ? 'pos' : 'neg'}">${b.win ? `${A.def.name} siegt!` : `${D.def.name} hält stand!`}</h3>
          <p>${A.def.name}: ${fmt(b.aTroops)} Mann, Verluste ${fmt(b.aLoss)} · ${D.def.name}: ${fmt(b.dTroops)} Mann, Verluste ${fmt(b.dLoss)}</p>
          ${b.win ? `<p>${fmt(b.tiles * 1000)} ha Land und ${fmt(b.plunder)} Taler gehen an ${A.def.name}.</p>` : ''}
          <button class="btn wide" data-act="${s.report && sheetArg && (s.report.battles as unknown[]).includes(sheetArg) ? 'backReport' : 'close'}">Weiter</button>
        </div>`;
    }
  }
  return '';
}

function playBattle() {
  const el = document.getElementById('battle'), out = document.getElementById('outcome');
  if (!el || !out) return;
  if (reduce) { el.classList.add('done'); out.classList.add('show'); return; }
  out.classList.remove('show');
  requestAnimationFrame(() => el.classList.add('go'));
  setTimeout(() => el.classList.add('hit'), 1100);
  setTimeout(() => el.classList.add('done'), 1900);
  setTimeout(() => out.classList.add('show'), 2300);
}

// ---------- Ende ----------
function renderEnd() {
  const s = S!, me = human(s), won = !!s.over?.won;
  const o: art.O = { x: 200, y: 200, s: 1.6 };
  const scene = won
    ? `${art.tile(o, 0, 0, '#74c043')}${art.palace({ x: 120, y: 170, s: 1.1 }, 0, 0, me.def.color)}${art.person(250, 215, 2.4, me.def.color, 'kaiser')}${art.crown(6, 330, 110, 1.4)}`
    : `${art.tile(o, 0, 0, '#5f7a4a')}<rect x="186" y="128" width="28" height="48" fill="#9aa3ad"/><rect x="200" y="128" width="14" height="48" fill="#7d8692"/><rect x="174" y="140" width="52" height="12" fill="#9aa3ad"/>`;
  app.innerHTML = `<div class="end ${won ? 'won' : 'lost'}"><svg viewBox="0 0 400 260" role="img" aria-label="${won ? 'Krönung' : 'Grabstein'}">${scene}</svg>
    <h1>${won ? 'Gekrönt!' : 'Das Spiel ist aus'}</h1><p>${esc(s.over!.text)}</p><p class="fine">${s.year - s.startYear + 1} Jahre regiert · ${fmt(me.ha)} ha · ${fmt(me.pop)} Einwohner</p>
    <button class="btn gold" data-act="restart">Neues Spiel</button></div>`;
  clearSave();
}

// ---------- Eingaben ----------
app.addEventListener('click', e => {
  const t = (e.target as HTMLElement).closest('[data-act],[data-open]') as HTMLElement | null;
  if (popKind && !(e.target as HTMLElement).closest('#pop,.chip')) showPop(null);
  if (!t) { if ((e.target as HTMLElement).id === 'sheetBack') closeSheet(); return; }
  if (t.hasAttribute('disabled')) return;
  if (t.dataset.open) { openSheet(t.dataset.open); return; }
  const act = t.dataset.act!, n = Number(t.dataset.n), me = S ? human(S) : null;
  switch (act) {
    case 'pickHouse': startOpts.house = n; renderStart(); return;
    case 'pickSex': startOpts.female = t.dataset.n === 'f'; renderStart(); return;
    case 'pickOpp': startOpts.opponents = n; renderStart(); return;
    case 'pickDiff': startOpts.difficulty = n; renderStart(); return;
    case 'newGame': {
      const nm = (document.getElementById('rname') as HTMLInputElement).value.trim() || 'Friedrich';
      startOpts.name = nm;
      S = newGame({ seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) | 0, house: startOpts.house, name: nm, female: startOpts.female, opponents: startOpts.opponents, difficulty: startOpts.difficulty });
      save(); sheet = null; view = null; renderGame(); fitView(); focusHome(); openSheet('report'); return;
    }
    case 'continue': S = load(); sheet = null; view = null; renderGame(); fitView(); focusHome(); return;
    case 'restart': S = null; renderStart(); return;
    case 'menu': save(); S = null; sheet = null; renderStart(); return;
    case 'close': closeSheet(); return;
    case 'zoomIn': zoomAt(0.75); return;
    case 'zoomOut': zoomAt(1.33); return;
    case 'zoomFit': fitView(); return;
  }
  if (!S || !me) return;
  const k = t.dataset.k as TKind;
  switch (act) {
    case 'pop': showPop(t.dataset.n!); break;
    case 'popClose': showPop(null); break;
    case 'tmode': trade[k].mode = t.dataset.n as 'buy' | 'sell'; trade[k].amt = 0; refresh(); break;
    case 'tstep': trade[k].amt = Math.max(0, Math.min(tradeMax(k), trade[k].amt + n * 100)); refresh(); break;
    case 'tset': trade[k].amt = n; refresh(); break;
    case 'tgo': {
      const amt = trade[k].amt, buy = trade[k].mode === 'buy';
      const r = k === 'korn' ? (buy ? buyKorn(S, me, amt) : sellKorn(S, me, amt)) : (buy ? buyLand(S, me, amt) : sellLand(S, me, amt));
      if (r.ok) { toast(`${fmt(amt)} ${k === 'korn' ? 'Scheffel' : 'ha'} ${buy ? 'gekauft' : 'verkauft'}.`); trade[k].amt = 0; }
      res(r); break;
    }
    case 'justice': me.justice = n; refresh(); break;
    case 'build': { const r = build(S, me, t.dataset.n as BType); if (r.ok) toast(`${BUILD_DEFS.find(d => d.type === t.dataset.n)!.name} gebaut.`); res(r); break; }
    case 'recruit': res(recruit(S, me, n)); break;
    case 'dismiss': res(dismiss(S, me, n)); break;
    case 'hire': res(hire(S, me, n)); break;
    case 'fire': res(fire(S, me, n)); break;
    case 'askWar': confirmWar = n; document.getElementById('sheetBody')!.innerHTML = sheetHtml('militaer', null); break;
    case 'war': {
      const r = declareWar(S, 0, n);
      if ('win' in r) { save(); refresh(); openSheet('battle', r); } else res(r);
      break;
    }
    case 'watch': openSheet('battle', S.report!.battles[n]); break;
    case 'backReport': openSheet('report'); break;
    case 'marry': { const r = acceptOffer(S, n); res(r); if (r.ok) { toast('Die Hochzeit wird gefeiert!'); renderGame(); openSheet('familie'); } break; }
    case 'marryChild': res(marryChild(S, n, Number(t.dataset.m))); break;
    case 'endYear': {
      endYear(S); save(); sheet = null; renderGame();
      openSheet('report');
      break;
    }
  }
});
app.addEventListener('input', e => {
  const el = e.target as HTMLInputElement;
  if (!S) { if (el.id === 'rname') startOpts.name = el.value; return; }
  const me = human(S);
  if (el.id === 'rng-korn' || el.id === 'rng-land') {
    const k = el.id.slice(4) as TKind;
    trade[k].amt = Number(el.value); updateTrade(k); return;
  }
  if (el.id === 'ration') {
    me.ration = Number(el.value);
    const m = mood(me), l = moodLabel(m), pill = document.getElementById('moodPill')!;
    pill.textContent = l; pill.className = `mood m${l}`;
    document.getElementById('rationTxt')!.textContent = `${fmt(me.ration)} von ${fmt(me.korn)} Scheffel · Bedarf ${fmt(me.pop)}`;
  }
  if (el.id === 'tax') {
    me.tax = Number(el.value);
    const inc = income(S, me);
    document.getElementById('taxTxt')!.textContent = `${me.tax} %`;
    document.getElementById('incTxt')!.textContent = `Erwartete Steuern: ${fmt(inc.tax)} Taler · Strafgelder: ${fmt(inc.fines)} Taler`;
  }
});
app.addEventListener('change', () => { if (S) save(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet) closeSheet(); });

renderStart();

// Karte verschieben und zoomen (Maus, Mausrad, ein oder zwei Finger)
const pts = new Map<number, [number, number]>();
let drag: { cx: number; cy: number; v: View; d?: number } | null = null;
app.addEventListener('pointerdown', e => {
  if (!(e.target as Element).closest('#map') || !view) return;
  pts.set(e.pointerId, [e.clientX, e.clientY]);
  (e.target as Element).closest('#mapwrap')!.setPointerCapture(e.pointerId);
  const p = [...pts.values()];
  const cx = p.reduce((a, q) => a + q[0], 0) / p.length, cy = p.reduce((a, q) => a + q[1], 0) / p.length;
  drag = { cx, cy, v: { ...view }, d: p.length > 1 ? Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) : undefined };
});
app.addEventListener('pointermove', e => {
  if (!drag || !pts.has(e.pointerId) || !view) return;
  pts.set(e.pointerId, [e.clientX, e.clientY]);
  const svg = document.getElementById('map') as unknown as SVGSVGElement, m = svg?.getScreenCTM();
  if (!m) return;
  const p = [...pts.values()];
  const cx = p.reduce((a, q) => a + q[0], 0) / p.length, cy = p.reduce((a, q) => a + q[1], 0) / p.length;
  const scale = (view.w / drag.v.w) * m.a;
  let v = { ...drag.v, x: drag.v.x - (cx - drag.cx) / scale, y: drag.v.y - (cy - drag.cy) / scale };
  if (p.length > 1 && drag.d) {
    const f = drag.d / Math.max(1, Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]));
    const [px, py] = toSvg(drag.cx, drag.cy);
    v = { x: px - (px - drag.v.x) * f, y: py - (py - drag.v.y) * f, w: drag.v.w * f, h: drag.v.h * f };
  }
  setView(v);
});
const endDrag = (e: PointerEvent) => { pts.delete(e.pointerId); if (!pts.size) drag = null; else if (view) { const p = [...pts.values()][0]; drag = { cx: p[0], cy: p[1], v: { ...view } }; } };
app.addEventListener('pointerup', endDrag);
app.addEventListener('pointercancel', endDrag);
app.addEventListener('wheel', e => {
  if (!(e.target as Element).closest('#map') || !view) return;
  e.preventDefault();
  const [px, py] = toSvg(e.clientX, e.clientY);
  zoomAt(e.deltaY > 0 ? 1.12 : 0.89, px, py);
}, { passive: false });
