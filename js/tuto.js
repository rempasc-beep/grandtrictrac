'use strict';
/* ============================================================
   Tutoriel (case de l'écran d'accueil) : à chaque notion nouvelle qui se présente dans la
   partie, une popup l'explique en quelques phrases. « J'ai compris » : elle ne revient plus
   (retenu dans le navigateur) ; « Revoir plus tard » : elle reviendra la prochaine fois que
   la situation se présente. Les notions sont décrites dans TUTORIEL.md.
   Les popups s'ouvrent à des moments où le jeu attend (jet, sélection d'une dame, marque,
   fenêtre « tenir ou s'en aller »…) ; la partie reprend (suite) quand la dernière est fermée.
   ============================================================ */
const TUTO_KEY = 'trictrac.tuto';
const TUTO = { on: true, vus: new Set(), ouverte: 0 };

/* Textes : t (titre), c (phrase de contexte, selon la situation), x (explication),
   a (section de l'aide ouverte par « En savoir plus »). c et x sont du HTML écrit ici. */
const TUTO_TXT = {
  fr: {
    'but-douze': { t: 'Le but du jeu', a: 'marche', x: o =>
      "Vous jouez contre l'ordinateur, vos dames en bas du tablier. Les points viennent surtout des <b>jans</b> : " +
      "des situations qui rapportent des points à l'un ou l'autre joueur. Ils se marquent au jet, avant de jouer : ce sont " +
      'les dés et la position qui comptent, plus que le coup joué. 12 points font un <b>trou</b>, et le premier à ' +
      '12 trous gagne la partie.' + (o.ecole ? '' : ' Le tablier signale les points de chaque jet et la marque est automatique.') },
    'but-ecrire': { t: 'Le but du jeu (partie à écrire)', a: 'ecrire', x: o =>
      "Vous jouez contre l'ordinateur, vos dames en bas du tablier. Les points viennent surtout des <b>jans</b> : " +
      "des situations qui rapportent des points à l'un ou l'autre joueur. Ils se marquent au jet, avant de jouer. " +
      `12 points font un <b>trou</b>. La partie se joue en ${o.n} <b>marqués</b> : dès qu'un joueur a six trous, ` +
      "celui qui s'en va termine le marqué, et le gagnant marque des points selon l'écart des trous. " +
      'On fait les comptes à la fin de la partie.' + (o.ecole ? '' : ' Le tablier signale les points de chaque jet et la marque est automatique.') },
    'ecoles-joueur': { t: 'Les écoles', a: 'ecoles', x: o =>
      'Avec les écoles, le tablier ne signale plus les points : à vous de les voir et de les marquer, avec votre jeton ' +
      "et votre fichet. Un oubli ou une erreur, et l'ordinateur vous <b>met à l'école</b> : il marque la différence pour lui. " +
      'Pendant le tutoriel, les explications montrent quand même les points du jet.' + ecolesConseil(o) },
    'ecoles-tous': { t: 'Les écoles', a: 'ecoles', x: o =>
      'Avec les écoles, le tablier ne signale plus les points : à vous de les voir et de les marquer, avec votre jeton ' +
      "et votre fichet. Un oubli ou une erreur, et l'ordinateur vous <b>met à l'école</b> : il marque la différence pour lui. " +
      "L'ordinateur marque lui aussi ses points et peut se tromper : à vous de le mettre à l'école. " +
      'Pendant le tutoriel, les explications montrent quand même les points du jet.' + ecolesConseil(o) },
    'deplacement': { t: 'Déplacer les dames', a: 'marche', x:
      'Vos 15 dames partent de votre <b>talon</b>, en bas à gauche. Elles avancent vers la droite le long du bas du tablier, ' +
      'reviennent par le haut et sortent à gauche. Chaque dé fait avancer une dame d\'autant de flèches, et une même dame ' +
      "peut jouer les deux dés à la suite (<b>tout d'une</b>). Cliquez sur une dame, puis sur sa flèche d'arrivée ; " +
      "il faut jouer les deux dés quand c'est possible.<br>Toutes les flèches ne sont pas accessibles : on vous expliquera " +
      "pourquoi au fil de la partie. Une seule vous est fermée pour toujours : le <b>coin de l'adversaire</b>, en haut à droite, " +
      "juste en face de votre coin. On ne peut ni s'y arrêter ni y passer." },
    'fleche-tenue': { t: 'Flèche tenue', a: 'marche', x:
      "Contrairement au backgammon, une flèche où se trouve une dame de l'adversaire, même seule, vous est fermée : " +
      "on ne s'y arrête pas, et on ne prend jamais de dame. Une dame seule peut être <b>battue</b>, mais seulement " +
      'pour les points : elle ne bouge pas.' },
    'coin-repos': { t: 'Le coin de repos', a: 'marche', x:
      'Votre <b>coin de repos</b> est la dernière flèche en bas à droite. Il ne se prend qu\'avec deux dames à la fois, ' +
      'dans le même coup, et on ne peut jamais y laisser une dame seule : les deux dernières en repartent ensemble. ' +
      'Tenir son coin est précieux, pour les points comme pour le jeu.' },
    'puissance': { t: 'Prendre le coin par puissance', a: 'marche', x:
      "Votre coin et celui de l'adversaire sont vides, et vos dés amèneraient deux dames sur le coin adverse. Comme vous " +
      'ne pouvez pas prendre votre coin normalement, vous avez le droit de mettre ces deux dames sur le vôtre : ' +
      "c'est la <b>prise par puissance</b>." },
    'jans-adverses': { t: "Les jans de l'adversaire", a: 'marche', x:
      "Tant que l'adversaire peut encore remplir son grand jan (en haut à droite) ou son petit jan (en haut à gauche), " +
      "c'est-à-dire mettre deux dames sur chacune de leurs flèches, vous ne pouvez pas y poser de dame. Ces flèches " +
      "s'ouvrent dès qu'il ne lui reste plus assez de dames en arrière pour les remplir." },
    'coup-oblige': { t: 'Coup obligé', a: 'marche', x: () =>
      "Cette flèche est libre, mais ce coup n'est pas permis ici. Il faut jouer les deux dés quand c'est possible, " +
      'remplir un jan quand le jet le permet, sortir toutes ses dames quand on le peut' +
      (pileJouee() ? ', faire la pile de misère quand elle compte' : '') +
      ' et conserver son plein quand on le peut : seuls les coups qui respectent ces obligations sont proposés.' },
    'doublet': { t: 'Doublet', a: 'marche', x:
      'Les deux dés font le même nombre : c\'est un <b>doublet</b>. Chacun a son nom (bezas, double deux, ternes, carmes, ' +
      'quines, sonnez). Contrairement au backgammon, un doublet ne se joue que deux fois, et non quatre. En revanche, la plupart des jans ' +
      'rapportent plus : 6 points au lieu de 4, 4 au lieu de 2.' },
    'sortir': { t: 'Sortir ses dames', a: 'marche', x:
      'Vos dames sortent quand elles sont toutes dans le jan de retour (en haut à gauche), dans le casier à gauche du tablier. ' +
      'Une dame sort par le nombre exact, ou par un nombre plus grand si c\'est la plus éloignée. Le premier qui sort ' +
      'toutes ses dames marque 4 points (6 par doublet), puis une nouvelle relevée commence.' },
    'battre': { t: 'Battre une dame', a: 'jans',
      c: o => (o.vous ? "Vous battez une dame de l'ordinateur." : "L'ordinateur bat une de vos dames."), x:
      "Une dame seule que l'un des dés pourrait atteindre est <b>battue</b> : 2 points (4 par doublet), ou 4 (6) si elle est " +
      "dans le petit jan de l'adversaire. Contrairement au backgammon, la dame battue ne bouge pas : il suffit que le dé " +
      "le permette. Chaque manière de battre compte. Évitez de laisser des dames seules à portée de l'adversaire." },
    'battre-tout': { t: "Battre tout d'une", a: 'jans',
      c: o => (o.vous ? "Vous battez une dame tout d'une." : "L'ordinateur bat une de vos dames tout d'une."), x:
      "On peut aussi battre avec la somme des deux dés, <b>tout d'une</b>. Il faut que la case de repos, là où s'arrêterait " +
      "la dame après le premier dé, ne porte pas deux dames adverses ou plus : vide, à soi, ou avec une seule dame de " +
      "l'adversaire. Le coin de l'adversaire peut servir de case de repos s'il est vide." },
    'faux': { t: 'Battre à faux', a: 'jans',
      c: o => (o.vous ? "Vous battez à faux : c'est l'ordinateur qui marque." : "L'ordinateur bat à faux : c'est vous qui marquez."), x:
      "Pour battre tout d'une, il faut une case de repos qui ne porte pas deux dames adverses ou plus. Si toutes les " +
      "cases de repos possibles en portent au moins deux, on bat <b>à faux</b> : l'adversaire marque les points à la " +
      'place de celui qui a jeté.' },
    'coin-battu': { t: 'Battre le coin', a: 'jans',
      c: o => (o.vous ? "Vous battez le coin de l'ordinateur." : "L'ordinateur bat votre coin."), x:
      "Quand on tient son coin et que celui de l'adversaire est vide, si chacun des deux dés amènerait une dame sur le coin " +
      'adverse, on <b>bat le coin</b> : 4 points (6 par doublet). Seules les dames en plus des deux qui tiennent le coin peuvent servir.' },
    'deux-tables': { t: 'Jan de deux tables', a: 'jans',
      c: o => (o.contre ? (o.vous ? "Vous faites un contre-jan de deux tables : c'est l'ordinateur qui marque." : "L'ordinateur fait un contre-jan de deux tables : c'est vous qui marquez.")
        : (o.vous ? 'Vous faites un jan de deux tables.' : "L'ordinateur fait un jan de deux tables.")), x:
      "En début de relevée, avec seulement deux dames sorties du talon, si le jet permettrait d'en mettre une sur chaque coin : " +
      "<b>jan de deux tables</b>, 4 points (6 par doublet). Si le coin adverse est déjà occupé, c'est un <b>contre-jan</b> : " +
      "les points vont à l'adversaire." },
    'mezeas': { t: 'Jan de mézéas', a: 'jans',
      c: o => (o.contre ? (o.vous ? "Vous faites un contre-jan de mézéas : c'est l'ordinateur qui marque." : "L'ordinateur fait un contre-jan de mézéas : c'est vous qui marquez.")
        : (o.vous ? 'Vous faites un jan de mézéas.' : "L'ordinateur fait un jan de mézéas.")), x:
      'Le coin pris, les treize autres dames encore au talon, et un as aux dés : <b>jan de mézéas</b>, 4 points (6 par double as). ' +
      "Contre-jan, au profit de l'adversaire, si son coin est occupé." },
    'six-tables': { t: 'Jan de six tables', a: 'jans',
      c: o => (o.vous ? 'Vous faites un jan de six tables.' : "L'ordinateur fait un jan de six tables."), x:
      'Au troisième jet de la relevée, les six dés des trois premiers jets ont fait 1, 2, 3, 4, 5 et 6 : ' +
      '<b>jan de six tables</b>, 4 points, quel que soit le coup joué.' },
    'plein': { t: 'Remplir un jan', a: 'jans',
      c: o => (o.vous ? `Vous pouvez remplir votre ${o.jan}.` : `L'ordinateur peut remplir son ${o.jan}.`), x:
      'Un jan est <b>plein</b> quand ses six flèches portent chacune au moins deux dames. Le remplir vaut 4 points ' +
      '(6 par doublet) par manière de le faire, marqués au jet. Remplir est obligatoire : si le jet le permet, on doit jouer ' +
      'le coup qui remplit.' },
    'plein-conserve': { t: 'Conserver son plein', a: 'jans',
      c: o => (o.vous ? `Vous conservez le plein de votre ${o.jan}.` : `L'ordinateur conserve le plein de son ${o.jan}.`), x:
      'Tant qu\'on garde son plein, chaque jet qui permet de le conserver rapporte 4 points (6 par doublet). ' +
      'On est obligé de le conserver quand on le peut.' },
    'ne-peut': { t: 'Jan qui ne peut', a: 'jans',
      c: o => (o.vous ? `Vous ne pouvez pas jouer ${o.n === 2 ? 'vos deux dés' : 'un de vos dés'} : c'est l'ordinateur qui marque.`
        : `L'ordinateur ne peut pas jouer ${o.n === 2 ? 'ses deux dés' : 'un de ses dés'} : c'est vous qui marquez.`), x:
      "Chaque dé qui ne peut pas se jouer donne 2 points à l'adversaire : c'est le <b>jan qui ne peut</b>." },
    'sortie': { t: 'La sortie', a: 'jans',
      c: o => (o.vous ? 'Vous pouvez sortir toutes vos dames.' : "L'ordinateur sort toutes ses dames."), x:
      'Le premier qui peut sortir toutes ses dames marque 4 points (6 par doublet), et le coup doit les sortir. ' +
      'Les dames reviennent ensuite toutes au talon pour une nouvelle relevée.' },
    'rencontre': { t: 'Jan de rencontre', a: 'optionnels',
      c: o => (o.vous ? "Vous amenez le même jet que l'ordinateur." : "L'ordinateur amène le même jet que vous."), x:
      'Au tout premier coup de la partie, le second joueur amène le même jet que le premier : <b>jan de rencontre</b>, ' +
      '4 points (6 par doublet).' },
    'pile': { t: 'Pile de misère', a: 'optionnels',
      c: o => (o.vous ? 'Vous faites la pile de misère.' : "L'ordinateur fait la pile de misère."), x:
      'Ne pouvant passer au retour, un joueur empile ses quinze dames sur son coin : <b>pile de misère</b>, 4 points ' +
      '(6 par doublet). Tant qu\'il la conserve faute de pouvoir jouer, elle rapporte autant à chaque jet.' },
    'margot': { t: 'Margot la fendue', a: 'optionnels',
      c: o => (o.vous ? "Vous pourriez visiter Margot : c'est l'ordinateur qui marque." : "L'ordinateur pourrait visiter Margot : c'est vous qui marquez."), x:
      "Un dé, ou les deux tout d'une si la case de repos est libre, pourrait amener une dame sur une flèche vide entre " +
      "deux dames seules de l'adversaire : l'adversaire marque 2 points (4 par doublet) par manière." },
    'marque': { t: 'La marque', a: 'trous', x:
      "Les points se comptent avec les <b>jetons</b>, au milieu du tablier : le vôtre en bas, celui de l'ordinateur en haut. " +
      'Ils avancent de 2 en 2 vers la droite. À 12 points, le joueur marque un <b>trou</b> : son <b>fichet</b> avance d\'un trou ' +
      'sur sa bande (la vôtre en bas) et son jeton repart du début.' },
    'trou': { t: 'Le trou et la bredouille', a: 'trous',
      c: o => (o.vous ? 'Vous marquez un trou.' : "L'ordinateur marque un trou."), x:
      '12 points font un <b>trou</b>. Les points en excédent sont gardés, mais ceux de l\'adversaire sont effacés. ' +
      "Si l'adversaire n'a marqué aucun point pendant ce temps, le trou est en <b>bredouille</b> et compte double. " +
      'Quand les deux joueurs ont des points, le jeton doré accompagne le jeton de celui qui est en bredouille ; ' +
      "quand un seul en a, la bredouille va de soi et le jeton doré reste au milieu." },
    'pavillon': { t: 'Le pavillon', a: 'trous', x:
      'Le <b>pavillon</b>, petit drapeau planté au milieu de la bande de gauche, rappelle la <b>grande bredouille</b> : ' +
      "qui marque ses 12 trous avant que l'adversaire en ait un seul gagne une partie double. Le second joueur à marquer " +
      "un trou prend le pavillon : la grande bredouille n'est plus possible." },
    'pavillon-ecrire': { t: 'Le pavillon', a: 'ecrire', x:
      'Le <b>pavillon</b>, petit drapeau, montre qui fait ses trous d\'affilée. Il reste au milieu de la bande de gauche ' +
      "tant qu'un seul joueur a des trous. Quand l'adversaire en marque un à son tour, le pavillon passe à son trou de " +
      "départ : c'est lui, désormais, qui fait ses trous d'affilée. Si le premier joueur marque de nouveau, plus personne " +
      "ne les fait d'affilée et le pavillon est mis hors jeu. Qui gagne le marqué avec ses trous d'affilée voit ses points " +
      'compter double (petite bredouille, de 6 à 11 trous) ou quadruple (grande bredouille, 12 trous et plus).' },
    'tenir-aller': { t: "Tenir ou s'en aller", a: 'trous', x:
      'Vous avez gagné un trou sur votre propre jet, ou par une école : vous choisissez. <b>Tenir</b> : la relevée continue ' +
      "et vous gardez vos points en excédent. <b>S'en aller</b> : toutes les dames reviennent au talon, les points des deux " +
      "joueurs sont effacés et vous rejouez le premier. On s'en va plutôt quand sa position est mauvaise, et on tient " +
      'quand elle promet encore des points.' },
    'releve': { t: 'Nouvelle relevée', a: 'trous', x:
      'Une nouvelle <b>relevée</b> commence : toutes les dames sont revenues au talon et le jeu repart du début, mais les ' +
      "trous restent marqués. Celui qui a sorti ses dames, ou qui s'en est allé, joue le premier." },
    'ecrire-fin': { t: 'Terminer le marqué', a: 'ecrire', x:
      "Un joueur a six trous : s'en aller termine maintenant le marqué. Celui qui a le plus de trous le gagne ; à trous " +
      'égaux, c\'est un <b>refait</b>, le marqué est rejoué. Points du gagnant : ses trous plus la <b>consolation</b> ' +
      '(2 points, et 2 de plus par refait qui précède), doublés ou quadruplés s\'il a fait ses trous d\'affilée, ' +
      'puis moins les trous du perdant. ' +
      'La fenêtre indique ce que rapporterait votre départ.' },
    'ecrire-marque': { t: 'Les comptes de la partie', a: 'ecrire', x:
      'Le marqué est inscrit sur la <b>feuille de score</b> (bouton en haut à droite du tablier). À la fin de la partie, ' +
      'chaque marqué gagné rapporte en plus 4 points, et celui qui en a gagné le plus reçoit 20 points de ' +
      '<b>queue des marqués</b>. La <b>queue des jetons</b> va à celui qui a le plus de points de marqués : 2 points par ' +
      'marqué qu\'il a gagné (à égalité de points, 1 point par marqué d\'avance à celui qui en a gagné le plus). ' +
      'Le gain est la différence des totaux, arrondie à la dizaine.' },
    'ecole-marquer': { t: 'Marquer ses points', a: 'ecoles', x:
      'À vous de marquer les points de votre jet, s\'il y en a. Cliquez sur votre jeton, puis sur un des ronds bleus pour ' +
      "l'avancer ; à 12 points, avancez votre fichet d'un trou (de deux en bredouille). S'il n'y a rien à marquer, jouez directement : toucher une " +
      "dame clôt votre marque, et l'ordinateur la vérifie." },
    'ecole-marquer-adverse': { t: "Marquer sur le jet de l'ordinateur", a: 'ecoles', x:
      "L'ordinateur a joué. Son jet peut vous donner des points (dé qu'il ne peut pas jouer, battage à faux…) : " +
      'marquez-les avec votre jeton, puis lancez les dés. Lancer clôt votre marque.' },
    'ecole-erreur': { t: "L'école", a: 'ecoles', x:
      'Vous avez fait une <b>école</b> : vous avez oublié des points (école par moins), en avez marqué trop (école par trop), ' +
      "ou avez mis l'ordinateur à l'école pour plus de points qu'il n'en devait (fausse école). " +
      "L'ordinateur marque la différence pour lui. Le tablier montre la position du jet et ses points." },
    'points-reels': { t: 'Points réels', a: 'ecoles', x:
      'Le bouton <b>Points réels</b> montre les points du jet et vos éventuelles erreurs, avant de passer au coup suivant.' },
    'ecole-ordi': { t: "Mettre l'ordinateur à l'école", a: 'ecoles', x:
      "L'ordinateur a marqué ses points : il peut se tromper, en marquant trop ou trop peu. Si vous le voyez, " +
      "cliquez sur <b>École</b> : reculez son jeton s'il a marqué trop, avancez le vôtre des points de l'école, puis validez." },
  },
  en: {
    'but-douze': { t: 'The aim of the game', a: 'marche', x: o =>
      'You play against the computer, with your dames at the bottom of the tablier. Points come mostly from <b>jans</b>: ' +
      'situations that score points for one player or the other. They are scored at the roll, before moving: what counts ' +
      'is the dice and the position, more than the move played. 12 points make a <b>trou</b>, and the first to 12 trous ' +
      'wins the game.' + (o.ecole ? '' : ' The tablier shows the points of each roll and the score is kept automatically.') },
    'but-ecrire': { t: 'The aim of the game (partie à écrire)', a: 'ecrire', x: o =>
      'You play against the computer, with your dames at the bottom of the tablier. Points come mostly from <b>jans</b>: ' +
      'situations that score points for one player or the other. They are scored at the roll, before moving. ' +
      `12 points make a <b>trou</b>. The game is played in ${o.n} <b>marqués</b>: as soon as a player has six trous, ` +
      'whoever leaves (s\'en aller) ends the marqué, and the winner scores points according to the difference in trous. ' +
      'The accounts are settled at the end of the game.' + (o.ecole ? '' : ' The tablier shows the points of each roll and the score is kept automatically.') },
    'ecoles-joueur': { t: 'Écoles', a: 'ecoles', x: o =>
      'With écoles, the tablier no longer shows the points: it is up to you to see them and mark them, with your jeton ' +
      'and your fichet. Forget some or get it wrong, and the computer puts you <b>à l\'école</b>: it scores the difference for itself. ' +
      'During the tutorial, the explanations still show the points of the roll.' + ecolesConseil(o) },
    'ecoles-tous': { t: 'Écoles', a: 'ecoles', x: o =>
      'With écoles, the tablier no longer shows the points: it is up to you to see them and mark them, with your jeton ' +
      'and your fichet. Forget some or get it wrong, and the computer puts you <b>à l\'école</b>: it scores the difference for itself. ' +
      'The computer marks its own points too and can get them wrong: it is up to you to put it à l\'école. ' +
      'During the tutorial, the explanations still show the points of the roll.' + ecolesConseil(o) },
    'deplacement': { t: 'Moving the dames', a: 'marche', x:
      'Your 15 dames start from your <b>talon</b>, at the bottom left. They move right along the bottom of the tablier, ' +
      'come back along the top and bear off on the left. Each die moves a dame that many flèches, and the same dame ' +
      'can play both dice one after the other (<b>tout d\'une</b>). Click a dame, then the flèche it goes to; ' +
      'you must play both dice when you can.<br>Not every flèche is open to you: why will be explained as the game goes on. ' +
      'Only one is closed to you for good: the <b>opponent\'s coin</b>, at the top right, just opposite your own coin. ' +
      'You can neither stop on it nor pass through it.' },
    'fleche-tenue': { t: 'Flèche held', a: 'marche', x:
      'Unlike in backgammon, a flèche with an opponent\'s dame on it, even a single one, is closed to you: you cannot ' +
      'stop there, and dames are never captured. A single dame can be <b>hit</b> (battue), but only for points: it does not move.' },
    'coin-repos': { t: 'The coin de repos', a: 'marche', x:
      'Your <b>coin de repos</b> is the last flèche at the bottom right. It can only be taken by two dames at once, ' +
      'in the same move, and a single dame may never be left there: the last two leave it together. ' +
      'Holding your coin is valuable, for points as well as for play.' },
    'puissance': { t: 'Taking the coin par puissance', a: 'marche', x:
      'Your coin and the opponent\'s are empty, and your dice would bring two dames onto the opponent\'s coin. Since you ' +
      'cannot take your own coin normally, you may put those two dames on yours instead: this is the <b>prise par puissance</b>.' },
    'jans-adverses': { t: 'The opponent\'s jans', a: 'marche', x:
      'As long as the opponent can still fill their grand jan (top right) or their petit jan (top left), that is, put two ' +
      'dames on each of their flèches, you cannot put a dame there. These flèches open up as soon as they no longer have ' +
      'enough dames behind to fill them.' },
    'coup-oblige': { t: 'Forced move', a: 'marche', x: () =>
      'This flèche is free, but this move is not allowed here. You must play both dice when you can, fill a jan when ' +
      'the roll allows it, bear off all your dames when you can' +
      (pileJouee() ? ', make the pile de misère when it counts' : '') +
      ' and keep your plein when you can: only the moves that meet these obligations are offered.' },
    'doublet': { t: 'Doublet', a: 'marche', x:
      'Both dice show the same number: this is a <b>doublet</b>. Each has its name (bezas, double deux, ternes, carmes, ' +
      'quines, sonnez). Unlike in backgammon, a doublet is played only twice, not four times. On the other hand, most jans score ' +
      'more: 6 points instead of 4, 4 instead of 2.' },
    'sortir': { t: 'Bearing off', a: 'marche', x:
      'Your dames bear off once they are all in the jan de retour (top left), into the tray to the left of the tablier. ' +
      'A dame bears off by the exact number, or by a higher number if it is the farthest one. The first to bear off ' +
      'all their dames scores 4 points (6 for a doublet), then a new relevée begins.' },
    'battre': { t: 'Hitting a dame', a: 'jans',
      c: o => (o.vous ? 'You hit one of the computer\'s dames.' : 'The computer hits one of your dames.'), x:
      'A single dame that one of the dice could reach is <b>hit</b> (battue): 2 points (4 for a doublet), or 4 (6) if it is ' +
      'in the opponent\'s petit jan. Unlike in backgammon, the hit dame does not move: it is enough that the die ' +
      'allows it. Each way of hitting counts. Avoid leaving single dames within the opponent\'s reach.' },
    'battre-tout': { t: 'Hitting tout d\'une', a: 'jans',
      c: o => (o.vous ? 'You hit a dame tout d\'une.' : 'The computer hits one of your dames tout d\'une.'), x:
      'You can also hit with the sum of both dice, <b>tout d\'une</b>. The case de repos, where the dame would stop after ' +
      'the first die, must not hold two or more opposing dames: empty, your own, or with a single opposing dame. ' +
      'The opponent\'s coin can serve as a case de repos if it is empty.' },
    'faux': { t: 'Hitting à faux', a: 'jans',
      c: o => (o.vous ? 'You hit à faux: the computer scores.' : 'The computer hits à faux: you score.'), x:
      'To hit tout d\'une, you need a case de repos that does not hold two or more opposing dames. If every possible ' +
      'case de repos holds at least two, the hit is <b>à faux</b>: the opponent scores the points instead of the player who rolled.' },
    'coin-battu': { t: 'Hitting the coin', a: 'jans',
      c: o => (o.vous ? 'You hit the computer\'s coin.' : 'The computer hits your coin.'), x:
      'When you hold your coin and the opponent\'s is empty, if each of the two dice would bring a dame onto the opponent\'s ' +
      'coin, you <b>hit the coin</b>: 4 points (6 for a doublet). Only dames beyond the two holding the coin can be used.' },
    'deux-tables': { t: 'Jan de deux tables', a: 'jans',
      c: o => (o.contre ? (o.vous ? 'You make a contre-jan de deux tables: the computer scores.' : 'The computer makes a contre-jan de deux tables: you score.')
        : (o.vous ? 'You make a jan de deux tables.' : 'The computer makes a jan de deux tables.')), x:
      'At the start of a relevée, with only two dames off the talon, if the roll would put one on each coin: ' +
      '<b>jan de deux tables</b>, 4 points (6 for a doublet). If the opponent\'s coin is already taken, it is a ' +
      '<b>contre-jan</b>: the points go to the opponent.' },
    'mezeas': { t: 'Jan de mézéas', a: 'jans',
      c: o => (o.contre ? (o.vous ? 'You make a contre-jan de mézéas: the computer scores.' : 'The computer makes a contre-jan de mézéas: you score.')
        : (o.vous ? 'You make a jan de mézéas.' : 'The computer makes a jan de mézéas.')), x:
      'Coin taken, the other thirteen dames still on the talon, and an ace on the dice: <b>jan de mézéas</b>, 4 points ' +
      '(6 for double ace). A contre-jan, for the opponent, if their coin is taken.' },
    'six-tables': { t: 'Jan de six tables', a: 'jans',
      c: o => (o.vous ? 'You make a jan de six tables.' : 'The computer makes a jan de six tables.'), x:
      'On the third roll of the relevée, the six dice of the first three rolls have shown 1, 2, 3, 4, 5 and 6: ' +
      '<b>jan de six tables</b>, 4 points, whatever move is played.' },
    'plein': { t: 'Filling a jan', a: 'jans',
      c: o => (o.vous ? `You can fill your ${o.jan}.` : `The computer can fill its ${o.jan}.`), x:
      'A jan is <b>plein</b> when each of its six flèches holds at least two dames. Filling it is worth 4 points ' +
      '(6 for a doublet) for each way of doing it, scored at the roll. Filling is compulsory: if the roll allows it, ' +
      'you must play the move that fills.' },
    'plein-conserve': { t: 'Keeping your plein', a: 'jans',
      c: o => (o.vous ? `You keep the plein of your ${o.jan}.` : `The computer keeps the plein of its ${o.jan}.`), x:
      'As long as you keep your plein, each roll that lets you keep it scores 4 points (6 for a doublet). ' +
      'You must keep it when you can.' },
    'ne-peut': { t: 'Jan qui ne peut', a: 'jans',
      c: o => (o.vous ? `You cannot play ${o.n === 2 ? 'either of your dice' : 'one of your dice'}: the computer scores.`
        : `The computer cannot play ${o.n === 2 ? 'either of its dice' : 'one of its dice'}: you score.`), x:
      'Each die that cannot be played gives 2 points to the opponent: this is the <b>jan qui ne peut</b>.' },
    'sortie': { t: 'The sortie', a: 'jans',
      c: o => (o.vous ? 'You can bear off all your dames.' : 'The computer bears off all its dames.'), x:
      'The first who can bear off all their dames scores 4 points (6 for a doublet), and the move must bear them off. ' +
      'All the dames then go back to the talon for a new relevée.' },
    'rencontre': { t: 'Jan de rencontre', a: 'optionnels',
      c: o => (o.vous ? 'You roll the same as the computer.' : 'The computer rolls the same as you.'), x:
      'On the very first move of the game, the second player rolls the same as the first: <b>jan de rencontre</b>, ' +
      '4 points (6 for a doublet).' },
    'pile': { t: 'Pile de misère', a: 'optionnels',
      c: o => (o.vous ? 'You make the pile de misère.' : 'The computer makes the pile de misère.'), x:
      'Unable to pass into the retour, a player stacks all fifteen dames on their coin: <b>pile de misère</b>, 4 points ' +
      '(6 for a doublet). As long as they keep it for want of being able to play, it scores as much on every roll.' },
    'margot': { t: 'Margot la fendue', a: 'optionnels',
      c: o => (o.vous ? 'You could visit Margot: the computer scores.' : 'The computer could visit Margot: you score.'), x:
      'A die, or both dice tout d\'une if the case de repos is free, could bring a dame onto an empty flèche between two ' +
      'single dames of the opponent: the opponent scores 2 points (4 for a doublet) for each way.' },
    'marque': { t: 'Keeping the score', a: 'trous', x:
      'Points are counted with the <b>jetons</b>, in the middle of the tablier: yours at the bottom, the computer\'s at the top. ' +
      'They move right 2 points at a time. At 12 points, the player marks a <b>trou</b>: their <b>fichet</b> moves one hole ' +
      'along their rail (yours at the bottom) and their jeton starts again from the beginning.' },
    'trou': { t: 'The trou and the bredouille', a: 'trous',
      c: o => (o.vous ? 'You mark a trou.' : 'The computer marks a trou.'), x:
      '12 points make a <b>trou</b>. Extra points are kept, but the opponent\'s points are wiped out. ' +
      'If the opponent scored no points in the meantime, the trou is <b>en bredouille</b> and counts double. ' +
      'When both players have points, the golden jeton goes with the jeton of the one who is en bredouille; ' +
      'when only one has points, the bredouille goes without saying and the golden jeton stays in the middle.' },
    'pavillon': { t: 'The pavillon', a: 'trous', x:
      'The <b>pavillon</b>, a small flag in the middle of the left rail, is a reminder of the <b>grande bredouille</b>: ' +
      'whoever marks 12 trous before the opponent has a single one wins a double game. The second player to mark ' +
      'a trou takes the pavillon: the grande bredouille is no longer possible.' },
    'pavillon-ecrire': { t: 'The pavillon', a: 'ecrire', x:
      'The <b>pavillon</b>, a small flag, shows who is making their trous in a row. It stays in the middle of the left rail ' +
      'as long as only one player has trous. When the opponent marks one in turn, the pavillon moves to their starting ' +
      'hole: they are now the one making their trous in a row. If the first player marks again, nobody makes them in a ' +
      'row any more and the pavillon is put out of play. Whoever wins the marqué with their trous in a row sees their ' +
      'points count double (petite bredouille, 6 to 11 trous) or four times (grande bredouille, 12 trous or more).' },
    'tenir-aller': { t: 'Tenir or s\'en aller', a: 'trous', x:
      'You have won a trou on your own roll, or through an école: you choose. <b>Tenir</b> (stay): the relevée goes on ' +
      'and you keep your extra points. <b>S\'en aller</b> (leave): all the dames go back to the talon, both players\' points ' +
      'are wiped out and you play first again. Leave rather when your position is bad, and stay when it still promises points.' },
    'releve': { t: 'New relevée', a: 'trous', x:
      'A new <b>relevée</b> begins: all the dames are back on the talon and play starts again from the beginning, but the ' +
      'trous stay marked. Whoever bore off their dames, or left (s\'en aller), plays first.' },
    'ecrire-fin': { t: 'Ending the marqué', a: 'ecrire', x:
      'A player has six trous: leaving (s\'en aller) now ends the marqué. Whoever has more trous wins it; with equal trous, ' +
      'it is a <b>refait</b> and the marqué is replayed. The winner\'s points: their trous plus the <b>consolation</b> ' +
      '(2 points, and 2 more for each refait before), doubled or quadrupled if they made their trous in a row, ' +
      'then minus the loser\'s trous. ' +
      'The window shows what leaving would bring you.' },
    'ecrire-marque': { t: 'The game accounts', a: 'ecrire', x:
      'The marqué is written on the <b>score sheet</b> (button at the top right of the tablier). At the end of the game, ' +
      'each marqué won brings 4 more points, and whoever won more of them gets 20 points of <b>queue des marqués</b>. ' +
      'The <b>queue des jetons</b> goes to whoever has more marqué points: 2 points per marqué they won (with equal ' +
      'points, 1 point per marqué ahead to whoever won more of them). The gain is the difference of the totals, rounded to the ten.' },
    'ecole-marquer': { t: 'Marking your points', a: 'ecoles', x:
      'It is up to you to mark the points of your roll, if there are any. Click your jeton, then one of the blue dots to ' +
      'move it; at 12 points, move your fichet one hole (two en bredouille). If there is nothing to mark, just play: touching a dame closes ' +
      'your marking, and the computer checks it.' },
    'ecole-marquer-adverse': { t: 'Marking on the computer\'s roll', a: 'ecoles', x:
      'The computer has played. Its roll may give you points (a die it cannot play, a hit à faux…): mark them with your ' +
      'jeton, then roll the dice. Rolling closes your marking.' },
    'ecole-erreur': { t: 'The école', a: 'ecoles', x:
      'You made an <b>école</b>: you forgot some points (école par moins), marked too many (école par trop), ' +
      'or put the computer à l\'école for more points than it owed (fausse école). ' +
      'The computer scores the difference for itself. The tablier shows the position of the roll and its points.' },
    'points-reels': { t: 'Real points', a: 'ecoles', x:
      'The <b>Real points</b> button shows the points of the roll and any mistakes, before moving on to the next turn.' },
    'ecole-ordi': { t: 'Putting the computer à l\'école', a: 'ecoles', x:
      'The computer has marked its points: it can get them wrong, marking too many or too few. If you spot it, ' +
      'click <b>École</b>: move its jeton back if it marked too many, move yours forward by the points of the école, then confirm.' },
  },
};
const TUTO_JAN = {
  fr: { petit: 'petit jan', grand: 'grand jan', retour: 'jan de retour' },
  en: { petit: 'petit jan', grand: 'grand jan', retour: 'jan de retour' },
};
const tutoTxt = () => TUTO_TXT[LANG] || TUTO_TXT.fr;
/* option de la pile de misère jouée dans la partie en cours (coup obligé) */
const pileJouee = () => !!(G.st && G.st.opts && G.st.opts.pile);
/* conseil de la popup des écoles : une partie sans écoles d'abord, tant que les situations courantes
   ne sont pas comprises */
