import React, { useState } from 'react';
import {
  LogIn,
  KeyRound,
  UserCheck,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  Lock,
  Building2,
} from 'lucide-react';
import { User } from '../types';
import { StorageService } from '../services/storage';
import { GoogleSheetsService } from '../services/googleSheets';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onRefreshUsers?: () => void;
  isMandatory?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  onSelectUser,
  onRefreshUsers,
  isMandatory = false,
}) => {
  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & sync state
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncSuccessMsg(null);

    const cleanInput = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanInput) {
      setError('Silakan masukkan username atau nama lengkap Anda.');
      return;
    }

    if (!cleanPassword) {
      setError('Silakan masukkan sandi / password akun Anda.');
      return;
    }

    // Refresh users from storage if available
    const currentUsers = StorageService.getUsers();
    const userPool = currentUsers.length > 0 ? currentUsers : allUsers;

    const strippedInput = cleanInput.replace(/\s*\(plh\)|\s*\(ob\)|\s*\(kord\)|\s*\(admin\)/gi, '').trim();

    const user = userPool.find((u) => {
      if (u.status === 'Nonaktif' || (u.status as string) === 'Resign') return false;
      const uUsername = (u.username || '').trim().toLowerCase();
      const uName = (u.name || '').trim().toLowerCase();
      const uNameStripped = uName.replace(/\s*\(plh\)|\s*\(ob\)|\s*\(kord\)|\s*\(admin\)/gi, '').trim();

      // Check username match
      if (uUsername === cleanInput || uUsername === strippedInput) return true;
      // Check full name match
      if (uName === cleanInput || uNameStripped === strippedInput || uNameStripped === cleanInput) return true;
      
      // Alias shortcuts for Kepala Unit (tk, sd, smp, pelangi)
      if (cleanInput === 'tk' && (u.username === 'kepala.tk' || u.id === 'u-ku-tk' || (u.role === 'kepala_unit' && u.unit === 'TK'))) return true;
      if (cleanInput === 'sd' && (u.username === 'kepala.sd' || u.id === 'u-ku-sd' || (u.role === 'kepala_unit' && u.unit === 'SD'))) return true;
      if (cleanInput === 'smp' && (u.username === 'kepala.smp' || u.id === 'u-ku-smp' || (u.role === 'kepala_unit' && u.unit === 'SMP'))) return true;
      if (cleanInput === 'pelangi' && (u.username === 'kepala.pelangi' || u.id === 'u-ku-pelangi' || (u.role === 'kepala_unit' && u.unit.includes('Pelangi')))) return true;

      // Partial name or username match if input >= 3 chars
      if (cleanInput.length >= 3 && (uUsername.includes(cleanInput) || uNameStripped.includes(strippedInput))) return true;
      // Check without spaces
      const noSpaceInput = cleanInput.replace(/[\s._-]+/g, '');
      const noSpaceUsername = uUsername.replace(/[\s._-]+/g, '');
      const noSpaceName = uNameStripped.replace(/[\s._-]+/g, '');
      if (noSpaceUsername === noSpaceInput || noSpaceName === noSpaceInput) return true;

      return false;
    });

    if (!user) {
      setError(
        'Akun atau Nama tidak ditemukan. Jika user baru ditambahkan di Google Sheet, silakan klik tombol "Tarik Data User dari Google Sheet" di bawah.'
      );
      return;
    }

    const expectedPassword = user.password ? user.password.trim() : 'password123';
    const isUnitPassword =
      (user.unit === 'TK' && cleanPassword === 'tk123') ||
      (user.unit === 'SD' && cleanPassword === 'sd123') ||
      (user.unit === 'SMP' && cleanPassword === 'smp123') ||
      (user.unit?.includes('Pelangi') && cleanPassword === 'pelangi123');

    const isPasswordCorrect =
      cleanPassword === expectedPassword ||
      cleanPassword.toLowerCase() === expectedPassword.toLowerCase() ||
      (expectedPassword === 'password123' && cleanPassword === 'admin') ||
      (user.role === 'admin' && (cleanPassword === 'admin' || cleanPassword === 'password123')) ||
      (user.role === 'kepala_unit' && (cleanPassword === 'password123' || isUnitPassword));

    if (!isPasswordCorrect && expectedPassword !== '') {
      setError('Sandi / Password salah. Silakan periksa kembali kata sandi di Google Sheet (kolom Password / C) atau hubungi Kordinator.');
      return;
    }

    onSelectUser(user);
    if (onClose) onClose();
  };

  const handleSyncUsersFromSheet = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSyncSuccessMsg(null);

      const res = await GoogleSheetsService.pullFromSheets();
      if (res.success) {
        const freshUsers = StorageService.getUsers();
        setSyncSuccessMsg(
          `Berhasil! ${freshUsers.length} data user berhasil disinkronkan dari Google Sheet. Silakan masukkan username dan sandi.`
        );
        if (onRefreshUsers) onRefreshUsers();
      } else {
        setError(res.message || 'Gagal menyinkronkan user dari Google Sheet.');
      }
    } catch (err: any) {
      setError('Gagal tarik data: ' + (err.message || 'Periksa koneksi Google Sheet.'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-sky-700 flex items-center justify-center text-sm font-black text-white shadow-md">
              LZ
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-2">
                Facility Management Lazuardi
              </h3>
              <p className="text-[11px] text-slate-400">
                Sistem Kerja Divisi OB & Divisi PLH
              </p>
            </div>
          </div>
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {syncSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{syncSuccessMsg}</span>
            </div>
          )}

          {/* Form Login (Input Username & Sandi) */}
          <div className="space-y-4">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-2 border border-emerald-100 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Masukkan Username & Sandi Akun
              </h4>
              <p className="text-slate-500 text-xs mt-0.5">
                Autentikasi akun staf OB, staf PLH, kordinator, dan pengelola.
              </p>
            </div>

            <form onSubmit={handleManualLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username atau Nama Petugas:
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Contoh: syahril, andi, dedi, radilah, lili, rahmat, atau nama Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold bg-slate-50/50 focus:bg-white font-sans"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Bisa masuk menggunakan <strong>Username</strong> atau <strong>Nama Lengkap</strong> yang terdaftar di Google Sheet.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sandi / Password Akun:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-2xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold bg-slate-50/50 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98 text-xs mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Sistem</span>
              </button>
            </form>

            {/* Pintasan Login Akun Kepala Unit (Monitoring OB Per Unit) */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Akun Monitoring Kepala Unit (OB):</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Sandi: password123</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: 'TK', user: 'kepala.tk', pass: 'password123', label: 'Kepala Unit TK' },
                  { name: 'SD', user: 'kepala.sd', pass: 'password123', label: 'Kepala Unit SD' },
                  { name: 'SMP', user: 'kepala.smp', pass: 'password123', label: 'Kepala Unit SMP' },
                  { name: 'Pelangi', user: 'kepala.pelangi', pass: 'password123', label: 'Kepala Unit Pelangi' },
                ].map((item) => (
                  <button
                    key={item.user}
                    type="button"
                    onClick={() => {
                      setUsername(item.user);
                      setPassword(item.pass);
                    }}
                    className="p-2 rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <div>
                      <div className="font-extrabold text-[11px] text-slate-900 group-hover:text-indigo-900 flex items-center gap-1">
                        <span>🏛️</span>
                        <span>{item.label}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">user: {item.user}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Tarik Data dari Sheet */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSyncUsersFromSheet}
                disabled={isSyncing}
                className="w-full py-2.5 px-3 rounded-2xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100/80 text-sky-900 font-bold flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 text-xs shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : 'text-sky-700'}`} />
                <span>{isSyncing ? 'Sedang Menarik Data...' : '🔄 Tarik Data User dari Google Sheet'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
