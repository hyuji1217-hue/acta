// 20260623131306 は deploy.sh が埋め込む（例: 20260622181500）
// デプロイのたびにキャッシュ名が変わり、古いキャッシュが自動削除される
const CACHE_NAME = 'acta-v20260623131306';

self.addEventListener('install', e => {
  // 新しいSWを即座にアクティブにする（待機なし）
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/', '/index.html']))
  );
});

self.addEventListener('activate', e => {
  // バージョンが違う古いキャッシュをすべて削除
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('acta-v') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // index.html（ナビゲーションリクエスト）はネットワーク優先
  // デプロイ後に最新HTMLが即反映される。オフライン時のみキャッシュ使用。
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
});

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
