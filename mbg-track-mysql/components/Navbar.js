import { useRouter } from 'next/router';
import { clearSession } from '../lib/auth';
import { LogOut, Utensils, User } from 'lucide-react';

const ROLE_LABELS = {
  admin: 'Admin Dapur MBG',
  school: 'Sekolah',
  courier: 'Kurir',
};

export default function Navbar({ user }) {
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src="/logo-bgn.png" alt="MBG Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-lg text-slate-800 tracking-tight">
              MBG<span className="text-mbg-blue">-Track</span>
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700 leading-tight">{user.name}</span>
                <span className="text-xs text-mbg-blue font-medium">{ROLE_LABELS[user.role]}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-mbg-blue-pale flex items-center justify-center">
                <User size={15} className="text-mbg-blue" />
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors duration-200 text-sm font-medium ml-1"
                title="Keluar"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
