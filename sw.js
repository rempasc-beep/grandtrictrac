'use strict';
/* Service worker du Grand Trictrac : le jeu reste jouable hors connexion.
   Le réseau d'abord (une nouvelle version du site s'affiche dès qu'elle est en ligne),
   le cache seulement quand le réseau manque. Les fichiers du jeu sont mis en cache à
   l'installation ; tout fichier du site chargé ensuite l'est aussi.
   Le réseau est interrogé sans le cache HTTP du navigateur (GitHub Pages le garde 10 minutes) :
   sans cela, un téléphone pouvait afficher l'ancienne version longtemps après une mise en ligne. */
const CACHE = 'trictrac-v3';
const FICHIERS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/i18n.js', 'js/rules.js', 'js/ai.js', 'js/ecoles.js', 'js/ecrire.js', 'js/ui.js', 'js/install.js',
  'icons/favicon.svg', 'icons/favicon-32.png', 'icons/apple-touch-icon.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(noms => Promise.all(noms.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req.url, { cache: 'no-cache' })
    .then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
      return rep;
    })
    .catch(() => caches.match(req, { ignoreSearch: true })
      .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
