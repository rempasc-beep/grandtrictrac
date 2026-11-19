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
  const s = { points: st.points.slice(), trous: st.trous.slice(), bredouille: st.bredouille.slice() };
  if (st.affilee) s.affilee = st.affilee.slice();   // trous d'affilée (partie à écrire)
  return s;
}
function marqueRestore(st, s) {
  st.points = s.points.slice();
  st.trous = s.trous.slice();
  st.bredouille = s.bredouille.slice();
  if (s.affilee && st.affilee) st.affilee = s.affilee.slice();
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

/* Points que who aurait marqués (pour le jet de me) avec les jets proches de (d1, d2) : un seul dé
   changé d'un point. st est l'état au moment du jet (avant noteLance). */
function pointsProches(st, me, who, d1, d2) {
  const out = [];
  for (const [a, b] of [[d1 - 1, d2], [d1 + 1, d2], [d1, d2 - 1], [d1, d2 + 1]]) {
    if (a < 1 || a > 6 || b < 1 || b > 6) continue;
    let p = 0;
    for (const e of rollEvents(st, me, a, b, genMoves(st, me, a, b))) if (e.who === who) p += e.pts;
    out.push(p);
  }
  return out;
}

/* Points que marque l'ordinateur (o anciens points, T points réels) : avec la probabilité rate, il
   se trompe sans changer le nombre de trous. S'il a des points, il en marque un autre nombre pair
   entre 0 et T + 4 (oubli ou erreur de compte). S'il n'a rien, il ne se trompe que si un jet proche
   (proches : points de ces jets) lui aurait donné des points : il marque alors ces points-là. */
function marqueOrdinateur(o, T, rate, rnd = Math.random, proches = []) {
  if (rnd() >= rate) return T;
  const D = Math.floor((o + T) / 12), cand = [];
  const ok = m => m !== T && Math.floor((o + m) / 12) === D && !cand.includes(m);
  if (T === 0) { for (const m of proches) if (m > 0 && ok(m)) cand.push(m); }
  else for (let m = 0; m <= T + 4; m += 2) if (ok(m)) cand.push(m);
  return cand.length ? cand[Math.floor(rnd() * cand.length)] : T;
}

if (typeof module !== 'undefined') {
  module.exports = { ECOLE_MODES, ECOLE_MISS, marqueSnap, marqueRestore, marqueApres, pointsAnnonces, trousCorriges, pointsProches, marqueOrdinateur };
}
