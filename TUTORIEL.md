# Tutoriel : popups et déclencheurs

Les textes (français et anglais) sont dans `js/tuto.js` (`TUTO_TXT`), les libellés des boutons
dans `js/i18n.js` (clés `tuto…`).

## Principe

- Case **Tutoriel** sur l'écran d'accueil, au-dessus de « Démarrer la partie ». Elle est cochée
  à la première visite, puis le choix est retenu (`localStorage`, clé `trictrac.tuto`, avec la
  liste des notions comprises). Le bouton **Réinitialiser le tutoriel**, juste dessous, remet la
  liste à zéro, après une fenêtre de confirmation qui en explique les conséquences : toutes les
  notions comprises reviendront, et le tutoriel est recoché s'il ne l'était plus (le bouton est
  grisé tant qu'il n'y a rien à revoir).
- Une popup par notion : titre, phrase de contexte (« Vous battez… » ou « L'ordinateur bat
  votre dame… »), explication, et trois boutons :
  - **J'ai compris** : la notion ne reviendra plus ;
  - **Revoir plus tard** : elle reviendra la prochaine fois que la situation se présente ;
  - **En savoir plus** : ouvre l'aide sur la section des règles correspondante.
- Une notion n'a qu'un identifiant, que la situation concerne le joueur ou l'ordinateur.
- Plusieurs notions sur le même moment : les popups s'enchaînent, dans l'ordre des tableaux.
- Pendant les popups, le jeu attend (phase `tuto`, tablier inerte, Espace et Entrée agissent
  sur le bouton qui a le focus, « J'ai compris »). Un clic ou un Espace arrivé dans les 350 ms
  qui suivent l'ouverture est ignoré, pour ne pas fermer une popup sans l'avoir lue.
- Avec les écoles, les popups s'ouvrent aussi dès le jet, et montrent les indicateurs de
  points du jet tant qu'elles sont ouvertes.

## Début de partie (avant le premier jet)

| Identifiant | Quand |
|---|---|
| `but-douze` / `but-ecrire` | Selon le type de partie (en douze trous, à écrire). Sans écoles, le texte ajoute que la marque est automatique. |
| `ecoles-joueur` / `ecoles-tous` | Si les écoles sont jouées, selon le mode. Tant que les notions courantes (`battre`, `plein`, `ne-peut`, `marque`, `trou`) ne sont pas toutes comprises, le texte conseille de faire d'abord une partie sans écoles. |

## Au jet (avant de jouer, et avant le bouton OK des indicateurs)

| Identifiant | Quand |
|---|---|
| `deplacement` | Jet du joueur (le premier, puis tant que la notion n'est pas comprise). Annonce que toutes les flèches ne sont pas accessibles, et que le coin adverse ne l'est jamais. |
| `doublet` | Doublet, de l'un ou l'autre joueur. |
| `coin-repos` | Jet du joueur où il peut prendre son coin. |
| `puissance` | Jet du joueur où la prise par puissance est possible. |
| `sortir` | Jet du joueur dont toutes les dames sont dans le jan de retour. |
| `battre`, `battre-tout`, `faux`, `coin-battu`, `deux-tables`, `mezeas`, `six-tables`, `plein`, `plein-conserve`, `ne-peut`, `sortie`, `rencontre`, `pile`, `margot` | Événements du jet (`rollEvents`), pour l'un ou l'autre joueur. `battre-tout` et `faux` sont précédés de `battre`. Les contre-jans partagent la popup du jan (`deux-tables`, `mezeas`), la pile conservée celle de la pile. |
| `marque` | Sans écoles, dès qu'un jet donne des points. |
| `trou`, puis `pavillon` (douze trous) ou `pavillon-ecrire` | Un trou vient d'être marqué. |
| `ecole-marquer` | Avec les écoles, jet du joueur (il doit marquer ses points). |

## Sélection d'une dame (tour du joueur)

Quand le joueur clique une de ses dames, jouable ou non, chaque dé restant qui ne la mène pas
là où on l'attendrait donne une explication :

| Identifiant | Raison |
|---|---|
| `fleche-tenue` | La flèche d'arrivée est tenue par l'adversaire. |
| `jans-adverses` | Elle est dans un jan de l'adversaire qu'il peut encore remplir. |
| `coin-repos` | Elle est son coin vide (prise à deux), ou la dame quitterait son coin où il n'en reste que deux. |
| `sortir` | La dame ne peut pas sortir (toutes ses dames ne sont pas dans le jan de retour, ou le nombre ne convient pas). |
| `coup-oblige` | La flèche est libre, mais le coup n'est pas permis (jouer les deux dés, remplir, sortir, conserver, et la pile de misère si l'option est jouée). |

Le coin adverse n'a pas de popup ici : `deplacement` l'a déjà expliqué.

## Marque, trous, relevées

| Identifiant | Quand |
|---|---|
| `tenir-aller` | Le joueur a gagné un trou sur son jet ou par une école, juste avant la fenêtre « Tenir / S'en aller » (précédé de `trou` s'il n'a pas encore été vu à ce moment). |
| `ecrire-fin` | Partie à écrire : même moment, quand un joueur a six trous (s'en aller termine le marqué). |
| `ecrire-marque` | Partie à écrire : avant le résumé du marqué terminé. |
| `releve` | Début d'une nouvelle relevée (après une sortie ou un départ). |

## Écoles

| Identifiant | Quand |
|---|---|
| `ecole-marquer-adverse` | Après le coup de l'ordinateur, quand le joueur marque ses points du jet adverse. |
| `points-reels` | Première apparition du bouton « Points réels » (même moment, ou coup du joueur joué). |
| `ecole-ordi` | Mode « joueur et ordinateur », mêmes moments : le bouton « École » est proposé. |
| `ecole-erreur` | L'ordinateur met le joueur à l'école : école par moins, par trop, départ annulé ou fausse école (bulle d'école). |
