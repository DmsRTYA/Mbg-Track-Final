import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Package, Truck, CheckCircle, AlertCircle, X } from 'lucide-react';

const TYPE_CONFIG = {
  order_submitted:  { Icon: Package,     color: 'text-blue-500',  bg: 'bg-blue-50' },
  order_cooking:    { Icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  order_on_delivery:{ Icon: Truck,       color: 'text-sky-500',   bg: 'bg-sky-50' },
  order_delivered:  { Icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  delivery_proof:   { Icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  stock_low:        { Icon: AlertCircle, color: 'text-red-500',   bg: 'bg-red-50' },
};

export default function NotificationBell({ userId, onNotificationUpdate }) {
  const [open, setOpen]         = useState(false);
  const [notifs, setNotifs]     = useState([]);
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Trigger refresh when new notification arrives from WebSocket
  useEffect(() => {
    if (onNotificationUpdate) {
      onNotificationUpdate(() => load());
    }
  }, [load, onNotificationUpdate]);

  // Fallback poll: refresh setiap 60 detik sebagai backup
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setUnread(0);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
      >
        <Bell size={16} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-sm text-slate-800">Notifikasi</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                  <CheckCheck size={13} /> Tandai dibaca
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {loading && <div className="py-8 text-center text-sm text-slate-400">Memuat...</div>}
            {!loading && notifs.length === 0 && (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Tidak ada notifikasi</p>
              </div>
            )}
            {notifs.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.order_submitted;
              const Icon = cfg.Icon;
              return (
                <div key={n.id} className={`px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-slate-800 leading-tight ${!n.read ? 'font-bold' : ''}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                      <p className="text-[10px] text-slate-300 mt-1">
                        {new Date(n.createdAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
