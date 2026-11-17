'use strict';
/* ============================================================
   Écoles (règle optionnelle) : calculs de la marque faite à la main.
   - off : pas d'école, la marque est automatique ;
   - joueur : le joueur marque lui-même, l'ordinateur ne se trompe jamais et relève toujours ses écoles ;
   - tous : l'ordinateur peut aussi se tromper en marquant, ou ne pas voir une école du joueur.
   La marque d'un joueur se lit comme sur un vrai tablier : ses trous (fichet) et ses points (jeton).
   ============================================================ */
const ECOLE_MODES = ['off', 'joueur', 'tous'];
/* probabilité que l'ordinateur se trompe en marquant, ou ne voie pas une école : facile, normal, fort */
const ECOLE_MISS = [0.15, 0.05, 0.01];

function marqueSnap(st) {
  return { points: st.points.slice(), trous: st.trous.slice(), bredouille: st.bredouille.slice() };
}
function marqueRestore(st, s) {
  st.points = s.points.slice();
  st.trous = s.trous.slice();
  st.bredouille = s.bredouille.slice();
}
/* Marque juste : celle que donnerait pts points marqués par who à partir de la marque s. */
function marqueApres(s, who, pts) {
  const m = Object.assign(marqueSnap(s), { trouPending: [0, 0] });
  addPoints(m, who, pts);
  return m;
}

/* Points annoncés par une marque (règle des écoles, « nombre de points marqués ») : anciens points o,
   fichet avancé de dt trous, reste j posé au jeton. Les douzaines se déduisent des trous :
   un nombre impair de trous compte comme le nombre pair suivant (erreur de bredouille). */
function pointsAnnonces(o, dt, j) {
  return dt > 0 ? 12 * Math.ceil(dt / 2) - o + j : j - o;
}

/* Trous à retenir quand le fichet avance de dt, la marque juste (depuis s, pts points) en donnant k :
   une erreur sur la seule bredouille (même nombre de douzaines : 2D-1 ou 2D trous) n'est pas une
   école, le fichet est remis au bon trou. Toute autre erreur reste : elle fera école. */
function trousCorriges(s, who, pts, dt) {
  const k = marqueApres(s, who, pts).trous[who] - s.trous[who];
  const D = Math.floor((s.points[who] + pts) / 12);
  return dt !== k && D >= 1 && Math.ceil(dt / 2) === D ? k : dt;
}

/* Points que marque l'ordinateur (o anciens points, T points réels) : avec la probabilité rate,
   une valeur paire tirée entre 0 et T + 4, différente de T, qui ne change pas le nombre de trous. */
function marqueOrdinateur(o, T, rate, rnd = Math.random) {
  if (rnd() >= rate) return T;
  const D = Math.floor((o + T) / 12), cand = [];
  for (let m = 0; m <= T + 4; m += 2) if (m !== T && Math.floor((o + m) / 12) === D) cand.push(m);
  return cand.length ? cand[Math.floor(rnd() * cand.length)] : T;
}

if (typeof module !== 'undefined') {
  module.exports = { ECOLE_MODES, ECOLE_MISS, marqueSnap, marqueRestore, marqueApres, pointsAnnonces, trousCorriges, marqueOrdinateur };
}
