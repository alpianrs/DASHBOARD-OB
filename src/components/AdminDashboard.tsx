import React, { useState } from 'react';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Sparkles,
  Plane,
  Building2,
  FileSpreadsheet,
  FolderSync,
  Plus,
  Edit2,
  Trash2,
  Star,
  ExternalLink,
  Download,
  Eye,
  Check,
  X,
  RefreshCw,
  Search,
  Copy,
  Coffee,
  CalendarOff,
  SunMedium,
  XCircle,
  ClipboardCheck,
  Trophy,
  Award,
  Link2,
  CheckCircle,
  HelpCircle,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  User,
  MasterTask,
  TaskLog,
  JobBareng,
  DinasRequest,
  PeerInspection,
  WeeklyScore,
  SyncConfig,
  HolidayConfig,
  UnitType,
  UserRole,
  EVALUATION_CATEGORIES,
} from '../types';
import { StorageService, isTaskAssignedToUser } from '../services/storage';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/googleSheets';
import {
  formatGoogleDriveImageUrl,
  getGoogleDriveViewLink,
  extractGoogleDriveFileId,
} from '../utils/driveHelper';
import { parseInstructionSteps } from '../utils/instructionHelper';
import {
  getJakartaDateString,
  getJakartaHour,
  formatJakartaDisplayDate,
  isMasterTaskActive,
} from '../utils/dateHelper';
import {
  getSaturdayOptionsList,
  formatSaturdayDate,
  toISODateString,
} from '../utils/saturdayHelper';

interface AdminDashboardProps {
  activeUser: User;
  allUsers: User[];
  masterTasks: MasterTask[];
  taskLogs: TaskLog[];
  jobBarengList: JobBareng[];
  dinasRequests: DinasRequest[];
  peerInspections: PeerInspection[];
  weeklyScores: WeeklyScore[];
  syncConfig: SyncConfig;
  onUpdateUser: (user: User) => void;
  onAddUser: (user: User) => void;
  onAddMasterTask: (task: MasterTask) => void;
  onUpdateMasterTask: (task: MasterTask) => void;
  onDeleteMasterTask: (taskId: string) => void;
  onCreateJobBareng: (job: JobBareng) => void;
  onApproveDinas: (requestId: string, approve: boolean) => void;
  onTriggerSync: () => void;
}

