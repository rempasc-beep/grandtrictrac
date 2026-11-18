'use strict';
/* Scènes de démonstration des indicateurs de points (flèches, cadres, étiquettes),
   chargées par tools/apercu_indicateurs.py dans une copie de index.html : la scène est
   choisie par l'ancre de l'URL (index.html#a-faux), la langue par ?lang=en (français par défaut).
   Positions dans la numérotation de Blanc pour les deux camps : w = dames de Blanc,
   k = dames de Vert ; les dames qui manquent pour faire 15 (moins les sorties, off)
   vont sur le talon du camp. me : joueur qui a jeté (0 Blanc, 1 Vert), d : dés.
   Facultatif : opts (jans optionnels), off ([Blanc, Vert] dames sorties), lances (dés
   des premiers jets de la relevée du joueur), pj (premiers jets de la partie), ecole (scène d'école :
   mode, phase, points, trous, pick = jeton ou fichet sélectionné, trails = fantômes, prefix = coup joué). */
const SCENES = {
  /* dames battues */
  'battre-simple': { t: 'Dame battue par un dé (Blanc, 3-4)', me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 } },
  'tout-d-une-vide': { t: "Battue tout d'une, case de repos vide (Blanc, 5-3)", me: 0, d: [5, 3], w: { 4: 1 }, k: { 12: 1 } },
  'tout-d-une-propre': { t: "Tout d'une, repos sur ses dames + par un dé (Blanc, 3-4)", me: 0, d: [3, 4], w: { 3: 1, 6: 2 }, k: { 10: 1 } },
  'petit-jan': { t: "Tout d'une dans le petit jan adverse (Blanc, 4-2)", me: 0, d: [4, 2], w: { 15: 1 }, k: { 21: 1 } },
  'a-faux': { t: 'Battue à faux : deux repos tenus par Vert (Blanc, 3-4)', me: 0, d: [3, 4], w: { 14: 1 }, k: { 21: 1, 17: 2, 18: 2 } },
  'a-faux-doublet': { t: 'À faux par doublet (Blanc, 3-3)', me: 0, d: [3, 3], w: { 10: 1 }, k: { 16: 1, 13: 2 } },
  'vert-tout-d-une': { t: "Vert bat tout d'une (Vert, 5-3)", me: 1, d: [5, 3], w: { 13: 1 }, k: { 21: 1 } },
  'vert-a-faux': { t: 'Vert bat à faux : Blanc marque (Vert, 4-2)', me: 1, d: [4, 2], w: { 5: 1, 9: 2, 7: 2 }, k: { 11: 1 } },
  'coin-battu': { t: 'Coin battu (Blanc, 6-5)', me: 0, d: [6, 5], w: { 12: 2, 7: 1, 8: 1 }, k: {} },
  /* jans de début de relevée */
  'deux-tables': { t: 'Jan de deux tables (Blanc, 6-4)', me: 0, d: [6, 4], w: { 1: 13, 6: 1, 9: 1 }, k: {} },
  'contre-deux-tables': { t: 'Contre-jan de deux tables : coin adverse pris (Blanc, 6-4)', me: 0, d: [6, 4], w: { 1: 13, 6: 1, 9: 1 }, k: { 13: 2 } },
  'mezeas': { t: 'Jan de mézéas (Blanc, 4-1)', me: 0, d: [4, 1], w: { 1: 13, 12: 2 }, k: {} },
  'contre-mezeas': { t: 'Contre-jan de mézéas : coin adverse pris (Blanc, 4-1)', me: 0, d: [4, 1], w: { 1: 13, 12: 2 }, k: { 13: 2 } },
  'six-tables': { t: 'Jan de six tables : 1-2, 3-4 puis 5-6 (Blanc)', me: 0, d: [5, 6], w: { 1: 11, 3: 1, 4: 1, 5: 1, 8: 1 }, k: {}, lances: [1, 2, 3, 4] },
  /* pleins */
  'plein-petit-jan': { t: 'Plein du petit jan, deux manières (Blanc, 5-2)', me: 0, d: [5, 2], w: { 1: 5, 2: 2, 3: 2, 4: 3, 5: 2, 6: 1 }, k: {} },
  'plein-grand-jan': { t: 'Plein du grand jan (Blanc, 3-1)', me: 0, d: [3, 1], w: { 1: 3, 7: 3, 8: 2, 9: 2, 10: 1, 11: 2, 12: 2 }, k: {} },
  'plein-conserve': { t: 'Plein du grand jan conservé (Blanc, 2-1)', me: 0, d: [2, 1], w: { 1: 3, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2 }, k: {} },
  'plein-retour': { t: 'Plein du jan de retour (Blanc, 3-2)', me: 0, d: [3, 2], w: { 12: 2, 17: 1, 19: 2, 20: 2, 21: 2, 22: 1, 23: 2, 24: 2 }, k: { 2: 5, 3: 3 }, off: [0, 7] },
  /* fin de relevée, jan qui ne peut */
  'sortie': { t: 'Sortie de la dernière dame (Blanc, 3-2)', me: 0, d: [3, 2], w: { 23: 1 }, k: { 2: 15 }, off: [14, 0] },
  'jan-qui-ne-peut': { t: 'Jan qui ne peut : passages fermés (Blanc, 6-5)', me: 0, d: [6, 5], w: {}, k: { 6: 2, 7: 2 } },
  'sonnez-ne-peut': { t: 'Sonnez : nom du doublet sous les dés, jan qui ne peut (Blanc, 6-6)', me: 0, d: [6, 6], w: {}, k: { 7: 2 } },
  /* jans optionnels */
  'rencontre': { t: 'Jan de rencontre : même jet que Blanc (Vert, 4-3)', me: 1, d: [4, 3], w: {}, k: {}, opts: { rencontre: true }, pj: [{ by: 0, dice: [3, 4] }] },
  'pile-de-misere': { t: 'Pile de misère faite (Blanc, 3-2)', me: 0, d: [3, 2], w: { 12: 13, 10: 1, 9: 1 }, k: {}, opts: { pile: true } },
  'pile-conservee': { t: 'Pile de misère conservée faute de jouer (Blanc, 6-5)', me: 0, d: [6, 5], w: { 12: 15 }, k: { 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2 }, opts: { pile: true } },
  'margot': { t: "Margot la fendue, par un dé et tout d'une (Blanc, 4-2)", me: 0, d: [4, 2], w: { 12: 1, 14: 1, 10: 1 }, k: { 15: 1, 17: 1 }, opts: { margot: true } },
  /* écoles : marque à la main, fantômes des déplacements de l'ordinateur, boutons */
  'lancer': { t: 'Bouton Lancer les dés, au liseré vert (Blanc)', me: 0, d: [6, 3], w: { 1: 13, 6: 1, 8: 1 }, k: { 7: 2 },
    ecole: { mode: 'off', phase: 'roll' } },
  'fantomes-ordinateur': { t: "Fantômes du coup de Vert (5-3), marque de Blanc à faire", me: 1, d: [5, 3], w: { 1: 12, 4: 1, 7: 2 }, k: { 9: 1, 11: 2, 5: 1 },
    ecole: { mode: 'tous', phase: 'aimark', points: [2, 8], trous: [1, 3],
      trails: [{ kind: 'dame', c: 1, from: 14, to: 9 }, { kind: 'dame', c: 1, from: 14, to: 11 }, { kind: 'dame', c: 1, from: 8, to: 5 },
        { kind: 'jeton', c: 1, from: 4, to: 8 }, { kind: 'fichet', c: 1, from: 2, to: 3 }, { kind: 'jeton', c: 0, from: 6, to: 2 }] } },
  'fantomes-joueur': { t: "Fantômes du coup de Blanc (6-3) : trou, tenir, puis marque de Vert", me: 0, d: [6, 3], w: { 1: 12, 4: 1, 7: 1, 9: 1 }, k: { 10: 1, 12: 1 },
    ecole: { mode: 'tous', phase: 'after', points: [4, 2], trous: [2, 1],
      trails: [{ kind: 'dame', c: 0, from: 1, to: 4 }, { kind: 'dame', c: 0, from: 1, to: 7 },
        { kind: 'fichet', c: 0, from: 1, to: 2 }, { kind: 'jeton', c: 0, from: 0, to: 4 },
        { kind: 'jeton', c: 1, from: 6, to: 0 }, { kind: 'jeton', c: 1, from: 0, to: 2 }] } },
  'marque-jeton': { t: 'Marque de Blanc : jeton sélectionné, toutes ses dames au liseré', me: 0, d: [4, 2], w: { 1: 10, 3: 2, 5: 1, 9: 2 }, k: { 10: 1, 12: 1 },
    ecole: { mode: 'joueur', phase: 'mark', points: [4, 2], trous: [2, 1], pick: { kind: 'jeton', c: 0 } } },
  'marque-fichet': { t: 'Marque de Blanc : fichet sélectionné', me: 0, d: [4, 2], w: { 1: 10, 3: 2, 5: 1, 9: 2 }, k: { 10: 1, 12: 1 },
    ecole: { mode: 'joueur', phase: 'mark', points: [10, 2], trous: [2, 1], pick: { kind: 'fichet', c: 0 } } },
  'boutons-apres-coup': { t: 'Coup joué : Annuler, École, Fin de tour, Points réels', me: 0, d: [4, 2], w: { 1: 10, 3: 2, 5: 1, 9: 2 }, k: { 10: 1, 12: 1 },
    ecole: { mode: 'tous', phase: 'after', points: [6, 2], trous: [2, 1], prefix: true } },
  'declaration-ecole': { t: "Déclaration d'école : jeton de Vert sélectionné", me: 1, d: [5, 3], w: { 1: 12, 4: 1, 7: 2 }, k: { 9: 1, 11: 2, 5: 1 },
    ecole: { mode: 'tous', phase: 'ecole', points: [2, 8], trous: [1, 3], pick: { kind: 'jeton', c: 1 } } },
  'fausse-ecole': { t: "Fausse école : bulle à fermer par OK, indicateurs du jet (Vert, 5-3)", me: 1, d: [5, 3], w: { 13: 1 }, k: { 21: 1 },
    ecole: { mode: 'tous', phase: 'aimark', points: [4, 6], trous: [1, 3], prefix: true, fausse: 2 } },
};
/* Scène d'école : état de la marque, phase, sélection et fantômes donnés par la scène. */
function showEcoleScene(S, s) {
  const E = S.ecole;
  G.ecole = G.ecolePref = E.mode;
  if (E.points) s.points = E.points.slice();
  if (E.trous) s.trous = E.trous.slice();
  G.turn = E.phase === 'aimark' || (E.phase === 'ecole' && S.me === 1) ? 1 : S.me;
  G.moves = genMoves(s, S.me, S.d[0], S.d[1]);
  G.turnStart = cloneState(s);
  G.prefix = E.prefix ? G.moves[0].steps.slice() : [];
  G.hints = null; G.hintsOn = false;
  G.trails = E.trails || [];
  G.mark = E.phase === 'mark' || E.phase === 'aimark' ? { c: 0, kind: E.phase === 'mark' ? 'roll' : 'opp', S0: marqueSnap(s), T: 0, dt: 0, fichetDone: false } : null;
  G.decl = E.phase === 'ecole' ? { S: marqueSnap(s), dt: 0, fichetDone: false, aiTrousMin: s.trous[1], back: 'aimark' } : null;
  G.pick = E.pick || null;
  G.phase = E.phase;
  if (E.phase === 'roll') G.dice = null;   // avant le jet, le bouton remplace les dés
  if (E.fausse) {   // dames jouées, puis la bulle de fausse école sur la position du jet
    for (const st of G.prefix) applyStep(S.me, st);
    G.hints = buildHints(S.me, rollEvents(G.turnStart, S.me, S.d[0], S.d[1], G.moves));
    G.mark = null;
    showFausse(t('toastFausse', E.fausse), () => {});
  }
}
function showScene(name) {
  setLang(new URLSearchParams(location.search).get('lang') || 'fr', false);   // ?lang=en : étiquettes en anglais
  const S = SCENES[name], s = newState(S.opts || {});
  G.opts = s.opts; G.st = s;
  const w = s.b[0], k = s.b[1];
  w.fill(0); k.fill(0);
  s.off = (S.off || [0, 0]).slice();
  for (const p in S.w) w[p] = S.w[p];
  for (const p in S.k) k[25 - p] = S.k[p];
  w[1] += 15 - s.off[0] - w.reduce((a, b) => a + b, 0);
  k[1] += 15 - s.off[1] - k.reduce((a, b) => a + b, 0);
  if (S.lances) s.lances[S.me] = S.lances.slice();
  if (S.pj) s.premiersJets = S.pj.slice();
  const [d1, d2] = S.d;
  G.dice = [d1, d2];
  if (S.ecole) showEcoleScene(S, s);
  else {
    G.hints = buildHints(S.me, rollEvents(s, S.me, d1, d2, genMoves(s, S.me, d1, d2)));
    G.hintsOn = true; G.phase = 'wait'; G.turn = S.me;
  }
  document.querySelectorAll('.welcome,.modal').forEach(e => e.classList.add('hidden'));
  renderAll();
  const c = document.createElement('div');
  c.textContent = S.t;
  c.style.cssText = 'position:fixed;left:20px;top:14px;font:bold 21px Georgia,serif;color:#f1e8d2;z-index:99';
  document.body.appendChild(c);
}
setTimeout(() => showScene(location.hash.slice(1)), 1500);
