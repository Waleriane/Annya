/* ANYA — motor do app (funciona offline e recebe notificações) */
const VERSAO = 'anya-v1';
const BASICO = ['./', './index.html', './anya-portal.html', './anya-192.png', './portal-192.png', './selo-notificacao.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => Promise.all(BASICO.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // Supabase e fontes: sempre direto da internet
  if (req.mode === 'navigate'){                           // páginas: sempre a versão mais nova; sem internet, a guardada
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match(url.pathname.includes('portal') ? './anya-portal.html' : './index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(g => {
    const rede = fetch(req).then(r => { if (r.ok){ const c = r.clone(); caches.open(VERSAO).then(x => x.put(req, c)); } return r; }).catch(() => g);
    return g || rede;
  }));
});

/* Notificação chegando do servidor */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo:'ANYA', texto:e.data && e.data.text() }; }
  const portal = String(d.url || '').includes('portal');
  e.waitUntil(self.registration.showNotification(d.titulo || 'ANYA', {
    body:d.texto || '',
    icon:portal ? './portal-192.png' : './anya-192.png',
    badge:'./selo-notificacao.png',
    tag:d.tag || undefined,
    data:{ url:d.url || './' },
    vibrate:[80, 40, 80]
  }));
});

/* Tocou na notificação: abre o app na tela certa */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL(e.notification.data?.url || './', self.location.origin).href;
  const pagina = destino.split('#')[0];
  e.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(lista => {
    const aberta = lista.find(c => c.url.split('#')[0] === pagina);
    if (aberta){ aberta.navigate(destino).catch(() => {}); return aberta.focus(); }
    return self.clients.openWindow(destino);
  }));
});