const TUTO_COURANTES = ['battre', 'plein', 'ne-peut', 'marque', 'trou'];
function ecolesConseil() {
  return TUTO_COURANTES.every(id => TUTO.vus.has(id)) ? '' : ' ' + t('tutoConseil');
}

/* ---------- Réglage et mémoire ---------- */
function tutoLoad() {
  try {
    const v = JSON.parse(localStorage.getItem(TUTO_KEY) || 'null');
    if (v) { TUTO.on = v.on !== false; TUTO.vus = new Set(Array.isArray(v.vus) ? v.vus : []); }
  } catch (e) { /* stockage indisponible : tutoriel actif, rien de vu */ }
}
function tutoSave() {
  try { localStorage.setItem(TUTO_KEY, JSON.stringify({ on: TUTO.on, vus: [...TUTO.vus] })); } catch (e) { /* stockage indisponible */ }
}
function tutoSetOn(on) {
  TUTO.on = on;
  tutoSave();
  tutoSyncWelcome();
}
/* « Réinitialiser le tutoriel » : après confirmation, toutes les notions comprises reviendront,
   et le tutoriel est réactivé s'il était décoché. */
function tutoConfirmReset() {
  if (!TUTO.vus.size) return;
  $('tuto-confirm-text').textContent = t('tutoResetTexte', TUTO.vus.size);
  $('tuto-confirm').classList.remove('hidden');
  $('btn-tuto-confirm-non').focus();
}
function tutoFermerConfirm() {
  $('tuto-confirm').classList.add('hidden');
  $('btn-tuto-reset').focus();
}
function tutoReset() {
  $('tuto-confirm').classList.add('hidden');
  TUTO.vus.clear();
  TUTO.on = true;
  tutoSave();
  tutoSyncWelcome();
  $('btn-tuto-reset').textContent = t('tutoResetFait');
  $('opt-tuto').focus();
}
/* case et bouton « Réinitialiser le tutoriel » de l'écran d'accueil (sans effet s'il n'y a rien à revoir) */
function tutoSyncWelcome() {
  $('opt-tuto').checked = TUTO.on;
  const b = $('btn-tuto-reset');
  b.textContent = t('tutoReset');
  b.disabled = !TUTO.vus.size;
}

