import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Camera,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Sparkles,
  Calendar,
  Star,
  ShieldCheck,
  Plane,
  Eye,
  Info,
  Layers,
  ArrowUpRight,
  SunMedium,
  Users2,
  Coffee,
} from 'lucide-react';
import {
  MasterTask,
  TaskLog,
  User,
  JobBareng,
  DinasRequest,
  PeerInspection,
  WeeklyScore,
} from '../types';
import { StorageService, isTaskAssignedToUser } from '../services/storage';
import { JobBarengCard } from './JobBarengCard';
import { formatGoogleDriveImageUrl, getGoogleDriveViewLink } from '../utils/driveHelper';
import { parseInstructionSteps } from '../utils/instructionHelper';

interface UserTaskViewProps {
  activeUser: User;
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
  onOpenPeerInspectionModal?: () => void;
}

export const UserTaskView: React.FC<UserTaskViewProps> = ({
  activeUser,
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
}) => {
  const [activeTab, setActiveTab] = useState<'harian' | 'mingguan' | 'bulanan' | 'riwayat'>('harian');
  const [taskFilterMode, setTaskFilterMode] = useState<'assigned_to_me' | 'all_unit'>('assigned_to_me');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();
  const isPastPreReadiness = currentHour >= 9;
  const dayOffStatus = StorageService.isDayOffToday();

  // Robust normalization helpers for tasks
  const normalizeCategory = (cat?: string): 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng' => {
    const c = (cat || '').trim().toLowerCase();
    if (c.includes('job') || c.includes('bareng')) return 'Job Bareng';
    if (c.includes('minggu')) return 'Mingguan';
    if (c.includes('bulan')) return 'Bulanan';
    return 'Harian'; // Default fallback so no task gets lost
  };

  const normalizeTiming = (timing?: string): 'pre_readiness' | 'clock_out' | 'anytime' => {
    const t = (timing || '').trim().toLowerCase();
    if (t.includes('pre') || t.includes('pagi')) return 'pre_readiness';
    if (t.includes('clock') || t.includes('out') || t.includes('sore') || t.includes('tutup') || t.includes('pulang')) return 'clock_out';
    return 'anytime';
  };

  // Filter tasks applicable for user's unit or "Semua Unit"
  const isGeneralUnit =
    !activeUser.unit ||
    activeUser.unit === 'Semua Unit' ||
    activeUser.role === 'admin';

  const unitMasterTasks = masterTasks.filter((t) => {
    const tUnit = (t.unit || 'Semua Unit').trim().toLowerCase();
    const uUnit = (activeUser.unit || 'Semua Unit').trim().toLowerCase();
    const matchesUnit =
      isGeneralUnit ||
      tUnit === 'semua unit' ||
      tUnit === 'semua' ||
      tUnit === 'all' ||
      tUnit === uUnit ||
      uUnit.includes(tUnit) ||
      tUnit.includes(uUnit);
    const isActive = t.isActive !== false;
    return matchesUnit && isActive;
  });

  // Filter tasks assigned specifically to this user or "Semua Petugas"
  const myAssignedTasks = unitMasterTasks.filter((t) =>
    isTaskAssignedToUser(t, activeUser)
  );

  // Determine active display tasks based on toggle mode
  const userMasterTasks =
    taskFilterMode === 'assigned_to_me' ? myAssignedTasks : unitMasterTasks;

  // Today's logs for this active user (matching by userId or userName, and date or timestamp)
  const userTodayLogs = taskLogs.filter((l) => {
    const isUserMatch =
      l.userId === activeUser.id ||
      (l.userName && activeUser.name && l.userName.trim().toLowerCase() === activeUser.name.trim().toLowerCase()) ||
      (activeUser.username && l.userId === activeUser.username);
    const isDateMatch =
      !l.date ||
      l.date === today ||
      (l.timestamp && l.timestamp.startsWith(today)) ||
      (l.date && l.date.includes(today));
    return isUserMatch && isDateMatch;
  });

  // Check if user is approved for Dinas Luar today
  const activeDinasToday = dinasRequests.find(
    (d) => d.userId === activeUser.id && d.date === today && d.status === 'Disetujui'
  );

  // Active Job Bareng for this user (including all collective unit jobs)
  const activeJobs = jobBarengList.filter(
    (j) =>
      j.status === 'Aktif' &&
      (isGeneralUnit || j.targetUnit === 'Semua Unit' || j.targetUnit.trim().toLowerCase() === activeUser.unit.trim().toLowerCase())
  );

  // Categorized tasks with fallback normalization
  const preReadinessTasks = userMasterTasks.filter(
    (t) => normalizeCategory(t.category) === 'Harian' && normalizeTiming(t.timingType) === 'pre_readiness'
  );
  const clockOutTasks = userMasterTasks.filter(
    (t) => normalizeCategory(t.category) === 'Harian' && normalizeTiming(t.timingType) === 'clock_out'
  );
  const anytimeDailyTasks = userMasterTasks.filter(
    (t) => normalizeCategory(t.category) === 'Harian' && normalizeTiming(t.timingType) === 'anytime'
  );
  const jobBarengTasks = userMasterTasks.filter((t) => normalizeCategory(t.category) === 'Job Bareng');
  const weeklyTasks = userMasterTasks.filter((t) => normalizeCategory(t.category) === 'Mingguan');
  const monthlyTasks = userMasterTasks.filter((t) => normalizeCategory(t.category) === 'Bulanan');

  // Stats calculation
  const totalDailyTasksCount = preReadinessTasks.length + clockOutTasks.length + anytimeDailyTasks.length + jobBarengTasks.length;
  const completedTodayCount = userTodayLogs.filter((l) => l.status === 'Selesai' || l.status === 'Terlambat').length;
  const lateTodayCount = userTodayLogs.filter((l) => l.isLate).length;
  const completionPercentage =
    totalDailyTasksCount > 0
      ? Math.round((completedTodayCount / totalDailyTasksCount) * 100)
      : 100;

  // Inspections where active user was evaluated
  const myReceivedInspections = peerInspections.filter(
    (p) => p.targetUserId === activeUser.id
  );

  // Access control for evaluation scores (Only Admin and Coordinator can view scores)
  const canViewScores =
    activeUser.role === 'admin' || activeUser.role === 'kordinator';

  // Coordinator weekly ratings for this user
  const myWeeklyScores = weeklyScores.filter((w) => w.userId === activeUser.id);
  const latestWeeklyScore = myWeeklyScores[0];

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const renderTaskItem = (task: MasterTask, isPreReadinessSection = false) => {
    const existingLog = userTodayLogs.find(
      (l) =>
        l.taskId === task.id ||
        (l.taskTitle && task.title && l.taskTitle.trim().toLowerCase() === task.title.trim().toLowerCase()) ||
        (l.taskId && task.title && l.taskId.trim().toLowerCase() === task.title.trim().toLowerCase())
    );
    const isCompleted = existingLog?.status === 'Selesai' || existingLog?.status === 'Terlambat';
    const isLate = existingLog?.isLate || (isPreReadinessSection && isPastPreReadiness && !isCompleted);

    return (
      <div
        key={task.id}
        className={`border rounded-xl p-3.5 sm:p-4 transition-all shadow-xs ${
          isCompleted
            ? 'bg-emerald-50/40 border-emerald-200/80'
            : isLate
            ? 'bg-amber-50/40 border-amber-300/90 ring-1 ring-amber-200/60'
            : 'bg-white border-slate-200/80 hover:border-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status Icon */}
            <div className="pt-0.5 shrink-0">
              {isCompleted ? (
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              ) : isLate ? (
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </div>
              )}
            </div>

            {/* Task Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4
                  className={`text-xs sm:text-sm font-bold tracking-tight ${
                    isCompleted ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-900'
                  }`}
                >
                  {task.title}
                </h4>
              </div>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                {/* Assignee Badge */}
                {task.assignee && task.assignee !== 'Semua Petugas' && isTaskAssignedToUser(task, activeUser) ? (
                  <span className="font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                    👤 Tugas Anda ({task.assignee})
                  </span>
                ) : task.assignee && task.assignee !== 'Semua Petugas' ? (
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 flex items-center gap-1">
                    👤 Petugas: {task.assignee}
                  </span>
                ) : (
                  <span className="font-medium text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/70 flex items-center gap-1">
                    👥 Petugas: Bersama ({task.unit})
                  </span>
                )}

                {task.area && (
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                    📍 {task.area}
                  </span>
                )}
                {task.photoRequired && (
                  <span className="flex items-center gap-1 text-sky-800 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-md font-semibold">
                    <Camera className="w-3 h-3 text-sky-600" /> Foto Live
                  </span>
                )}
                {task.estimatedMinutes && (
                  <span className="text-slate-500">⏱ {task.estimatedMinutes} mnt</span>
                )}
              </div>

              {/* Late Reason notice if logged */}
              {existingLog?.lateReason && (
                <div className="mt-2 text-[11px] p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <strong className="font-semibold">Alasan Telat Tercatat:</strong> {existingLog.lateReason}
                </div>
              )}

              {/* SOP Reference Photo (Optional Standard Cleanliness Example) */}
              {task.standardPhotoUrl && (
                <div className="mt-2 p-2 bg-sky-50/80 border border-sky-200/70 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-sky-900 flex items-center gap-1">
                      📸 Contoh Standar Kebersihan (Acuan SOP)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoPreview(task.standardPhotoUrl!)}
                      className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Perbesar</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div
                    className="relative group rounded-lg overflow-hidden border border-sky-200 cursor-pointer max-h-36 bg-slate-900"
                    onClick={() => setSelectedPhotoPreview(task.standardPhotoUrl!)}
                  >
                    <img
                      src={formatGoogleDriveImageUrl(task.standardPhotoUrl)}
                      alt={`Standar SOP - ${task.title}`}
                      className="w-full h-28 sm:h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-end p-1.5">
                      <span className="text-[9px] font-semibold text-white bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" /> Acuan Standar Lazuardi GCS
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions Toggle */}
              {task.instructions && task.instructions.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>{expandedTaskId === task.id ? 'Tutup SOP' : 'Lihat Langkah Instruksi SOP'}</span>
                    {expandedTaskId === task.id ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {expandedTaskId === task.id && (
                    <div className="mt-1.5 p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-2 text-xs text-slate-700 animate-in fade-in duration-150">
                      <p className="font-bold text-slate-900 mb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>Langkah-langkah SOP:</span>
                      </p>
                      <div className="space-y-1.5">
                        {parseInstructionSteps(task.instructions).map((inst, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs"
                          >
                            <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed text-slate-800 font-medium">{inst}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0 pt-0.5">
            {isCompleted ? (
              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/80 shadow-2xs">
                  {existingLog?.isLate ? 'Selesai (Telat)' : 'Selesai ✓'}
                </span>
                {existingLog?.photoUrl && (
                  <button
                    onClick={() => setSelectedPhotoPreview(existingLog.photoUrl!)}
                    className="text-[10px] text-sky-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                  >
                    <Eye className="w-3 h-3" /> Foto Bukti
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onStartTask(task, isPreReadinessSection && isPastPreReadiness)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 ${
                  isPreReadinessSection && isPastPreReadiness
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isPreReadinessSection && isPastPreReadiness ? 'Kerjakan (Telat)' : 'Kerjakan'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner / Dinas Alert if active */}
      {activeDinasToday && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-amber-950 flex items-start gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <Plane className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-sm text-amber-900">
              Sedang Bertugas Dinas Luar Hari Ini (Disetujui Admin)
            </h4>
            <p className="mt-0.5 text-amber-800">
              Tujuan: <strong>{activeDinasToday.destination}</strong> — {activeDinasToday.reason}
            </p>
            <p className="text-[11px] text-amber-700 mt-1">
              Tugas harian Anda otomatis ter-exempt tanpa mengurangi catatan absensi tugas.
            </p>
          </div>
        </div>
      )}

      {/* Active Job Bareng Announcement */}
      {activeJobs.map((job) => (
        <JobBarengCard
          key={job.id}
          job={job}
          activeUser={activeUser}
          onJoinJob={onJoinJobBareng}
          onCompleteJob={onCompleteJobBareng}
        />
      ))}

      {/* Holiday / Day Off Notice Banner */}
      {dayOffStatus.isOff && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0 mt-0.5">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-amber-900 leading-tight">
              Hari Ini Libur / Off: {dayOffStatus.reason}
            </h4>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              Jadwal harian aktif normal <strong>Senin - Jumat</strong>. Hari ini tugas rutin harian dinonaktifkan oleh sistem/Admin, namun tugas Job Bareng atau dinas khusus tetap dapat diakses bila diperlukan.
            </p>
          </div>
        </div>
      )}

      {/* Performance Summary Card for User */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Ringkasan Tugas Harian
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Unit {activeUser.unit} • {activeUser.name}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-slate-900">
              {completionPercentage}%
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold">Selesai Hari Ini</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3.5">
          <div
            className="bg-sky-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Quick Stats Pills */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="block font-bold text-slate-900 text-sm">{totalDailyTasksCount}</span>
            <span className="text-[10px] text-slate-500 font-medium">Total Tugas</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
            <span className="block font-bold text-emerald-700 text-sm">{completedTodayCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Selesai</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
            <span className="block font-bold text-amber-700 text-sm">{lateTodayCount}</span>
            <span className="text-[10px] text-amber-600 font-semibold">Telat</span>
          </div>
          {canViewScores ? (
            <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/70">
              <span className="block font-bold text-sky-800 text-sm">
                {latestWeeklyScore ? `${latestWeeklyScore.score.toFixed(1)}/4` : '4.0/4'}
              </span>
              <span className="text-[10px] text-sky-700 font-semibold">Skor Kord</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/70">
              <span className="block font-bold text-sky-800 text-sm">Standar SOP</span>
              <span className="text-[10px] text-sky-700 font-semibold">Kualitas Kerja</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Switch: Tugas Saya vs Semua Tugas Unit */}
      <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setTaskFilterMode('assigned_to_me')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              taskFilterMode === 'assigned_to_me'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🎯 Tugas Khusus Saya</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                taskFilterMode === 'assigned_to_me'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {myAssignedTasks.length}
            </span>
          </button>

          <button
            onClick={() => setTaskFilterMode('all_unit')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              taskFilterMode === 'all_unit'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🏢 Seluruh Unit {activeUser.unit}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                taskFilterMode === 'all_unit'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {unitMasterTasks.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl text-xs font-semibold overflow-x-auto border border-slate-200/60">
        <button
          onClick={() => setActiveTab('harian')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'harian'
              ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Harian {isPastPreReadiness ? '(Clock Out ▲)' : '(Pre-Readiness ▲)'}
        </button>
        <button
          onClick={() => setActiveTab('mingguan')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'mingguan'
              ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mingguan (Senin)
        </button>
        <button
          onClick={() => setActiveTab('bulanan')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'bulanan'
              ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bulanan (Tgl 1)
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'riwayat'
              ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Inspeksi & Riwayat
        </button>
      </div>

      {/* TAB CONTENT: HARIAN DENGAN RE-ORDERING OTOMATIS */}
      {activeTab === 'harian' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* If no tasks found at all, show clear restore / sync button */}
          {userMasterTasks.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
              <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Belum Ada Daftar Tugas untuk Unit {activeUser.unit}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Daftar Master Task kosong atau unit belum terpetakan. Klik tombol di bawah untuk memuat template tugas SOP Lazuardi GCS standar atau sinkronkan dengan Google Sheet.
              </p>
              <button
                onClick={() => {
                  const seedTasks = StorageService.getMasterTasks();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Muat Template Tugas Standar SOP
              </button>
            </div>
          )}

          {/* Job Bareng Unit (Column F) Tasks - Accessible Directly */}
          {jobBarengTasks.length > 0 && (
            <div className="space-y-2.5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Users2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-indigo-950 tracking-tight">
                      Job Bareng Unit (Pekerjaan Bersama Tim)
                    </h3>
                    <p className="text-[11px] text-indigo-700">Dapat dikerjakan langsung oleh seluruh staf OB & OG</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  Semua Unit
                </span>
              </div>
              <div className="space-y-2">
                {jobBarengTasks.map((t) => renderTaskItem(t, false))}
              </div>
            </div>
          )}

          {/* DYNAMIC SORTING: If past pre-readiness (>= 09:00 WIB), Clock Out is on TOP. Otherwise Pre-Readiness is on TOP */}
          {isPastPreReadiness ? (
            <>
              {/* 1. CLOCK OUT (TOP POSITION WHEN PAST 09:00 WIB) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Clock Out & Penutupan (09:00 - 23:59 WIB)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    ▲ Prioritas Sore / Petang
                  </span>
                </div>

                <div className="space-y-2">
                  {clockOutTasks.length > 0 ? (
                    clockOutTasks.map((t) => renderTaskItem(t, false))
                  ) : (
                    <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200/70">
                      Tidak ada tugas Clock Out untuk unit ini.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. ANYTIME DAILY TASKS */}
              {anytimeDailyTasks.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Pekerjaan Rutin Harian Lainnya
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {anytimeDailyTasks.map((t) => renderTaskItem(t, false))}
                  </div>
                </div>
              )}

              {/* 3. PRE-READINESS (MOVED TO BOTTOM AFTER 09:00 WIB) */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-700 tracking-tight">
                      Pre-Readiness Pagi (00:00 - 09:00 WIB)
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    ▼ Lewat Batas Waktu 09:00
                  </span>
                </div>

                <div className="space-y-2">
                  {preReadinessTasks.length > 0 ? (
                    preReadinessTasks.map((t) => renderTaskItem(t, true))
                  ) : (
                    <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200/70">
                      Tidak ada tugas Pre-Readiness untuk unit ini.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 1. PRE-READINESS (TOP POSITION BEFORE 09:00 WIB) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Pre-Readiness Pagi (00:00 - 09:00 WIB)
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ▲ Sedang Berlangsung
                  </span>
                </div>

                <div className="space-y-2">
                  {preReadinessTasks.length > 0 ? (
                    preReadinessTasks.map((t) => renderTaskItem(t, true))
                  ) : (
                    <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200/70">
                      Tidak ada tugas Pre-Readiness untuk unit ini.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. ANYTIME DAILY TASKS */}
              {anytimeDailyTasks.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Pekerjaan Rutin Harian Lainnya
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {anytimeDailyTasks.map((t) => renderTaskItem(t, false))}
                  </div>
                </div>
              )}

              {/* 3. CLOCK OUT (BOTTOM POSITION BEFORE 09:00 WIB) */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      Clock Out & Penutupan (09:00 - 23:59 WIB)
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                    ▼ Sore / Petang
                  </span>
                </div>

                <div className="space-y-2">
                  {clockOutTasks.length > 0 ? (
                    clockOutTasks.map((t) => renderTaskItem(t, false))
                  ) : (
                    <p className="text-xs text-slate-400 p-4 text-center bg-white rounded-xl border border-slate-200/70">
                      Tidak ada tugas Clock Out untuk unit ini.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB CONTENT: MINGGUAN */}
      {activeTab === 'mingguan' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3 text-xs text-sky-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>Jadwal Mingguan:</strong> Direset otomatis setiap hari <strong>Senin</strong>.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {weeklyTasks.map((t) => renderTaskItem(t, false))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BULANAN */}
      {activeTab === 'bulanan' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600 shrink-0" />
              <span>
                <strong>Jadwal Bulanan:</strong> Direset otomatis setiap <strong>Tanggal 1</strong> awal bulan.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {monthlyTasks.map((t) => renderTaskItem(t, false))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: RIWAYAT & INSPEKSI DITERIMA */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Coordinator Weekly Score Card (Restricted: ONLY Admin & Kordinator can view scores) */}
          {canViewScores ? (
            <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h4 className="font-bold text-sm">Nilai Mingguan dari Kordinator (Skala 1 - 4)</h4>
                </div>
                <span className="text-2xl font-black text-amber-300">
                  {latestWeeklyScore ? `${latestWeeklyScore.score.toFixed(1)} / 4.0` : '4.0 / 4.0'}
                </span>
              </div>

              {latestWeeklyScore ? (
                <div className="text-xs space-y-2.5">
                  <p className="text-slate-300 italic">"{latestWeeklyScore.notes}"</p>
                  {latestWeeklyScore.categoryScores && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1.5">
                        Rincian 15 Kategori:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                        {Object.entries(latestWeeklyScore.categoryScores).map(([cat, val]) => (
                          <div
                            key={cat}
                            className="p-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 flex items-center justify-between"
                          >
                            <span className="text-slate-300 truncate pr-1">{cat}</span>
                            <span className="font-bold text-amber-300">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 text-right pt-1">
                    Dinilai oleh: {latestWeeklyScore.kordinatorName} • Minggu ke-{latestWeeklyScore.weekNumber}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-300">
                  Belum ada evaluasi tersimpan untuk petugas ini minggu ini.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-2 border border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm">Standar Kinerja & Kebersihan Lazuardi GCS</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tugas harian, mingguan, dan bulanan Anda dipantau secara berkala melalui evaluasi Kordinator dan Manajemen untuk menjaga kebersihan 15 kategori fasilitas sekolah Lazuardi.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tetap pertahankan kerapihan dan foto bukti tugas live Anda!</span>
              </div>
            </div>
          )}

          {/* Peer Inspections Received */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Laporan Hasil Inspeksi Rekan & Kordinator
              </h4>
              <span className="text-xs text-slate-500 font-semibold">
                {myReceivedInspections.length} Laporan
              </span>
            </div>

            {myReceivedInspections.length > 0 ? (
              <div className="space-y-2">
                {myReceivedInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {insp.inspectorName} ({insp.inspectorUnit})
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-200/60">
                          {insp.inspectorRole === 'kordinator' ? 'Kordinator' : 'Inspeksi Rekan'}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                          insp.status === 'Ada Temuan / Perlu Perbaikan'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {insp.status || 'Sesuai Standar SOP'}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      <strong>Area Diperiksa:</strong> {insp.area}
                    </p>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 italic">
                      "{insp.notes}"
                    </p>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Tanggal: {insp.date}</span>
                      <span className="text-slate-500 font-medium">
                        {insp.checklistItems?.filter((c) => c.passed).length || 5} dari{' '}
                        {insp.checklistItems?.length || 5} item standar lolos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-white border border-slate-200/80 rounded-xl text-xs">
                Belum ada catatan inspeksi yang ditujukan untuk Anda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Preview Modal with Google Drive link */}
      {selectedPhotoPreview && (
        <div
          onClick={() => setSelectedPhotoPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between text-white text-xs pb-1 border-b border-slate-800">
              <span className="font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-sky-400" />
                <span>Pratinjau Foto Bukti / Standar SOP</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="text-slate-400 hover:text-white font-bold px-2 py-1 rounded-lg cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>

            <img
              src={formatGoogleDriveImageUrl(selectedPhotoPreview)}
              alt="Bukti Foto"
              className="w-full h-auto max-h-[65vh] object-contain rounded-xl bg-black"
            />

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <a
                href={getGoogleDriveViewLink(selectedPhotoPreview)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Buka di Google Drive ↗</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
