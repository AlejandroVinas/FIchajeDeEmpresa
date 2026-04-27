// Service Worker — maneja notificaciones push en segundo plano

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try   { payload = event.data.json(); }
  catch { payload = { title: 'Fichaje', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:     payload.body,
      icon:     payload.icon || '/icon.png',
      badge:    '/icon.png',
      vibrate:  [200, 100, 200],
      tag:      'fichaje',
      renotify: true,
      data:     { url: self.location.origin },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      const abierto = lista.find(c => c.url.includes(self.location.origin));
      if (abierto) return abierto.focus();
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
