'use strict';
/* ============================================================
   Moteur de règles du grand trictrac
   Convention : chaque joueur possède un tableau b[c][1..24] exprimé
   dans SA propre numérotation (1 = talon, 12 = coin de repos,
   13 = coin adverse, 19..24 = jan de retour = petit jan adverse).
   La flèche t du joueur c correspond à la flèche 25-t de l'adversaire.
   ============================================================ */
const WHITE = 0, BLACK = 1;
const TALON = 1, COIN = 12, ADV_COIN = 13, OFF = 25;
const PLAYER_NAMES = ['Blanc', 'Vert'];
const JANS = { petit: [1, 2, 3, 4, 5, 6], grand: [7, 8, 9, 10, 11, 12], retour: [19, 20, 21, 22, 23, 24] };
const JAN_LABEL = { petit: 'petit jan', grand: 'grand jan', retour: 'jan de retour' };
const TROUS_PARTIE = 12;
/* Jans optionnels (non joués par défaut) : jan de rencontre, pile de misère, Margot la fendue. */
const DEFAULT_OPTS = { rencontre: false, pile: false, margot: false };

function newState(opts) {
  const st = {
    opts: Object.assign({}, DEFAULT_OPTS, opts),
    b: [new Int8Array(25), new Int8Array(25)],
    off: [0, 0],
    points: [0, 0],
    trous: [0, 0],
    bredouille: [false, false],
    lances: [[], []],        // dés des trois premiers jets de la relevée (jan de six tables)
    trouPending: [0, 0],
    releve: 1,
    premiersJets: [],        // dés des deux premiers jets de la partie (jan de rencontre)
  };
  resetRelevee(st);
  return st;
}

function resetRelevee(st) {
  for (let c = 0; c < 2; c++) {
    st.b[c].fill(0);
    st.b[c][TALON] = 15;
    st.off[c] = 0;
    st.lances[c] = [];
    st.trouPending[c] = 0;
  }
}

function cloneState(st) {
  return {
    opts: st.opts,
    b: [Int8Array.from(st.b[0]), Int8Array.from(st.b[1])],
    off: st.off.slice(),
    points: st.points.slice(),
    trous: st.trous.slice(),
    bredouille: st.bredouille.slice(),
    lances: st.lances.map(a => a.slice()),
    trouPending: st.trouPending.slice(),
    releve: st.releve,
    premiersJets: st.premiersJets,
  };
}

function allInLast(m, off) {
  let s = off;
  for (let p = 19; p <= 24; p++) s += m[p];
  return s === 15;
}

/* Le jan `key` est-il plein (deux dames au moins sur chacune de ses six flèches) ? */
function isPlein(m, key) {
  for (const p of JANS[key]) if (m[p] < 2) return false;
  return true;
}

/* Nombre de jans que le coup remplit (pleins faits, et non conservés). */
function pleinsFaits(before, after) {
  let n = 0;
  for (const key in JANS) if (isPlein(after, key) && !isPlein(before, key)) n++;
  return n;
}

/* Nombre de jans pleins avant le coup et toujours pleins après. */
function pleinsConserves(before, after) {
  let n = 0;
  for (const key in JANS) if (isPlein(before, key) && isPlein(after, key)) n++;
  return n;
}

/* Le joueur dont les dames sont m peut-il encore remplir le jan des flèches lo..lo+5 ?
   Une dame ne faisant qu'avancer, il lui faut au moins 2k dames en deçà de la
   k-ième flèche du jan (talon et flèches précédentes comprises). */
function canStillFill(m, lo) {
  let n = 0;
  for (let p = 1; p < lo; p++) n += m[p];
  for (let k = 1; k <= 6; k++) {
    n += m[lo + k - 1];
    if (n < 2 * k) return false;
  }
  return true;
}

/* Flèches (numérotation de me) où me ne peut pas poser de dame : celles que tient
   l'adversaire, et ses jans tant qu'il peut encore les remplir : son grand jan
   (ses flèches 7..12 = nos 13..18) et son petit jan (ses 1..6 = nos 19..24). */
