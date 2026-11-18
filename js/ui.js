'use strict';
/* ============================================================
   Interface : tablier SVG, dés, marque, déroulement de la partie.
   L'humain joue Blanc (en bas), l'ordinateur joue Vert (en haut).
   Toutes les flèches affichées sont dans la numérotation de Blanc.
   ============================================================ */
const G = {
  st: null, human: WHITE, ai: BLACK, level: 1,
  phase: 'init',          // init | roll | wait | mark | move | confirm | after | ecole | aimark | seen | anim | over
  turn: WHITE, dice: null, moves: null, prefix: [], turnStart: null,
  selected: null,
  hints: null, hintsOn: false,   // indicateurs de points du dernier jet, et leur visibilité
  okCallback: null,       // suite du jeu, en attente du bouton OK (phases 'wait' et 'confirm')
  undoMode: 'libre',      // règle optionnelle d'annulation : touchee | deplacee | libre
  touched: false,         // (dame cliquée, dame jouée) la dame sélectionnée l'a été par le joueur : elle doit être jouée
  opts: Object.assign({}, DEFAULT_OPTS),   // jans optionnels (partagés avec l'état de la partie)
  /* Écoles (js/ecoles.js) : mode choisi (ecolePref), appliqué au début de chaque tour (ecole). */
  ecole: 'off', ecolePref: 'off',
  mark: null,             // marque en cours du joueur : { c, kind: 'roll' (son jet) | 'opp' (jet adverse), S0, T, dt, fichetDone }
  decl: null,             // école que le joueur déclare : { S, dt, fichetDone, aiTrousMin, back }
  aiClaim: null,          // dernière marque de l'ordinateur : { S0, T, m, caught }
  ecoleUsed: false,       // le bouton École a servi pour ce jet
  pick: null,             // jeton ou fichet sélectionné : { kind: 'jeton' | 'fichet', c }
  rollPts: [0, 0],        // points réels du dernier jet, pour chaque joueur
  log: [],                // erreurs du jet (récapitulatif « Points réels »)
  trails: [],             // fantômes des déplacements faits par l'ordinateur (dames, jetons, fichets)
  seenSwap: null,         // dames du moment, mises de côté pendant « Points réels »
};
const ecoleOn = () => G.ecole !== 'off';
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
/* longueur de la zone cliquable d'une flèche : du bord du tablier au bout de la dernière dame affichée */
const HIT_L = 2 * DR + (MAX_SHOWN - 1) * (2 * R - 4);
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
   jetons de points au milieu du tablier, entre les pointes des flèches */
function holeY(c) { return c === BLACK ? FRAME_T + RAIL / 2 : BOT + 12 + RAIL / 2; }
/* jetons de points : rayon JR ; Vert sur la rangée du haut, Blanc sur celle du bas, à mi-chemin
   entre la pointe des flèches et les boutons du centre, assez près du jeton de bredouille
   qui attend au milieu (JETON_DY : écart vertical entre leurs centres) */
const JR = 23, JETON_DY = 60;
function jetonY(c) { return BH / 2 + (c === BLACK ? -JETON_DY : JETON_DY); }
const TALON_X = colX(0) + PW / 2;   // au départ, les trois jetons sont entre les deux talons
/* positions de 0 à 10 points, de 2 en 2, au bout des flèches (cases comptées depuis le talon, case 0) :
   0 au talon, 2 entre les pointes des cases 1 et 2, 4 entre celles des cases 3 et 4,
   6 contre la bande médiane (case 5), 8 de l'autre côté de la bande (case 6),
   10 contre la bande latérale (case 11) ; le jeton laisse 2 px de jour contre une bande */
const JETON_X = [
  TALON_X,
  colX(2),
  colX(4),
  colX(5) + PW + 4 - JR - 2,       // bord gauche de la bande médiane
  colX(6) - 4 + JR + 2,            // bord droit de la bande médiane
  colX(11) + PW + 8 - JR - 2,      // bord de la table, contre la bande latérale
];
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
/* Texte centré en (x, y) d'après son encre : la police de la page (Georgia) n'a que des chiffres
   elzéviriens (2 bas, 8 haut, 3 qui descend), qu'une ligne de base fixe décentre selon le nombre. */
let inkCtx = null;
const inkCache = new Map();
function inkMiddle(str, size) {
  const key = size + '|' + str;
  if (inkCache.has(key)) return inkCache.get(key);
  let dy = size * 0.35;
  try {
    inkCtx = inkCtx || document.createElement('canvas').getContext('2d');
    inkCtx.font = `bold ${size}px ${getComputedStyle(document.body).fontFamily}`;
    const m = inkCtx.measureText(str);
    if (m.actualBoundingBoxAscent || m.actualBoundingBoxDescent) dy = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  } catch (e) { /* valeur par défaut */ }
  inkCache.set(key, dy);
  return dy;
}
function centeredText(x, y, str, attrs, parent) {
  return text(x, y + inkMiddle(str, attrs['font-size']), str, attrs, parent);
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
  text(TRAY_X + TRAY_W / 2, TOP + 20, t('tray'), trayInk, svg);
  text(TRAY_X + TRAY_W / 2, TOP + 60, String(st.off[WHITE]), { 'font-size': 26, fill: DAME[WHITE].flat, 'font-weight': 'bold', stroke: '#1a0904', 'stroke-width': 0.8 }, svg);
  text(TRAY_X + TRAY_W / 2, BOT - 8, t('tray'), trayInk, svg);
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
      centeredText(cx, cy, String(n), { 'font-size': 22, 'font-weight': 'bold', fill: DAME[color].ink }, svg);
    }

    /* surbrillances */
    const wp = p;
    if (sel.sources.has(wp)) {
      const cy = slotY(top, shown - 1);
      /* anneau tracé à l'intérieur de la dame, pour ne pas mordre sur la voisine */
      el('circle', { cx, cy, r: DR - 2, fill: 'none', stroke: sel.selected === wp ? SEL_BLUE : LISERE, 'stroke-width': 4 }, svg);
    }
    if (sel.targets.has(wp)) {
      el('polygon', { points: pts, fill: 'rgba(60,140,255,0.35)', stroke: '#2b6fd6', 'stroke-width': 3 }, svg);
      const cy = slotY(top, shown);
      el('circle', { cx, cy, r: R - 6, fill: 'none', stroke: '#2b6fd6', 'stroke-width': 3, 'stroke-dasharray': '6 4' }, svg);
    }

    /* zone cliquable : du bord du tablier jusqu'au bout de la troisième dame (HIT_L), un peu
       avant la pointe, sans marge (elle ne doit pas mordre sur les jetons de points) */
    const hit = el('rect', { x: x0, y: top ? TOP - EDGE : BOT + EDGE - HIT_L, width: PW, height: HIT_L, fill: 'transparent', style: 'cursor:pointer' }, svg);
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
    /* doublet : son nom sous les dés (Bezas, Double deux, Ternes, Carmes, Quines, Sonnez) */
    if (G.dice[0] === G.dice[1]) {
      centeredText(MID_X, DOUBLET_Y, t('doublet', G.dice[0]),
        { 'font-size': 17, 'font-weight': 'bold', 'font-style': 'italic', fill: IVORY, 'pointer-events': 'none' }, svg);
    }
  }

  if (G.phase !== 'seen') renderTrails(svg);
  renderMarkTargets(svg);
  if (G.hints && G.hintsOn) renderHints(svg, G.hints);
  drawButtons(svg);
}

