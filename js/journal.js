'use strict';
/* ============================================================
   Journal de la partie (bouton en haut à droite du tablier).
   Chaque coup (un jet de dés et son jeu ; au trictrac, le « tour » est la partie entière) y est inscrit quand il se termine : joueur, dés, points du jet (événements
   des règles, pour chaque joueur), coup joué, marque et trous, départ (s'en aller) et, avec les
   écoles, les erreurs de marque des deux joueurs.
   L'œil d'un tour ouvre la visionneuse : le tablier de ce tour, en deux vues —
   « Jet et points » : la position au moment du jet, les dés et les indicateurs de points
     (flèches des dames battues, cadres des pleins…), comme « Points réels » ;
   « Dames jouées » : la position après le coup, avec les fantômes et les flèches des dames, jetons et
     fichets déplacés, comme avec les écoles.
   Le tour en cours n'y est pas : avec les écoles, il révélerait les points avant la marque.
   Le journal est enregistré dans le navigateur avec la partie, et effacé à la nouvelle partie.
   ============================================================ */
const JOURNAL_KEY = 'trictrac.journal';
const JOURNAL = {
  list: [],        // tours terminés
  cur: null,       // tour en cours (inscrit à sa fin)
  meta: null,      // { mode, swap, ecole } : type de partie, couleurs, écoles de la partie du journal
  idx: null,       // tour affiché dans la visionneuse (null : la liste)
  vue: 'jet',      // vue de la visionneuse : 'jet' ou 'coup'
};

const journalVisible = () => !$('journal').classList.contains('hidden');

/* position et marque d'un état de jeu (sérialisables) */
function jSnap(st) {
  return {
    b: st.b.map(m => Array.from(m)), off: st.off.slice(), points: st.points.slice(), trous: st.trous.slice(),
    bredouille: st.bredouille.slice(), premierTrou: st.premierTrou,
    affilee: st.affilee ? st.affilee.slice() : [false, false],
  };
}
function jMeta() { return { mode: G.partie.mode, swap: G.swap, ecole: G.ecole }; }

/* ---------- Inscription ---------- */
/* nouvelle partie : journal vide */
function journalNouveau() {
  JOURNAL.list = []; JOURNAL.cur = null; JOURNAL.meta = jMeta();
  journalSave();
  journalCacher();
}
/* jet du joueur me (G.dice, G.turnStart, G.rollPts posés) ; un tour en cours non inscrit (partie
   reprise, qui rejoue le jet) est remplacé */
function journalOuvrir(me, events) {
  const P = G.partie;
  JOURNAL.meta = jMeta();
  JOURNAL.cur = {
    who: me, dice: G.dice.slice(), s0: jSnap(G.turnStart), ev: JSON.parse(JSON.stringify(events)),
    pts: G.rollPts.slice(), releve: G.turnStart.releve, mq: ecrire() ? P.fiche.length + 1 : 0, rf: ecrire() ? P.refaits : 0,
    ecole: G.ecole,
  };
}
/* fin du tour : coup joué, position et marque, erreurs ; o.aller : joueur qui s'en va */
function journalFermer(o = {}) {
  const e = JOURNAL.cur;
  if (!e) return;
  JOURNAL.cur = null;
  e.steps = G.prefix.map(s => ({ from: s.from, to: s.to, die: s.die }));
  e.s1 = jSnap(G.st);
  /* déplacements des jetons et fichets : ceux du jeu avec les écoles (chaque acteur à part : marque,
     école, effacement), sinon la marque d'avant et d'après */
  const mt = ecoleOn() ? G.trails.filter(tr => tr.kind !== 'dame').map(tr => ({ kind: tr.kind, c: tr.c, from: tr.from, to: tr.to })) : [];
  e.mt = mt.length ? mt : jMarqueTrails(e.s0, e.s1);
  if (e.ecole !== 'off') {
    e.errs = G.log.slice();
    const cl = G.aiClaim;
    if (cl && cl.m !== cl.T) e.errs.push(t('recapOrdi', cl.m, cl.T, cl.caught));
  }
  if (o.aller === WHITE || o.aller === BLACK) e.aller = o.aller;
  e.n = JOURNAL.list.length + 1;
  JOURNAL.list.push(e);
  journalSave();
  journalMaj();
}
function jMarqueTrails(s0, s1) {
  const out = [];
  for (const c of [BLACK, WHITE]) {
    if (s0.points[c] !== s1.points[c]) out.push({ kind: 'jeton', c, from: s0.points[c], to: s1.points[c] });
    if (s0.trous[c] !== s1.trous[c]) out.push({ kind: 'fichet', c, from: s0.trous[c], to: s1.trous[c] });
  }
  return out;
}
/* fantômes des dames du coup (numérotation de Blanc) : un pas qui prolonge le précédent (même dame,
   tout d'une) allonge sa flèche, comme addDameTrail */
