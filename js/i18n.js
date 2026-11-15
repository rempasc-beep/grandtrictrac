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
    players: ['Blanc', 'Vert'],
    boardLabel: 'Tablier de trictrac',
    restartTitle: "Recommencer : retour à l'écran d'accueil", restartLabel: 'Recommencer',
    fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran',
    helpTitle: 'Aide, règles et options', helpLabel: 'Aide',
    langLabel: 'Langue',
    welcomeSub: "Vous jouez Blanc contre l'ordinateur, en 12 trous.",
    welcomeAsk: 'Choisissez la difficulté',
    lvlEasy: 'Facile', lvlEasyDesc: "Il joue d'instinct, avec une part de hasard.",
    lvlNormal: 'Normal', lvlNormalDesc: 'Il pèse les risques de chaque coup.',
    lvlStrong: 'Fort', lvlStrongDesc: 'Il anticipe vos meilleures ripostes.',
    rulesHelp: 'Règles et aide', optRules: 'Règles optionnelles', resume: 'Reprendre la partie en cours',
    optUndo: 'Annulation', optJans: 'Jans optionnels',
    undoTouchee: 'Dame cliquée, dame jouée', undoDeplacee: 'Dame déplacée, dame jouée', undoLibre: 'Annulation autorisée',
    undoDesc: {
      touchee: "La dame sélectionnée doit être jouée, et chaque dame posée l'est définitivement.",
      deplacee: "On peut changer de dame tant qu'on ne l'a pas posée ; une dame posée l'est définitivement.",
      libre: "Le coup peut être défait tant qu'il n'est pas validé par OK.",
    },
    close: 'Fermer', help: 'Aide',
    trouTitle: 'Vous marquez un trou', aller: "S'en aller", tenir: 'Tenir',
    trouText: (trous, pts) => `Vous avez ${plural(trous, 'trou')} et ${plural(pts, 'point')} en excédent. ` +
      `Tenir : vous jouez votre coup et la relevée continue. S'en aller : toutes les dames reviennent au talon, ` +
      `les points des deux joueurs sont effacés et vous rejouez le premier.`,
    seeBoard: 'Voir le tablier', newGame: 'Nouvelle partie',
    victory: 'Victoire !', defeat: 'Défaite…',
    youWin: score => 'Vous gagnez ' + score, aiWins: score => "L'ordinateur gagne " + score,
    score: (w, l, grande) => `${w} trous à ${l}${grande ? ' en grande bredouille (partie double)' : ''}.`,
    /* tablier */
    tray: 'Sorties',
    fichetTitle: (name, n) => `${name} : ${plural(n, 'trou')}`,
    jetonTitle: (name, n) => `${name} : ${plural(n, 'point')}`,
    bredouilleJeton: 'Jeton de bredouille',
    roll: 'Lancer les dés', rollTitle: 'Lancer les dés (Espace)', space: 'espace',
    okTitle: 'Continuer (Espace)', undo: 'Annuler le coup', puissance: 'Prendre le coin par puissance',
    /* étiquettes de points */
    faux: 'À faux', coin: 'Coin battu', deuxTables: 'Jan de deux tables', contreDeuxTables: 'Contre-jan de deux tables',
    mezeas: 'Jan de mézéas', contreMezeas: 'Contre-jan de mézéas', six: 'Jan de six tables',
    plein: n => 'Plein' + (n > 1 ? ` ${n} manières` : ''), pleinConserve: 'Plein conservé', sortie: 'Sortie',
    rencontre: 'Jan de rencontre', pile: 'Pile de misère', pileConserve: 'Pile conservée', margot: 'Margot',
    nePeut: 'Jan qui ne peut',
  },
  en: {
    players: ['White', 'Green'],
    boardLabel: 'Trictrac tablier',
    restartTitle: 'Restart: back to the welcome screen', restartLabel: 'Restart',
    fullscreen: 'Full screen', exitFullscreen: 'Exit full screen',
    helpTitle: 'Help, rules and options', helpLabel: 'Help',
    langLabel: 'Language',
    welcomeSub: 'You play White against the computer, in 12 trous.',
    welcomeAsk: 'Choose the difficulty',
    lvlEasy: 'Easy', lvlEasyDesc: 'It plays by instinct, with a touch of chance.',
    lvlNormal: 'Normal', lvlNormalDesc: 'It weighs the risks of every move.',
    lvlStrong: 'Strong', lvlStrongDesc: 'It anticipates your best replies.',
    rulesHelp: 'Rules and help', optRules: 'Optional rules', resume: 'Resume the current game',
    optUndo: 'Undo', optJans: 'Optional jans',
    undoTouchee: 'Dame clicked, dame played', undoDeplacee: 'Dame moved, dame played', undoLibre: 'Undo allowed',
    undoDesc: {
      touchee: 'The selected dame must be played, and every dame put down stays there.',
      deplacee: 'You may switch dames until you put one down; a dame put down stays there.',
      libre: 'The move can be taken back until it is confirmed with OK.',
    },
    close: 'Close', help: 'Help',
    trouTitle: 'You mark a trou', aller: "S'en aller", tenir: 'Tenir',
    trouText: (trous, pts) => `You have ${plural(trous, 'trou')} and ${plural(pts, 'point')} carried over. ` +
      `Tenir: you play your move and the relevée goes on. S'en aller: all the dames go back to the talon, ` +
      `both players' points are wiped out and you play first.`,
    seeBoard: 'View the tablier', newGame: 'New game',
    victory: 'Victory!', defeat: 'Defeat…',
    youWin: score => 'You win ' + score, aiWins: score => 'The computer wins ' + score,
    score: (w, l, grande) => `${w} trous to ${l}${grande ? ' en grande bredouille (double game)' : ''}.`,
    tray: 'Off',
    fichetTitle: (name, n) => `${name}: ${plural(n, 'trou')}`,
    jetonTitle: (name, n) => `${name}: ${plural(n, 'point')}`,
    bredouilleJeton: 'Jeton de bredouille',
    roll: 'Roll the dice', rollTitle: 'Roll the dice (Space)', space: 'space',
    okTitle: 'Continue (Space)', undo: 'Undo move', puissance: 'Take the coin par puissance',
    faux: 'À faux', coin: 'Coin battu', deuxTables: 'Jan de deux tables', contreDeuxTables: 'Contre-jan de deux tables',
    mezeas: 'Jan de mézéas', contreMezeas: 'Contre-jan de mézéas', six: 'Jan de six tables',
    plein: n => 'Plein' + (n > 1 ? `, ${n} ways` : ''), pleinConserve: 'Plein kept', sortie: 'Sortie',
    rencontre: 'Jan de rencontre', pile: 'Pile de misère', pileConserve: 'Pile kept', margot: 'Margot',
    nePeut: 'Jan qui ne peut',
  },
};

/* Langue retenue, sinon celle du navigateur (français ou, à défaut, anglais). */
function initialLang() {
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
