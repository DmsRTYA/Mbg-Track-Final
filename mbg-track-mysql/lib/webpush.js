// lib/webpush.js — Push Notification and Database helper
const webpush = require('web-push');

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@mbg.go.id',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[WebPush] VAPID keys not set. Push notifications will not be sent.');
}

/**
 * Simpan notifikasi ke database dan kirim Web Push
 */
async function notify(prisma, userId, title, body, type, data = {}) {
  try {
    // 1. Simpan ke DB
    await prisma.notification.create({
      data: { userId, title, body, type, data: JSON.stringify(data) }
    });
    console.log(`[Notif] Tersimpan di DB untuk user ${userId.slice(0, 8)}: ${type}`);

    // 2. Kirim Web Push ke semua langganan user ini
    const subs = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subs.length > 0 && process.env.VAPID_PUBLIC_KEY) {
      const payload = JSON.stringify({
        title,
        body,
        tag: type,
        data,
        icon: '/logo-bgn.png',
        badge: '/logo-bgn.png'
      });

      const pushPromises = subs.map(sub => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        return webpush.sendNotification(pushSubscription, payload)
          .catch(async (err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              console.log(`[WebPush] Langganan kedaluwarsa, menghapus endpoint: ${sub.endpoint}`);
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            } else {
              console.error('[WebPush] Gagal mengirim ke endpoint:', err.message);
            }
          });
      });

      await Promise.all(pushPromises);
      console.log(`[WebPush] Terkirim ke ${subs.length} perangkat untuk user ${userId.slice(0, 8)}`);
    }

  } catch (err) {
    console.error(`[Notif] Gagal simpan/kirim untuk user ${userId.slice(0, 8)}:`, err.message);
  }
}

/**
 * Simpan notifikasi untuk semua user dengan role tertentu
 */
async function notifyRole(prisma, role, title, body, type, data = {}) {
  const users = await prisma.user.findMany({ where: { role } });
  if (users.length === 0) {
    console.log(`[Notif] Tidak ada user dengan role ${role}`);
    return [];
  }
  return Promise.all(users.map(u => notify(prisma, u.id, title, body, type, data)));
}

module.exports = { notify, notifyRole };