/* ---------- Affichage ----------
   items : identifiants, ou { id, c } (c : contexte de la phrase d'introduction et du texte).
   Les notions déjà comprises, ou en double, sont écartées ; les autres s'enchaînent, puis suite().
   Pendant les popups, le jeu est en phase 'tuto' (tablier inerte). o.hints : montrer les
   indicateurs de points du jet (avec les écoles, ils ne le sont pas sinon) ; o.place : moitié
   du tablier où poser la popup ('haut' ou 'bas'), sinon celle où les indicateurs sont les moins
   nombreux. Les dés, au milieu, restent visibles. */
function tutoMontrer(items, suite, o = {}) {
  const ids = new Set(), file = [];
  for (const it of items) {
    const n = typeof it === 'string' ? { id: it, c: {} } : it;
    if (!n || ids.has(n.id) || TUTO.vus.has(n.id) || !tutoTxt()[n.id]) continue;
    ids.add(n.id);
    file.push(n);
  }
  if (!G.tuto || !file.length) { suite(); return; }
  const back = G.phase, hintsOn = G.hintsOn;
  G.phase = 'tuto';
  if (o.hints) G.hintsOn = !!G.hints;
  $('tuto').dataset.place = o.place || tutoMoitie();
  let i = 0;
  const step = () => {
    if (i < file.length) { tutoPopup(file[i++], step); return; }
    $('tuto').classList.add('hidden');
    G.phase = back; G.hintsOn = hintsOn;
    renderAll();
    suite();
  };
  renderAll();
  step();
}
/* Moitié du tablier la moins chargée en indicateurs de points (flèches des dames, cadres des jans). */
function tutoMoitie() {
  const H = G.hintsOn && G.hints;
  let haut = 0, bas = 0;
  if (H) for (const e of H.roll) {
    const note = p => { if (p >= 1 && p <= 24) { if (toWhite(e.by, p) >= 13) haut++; else bas++; } };
    note(e.t); note(e.via);
    for (const f of [].concat(e.from == null ? [] : e.from)) note(f);
    for (const pa of e.paths || []) pa.forEach(note);
    if (e.jan) JANS[e.jan].forEach(note);
    if (e.kind === 'coin') note(ADV_COIN);
  }
  return haut > bas ? 'bas' : 'haut';
}
function tutoPopup(n, next) {
  const T = tutoTxt()[n.id], c = n.c || {};
  const val = v => (typeof v === 'function' ? v(c) : v || '');
  $('tuto-title').textContent = T.t;
  const ctx = val(T.c);
  $('tuto-ctx').textContent = ctx;
  $('tuto-ctx').hidden = !ctx;
  $('tuto-text').innerHTML = val(T.x);
  $('btn-tuto-aide').hidden = !T.a;
  $('btn-tuto-aide').onclick = () => tutoAide(T.a);
  const close = vu => {
    if (Date.now() - TUTO.ouverte < 350) return;   // Espace ou clic lancé avant l'ouverture : ignoré
    if (vu) { TUTO.vus.add(n.id); tutoSave(); }
    next();
  };
  $('btn-tuto-compris').onclick = () => close(true);
  $('btn-tuto-plus-tard').onclick = () => close(false);
  TUTO.ouverte = Date.now();
  $('tuto').classList.remove('hidden');
  $('btn-tuto-compris').focus();
}
/* « En savoir plus » : l'aide, ouverte sur la section des règles */
function tutoAide(sec) {
  $('help').classList.remove('hidden');
  const h = document.querySelector(`.rules-body[data-lang="${LANG}"] [data-aide="${sec}"]`);
  if (h) h.scrollIntoView({ block: 'start' });
}
const tutoVisible = () => !$('tuto').classList.contains('hidden');

