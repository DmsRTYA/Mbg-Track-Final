import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';
import { notify, notifyRole } from '../../../lib/webpush';
import { broadcastToRole, broadcastToUser, broadcastToAll, WS_EVENTS } from '../../../lib/wsbroadcast';

const STATUS_FLOW   = { pending: 'cooking', cooking: 'on_delivery', on_delivery: 'delivered' };
const STATUS_LABELS = { cooking: 'Sedang Dimasak', on_delivery: 'Dalam Perjalanan', delivered: 'Telah Diterima' };

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { school: true, courier: true, deliveryProof: true },
      });
      if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
      return res.status(200).json({ order });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'PATCH') {
    const { action, courierId } = req.body;
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { school: true, courier: { include: { user: true } } },
      });
      if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });

      let updateData = { updatedAt: new Date() };

      if (action === 'assign_courier') {
        if (!courierId) return res.status(400).json({ error: 'courierId diperlukan.' });
        updateData.courierId = courierId;
      }

      if (action === 'advance_status') {
        const nextStatus = STATUS_FLOW[order.status];
        if (!nextStatus) return res.status(400).json({ error: 'Status sudah final.' });

        // ── VALIDASI BUKTI WAJIB sebelum delivered ────────────────────────
        if (nextStatus === 'delivered') {
          const proof = await prisma.deliveryProof.findUnique({ where: { orderId: id } });
          if (!proof) {
            return res.status(400).json({
              error: 'Bukti pengiriman (foto) wajib dikirim sebelum menyelesaikan pengiriman.',
              requireProof: true,
            });
          }
        }
        // ─────────────────────────────────────────────────────────────────

        updateData.status = nextStatus;

        // Kurangi stok beras saat mulai masak
        if (nextStatus === 'cooking') {
          const rice = await prisma.inventoryItem.findUnique({ where: { name: 'Beras' } });
          if (rice) {
            const deductKg = parseFloat((order.portions * 0.15).toFixed(2));
            await prisma.inventoryItem.update({
              where: { id: rice.id },
              data: {
                quantity: { decrement: deductKg },
                logs: { create: { quantity: -deductKg, type: 'out', note: `Digunakan ${order.portions} porsi (${id.slice(-6)})` } },
              },
            });
            // Broadcast inventory update ke admin
            const updatedRice = await prisma.inventoryItem.findUnique({ where: { name: 'Beras' } });
            broadcastToRole('admin', { type: WS_EVENTS.INVENTORY_UPDATED, item: updatedRice });
          }
        }
      }

      const updated = await prisma.order.update({
        where: { id },
        data: updateData,
        include: { school: true, courier: true, deliveryProof: true },
      });

      // ── WebSocket broadcast ke semua pihak ──────────────────────────────
      const wsPayload = { type: WS_EVENTS.ORDER_UPDATED, order: updated };

      // Broadcast ke semua admin
      broadcastToRole('admin', wsPayload);

      // Broadcast ke sekolah terkait
      if (updated.school?.userId) {
        broadcastToUser(updated.school.userId, wsPayload);
      }

      // Broadcast ke kurir terkait
      if (updated.courier?.userId) {
        broadcastToUser(updated.courier.userId, wsPayload);
      }

      // ── Database notification ke sekolah saat status berubah ──────────────
      if (action === 'advance_status' && updated.school?.userId) {
        const label = STATUS_LABELS[updated.status] || updated.status;
        notify(prisma, updated.school.userId,
          `Status Pesanan: ${label}`,
          `Pesanan ${updated.portions} porsi untuk ${updated.school.name}: ${label}`,
          `order_${updated.status}`,
          { orderId: id }
        ).catch(err => console.error('[Notif] Error notify school (status change):', err.message));
      }

      // ── Database notification ke admin saat status berubah ────────────────
      if (action === 'advance_status') {
        const label = STATUS_LABELS[updated.status] || updated.status;
        notifyRole(prisma, 'admin',
          `Status Update: ${label}`,
          `${updated.school?.name} — ${updated.portions} porsi: ${label}`,
          `order_${updated.status}`,
          { orderId: id }
        ).catch(err => console.error('[Notif] Error notifyRole (status change):', err.message));
      }

      // ── Database notification ke kurir saat di-assign ────────────────────
      if (action === 'assign_courier' && updated.courier?.userId) {
        notify(prisma, updated.courier.userId,
          'Penugasan Baru',
          `Anda ditugaskan mengantar ${updated.portions} porsi ke ${updated.school?.name}.`,
          'order_submitted',
          { orderId: id }
        ).catch(err => console.error('[Notif] Error notify courier (assign):', err.message));
      }

      // Stats update broadcast
      const stats = await getStats(prisma);
      broadcastToRole('admin', { type: WS_EVENTS.STATS_UPDATED, stats });

      return res.status(200).json({ order: updated });
    } catch (err) {
      console.error('[PATCH ORDER]', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function getStats(prisma) {
  const today = new Date().toISOString().split('T')[0];
  const [todayOrders, rice, totalSchools] = await Promise.all([
    prisma.order.findMany({ where: { date: today } }),
    prisma.inventoryItem.findUnique({ where: { name: 'Beras' } }),
    prisma.school.count(),
  ]);
  return {
    totalPortionsToday: todayOrders.reduce((s, o) => s + o.portions, 0),
    totalOrdersToday: todayOrders.length,
    deliveredCount: todayOrders.filter(o => o.status === 'delivered').length,
    riceStock: rice?.quantity || 0,
    schoolsServed: todayOrders.filter(o => o.status === 'delivered').length,
    totalSchools,
  };
}
