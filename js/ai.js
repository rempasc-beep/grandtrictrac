'use strict';
/* ============================================================
   IA de trictrac, inspirée des méthodes classiques du backgammon :
   - fonction d'évaluation heuristique (type "pubeval") sur la position
   - espérance exacte sur les 21 jets de dés possibles de l'adversaire
     (points qu'il marquera au jet : dames battues, coin battu, jan qui ne peut…)
   - niveau fort : expectimax à 2 plis (meilleure réponse de l'adversaire
     pour chaque jet) sur les meilleurs candidats du 1er pli.
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

/* Valeur d'un jan selon le nombre de flèches garnies de 2 dames ou plus
   (le plein vaut 4 ou 6 points à chaque coup où il est conservé). */
const PLEIN_TABLE = [0, 0.3, 0.7, 1.3, 2.2, 3.6, 7.0];
const JAN_WEIGHT = { petit: 1.0, grand: 0.85, retour: 0.7 };

/* Évaluation statique (en "points de trictrac" approximatifs) du point de vue de `me`.
   L'exposition des dames seules n'est pas évaluée ici : elle est calculée
   exactement par expRollNet (espérance des points de l'adversaire au jet). */
function staticEval(st, me) {
  let s = 0;
  for (let c = 0; c < 2; c++) {
    const sign = c === me ? 1 : -1;
    const m = st.b[c], th = st.b[1 - c];
    let v = 0;
    for (const key in JANS) {
      let cnt2 = 0, cnt1 = 0, blocked = false;
      for (const p of JANS[key]) {
        if (m[p] >= 2) cnt2++;
        else if (m[p] === 1) cnt1++;
        if (th[25 - p] > 0) blocked = true;
      }
      let val = PLEIN_TABLE[cnt2] + 0.25 * cnt1;
      if (blocked && cnt2 < 6) val *= 0.3;
      v += JAN_WEIGHT[key] * val;
    }
    if (m[COIN] >= 2) v += 1.5;
    let pips = st.off[c] * 24;
    for (let p = 1; p <= 24; p++) pips += (p - 1) * m[p];
    v += 0.006 * pips;
    for (let p = 2; p <= 24; p++) if (m[p] === 1) v -= 0.05;
    s += sign * v;
  }
  return s;
}

/* Valeur, pour `me`, du tour de l'adversaire à partir de la position `after`
   (après le coup de `me`) : espérance sur ses jets de [points au jet + meilleure réponse]. */
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
      best = -Infinity;
      for (const mv of dedupeMoves(moves)) {
        const a2 = applyMoveSim(after, opp, mv);
        const imm = netEvents(moveEvents(after, opp, after.b[opp], mv.final, mv.off, d1 === d2), opp);
        const v = mv.off === 15 ? imm + 1 : imm + staticEval(a2, opp) - expRollNet(a2, me);
        if (v > best) best = v;
      }
    }
    total += p * (base + best);
  }
  return -total;
}

/* Choix du coup. level : 0 facile, 1 normal (1 pli + espérance), 2 fort (2 plis). */
function aiChooseMove(st, me, d1, d2, moves, level) {
  const uniq = dedupeMoves(moves);
  if (uniq.length === 1) return uniq[0];
  const dbl = d1 === d2;
  const scored = uniq.map(mv => {
    const after = applyMoveSim(st, me, mv);
    const imm = netEvents(moveEvents(st, me, st.b[me], mv.final, mv.off, dbl), me);
    let v;
    if (mv.off === 15) v = imm + 1;
    else if (level === 0) v = imm + staticEval(after, me) + Math.random() * 1.5;
    else v = imm + staticEval(after, me) - expRollNet(after, 1 - me) + 0.35 * expRollNet(after, me);
    return { mv, after, imm, v };
  });
  scored.sort((a, b) => b.v - a.v);
  if (level >= 2) {
    const top = scored.slice(0, 6);
    for (const c of top) if (c.mv.off !== 15) c.v = c.imm + twoPly(c.after, me);
    top.sort((a, b) => b.v - a.v);
    return top[0].mv;
  }
  return scored[0].mv;
}

/* Après un trou : s'en aller (nouvelle relevée) ou tenir ? */
function aiTrouDecision(st, me, meToMove) {
  const opp = 1 - me;
  let v = staticEval(st, me);
  if (meToMove) v += expRollNet(st, me) - 0.35 * expRollNet(st, opp);
  else v += -expRollNet(st, opp) + 0.35 * expRollNet(st, me);
  const threshold = -0.5 - 0.6 * st.points[me];
  return v < threshold ? 'aller' : 'tenir';
}

if (typeof module !== 'undefined') {
  module.exports = { ROLLS, expRollNet, staticEval, twoPly, aiChooseMove, aiTrouDecision };
}