function blockedFn(st, me) {
  const th = st.b[1 - me];
  const grand = canStillFill(th, 7), petit = canStillFill(th, 1);
  return t => th[25 - t] > 0 || (grand && t >= 13 && t <= 18) || (petit && t >= 19);
}

/* Destination d'un pas (1..24, 25 = sortie) ou 0 si illégal.
   blocked(t) : flèche interdite (voir blockedFn).
   flags : état transitoire dans le coup (prise / abandon du coin en cours). */
function stepDest(m, off, blocked, from, die, flags) {
  if (m[from] === 0) return 0;
  if (from === COIN && m[COIN] === 1 && !flags.pendingLeave) return 0;
  const to = from + die;
  if (to > 24) {
    if (!allInLast(m, off)) return 0;
    if (to > OFF) { for (let q = 19; q < from; q++) if (m[q] > 0) return 0; }
    return OFF;
  }
  if (to === ADV_COIN) return 0;
  if (blocked(to)) return 0;
  if (to === COIN && m[COIN] === 1 && !flags.pendingTake) return 0;
  return to;
}

/* Tous les coups légaux (séquences de pas) pour le joueur me avec les dés d1,d2.
   Les doublets ne se jouent que deux fois. On doit jouer le plus de dés possible.
   Chaque coup : { steps:[{from,to,die}], final:Int8Array, off, puissance } */
function genMoves(st, me, d1, d2) {
  const m0 = st.b[me], th = st.b[1 - me];
  const thAt = t => th[25 - t];
  const blocked = blockedFn(st, me);
  const out = [];
  const orders = d1 === d2 ? [[d1, d2]] : [[d1, d2], [d2, d1]];
  const m = Int8Array.from(m0);
  let off = st.off[me];

  function finish(steps, flags) {
    if (flags.pendingTake || flags.pendingLeave) return;
    if (steps.length === 0) return;
    out.push({ steps, final: Int8Array.from(m), off, puissance: false });
  }
  function rec(dice, idx, steps, flags) {
    if (idx === dice.length) { finish(steps, flags); return; }
    const die = dice[idx];
    let any = false;
    for (let from = 1; from <= 24; from++) {
      if (m[from] === 0) continue;
      if (flags.pendingLeave && from !== COIN) continue;
      const to = stepDest(m, off, blocked, from, die, flags);
      if (!to) continue;
      if (flags.pendingTake && to !== COIN) continue;
      const nf = { pendingTake: to === COIN && m[COIN] === 0, pendingLeave: from === COIN && m[COIN] === 2 };
      m[from]--; if (to === OFF) off++; else m[to]++;
      any = true;
      rec(dice, idx + 1, steps.concat([{ from, to, die }]), nf);
      m[from]++; if (to === OFF) off--; else m[to]--;
    }
    if (!any) finish(steps, flags);
  }
  for (const dice of orders) rec(dice, 0, [], { pendingTake: false, pendingLeave: false });

  let maxLen = 0;
  for (const mv of out) if (mv.steps.length > maxLen) maxLen = mv.steps.length;
  const moves = out.filter(mv => mv.steps.length === maxLen);

  /* Prise de coin par puissance : coin vide, coin adverse vide, deux dames
     pourraient (fictivement) atteindre le coin adverse, et la prise naturelle
     est impossible avec ce coup. */
  if (m0[COIN] === 0 && thAt(ADV_COIN) === 0) {
    const ok = d1 !== d2 ? (m0[13 - d1] > 0 && m0[13 - d2] > 0) : m0[13 - d1] >= 2;
    const natural = moves.some(mv => mv.final[COIN] >= 2);
    if (ok && !natural) {
      const f = Int8Array.from(m0); f[13 - d1]--; f[13 - d2]--; f[COIN] += 2;
      moves.push({
        steps: [{ from: 13 - d1, to: COIN, die: d1 }, { from: 13 - d2, to: COIN, die: d2 }],
        final: f, off: st.off[me], puissance: true,
      });
    }
  }

  /* Remplir est obligatoire quand on le peut : on ne garde que les coups qui font
     le plus de pleins (prise du coin par puissance comprise). */
  let res = moves;
  const nf = res.map(mv => pleinsFaits(m0, mv.final));
  const best = Math.max(0, ...nf);
  if (best) res = res.filter((mv, i) => nf[i] === best);
  /* Sortir toutes ses dames, quand on le peut, se marque au jet : le coup doit le faire. */
  if (res.some(mv => mv.off === 15)) res = res.filter(mv => mv.off === 15);
  /* On doit conserver ses pleins quand on le peut : on garde les coups qui en conservent le plus. */
  const nc = res.map(mv => pleinsConserves(m0, mv.final));
  const bestC = Math.max(0, ...nc);
  if (bestC) res = res.filter((mv, i) => nc[i] === bestC);
  /* (option) La pile de misère qui compte se marque au jet : le coup doit la faire. */
  if (st.opts.pile && pileFaite(m0, res)) res = res.filter(mv => mv.final[COIN] === 15);
  return res;
}

