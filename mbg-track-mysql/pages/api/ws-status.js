// pages/api/ws-status.js — info koneksi WebSocket aktif
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const users = global.wsBroadcast?.getOnlineUsers?.() || [];
  const locations = {};
  global.wsBroadcast?.courierLocations?.forEach?.((loc, courierId) => {
    locations[courierId] = loc;
  });

  return res.status(200).json({
    onlineUsers: users,
    courierLocations: locations,
    totalConnections: users.length,
  });
}
