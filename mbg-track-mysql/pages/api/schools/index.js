import prisma from '../../../lib/prisma';
import { setCors, handleOptions } from '../../../lib/cors';
export default async function handler(req, res) {
  setCors(res); if (handleOptions(req, res)) return;
  if (req.method === 'GET') {
    try { return res.status(200).json({ schools: await prisma.school.findMany({ orderBy: { name: 'asc' } }) }); }
    catch (err) { return res.status(500).json({ error: err.message }); }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