/* ---------- Pile de misère (option) ----------
   Toutes ses dames empilées sur son coin faute de pouvoir passer au retour. Elle ne compte
   pas si le même coup permet de passer une dame au jeu de retour (ce qui couvre aussi la
   pile « en passant », rompue par le second dé). */
function passeAuRetour(mv) { return mv.steps.some(s => s.to > COIN); }
function pileFaite(m0, moves) {
  return m0[COIN] < 15 && moves.some(mv => mv.final[COIN] === 15) && !moves.some(passeAuRetour);
}
/* Les dames hors du coin pourraient-elles toutes y arriver d'un seul jet (deux au plus,
   aucune passée au retour ni sortie) ? Filtre rapide avant de calculer les coups. */
function presDeLaPile(m, off) {
  if (off) return false;
  let n = 0;
  for (let p = 1; p <= 24; p++) {
    if (p === COIN || !m[p]) continue;
    if (p > COIN) return false;
    n += m[p];
  }
  return n >= 1 && n <= 2;
}

/* Manières de remplir chaque jan avec les dés d1,d2 (le plein se marque au jet,
   une fois par manière). Une manière : les dames qui viennent garnir les flèches
   manquantes, chacune par un dé ou tout d'une. moves : coups légaux (vérification
   exacte) ; si null, vérification approchée. Renvoie [{ jan, n }]. */
function pleinWays(st, me, d1, d2, moves) {
  const m = st.b[me], dbl = d1 === d2;
  const blocked = blockedFn(st, me);
  const res = [];
  for (const key in JANS) {
    const jan = JANS[key];
    if (isPlein(m, key)) continue;
    const need = [];
    for (const q of jan) for (let k = m[q]; k < 2; k++) need.push(q);
    if (need.length > 2) continue;
    /* candidats : listes de trajets { from, to, dice } */
    const cands = [];
    if (need.length === 1) {
      const q = need[0];
      for (const d of dbl ? [d1] : [d1, d2]) cands.push([{ from: q - d, to: q, dice: [d] }]);
      cands.push([{ from: q - d1 - d2, to: q, dice: [d1, d2] }]);
    } else {
      const [q, r] = need;
      cands.push([{ from: q - d1, to: q, dice: [d1] }, { from: r - d2, to: r, dice: [d2] }]);
      if (!dbl && q !== r) cands.push([{ from: q - d2, to: q, dice: [d2] }, { from: r - d1, to: r, dice: [d1] }]);
    }
    let n = 0;
    for (const T of cands) {
      if (T.some(t => t.from < 1) || !sourcesOk(m, jan, T)) continue;
      if (moves ? moves.some(mv => !mv.puissance && isPlein(mv.final, key) && realizes(mv.steps, T))
                : pathsOk(blocked, T)) n++;
    }
    /* prise du coin par puissance (offerte seulement si la prise naturelle est impossible) */
    if (moves && moves.some(mv => mv.puissance && isPlein(mv.final, key))) n++;
    if (n) res.push({ jan: key, n });
  }
  return res;
}
function stepIs(s, t) { return s.from === t.from && s.to === t.to && s.die === t.dice[0]; }
function realizes(S, T) {
  if (T.length === 2) {
    return S.length === 2 && T.every(t => t.dice.length === 1)
      && ((stepIs(S[0], T[0]) && stepIs(S[1], T[1])) || (stepIs(S[0], T[1]) && stepIs(S[1], T[0])));
  }
  const t = T[0];
  if (t.dice.length === 1) return S.some(s => stepIs(s, t));
  return S.length === 2 && S[0].from === t.from && S[0].to === S[1].from && S[1].to === t.to;
}
/* Les dames qui remplissent existent et ne dégarnissent ni le jan ni le coin. */
function sourcesOk(m, jan, T) {
  const use = new Map();
  for (const t of T) use.set(t.from, (use.get(t.from) || 0) + 1);
  for (const [p, k] of use) {
    if (m[p] < k) return false;
    if (jan.includes(p) && m[p] - k < 2) return false;
    if (p === COIN && m[COIN] - k === 1) return false;
  }
  return true;
}
function pathsOk(blocked, T) {
  for (const t of T) {
    if (blocked(t.to)) return false;
    if (t.dice.length === 2) {
      const ok = v => v !== ADV_COIN && !blocked(v);
      if (!ok(t.from + t.dice[0]) && !ok(t.from + t.dice[1])) return false;
    }
  }
  return true;
}