/* ---------- Marque : trous (fichets) et jetons de points ---------- */
function drawHole(svg, x, y, passed) {
  el('circle', { cx: x, cy: y, r: 6.5, fill: WOOD.inlay, stroke: '#000', 'stroke-width': 0.8 }, svg);
  el('circle', { cx: x, cy: y, r: 3, fill: passed ? '#8a6a3a' : WOOD.inlayDark }, svg);
}
function renderMarque(svg) {
  const st = G.st, mi = markInfo();
  /* liseré d'un jeton ou d'un fichet que le joueur peut déplacer (bleu s'il est sélectionné), et clic */
  const movable = (g, kind, c, x, y, r) => {
    if (!mi.mov.has(kind + c)) return;
    const picked = G.pick && G.pick.kind === kind && G.pick.c === c;
    el('circle', { cx: x, cy: y, r, fill: 'none', stroke: picked ? SEL_BLUE : LISERE, 'stroke-width': 4 }, g);
    g.setAttribute('style', 'cursor:pointer');
    g.addEventListener('click', () => pickMarker(kind, c));
  };
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
    el('title', {}, fichet).textContent = t('fichetTitle', t('players')[c], st.trous[c]);
    /* fichet agrandi (il couvre son trou), portant le nombre de trous marqués */
    el('circle', { cx: fx, cy: y + 1.5, r: 14, fill: 'rgba(0,0,0,0.5)' }, fichet);
    el('circle', { cx: fx, cy: y, r: 14, fill: DAME[c].fill, stroke: DAME[c].stroke, 'stroke-width': 1.5 }, fichet);
    centeredText(fx, y, String(st.trous[c]), { 'font-size': 16, 'font-weight': 'bold', fill: DAME[c].ink }, fichet);
    movable(fichet, 'fichet', c, fx, y, 17);
  }
  /* jetons de points, posés au milieu du tablier sur la rangée du joueur (Vert en haut, Blanc en bas) ;
     le jeton de bredouille n'est ajouté, à côté du sien, qu'au joueur en bredouille qui a commencé à marquer
     alors que l'adversaire avait déjà des points (avec un seul jeton, la bredouille va de soi). */
  let bred = null;
  for (const c of [BLACK, WHITE]) {
    const pts = st.points[c];
    const { x, dir } = jetonPos(pts);
    const y = jetonY(c);
    if (st.bredouille[c] && pts > 0 && st.points[1 - c] > 0) bred = { x: x + dir * (2 * JR + 4), y };
    const g = drawJeton(svg, x, y, DAME[c].flat, DAME[c].stroke, DAME[c].ink,
      pts > 0 ? String(pts) : '', t('jetonTitle', t('players')[c], pts));
    movable(g, 'jeton', c, x, y, JR + 4);
  }
  if (!bred) bred = { x: TALON_X, y: BH / 2 };
  drawJeton(svg, bred.x, bred.y, '#d9a441', '#6b4a24', '#3d2614', 'B', t('bredouilleJeton'));
}
/* Destinations du jeton ou du fichet sélectionné : petits ronds bleus, cliquables (dessinés
   par-dessus les fantômes). */
function renderMarkTargets(svg) {
  const mi = markInfo(), p = G.pick;
  if (!p || !mi.targets.length) return;
  for (const v of mi.targets) {
    const x = p.kind === 'jeton' ? jetonPos(v).x : markX(v), y = p.kind === 'jeton' ? jetonY(p.c) : holeY(p.c);
    const g = el('g', { style: 'cursor:pointer' }, svg);
    el('circle', { cx: x, cy: y, r: p.kind === 'jeton' ? 9 : 7, fill: SEL_BLUE, stroke: '#fff', 'stroke-width': 1.5 }, g);
    el('circle', { cx: x, cy: y, r: p.kind === 'jeton' ? JR : 15, fill: 'transparent' }, g);
    g.addEventListener('click', () => moveMarker(p.kind, p.c, v));
  }
}
/* Abscisse du jeton de points, de 2 en 2 points (JETON_X ; un nombre impair, qui ne devrait pas
   arriver, tombe entre les deux positions voisines) ; au-delà de 10, le jeton reste à 10.
   dir : côté où poser le jeton de bredouille, celui où il reste dans la table. */
