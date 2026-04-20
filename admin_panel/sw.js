// Service Worker — maneja notificaciones push en segundo plano

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Fichaje', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:     payload.body,
      icon:     payload.icon || '/icon.png',
      badge:    '/icon.png',
      vibrate:  [200, 100, 200],
      tag:      'fichaje',   // agrupa notificaciones del mismo tipo
      renotify: true,        // vibra aunque el tag sea el mismo
      data:     { url: self.location.origin },
    })
  );
});

// Al pulsar la notificación → enfocar o abrir el panel
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((lista) => {
        const panelAbierto = lista.find(c => c.url.includes(self.location.origin));
        if (panelAbierto) return panelAbierto.focus();
        return clients.openWindow(event.notification.data?.url || '/');
      })
  );
});
