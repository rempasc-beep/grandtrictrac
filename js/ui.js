'use strict';
/* ============================================================
   Interface : tablier SVG, dés, marque, journal, déroulement de la partie.
   L'humain joue Blanc (en bas), l'ordinateur joue Noir (en haut).
   Toutes les flèches affichées sont dans la numérotation de Blanc.
   ============================================================ */
const G = {
  st: null, human: WHITE, ai: BLACK, level: 1,
  phase: 'init',          // init | roll | wait | move | confirm | anim | over
  turn: WHITE, dice: null, moves: null, prefix: [], turnStart: null,
  selected: null, lastSteps: [], logEntries: [],
  hints: null, hintsOn: false,   // indicateurs de points du dernier jet, et leur visibilité
  okCallback: null,       // suite du jeu, en attente du bouton OK (phases 'wait' et 'confirm')
};
const $ = id => document.getElementById(id);
const rnd = () => 1 + Math.floor(Math.random() * 6);

/* ---------- Géométrie ---------- */
/* Les casiers de sortie sont hors du tablier, à gauche, à côté des jans de retour (Blanc sort en haut, Noir en bas).
   Le tablier est entouré d'un cadre : bandes longues (RAIL) percées d'un trou en face de chaque flèche,
   bandes de côté (SIDE) avec les trous de départ dans les coins de gauche. */
const BW = 1040, BH = 800, TRAY_X = 14, TRAY_W = 60, FRAME_X = TRAY_X + TRAY_W + 14, SIDE = 40, RAIL = 56,
  LEFT = FRAME_X + SIDE + 8, PW = 66, PH = 260, BAR = 50, TOP = 80, BOT = BH - 80, R = 25;
const FRAME_T = TOP - 12 - RAIL, FRAME_W = 12 * PW + BAR + 16 + 2 * SIDE, FRAME_H = BOT - TOP + 24 + 2 * RAIL;
const TRAY_H = (BOT - TOP + 24) / 2 - 6;
function trayY(c) { return c === WHITE ? TOP - 12 : TOP - 12 + TRAY_H + 12; }
const MID_X = LEFT + 6 * PW + BAR / 2 + 45;   // centre des dés et du bouton OK
function colX(c) { return LEFT + c * PW + (c >= 6 ? BAR : 0); }
function geo(p) { return p <= 12 ? { col: p - 1, top: false } : { col: 24 - p, top: true }; }
/* flèche p (numérotation du joueur c) -> numérotation de Blanc */
function toWhite(c, p) { return (c === WHITE || p === OFF) ? p : 25 - p; }
function fromWhite(c, wp) { return (c === WHITE || wp === OFF) ? wp : 25 - wp; }
/* ordonnée de la i-ème dame d'une pile (0 = au bord du tablier) */
function slotY(top, i) { return top ? TOP + R + 2 + i * (2 * R - 2) : BOT - R - 2 - i * (2 * R - 2); }
/* marque : trous des fichets sur les bandes du cadre (Noir en haut, Blanc en bas) ;
   jetons de points au milieu du tablier, juste au-delà de la pointe des flèches du joueur */
function holeY(c) { return c === BLACK ? FRAME_T + 16 : BOT + 12 + RAIL - 16; }
function jetonY(c) { return c === BLACK ? TOP + PH + 14 : BOT - PH - 14; }
const TALON_X = colX(0) + PW / 2;   // au départ, les trois jetons sont entre les deux talons
const MARK_START_X = FRAME_X + SIDE / 2;      // trou de départ, au coin gauche (0 trou, 0 point)
const SIDE_HOLES = [BH / 2 - 150, BH / 2 + 150];  // trous des bandes de côté
function markX(n) { return n <= 0 ? MARK_START_X : colX(Math.min(n, 12) - 1) + PW / 2; }