const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeUser,
  allUsers,
  masterTasks,
  taskLogs,
  jobBarengList,
  dinasRequests,
  peerInspections,
  weeklyScores,
  syncConfig,
  onUpdateUser,
  onAddUser,
  onAddMasterTask,
  onUpdateMasterTask,
  onDeleteMasterTask,
  onCreateJobBareng,
  onApproveDinas,
  onTriggerSync,
}) => {
  const [adminTab, setAdminTab] = useState<
    'analytics' | 'rekap_tugas' | 'job_bareng' | 'dinas_luar' | 'manajemen_user' | 'master_task' | 'hari_libur' | 'google_sync'
  >('analytics');

  // Date filtering state using Jakarta (WIB) timezone
  const todayStr = getJakartaDateString();
  const [dateFilterMode, setDateFilterMode] = useState<'today' | '7days' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('Semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Holiday / Schedule Configuration State
  const [holidayConfig, setHolidayConfig] = useState<HolidayConfig>(() =>
    StorageService.getHolidayConfig()
  );
  const [newHolidayDate, setNewHolidayDate] = useState<string>('');
  const [holidaySaveStatus, setHolidaySaveStatus] = useState<string | null>(null);

  // Google Apps Script Copy Feedback & Web App URL
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [webAppUrlInput, setWebAppUrlInput] = useState<string>(
    () => syncConfig.webAppUrl || StorageService.getSyncConfig().webAppUrl || ''
  );
  const [webAppUrlSaved, setWebAppUrlSaved] = useState<boolean>(false);

  // Selected Photo Preview
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Google Drive Tester & Converter Tool State
  const [driveTestUrl, setDriveTestUrl] = useState<string>('');
  const [driveTestResult, setDriveTestResult] = useState<{
    original: string;
    formatted: string;
    viewLink: string;
    fileId: string | null;
    isValid: boolean;
  } | null>(null);

  const handleTestDriveUrl = () => {
    if (!driveTestUrl.trim()) {
      setDriveTestResult(null);
      return;
    }
    const fileId = extractGoogleDriveFileId(driveTestUrl);
    const formatted = formatGoogleDriveImageUrl(driveTestUrl);
    const viewLink = getGoogleDriveViewLink(driveTestUrl, syncConfig.driveFolderId);
    setDriveTestResult({
      original: driveTestUrl.trim(),
      formatted,
      viewLink,
      fileId,
      isValid: !!fileId || driveTestUrl.startsWith('http'),
    });
  };

  // Job Bareng / Tugas Insidental Modal State
  const [isCreatingJob, setIsCreatingJob] = useState<boolean>(false);
  const [jbTitle, setJbTitle] = useState<string>('');
  const [jbDescription, setJbDescription] = useState<string>('');
  const [jbUnit, setJbUnit] = useState<UnitType>('Semua Unit');
  const [jbArea, setJbArea] = useState<string>('Area Sekolah');
  const [jbTime, setJbTime] = useState<string>('13:00 - 15:30 WIB');
  const [jbAssignmentType, setJbAssignmentType] = useState<'all' | 'specific'>('all');
  const [jbSelectedUserIds, setJbSelectedUserIds] = useState<string[]>([]);

  // 15 SOP Breakdown Filter State (Inherits Unit & User from global filters)
  const [sopDateMode, setSopDateMode] = useState<'all' | 'week' | 'range' | 'month'>('all');
  const [sopSelectedSaturday, setSopSelectedSaturday] = useState<string>('Semua');
  const [sopStartDate, setSopStartDate] = useState<string>('');
  const [sopEndDate, setSopEndDate] = useState<string>('');

  // Incidental Task Participation Chart Filter State
  const [selectedIncidentalUser, setSelectedIncidentalUser] = useState<string>('Semua');
  const [selectedIncidentalPeriod, setSelectedIncidentalPeriod] = useState<'month' | '30days' | 'all'>('month');

  // User Management State
  const [isEditingUserModal, setIsEditingUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserUsername, setNewUserUsername] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserUnit, setNewUserUnit] = useState<UnitType>('TK');

  // Master Task Modal State
  const [isEditingTaskModal, setIsEditingTaskModal] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<MasterTask | null>(null);
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskCategory, setTaskCategory] = useState<'Harian' | 'Mingguan' | 'Bulanan'>('Harian');
  const [taskTiming, setTaskTiming] = useState<'pre_readiness' | 'clock_out' | 'anytime'>('pre_readiness');
  const [taskUnit, setTaskUnit] = useState<UnitType>('Semua Unit');
  const [taskArea, setTaskArea] = useState<string>('');
  const [taskAssignee, setTaskAssignee] = useState<string>('Semua Petugas');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>('Semua');
  const [taskInstructionsText, setTaskInstructionsText] = useState<string>('');
  const [taskPhotoRequired, setTaskPhotoRequired] = useState<boolean>(true);
  const [taskStandardPhotoUrl, setTaskStandardPhotoUrl] = useState<string>('');
  const [taskIsActive, setTaskIsActive] = useState<boolean>(true);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('Semua');

  // Helper to extract YYYY-MM-DD cleanly from any format
  const normalizeLogDate = (dateVal?: string, timestampVal?: string): string => {
    const raw = (dateVal || timestampVal || '').trim();
    if (!raw) return '';
    if (raw.includes('T')) return raw.split('T')[0];
    if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    return raw;
  };

  // Filter Task Logs according to Date, Unit, User, and Status controls
  const filteredTaskLogs = taskLogs.filter((log) => {
    const logDate = normalizeLogDate(log.date, log.timestamp);
    if (dateFilterMode === 'today') {
      if (logDate !== todayStr && !log.timestamp?.startsWith(todayStr)) return false;
    } else if (dateFilterMode === 'custom') {
      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
    }
    // Unit filter
    if (selectedUnitFilter !== 'Semua' && log.unit !== selectedUnitFilter) {
      return false;
    }
    // User filter
    if (selectedUserFilter !== 'Semua') {
      const matchUser =
        log.userId === selectedUserFilter ||
        (log.userName && log.userName.toLowerCase().includes(selectedUserFilter.toLowerCase())) ||
        (log.userName && selectedUserFilter.toLowerCase().includes(log.userName.toLowerCase()));
      if (!matchUser) return false;
    }
    // Status filter
    if (selectedStatusFilter !== 'Semua') {
      if (selectedStatusFilter === 'Selesai') {
        if (log.status !== 'Selesai' || log.isLate) return false;
      } else if (selectedStatusFilter === 'Terlambat') {
        if (!log.isLate && log.status !== 'Terlambat') return false;
      } else if (selectedStatusFilter === 'Terlambat_SudahLapor') {
        const isLate = log.isLate || log.status === 'Terlambat';
        const hasReason = Boolean(log.lateReason && log.lateReason.trim().length > 0);
        if (!isLate || !hasReason) return false;
      } else if (selectedStatusFilter === 'Terlambat_BelumLapor') {
        const isLate = log.isLate || log.status === 'Terlambat';
        const hasReason = Boolean(log.lateReason && log.lateReason.trim().length > 0);
        if (!isLate || hasReason) return false;
      } else if (log.status !== selectedStatusFilter) {
        return false;
      }
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = log.userName?.toLowerCase().includes(q);
      const matchTitle = log.taskTitle?.toLowerCase().includes(q);
      const matchUnit = log.unit?.toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchUnit) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalLogs = filteredTaskLogs.length;
  const completedLogs = filteredTaskLogs.filter((l) => l.status === 'Selesai' && !l.isLate).length;
  const lateLogs = filteredTaskLogs.filter((l) => l.isLate || l.status === 'Terlambat').length;
  const totalCompleted = completedLogs + lateLogs;

  // Filter Target Staff in Scope (Based on top global Unit and User filter)
  const targetStaffUsers = allUsers.filter((u) => {
    if (u.status !== 'Aktif') return false;
    if (u.role !== 'user' && u.role !== 'kordinator') return false;
    if (selectedUnitFilter !== 'Semua' && u.unit !== selectedUnitFilter && u.unit !== 'Semua Unit') return false;
    if (selectedUserFilter !== 'Semua') {
      if (u.id !== selectedUserFilter && !u.name.toLowerCase().includes(selectedUserFilter.toLowerCase())) return false;
    }
    return true;
  });

  const daySpan = Math.max(
    1,
    Math.round(
      (new Date(endDate || todayStr).getTime() - new Date(startDate || todayStr).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  // Chart 1 Specific: PRE-READINESS Dedicated Task Logs & Status Breakdown
  const preReadinessFilteredLogs = taskLogs.filter((log) => {
    // Filter khusus tugas Pre-Readiness
    const isPreReadiness =
      log.timingType === 'pre_readiness' ||
      (log.taskTitle && log.taskTitle.toLowerCase().includes('pagi')) ||
      (log.taskTitle && log.taskTitle.toLowerCase().includes('sebelum jam masuk')) ||
      (log.taskTitle && log.taskTitle.toLowerCase().includes('toilet pagi')) ||
      (log.taskTitle && log.taskTitle.toLowerCase().includes('pre-readiness'));
    if (!isPreReadiness) return false;

    // Date filter
    const logDate = normalizeLogDate(log.date, log.timestamp);
    if (dateFilterMode === 'today') {
      if (logDate !== todayStr && !log.timestamp?.startsWith(todayStr)) return false;
    } else if (dateFilterMode === 'custom') {
      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
    }

    // Unit filter (Inherit from top global filter)
    if (selectedUnitFilter !== 'Semua' && log.unit !== selectedUnitFilter) {
      return false;
    }

    // User filter (Inherit from top global filter)
    if (selectedUserFilter !== 'Semua') {
      const matchUser =
        log.userId === selectedUserFilter ||
        (log.userName && log.userName.toLowerCase().includes(selectedUserFilter.toLowerCase())) ||
        (log.userName && selectedUserFilter.toLowerCase().includes(log.userName.toLowerCase()));
      if (!matchUser) return false;
    }

    return true;
  });

  const prTepatWaktuCount = preReadinessFilteredLogs.filter(
    (l) => l.status === 'Selesai' && !l.isLate
  ).length;

  const prTerlambatCount = preReadinessFilteredLogs.filter(
    (l) => l.isLate || l.status === 'Terlambat'
  ).length;

  // Active Pre-Readiness Master Tasks assigned to target staff in scope
  const activePreReadinessMasterTasks = masterTasks.filter(
    (m) =>
      isMasterTaskActive(m) &&
      (m.timingType === 'pre_readiness' ||
        m.title.toLowerCase().includes('pagi') ||
        m.title.toLowerCase().includes('sebelum jam masuk') ||
        m.title.toLowerCase().includes('pre-readiness'))
  );

  const preReadinessDailyTarget = targetStaffUsers.reduce((sum, user) => {
    const assigned = activePreReadinessMasterTasks.filter((m) =>
      isTaskAssignedToUser(m, user)
    );
    return sum + assigned.length;
  }, 0);

  const factorDays = dateFilterMode === 'today' ? 1 : dateFilterMode === 'all' ? 1 : Math.min(daySpan, 31);
  const expectedPreReadinessTarget = Math.max(
    preReadinessDailyTarget * factorDays,
    prTepatWaktuCount + prTerlambatCount
  );

  // Any uncompleted Pre-Readiness task counts as Belum Dikerjakan / Terlambat
  const prBelumDikerjakanCount = Math.max(
    0,
    expectedPreReadinessTarget - (prTepatWaktuCount + prTerlambatCount)
  );

  const totalPrTerlambatDanBelum = prTerlambatCount + prBelumDikerjakanCount;
  const prTotalCount = prTepatWaktuCount + totalPrTerlambatDanBelum;

  // Chart Data: Pre-Readiness Pagi Tepat Waktu vs Terlambat
  const statusPieData = [
    {
      name: 'Tepat Waktu (< 09:00 WIB)',
      value: prTepatWaktuCount,
      color: '#10B981',
    },
    {
      name: 'Terlambat / Belum Selesai (≥ 09:00 WIB)',
      value: totalPrTerlambatDanBelum,
      color: '#F59E0B',
    },
  ].filter((d) => d.value > 0);

  // Fallback if no pre-readiness logged yet in filter
  if (statusPieData.length === 0 && prTotalCount > 0) {
    statusPieData.push({
      name: 'Tepat Waktu (< 09:00 WIB)',
      value: prTotalCount,
      color: '#10B981',
    });
  }

  // Calculate daily master tasks for filtered scope
  const dailyTasksAssignedCount = targetStaffUsers.reduce((sum, user) => {
    const userMaster = masterTasks.filter(
      (m) => m.category === 'Harian' && isMasterTaskActive(m) && isTaskAssignedToUser(m, user)
    );
    return sum + userMaster.length;
  }, 0);

  const expectedTargetTasks =
    dateFilterMode === 'today'
      ? Math.max(dailyTasksAssignedCount, 1)
      : Math.max(dailyTasksAssignedCount * Math.min(daySpan, 31), 1);

  // Average coordinator score across all staff (1 - 4 scale)
  const avgKordScore =
    weeklyScores.length > 0
      ? (
          weeklyScores.reduce((sum, item) => sum + item.score, 0) /
          weeklyScores.length
        ).toFixed(1)
      : '3.8';

  // Chart Data: Completion per Unit / User
  const unitsList: UnitType[] = ['TK', 'SD', 'SMP', 'Pelangi Direktorat', 'Ar Razi', 'Khaldun'];
  
  // Chart Data 2: Selesai vs Tidak Selesai (Donut / Pie Chart)
  const totalCompletedInFilter = filteredTaskLogs.filter(
    (l) => l.status === 'Selesai'
  ).length;

  let targetTasksScope = expectedTargetTasks;
  if (selectedUserFilter !== 'Semua') {
    const userObj = allUsers.find(
      (u) => u.id === selectedUserFilter || u.name.toLowerCase() === selectedUserFilter.toLowerCase()
    );
    const assignedToUser = userObj
      ? masterTasks.filter((t) => isMasterTaskActive(t) && isTaskAssignedToUser(t, userObj)).length
      : 5;
    const factor = dateFilterMode === 'today' ? 1 : Math.min(daySpan, 31);
    targetTasksScope = Math.max(assignedToUser * factor, totalCompletedInFilter, 1);
  } else if (selectedUnitFilter !== 'Semua') {
    const unitStaffCount = allUsers.filter(
      (u) => u.status === 'Aktif' && (u.role === 'user' || u.role === 'kordinator') && (u.unit === selectedUnitFilter || u.unit === 'Semua Unit')
    ).length;
    const factor = dateFilterMode === 'today' ? 1 : Math.min(daySpan, 31);
    targetTasksScope = Math.max(dailyTasksAssignedCount * factor, totalCompletedInFilter, unitStaffCount * 5);
  }

  const incompleteTasksCount = Math.max(0, targetTasksScope - totalCompletedInFilter);

  const completionPieData = [
    { name: 'Selesai', value: totalCompletedInFilter, color: '#10B981' },
    { name: 'Tidak Selesai / Belum', value: incompleteTasksCount, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  if (completionPieData.length === 0) {
    completionPieData.push({ name: 'Selesai', value: Math.max(totalLogs, 1), color: '#10B981' });
  }

  // Saturday options list for 15 SOP Evaluation filter
  const saturdayOptions = getSaturdayOptionsList(12, 1);
  const existingSaturdayOptions = Array.from(
    new Set(
      weeklyScores
        .map((w) => w.saturdayDate || w.dateRange)
        .filter((d): d is string => Boolean(d && d.trim().length > 0))
    )
  );

  // Chart Data 3: 15 SOP Criteria Breakdown Calculations (Evaluasi Kordinator)
  const filteredWeeklyScores = weeklyScores.filter((w) => {
    const userObj = allUsers.find((u) => u.id === w.userId || u.name.toLowerCase() === w.userName.toLowerCase());
    
    // Filter Unit (Inherit from top global filter)
    if (selectedUnitFilter !== 'Semua') {
      if (!userObj || (userObj.unit !== selectedUnitFilter && userObj.unit !== 'Semua Unit')) {
        return false;
      }
    }
    
    // Filter Petugas (Inherit from top global filter)
    if (selectedUserFilter !== 'Semua') {
      if (w.userName.toLowerCase() !== selectedUserFilter.toLowerCase() && (!userObj || userObj.name.toLowerCase() !== selectedUserFilter.toLowerCase())) {
        return false;
      }
    }

    // Filter Tanggal / Pekan / Rentang
    if (sopDateMode === 'week' && sopSelectedSaturday !== 'Semua') {
      const wDate = (w.saturdayDate || w.dateRange || '').toLowerCase();
      const wTimestamp = (w.timestamp || '').split('T')[0];
      const target = sopSelectedSaturday.toLowerCase();
      const isMatch = wDate.includes(target) || target.includes(wDate) || wTimestamp === sopSelectedSaturday;
      if (!isMatch) return false;
    } else if (sopDateMode === 'range') {
      const scoreDateStr = (w.timestamp || '').split('T')[0] || (w.saturdayDate || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
      if (sopStartDate && scoreDateStr && scoreDateStr < sopStartDate) return false;
      if (sopEndDate && scoreDateStr && scoreDateStr > sopEndDate) return false;
    } else if (sopDateMode === 'month') {
      const nowStr = new Date();
      const currentYM = `${nowStr.getFullYear()}-${String(nowStr.getMonth() + 1).padStart(2, '0')}`;
      const scoreDateStr = (w.timestamp || '').split('T')[0];
      if (scoreDateStr && !scoreDateStr.startsWith(currentYM)) {
        return false;
      }
    }

    return true;
  });

  const sop15ChartData = EVALUATION_CATEGORIES.map((cat, idx) => {
    const scoresForCat = filteredWeeklyScores
      .map((w) => w.categoryScores?.[cat])
      .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    let avgScore = 3.8;
    if (scoresForCat.length > 0) {
      avgScore = Number((scoresForCat.reduce((sum, s) => sum + s, 0) / scoresForCat.length).toFixed(1));
    } else if (filteredWeeklyScores.length > 0) {
      avgScore = Number((filteredWeeklyScores.reduce((sum, w) => sum + w.score, 0) / filteredWeeklyScores.length).toFixed(1));
    }

    const shortName = cat.length > 20 ? `${cat.slice(0, 18)}...` : cat;
    const statusColor = avgScore >= 3.5 ? '#10B981' : avgScore >= 2.5 ? '#F59E0B' : '#EF4444';
    const statusText = avgScore >= 3.5 ? 'Sangat Baik' : avgScore >= 2.5 ? 'Cukup / Baik' : 'Perlu Evaluasi';

    return {
      id: idx + 1,
      category: cat,
      shortName: `${idx + 1}. ${shortName}`,
      score: avgScore,
      statusColor,
      statusText,
      evalCount: scoresForCat.length || (filteredWeeklyScores.length > 0 ? filteredWeeklyScores.length : 0),
    };
  });

  const overallAvgSopScore = Number(
    (sop15ChartData.reduce((sum, item) => sum + item.score, 0) / sop15ChartData.length).toFixed(2)
  );
  const sopMeetingTargetCount = sop15ChartData.filter((item) => item.score >= 3.0).length;
  const sopNeedingAttentionCount = sop15ChartData.filter((item) => item.score < 3.0).length;

  // Active Staff & Coordinator List
  const activeStaffList = allUsers.filter(
    (u) => (u.role === 'user' || u.role === 'kordinator') && u.status === 'Aktif'
  );

  // Incidental Tasks Filtered by Period
  const nowLocal = new Date();
  const currentYearMonth = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}`;
  
  const filteredIncidentalJobs = jobBarengList.filter((job) => {
    if (selectedIncidentalPeriod === 'month') {
      return job.date?.startsWith(currentYearMonth) || true;
    }
    if (selectedIncidentalPeriod === '30days') {
      const jobDate = new Date(job.date || job.createdAt);
      const diffDays = (nowLocal.getTime() - jobDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30;
    }
    return true;
  });

  // Incidental stats for selected user
  const selectedIncidentalUserObj = allUsers.find(
    (u) => u.name.toLowerCase() === selectedIncidentalUser.toLowerCase() || u.id === selectedIncidentalUser
  );
  
  const userIncidentalTasksList = filteredIncidentalJobs
    .filter((job) => {
      if (selectedIncidentalUser === 'Semua') return true;
      if (!selectedIncidentalUserObj) return true;
      if (job.assignmentType === 'specific') {
        return (
          job.assignedUserIds?.includes(selectedIncidentalUserObj.id) ||
          job.assignedUserNames?.some((n) => n.toLowerCase() === selectedIncidentalUserObj.name.toLowerCase()) ||
          false
        );
      }
      return (
        job.targetUnit === 'Semua Unit' ||
        job.targetUnit === 'Semua' ||
        job.targetUnit === selectedIncidentalUserObj.unit ||
        selectedIncidentalUserObj.unit === 'Semua Unit'
      );
    })
    .map((job) => {
      let isJoined = false;
      let isCompleted = false;
      if (selectedIncidentalUser === 'Semua') {
        isJoined = job.participantIds.length > 0;
        isCompleted = job.completedUserIds.length > 0;
      } else if (selectedIncidentalUserObj) {
        isJoined = job.participantIds.includes(selectedIncidentalUserObj.id);
        isCompleted = job.completedUserIds.includes(selectedIncidentalUserObj.id);
      }
      return { job, isJoined, isCompleted };
    });

  const userIncidentalTotalAssigned = Math.max(userIncidentalTasksList.length, 1);
  const userIncidentalJoinedCount = userIncidentalTasksList.filter((t) => t.isJoined || t.isCompleted).length;
  const userIncidentalCompletedCount = userIncidentalTasksList.filter((t) => t.isCompleted).length;
  const userIncidentalMissedCount = Math.max(0, userIncidentalTasksList.length - userIncidentalJoinedCount);
  
  const userIncidentalRate = userIncidentalTasksList.length > 0
    ? Math.round((userIncidentalJoinedCount / userIncidentalTasksList.length) * 100)
    : 0;

  const userIncidentalPieData = [
    { name: 'Ikut Serta / Selesai', value: userIncidentalJoinedCount, color: '#10B981' },
    { name: 'Tidak Ikut / Lewat', value: userIncidentalMissedCount, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  if (userIncidentalPieData.length === 0) {
    userIncidentalPieData.push({ name: 'Belum Ada Tugas', value: 1, color: '#94A3B8' });
  }

  // Job Bareng Detailed Statistics & Participation Breakdown
  const jobBarengStats = jobBarengList.map((job) => {
    const eligibleStaff = activeStaffList.filter((u) => {
      if (job.assignmentType === 'specific') {
        return (
          job.assignedUserIds?.includes(u.id) ||
          job.assignedUserNames?.some((n) => n.toLowerCase() === u.name.toLowerCase()) ||
          false
        );
      }
      return (
        job.targetUnit === 'Semua Unit' ||
        job.targetUnit === 'Semua' ||
        u.unit === job.targetUnit ||
        u.unit === 'Semua Unit'
      );
    });
    const targetCount = Math.max(1, eligibleStaff.length);
    const joinedCount = job.participantIds.length;
    const completedCount = job.completedUserIds.length;
    const participationRate = Math.min(
      100,
      Math.round((joinedCount / targetCount) * 100)
    );
    const completionRate = Math.min(
      100,
      Math.round((completedCount / targetCount) * 100)
    );
    const totalPointsAwarded = joinedCount * 5 + completedCount * 10;

    const joinedUsers = activeStaffList.filter((u) =>
      job.participantIds.includes(u.id)
    );
    const completedUsers = activeStaffList.filter((u) =>
      job.completedUserIds.includes(u.id)
    );
    const notJoinedUsers = eligibleStaff.filter(
      (u) => !job.participantIds.includes(u.id)
    );

    return {
      job,
      eligibleStaff,
      targetCount,
      joinedCount,
      completedCount,
      participationRate,
      completionRate,
      totalPointsAwarded,
      joinedUsers,
      completedUsers,
      notJoinedUsers,
    };
  });

  // Handle Create Job Bareng / Tugas Insidental
  const handleSaveJobBareng = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jbTitle.trim()) return;

    const assignedStaffUsers = allUsers.filter((u) => jbSelectedUserIds.includes(u.id));

    const newJob: JobBareng = {
      id: `jb-${Date.now()}`,
      title: jbTitle.trim(),
      description: jbDescription.trim() || 'Pekerjaan insidental kebersihan bersama unit Facility Management.',
      date: todayStr,
      timeTarget: jbTime,
      targetUnit: jbUnit,
      targetArea: jbArea,
      createdBy: activeUser.id,
      createdByName: activeUser.name,
      status: 'Aktif',
      assignmentType: jbAssignmentType,
      assignedUserIds: jbAssignmentType === 'specific' ? jbSelectedUserIds : undefined,
      assignedUserNames: jbAssignmentType === 'specific' ? assignedStaffUsers.map((u) => u.name) : undefined,
      participantIds: [],
      completedUserIds: [],
      createdAt: new Date().toISOString(),
    };

    onCreateJobBareng(newJob);
    setIsCreatingJob(false);
    setJbTitle('');
    setJbDescription('');
    setJbAssignmentType('all');
    setJbSelectedUserIds([]);
  };

  // Handle Add New User
  const handleSaveNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) return;

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: newUserName.trim(),
      username: newUserUsername.trim(),
      password: 'password123',
      role: newUserRole,
      unit: newUserUnit,
      status: 'Aktif',
    };

    onAddUser(newUser);
    setIsAddingUser(false);
    setNewUserName('');
    setNewUserUsername('');
  };

  // Handle Save Master Task
  const handleSaveMasterTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const instructionsArray = taskInstructionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanStandardPhoto = taskStandardPhotoUrl.trim() || undefined;

    if (editingTask) {
      const updated: MasterTask = {
        ...editingTask,
        title: taskTitle.trim(),
        category: taskCategory,
        timingType: taskTiming,
        unit: taskUnit,
        area: taskArea.trim(),
        assignee: taskAssignee.trim() || 'Semua Petugas',
        instructions: instructionsArray,
        photoRequired: taskPhotoRequired,
        standardPhotoUrl: cleanStandardPhoto,
        isActive: taskIsActive,
      };
      onUpdateMasterTask(updated);
      setEditingTask(null);
      setIsEditingTaskModal(false);
    } else {
      const newTask: MasterTask = {
        id: `mt-${Date.now()}`,
        title: taskTitle.trim(),
        category: taskCategory,
        timingType: taskTiming,
        unit: taskUnit,
        area: taskArea.trim(),
        assignee: taskAssignee.trim() || 'Semua Petugas',
        instructions: instructionsArray,
        photoRequired: taskPhotoRequired,
        standardPhotoUrl: cleanStandardPhoto,
        isActive: taskIsActive,
      };
      onAddMasterTask(newTask);
      setIsAddingTask(false);
    }

    setTaskTitle('');
    setTaskInstructionsText('');
    setTaskAssignee('Semua Petugas');
    setTaskStandardPhotoUrl('');
    setTaskIsActive(true);
  };

  // Export CSV Helper
  const exportToCSV = () => {
    const headers = [
      'ID,Tanggal,Staff,Role,Unit,Pekerjaan,Kategori,Status,Telat,Alasan Telat,Skor Kordinator,Inspektor Rekan',
    ];
    const rows = filteredTaskLogs.map((l) =>
      [
        l.id,
        l.date,
        `"${l.userName}"`,
        l.userRole,
        `"${l.unit}"`,
        `"${l.taskTitle}"`,
        l.category,
        l.status,
        l.isLate ? 'Ya' : 'Tidak',
        `"${l.lateReason || ''}"`,
        l.kordinatorScore || '',
        `"${l.peerInspectorName || ''}"`,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Tugas_FM_Lazuardi_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Missed Tasks (Pekerjaan Yang Tidak Dikerjakan) for active staff and coordinators
  const staffUsers = allUsers.filter(
    (u) => (u.role === 'user' || u.role === 'kordinator') && u.status === 'Aktif'
  );
  const isSelectedDateDayOff = StorageService.isDayOffToday(startDate);

  const missedTasksSummary = staffUsers.map((user) => {
    const userMasterDaily = masterTasks.filter(
      (m) => m.category === 'Harian' && isMasterTaskActive(m) && isTaskAssignedToUser(m, user)
    );

    // Check if user has an approved or submitted Dinas Luar on the selected date
    const userDinasOnDate = dinasRequests.find(
      (d) =>
        (d.userId === user.id || d.userName === user.name) &&
        (d.date === startDate || d.date?.startsWith(startDate)) &&
        (d.status === 'Disetujui' || d.status === 'Pending')
    );
    const isUserOnDinas = !!userDinasOnDate;

    const userSubmittedTaskIds = new Set(
      taskLogs
        .filter(
          (l) =>
            (l.userId === user.id || (l.userName && l.userName.toLowerCase() === user.name.toLowerCase())) &&
            (l.date === startDate || l.timestamp?.startsWith(startDate)) &&
            (l.status === 'Selesai' || l.status === 'Terlambat')
        )
        .map((l) => l.taskId)
    );
    const missedList =
      isUserOnDinas || isSelectedDateDayOff
        ? []
        : userMasterDaily.filter((m) => !userSubmittedTaskIds.has(m.id));

    const totalAssigned = userMasterDaily.length;
    const completedCount = userSubmittedTaskIds.size;
    const missedCount =
      isSelectedDateDayOff || isUserOnDinas
        ? 0
        : Math.max(0, totalAssigned - completedCount);

    let complianceRate = 100;
    if (isUserOnDinas || isSelectedDateDayOff) {
      complianceRate = 100;
    } else if (totalAssigned > 0) {
      complianceRate = Math.min(100, Math.round((completedCount / totalAssigned) * 100));
    } else {
      complianceRate = completedCount > 0 ? 100 : 0;
    }

    return {
      user,
      totalAssigned,
      completedCount,
      missedCount,
      missedTasks: missedList,
      isDinas: isUserOnDinas,
      dinasInfo: userDinasOnDate,
      complianceRate,
    };
  });

  // Holiday Configuration Handlers
  const handleToggleHolidayToday = () => {
    const updated: HolidayConfig = {
      ...holidayConfig,
      isHolidayToday: !holidayConfig.isHolidayToday,
    };
    setHolidayConfig(updated);
    StorageService.saveHolidayConfig(updated);
    setHolidaySaveStatus(
      updated.isHolidayToday
        ? 'Status: Hari Ini Ditetapkan Sebagai LIBUR / OFF'
        : 'Status: Hari Ini Ditetapkan Sebagai HARI KERJA AKTIF'
    );
    setTimeout(() => setHolidaySaveStatus(null), 3500);
  };

  const handleUpdateHolidayReason = (reason: string) => {
    const updated: HolidayConfig = {
      ...holidayConfig,
      holidayReason: reason,
    };
    setHolidayConfig(updated);
    StorageService.saveHolidayConfig(updated);
  };

  const handleToggleWeekendOff = () => {
    const updated: HolidayConfig = {
      ...holidayConfig,
      autoWeekendOff: !holidayConfig.autoWeekendOff,
    };
    setHolidayConfig(updated);
    StorageService.saveHolidayConfig(updated);
    setHolidaySaveStatus(
      updated.autoWeekendOff
        ? 'Sabtu & Minggu otomatis non-aktifkan tugas harian.'
        : 'Sabtu & Minggu tetap aktifkan tugas harian.'
    );
    setTimeout(() => setHolidaySaveStatus(null), 3500);
  };

  const handleAddDisabledDate = () => {
    if (!newHolidayDate) return;
    if (holidayConfig.disabledDates.includes(newHolidayDate)) return;
    const updated: HolidayConfig = {
      ...holidayConfig,
      disabledDates: [...holidayConfig.disabledDates, newHolidayDate].sort(),
    };
    setHolidayConfig(updated);
    StorageService.saveHolidayConfig(updated);
    setNewHolidayDate('');
    setHolidaySaveStatus(`Tanggal ${newHolidayDate} berhasil ditambahkan ke kalender libur.`);
    setTimeout(() => setHolidaySaveStatus(null), 3500);
  };

  const handleRemoveDisabledDate = (dateStr: string) => {
    const updated: HolidayConfig = {
      ...holidayConfig,
      disabledDates: holidayConfig.disabledDates.filter((d) => d !== dateStr),
    };
    setHolidayConfig(updated);
    StorageService.saveHolidayConfig(updated);
  };

  // Google Apps Script Handlers
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 4000);
  };

  const handleSaveWebAppUrl = () => {
    const updatedSync: SyncConfig = {
      ...syncConfig,
      webAppUrl: webAppUrlInput.trim(),
    };
    StorageService.saveSyncConfig(updatedSync);
    setWebAppUrlSaved(true);
    setTimeout(() => setWebAppUrlSaved(false), 3000);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Top Header Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
              Facility Management Dashboard
            </span>
            <span className="text-xs text-slate-500 font-medium">Lazuardi GCS</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1 tracking-tight">
            Pusat Kontrol & Rekap Pekerjaan OB/OG
          </h2>
          <p className="text-xs text-slate-500">
            Monitoring diagram pekerjaan harian/mingguan/bulanan, evaluasi kordinator, dan kelola rotasi unit.
          </p>
        </div>

        {/* Sync Status Button & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={onTriggerSync}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Sinkronisasi Google Sheet</span>
          </button>
        </div>
      </div>

      {/* Admin Sub-Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 rounded-2xl text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setAdminTab('analytics')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'analytics'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BarChartIcon className="w-3.5 h-3.5 text-sky-400" />
          <span>Diagram & Analitik</span>
        </button>

        <button
          onClick={() => setAdminTab('rekap_tugas')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'rekap_tugas'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rekap Log Tugas ({totalLogs})</span>
        </button>

        <button
          onClick={() => setAdminTab('job_bareng')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'job_bareng'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Job Bareng ({jobBarengList.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('dinas_luar')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'dinas_luar'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Plane className="w-3.5 h-3.5 text-sky-400" />
          <span>Persetujuan Dinas ({dinasRequests.filter((d) => d.status === 'Pending').length})</span>
        </button>

        <button
          onClick={() => setAdminTab('manajemen_user')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'manajemen_user'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-slate-300" />
          <span>Rotasi Unit & User ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('master_task')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'master_task'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Master SOP Tasks ({masterTasks.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('hari_libur')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'hari_libur'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Coffee className="w-3.5 h-3.5 text-amber-400" />
          <span>Hari Libur & Kalender</span>
        </button>

        <button
          onClick={() => setAdminTab('google_sync')}
          className={`py-2 px-3.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            adminTab === 'google_sync'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Sheet 2-Arah</span>
        </button>
      </div>

      {/* FILTER BAR: Date, Unit & User (Used across Analytics & Rekap) */}
      {(adminTab === 'analytics' || adminTab === 'rekap_tugas') && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Rentang:
            </span>
            <button
              onClick={() => {
                setDateFilterMode('today');
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => {
                setDateFilterMode('custom');
                const d = new Date();
                d.setDate(d.getDate() - 6);
                setStartDate(getJakartaDateString(d));
                setEndDate(todayStr);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilterMode === 'custom' && startDate === getJakartaDateString(new Date(Date.now() - 6 * 86400000))
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => {
                setDateFilterMode('custom');
                const d = new Date();
                d.setDate(1); // 1st of month
                setStartDate(getJakartaDateString(d));
                setEndDate(todayStr);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilterMode === 'custom' && startDate === getJakartaDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => {
                setDateFilterMode('all');
                setStartDate('');
                setEndDate('');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          {/* Date Picker Custom inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDateFilterMode('custom');
                setStartDate(e.target.value);
              }}
              className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDateFilterMode('custom');
                setEndDate(e.target.value);
              }}
              className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          {/* Unit & User Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Unit:</span>
              <select
                value={selectedUnitFilter}
                onChange={(e) => setSelectedUnitFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-sky-500"
              >
                <option value="Semua">Semua Unit</option>
                <option value="TK">TK</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="Pelangi Direktorat">Pelangi Direktorat</option>
                <option value="Ar Razi">Ar Razi</option>
                <option value="Khaldun">Khaldun</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" /> Petugas:
              </span>
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-sky-500 max-w-[180px] truncate"
              >
                <option value="Semua">Semua Petugas & Kordinator</option>
                {allUsers
                  .filter((u) => u.status === 'Aktif' && (u.role === 'user' || u.role === 'kordinator'))
                  .filter(
                    (u) =>
                      selectedUnitFilter === 'Semua' ||
                      u.unit === selectedUnitFilter ||
                      u.unit === 'Semua Unit'
                  )
                  .map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role === 'kordinator' ? 'Kordinator' : u.unit})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: DIAGRAM & ANALITIK */}
      {adminTab === 'analytics' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Pekerjaan Terinput
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-slate-900">{totalLogs}</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {completedLogs} Tepat Waktu
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Target: <strong>{expectedTargetTasks}</strong> tugas</span>
                <span className="font-semibold text-slate-700">
                  {totalLogs > 0 ? Math.round((totalLogs / expectedTargetTasks) * 100) : 0}% terinput
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Terlambat Pre-Readiness
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-amber-600">{totalPrTerlambatDanBelum}</span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  {prBelumDikerjakanCount > 0 ? `${prBelumDikerjakanCount} Belum` : 'Wajib Alasan'}
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500">
                <span>Total selesai: <strong>{totalCompleted}</strong> tugas</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Partisipasi Insidental
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-amber-600">{userIncidentalRate}%</span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  {userIncidentalJoinedCount}/{userIncidentalTotalAssigned} Ikut
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500">
                <span>{filteredIncidentalJobs.length} Tugas Insidental Terjadwal</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rata-rata Nilai Kordinator
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-indigo-600">⭐ {avgKordScore}</span>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Skala 1-4
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500">
                <span>Evaluasi 15 Standar SOP</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Staff & Kordinator Aktif
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {allUsers.filter((u) => (u.role === 'user' || u.role === 'kordinator') && u.status === 'Aktif').length}
                </span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {dinasRequests.filter((d) => d.status === 'Disetujui' && d.date === startDate).length} Dinas Luar
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500">
                <span>6 Unit Fasilitas Terpadu</span>
              </div>
            </div>
          </div>

          {/* Interactive Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Pre-Readiness On-Time vs Late Breakdown (Donut Chart) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-600" />
                    Distribusi Pre-Readiness: Tepat Waktu vs Terlambat
                  </h3>
                  <p className="text-xs text-slate-500">
                    Monitoring kepatuhan tugas Pre-Readiness pagi (sebelum 09:00 WIB) sesuai filter aktif.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full my-3">
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    Tidak ada data tugas pre-readiness untuk filter ini.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Tepat Waktu: {prTepatWaktuCount} ({prTotalCount > 0 ? Math.round((prTepatWaktuCount / prTotalCount) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Terlambat & Belum: {totalPrTerlambatDanBelum} {prBelumDikerjakanCount > 0 ? `(${prTerlambatCount} telat, ${prBelumDikerjakanCount} belum)` : ''} ({prTotalCount > 0 ? Math.round((totalPrTerlambatDanBelum / prTotalCount) * 100) : 0}%)
                </span>
              </div>
            </div>

            {/* Chart 2: Performa Selesai vs Tidak Selesai (Diagram Bulat / Donut Chart) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-sky-600" />
                    Performa Selesai vs Tidak Selesai
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedUserFilter !== 'Semua'
                      ? `Filter Petugas: ${selectedUserFilter}`
                      : selectedUnitFilter !== 'Semua'
                      ? `Filter Unit: ${selectedUnitFilter}`
                      : 'Akumulasi seluruh target tugas unit Lazuardi GCS'}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full my-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={completionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {completionPieData.map((entry, index) => (
                        <Cell key={`comp-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Selesai: {totalCompletedInFilter} ({expectedTargetTasks > 0 ? Math.round((totalCompletedInFilter / targetTasksScope) * 100) : 0}%)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Tidak Selesai: {incompleteTasksCount}
                </span>
              </div>
            </div>

            {/* Section 3: Penjabaran Nilai 15 Standar SOP Kebersihan (Evaluasi Kordinator) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                    Penjabaran Nilai 15 Standar SOP Kebersihan (Evaluasi Kordinator)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rekapitulasi nilai rata-rata 15 standar SOP kebersihan (Skala 1.0 - 4.0: 1=Kurang, 2=Cukup, 3=Baik, 4=Sangat Baik).
                  </p>
                </div>

                {/* Filter Periode Mode Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSopDateMode('all');
                      setSopSelectedSaturday('Semua');
                      setSopStartDate('');
                      setSopEndDate('');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      sopDateMode === 'all'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setSopDateMode('week')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      sopDateMode === 'week'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pekan / Sabtu
                  </button>
                  <button
                    type="button"
                    onClick={() => setSopDateMode('range')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      sopDateMode === 'range'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rentang Tanggal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSopDateMode('month');
                      setSopSelectedSaturday('Semua');
                      setSopStartDate('');
                      setSopEndDate('');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      sopDateMode === 'month'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bulan Ini
                  </button>
                </div>
              </div>

              {/* Dynamic Filter Controls Bar */}
              <div className="flex items-center gap-2.5 flex-wrap bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                {/* Specific Saturday/Week Dropdown */}
                {sopDateMode === 'week' && (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <span className="font-bold text-slate-700">Pekan / Sabtu:</span>
                    <select
                      value={sopSelectedSaturday}
                      onChange={(e) => setSopSelectedSaturday(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer text-xs"
                    >
                      <option value="Semua">Semua Pekan / Sabtu</option>
                      {saturdayOptions.map((opt) => (
                        <option key={opt.isoDate} value={opt.isoDate}>
                          {opt.label}
                        </option>
                      ))}
                      {existingSaturdayOptions.map((dateStr) => {
                        const alreadyInList = saturdayOptions.some((o) => o.label === dateStr || o.isoDate === dateStr);
                        if (alreadyInList) return null;
                        return (
                          <option key={dateStr} value={dateStr}>
                            {dateStr}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Custom Date Range Inputs */}
                {sopDateMode === 'range' && (
                  <div className="flex items-center gap-2 flex-wrap animate-in fade-in">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-700">Dari:</span>
                      <input
                        type="date"
                        value={sopStartDate}
                        onChange={(e) => setSopStartDate(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-700">Sampai:</span>
                      <input
                        type="date"
                        value={sopEndDate}
                        onChange={(e) => setSopEndDate(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {(sopStartDate || sopEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSopStartDate('');
                          setSopEndDate('');
                        }}
                        className="text-rose-600 font-bold hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}

                {/* KPI Badges */}
                <div className="ml-auto flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-black">
                    ⭐ Rata-rata: {overallAvgSopScore} / 4.0
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold">
                    ✓ {sopMeetingTargetCount}/15 Sesuai Target (≥3.0)
                  </span>
                  {sopNeedingAttentionCount > 0 && (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold">
                      ⚠ {sopNeedingAttentionCount} Perlu Perbaikan
                    </span>
                  )}
                  <span className="text-slate-400 font-semibold">
                    ({filteredWeeklyScores.length} Evaluasi)
                  </span>
                </div>
              </div>

              {/* 15 SOP Grid Cards Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                {sop15ChartData.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-sm transition space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-slate-800 line-clamp-1" title={item.category}>
                        {idx + 1}. {item.category}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded font-black text-[10px] shrink-0"
                        style={{
                          backgroundColor: `${item.statusColor}18`,
                          color: item.statusColor,
                        }}
                      >
                        ⭐ {item.score}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(5, (item.score / 4) * 100))}%`,
                          backgroundColor: item.statusColor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className="font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${item.statusColor}15`,
                          color: item.statusColor,
                        }}
                      >
                        {item.statusText}
                      </span>
                      <span className="text-slate-400 font-medium">
                        {item.evalCount} evaluasi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ==================================================================================== */}
          {/* SECTION: LAPORAN & DIAGRAM PARTISIPASI TUGAS INSIDENTAL PER PETUGAS                 */}
          {/* ==================================================================================== */}
          <div className="bg-gradient-to-br from-amber-500/5 via-white to-orange-500/5 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                    <span>Laporan & Diagram Keikutsertaan Tugas Insidental</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black border border-amber-200">
                      Insidental FM
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    Statistik kehadiran dan kepatuhan penyelesaian tugas insidental per petugas atau seluruh unit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                <button
                  onClick={() => {
                    setIsCreatingJob(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Tugas Insidental Baru</span>
                </button>
              </div>
            </div>

            {/* Filter Bar for Incidental Participation */}
            <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-600" /> Pilih Petugas:
                  </span>
                  <select
                    value={selectedIncidentalUser}
                    onChange={(e) => setSelectedIncidentalUser(e.target.value)}
                    className="px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-[220px]"
                  >
                    <option value="Semua">Semua Petugas (Agregat)</option>
                    {activeStaffList.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} (Unit {u.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" /> Periode:
                  </span>
                  <select
                    value={selectedIncidentalPeriod}
                    onChange={(e) => setSelectedIncidentalPeriod(e.target.value as any)}
                    className="px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="month">1 Bulan Terakhir / Bulan Ini</option>
                    <option value="30days">30 Hari Terakhir</option>
                    <option value="all">Semua Waktu</option>
                  </select>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-slate-500">
                Menampilkan data {filteredIncidentalJobs.length} tugas insidental
              </span>
            </div>

            {/* Visual Donut Chart & Participation Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Diagram Bulat (Donut Chart) Keikutsertaan Tugas Insidental */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <PieChartIcon className="w-4 h-4 text-amber-500" />
                      Rasio Partisipasi Insidental
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        userIncidentalRate >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : userIncidentalRate >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {userIncidentalRate}% Keikutsertaan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {selectedIncidentalUser !== 'Semua'
                      ? `Tingkat keaktifan ${selectedIncidentalUser} pada tugas insidental yang ditugaskan kepadanya.`
                      : 'Rata-rata keikutsertaan seluruh petugas pada tugas insidental.'}
                  </p>
                </div>

                <div className="h-56 w-full my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userIncidentalPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {userIncidentalPieData.map((entry, index) => (
                          <Cell key={`inc-pie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700">
                    ✓ Ikut Serta: {userIncidentalJoinedCount}
                  </span>
                  <span className="font-bold text-rose-600">
                    ✗ Tidak Ikut: {userIncidentalMissedCount}
                  </span>
                </div>
              </div>

              {/* Stat Cards & Task List */}
              <div className="lg:col-span-7 space-y-4">
                {/* Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Ditugaskan</span>
                    <span className="text-2xl font-black text-slate-900 block mt-1">
                      {userIncidentalTotalAssigned}
                    </span>
                    <span className="text-[10px] text-slate-500">Tugas Terjadwal</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Ikut Serta</span>
                    <span className="text-2xl font-black text-emerald-600 block mt-1">
                      {userIncidentalJoinedCount}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Telah Bergabung</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-rose-500 uppercase block">Tidak Ikut / Lewat</span>
                    <span className="text-2xl font-black text-rose-600 block mt-1">
                      {userIncidentalMissedCount}
                    </span>
                    <span className="text-[10px] text-rose-700 font-semibold">Belum Ikut</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block">Partisipasi</span>
                    <span className="text-2xl font-black text-amber-600 block mt-1">
                      {userIncidentalRate}%
                    </span>
                    <span className="text-[10px] text-amber-800 font-bold">
                      {userIncidentalRate >= 80 ? 'Target Tercapai ✓' : 'Di Bawah 80%'}
                    </span>
                  </div>
                </div>

                {/* List of Incidental Tasks for this user */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5 text-xs">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center justify-between">
                    <span>Daftar Tugas Insidental Terkait ({userIncidentalTasksList.length} Tugas):</span>
                    <span className="text-[11px] text-slate-400 font-normal">Periode Terpilih</span>
                  </h4>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {userIncidentalTasksList.length > 0 ? (
                      userIncidentalTasksList.map(({ job, isJoined, isCompleted }) => (
                        <div
                          key={job.id}
                          className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                                {job.targetUnit}
                              </span>
                              <span className="text-[10px] text-slate-500">{job.date}</span>
                              <span className="font-bold text-slate-900 truncate text-[11px]">{job.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">{job.targetArea || 'Area Sekolah'}</span>
                          </div>

                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isJoined
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                Selesai
                              </>
                            ) : isJoined ? (
                              <>
                                <Clock className="w-3 h-3 text-sky-600" />
                                Ikut Serta
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 text-rose-600" />
                                Belum Ikut
                              </>
                            )}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-center py-4">
                        Tidak ada tugas insidental untuk periode dan filter ini.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REKAP LOG TUGAS & INSPEKSI */}
      {adminTab === 'rekap_tugas' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search bar & status filter */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama staff, judul pekerjaan, atau unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="Semua">Semua Status</option>
                <option value="Selesai">Tepat Waktu (Selesai)</option>
                <option value="Terlambat">Semua Terlambat</option>
                <option value="Terlambat_SudahLapor">✓ Terlambat (Sudah Lapor Alasan)</option>
                <option value="Terlambat_BelumLapor">⚠️ Terlambat (Belum Lapor Alasan)</option>
                <option value="Dinas Luar">Dinas Luar</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Waktu & Tanggal</th>
                    <th className="p-3">Staff / OB / OG</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Pekerjaan SOP</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Alasan Telat / Catatan</th>
                    <th className="p-3">Bukti Foto Live</th>
                    <th className="p-3">Nilai Kord</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredTaskLogs.length > 0 ? (
                    filteredTaskLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.date}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            WIB
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {log.userName}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-semibold">
                            {log.unit}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate" title={log.taskTitle}>
                          {log.taskTitle}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800">
                            {log.category} ({log.timingType})
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {log.isLate || log.status === 'Terlambat' ? (
                            Boolean(log.lateReason && log.lateReason.trim().length > 0) ? (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3 text-emerald-700" /> Telat (Sudah Lapor)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Telat (Belum Lapor)
                              </span>
                            )
                          ) : log.status === 'Selesai' ? (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                              Selesai
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800">
                              {log.status}
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-xs text-[11px]">
                          {log.lateReason ? (
                            <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 font-semibold text-[11px] leading-tight">
                              <span className="text-[9px] font-bold text-amber-800 uppercase block mb-0.5">
                                Alasan Telat:
                              </span>
                              "{log.lateReason}"
                            </div>
                          ) : log.notes ? (
                            <span className="italic text-slate-500">{log.notes}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {log.photoUrl ? (
                            <button
                              onClick={() => setPhotoPreview(log.photoUrl!)}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer border border-emerald-200"
                            >
                              <Eye className="w-3 h-3" /> Foto Live
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Tidak ada</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {log.kordinatorScore ? (
                            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              ⭐ {log.kordinatorScore}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Tidak ada log tugas yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MISSED TASKS SECTION: Rekap Pekerjaan Yang Tidak Dikerjakan */}
          <div className="bg-white border border-rose-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-rose-950">
                    Rekap Pekerjaan yang Tidak Dikerjakan (Missed Tasks) & Penilaian Kepatuhan
                  </h3>
                  <p className="text-xs text-rose-800/80">
                    Daftar tugas SOP harian yang belum dikerjakan staff pada tanggal <strong>{startDate}</strong>.
                    {isSelectedDateDayOff && ' (Catatan: Tanggal ini berstatus Hari Libur / Off, tidak ada penalti)'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full font-bold text-xs border border-rose-200 whitespace-nowrap">
                {missedTasksSummary.reduce((acc, curr) => acc + curr.missedCount, 0)} Total Tugas Belum Selesai
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {missedTasksSummary.map(({ user, totalAssigned, completedCount, missedCount, missedTasks, complianceRate }) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-xl border transition ${
                    missedCount > 0
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-emerald-50/40 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{user.name}</h4>
                        {user.role === 'kordinator' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Kordinator
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold">Unit {user.unit}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          complianceRate >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : complianceRate >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {complianceRate}% Kepatuhan
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs flex items-center justify-between text-slate-600">
                    <span>Selesai: <strong>{completedCount}</strong> / {totalAssigned}</span>
                    <span className={missedCount > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                      {missedCount > 0 ? `${missedCount} Belum Dikerjakan` : 'Semua Selesai ✓'}
                    </span>
                  </div>

                  {missedTasks.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-rose-200/60 space-y-1">
                      <span className="text-[10px] font-bold text-rose-900 uppercase">Tugas Yang Terlewat:</span>
                      <ul className="text-[11px] text-rose-800 space-y-0.5 list-disc list-inside">
                        {missedTasks.slice(0, 3).map((mt) => (
                          <li key={mt.id} className="truncate" title={mt.title}>
                            {mt.title} ({mt.timingType})
                          </li>
                        ))}
                        {missedTasks.length > 3 && (
                          <li className="font-semibold">+ {missedTasks.length - 3} tugas lainnya</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: JOB BARENG (PEKERJAAN MENDADAK) */}
      {adminTab === 'job_bareng' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Pekerjaan Mendadak / Job Bareng Bersama
              </h3>
              <p className="text-xs text-slate-500">
                Pekerjaan yang ditambahkan Admin akan otomatis muncul di aplikasi seluruh staff terkait,
                lengkap dengan rekap keaktifan, persentase kehadiran, dan akumulasi poin kinerja.
              </p>
            </div>
            <button
              onClick={() => setIsCreatingJob(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Job Bareng Baru</span>
            </button>
          </div>

          {/* Job Bareng Cards List with live participant tracking and percentage calculations */}
          <div className="space-y-3">
            {jobBarengStats.map(({ job, targetCount, joinedCount, completedCount, participationRate, completionRate, totalPointsAwarded, joinedUsers, completedUsers, notJoinedUsers }) => (
              <div
                key={job.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                        Target Unit: {job.targetUnit}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Oleh {job.createdByName} • {job.date} ({job.timeTarget || 'Waktu Fleksibel'})
                      </span>
                      {job.targetArea && (
                        <span className="text-[11px] text-slate-500">
                          • Lokasi: <strong>{job.targetArea}</strong>
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-base text-slate-900">{job.title}</h4>
                    <p className="text-slate-600">{job.description}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                        <span className="block text-lg font-black text-amber-600 leading-none">
                          {participationRate}%
                        </span>
                        <span className="text-[9px] font-bold text-amber-800 uppercase">
                          Ikut Serta
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        {job.status}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700">
                      +{totalPointsAwarded} Poin Karyawan
                    </span>
                  </div>
                </div>

                {/* Progress Bar of participation */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-slate-700">
                    <span>
                      Kehadiran Staff: <strong>{joinedCount}</strong> dari {targetCount} Petugas ({participationRate}%)
                    </span>
                    <span className="font-bold text-emerald-700">
                      Selesai: {completedCount} Petugas ({completionRate}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        participationRate >= 80
                          ? 'bg-emerald-500'
                          : participationRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${participationRate}%` }}
                    />
                  </div>
                </div>

                {/* Participants attendance breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">
                      Daftar Status Kehadiran Staff Unit {job.targetUnit}:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Aturan: Gabung = +5 poin | Selesai = +10 poin
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {completedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-700" />
                        {u.name} ({u.unit}): Selesai (+10 Pts)
                      </span>
                    ))}

                    {joinedUsers
                      .filter((u) => !job.completedUserIds.includes(u.id))
                      .map((u) => (
                        <span
                          key={u.id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-amber-700" />
                          {u.name} ({u.unit}): Sedang Ikut (+5 Pts)
                        </span>
                      ))}

                    {notJoinedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-normal bg-slate-100 text-slate-400 border border-slate-200"
                      >
                        {u.name} ({u.unit}): Belum Bergabung
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PERSETUJUAN DINAS LUAR */}
      {adminTab === 'dinas_luar' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-600" />
              Persetujuan Izin Dinas Luar OB/OG
            </h3>
            <p className="text-xs text-slate-500">
              Staff yang disetujui akan di-exempt tugas hariannya dengan status "Dinas Luar".
            </p>
          </div>

          <div className="space-y-3">
            {dinasRequests.length > 0 ? (
              dinasRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{req.userName}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        Unit {req.unit}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'Disetujui'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'Ditolak'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-slate-800">
                      <strong>Tujuan:</strong> {req.destination}
                    </p>
                    <p className="text-slate-600 italic">"{req.reason}"</p>
                    <span className="text-[10px] text-slate-400 block">
                      Tanggal Dinas: {req.date}
                    </span>
                  </div>

                  {req.status === 'Pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onApproveDinas(req.id, false)}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => onApproveDinas(req.id, true)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs cursor-pointer"
                      >
                        Setujui Dinas Luar
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs">
                Tidak ada pengajuan dinas luar.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MANAJEMEN USER (ROTASI UNIT & STATUS) */}
      {adminTab === 'manajemen_user' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-800" />
                Manajemen User & Rotasi Unit Tahunan
              </h3>
              <p className="text-xs text-slate-500">
                Admin dapat merotasi unit kerja staff OB/OG (TK, SD, SMP, Pelangi, Ar Razi, Khaldun), mengubah peran, atau memperbarui status resign.
              </p>
            </div>
            <button
              onClick={() => setIsAddingUser(true)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Staff Baru</span>
            </button>
          </div>

          {/* User List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{u.name}</h4>
                      <span className="text-[11px] text-slate-400">@{u.username}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      u.status === 'Aktif'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {u.status}
                  </span>
                </div>

                {/* Unit & Role Selectors (Quick annual update by Admin) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Unit Kerja:
                    </label>
                    <select
                      value={u.unit}
                      onChange={(e) =>
                        onUpdateUser({ ...u, unit: e.target.value as UnitType })
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-xs"
                    >
                      <option value="TK">TK</option>
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="Pelangi Direktorat">Pelangi Direktorat</option>
                      <option value="Ar Razi">Ar Razi</option>
                      <option value="Khaldun">Khaldun</option>
                      <option value="Semua Unit">Semua Unit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Role / Hak Akses:
                    </label>
                    <select
                      value={u.role}
                      onChange={(e) =>
                        onUpdateUser({ ...u, role: e.target.value as UserRole })
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white text-xs"
                    >
                      <option value="user">Staff OB/OG</option>
                      <option value="kordinator">Kordinator</option>
                      <option value="admin">Admin FM</option>
                    </select>
                  </div>
                </div>

                {/* Resign / Status Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">Status Kepegawaian:</span>
                  <button
                    onClick={() =>
                      onUpdateUser({
                        ...u,
                        status: u.status === 'Aktif' ? 'Resign' : 'Aktif',
                      })
                    }
                    className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      u.status === 'Aktif'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {u.status === 'Aktif' ? 'Tandai Resign' : 'Aktifkan Kembali'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: MASTER SOP TASKS */}
      {adminTab === 'master_task' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Master Task SOP & Penugasan Individu
              </h3>
              <p className="text-xs text-slate-500">
                Atur tugas standar kebersihan dan tentukan penugasan khusus per staff OB/OG atau tugas bersama per unit.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTask(null);
                setTaskTitle('');
                setTaskCategory('Harian');
                setTaskTiming('pre_readiness');
                setTaskUnit('Semua Unit');
                setTaskArea('');
                setTaskAssignee('Semua Petugas');
                setTaskInstructionsText('');
                setTaskPhotoRequired(true);
                setTaskStandardPhotoUrl('');
                setIsAddingTask(true);
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Master Task</span>
            </button>
          </div>

          {/* Filter Bar for Master Tasks */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Filter Unit:</span>
              <select
                value={selectedUnitFilter}
                onChange={(e) => setSelectedUnitFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="Semua">Semua Unit</option>
                <option value="TK">TK</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="Pelangi Direktorat">Pelangi</option>
                <option value="Ar Razi">Ar Razi</option>
                <option value="Khaldun">Khaldun</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Petugas / Assignee:</span>
              <select
                value={taskAssigneeFilter}
                onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="Semua">Semua Petugas & Penugasan</option>
                <option value="Semua Petugas">Tugas Bersama (Semua Petugas)</option>
                {allUsers
                  .filter((u) => u.role === 'user' && u.status === 'Aktif')
                  .map((u) => (
                    <option key={u.id} value={u.name}>
                      👤 {u.name} ({u.unit})
                    </option>
                  ))}
              </select>
            </div>

            <div className="ml-auto text-slate-500 font-semibold text-[11px]">
              Total Master Task:{' '}
              <strong className="text-slate-800 font-black">
                {
                  masterTasks.filter((t) => {
                    if (selectedUnitFilter !== 'Semua' && t.unit !== selectedUnitFilter && t.unit !== 'Semua Unit') {
                      return false;
                    }
                    if (taskAssigneeFilter !== 'Semua') {
                      const tAss = (t.assignee || 'Semua Petugas').trim().toLowerCase();
                      const filterAss = taskAssigneeFilter.trim().toLowerCase();
                      if (filterAss === 'semua petugas') {
                        if (tAss !== 'semua petugas' && tAss !== '') return false;
                      } else {
                        if (!tAss.includes(filterAss) && !filterAss.includes(tAss)) return false;
                      }
                    }
                    return true;
                  }).length
                }
              </strong>
            </div>
          </div>

          <div className="space-y-2.5">
            {masterTasks
              .filter((t) => {
                if (selectedUnitFilter !== 'Semua' && t.unit !== selectedUnitFilter && t.unit !== 'Semua Unit') {
                  return false;
                }
                if (taskAssigneeFilter !== 'Semua') {
                  const tAss = (t.assignee || 'Semua Petugas').trim().toLowerCase();
                  const filterAss = taskAssigneeFilter.trim().toLowerCase();
                  if (filterAss === 'semua petugas') {
                    if (tAss !== 'semua petugas' && tAss !== '') return false;
                  } else {
                    if (!tAss.includes(filterAss) && !filterAss.includes(tAss)) return false;
                  }
                }
                return true;
              })
              .map((t) => {
                const isActive = isMasterTaskActive(t);
                return (
                  <div
                    key={t.id}
                    className={`bg-white border rounded-2xl p-4 shadow-xs space-y-2 text-xs transition ${
                      isActive ? 'border-slate-200 hover:border-emerald-300' : 'border-rose-200 bg-rose-50/20 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Active / Nonaktif Status Pill */}
                          <button
                            onClick={() => {
                              onUpdateMasterTask({ ...t, isActive: !isActive });
                            }}
                            title="Klik untuk mengubah status aktif/nonaktif"
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] cursor-pointer flex items-center gap-1 transition ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                            <span>{isActive ? 'Aktif di Harian' : 'Nonaktif (Off)'}</span>
                          </button>

                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10px]">
                            {t.category} ({t.timingType})
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            Unit: {t.unit}
                          </span>
                          {t.assignee && t.assignee !== 'Semua Petugas' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 font-bold text-[10px] border border-sky-200 flex items-center gap-1">
                              👤 Petugas: {t.assignee}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px] border border-slate-200">
                              👥 Bersama: Semua Petugas {t.unit}
                            </span>
                          )}
                          {t.photoRequired && (
                            <span className="text-emerald-700 font-bold text-[10px]">
                              📷 Foto Wajib
                            </span>
                          )}
                          {t.standardPhotoUrl && (
                            <a
                              href={t.standardPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] hover:bg-amber-100 transition"
                            >
                              🖼️ Contoh SOP ↗
                            </a>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">{t.title}</h4>
                        {t.area && <p className="text-slate-500">Area: {t.area}</p>}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTask(t);
                            setTaskTitle(t.title);
                            setTaskCategory(t.category as any);
                            setTaskTiming(t.timingType);
                            setTaskUnit(t.unit);
                            setTaskArea(t.area || '');
                            setTaskAssignee(t.assignee || 'Semua Petugas');
                            setTaskInstructionsText(t.instructions.join('\n'));
                            setTaskPhotoRequired(t.photoRequired);
                            setTaskStandardPhotoUrl(t.standardPhotoUrl || '');
                            setTaskIsActive(isMasterTaskActive(t));
                            setIsEditingTaskModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteMasterTask(t.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Hapus Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {t.instructions && t.instructions.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-slate-700 text-xs border border-slate-200/70">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                          Langkah Instruksi SOP:
                        </span>
                        <div className="space-y-1">
                          {parseInstructionSteps(t.instructions).map((ins, i) => (
                            <div key={i} className="flex items-start gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60 shadow-2xs">
                              <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed text-slate-800">{ins}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 7: HARI LIBUR & KALENDER OPERASIONAL */}
      {adminTab === 'hari_libur' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-2xl text-amber-800">
              <Coffee className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Pengaturan Hari Libur, Tanggal Merah & Kalender Operasional
              </h3>
              <p className="text-slate-500">
                Nonaktifkan jadwal pekerjaan harian untuk tanggal merah, libur sekolah, cuti bersama, atau hari off.
              </p>
            </div>
          </div>

          {/* Feedback message */}
          {holidaySaveStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{holidaySaveStatus}</span>
            </div>
          )}

          {/* Control Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle Hari Ini Libur */}
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Status Hari Ini ({todayStr})</h4>
                  <p className="text-slate-500 text-[11px]">
                    Saklar darurat untuk menonaktifkan seluruh tugas harian hari ini.
                  </p>
                </div>
                <button
                  onClick={handleToggleHolidayToday}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                    holidayConfig.isHolidayToday
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {holidayConfig.isHolidayToday ? '🌴 Status: LIBUR' : '🏢 Status: AKTIF KERJA'}
                </button>
              </div>

              {holidayConfig.isHolidayToday && (
                <div className="pt-2">
                  <label className="block font-bold text-slate-700 mb-1">Alasan Libur Hari Ini:</label>
                  <input
                    type="text"
                    value={holidayConfig.holidayReason}
                    onChange={(e) => handleUpdateHolidayReason(e.target.value)}
                    placeholder="Contoh: Tanggal Merah / Libur Nasional / Cuti Bersama"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Weekend Automation Toggle */}
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Jadwal Sabtu & Minggu Otomatis</h4>
                  <p className="text-slate-500 text-[11px]">
                    Nonaktifkan otomatis tugas harian pada hari Sabtu dan Minggu.
                  </p>
                </div>
                <button
                  onClick={handleToggleWeekendOff}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                    holidayConfig.autoWeekendOff
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                  }`}
                >
                  {holidayConfig.autoWeekendOff ? '✓ Auto Libur Aktif' : '✗ Masuk Manual'}
                </button>
              </div>
              <p className="text-slate-500 text-[11px]">
                Saat aktif, aplikasi tidak akan mencatat pinalti keterlambatan atau missed task di hari akhir pekan.
              </p>
            </div>
          </div>

          {/* Specific Disabled Dates List (Liburan Sekolah / Tanggal Merah Terjadwal) */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-rose-500" />
              Daftar Tanggal Libur Terjadwal (Libur Sekolah / Hari Besar)
            </h4>

            {/* Add Date Input */}
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-xs focus:ring-2 focus:ring-sky-500 flex-1"
              />
              <button
                onClick={handleAddDisabledDate}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
              >
                + Tambah Tanggal Libur
              </button>
            </div>

            {/* List of Disabled Dates */}
            <div className="flex flex-wrap gap-2 pt-1">
              {holidayConfig.disabledDates.length > 0 ? (
                holidayConfig.disabledDates.map((d) => (
                  <span
                    key={d}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs flex items-center gap-2 shadow-xs"
                  >
                    <span>📅 {d}</span>
                    <button
                      onClick={() => handleRemoveDisabledDate(d)}
                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Hapus tanggal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-slate-400 italic">Belum ada tanggal libur khusus yang ditambahkan.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: GOOGLE SHEETS & APPS SCRIPT 2-ARAH HUB */}
      {adminTab === 'google_sync' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-800">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Integrasi 2-Arah Google Sheets & Google Apps Script (Tanpa Firebase)
              </h3>
              <p className="text-slate-500">
                Penyimpanan cloud resmi Unit Facility Management Lazuardi GCS dengan sinkronisasi 2-arah.
              </p>
            </div>
          </div>

          {/* Links Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href={syncConfig.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <span className="font-bold text-emerald-900 block text-sm">
                  Buka Google Sheet Lazuardi
                </span>
                <span className="text-[11px] text-emerald-700 font-mono">
                  ID: {syncConfig.sheetId}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition" />
            </a>

            <a
              href={syncConfig.driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <span className="font-bold text-blue-900 block text-sm">
                  Buka Folder Google Drive Bukti Foto
                </span>
                <span className="text-[11px] text-blue-700 font-mono">
                  ID: {syncConfig.driveFolderId}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition" />
            </a>
          </div>

          {/* Apps Script Web App URL Configuration */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  URL Web App Google Apps Script (Untuk Akses 2-Arah)
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Masukkan URL Deployment Web App Apps Script untuk sinkronisasi otomatis tanpa batasan login Google.
                </p>
              </div>
              {webAppUrlSaved && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px]">
                  ✓ URL Tersimpan
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={webAppUrlInput}
                onChange={(e) => setWebAppUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSaveWebAppUrl}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
              >
                Simpan URL Web App
              </button>
            </div>
          </div>

          {/* 1-Click Copy Google Apps Script Code */}
          <div className="p-5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                  Kode Google Apps Script (Code.gs) Siap Pakai
                </h4>
                <p className="text-indigo-800 text-[11px]">
                  Salin skrip ini ke menu <strong>Extensions &gt; Apps Script</strong> di Google Sheet Lazuardi GCS untuk mengaktifkan koneksi 2-arah.
                </p>
              </div>

              <button
                onClick={handleCopyScript}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 ${
                  copiedScript
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode Code.gs</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="p-3.5 bg-white rounded-xl border border-indigo-100 space-y-1.5 text-slate-700 text-[11px]">
              <span className="font-bold text-indigo-900 block text-xs">Langkah Deploy Web App di Google Sheet:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Buka Google Sheet Lazuardi GCS, klik menu <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Hapus kode default di file <code>Code.gs</code> lalu <strong>Paste (Tempel)</strong> kode yang sudah disalin di atas.</li>
                <li>Klik tombol <strong>Deploy &gt; New deployment</strong> di kanan atas.</li>
                <li>Pilih type: <strong>Web app</strong>. Pada "Execute as": <strong>Me</strong>, dan "Who has access": <strong>Anyone</strong>.</li>
                <li>Klik <strong>Deploy</strong>, lalu salin Web App URL ke kotak input di atas dan klik <strong>Simpan URL</strong>.</li>
              </ol>
            </div>
          </div>

          {/* PANDUAN & ALAT KONVERSI FOTO GOOGLE DRIVE KE GOOGLE SHEET */}
          <div className="p-5 bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Panduan & Alat Format Foto Google Drive ke Google Sheet</span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold">
                      Format Otomatis
                    </span>
                  </h4>
                  <p className="text-slate-600 text-[11px]">
                    Agar foto terbaca lancar dan tidak membebani limit karakter sel Google Sheets, sistem menyimpan link Google Drive dan otomatis mengonversinya menjadi gambar pratinjau langsung.
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-700 text-[11px]">
              <div className="p-3 bg-white rounded-xl border border-sky-100 space-y-1">
                <span className="font-bold text-sky-900 block">1. Otomatisasi Apps Script</span>
                <p className="text-slate-600">
                  Saat petugas mengambil foto live di aplikasi, Apps Script langsung mengunggah file ke Google Drive resmi FM dan menyimpan URL Drive ke Google Sheet secara otomatis.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-sky-100 space-y-1">
                <span className="font-bold text-sky-900 block">2. Input Manual ke Sheet</span>
                <p className="text-slate-600">
                  Jika memasukkan foto SOP Master Task ke Google Sheet manual, paste link Google Drive apa saja (contoh: <code>https://drive.google.com/file/d/ID/view</code>).
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-sky-100 space-y-1">
                <span className="font-bold text-sky-900 block">3. Izin Berbagi (Share)</span>
                <p className="text-slate-600">
                  Pastikan folder Google Drive disetel ke <strong>"Siapa saja yang memiliki link / Anyone with the link"</strong> (Viewer) agar gambar dapat tampil langsung di aplikasi.
                </p>
              </div>
            </div>

            {/* Interactive Live URL Tester & Converter */}
            <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-3">
              <span className="font-bold text-slate-900 text-xs block">
                🧪 Uji & Konversi Link Foto Google Drive:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={driveTestUrl}
                  onChange={(e) => setDriveTestUrl(e.target.value)}
                  placeholder="Paste URL Google Drive (contoh: https://drive.google.com/file/d/1MURpjYWL.../view)"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleTestDriveUrl}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
                >
                  Uji & Pratinjau
                </button>
              </div>

              {driveTestResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">
                      Hasil Konversi Link Foto:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        driveTestResult.isValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {driveTestResult.isValid ? '✓ ID Drive Terdeteksi' : 'Periksa Format URL'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="space-y-1 text-[11px] text-slate-600 font-mono break-all">
                      <div>
                        <span className="text-slate-400 font-sans font-semibold">URL Gambar Langsung:</span>
                        <div className="p-1.5 bg-white rounded border border-slate-200 text-sky-800 text-[10px] select-all">
                          {driveTestResult.formatted}
                        </div>
                      </div>
                      <div>
                        <a
                          href={driveTestResult.viewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 hover:text-sky-800 font-sans font-bold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Buka Halaman Google Drive
                        </a>
                      </div>
                    </div>

                    <div className="flex justify-center bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <img
                        src={driveTestResult.formatted}
                        alt="Test Preview"
                        className="max-h-28 object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sync Trigger Actions */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">Status Sinkronisasi Saat Ini:</span>
              <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                {syncConfig.lastSyncTime
                  ? `Terakhir: ${new Date(syncConfig.lastSyncTime).toLocaleTimeString('id-ID')} WIB`
                  : 'Siap'}
              </span>
            </div>
            <p className="text-slate-600">
              Aplikasi mendukung sinkronisasi langsung 2-arah (Push & Pull) ke sheet <code>Users</code>, <code>MasterTask</code>, <code>TaskLogs</code>, <code>JobBareng</code>, dan <code>DinasRequests</code>.
            </p>
            <button
              onClick={onTriggerSync}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sinkronkan Sekarang (Push & Pull Data 2-Arah)</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE JOB BARENG MODAL */}
      {isCreatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0 text-xs">
            <div className="flex justify-between items-center px-5 py-4 bg-slate-900 border-b border-slate-800 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Buat Job Bareng Mendadak
              </h3>
              <button
                onClick={() => setIsCreatingJob(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveJobBareng} className="p-5 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Pekerjaan Mendadak:
                </label>
                <input
                  type="text"
                  required
                  value={jbTitle}
                  onChange={(e) => setJbTitle(e.target.value)}
                  placeholder="Contoh: Kerja Bakti Bersih Area Lapangan & Panggung Acara"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deskripsi & Instruksi:
                </label>
                <textarea
                  rows={3}
                  value={jbDescription}
                  onChange={(e) => setJbDescription(e.target.value)}
                  placeholder="Jelaskan kebutuhan pembersihan bersama..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Unit:</label>
                  <select
                    value={jbUnit}
                    onChange={(e) => setJbUnit(e.target.value as UnitType)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Semua Unit">Semua Unit</option>
                    <option value="TK">TK</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="Pelangi Direktorat">Pelangi Direktorat</option>
                    <option value="Ar Razi">Ar Razi</option>
                    <option value="Khaldun">Khaldun</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Waktu:</label>
                  <input
                    type="text"
                    value={jbTime}
                    onChange={(e) => setJbTime(e.target.value)}
                    placeholder="13:00 - 15:30 WIB"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi / Area:</label>
                <input
                  type="text"
                  value={jbArea}
                  onChange={(e) => setJbArea(e.target.value)}
                  placeholder="Lapangan Utama / Gedung Ar Razi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Target Penugasan: Semua User vs Pilih Beberapa User */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800">Target Petugas Pelaksana:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setJbAssignmentType('all');
                      setJbSelectedUserIds([]);
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition cursor-pointer text-xs ${
                      jbAssignmentType === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Semua Petugas
                  </button>
                  <button
                    type="button"
                    onClick={() => setJbAssignmentType('specific')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition cursor-pointer text-xs ${
                      jbAssignmentType === 'specific'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Pilih Petugas Khusus
                  </button>
                </div>

                {jbAssignmentType === 'specific' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">
                        Pilih staff ({jbSelectedUserIds.length} dipilih):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const staffList = allUsers
                              .filter((u) => u.status === 'Aktif' && (u.role === 'user' || u.role === 'kordinator'))
                              .filter((u) => jbUnit === 'Semua Unit' || u.unit === jbUnit || u.unit === 'Semua Unit')
                              .map((u) => u.id);
                            setJbSelectedUserIds(staffList);
                          }}
                          className="text-sky-600 hover:underline font-bold"
                        >
                          Pilih Semua
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setJbSelectedUserIds([])}
                          className="text-rose-600 hover:underline font-bold"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-200">
                      {allUsers
                        .filter((u) => u.status === 'Aktif' && (u.role === 'user' || u.role === 'kordinator'))
                        .filter((u) => jbUnit === 'Semua Unit' || u.unit === jbUnit || u.unit === 'Semua Unit')
                        .map((u) => {
                          const isChecked = jbSelectedUserIds.includes(u.id);
                          return (
                            <label
                              key={u.id}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                                isChecked
                                  ? 'bg-sky-50 border-sky-300 font-bold text-sky-900'
                                  : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setJbSelectedUserIds([...jbSelectedUserIds, u.id]);
                                  } else {
                                    setJbSelectedUserIds(jbSelectedUserIds.filter((id) => id !== u.id));
                                  }
                                }}
                                className="rounded text-sky-600 focus:ring-sky-500"
                              />
                              <span className="truncate">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal ml-auto">
                                Unit {u.unit}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingJob(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Publikasikan Job Bareng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT MASTER TASK MODAL */}
      {(isAddingTask || isEditingTaskModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 text-xs">
            <div className="flex justify-between items-center px-5 py-4 bg-slate-900 border-b border-slate-800 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                {editingTask ? 'Edit Master Task SOP' : 'Tambah Master Task SOP'}
              </h3>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setIsEditingTaskModal(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterTask} className="p-5 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Pekerjaan SOP:
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Contoh: Pembersihan & Sanitasi Toilet Pagi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori:</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Harian">Harian</option>
                    <option value="Mingguan">Mingguan (Reset Senin)</option>
                    <option value="Bulanan">Bulanan (Reset Tgl 1)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Waktu Pelaksanaan:</label>
                  <select
                    value={taskTiming}
                    onChange={(e) => setTaskTiming(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pre_readiness">Pre-Readiness (00:00 - 09:00 WIB)</option>
                    <option value="clock_out">Clock Out (09:00 - 23:59 WIB)</option>
                    <option value="anytime">Rutin Fleksibel (00:00 - 23:59 WIB)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Target:</label>
                  <select
                    value={taskUnit}
                    onChange={(e) => setTaskUnit(e.target.value as UnitType)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Semua Unit">Semua Unit</option>
                    <option value="TK">TK</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="Pelangi Direktorat">Pelangi Direktorat</option>
                    <option value="Ar Razi">Ar Razi</option>
                    <option value="Khaldun">Khaldun</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Area / Ruangan:</label>
                  <input
                    type="text"
                    value={taskArea}
                    onChange={(e) => setTaskArea(e.target.value)}
                    placeholder="Toilet, Kelas, Lobby..."
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Penanggung Jawab / Assignee Staff:
                </label>
                <div className="space-y-1.5">
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-sky-500 text-slate-800"
                  >
                    <option value="Semua Petugas">👥 Semua Petugas (Tugas Bersama Unit)</option>
                    <optgroup label="Staff Khusus (Pilih Salah Satu)">
                      {allUsers
                        .filter((u) => u.role === 'user' && u.status === 'Aktif')
                        .map((u) => (
                          <option key={u.id} value={u.name}>
                            👤 {u.name} (Unit {u.unit})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    placeholder="Ketik nama staff atau 'Semua Petugas'..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Instruksi Langkah SOP (1 baris per langkah):
                </label>
                <textarea
                  rows={3}
                  value={taskInstructionsText}
                  onChange={(e) => setTaskInstructionsText(e.target.value)}
                  placeholder="Sapu dari sudut ruangan&#10;Lap meja dan papan tulis&#10;Keringkan lantai..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Link / URL Foto Contoh Standar SOP (Opsional):
                </label>
                <input
                  type="url"
                  value={taskStandardPhotoUrl}
                  onChange={(e) => setTaskStandardPhotoUrl(e.target.value)}
                  placeholder="https://drive.google.com/... atau link gambar SOP"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 text-slate-800 text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Contoh foto standar kebersihan untuk acuan staff OB/OG di aplikasi.
                </p>
                {taskStandardPhotoUrl && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <img
                      src={taskStandardPhotoUrl}
                      alt="SOP Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-emerald-800 block truncate">
                        ✓ Link Foto SOP Terdeteksi
                      </span>
                      <a
                        href={taskStandardPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-sky-600 hover:underline inline-flex items-center gap-1"
                      >
                        Buka Foto di Tab Baru ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkIsActive"
                    checked={taskIsActive}
                    onChange={(e) => setTaskIsActive(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <label htmlFor="chkIsActive" className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Status Task Aktif (Muncul di Checklist Harian Staff)</span>
                    <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${taskIsActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {taskIsActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkPhoto"
                    checked={taskPhotoRequired}
                    onChange={(e) => setTaskPhotoRequired(e.target.checked)}
                    className="w-4 h-4 accent-sky-600 rounded"
                  />
                  <label htmlFor="chkPhoto" className="font-bold text-slate-700">
                    Wajib Lampirkan Foto Bukti Live Kamera
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTask(false);
                    setIsEditingTaskModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md transition cursor-pointer"
                >
                  Simpan Master Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0 text-xs">
            <div className="flex justify-between items-center px-5 py-4 bg-slate-900 border-b border-slate-800 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                Tambah Staff OB / OG Baru
              </h3>
              <button
                onClick={() => setIsAddingUser(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewUser} className="p-5 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi (OB)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Login:</label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="fauzi_ob"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role:</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="user">Staff OB/OG</option>
                    <option value="kordinator">Kordinator</option>
                    <option value="admin">Admin FM</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Penempatan:</label>
                  <select
                    value={newUserUnit}
                    onChange={(e) => setNewUserUnit(e.target.value as UnitType)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="TK">TK</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="Pelangi Direktorat">Pelangi Direktorat</option>
                    <option value="Ar Razi">Ar Razi</option>
                    <option value="Khaldun">Khaldun</option>
                    <option value="Semua Unit">Semua Unit</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 rounded-xl bg-slate-900 text-white font-bold shadow-md hover:bg-slate-800 transition cursor-pointer"
                >
                  Simpan Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal with Google Drive quick link */}
      {photoPreview && (
        <div
          onClick={() => setPhotoPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                📷 Bukti Foto Live Watermark
              </span>
              <button
                onClick={() => setPhotoPreview(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <img
              src={photoPreview}
              alt="Proof"
              className="w-full h-auto max-h-[65vh] object-contain rounded-xl bg-black/40"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <a
                href={syncConfig.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50 text-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Folder Google Drive ↗</span>
              </a>

              <button
                onClick={() => setPhotoPreview(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
