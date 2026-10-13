import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Check,
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
  TreePine,
  Plus,
  Wrench,
  X,
  Upload,
  Image as ImageIcon,
  Printer,
} from 'lucide-react';
import {
  MasterTask,
  TaskLog,
  User,
  JobBareng,
  DinasRequest,
  PeerInspection,
  WeeklyScore,
  TreeWorkOrder,
  AdhocDailyTask,
  PLH_AREAS,
} from '../types';
import { StorageService, isTaskAssignedToUser } from '../services/storage';
import { JobBarengCard } from './JobBarengCard';
import { MasjidRollingCard } from './MasjidRollingCard';
import { TreeWorkOrderView, getTreeWeeklyCheckStatus } from './TreeWorkOrderView';
import { sanitizePlhStaffName, generateWorkOrderSummaryPdf, printHtmlAsPdf } from '../utils/pdfGenerator';
import { isAreaOnMasjidDutyThisWeek, getMasjidRollingSchedule } from '../utils/masjidRolling';
import { formatGoogleDriveImageUrl, getGoogleDriveViewLink } from '../utils/driveHelper';
import { parseInstructionSteps } from '../utils/instructionHelper';
import { getJakartaDateString, getJakartaHour, isMasterTaskActive, isJobBarengExpired, isSameDay, normalizeDateString, formatJakartaDisplayDate } from '../utils/dateHelper';

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
  onOpenPeerInspectionModal,
}) => {
  const [activeTab, setActiveTab] = useState<'harian' | 'mingguan' | 'bulanan' | 'riwayat'>('harian');
  const [inspectionSubTab, setInspectionSubTab] = useState<'submitted' | 'received'>('submitted');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [treeInitialId, setTreeInitialId] = useState<string | undefined>(undefined);
  const [treeInitialAction, setTreeInitialAction] = useState<'inspect' | 'treatment' | 'history' | undefined>(undefined);

  const today = getJakartaDateString();
  const currentHour = getJakartaHour();
  const isPastPreReadiness = currentHour >= 9;
  const dayOffStatus = StorageService.isDayOffToday(today);

  // Akses eksklusif modul Pohon & Masjid: Hanya untuk divisi PLH (staff & kordinator) atau Admin FM
  const isPLH = (activeUser.division === 'PLH') || (activeUser.role === 'admin');

  // Adhoc Daily Task State (Tugas Tambahan Hari Ini - Khusus PLH)
  const [showAdhocModal, setShowAdhocModal] = useState(false);
  const [adhocTitle, setAdhocTitle] = useState('');
  const [adhocArea, setAdhocArea] = useState(activeUser.assignedArea || 'Area Pos 1');
  const [adhocNotes, setAdhocNotes] = useState('');
  const [adhocMinutes, setAdhocMinutes] = useState(30);
  const [adhocPhoto, setAdhocPhoto] = useState('');
  const [adhocStatus, setAdhocStatus] = useState<'Selesai' | 'Sedang Dikerjakan'>('Selesai');
  const [isSubmittingAdhoc, setIsSubmittingAdhoc] = useState(false);
  const [adhocTasks, setAdhocTasks] = useState<AdhocDailyTask[]>(() =>
    StorageService.getAdhocDailyTasks(today)
  );

  // Tree Work Orders state for weekly section
  const [treeOrders, setTreeOrders] = useState<TreeWorkOrder[]>(() =>
    StorageService.getTreeWorkOrders()
  );

  const handleOpenTreeWithAction = (treeId: string, action: 'inspect' | 'treatment' | 'history') => {
    setTreeInitialId(treeId);
    setTreeInitialAction(action);
    setShowTreeModal(true);
  };

  const handleCloseTreeModal = () => {
    setShowTreeModal(false);
    setTreeInitialId(undefined);
    setTreeInitialAction(undefined);
    setTreeOrders(StorageService.getTreeWorkOrders());
  };

  const handleSaveAdhocTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adhocTitle.trim()) return;

    setIsSubmittingAdhoc(true);
    const now = new Date();
    const newTask: AdhocDailyTask = {
      id: `adhoc-${Date.now()}`,
      date: today,
      userId: activeUser.id,
      userName: activeUser.name,
      division: 'PLH',
      area: adhocArea,
      title: adhocTitle.trim(),
      notes: adhocNotes.trim(),
      estimatedMinutes: Number(adhocMinutes) || 30,
      photoUrl: adhocPhoto || undefined,
      status: adhocStatus,
      completedAt: adhocStatus === 'Selesai' ? now.toISOString() : undefined,
      createdAt: now.toISOString(),
    };

    StorageService.addAdhocDailyTask(newTask);
    setAdhocTasks(StorageService.getAdhocDailyTasks(today));
    setAdhocTitle('');
    setAdhocNotes('');
    setAdhocPhoto('');
    setShowAdhocModal(false);
    setIsSubmittingAdhoc(false);
  };

  const userAreaTrees = useMemo(() => {
    if (!isPLH) return [];
    const userArea = activeUser.assignedArea || activeUser.unit || '';
    if (activeUser.role === 'admin' || (activeUser.role === 'kordinator' && (!userArea || userArea === 'Semua Unit'))) {
      return treeOrders;
    }
    return treeOrders.filter((t) => {
      if (!userArea) return true;
      return t.area.toLowerCase().includes(userArea.toLowerCase()) || userArea.toLowerCase().includes(t.area.toLowerCase());
    });
  }, [treeOrders, isPLH, activeUser]);

  // Check if user is on Dinas Luar today (either approved or pending)
  const activeDinasToday = dinasRequests.find(
    (d) =>
      d.userId === activeUser.id &&
      (d.date === today || d.date?.startsWith(today)) &&
      (d.status === 'Disetujui' || d.status === 'Pending')
  );
  const isDinasToday = !!activeDinasToday;

  // Robust normalization helpers for tasks
  const normalizeCategory = (cat?: string, taskObj?: MasterTask): 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng' => {
    const c = (cat || '').trim().toLowerCase();
    const id = (taskObj?.id || '').toLowerCase();
    if (c.includes('job') || c.includes('bareng') || id.includes('jb-') || id.includes('-jb')) return 'Job Bareng';
    if (c.includes('minggu') || id.includes('wk-') || id.includes('-wk')) return 'Mingguan';
    if (c.includes('bulan') || id.includes('mo-') || id.includes('-mo')) return 'Bulanan';
    return 'Harian'; // Default fallback so no task gets lost
  };

  const normalizeTiming = (timing?: string, taskObj?: MasterTask): 'pre_readiness' | 'clock_out' | 'anytime' => {
    const t = (timing || '').trim().toLowerCase();
    const id = (taskObj?.id || '').toLowerCase();
    const title = (taskObj?.title || '').toLowerCase();

    if (
      id.includes('co-') ||
      id.includes('-co') ||
      id.includes('clock') ||
      id.includes('out') ||
      t.includes('clock') ||
      t.includes('out') ||
      t.includes('sore') ||
      t.includes('tutup') ||
      t.includes('pulang') ||
      title.includes('clock out') ||
      title.includes('clock-out') ||
      title.includes('penutupan') ||
      title.includes('sore')
    ) {
      return 'clock_out';
    }
    if (
      id.includes('pr-') ||
      id.includes('-pr') ||
      id.includes('pre') ||
      t.includes('pre') ||
      t.includes('pagi') ||
      t.includes('readiness') ||
      title.includes('pre-readiness') ||
      title.includes('pre readiness') ||
      title.includes('pagi')
    ) {
      return 'pre_readiness';
    }
    return 'anytime';
  };

  // Filter tasks applicable for user's unit or "Semua Unit" - Only active tasks
  const isGeneralUnit =
    !activeUser.unit ||
    activeUser.unit === 'Semua Unit' ||
    activeUser.role === 'admin';

  const unitMasterTasks = useMemo(() => {
    return masterTasks.filter((t) => {
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
      return matchesUnit && isMasterTaskActive(t);
    });
  }, [masterTasks, activeUser.unit, isGeneralUnit]);

  // Strict user task filtering: A user ONLY sees tasks assigned to them (or specifically for them)
  const userMasterTasks = useMemo(() => {
    return unitMasterTasks.filter((t) => isTaskAssignedToUser(t, activeUser));
  }, [unitMasterTasks, activeUser]);

  // Today's logs for this active user (strictly matching by userId/userName AND today's date with format tolerance)
  const userTodayLogs = useMemo(() => {
    return taskLogs.filter((l) => {
      const isUserMatch =
        l.userId === activeUser.id ||
        (l.userName && activeUser.name && l.userName.trim().toLowerCase() === activeUser.name.trim().toLowerCase()) ||
        (activeUser.username && l.userId === activeUser.username) ||
        (activeUser.username && l.userName && l.userName.trim().toLowerCase() === activeUser.username.trim().toLowerCase()) ||
        (activeUser.id && l.userName && l.userName.trim().toLowerCase() === activeUser.id.trim().toLowerCase());
      const isDateMatch =
        isSameDay(l.date, today) ||
        (l.timestamp && isSameDay(l.timestamp, today));
      return isUserMatch && Boolean(isDateMatch);
    });
  }, [taskLogs, activeUser.id, activeUser.name, activeUser.username, today]);

  // Active Insidental / Job Bareng for this user (Visible throughout TODAY until the day changes)
  const activeJobs = useMemo(() => {
    return jobBarengList.filter((j) => {
      if (j.status === 'Dibatalkan') return false;
      if (isJobBarengExpired(j)) return false;

      // Strict date check: only show jobs for today
      const jobDate = normalizeDateString(j.date) || normalizeDateString(j.createdAt) || today;
      if (jobDate !== today) return false;

      // Division Separation: Job Bareng created for PLH only seen by PLH, OB only by OB
      const userDiv = activeUser.division || 'OB';
      if (j.division && j.division !== 'Semua') {
        if (j.division !== userDiv) return false;
      }
      
      // If specific users are assigned
      if (
        j.assignmentType === 'specific' &&
        ((j.assignedUserIds && j.assignedUserIds.length > 0) ||
          (j.assignedUserNames && j.assignedUserNames.length > 0))
      ) {
        const isAssigned =
          (j.assignedUserIds &&
            j.assignedUserIds.some(
              (id) =>
                id === activeUser.id ||
                id === activeUser.username ||
                (activeUser.name && id.toLowerCase() === activeUser.name.toLowerCase())
            )) ||
          (j.assignedUserNames &&
            activeUser.name &&
            j.assignedUserNames.some(
              (n) => n.toLowerCase().trim() === activeUser.name.toLowerCase().trim()
            ));

        if (!isAssigned) return false;
        return true;
      }

      // For PLH staff: PLH tasks (Job Bareng & Insidental) apply across the 5 outdoor areas and are visible to all PLH members
      if (userDiv === 'PLH' && (j.division === 'PLH' || j.division === 'Semua')) {
        return true;
      }

      // Target unit check for OB / general
      const isTargetAll =
        !j.targetUnit ||
        j.targetUnit === 'Semua Unit' ||
        j.targetUnit.toLowerCase().includes('semua');
      const isTargetUnitMatch =
        j.targetUnit &&
        activeUser.unit &&
        j.targetUnit.trim().toLowerCase() === activeUser.unit.trim().toLowerCase();

      return isGeneralUnit || isTargetAll || isTargetUnitMatch;
    });
  }, [jobBarengList, today, activeUser, isGeneralUnit]);

  // Cek apakah staf PLH sedang giliran piket Aula Masjid (Rolling PLH) pada minggu ini
  const isMyMasjidDutyWeek = useMemo(() => {
    if ((activeUser.division || 'OB') !== 'PLH') return false;
    const userArea = activeUser.assignedArea || activeUser.unit || '';
    return isAreaOnMasjidDutyThisWeek(userArea);
  }, [activeUser]);

  // Tugas piket rolling masjid yang otomatis dimasukkan ke tab Pre-Readiness (Pagi 06:30 – 08:30 WIB)
  const masjidDutyTask: MasterTask | null = useMemo(() => {
    if (!isMyMasjidDutyWeek) return null;

    const existing = masterTasks.find(
      (t) => t.id === 'mt-plh-wk-05' || ((t.division === 'PLH' || !t.division) && t.title.toLowerCase().includes('aula masjid'))
    );
    if (existing) {
      return {
        ...existing,
        title: 'Piket Aula Masjid (Rolling PLH) - Kesiapan Pagi (06:30 – 08:30 WIB)',
        category: 'Harian',
        timingType: 'pre_readiness',
        instructions: [
          '🌟 TUGAS KHUSUS: Giliran Area Anda Bertugas Piket Aula Masjid Minggu Ini! [Pagi: 06:30 – 08:30 WIB (Pre-Readiness)]',
          ...(existing.instructions || [
            'Vacuum seluruh karpet sajadah Aula Masjid dari debu dan kotoran.',
            'Lap mimbar, rak Al-Quran, jendela kaca, dan tempat wudhu luar masjid.',
            'Pastikan pendingin/kipas angin dan wewangian karpet terpasang rapi untuk ibadah.',
          ]),
        ],
      };
    }
    return {
      id: 'mt-plh-wk-05',
      title: 'Piket Aula Masjid (Rolling PLH) - Kesiapan Pagi (06:30 – 08:30 WIB)',
      unit: 'Semua Unit',
      category: 'Harian',
      timingType: 'pre_readiness',
      division: 'PLH',
      assignee: 'Semua Petugas',
      instructions: [
        '🌟 TUGAS KHUSUS: Giliran Area Anda Bertugas Piket Aula Masjid Minggu Ini! [Pagi: 06:30 – 08:30 WIB (Pre-Readiness)]',
        'Vacuum seluruh karpet sajadah Aula Masjid dari debu dan kotoran.',
        'Lap mimbar, rak Al-Quran, jendela kaca, dan tempat wudhu luar masjid.',
        'Pastikan pendingin/kipas angin dan wewangian karpet terpasang rapi untuk ibadah.',
      ],
      photoRequired: true,
      estimatedMinutes: 45,
      area: 'Aula Masjid (Rolling PLH)',
      isActive: true,
    };
  }, [isMyMasjidDutyWeek, masterTasks]);

  // Categorized tasks with fallback normalization
  const preReadinessTasks = useMemo(() => {
    const list = userMasterTasks.filter(
      (t) => normalizeCategory(t.category, t) === 'Harian' && normalizeTiming(t.timingType, t) === 'pre_readiness'
    );
    if (masjidDutyTask && !list.some((t) => t.id === masjidDutyTask.id)) {
      return [masjidDutyTask, ...list];
    }
    return list;
  }, [userMasterTasks, masjidDutyTask]);

  const clockOutTasks = useMemo(() => {
    return userMasterTasks.filter(
      (t) => normalizeCategory(t.category, t) === 'Harian' && normalizeTiming(t.timingType, t) === 'clock_out'
    );
  }, [userMasterTasks]);

  const anytimeDailyTasks = useMemo(() => {
    return userMasterTasks.filter(
      (t) => normalizeCategory(t.category, t) === 'Harian' && normalizeTiming(t.timingType, t) === 'anytime'
    );
  }, [userMasterTasks]);

  const jobBarengTasks = useMemo(() => {
    return userMasterTasks.filter((t) => normalizeCategory(t.category, t) === 'Job Bareng');
  }, [userMasterTasks]);

  const weeklyTasks = useMemo(() => {
    return userMasterTasks.filter((t) => {
      const isMasjidTask = t.id === 'mt-plh-wk-05' || t.title.toLowerCase().includes('aula masjid') || t.title.toLowerCase().includes('rolling mingguan plh');
      if (isMasjidTask) {
        // Hanya untuk yang saat sedang piket saja! Jika tidak giliran, jangan tampilkan sama sekali
        if (!isMyMasjidDutyWeek) return false;
        // Jika sedang piket minggu ini, tugas sudah dimasukkan ke Pre-Readiness Pagi (06:30 - 08:30 WIB)
        return false;
      }
      return normalizeCategory(t.category, t) === 'Mingguan';
    });
  }, [userMasterTasks, isMyMasjidDutyWeek]);

  const monthlyTasks = useMemo(() => {
    return userMasterTasks.filter((t) => normalizeCategory(t.category, t) === 'Bulanan');
  }, [userMasterTasks]);

  // Helper to match a task log with a master task
  const doesLogMatchTask = (l: TaskLog, task: MasterTask) => {
    if (l.taskId && task.id && l.taskId.trim().toLowerCase() === task.id.trim().toLowerCase()) return true;
    if (l.taskId === task.id) return true;
    if (
      l.taskTitle &&
      task.title &&
      l.taskTitle.trim().toLowerCase() === task.title.trim().toLowerCase() &&
      normalizeTiming(l.timingType, task) === normalizeTiming(task.timingType, task)
    ) {
      return true;
    }
    return false;
  };

  // Stats calculation (Strictly matched by Task ID or Title/Timing)
  const totalDailyTasksCount = preReadinessTasks.length + clockOutTasks.length + anytimeDailyTasks.length + jobBarengTasks.length;
  
  const completedTodayCount = useMemo(() => {
    return userMasterTasks.filter((task) => {
      return userTodayLogs.some(
        (l) =>
          doesLogMatchTask(l, task) &&
          (l.status === 'Selesai' ||
            l.status === 'Terlambat' ||
            Boolean(l.photoUrl && l.photoUrl.trim().length > 0) ||
            Boolean(l.lateReason && l.lateReason.trim().length > 0))
      );
    }).length;
  }, [userMasterTasks, userTodayLogs]);

  const lateTodayCount = useMemo(() => {
    return userMasterTasks.filter((task) => {
      const l = userTodayLogs.find((log) => doesLogMatchTask(log, task));
      return Boolean(l?.isLate || l?.status === 'Terlambat' || (l?.lateReason && l.lateReason.trim().length > 0));
    }).length;
  }, [userMasterTasks, userTodayLogs]);

  const completionPercentage =
    totalDailyTasksCount > 0
      ? Math.round((completedTodayCount / totalDailyTasksCount) * 100)
      : 100;

  // Inspections where active user was evaluated (Received)
  const myReceivedInspections = useMemo(() => {
    return peerInspections.filter(
      (p) => p.targetUserId === activeUser.id || (p.targetUserName && p.targetUserName.trim() === activeUser.name.trim())
    );
  }, [peerInspections, activeUser.id, activeUser.name]);

  // Inspections where active user was the inspector (Submitted)
  const mySubmittedInspections = useMemo(() => {
    return peerInspections.filter(
      (p) => p.inspectorId === activeUser.id || (p.inspectorName && p.inspectorName.trim() === activeUser.name.trim())
    );
  }, [peerInspections, activeUser.id, activeUser.name]);

  // Inspections done by active user today
  const todaySubmittedInspections = useMemo(() => {
    return mySubmittedInspections.filter(
      (p) => isSameDay(p.date, today) || (p.timestamp && isSameDay(p.timestamp, today))
    );
  }, [mySubmittedInspections, today]);

  // Access control for evaluation scores (Only Admin and Coordinator can view scores)
  const canViewScores =
    activeUser.role === 'admin' || activeUser.role === 'kordinator';

  // Coordinator weekly ratings for this user
  const myWeeklyScores = useMemo(() => {
    return weeklyScores.filter((w) => w.userId === activeUser.id);
  }, [weeklyScores, activeUser.id]);
  const latestWeeklyScore = myWeeklyScores[0];

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const renderTaskItem = (task: MasterTask, isPreReadinessSection = false) => {
    // Robust task log matching by task ID or title + timing
    const existingLog = userTodayLogs.find(
      (l) => doesLogMatchTask(l, task)
    ) || taskLogs.find(
      (l) =>
        (isSameDay(l.date, today) || (l.timestamp && isSameDay(l.timestamp, today))) &&
        (l.userId === activeUser.id ||
          (l.userName && activeUser.name && l.userName.trim().toLowerCase() === activeUser.name.trim().toLowerCase()) ||
          (activeUser.username && l.userId === activeUser.username) ||
          (activeUser.username && l.userName && l.userName.trim().toLowerCase() === activeUser.username.trim().toLowerCase()) ||
          (activeUser.id && l.userName && l.userName.trim().toLowerCase() === activeUser.id.trim().toLowerCase())) &&
        doesLogMatchTask(l, task)
    );

    const isCompleted =
      existingLog?.status === 'Selesai' ||
      existingLog?.status === 'Terlambat' ||
      Boolean(existingLog?.photoUrl && existingLog.photoUrl.trim().length > 0) ||
      Boolean(existingLog?.lateReason && existingLog.lateReason.trim().length > 0);

    const isPreReadinessTask = normalizeTiming(task.timingType, task) === 'pre_readiness';
    const isLate =
      existingLog?.isLate ||
      existingLog?.status === 'Terlambat' ||
      Boolean(existingLog?.lateReason && existingLog.lateReason.trim().length > 0) ||
      (isPreReadinessTask && isPastPreReadiness);

    return (
      <div
        key={task.id}
        className={`border rounded-xl p-3.5 sm:p-4 transition-all shadow-xs ${
          isCompleted && isLate
            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200/80'
            : isCompleted
            ? 'bg-emerald-50/40 border-emerald-200/80'
            : isLate
            ? 'bg-amber-50/50 border-amber-300/90 ring-1 ring-amber-200/70'
            : 'bg-white border-slate-200/80 hover:border-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status Icon */}
            <div className="pt-0.5 shrink-0">
              {isCompleted && isLate ? (
                <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              ) : isCompleted ? (
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
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-bold text-[10px] border border-slate-200">
                  #{task.id}
                </span>

                {(task.id === 'mt-plh-wk-05' || task.title.toLowerCase().includes('masjid')) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <span>🕌 Piket Rolling Masjid (Giliran Area Anda)</span>
                  </span>
                )}

                <h4
                  className={`text-xs sm:text-sm font-bold tracking-tight ${
                    isCompleted && isLate
                      ? 'text-amber-950 line-through decoration-rose-500 decoration-2'
                      : isCompleted
                      ? 'text-slate-500 line-through decoration-slate-400'
                      : 'text-slate-900'
                  }`}
                >
                  {task.title}
                </h4>

                {/* Status Badges next to Title */}
                {isCompleted && isLate && (
                  Boolean(existingLog?.lateReason && existingLog.lateReason.trim().length > 0) ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs">
                      <Check className="w-3 h-3 text-emerald-700" /> Telat (Sudah Lapor Alasan)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs">
                      <AlertTriangle className="w-3 h-3 text-rose-600" /> Telat (Belum Lapor Alasan)
                    </span>
                  )
                )}

                {!isCompleted && isPreReadinessTask && isPastPreReadiness && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs animate-pulse">
                    <Clock className="w-3 h-3 text-amber-700" /> Lewat Batas 09:00 (Wajib Alasan Telat)
                  </span>
                )}
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
                <div className="mt-2 text-[11px] p-2.5 bg-amber-100/90 border border-amber-300 rounded-xl text-amber-950 font-medium space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Alasan Keterlambatan Tercatat:</span>
                  </div>
                  <p className="text-amber-900 italic pl-5">"{existingLog.lateReason}"</p>
                </div>
              )}

              {/* Standar Kebersihan Reference Photo */}
              {task.standardPhotoUrl && (
                <div className="mt-2 p-2 bg-sky-50/80 border border-sky-200/70 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-sky-900 flex items-center gap-1">
                      📸 Acuan Standar Kebersihan Lazuardi GCS
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
                      alt={`Standar Kebersihan - ${task.title}`}
                      className="w-full h-28 sm:h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-end p-1.5">
                      <span className="text-[9px] font-semibold text-white bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" /> Acuan Standar Kebersihan
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
                    <span>{expandedTaskId === task.id ? 'Tutup Standar Kebersihan' : 'Lihat Langkah Standar Kebersihan'}</span>
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
                        <span>Langkah Standar Kebersihan:</span>
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
                {existingLog?.isLate ? (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300 shadow-2xs">
                    <span className="line-through decoration-rose-500">Terlambat</span> (Selesai ✓)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/80 shadow-2xs">
                    Selesai ✓
                  </span>
                )}
                {existingLog?.photoUrl && (
                  <button
                    onClick={() => setSelectedPhotoPreview(existingLog.photoUrl!)}
                    className="text-[10px] text-sky-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                  >
                    <Eye className="w-3 h-3" /> Foto Bukti
                  </button>
                )}
              </div>
            ) : isDinasToday ? (
              <div className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
                <Plane className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Dinas Luar (Off)</span>
              </div>
            ) : (
              <button
                onClick={() => onStartTask(task, isPreReadinessTask && isPastPreReadiness)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 ${
                  isPreReadinessTask && isPastPreReadiness
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isPreReadinessTask && isPastPreReadiness ? 'Kerjakan (Telat)' : 'Kerjakan'}</span>
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
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white border border-blue-700/70 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-white">
                  Status: Bertugas Dinas Luar ({activeDinasToday.status === 'Disetujui' ? 'Disetujui' : 'Menunggu Approval'})
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-blue-400 text-slate-950 font-black text-[10px]">
                  Jobdesk Hari Ini Nonaktif
                </span>
              </div>
              <p className="mt-0.5 text-xs text-blue-200">
                Tujuan: <strong>{activeDinasToday.destination || 'Luar Sekolah'}</strong> • Keperluan: <strong>{activeDinasToday.reason}</strong>
              </p>
            </div>
          </div>
          <p className="text-[11px] text-blue-300/90 pt-1.5 border-t border-blue-800/80 leading-relaxed">
            ℹ️ Karena sedang bertugas dinas luar, seluruh checklist tugas harian dan kewajiban inspeksi silang rekan untuk hari ini otomatis dinonaktifkan / dibebaskan oleh sistem.
          </p>
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
              <span className="block font-bold text-sky-800 text-sm">Standar Kebersihan</span>
              <span className="text-[10px] text-sky-700 font-semibold">Kualitas Kerja</span>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Peer Inspection Mandatory Action Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-sky-800/60 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  Inspeksi Silang Petugas (Peer Review)
                </h3>
                {isDinasToday ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold border border-blue-400/40 flex items-center gap-1">
                    <Plane className="w-3 h-3" /> Bebas Lapor (Sedang Dinas Luar)
                  </span>
                ) : todaySubmittedInspections.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Sudah Lapor Hari Ini ({todaySubmittedInspections.length}x)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Wajib Lapor Hari Ini
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Setiap petugas wajib melaporkan temuan &amp; checklist kebersihan rekan unit/cluster (tanpa nilai angka).
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenPeerInspectionModal?.()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{todaySubmittedInspections.length > 0 ? '+ Lapor Inspeksi Tambahan' : '+ Isi Laporan Inspeksi Silang'}</span>
          </button>
        </div>

        {/* Live Feedback: Display today's submitted inspection confirmation */}
        {todaySubmittedInspections.length > 0 && (
          <div className="p-3 bg-slate-800/80 border border-sky-500/40 rounded-xl space-y-1.5 text-xs text-slate-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-sky-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Laporan Terakhir Anda Hari Ini:
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 font-semibold">
                ✓ Tercatat di Google Sheet &amp; Database
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400">Rekan Diinspeksi:</span>{' '}
                <strong className="text-white">{todaySubmittedInspections[0].targetUserName}</strong> ({todaySubmittedInspections[0].targetUnit})
              </div>
              <div>
                <span className="text-slate-400">Area:</span>{' '}
                <strong className="text-white">{todaySubmittedInspections[0].area}</strong>
              </div>
              <div className="sm:col-span-2 text-slate-300">
                <span className="text-slate-400">Status:</span>{' '}
                <span className={`font-semibold ${todaySubmittedInspections[0].status === 'Ada Temuan / Perlu Perbaikan' ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {todaySubmittedInspections[0].status || 'Sesuai Standar Kebersihan'}
                </span>
                {todaySubmittedInspections[0].notes && (
                  <span className="italic text-slate-300 ml-1.5">"{todaySubmittedInspections[0].notes}"</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>
            Aturan Cluster: TK ↔ TK • SD ↔ SD • SMP ↔ SMP • Khaldun ↔ Pelangi ↔ Direktorat ↔ Ar Razi
          </span>
          <button
            onClick={() => setActiveTab('riwayat')}
            className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
          >
            Lihat Rekap Riwayat Inspeksi ({mySubmittedInspections.length} Dibuat / {myReceivedInspections.length} Diterima) ↗
          </button>
        </div>
      </div>

      {/* PLH Specific: Masjid Rolling Schedule Card - Hanya masuk jika giliran piket aula saja (atau Kordinator/Admin) */}
      {isPLH && (isMyMasjidDutyWeek || activeUser.role === 'admin' || activeUser.role === 'kordinator') && (
        <MasjidRollingCard activeUser={activeUser} />
      )}

      {/* Tabs Navigation & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex-1 flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl text-xs font-semibold overflow-x-auto border border-slate-200/60">
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

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Unduh PDF Work Order Saya (Untuk Semua OB & PLH) */}
          <button
            type="button"
            onClick={() => {
              const myLogs = taskLogs.filter(
                (l) =>
                  l.userId === activeUser.id ||
                  (l.userName && activeUser.name && l.userName.trim().toLowerCase() === activeUser.name.trim().toLowerCase())
              );
              const html = generateWorkOrderSummaryPdf(
                myLogs,
                masterTasks,
                jobBarengList,
                [activeUser],
                {
                  division: activeUser.division || 'OB',
                  startDate: today,
                  endDate: today,
                  staffName: activeUser.name,
                  title: 'REKAP REALISASI WORK ORDER TUGAS',
                }
              );
              printHtmlAsPdf(
                html,
                `WorkOrder_${activeUser.name.replace(/\s+/g, '_')}_${today}`
              );
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            title="Unduh & Cetak PDF Dokumen Work Order Tugas Saya Hari Ini"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>📄 Unduh PDF Work Order</span>
          </button>

          {/* Quick Access to Tree Work Orders & Adhoc Task - Eksklusif PLH & Kordinator PLH */}
          {isPLH && (
            <>
              <button
                type="button"
                onClick={() => setShowAdhocModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                title="Input pekerjaan tambahan atau mandiri yang dikerjakan hari ini (misal: menyemai benih, olah pupuk kompos, dll.)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>+ Tugas Tambahan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTreeInitialId(undefined);
                  setTreeInitialAction(undefined);
                  setShowTreeModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <TreePine className="w-3.5 h-3.5 text-emerald-200" />
                <span>Work Order Pohon</span>
              </button>
            </>
          )}
        </div>
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
                Daftar Master Task kosong atau unit belum terpetakan. Klik tombol di bawah untuk memuat template tugas Standar Kebersihan Lazuardi GCS atau sinkronkan dengan Google Sheet.
              </p>
              <button
                onClick={() => {
                  const seedTasks = StorageService.getMasterTasks();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Muat Template Tugas Standar Kebersihan
              </button>
            </div>
          )}

          {/* Pekerjaan Tambahan Hari Ini (Tugas Mandiri / Insidental) - Khusus PLH */}
          {isPLH && adhocTasks.length > 0 && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>Pekerjaan Tambahan Hari Ini</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                      {adhocTasks.length} Tugas Mandiri
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdhocModal(true)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-800">
                Pekerjaan di bawah ini diinput secara mandiri dan masuk ke work order hari ini ({formatJakartaDisplayDate(today)}).
              </p>
              <div className="space-y-2">
                {adhocTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{t.title}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {t.area}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {t.estimatedMinutes || 30} Menit
                        </span>
                      </div>
                      {t.notes && (
                        <p className="text-[11px] text-slate-600 italic">"{t.notes}"</p>
                      )}
                      <div className="text-[10px] text-slate-400">
                        Oleh: {t.userName} • Dicatat pada: {new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {t.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoPreview(t.photoUrl!)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 border border-slate-200 cursor-pointer"
                        >
                          <Camera className="w-3 h-3 text-slate-500" />
                          <span>Lihat Foto</span>
                        </button>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                        <Check className="w-3 h-3" />
                        <span>{t.status}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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

          {/* PLH Specific: Work Order Pohon Mingguan (Sesuai Permintaan: seperti work order mingguan biasa) */}
          {isPLH && (
            <div className="bg-white border border-emerald-300 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                    <TreePine className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>Work Order Pohon Mingguan</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {activeUser.assignedArea || 'Semua Wilayah'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Cek kondisi pohon di area tugas Anda. Direset tiap Senin jam 00:00 WIB. Log riwayat otomatis tersimpan di <strong>TaskLogs_Pohon</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTreeInitialId(undefined);
                      setTreeInitialAction(undefined);
                      setShowTreeModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Buka Modul Pohon Lengkap ↗</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar Ceklis Mingguan */}
              {userAreaTrees.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700 font-semibold text-[11px]">
                      Pengecekan Minggu Ini (Reset Tiap Senin):
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-[11px]">
                      {userAreaTrees.filter((t) => getTreeWeeklyCheckStatus(t).isCheckedThisWeek).length} / {userAreaTrees.length} Pohon Selesai Dicek
                    </span>
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{
                          width: `${(userAreaTrees.filter((t) => getTreeWeeklyCheckStatus(t).isCheckedThisWeek).length / Math.max(1, userAreaTrees.length)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Daftar Pohon sebagai Work Order Mingguan Biasa */}
              <div className="space-y-2 pt-1">
                {userAreaTrees.map((tree) => {
                  const status = getTreeWeeklyCheckStatus(tree);
                  return (
                    <div
                      key={tree.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900">{tree.treeName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold">
                            {tree.area}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold border ${status.badgeClass}`}>
                            {status.statusText}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500">
                          Kondisi: <strong>{tree.condition}</strong> • Pemeriksaan Terakhir: {tree.lastCheckedDate || tree.date} {tree.lastCheckedTime ? `(${tree.lastCheckedTime})` : ''}
                          {tree.lastCheckedByName && ` oleh ${sanitizePlhStaffName(tree.lastCheckedByName, tree.area)}`}
                        </div>
                        {tree.inspectionNotes && (
                          <p className="text-[10.5px] text-slate-600 italic">"{tree.inspectionNotes}"</p>
                        )}
                        {/* Panduan Foto Standar & Sudut */}
                        <div className="flex items-center gap-1.5 pt-0.5 text-[10.5px] flex-wrap">
                          <span className="text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Camera className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Standar Foto:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[280px]">
                              {tree.standardPhotoAngleGuide || 'Jarak 5–10m agar pohon tampak utuh'}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenTreeWithAction(tree.id, 'inspect')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Lakukan pengecekan kondisi pohon & ambil foto sesuai panduan standar"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Ceklis & Foto Pohon</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTreeWithAction(tree.id, 'history')}
                          className="px-2 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-slate-200"
                          title="Lihat riwayat log pemeriksaan pohon (TaskLogs_Pohon)"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Riwayat</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Dual Peer Inspection History Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Rekap Laporan Inspeksi Silang (Peer Review)
              </h4>
              {/* Sub-tab switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold border border-slate-200">
                <button
                  onClick={() => setInspectionSubTab('submitted')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    inspectionSubTab === 'submitted'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Laporan yang Saya Buat ({mySubmittedInspections.length})
                </button>
                <button
                  onClick={() => setInspectionSubTab('received')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    inspectionSubTab === 'received'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Laporan yang Saya Terima ({myReceivedInspections.length})
                </button>
              </div>
            </div>

            {/* View 1: Inspeksi yang Saya Lakukan (Submitted by Active User) */}
            {inspectionSubTab === 'submitted' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {mySubmittedInspections.length > 0 ? (
                  mySubmittedInspections.map((insp) => {
                    const isCompliant =
                      insp.status === 'Sesuai Standar Kebersihan' ||
                      insp.status === 'Sesuai Standar SOP' ||
                      !insp.status;
                    return (
                      <div
                        key={insp.id}
                        className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5 text-xs hover:border-sky-300 transition"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {insp.targetUserName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                              Unit {insp.targetUnit}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200/80 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tersimpan di Google Sheet
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                              isCompliant
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            {insp.status || 'Sesuai Standar Kebersihan'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                          <p>
                            <span className="text-slate-400 font-medium">Area yang Diperiksa:</span>{' '}
                            <strong>{insp.area}</strong>
                          </p>
                          <p>
                            <span className="text-slate-400 font-medium">Waktu Lapor:</span>{' '}
                            <strong>{insp.date}</strong> {insp.timestamp ? `(${insp.timestamp.slice(11, 16)} WIB)` : ''}
                          </p>
                        </div>

                        {insp.notes && (
                          <div className="text-slate-800 bg-amber-50/40 p-2.5 rounded-lg border border-amber-200/60">
                            <span className="text-[10px] font-bold text-amber-900 uppercase block mb-0.5">
                              Catatan Pengawasan / Temuan:
                            </span>
                            <p className="italic">"{insp.notes}"</p>
                          </div>
                        )}

                        {/* Inspection Photo Proof */}
                        {insp.photoUrl && (
                          <div className="flex items-center gap-3 p-2 bg-sky-50/60 border border-sky-200/70 rounded-lg">
                            <img
                              src={formatGoogleDriveImageUrl(insp.photoUrl)}
                              alt="Foto Bukti Inspeksi"
                              className="w-12 h-12 object-cover rounded-md border border-sky-300 shrink-0 cursor-pointer shadow-xs"
                              onClick={() => setSelectedPhotoPreview(insp.photoUrl!)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-bold text-sky-950 block">Foto Bukti Inspeksi Bersama</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoPreview(insp.photoUrl!)}
                                  className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold underline cursor-pointer"
                                >
                                  Pratinjau Foto ↗
                                </button>
                                {insp.photoUrl.startsWith('http') && (
                                  <a
                                    href={insp.photoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                                  >
                                    Buka File Asli (Drive)
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Checklist Breakdown */}
                        {insp.checklistItems && insp.checklistItems.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Rincian Standar Kebersihan:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                              {insp.checklistItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={`px-2 py-1 rounded-md border flex items-center justify-between gap-1.5 ${
                                    item.passed
                                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                                  }`}
                                >
                                  <span className="truncate">{item.label}</span>
                                  <span className="font-bold shrink-0">{item.passed ? '✓ Lolos' : '✗ Temuan'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-white border border-slate-200/80 rounded-xl space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-slate-600 font-semibold text-xs">
                      Anda belum memiliki riwayat membuat laporan inspeksi silang.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Klik tombol "+ Isi Laporan Inspeksi Silang" di bagian atas untuk mulai menginspeksi rekan kerja Anda.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* View 2: Inspeksi yang Saya Terima (Received from Peers & Coordinator) */}
            {inspectionSubTab === 'received' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {myReceivedInspections.length > 0 ? (
                  myReceivedInspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5 text-xs"
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
                          {insp.status || 'Sesuai Standar Kebersihan'}
                        </span>
                      </div>

                      <p className="text-slate-700">
                        <strong>Area Diperiksa:</strong> {insp.area}
                      </p>

                      {insp.notes && (
                        <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 italic">
                          "{insp.notes}"
                        </p>
                      )}

                      {/* Inspection Photo if attached */}
                      {insp.photoUrl && (
                        <div className="flex items-center gap-2.5 p-2 bg-sky-50/60 border border-sky-200/70 rounded-lg">
                          <img
                            src={formatGoogleDriveImageUrl(insp.photoUrl)}
                            alt="Foto Temuan Inspeksi"
                            className="w-12 h-12 object-cover rounded-md border border-sky-300 shrink-0 cursor-pointer"
                            onClick={() => setSelectedPhotoPreview(insp.photoUrl!)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-sky-950 block">Foto Temuan / Bukti Inspeksi</span>
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoPreview(insp.photoUrl!)}
                              className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold underline cursor-pointer"
                            >
                              Lihat Foto Lengkap ↗
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Checklist Breakdown */}
                      {insp.checklistItems && insp.checklistItems.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Checklist Standar Kebersihan (Toilet & Area):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                            {insp.checklistItems.map((item, idx) => (
                              <div
                                key={idx}
                                className={`px-2 py-1 rounded-md border flex items-center justify-between gap-1.5 ${
                                  item.passed
                                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                    : 'bg-amber-50/60 border-amber-200 text-amber-900'
                                }`}
                              >
                                <span className="truncate">{item.label}</span>
                                <span className="font-bold shrink-0">{item.passed ? '✓ Lolos' : '✗ Temuan'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>Tanggal: {insp.date}</span>
                        <span className="text-slate-500 font-medium">
                          {insp.checklistItems?.filter((c) => c.passed).length || 0} dari{' '}
                          {insp.checklistItems?.length || 0} item standar lolos
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-white border border-slate-200/80 rounded-xl text-xs">
                    Belum ada catatan inspeksi yang ditujukan untuk Anda.
                  </div>
                )}
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
                <span>Pratinjau Foto Bukti / Standar Kebersihan</span>
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

      {/* Modal / Overlay: Tree Work Order Management View - Eksklusif PLH */}
      {showTreeModal && isPLH && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-5xl rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-300 max-h-[92vh] overflow-y-auto relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  🌳
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Modul Work Order Khusus Pohon (PLH & Vendor Luar)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pencatatan kondisi rimbun, instruksi database Google Sheet, dan penanganan vendor
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseTreeModal}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>

            <TreeWorkOrderView
              activeUser={activeUser}
              isModal={true}
              initialTreeId={treeInitialId}
              initialAction={treeInitialAction}
              onClose={handleCloseTreeModal}
            />
          </div>
        </div>
      )}

      {/* Modal: Input Tugas Tambahan Hari Ini (Khusus PLH) */}
      {showAdhocModal && isPLH && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Input Pekerjaan Tambahan Hari Ini
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pekerjaan mandiri PLH yang masuk ke work order hari ini saja ({formatJakartaDisplayDate(today)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdhocModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdhocTask} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Judul Pekerjaan Tambahan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Nyemai benih tanaman cabai & tomat, buat kompos..."
                  value={adhocTitle}
                  onChange={(e) => setAdhocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Area Pengerjaan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adhocArea}
                    onChange={(e) => setAdhocArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium text-slate-800"
                  >
                    {PLH_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                    <option value="Area Lainnya / Seluruh Sekolah">Area Lainnya / Seluruh Sekolah</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Estimasi Waktu Pengerjaan (Menit)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={adhocMinutes}
                    onChange={(e) => setAdhocMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Keterangan & Rincian Pekerjaan
                </label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan apa yang dikerjakan, alat/bahan yang digunakan, atau lokasi spesifik..."
                  value={adhocNotes}
                  onChange={(e) => setAdhocNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              {/* Upload Foto Bukti */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Foto Bukti Pengerjaan (Opsional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 cursor-pointer transition text-slate-600 font-medium text-xs">
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span>Upload / Ambil Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setAdhocPhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {adhocPhoto && (
                    <button
                      type="button"
                      onClick={() => setAdhocPhoto('')}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                      title="Hapus foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {adhocPhoto && (
                  <div className="mt-2 text-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <img
                      src={formatGoogleDriveImageUrl(adhocPhoto)}
                      alt="Bukti Pengerjaan"
                      className="max-h-36 mx-auto rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Status Pekerjaan</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="adhoc_status"
                      checked={adhocStatus === 'Selesai'}
                      onChange={() => setAdhocStatus('Selesai')}
                      className="text-amber-600"
                    />
                    <span>Sudah Selesai</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="adhoc_status"
                      checked={adhocStatus === 'Sedang Dikerjakan'}
                      onChange={() => setAdhocStatus('Sedang Dikerjakan')}
                      className="text-amber-600"
                    />
                    <span>Sedang Dikerjakan</span>
                  </label>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-[11px] leading-relaxed">
                ℹ️ <strong>Catatan:</strong> Tugas tambahan ini hanya akan tercatat pada work order hari ini ({formatJakartaDisplayDate(today)}) dan otomatis masuk ke log harian divisi PLH (TaskLogs_PLH).
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdhocModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdhoc || !adhocTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan ke Work Order Hari Ini</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
