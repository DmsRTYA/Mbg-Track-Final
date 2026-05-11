import { useState } from 'react';
import { useRouter } from 'next/router';
import { Utensils, ArrowRight, ShieldCheck, TrendingUp, Truck, CheckCircle, ChevronRight } from 'lucide-react';
import { setSession } from '../lib/auth';

const DEMO_ACCOUNTS = [
  { label: 'Admin Dapur MBG', email: 'admin@mbg.go.id', password: 'admin123', color: 'bg-mbg-blue' },
  { label: 'Sekolah (SDN 01)', email: 'sdn01@mbg.go.id', password: 'sekolah123', color: 'bg-mbg-green' },
  { label: 'Kurir (Ahmad)', email: 'kurir1@mbg.go.id', password: 'kurir123', color: 'bg-amber-500' },
];

const FEATURES = [
  { Icon: TrendingUp, title: 'Monitoring Real-Time', desc: 'Pantau status distribusi makanan dari dapur hingga ke tangan siswa secara langsung.' },
  { Icon: ShieldCheck, title: 'Manajemen Stok Terpusat', desc: 'Kelola inventaris bahan baku dapur dengan sistem pencatatan masuk dan keluar yang terstruktur.' },
  { Icon: Truck, title: 'Koordinasi Kurir Terintegrasi', desc: 'Tugaskan kurir, lacak perjalanan, dan konfirmasi penerimaan dalam satu platform.' },
  { Icon: CheckCircle, title: 'Laporan Akurat', desc: 'Rekap data harian porsi, sekolah yang dilayani, dan penggunaan stok tersedia otomatis.' },
];

export default function LandingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSession(data.user);
      if (data.user.role === 'admin') router.push('/dashboard/admin');
      else if (data.user.role === 'school') router.push('/dashboard/school');
      else router.push('/dashboard/courier');
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setForm({ email: acc.email, password: acc.password });
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen bg-mbg-slate">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src="/logo-bgn.png" alt="MBG Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-lg text-slate-800 tracking-tight">
              MBG<span className="text-mbg-blue">-Track</span>
            </span>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className="btn-primary py-2 px-5 text-sm"
          >
            Masuk ke Sistem
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-mbg-blue-pale via-white to-sky-50 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-mbg-blue/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-sky-300/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-mbg-blue/10 text-mbg-blue text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-mbg-blue"></span>
              Program Makan Bergizi Gratis — Pemerintah Indonesia
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
              Sistem Manajemen
              <span className="block text-mbg-blue">Rantai Pasokan</span>
              Dapur Umum MBG
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-2xl">
              Platform terintegrasi untuk mendigitalisasi seluruh proses distribusi makan bergizi — mulai dari pencatatan bahan baku, koordinasi dapur, penugasan kurir, hingga konfirmasi penerimaan di sekolah.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowLogin(true)} className="btn-primary flex items-center justify-center gap-2">
                Masuk ke Sistem
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => document.getElementById('fitur').scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                Lihat Fitur
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-mbg-blue py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '3 Juta+', label: 'Porsi Per Hari' },
              { value: '82.9 Juta', label: 'Siswa Sasaran' },
              { value: '514', label: 'Kabupaten/Kota' },
              { value: '100%', label: 'Terdigitalisasi' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                <div className="text-sky-200 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-slate-900 mb-3">Fitur Utama Platform</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Dirancang untuk kebutuhan operasional nyata di lapangan, dari admin dapur hingga kurir pengiriman.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="card hover:shadow-elevated transition-shadow duration-300 group">
                <div className="w-11 h-11 rounded-xl bg-mbg-blue-pale flex items-center justify-center mb-4 group-hover:bg-mbg-blue transition-colors duration-300">
                  <Icon size={20} className="text-mbg-blue group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Accounts */}
      <section className="py-16 bg-mbg-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">Coba Dengan Akun Demo</h2>
            <p className="text-slate-500 text-sm">Klik salah satu peran di bawah untuk mengisi form login secara otomatis.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc)}
                className="card hover:shadow-elevated transition-all duration-200 hover:-translate-y-1 text-left group"
              >
                <div className={`w-8 h-8 rounded-lg ${acc.color} flex items-center justify-center mb-3`}>
                  <Utensils size={14} className="text-white" />
                </div>
                <div className="font-semibold text-slate-700 text-sm">{acc.label}</div>
                <div className="text-xs text-slate-400 mt-1">{acc.email}</div>
                <div className="text-xs text-mbg-blue font-medium mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Gunakan akun ini <ArrowRight size={11} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo-bgn.png" alt="MBG Logo" className="w-6 h-6 object-contain" />
            <span className="font-display font-bold text-slate-700 text-sm">MBG-Track</span>
          </div>
          <p className="text-xs text-slate-400">
            Sistem Informasi Manajemen Rantai Pasokan Dapur Umum — Program Makan Bergizi Gratis
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLogin(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mbg-blue flex items-center justify-center">
                <Utensils size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Masuk ke Sistem</h2>
                <p className="text-xs text-slate-400">MBG-Track Supply Chain</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Alamat Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="email@mbg.go.id"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-3 font-medium">Akun Demo Tersedia:</p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => setForm({ email: acc.email, password: acc.password })}
                    className="w-full text-left px-3 py-2 rounded-lg bg-mbg-slate hover:bg-sky-50 transition-colors text-xs"
                  >
                    <span className="font-semibold text-slate-700">{acc.label}</span>
                    <span className="text-slate-400 ml-2">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
