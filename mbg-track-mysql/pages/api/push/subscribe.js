// pages/api/push/subscribe.js
import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  // POST — simpan subscription baru
  if (req.method === 'POST') {
    const { userId, endpoint, p256dh, auth, userAgent } = req.body;
    if (!userId || !endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'userId, endpoint, p256dh, auth wajib.' });
    }
    try {
      // Upsert berdasarkan endpoint (satu endpoint = satu subscription)
      const existing = await prisma.pushSubscription.findFirst({ where: { endpoint } });
      let sub;
      if (existing) {
        sub = await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: { p256dh, auth, userId, userAgent: userAgent || null },
        });
      } else {
        sub = await prisma.pushSubscription.create({
          data: { userId, endpoint, p256dh, auth, userAgent: userAgent || null },
        });
      }
      return res.status(200).json({ message: 'Subscription disimpan.', sub });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // DELETE — hapus subscription
  if (req.method === 'DELETE') {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint wajib.' });
    try {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
      return res.status(200).json({ message: 'Subscription dihapus.' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
