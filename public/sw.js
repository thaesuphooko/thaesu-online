self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Thaesu Online update',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Thaesu Online', options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(clients.openWindow(url));
});
