# Grand Trictrac

Le grand trictrac, ancêtre français du backgammon, à jouer dans le navigateur contre l'ordinateur.

**▶ Jouer : https://rempasc-beep.github.io/grandtrictrac/**

## Le jeu

- Vous jouez Blanc contre l'ordinateur, dont vous choisissez le niveau sur l'écran d'accueil : facile, normal ou fort (le dernier choix est retenu).
- Règles du grand trictrac : jans, battages à vrai et à faux, pleins, jan de retour, sortie, tenir ou s'en aller. Le jan de rencontre, la pile de misère et Margot la fendue se jouent en option (règles optionnelles de l'écran d'accueil).
- Deux sortes de partie, au choix sur l'écran d'accueil : **en douze trous** (la partie classique) ou **à écrire**, en 4, 6, 8 ou 12 marqués. Dans la partie à écrire, un marqué se termine quand un joueur s'en va alors que l'un des deux a six trous ; il se paie en trous, consolation, petite et grande bredouille (le pavillon montre qui a ses trous d'affilée), avec refaits et primauté. Un résumé s'affiche après chaque marqué, et le bouton de la feuille de score (en haut à droite) donne les comptes : points des marqués, queue des jetons, paiement des marqués, queue des marqués et gain arrondi.
- Les points de chaque jet sont signalés sur le tablier avant de jouer, et la marque se fait avec les fichets et les jetons sur les bandes du tablier.
- Règle optionnelle des **écoles** : on marque soi-même ses points (jeton et fichet), l'ordinateur relève les erreurs ; dans le mode « joueur et ordinateur », il peut aussi se tromper et on peut le mettre à l'école. Les règles et les simplifications sont dans l'aide.
- La partie en cours est enregistrée dans le navigateur : en revenant sur le site, elle reprend au début du tour où on l'avait laissée, avec les mêmes dés (recharger la page ne relance pas).
- Les règles complètes et les commandes sont dans l'aide (bouton **?**).
- Interface en français ou en anglais (choix FR / EN sur l'écran d'accueil, retenu ; par défaut, la langue du navigateur). En anglais, les termes propres au trictrac restent en français.

Le jeu s'installe comme une application (PWA) : à l'ouverture sur téléphone ou tablette (Chrome, Edge… sur Android, Safari sur iPhone et iPad), une fenêtre propose de l'ajouter à l'écran d'accueil ; sur ordinateur, rien ne s'ouvre, mais Chrome et Edge l'installent depuis leur barre d'adresse ; une fois installé, il se joue aussi hors connexion. Les icônes PNG se refont depuis les dessins de `icons/` avec `python tools/icones.py`.

Pour les moteurs de recherche et les réseaux sociaux, `index.html` porte un titre et une description détaillés, l'adresse canonique, les balises Open Graph et Twitter, et une description du jeu en données structurées (schema.org) ; `sitemap.xml` liste la page, à déclarer dans Google Search Console et Bing Webmaster Tools. L'image d'aperçu `icons/partage.png` (1200 × 630) se refait avec `python tools/image_partage.py`.

Seul le tablier s'affiche, la marque se lit sur ses bandes ; le bouton ⛶ passe en plein écran (et en paysage sur téléphone quand le navigateur le permet). À la souris, la touche Espace lance les dés et valide (bouton OK).

## En local

Aucune dépendance ni compilation : ouvrez `index.html` dans un navigateur.

- `js/i18n.js` : textes de l'interface en français et en anglais (l'aide est écrite dans les deux langues dans `index.html`)
- `js/rules.js` : règles (coups possibles, points marqués)
- `js/ai.js` : l'ordinateur
- `js/ecoles.js` : écoles (marque à la main, erreurs de l'ordinateur)
- `js/ecrire.js` : partie à écrire (points d'un marqué, paiement de fin de partie)
- `js/ui.js` : tablier SVG et déroulement de la partie

## Aperçu des indicateurs

`python tools/apercu_indicateurs.py` photographie le tablier dans des positions de démonstration (dames battues par un dé, tout d'une, à faux, coin battu, jans de deux tables, de mézéas et de six tables, pleins, sortie, jan qui ne peut, jans optionnels, partie à écrire (fichet au-delà de douze trous, pavillon), et pour les écoles : fantômes des coups de l'ordinateur et du joueur, jeton ou fichet sélectionné, boutons et leur liseré…) et range une image par cas, plus une planche de toutes, dans `tools/apercu/`. On peut ne donner que certaines scènes : `python tools/apercu_indicateurs.py a-faux margot`, et `--lang en` met les étiquettes en anglais. Les scènes sont décrites dans `tools/scenes-indicateurs.js`. Il faut Python avec Pillow et Chrome ou Edge (ou un navigateur indiqué dans la variable `CHROME`).
