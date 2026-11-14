'use strict';
/* ============================================================
   Interface : tablier SVG, dés, marque, déroulement de la partie.
   L'humain joue Blanc (en bas), l'ordinateur joue Vert (en haut).
   Toutes les flèches affichées sont dans la numérotation de Blanc.
   ============================================================ */
const G = {
  st: null, human: WHITE, ai: BLACK, level: 1,
  phase: 'init',          // init | roll | wait | move | confirm | anim | over
  turn: WHITE, dice: null, moves: null, prefix: [], turnStart: null,
  selected: null,
  hints: null, hintsOn: false,   // indicateurs de points du dernier jet, et leur visibilité
  okCallback: null,       // suite du jeu, en attente du bouton OK (phases 'wait' et 'confirm')
  undoMode: 'libre',      // règle optionnelle d'annulation : touchee | deplacee | libre
  touched: false,         // (dame cliquée, dame jouée) la dame sélectionnée l'a été par le joueur : elle doit être jouée
  opts: Object.assign({}, DEFAULT_OPTS),   // jans optionnels (partagés avec l'état de la partie)
};
/* Le joueur peut-il défaire ce qu'il a joué ? Seulement en « annulation autorisée ». */
const undoAllowed = () => G.undoMode === 'libre';
const $ = id => document.getElementById(id);
const rnd = () => 1 + Math.floor(Math.random() * 6);

/* ---------- Géométrie ---------- */
/* Les casiers de sortie sont hors du tablier, à gauche, à côté des jans de retour (Blanc sort en haut, Vert en bas).
   Le tablier est entouré d'un cadre : bandes longues (RAIL) percées d'un trou en face de chaque flèche,
   bandes de côté (SIDE) avec les trous de départ dans les coins de gauche. */
/* une flèche part du bord du tablier (EDGE au-delà de TOP / BOT) et mesure 3,25 dames (ARROW_L) ;
   on n'affiche que trois dames par flèche (au-delà, le nombre est inscrit sur la dernière) ;
   l'écart entre les pointes des flèches du haut et du bas vaut 80 % d'une flèche (GAP_RATIO) :
   la hauteur du tablier (BH) en découle.
   PH : position de la pointe, comptée depuis TOP / BOT */
const R = 39, TOP = 54, EDGE = 11, ARROW_L = 3.25 * (2 * R - 4), GAP_RATIO = 0.8,
  BH = 2 * Math.round(((2 + GAP_RATIO) * ARROW_L) / 2 + TOP - EDGE);   // pair : milieu entier
const TRAY_X = 14, TRAY_W = 60, FRAME_X = TRAY_X + TRAY_W + 14, SIDE = 40, RAIL = 30,
  LEFT = FRAME_X + SIDE + 8, PW = 2 * R - 4, BAR = 50, BOT = BH - TOP;
const MAX_SHOWN = 3, PH = Math.round(ARROW_L) - EDGE, ARROW_W = 24;
/* rayon d'une dame, bordure comprise : 2 px de jour entre deux dames voisines */
const DR = R - 3;
const FRAME_T = TOP - 12 - RAIL, FRAME_W = 12 * PW + BAR + 16 + 2 * SIDE, FRAME_H = BOT - TOP + 24 + 2 * RAIL;
const BW = FRAME_X + FRAME_W + 14;
const TRAY_H = (BOT - TOP + 24) / 2 - 6;
function trayY(c) { return c === WHITE ? TOP - 12 : TOP - 12 + TRAY_H + 12; }
const MID_X = LEFT + 6 * PW + BAR / 2 + 45;   // centre des dés et du bouton OK
function colX(c) { return LEFT + c * PW + (c >= 6 ? BAR : 0); }
function geo(p) { return p <= 12 ? { col: p - 1, top: false } : { col: 24 - p, top: true }; }
/* flèche p (numérotation du joueur c) -> numérotation de Blanc */
function toWhite(c, p) { return (c === WHITE || p === OFF) ? p : 25 - p; }
function fromWhite(c, wp) { return (c === WHITE || wp === OFF) ? wp : 25 - wp; }
/* ordonnée de la i-ème dame d'une pile (0 = collée au bord du tablier) */
function slotY(top, i) { return top ? TOP - EDGE + DR + i * (2 * R - 4) : BOT + EDGE - DR - i * (2 * R - 4); }
/* marque : trous des fichets sur les bandes du cadre (Vert en haut, Blanc en bas) ;
   jetons de points au milieu du tablier, juste au-delà de la pointe des flèches du joueur */
function holeY(c) { return c === BLACK ? FRAME_T + RAIL / 2 : BOT + 12 + RAIL / 2; }
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

