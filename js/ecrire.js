'use strict';
/* ============================================================
   Partie à écrire : calcul des marqués et paiement de fin de partie.
   La partie se joue en un nombre pair de marqués ; un marqué se joue comme la partie en
   douze trous, sans limite de trous : dès qu'un joueur a six trous, celui qui s'en va le termine.
   - points d'un marqué : (trous du gagnant + consolation) × 1, 2 (petite bredouille, 6 à 11 trous
     d'affilée) ou 4 (grande bredouille, 12 trous et plus d'affilée), moins les trous du perdant ;
     consolation : 2 points, 4 après un refait, 6 après deux… (trous égaux : refait, à rejouer) ;
   - paiement des marqués : 4 points par marqué gagné, 20 de queue des marqués à qui en a gagné le
     plus, queue des jetons (2 points par marqué gagné à qui a le plus de points, ou, à égalité de
     points, 1 point par marqué d'avance à qui en a gagné le plus) ; gain arrondi à la dizaine.
   ============================================================ */
const MARQUES_CHOIX = [4, 6, 8, 12];
const MARQUES_DEFAUT = 6;
const TROUS_MARQUE = 6;          // dès qu'un joueur a six trous, s'en aller termine le marqué
const CONSOLATION = 2, POINTS_MARQUE = 4, QUEUE_MARQUES = 20;

/* s'en aller termine-t-il le marqué ? */
function marqueFini(trous) {
  return Math.max(trous[0], trous[1]) >= TROUS_MARQUE;
}

/* Résultat du marqué terminé avec ces trous ; affilee[c] : c a fait tous ses trous d'affilée
   (l'adversaire n'en a marqué aucun depuis son premier) ; refaits : refaits qui précèdent.
   gagnant null : refait. bred : 0 (sans bredouille), 1 (petite), 2 (grande). */
function resultatMarque(trous, affilee, refaits) {
  const cons = CONSOLATION * (refaits + 1);
  if (trous[0] === trous[1]) return { gagnant: null, trous: trous.slice(), cons, bred: 0, mult: 1, points: 0 };
  const w = trous[0] > trous[1] ? 0 : 1, tw = trous[w], tl = trous[1 - w];
  const bred = tl === 0 || affilee[w] ? (tw >= 12 ? 2 : 1) : 0;
  const mult = [1, 2, 4][bred];
  return { gagnant: w, trous: trous.slice(), cons, bred, mult, points: (tw + cons) * mult - tl };
}

/* Gain arrondi : à la dizaine supérieure si les unités vont de 5 à 9, inférieure de 1 à 4. */
function arrondiGain(n) {
  const u = n % 10;
  return u >= 5 ? n - u + 10 : n - u;
}

/* Paiement des marqués joués (fiche : marqués gagnés, { gagnant, points }, refaits exclus).
   Renvoie, pour chaque joueur, les lignes de la fiche (I à IV), le résultat final, et le gain. */
function bilanPartie(fiche) {
  const I = [0, 0], gagnes = [0, 0];
  for (const m of fiche) { I[m.gagnant] += m.points; gagnes[m.gagnant]++; }
  const II = [0, 0], III = gagnes.map(n => POINTS_MARQUE * n), IV = [0, 0];
  if (I[0] !== I[1]) { const c = I[0] > I[1] ? 0 : 1; II[c] = 2 * gagnes[c]; }
  else if (gagnes[0] !== gagnes[1]) { const c = gagnes[0] > gagnes[1] ? 0 : 1; II[c] = gagnes[c] - gagnes[1 - c]; }
  if (gagnes[0] !== gagnes[1]) IV[gagnes[0] > gagnes[1] ? 0 : 1] = QUEUE_MARQUES;
  const total = [0, 1].map(c => I[c] + II[c] + III[c] + IV[c]);
  const brut = Math.abs(total[0] - total[1]);
  const vainqueur = total[0] === total[1] ? null : total[0] > total[1] ? 0 : 1;
  return { I, II, III, IV, total, gagnes, vainqueur, brut, arrondi: arrondiGain(brut) };
}

if (typeof module !== 'undefined') {
  module.exports = { MARQUES_CHOIX, MARQUES_DEFAUT, TROUS_MARQUE, marqueFini, resultatMarque, arrondiGain, bilanPartie };
}