/* ---------- Déclencheurs ---------- */
/* Début de partie : le but du jeu (selon le type de partie), puis les écoles. */
function tutoDebut(suite) {
  const ecole = G.ecole !== 'off', c = { ecole, n: G.partie.n };
  const items = [{ id: ecrire() ? 'but-ecrire' : 'but-douze', c }];
  if (ecole) items.push({ id: 'ecoles-' + G.ecole, c });
  tutoMontrer(items, suite);
}

/* Notion d'un événement du jet (rollEvents) ; battre tout d'une explique aussi le battage simple. */
function tutoEvt(e) {
  const c = { vous: e.by === G.human };
  switch (e.kind) {
    case 'battre': return e.tout ? [{ id: 'battre', c }, { id: 'battre-tout', c }] : [{ id: 'battre', c }];
    case 'faux': return [{ id: 'battre', c }, { id: 'faux', c }];
    case 'coin': return [{ id: 'coin-battu', c }];
    case 'deuxtables': case 'contre-deuxtables': return [{ id: 'deux-tables', c: Object.assign(c, { contre: e.kind !== 'deuxtables' }) }];
    case 'mezeas': case 'contre-mezeas': return [{ id: 'mezeas', c: Object.assign(c, { contre: e.kind !== 'mezeas' }) }];
    case 'six': return [{ id: 'six-tables', c }];
    case 'plein': return [{ id: 'plein', c: Object.assign(c, { jan: (TUTO_JAN[LANG] || TUTO_JAN.fr)[e.jan] }) }];
    case 'conserve': return [{ id: 'plein-conserve', c: Object.assign(c, { jan: (TUTO_JAN[LANG] || TUTO_JAN.fr)[e.jan] }) }];
    case 'nepeut': return [{ id: 'ne-peut', c: Object.assign(c, { n: e.n }) }];
    case 'sortie': return [{ id: 'sortie', c }];
    case 'rencontre': return [{ id: 'rencontre', c }];
    case 'pile': case 'pile-conserve': return [{ id: 'pile', c }];
    case 'margot': return [{ id: 'margot', c }];
  }
  return [];
}

