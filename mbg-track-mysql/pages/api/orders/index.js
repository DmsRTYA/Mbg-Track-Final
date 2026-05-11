import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';
import { notify, notifyRole } from '../../../lib/webpush';
import { broadcastToRole, broadcastToUser, WS_EVENTS } from '../../../lib/wsbroadcast';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  const today = new Date().toISOString().split('T')[0];

  if (req.method === 'GET') {
    const { schoolId, date, courierId, status } = req.query;
    try {
      const where = {};
      if (schoolId) where.schoolId = schoolId;
      if (date) where.date = date;
      if (courierId) where.courierId = courierId;
      if (status) where.status = status;
      const orders = await prisma.order.findMany({
        where,
        include: { school: true, courier: true, deliveryProof: true },
        orderBy: { createdAt: 'asc' },
      });
      return res.status(200).json({ orders });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'POST') {
    const { schoolId, portions } = req.body;
    if (!schoolId || !portions) return res.status(400).json({ error: 'schoolId dan portions wajib.' });

    const portionsInt = parseInt(portions);
    if (isNaN(portionsInt) || portionsInt < 1) {
      return res.status(400).json({ error: 'Jumlah porsi harus angka positif.' });
    }

    // ── VALIDASI BATAS PORSI ───────────────────────────────────────────────
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return res.status(404).json({ error: 'Sekolah tidak ditemukan.' });
    if (portionsInt > school.totalStudents) {
      return res.status(400).json({
        error: `Porsi (${portionsInt}) melebihi total siswa (${school.totalStudents}). Maks: ${school.totalStudents} porsi.`,
        maxPortions: school.totalStudents,
      });
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      const order = await prisma.order.upsert({
        where: { schoolId_date: { schoolId, date: today } },
        update: { portions: portionsInt, updatedAt: new Date() },
        create: { schoolId, date: today, portions: portionsInt, status: 'pending' },
        include: { school: true, courier: true, deliveryProof: true },
      });

      // ── WebSocket: kirim ke semua admin secara real-time ─────────────────
      broadcastToRole('admin', {
        type: WS_EVENTS.ORDER_NEW,
        order,
        message: `${school.name} meminta ${portionsInt} porsi.`,
      });

      // ── Database notification ke admin (WebSocket delivers real-time) ────
      notifyRole(prisma, 'admin',
        'Permintaan Baru Masuk',
        `${school.name} meminta ${portionsInt} porsi.`,
        'order_submitted',
        { orderId: order.id }
      ).catch(err => console.error('[Notif] Error notifyRole (order baru):', err.message));

      return res.status(200).json({ order });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