function dedupeMoves(moves) {
  const seen = new Set(), res = [];
  for (const mv of moves) {
    const k = mv.final.join(',') + '|' + mv.off;
    if (!seen.has(k)) { seen.add(k); res.push(mv); }
  }
  return res;
}

/* Vérification rapide (approximative) : un dé est-il jouable ? */
function canPlayDie(st, me, d) {
  const m = st.b[me];
  const blocked = blockedFn(st, me);
  const flags = { pendingTake: true, pendingLeave: true };
  for (let from = 1; from <= 24; from++) {
    if (m[from] === 0) continue;
    if (from === COIN && m[COIN] < 3) continue;
    const to = stepDest(m, st.off[me], blocked, from, d, flags);
    if (to && !(to === COIN && m[COIN] < 2)) return true;
  }
  return false;
}

/* Événements marqués au moment du jet de dés (avant de jouer).
   moves : coups légaux (pour le jan qui ne peut) ; si null, approximation rapide.
   Chaque événement : { kind, who (bénéficiaire), by (joueur qui a jeté), pts, ... } */
function rollEvents(st, me, d1, d2, moves) {
  const ev = [];
  const m = st.b[me], th = st.b[1 - me];
  const thAt = t => th[25 - t];
  const dbl = d1 === d2;
  const opp = 1 - me;
  /* Les deux premières dames du coin peuvent battre une dame, mais pas le coin adverse. */
  const canLeave = p => p !== COIN || m[COIN] >= 3;
  /* Case de repos d'un battage tout d'une : à vrai si elle n'est pas tenue par
     l'adversaire (vide, à soi, ou portant une seule dame adverse) ; le coin adverse
     compte s'il est libre. */
  const passable = i => thAt(i) <= 1;

  /* Battre une dame découverte */
  for (let t = 1; t <= 24; t++) {
    if (t === ADV_COIN || thAt(t) !== 1) continue;
    const pts = t >= 19 ? (dbl ? 6 : 4) : (dbl ? 4 : 2);
    const dies = dbl ? [d1] : [d1, d2];
    for (const d of dies) {
      const p = t - d;
      if (p >= 1 && m[p] > 0) ev.push({ kind: 'battre', who: me, by: me, pts, t, d, from: p });
    }
    const p = t - d1 - d2;
    if (p >= 1 && m[p] > 0) {
      const via = passable(p + d1) ? p + d1 : (!dbl && passable(p + d2)) ? p + d2 : 0;
      if (via) ev.push({ kind: 'battre', who: me, by: me, pts, t, tout: true, d1, d2, from: p, via });
      else ev.push({ kind: 'faux', who: opp, by: me, pts, t, d1, d2, from: p });
    }
  }
  /* Battre le coin adverse : il faut avoir son propre coin, et les deux premières
     dames du coin ne peuvent y servir (seules les surnuméraires comptent). */
  if (thAt(ADV_COIN) === 0 && m[COIN] >= 2) {
    const a = 13 - d1, b = 13 - d2;
    const ok = dbl ? (a === COIN ? m[COIN] >= 4 : m[a] >= 2)
                   : (m[a] > 0 && m[b] > 0 && canLeave(a) && canLeave(b));
    if (ok) ev.push({ kind: 'coin', who: me, by: me, pts: dbl ? 6 : 4, from: [a, b] });
  }
  /* Jan de deux tables / contre-jan */
  if (m[TALON] === 13 && m[COIN] === 0 && st.off[me] === 0) {
    const pos = [];
    for (let p = 2; p <= 24; p++) for (let k = 0; k < m[p]; k++) pos.push(p);
    if (pos.length === 2) {
      const [a, b] = pos;
      /* [dame allant à son coin, dame allant au coin adverse, dé de la première, dé de la seconde] */
      const hit = [[a, b, d1, d2], [b, a, d1, d2], [a, b, d2, d1], [b, a, d2, d1]]
        .find(([x, y, dx, dy]) => x + dx === COIN && y + dy === ADV_COIN);
      if (hit) {
        const paths = [[hit[0], COIN], [hit[1], ADV_COIN]];
        if (thAt(ADV_COIN) === 0) ev.push({ kind: 'deuxtables', who: me, by: me, pts: dbl ? 6 : 4, paths });
        else ev.push({ kind: 'contre-deuxtables', who: opp, by: me, pts: dbl ? 6 : 4, paths });
      }
    }
  }
  /* Jan de mézéas / contre-jan */
  if (m[TALON] === 13 && m[COIN] === 2 && (d1 === 1 || d2 === 1)) {
    const pts = dbl ? 6 : 4;
    if (thAt(ADV_COIN) === 0) ev.push({ kind: 'mezeas', who: me, by: me, pts });
    else ev.push({ kind: 'contre-mezeas', who: opp, by: me, pts });
  }
  /* Jan de six tables : au troisième jet de la relevée, les six dés des trois premiers
     jets font 1, 2, 3, 4, 5 et 6. Il se marque par puissance, quel que soit le coup joué. */
  const l = st.lances[me];
  if (l.length === 4 && new Set([...l, d1, d2]).size === 6) ev.push({ kind: 'six', who: me, by: me, pts: 4 });
  /* Pleins : une fois par manière de remplir */
  for (const { jan, n } of pleinWays(st, me, d1, d2, moves)) {
    ev.push({ kind: 'plein', who: me, by: me, pts: n * (dbl ? 6 : 4), jan, n });
  }
  /* Pleins conservés : le coup peut se jouer sans les rompre (ou ne peut pas se jouer) */
  for (const key in JANS) {
    if (!isPlein(m, key)) continue;
    const ok = moves ? (moves.length === 0 || moves.some(mv => isPlein(mv.final, key)))
                     : (dbl ? [d1] : [d1, d2]).every(d => !canPlayDie(st, me, d) || canPlayDieKeeping(st, me, d, key));
    if (ok) ev.push({ kind: 'conserve', who: me, by: me, pts: dbl ? 6 : 4, jan: key });
  }
  optionEvents(st, me, d1, d2, moves, ev);
  /* Sortie de toutes ses dames */
  const sortie = moves ? moves.some(mv => mv.off === 15) : canSortir(st, me, d1, d2);
  if (sortie) ev.push({ kind: 'sortie', who: me, by: me, pts: dbl ? 6 : 4 });
  /* Jan qui ne peut (pas quand la dernière dame sort : le dé restant n'a plus d'emploi) */
  if (sortie) return ev;
  let maxLen;
  if (moves) {
    maxLen = 0;
    for (const mv of moves) if (mv.steps.length > maxLen) maxLen = mv.steps.length;
  } else {
    maxLen = (canPlayDie(st, me, d1) ? 1 : 0) + (canPlayDie(st, me, d2) ? 1 : 0);
  }
  const unplayed = 2 - maxLen;
  if (unplayed > 0) ev.push({ kind: 'nepeut', who: opp, by: me, pts: unplayed * (dbl ? 3 : 2), n: unplayed });
  return ev;
}

