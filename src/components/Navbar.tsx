import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  Clock,
  RefreshCw,
  LogOut,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FolderSync,
} from 'lucide-react';
import { User, SyncConfig } from '../types';

interface NavbarProps {
  activeUser: User;
  onSwitchUser: () => void;
  onLogout?: () => void;
  syncConfig: SyncConfig;
  onOpenSyncModal: () => void;
  onOpenDinasModal: () => void;
  onOpenPeerInspectionModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  onSwitchUser,
  onLogout,
  syncConfig,
  onOpenSyncModal,
  onOpenDinasModal,
  onOpenPeerInspectionModal,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [isPreReadinessTime, setIsPreReadinessTime] = useState<boolean>(true);
  const [hoursLeftPR, setHoursLeftPR] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format WIB Time
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      setCurrentTime(timeStr);
      setCurrentDateStr(dateStr);

      const hours = now.getHours();
      // Pre-Readiness is 00:00 - 09:00
      if (hours < 9) {
        setIsPreReadinessTime(true);
        const minsLeft = (8 - hours) * 60 + (60 - now.getMinutes());
        const h = Math.floor(minsLeft / 60);
        const m = minsLeft % 60;
        setHoursLeftPR(`${h}j ${m}m lagi`);
      } else {
        setIsPreReadinessTime(false);
        setHoursLeftPR('Clock Out Period (09:00 - 23:59)');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 tracking-wide uppercase">
            Admin FM
          </span>
        );
      case 'kordinator':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 tracking-wide uppercase">
            Kordinator
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 tracking-wide uppercase">
            Staff OB/OG
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner: Lazuardi GCS FM Identity */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0 font-bold text-sm tracking-tight border border-slate-800 relative">
            <span>LZ</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Lazuardi GCS
              </h1>
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/60 hidden sm:inline-block">
                Facility Management
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Unit: </span>
              <strong className="text-slate-800 font-semibold">{activeUser.unit}</strong>
            </p>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Google Sheets Sync Button */}
          <button
            onClick={onOpenSyncModal}
            title="Sinkronisasi Google Sheets & Drive"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Google Sheets 2-Arah</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* User Profile & Switcher */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <button
              onClick={onSwitchUser}
              title="Ganti Akun / Info Akun"
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-all text-left cursor-pointer border border-transparent hover:border-slate-200 group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {activeUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight group-hover:text-sky-700 transition">
                  {activeUser.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {getRoleBadge(activeUser.role)}
                </div>
              </div>
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform duration-300 hidden sm:inline-block" />
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar / Logout"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub Header: Time & Timing Stage Indicator */}
      <div className="bg-slate-50/80 border-t border-slate-200/80 px-3 sm:px-6 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {currentDateStr}, <strong className="text-slate-900">{currentTime} WIB</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isPreReadinessTime ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-semibold text-[11px] shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
              <span>Pre-Readiness (00:00 - 09:00)</span>
              <span className="text-emerald-600 font-normal">({hoursLeftPR})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-900 font-semibold text-[11px] shadow-2xs">
              <Clock className="w-3 h-3 text-sky-600" />
              <span>Clock Out Period (09:00 - 23:59)</span>
              <span className="text-sky-700 font-normal">Pre-Readiness Ditutup</span>
            </div>
          )}

          {activeUser.role === 'user' && (
            <button
              onClick={onOpenDinasModal}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              + Izin Dinas Luar
            </button>
          )}

          {activeUser.role === 'kordinator' && (
            <button
              onClick={onOpenPeerInspectionModal}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              + Inspeksi Unit & Evaluasi
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
