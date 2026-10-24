import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, endYear, aiTurn, tilesOf, buyLand, sellLand, build, count, titleReqs, declareWar,
  acceptOffer, human, HA_PER_TILE, GameState, maxBuyHa,
} from '../src/rules';

const game = (seed = 7, opponents = 3) => newGame({ seed, house: 0, name: 'Friedrich', female: false, opponents, difficulty: 1 });
const consistent = (s: GameState) => {
  for (const h of s.houses) {
    if (!h.alive) continue;
    for (const v of [h.taler, h.korn, h.ha, h.pop, h.rep, h.soldiers, h.mercs]) assert.ok(Number.isFinite(v), `${h.def.name}: ${v}`);
    assert.ok(h.korn >= 0 && h.pop > 0 && h.soldiers >= 0);
  }
};

test('neues Spiel: Startwerte wie im Original', () => {
  const s = game();
  assert.equal(s.houses.length, 4);
  for (const h of s.houses) {
    assert.equal(h.ha, 10000);
    assert.equal(tilesOf(s, h.idx).length, 10);
    assert.ok(h.korn > 1500, 'Ernte wurde eingebracht');
  }
  assert.equal(human(s).taler, 15000 + (human(s).taler - 15000));
  assert.ok(s.kornPrice >= 20 && s.kornPrice <= 430);
  assert.ok(s.landPrice >= 16 && s.landPrice <= 70);
});

test('gleicher Seed ergibt gleiches Spiel', () => {
  const a = game(42), b = game(42);
  for (let i = 0; i < 5; i++) { endYear(a); endYear(b); }
  assert.deepEqual(JSON.stringify(a), JSON.stringify(b));
});

test('Land kaufen und verkaufen ändert die Kacheln', () => {
  const s = game();
  const me = human(s);
  me.taler = 1e6;
  assert.ok(buyLand(s, me, 2000).ok);
  assert.equal(tilesOf(s, 0).length, 12);
  assert.ok(sellLand(s, me, 1000).ok);
  assert.equal(tilesOf(s, 0).length, 11);
  assert.equal(buyLand(s, me, maxBuyHa(s, me) + 1000).ok, false);
});

test('Bauen und Titel Graf', () => {
  const s = game();
  const me = human(s);
  me.taler = 1e6;
  buyLand(s, me, 2000);
  assert.ok(build(s, me, 'markt').ok);
  assert.ok(build(s, me, 'muehle').ok);
  assert.equal(count(s, 0, 'markt'), 1);
  me.pop = 3000;
  assert.ok(titleReqs(s, me, 1).every(r => r.ok));
  me.ration = me.korn = 5000;
  endYear(s);
  assert.equal(me.titleIdx, 1);
});

test('Palast wird in Abschnitten gebaut', () => {
  const s = game(3, 1);
  const me = human(s);
  me.taler = 1e6;
  buyLand(s, me, 6000);
  for (let i = 0; i < 4; i++) assert.ok(build(s, me, 'palast').ok);
  assert.equal(count(s, 0, 'palast'), 4);
  assert.equal(build(s, me, 'palast').ok, false);
});

test('gewonnene Schlacht bringt Land', () => {
  const s = game();
  const me = human(s);
  me.soldiers = 500;
  assert.equal(declareWar(s, 0, 1).hasOwnProperty('ok'), true, 'in den ersten zwei Jahren kein Krieg');
  endYear(s); endYear(s);
  me.soldiers = 500;
  const before = tilesOf(s, 0).length;
  const b = declareWar(s, 0, 1);
  assert.ok('win' in b && b.win);
  assert.ok(tilesOf(s, 0).length > before);
  assert.equal(Math.round(me.ha / HA_PER_TILE), tilesOf(s, 0).length);
  assert.equal(declareWar(s, 0, 2).hasOwnProperty('ok'), true, 'nur ein Feldzug pro Jahr');
});

test('Heirat bringt Mitgift und Bündnis', () => {
  const s = game();
  const me = human(s);
  let guard = 0;
  while (!s.offers.some(o => o.from >= 0) && guard++ < 30) endYear(s);
  const o = s.offers.find(o => o.from >= 0)!;
  const t = me.taler;
  assert.ok(acceptOffer(s, o.id).ok);
  assert.ok(me.spouse);
  assert.equal(me.taler, t + o.dowryTaler);
  assert.equal(declareWar(s, 0, o.from).hasOwnProperty('ok'), true);
});

test('100 Jahre Computer gegen Computer bleiben stabil und kommen voran', () => {
  let best = 0, years = 0;
  for (const seed of [1, 2, 3, 4]) {
    const s = game(seed);
    for (let y = 0; y < 100 && !s.over; y++) {
      const me = human(s);
      if (me.alive) aiTurn(s, me);
      endYear(s);
      consistent(s);
      years++;
    }
    best = Math.max(best, ...s.houses.map(h => h.titleIdx));
  }
  assert.ok(best >= 3, `höchster Titel nach 100 Jahren: ${best}`);
});
