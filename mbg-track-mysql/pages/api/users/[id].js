import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { setCors, handleOptions } from '../../../lib/cors';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, createdAt: true, school: true, courier: true } });
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
      return res.status(200).json({ user });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'PATCH') {
    const { name, email, password, schoolData, courierData } = req.body;
    try {
      const existing = await prisma.user.findUnique({ where: { id }, include: { school: true, courier: true } });
      if (!existing) return res.status(404).json({ error: 'User tidak ditemukan.' });
      const upd = {};
      if (name) upd.name = name.trim();
      if (email) {
        const conflict = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id } } });
        if (conflict) return res.status(409).json({ error: 'Email sudah dipakai.' });
        upd.email = email.toLowerCase();
      }
      if (password) { if (password.length < 8) return res.status(400).json({ error: 'Password min 8 karakter.' }); upd.password = await bcrypt.hash(password, 12); }
      if (schoolData && existing.school) await prisma.school.update({ where: { id: existing.school.id }, data: { ...(schoolData.address && { address: schoolData.address }), ...(schoolData.principalName && { principalName: schoolData.principalName }), ...(schoolData.totalStudents && { totalStudents: parseInt(schoolData.totalStudents) }) } });
      if (courierData && existing.courier) await prisma.courier.update({ where: { id: existing.courier.id }, data: { ...(courierData.phone && { phone: courierData.phone }) } });
      const updated = await prisma.user.update({ where: { id }, data: upd, include: { school: true, courier: true } });
      const { password: _, ...safe } = updated;
      return res.status(200).json({ message: 'User diperbarui.', user: safe });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'DELETE') {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
      if (user.role === 'admin') return res.status(403).json({ error: 'Akun admin tidak dapat dihapus via API.' });
      await prisma.user.delete({ where: { id } });
      return res.status(200).json({ message: `User "${user.name}" dihapus.` });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