/* ---------- SVG helpers ---------- */
const NS = 'http://www.w3.org/2000/svg';
function el(name, attrs, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function text(x, y, str, attrs, parent) {
  const t = el('text', Object.assign({ x, y, 'text-anchor': 'middle' }, attrs), parent);
  t.textContent = str;
  return t;
}

/* ---------- Tablier ---------- */
function renderBoard() {
  const svg = $('board');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const st = G.st;

  el('rect', { x: 0, y: 0, width: BW, height: BH, fill: '#3b2616' }, svg);
  /* cadre du tablier */
  el('rect', { x: FRAME_X, y: FRAME_T, width: FRAME_W, height: FRAME_H, fill: '#5e3b1d', stroke: '#22140a', 'stroke-width': 2, rx: 8 }, svg);
  el('rect', { x: FRAME_X + 5, y: FRAME_T + 5, width: FRAME_W - 10, height: FRAME_H - 10, fill: 'none', stroke: '#7a5230', 'stroke-width': 1, rx: 5 }, svg);
  for (const half of [0, 1]) {
    const x = colX(half * 6) - 8;
    el('rect', { x, y: TOP - 12, width: 6 * PW + 16, height: BOT - TOP + 24, fill: '#c9a46c', rx: 4 }, svg);
  }
  el('rect', { x: colX(5) + PW + 4, y: TOP - 12, width: BAR - 8, height: BOT - TOP + 24, fill: '#3d2614', rx: 3 }, svg);

  /* casiers de sortie */
  el('rect', { x: TRAY_X, y: trayY(WHITE), width: TRAY_W, height: TRAY_H, fill: '#c9a46c', rx: 4 }, svg);
  el('rect', { x: TRAY_X, y: trayY(BLACK), width: TRAY_W, height: TRAY_H, fill: '#c9a46c', rx: 4 }, svg);
  text(TRAY_X + TRAY_W / 2, TOP + 20, 'Sorties', { 'font-size': 13, fill: '#5a3a1e' }, svg);
  text(TRAY_X + TRAY_W / 2, TOP + 60, String(st.off[WHITE]), { 'font-size': 26, fill: '#f3ecdf', 'font-weight': 'bold', stroke: '#2a2522', 'stroke-width': 0.6 }, svg);
  text(TRAY_X + TRAY_W / 2, BOT - 8, 'Sorties', { 'font-size': 13, fill: '#5a3a1e' }, svg);
  text(TRAY_X + TRAY_W / 2, BOT - 40, String(st.off[BLACK]), { 'font-size': 26, fill: '#2a2522', 'font-weight': 'bold' }, svg);

  renderMarque(svg);
  const sel = selectionInfo();

  for (let p = 1; p <= 24; p++) {
    const { col, top } = geo(p);
    const x0 = colX(col), cx = x0 + PW / 2;
    const dark = col % 2 === (top ? 1 : 0);
    const pts = top
      ? `${x0 + 4},${TOP} ${x0 + PW - 4},${TOP} ${cx},${TOP + PH}`
      : `${x0 + 4},${BOT} ${x0 + PW - 4},${BOT} ${cx},${BOT - PH}`;
    el('polygon', { points: pts, fill: dark ? '#7f4d22' : '#ecd9b0', stroke: '#4a2d12', 'stroke-width': 1 }, svg);
    const isCoin = p === 12 || p === 13, isTalon = p === 1 || p === 24;
    if (isCoin || isTalon) {
      text(cx, top ? TOP + PH + 18 : BOT - PH - 10, isCoin ? 'coin' : 'talon', { 'font-size': 12, fill: '#f4ecdc', 'font-style': 'italic' }, svg);
    }

    const wn = st.b[WHITE][p], bn = st.b[BLACK][25 - p];
    const n = wn + bn, color = wn > 0 ? WHITE : BLACK;
    const shown = Math.min(n, 5);
    for (let i = 0; i < shown; i++) {
      const cy = slotY(top, i);
      el('circle', { cx, cy, r: R - 2, fill: color === WHITE ? '#f3ecdf' : '#2a2522', stroke: color === WHITE ? '#8a7a66' : '#000', 'stroke-width': 1.5 }, svg);
    }
    if (n > 5) {
      const cy = slotY(top, shown - 1);
      text(cx, cy + 6, String(n), { 'font-size': 18, 'font-weight': 'bold', fill: color === WHITE ? '#2a2522' : '#f3ecdf' }, svg);
    }

    /* surbrillances */
    const wp = p;
    if (sel.sources.has(wp)) {
      const cy = slotY(top, shown - 1);
      el('circle', { cx, cy, r: R + 1, fill: 'none', stroke: sel.selected === wp ? '#ffd23f' : '#4caf50', 'stroke-width': 4 }, svg);
    }
    if (sel.targets.has(wp)) {
      el('polygon', { points: pts, fill: 'rgba(60,140,255,0.35)', stroke: '#2b6fd6', 'stroke-width': 3 }, svg);
      const cy = slotY(top, shown);
      el('circle', { cx, cy, r: R - 6, fill: 'none', stroke: '#2b6fd6', 'stroke-width': 3, 'stroke-dasharray': '6 4' }, svg);
    }
    if (G.lastSteps.some(s => toWhite(G.turn, s.to) === wp || toWhite(G.turn, s.from) === wp)) {
      el('rect', { x: x0 + 8, y: top ? TOP - 8 : BOT + 2, width: PW - 16, height: 6, fill: '#ffd23f', rx: 2 }, svg);
    }

    /* zone cliquable */
    const hit = el('rect', { x: x0, y: top ? TOP - 30 : BOT - PH - 30, width: PW, height: PH + 60, fill: 'transparent', style: 'cursor:pointer' }, svg);
    hit.addEventListener('click', () => onPointClick(wp));
  }

  /* casier de sortie de Blanc cliquable */
  if (sel.targets.has(OFF)) {
    el('rect', { x: TRAY_X, y: trayY(WHITE), width: TRAY_W, height: TRAY_H, fill: 'rgba(60,140,255,0.35)', stroke: '#2b6fd6', 'stroke-width': 3, rx: 4 }, svg);
  }
  const tray = el('rect', { x: TRAY_X, y: trayY(WHITE), width: TRAY_W, height: TRAY_H, fill: 'transparent', style: 'cursor:pointer' }, svg);
  tray.addEventListener('click', () => onPointClick(OFF));

  /* dés au centre */
  if (G.dice) {
    const used = usedDice();
    drawDie(svg, MID_X - 60, BH / 2 - 24, G.dice[0], used[0]);
    drawDie(svg, MID_X + 12, BH / 2 - 24, G.dice[1], used[1]);
  }

  if (G.hints && G.hintsOn) renderHints(svg, G.hints);
  drawButtons(svg);
}

/* ---------- Marque : trous (fichets) et jetons de points ---------- */
function drawHole(svg, x, y, passed) {
  el('circle', { cx: x, cy: y, r: 6, fill: passed ? '#6e4a22' : '#160d05', stroke: '#c9a34a', 'stroke-width': 1.6 }, svg);
}
function renderMarque(svg) {
  const st = G.st;
  /* trous des bandes de côté et des coins de droite (comme sur un vrai tablier) */
  const RX = FRAME_X + FRAME_W - SIDE / 2;
  for (const y of SIDE_HOLES) { drawHole(svg, MARK_START_X, y, false); drawHole(svg, RX, y, false); }
  drawHole(svg, RX, BH / 2, false);
  for (const c of [BLACK, WHITE]) {
    const y = holeY(c);
    /* bande percée de douze trous, en face des flèches, plus le trou de départ au coin */
    drawHole(svg, RX, y, false);
    for (let n = 0; n <= 12; n++) drawHole(svg, markX(n), y, n > 0 && n < st.trous[c]);
    /* fichet */
    const fx = markX(st.trous[c]), white = c === WHITE;
    const fichet = el('g', {}, svg);
    el('title', {}, fichet).textContent = `${PLAYER_NAMES[c]} : ${st.trous[c]} trou${st.trous[c] > 1 ? 's' : ''}`;
    el('circle', { cx: fx, cy: y, r: 8, fill: white ? '#f3ecdf' : '#2a2522', stroke: white ? '#8a7a66' : '#000', 'stroke-width': 1.5 }, fichet);
    el('circle', { cx: fx - 2.5, cy: y - 2.5, r: 2.5, fill: white ? '#fff' : '#6a625c' }, fichet);
  }
  /* jetons de points, posés au milieu du tablier à la pointe des flèches du joueur (sa table du talon puis celle du coin) ;
     le jeton de bredouille n'est ajouté, à côté du sien, qu'au joueur en bredouille qui a commencé à marquer
     alors que l'adversaire avait déjà des points (avec un seul jeton, la bredouille va de soi). */
  let bred = null;
  for (const c of [BLACK, WHITE]) {
    const pts = st.points[c], white = c === WHITE;
    const { x, dir } = jetonPos(pts);
    /* à zéro point, le jeton attend entre les deux talons */
    const y = pts > 0 ? jetonY(c) : BH / 2 + (c === BLACK ? -26 : 26);
    if (st.bredouille[c] && pts > 0 && st.points[1 - c] > 0) bred = { x: x + dir * 23, y };
    drawJeton(svg, x, y, white ? '#f3ecdf' : '#2a2522', white ? '#8a7a66' : '#000', white ? '#2a2122' : '#f3ecdf',
      pts > 0 ? String(pts) : '', `${PLAYER_NAMES[c]} : ${pts} point${pts > 1 ? 's' : ''}`);
  }
  if (!bred) bred = { x: TALON_X, y: BH / 2 };
  drawJeton(svg, bred.x, bred.y, '#d9a441', '#6b4a24', '#3d2614', 'B', 'Jeton de bredouille');
}
/* Abscisse du jeton de points (flèches dans la numérotation du joueur, 1 = talon) :
   2 entre les flèches 1 et 2, 4 entre 3 et 4, 6 contre la bande médiane côté talon,
   8 contre la bande médiane côté coin, 10 contre la bande latérale (au bout de la flèche 12).
   dir : côté où poser le jeton de bredouille, à l'écart des bandes. */
function jetonEven(pts) {
  switch (pts) {
    case 2: return { x: colX(1), dir: 1 };
    case 4: return { x: colX(3), dir: 1 };
    case 6: return { x: colX(5) + PW - 6, dir: -1 };
    case 8: return { x: colX(6) + 6, dir: 1 };
    case 10: return { x: colX(11) + PW - 2, dir: -1 };
    default: return { x: TALON_X, dir: 1 };
  }
}
function jetonPos(pts) {
  if (pts <= 0) return jetonEven(0);
  if (pts % 2 === 0) return jetonEven(Math.min(pts, 10));
  /* nombre impair (ne devrait pas arriver) : entre les deux positions voisines */
  const a = jetonEven(pts - 1), b = jetonEven(Math.min(pts + 1, 10));
  return { x: pts === 1 ? colX(0) + PW / 2 : (a.x + b.x) / 2, dir: 1 };
}
function drawJeton(svg, x, y, fill, stroke, ink, label, title) {
  const g = el('g', {}, svg);
  el('title', {}, g).textContent = title;
  el('circle', { cx: x, cy: y + 1.5, r: 11, fill: 'rgba(0,0,0,0.35)' }, g);
  el('circle', { cx: x, cy: y, r: 11, fill, stroke, 'stroke-width': 1.5 }, g);
  el('circle', { cx: x, cy: y, r: 7.5, fill: 'none', stroke, 'stroke-width': 0.8, opacity: 0.6 }, g);
  if (label) text(x, y + 4, label, { 'font-size': 11, 'font-weight': 'bold', fill: ink }, g);
}

const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
function drawDie(parent, x, y, n, used) {
  const g = el('g', { opacity: used ? 0.35 : 1 }, parent);
  el('rect', { x, y, width: 48, height: 48, rx: 8, fill: '#fffaf0', stroke: '#333', 'stroke-width': 1.5 }, g);
  for (const [dx, dy] of PIPS[n]) el('circle', { cx: x + 24 + dx * 13, cy: y + 24 + dy * 13, r: 4.5, fill: '#222' }, g);
}

/* dés déjà joués dans le coup en cours (pour l'affichage) */
function usedDice() {
  if (!G.dice) return [false, false];
  const used = [false, false];
  for (const s of G.prefix) {
    if (!used[0] && G.dice[0] === s.die) used[0] = true;
    else if (!used[1] && G.dice[1] === s.die) used[1] = true;
    else if (!used[0]) used[0] = true; else used[1] = true;
  }
  if (G.phase === 'roll' || G.phase === 'anim' && G.moves === null) return [false, false];
  return used;
}

/* ---------- Indicateurs de points (après le jet) ----------
   Affichés après chaque jet, que ce soit celui de l'humain ou de l'ordinateur : le jeu
   attend alors le bouton OK au centre du tablier (ou la touche Espace) pour continuer
   (« Annuler le coup » les fait réapparaître) :
   tous les points se marquent au jet : dames battues (flèche simple : par un dé, double :
   tout d'une, pointillée : à faux), coin battu, jan de deux tables, de mézéas, de six tables,
   pleins faits ou conservés, sortie, jan qui ne peut.
   Vert : points pour l'humain ; rouge : points pour l'ordinateur. */
const HINT_PAL = {
  good: { line: '#3ccf63', fill: '#1d8a3c', ink: '#17702f' },
  bad: { line: '#ff5b4b', fill: '#c0392b', ink: '#a32a1d' },
};
const HALO = 'rgba(25,14,5,0.8)';
const SIX_TABLES = [2, 3, 4, 5, 6, 7];

function buildHints(me, rollEv) {
  return rollEv.length ? { me, roll: rollEv.slice() } : null;
}

/* centre de la i-ème dame sur la flèche wp (numérotation de Blanc) */
function slotXY(wp, i) {
  const { col, top } = geo(wp);
  return { x: colX(col) + PW / 2, y: slotY(top, i), top };
}
function stackAt(wp) { return G.st.b[WHITE][wp] + G.st.b[BLACK][25 - wp]; }
function topSlot(wp) { return slotXY(wp, Math.max(0, Math.min(stackAt(wp), 5) - 1)); }
function unit(x, y) { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n }; }