/* Jans optionnels marqués au jet. */
function optionEvents(st, me, d1, d2, moves, ev) {
  const o = st.opts;
  const m = st.b[me], th = st.b[1 - me];
  const thAt = t => th[25 - t];
  const dbl = d1 === d2, opp = 1 - me;
  /* Jan de rencontre : au tout premier jet du second joueur de la partie, le même jet que
     le premier joueur (même simple ou même doublet) lui vaut 4 points (6 par doublet). */
  const pj = st.premiersJets;
  if (o.rencontre && pj.length === 1 && pj[0].by !== me) {
    const [a, b] = pj[0].dice;
    if ((a === d1 && b === d2) || (a === d2 && b === d1)) ev.push({ kind: 'rencontre', who: me, by: me, pts: dbl ? 6 : 4 });
  }
  /* Pile de misère : la faire (si elle compte), ou la conserver faute de pouvoir jouer. */
  if (o.pile && st.off[me] === 0) {
    if (m[COIN] === 15) {
      const bloque = moves ? moves.length === 0 : !canPlayDie(st, me, d1) && !canPlayDie(st, me, d2);
      if (bloque) ev.push({ kind: 'pile-conserve', who: me, by: me, pts: dbl ? 6 : 4 });
    } else if (presDeLaPile(m, 0)) {
      /* coups exacts, même pour l'IA : la situation est rare */
      if (pileFaite(m, moves || genMoves(st, me, d1, d2))) ev.push({ kind: 'pile', who: me, by: me, pts: dbl ? 6 : 4 });
    }
  }
  /* Margot la fendue : une dame pourrait venir sur une flèche vide entre deux dames seules
     de l'adversaire. L'adversaire marque 2 points (4 par doublet) par manière (par l'un ou
     l'autre dé, ou tout d'une), seulement à vrai : la case de repos doit être libre. */
  if (o.margot) {
    const passable = i => thAt(i) <= 1;
    const pts = dbl ? 4 : 2;
    for (let t = 2; t <= 23; t++) {
      if (t === COIN || t === ADV_COIN || m[t] || thAt(t) || thAt(t - 1) !== 1 || thAt(t + 1) !== 1) continue;
      for (const d of dbl ? [d1] : [d1, d2]) {
        const p = t - d;
        if (p >= 1 && m[p] > 0) ev.push({ kind: 'margot', who: opp, by: me, pts, t, d, from: p });
      }
      const p = t - d1 - d2;
      if (p >= 1 && m[p] > 0) {
        const via = passable(p + d1) ? p + d1 : (!dbl && passable(p + d2)) ? p + d2 : 0;
        if (via) ev.push({ kind: 'margot', who: opp, by: me, pts, t, tout: true, d1, d2, from: p, via });
      }
    }
  }
}

