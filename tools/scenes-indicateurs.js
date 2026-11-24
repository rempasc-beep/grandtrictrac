'use strict';
/* Scènes de démonstration des indicateurs de points (flèches, cadres, étiquettes),
   chargées par tools/apercu_indicateurs.py dans une copie de index.html : la scène est
   choisie par l'ancre de l'URL (index.html#a-faux), la langue par ?lang=en (français par défaut).
   Positions dans la numérotation de Blanc pour les deux camps : w = dames de Blanc,
   k = dames de Vert ; les dames qui manquent pour faire 15 (moins les sorties, off)
   vont sur le talon du camp. me : joueur qui a jeté (0 Blanc, 1 Vert), d : dés.
   Facultatif : opts (jans optionnels), off ([Blanc, Vert] dames sorties), lances (dés
   des premiers jets de la relevée du joueur), pj (premiers jets de la partie), ecole (scène d'école :
   mode, phase, points, trous, pick = jeton ou fichet sélectionné, sel = dame sélectionnée, trails = fantômes, prefix = coup joué,
   bulle = [message, points] de la bulle d'école à fermer par OK), swap (le joueur, en bas,
   a choisi les dames vertes : couleurs des deux camps échangées), trous ([Blanc, Vert] trous marqués)
   premier (joueur qui a marqué le premier trou : place du pavillon), ecrire (marqué d'une partie à écrire :
   trous sans limite), points ([Blanc, Vert] points des jetons) et affilee ([Blanc, Vert] trous faits d'affilée, pour le pavillon de la partie à écrire). */
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
  'doublet-jetons': { t: 'Nom du doublet entre les dés et le jeton de Blanc à 8 points (Blanc, 2-2)', me: 0, d: [2, 2], w: { 1: 13, 6: 2 }, k: {},
    points: [8, 8] },
  /* jans optionnels */
  'rencontre': { t: 'Jan de rencontre : même jet que Blanc (Vert, 4-3)', me: 1, d: [4, 3], w: {}, k: {}, opts: { rencontre: true }, pj: [{ by: 0, dice: [3, 4] }] },
  'pile-de-misere': { t: 'Pile de misère faite (Blanc, 3-2)', me: 0, d: [3, 2], w: { 12: 13, 10: 1, 9: 1 }, k: {}, opts: { pile: true } },
  'pile-conservee': { t: 'Pile de misère conservée faute de jouer (Blanc, 6-5)', me: 0, d: [6, 5], w: { 12: 15 }, k: { 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2 }, opts: { pile: true } },
  'margot': { t: "Margot la fendue, par un dé et tout d'une (Blanc, 4-2)", me: 0, d: [4, 2], w: { 12: 1, 14: 1, 10: 1 }, k: { 15: 1, 17: 1 }, opts: { margot: true } },
  /* écoles : marque à la main, fantômes des déplacements de l'ordinateur, boutons */
  'lancer': { t: 'Bouton Lancer les dés, au liseré bleu (Blanc)', me: 0, d: [6, 3], w: { 1: 13, 6: 1, 8: 1 }, k: { 7: 2 },
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
  'fichet-depart': { t: "Fichets au départ, sur la bande de gauche ; fantôme du premier trou de Vert", me: 1, d: [5, 3], w: { 1: 12, 4: 1, 7: 2 }, k: { 9: 1, 11: 2, 5: 1 },
    ecole: { mode: 'tous', phase: 'aimark', points: [0, 0], trous: [0, 1],
      trails: [{ kind: 'fichet', c: 1, from: 0, to: 1 }, { kind: 'jeton', c: 1, from: 10, to: 0 }] } },
  'fichet-depart-pick': { t: 'Marque de Blanc : fichet sélectionné au trou de départ', me: 0, d: [6, 6], w: { 1: 10, 3: 2, 5: 1, 9: 2 }, k: { 10: 1, 12: 1 },
    ecole: { mode: 'joueur', phase: 'mark', points: [10, 2], trous: [0, 0], pick: { kind: 'fichet', c: 0 } } },
  'boutons-apres-coup': { t: 'Coup joué : Annuler, École, Fin de tour, Points réels', me: 0, d: [4, 2], w: { 1: 10, 3: 2, 5: 1, 9: 2 }, k: { 10: 1, 12: 1 },
    ecole: { mode: 'tous', phase: 'after', points: [6, 2], trous: [2, 1], prefix: true } },
  'declaration-ecole': { t: "Déclaration d'école : jeton de Vert sélectionné", me: 1, d: [5, 3], w: { 1: 12, 4: 1, 7: 2 }, k: { 9: 1, 11: 2, 5: 1 },
    ecole: { mode: 'tous', phase: 'ecole', points: [2, 8], trous: [1, 3], pick: { kind: 'jeton', c: 1 } } },
  'fausse-ecole': { t: "Fausse école : bulle à fermer par OK, indicateurs du jet (Vert, 5-3)", me: 1, d: [5, 3], w: { 13: 1 }, k: { 21: 1 },
    ecole: { mode: 'tous', phase: 'aimark', points: [4, 6], trous: [1, 3], prefix: true, bulle: ['toastFausse', 2] } },
  'ecole-ordinateur': { t: "École de l'ordinateur : points oubliés, bulle à fermer par OK (Blanc, 3-4)", me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 },
    ecole: { mode: 'joueur', phase: 'mark', points: [2, 8], trous: [1, 3], bulle: ['toastEcoleMoins', 4] } },
  /* pavillon */
  'pavillon-milieu': { t: 'Pavillon au milieu : Vert peut encore gagner en grande bredouille', me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 },
    trous: [0, 4], premier: 1 },
  'pavillon-blanc': { t: 'Pavillon pris par Blanc, second à marquer un trou', me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 },
    trous: [1, 5], premier: 1 },
  'pavillon-vert': { t: "Joueur en vert, en bas : pavillon pris par l'ordinateur (en blanc)", me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 },
    trous: [6, 2], premier: 0, swap: true },
  /* partie à écrire : fichet au-delà du douzième trou, pavillon des trous d'affilée */
  'ecrire-affilee': { t: "Partie à écrire : Blanc a ses 7 trous d'affilée depuis ceux de Vert (pavillon)", me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 },
    trous: [7, 3], premier: 1, ecrire: true, affilee: [true, false] },
  'ecrire-hors-jeu': { t: 'Partie à écrire : Vert à 14 trous (2e trou), pavillon hors jeu', me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 },
    trous: [3, 14], premier: 0, ecrire: true, affilee: [false, false] },
  'ecrire-trois-tours': { t: 'Partie à écrire : Blanc à 27 trous (3e tour, jauge plus foncée), Vert à 5', me: 0, d: [3, 4], w: { 7: 1, 6: 1 }, k: { 10: 1 },
    trous: [27, 5], premier: 0, ecrire: true, affilee: [false, false] },
  'ecrire-fichet': { t: 'Partie à écrire, écoles : fichet de Blanc sélectionné, cibles au-delà de 12', me: 0, d: [3, 4], w: { 1: 10, 3: 2, 5: 1, 9: 2 }, k: { 10: 1, 12: 1 },
    premier: 1, ecrire: true, affilee: [false, false],
    ecole: { mode: 'joueur', phase: 'mark', points: [8, 0], trous: [11, 4], pick: { kind: 'fichet', c: 0 } } },
  'destinations': { t: 'Dame de Blanc sélectionnée : ronds bleus des destinations (flèche de 3 et de 4 dames : sur la 3e)', me: 0, d: [3, 4],
    w: { 2: 2, 5: 3, 6: 4, 9: 1 }, k: { 13: 2 }, ecole: { mode: 'joueur', phase: 'move', points: [0, 0], trous: [0, 0], sel: 2 } },
  /* couleur des flèches sous trois dames */
  'jan-trois-dames': { t: 'Jans remplis de trois dames par flèche : couleur des flèches (Blanc, 6-5)', me: 0, d: [6, 5],
    w: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }, k: { 6: 3, 13: 3, 14: 3, 15: 3, 16: 3 } },
  /* le joueur a choisi Vert : il joue toujours en bas, les couleurs sont échangées */
  'joueur-vert-a-faux': { t: "Joueur en vert, en bas : l'ordinateur bat à faux (4-2)", me: 1, d: [4, 2], w: { 5: 1, 9: 2, 7: 2 }, k: { 11: 1 }, swap: true },
  'joueur-vert-fantomes': { t: "Joueur en vert : fantômes du coup de l'ordinateur (5-3)", me: 1, d: [5, 3], w: { 1: 12, 4: 1, 7: 2 }, k: { 9: 1, 11: 2, 5: 1 }, swap: true,
    ecole: { mode: 'tous', phase: 'aimark', points: [2, 8], trous: [1, 3],
      trails: [{ kind: 'dame', c: 1, from: 14, to: 9 }, { kind: 'dame', c: 1, from: 14, to: 11 }, { kind: 'dame', c: 1, from: 8, to: 5 },
        { kind: 'jeton', c: 1, from: 4, to: 8 }, { kind: 'fichet', c: 1, from: 2, to: 3 }, { kind: 'jeton', c: 0, from: 6, to: 2 }] } },
  'joueur-vert-fichet': { t: 'Joueur en vert : son fichet, en bas, sélectionné', me: 0, d: [4, 2], w: { 1: 10, 3: 2, 5: 1, 9: 2 }, k: { 10: 1, 12: 1 }, swap: true,
    ecole: { mode: 'joueur', phase: 'mark', points: [10, 2], trous: [3, 5], pick: { kind: 'fichet', c: 0 } } },
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
  G.selected = E.sel !== undefined ? E.sel : null; G.touched = false;
  G.phase = E.phase;
  if (E.phase === 'roll') G.dice = null;   // avant le jet, le bouton remplace les dés
  if (E.bulle) {   // dames jouées, puis la bulle d'école sur la position du jet
    for (const st of G.prefix) applyStep(S.me, st);
    G.hints = buildHints(S.me, rollEvents(G.turnStart, S.me, S.d[0], S.d[1], G.moves));
    G.mark = null;
    showBulleEcole(t(E.bulle[0], E.bulle[1]), () => {});
  }
}
function showScene(name) {
  setLang(new URLSearchParams(location.search).get('lang') || 'fr', false);   // ?lang=en : étiquettes en anglais
  const S = SCENES[name], s = newState(S.opts || {});
  G.opts = s.opts; G.st = s;
  G.swap = !!S.swap;
  const w = s.b[0], k = s.b[1];
  w.fill(0); k.fill(0);
  s.off = (S.off || [0, 0]).slice();
  for (const p in S.w) w[p] = S.w[p];
  for (const p in S.k) k[25 - p] = S.k[p];
  w[1] += 15 - s.off[0] - w.reduce((a, b) => a + b, 0);
  k[1] += 15 - s.off[1] - k.reduce((a, b) => a + b, 0);
  if (S.lances) s.lances[S.me] = S.lances.slice();
  if (S.pj) s.premiersJets = S.pj.slice();
  if (S.trous) s.trous = S.trous.slice();
  if (S.points) s.points = S.points.slice();
  if (S.premier !== undefined) s.premierTrou = S.premier;
  if (S.ecrire) { G.partie = Object.assign({}, G.partie, { mode: 'ecrire' }); s.ecrire = true; s.affilee = S.affilee.slice(); }
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
