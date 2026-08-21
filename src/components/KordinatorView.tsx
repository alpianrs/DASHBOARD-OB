import React, { useState } from 'react';
import {
  ShieldCheck,
  Star,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  Send,
  Building2,
  Calendar,
  Layers,
  Award,
  Filter,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import {
  User,
  MasterTask,
  TaskLog,
  JobBareng,
  DinasRequest,
  PeerInspection,
  WeeklyScore,
  UnitType,
  EVALUATION_CATEGORIES,
} from '../types';
import { UserTaskView } from './UserTaskView';
import {
  getSaturdayOptionsList,
  formatSaturdayDate,
  getCurrentWeekSaturday,
  toISODateString,
} from '../utils/saturdayHelper';

interface KordinatorViewProps {
  activeUser: User;
  allUsers: User[];
  masterTasks: MasterTask[];
  taskLogs: TaskLog[];
  jobBarengList: JobBareng[];
  dinasRequests: DinasRequest[];
  peerInspections: PeerInspection[];
  weeklyScores: WeeklyScore[];
  onStartTask: (task: MasterTask, isLate: boolean) => void;
  onJoinJobBareng: (jobId: string) => void;
  onCompleteJobBareng: (job: JobBareng) => void;
  onOpenDinasModal: () => void;
  onOpenPeerInspectionModal: () => void;
  onSubmitWeeklyScore: (score: WeeklyScore) => void;
  onVerifyTaskLog: (logId: string, score: number, notes: string) => void;
}

export const KordinatorView: React.FC<KordinatorViewProps> = ({
  activeUser,
  allUsers,
  masterTasks,
  taskLogs,
  jobBarengList,
  dinasRequests,
  peerInspections,
  weeklyScores,
  onStartTask,
  onJoinJobBareng,
  onCompleteJobBareng,
  onOpenDinasModal,
  onOpenPeerInspectionModal,
  onSubmitWeeklyScore,
  onVerifyTaskLog,
}) => {
  const [activeKordTab, setActiveKordTab] = useState<
    'my_tasks' | 'inspect_all' | 'weekly_rating' | 'monitoring'
  >('monitoring');

  // Multi-unit filter for Coordinator inspection
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<UnitType | 'Semua Unit'>('Semua Unit');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    allUsers.filter((u) => u.role === 'user')[0]?.id || ''
  );

  // 15 Categories evaluation state (scale 1 - 4)
  const initialScores: Record<string, number> = EVALUATION_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = 4;
      return acc;
    },
    {} as Record<string, number>
  );

  const [categoryScores, setCategoryScores] = useState<Record<string, number>>(initialScores);
  const [categoryNotes, setCategoryNotes] = useState<Record<string, string>>({});
  const [scoreNotes, setScoreNotes] = useState<string>('');
  
  // Saturday evaluation options list
  const saturdayOptions = getSaturdayOptionsList(12, 2);
  const defaultSaturday = saturdayOptions.find((o) => o.isCurrentWeek)?.isoDate || toISODateString(getCurrentWeekSaturday());
  const [selectedSaturdayDate, setSelectedSaturdayDate] = useState<string>(defaultSaturday);
  
  const [scoreSuccessMsg, setScoreSuccessMsg] = useState<string | null>(null);
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);

  // Selected Photo Preview
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const obOgStaff = allUsers.filter((u) => u.role === 'user' && u.status === 'Aktif');

  // Filter staff by unit
  const filteredStaff = selectedUnitFilter === 'Semua Unit'
    ? obOgStaff
    : obOgStaff.filter((u) => u.unit === selectedUnitFilter);

  // Today logs
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = taskLogs.filter((l) => l.date === today);

  const filteredLogs = selectedUnitFilter === 'Semua Unit'
    ? todayLogs
    : todayLogs.filter((l) => l.unit === selectedUnitFilter);

  // Calculate current average score (1 - 4)
  const categoryValues: number[] = Object.values(categoryScores);
  const currentAverageScore =
    categoryValues.length > 0
      ? Number(
          (
            categoryValues.reduce((a: number, b: number) => a + b, 0) / categoryValues.length
          ).toFixed(2)
        )
      : 4;

  const handleCategoryScoreChange = (category: string, value: number) => {
    setCategoryScores((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSetAllCategories = (scoreVal: number) => {
    const updated: Record<string, number> = {};
    EVALUATION_CATEGORIES.forEach((cat) => {
      updated[cat] = scoreVal;
    });
    setCategoryScores(updated);
  };

  const handleScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStaff = allUsers.find((u) => u.id === selectedStaffId);
    if (!targetStaff) return;

    const matchedOption = saturdayOptions.find((o) => o.isoDate === selectedSaturdayDate);
    const dateFormatted = matchedOption?.formattedFull || formatSaturdayDate(selectedSaturdayDate);
    const targetDate = new Date(selectedSaturdayDate);
    const evalYear = isNaN(targetDate.getFullYear()) ? new Date().getFullYear() : targetDate.getFullYear();

    const newWeeklyScore: WeeklyScore = {
      id: `ws-${Date.now()}`,
      saturdayDate: selectedSaturdayDate,
      dateRange: dateFormatted,
      weekNumber: Math.ceil(targetDate.getDate() / 7) || 1,
      year: evalYear,
      userId: targetStaff.id,
      userName: targetStaff.name,
      unit: targetStaff.unit,
      kordinatorId: activeUser.id,
      kordinatorName: activeUser.name,
      score: currentAverageScore,
      categoryScores: { ...categoryScores },
      categoryNotes: { ...categoryNotes },
      notes:
        scoreNotes.trim() ||
        `Evaluasi kebersihan standar Lazuardi GCS per ${dateFormatted} (Rata-rata: ${currentAverageScore}/4).`,
      timestamp: new Date().toISOString(),
    };

    onSubmitWeeklyScore(newWeeklyScore);
    setScoreSuccessMsg(`Berhasil menyimpan penilaian 15 kategori untuk ${targetStaff.name} pada ${dateFormatted}!`);
    setScoreNotes('');
    setTimeout(() => setScoreSuccessMsg(null), 3500);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 3.5) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 2.5) return 'bg-sky-100 text-sky-800 border-sky-300';
    if (score >= 2.0) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  const getScoreDescription = (score: number) => {
    if (score === 4) return 'Sangat Bersih & Kinclong';
    if (score === 3) return 'Bersih Sesuai SOP';
    if (score === 2) return 'Cukup (Perlu Ditingkatkan)';
    return 'Kurang (Perlu Perbaikan Segera)';
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Coordinator Top Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100/90 rounded-xl text-xs font-semibold border border-slate-200/60">
        <button
          onClick={() => setActiveKordTab('monitoring')}
          className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeKordTab === 'monitoring'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Monitoring Tim</span>
        </button>

        <button
          onClick={() => setActiveKordTab('weekly_rating')}
          className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeKordTab === 'weekly_rating'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Penilaian Mingguan</span>
        </button>

        <button
          onClick={() => setActiveKordTab('inspect_all')}
          className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeKordTab === 'inspect_all'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Inspeksi Semua Unit</span>
        </button>

        <button
          onClick={() => setActiveKordTab('my_tasks')}
          className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeKordTab === 'my_tasks'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Tugas Harian Saya</span>
        </button>
      </div>

      {/* TAB 1: LIVE MONITORING TIM */}
      {activeKordTab === 'monitoring' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Unit Filter Selector */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                  Monitoring Pekerjaan Hari Ini
                </h3>
                <p className="text-xs text-slate-500">
                  {filteredLogs.length} Aktivitas tercatat hari ini ({today})
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {(
                [
                  'Semua Unit',
                  'TK',
                  'SD',
                  'SMP',
                  'Pelangi Direktorat',
                  'Ar Razi',
                  'Khaldun',
                ] as const
              ).map((u) => (
                <button
                  key={u}
                  onClick={() => setSelectedUnitFilter(u)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                    selectedUnitFilter === u
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Stream */}
          <div className="space-y-2.5">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2.5 text-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{log.userName}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200/60">
                          Unit {log.unit}
                        </span>
                        {log.isLate || log.status === 'Terlambat' ? (
                          Boolean(log.lateReason && log.lateReason.trim().length > 0) ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                              <Check className="w-3 h-3 text-emerald-700" /> Telat (Sudah Lapor)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> Telat (Belum Lapor)
                            </span>
                          )
                        ) : log.status === 'Selesai' ? (
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Selesai
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-sky-50 text-sky-800 border border-sky-200">
                            {log.status}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-800 mt-1">{log.taskTitle}</h4>
                    </div>

                    {/* Time */}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 italic">
                      Catatan Staff: "{log.notes}"
                    </p>
                  )}

                  {log.lateReason && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <strong className="font-semibold">Alasan Keterlambatan:</strong> {log.lateReason}
                    </div>
                  )}

                  {/* Photo & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      {log.photoUrl ? (
                        <button
                          onClick={() => setPhotoPreview(log.photoUrl!)}
                          className="flex items-center gap-1.5 text-sky-700 hover:text-sky-800 font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau Foto Watermark Live</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">Tidak ada foto</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {log.verifiedByKordinator ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Terverifikasi Kordinator</span>
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            onVerifyTaskLog(
                              log.id,
                              4,
                              'Pekerjaan terverifikasi rapi dan sesuai SOP Lazuardi.'
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                        >
                          ✓ Verifikasi SOP
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white border border-slate-200/80 rounded-2xl text-slate-400 text-xs">
                Belum ada pekerjaan yang disubmit untuk filter unit ini hari ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENILAIAN MINGGUAN (1-4 DENGAN 15 KATEGORI) */}
      {activeKordTab === 'weekly_rating' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 tracking-tight">
                  Form Penilaian Mingguan Kordinator (Skala 1 - 4)
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluasi mingguan per-petugas mencakup 15 kategori kebersihan & sanitasi standar Lazuardi GCS.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Tanggal Evaluasi (Sabtu):
              </span>
              <select
                value={selectedSaturdayDate}
                onChange={(e) => setSelectedSaturdayDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 shadow-2xs"
              >
                {saturdayOptions.map((opt) => (
                  <option key={opt.isoDate} value={opt.isoDate}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {scoreSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scoreSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleScoreSubmit} className="space-y-5 text-xs">
            {/* Choose Target Staff */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <label className="block font-bold text-slate-800 mb-1.5 text-xs">
                Pilih Petugas OB / OG yang Dievaluasi:
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs sm:text-sm"
              >
                {obOgStaff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — Unit {u.unit} (Status: {u.status})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                * Catatan: Nilai ini hanya dapat dilihat oleh Kordinator dan Admin, tidak tampil pada akun petugas.
              </p>
            </div>

            {/* Quick Presets & Scale Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-sky-50/60 border border-sky-200/70 rounded-xl">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-sky-950">Atur Cepat:</span>
                <button
                  type="button"
                  onClick={() => handleSetAllCategories(4)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-[11px] rounded-lg cursor-pointer transition shadow-2xs"
                >
                  Semua Nilai 4 (Kinclong)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllCategories(3)}
                  className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-sky-300 text-sky-800 font-bold text-[11px] rounded-lg cursor-pointer transition shadow-2xs"
                >
                  Semua Nilai 3 (Standar SOP)
                </button>
              </div>

              <div className="text-[10px] text-slate-600 font-medium flex items-center gap-2">
                <span>Skala: 1 (Kurang)</span>
                <span>•</span>
                <span>2 (Cukup)</span>
                <span>•</span>
                <span>3 (Baik)</span>
                <span>•</span>
                <span>4 (Sangat Bersih)</span>
              </div>
            </div>

            {/* 15 Categories Scoring Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs tracking-tight">
                  Daftar 15 Kategori Penilaian Kebersihan:
                </h4>
                <span className="text-[11px] text-slate-500 font-semibold">
                  15 Kategori Wajib Lazuardi
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {EVALUATION_CATEGORIES.map((category, idx) => {
                  const currentCatScore = categoryScores[category] || 4;
                  return (
                    <div
                      key={category}
                      className="p-3 bg-white border border-slate-200/90 rounded-xl space-y-2 hover:border-slate-300 transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {category}
                          </span>
                        </div>
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md border ${getScoreBadgeColor(
                            currentCatScore
                          )}`}
                        >
                          Skor: {currentCatScore}
                        </span>
                      </div>

                      {/* 1 - 4 Button Selectors */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((num) => {
                          const isSelected = currentCatScore === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleCategoryScoreChange(category, num)}
                              className={`py-1.5 px-2 rounded-lg font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center ${
                                isSelected
                                  ? num === 4
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/50'
                                    : num === 3
                                    ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-400/50'
                                    : num === 2
                                    ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400/50'
                                    : 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/50'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="text-sm font-black">{num}</span>
                              <span className="text-[9px] font-medium leading-none opacity-90">
                                {num === 4 ? 'Sangat Baik' : num === 3 ? 'SOP Baik' : num === 2 ? 'Cukup' : 'Kurang'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Average Result Summary Banner */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Rata-rata Nilai Mingguan (Skala 1 - 4)
                </span>
                <h3 className="text-sm font-bold text-slate-200">
                  {getScoreDescription(Math.round(currentAverageScore))}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-amber-300">
                  {currentAverageScore.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 font-bold">/ 4.00</span>
              </div>
            </div>

            {/* Evaluator Notes */}
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">
                Catatan & Arahan Kordinator untuk Petugas ({saturdayOptions.find((o) => o.isoDate === selectedSaturdayDate)?.formattedFull || formatSaturdayDate(selectedSaturdayDate)}):
              </label>
              <textarea
                rows={3}
                value={scoreNotes}
                onChange={(e) => setScoreNotes(e.target.value)}
                placeholder="Tuliskan catatan detail (misal: Lantai koridor dan nat sudah sangat bersih, perhatikan sela debu di atas rak dan daun tanaman indoor)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 text-xs leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Simpan Penilaian 15 Kategori ({saturdayOptions.find((o) => o.isoDate === selectedSaturdayDate)?.formattedFull || formatSaturdayDate(selectedSaturdayDate)})</span>
            </button>
          </form>

          {/* History of Weekly Scores with 15-category Accordion Breakdown */}
          <div className="pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                <span>Riwayat Penilaian Mingguan Petugas (Kordinator & Admin):</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-semibold">
                {weeklyScores.length} Data Tersimpan
              </span>
            </div>

            <div className="space-y-2.5">
              {weeklyScores.map((ws) => {
                const isExpanded = expandedScoreId === ws.id;
                const formattedDate = ws.saturdayDate ? formatSaturdayDate(ws.saturdayDate) : (ws.dateRange || `Evaluasi Pekan Ini`);
                return (
                  <div
                    key={ws.id}
                    className="p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-2.5 text-xs transition"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {ws.userName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-semibold text-[10px]">
                            Unit {ws.unit}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-700" />
                            {formattedDate}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5 italic">
                          "{ws.notes}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg border ${getScoreBadgeColor(
                            ws.score
                          )}`}
                        >
                          ⭐ {ws.score.toFixed(1)} / 4.0
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedScoreId(isExpanded ? null : ws.id)
                          }
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Tutup Detail' : '15 Kategori'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Category Breakdown */}
                    {isExpanded && ws.categoryScores && (
                      <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Rincian Nilai 15 Kategori:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {EVALUATION_CATEGORIES.map((cat) => {
                            const val = ws.categoryScores?.[cat] || 4;
                            return (
                              <div
                                key={cat}
                                className="p-2 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px]"
                              >
                                <span className="text-slate-700 truncate pr-1">
                                  {cat}
                                </span>
                                <span
                                  className={`font-black px-1.5 py-0.2 rounded ${getScoreBadgeColor(
                                    val
                                  )}`}
                                >
                                  {val}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                          <span>Dinilai oleh: {ws.kordinatorName || 'Kordinator'}</span>
                          <span>Tanggal Evaluasi: {formattedDate}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSPEKSI SEMUA UNIT */}
      {activeKordTab === 'inspect_all' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                Inspeksi Lintas Seluruh Unit
              </h3>
              <p className="text-xs text-slate-500">
                Kordinator memiliki wewenang menginspeksi seluruh unit sekolah Lazuardi GCS (Penilaian status SOP & Checklist).
              </p>
            </div>
            <button
              onClick={onOpenPeerInspectionModal}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>+ Mulai Inspeksi Unit</span>
            </button>
          </div>

          {/* Inspection Records List */}
          <div className="space-y-2.5">
            {peerInspections.length > 0 ? (
              peerInspections.map((p) => {
                const isCompliant = p.status === 'Sesuai Standar SOP' || !p.status;
                const passedCount = p.checklistItems ? p.checklistItems.filter((c) => c.passed).length : 0;
                const totalChecklist = p.checklistItems ? p.checklistItems.length : 0;

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 border rounded-xl space-y-1.5 text-xs transition ${
                      isCompliant
                        ? 'bg-emerald-50/40 border-emerald-200/80'
                        : 'bg-rose-50/40 border-rose-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {p.targetUserName || p.inspectedUserName} (Unit {p.targetUnit || p.inspectedUnit})
                        </span>
                        <span className="text-slate-500">• Diinspeksi oleh {p.inspectorName}</span>
                      </div>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-lg border text-[11px] flex items-center gap-1 ${
                          isCompliant
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {isCompliant ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" /> Sesuai Standar SOP
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-rose-700" /> Ada Temuan
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-slate-700">
                      <strong>Area:</strong> {p.area} — <em>"{p.notes || 'Pemeriksaan rutin'}"</em>
                    </p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>Tanggal: {p.date}</span>
                      {totalChecklist > 0 && (
                        <span>• {passedCount} / {totalChecklist} Checklist Lolos</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="p-6 text-center text-slate-400 text-xs">Belum ada inspeksi unit.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TUGAS HARIAN SAYA (Kordinator juga mengerjakan tugas) */}
      {activeKordTab === 'my_tasks' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 text-xs text-sky-950 flex items-center justify-between">
            <span>
              <strong>Peran Kordinator:</strong> Selain memonitor dan memberi nilai, Kordinator juga
              mengerjakan SOP tugas kebersihan di unit kerjanya.
            </span>
          </div>

          <UserTaskView
            activeUser={activeUser}
            masterTasks={masterTasks}
            taskLogs={taskLogs}
            jobBarengList={jobBarengList}
            dinasRequests={dinasRequests}
            peerInspections={peerInspections}
            weeklyScores={weeklyScores}
            onStartTask={onStartTask}
            onJoinJobBareng={onJoinJobBareng}
            onCompleteJobBareng={onCompleteJobBareng}
            onOpenDinasModal={onOpenDinasModal}
            onOpenPeerInspectionModal={onOpenPeerInspectionModal}
          />
        </div>
      )}

      {/* Photo Preview Modal */}
      {photoPreview && (
        <div
          onClick={() => setPhotoPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2">
            <img
              src={photoPreview}
              alt="Proof"
              className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
            />
            <p className="text-center text-xs text-slate-300 py-2">
              Klik di mana saja untuk menutup bukti foto live watermark.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
