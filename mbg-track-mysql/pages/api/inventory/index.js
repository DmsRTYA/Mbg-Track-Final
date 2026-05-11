import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';
import { broadcastToRole, WS_EVENTS } from '../../../lib/wsbroadcast';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method === 'GET') {
    try {
      const [inventory, logs] = await Promise.all([
        prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
        prisma.inventoryLog.findMany({
          include: { item: { select: { name: true, unit: true } } },
          orderBy: { createdAt: 'desc' }, take: 50,
        }),
      ]);
      return res.status(200).json({ inventory, logs });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'POST') {
    const { name, quantity, unit, note } = req.body;
    if (!name || !quantity || !unit) return res.status(400).json({ error: 'name, quantity, unit wajib.' });
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Quantity harus angka positif.' });

    try {
      const item = await prisma.inventoryItem.upsert({
        where: { name: name.trim() },
        update: {
          quantity: { increment: qty },
          logs: { create: { quantity: qty, type: 'in', note: note || 'Stok masuk' } },
        },
        create: {
          name: name.trim(), unit: unit.trim(), quantity: qty,
          logs: { create: { quantity: qty, type: 'in', note: note || 'Stok awal' } },
        },
      });

      // Broadcast ke semua admin real-time
      broadcastToRole('admin', { type: WS_EVENTS.INVENTORY_UPDATED, item });

      return res.status(201).json({ item });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
