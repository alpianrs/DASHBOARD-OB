export type UserRole = 'admin' | 'kordinator' | 'user' | 'kepala_unit';
export type DivisionType = 'OB' | 'PLH';

export type UnitType =
  | 'TK'
  | 'SD'
  | 'SMP'
  | 'Pelangi Direktorat'
  | 'Ar Razi'
  | 'Khaldun'
  | 'Pos 1'
  | 'Pos 2'
  | 'Area Pos 1'
  | 'Area Pos 2'
  | 'Area Kolam Renang'
  | 'Kolam Renang'
  | 'Area Ex Minifarm'
  | 'Ex Minifarm'
  | 'Area Khaldun'
  | 'Semua Unit'
  | string;

// Daftar Unit Resmi Khusus Divisi PLH (Untuk Rolling Tahunan Staff PLH)
export const PLH_UNITS = [
  'Pos 1',
  'Pos 2',
  'Area Kolam Renang',
  'Area Ex Minifarm',
  'Area Khaldun',
] as const;

export function normalizePlhArea(val: string | undefined | null): string {
  if (!val) return 'Area Pos 1';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'pos 1' || lower === 'area pos 1') return 'Area Pos 1';
  if (lower === 'pos 2' || lower === 'area pos 2') return 'Area Pos 2';
  if (lower.includes('kolam') || lower.includes('renang')) return 'Area Kolam Renang';
  if (lower.includes('minifarm')) return 'Area Ex Minifarm';
  if (lower.includes('khaldun')) return 'Area Khaldun';
  if (lower.includes('lapangan')) return 'Area Lapangan Utama';
  if (lower.startsWith('area ')) return trimmed;
  return `Area ${trimmed}`;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  division?: DivisionType; // 'OB' or 'PLH' (Default 'OB' for full backward compatibility)
  unit: UnitType;
  assignedArea?: string; // Khusus PLH: 'Area Pos 1', 'Area Pos 2', 'Area Khaldun', 'Area Ex Minifarm', 'Area Kolam Renang'
  status: 'Aktif' | 'Resign' | 'Cuti';
  phone?: string;
  avatarUrl?: string;
}

export type TaskCategory = 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng' | 'Insidental';
export type TimingType = 'pre_readiness' | 'clock_out' | 'anytime';
export type TaskStatus = 'Pending' | 'Selesai' | 'Terlambat' | 'Dinas Luar';

// 5 Area Khusus PLH (Outdoor / Luar Gedung)
export const PLH_AREAS = [
  'Area Pos 1',
  'Area Pos 2',
  'Area Khaldun',
  'Area Ex Minifarm',
  'Area Kolam Renang',
] as const;

export type PLHAreaType = typeof PLH_AREAS[number];

// Pemetaan Standar Petugas Penanggung Jawab Area PLH Sesuai Database Google Sheet
export const DEFAULT_PLH_AREA_STAFF: Record<string, { id: string; name: string }> = {
  'Area Pos 1': { id: 'u-kord-plh', name: 'Rahmat Hidayat (Kord PLH)' },
  'Area Pos 2': { id: 'u-plh-01', name: 'Ahmad Syahril (PLH)' },
  'Area Khaldun': { id: 'u-plh-02', name: 'Andi Komala (PLH)' },
  'Area Ex Minifarm': { id: 'u-plh-03', name: 'Dedi Junaedi (PLH)' },
  'Area Kolam Renang': { id: 'u-plh-04', name: 'Radilah (PLH)' },
};

export interface MasterTask {
  id: string;
  title: string;
  unit: UnitType;
  category: TaskCategory;
  timingType: TimingType; // pre_readiness: 00:00-09:00, clock_out: 09:00-23:59, anytime: 00:00-23:59
  division?: DivisionType; // 'OB' or 'PLH' (Default 'OB')
  instructions: string[];
  photoRequired: boolean;
  standardPhotoUrl?: string; // Optional URL / base64 photo for Standar Kebersihan cleanliness benchmark reference
  estimatedMinutes?: number;
  area?: string;
  isActive: boolean;
  assignee?: string; // e.g. "Petugas Unit", "Semua Petugas", or custom name
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
  division?: DivisionType; // 'OB' or 'PLH' (Default 'OB')
  unit: UnitType;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  timingType: TimingType;
  status: TaskStatus;
  isLate: boolean;
  lateReason?: string;
  lateReported?: boolean;
  lateReportTime?: string;
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
  isIncidental?: boolean; // True jika tugas tambahan / insidental harian (misal: nyemai bibit, dll.)
  area?: string; // Lokasi area pengerjaan tugas tambahan
}

