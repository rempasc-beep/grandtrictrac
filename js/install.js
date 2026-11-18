'use strict';
/* ============================================================
   Application installable (PWA) : service worker (jeu hors connexion) et fenêtre
   proposant l'installation à l'ouverture, dans le navigateur seulement.
   - Chrome, Edge, Samsung Internet… : le navigateur annonce que le site est installable
     (beforeinstallprompt) ; le bouton « Installer » ouvre sa fenêtre d'installation.
   - iPhone et iPad : pas d'installation par script ; la fenêtre explique le chemin
     Partager > Sur l'écran d'accueil.
   - Ailleurs (Firefox, Safari sur Mac), rien n'est proposé.
   « Plus tard » (ou Échap, ou un clic à côté) ne repropose rien pendant une semaine.
   ============================================================ */
(function () {
  const LATER_KEY = 'trictrac.installLater';
  const LATER_MS = 7 * 24 * 3600 * 1000;

  if ('serviceWorker' in navigator && location.protocol !== 'file:')
    navigator.serviceWorker.register('sw.js').catch(() => { /* pas de hors connexion, le jeu marche quand même */ });

  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function postponed() {
    try { return Date.now() - (parseInt(localStorage.getItem(LATER_KEY), 10) || 0) < LATER_MS; }
    catch (e) { return false; }
  }

  const box = document.getElementById('install');
  const isOpen = () => !box.classList.contains('hidden');
  let deferred = null;   // événement beforeinstallprompt gardé pour le bouton « Installer »
  let offered = false;   // proposé une seule fois par ouverture du jeu

  function show(mode) {
    if (offered || installed() || postponed()) return;
    offered = true;
    box.dataset.mode = mode;
    box.classList.remove('hidden');
    document.getElementById(mode === 'ios' ? 'btn-install-ok' : 'btn-install').focus();
  }
  function hide(later) {
    box.classList.add('hidden');
    if (later) { try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch (e) { /* stockage indisponible */ } }
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();          // notre fenêtre remplace le bandeau du navigateur
    deferred = e;
    show('prompt');
  });
  window.addEventListener('appinstalled', () => { deferred = null; hide(false); });

  document.getElementById('btn-install').addEventListener('click', () => {
    hide(false);
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(c => { if (c.outcome !== 'accepted') hide(true); }).catch(() => {});
    deferred = null;             // un événement ne sert qu'une fois
  });
  document.getElementById('btn-install-later').addEventListener('click', () => hide(true));
  document.getElementById('btn-install-ok').addEventListener('click', () => hide(true));
  box.addEventListener('click', e => { if (e.target === box) hide(true); });

  /* Tant que la fenêtre est ouverte, Échap la ferme et Espace n'atteint pas le jeu
     (il active le bouton qui a le focus au lieu de lancer les dés). */
  window.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { hide(true); e.stopPropagation(); }
    else if (e.code === 'Space' || e.key === ' ') e.stopPropagation();
  }, true);

  /* Sur iPhone et iPad, la fenêtre vient juste après l'écran d'accueil. */
  if (isIos && !installed()) setTimeout(() => show('ios'), 900);
})();