/* ---------- Matières du tablier (ébène, ivoire) ---------- */
const WOOD = { ebonyLine: '#2c221b', inlay: '#efe5cc', inlayDark: '#140e0a', label: '#e9dcc0' };
/* aspect des dames, fichets et jetons de chaque camp : Blanc en ivoire, Vert en os teinté de vert */
const DAME = [
  { fill: 'url(#g-dame-w)', flat: '#ece2cb', stroke: '#b3a07a', groove: '#a08c66', ink: '#3a2e20', shine: '#fffaf0' },
  { fill: 'url(#g-dame-v)', flat: '#7d8c3c', stroke: '#4c5720', groove: '#3f481a', ink: '#1a1f06', shine: '#b2c174' },
];
function grad(defs, id, stops, attrs, radial) {
  const g = el(radial ? 'radialGradient' : 'linearGradient', Object.assign({ id }, attrs || {}), defs);
  for (const [o, c, op] of stops) {
    const a = { offset: o, 'stop-color': c };
    if (op !== undefined) a['stop-opacity'] = op;
    el('stop', a, g);
  }
}
function boardDefs(svg) {
  const d = el('defs', {}, svg);
  grad(d, 'g-ebony', [[0, '#1d1612'], [0.5, '#0b0807'], [1, '#18120e']], { x1: 0, y1: 0, x2: 0, y2: 1 });
  grad(d, 'g-rim', [[0, '#2a201a'], [0.5, '#130e0b'], [1, '#241b15']], { x1: 0, y1: 0, x2: 0, y2: 1 });
  grad(d, 'g-ivory', [[0, '#f1ead8'], [1, '#d8ccb0']], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(d, 'g-green', [[0, '#4cab86'], [0.5, '#2f9268'], [1, '#22785a']], { x1: 0, y1: 0, x2: 1, y2: 0 });
  grad(d, 'g-sheen', [[0, '#fff', 0.10], [0.45, '#fff', 0.02], [1, '#fff', 0]], { x1: 0, y1: 0, x2: 0.6, y2: 1 });
  /* fichets (chevilles bombées) ; les dames et les jetons sont plats */
  grad(d, 'g-dame-w', [[0, '#fffaf0'], [0.6, '#ece2cb'], [1, '#c4b28d']], { cx: 0.4, cy: 0.35, r: 0.7 }, true);
  grad(d, 'g-dame-v', [[0, '#b2c174'], [0.6, '#7d8c3c'], [1, '#4c5720']], { cx: 0.4, cy: 0.35, r: 0.7 }, true);
}
/* dame plate, gravée de deux petits cercles concentriques autour d'un point central */
function drawDame(svg, cx, cy, c, plain) {
  const s = DAME[c], r = DR - 0.6;   // la bordure (1,2) reste dans le rayon DR
  el('circle', { cx, cy: cy + 2, r, fill: 'rgba(0,0,0,0.55)' }, svg);
  el('circle', { cx, cy, r, fill: s.flat, stroke: s.stroke, 'stroke-width': 1.2 }, svg);
  if (plain) return;   // dame portant le nombre de la pile : sans gravure, pour la lisibilité
  el('circle', { cx, cy, r: r * 0.46, fill: 'none', stroke: s.groove, 'stroke-width': 1 }, svg);
  el('circle', { cx, cy, r: r * 0.32, fill: 'none', stroke: s.groove, 'stroke-width': 1 }, svg);
  el('circle', { cx, cy, r: 1.6, fill: s.groove }, svg);
}

/* ---------- Tablier ---------- */
function renderBoard() {
  const svg = $('board');
  svg.setAttribute('viewBox', `0 0 ${BW} ${BH}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const st = G.st;

  boardDefs(svg);
  /* fond noir, sans liseré clair autour du tablier */
  el('rect', { x: 0, y: 0, width: BW, height: BH, fill: '#050302', rx: 10 }, svg);
  el('rect', { x: 6, y: FRAME_T - 8, width: BW - 12, height: FRAME_H + 16, fill: 'url(#g-rim)', stroke: '#050302', 'stroke-width': 2, rx: 6 }, svg);
  /* bandes du cadre (ébène) avec un filet */
  el('rect', { x: FRAME_X, y: FRAME_T, width: FRAME_W, height: FRAME_H, fill: 'url(#g-rim)', stroke: '#050302', 'stroke-width': 2, rx: 6 }, svg);
  el('rect', { x: FRAME_X + 5, y: FRAME_T + 5, width: FRAME_W - 10, height: FRAME_H - 10, fill: 'none', stroke: WOOD.ebonyLine, 'stroke-width': 1, rx: 4 }, svg);
  /* les deux tables : fond d'ébène, en creux */
  for (const half of [0, 1]) {
    const x = colX(half * 6) - 8;
    el('rect', { x, y: TOP - 12, width: 6 * PW + 16, height: BOT - TOP + 24, fill: 'url(#g-ebony)', stroke: '#000', 'stroke-width': 2, rx: 3 }, svg);
    el('rect', { x: x + 2, y: TOP - 10, width: 6 * PW + 12, height: BOT - TOP + 20, fill: 'none', stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1, rx: 2 }, svg);
  }
  /* bande du milieu, en relief */
  const barX = colX(5) + PW + 4, barW = BAR - 8;
  el('rect', { x: barX, y: TOP - 12, width: barW, height: BOT - TOP + 24, fill: 'url(#g-rim)', stroke: '#000', 'stroke-width': 1.5, rx: 3 }, svg);
  el('line', { x1: barX + 3, y1: TOP - 8, x2: barX + 3, y2: BOT + 8, stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1 }, svg);

  /* casiers de sortie, en ébène noir */
  for (const c of [WHITE, BLACK]) {
    el('rect', { x: TRAY_X, y: trayY(c), width: TRAY_W, height: TRAY_H, fill: 'url(#g-ebony)', stroke: '#000', 'stroke-width': 2, rx: 3 }, svg);
    el('rect', { x: TRAY_X + 3, y: trayY(c) + 3, width: TRAY_W - 6, height: TRAY_H - 6, fill: 'none', stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1, rx: 2 }, svg);
  }
  const trayInk = { 'font-size': 13, fill: '#f0d9b5', 'font-style': 'italic' };
  text(TRAY_X + TRAY_W / 2, TOP + 20, 'Sorties', trayInk, svg);
  text(TRAY_X + TRAY_W / 2, TOP + 60, String(st.off[WHITE]), { 'font-size': 26, fill: DAME[WHITE].flat, 'font-weight': 'bold', stroke: '#1a0904', 'stroke-width': 0.8 }, svg);
  text(TRAY_X + TRAY_W / 2, BOT - 8, 'Sorties', trayInk, svg);
  text(TRAY_X + TRAY_W / 2, BOT - 40, String(st.off[BLACK]), { 'font-size': 26, fill: DAME[BLACK].flat, 'font-weight': 'bold', stroke: '#1a0904', 'stroke-width': 0.8 }, svg);

  renderMarque(svg);
  const sel = selectionInfo();

  for (let p = 1; p <= 24; p++) {
    const { col, top } = geo(p);
    const x0 = colX(col), cx = x0 + PW / 2;
    const dark = col % 2 === (top ? 1 : 0);
    const pts = top
      ? `${cx - ARROW_W / 2},${TOP - EDGE} ${cx + ARROW_W / 2},${TOP - EDGE} ${cx},${TOP + PH}`
      : `${cx - ARROW_W / 2},${BOT + EDGE} ${cx + ARROW_W / 2},${BOT + EDGE} ${cx},${BOT - PH}`;
    el('polygon', { points: pts, fill: dark ? 'url(#g-green)' : 'url(#g-ivory)', stroke: '#000', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, svg);
    const wn = st.b[WHITE][p], bn = st.b[BLACK][25 - p];
    const n = wn + bn, color = wn > 0 ? WHITE : BLACK;
    const shown = Math.min(n, MAX_SHOWN);
    for (let i = 0; i < shown; i++) {
      const cy = slotY(top, i);
      drawDame(svg, cx, cy, color, n > MAX_SHOWN && i === shown - 1);
    }
    if (n > MAX_SHOWN) {
      const cy = slotY(top, shown - 1);
      text(cx, cy + 8, String(n), { 'font-size': 22, 'font-weight': 'bold', fill: DAME[color].ink }, svg);
    }

    /* surbrillances */
    const wp = p;
    if (sel.sources.has(wp)) {
      const cy = slotY(top, shown - 1);
      /* anneau tracé à l'intérieur de la dame, pour ne pas mordre sur la voisine */
      el('circle', { cx, cy, r: DR - 2, fill: 'none', stroke: sel.selected === wp ? '#2b6fd6' : '#1e7a32', 'stroke-width': 4 }, svg);
    }
    if (sel.targets.has(wp)) {
      el('polygon', { points: pts, fill: 'rgba(60,140,255,0.35)', stroke: '#2b6fd6', 'stroke-width': 3 }, svg);
      const cy = slotY(top, shown);
      el('circle', { cx, cy, r: R - 6, fill: 'none', stroke: '#2b6fd6', 'stroke-width': 3, 'stroke-dasharray': '6 4' }, svg);
    }

    /* zone cliquable */
    const hit = el('rect', { x: x0, y: top ? TOP - 30 : BOT - PH - 30, width: PW, height: PH + 60, fill: 'transparent', style: 'cursor:pointer' }, svg);
    hit.addEventListener('click', () => onPointClick(wp));
  }

  /* léger reflet sur les tables */
  for (const half of [0, 1]) {
    el('rect', { x: colX(half * 6) - 8, y: TOP - 12, width: 6 * PW + 16, height: BOT - TOP + 24, fill: 'url(#g-sheen)', rx: 3, 'pointer-events': 'none' }, svg);
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
  el('circle', { cx: x, cy: y, r: 6.5, fill: WOOD.inlay, stroke: '#000', 'stroke-width': 0.8 }, svg);
  el('circle', { cx: x, cy: y, r: 3, fill: passed ? '#8a6a3a' : WOOD.inlayDark }, svg);
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
    const fx = markX(st.trous[c]);
    const fichet = el('g', {}, svg);
    el('title', {}, fichet).textContent = `${PLAYER_NAMES[c]} : ${st.trous[c]} trou${st.trous[c] > 1 ? 's' : ''}`;
    el('circle', { cx: fx, cy: y, r: 8, fill: DAME[c].fill, stroke: DAME[c].stroke, 'stroke-width': 1.5 }, fichet);
    el('circle', { cx: fx - 2.5, cy: y - 2.5, r: 2.5, fill: DAME[c].shine }, fichet);
  }
  /* jetons de points, posés au milieu du tablier à la pointe des flèches du joueur (sa table du talon puis celle du coin) ;
     le jeton de bredouille n'est ajouté, à côté du sien, qu'au joueur en bredouille qui a commencé à marquer
     alors que l'adversaire avait déjà des points (avec un seul jeton, la bredouille va de soi). */
  let bred = null;
  for (const c of [BLACK, WHITE]) {
    const pts = st.points[c];
    const { x, dir } = jetonPos(pts);
    /* à zéro point, le jeton attend entre les deux talons */
    const y = pts > 0 ? jetonY(c) : BH / 2 + (c === BLACK ? -26 : 26);
    if (st.bredouille[c] && pts > 0 && st.points[1 - c] > 0) bred = { x: x + dir * 23, y };
    drawJeton(svg, x, y, DAME[c].flat, DAME[c].stroke, DAME[c].ink,
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
   tous les points se marquent au jet : dames battues (flèche unie translucide ; tout d'une,
   elle passe par la case de repos ; à faux, les deux chemins se reposent chez l'adversaire), coin battu, jan de deux tables, de mézéas, de six tables,
   pleins faits ou conservés, sortie, jan qui ne peut ; en option, jan de rencontre,
   pile de misère (faite ou conservée), Margot la fendue (flèche en pointillé vers la flèche vide).
   Couleur du joueur qui marque : ivoire pour Blanc, vert pour Vert (comme ses dames).
   edge : liseré des pointes et des pastilles, text : texte des pastilles. */
const HALO = 'rgba(5,3,2,0.9)';   // liseré d'ébène
const IVORY = '#efe5cc';
const HINT_PAL = [
  { line: '#f1e8d2', fill: '#e6dabb', ink: '#f4ecd6', edge: '#140e0a', text: '#3a2e20', arrowEdge: '#140e0a' },   // Blanc
  { line: '#7fae42', fill: '#4f7424', ink: '#a9cc6c', edge: IVORY, text: IVORY, arrowEdge: '#2a4410' },          // Vert
];
/* arrowEdge : bordure des flèches de battage, plus foncée que leur intérieur translucide */
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
function topSlot(wp) { return slotXY(wp, Math.max(0, Math.min(stackAt(wp), MAX_SHOWN) - 1)); }
function unit(x, y) { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n }; }

/* Flèche courbe, unie et translucide, de la dame a vers la dame b, en passant par les
   points intermédiaires de pts = [a, …, b] (cases de repos d'un battage tout d'une) ;
   renvoie le milieu du dernier tronçon. Chaque tronçon s'incurve vers le milieu du tablier
   sur une même rangée, sinon vers les coins (à droite). */
let hintArrowSeq = 0;
function hintArrow(g, pts, pal, o = {}) {
  const ctrl = (a, b) => {
    if (a.top === b.top) {
      const h = Math.min(220, 50 + 0.35 * Math.abs(b.x - a.x)) + (o.bend || 0);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (a.top ? h : -h) };
    }
    return { x: Math.max(a.x, b.x) + 80 + (o.bend || 0), y: (a.y + b.y) / 2 };
  };
  const cs = pts.slice(1).map((b, i) => ctrl(pts[i], b));
  const a = pts[0], b = pts[pts.length - 1], c0 = cs[0], cn = cs[cs.length - 1];
  const u1 = unit(c0.x - a.x, c0.y - a.y), u2 = unit(b.x - cn.x, b.y - cn.y);
  const HL = 18, HW = 11;
  const s = { x: a.x + u1.x * (R - 6), y: a.y + u1.y * (R - 6) };
  const tip = { x: b.x - u2.x * (R - 2), y: b.y - u2.y * (R - 2) };
  const e = { x: tip.x - u2.x * (HL - 3), y: tip.y - u2.y * (HL - 3) };
  let d = `M${s.x},${s.y}`;
  cs.forEach((c, i) => { const q = i === cs.length - 1 ? e : pts[i + 1]; d += ` Q${c.x},${c.y} ${q.x},${q.y}`; });
  const n = { x: -u2.y, y: u2.x }, bx = tip.x - u2.x * HL, by = tip.y - u2.y * HL;
  const headPts = `${tip.x},${tip.y} ${bx + n.x * HW},${by + n.y * HW} ${bx - n.x * HW},${by - n.y * HW}`;
  /* la flèche (trait, point de départ, cases de repos, pointe), grossie de k tout autour */
  const shape = (parent, color, k) => {
    const line = { d, fill: 'none', stroke: color, 'stroke-width': 6 + 2 * k,
      'stroke-linecap': o.dashed ? 'butt' : 'round', 'stroke-linejoin': 'round' };
    if (o.dashed) line['stroke-dasharray'] = '12 7';
    el('path', line, parent);
    el('circle', { cx: s.x, cy: s.y, r: 5 + k, fill: color }, parent);
    pts.slice(1, -1).forEach(v => el('circle', { cx: v.x, cy: v.y, r: 7 + k, fill: color }, parent));
    el('polygon', { points: headPts, fill: color, stroke: color, 'stroke-width': 2 * k, 'stroke-linejoin': 'round' }, parent);
  };
  /* bordure opaque : la flèche grossie, évidée de la flèche elle-même (masque),
     puis l'intérieur translucide */
  const id = 'hint-arrow-' + (++hintArrowSeq), BD = 1.5;
  const mask = el('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: BW, height: BH }, g);
  el('rect', { x: 0, y: 0, width: BW, height: BH, fill: '#fff' }, mask);
  shape(mask, '#000', 0);
  shape(el('g', { mask: `url(#${id})` }, g), pal.arrowEdge, BD);
  shape(el('g', { opacity: 0.5 }, g), pal.line, 0);
  const p = pts[pts.length - 2];
  return { x: 0.25 * p.x + 0.5 * cn.x + 0.25 * b.x, y: 0.25 * p.y + 0.5 * cn.y + 0.25 * b.y };
}
/* dame fictive (case d'arrivée vide) */
function hintGhost(g, p, pal) {
  el('circle', { cx: p.x, cy: p.y, r: DR - 1.5, fill: pal.line, 'fill-opacity': 0.2, stroke: pal.line, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, g);
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
  const m = MOBILE.matches, H = m ? 28 : 22, B = btnBoxes();
  /* emplacements déjà pris (centre, taille) : les dés et le bouton OK, puis les étiquettes posées */
  const placed = [Object.assign({}, DICE_BOX),
    ...[B.ok, B.undo, B.puiss].map(b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w + 8, h: b.h + 8 }))];
  for (const b of list) {
    const t = el('text', { x: 0, y: 0, 'font-size': m ? 17 : 13, 'font-weight': 'bold', 'font-style': 'italic', 'text-anchor': 'middle' }, g);
    t.textContent = b.label;
    let w = 0;
    try { w = t.getComputedTextLength(); } catch (err) { w = 0; }
    w = (w || b.label.length * (m ? 10 : 7.5)) + 18;
    const x = Math.max(w / 2 + 4, Math.min(BW - w / 2 - 4, b.x));
    const dir = b.y > BH / 2 ? -1 : 1;
    let y = b.y;
    for (const k of [0, 1, 2, -1, 3, -2, 4]) {
      const yy = b.y + k * dir * (H + 4);
      if (!placed.some(p => Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - yy) < (p.h + H) / 2 + 3)) { y = yy; break; }
    }
    placed.push({ x, y, w, h: H });
    const r = { x: x - w / 2, y: y - H / 2, width: w, height: H, rx: H / 2 };
    if (b.certain) Object.assign(r, { fill: b.pal.fill, stroke: b.pal.edge, 'stroke-width': 1 });
    else Object.assign(r, { fill: '#140e0a', stroke: b.pal.line, 'stroke-width': 1.5, 'stroke-dasharray': '5 3' });
    g.insertBefore(el('rect', r), t);
    t.setAttribute('x', x);
    t.setAttribute('y', y + (m ? 6 : 4.5));
    t.setAttribute('fill', b.certain ? b.pal.text : b.pal.ink);
  }
}

function renderHints(svg, H) {
  const g = el('g', { 'pointer-events': 'none' }, svg);
  const gZ = el('g', {}, g), gA = el('g', {}, g), gB = el('g', {}, g);
  const badges = [];
  const W = p => toWhite(H.me, p);
  const palOf = e => HINT_PAL[e.who];
  const add = (pos, label, pal, certain = true) => badges.push({ x: pos.x, y: pos.y, label, pal, certain });
  /* arrivée sur une flèche : sur la dame adverse si elle est occupée, sinon dame fictive */
  const landing = (wp, i, pal) => {
    if (stackAt(wp)) return topSlot(wp);
    const p = slotXY(wp, i);
    hintGhost(gZ, p, pal);
    return p;
  };
  /* case de repos d'un battage tout d'une (numérotation du joueur e.by) : sur la pile
     adverse si elle est tenue par l'adversaire, sinon dame fictive là où s'arrêterait la dame */
  const rest = (e, v) => {
    const own = G.st.b[e.by][v], wp = W(v);
    if (!own && stackAt(wp)) return topSlot(wp);
    const p = slotXY(wp, Math.min(own, MAX_SHOWN - 1));
    if (own < MAX_SHOWN) hintGhost(gZ, p, HINT_PAL[e.by]);
    return p;
  };
  /* chemin de la dame jouée vers la dame (ou la flèche) visée, par les cases de repos vias */
  const path = (e, vias, to = slotXY(W(e.t), 0)) => [topSlot(W(e.from)), ...vias.map(v => rest(e, v)), to];

  for (const e of H.roll) {
    const pal = palOf(e), pts = '+' + e.pts;
    switch (e.kind) {
      case 'battre':
        add(hintArrow(gA, path(e, e.tout ? [e.via] : []), pal), pts, pal);
        break;
      case 'faux': {
        /* les deux chemins, chacun se reposant sur une case tenue par l'adversaire */
        const mids = [...new Set([e.from + e.d1, e.from + e.d2])].map(v => hintArrow(gA, path(e, [v]), pal));
        add(mids[0], 'À faux ' + pts, pal);
        break;
      }
      case 'coin': {
        const c = W(ADV_COIN);
        e.from.forEach((p, i) => hintArrow(gA, [topSlot(W(p)), landing(c, i, pal)], pal, { bend: 35 * i }));
        add(slotXY(c, 3), 'Coin battu ' + pts, pal);
        break;
      }
      case 'deuxtables':
      case 'contre-deuxtables':
        e.paths.forEach(([p, q], i) => hintArrow(gA, [topSlot(W(p)), landing(W(q), 0, pal)], pal, { bend: 25 * i }));
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
      case 'rencontre':
        add({ x: MID_X, y: BH / 2 - 52 }, 'Jan de rencontre ' + pts, pal);
        break;
      case 'pile':
      case 'pile-conserve':
        add(hintZone(gZ, [W(COIN)], pal, true), (e.kind === 'pile' ? 'Pile de misère ' : 'Pile conservée ') + pts, pal);
        break;
      case 'margot':
        add(hintArrow(gA, path(e, e.tout ? [e.via] : [], landing(W(e.t), 0, pal)), pal, { dashed: true }), 'Margot ' + pts, pal);
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
const BOARD_CX = colX(5) + PW + BAR / 2;   // milieu du tablier : la bande entre les deux jans
/* Écran tactile (même requête que la feuille de style) : boutons et textes plus grands,
   pas de touche Espace. Sinon (souris) : boutons plus petits, avec la mention « espace ». */
const MOBILE = window.matchMedia('(hover: none) and (pointer: coarse)');
/* emplacement des boutons (coin haut gauche, taille) */
function btnBoxes() {
  const m = MOBILE.matches, cy = BH / 2;
  const box = (x, w, h) => ({ x, y: cy - h / 2, w, h });
  const ok = m ? box(MID_X + 72, 96, 64) : box(MID_X + 80, 72, 48);
  return {
    roll: m ? box(BOARD_CX - 125, 250, 74) : box(BOARD_CX - 85, 170, 52),
    ok,
    undo: m ? box(ok.x + ok.w + 12, 190, 56) : box(ok.x + ok.w + 14, 150, 40),
    puiss: m ? box(colX(0) + 3 * PW - 192, 384, 56) : box(colX(0) + 3 * PW - 140, 280, 40),
  };
}
function svgButton(svg, b, o) {
  const { x, y, w, h } = b;
  const g = el('g', { class: 'svg-btn', role: 'button', 'aria-label': o.label }, svg);
  el('title', {}, g).textContent = o.title || o.label;
  el('rect', { x: x - 3, y: y - 3, width: w + 6, height: h + 6, rx: (h + 6) / 2, fill: HALO }, g);
  const ink = o.dark ? IVORY : '#140e0a', sub = o.dark ? WOOD.label : '#4a3a28';
  el('rect', { class: 'btn-face', x, y, width: w, height: h, rx: h / 2, fill: o.dark ? 'url(#g-rim)' : 'url(#g-ivory)', stroke: '#000', 'stroke-width': 1.5 }, g);
  el('rect', { x: x + 3, y: y + 3, width: w - 6, height: h - 6, rx: (h - 6) / 2, fill: 'none', stroke: o.dark ? IVORY : '#8a7a5c', 'stroke-width': 0.8, opacity: 0.7, 'pointer-events': 'none' }, g);
  const fs = o.size || 16, cx = x + w / 2, base = y + h / 2 + fs * 0.35;
  if (o.sub) {
    text(cx, base - 6, o.label, { 'font-size': fs, 'font-weight': 'bold', fill: ink }, g);
    text(cx, base + 9, o.sub, { 'font-size': 11, 'font-style': 'italic', fill: sub }, g);
  } else {
    text(cx, base, o.label, { 'font-size': fs, 'font-weight': 'bold', fill: ink }, g);
  }
  g.addEventListener('click', o.onClick);
  return g;
}
function drawButtons(svg) {
  const human = G.turn === G.human, m = MOBILE.matches, B = btnBoxes();
  if (G.phase === 'roll' && human) {
    svgButton(svg, B.roll, m ? { label: 'Lancer les dés', size: 27, onClick: rollDice }
      : { label: 'Lancer les dés', sub: 'espace', size: 19, title: 'Lancer les dés (Espace)', onClick: rollDice });
  }
  if (G.okCallback) {
    svgButton(svg, B.ok, m ? { label: 'OK', size: 30, onClick: pressOk }
      : { label: 'OK', sub: 'espace', size: 21, title: 'Continuer (Espace)', onClick: pressOk });
  }
  if (human && undoAllowed() && (G.phase === 'confirm' || G.phase === 'move' && G.prefix.length > 0)) {
    svgButton(svg, B.undo, { label: 'Annuler le coup', size: m ? 21 : 15, dark: true, onClick: undoTurn });
  }
  if (G.phase === 'move' && human && G.prefix.length === 0 && G.moves && G.moves.some(mv => mv.puissance && puissanceAllowed(mv))) {
    svgButton(svg, B.puiss, { label: 'Prendre le coin par puissance', size: m ? 21 : 15, dark: true, onClick: playPuissance });
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
/* (dame cliquée, dame jouée) une fois une dame touchée, la prise par puissance n'est permise
   que si cette dame en fait partie. */
function puissanceAllowed(mv) {
  return !G.touched || G.selected === null || mv.steps.some(s => s.from === G.selected);
}
function selectionInfo() {
  const info = { sources: new Set(), targets: new Set(), selected: null };
  if (G.phase !== 'move' || G.turn !== G.human) return info;
  const steps = nextSteps();
  const pm = puissanceMove();
  if (G.touched && G.selected !== null) info.sources.add(toWhite(G.human, G.selected));   // dame touchée : seule jouable
  else {
    for (const s of steps) info.sources.add(toWhite(G.human, s.from));
    if (pm) for (const s of pm.steps) info.sources.add(toWhite(G.human, s.from));
  }
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
      G.selected = null; G.touched = false;
      playPuissance();
      return;
    }
    const path = pathsFrom(G.selected).get(p);
    if (path) {
      for (const s of path) {
        applyStep(G.human, s);
        G.prefix.push(s);
      }
      G.selected = null; G.touched = false;
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
    if (G.touched) return;   // dame cliquée, dame jouée : on ne la lâche plus
    if (p === G.selected) { G.selected = null; renderAll(); return; }
  }
  const pm = puissanceMove();
  if (steps.some(s => s.from === p) || (pm && pm.steps.some(s => s.from === p))) {
    G.selected = p;
    G.touched = G.undoMode === 'touchee';
    renderAll();
  }
}
/* Coup complet : il attend d'être validé (OK ou Espace) et peut encore être annulé.
   Sans annulation possible, il n'y a rien à valider : le coup est joué aussitôt. */
function awaitConfirm(mv) {
  if (!undoAllowed()) { G.phase = 'anim'; renderAll(); endTurn(); return; }
  G.phase = 'confirm';
  G.okCallback = () => { G.phase = 'anim'; renderAll(); endTurn(); };
  renderAll();
}
function undoTurn() {
  if ((G.phase !== 'move' && G.phase !== 'confirm') || G.turn !== G.human || !undoAllowed()) return;
  G.okCallback = null;
  G.st.b[G.human] = Int8Array.from(G.turnStart.b[G.human]);
  G.st.off[G.human] = G.turnStart.off[G.human];
  G.prefix = []; G.selected = null; G.touched = false;
  if (G.hints) { G.hintsOn = true; waitOk(beginHumanMove); } else beginHumanMove();
}
function playPuissance() {
  if (G.phase !== 'move' || G.turn !== G.human || G.prefix.length) return;
  const mv = G.moves.find(m => m.puissance);
  if (!mv || !puissanceAllowed(mv)) return;
  G.selected = null; G.touched = false;
  for (const s of mv.steps) applyStep(G.human, s);
  G.prefix = mv.steps.slice();
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
  G.phase = 'move'; G.touched = false;
  const froms = new Set(nextSteps().map(x => x.from));
  if (froms.size === 1 && !G.moves.some(m => m.puissance)) G.selected = [...froms][0];
  renderAll();
}

function newGame() {
  G.st = newState();
  G.st.opts = G.opts;
  G.phase = 'init'; G.prefix = []; G.moves = null; G.dice = null; G.selected = null;
  $('modal').classList.add('hidden');
  hideFinale();
  let a, b;
  do { a = rnd(); b = rnd(); } while (a === b);
  const starter = a > b ? WHITE : BLACK;
  G.turn = starter;
  scheduleTurn();
}

function scheduleTurn() {
  if (gameOver(G.st)) { endGame(); return; }
  G.phase = 'roll'; G.dice = null; G.moves = null; G.prefix = []; G.selected = null; G.touched = false;
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
  G.prefix = []; G.selected = null;
  const events = rollEvents(st, me, d1, d2, G.moves);
  noteLance(st, me, d1, d2);
  G.hints = buildHints(me, events);
  G.hintsOn = G.hints !== null;
  /* Tous les points se marquent au jet, avant de jouer. Celui qui a jeté marque le premier ;
     s'il gagne un trou, il tient ou s'en va aussitôt. S'il tient, l'adversaire marque
     ensuite ses points du jet ; s'il s'en va, ces points sont perdus. */
  applyEvents(st, events.filter(e => e.who === me));
  if (gameOver(st)) { renderAll(); endGame(); return; }
  const delay = G.hints ? 300 : (G.moves.length ? 500 : 1000);   // après OK, on enchaîne vite
  let play;
  if (G.moves.length === 0) play = () => { G.phase = 'anim'; renderAll(); setTimeout(endTurn, delay); };
  else if (me === G.ai) play = () => { G.phase = 'anim'; renderAll(); setTimeout(aiPlay, delay); };
  else play = beginHumanMove;
  /* points de l'adversaire ; renvoie false si la partie est finie */
  const oppScores = () => {
    applyEvents(st, events.filter(e => e.who !== me));
    if (gameOver(st)) { renderAll(); endGame(); return false; }
    st.trouPending[1 - me] = 0;   // trou gagné sur le dé de l'adversaire : il ne peut pas s'en aller
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
    renderAll();
    setTimeout(endTurn, 700);
    return;
  }
  let i = 0;
  const stepFn = () => {
    if (i >= mv.steps.length) { endTurn(); return; }
    const s = mv.steps[i++];
    applyStep(me, s);
    G.prefix.push(s);
    renderAll();
    setTimeout(stepFn, 600);
  };
  stepFn();
}

function endTurn() {
  G.hintsOn = false;
  const me = G.turn, st = G.st;
  renderAll();
  if (st.off[me] === 15) {
    st.releve++;
    resetRelevee(st);
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
      G.turn = c;
      renderAll();
      setTimeout(scheduleTurn, 600);
    } else cb();
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

function renderAll() {
  renderBoard();
}

/* ---------- Plein écran ----------
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

/* ---------- Écran d'accueil : choix de la difficulté ----------
   Affiché au lancement et à chaque nouvelle partie. Le dernier niveau choisi est retenu
   (mis en avant). Ouvert en cours de partie, il propose de la reprendre. */
const LEVEL_KEY = 'trictrac.level';
function savedLevel() {
  try { const v = parseInt(localStorage.getItem(LEVEL_KEY), 10); return v >= 0 && v <= 2 ? v : 1; }
  catch (e) { return 1; }
}
function showWelcome(canResume) {
  const lvl = String(savedLevel());
  $('btn-resume').classList.toggle('hidden', !canResume);
  $('help').classList.add('hidden');
  hideFinale();
  $('welcome').classList.remove('hidden');
  for (const b of document.querySelectorAll('.level-btn')) {
    b.classList.toggle('last', b.dataset.level === lvl);
    if (b.dataset.level === lvl) b.focus();
  }
}
/* Règles optionnelles, retenues d'une partie à l'autre et appliquées aussitôt (même en cours de partie). */
const UNDO_KEY = 'trictrac.undo';
const UNDO_DESC = {
  touchee: "La dame sélectionnée doit être jouée, et chaque dame posée l'est définitivement.",
  deplacee: "On peut changer de dame tant qu'on ne l'a pas posée ; une dame posée l'est définitivement.",
  libre: "Le coup peut être défait tant qu'il n'est pas validé par OK.",
};
function savedUndoMode() {
  try { const v = localStorage.getItem(UNDO_KEY); return v in UNDO_DESC ? v : 'libre'; }
  catch (e) { return 'libre'; }
}
function setUndoMode(mode) {
  G.undoMode = mode in UNDO_DESC ? mode : 'libre';
  $('opt-undo').value = G.undoMode;
  $('opt-undo-desc').textContent = UNDO_DESC[G.undoMode];
  try { localStorage.setItem(UNDO_KEY, G.undoMode); } catch (e) { /* stockage indisponible */ }
  if (G.undoMode !== 'touchee') G.touched = false;
  /* un coup complet en attente de validation devient définitif */
  if (G.phase === 'confirm' && !undoAllowed()) { pressOk(); return; }
  if (G.st) renderAll();
}
/* Jans optionnels : cases à cocher de l'écran d'accueil (non joués par défaut). */
const OPTS_KEY = 'trictrac.jans';
function loadOpts() {
  try {
    const v = JSON.parse(localStorage.getItem(OPTS_KEY) || '{}');
    for (const k in DEFAULT_OPTS) G.opts[k] = v[k] === true;
  } catch (e) { /* stockage indisponible : options par défaut */ }
  for (const k in DEFAULT_OPTS) $('opt-' + k).checked = G.opts[k];
}
function setOpt(k, on) {
  G.opts[k] = on;
  try { localStorage.setItem(OPTS_KEY, JSON.stringify(G.opts)); } catch (e) { /* stockage indisponible */ }
}
function startWithLevel(level) {
  try { localStorage.setItem(LEVEL_KEY, String(level)); } catch (e) { /* stockage indisponible */ }
  G.level = level;
  $('welcome').classList.add('hidden');
  newGame();
}

/* ---------- Démarrage ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const help = $('help');
  const closeHelp = () => help.classList.add('hidden');
  $('btn-help').addEventListener('click', () => help.classList.remove('hidden'));
  setupFullscreen();
  MOBILE.addEventListener('change', () => { if (G.st) renderBoard(); });
  $('btn-help-close').addEventListener('click', closeHelp);
  help.addEventListener('click', e => { if (e.target === help) closeHelp(); });
  $('btn-restart').addEventListener('click', () => showWelcome(G.phase !== 'over' && G.phase !== 'init'));
  $('btn-replay').addEventListener('click', () => showWelcome(false));
  for (const b of document.querySelectorAll('.level-btn'))
    b.addEventListener('click', () => startWithLevel(parseInt(b.dataset.level, 10)));
  $('btn-resume').addEventListener('click', () => $('welcome').classList.add('hidden'));
  $('btn-welcome-help').addEventListener('click', () => help.classList.remove('hidden'));
  $('btn-finale-close').addEventListener('click', hideFinale);
  $('btn-options').addEventListener('click', () => {
    const open = !$('options').classList.toggle('hidden');
    $('btn-options').setAttribute('aria-expanded', String(open));
  });
  $('opt-undo').addEventListener('change', () => setUndoMode($('opt-undo').value));
  for (const k in DEFAULT_OPTS) $('opt-' + k).addEventListener('change', e => setOpt(k, e.target.checked));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeHelp(); hideFinale(); }
  });

  /* Espace : appuie sur OK quand il est affiché, sinon lance les dés */
  const isSpace = e => e.code === 'Space' || e.key === ' ';
  const keyIgnored = e => e.ctrlKey || e.altKey || e.metaKey ||
    !$('modal').classList.contains('hidden') || !help.classList.contains('hidden') ||
    !$('finale').classList.contains('hidden') || !$('welcome').classList.contains('hidden') || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  document.addEventListener('keydown', e => {
    if (!isSpace(e) || keyIgnored(e)) return;
    e.preventDefault();          // pas de défilement de la page, ni de clic sur le bouton qui a le focus
    if (e.repeat) return;
    if (G.okCallback) pressOk();
    else rollDice();
  });
  document.addEventListener('keyup', e => { if (isSpace(e) && !keyIgnored(e)) e.preventDefault(); });

  /* tablier en position de départ derrière l'écran d'accueil */
  G.level = savedLevel();
  setUndoMode(savedUndoMode());
  loadOpts();
  G.st = newState();
  G.st.opts = G.opts;
  renderAll();
  showWelcome(false);
});