export interface JobBareng {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  timeTarget?: string;
  division?: DivisionType | 'Semua'; // 'OB', 'PLH', or 'Semua'
  taskType?: 'job_bareng' | 'insidental'; // 'job_bareng' (Kerja Bakti / Terencana) or 'insidental' (Pohon Tumbang, Dahan Patah, Darurat Lingkungan)
  incidentCategory?: string; // e.g. 'Pohon Tumbang', 'Dahan Patah', 'Saluran Tersumbat', 'Tanaman Roboh', 'Lainnya'
  targetUnit: UnitType;
  targetArea: string;
  createdBy: string;
  createdByName: string;
  status: 'Aktif' | 'Selesai' | 'Dibatalkan';
  assignmentType?: 'all' | 'specific';
  assignedUserIds?: string[];
  assignedUserNames?: string[];
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
  division?: DivisionType; // 'OB' or 'PLH' (Default 'OB')
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
  division?: DivisionType; // 'OB' or 'PLH' (Default 'OB')
  targetUserId: string;
  targetUserName: string;
  targetUnit: UnitType;
  area: string;
  status?: 'Sesuai Standar Kebersihan' | 'Sesuai Standar SOP' | 'Ada Temuan / Perlu Perbaikan';
  score?: number; // Optional legacy score (Official scoring only by Coordinator & Admin)
  notes: string;
  checklistItems: { label: string; passed: boolean }[];
  photoUrl?: string;
}

// 15 Kriteria Evaluasi Standar Kebersihan untuk OB (Office Boy)
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

// 4 Kriteria Evaluasi Khusus Kordinator untuk PLH (Pemeliharaan Lingkungan Hidup)
export const PLH_EVALUATION_CATEGORIES = [
  'Kerapihan taman area',
  'Aktif saat di lakukan job bareng',
  'Aktif memberikan masukan',
  'Kebersihan di wilayahnya',
] as const;

export type PLHEvaluationCategory = typeof PLH_EVALUATION_CATEGORIES[number];

export interface WeeklyScore {
  id: string;
  weekNumber?: number; // Legacy
  year: number;
  dateRange?: string;
  saturdayDate?: string; // Tanggal evaluasi hari Sabtu (contoh: "Sabtu, 22 Agustus 2026")
  userId: string;
  userName: string;
  division?: DivisionType; // 'OB' or 'PLH' (Default 'OB')
  unit: UnitType;
  kordinatorId?: string;
  kordinatorName?: string;
  score: number; // 1.0 - 4.0 (Nilai akhir / rata-rata akumulasi)
  categoryScores: Record<string, number>; // Record of categories (15 for OB, 4 for PLH) mapped to score 1-4
  categoryNotes?: Record<string, string>;
  evaluationType?: 'OB_15' | 'PLH_4';
  notes: string;
  timestamp: string;
  // Multi-evaluator & Akumulasi Penilaian (Kordinator & Kepala Unit)
  evaluatorRole?: 'kordinator' | 'kepala_unit' | 'admin' | 'gabungan';
  kordinatorScore?: number; // Nilai dari Kordinator (1 - 4)
  kordinatorNotes?: string;
  kordinatorCategoryScores?: Record<string, number>;
  kepalaUnitScore?: number; // Nilai dari Kepala Unit (1 - 4)
  kepalaUnitName?: string; // Nama Kepala Unit penilai
  kepalaUnitNotes?: string;
  kepalaUnitCategoryScores?: Record<string, number>;
  accumulatedScore?: number; // Nilai akumulasi gabungan (Kordinator + Kepala Unit) / 2
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
  pendingQueueCount?: number;
}

