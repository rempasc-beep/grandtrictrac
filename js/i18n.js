'use strict';
/* ============================================================
   Langues de l'interface : français et anglais.
   Les termes propres au trictrac (dame, flèche, tablier, talon, coin, jan, plein,
   trou, bredouille, relevée, tout d'une, à faux, tenir, s'en aller…) restent en français.
   Textes courts : dictionnaire I18N, lu par t(clé, …arguments) et appliqué aux éléments
   marqués data-i18n (texte), data-i18n-title et data-i18n-aria (attributs).
   Textes longs (aide, règles, jans optionnels) : écrits dans les deux langues dans
   index.html (attribut data-lang), la feuille de style masque l'autre langue.
   ============================================================ */
const LANGS = ['fr', 'en'];
const LANG_KEY = 'trictrac.lang';
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

const I18N = {
  fr: {
    pageTitle: "Grand Trictrac – jouer au trictrac en ligne contre l'ordinateur",
    players: ['Blanc', 'Vert'],
    boardLabel: 'Tablier de trictrac',
    restartTitle: "Recommencer : retour à l'écran d'accueil", restartLabel: 'Recommencer',
    fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran',
    helpTitle: 'Aide, règles et options', helpLabel: 'Aide',
    langLabel: 'Langue',
    installTitle: 'Installer le Grand Trictrac', install: 'Installer', installLater: 'Plus tard', installOk: 'Compris',
    installText: "Ajoutez le jeu à votre écran d'accueil : il s'ouvre dans sa propre fenêtre et se joue même hors connexion.",
    welcomeSub: "Vous jouez contre l'ordinateur, en 12 trous.",
    colorAsk: 'Votre couleur', colorBlanc: 'Blanc', colorVert: 'Vert',
    welcomeAsk: 'Difficulté', start: 'Démarrer la partie',
    lvlEasy: 'Facile', lvlEasyDesc: "Il joue d'instinct, avec une part de hasard.",
    lvlNormal: 'Normal', lvlNormalDesc: 'Il pèse les risques de chaque coup.',
    lvlStrong: 'Fort', lvlStrongDesc: 'Il anticipe vos meilleures ripostes.',
    /* sous chaque niveau, avec les écoles du joueur et de l'ordinateur */
    lvlEasyEcole: 'Il se trompe souvent dans sa marque.',
    lvlNormalEcole: 'Il se trompe parfois dans sa marque.',
    lvlStrongEcole: 'Il se trompe rarement dans sa marque.',
    rulesHelp: 'Règles et aide', optRules: 'Règles optionnelles', resume: 'Reprendre la partie en cours',
    optUndo: 'Annulation', optJans: 'Jans optionnels',
    undoTouchee: 'Dame cliquée, dame jouée', undoDeplacee: 'Dame déplacée, dame jouée', undoLibre: 'Annulation autorisée',
    undoDesc: {
      touchee: "La dame sélectionnée doit être jouée, et chaque dame posée l'est définitivement.",
      deplacee: "On peut changer de dame tant qu'on ne l'a pas posée ; une dame posée l'est définitivement.",
      libre: "Le coup peut être défait tant qu'il n'est pas validé par OK.",
    },
    close: 'Fermer', help: 'Aide',
    aller: "S'en aller", tenir: 'Tenir',
    /* trous marqués (fenêtre « tenir ou s'en aller », ou petit texte en haut du tablier) ;
       enfilade : trois trous ou plus d'un joueur sans que l'autre en marque, k : marques depuis */
    trousMarques: (vous, n) => vous ? `Vous marquez ${plural(n, 'trou')}.` : `L'ordinateur marque ${plural(n, 'trou')}.`,
    enfilade: k => ["C'est l'enfilade !", "L'enfilade continue !", "L'enfilade persiste !", "L'enfilade est totale !"][Math.min(k, 4) - 1],
    seeBoard: 'Voir le tablier', newGame: 'Nouvelle partie',
    victory: 'Victoire !', defeat: 'Défaite…',
    youWin: score => 'Vous gagnez ' + score, aiWins: score => "L'ordinateur gagne " + score,
    score: (w, l, grande) => `${w} trous à ${l}${grande ? ' en grande bredouille (partie double)' : ''}.`,
    /* tablier */
    tray: 'Sorties',
    fichetTitle: (name, n) => `${name} : ${plural(n, 'trou')}`,
    jetonTitle: (name, n) => `${name} : ${plural(n, 'point')}`,
    bredouilleJeton: 'Jeton de bredouille',
    pavillonMilieu: "Pavillon : personne n'a encore de trou",
    pavillonAttente: name => `Pavillon : ${name} peut encore gagner en grande bredouille`,
    pavillonPris: name => `Pavillon pris par ${name} : plus de grande bredouille`,
    roll: 'Lancer les dés', rollTitle: 'Lancer les dés (Espace)', space: 'espace',
    okTitle: 'Continuer (Espace)', undo: 'Annuler', undoTitle: 'Annuler le coup',
    /* étiquettes de points */
    faux: 'À faux', coin: 'Coin battu', deuxTables: 'Jan de deux tables', contreDeuxTables: 'Contre-jan de deux tables',
    mezeas: 'Jan de mézéas', contreMezeas: 'Contre-jan de mézéas', six: 'Jan de six tables',
    plein: n => 'Plein' + (n > 1 ? ` ${n} manières` : ''), pleinConserve: 'Plein conservé', sortie: 'Sortie',
    rencontre: 'Jan de rencontre', pile: 'Pile de misère', pileConserve: 'Pile conservée', margot: 'Margot',
    nePeut: 'Jan qui ne peut',
    /* nom du doublet, sous les dés */
    doublet: n => ['Bezas', 'Double deux', 'Ternes', 'Carmes', 'Quines', 'Sonnez'][n - 1] + ' !',
    /* écoles */
    optEcole: 'Écoles', ecoleOff: "Pas d'école", ecoleJoueur: 'Écoles du joueur', ecoleTous: "Écoles du joueur et de l'ordinateur",
    ecoleDesc: {
      off: 'La marque est automatique.',
      joueur: "Vous marquez vous-même vos points ; l'ordinateur relève toutes vos erreurs et ne se trompe jamais.",
      tous: "Vous marquez vous-même vos points ; l'ordinateur peut aussi se tromper (bouton École), ou laisser passer une de vos erreurs.",
    },
    finirTour: 'Fin de tour', finirTourTitle: 'Finir son tour (Espace)',
    voirPoints: 'Points réels', voirPointsTitle: 'Voir les points réels du jet et les erreurs',
    ecoleBtn: 'École', ecoleBtnTitle: "Mettre l'ordinateur à l'école", validerEcole: "Valider l'école",
    dameNonJouable: 'Dame non jouable',
    aiSenVa: "L'ordinateur s'en va.",
    /* pause des écoles, avant que le jeu n'avance sans le joueur */
    pauseAiSenVa: n => (n > 0 ? `L'ordinateur marque ${plural(n, 'trou')} et s'en va` : "L'ordinateur s'en va") +
      " : nouvelle relevée. Avant de continuer, vous pouvez voir les points réels du jet, ou le mettre à l'école s'il s'est trompé dans sa marque.",
    pauseSenVa: () => "Vous vous en allez : nouvelle relevée. Avant de continuer, vous pouvez voir les points réels du jet.",
    pauseFin: won => (won ? 'Vous gagnez la partie.' : "L'ordinateur gagne la partie.") +
      ' Avant le résultat, vous pouvez voir les points réels du jet.',
    partieReprise: "Partie reprise là où vous l'aviez laissée.",
    reglagesSuivante: 'Vos nouveaux réglages s\'appliqueront à la prochaine partie.',
    /* tutoriel (js/tuto.js) */
    tutoOpt: 'Tutoriel : explications au fil de la partie', tutoReset: 'Réinitialiser le tutoriel', tutoResetFait: 'Tutoriel réinitialisé : toutes les explications reviendront',
    tutoResetTitre: 'Réinitialiser le tutoriel ?', tutoResetOui: 'Réinitialiser', tutoResetNon: 'Annuler',
    tutoResetTexte: n => (n > 1 ? `Les ${n} explications que vous avez marquées « J'ai compris » reviendront`
      : "L'explication que vous avez marquée « J'ai compris » reviendra") +
      ` chaque fois que la situation se présentera, comme au premier jour. ` +
      `Le tutoriel sera aussi réactivé s'il était décoché. Vos réglages et la partie en cours ne changent pas.`,
    tutoKicker: 'Tutoriel', tutoCompris: "J'ai compris", tutoPlusTard: 'Revoir plus tard', tutoAide: 'En savoir plus',
    tutoConseil: "Si les situations courantes (battre une dame, remplir un jan, le jan qui ne peut…) ne vous sont pas " +
      "encore familières, faites d'abord une partie sans écoles.",
    bredouilleCorrigee: n => `Erreur de bredouille, sans école : le fichet est remis à ${plural(n, 'trou')}.`,
    toastEcoleTrop: n => `École ! Vous avez marqué trop : l'ordinateur retire le surplus et marque ${plural(n, 'point')}.`,
    toastEcoleMoins: n => `École ! Points oubliés : l'ordinateur les marque (${plural(n, 'point')}).`,
    toastAllerAnnule: n => `École ! Vous n'aviez pas gagné de trou : vous ne pouvez pas vous en aller. L'ordinateur marque ${plural(n, 'point')}.`,
    toastAiRecule: n => `Le jeton de l'ordinateur recule de ${plural(n, 'point')}.`,
    toastFausse: n => `Fausse école ! L'ordinateur marque ${plural(n, 'point')}.`,
    toastEcoleGain: n => `École : vous marquez ${plural(n, 'point')}.`,
    toastPasErreur: "L'ordinateur n'avait pas fait d'erreur : sa marque est remise en place.",
    toastEcoleRien: 'École : vous ne vous êtes marqué aucun point.',
    recapTitle: 'Points réels',
    recapReels: (h, a) => `Points du jet : vous ${h}, l'ordinateur ${a}.`,
    recapVous: (c, r, seen) => `Vous avez marqué ${plural(c, 'point')} au lieu de ${r} : ` +
      (seen ? `école de ${Math.abs(c - r)} pour l'ordinateur.` : "l'ordinateur ne l'a pas vu."),
    recapBredouille: 'Erreur de bredouille sur les trous, corrigée sans école.',
    recapOrdi: (m, r, caught) => `L'ordinateur a marqué ${plural(m, 'point')} au lieu de ${r} : ` +
      (caught ? "vous l'avez mis à l'école." : "vous ne l'avez pas relevé."),
    recapEcole: (e, v, f) => `Vous avez déclaré une école de ${plural(e, 'point')}, l'école réelle était de ${v} : ` +
      (f > 0 ? `fausse école, ${plural(f, 'point')} pour l'ordinateur.`
        : e > v ? "fausse école que l'ordinateur n'a pas vue." : e < v ? `vous pouviez en marquer ${v}.` : 'école juste.'),
    recapAucune: 'Aucune erreur.',
    /* partie à écrire */
    modeAsk: 'Partie', modeDouze: 'En douze trous', modeEcrire: 'À écrire', marquesAsk: 'Marqués',
    welcomeSubEcrire: n => `Vous jouez contre l'ordinateur, une partie à écrire en ${n} marqués.`,
    /* journal de la partie (js/journal.js) */
    journalTitle: 'Journal de la partie', journalBtnTitle: 'Journal de la partie : dés, coups, points et erreurs de chaque tour',
    journalVide: "Aucun tour terminé pour l'instant : chaque tour s'inscrit ici une fois joué.",
    journalSub: n => `${plural(n, 'tour')} joué${n > 1 ? 's' : ''} · l'œil montre le tablier du tour`,
    journalTour: n => `Tour ${n}`, journalReleve: n => `Relevée ${n}`,
    journalMarqueN: (k, rf) => `Marqué n° ${k}` + (rf ? ` (après ${plural(rf, 'refait')})` : ''),
    journalVoir: 'Voir le tablier de ce tour', journalRetour: '← Journal', journalBoard: 'Tablier du tour',
    journalPrec: 'Tour précédent (←)', journalSuiv: 'Tour suivant (→)',
    vueJet: 'Jet et points', vueJetTitle: 'Position au moment du jet, avec les points du jet (dames battues, jans…)',
    vueCoup: 'Coup joué', vueCoupTitle: 'Position après le coup, avec les déplacements des dames, jetons et fichets',
    journalPoints: 'Points', journalPointsReels: 'Points réels', journalAucunPoint: 'aucun',
    journalCoup: 'Coup', journalAucunCoup: 'aucune dame jouable', journalCoupNonJoue: 'pas joué (nouvelle relevée)', journalSortie: 'sortie',
    journalMarque: 'Marque', journalMarqueJoueur: (nom, tr, pts) => `${nom} ${plural(tr, 'trou')}, ${plural(pts, 'point')}`,
    journalTrous: n => plural(n, 'trou'), journalBred: 'en bredouille',
    journalNouvelleReleve: 'Nouvelle relevée.', journalToutSorti: nom => `${nom} : toutes les dames sont sorties, nouvelle relevée.`,
    journalErreurs: 'Erreurs', jSep: ' : ',
    jBattre: 'Dame battue', jBattreTout: "Dame battue tout d'une", jFaux: 'Dame battue à faux',
    janNoms: { petit: 'petit jan', grand: 'grand jan', retour: 'jan de retour' },
    ficheTitle: 'Feuille de score', ficheBtnTitle: 'Feuille de score de la partie à écrire',
    /* s'en aller termine le marqué : ce qu'il rapporte (calc : marqueCalcul) */
    issueGagne: calc => `S'en aller : vous gagnez le marqué, ${calc}.`,
    issuePerdu: calc => `S'en aller : l'ordinateur gagne le marqué, ${calc}.`,
    issueRefait: cons => `S'en aller : trous égaux, refait ; le marqué est rejoué avec ${cons} points de consolation.`,
    marqueGagne: n => `Marqué n° ${n} gagné !`, marquePerdu: n => `Marqué n° ${n} perdu`, marqueRefait: 'Refait',
    marqueAllerVous: 'Vous vous en allez.', marqueAllerOrdi: "L'ordinateur s'en va.",
    marqueTrous: (h, a) => `Trous : vous ${h}, l'ordinateur ${a}.`,
    marqueCalcul: (tw, cons, mult, b, tl, pts) => (mult > 1 ? '(' : '') + `${tw} trous + ${cons} de consolation` +
      (mult > 1 ? `) × ${mult} (${['', 'petite', 'grande'][b]} bredouille)` : '') + ` − ${tl} = ${plural(pts, 'point')}`,
    marqueRefaitTexte: cons => `Trous égaux : personne ne gagne ce marqué, il est rejoué. La consolation passe à ${cons} points ; qui avait la primauté la garde.`,
    marqueTotaux: (h, a, gh, ga) => `Points : vous ${h}, l'ordinateur ${a} · marqués gagnés : ${gh} à ${ga}.`,
    marqueReste: (k, n) => `${k} marqué${k > 1 ? 's' : ''} sur ${n}.`,
    marqueSuivant: 'Marqué suivant', resultatPartie: 'Résultat de la partie', voirFiche: 'Feuille de score',
    marqueDebut: (k, vous) => `Marqué n° ${k} : ${vous ? 'vous commencez' : "l'ordinateur commence"}.`,
    ficheEntete: n => `Partie à écrire en ${n} marqués`, ficheN: 'n°', ficheRefaits: 'Refaits', ficheTrous: 'Trous',
    vous: 'Vous', ordi: 'Ordinateur', ficheEnCours: 'en cours', ficheVide: "Aucun marqué terminé pour l'instant.",
    ficheTotal: 'Total (I)', ficheQueueJetons: 'Queue des jetons (II)', fichePaiement: 'Paiement des marqués',
    fichePaiementProv: "Paiement des marqués, si la partie s'arrêtait maintenant",
    ficheMarques: 'Marqués (III)', ficheQueueMarques: 'Queue des marqués (IV)', ficheResultat: 'Résultat final (I + II + III + IV)',
    ficheGainBrut: 'Gain brut', ficheGainArrondi: 'Gain arrondi',
    ficheBred: b => ['', 'petite bredouille', 'grande bredouille'][b],
    egalite: 'Égalité',
    ecrireGagne: (a, b, g) => `Vous gagnez la partie à écrire, ${a} points à ${b} : gain de ${plural(g, 'point')}.`,
    ecrirePerd: (a, b, g) => `L'ordinateur gagne la partie à écrire, ${a} points à ${b} : gain de ${plural(g, 'point')}.`,
    ecrireNul: (a, b) => `Partie à écrire nulle, ${a} points à ${b} : le gain arrondi est nul.`,
    detteVous: n => `Vous devez ${n} louis d'or à l'ordinateur.`,
    detteOrdi: n => `L'ordinateur vous doit ${n} louis d'or.`,
    detteNulle: "Personne ne doit rien : chacun garde ses louis d'or.",
    pavillonHorsJeu: "Pavillon hors jeu : aucun joueur n'a fait ses trous d'affilée",
    pavillonAffilee: name => `Pavillon : ${name} a fait tous ses trous d'affilée (marqué en bredouille)`,
  },
  en: {
    pageTitle: 'Grand Trictrac – play trictrac online against the computer',
    players: ['White', 'Green'],
    boardLabel: 'Trictrac tablier',
    restartTitle: 'Restart: back to the welcome screen', restartLabel: 'Restart',
    fullscreen: 'Full screen', exitFullscreen: 'Exit full screen',
    helpTitle: 'Help, rules and options', helpLabel: 'Help',
    langLabel: 'Language',
    installTitle: 'Install Grand Trictrac', install: 'Install', installLater: 'Later', installOk: 'Got it',
    installText: 'Add the game to your home screen: it opens in its own window and can be played offline.',
    welcomeSub: 'You play against the computer, in 12 trous.',
    colorAsk: 'Your colour', colorBlanc: 'White', colorVert: 'Green',
    welcomeAsk: 'Difficulty', start: 'Start the game',
    lvlEasy: 'Easy', lvlEasyDesc: 'It plays by instinct, with a touch of chance.',
    lvlNormal: 'Normal', lvlNormalDesc: 'It weighs the risks of every move.',
    lvlStrong: 'Strong', lvlStrongDesc: 'It anticipates your best replies.',
    lvlEasyEcole: 'It often gets its marking wrong.',
    lvlNormalEcole: 'It sometimes gets its marking wrong.',
    lvlStrongEcole: 'It seldom gets its marking wrong.',
    rulesHelp: 'Rules and help', optRules: 'Optional rules', resume: 'Resume the current game',
    optUndo: 'Undo', optJans: 'Optional jans',
    undoTouchee: 'Dame clicked, dame played', undoDeplacee: 'Dame moved, dame played', undoLibre: 'Undo allowed',
    undoDesc: {
      touchee: 'The selected dame must be played, and every dame put down stays there.',
      deplacee: 'You may switch dames until you put one down; a dame put down stays there.',
      libre: 'The move can be taken back until it is confirmed with OK.',
    },
    close: 'Close', help: 'Help',
    aller: "S'en aller", tenir: 'Tenir',
    trousMarques: (vous, n) => vous ? `You mark ${plural(n, 'trou')}.` : `The computer marks ${plural(n, 'trou')}.`,
    enfilade: k => ["It's the enfilade!", 'The enfilade goes on!', 'The enfilade persists!', 'The enfilade is total!'][Math.min(k, 4) - 1],
    seeBoard: 'View the tablier', newGame: 'New game',
    victory: 'Victory!', defeat: 'Defeat…',
    youWin: score => 'You win ' + score, aiWins: score => 'The computer wins ' + score,
    score: (w, l, grande) => `${w} trous to ${l}${grande ? ' en grande bredouille (double game)' : ''}.`,
    tray: 'Off',
    fichetTitle: (name, n) => `${name}: ${plural(n, 'trou')}`,
    jetonTitle: (name, n) => `${name}: ${plural(n, 'point')}`,
    bredouilleJeton: 'Jeton de bredouille',
    pavillonMilieu: 'Pavillon: nobody has a trou yet',
    pavillonAttente: name => `Pavillon: ${name} can still win en grande bredouille`,
    pavillonPris: name => `Pavillon taken by ${name}: no more grande bredouille`,
    roll: 'Roll the dice', rollTitle: 'Roll the dice (Space)', space: 'space',
    okTitle: 'Continue (Space)', undo: 'Undo', undoTitle: 'Undo the move',
    faux: 'À faux', coin: 'Coin battu', deuxTables: 'Jan de deux tables', contreDeuxTables: 'Contre-jan de deux tables',
    mezeas: 'Jan de mézéas', contreMezeas: 'Contre-jan de mézéas', six: 'Jan de six tables',
    plein: n => 'Plein' + (n > 1 ? `, ${n} ways` : ''), pleinConserve: 'Plein kept', sortie: 'Sortie',
    rencontre: 'Jan de rencontre', pile: 'Pile de misère', pileConserve: 'Pile kept', margot: 'Margot',
    nePeut: 'Jan qui ne peut',
    doublet: n => ['Bezas', 'Double deux', 'Ternes', 'Carmes', 'Quines', 'Sonnez'][n - 1] + '!',
    optEcole: 'Écoles', ecoleOff: 'No école', ecoleJoueur: "Player's écoles", ecoleTous: "Player's and computer's écoles",
    ecoleDesc: {
      off: 'Points are marked automatically.',
      joueur: 'You mark your points yourself; the computer catches all your mistakes and never errs.',
      tous: 'You mark your points yourself; the computer can err too (École button), or let one of your mistakes go.',
    },
    finirTour: 'End turn', finirTourTitle: 'End your turn (Space)',
    voirPoints: 'Real points', voirPointsTitle: 'See the real points of the roll and the mistakes',
    ecoleBtn: 'École', ecoleBtnTitle: "Put the computer à l'école", validerEcole: 'Confirm the école',
    dameNonJouable: 'This dame cannot be played',
    aiSenVa: "The computer s'en va (leaves).",
    pauseAiSenVa: n => (n > 0 ? `The computer marks ${plural(n, 'trou')} and s'en va (leaves)` : "The computer s'en va (leaves)") +
      ": new relevée. Before going on, you can see the real points of the roll, or put it à l'école if it got its marking wrong.",
    pauseSenVa: () => "You leave (s'en aller): new relevée. Before going on, you can see the real points of the roll.",
    pauseFin: won => (won ? 'You win the game.' : 'The computer wins the game.') +
      ' Before the result, you can see the real points of the roll.',
    partieReprise: 'Game resumed where you left off.',
    reglagesSuivante: 'Your new settings will apply from the next game.',
    tutoOpt: 'Tutorial: explanations as the game goes on', tutoReset: 'Reset the tutorial', tutoResetFait: 'Tutorial reset: every explanation will come back',
    tutoResetTitre: 'Reset the tutorial?', tutoResetOui: 'Reset', tutoResetNon: 'Cancel',
    tutoResetTexte: n => `The ${n > 1 ? n + ' explanations' : 'explanation'} you marked “Got it” will come back ` +
      `each time the situation arises, as on the first day. The tutorial will also be switched back on if it was ` +
      `unchecked. Your settings and the game in progress do not change.`,
    tutoKicker: 'Tutorial', tutoCompris: 'Got it', tutoPlusTard: 'Show again later', tutoAide: 'Learn more',
    tutoConseil: 'If the common situations (hitting a dame, filling a jan, the jan qui ne peut…) are not yet familiar ' +
      'to you, play a game without écoles first.',
    bredouilleCorrigee: n => `Bredouille mistake, no école: the fichet is put back at ${plural(n, 'trou')}.`,
    toastEcoleTrop: n => `École! You marked too much: the computer takes off the surplus and scores ${plural(n, 'point')}.`,
    toastEcoleMoins: n => `École! Points forgotten: the computer scores them (${plural(n, 'point')}).`,
    toastAllerAnnule: n => `École! You had not won a trou: you cannot leave. The computer scores ${plural(n, 'point')}.`,
    toastAiRecule: n => `The computer's jeton goes back ${plural(n, 'point')}.`,
    toastFausse: n => `Fausse école! The computer scores ${plural(n, 'point')}.`,
    toastEcoleGain: n => `École: you score ${plural(n, 'point')}.`,
    toastPasErreur: 'The computer had made no mistake: its score is put back.',
    toastEcoleRien: 'École: you marked no point for yourself.',
    recapTitle: 'Real points',
    recapReels: (h, a) => `Points of the roll: you ${h}, the computer ${a}.`,
    recapVous: (c, r, seen) => `You marked ${plural(c, 'point')} instead of ${r}: ` +
      (seen ? `école of ${Math.abs(c - r)} for the computer.` : 'the computer did not notice.'),
    recapBredouille: 'Bredouille mistake on the trous, corrected with no école.',
    recapOrdi: (m, r, caught) => `The computer marked ${plural(m, 'point')} instead of ${r}: ` +
      (caught ? "you put it à l'école." : 'you did not catch it.'),
    recapEcole: (e, v, f) => `You declared an école of ${plural(e, 'point')}, the real école was ${v}: ` +
      (f > 0 ? `fausse école, ${plural(f, 'point')} for the computer.`
        : e > v ? 'fausse école the computer did not notice.' : e < v ? `you could have marked ${v}.` : 'right école.'),
    recapAucune: 'No mistake.',
    /* partie à écrire */
    modeAsk: 'Game', modeDouze: 'In twelve trous', modeEcrire: 'À écrire', marquesAsk: 'Marqués',
    welcomeSubEcrire: n => `You play against the computer, a partie à écrire in ${n} marqués.`,
    /* game log (js/journal.js) */
    journalTitle: 'Game log', journalBtnTitle: 'Game log: dice, moves, points and mistakes of each turn',
    journalVide: 'No finished turn yet: each turn is written here once played.',
    journalSub: n => `${n} turn${n > 1 ? 's' : ''} played · the eye shows the board of the turn`,
    journalTour: n => `Turn ${n}`, journalReleve: n => `Relevée ${n}`,
    journalMarqueN: (k, rf) => `Marqué no. ${k}` + (rf ? ` (after ${plural(rf, 'refait')})` : ''),
    journalVoir: 'See the board of this turn', journalRetour: '← Log', journalBoard: 'Board of the turn',
    journalPrec: 'Previous turn (←)', journalSuiv: 'Next turn (→)',
    vueJet: 'Roll and points', vueJetTitle: 'Position at the roll, with the points of the roll (hit dames, jans…)',
    vueCoup: 'Move played', vueCoupTitle: 'Position after the move, with the moves of the dames, jetons and fichets',
    journalPoints: 'Points', journalPointsReels: 'Real points', journalAucunPoint: 'none',
    journalCoup: 'Move', journalAucunCoup: 'no playable dame', journalCoupNonJoue: 'not played (new relevée)', journalSortie: 'off',
    journalMarque: 'Score', journalMarqueJoueur: (nom, tr, pts) => `${nom} ${plural(tr, 'trou')}, ${plural(pts, 'point')}`,
    journalTrous: n => plural(n, 'trou'), journalBred: 'en bredouille',
    journalNouvelleReleve: 'New relevée.', journalToutSorti: nom => `${nom}: all dames borne off, new relevée.`,
    journalErreurs: 'Mistakes', jSep: ': ',
    jBattre: 'Dame hit', jBattreTout: "Dame hit tout d'une", jFaux: 'Dame hit à faux',
    janNoms: { petit: 'petit jan', grand: 'grand jan', retour: 'jan de retour' },
    ficheTitle: 'Score sheet', ficheBtnTitle: 'Score sheet of the partie à écrire',
    issueGagne: calc => `S'en aller: you win the marqué, ${calc}.`,
    issuePerdu: calc => `S'en aller: the computer wins the marqué, ${calc}.`,
    issueRefait: cons => `S'en aller: equal trous, refait; the marqué is replayed with ${cons} points of consolation.`,
    marqueGagne: n => `Marqué no. ${n} won!`, marquePerdu: n => `Marqué no. ${n} lost`, marqueRefait: 'Refait',
    marqueAllerVous: "You s'en aller (leave).", marqueAllerOrdi: "The computer s'en va (leaves).",
    marqueTrous: (h, a) => `Trous: you ${h}, the computer ${a}.`,
    marqueCalcul: (tw, cons, mult, b, tl, pts) => (mult > 1 ? '(' : '') + `${tw} trous + ${cons} of consolation` +
      (mult > 1 ? `) × ${mult} (${['', 'petite', 'grande'][b]} bredouille)` : '') + ` − ${tl} = ${plural(pts, 'point')}`,
    marqueRefaitTexte: cons => `Equal trous: nobody wins this marqué, it is replayed. The consolation goes up to ${cons} points; whoever had the primauté keeps it.`,
    marqueTotaux: (h, a, gh, ga) => `Points: you ${h}, the computer ${a} · marqués won: ${gh} to ${ga}.`,
    marqueReste: (k, n) => `${k} marqué${k > 1 ? 's' : ''} out of ${n}.`,
    marqueSuivant: 'Next marqué', resultatPartie: 'Result of the game', voirFiche: 'Score sheet',
    marqueDebut: (k, vous) => `Marqué no. ${k}: ${vous ? 'you play first' : 'the computer plays first'}.`,
    ficheEntete: n => `Partie à écrire in ${n} marqués`, ficheN: 'No.', ficheRefaits: 'Refaits', ficheTrous: 'Trous',
    vous: 'You', ordi: 'Computer', ficheEnCours: 'in play', ficheVide: 'No marqué finished yet.',
    ficheTotal: 'Total (I)', ficheQueueJetons: 'Queue des jetons (II)', fichePaiement: 'Payment of the marqués',
    fichePaiementProv: 'Payment of the marqués, if the game stopped now',
    ficheMarques: 'Marqués (III)', ficheQueueMarques: 'Queue des marqués (IV)', ficheResultat: 'Final result (I + II + III + IV)',
    ficheGainBrut: 'Gross gain', ficheGainArrondi: 'Rounded gain',
    ficheBred: b => ['', 'petite bredouille', 'grande bredouille'][b],
    egalite: 'Draw',
    ecrireGagne: (a, b, g) => `You win the partie à écrire, ${a} points to ${b}: a gain of ${plural(g, 'point')}.`,
    ecrirePerd: (a, b, g) => `The computer wins the partie à écrire, ${a} points to ${b}: a gain of ${plural(g, 'point')}.`,
    ecrireNul: (a, b) => `The partie à écrire is drawn, ${a} points to ${b}: the rounded gain is nil.`,
    detteVous: n => `You owe the computer ${n} louis d'or.`,
    detteOrdi: n => `The computer owes you ${n} louis d'or.`,
    detteNulle: "Nobody owes anything: everyone keeps their louis d'or.",
    pavillonHorsJeu: 'Pavillon out of play: neither player made their trous in a row',
    pavillonAffilee: name => `Pavillon: ${name} made all their trous in a row (marqué en bredouille)`,
  },
};

