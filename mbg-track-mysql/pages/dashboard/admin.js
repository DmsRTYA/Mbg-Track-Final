import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSession } from '../../lib/auth';
import { useWebSocket } from '../../lib/useWebSocket';
import NotificationBell from '../../components/NotificationBell';
import StatusBadge from '../../components/StatusBadge';
import {
  Users, Package, CheckCircle2, Plus, RefreshCw, ChevronDown,
  Flame, Send, Warehouse, ClipboardList, AlertCircle, TrendingUp,
  MapPin, Camera, Navigation, Wifi, WifiOff, Map
} from 'lucide-react';

// ── Konstanta WS event types ──────────────────────────────────────────────────
const EVT = {
  ORDER_NEW:        'order_new',
  ORDER_UPDATED:    'order_updated',
  PROOF_SUBMITTED:  'proof_submitted',
  LOCATION_UPDATE:  'location_update',
  LOCATION_STOP:    'location_stop',
  INVENTORY_UPDATED:'inventory_updated',
  STATS_UPDATED:    'stats_updated',
};

// ── Komponen StatCard ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, Icon, color }) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Modal Bukti Foto ──────────────────────────────────────────────────────────
function ProofModal({ proof, onClose }) {
  if (!proof) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Camera size={16} className="text-mbg-blue" /> Bukti Pengiriman
        </h3>
        {proof.photoUrl && (
          <img src={proof.photoUrl} alt="Bukti" className="w-full h-64 object-cover rounded-xl mb-4 bg-slate-100" />
        )}
        <div className="space-y-2 text-sm">
          {proof.address && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-600">{proof.address}</span>
            </div>
          )}
          {proof.latitude && proof.longitude && (
            <a href={`https://maps.google.com/?q=${proof.latitude},${proof.longitude}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-mbg-blue hover:underline">
              <Navigation size={14} />
              Lihat di Maps ({proof.latitude.toFixed(5)}, {proof.longitude.toFixed(5)})
            </a>
          )}
          {proof.note && <p className="text-slate-500 italic">"{proof.note}"</p>}
          <p className="text-slate-400 text-xs">{new Date(proof.submittedAt).toLocaleString('id-ID')}</p>
        </div>
        <button onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">
          Tutup
        </button>
      </div>
    </div>
  );
}

// ── Live Location Map ─────────────────────────────────────────────────────────
function LiveMap({ locations, couriers }) {
  const entries = Object.entries(locations);
  if (entries.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <MapPin size={28} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-500">Belum ada kurir yang berbagi lokasi</p>
        <p className="text-xs text-slate-400 mt-1">Lokasi akan muncul otomatis saat kurir mulai pengiriman</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map(([courierId, loc]) => {
        const courier = couriers.find(c => c.userId === courierId || c.id === courierId);
        const age     = Date.now() - loc.updatedAt;
        const isLive  = age < 15000;
        const mapsUrl = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
        return (
          <div key={courierId} className={`rounded-xl border p-4 transition-all ${isLive ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-sm font-semibold text-slate-800">
                  {loc.courierName || courier?.name || `Kurir ${courierId.slice(-4)}`}
                </span>
                <span className="text-xs text-slate-400">
                  {isLive ? 'Live' : `${Math.round(age / 1000)}s lalu`}
                </span>
              </div>
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-mbg-blue hover:text-mbg-blue-dark font-semibold">
                <Map size={12} /> Buka Maps
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
              <span>Lat: {loc.lat?.toFixed(6)}</span>
              <span>Lng: {loc.lng?.toFixed(6)}</span>
              {loc.accuracy > 0 && <span>Akurasi: ±{Math.round(loc.accuracy)}m</span>}
              {loc.orderId && <span className="truncate">Order: ...{loc.orderId.slice(-6)}</span>}
            </div>
            {/* Static map embed */}
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="block">
              <div className="h-28 rounded-lg bg-slate-100 overflow-hidden relative">
                <img
                  src={`https://staticmap.openstreetmap.de/staticmap.php?center=${loc.lat},${loc.lng}&zoom=15&size=400x112&markers=${loc.lat},${loc.lng},red`}
                  alt="Peta Lokasi"
                  className="w-full h-full object-cover"
                  onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400 text-xs">Klik untuk buka Google Maps</div>'; }}
                />
              </div>
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ── Komponen baris order dalam tabel dengan live tracking modal ───────────────
function OrderRow({ order, couriers, onAdvance, onAssign, onViewProof, isLoading, onViewTracking }) {
  const getNextLabel = () => {
    if (order.status === 'pending')  return 'Mulai Masak';
    if (order.status === 'cooking')  return 'Kirim';
    return null;
  };
  const getNextStyle = () => {
    if (order.status === 'pending') return 'bg-amber-500 hover:bg-amber-600 text-white';
    return 'bg-mbg-blue hover:bg-mbg-blue-dark text-white';
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-800 text-sm">{order.school?.name}</div>
        <div className="text-xs text-slate-400 truncate max-w-[180px]">{order.school?.address}</div>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="font-bold text-slate-800">{order.portions?.toLocaleString('id-ID')}</span>
        <span className="text-slate-400 text-xs ml-1">/ {order.school?.totalStudents?.toLocaleString('id-ID')}</span>
      </td>
      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
      <td className="px-4 py-3">
        {order.status === 'delivered' ? (
          <span className="text-sm text-slate-500">{order.courier?.name || '—'}</span>
        ) : (
          <div className="relative">
            <select
              value={order.courierId || ''}
              onChange={e => onAssign(order.id, e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 pr-6 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-mbg-blue"
            >
              <option value="">Pilih Kurir</option>
              {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {getNextLabel() && (
            <button onClick={() => onAdvance(order.id, order.status)}
              disabled={isLoading || (order.status === 'cooking' && !order.courierId)}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${getNextStyle()}`}>
              {order.status === 'pending' ? <Flame size={11} /> : <Send size={11} />}
              {isLoading ? '...' : getNextLabel()}
            </button>
          )}
          {order.status === 'on_delivery' && (
            <button onClick={() => onViewTracking(order)}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors">
              <MapPin size={11} /> Live Lokasi
            </button>
          )}
          {order.status === 'delivered' && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 size={11} /> Selesai
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {order.deliveryProof ? (
          <button onClick={() => onViewProof(order.deliveryProof)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
            <Camera size={11} /> Bukti
          </button>
        ) : <span className="text-xs text-slate-300">—</span>}
      </td>
    </tr>
  );
}

// ── Modal Live Tracking per Order ─────────────────────────────────────────────
function TrackingModal({ order, locations, couriers, onClose }) {
  if (!order) return null;
  // Cari lokasi kurir untuk order ini
  const courierUserId = order.courier?.userId || order.courierId;
  const allLocEntries = Object.entries(locations);
  const relevantLocs  = allLocEntries.filter(([uid, loc]) => uid === courierUserId || loc.orderId === order.id);
  const locObj        = Object.fromEntries(relevantLocs);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <MapPin size={16} className="text-mbg-blue" /> Live Tracking — {order.school?.name}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="mb-4 p-3 bg-slate-50 rounded-xl text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Kurir</span>
            <span className="font-semibold text-slate-700">{order.courier?.name || '—'}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500">Porsi</span>
            <span className="font-semibold text-slate-700">{order.portions?.toLocaleString('id-ID')} porsi</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500">Tujuan</span>
            <span className="font-semibold text-slate-700 text-right max-w-[60%]">{order.school?.address}</span>
          </div>
        </div>
        <LiveMap locations={locObj} couriers={couriers} />
        {relevantLocs.length === 0 && (
          <p className="text-xs text-center text-slate-400 mt-3">
            Kurir belum berbagi lokasi untuk pesanan ini. Lokasi akan muncul otomatis saat kurir aktif.
          </p>
        )}
        <button onClick={onClose}
          className="mt-4 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">
          Tutup
        </button>
      </div>
    </div>
  );
}

// ── Dashboard Admin ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [user,     setUser]     = useState(null);
  const [stats,    setStats]    = useState(null);
  const [orders,   setOrders]   = useState([]);
  const [inventory,setInventory]= useState([]);
  const [couriers, setCouriers] = useState([]);
  const [locations,setLocations]= useState({});  // courierId -> {lat,lng,...}
  const [activeTab,  setActiveTab]   = useState('orders');
  const [selectedProof,setSelectedProof] = useState(null);
  const [trackingOrder,setTrackingOrder] = useState(null);
  const [actionLoading,setActionLoading] = useState({});
  const [inboundForm,  setInboundForm]   = useState({ name:'', quantity:'', unit:'kg', note:'' });
  const [inboundLoading,setInboundLoading] = useState(false);
  const [inboundSuccess,setInboundSuccess] = useState('');
  // Toast for real-time events
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  // Notification refresh callback for real-time updates
  const notificationRefreshRef = useRef(null);

  const today = new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // ── Browser Notification Helper ────────────────────────────────────────────
  const sendBrowserNotification = useCallback((title, options = {}) => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    
    // Request permission jika belum
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/logo-bgn.png',
        badge: '/logo-bgn.png',
        ...options
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            icon: '/logo-bgn.png',
            badge: '/logo-bgn.png',
            ...options
          });
        }
      });
    }
  }, []);

  // ── WebSocket handler ───────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    switch (msg.type) {
      case EVT.ORDER_NEW:
        setOrders(prev => {
          const exists = prev.find(o => o.id === msg.order.id);
          if (exists) return prev.map(o => o.id === msg.order.id ? msg.order : o);
          return [...prev, msg.order].sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt));
        });
        // Trigger notification refresh for real-time update
        notificationRefreshRef.current?.();
        // Browser notification
        sendBrowserNotification(
          'Permintaan Pesanan Baru',
          { body: `${msg.order.school?.name || 'Sekolah'} meminta ${msg.order.portions} porsi` }
        );
        break;

      case EVT.ORDER_UPDATED:
        setOrders(prev => prev.map(o => o.id === msg.order.id ? msg.order : o));
        // Trigger notification refresh for real-time update
        notificationRefreshRef.current?.();
        break;

      case EVT.PROOF_SUBMITTED:
        setOrders(prev => prev.map(o => o.id === msg.order?.id ? msg.order : o));
        // Trigger notification refresh for real-time update
        notificationRefreshRef.current?.();
        // Browser notification
        sendBrowserNotification(
          'Bukti Pengiriman Diterima',
          { body: `Bukti foto dari ${msg.order?.school?.name || 'kurir'} telah diterima` }
        );
        break;

      case EVT.LOCATION_UPDATE:
        setLocations(prev => ({
          ...prev,
          [msg.courierId]: {
            lat: msg.lat, lng: msg.lng, accuracy: msg.accuracy,
            orderId: msg.orderId, updatedAt: msg.updatedAt || Date.now(),
            courierName: msg.courierName || '',
          },
        }));
        break;

      case EVT.LOCATION_STOP:
        setLocations(prev => { const n = {...prev}; delete n[msg.courierId]; return n; });
        break;

      case EVT.INVENTORY_UPDATED:
        if (msg.item) {
          setInventory(prev => {
            const exists = prev.find(i => i.id === msg.item.id);
            if (exists) return prev.map(i => i.id === msg.item.id ? msg.item : i);
            return [...prev, msg.item];
          });
        }
        break;

      case EVT.STATS_UPDATED:
        if (msg.stats) setStats(msg.stats);
        break;
    }
  }, [sendBrowserNotification]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Request notification permission on mount ───────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const { connected, reconnecting } = useWebSocket(user, handleWsMessage);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'admin') { router.push('/'); return; }
    setUser(session);
    loadAll();
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [sRes, oRes, iRes, cRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/orders?date=' + new Date().toISOString().split('T')[0]),
        fetch('/api/inventory'),
        fetch('/api/couriers'),
      ]);
      const [s, o, i, c] = await Promise.all([sRes.json(), oRes.json(), iRes.json(), cRes.json()]);
      setStats(s.stats);
      setOrders(o.orders || []);
      setInventory(i.inventory || []);
      setCouriers(c.couriers || []);
    } catch (_) {}
  }, []);

  const handleAdvance = useCallback(async (orderId, currentStatus) => {
    setActionLoading(p => ({...p, [orderId]: true}));
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'advance_status' }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal mengubah status', 'error');
      }
      // WS akan update order otomatis
    } finally {
      setActionLoading(p => ({...p, [orderId]: false}));
    }
  }, [showToast]);

  const handleAssign = useCallback(async (orderId, courierId) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ action: 'assign_courier', courierId }),
    });
  }, []);

  const handleInbound = async (e) => {
    e.preventDefault();
    setInboundLoading(true);
    setInboundSuccess('');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(inboundForm),
      });
      if (res.ok) {
        setInboundSuccess(`Stok "${inboundForm.name}" berhasil ditambahkan.`);
        setInboundForm({ name:'', quantity:'', unit:'kg', note:'' });
        setTimeout(() => setInboundSuccess(''), 4000);
      }
    } finally { setInboundLoading(false); }
  };

  const activeLocCount  = Object.keys(locations).length;
  const onDeliveryCount = orders.filter(o => o.status === 'on_delivery').length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-mbg-slate">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo-bgn.png" alt="MBG Logo" className="w-8 h-8 object-contain" />
              <span className="font-display font-bold text-lg text-slate-800">MBG<span className="text-mbg-blue">-Track</span></span>
            </div>
            <div className="flex items-center gap-3">
              {/* WS status */}
              <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                connected ? 'text-green-600 bg-green-50 border-green-200' :
                reconnecting ? 'text-amber-600 bg-amber-50 border-amber-200' :
                'text-slate-400 bg-slate-50 border-slate-200'
              }`}>
                {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {connected ? 'Real-time' : reconnecting ? 'Menghubungkan...' : 'Offline'}
              </div>
              {user && <NotificationBell userId={user.id} onNotificationUpdate={(refresh) => { notificationRefreshRef.current = refresh; }} />}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700">{user?.name}</span>
                <span className="text-xs text-mbg-blue font-medium">Admin Dapur MBG</span>
              </div>
              <button
                onClick={() => { const {clearSession} = require('../../lib/auth'); clearSession(); router.push('/'); }}
                className="text-slate-400 hover:text-red-500 transition-colors text-sm font-medium">
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard Dapur Umum</h1>
            <p className="text-sm text-slate-400 mt-1">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            {activeLocCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {activeLocCount} Kurir Live GPS
              </span>
            )}
            <button onClick={loadAll}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-mbg-blue transition-colors font-medium">
              <RefreshCw size={14} /> Segarkan
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Porsi" value={stats?.totalPortionsToday?.toLocaleString('id-ID') || '—'} sub="Hari ini" Icon={Users} color="bg-mbg-blue" />
          <StatCard label="Sisa Beras" value={`${Math.round(stats?.riceStock || 0)} kg`} sub="Dalam gudang" Icon={Package} color="bg-mbg-green" />
          <StatCard label="Sekolah Dilayani" value={`${stats?.schoolsServed || 0}/${stats?.totalSchools || 0}`} sub="Pengiriman selesai" Icon={CheckCircle2} color="bg-indigo-500" />
          <StatCard label="Total Pesanan" value={stats?.totalOrdersToday || 0} sub="Sekolah hari ini" Icon={TrendingUp} color="bg-purple-500" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-full sm:w-auto sm:inline-flex flex-wrap">
          {[
            { key: 'orders',    label: 'Pesanan', Icon: ClipboardList },
            { key: 'tracking',  label: 'Live Tracking', Icon: MapPin, badge: activeLocCount },
            { key: 'inbound',   label: 'Stok Masuk', Icon: Warehouse },
            { key: 'inventory', label: 'Inventaris', Icon: Package },
          ].map(({ key, label, Icon, badge }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex-1 sm:flex-none justify-center ${
                activeTab === key ? 'bg-mbg-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Rekap Pesanan Hari Ini</h2>
              <div className="flex items-center gap-3">
                {connected && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Auto-update aktif</span>}
                <span className="text-xs text-slate-400">{orders.length} sekolah</span>
              </div>
            </div>
            {orders.length === 0 ? (
              <div className="py-16 text-center">
                <AlertCircle size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm">Belum ada pesanan masuk hari ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs">
                      {['Sekolah','Porsi','Status','Kurir','Aksi','Bukti'].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map(order => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        couriers={couriers}
                        isLoading={actionLoading[order.id] || false}
                        onAdvance={handleAdvance}
                        onAssign={handleAssign}
                        onViewProof={setSelectedProof}
                        onViewTracking={setTrackingOrder}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LIVE TRACKING TAB */}
        {activeTab === 'tracking' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <MapPin size={16} className="text-mbg-blue" /> Live GPS Kurir
                </h2>
                <span className={`text-xs font-medium flex items-center gap-1 ${connected ? 'text-green-600' : 'text-slate-400'}`}>
                  {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
                  {connected ? 'Terhubung' : 'Terputus'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Lokasi real-time kurir yang sedang dalam perjalanan. Diperbarui setiap 5 detik.
              </p>
              <LiveMap locations={locations} couriers={couriers} />
            </div>
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Camera size={16} className="text-mbg-blue" /> Bukti Pengiriman Hari Ini
              </h2>
              {orders.filter(o => o.deliveryProof).length === 0 ? (
                <div className="py-8 text-center">
                  <Camera size={24} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400">Belum ada bukti pengiriman</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.filter(o => o.deliveryProof).map(order => (
                    <div key={order.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100"
                      onClick={() => setSelectedProof(order.deliveryProof)}>
                      <img src={order.deliveryProof.photoUrl} alt="Bukti"
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-200" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{order.school?.name}</p>
                        <p className="text-xs text-slate-400">{order.portions} porsi</p>
                        {order.deliveryProof.address && (
                          <p className="text-xs text-slate-400 truncate">{order.deliveryProof.address}</p>
                        )}
                      </div>
                      <Camera size={14} className="text-mbg-blue flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INBOUND TAB */}
        {activeTab === 'inbound' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <Warehouse size={16} className="text-mbg-blue" /> Catat Stok Bahan Masuk
              </h2>
              {inboundSuccess && (
                <div className="bg-mbg-green-light text-green-700 text-sm px-4 py-3 rounded-xl border border-green-200 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={14} /> {inboundSuccess}
                </div>
              )}
              <form onSubmit={handleInbound} className="space-y-4">
                <div>
                  <label className="label">Nama Bahan</label>
                  <input type="text" className="input-field" placeholder="cth: Beras, Ayam Potong"
                    value={inboundForm.name} onChange={e => setInboundForm(p => ({...p, name: e.target.value}))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Jumlah</label>
                    <input type="number" min="0.1" step="0.1" className="input-field" placeholder="0"
                      value={inboundForm.quantity} onChange={e => setInboundForm(p => ({...p, quantity: e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Satuan</label>
                    <select className="input-field" value={inboundForm.unit} onChange={e => setInboundForm(p => ({...p, unit: e.target.value}))}>
                      {['kg','liter','pack','karung','buah','ikat','gram'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Catatan</label>
                  <input type="text" className="input-field" placeholder="cth: Pengiriman dari Bulog"
                    value={inboundForm.note} onChange={e => setInboundForm(p => ({...p, note: e.target.value}))} />
                </div>
                <button type="submit" disabled={inboundLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                  <Plus size={16} /> {inboundLoading ? 'Menyimpan...' : 'Tambahkan Stok'}
                </button>
              </form>
            </div>
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <Package size={16} className="text-mbg-blue" /> Stok Saat Ini {connected && <span className="text-xs text-green-600 font-normal">(live)</span>}
              </h2>
              <div className="space-y-3">
                {inventory.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div>
                      <span className="font-medium text-slate-700 text-sm">{item.name}</span>
                      {item.quantity < 50 && <span className="ml-2 text-xs text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">Menipis</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">{item.quantity?.toLocaleString('id-ID')}</span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Inventaris Bahan Baku</h2>
              {connected && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    {['Nama Bahan','Stok','Satuan','Kondisi'].map(h => (
                      <th key={h} className="px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-semibold text-slate-800">{item.name}</td>
                      <td className="px-5 py-4 font-bold text-slate-900 text-base">{item.quantity?.toLocaleString('id-ID')}</td>
                      <td className="px-5 py-4 text-slate-500">{item.unit}</td>
                      <td className="px-5 py-4">
                        {item.quantity < 50
                          ? <span className="badge-cooking"><AlertCircle size={11}/> Stok Menipis</span>
                          : <span className="badge-done"><CheckCircle2 size={11}/> Aman</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedProof && <ProofModal proof={selectedProof} onClose={() => setSelectedProof(null)} />}
      {trackingOrder && <TrackingModal order={trackingOrder} locations={locations} couriers={couriers} onClose={() => setTrackingOrder(null)} />}
    </div>
  );
}