/* Flèche courbe de la dame a vers la dame b ; renvoie le milieu de la courbe.
   Sur une même rangée elle s'incurve vers le milieu du tablier, sinon vers les coins (à droite). */
function hintArrow(g, a, b, pal, o) {
  let c;
  if (a.top === b.top) {
    const h = Math.min(220, 50 + 0.35 * Math.abs(b.x - a.x)) + (o.bend || 0);
    c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (a.top ? h : -h) };
  } else {
    c = { x: Math.max(a.x, b.x) + 80 + (o.bend || 0), y: (a.y + b.y) / 2 };
  }
  const u1 = unit(c.x - a.x, c.y - a.y), u2 = unit(b.x - c.x, b.y - c.y);
  const HL = 16, HW = 9, gap = o.double ? 11 : 0;
  const s = { x: a.x + u1.x * (R - 6), y: a.y + u1.y * (R - 6) };
  const tip = { x: b.x - u2.x * (R - 2), y: b.y - u2.y * (R - 2) };
  const e = { x: tip.x - u2.x * (HL + gap - 3), y: tip.y - u2.y * (HL + gap - 3) };
  const base = { d: `M${s.x},${s.y} Q${c.x},${c.y} ${e.x},${e.y}`, fill: 'none', 'stroke-linecap': o.dashed ? 'butt' : 'round' };
  if (o.dashed) base['stroke-dasharray'] = '12 7';
  el('path', Object.assign({ stroke: HALO, 'stroke-width': o.double ? 13 : 9 }, base), g);
  el('path', Object.assign({ stroke: pal.line, 'stroke-width': o.double ? 9 : 5 }, base), g);
  if (o.double) el('path', Object.assign({ stroke: 'rgba(255,255,255,0.9)', 'stroke-width': 2.5 }, base), g);
  el('circle', { cx: s.x, cy: s.y, r: 5, fill: pal.line, stroke: HALO, 'stroke-width': 2 }, g);
  const n = { x: -u2.y, y: u2.x };
  const head = t => {
    const bx = t.x - u2.x * HL, by = t.y - u2.y * HL;
    el('polygon', { points: `${t.x},${t.y} ${bx + n.x * HW},${by + n.y * HW} ${bx - n.x * HW},${by - n.y * HW}`,
      fill: pal.line, stroke: HALO, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, g);
  };
  if (o.double) head({ x: tip.x - u2.x * gap, y: tip.y - u2.y * gap });
  head(tip);
  return { x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y };
}
/* dame fictive (case d'arrivée vide) */
function hintGhost(g, p, pal) {
  el('circle', { cx: p.x, cy: p.y, r: R - 3, fill: pal.line, 'fill-opacity': 0.2, stroke: pal.line, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, g);
}
/* passage barré */
function hintCross(g, p, pal) {
  const k = 9, d = `M${p.x - k},${p.y - k} L${p.x + k},${p.y + k} M${p.x - k},${p.y + k} L${p.x + k},${p.y - k}`;
  el('path', { d, stroke: HALO, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
  el('path', { d, stroke: pal.line, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
}
function hintFrame(g, x, y, w, h, pal, certain) {
  const a = { x, y, width: w, height: h, rx: 10, fill: pal.line, 'fill-opacity': 0.07, stroke: pal.line, 'stroke-width': 3 };
  if (!certain) a['stroke-dasharray'] = '10 6';
  el('rect', a, g);
}
/* cadre autour de flèches contiguës d'une même rangée ; renvoie la place de l'étiquette (côté pointes) */
function hintZone(g, wps, pal, certain) {
  const cols = wps.map(p => geo(p).col), top = geo(wps[0]).top;
  const x0 = colX(Math.min(...cols)) + 2, x1 = colX(Math.max(...cols)) + PW - 2;
  const y0 = top ? TOP - 6 : BOT - PH - 8, y1 = top ? TOP + PH + 8 : BOT + 6;
  hintFrame(g, x0, y0, x1 - x0, y1 - y0, pal, certain);
  return { x: (x0 + x1) / 2, y: top ? TOP + PH + 20 : BOT - PH - 20 };
}
function hintTray(g, me, pal, certain) {
  const h = TRAY_H, y0 = trayY(me);
  hintFrame(g, TRAY_X - 3, y0 - 3, TRAY_W + 6, h + 6, pal, certain);
  return { x: TRAY_X + TRAY_W / 2, y: y0 + h / 2 };
}
/* étiquettes de points, décalées verticalement pour ne pas se chevaucher */
function hintBadges(g, list) {
  const H = 22;
  /* emplacements déjà pris (centre, taille) : les dés et le bouton OK, puis les étiquettes posées */
  const placed = [Object.assign({}, DICE_BOX),
    ...[OK_BTN, UNDO_BTN, PUISS_BTN].map(b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w + 8, h: b.h + 8 }))];
  for (const b of list) {
    const t = el('text', { x: 0, y: 0, 'font-size': 13, 'font-weight': 'bold', 'text-anchor': 'middle' }, g);
    t.textContent = b.label;
    let w = 0;
    try { w = t.getComputedTextLength(); } catch (err) { w = 0; }
    w = (w || b.label.length * 7.5) + 18;
    const x = Math.max(w / 2 + 4, Math.min(BW - w / 2 - 4, b.x));
    const dir = b.y > BH / 2 ? -1 : 1;
    let y = b.y;
    for (const k of [0, 1, 2, -1, 3, -2, 4]) {
      const yy = b.y + k * dir * (H + 4);
      if (!placed.some(p => Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - yy) < (p.h + H) / 2 + 3)) { y = yy; break; }
    }
    placed.push({ x, y, w, h: H });
    const r = { x: x - w / 2, y: y - H / 2, width: w, height: H, rx: H / 2 };
    if (b.certain) Object.assign(r, { fill: b.pal.fill, stroke: HALO, 'stroke-width': 1.5 });
    else Object.assign(r, { fill: '#fffaf0', stroke: b.pal.fill, 'stroke-width': 2, 'stroke-dasharray': '5 3' });
    g.insertBefore(el('rect', r), t);
    t.setAttribute('x', x);
    t.setAttribute('y', y + 4.5);
    t.setAttribute('fill', b.certain ? '#fff' : b.pal.ink);
  }
}

function renderHints(svg, H) {
  const g = el('g', { 'pointer-events': 'none' }, svg);
  const gZ = el('g', {}, g), gA = el('g', {}, g), gB = el('g', {}, g);
  const badges = [];
  const W = p => toWhite(H.me, p);
  const palOf = e => (e.who === G.human ? HINT_PAL.good : HINT_PAL.bad);
  const add = (pos, label, pal, certain = true) => badges.push({ x: pos.x, y: pos.y, label, pal, certain });
  /* arrivée sur une flèche : sur la dame adverse si elle est occupée, sinon dame fictive */
  const landing = (wp, i, pal) => {
    if (stackAt(wp)) return topSlot(wp);
    const p = slotXY(wp, i);
    hintGhost(gZ, p, pal);
    return p;
  };

  for (const e of H.roll) {
    const pal = palOf(e), pts = '+' + e.pts;
    switch (e.kind) {
      case 'battre':
        add(hintArrow(gA, topSlot(W(e.from)), slotXY(W(e.t), 0), pal, { double: !!e.tout }), pts, pal);
        break;
      case 'faux':
        for (const v of new Set([e.from + e.d1, e.from + e.d2])) {
          hintCross(gA, stackAt(W(v)) ? topSlot(W(v)) : slotXY(W(v), 0), pal);
        }
        add(hintArrow(gA, topSlot(W(e.from)), slotXY(W(e.t), 0), pal, { double: true, dashed: true }), 'À faux ' + pts, pal);
        break;
      case 'coin': {
        const c = W(ADV_COIN);
        e.from.forEach((p, i) => hintArrow(gA, topSlot(W(p)), landing(c, i, pal), pal, { bend: 35 * i }));
        add(slotXY(c, 3), 'Coin battu ' + pts, pal);
        break;
      }
      case 'deuxtables':
      case 'contre-deuxtables':
        e.paths.forEach(([p, q], i) => hintArrow(gA, topSlot(W(p)), landing(W(q), 0, pal), pal, { bend: 25 * i }));
        add({ x: slotXY(W(COIN), 0).x, y: BH / 2 },
          (e.kind === 'deuxtables' ? 'Jan de deux tables ' : 'Contre-jan de deux tables ') + pts, pal);
        break;
      case 'mezeas':
      case 'contre-mezeas':
        add(hintZone(gZ, [W(COIN)], pal, true), (e.kind === 'mezeas' ? 'Jan de mézéas ' : 'Contre-jan de mézéas ') + pts, pal);
        break;
      case 'six':
        add(hintZone(gZ, SIX_TABLES.map(W), pal, true), 'Jan de six tables ' + pts, pal);
        break;
      case 'plein':
        add(hintZone(gZ, JANS[e.jan].map(W), pal, true), 'Plein ' + (e.n > 1 ? e.n + ' manières ' : '') + pts, pal);
        break;
      case 'conserve':
        add(hintZone(gZ, JANS[e.jan].map(W), pal, true), 'Plein conservé ' + pts, pal);
        break;
      case 'sortie':
        add(hintTray(gZ, H.me, pal, true), 'Sortie ' + pts, pal);
        break;
      case 'nepeut':
        hintFrame(gZ, MID_X - 70, BH / 2 - 32, 140, 64, pal, true);
        add({ x: MID_X, y: BH / 2 + 48 }, 'Jan qui ne peut ' + pts, pal);
        break;
    }
  }

  hintBadges(gB, badges);
}

/* Boutons au centre du tablier : « Lancer les dés » (à la place des dés), OK à droite des dés
   (fait partir les indicateurs, valide le coup), « Annuler le coup » à droite du OK,
   « Prendre le coin par puissance » dans la moitié gauche. */
const DICE_BOX = { x: MID_X, y: BH / 2, w: 120, h: 48 };          // emprise des dés (centre, taille)
const ROLL_BTN = { x: MID_X - 85, y: BH / 2 - 26, w: 170, h: 52 };  // coin haut gauche, taille
const OK_BTN = { x: MID_X + 80, y: BH / 2 - 24, w: 72, h: 48 };
const UNDO_BTN = { x: OK_BTN.x + OK_BTN.w + 14, y: BH / 2 - 20, w: 150, h: 40 };
const PUISS_BTN = { x: colX(0) + 3 * PW - 140, y: BH / 2 - 20, w: 280, h: 40 };
function svgButton(svg, b, o) {
  const { x, y, w, h } = b;
  const g = el('g', { class: 'svg-btn', role: 'button', 'aria-label': o.label }, svg);
  el('title', {}, g).textContent = o.title || o.label;
  el('rect', { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: (h + 6) / 2, fill: HALO }, g);
  el('rect', { class: 'btn-face', x, y, width: w, height: h, rx: h / 2, fill: o.fill || '#ffd23f', stroke: '#3d2614', 'stroke-width': 2 }, g);
  const fs = o.size || 16, cx = x + w / 2, base = y + h / 2 + fs * 0.35;
  if (o.sub) {
    text(cx, base - 6, o.label, { 'font-size': fs, 'font-weight': 'bold', fill: '#3d2614' }, g);
    text(cx, base + 9, o.sub, { 'font-size': 11, 'font-style': 'italic', fill: '#5a3a1e' }, g);
  } else {
    text(cx, base, o.label, { 'font-size': fs, 'font-weight': 'bold', fill: '#3d2614' }, g);
  }
  g.addEventListener('click', o.onClick);
  return g;
}
function drawButtons(svg) {
  const human = G.turn === G.human;
  if (G.phase === 'roll' && human) {
    svgButton(svg, ROLL_BTN, { label: 'Lancer les dés', sub: 'espace', size: 19, title: 'Lancer les dés (Espace)', onClick: rollDice });
  }
  if (G.okCallback) {
    svgButton(svg, OK_BTN, { label: 'OK', sub: 'espace', size: 21, title: 'Continuer (Espace)', onClick: pressOk });
  }
  if (human && (G.phase === 'confirm' || G.phase === 'move' && G.prefix.length > 0)) {
    svgButton(svg, UNDO_BTN, { label: 'Annuler le coup', size: 15, fill: '#e6c48f', onClick: undoTurn });
  }
  if (G.phase === 'move' && human && G.prefix.length === 0 && G.moves && G.moves.some(m => m.puissance)) {
    svgButton(svg, PUISS_BTN, { label: 'Prendre le coin par puissance', size: 15, fill: '#e6c48f', onClick: playPuissance });
  }
}
function rollDice() { if (G.phase === 'roll' && G.turn === G.human) startTurn(); }

/* ---------- Sélection (tour de l'humain) ---------- */
function consistentSeqs() {
  return G.moves.filter(mv => !mv.puissance && G.prefix.every((s, i) => mv.steps[i].from === s.from && mv.steps[i].to === s.to));
}
function nextSteps() {
  const n = G.prefix.length;
  return consistentSeqs().filter(mv => mv.steps.length > n).map(mv => mv.steps[n]);
}
/* Destinations de la dame en from (numérotation du joueur) -> pas à jouer : un dé,
   ou les dés restants tout d'une (la même dame enchaîne). On garde le chemin le plus court. */
function pathsFrom(from) {
  const n = G.prefix.length, res = new Map();
  for (const mv of consistentSeqs()) {
    let pos = from;
    const path = [];
    for (const s of mv.steps.slice(n)) {
      if (s.from !== pos) break;
      path.push(s);
      pos = s.to;
      if (!res.has(pos) || res.get(pos).length > path.length) res.set(pos, path.slice());
      if (pos === OFF) break;
    }
  }
  return res;
}
/* Prise du coin par puissance encore possible : coup disponible et rien de joué. */
function puissanceMove() {
  return G.prefix.length === 0 && G.moves ? G.moves.find(m => m.puissance) || null : null;
}
function selectionInfo() {
  const info = { sources: new Set(), targets: new Set(), selected: null };
  if (G.phase !== 'move' || G.turn !== G.human) return info;
  const steps = nextSteps();
  for (const s of steps) info.sources.add(toWhite(G.human, s.from));
  const pm = puissanceMove();
  if (pm) for (const s of pm.steps) info.sources.add(toWhite(G.human, s.from));
  if (G.selected !== null) {
    info.selected = toWhite(G.human, G.selected);
    for (const to of pathsFrom(G.selected).keys()) info.targets.add(toWhite(G.human, to));
    /* une des deux dames de la prise par puissance : son coin est une arrivée */
    if (pm && pm.steps.some(s => s.from === G.selected)) info.targets.add(toWhite(G.human, COIN));
  }
  return info;
}
function onPointClick(wp) {
  if (G.phase !== 'move' || G.turn !== G.human) return;
  const p = fromWhite(G.human, wp);
  const steps = nextSteps();
  if (G.selected !== null) {
    const pm = puissanceMove();
    if (p === COIN && pm && pm.steps.some(s => s.from === G.selected) && !pathsFrom(G.selected).has(COIN)) {
      G.selected = null;
      playPuissance();
      return;
    }
    const path = pathsFrom(G.selected).get(p);
    if (path) {
      for (const s of path) {
        applyStep(G.human, s);
        G.prefix.push(s);
        G.lastSteps.push(s);
      }
      G.selected = null;
      const seqs = consistentSeqs();
      if (seqs.length && seqs[0].steps.length === G.prefix.length) {
        awaitConfirm({ steps: G.prefix.slice(), puissance: false });
        return;
      }
      /* une seule dame jouable ensuite : la présélectionner */
      const nxt = nextSteps();
      const froms = new Set(nxt.map(x => x.from));
      if (froms.size === 1) G.selected = nxt[0].from;
      renderAll();
      return;
    }
    if (p === G.selected) { G.selected = null; renderAll(); return; }
  }
  const pm = puissanceMove();
  if (steps.some(s => s.from === p) || (pm && pm.steps.some(s => s.from === p))) { G.selected = p; renderAll(); }
}
/* Coup complet : il attend d'être validé (OK ou Espace) et peut encore être annulé. */
function awaitConfirm(mv) {
  G.phase = 'confirm';
  G.okCallback = () => { G.phase = 'anim'; renderAll(); finishMove(mv); };
  renderAll();
}
function undoTurn() {
  if ((G.phase !== 'move' && G.phase !== 'confirm') || G.turn !== G.human) return;
  G.okCallback = null;
  G.st.b[G.human] = Int8Array.from(G.turnStart.b[G.human]);
  G.st.off[G.human] = G.turnStart.off[G.human];
  G.prefix = []; G.lastSteps = []; G.selected = null;
  if (G.hints) { G.hintsOn = true; waitOk(beginHumanMove); } else beginHumanMove();
}
function playPuissance() {
  if (G.phase !== 'move' || G.turn !== G.human || G.prefix.length) return;
  const mv = G.moves.find(m => m.puissance);
  if (!mv) return;
  for (const s of mv.steps) applyStep(G.human, s);
  G.prefix = mv.steps.slice();
  G.lastSteps = mv.steps.slice();
  awaitConfirm(mv);
}

/* ---------- Déroulement ---------- */
function applyStep(me, s) {
  const m = G.st.b[me];
  m[s.from]--;
  if (s.to === OFF) G.st.off[me]++; else m[s.to]++;
}

/* Pause sur les indicateurs de points : le jeu reprend (next) au bouton OK ou à la touche Espace. */
function waitOk(next) {
  G.phase = 'wait';
  G.okCallback = next;
  renderAll();
}
function pressOk() {
  const next = G.okCallback;
  if (!next || (G.phase !== 'wait' && G.phase !== 'confirm')) return;
  G.okCallback = null;
  G.hintsOn = false;
  next();
}
/* l'humain choisit son coup (s'il n'a qu'une dame jouable, elle est présélectionnée) */
function beginHumanMove() {
  G.phase = 'move';
  const froms = new Set(nextSteps().map(x => x.from));
  if (froms.size === 1 && !G.moves.some(m => m.puissance)) G.selected = [...froms][0];
  renderAll();
}

function newGame() {
  G.st = newState();
  G.level = parseInt($('level').value, 10);
  G.phase = 'init'; G.prefix = []; G.moves = null; G.dice = null; G.lastSteps = []; G.selected = null;
  G.logEntries = [];
  $('log').innerHTML = '';
  $('modal').classList.add('hidden');
  hideFinale();
  log('Nouvelle partie en 12 trous. Chaque joueur jette un dé pour savoir qui commence.', 'info');
  let a, b;
  do { a = rnd(); b = rnd(); } while (a === b);
  const starter = a > b ? WHITE : BLACK;
  log(`Blanc ${a}, Noir ${b} : ${PLAYER_NAMES[starter]} commence.`, 'dice');
  G.turn = starter;
  scheduleTurn();
}

function scheduleTurn() {
  if (gameOver(G.st)) { endGame(); return; }
  G.phase = 'roll'; G.dice = null; G.moves = null; G.prefix = []; G.selected = null;
  G.hints = null; G.hintsOn = false; G.okCallback = null;
  renderAll();
  if (G.turn === G.ai) setTimeout(startTurn, 700);
}

function startTurn() {
  const me = G.turn, st = G.st;
  const d1 = rnd(), d2 = rnd();
  G.dice = [d1, d2];
  G.turnStart = cloneState(st);
  G.moves = genMoves(st, me, d1, d2);
  G.prefix = []; G.selected = null; G.lastSteps = [];
  G.level = parseInt($('level').value, 10);
  log(`${PLAYER_NAMES[me]} jette ${d1}-${d2}${d1 === d2 ? ' (doublet)' : ''}.`, 'dice');
  const events = rollEvents(st, me, d1, d2, G.moves);
  noteLance(st, me, d1, d2);
  G.hints = buildHints(me, events);
  G.hintsOn = G.hints !== null;
  /* Tous les points se marquent au jet, avant de jouer. Celui qui a jeté marque le premier ;
     s'il gagne un trou, il tient ou s'en va aussitôt. S'il tient, l'adversaire marque
     ensuite ses points du jet ; s'il s'en va, ces points sont perdus. */
  logNotes(applyEvents(st, events.filter(e => e.who === me)));
  if (gameOver(st)) { renderAll(); endGame(); return; }
  const delay = G.hints ? 300 : (G.moves.length ? 500 : 1000);   // après OK, on enchaîne vite
  let play;
  if (G.moves.length === 0) play = () => { G.phase = 'anim'; renderAll(); setTimeout(endTurn, delay); };
  else if (me === G.ai) play = () => { G.phase = 'anim'; renderAll(); setTimeout(aiPlay, delay); };
  else play = beginHumanMove;
  /* points de l'adversaire ; renvoie false si la partie est finie */
  const oppScores = () => {
    logNotes(applyEvents(st, events.filter(e => e.who !== me)));
    if (gameOver(st)) { renderAll(); endGame(); return false; }
    if (st.trouPending[1 - me]) {
      st.trouPending[1 - me] = 0;
      log(`${PLAYER_NAMES[1 - me]} a gagné son trou sur le dé de l'adversaire : il ne peut pas s'en aller.`, 'info');
    }
    return true;
  };
  let next;
  if (st.trouPending[me]) next = () => decideTrou(me, () => { if (oppScores()) play(); });
  else {
    if (!oppScores()) return;
    next = play;
  }
  /* des points sont signalés : on attend le bouton OK */
  if (G.hints) waitOk(next); else next();
}

function aiPlay() {
  const me = G.turn;
  const [d1, d2] = G.dice;
  const mv = aiChooseMove(G.st, me, d1, d2, G.moves, G.level);
  if (mv.puissance) {
    for (const s of mv.steps) applyStep(me, s);
    G.lastSteps = mv.steps.slice();
    renderAll();
    setTimeout(() => finishMove(mv), 700);
    return;
  }
  let i = 0;
  const stepFn = () => {
    if (i >= mv.steps.length) { finishMove(mv); return; }
    const s = mv.steps[i++];
    applyStep(me, s);
    G.prefix.push(s);
    G.lastSteps.push(s);
    renderAll();
    setTimeout(stepFn, 600);
  };
  stepFn();
}

function stepText(me, s) {
  const a = toWhite(me, s.from);
  return s.to === OFF ? `${a} → sortie` : `${a} → ${toWhite(me, s.to)}`;
}

function finishMove(mv) {
  const me = G.turn;
  if (mv.puissance) log(`${PLAYER_NAMES[me]} prend son coin par puissance.`, 'info');
  else log(`${PLAYER_NAMES[me]} joue ${mv.steps.map(s => stepText(me, s)).join(', ')}.`, 'move');
  endTurn();
}

function endTurn() {
  G.hintsOn = false;
  const me = G.turn, st = G.st;
  renderAll();
  if (st.off[me] === 15) {
    st.releve++;
    resetRelevee(st);
    log(`Fin de la relevée : les dames retournent au talon. ${PLAYER_NAMES[me]} rejoue.`, 'info');
    G.turn = me;
    setTimeout(scheduleTurn, 800);
    return;
  }
  G.turn = 1 - me;
  scheduleTurn();
}

/* Celui qui vient de gagner un trou à son jet tient (cb : il joue son coup) ou s'en va,
   avant de bouger ses dames. S'en aller : nouvelle relevée qu'il commence, les points
   des deux joueurs sont remis à zéro et l'adversaire ne marque pas ses points du jet. */
function decideTrou(c, cb) {
  const st = G.st;
  st.trouPending[c] = 0;
  G.phase = 'anim';
  renderAll();
  const decide = choice => {
    if (choice === 'aller') {
      st.releve++;
      st.points = [0, 0];
      st.bredouille = [false, false];
      resetRelevee(st);
      log(`${PLAYER_NAMES[c]} s'en va : nouvelle relevée, les points sont effacés, les dames retournent au talon et ${PLAYER_NAMES[c]} commence.`, 'info');
      G.turn = c;
      G.lastSteps = [];
      renderAll();
      setTimeout(scheduleTurn, 600);
    } else {
      log(`${PLAYER_NAMES[c]} tient : la relevée continue.`, 'info');
      cb();
    }
  };
  if (c === G.ai) setTimeout(() => decide(aiTrouDecision(st, c, true)), 500);
  else showTrouModal(c, decide);
}

function showTrouModal(c, decide) {
  const st = G.st;
  $('modal-text').textContent = `Vous avez ${st.trous[c]} trou${st.trous[c] > 1 ? 's' : ''} et ${st.points[c]} point${st.points[c] > 1 ? 's' : ''} en excédent. ` +
    `Tenir : vous jouez votre coup et la relevée continue. S'en aller : toutes les dames reviennent au talon, ` +
    `les points des deux joueurs sont effacés et vous rejouez le premier.`;
  $('modal').classList.remove('hidden');
  const close = choice => { $('modal').classList.add('hidden'); $('btn-aller').onclick = null; $('btn-tenir').onclick = null; decide(choice); };
  $('btn-aller').onclick = () => close('aller');
  $('btn-tenir').onclick = () => close('tenir');
}

function endGame() {
  G.phase = 'over';
  const st = G.st;
  const w = st.trous[WHITE] >= TROUS_PARTIE ? WHITE : BLACK;
  const grande = st.trous[1 - w] === 0 ? ' en grande bredouille (partie double)' : '';
  log(`Partie terminée : ${PLAYER_NAMES[w]} gagne ${st.trous[w]} trous à ${st.trous[1 - w]}${grande}.`, 'trou');
  renderAll();
  setTimeout(() => showFinale(w === G.human, `${st.trous[w]} trous à ${st.trous[1 - w]}${grande}.`), 600);
}

/* ---------- Animation de fin de partie : confettis si l'on gagne, pluie grise si l'on perd ---------- */
function showFinale(won, score) {
  const conf = $('confetti');
  conf.innerHTML = '';
  $('finale-title').textContent = won ? 'Victoire !' : 'Défaite…';
  $('finale-text').textContent = (won ? 'Vous gagnez ' : "L'ordinateur gagne ") + score;
  const colors = ['#ffd23f', '#3ccf63', '#ff5b4b', '#4aa3ff', '#f3ecdf', '#c9a063', '#b05bd6'];
  const n = won ? 120 : 70;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = (Math.random() * 100) + '%';
    if (won) {
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', ((Math.random() - 0.5) * 300).toFixed(0) + 'px');
      p.style.setProperty('--rot', ((Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 900)).toFixed(0) + 'deg');
      p.style.animationDuration = (2.5 + Math.random() * 2.5).toFixed(2) + 's';
      p.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
    } else {
      p.className = 'drop';
      p.style.setProperty('--dx', '-40px');
      p.style.setProperty('--rot', '0deg');
      p.style.animationDuration = (1 + Math.random() * 0.8).toFixed(2) + 's';
      p.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
      p.style.animationIterationCount = '3';
    }
    conf.appendChild(p);
  }
  $('finale').className = 'finale ' + (won ? 'win' : 'lose');
}
function hideFinale() {
  $('finale').className = 'finale hidden';
  $('confetti').innerHTML = '';
}

/* ---------- Journal ---------- */
function log(txt, cls) {
  const li = document.createElement('li');
  li.textContent = txt;
  if (cls) li.className = cls;
  const ol = $('log');
  ol.insertBefore(li, ol.firstChild);
  while (ol.children.length > 300) ol.removeChild(ol.lastChild);
}
function logNotes(notes) {
  for (const { event: e, trous } of notes) {
    log(`${describeEvent(e)} : ${e.pts} points pour ${PLAYER_NAMES[e.who]}.`, 'score ' + (e.who === WHITE ? 'w' : 'b'));
    for (const t of trous) {
      log(`${PLAYER_NAMES[t.who]} marque un trou${t.bredouille ? ' en bredouille (compte double)' : ''} ! Total : ${G.st.trous[t.who]}.` +
        (t.effaces ? ` ${PLAYER_NAMES[1 - t.who]} perd ses ${t.effaces} point${t.effaces > 1 ? 's' : ''}.` : ''), 'trou');
    }
  }
}

/* ---------- Marque ---------- */
function renderScores() {
  const st = G.st, box = $('scores');
  box.innerHTML = '';
  for (const c of [BLACK, WHITE]) {
    const card = document.createElement('div');
    card.className = 'score-card' + (G.turn === c && G.phase !== 'over' ? ' active' : '');
    const who = c === G.human ? 'Vous' : 'Ordinateur';
    let html = `<div class="score-head"><span class="name"><span class="dot" style="background:${c === WHITE ? '#f3ecdf' : '#2a2522'}"></span>${PLAYER_NAMES[c]} (${who})` +
      (st.bredouille[c] && st.points[c] > 0 ? '<span class="badge">bredouille</span>' : '') +
      `</span><span class="totals">${st.trous[c]} trou${st.trous[c] > 1 ? 's' : ''}, ${st.points[c]} point${st.points[c] > 1 ? 's' : ''}</span></div>`;
    html += '<div class="track"><span class="lbl">Trous</span>';
    for (let i = 1; i <= TROUS_PARTIE; i++) html += `<span class="hole${i <= st.trous[c] ? ' filled' : ''}"></span>`;
    html += '</div><div class="track"><span class="lbl">Points</span>';
    for (let i = 2; i <= 10; i += 2) html += `<span class="mark${i === st.points[c] || i === st.points[c] + 1 ? ' jeton' : ''}">${i}</span>`;
    html += '</div>';
    card.innerHTML = html;
    box.appendChild(card);
  }
}

function renderControls() {
  const human = G.turn === G.human;
  const puiss = G.phase === 'move' && human && G.prefix.length === 0 && G.moves && G.moves.some(m => m.puissance);
  let msg = '';
  if (G.phase === 'over') msg = 'Partie terminée. Pour rejouer : bouton « ? » puis « Nouvelle partie ».';
  else if (G.phase === 'roll') msg = human ? 'À vous de jouer : lancez les dés (Espace).' : "L'ordinateur va jouer…";
  else if (G.phase === 'wait') {
    msg = (human ? 'Points signalés sur le tablier.' : "L'ordinateur a jeté les dés : points signalés sur le tablier.") +
      ' Cliquez sur OK au centre du tablier ou appuyez sur Espace pour ' +
      (!G.moves.length ? 'continuer.' : human ? 'jouer votre coup.' : 'le laisser jouer.');
  }
  else if (G.phase === 'move') {
    const left = G.dice.filter((d, i) => !usedDice()[i]);
    msg = G.selected !== null
      ? `Choisissez la flèche d'arrivée (dés restants : ${left.join(', ')}).`
      : `Choisissez une dame à jouer (dés restants : ${left.join(', ')}).`;
    if (puiss) msg += ' Vous pouvez aussi prendre votre coin par puissance (bouton, ou cliquez une des deux dames puis votre coin).';
  } else if (G.phase === 'confirm') {
    msg = 'Coup joué : cliquez sur OK au centre du tablier ou appuyez sur Espace pour le valider, ou annulez-le.';
  } else if (G.phase === 'anim') msg = human ? '' : "L'ordinateur joue…";
  $('status').textContent = msg;
}

function renderAll() {
  renderBoard();
  renderScores();
  renderControls();
}

/* ---------- Plein écran (mode mobile) ----------
   Absent quand le navigateur ne le permet pas (Safari sur iPhone). En plein écran,
   on tente de verrouiller l'écran en paysage, l'orientation du tablier. */
function setupFullscreen() {
  const btn = $('btn-fs'), root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  if (!request || !(document.fullscreenEnabled || document.webkitFullscreenEnabled)) { btn.classList.add('hidden'); return; }
  btn.addEventListener('click', async () => {
    try {
      if (current()) { await exit.call(document); return; }
      await request.call(root);
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    } catch (e) { /* refusé par le navigateur : on reste en fenêtre */ }
  });
  const sync = () => {
    const on = !!current();
    btn.title = on ? 'Quitter le plein écran' : 'Plein écran';
    btn.setAttribute('aria-label', btn.title);
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
}

/* ---------- Démarrage ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const help = $('help');
  const closeHelp = () => help.classList.add('hidden');
  $('btn-help').addEventListener('click', () => help.classList.remove('hidden'));
  $('btn-help-m').addEventListener('click', () => help.classList.remove('hidden'));
  setupFullscreen();
  $('btn-help-close').addEventListener('click', closeHelp);
  help.addEventListener('click', e => { if (e.target === help) closeHelp(); });
  $('btn-new').addEventListener('click', () => { closeHelp(); newGame(); });
  $('btn-replay').addEventListener('click', newGame);
  $('btn-finale-close').addEventListener('click', hideFinale);
  $('level').addEventListener('change', () => { G.level = parseInt($('level').value, 10); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeHelp(); hideFinale(); }
  });

  /* Espace : appuie sur OK quand il est affiché, sinon lance les dés */
  const isSpace = e => e.code === 'Space' || e.key === ' ';
  const keyIgnored = e => e.ctrlKey || e.altKey || e.metaKey ||
    !$('modal').classList.contains('hidden') || !help.classList.contains('hidden') ||
    !$('finale').classList.contains('hidden') || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  document.addEventListener('keydown', e => {
    if (!isSpace(e) || keyIgnored(e)) return;
    e.preventDefault();          // pas de défilement de la page, ni de clic sur le bouton qui a le focus
    if (e.repeat) return;
    if (G.okCallback) pressOk();
    else rollDice();
  });
  document.addEventListener('keyup', e => { if (isSpace(e) && !keyIgnored(e)) e.preventDefault(); });

  newGame();
});
