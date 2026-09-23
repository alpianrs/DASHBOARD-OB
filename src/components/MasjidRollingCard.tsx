import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';
import {
  getMasjidRollingSchedule,
  getMasjidRollingProjection,
  isAreaOnMasjidDutyThisWeek,
} from '../utils/masjidRolling';

interface MasjidRollingCardProps {
  activeUser?: User;
  onSelectTask?: () => void;
  compact?: boolean;
}

export const MasjidRollingCard: React.FC<MasjidRollingCardProps> = ({
  activeUser,
  onSelectTask,
  compact = false,
}) => {
  // Guard eksklusif: Jika activeUser adalah staff/kordinator OB, komponen ini tidak ditampilkan
  if (activeUser && (activeUser.division || 'OB') !== 'PLH' && activeUser.role !== 'admin') {
    return null;
  }

  const [showProjection, setShowProjection] = useState(false);
  const schedule = getMasjidRollingSchedule();
  const projection = getMasjidRollingProjection(4);

  // Cek apakah user saat ini bertugas di area yang sedang piket masjid minggu ini
  const userUnitOrArea = activeUser?.unit || '';
  const isMyAreaTurn = isAreaOnMasjidDutyThisWeek(userUnitOrArea);

  return (
    <div
      id="masjid-rolling-card"
      className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-700/40 relative overflow-hidden"
    >
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
            <span className="text-xl">🕌</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-sm sm:text-base tracking-tight">
                Piket Aula Masjid (Rolling PLH)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-300" style={{ animationDuration: '6s' }} />
                <span>Reset Tiap Senin</span>
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>Minggu Aktif: <strong className="text-white">{schedule.weekRangeText}</strong></span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowProjection(!showProjection)}
          className="text-[11px] font-semibold text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
        >
          <span>{showProjection ? 'Tutup Rotasi' : 'Lihat Rotasi 4 Minggu'}</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showProjection ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Main Focus Area Banner */}
      <div className="mt-4 p-3.5 bg-black/25 backdrop-blur-xs rounded-xl border border-white/10 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-emerald-300/90 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Area Bertugas Minggu Ini:</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5 flex items-center gap-2">
              <span className="text-emerald-400 underline decoration-emerald-500/50 underline-offset-4">
                {schedule.activeArea}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg">
                Aktif Bertugas
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Giliran minggu depan (Senin berikutnya):{' '}
              <strong className="text-teal-200">{schedule.nextArea}</strong>
            </p>
          </div>

          {/* Quick status for current user */}
          {activeUser?.division === 'PLH' && (
            <div className="sm:text-right">
              {isMyAreaTurn ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>Giliran Area Anda Minggu Ini!</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Area Anda: Standby Tugas Rutin</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Aturan Pengecualian Pos 1 */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-start gap-2 text-[11px] text-emerald-100/75">
          <Info className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
          <span>
            <strong>Aturan Rolling:</strong> Hanya berlaku untuk <strong>Area Pos 2, Kolam Renang, Ex Minifarm, dan Khaldun</strong>.{' '}
            <span className="text-amber-200 font-semibold underline decoration-amber-400/50">
              Area Pos 1 Dikecualikan
            </span>{' '}
            karena fokus penjagaan akses gerbang depan.
          </span>
        </div>
      </div>

      {/* Projection Table / Dropdown */}
      {showProjection && (
        <div className="mt-3.5 p-3 bg-black/40 rounded-xl border border-white/10 space-y-2 animate-in fade-in duration-150 relative z-10">
          <div className="text-xs font-bold text-emerald-200 flex items-center justify-between">
            <span>Siklus Rotasi 4 Minggu ke Depan (Otomatis Reset Setiap Senin):</span>
            <span className="text-[10px] text-slate-400">4 Area Luar PLH</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {projection.map((item, idx) => (
              <div
                key={item.weekMondayDate}
                className={`p-2.5 rounded-xl border flex flex-col justify-between transition ${
                  item.isCurrentWeek
                    ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {item.isCurrentWeek ? '🌟 Minggu Ini' : `Minggu +${idx}`}
                  </span>
                  {item.isCurrentWeek && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-400 text-emerald-950">
                      ON DUTY
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-white">{item.area}</div>
                <div className="text-[10px] text-slate-400 mt-1">{item.weekRangeText}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button if onSelectTask provided */}
      {onSelectTask && !compact && (
        <div className="mt-3 flex justify-end relative z-10">
          <button
            type="button"
            onClick={onSelectTask}
            className="text-xs font-bold text-emerald-900 bg-emerald-300 hover:bg-emerald-200 px-3.5 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <span>Buka Tugas Piket Mingguan Aula Masjid</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
