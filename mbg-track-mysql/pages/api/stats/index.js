import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';
export default async function handler(req, res) {
  setCors(res); if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const today = new Date().toISOString().split('T')[0];
  try {
    const [todayOrders, rice, totalSchools] = await Promise.all([
      prisma.order.findMany({ where: { date: today } }),
      prisma.inventoryItem.findUnique({ where: { name: 'Beras' } }),
      prisma.school.count(),
    ]);
    return res.status(200).json({
      stats: {
        totalPortionsToday: todayOrders.reduce((s, o) => s + o.portions, 0),
        totalOrdersToday: todayOrders.length,
        deliveredCount: todayOrders.filter(o => o.status === 'delivered').length,
        riceStock: rice ? rice.quantity : 0,
        schoolsServed: todayOrders.filter(o => o.status === 'delivered').length,
        totalSchools,
      },
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
