// public/sw.js — Service Worker untuk Web Push Notification MBG-Track
const CACHE_NAME = 'mbg-track-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// ── Push Notification Handler ─────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch (_) { data = { title: 'MBG-Track', body: event.data.text() }; }

  const options = {
    body: data.body || '',
    icon: data.icon || '/logo-bgn.png',
    badge: data.badge || '/logo-bgn.png',
    tag: data.tag || 'mbg-track',
    data: data.data || {},
    requireInteraction: false,
    actions: [],
    vibrate: [200, 100, 200],
  };

  // Tambahkan aksi berdasarkan tipe notifikasi
  if (data.tag === 'order_submitted') {
    options.actions = [{ action: 'view', title: 'Lihat Dashboard' }];
  }
  if (data.tag === 'order_delivered' || data.tag === 'delivery_proof') {
    options.actions = [{ action: 'view_proof', title: 'Lihat Bukti Foto' }];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'MBG-Track', options)
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let url = '/';
  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'view' || action === '') {
    url = '/dashboard/admin';
  } else if (action === 'view_proof' && data.orderId) {
    url = `/dashboard/admin?proof=${data.orderId}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url, data });
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