/* Trous marqués depuis le dernier regard (à chaque moment où le jeu attend) : le trou, puis le pavillon. */
const tutoTrousVus = { st: null, trous: [0, 0] };
function tutoTrous() {
  const st = G.st;
  if (!st) return [];
  if (tutoTrousVus.st !== st) { tutoTrousVus.st = st; tutoTrousVus.trous = st.trous.slice(); return []; }
  const qui = [G.human, G.ai].find(c => st.trous[c] > tutoTrousVus.trous[c]);
  tutoTrousVus.trous = st.trous.slice();
  if (qui === undefined) return [];
  return [{ id: 'trou', c: { vous: qui === G.human } }, st.ecrire ? 'pavillon-ecrire' : 'pavillon'];
}

/* Après le jet, avant de jouer : déplacement (premier jet du joueur), doublet, coin, sortie,
   jans du jet, marque et trous ; avec les écoles, la marque à la main. */
function tutoJet(me, events, suite) {
  const h = G.human, s0 = G.turnStart, items = [];
  if (me === h) items.push('deplacement');
  if (G.dice[0] === G.dice[1]) items.push('doublet');
  if (me === h) {
    if (s0.b[h][COIN] === 0 && G.moves.some(mv => !mv.puissance && mv.final[COIN] >= 2)) items.push('coin-repos');
    if (G.moves.some(mv => mv.puissance)) items.push('puissance');
    if (allInLast(s0.b[h], s0.off[h])) items.push('sortir');
  }
  for (const e of events) items.push(...tutoEvt(e));
  if (!ecoleOn() && events.length) items.push('marque');
  items.push(...tutoTrous());
  if (ecoleOn() && me === h) items.push('ecole-marquer');
  tutoMontrer(items, suite, { hints: true });
}

