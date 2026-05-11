import prisma from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { setCors, handleOptions } from '../../../lib/cors';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true, school: true, courier: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json({ users, total: users.length });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === 'POST') {
    const { name, email, password, role, schoolData, courierData } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role wajib.' });
    if (!['admin', 'school', 'courier'].includes(role)) return res.status(400).json({ error: 'Role: admin | school | courier' });
    if (role === 'school' && !schoolData) return res.status(400).json({ error: 'schoolData diperlukan untuk role school.' });
    if (role === 'courier' && !courierData) return res.status(400).json({ error: 'courierData diperlukan untuk role courier.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    try {
      const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (exists) return res.status(409).json({ error: 'Email sudah terdaftar.' });
      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name: name.trim(), email: email.toLowerCase(), password: hashed, role,
          ...(role === 'school' && { school: { create: { name: name.trim(), address: schoolData.address || '', principalName: schoolData.principalName || '', totalStudents: parseInt(schoolData.totalStudents) || 0 } } }),
          ...(role === 'courier' && { courier: { create: { name: name.trim(), phone: courierData.phone || '' } } }),
        },
        include: { school: true, courier: true },
      });
      const { password: _, ...safe } = user;
      return res.status(201).json({ message: `User "${name}" berhasil dibuat.`, user: safe });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
