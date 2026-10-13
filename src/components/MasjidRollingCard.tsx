import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Lock,
} from 'lucide-react';
import { User, MasjidRollingArea } from '../types';
import {
  getMasjidRollingSchedule,
  getMasjidRollingProjection,
  isAreaOnMasjidDutyThisWeek,
} from '../utils/masjidRolling';

// Pemetaan Penanggung Jawab Resmi 4 Area Luar PLH
const AREA_STAFF_MAP: Record<MasjidRollingArea, string> = {
  'Area Pos 2': 'Ahmad Syahril (PLH)',
  'Area Kolam Renang': 'Radilah (PLH)',
  'Area Ex Minifarm': 'Dedi Junaedi (PLH)',
  'Area Khaldun': 'Andi Komala (PLH)',
};

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
  // Guard eksklusif: Jika activeUser adalah staff/kordinator OB murni, komponen ini tidak ditampilkan
  if (activeUser && (activeUser.division || 'OB') !== 'PLH' && activeUser.role !== 'admin') {
    return null;
  }

  // Cek apakah user saat ini bertugas di area yang sedang piket masjid minggu ini
  const userUnitOrArea = activeUser?.assignedArea || activeUser?.unit || '';
  const isMyAreaTurn = isAreaOnMasjidDutyThisWeek(userUnitOrArea);

  // Jika staf biasa (role: user) dan BUKAN giliran piket aula masjid minggu ini, sembunyikan card
  if (activeUser && activeUser.role === 'user' && !isMyAreaTurn) {
    return null;
  }

  const [showProjection, setShowProjection] = useState(false);

  const schedule = getMasjidRollingSchedule();
  const projection = getMasjidRollingProjection(4);

  return (
    <div
      id="masjid-rolling-card"
      className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-emerald-700/40 relative overflow-hidden"
    >
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 relative z-10 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/25 border border-emerald-400/30 flex items-center justify-center text-emerald-200 shadow-inner shrink-0">
            <span className="text-2xl">🕌</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                Piket Aula Masjid (Rolling PLH)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <RefreshCw
                  className="w-2.5 h-2.5 animate-spin text-emerald-300"
                  style={{ animationDuration: '8s' }}
                />
                <span>Rotasi Otomatis Terjadwal</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-white/10 text-emerald-200 border border-white/10 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Jadwal Terkunci</span>
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>
                Minggu Aktif:{' '}
                <strong className="text-white font-bold">{schedule.weekRangeText}</strong>
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowProjection(!showProjection)}
          className="text-[11px] font-semibold text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ml-auto sm:ml-0"
        >
          <span>{showProjection ? 'Tutup Rotasi' : 'Lihat Rotasi 4 Minggu'}</span>
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${
              showProjection ? 'rotate-90' : ''
            }`}
          />
        </button>
      </div>

      {/* Main Focus Area Banner */}
      <div className="mt-4 p-4 bg-black/35 backdrop-blur-md rounded-2xl border border-white/10 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-emerald-300/90 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Area Bertugas Piket Minggu Ini:</span>
            </div>
            <div className="text-base sm:text-xl font-black text-white mt-1 flex items-center gap-2.5 flex-wrap">
              <span className="text-emerald-300 underline decoration-emerald-400/50 underline-offset-4">
                {schedule.activeArea}
              </span>
              <span className="text-xs font-semibold text-emerald-200 bg-white/10 px-2 py-0.5 rounded-lg border border-white/15">
                PJ: {AREA_STAFF_MAP[schedule.activeArea] || 'Staff PLH'}
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 rounded-lg">
                Aktif Bertugas
              </span>
            </div>

            {/* Waktu Pelaksanaan Khusus Pre-Readiness */}
            <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-200/95 font-medium flex-wrap">
              <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>
                Waktu Pelaksanaan:{' '}
                <strong className="text-white font-bold">
                  Pagi: 06:30 – 08:30 WIB
                </strong>{' '}
                <span className="text-emerald-300 font-semibold">(Kesiapan Pagi / Pre-Readiness)</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-300 mt-1.5 flex items-center gap-1.5">
              <span>Giliran minggu depan (Senin berikutnya):</span>{' '}
              <strong className="text-teal-200">
                {schedule.nextArea} (PJ: {AREA_STAFF_MAP[schedule.nextArea]})
              </strong>
            </p>
          </div>

          {/* Quick status for current user */}
          {activeUser?.division === 'PLH' && (
            <div className="sm:text-right shrink-0">
              {isMyAreaTurn ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-black shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Giliran Area Anda Minggu Ini!</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-slate-300 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Area Anda: Standby Tugas Rutin</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Projection Table / Dropdown */}
      {showProjection && (
        <div className="mt-3.5 p-3.5 bg-black/45 backdrop-blur-md rounded-2xl border border-white/10 space-y-2 animate-in fade-in duration-150 relative z-10">
          <div className="text-xs font-bold text-emerald-200 flex items-center justify-between">
            <span>Siklus Urutan Rotasi 4 Minggu (Otomatis Reset Setiap Senin):</span>
            <span className="text-[10px] text-slate-400">4 Area Luar PLH</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {projection.map((item, idx) => (
              <div
                key={item.weekMondayDate}
                className={`p-3 rounded-2xl border flex flex-col justify-between transition ${
                  item.isCurrentWeek
                    ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {item.isCurrentWeek ? '🌟 Minggu Ini' : `Minggu Ke-${idx + 1}`}
                    </span>
                    {item.isCurrentWeek && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-400 text-emerald-950">
                        ON DUTY
                      </span>
                    )}
                  </div>
                  <div className="font-extrabold text-sm text-white">{item.area}</div>
                  <div className="text-[11px] text-emerald-300 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>PJ: {AREA_STAFF_MAP[item.area]}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-400">
                  <div>{item.weekRangeText}</div>
                  <div className="text-amber-200/90 font-medium mt-0.5">06:30 – 08:30 WIB</div>
                </div>
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
            className="text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <span>Buka Tugas Piket Pre-Readiness Aula Masjid</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
