# Consignes pour ce dépôt

## Style des indicateurs de points

Après toute modification du style des indicateurs affichés après un jet (flèches des dames
battues, coin battu, jan de deux tables, Margot, cadres des jans, étiquettes de points,
dames fictives, fantômes des coups de l'ordinateur, liseré vert et ronds bleus de la marque, dés à lancer… :
`hintArrow`, `hintGhost`, `hintFrame`, `hintBadges`, `renderHints`, `trailArrow`, `trailGhost`, `renderTrails`,
`renderMarque`, `drawFichet`, `renderMarkTargets`, `LISERE` et `HINT_PAL` dans `js/ui.js`), relancer l'aperçu et regarder les images :

    python tools/apercu_indicateurs.py

Les images (une par cas, plus `planche.png`) sont dans `tools/apercu/`. Vérifier
qu'aucun cas n'est cassé et montrer la planche (ou les cas touchés) à l'utilisateur.
Quand un nouveau cas d'indicateur apparaît, lui ajouter une scène dans
`tools/scenes-indicateurs.js`.
