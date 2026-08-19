import React, { useState } from 'react';
import {
  LogIn,
  KeyRound,
  UserCheck,
  Building2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { User } from '../types';
import { GoogleSheetsService } from '../services/googleSheets';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onRefreshUsers?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  onSelectUser,
  onRefreshUsers,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncSuccessMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('Silakan masukkan username yang terdaftar di Google Sheet.');
      return;
    }

    const user = allUsers.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername &&
        u.status !== 'Nonaktif'
    );

    if (!user) {
      setError('Username tidak ditemukan pada data Google Sheet atau akun berstatus nonaktif.');
      return;
    }

    // Validate password if provided in the user data from Google Sheet
    const expectedPassword = user.password ? user.password.trim() : 'password123';
    if (cleanPassword && cleanPassword !== expectedPassword && expectedPassword !== '') {
      setError('Password salah. Silakan sesuaikan dengan password di Google Sheet tab "Users".');
      return;
    }

    onSelectUser(user);
    onClose();
  };

  const handleSyncUsersFromSheet = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSyncSuccessMsg(null);
      const res = await GoogleSheetsService.pullFromSheets();
      if (res.success) {
        setSyncSuccessMsg('Data user berhasil disinkronkan langsung dari Google Sheet!');
        if (onRefreshUsers) onRefreshUsers();
      } else {
        setError(res.message || 'Gagal menyinkronkan user dari Google Sheet.');
      }
    } catch (err: any) {
      setError('Gagal sinkron: ' + (err.message || 'Periksa koneksi Google Sheet.'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-sm font-black text-white shadow-xs">
              LZ
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight tracking-tight">
                Facility Management Lazuardi GCS
              </h3>
              <p className="text-[11px] text-slate-400">Login Sistem via Google Sheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Badge: 100% Google Sheets Database */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-900">
              <strong className="block font-bold">Kredensial Terhubung ke Google Sheet</strong>
              Username, password, unit, dan role staf dikelola langsung pada tab <strong>Users</strong> di Google Sheet.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {syncSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Form Login Username & Password */}
          <form onSubmit={handleManualLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username:
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Masukkan username (contoh: alpian, ratih_sd, rizky_kord)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password Rahasia:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password akun Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium bg-slate-50/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                *Akun tersimpan otomatis di perangkat ini. Anda tidak perlu login berulang kali.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Aplikasi</span>
            </button>
          </form>

          {/* Sync Button from Google Sheet */}
          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-200">
            <span className="text-[10px] text-slate-500 font-medium">Data user belum terupdate?</span>
            <button
              type="button"
              onClick={handleSyncUsersFromSheet}
              disabled={isSyncing}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Tarik Data User dari Sheet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
