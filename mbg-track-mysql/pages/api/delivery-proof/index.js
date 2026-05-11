import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';
import { notify, notifyRole } from '../../../lib/webpush';
import { broadcastToRole, broadcastToUser, WS_EVENTS } from '../../../lib/wsbroadcast';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method === 'GET') {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ error: 'orderId diperlukan.' });
    try {
      const proof = await prisma.deliveryProof.findUnique({ where: { orderId } });
      return res.status(200).json({ proof });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'POST') {
    const { orderId, photoBase64, latitude, longitude, address, note } = req.body;
    if (!orderId || !photoBase64) {
      return res.status(400).json({ error: 'orderId dan photoBase64 wajib.' });
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { school: true, courier: { include: { user: true } } },
      });
      if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
      if (order.status !== 'on_delivery') {
        return res.status(400).json({ error: 'Bukti hanya bisa disubmit saat status on_delivery.' });
      }

      // Simpan foto ke disk
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
      await mkdir(uploadDir, { recursive: true });
      const filename  = `proof_${orderId}_${Date.now()}.jpg`;
      const filepath  = path.join(uploadDir, filename);
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
      await writeFile(filepath, Buffer.from(base64Data, 'base64'));
      const photoUrl = `/uploads/proofs/${filename}`;

      // Upsert proof
      const proof = await prisma.deliveryProof.upsert({
        where: { orderId },
        update: {
          photoUrl,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          address: address ?? null,
          note: note ?? null,
        },
        create: {
          orderId, photoUrl,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          address: address ?? null,
          note: note ?? null,
        },
      });

      // Fetch updated order with proof
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { school: true, courier: true, deliveryProof: true },
      });

      // ── WebSocket: broadcast proof ke admin dan sekolah ──────────────────
      const wsPayload = { type: WS_EVENTS.PROOF_SUBMITTED, order: updatedOrder, proof };
      broadcastToRole('admin', wsPayload);
      if (order.school?.userId) broadcastToUser(order.school.userId, wsPayload);

      // Also update order in place
      broadcastToRole('admin', { type: WS_EVENTS.ORDER_UPDATED, order: updatedOrder });
      if (order.school?.userId) broadcastToUser(order.school.userId, { type: WS_EVENTS.ORDER_UPDATED, order: updatedOrder });
      // ────────────────────────────────────────────────────────────────────

      // ── Database notification ke sekolah ──────────────────────────────────
      if (order.school?.userId) {
        notify(prisma, order.school.userId,
          'Bukti Pengiriman Diterima',
          `Kurir telah mengirim ${order.portions} porsi ke ${order.school.name}.`,
          'delivery_proof', { orderId, photoUrl }
        ).catch(err => console.error('[Notif] Error notify school (delivery proof):', err.message));
      }

      // ── Database notification ke admin (WebSocket delivers real-time) ──────
      notifyRole(prisma, 'admin',
        'Bukti Foto Diterima',
        `${order.school?.name} — ${order.portions} porsi. Bukti foto tersedia.`,
        'delivery_proof',
        { orderId, photoUrl }
      ).catch(err => console.error('[Notif] Error notifyRole (delivery proof):', err.message));

      return res.status(201).json({ proof, message: 'Bukti pengiriman berhasil disimpan.' });
    } catch (err) {
      console.error('[DELIVERY PROOF]', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
