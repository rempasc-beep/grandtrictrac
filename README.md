# Grand Trictrac

Le grand trictrac, ancêtre français du backgammon, à jouer dans le navigateur contre l'ordinateur.

**▶ Jouer : https://rempasc-beep.github.io/grandtrictrac/**

## Le jeu

- Vous jouez Blanc contre l'ordinateur, dont vous choisissez le niveau sur l'écran d'accueil : facile, normal ou fort (le dernier choix est retenu).
- Règles du grand trictrac : jans, battages à vrai et à faux, pleins, jan de retour, sortie, tenir ou s'en aller. La partie se joue en 12 trous. Le jan de rencontre, la pile de misère et Margot la fendue se jouent en option (règles optionnelles de l'écran d'accueil).
- Les points de chaque jet sont signalés sur le tablier avant de jouer, et la marque se fait avec les fichets et les jetons sur les bandes du tablier.
- Les règles complètes et les commandes sont dans l'aide (bouton **?**).

Seul le tablier s'affiche, la marque se lit sur ses bandes ; le bouton ⛶ passe en plein écran (et en paysage sur téléphone quand le navigateur le permet). À la souris, la touche Espace lance les dés et valide (bouton OK).

## En local

Aucune dépendance ni compilation : ouvrez `index.html` dans un navigateur.

- `js/rules.js` : règles (coups possibles, points marqués)
- `js/ai.js` : l'ordinateur
- `js/ui.js` : tablier SVG et déroulement de la partie

## Aperçu des indicateurs

`python tools/apercu_indicateurs.py` photographie le tablier dans des positions de démonstration (dames battues par un dé, tout d'une, à faux, coin battu, jans de deux tables, de mézéas et de six tables, pleins, sortie, jan qui ne peut, jans optionnels…) et range une image par cas, plus une planche de toutes, dans `tools/apercu/`. On peut ne donner que certaines scènes : `python tools/apercu_indicateurs.py a-faux margot`. Les scènes sont décrites dans `tools/scenes-indicateurs.js`. Il faut Python avec Pillow et Chrome ou Edge (ou un navigateur indiqué dans la variable `CHROME`).