function jDameTrails(e) {
  const out = [];
  e.steps.forEach((s, i) => {
    const from = toWhite(e.who, s.from), to = toWhite(e.who, s.to);
    const prev = out.find(tr => tr.to === from && tr.step === i);
    if (prev) { prev.to = to; prev.step = i + 1; } else out.push({ kind: 'dame', c: e.who, from, to, step: i + 1 });
  });
  return out;
}

/* ---------- Enregistrement ---------- */
function journalSave() {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify({ v: 1, meta: JOURNAL.meta, list: JOURNAL.list })); }
  catch (e) { /* stockage indisponible ou plein : le journal reste en mémoire */ }
}
/* tour enregistré lisible (un journal abîmé est ignoré) */
function jValide(e) {
  const side = c => c === WHITE || c === BLACK, die = n => Number.isInteger(n) && n >= 1 && n <= 6;
  const two = a => Array.isArray(a) && a.length === 2;
  const snap = s => s && two(s.b) && s.b.every(m => Array.isArray(m) && m.length === 25) && [s.off, s.points, s.trous, s.bredouille].every(two);
  return e && side(e.who) && two(e.dice) && e.dice.every(die) && snap(e.s0) && snap(e.s1) && Array.isArray(e.ev) &&
    Array.isArray(e.steps) && Array.isArray(e.mt) && two(e.pts) && (e.errs === undefined || Array.isArray(e.errs));
}
function journalInit() {
  try {
    const d = JSON.parse(localStorage.getItem(JOURNAL_KEY));
    if (d && d.v === 1 && Array.isArray(d.list) && d.list.every(jValide) && d.meta) {
      JOURNAL.list = d.list;
      JOURNAL.meta = { mode: d.meta.mode === 'ecrire' ? 'ecrire' : 'douze', swap: d.meta.swap === true, ecole: d.meta.ecole };
    }
  } catch (e) { /* journal illisible : vide */ }
  const box = $('journal'), close = () => journalCacher();
  $('btn-journal').addEventListener('click', journalMontrer);
  $('btn-journal-close').addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  $('btn-journal-retour').addEventListener('click', () => jListe());
  $('btn-journal-prec').addEventListener('click', () => jVoir(JOURNAL.idx - 1));
  $('btn-journal-suiv').addEventListener('click', () => jVoir(JOURNAL.idx + 1));
  for (const b of document.querySelectorAll('[data-jvue]')) b.addEventListener('click', () => { JOURNAL.vue = b.dataset.jvue; jVoir(JOURNAL.idx); });
  /* clavier : il ne va pas au jeu tant que le journal est ouvert (phase de capture) */
  document.addEventListener('keydown', e => {
    if (!journalVisible()) return;
    const voir = JOURNAL.idx !== null;
    if (e.key === 'Escape') { if (voir) jListe(); else close(); }
    else if (voir && e.key === 'ArrowLeft') jVoir(JOURNAL.idx - 1);
    else if (voir && e.key === 'ArrowRight') jVoir(JOURNAL.idx + 1);
    else if (e.code === 'Space' || e.key === ' ') { /* pas de jeu derrière le journal */ }
    else return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
}

/* ---------- Fenêtre ---------- */
function journalMontrer() {
  $('journal').classList.remove('hidden');
  jListe(true);
}
function journalCacher() {
  JOURNAL.idx = null;
  $('journal').classList.add('hidden');
  const svg = $('journal-board');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}
/* un tour vient d'être inscrit : la liste ouverte se met à jour (la visionneuse, ses flèches) */
function journalMaj() {
  if (!journalVisible()) return;
  if (JOURNAL.idx === null) jListe(true); else jNav();
}
function journalLangue() {
  if (!journalVisible()) return;
  if (JOURNAL.idx === null) jListe(); else jVoir(JOURNAL.idx);
}

/* couleur affichée et nom du camp c dans la partie du journal */
const jSkin = c => (JOURNAL.meta && JOURNAL.meta.swap ? 1 - c : c);
const jNom = c => t(c === G.human ? 'vous' : 'ordi');

/* petit dé (SVG) */
function jDe(n, used) {
  const s = el('svg', { viewBox: '0 0 20 20', class: 'jde' + (used ? ' used' : ''), 'aria-hidden': 'true' });
  el('rect', { x: 1, y: 1, width: 18, height: 18, rx: 4, fill: '#fffaf0', stroke: '#333', 'stroke-width': 1 }, s);
  for (const [dx, dy] of PIPS[n]) el('circle', { cx: 10 + dx * 5, cy: 10 + dy * 5, r: 1.8, fill: '#222' }, s);
  return s;
}
function jDes(e) {
  const span = document.createElement('span');
  span.className = 'jdes';
  span.title = e.dice.join(' – ');
  span.append(jDe(e.dice[0]), jDe(e.dice[1]));
  if (e.dice[0] === e.dice[1]) {
    const d = document.createElement('i');
    d.textContent = t('doublet', e.dice[0]).replace(/\s*!$/, '');
    span.append(d);
  }
  return span;
}
/* pastille de couleur du camp c */
function jPion(c) {
  const s = el('svg', { viewBox: '0 0 20 20', class: 'jpion', 'aria-hidden': 'true' });
  const D = DAME[jSkin(c)];
  el('circle', { cx: 10, cy: 10, r: 8, fill: D.flat, stroke: D.stroke, 'stroke-width': 1.5 }, s);
  el('circle', { cx: 10, cy: 10, r: 3.5, fill: 'none', stroke: D.groove, 'stroke-width': 1 }, s);
  return s;
}
const ICON_OEIL = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1.5 10S5 4.2 10 4.2 18.5 10 18.5 10 15 15.8 10 15.8 1.5 10 1.5 10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.9" fill="currentColor"/></svg>';

/* nom d'un événement des règles (points du jet) */
function jEvLabel(e) {
  const jan = k => t('janNoms')[k] || k;
  switch (e.kind) {
    case 'battre': return t(e.tout ? 'jBattreTout' : 'jBattre');
    case 'faux': return t('jFaux');
    case 'coin': return t('coin');
    case 'deuxtables': return t('deuxTables');
    case 'contre-deuxtables': return t('contreDeuxTables');
    case 'mezeas': return t('mezeas');
    case 'contre-mezeas': return t('contreMezeas');
    case 'six': return t('six');
    case 'plein': return `${t('plein', e.n)} (${jan(e.jan)})`;
    case 'conserve': return `${t('pleinConserve')} (${jan(e.jan)})`;
    case 'sortie': return t('sortie');
    case 'rencontre': return t('rencontre');
    case 'pile': return t('pile');
    case 'pile-conserve': return t('pileConserve');
    case 'margot': return t('margot');
    case 'nepeut': return t('nePeut');
  }
  return e.kind;
}
/* coup joué, dans la numérotation de Blanc (celle de l'aide) : « 1→4→7, 1→5 » */
function jCoupTexte(e) {
  const W = p => (p === OFF ? t('journalSortie') : String(toWhite(e.who, p)));
  const chains = [];
  e.steps.forEach((s, i) => {
    const prev = chains.find(ch => ch.to === s.from && ch.last === i - 1);
    if (prev) { prev.pts.push(s.to); prev.to = s.to; prev.last = i; }
    else chains.push({ pts: [s.from, s.to], to: s.to, last: i });
  });
  return chains.map(ch => ch.pts.map(W).join('→')).join(', ');
}

/* Détail d'un tour : points du jet, coup, marque, départ, erreurs (écoles). Renvoie un fragment. */
function jDetail(e) {
  const frag = document.createDocumentFragment();
  const ligne = (label, cls) => {
    const p = document.createElement('p');
    p.className = 'jl' + (cls ? ' ' + cls : '');
    if (label) { const b = document.createElement('b'); b.textContent = label + t('jSep'); p.append(b); }
    frag.append(p);
    return p;
  };
  /* points du jet, par joueur (celui qui a jeté d'abord) ; un événement amené par l'autre joueur
     (à faux, jan qui ne peut…) le dit entre parenthèses */
  const pts = ligne(e.ecole !== 'off' ? t('journalPointsReels') : t('journalPoints'));
  const parts = [];
  for (const c of [e.who, 1 - e.who]) {
    const evs = e.ev.filter(x => x.who === c);
    if (!evs.length) continue;
    const tot = evs.reduce((a, x) => a + x.pts, 0);
    const s = document.createElement('span');
    s.className = 'jjoueur';
    s.append(jPion(c), `${jNom(c)} +${tot}`);
    /* un même point marqué de plusieurs manières (dames battues…) : « Dame battue ×3 +6 » */
    const groups = new Map();
    for (const x of evs) {
      const label = jEvLabel(x) + (x.by !== c ? ` (${jNom(x.by).toLowerCase()})` : '');
      const g = groups.get(label) || { k: 0, pts: 0 };
      g.k++; g.pts += x.pts;
      groups.set(label, g);
    }
    const det = [...groups].map(([label, g]) => `${label}${g.k > 1 ? ` ×${g.k}` : ''} +${g.pts}`).join(', ');
    parts.push([s, ` (${det})`]);
  }
  if (!parts.length) pts.append(t('journalAucunPoint'));
  parts.forEach((p, i) => { if (i) pts.append(' · '); pts.append(...p); });
  /* coup */
  const coup = ligne(t('journalCoup'));
  if (e.steps.length) coup.append(jCoupTexte(e));
  else coup.append(e.aller !== undefined ? t('journalCoupNonJoue') : t('journalAucunCoup'));
  /* marque à la fin du tour, avec les trous gagnés */
  const mq = ligne(t('journalMarque'));
  [G.human, G.ai].forEach((c, i) => {
    if (i) mq.append(' · ');
    const s = document.createElement('span');
    s.className = 'jjoueur';
    const dt = e.s1.trous[c] - e.s0.trous[c];
    s.append(jPion(c), t('journalMarqueJoueur', jNom(c), e.s1.trous[c], e.s1.points[c]) + (dt ? ` (${dt > 0 ? '+' : ''}${t('journalTrous', dt)})` : ''));
    if (e.s1.bredouille[c] && e.s1.points[c] > 0) s.append(' ', Object.assign(document.createElement('i'), { textContent: t('journalBred') }));
    mq.append(s);
  });
  if (e.aller !== undefined) ligne('', 'jaller').textContent = t(e.aller === G.human ? 'marqueAllerVous' : 'marqueAllerOrdi') + ' ' + t('journalNouvelleReleve');
  else if (e.s1.off[e.who] === 15) ligne('', 'jaller').textContent = t('journalToutSorti', jNom(e.who));
  /* erreurs de marque (écoles) */
  if (e.errs) {
    if (!e.errs.length) ligne(t('journalErreurs'), 'jok').append(t('recapAucune'));
    else for (const s of e.errs) ligne('', 'jerr').textContent = '⚠ ' + s;
  }
  return frag;
}

/* ---------- Liste des tours ---------- */
function jListe(enBas) {
  JOURNAL.idx = null;
  $('journal-box').classList.remove('voir');
  $('journal-liste-vue').classList.remove('hidden');
  $('journal-coup').classList.add('hidden');
  const svg = $('journal-board');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const L = JOURNAL.list, wrap = $('journal-liste');
  const keep = wrap.scrollTop;
  wrap.innerHTML = '';
  $('journal-sub').textContent = L.length ? t('journalSub', L.length) : '';
  if (!L.length) {
    const p = document.createElement('p');
    p.className = 'jvide';
    p.textContent = t('journalVide');
    wrap.append(p);
  }
  let sec = null;
  L.forEach((e, i) => {
    const k = `${e.mq}|${e.rf}|${e.releve}`;
    if (k !== sec) {
      sec = k;
      const h = document.createElement('h3');
      h.className = 'jsection';
      h.textContent = (e.mq ? t('journalMarqueN', e.mq, e.rf) + ' · ' : '') + t('journalReleve', e.releve);
      wrap.append(h);
    }
    const row = document.createElement('div');
    row.className = 'jtour';
    const head = document.createElement('div');
    head.className = 'jtete';
    const num = document.createElement('span');
    num.className = 'jnum';
    num.textContent = t('journalTour', e.n);
    const qui = document.createElement('span');
    qui.className = 'jqui';
    qui.append(jPion(e.who), jNom(e.who));
    head.append(num, qui, jDes(e));
    const voir = document.createElement('button');
    voir.type = 'button';
    voir.className = 'jvoir';
    voir.title = t('journalVoir');
    voir.setAttribute('aria-label', t('journalVoir'));
    voir.innerHTML = ICON_OEIL;
    voir.addEventListener('click', () => jVoir(i));
    head.append(voir);
    const det = document.createElement('div');
    det.className = 'jdet';
    det.append(jDetail(e));
    row.append(head, det);
    wrap.append(row);
  });
  wrap.scrollTop = enBas ? wrap.scrollHeight : keep;
}

/* ---------- Visionneuse ---------- */
function jVoir(i) {
  const L = JOURNAL.list;
  if (i < 0 || i >= L.length) return;
  JOURNAL.idx = i;
  const e = L[i];
  $('journal-box').classList.add('voir');
  $('journal-liste-vue').classList.add('hidden');
  $('journal-coup').classList.remove('hidden');
  const titre = $('journal-coup-titre');
  titre.innerHTML = '';
  const qui = document.createElement('span');
  qui.className = 'jqui';
  qui.append(jPion(e.who), jNom(e.who));
  titre.append(t('journalTour', e.n), ' · ', qui, jDes(e));
  for (const b of document.querySelectorAll('[data-jvue]')) b.setAttribute('aria-pressed', String(b.dataset.jvue === JOURNAL.vue));
  const det = $('journal-detail');
  det.innerHTML = '';
  const sec = document.createElement('p');
  sec.className = 'jsection';
  sec.textContent = (e.mq ? t('journalMarqueN', e.mq, e.rf) + ' · ' : '') + t('journalReleve', e.releve);
  det.append(sec, jDetail(e));
  jNav();
  jDessiner();
}
function jNav() {
  $('btn-journal-prec').disabled = !(JOURNAL.idx > 0);
  $('btn-journal-suiv').disabled = !(JOURNAL.idx < JOURNAL.list.length - 1);
}
/* état de jeu d'un instantané, pour le dessin */
function jEtat(s) {
  const st = newState(G.opts);
  st.b = s.b.map(m => Int8Array.from(m)); st.off = s.off.slice();
  st.points = s.points.slice(); st.trous = s.trous.slice(); st.bredouille = s.bredouille.slice();
  st.premierTrou = s.premierTrou === WHITE || s.premierTrou === BLACK ? s.premierTrou : null;
  st.affilee = s.affilee.slice();
  st.ecrire = JOURNAL.meta.mode === 'ecrire';
  return st;
}
/* Tablier du tour affiché, dessiné par renderBoard dans le SVG du journal : l'état du jeu est
   remplacé le temps du dessin par celui du tour, sans rien de cliquable (phase 'journal'). */
function jDessiner() {
  const e = JOURNAL.list[JOURNAL.idx];
  if (!e) return;
  const keys = ['st', 'dice', 'prefix', 'hints', 'hintsOn', 'trails', 'phase', 'pick', 'mark', 'decl', 'okCallback',
    'selected', 'touched', 'turn', 'swap', 'partie', 'moves'];
  const saved = {};
  for (const k of keys) saved[k] = G[k];
  try {
    Object.assign(G, { phase: 'journal', pick: null, mark: null, decl: null, okCallback: null, selected: null, touched: false,
      turn: e.who, swap: JOURNAL.meta.swap, partie: Object.assign({}, G.partie, { mode: JOURNAL.meta.mode }), dice: e.dice.slice(), moves: [] });
    if (JOURNAL.vue === 'jet') Object.assign(G, { st: jEtat(e.s0), prefix: [], hints: buildHints(e.who, e.ev), hintsOn: true, trails: [] });
    else Object.assign(G, { st: jEtat(e.s1), prefix: e.steps, hints: null, hintsOn: false, trails: [...jDameTrails(e), ...e.mt] });
    renderBoard($('journal-board'));
  } finally {
    Object.assign(G, saved);
  }
}
