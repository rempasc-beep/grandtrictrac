'use strict';
/* ============================================================
   IA de trictrac, inspirée des méthodes classiques du backgammon :
   - fonction d'évaluation heuristique sur la position (progression vers
     le plein de chaque jan, coin, avance des dames)
   - espérance exacte sur les 21 jets de dés des points marqués au jet
     (dames battues, coin battu, pleins faits et conservés, jan qui ne peut…),
     au prochain jet de l'adversaire comme au sien
   - niveau fort : expectimax à 2 plis (meilleure réponse de l'adversaire
     pour chaque jet) sur les meilleurs candidats du 1er pli.
   Les réglages ont été choisis par des milliers de parties de l'IA contre elle-même.
   ============================================================ */
const ROLLS = [];
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push([a, b, a === b ? 1 / 36 : 2 / 36]);

/* Espérance (sur les 21 jets) du gain net de points de `me` à son prochain jet,
   la position étant supposée inchangée. */
function expRollNet(st, me) {
  let s = 0;
  for (const r of ROLLS) s += r[2] * netEvents(rollEvents(st, me, r[0], r[1], null), me);
  return s;
}

const PLEIN_VALUE = 12;          // valeur d'un jan plein (les points du plein conservé sont comptés au jet)
const JAN_WEIGHT = { petit: 1.0, grand: 0.85, retour: 1.0 };
const FILL_ALPHA = 3;            // la valeur d'un jan croît comme (places garnies / 12)^3
const FILL_SCALE = 6;            // une place à garnir à d flèches vaut 1/(1 + d/6) place garnie
const HELD_FACTOR = 0.3;         // place sur une flèche tenue par l'adversaire (ou jan de retour encore fermé)
const COIN_VALUE = 1.5, COIN_LATE = 0.4;   // coin pris, selon que le grand jan peut encore se remplir ou non
const PIP_WEIGHT = 0.006;        // avance des dames, par flèche

/* Progression vers le plein du jan qui commence en lo, en « places » garnies (0..12) :
   chaque place vide est attribuée à la dame disponible la plus proche en deçà (talon et
   flèches précédentes, ou dame en surnombre d'une flèche précédente du jan). Une place
   garnie vaut 1, une place à garnir vaut 1/(1 + d/FILL_SCALE) selon la distance d de sa dame,
   réduite si la flèche est tenue par l'adversaire ou si le jan est encore fermé.
   Renvoie -1 si le jan ne peut plus être rempli (les dames ne font qu'avancer). */
function janProgress(m, th, lo, closed) {
  const sup = new Int8Array(25);
  for (let p = 1; p < lo; p++) sup[p] = m[p];
  let P = 0;
  for (let q = lo; q < lo + 6; q++) {
    const have = Math.min(m[q], 2);
    P += have;
    const held = closed || th[25 - q] > 0;
    for (let k = have; k < 2; k++) {
      let p = q - 1;
      while (p >= 1 && sup[p] === 0) p--;
      if (p < 1) return -1;
      sup[p]--;
      P += (held ? HELD_FACTOR : 1) / (1 + (q - p) / FILL_SCALE);
    }
    sup[q] = Math.max(0, m[q] - 2);
  }
  return P;
}

/* Évaluation statique (en "points de trictrac" approximatifs) du point de vue de `me`.
   L'exposition des dames seules n'est pas évaluée ici : elle est calculée
   exactement par expRollNet (espérance des points de l'adversaire au jet). */
function staticEval(st, me) {
  let s = 0;
  for (let c = 0; c < 2; c++) {
    const m = st.b[c], th = st.b[1 - c];
    let v = 0;
    for (const key in JANS) {
      if (isPlein(m, key)) { v += JAN_WEIGHT[key] * PLEIN_VALUE; continue; }
      /* le jan de retour (petit jan adverse) reste fermé tant que l'adversaire peut remplir son petit jan */
      const closed = key === 'retour' && canStillFill(th, 1);
      const P = janProgress(m, th, JANS[key][0], closed);
      if (P > 0) v += JAN_WEIGHT[key] * PLEIN_VALUE * Math.pow(P / 12, FILL_ALPHA);
    }
    /* le coin compte surtout tant qu'il peut servir au grand jan : ensuite, y garder
       ses dames les empêche d'aller garnir le jan de retour */
    if (m[COIN] >= 2) v += canStillFill(m, 7) ? COIN_VALUE : COIN_LATE;
    let pips = st.off[c] * 24;
    for (let p = 1; p <= 24; p++) pips += (p - 1) * m[p];
    v += PIP_WEIGHT * pips;
    s += c === me ? v : -v;
  }
  return s;
}

