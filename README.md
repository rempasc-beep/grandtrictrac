# Grand Trictrac

Le grand trictrac, ancêtre français du backgammon, à jouer dans le navigateur contre l'ordinateur.

**▶ Jouer : https://rempasc-beep.github.io/grandtrictrac/**

## Le jeu

- Vous jouez Blanc contre l'ordinateur, dont vous choisissez le niveau sur l'écran d'accueil : facile, normal ou fort (le dernier choix est retenu).
- Règles du grand trictrac, sans pile de misère ni Margot la fendue : jans, battages à vrai et à faux, pleins, jan de retour, sortie, tenir ou s'en aller. La partie se joue en 12 trous.
- Les points de chaque jet sont signalés sur le tablier avant de jouer, et la marque se fait avec les fichets et les jetons sur les bandes du tablier.
- Les règles complètes et les commandes sont dans l'aide (bouton **?**).

Sur téléphone, seul le tablier s'affiche ; le bouton ⛶ passe en plein écran (et en paysage quand le navigateur le permet).

## En local

Aucune dépendance ni compilation : ouvrez `index.html` dans un navigateur.

- `js/rules.js` : règles (coups possibles, points marqués)
- `js/ai.js` : l'ordinateur
- `js/ui.js` : tablier SVG et déroulement de la partie
