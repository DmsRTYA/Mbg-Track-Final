// pages/api/notifications/index.js
import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId diperlukan.' });
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const unreadCount = await prisma.notification.count({ where: { userId, read: false } });
      return res.status(200).json({ notifications, unreadCount });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // PATCH — tandai semua sebagai dibaca
  if (req.method === 'PATCH') {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId diperlukan.' });
    try {
      await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
      return res.status(200).json({ message: 'Semua notifikasi ditandai dibaca.' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
