export type UserRole = 'admin' | 'kordinator' | 'user';

export type UnitType =
  | 'TK'
  | 'SD'
  | 'SMP'
  | 'Pelangi Direktorat'
  | 'Ar Razi'
  | 'Khaldun'
  | 'Semua Unit';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  unit: UnitType;
  status: 'Aktif' | 'Resign' | 'Cuti';
  phone?: string;
  avatarUrl?: string;
}

export type TaskCategory = 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng';
export type TimingType = 'pre_readiness' | 'clock_out' | 'anytime';
export type TaskStatus = 'Pending' | 'Selesai' | 'Terlambat' | 'Dinas Luar';

export interface MasterTask {
  id: string;
  title: string;
  unit: UnitType;
  category: TaskCategory;
  timingType: TimingType; // pre_readiness: 00:00-09:00, clock_out: 09:00-23:59, anytime: 00:00-23:59
  instructions: string[];
  photoRequired: boolean;
  standardPhotoUrl?: string; // Optional URL / base64 photo for SOP cleanliness benchmark reference
  estimatedMinutes?: number;
  area?: string;
  isActive: boolean;
  assignee?: string; // e.g. "Budi Santoso", "budi_tk", "Semua Petugas", or custom name
  assigneeId?: string; // Optional user ID reference
  assigneeName?: string;
}

export interface TaskLog {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  userRole: UserRole;
  unit: UnitType;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  timingType: TimingType;
  status: TaskStatus;
  isLate: boolean;
  lateReason?: string;
  photoUrl?: string; // Google Drive link or base64
  driveFileId?: string;
  notes?: string;
  verifiedByKordinator?: boolean;
  kordinatorId?: string;
  kordinatorName?: string;
  kordinatorScore?: number; // 1 - 10
  kordinatorNotes?: string;
  inspectedByPeer?: boolean;
  peerInspectorId?: string;
  peerInspectorName?: string;
  peerInspectorUnit?: UnitType;
  peerScore?: number;
  peerNotes?: string;
}

export interface JobBareng {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  timeTarget?: string;
  targetUnit: UnitType;
  targetArea: string;
  createdBy: string;
  createdByName: string;
  status: 'Aktif' | 'Selesai' | 'Dibatalkan';
  participantIds: string[]; // List of user IDs
  participantNames?: string[]; // List of staff names
  completedUserIds: string[]; // List of user IDs
  completedUserNames?: string[]; // List of staff names
  createdAt: string;
}

export interface DinasRequest {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  unit: UnitType;
  reason: string;
  destination: string;
  status: 'Pending' | 'Disetujui' | 'Ditolak';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface PeerInspection {
  id: string;
  timestamp: string;
  date: string;
  inspectorId: string;
  inspectorName: string;
  inspectorRole: UserRole;
  inspectorUnit: UnitType;
  targetUserId: string;
  targetUserName: string;
  targetUnit: UnitType;
  area: string;
  status?: 'Sesuai Standar SOP' | 'Ada Temuan / Perlu Perbaikan';
  score?: number; // Optional legacy score (Official scoring only by Coordinator & Admin)
  notes: string;
  checklistItems: { label: string; passed: boolean }[];
  photoUrl?: string;
}

export const EVALUATION_CATEGORIES = [
  'Lantai & nat',
  'Pintu, kusen, dinding, dan jendela',
  'kaca pintu & jendela luar dan dalam',
  'Toilet',
  'Furniture',
  'Kipas angin & ac',
  'Karpet',
  'Sink',
  'Loker',
  'Meja',
  'Rak',
  'Porselene Toilet',
  'Koridor',
  'Halaman',
  'Tanaman Indoor/Outdoor',
] as const;

export type EvaluationCategory = typeof EVALUATION_CATEGORIES[number];

export interface WeeklyScore {
  id: string;
  weekNumber?: number; // Legacy
  year: number;
  dateRange?: string;
  saturdayDate?: string; // Tanggal evaluasi hari Sabtu (contoh: "Sabtu, 22 Agustus 2026")
  userId: string;
  userName: string;
  unit: UnitType;
  kordinatorId: string;
  kordinatorName: string;
  score: number; // 1.0 - 4.0 (Rata-rata penilaian 1-4)
  categoryScores: Record<string, number>; // Record of 15 categories mapped to score 1-4
  categoryNotes?: Record<string, string>;
  notes: string;
  timestamp: string;
  // Legacy / optional fields for backward compatibility
  cleanlinessScore?: number;
  speedScore?: number;
  sopScore?: number;
}

export interface HolidayConfig {
  isHolidayToday: boolean;
  holidayReason: string; // e.g. "Tanggal Merah / Libur Nasional", "Libur Semester Sekolah", "Cuti Bersama"
  workdaysActive: boolean; // Monday-Friday active rule
  autoWeekendOff: boolean;
  disabledDates: string[]; // List of specific YYYY-MM-DD marked as holiday
}

export interface SyncConfig {
  sheetId: string;
  driveFolderId: string;
  sheetUrl: string;
  driveFolderUrl: string;
  webAppUrl?: string; // Google Apps Script Web App URL for direct 2-way sync without Firebase
  lastSyncTime: string | null;
  isSyncing: boolean;
  syncError: string | null;
  isGoogleConnected: boolean;
  autoSyncEnabled?: boolean;
}

export interface MissedTaskSummary {
  userId: string;
  userName: string;
  unit: UnitType;
  date: string;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  timingType: TimingType;
  reason?: string;
  penaltyScore?: number;
  evaluatedBy?: string;
  evaluatedAt?: string;
}
