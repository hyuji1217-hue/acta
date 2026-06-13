self.addEventListener('push', e => {
  let data = {};
  try { data = e.data?.json() ?? {}; } catch { data = { title: e.data?.text() ?? '通知' }; }
  e.waitUntil(
    self.registration.showNotification(data.title ?? '通知', {
      body: data.body ?? '',
      tag: data.tag ?? 'acta',
      icon: '/acta/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const actaClient = list.find(c => c.url.includes('/acta'));
      if (actaClient) return actaClient.focus();
      return clients.openWindow('/acta/');
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