/* Dame cliquée par le joueur : pourquoi tel dé ne la mène pas là où on pourrait l'attendre.
   Une raison par dé restant (flèche tenue, jan adverse fermé, coin, sortie, coup obligé). */
function tutoSelection(p) {
  if (!G.tuto || !G.dice) return;
  const me = G.human, st = G.st, m = st.b[me], th = st.b[1 - me];
  const used = usedDice(), legal = new Set(pathsFrom(p).keys());
  const grand = canStillFill(th, 7), petit = canStillFill(th, 1);
  const items = [];
  if (p === COIN && m[COIN] === 2) items.push('coin-repos');
  for (const d of new Set(G.dice.filter((x, i) => !used[i]))) {
    const to = p + d;
    if (to > 24) { if (!legal.has(OFF)) items.push('sortir'); continue; }
    if (to === ADV_COIN) continue;   // expliqué dès le premier jet (déplacement)
    if (th[25 - to] > 0) items.push('fleche-tenue');
    else if ((grand && to >= 13 && to <= 18) || (petit && to >= 19)) items.push('jans-adverses');
    else if (to === COIN && m[COIN] === 0) items.push('coin-repos');
    else if (!legal.has(to) && !(p === COIN && m[COIN] === 2)) items.push('coup-oblige');
  }
  /* la dame cliquée reste visible : popup dans l'autre moitié du tablier */
  tutoMontrer(items, () => {}, { place: toWhite(me, p) >= 13 ? 'bas' : 'haut' });
}

/* Nouvelle relevée (au début du tour qui la commence). */
const tutoReleveVue = { st: null, releve: 0 };
function tutoReleve(suite) {
  const st = G.st;
  if (tutoReleveVue.st !== st) { tutoReleveVue.st = st; tutoReleveVue.releve = st.releve; suite(); return; }
  const neuve = st.releve > tutoReleveVue.releve;
  tutoReleveVue.releve = st.releve;
  tutoMontrer(neuve ? ['releve'] : [], suite);
}

function tutoInit() {
  tutoLoad();
  tutoSyncWelcome();
  $('opt-tuto').addEventListener('change', e => tutoSetOn(e.target.checked));
  $('btn-tuto-reset').addEventListener('click', tutoConfirmReset);
  $('btn-tuto-confirm-oui').addEventListener('click', tutoReset);
  $('btn-tuto-confirm-non').addEventListener('click', tutoFermerConfirm);
  const dlg = $('tuto-confirm');
  dlg.addEventListener('click', e => { if (e.target === dlg) tutoFermerConfirm(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !dlg.classList.contains('hidden')) { e.stopImmediatePropagation(); tutoFermerConfirm(); }
  }, true);
}
