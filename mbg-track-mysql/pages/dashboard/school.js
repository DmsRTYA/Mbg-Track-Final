import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSession } from '../../lib/auth';
import { useWebSocket } from '../../lib/useWebSocket';
import { usePushNotification } from '../../lib/usePush';
import NotificationBell from '../../components/NotificationBell';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import { Users, Send, CheckCircle2, RefreshCw, AlertCircle, CalendarDays, Camera, MapPin, Wifi, WifiOff } from 'lucide-react';

const EVT = {
  ORDER_UPDATED:   'order_updated',
  PROOF_SUBMITTED: 'proof_submitted',
};

export default function SchoolDashboard() {
  const router  = useRouter();
  const [user,       setUser]        = useState(null);
  const [todayOrder, setTodayOrder]  = useState(null);
  const [portions,   setPortions]    = useState('');
  const [loading,    setLoading]     = useState(false);
  const [submitting, setSubmitting]  = useState(false);
  const [confirming, setConfirming]  = useState(false);
  const [error,      setError]       = useState('');
  const [success,    setSuccess]     = useState('');
  const [toast,      setToast]       = useState(null);
  const toastRef = useRef(null);
  const today = new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  usePushNotification(user);

  // ── WebSocket handler ───────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    if (!todayOrder) return;
    if (msg.type === EVT.ORDER_UPDATED && msg.order?.id === todayOrder.id) {
      setTodayOrder(msg.order);
      const labels = { cooking:'Sedang Dimasak', on_delivery:'Dalam Perjalanan', delivered:'Telah Diterima' };
      const label  = labels[msg.order.status];
      if (label) showToast(`Status pesanan: ${label}`, 'info');
    }
    if (msg.type === EVT.PROOF_SUBMITTED && msg.order?.id === todayOrder.id) {
      setTodayOrder(msg.order);
      showToast('Bukti pengiriman dari kurir telah diterima!', 'success');
    }
  }, [todayOrder]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 4000);
  };

  const { connected, reconnecting } = useWebSocket(user, handleWsMessage);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'school') { router.push('/'); return; }
    setUser(session);
    const sid = session.school?.id || session.schoolId;
    if (sid) loadOrder(sid);
  }, []);

  const loadOrder = useCallback(async (schoolId) => {
    const date = new Date().toISOString().split('T')[0];
    setLoading(true);
    try {
      const res  = await fetch(`/api/orders?schoolId=${schoolId}&date=${date}`);
      const data = await res.json();
      if (data.orders?.length > 0) {
        setTodayOrder(data.orders[0]);
        setPortions(String(data.orders[0].portions));
      }
    } finally { setLoading(false); }
  }, []);

  const maxPortions  = user?.school?.totalStudents || 9999;
  const portionsInt  = parseInt(portions) || 0;
  const attendancePct = maxPortions > 0 ? Math.min(100, Math.round(portionsInt / maxPortions * 100)) : 0;
  const overLimit    = portionsInt > maxPortions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (portionsInt < 1) { setError('Jumlah porsi harus lebih dari 0.'); return; }
    if (overLimit)       { setError(`Maks. ${maxPortions.toLocaleString('id-ID')} porsi.`); return; }

    setSubmitting(true); setError(''); setSuccess('');
    try {
      const sid = user?.school?.id || user?.schoolId;
      const res = await fetch('/api/orders', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ schoolId: sid, portions: portionsInt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengirim permintaan.'); return; }
      setTodayOrder(data.order);
      setSuccess('Permintaan berhasil dikirim ke dapur!');
      setTimeout(() => setSuccess(''), 4000);
    } finally { setSubmitting(false); }
  };

  const handleConfirm = async () => {
    if (!todayOrder) return;
    setConfirming(true);
    try {
      const res  = await fetch(`/api/orders/${todayOrder.id}`, {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'advance_status' }),
      });
      const data = await res.json();
      if (res.ok) {
        setTodayOrder(data.order);
        setSuccess('Penerimaan makanan berhasil dikonfirmasi!');
        setTimeout(() => setSuccess(''), 4000);
      }
    } finally { setConfirming(false); }
  };

  if (!user) return null;
  const school = user.school;

  return (
    <div className="min-h-screen bg-mbg-slate">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-medium fade-in ${
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'error'   ? 'bg-red-600 text-white'   : 'bg-slate-800 text-white'
        }`}>{toast.message}</div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/logo-bgn.png" alt="MBG Logo" className="w-8 h-8 object-contain" />
              <span className="font-display font-bold text-lg text-slate-800">MBG<span className="text-mbg-blue">-Track</span></span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                connected ? 'text-green-600 bg-green-50 border-green-200' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                {connected ? <Wifi size={11}/> : <WifiOff size={11}/>}
                {connected ? 'Live' : reconnecting ? '...' : 'Offline'}
              </div>
              <NotificationBell userId={user?.id} />
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700">{school?.name || user?.name}</span>
                <span className="text-xs text-mbg-blue font-medium">Sekolah</span>
              </div>
              <button onClick={() => { const {clearSession}=require('../../lib/auth'); clearSession(); router.push('/'); }}
                className="text-slate-400 hover:text-red-500 text-sm font-medium">Keluar</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard Sekolah</h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5"><CalendarDays size={13}/>{today}</p>
          </div>
          <button onClick={() => loadOrder(user?.school?.id || user?.schoolId)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-mbg-blue font-medium">
            <RefreshCw size={14}/> Segarkan
          </button>
        </div>

        {/* School hero card */}
        <div className="card bg-gradient-to-br from-mbg-blue to-mbg-blue-dark text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sky-200 text-sm font-medium">Sekolah Terdaftar</p>
              <h2 className="text-xl font-display font-bold mt-1">{school?.name}</h2>
              <p className="text-sky-200 text-sm mt-1">{school?.address}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-5 py-3 text-center flex-shrink-0">
              <p className="text-2xl font-display font-bold">{school?.totalStudents?.toLocaleString('id-ID')}</p>
              <p className="text-sky-200 text-xs mt-0.5">Maks. Porsi/Hari</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="bg-mbg-green-light text-green-700 text-sm px-4 py-3 rounded-xl border border-green-200 flex items-center gap-2 fade-in">
            <CheckCircle2 size={15}/> {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
            <AlertCircle size={15}/> {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Permintaan */}
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <Users size={16} className="text-mbg-blue"/> Form Permintaan Harian
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Maks: <strong className="text-slate-600">{maxPortions.toLocaleString('id-ID')}</strong> porsi (total siswa terdaftar).
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Jumlah Siswa Hadir Hari Ini</label>
                <input
                  type="number" min="1" max={maxPortions}
                  className={`input-field text-xl font-bold ${overLimit ? 'border-red-400 focus:ring-red-300' : ''}`}
                  placeholder={`1 – ${maxPortions.toLocaleString('id-ID')}`}
                  value={portions}
                  onChange={e => {
                    setPortions(e.target.value);
                    const n = parseInt(e.target.value) || 0;
                    if (n > maxPortions) setError(`Maks. ${maxPortions.toLocaleString('id-ID')} porsi.`);
                    else setError('');
                  }}
                  disabled={todayOrder && todayOrder.status !== 'pending'}
                  required
                />
                {portionsInt > 0 && !overLimit && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Kehadiran: <strong className="text-mbg-blue">{attendancePct}%</strong></span>
                      <span>{portionsInt.toLocaleString('id-ID')} / {maxPortions.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-mbg-blue rounded-full transition-all duration-300"
                        style={{width:`${attendancePct}%`}}/>
                    </div>
                  </div>
                )}
                {overLimit && (
                  <p className="text-xs text-red-500 mt-1.5">
                    Melebihi total siswa! Maks: {maxPortions.toLocaleString('id-ID')} porsi.
                  </p>
                )}
              </div>
              <button type="submit"
                disabled={submitting || overLimit || (todayOrder && todayOrder.status !== 'pending')}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={15}/>
                {submitting ? 'Mengirim...' : todayOrder ? 'Perbarui Permintaan' : 'Kirim ke Dapur'}
              </button>
              {todayOrder && todayOrder.status !== 'pending' && (
                <p className="text-xs text-center text-slate-400">Permintaan sedang diproses dapur.</p>
              )}
            </form>
          </div>

          {/* Status Pengiriman */}
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-slate-800">Status Pengiriman</h2>
              {connected && todayOrder && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>Auto-update
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-6">Diperbarui otomatis tanpa refresh halaman.</p>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i=><div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse"/>)}
              </div>
            ) : !todayOrder ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle size={20} className="text-slate-300"/>
                </div>
                <p className="text-slate-400 text-sm">Belum ada permintaan hari ini.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <DeliveryTimeline status={todayOrder.status}/>

                <div className="bg-mbg-slate rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Jumlah Porsi</span>
                    <span className="font-bold text-slate-800">{todayOrder.portions?.toLocaleString('id-ID')} porsi</span>
                  </div>
                  {todayOrder.courier && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Kurir</span>
                      <span className="font-semibold text-slate-700">{todayOrder.courier.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Waktu Permintaan</span>
                    <span className="text-slate-600">{new Date(todayOrder.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                </div>

                {todayOrder.status === 'on_delivery' && (
                  <button onClick={handleConfirm} disabled={confirming}
                    className="btn-success w-full flex items-center justify-center gap-2 disabled:opacity-60">
                    <CheckCircle2 size={16}/>
                    {confirming ? 'Mengkonfirmasi...' : 'Konfirmasi Makanan Diterima'}
                  </button>
                )}

                {todayOrder.status === 'delivered' && (
                  <div className="space-y-3">
                    <div className="bg-mbg-green-light rounded-xl p-4 text-center">
                      <CheckCircle2 size={24} className="mx-auto text-green-600 mb-2"/>
                      <p className="text-green-700 font-semibold text-sm">Makanan telah diterima dengan baik.</p>
                    </div>
                    {todayOrder.deliveryProof && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                          <Camera size={12}/> Bukti Foto dari Kurir
                        </p>
                        <img src={todayOrder.deliveryProof.photoUrl} alt="Bukti"
                          className="w-full h-40 object-cover rounded-lg bg-slate-100"/>
                        {todayOrder.deliveryProof.address && (
                          <p className="text-xs text-slate-400 mt-2 flex items-start gap-1">
                            <MapPin size={10} className="mt-0.5 flex-shrink-0"/>{todayOrder.deliveryProof.address}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