/* Valeur d'une position pour `who` qui vient de jouer : position, puis jet de l'adversaire,
   puis son propre jet suivant (les points de ce jet-là sont aussi réels que ceux de
   l'adversaire : les compter pleinement prépare bien mieux les pleins). */
function plyValue(pos, who) {
  return staticEval(pos, who) - expRollNet(pos, 1 - who) + expRollNet(pos, who);
}

/* Valeur, pour `me`, du tour de l'adversaire à partir de la position `after`
   (après le coup de `me`) : espérance sur ses jets de [points au jet + meilleure réponse].
   La réponse est jugée sur la position et le jet suivant de `me` (sans le jet d'après de
   l'adversaire, trop lointain : l'y ajouter rend le niveau fort plus faible que le normal).
   Pour gagner du temps, seules les REPLY_CANDIDATES meilleures réponses selon la position
   sont examinées en détail. */
const REPLY_CANDIDATES = 4;
function twoPly(after, me) {
  const opp = 1 - me;
  let total = 0;
  for (const [d1, d2, p] of ROLLS) {
    const moves = genMoves(after, opp, d1, d2);
    const base = netEvents(rollEvents(after, opp, d1, d2, moves), opp);
    let best;
    if (moves.length === 0) {
      best = staticEval(after, opp) - expRollNet(after, me);
    } else {
      let cands = dedupeMoves(moves).map(mv => ({ mv, a2: applyMoveSim(after, opp, mv) }));
      if (cands.length > REPLY_CANDIDATES) {
        for (const c of cands) c.s = c.mv.off === 15 ? Infinity : staticEval(c.a2, opp);
        cands.sort((x, y) => y.s - x.s);
        cands = cands.slice(0, REPLY_CANDIDATES);
      }
      best = -Infinity;
      for (const { mv, a2 } of cands) {
        const v = mv.off === 15 ? 1 : staticEval(a2, opp) - expRollNet(a2, me);
        if (v > best) best = v;
      }
    }
    total += p * (base + best);
  }
  return -total;
}

/* Choix du coup. level : 0 facile (position seule, avec du hasard), 1 normal (1 pli + espérance
   des jets), 2 fort (2 plis). */
function aiChooseMove(st, me, d1, d2, moves, level) {
  const uniq = dedupeMoves(moves);
  if (uniq.length === 1) return uniq[0];
  const scored = uniq.map(mv => {
    const after = applyMoveSim(st, me, mv);
    let v;
    if (mv.off === 15) v = 1;
    else if (level === 0) v = staticEval(after, me) + Math.random() * EASY_NOISE;
    else v = plyValue(after, me);
    return { mv, after, v };
  });
  scored.sort((a, b) => b.v - a.v);
  if (level >= 2) {
    const top = scored.slice(0, 6);
    for (const c of top) if (c.mv.off !== 15) c.v = twoPly(c.after, me);
    top.sort((a, b) => b.v - a.v);
    return top[0].mv;
  }
  return scored[0].mv;
}
const EASY_NOISE = 1.5;

/* Après un trou : s'en aller (nouvelle relevée) ou tenir ? */
function aiTrouDecision(st, me, meToMove) {
  const opp = 1 - me;
  let v = staticEval(st, me);
  if (meToMove) v += expRollNet(st, me) - expRollNet(st, opp);
  else v += -expRollNet(st, opp) + expRollNet(st, me);
  const threshold = -0.5 - 0.6 * st.points[me];
  return v < threshold ? 'aller' : 'tenir';
}

if (typeof module !== 'undefined') {
  module.exports = { ROLLS, expRollNet, staticEval, janProgress, plyValue, twoPly, aiChooseMove, aiTrouDecision };
}
