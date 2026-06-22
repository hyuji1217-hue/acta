self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'Acta';
  const options = {
    body: data.body || '',
    silent: true,
    tag: data.tag || 'acta',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/' },
  };
  e.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      if (self.navigator?.setAppBadge) {
        self.navigator.setAppBadge(data.badge ?? 1).catch(() => {});
      }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  // バッジはアプリ側で正確なカウントに更新するためここでは消さない
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const c = cs.find(w => w.url.includes('frontend-mu-rosy-92') || w.url.includes('localhost'));
      if (c) return c.focus();
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});