/* Approximation rapide : les deux dés suffisent-ils à sortir les dernières dames ? */
function canSortir(st, me, d1, d2) {
  const m = st.b[me], off = st.off[me];
  if (off < 13 || !allInLast(m, off)) return false;
  const pos = [];
  for (let p = 19; p <= 24; p++) for (let k = 0; k < m[p]; k++) pos.push(p);
  if (pos.length === 1) return pos[0] + Math.max(d1, d2) >= OFF;
  const [a, b] = pos, hi = Math.max(d1, d2), lo = Math.min(d1, d2);
  return b + hi >= OFF && a + lo >= OFF || a + hi >= OFF && b + lo >= OFF;
}

/* Vérification rapide (approximative) : le dé d se joue-t-il sans rompre le plein du jan key ? */
function canPlayDieKeeping(st, me, d, key) {
  const m = st.b[me], jan = JANS[key];
  const blocked = blockedFn(st, me);
  const flags = { pendingTake: true, pendingLeave: true };
  for (let from = 1; from <= 24; from++) {
    if (m[from] === 0 || (jan.includes(from) && m[from] < 3)) continue;
    if (from === COIN && m[COIN] < 3) continue;
    const to = stepDest(m, st.off[me], blocked, from, d, flags);
    if (to && !(to === COIN && m[COIN] < 2)) return true;
  }
  return false;
}

/* Mémorise les dés des trois premiers jets de la relevée (jan de six tables). */
function noteLance(st, me, d1, d2) {
  if (st.lances[me].length < 6) st.lances[me].push(d1, d2);
  if (st.premiersJets.length < 2) st.premiersJets = st.premiersJets.concat([{ by: me, dice: [d1, d2] }]);
}

