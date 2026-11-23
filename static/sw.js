// guarda a "casca" do app para abrir sem internet (caixa de feira); dados sempre vêm do servidor
const C = 'caju-v2';
const ARQS = ['/', '/cliente', '/static/style.css', '/static/app.js', '/static/logo.png', '/static/logo-contorno.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(ARQS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api')) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
