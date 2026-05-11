// pages/api/webrtc/signal.js
// WebRTC Signaling via Server-Sent Events (SSE)
// Kurir share lokasi real-time ke admin/sekolah

const clients = new Map(); // userId -> res

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET — subscribe ke SSE stream
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) { res.status(400).json({ error: 'userId diperlukan.' }); return; }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Simpan client
    clients.set(userId, res);
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

    // Heartbeat setiap 25 detik
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
    }, 25000);

    // Cleanup saat disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(userId);
    });
    return;
  }

  // POST — broadcast pesan (lokasi, offer, answer, candidate)
  if (req.method === 'POST') {
    const { from, to, type, payload } = req.body;
    if (!from || !type || !payload) {
      res.status(400).json({ error: 'from, type, payload wajib.' }); return;
    }

    const message = JSON.stringify({ from, type, payload, timestamp: Date.now() });

    // Kirim ke target spesifik atau broadcast ke semua
    if (to) {
      const target = clients.get(to);
      if (target) {
        try { target.write(`data: ${message}\n\n`); }
        catch (_) { clients.delete(to); }
      }
    } else {
      // Broadcast ke semua kecuali pengirim
      clients.forEach((clientRes, clientId) => {
        if (clientId !== from) {
          try { clientRes.write(`data: ${message}\n\n`); }
          catch (_) { clients.delete(clientId); }
        }
      });
    }

    return res.status(200).json({ message: 'Signal terkirim.', recipients: to ? 1 : clients.size - 1 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