export interface PendingSyncItem {
  id: string;
  type: 'logTask' | 'peerInspection' | 'dinas' | 'weeklyScore' | 'jobBareng';
  payload: any;
  timestamp: string;
  retryCount: number;
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

// 4 Area PLH yang ikut rolling piket Aula Masjid (Area Pos 1 TIDAK IKUT)
export const MASJID_ROLLING_AREAS = [
  'Area Pos 2',
  'Area Kolam Renang',
  'Area Ex Minifarm',
  'Area Khaldun',
] as const;

export type MasjidRollingArea = typeof MASJID_ROLLING_AREAS[number];

export interface MasjidRollingSchedule {
  weekMondayDate: string; // Tanggal hari Senin (YYYY-MM-DD)
  weekRangeText: string; // e.g. "21 Sep 2026 - 27 Sep 2026"
  activeArea: MasjidRollingArea;
  nextArea: MasjidRollingArea;
  allCycle: MasjidRollingArea[];
  timeSlot?: 'pagi' | 'siang' | 'sore' | 'fleksibel' | 'custom';
  customTimeText?: string;
  isOverridden?: boolean;
}

export interface MasjidDutyConfig {
  activeAreaOverride?: MasjidRollingArea | null;
  overrideWeekMonday?: string;
  timeSlot?: 'pagi' | 'siang' | 'sore' | 'fleksibel' | 'custom';
  customTimeText?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Work Order Khusus Pohon untuk Divisi PLH
export type TreeCondition =
  | 'Rimbun'
  | 'Dahan Kering / Lapuk'
  | 'Miring / Rawan Tumbang'
  | 'Terserang Hama / Benalu'
  | 'Normal / Sehat';

export type TreeTreatmentType =
  | 'Pemangkasan Ringan (Pruning Dahan Bawah)'
  | 'Penjarangan Kanopi Rimbun'
  | 'Pemotongan Dahan Dekat Kabel Listrik / Atap'
  | 'Penebangan / Topping Pohon Tinggi (Vendor Luar)'
  | 'Pemberian Nutrisi / Obat Hama Batang'
  | 'Penyangga / Penegakan Batang';

export type TreeHandlerType = 'Internal PLH' | 'Vendor Luar';

export type TreeTreatmentStatus =
  | 'Tidak Perlu Penanganan'
  | 'Belum Ditangani'
  | 'Sedang Ditangani'
  | 'Sudah Ditangani';

export interface TreeInspectionRecord {
  id: string;
  treeId: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "08:30 WIB"
  inspectorId: string;
  inspectorName: string;
  condition: TreeCondition;
  checkStatus: 'Sudah Dicek Aman' | 'Perlu Penanganan' | 'Dalam Penanganan' | 'Sudah Ditangani';
  notes?: string;
  // Penanganan (Treatment) details
  treatmentNeeded?: TreeTreatmentType | string;
  treatmentStatus?: TreeTreatmentStatus;
  handlerType?: TreeHandlerType; // 'Internal PLH' or 'Vendor Luar'
  isLargeTreatment?: boolean;
  vendorName?: string;
  vendorCost?: number;
  handledBy?: string; // ID atau nama petugas pelaksana / vendor
  handledByName?: string;
  handledAt?: string; // Tanggal & waktu selesai penanganan
  treatmentReport?: string; // Laporan detail tindakan yang telah dilakukan
  // Foto Dokumentasi Pemeriksaan & Foto Before/After
  photoUrl?: string; // Foto dokumentasi pohon saat pemeriksaan harian/mingguan
  drivePhotoUrl?: string;
  photoBeforeUrl?: string; // Foto kondisi sebelum penanganan
  photoAfterUrl?: string; // Foto hasil setelah penanganan
  drivePhotoBeforeUrl?: string;
  drivePhotoAfterUrl?: string;
  drivePhotoBeforeId?: string;
  drivePhotoAfterId?: string;
  photoType?: 'full_tree' | 'detail_issue' | 'routine_inspection'; // Jenis foto: Pohon Utuh vs Detail Temuan
  photoAngleGuide?: string; // Panduan sudut & jarak foto yang digunakan
  timestamp: string;
}

export interface TreeWorkOrder {
  id: string;
  date: string; // YYYY-MM-DD
  area: string; // Area Pos 1, Area Pos 2, Area Khaldun, Area Ex Minifarm, Area Kolam Renang
  treeName: string; // e.g. "Pohon Trembesi Depan Lapangan", "Ketapang Kencana Pos 2"
  condition: TreeCondition;
  treatmentNeeded: TreeTreatmentType;
  handlerType: TreeHandlerType; // 'Internal PLH' or 'Vendor Luar' (Treatment Besar)
  isLargeTreatment?: boolean; // True jika perlakuan besar (biasanya vendor luar)
  vendorName?: string; // Nama vendor luar jika handlerType = 'Vendor Luar'
  vendorCost?: number; // Biaya pengerjaan vendor (jika ada)
  scheduledWeek?: string; // Target minggu pengerjaan, e.g. "Minggu 3 September 2026"
  urgency: 'Rendah' | 'Sedang' | 'Tinggi / Bahaya';
  notes?: string; // Catatan khusus kondisi pohon
  photoBeforeUrl?: string;
  photoAfterUrl?: string;
  drivePhotoBeforeUrl?: string;
  drivePhotoAfterUrl?: string;
  // Foto Acuan Standar & Panduan Monitoring Pohon
  standardPhotoUrl?: string; // Foto acuan standar pohon resmi Lazuardi (Benchmark)
  standardPhotoAngleGuide?: string; // Panduan sudut & jarak pengambilan foto agar pohon terlihat jelas
  standardInstructions?: string[]; // SOP standar instruksi pemeriksaan pohon (Tajuk, Batang, Daun, Perakaran)
  status: 'Perlu Penanganan' | 'Dijadwalkan' | 'Sedang Dikerjakan' | 'Selesai';
  treatmentStatus?: TreeTreatmentStatus; // 'Tidak Perlu Penanganan' | 'Belum Ditangani' | 'Sedang Ditangani' | 'Sudah Ditangani'
  reportedBy: string;
  reportedByName: string;
  assignedStaffId?: string; // Petugas penanggung jawab area pohon
  assignedStaffName?: string; // Nama petugas penanggung jawab area
  // Laporan pelaksanaan penanganan terkini
  handledBy?: string;
  handledByName?: string;
  handledAt?: string;
  treatmentReport?: string;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  lastCheckedDate?: string; // YYYY-MM-DD tanggal terakhir dilakukan pengecekan
  lastCheckedTime?: string; // Jam pengecekan (e.g. "08:30 WIB")
  lastCheckedByName?: string; // Petugas PLH yang melakukan pengecekan
  lastCheckedPhotoUrl?: string; // Foto dokumentasi hasil pengecekan pohon terkini
  lastCheckedDrivePhotoUrl?: string;
  checkStatusToday?: 'Sudah Dicek Aman' | 'Perlu Penanganan' | 'Sudah Dicek' | 'Belum Dicek';
  inspectionNotes?: string;
  inspectionHistory?: TreeInspectionRecord[]; // Riwayat seluruh pemeriksaan & penanganan oleh tim PLH
  syncedToSheet?: boolean;
  createdAt: string;
}

// Pekerjaan Tambahan / Mandiri Harian Staf PLH (Misal: Nyemai Tanaman, Pembuatan Media Tanam, dll.)
export interface AdhocDailyTask {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  division: DivisionType; // 'PLH'
  area: string;
  title: string;
  notes: string;
  estimatedMinutes?: number;
  photoUrl?: string;
  drivePhotoUrl?: string;
  status: 'Selesai' | 'Sedang Dikerjakan';
  completedAt?: string;
  createdAt: string;
}

// Master Inventaris Pohon Resmi per 5 Area Tanggung Jawab PLH Lazuardi GCS
export const PLH_DEFAULT_TREES_BY_AREA: Record<string, string[]> = {
  'Area Pos 1': [
    'Pohon Mangga Arumanis Depan Pos 1',
    'Pohon Beringin & Mahoni Pintu Masuk Gerbang Pos 1',
    'Pohon Pucuk Merah Pagar Depan Pos 1',
  ],
  'Area Pos 2': [
    'Pohon Ketapang Kencana Dekat Gerbang Pos 2',
    'Pohon Mahoni Samping Pos 2',
    'Pohon Palem Kenari Jalur Gerbang 2',
  ],
  'Area Khaldun': [
    'Pohon Flamboyan Area Lanskap Khaldun',
    'Pohon Angsana Belakang Gedung Khaldun',
    'Pohon Tabebuya Kuning Koridor Khaldun',
  ],
  'Area Ex Minifarm': [
    'Pohon Mangga & Sengon Samping Bedengan Pembibitan',
    'Pohon Jambu Air Citra Minifarm',
    'Pohon Nangka Mini Area Ex Minifarm',
  ],
  'Area Kolam Renang': [
    'Pohon Trembesi Rimbun Dekat Kolam Renang',
    'Pohon Kelapa Gading Sisi Kolam Renang',
    'Pohon Beringin Dolar Taman Kolam',
  ],
};
