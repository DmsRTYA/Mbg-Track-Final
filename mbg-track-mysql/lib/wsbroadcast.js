// lib/wsbroadcast.js
// Helper untuk broadcast event dari API routes ke semua WebSocket client

/**
 * Broadcast event ke semua user dengan role tertentu
 * @param {'admin'|'school'|'courier'} role
 * @param {object} payload
 */
function broadcastToRole(role, payload) {
  if (global.wsBroadcast) {
    global.wsBroadcast.toRole(role, payload);
  }
}

/**
 * Broadcast event ke user tertentu (by userId)
 * @param {string} userId
 * @param {object} payload
 */
function broadcastToUser(userId, payload) {
  if (global.wsBroadcast) {
    global.wsBroadcast.toUser(userId, payload);
  }
}

/**
 * Broadcast ke semua user yang terkoneksi
 * @param {object} payload
 */
function broadcastToAll(payload) {
  if (global.wsBroadcast) {
    global.wsBroadcast.toAll(payload);
  }
}

/**
 * Event types yang digunakan di seluruh sistem
 * Konsisten antara server, web, dan Flutter
 */
const WS_EVENTS = {
  // Order events
  ORDER_NEW:       'order_new',        // Sekolah baru submit → admin
  ORDER_UPDATED:   'order_updated',    // Status berubah → semua terkait
  ORDER_DELIVERED: 'order_delivered',  // Selesai → sekolah + admin

  // Delivery proof
  PROOF_SUBMITTED: 'proof_submitted',  // Kurir kirim bukti → admin + sekolah

  // Location
  LOCATION_UPDATE: 'location_update',  // Kurir update GPS → admin
  LOCATION_STOP:   'location_stop',    // Kurir berhenti tracking

  // Inventory
  INVENTORY_UPDATED: 'inventory_updated', // Stok berubah → admin

  // Stats
  STATS_UPDATED: 'stats_updated',      // Statistik berubah → admin
};

module.exports = { broadcastToRole, broadcastToUser, broadcastToAll, WS_EVENTS };
