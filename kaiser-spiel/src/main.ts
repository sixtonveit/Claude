import {
  GameState, House, Battle, EventCard, newGame, endYear, human, fmt, titleOf, rulerName, HOUSE_DEFS, BUILD_DEFS, BType,
  buyKorn, sellKorn, buyLand, sellLand, kornCost, kornSellPrice, maxBuyHa, maxSellHa, freeLand, canBuild, build, count, buildLimit,
  recruit, dismiss, hire, fire, strength, maxSoldiers, declareWar, allied, acceptOffer, marryChild, offerHouseName,
  titleReqs, mood, moodLabel, income, JUSTICE, TITLES_M, TITLES_F, RECRUIT_COST, MERC_COST, MERC_UPKEEP, SOLDIER_UPKEEP, Result, tilesOf,
} from './rules';
import * as art from './art';

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
function focusHome() {
  if (!S || window.innerWidth >= 700) return;
  const k = S.map.findIndex(t => t.o === 0 && t.b === 'residenz');
  if (k < 0) return;
  const x = k % S.W, y = Math.floor(k / S.W), sx = S.H * 50 + (x - y) * 50, sy = 25 + (x + y) * 25;
  const v = landBounds(S), w = v.w * 0.55, h = v.h * 0.55;
  setView({ x: sx - w / 2, y: sy - h / 2 - 30, w, h });
}
function setView(v: { x: number; y: number; w: number; h: number }) {
  const full = landBounds(S!);
  const w = Math.max(260, Math.min(full.w * 1.4, v.w)), f = w / v.w;
  const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
  view = { x: cx - w / 2, y: cy - (v.h * f) / 2, w, h: v.h * f };
  view.x = Math.max(full.x - w / 2, Math.min(full.x + full.w - w / 2, view.x));
  view.y = Math.max(full.y - view.h / 2, Math.min(full.y + full.h - view.h / 2, view.y));
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
function chips(h: House): string {
  const c = (l: string, v: string, col: string, title: string) => `<span class="chip" title="${title}"><i style="background:${col}">${l}</i>${v}</span>`;
  return c('T', fmt(h.taler), '#f2b53b', 'Taler') + c('K', fmt(h.korn), '#ebc23f', 'Korn in Scheffel') + c('L', `${fmt(h.ha)} ha`, '#74c043', 'Land')
    + c('V', fmt(h.pop), '#f2c6a0', 'Einwohner') + c('A', String(Math.round(h.rep)), '#3fc3dc', 'Ansehen (0–100)');
}
function renderGame() {
  const s = S!, me = human(s);
  app.innerHTML = `
  <div class="game" style="--hc:${me.def.color}">
    <header class="hud">
      <button class="badge" data-open="reich" aria-label="Reich und Titel">
        <svg viewBox="-28 -62 56 64" aria-hidden="true">${art.crown(me.titleIdx, 0, 0, me.titleIdx < 3 ? 1.25 : 1)}</svg>
        <span><b>${esc(rulerName(me))}</b><small>Jahr ${s.year} · ${esc(s.weather.name)}</small></span>
      </button>
      <div class="chips" id="chips">${chips(me)}</div>
    </header>
    <main class="mapwrap"><div id="mapwrap">${renderMap(s)}</div>
      <div class="zoom"><button data-act="zoomIn" aria-label="Hineinzoomen">+</button><button data-act="zoomOut" aria-label="Herauszoomen">−</button><button data-act="zoomFit" aria-label="Ganze Karte zeigen">⤢</button></div></main>
    <nav class="bar">
      <button class="btn" data-open="markt">Markt</button>
      <button class="btn" data-open="volk">Volk</button>
      <button class="btn" data-open="bauen">Bauen</button>
      <button class="btn" data-open="militaer">Militär</button>
      <button class="btn" data-open="familie">Familie${s.offers.length && !me.spouse ? ' <em>•</em>' : ''}</button>
      <button class="btn ghost" data-open="reich">Reich</button>
      <button class="btn gold" data-act="endYear">Jahr beenden</button>
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
  if (sheet) document.getElementById('sheetBody')!.innerHTML = sheetHtml(sheet, sheetArg);
  save();
}
let toastTimer = 0;
function toast(msg: string) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { t.hidden = true; }, 2600);
}
function res(r: Result | Battle) { if ('ok' in r && !r.ok && r.msg) toast(r.msg); else if ('ok' in r && r.msg) toast(r.msg); refresh(); }

function openSheet(name: string, arg: unknown = null) {
  sheet = name; sheetArg = arg; confirmWar = -1;
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
    case 'markt': {
      const kb = (n: number) => `<button class="btn small" data-act="buyKorn" data-n="${n}" ${kornCost(s, me, n) > me.taler ? 'disabled' : ''}>Kaufen ${fmt(n)}<small>−${fmt(kornCost(s, me, n))} T</small></button>`;
      const ks = (n: number) => `<button class="btn small ghost" data-act="sellKorn" data-n="${n}" ${n > me.korn ? 'disabled' : ''}>Verkaufen ${fmt(n)}<small>+${fmt(Math.floor(n / 100 * kornSellPrice(s, me)))} T</small></button>`;
      const lb = (n: number) => `<button class="btn small" data-act="buyLand" data-n="${n}" ${n * s.landPrice > me.taler || n > maxBuyHa(s, me) ? 'disabled' : ''}>Kaufen ${fmt(n)} ha<small>−${fmt(n * s.landPrice)} T</small></button>`;
      const ls = (n: number) => `<button class="btn small ghost" data-act="sellLand" data-n="${n}" ${n > maxSellHa(s, me) ? 'disabled' : ''}>Verkaufen ${fmt(n)} ha<small>+${fmt(Math.floor(n * s.landPrice * .8))} T</small></button>`;
      return `<h2 id="sheetTitle">Markt</h2>
        <div class="panel"><div class="row"><div><h3>Korn</h3><p>Vorrat ${fmt(me.korn)} Scheffel · Bedarf ${fmt(me.pop)} im Jahr</p></div><div class="price">${s.kornPrice}<small>Taler je 100 Scheffel</small></div></div>
        <div class="btns">${kb(100)}${kb(1000)}${ks(100)}${ks(1000)}</div>
        <p class="hint">Preise 20–430 Taler. Bei Dürre teuer, bei Rekordernten billig. Korn verdirbt mit der Zeit${count(s, 0, 'speicher') ? ', dein Speicher bremst das' : ', ein Kornspeicher hilft'}.</p></div>
        <div class="panel"><div class="row"><div><h3>Land</h3><p>${fmt(me.ha)} ha · ${tilesOf(s, 0).length} Kacheln · noch ${freeLand(s)} freie Kacheln im Reich</p></div><div class="price">${s.landPrice}<small>Taler je ha</small></div></div>
        <div class="btns">${lb(100)}${lb(500)}${lb(1000)}${ls(100)}${ls(1000)}</div>
        <p class="hint">Je 1.000 ha wächst dein Gebiet um eine Kachel. Mehr Land bringt mehr Ernte, Platz für Einwohner und Bauplätze.</p></div>`;
    }
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
      save(); sheet = null; view = null; renderGame(); focusHome(); openSheet('report'); return;
    }
    case 'continue': S = load(); sheet = null; view = null; renderGame(); focusHome(); return;
    case 'restart': S = null; renderStart(); return;
    case 'menu': save(); S = null; sheet = null; renderStart(); return;
    case 'close': closeSheet(); return;
    case 'zoomIn': zoomAt(0.75); return;
    case 'zoomOut': zoomAt(1.33); return;
    case 'zoomFit': if (S) setView(landBounds(S)); return;
  }
  if (!S || !me) return;
  switch (act) {
    case 'buyKorn': res(buyKorn(S, me, n)); break;
    case 'sellKorn': res(sellKorn(S, me, n)); break;
    case 'buyLand': res(buyLand(S, me, n)); break;
    case 'sellLand': res(sellLand(S, me, n)); break;
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
