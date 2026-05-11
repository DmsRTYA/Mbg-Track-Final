// server.js — Custom Next.js server dengan WebSocket
// Menggantikan `next dev` / `next start`
// Semua event real-time: order, status, lokasi GPS, notifikasi

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

const dev  = process.env.NODE_ENV !== 'production';
const app  = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── WebSocket State ───────────────────────────────────────────────────────────
// Map: userId -> Set<WebSocket>  (satu user bisa banyak tab)
const userConnections = new Map();

// Map: courierId -> { lat, lng, accuracy, orderId, updatedAt }
const courierLocations = new Map();

function addConnection(userId, ws) {
  if (!userConnections.has(userId)) userConnections.set(userId, new Set());
  userConnections.get(userId).add(ws);
}

function removeConnection(userId, ws) {
  const set = userConnections.get(userId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) userConnections.delete(userId);
  }
}

function sendToUser(userId, payload) {
  const conns = userConnections.get(userId);
  if (!conns) return 0;
  const msg = JSON.stringify(payload);
  let sent = 0;
  conns.forEach(ws => {
    if (ws.readyState === 1) { // OPEN
      try { ws.send(msg); sent++; } catch (_) {}
    }
  });
  return sent;
}

function broadcastToRole(role, payload, excludeUserId = null) {
  let sent = 0;
  userConnections.forEach((conns, userId) => {
    if (userId === excludeUserId) return;
    conns.forEach(ws => {
      if (ws.readyState === 1 && ws._role === role) {
        try { ws.send(JSON.stringify(payload)); sent++; } catch (_) {}
      }
    });
  });
  return sent;
}

function broadcastToAll(payload, excludeUserId = null) {
  let sent = 0;
  userConnections.forEach((conns, userId) => {
    if (userId === excludeUserId) return;
    conns.forEach(ws => {
      if (ws.readyState === 1) {
        try { ws.send(JSON.stringify(payload)); sent++; } catch (_) {}
      }
    });
  });
  return sent;
}

// ── Exposed helpers untuk API routes ─────────────────────────────────────────
global.wsBroadcast = {
  toUser: sendToUser,
  toRole: broadcastToRole,
  toAll: broadcastToAll,
  courierLocations,
  getOnlineUsers: () => {
    const list = [];
    userConnections.forEach((conns, userId) => {
      conns.forEach(ws => {
        if (ws.readyState === 1) list.push({ userId, role: ws._role });
      });
    });
    return list;
  },
};

// ── Start server ──────────────────────────────────────────────────────────────
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // ── WebSocket Server ────────────────────────────────────────────────────────
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url    = new URL(req.url, `http://localhost`);
    const userId = url.searchParams.get('userId') || '';
    const role   = url.searchParams.get('role') || '';

    ws._userId = userId;
    ws._role   = role;
    ws._connId = uuidv4();
    ws._alive  = true;

    addConnection(userId, ws);
    console.log(`[WS] Connected: ${role} / ${userId.slice(0, 8)} (total: ${userConnections.size} users)`);

    // Kirim konfirmasi koneksi
    ws.send(JSON.stringify({ type: 'connected', userId, role, connId: ws._connId }));

    // Kirim lokasi kurir yang sedang aktif ke admin/sekolah
    if (role === 'admin' || role === 'school') {
      courierLocations.forEach((loc, courierId) => {
        ws.send(JSON.stringify({ type: 'location_update', courierId, ...loc }));
      });
    }

    // ── Message handler ──────────────────────────────────────────────────────
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      switch (msg.type) {

        // Kurir kirim update lokasi GPS
        case 'location_update': {
          const { lat, lng, accuracy, orderId } = msg.payload || {};
          if (lat == null || lng == null) break;

          const loc = { lat, lng, accuracy: accuracy || 0, orderId: orderId || '', updatedAt: Date.now() };
          courierLocations.set(userId, loc);

          // Broadcast ke semua admin dan semua sekolah
          const locationPayload = { type: 'location_update', courierId: userId, courierName: msg.courierName || '', ...loc };
          broadcastToRole('admin', locationPayload);
          broadcastToRole('school', locationPayload);
          break;
        }

        // Stop tracking (kurir selesai)
        case 'location_stop': {
          courierLocations.delete(userId);
          broadcastToRole('admin',  { type: 'location_stop', courierId: userId });
          broadcastToRole('school', { type: 'location_stop', courierId: userId });
          break;
        }

        // Ping-pong keep-alive
        case 'ping': {
          ws._alive = true;
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    });

    ws.on('close', () => {
      removeConnection(userId, ws);
      // Hapus lokasi kurir yang disconnect
      if (role === 'courier') {
        courierLocations.delete(userId);
        broadcastToRole('admin',  { type: 'location_stop', courierId: userId });
        broadcastToRole('school', { type: 'location_stop', courierId: userId });
      }
      console.log(`[WS] Disconnected: ${role} / ${userId.slice(0, 8)}`);
    });

    ws.on('error', () => removeConnection(userId, ws));

    ws.on('pong', () => { ws._alive = true; });
  });

  // ── Heartbeat: tutup koneksi mati setiap 30 detik ────────────────────────
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws._alive) { ws.terminate(); return; }
      ws._alive = false;
      ws.ping();
    });
  }, 30000);

  server.listen(PORT, () => {
    console.log(`\n🚀 MBG-Track server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`🌿 Mode: ${dev ? 'development' : 'production'}\n`);
  });
});