/* Robots des moteurs de recherche : ils voient le site en français, la langue des balises
   de index.html (titre, description, aperçu de partage), quelle que soit celle de leur navigateur. */
const ROBOT = /bot\b|crawl|spider|slurp|mediapartners/i.test(navigator.userAgent || '');

/* Langue retenue, sinon celle du navigateur (français ou, à défaut, anglais) ; français pour les robots. */
function initialLang() {
  if (ROBOT) return 'fr';
  try { const v = localStorage.getItem(LANG_KEY); if (LANGS.includes(v)) return v; } catch (e) { /* stockage indisponible */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'fr';
  return /^fr\b/i.test(nav) ? 'fr' : 'en';
}
let LANG = initialLang();

/* Texte de la clé dans la langue courante (le français à défaut) ; une fonction reçoit les arguments. */
function t(key, ...args) {
  const v = key in I18N[LANG] ? I18N[LANG][key] : I18N.fr[key];
  return typeof v === 'function' ? v(...args) : v;
}

/* Applique la langue aux textes de la page (index.html) ; le tablier est redessiné par l'appelant. */
function applyLang() {
  document.documentElement.lang = LANG;
  document.title = t('pageTitle');
  for (const e of document.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
  for (const e of document.querySelectorAll('[data-i18n-title]')) e.title = t(e.dataset.i18nTitle);
  for (const e of document.querySelectorAll('[data-i18n-aria]')) e.setAttribute('aria-label', t(e.dataset.i18nAria));
  for (const b of document.querySelectorAll('[data-set-lang]')) b.setAttribute('aria-pressed', String(b.dataset.setLang === LANG));
}
function setLang(lang, remember = true) {
  LANG = LANGS.includes(lang) ? lang : 'fr';
  if (remember) { try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* stockage indisponible */ } }
  applyLang();
}
document.documentElement.lang = LANG;   // dès le chargement : les textes longs de l'autre langue restent masqués