function jetonPos(pts) {
  const n = Math.max(0, Math.min(pts, 10));
  const i = Math.floor(n / 2), f = n / 2 - i;
  const x = f ? JETON_X[i] + f * (JETON_X[i + 1] - JETON_X[i]) : JETON_X[i];
  const dir = (n >= 5 && n <= 6) || n >= 9 ? -1 : 1;
  return { x, dir };
}
function drawJeton(svg, x, y, fill, stroke, ink, label, title) {
  const g = el('g', {}, svg);
  el('title', {}, g).textContent = title;
  el('circle', { cx: x, cy: y + 2, r: JR, fill: 'rgba(0,0,0,0.45)' }, g);
  el('circle', { cx: x, cy: y, r: JR, fill, stroke, 'stroke-width': 2 }, g);
  el('circle', { cx: x, cy: y, r: JR - 5, fill: 'none', stroke, 'stroke-width': 1, opacity: 0.6 }, g);
  if (label) centeredText(x, y, label, { 'font-size': 22, 'font-weight': 'bold', fill: ink }, g);
  return g;
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
   (« Annuler » les fait réapparaître) :
   tous les points se marquent au jet : dames battues (flèche unie translucide ; tout d'une,
   elle passe par la case de repos ; à faux, les deux chemins se reposent chez l'adversaire), coin battu, jan de deux tables, de mézéas, de six tables,
   pleins faits ou conservés, sortie, jan qui ne peut ; en option, jan de rencontre,
   pile de misère (faite ou conservée), Margot la fendue (flèche en pointillé vers la flèche vide).
   Couleur du joueur qui marque : ivoire pour Blanc, vert pour Vert (comme ses dames).
   edge : liseré des pointes et des pastilles, text : texte des pastilles. */
const IVORY = '#efe5cc';
/* liseré vert de tout ce que le joueur peut toucher (dames, dés, jeton, fichet, boutons) ;
   bleu : élément sélectionné et ses destinations */
const LISERE = '#25a148', SEL_BLUE = '#2b6fd6';
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
/* ---------- Fantômes des déplacements ----------
   Dame, jeton ou fichet déplacé, par l'ordinateur comme par le joueur : fantôme en pointillé à
   l'ancienne place, fine flèche vers la nouvelle, dans la couleur du propriétaire. Ils restent
   jusqu'au jet suivant : on retrouve ainsi la position du jet et la marque de chacun (pratique pour
   relever une école). Seulement quand on joue avec les écoles. */
function trailGhost(g, p, r, pal) {
  el('circle', { cx: p.x, cy: p.y, r, fill: pal.line, 'fill-opacity': 0.15, stroke: pal.line, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, g);
}
/* flèche fine de a vers b (rayons ra, rb laissés libres), courbée par le point de contrôle c ;
   un peu transparente, d'un seul tenant (le liseré ne se voit pas à travers le trait) */
const TRAIL_OPACITY = 0.7;
function trailArrow(parent, a, b, ra, rb, c, pal) {
  const g = el('g', { opacity: TRAIL_OPACITY }, parent);
  const u1 = unit(c.x - a.x, c.y - a.y), u2 = unit(b.x - c.x, b.y - c.y);
  const HL = 13, HW = 8;
  const s = { x: a.x + u1.x * ra, y: a.y + u1.y * ra }, tip = { x: b.x - u2.x * rb, y: b.y - u2.y * rb };
  const e = { x: tip.x - u2.x * (HL - 2), y: tip.y - u2.y * (HL - 2) };
  const d = `M${s.x},${s.y} Q${c.x},${c.y} ${e.x},${e.y}`;
  const n = { x: -u2.y, y: u2.x }, bx = tip.x - u2.x * HL, by = tip.y - u2.y * HL;
  const head = `${tip.x},${tip.y} ${bx + n.x * HW},${by + n.y * HW} ${bx - n.x * HW},${by - n.y * HW}`;
  el('path', { d, fill: 'none', stroke: pal.arrowEdge, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
  el('polygon', { points: head, fill: pal.arrowEdge, stroke: pal.arrowEdge, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
  el('path', { d, fill: 'none', stroke: pal.line, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
  el('polygon', { points: head, fill: pal.line }, g);
}
function renderTrails(svg) {
  if (!G.trails.length) return;
  const g = el('g', { 'pointer-events': 'none' }, svg);
  const leaving = {}, arriving = {};
  for (const tr of G.trails.slice().reverse()) if (tr.kind === 'dame') arriving[tr.to] = (arriving[tr.to] || 0) + 1;
  const seen = {}, nth = {};
  for (const tr of G.trails) {
    /* plusieurs trajets d'un même jeton ou fichet : ils se courbent alternativement d'un côté et de l'autre */
    const key = tr.kind + tr.c, flip = (nth[key] = (nth[key] || 0) + 1) % 2 === 0 ? -1 : 1;
    const pal = HINT_PAL[tr.c];
    if (tr.kind === 'dame') {
      /* fantôme au-dessus des dames restées sur la flèche de départ ; flèche vers la dame arrivée
         (les dernières arrivées sont en haut de la pile) */
      const i = leaving[tr.from] = (leaving[tr.from] || 0) + 1;
      const a = slotXY(tr.from, Math.min(stackAt(tr.from) + i - 1, MAX_SHOWN - 1));
      trailGhost(g, a, DR - 1.5, pal);
      let b;
      if (tr.to === OFF) b = { x: TRAY_X + TRAY_W / 2, y: trayY(tr.c) + TRAY_H / 2, top: tr.c === WHITE };
      else {
        const k = seen[tr.to] = (seen[tr.to] || 0) + 1;
        b = slotXY(tr.to, Math.max(0, Math.min(stackAt(tr.to), MAX_SHOWN) - 1 - (arriving[tr.to] - k)));
      }
      let c;
      if (tr.to === OFF) c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      else if (a.top === b.top) {
        const h = Math.min(150, 30 + 0.3 * Math.abs(b.x - a.x));
        c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (a.top ? h : -h) };
      } else c = { x: Math.max(a.x, b.x) + 80, y: (a.y + b.y) / 2 };
      trailArrow(g, a, b, DR - 2, DR, c, pal);
    } else if (tr.kind === 'jeton') {
      /* le long de la rangée des jetons, légèrement courbée vers le milieu du tablier */
      const y = jetonY(tr.c), a = { x: jetonPos(tr.from).x, y }, b = { x: jetonPos(tr.to).x, y };
      const h = Math.min(36, 16 + 0.04 * Math.abs(b.x - a.x));
      trailGhost(g, a, JR, pal);
      trailArrow(g, a, b, JR + 2, JR + 2, { x: (a.x + b.x) / 2, y: y + flip * (tr.c === BLACK ? h : -h) }, pal);
    } else {
      /* le long de la bande, courbée vers l'extérieur du tablier */
      const y = holeY(tr.c), a = { x: markX(tr.from), y }, b = { x: markX(tr.to), y };
      trailGhost(g, a, 14, pal);
      trailArrow(g, a, b, 15, 15, { x: (a.x + b.x) / 2, y: y + flip * (tr.c === BLACK ? -18 : 18) }, pal);
    }
  }
}
/* Fantômes des jetons et fichets qui viennent d'être déplacés (marque avant / après) par by :
   'h' (le joueur), 'ai' (l'ordinateur) ou 'auto' (marque automatique, sans école). Les déplacements
   successifs d'un même jeton par le même acteur n'en font qu'un ; ceux d'acteurs différents restent
   distincts (jeton de l'ordinateur effacé par le joueur qui tient, puis avancé par l'ordinateur :
   on voit les deux). colors : les camps à regarder. */
function addMarkTrails(before, by, colors = [WHITE, BLACK]) {
  const st = G.st;
  if (!ecoleOn()) return;
  for (const c of colors) {
    for (const [kind, from, to] of [['jeton', before.points[c], st.points[c]], ['fichet', before.trous[c], st.trous[c]]]) {
      if (from === to) continue;
      let last = -1;
      G.trails.forEach((tr, i) => { if (tr.kind === kind && tr.c === c) last = i; });
      const tr = last >= 0 ? G.trails[last] : null;
      if (tr && tr.by === by) {
        if (tr.from === to) G.trails.splice(last, 1); else tr.to = to;
      } else G.trails.push({ kind, c, from, to, by });
    }
  }
}
/* Fantôme d'un pas de dame (numérotation du joueur c), du joueur comme de l'ordinateur, appelé
   après l'ajout du pas à G.prefix ; un pas qui prolonge le
   précédent (même dame, tout d'une) allonge sa flèche. */
function addDameTrail(c, s) {
  if (!ecoleOn()) return;
  const from = toWhite(c, s.from), to = toWhite(c, s.to);
  const prev = G.trails.find(tr => tr.kind === 'dame' && tr.c === c && tr.to === from && tr.step === G.prefix.length - 1);
  if (prev) { prev.to = to; prev.step = G.prefix.length; }
  else G.trails.push({ kind: 'dame', c, from, to, step: G.prefix.length });
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
  if (G.dice && G.dice[0] === G.dice[1]) placed.push({ x: MID_X, y: DOUBLET_Y, w: 130, h: 20 });   // nom du doublet
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
        add(mids[0], t('faux') + ' ' + pts, pal);
        break;
      }
      case 'coin': {
        const c = W(ADV_COIN);
        e.from.forEach((p, i) => hintArrow(gA, [topSlot(W(p)), landing(c, i, pal)], pal, { bend: 35 * i }));
        add(slotXY(c, 3), t('coin') + ' ' + pts, pal);
        break;
      }
      case 'deuxtables':
      case 'contre-deuxtables':
        e.paths.forEach(([p, q], i) => hintArrow(gA, [topSlot(W(p)), landing(W(q), 0, pal)], pal, { bend: 25 * i }));
        add({ x: slotXY(W(COIN), 0).x, y: BH / 2 },
          t(e.kind === 'deuxtables' ? 'deuxTables' : 'contreDeuxTables') + ' ' + pts, pal);
        break;
      case 'mezeas':
      case 'contre-mezeas':
        add(hintZone(gZ, [W(COIN)], pal, true), t(e.kind === 'mezeas' ? 'mezeas' : 'contreMezeas') + ' ' + pts, pal);
        break;
      case 'six':
        add(hintZone(gZ, SIX_TABLES.map(W), pal, true), t('six') + ' ' + pts, pal);
        break;
      case 'plein':
        add(hintZone(gZ, JANS[e.jan].map(W), pal, true), t('plein', e.n) + ' ' + pts, pal);
        break;
      case 'conserve':
        add(hintZone(gZ, JANS[e.jan].map(W), pal, true), t('pleinConserve') + ' ' + pts, pal);
        break;
      case 'sortie':
        add(hintTray(gZ, H.me, pal, true), t('sortie') + ' ' + pts, pal);
        break;
      case 'rencontre':
        add({ x: MID_X, y: BH / 2 - 52 }, t('rencontre') + ' ' + pts, pal);
        break;
      case 'pile':
      case 'pile-conserve':
        add(hintZone(gZ, [W(COIN)], pal, true), t(e.kind === 'pile' ? 'pile' : 'pileConserve') + ' ' + pts, pal);
        break;
      case 'margot':
        add(hintArrow(gA, path(e, e.tout ? [e.via] : [], landing(W(e.t), 0, pal)), pal, { dashed: true }), t('margot') + ' ' + pts, pal);
        break;
      case 'nepeut': {
        /* le cadre englobe les dés, et le nom du doublet s'il y en a un */
        const dbl = G.dice && G.dice[0] === G.dice[1] ? DOUBLET_Y + 10 - (BH / 2 + 32) : 0;
        hintFrame(gZ, MID_X - 70, BH / 2 - 32, 140, 64 + dbl, pal, true);
        add({ x: MID_X, y: BH / 2 + 48 + dbl }, t('nePeut') + ' ' + pts, pal);
        break;
      }
    }
  }

  hintBadges(gB, badges);
}

/* Boutons au centre du tablier : « Lancer les dés » (à la place des dés), OK à droite des dés
   (fait partir les indicateurs, valide le coup), « Annuler » à droite du OK,
   « Prendre le coin par puissance » dans la moitié gauche. Avec les écoles, les autres boutons se
   rangent dans la moitié gauche et à droite des dés (buttonRow). Tous portent le liseré vert. */
const BOARD_CX = colX(5) + PW + BAR / 2;   // milieu du tablier : la bande entre les deux jans
const DICE_BOX = { x: MID_X, y: BH / 2, w: 120, h: 48 };          // emprise des dés (centre, taille)
/* milieu du nom du doublet, à mi-chemin entre le bas des dés et le haut des jetons de Blanc */
const DOUBLET_Y = BH / 2 + (DICE_BOX.h / 2 + JETON_DY - JR) / 2;
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
    undo: m ? box(ok.x + ok.w + 12, 140, 56) : box(ok.x + ok.w + 14, 104, 40),
    puiss: m ? box(colX(0) + 3 * PW - 192, 384, 56) : box(colX(0) + 3 * PW - 140, 280, 40),
  };
}
function svgButton(svg, b, o) {
  const { x, y, w, h } = b;
  const g = el('g', { class: 'svg-btn', role: 'button', 'aria-label': o.label }, svg);
  el('title', {}, g).textContent = o.title || o.label;
  el('rect', { x: x - 3.5, y: y - 3.5, width: w + 7, height: h + 7, rx: (h + 7) / 2, fill: LISERE }, g);
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
/* largeur d'un texte du tablier (police de la page, en gras) */
function textWidth(str, size) {
  const svg = $('board');
  const n = text(-1000, -1000, str, { 'font-size': size, 'font-weight': 'bold' }, svg);
  let w = 0;
  try { w = n.getComputedTextLength(); } catch (e) { w = 0; }
  svg.removeChild(n);
  return w || str.length * size * 0.55;
}
/* Rangée de boutons entre x0 et x1, au milieu du tablier : la taille du texte diminue si la place
   manque. align : 'start' (contre x0) ou 'center'. Le premier bouton marqué primary porte « espace ». */
function buttonRow(svg, items, x0, x1, align) {
  if (!items.length) return;
  const m = MOBILE.matches, gap = 14;
  let size = m ? 20 : 15;
  const widths = s => items.map(it => Math.max(textWidth(it.label, s) + 2.2 * s, m ? 110 : 84));
  let ws = widths(size);
  while (size > 11 && ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1) > x1 - x0) ws = widths(--size);
  const total = ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = align === 'center' ? (x0 + x1 - total) / 2 : x0;
  const h = m ? Math.max(40, Math.round(size * 2.6)) : 40;
  items.forEach((it, i) => {
    const sub = !m && it.primary;
    const hh = sub ? 48 : h;
    svgButton(svg, { x, y: BH / 2 - hh / 2, w: ws[i], h: hh },
      { label: it.label, sub: sub ? t('space') : undefined, size, dark: it.dark, title: it.title, onClick: it.onClick });
    x += ws[i] + gap;
  });
}
/* zones des rangées : moitié gauche du tablier, et à droite des dés */
const ROW_LEFT = [colX(0) + 6, colX(5) + PW - 6], ROW_RIGHT = [MID_X + 74, colX(11) + PW - 4];
function drawButtons(svg) {
  const human = G.turn === G.human, m = MOBILE.matches, B = btnBoxes();
  if (G.phase === 'roll' && human) {
    svgButton(svg, B.roll, m ? { label: t('roll'), size: 27, onClick: rollDice }
      : { label: t('roll'), sub: t('space'), size: 19, title: t('rollTitle'), onClick: rollDice });
  }
  if (ecoleOn()) {
    const left = [], right = [];
    const ecoleBtn = { label: t('ecoleBtn'), title: t('ecoleBtnTitle'), onClick: startEcole };
    const voir = { label: t('voirPoints'), title: t('voirPointsTitle'), dark: true, onClick: voirPoints };
    const finir = { label: t('finirTour'), title: t('finirTourTitle'), primary: true, onClick: finirTour };
    const puiss = G.moves && G.prefix.length === 0 && G.moves.some(mv => mv.puissance && puissanceAllowed(mv));
    if (human && (G.phase === 'mark' || G.phase === 'move') && puiss) left.push({ label: t('puissance'), dark: true, onClick: playPuissance });
    if (human && G.phase === 'mark' && G.moves && G.moves.length === 0) right.push(finir);
    if (human && G.phase === 'move' && undoAllowed() && G.prefix.length > 0) right.push({ label: t('undo'), title: t('undoTitle'), dark: true, onClick: undoTurn });
    if (human && G.phase === 'after') {
      if (undoAllowed() && G.prefix.length > 0 && !G.ecoleUsed) left.push({ label: t('undo'), title: t('undoTitle'), dark: true, onClick: undoTurn });
      if (G.ecole === 'tous' && !G.ecoleUsed) left.push(ecoleBtn);
      right.push(finir, voir);
    }
    if (G.phase === 'aimark') {
      if (G.ecole === 'tous' && !G.ecoleUsed) left.push(ecoleBtn);
      right.push({ label: t('roll'), primary: true, title: t('rollTitle'), onClick: rollDice }, voir);
    }
    if (G.phase === 'ecole') right.push({ label: t('validerEcole'), primary: true, onClick: validateEcole });
    buttonRow(svg, left, ROW_LEFT[0], ROW_LEFT[1], 'center');
    buttonRow(svg, right, ROW_RIGHT[0], ROW_RIGHT[1], 'start');
    if (G.okCallback) svgButton(svg, B.ok, m ? { label: 'OK', size: 30, onClick: pressOk }
      : { label: 'OK', sub: t('space'), size: 21, title: t('okTitle'), onClick: pressOk });
    return;
  }
  if (G.okCallback) {
    svgButton(svg, B.ok, m ? { label: 'OK', size: 30, onClick: pressOk }
      : { label: 'OK', sub: t('space'), size: 21, title: t('okTitle'), onClick: pressOk });
  }
  if (human && undoAllowed() && (G.phase === 'confirm' || G.phase === 'move' && G.prefix.length > 0)) {
    svgButton(svg, B.undo, { label: t('undo'), title: t('undoTitle'), size: m ? 21 : 15, dark: true, onClick: undoTurn });
  }
  if (G.phase === 'move' && human && G.prefix.length === 0 && G.moves && G.moves.some(mv => mv.puissance && puissanceAllowed(mv))) {
    svgButton(svg, B.puiss, { label: t('puissance'), size: m ? 21 : 15, dark: true, onClick: playPuissance });
  }
}
/* « Lancer les dés » : au tour du joueur, il lance ; après le coup de l'ordinateur (écoles), lancer
   clôt d'abord la marque du joueur (l'ordinateur peut alors le mettre à l'école), puis le tour passe. */
function rollDice() {
  if (G.phase === 'roll' && G.turn === G.human) startTurn();
  else if (G.phase === 'aimark') closeHumanMark(() => endTurn(true));
}

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
  /* pendant la marque, toutes les dames du joueur ont le liseré : rien ne trahit le remplissage */
  if (G.phase === 'mark' && G.turn === G.human) {
    for (let p = 1; p <= 24; p++) if (G.st.b[G.human][p]) info.sources.add(toWhite(G.human, p));
    return info;
  }
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
  const p = fromWhite(G.human, wp);
  /* toucher une dame clôt la marque ; le clic compte ensuite comme d'habitude */
  if (G.phase === 'mark' && G.turn === G.human) {
    if (p === OFF || !G.st.b[G.human][p]) return;
    closeHumanMark(() => {
      if (!G.moves.length) { showToast(t('dameNonJouable')); enterAfter(); return; }
      G.phase = 'move'; G.touched = false; G.selected = null;
      onPointClick(wp);
      renderAll();
    });
    return;
  }
  if (G.phase !== 'move' || G.turn !== G.human) return;
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
        addDameTrail(G.human, s);
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
  } else if (p !== OFF && G.st.b[G.human][p] > 0) showToast(t('dameNonJouable'));
}
/* Coup complet : il attend d'être validé (OK ou Espace) et peut encore être annulé.
   Sans annulation possible, il n'y a rien à valider : le coup est joué aussitôt.
   Avec les écoles, il attend toujours : École, Fin de tour, Points réels. */
function awaitConfirm(mv) {
  if (ecoleOn()) { enterAfter(); return; }
  if (!undoAllowed()) { G.phase = 'anim'; renderAll(); endTurn(); return; }
  G.phase = 'confirm';
  G.okCallback = () => { G.phase = 'anim'; renderAll(); endTurn(); };
  renderAll();
}
function undoTurn() {
  const ok = G.phase === 'move' || G.phase === 'confirm' || (G.phase === 'after' && !G.ecoleUsed);
  if (!ok || G.turn !== G.human || !undoAllowed()) return;
  G.okCallback = null;
  G.st.b[G.human] = Int8Array.from(G.turnStart.b[G.human]);
  G.st.off[G.human] = G.turnStart.off[G.human];
  G.prefix = []; G.selected = null; G.touched = false;
  G.trails = G.trails.filter(tr => !(tr.kind === 'dame' && tr.c === G.human));
  if (G.hints && !ecoleOn()) { G.hintsOn = true; waitOk(beginHumanMove); } else beginHumanMove();
}
function playPuissance() {
  if (G.phase === 'mark' && G.turn === G.human) {   // jouer ses dames clôt la marque
    closeHumanMark(() => { G.phase = 'move'; playPuissance(); });
    return;
  }
  if (G.phase !== 'move' || G.turn !== G.human || G.prefix.length) return;
  const mv = G.moves.find(m => m.puissance);
  if (!mv || !puissanceAllowed(mv)) return;
  G.selected = null; G.touched = false;
  for (const s of mv.steps) { applyStep(G.human, s); G.prefix.push(s); addDameTrail(G.human, s); }
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
  if (!next || (G.phase !== 'wait' && G.phase !== 'confirm' && G.phase !== 'seen')) return;
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
  G.phase = 'init'; G.prefix = []; G.moves = null; G.selected = null;
  G.mark = null; G.decl = null; G.pick = null; G.aiClaim = null; G.trails = []; G.log = []; G.seenSwap = null;
  $('modal').classList.add('hidden');
  hideRecap();
  hideToast();
  hideFinale();
  let a, b;
  do { a = rnd(); b = rnd(); } while (a === b);
  G.dice = null;
  G.turn = a > b ? WHITE : BLACK;
  scheduleTurn();
}

function scheduleTurn() {
  if (gameOver(G.st)) { endGame(); return; }
  G.ecole = G.ecolePref;   // un changement de mode des écoles s'applique au tour suivant
  G.phase = 'roll'; G.dice = null; G.moves = null; G.prefix = []; G.selected = null; G.touched = false;
  G.hints = null; G.hintsOn = false; G.okCallback = null;
  G.mark = null; G.decl = null; G.pick = null;
  renderAll();
  if (G.turn === G.ai) setTimeout(startTurn, 700);
}

function startTurn() {
  const me = G.turn, st = G.st, opp = 1 - me;
  const d1 = rnd(), d2 = rnd();
  G.dice = [d1, d2];
  G.turnStart = cloneState(st);
  G.moves = genMoves(st, me, d1, d2);
  G.prefix = []; G.selected = null; G.trails = [];
  const events = rollEvents(st, me, d1, d2, G.moves);
  noteLance(st, me, d1, d2);
  G.hints = buildHints(me, events);
  G.rollPts = [0, 0];
  for (const e of events) G.rollPts[e.who] += e.pts;
  G.log = []; G.aiClaim = null; G.ecoleUsed = false;
  if (ecoleOn()) { startTurnEcole(me); return; }
  G.hintsOn = G.hints !== null;
  /* Tous les points se marquent au jet, avant de jouer. Celui qui a jeté marque le premier ;
     s'il gagne un trou, il tient ou s'en va aussitôt. S'il tient, l'adversaire marque
     ensuite ses points du jet ; s'il s'en va, ces points sont perdus. */
  const before = marqueSnap(st);
  applyEvents(st, events.filter(e => e.who === me));
  addMarkTrails(before, 'auto');
  if (gameOver(st)) { renderAll(); endGame(); return; }
  const delay = G.hints ? 300 : (G.moves.length ? 500 : 1000);   // après OK, on enchaîne vite
  let play;
  if (G.moves.length === 0) play = () => { G.phase = 'anim'; renderAll(); setTimeout(endTurn, delay); };
  else if (me === G.ai) play = () => { G.phase = 'anim'; renderAll(); setTimeout(aiPlay, delay); };
  else play = beginHumanMove;
  /* points de l'adversaire ; renvoie false si la partie est finie */
  const oppScores = () => {
    const b2 = marqueSnap(st);
    applyEvents(st, events.filter(e => e.who !== me));
    addMarkTrails(b2, 'auto');
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

/* Jet avec les écoles : pas d'indicateurs de points (« Points réels » les montre ensuite).
   Le joueur marque lui-même ses points ; l'ordinateur marque les siens (avec une erreur possible),
   tient ou s'en va, puis joue. */
function startTurnEcole(me) {
  const st = G.st, h = G.human, ai = G.ai;
  G.hintsOn = false;
  if (me === h) {
    G.mark = { c: h, kind: 'roll', S0: marqueSnap(st), T: G.rollPts[h], dt: 0, fichetDone: false };
    G.phase = 'mark';
    renderAll();
    return;
  }
  aiMarque(G.rollPts[ai]);
  G.phase = 'anim';
  renderAll();
  if (gameOver(st)) { endGame(); return; }
  const play = () => { G.phase = 'anim'; renderAll(); setTimeout(G.moves.length ? aiPlay : enterAiMark, 800); };
  if (st.trouPending[ai]) decideTrou(ai, play); else play();
}

function aiPlay() {
  const me = G.turn;
  const [d1, d2] = G.dice;
  const mv = aiChooseMove(G.st, me, d1, d2, G.moves, G.level);
  if (mv.puissance) {
    for (const s of mv.steps) { applyStep(me, s); G.prefix.push(s); addDameTrail(me, s); }
    renderAll();
    setTimeout(aiDone, 700);
    return;
  }
  let i = 0;
  const stepFn = () => {
    if (i >= mv.steps.length) { aiDone(); return; }
    const s = mv.steps[i++];
    applyStep(me, s);
    G.prefix.push(s);
    addDameTrail(me, s);
    renderAll();
    setTimeout(stepFn, 600);
  };
  stepFn();
}
/* coup de l'ordinateur joué : avec les écoles, le joueur marque ses points du jet adverse */
function aiDone() {
  if (ecoleOn()) enterAiMark(); else endTurn();
}

/* rollNow : le joueur vient de cliquer sur les dés, son jet suit aussitôt */
function endTurn(rollNow) {
  G.hintsOn = false;
  G.mark = null; G.decl = null; G.pick = null;
  const me = G.turn, st = G.st;
  renderAll();
  if (st.off[me] === 15) {
    st.releve++;
    resetRelevee(st);
    G.trails = [];
    G.turn = me;
    setTimeout(scheduleTurn, 800);
    return;
  }
  G.turn = 1 - me;
  scheduleTurn();
  if (rollNow === true && G.turn === G.human && G.phase === 'roll') startTurn();
}

/* S'en aller : nouvelle relevée que c commence, les points des deux joueurs sont remis à zéro. */
function doAller(c) {
  const st = G.st;
  st.releve++;
  st.points = [0, 0];
  st.bredouille = [false, false];
  resetRelevee(st);
  G.mark = null; G.decl = null; G.pick = null; G.trails = [];   // dames au talon : fantômes caducs
  G.turn = c;
  G.phase = 'anim';
  renderAll();
  setTimeout(scheduleTurn, 600);
}
/* Celui qui vient de gagner un trou tient (cb : le jeu continue) ou s'en va, avant de bouger ses
   dames. S'il s'en va, l'adversaire ne marque pas ses points du jet. */
function decideTrou(c, cb) {
  const st = G.st;
  st.trouPending[c] = 0;
  G.phase = 'anim';
  renderAll();
  const decide = choice => { if (choice === 'aller') doAller(c); else cb(); };
  if (c === G.ai) setTimeout(() => {
    const choice = aiTrouDecision(st, c, true);
    if (choice === 'aller') showToast(t('aiSenVa'));
    decide(choice);
  }, 500);
  else showTrouModal(t('trouText', st.trous[c], st.points[c]), decide);
}

function showTrouModal(msg, decide) {
  $('modal-text').textContent = msg;
  $('modal').classList.remove('hidden');
  const close = choice => { $('modal').classList.add('hidden'); $('btn-aller').onclick = null; $('btn-tenir').onclick = null; decide(choice); };
  $('btn-aller').onclick = () => close('aller');
  $('btn-tenir').onclick = () => close('tenir');
}

/* ---------- Écoles : la marque à la main ---------- */
const aiSees = () => G.ecole === 'joueur' || Math.random() >= ECOLE_MISS[G.level];

/* L'ordinateur marque T points (avec une erreur possible dans le mode « joueur et ordinateur »). */
function aiMarque(T) {
  const st = G.st, ai = G.ai, before = marqueSnap(st);
  const m = G.ecole === 'tous' ? marqueOrdinateur(st.points[ai], T, ECOLE_MISS[G.level]) : T;
  G.aiClaim = { S0: before, T, m, caught: false };
  addPoints(st, ai, m);
  addMarkTrails(before, 'ai');
}
/* le joueur marque ses points du jet de l'ordinateur */
function enterAiMark() {
  const st = G.st, h = G.human;
  G.mark = { c: h, kind: 'opp', S0: marqueSnap(st), T: G.rollPts[h], dt: 0, fichetDone: false };
  G.phase = 'aimark';
  renderAll();
}
function enterAfter() {
  G.phase = 'after';
  G.selected = null;
  renderAll();
}

/* Jeton et fichet que le joueur peut déplacer (mov : 'jeton0', 'fichet1'…), et destinations de
   celui qui est sélectionné. Pendant sa marque : son jeton (en avant) et son fichet (une fois).
   En déclarant une école : en plus, le jeton de l'ordinateur (en arrière) et son fichet s'il l'a avancé. */
function markInfo() {
  const r = { mov: new Set(), targets: [] }, st = G.st, h = G.human, ai = G.ai, D = G.decl;
  if (!st) return r;
  if (G.mark && (G.phase === 'mark' || G.phase === 'aimark')) {
    if (st.points[h] < 10) r.mov.add('jeton' + h);
    if (!G.mark.fichetDone && st.trous[h] < TROUS_PARTIE) r.mov.add('fichet' + h);
  } else if (G.phase === 'ecole' && D) {
    if (st.points[h] < 10) r.mov.add('jeton' + h);
    if (!D.fichetDone && st.trous[h] < TROUS_PARTIE) r.mov.add('fichet' + h);
    if (D.S.points[ai] > 0) r.mov.add('jeton' + ai);
    if (D.aiTrousMin < D.S.trous[ai]) r.mov.add('fichet' + ai);
  }
  const p = G.pick;
  if (!p || !r.mov.has(p.kind + p.c)) return r;
  if (p.kind === 'jeton') {
    for (let v = 0; v <= 10; v += 2)
      if (p.c === h ? v > st.points[h] : v <= D.S.points[ai] && v !== st.points[ai]) r.targets.push(v);
  } else if (p.c === h) for (let n = st.trous[h] + 1; n <= TROUS_PARTIE; n++) r.targets.push(n);
  else for (let n = D.aiTrousMin; n <= D.S.trous[ai]; n++) if (n !== st.trous[ai]) r.targets.push(n);
  return r;
}
/* premier clic : sélection ; second clic sur le même : désélection (rien ne bouge) */
function pickMarker(kind, c) {
  G.pick = G.pick && G.pick.kind === kind && G.pick.c === c ? null : { kind, c };
  renderAll();
}
/* Pendant la déclaration d'une école, les déplacements sont provisoires : pas de fantôme, ceux de
   l'école sont posés à la validation. */
function moveMarker(kind, c, v) {
  G.pick = null;
  const before = marqueSnap(G.st), ecole = G.phase === 'ecole';
  if (kind === 'jeton') setJeton(c, v); else setFichet(c, v);
  if (!ecole) addMarkTrails(before, 'h');
  renderAll();
}
/* Le jeton de bredouille suit : marquer en partant de zéro met en bredouille, et ôte la bredouille
   à l'adversaire. Le jeton de l'ordinateur, reculé pour une école, ne change rien. */
function setJeton(c, v) {
  const st = G.st;
  if (c === G.human) {
    if (st.points[c] === 0) st.bredouille[c] = true;
    st.bredouille[1 - c] = false;
  }
  st.points[c] = v;
}
/* Fichet avancé par le joueur : son jeton revient au talon (il marquera son reste). Une erreur sur
   la seule bredouille est corrigée d'office. Sur son propre jet, il tient ou s'en va aussitôt ;
   sur le jet de l'ordinateur, il tient (les points de l'ordinateur sont effacés). */
function setFichet(c, n) {
  const st = G.st;
  if (c !== G.human) { st.trous[c] = n; return; }
  const ecole = G.phase === 'ecole', M = ecole ? G.decl : G.mark;
  let dt = n - st.trous[c], note = '';
  if (!ecole) {
    const k = trousCorriges(M.S0, c, M.T, dt);
    if (k !== dt) { dt = k; note = t('bredouilleCorrigee', M.S0.trous[c] + k); G.log.push(t('recapBredouille')); }
  }
  st.trous[c] += dt;
  st.points[c] = 0;
  st.bredouille[c] = true;
  st.bredouille[1 - c] = false;
  M.dt = dt; M.fichetDone = true;
  if (ecole) return;
  if (M.kind === 'opp') {
    st.points[1 - c] = 0;
    if (note) showToast(note);
    if (gameOver(st)) closeHumanMark(() => { G.phase = 'aimark'; renderAll(); });
    return;
  }
  if (gameOver(st)) { closeHumanMark(() => (G.moves.length ? beginHumanMove() : enterAfter())); return; }
  renderAll();
  showTrouModal((note ? note + ' ' : '') + t('trouTextEcole', st.trous[c]), choice => {
    if (choice === 'aller') { humanAller(M); return; }
    const before = marqueSnap(st);
    st.points[1 - c] = 0;   // tenir : les points de l'adversaire sont effacés
    st.bredouille[1 - c] = false;
    addMarkTrails(before, 'h');
    renderAll();
  });
}

/* La marque du joueur est close (dame touchée, Fin de tour, dés lancés, Points réels…) :
   l'ordinateur la vérifie, puis, sur le jet du joueur, marque ses propres points. */
function closeHumanMark(next) {
  const M = G.mark, st = G.st;
  if (!M) { next(); return; }
  G.mark = null; G.pick = null;
  ecoleSurJoueur(M, pointsAnnonces(M.S0.points[M.c], M.dt, st.points[M.c]));
  if (gameOver(st)) { renderAll(); endGame(); return; }
  afterHumanMark(M, next);
}
/* Suite de la marque close : trou gagné par l'ordinateur sur l'école (il tient ou s'en va), puis
   ses points du jet du joueur, sur lesquels il ne peut pas s'en aller. */
function afterHumanMark(M, next) {
  const st = G.st, ai = 1 - M.c;
  const go = () => {
    if (M.kind === 'roll') {
      aiMarque(G.rollPts[ai]);
      st.trouPending[ai] = 0;
      if (gameOver(st)) { renderAll(); endGame(); return; }
    }
    next();
  };
  if (st.trouPending[ai]) decideTrou(ai, go); else go();
}
/* École de l'ordinateur sur la marque du joueur (C points annoncés, M.T réels) : par moins, il marque
   les points oubliés ; par trop, il ramène la marque du joueur à la juste valeur (les points qu'un
   faux trou lui avait effacés reviennent) et marque le surplus. Il ne fait jamais de fausse école. */
function ecoleSurJoueur(M, C) {
  const st = G.st, c = M.c, ai = 1 - c, T = M.T;
  if (C === T) return;
  const seen = aiSees(), pts = Math.abs(C - T);
  G.log.push(t('recapVous', C, T, seen));
  if (!seen) return;
  const before = marqueSnap(st);
  if (C > T) marqueRestore(st, marqueApres(M.S0, c, T));
  addPoints(st, ai, pts);
  addMarkTrails(before, 'ai');
  showToast(t(C > T ? 'toastEcoleTrop' : 'toastEcoleMoins', pts));
}
/* Le joueur s'en va : son reste est abandonné, il ne fait pas d'école par moins. Sur un trou marqué
   à tort (école par trop), l'ordinateur marque l'école ; si le joueur n'avait en fait aucun trou,
   le départ est annulé et le coup se joue. */
function humanAller(M) {
  const st = G.st, c = M.c, ai = 1 - c, T = M.T;
  G.mark = null; G.pick = null;
  const C = pointsAnnonces(M.S0.points[c], M.dt, 0);
  if (C > T) {
    const seen = aiSees(), pts = C - T;
    G.log.push(t('recapVous', C, T, seen));
    if (seen) {
      const before = marqueSnap(st), ref = marqueApres(M.S0, c, T);
      const legit = ref.trous[c] > M.S0.trous[c];
      if (legit) st.trous[c] = ref.trous[c]; else marqueRestore(st, ref);
      addPoints(st, ai, pts);
      addMarkTrails(before, 'ai');
      if (gameOver(st)) { renderAll(); endGame(); return; }
      if (!legit) {
        showToast(t('toastAllerAnnule', pts));
        renderAll();
        afterHumanMark(M, () => (G.moves.length ? beginHumanMove() : enterAfter()));
        return;
      }
      showToast(t('toastEcoleTrop', pts));
    }
  }
  doAller(c);
}

/* « Fin de tour » : sans dame jouable, il clôt la marque ; coup joué, le tour passe. */
function finirTour() {
  if (G.turn !== G.human) return;
  if (G.phase === 'mark' && G.moves && !G.moves.length) closeHumanMark(enterAfter);
  else if (G.phase === 'after') { G.phase = 'anim'; renderAll(); endTurn(); }
}

/* « École » : le joueur relève une erreur de l'ordinateur dans sa marque du jet. Après le coup de
   l'ordinateur, sa propre marque est d'abord close. */
function startEcole() {
  const back = G.phase;
  if (G.ecole !== 'tous' || G.ecoleUsed) return;
  if (!(back === 'after' && G.turn === G.human) && back !== 'aimark') return;
  const go = () => {
    const st = G.st, ai = G.ai;
    G.ecoleUsed = true;
    const min = G.aiClaim ? Math.min(G.aiClaim.S0.trous[ai], st.trous[ai]) : st.trous[ai];
    G.decl = { S: marqueSnap(st), dt: 0, fichetDone: false, aiTrousMin: min, back };
    G.phase = 'ecole'; G.pick = null;
    renderAll();
  };
  if (back === 'aimark') closeHumanMark(go); else go();
}
/* Validation de l'école : la marque de l'ordinateur est remise à sa juste place (la reculer à tort
   n'est pas une faute) ; le joueur garde les points qu'il s'est marqués jusqu'à l'école réelle ;
   au-delà, fausse école : l'ordinateur, s'il la voit, le ramène à l'école réelle et marque le surplus. */
function validateEcole() {
  const D = G.decl, st = G.st, h = G.human, ai = G.ai;
  if (G.phase !== 'ecole' || !D) return;
  G.decl = null; G.pick = null;
  const E = pointsAnnonces(D.S.points[h], D.dt, st.points[h]);
  const aiTouched = st.points[ai] !== D.S.points[ai] || st.trous[ai] !== D.S.trous[ai];
  marqueRestore(st, D.S);
  G.phase = D.back;
  if (E <= 0 && !aiTouched) { G.ecoleUsed = false; renderAll(); return; }   // rien de marqué : pas d'école
  const cl = G.aiClaim, delta = cl ? cl.m - cl.T : 0, V = Math.abs(delta);
  if (cl && delta !== 0) cl.caught = true;
  if (delta > 0) st.points[ai] = Math.max(0, st.points[ai] - delta);   // surplus de l'ordinateur retiré
  let gain = E, fausse = 0;
  if (E > V && aiSees()) { fausse = E - V; gain = V; }
  if (gain > 0) addPoints(st, h, gain);
  if (fausse > 0) addPoints(st, ai, fausse);
  addMarkTrails(D.S, 'h', [h]);    // l'école marquée par le joueur (corrigée s'il y a fausse école)
  addMarkTrails(D.S, 'ai', [ai]);  // la marque de l'ordinateur remise à sa juste place
  G.log.push(t('recapEcole', E, V, fausse));
  const msgs = [];
  if (delta > 0) msgs.push(t('toastAiRecule', delta));
  if (fausse > 0) msgs.push(t('toastFausse', fausse));
  else if (gain > 0) msgs.push(t('toastEcoleGain', gain));
  if (!msgs.length) msgs.push(t(V === 0 ? 'toastPasErreur' : 'toastEcoleRien'));
  showToast(msgs.join(' '));
  if (gameOver(st)) { renderAll(); endGame(); return; }
  /* trous gagnés par l'école : le joueur tient ou s'en va, puis l'ordinateur pour les siens */
  const after = () => {
    const back = () => { G.phase = D.back; renderAll(); };
    if (st.trouPending[ai]) decideTrou(ai, back); else back();
  };
  if (st.trouPending[h]) {
    st.trouPending[h] = 0;
    renderAll();
    showTrouModal(t('trouText', st.trous[h], st.points[h]), choice => (choice === 'aller' ? doAller(h) : after()));
  } else after();
}

/* « Points réels » : le tablier revient à la position du jet, avec les indicateurs de
   points et le récapitulatif des erreurs ; OK : le tour passe. Après le coup de l'ordinateur, la
   marque du joueur est d'abord close. */
function voirPoints() {
  const show = () => {
    const st = G.st;
    G.phase = 'seen';
    G.seenSwap = { b: st.b, off: st.off };
    st.b = [Int8Array.from(G.turnStart.b[0]), Int8Array.from(G.turnStart.b[1])];
    st.off = G.turnStart.off.slice();
    G.hintsOn = !!G.hints;
    showRecap();
    G.okCallback = () => {
      st.b = G.seenSwap.b; st.off = G.seenSwap.off; G.seenSwap = null;
      hideRecap();
      G.phase = 'anim';
      endTurn();
    };
    renderAll();
  };
  if (G.phase === 'aimark') closeHumanMark(show);
  else if (G.phase === 'after' && G.turn === G.human) show();
}
function showRecap() {
  const cl = G.aiClaim, errs = G.log.slice();
  if (cl && cl.m !== cl.T) errs.push(t('recapOrdi', cl.m, cl.T, cl.caught));
  if (!errs.length) errs.push(t('recapAucune'));
  const list = $('recap-list');
  list.innerHTML = '';
  for (const s of [t('recapReels', G.rollPts[G.human], G.rollPts[G.ai]), ...errs]) {
    const li = document.createElement('li');
    li.textContent = s;
    list.appendChild(li);
  }
  $('recap').classList.remove('hidden');
}
function hideRecap() { $('recap').classList.add('hidden'); }

/* Petite bulle d'information, qui s'efface d'elle-même ; les messages qui se suivent s'empilent. */
let toastTimer = null, toastLines = [];
function showToast(msg, ms = 3800) {
  if (!msg) return;
  const box = $('toast');
  toastLines.push(msg);
  box.textContent = toastLines.join('\n');
  box.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, ms);
}
function hideToast() {
  clearTimeout(toastTimer);
  toastLines = [];
  $('toast').classList.add('hidden');
}

function endGame() {
  G.phase = 'over';
  const st = G.st;
  const w = st.trous[WHITE] >= TROUS_PARTIE ? WHITE : BLACK;
  renderAll();
  setTimeout(() => showFinale(w === G.human, t('score', st.trous[w], st.trous[1 - w], st.trous[1 - w] === 0)), 600);
}

/* ---------- Animation de fin de partie : confettis si l'on gagne, pluie grise si l'on perd ---------- */
function showFinale(won, score) {
  const conf = $('confetti');
  conf.innerHTML = '';
  $('finale-title').textContent = t(won ? 'victory' : 'defeat');
  $('finale-text').textContent = t(won ? 'youWin' : 'aiWins', score);
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
    btn.dataset.i18nTitle = btn.dataset.i18nAria = on ? 'exitFullscreen' : 'fullscreen';
    btn.title = t(btn.dataset.i18nTitle);
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
const UNDO_MODES = ['touchee', 'deplacee', 'libre'];
function savedUndoMode() {
  try { const v = localStorage.getItem(UNDO_KEY); return UNDO_MODES.includes(v) ? v : 'libre'; }
  catch (e) { return 'libre'; }
}
function setUndoMode(mode) {
  G.undoMode = UNDO_MODES.includes(mode) ? mode : 'libre';
  $('opt-undo').value = G.undoMode;
  $('opt-undo-desc').textContent = t('undoDesc')[G.undoMode];
  try { localStorage.setItem(UNDO_KEY, G.undoMode); } catch (e) { /* stockage indisponible */ }
  if (G.undoMode !== 'touchee') G.touched = false;
  /* un coup complet en attente de validation devient définitif */
  if (G.phase === 'confirm' && !undoAllowed()) { pressOk(); return; }
  if (G.st) renderAll();
}
/* Écoles : pas d'école (par défaut), écoles du joueur, ou du joueur et de l'ordinateur ;
   le choix s'applique au tour suivant. */
const ECOLE_KEY = 'trictrac.ecoles';
function savedEcoleMode() {
  try { const v = localStorage.getItem(ECOLE_KEY); return ECOLE_MODES.includes(v) ? v : 'off'; }
  catch (e) { return 'off'; }
}
function setEcoleMode(mode) {
  G.ecolePref = ECOLE_MODES.includes(mode) ? mode : 'off';
  $('opt-ecole').value = G.ecolePref;
  $('opt-ecole-desc').textContent = t('ecoleDesc')[G.ecolePref];
  try { localStorage.setItem(ECOLE_KEY, G.ecolePref); } catch (e) { /* stockage indisponible */ }
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

/* Choix de la langue (écran d'accueil) : appliqué aussitôt, tablier compris, et retenu. */
function changeLang(lang) {
  setLang(lang);
  $('opt-undo-desc').textContent = t('undoDesc')[G.undoMode];
  $('opt-ecole-desc').textContent = t('ecoleDesc')[G.ecolePref];
  if (G.st) renderAll();
}

/* ---------- Démarrage ---------- */
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  for (const b of document.querySelectorAll('[data-set-lang]'))
    b.addEventListener('click', () => changeLang(b.dataset.setLang));
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
  $('opt-ecole').addEventListener('change', () => setEcoleMode($('opt-ecole').value));
  for (const k in DEFAULT_OPTS) $('opt-' + k).addEventListener('change', e => setOpt(k, e.target.checked));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeHelp(); hideFinale(); }
  });

  /* Espace : appuie sur OK quand il est affiché, sinon sur le bouton marqué « espace »
     (Fin de tour, Valider l'école), sinon lance les dés */
  const isSpace = e => e.code === 'Space' || e.key === ' ';
  const keyIgnored = e => e.ctrlKey || e.altKey || e.metaKey ||
    !$('modal').classList.contains('hidden') || !help.classList.contains('hidden') ||
    !$('finale').classList.contains('hidden') || !$('welcome').classList.contains('hidden') || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  document.addEventListener('keydown', e => {
    if (!isSpace(e) || keyIgnored(e)) return;
    e.preventDefault();          // pas de défilement de la page, ni de clic sur le bouton qui a le focus
    if (e.repeat) return;
    if (G.okCallback) pressOk();
    else if (G.phase === 'after' || (G.phase === 'mark' && G.moves && !G.moves.length)) finirTour();
    else if (G.phase === 'ecole') validateEcole();
    else rollDice();
  });
  document.addEventListener('keyup', e => { if (isSpace(e) && !keyIgnored(e)) e.preventDefault(); });

  /* tablier en position de départ derrière l'écran d'accueil */
  G.level = savedLevel();
  setUndoMode(savedUndoMode());
  setEcoleMode(savedEcoleMode());
  loadOpts();
  G.st = newState();
  G.st.opts = G.opts;
  renderAll();
  showWelcome(false);
});