/* Applique un coup (simulation, sans les points) et renvoie un nouvel état. */
function applyMoveSim(st, me, mv) {
  const s = cloneState(st);
  s.b[me] = Int8Array.from(mv.final);
  s.off[me] = mv.off;
  return s;
}

function netEvents(events, me) {
  let s = 0;
  for (const e of events) s += e.who === me ? e.pts : -e.pts;
  return s;
}

/* Marque des points pour who ; gère les trous et la bredouille.
   Un trou efface les points de l'adversaire : le décompte du trou suivant repart
   donc en bredouille. Renvoie la liste des trous marqués ({who, bredouille, effaces}). */
function addPoints(st, who, pts) {
  const opp = 1 - who;
  const trous = [];
  if (pts <= 0) return trous;
  if (st.points[who] === 0) st.bredouille[who] = true;
  st.bredouille[opp] = false;
  st.points[who] += pts;
  while (st.points[who] >= 12) {
    st.points[who] -= 12;
    const br = st.bredouille[who];
    st.trous[who] += br ? 2 : 1;
    st.trouPending[who]++;
    trous.push({ who, bredouille: br, effaces: st.points[opp] });
    st.points[opp] = 0;
    st.bredouille[who] = true;
  }
  return trous;
}

function applyEvents(st, events) {
  const notes = [];
  for (const e of events) {
    const trous = addPoints(st, e.who, e.pts);
    notes.push({ event: e, trous });
  }
  return notes;
}

function gameOver(st) {
  return st.trous[0] >= TROUS_PARTIE || st.trous[1] >= TROUS_PARTIE;
}

/* Texte d'un événement, flèches exprimées dans la numérotation de Blanc. */
function describeEvent(e) {
  const M = PLAYER_NAMES[e.by];
  const P = t => (e.by === WHITE ? t : 25 - t);
  switch (e.kind) {
    case 'battre':
      return e.tout
        ? `${M} bat la dame en ${P(e.t)} tout d'une (${e.d1}+${e.d2})`
        : `${M} bat la dame en ${P(e.t)} par ${e.d}`;
    case 'faux': return `${M} bat à faux la dame en ${P(e.t)} (passage barré)`;
    case 'coin': return `${M} bat le coin adverse`;
    case 'deuxtables': return `${M} fait un jan de deux tables`;
    case 'contre-deuxtables': return `${M} fait un contre-jan de deux tables`;
    case 'mezeas': return `${M} fait un jan de mézéas`;
    case 'contre-mezeas': return `${M} fait un contre-jan de mézéas`;
    case 'nepeut': return `${M} : jan qui ne peut (${e.n === 2 ? 'aucun dé jouable' : 'un dé injouable'})`;
    case 'plein': return `${M} remplit son ${JAN_LABEL[e.jan]}${e.n > 1 ? ` (${e.n} manières)` : ''}`;
    case 'conserve': return `${M} conserve le plein de son ${JAN_LABEL[e.jan]}`;
    case 'six': return `${M} fait un jan de six tables`;
    case 'sortie': return `${M} a sorti toutes ses dames`;
    case 'rencontre': return `${M} fait un jan de rencontre (même jet que l'adversaire au premier coup)`;
    case 'pile': return `${M} fait la pile de misère`;
    case 'pile-conserve': return `${M} conserve la pile de misère`;
    case 'margot': return e.tout
      ? `${M} peut visiter Margot la fendue en ${P(e.t)} tout d'une (${e.d1}+${e.d2})`
      : `${M} peut visiter Margot la fendue en ${P(e.t)} par ${e.d}`;
  }
  return e.kind;
}

if (typeof module !== 'undefined') {
  module.exports = { WHITE, BLACK, TALON, COIN, ADV_COIN, OFF, PLAYER_NAMES, JANS, JAN_LABEL, TROUS_PARTIE, DEFAULT_OPTS, pileFaite,
    newState, resetRelevee, cloneState, allInLast, isPlein, pleinsFaits, pleinsConserves, canStillFill, blockedFn, genMoves,
    dedupeMoves, canPlayDie, canPlayDieKeeping, pleinWays, canSortir, rollEvents, noteLance, applyMoveSim, netEvents, addPoints, applyEvents, gameOver, describeEvent };
}
