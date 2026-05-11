import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getSession } from '../../lib/auth';
import { usePushNotification } from '../../lib/usePush';
import Navbar from '../../components/Navbar';
import { MapPin, Package, CheckCircle2, Truck, RefreshCw, AlertCircle, Phone, Navigation } from 'lucide-react';

const STATUS_CONFIG = {
  cooking: {
    label: 'Menunggu Siap',
    actionLabel: null,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'badge-cooking',
  },
  on_delivery: {
    label: 'Sedang Diantar',
    actionLabel: 'Selesaikan Pengiriman',
    actionBg: 'bg-mbg-green hover:bg-green-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    badge: 'badge-delivery',
  },
  delivered: {
    label: 'Pengiriman Selesai',
    actionLabel: null,
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'badge-done',
  },
};

function DeliveryCard({ order, onAction, isLoading }) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.cooking;
  const canStart = order.status === 'cooking';
  const canFinish = order.status === 'on_delivery';

  const handleAction = async () => {
    if (canStart || canFinish) onAction(order.id);
  };

  return (
    <div className={`rounded-2xl border-2 ${config.border} ${config.bg} p-5 space-y-4 transition-all duration-300`}>
      {/* School Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-display font-bold text-slate-900 text-base leading-tight">{order.school?.name}</h3>
          <div className="flex items-start gap-1.5 mt-1.5">
            <MapPin size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-500 leading-snug">{order.school?.address}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl px-3 py-2 text-center shadow-card flex-shrink-0">
          <p className="text-xl font-display font-bold text-mbg-blue leading-none">{order.portions.toLocaleString('id-ID')}</p>
          <p className="text-xs text-slate-400 mt-0.5">porsi</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Phone size={12} />
            Kepala Sekolah
          </span>
          <span className="font-semibold text-slate-700">{order.school?.principalName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Package size={12} />
            Berat Estimasi
          </span>
          <span className="font-semibold text-slate-700">{Math.round(order.portions * 0.5)} kg</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Waktu Order</span>
          <span className="text-slate-600">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className={config.badge + ' text-xs'}>
          {order.status === 'cooking' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block mr-1" />}
          {order.status === 'on_delivery' && <Truck size={11} />}
          {order.status === 'delivered' && <CheckCircle2 size={11} />}
          {config.label}
        </span>
        {order.status === 'delivered' && (
          <span className="text-xs text-green-600 font-medium">
            {new Date(order.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {canStart && (
          <button
            onClick={handleAction}
            disabled={isLoading}
            className="w-full bg-mbg-blue hover:bg-mbg-blue-dark text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-elevated btn-touch disabled:opacity-60 text-base"
          >
            <Truck size={18} />
            {isLoading ? 'Memproses...' : 'Mulai Antar'}
          </button>
        )}
        {canFinish && (
          <button
            onClick={handleAction}
            disabled={isLoading}
            className="w-full bg-mbg-green hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-sm btn-touch disabled:opacity-60 text-base"
          >
            <CheckCircle2 size={18} />
            {isLoading ? 'Memproses...' : 'Selesaikan Pengiriman'}
          </button>
        )}
        {(canStart || canFinish) && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(order.school?.address || '')}`}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-slate-50 text-sm"
          >
            <Navigation size={14} />
            Buka di Maps
          </a>
        )}
      </div>
    </div>
  );
}

export default function CourierDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  // Subscribe ke Web Push Notification
  usePushNotification(user);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'courier') { router.push('/'); return; }
    setUser(session);
    if (session.courierId) loadOrders(session.courierId);
  }, []);

  const loadOrders = useCallback(async (courierId) => {
    setRefreshing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/orders?courierId=${courierId}&date=${today}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAction = async (orderId) => {
    setActionLoading(p => ({ ...p, [orderId]: true }));
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance_status' }),
      });
      if (user?.courierId) loadOrders(user.courierId);
    } finally {
      setActionLoading(p => ({ ...p, [orderId]: false }));
    }
  };

  if (!user) return null;

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const doneOrders = orders.filter(o => o.status === 'delivered');

  return (
    <div className="min-h-screen bg-mbg-slate">
      <Navbar user={user} />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Daftar Tugas</h1>
            <p className="text-sm text-slate-400 mt-1">{today}</p>
          </div>
          <button
            onClick={() => loadOrders(user.courierId)}
            disabled={refreshing}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-mbg-blue transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Tugas', value: orders.length, color: 'text-slate-900' },
            { label: 'Sedang Berjalan', value: activeOrders.length, color: 'text-mbg-blue' },
            { label: 'Selesai', value: doneOrders.length, color: 'text-mbg-green' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-card">
              <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* No orders */}
        {orders.length === 0 && !refreshing && (
          <div className="card py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Truck size={24} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-500">Tidak ada tugas hari ini</p>
            <p className="text-sm text-slate-400 mt-1">Anda belum ditugaskan ke pengiriman manapun.</p>
          </div>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-mbg-blue"></span>
              Tugas Aktif ({activeOrders.length})
            </h2>
            {activeOrders.map(order => (
              <DeliveryCard
                key={order.id}
                order={order}
                onAction={handleAction}
                isLoading={actionLoading[order.id]}
              />
            ))}
          </div>
        )}

        {/* Completed Orders */}
        {doneOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-400 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Selesai ({doneOrders.length})
            </h2>
            {doneOrders.map(order => (
              <DeliveryCard
                key={order.id}
                order={order}
                onAction={handleAction}
                isLoading={false}
              />
            ))}
          </div>
        )}

        {/* Bottom padding for mobile */}
        <div className="h-6" />
      </main>
    </div>
  );
}
