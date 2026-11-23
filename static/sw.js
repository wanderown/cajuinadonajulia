// Cajuína Dona Júlia · service worker
// 1) guarda o app no aparelho para abrir sem internet  2) recebe notificações com o app fechado
const C = 'caju-v7';
const ARQS = ['/', '/cliente', '/static/style.css', '/static/app.js', '/static/logo.png', '/static/logo-contorno.png',
  '/static/icon-192.png', '/static/fotos/cajuina-300.jpg', '/static/fotos/cajuina-500.jpg', '/static/fotos/castanha.jpg',
  '/static/fotos/doce.jpg', '/static/fotos/estande.jpg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => Promise.all(ARQS.map(a => c.add(a).catch(() => null)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api')) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(async () => (await caches.match(e.request, { ignoreSearch: u.pathname.startsWith('/static') }))
    || (e.request.mode === 'navigate' ? caches.match(u.pathname.startsWith('/cliente') ? '/cliente' : '/') : Response.error())));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { t: 'Cajuína Dona Júlia', b: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.t || 'Cajuína Dona Júlia', {
    body: d.b || '', icon: '/static/icon-192.png', badge: '/static/badge.png', tag: d.tag || undefined, renotify: !!d.tag,
    data: { u: d.u || '/' }, vibrate: [120, 60, 120]
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL(e.notification.data && e.notification.data.u || '/', location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (new URL(w.url).pathname === new URL(alvo).pathname && 'focus' in w) { w.navigate(alvo).catch(() => { }); return w.focus(); }
    return self.clients.openWindow(alvo);
  }));
});
