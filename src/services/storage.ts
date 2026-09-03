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
} from '../types';
import { isSameDay, getJakartaDateString, normalizeDateString } from '../utils/dateHelper';

const STORAGE_KEYS = {
  USERS: 'lz_fm_users',
  MASTER_TASKS: 'lz_fm_master_tasks',
  TASK_LOGS: 'lz_fm_task_logs',
  JOB_BARENG: 'lz_fm_job_bareng',
  DINAS_REQUESTS: 'lz_fm_dinas_requests',
  PEER_INSPECTIONS: 'lz_fm_peer_inspections',
  WEEKLY_SCORES: 'lz_fm_weekly_scores',
  ACTIVE_USER: 'lz_fm_active_user',
  SYNC_CONFIG: 'lz_fm_sync_config',
  HOLIDAY_CONFIG: 'lz_fm_holiday_config',
};

export const DEFAULT_HOLIDAY_CONFIG: HolidayConfig = {
  isHolidayToday: false,
  holidayReason: 'Libur Nasional / Tanggal Merah',
  workdaysActive: true, // Monday-Friday is standard active schedule
  autoWeekendOff: false, // Default false: strictly only libur if explicitly turned on by Admin
  disabledDates: [],
};

export const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycby5H4HMjXdu3y5SfxGKFtgtFRSWIeEKSJFNtOQl3x4rORVmpkpXpiFL_o1pPchAaZMG/exec';

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  sheetId: '1McKt_ubKY3NmUivMTgep2C6tipg34rq51FZRVbVhtXU',
  driveFolderId: '1MURpjYWLXdg8mOtjO2ucl2tESHYVWfZO',
  sheetUrl:
    'https://docs.google.com/spreadsheets/d/1McKt_ubKY3NmUivMTgep2C6tipg34rq51FZRVbVhtXU/edit?usp=sharing',
  driveFolderUrl:
    'https://drive.google.com/drive/folders/1MURpjYWLXdg8mOtjO2ucl2tESHYVWfZO?usp=sharing',
  webAppUrl: DEFAULT_WEB_APP_URL,
  lastSyncTime: null,
  isSyncing: false,
  syncError: null,
  isGoogleConnected: true,
  autoSyncEnabled: true,
};

// Seed Users for Lazuardi GCS Facility Management
const SEED_USERS: User[] = [
  {
    id: 'u-adm-01',
    username: 'admin',
    password: 'password123',
    name: 'Alpian (FM Head)',
    role: 'admin',
    unit: 'Semua Unit',
    status: 'Aktif',
    phone: '081234567890',
  },
  {
    id: 'u-kord-01',
    username: 'lili',
    password: 'password123',
    name: 'Lili Ariyanto',
    role: 'kordinator',
    unit: 'Ar Razi',
    status: 'Aktif',
    phone: '081298765432',
  },
];

// Seed Master Tasks with realistic assignee assignments and SOP standard benchmark photos
const SEED_MASTER_TASKS: MasterTask[] = [
  // PRE-READINESS (00:00 - 09:00)
  {
    id: 'mt-pr-01',
    title: 'Sanitasi & Pembersihan Toilet Pagi (Wastafel, Kloset, Lantai Kering)',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    assignee: 'Semua Petugas',
    instructions: [
      'Bersihkan wastafel dan cermin dengan cleaner & lap microfiber.',
      'Sikat kloset menggunakan chemical desinfektan dan bilas bersih.',
      'Pel lantai toilet hingga kering dan wangi, pastikan tidak ada genangan air.',
      'Isi ulang sabun cuci tangan dan tisu toilet.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 25,
    area: 'Toilet & Wastafel Unit',
    isActive: true,
  },
  {
    id: 'mt-pr-02',
    title: 'Pembersihan & Penataan Ruang Kelas / Kantor Guru Sebelum Jam Masuk',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    assignee: 'Semua Petugas',
    instructions: [
      'Sapu lantai ruang kelas/kantor secara merata dari sudut hingga depan.',
      'Lap meja guru, meja murid, dan papan tulis hingga bersih.',
      'Rapikan kursi dan susun meja sesuai denah standar Lazuardi.',
      'Buka ventilasi / nyalakan AC 15 menit sebelum kegiatan dimulai.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 30,
    area: 'Ruang Kelas & Kantor Guru',
    isActive: true,
  },
  {
    id: 'mt-pr-03',
    title: 'Penyediaan Air Minum Galon & Perlengkapan Sanitasi Unit',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    assignee: 'Semua Petugas',
    instructions: [
      'Cek level galon air minum di dispenser guru & siswa.',
      'Ganti galon baru jika tersisa < 1/4 dan bersihkan nampan tetesan air dispenser.',
      'Pastikan hand sanitizer terisi di depan setiap pintu masuk.',
    ],
    photoRequired: false,
    estimatedMinutes: 15,
    area: 'Dispenser & Koridor',
    isActive: true,
  },
  {
    id: 'mt-pr-04',
    title: 'Penyapuan Koridor, Lobby Utama, & Tangga Area Unit',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    assignee: 'Semua Petugas',
    instructions: [
      'Sapu koridor utama bebas dari daun, debu, dan sampah tercecer.',
      'Lap railing tangga dan pegangan pintu masuk.',
      'Pastikan keset lobby dalam posisi rapi dan bersih.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 20,
    area: 'Lobby & Koridor',
    isActive: true,
  },

  // CLOCK OUT (09:00 - 23:59)
  {
    id: 'mt-co-01',
    title: 'Pengosongan & Pembuangan Semua Tempat Sampah ke TPS Akhir',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    assignee: 'Semua Petugas',
    instructions: [
      'Kumpulkan sampah dari seluruh ruang kelas, kantor, dan toilet.',
      'Ikat polybag hitam dan bawa ke TPS utama dengan gerobak sampah.',
      'Pasang plastik sampah baru di setiap tempat sampah.',
      'Cuci tempat sampah yang kotor/berbau.',
    ],
    photoRequired: true,
    estimatedMinutes: 30,
    area: 'Seluruh Unit & TPS',
    isActive: true,
  },
  {
    id: 'mt-co-02',
    title: 'Mengepel Lantai Koridor & Ruang Kelas Pasca Pembelajaran',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    assignee: 'Semua Petugas',
    instructions: [
      'Sapu ulang area dari sisa kertas, remah makanan, dan kotoran.',
      'Pel menggunakan mop bersih dengan takaran wpc/desinfektan yang sesuai.',
      'Pasang papan peringatan Wet Floor jika lantai masih basah.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 40,
    area: 'Koridor & Ruang Kelas',
    isActive: true,
  },
  {
    id: 'mt-co-03',
    title: 'Pengecekan Kunci Pintu, Jendela, & Pemadaman Lampu/AC',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    assignee: 'Semua Petugas',
    instructions: [
      'Periksa seluruh AC dan lampu di ruang kelas/kantor dalam kondisi OFF.',
      'Tutup rapat semua jendela dan kunci pintu ruangan.',
      'Serahkan kunci ke pos security / kordinator.',
    ],
    photoRequired: false,
    estimatedMinutes: 15,
    area: 'Gedung Unit',
    isActive: true,
  },
  {
    id: 'mt-co-04',
    title: 'Penyimpanan & Perapihan Alat Kerja (Mop, Sapu, Chemical)',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    assignee: 'Semua Petugas',
    instructions: [
      'Cuci kain pel dan gantung hingga tiris.',
      'Bersihkan ember, sapu, dan serokan.',
      'Simpan botol chemical di lemari khusus dalam posisi terkunci.',
    ],
    photoRequired: true,
    estimatedMinutes: 15,
    area: 'Janitor Room',
    isActive: true,
  },

  // MINGGUAN (Setiap Senin Reset)
  {
    id: 'mt-wk-01',
    title: 'Deep Cleaning Keramik Dinding & Kerak Lantai Toilet',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    assignee: 'Semua Petugas',
    instructions: [
      'Gunakan cairan pembersih kerak keramik pada nat dan sudut toilet.',
      'Sikat dinding keramik setinggi 1.5 meter secara menyeluruh.',
      'Bilas dan keringkan dengan wiper lantai.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 60,
    area: 'Toilet Unit',
    isActive: true,
  },
  {
    id: 'mt-wk-02',
    title: 'Pembersihan Kaca Jendela Luar & Dalam Semua Ruangan',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    assignee: 'Semua Petugas',
    instructions: [
      'Semprot glass cleaner pada kaca.',
      'Tarik dengan window squeegee dari atas ke bawah.',
      'Lap kusen dan pinggiran jendela dengan lap microfiber.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 45,
    area: 'Jendela Gedung',
    isActive: true,
  },
  {
    id: 'mt-wk-03',
    title: 'Pembersihan Kipas Angin, Filter AC, & Sarang Laba-laba Plafon',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    assignee: 'Semua Petugas',
    instructions: [
      'Gunakan sapu sawang bertongkat panjang untuk membersihkan plafon.',
      'Lepas dan cuci filter indoor AC unit kelas/kantor.',
      'Lap baling-baling kipas angin dari debu tebal.',
    ],
    photoRequired: true,
    estimatedMinutes: 50,
    area: 'Plafon & AC Unit',
    isActive: true,
  },

  // BULANAN (Setiap Tgl 1 Reset)
  {
    id: 'mt-mo-01',
    title: 'Poles / Floor Scrubbing Keramik Seluruh Koridor Unit',
    unit: 'Semua Unit',
    category: 'Bulanan',
    timingType: 'anytime',
    assignee: 'Semua Petugas',
    instructions: [
      'Gunakan mesin polisher / sikat lantai heavy duty.',
      'Keringkan dengan vacuum wet/dry atau mop bersih.',
      'Aplikasikan floor wax/sealant jika diperlukan.',
    ],
    photoRequired: true,
    estimatedMinutes: 120,
    area: 'Koridor Utama Unit',
    isActive: true,
  },
  {
    id: 'mt-mo-02',
    title: 'Pembersihan Tangki Toren Air & Saluran Drainase Sekitar Gedung',
    unit: 'Semua Unit',
    category: 'Bulanan',
    timingType: 'anytime',
    assignee: 'Semua Petugas',
    instructions: [
      'Kuras toren penampungan air gedung.',
      'Angkat endapan lumpur dan sampah dari selokan/parit keliling gedung.',
      'Pastikan aliran drainase lancar tanpa sumbatan.',
    ],
    photoRequired: true,
    estimatedMinutes: 90,
    area: 'Toren & Drainase',
    isActive: true,
  },
];

// Initial Task Logs (Seed is empty, sourced from Google Sheets)
const SEED_TASK_LOGS: TaskLog[] = [];
const SEED_JOB_BARENG: JobBareng[] = [];
const SEED_DINAS_REQUESTS: DinasRequest[] = [];
const SEED_PEER_INSPECTIONS: PeerInspection[] = [];
const SEED_WEEKLY_SCORES: WeeklyScore[] = [];

// In-memory fallback cache in case localStorage is blocked or exceeds quota
const memoryFallbackCache = new Map<string, any>();

// Storage Helper Functions
export const getStoredItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (item) {
      return JSON.parse(item);
    }
    if (memoryFallbackCache.has(key)) {
      return memoryFallbackCache.get(key);
    }
    return defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return memoryFallbackCache.has(key) ? memoryFallbackCache.get(key) : defaultValue;
  }
};

// Clean up heavy base64 data URLs from past days' task logs to free localStorage space
const freeLocalStorageSpace = () => {
  try {
    const rawLogs = localStorage.getItem(STORAGE_KEYS.TASK_LOGS);
    if (!rawLogs) return;
    const logs: TaskLog[] = JSON.parse(rawLogs);
    if (!Array.isArray(logs) || logs.length === 0) return;

    // Prune base64 photos ONLY on logs from past days (never prune today's active work!)
    const today = getJakartaDateString();
    let modified = false;
    const pruned = logs.map((log) => {
      const isPastDay = !isSameDay(log.date, today) && !isSameDay(log.timestamp, today);
      if (isPastDay && log.photoUrl && log.photoUrl.startsWith('data:')) {
        modified = true;
        return {
          ...log,
          photoUrl: log.driveFileId ? `https://drive.google.com/file/d/${log.driveFileId}/view` : '',
        };
      }
      return log;
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.TASK_LOGS, JSON.stringify(pruned));
    }
  } catch (err) {
    console.warn('Could not free localStorage space:', err);
  }
};

export const setStoredItem = <T>(key: string, value: T): void => {
  // Always update memory fallback first
  memoryFallbackCache.set(key, value);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e: any) {
    console.warn(`LocalStorage write error for ${key}, attempting cleanup & retry:`, e);
    // If QuotaExceededError or storage full, free space and retry
    try {
      freeLocalStorageSpace();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (retryErr) {
      console.error(`Persistent storage failed for ${key}, using in-memory cache fallback:`, retryErr);
    }
  }
};

export const removeStoredItem = (key: string): void => {
  memoryFallbackCache.delete(key);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
  }
};

// Storage Service API
export const StorageService = {
  getUsers: (): User[] => {
    const users = getStoredItem<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    if (!users || users.length === 0) {
      setStoredItem(STORAGE_KEYS.USERS, SEED_USERS);
      return SEED_USERS;
    }
    // Clean up old legacy mock users that were hardcoded before Google Sheets sync
    const legacyDummyUserIds = new Set([
      'u-tk-01',
      'u-tk-02',
      'u-sd-01',
      'u-sd-02',
      'u-smp-01',
      'u-smp-02',
      'u-pelangi-01',
      'u-khaldun-01',
    ]);
    const filtered = users.filter(
      (u) =>
        !legacyDummyUserIds.has(u.id) &&
        !u.name.toLowerCase().includes('budi santoso') &&
        !u.name.toLowerCase().includes('ratih purwasih') &&
        !u.name.toLowerCase().includes('hendra wijaya')
    );

    // If Rizky Pratama was in storage, replace or update with Lili
    const normalized = filtered.map((u) => {
      if (u.id === 'u-kord-01' && u.name === 'Rizky Pratama') {
        return {
          ...u,
          name: 'Lili Ariyanto',
          username: 'lili',
          unit: 'Ar Razi' as const,
        };
      }
      return u;
    });

    if (normalized.length === 0) {
      setStoredItem(STORAGE_KEYS.USERS, SEED_USERS);
      return SEED_USERS;
    }

    if (
      normalized.length !== users.length ||
      normalized.some((u, i) => u.name !== users[i]?.name)
    ) {
      setStoredItem(STORAGE_KEYS.USERS, normalized);
    }
    return normalized;
  },
  saveUsers: (users: User[]): void => {
    setStoredItem(STORAGE_KEYS.USERS, users || []);
  },
  addUser: (user: User): void => {
    const users = StorageService.getUsers();
    users.push(user);
    StorageService.saveUsers(users);
  },
  updateUser: (updatedUser: User): void => {
    const users = StorageService.getUsers();
    const index = users.findIndex((u) => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      StorageService.saveUsers(users);
    }
  },

  getActiveUser: (): User | null => {
    return getStoredItem<User | null>(STORAGE_KEYS.ACTIVE_USER, null);
  },
  setActiveUser: (user: User | null): void => {
    if (user) {
      setStoredItem(STORAGE_KEYS.ACTIVE_USER, user);
    } else {
      removeStoredItem(STORAGE_KEYS.ACTIVE_USER);
    }
  },
  clearActiveUser: (): void => {
    removeStoredItem(STORAGE_KEYS.ACTIVE_USER);
  },

  getMasterTasks: (): MasterTask[] => {
    const tasks = getStoredItem<MasterTask[]>(STORAGE_KEYS.MASTER_TASKS, SEED_MASTER_TASKS);
    if (!tasks || tasks.length === 0) {
      setStoredItem(STORAGE_KEYS.MASTER_TASKS, SEED_MASTER_TASKS);
      return SEED_MASTER_TASKS;
    }
    // Ensure every task has an assignee property and standardPhotoUrl if available
    let hasUpdatedAssignees = false;
    const normalizedTasks = tasks.map((t) => {
      let modified = false;
      const updated = { ...t };
      if (!updated.assignee) {
        const seedMatch = SEED_MASTER_TASKS.find((st) => st.id === t.id);
        updated.assignee = seedMatch?.assignee || 'Semua Petugas';
        modified = true;
      }
      if (!updated.standardPhotoUrl) {
        const seedMatch = SEED_MASTER_TASKS.find((st) => st.id === t.id);
        if (seedMatch?.standardPhotoUrl) {
          updated.standardPhotoUrl = seedMatch.standardPhotoUrl;
          modified = true;
        }
      }
      if (modified) {
        hasUpdatedAssignees = true;
      }
      return updated;
    });
    if (hasUpdatedAssignees) {
      setStoredItem(STORAGE_KEYS.MASTER_TASKS, normalizedTasks);
    }
    return normalizedTasks;
  },
  saveMasterTasks: (tasks: MasterTask[]): void => {
    if (tasks && tasks.length > 0) {
      setStoredItem(STORAGE_KEYS.MASTER_TASKS, tasks);
    }
  },
  addMasterTask: (task: MasterTask): void => {
    const tasks = StorageService.getMasterTasks();
    tasks.push(task);
    StorageService.saveMasterTasks(tasks);
  },
  updateMasterTask: (task: MasterTask): void => {
    const tasks = StorageService.getMasterTasks();
    const index = tasks.findIndex((t) => t.id === task.id);
    if (index !== -1) {
      tasks[index] = task;
      StorageService.saveMasterTasks(tasks);
    }
  },
  deleteMasterTask: (taskId: string): void => {
    const tasks = StorageService.getMasterTasks().filter((t) => t.id !== taskId);
    StorageService.saveMasterTasks(tasks);
  },

  getTaskLogs: (): TaskLog[] => {
    const logs = getStoredItem<TaskLog[]>(STORAGE_KEYS.TASK_LOGS, []);
    const cleanLogs = (logs || []).filter(
      (l) => !l.id.startsWith('tl-today-') && !l.id.startsWith('tl-00')
    );
    if (cleanLogs.length !== (logs || []).length) {
      setStoredItem(STORAGE_KEYS.TASK_LOGS, cleanLogs);
    }
    return cleanLogs;
  },
  saveTaskLogs: (logs: TaskLog[]): void => {
    setStoredItem(STORAGE_KEYS.TASK_LOGS, logs);
  },
  mergeTaskLogs: (remoteLogs: TaskLog[]): TaskLog[] => {
    const localLogs = StorageService.getTaskLogs();
    const mergedMap = new Map<string, TaskLog>();

    // 1. First index remote logs
    remoteLogs.forEach((rLog) => {
      if (rLog && (rLog.id || rLog.taskId)) {
        mergedMap.set(rLog.id, { ...rLog });
      }
    });

    // 2. Merge local logs without losing newly completed work
    localLogs.forEach((lLog) => {
      let matchedKey: string | null = null;
      if (mergedMap.has(lLog.id)) {
        matchedKey = lLog.id;
      } else {
        for (const [rId, rLog] of mergedMap.entries()) {
          const isUserMatch =
            (lLog.userId && rLog.userId && lLog.userId === rLog.userId) ||
            (lLog.userName && rLog.userName && lLog.userName.trim().toLowerCase() === rLog.userName.trim().toLowerCase());
          const isTaskMatch =
            lLog.taskId && rLog.taskId && lLog.taskId.trim() === rLog.taskId.trim();
          const isDateMatch = isSameDay(lLog.date, rLog.date) || isSameDay(lLog.timestamp, rLog.timestamp);

          if (isUserMatch && isTaskMatch && isDateMatch) {
            matchedKey = rId;
            break;
          }
        }
      }

        if (matchedKey) {
        const rLog = mergedMap.get(matchedKey)!;
        
        // Resolve best photoUrl (Never lose photo that was taken locally or uploaded to drive)
        let bestPhotoUrl = lLog.photoUrl || rLog.photoUrl;
        const rIsDrive = rLog.photoUrl && (rLog.photoUrl.startsWith('http://') || rLog.photoUrl.startsWith('https://'));
        const lIsDrive = lLog.photoUrl && (lLog.photoUrl.startsWith('http://') || lLog.photoUrl.startsWith('https://'));
        const lIsBase64 = lLog.photoUrl && lLog.photoUrl.startsWith('data:');
        const rIsPlaceholder = rLog.photoUrl === '[Bukti Foto Tersimpan di Perangkat]';
        const lIsPlaceholder = lLog.photoUrl === '[Bukti Foto Tersimpan di Perangkat]';

        if (lIsDrive) {
          bestPhotoUrl = lLog.photoUrl;
        } else if (rIsDrive) {
          bestPhotoUrl = rLog.photoUrl;
        } else if (lIsBase64) {
          bestPhotoUrl = lLog.photoUrl;
        } else if (rLog.photoUrl && !rIsPlaceholder) {
          bestPhotoUrl = rLog.photoUrl;
        } else if (lLog.photoUrl && !lIsPlaceholder) {
          bestPhotoUrl = lLog.photoUrl;
        }

        const today = getJakartaDateString();
        const mergedDate = isSameDay(lLog.date, today) ? lLog.date : (rLog.date || lLog.date);

        const merged: TaskLog = {
          ...rLog,
          date: mergedDate,
          photoUrl: bestPhotoUrl,
          driveFileId: lLog.driveFileId || rLog.driveFileId,
          notes: lLog.notes || rLog.notes,
          lateReason: lLog.lateReason || rLog.lateReason,
          isLate: lLog.isLate ?? rLog.isLate,
          status: (lLog.status === 'Selesai' || lLog.status === 'Terlambat') ? lLog.status : (rLog.status || lLog.status),
          kordinatorScore: rLog.kordinatorScore ?? lLog.kordinatorScore,
          kordinatorNotes: rLog.kordinatorNotes ?? lLog.kordinatorNotes,
          peerInspectorName: rLog.peerInspectorName ?? lLog.peerInspectorName,
          peerScore: rLog.peerScore ?? lLog.peerScore,
          peerNotes: rLog.peerNotes ?? lLog.peerNotes,
        };
        mergedMap.set(matchedKey, merged);
      } else {
        // Retain local log that has not reached the remote sheet yet!
        mergedMap.set(lLog.id, lLog);
      }
    });

    const result = Array.from(mergedMap.values()).sort((a, b) => {
      const dateA = a.date || a.timestamp || '';
      const dateB = b.date || b.timestamp || '';
      return dateB.localeCompare(dateA);
    });

    StorageService.saveTaskLogs(result);
    return result;
  },
  addTaskLog: (log: TaskLog): void => {
    const logs = StorageService.getTaskLogs();
    const existingIndex = logs.findIndex(
      (l) =>
        l.id === log.id ||
        ((l.userId === log.userId || (l.userName && log.userName && l.userName.trim().toLowerCase() === log.userName.trim().toLowerCase())) &&
          (l.taskId && log.taskId && l.taskId.trim() === log.taskId.trim()) &&
          (isSameDay(l.date, log.date) || isSameDay(l.timestamp, log.timestamp)))
    );
    if (existingIndex !== -1) {
      logs[existingIndex] = { ...logs[existingIndex], ...log };
    } else {
      logs.unshift(log); // newest first
    }
    StorageService.saveTaskLogs(logs);
  },
  updateTaskLog: (log: TaskLog): void => {
    const logs = StorageService.getTaskLogs();
    const index = logs.findIndex((l) => l.id === log.id);
    if (index !== -1) {
      logs[index] = { ...logs[index], ...log };
      StorageService.saveTaskLogs(logs);
    } else {
      StorageService.addTaskLog(log);
    }
  },
  deleteTaskLog: (logId: string): void => {
    const logs = StorageService.getTaskLogs().filter((l) => l.id !== logId);
    StorageService.saveTaskLogs(logs);
  },

  getJobBareng: (): JobBareng[] => {
    const jobs = getStoredItem<JobBareng[]>(STORAGE_KEYS.JOB_BARENG, []);
    const cleanJobs = (jobs || []).filter((j) => j.id !== 'jb-001');
    if (cleanJobs.length !== (jobs || []).length) {
      setStoredItem(STORAGE_KEYS.JOB_BARENG, cleanJobs);
    }
    return cleanJobs;
  },
  saveJobBareng: (jobs: JobBareng[]): void => {
    setStoredItem(STORAGE_KEYS.JOB_BARENG, jobs);
  },
  mergeJobBareng: (remoteJobs: JobBareng[]): JobBareng[] => {
    const localJobs = StorageService.getJobBareng();
    const jobMap = new Map<string, JobBareng>();

    remoteJobs.forEach((rJob) => {
      if (rJob && rJob.id) {
        jobMap.set(rJob.id, { ...rJob });
      }
    });

    localJobs.forEach((lJob) => {
      if (jobMap.has(lJob.id)) {
        const rJob = jobMap.get(lJob.id)!;
        const mergedParticipants = Array.from(
          new Set([...(rJob.participantIds || []), ...(lJob.participantIds || [])])
        );
        const mergedParticipantNames = Array.from(
          new Set([...(rJob.participantNames || []), ...(lJob.participantNames || [])])
        );
        const mergedCompleted = Array.from(
          new Set([...(rJob.completedUserIds || []), ...(lJob.completedUserIds || [])])
        );
        const mergedCompletedNames = Array.from(
          new Set([...(rJob.completedUserNames || []), ...(lJob.completedUserNames || [])])
        );
        jobMap.set(lJob.id, {
          ...rJob,
          participantIds: mergedParticipants,
          participantNames: mergedParticipantNames,
          completedUserIds: mergedCompleted,
          completedUserNames: mergedCompletedNames,
          status: lJob.status === 'Dibatalkan' || rJob.status === 'Dibatalkan' ? 'Dibatalkan' : (lJob.status || rJob.status || 'Aktif'),
        });
      } else {
        jobMap.set(lJob.id, lJob);
      }
    });

    const result = Array.from(jobMap.values());
    StorageService.saveJobBareng(result);
    return result;
  },
  addJobBareng: (job: JobBareng): void => {
    const jobs = StorageService.getJobBareng();
    jobs.unshift(job);
    StorageService.saveJobBareng(jobs);
  },
  updateJobBareng: (job: JobBareng): void => {
    const jobs = StorageService.getJobBareng();
    const index = jobs.findIndex((j) => j.id === job.id);
    if (index !== -1) {
      jobs[index] = job;
      StorageService.saveJobBareng(jobs);
    }
  },

  getDinasRequests: (): DinasRequest[] => {
    const reqs = getStoredItem<DinasRequest[]>(STORAGE_KEYS.DINAS_REQUESTS, []);
    const cleanReqs = (reqs || []).filter((r) => r.id !== 'dn-001');
    if (cleanReqs.length !== (reqs || []).length) {
      setStoredItem(STORAGE_KEYS.DINAS_REQUESTS, cleanReqs);
    }
    return cleanReqs;
  },
  saveDinasRequests: (requests: DinasRequest[]): void => {
    setStoredItem(STORAGE_KEYS.DINAS_REQUESTS, requests);
  },
  mergeDinasRequests: (remoteRequests: DinasRequest[]): DinasRequest[] => {
    const local = StorageService.getDinasRequests();
    const map = new Map<string, DinasRequest>();
    remoteRequests.forEach((r) => { if (r && r.id) map.set(r.id, r); });
    local.forEach((l) => { if (!map.has(l.id)) map.set(l.id, l); });
    const result = Array.from(map.values()).sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
    StorageService.saveDinasRequests(result);
    return result;
  },
  addDinasRequest: (request: DinasRequest): void => {
    const requests = StorageService.getDinasRequests();
    requests.unshift(request);
    StorageService.saveDinasRequests(requests);
  },
  updateDinasRequest: (request: DinasRequest): void => {
    const requests = StorageService.getDinasRequests();
    const index = requests.findIndex((r) => r.id === request.id);
    if (index !== -1) {
      requests[index] = request;
      StorageService.saveDinasRequests(requests);
    }
  },

  getPeerInspections: (): PeerInspection[] => {
    const list = getStoredItem<PeerInspection[]>(STORAGE_KEYS.PEER_INSPECTIONS, []);
    const cleanList = (list || []).filter((p) => p.id !== 'pi-001' && p.id !== 'pi-002');
    if (cleanList.length !== (list || []).length) {
      setStoredItem(STORAGE_KEYS.PEER_INSPECTIONS, cleanList);
    }
    return cleanList;
  },
  savePeerInspections: (inspections: PeerInspection[]): void => {
    setStoredItem(STORAGE_KEYS.PEER_INSPECTIONS, inspections);
  },
  mergePeerInspections: (remoteInspections: PeerInspection[]): PeerInspection[] => {
    const local = StorageService.getPeerInspections();
    const map = new Map<string, PeerInspection>();
    remoteInspections.forEach((r) => { if (r && r.id) map.set(r.id, r); });
    local.forEach((l) => { if (!map.has(l.id)) map.set(l.id, l); });
    const result = Array.from(map.values()).sort((a, b) => (b.date || b.timestamp || '').localeCompare(a.date || a.timestamp || ''));
    StorageService.savePeerInspections(result);
    return result;
  },
  addPeerInspection: (inspection: PeerInspection): void => {
    const list = StorageService.getPeerInspections();
    const existingIdx = list.findIndex((p) => p.id === inspection.id);
    if (existingIdx !== -1) {
      list[existingIdx] = inspection;
    } else {
      list.unshift(inspection);
    }
    StorageService.savePeerInspections(list);
  },
  updatePeerInspection: (inspection: PeerInspection): void => {
    StorageService.addPeerInspection(inspection);
  },

  getWeeklyScores: (): WeeklyScore[] => {
    const list = getStoredItem<WeeklyScore[]>(STORAGE_KEYS.WEEKLY_SCORES, []);
    const cleanList = (list || []).filter((w) => !w.id.startsWith('ws-00'));
    if (cleanList.length !== (list || []).length) {
      setStoredItem(STORAGE_KEYS.WEEKLY_SCORES, cleanList);
    }
    return cleanList;
  },
  saveWeeklyScores: (scores: WeeklyScore[]): void => {
    setStoredItem(STORAGE_KEYS.WEEKLY_SCORES, scores);
  },
  addWeeklyScore: (score: WeeklyScore): void => {
    const list = StorageService.getWeeklyScores();
    const existingIndex = list.findIndex(
      (w) =>
        w.id === score.id ||
        (w.userId === score.userId &&
          ((w.saturdayDate && w.saturdayDate === score.saturdayDate) ||
            (w.dateRange && w.dateRange === score.dateRange)))
    );
    if (existingIndex !== -1) {
      list[existingIndex] = score;
    } else {
      list.unshift(score);
    }
    StorageService.saveWeeklyScores(list);
  },

  getSyncConfig: (): SyncConfig => {
    const config = getStoredItem<SyncConfig>(STORAGE_KEYS.SYNC_CONFIG, DEFAULT_SYNC_CONFIG);
    if (!config.webAppUrl || config.webAppUrl.trim() === '') {
      config.webAppUrl = DEFAULT_WEB_APP_URL;
      config.isGoogleConnected = true;
      StorageService.saveSyncConfig(config);
    }
    return config;
  },
  saveSyncConfig: (config: SyncConfig): void => {
    setStoredItem(STORAGE_KEYS.SYNC_CONFIG, config);
  },

  getHolidayConfig: (): HolidayConfig => {
    return getStoredItem<HolidayConfig>(STORAGE_KEYS.HOLIDAY_CONFIG, DEFAULT_HOLIDAY_CONFIG);
  },
  saveHolidayConfig: (config: HolidayConfig): void => {
    setStoredItem(STORAGE_KEYS.HOLIDAY_CONFIG, config);
  },
  isDayOffToday: (dateStr?: string): { isOff: boolean; reason: string } => {
    const config = StorageService.getHolidayConfig();
    if (!config) return { isOff: false, reason: '' };

    const todayActual = getJakartaDateString();
    const checkDateStr = dateStr ? normalizeDateString(dateStr) : todayActual;
    
    // 1. Check if manually marked as holiday today (only if checking current active date)
    if (checkDateStr === todayActual && config.isHolidayToday === true) {
      return { isOff: true, reason: config.holidayReason || 'Libur Ditetapkan Admin' };
    }

    // 2. Check if specific date is in disabledDates
    if (config.disabledDates && Array.isArray(config.disabledDates) && config.disabledDates.includes(checkDateStr)) {
      return { isOff: true, reason: config.holidayReason || 'Libur Terjadwal' };
    }

    // 3. Check weekend rule ONLY IF autoWeekendOff is explicitly enabled by Admin
    if (config.autoWeekendOff === true) {
      const parts = checkDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return {
            isOff: true,
            reason: dayOfWeek === 0 ? 'Hari Minggu (Weekend Off)' : 'Hari Sabtu (Weekend Off)',
          };
        }
      }
    }

    return { isOff: false, reason: '' };
  },

  // Reset to initial seed state
  resetAllData: (): void => {
    setStoredItem(STORAGE_KEYS.USERS, SEED_USERS);
    setStoredItem(STORAGE_KEYS.MASTER_TASKS, SEED_MASTER_TASKS);
    setStoredItem(STORAGE_KEYS.TASK_LOGS, SEED_TASK_LOGS);
    setStoredItem(STORAGE_KEYS.JOB_BARENG, SEED_JOB_BARENG);
    setStoredItem(STORAGE_KEYS.DINAS_REQUESTS, SEED_DINAS_REQUESTS);
    setStoredItem(STORAGE_KEYS.PEER_INSPECTIONS, SEED_PEER_INSPECTIONS);
    setStoredItem(STORAGE_KEYS.WEEKLY_SCORES, SEED_WEEKLY_SCORES);
    setStoredItem(STORAGE_KEYS.SYNC_CONFIG, DEFAULT_SYNC_CONFIG);
    setStoredItem(STORAGE_KEYS.HOLIDAY_CONFIG, DEFAULT_HOLIDAY_CONFIG);
  },
};

// Peer Inspection Group Validation Rule:
// - TK with TK
// - SD with SD
// - SMP with SMP
// - Pelangi Direktorat, Ar Razi, Khaldun (Ibnu Khaldun, Ar Razi, Pelangi, Direktorat) can inspect each other
// Peer inspection is only for findings/checklist, without numeric scoring
export const canInspectPeer = (
  inspectorRole: string,
  inspectorUnit: UnitType | string,
  targetUnit: UnitType | string
): boolean => {
  if (inspectorRole === 'admin' || inspectorRole === 'kordinator') {
    return true; // Admin & Kordinator can inspect ALL units
  }
  
  const normInsp = String(inspectorUnit || '').trim().toLowerCase();
  const normTarget = String(targetUnit || '').trim().toLowerCase();

  // 1. Same unit inspection: TK with TK, SD with SD, SMP with SMP
  if (normInsp === normTarget && normInsp !== '') {
    return true;
  }

  // 2. Cluster group: Khaldun, Pelangi, Direktorat, and Ar Razi can inspect each other
  const clusterKeywords = ['pelangi', 'direktorat', 'ar razi', 'arrazi', 'khaldun', 'ibnu khaldun'];
  const inspInCluster = clusterKeywords.some((k) => normInsp.includes(k));
  const targetInCluster = clusterKeywords.some((k) => normTarget.includes(k));

  if (inspInCluster && targetInCluster) {
    return true;
  }

  return false;
};

// Check if a MasterTask is assigned to a specific user or kordinator unit
export const isTaskAssignedToUser = (task: MasterTask, user: User): boolean => {
  if (!user || !task) return false;
  if (user.role === 'admin') return true;

  // 1. Check unit compatibility
  const tUnit = (task.unit || 'Semua Unit').trim().toLowerCase();
  const uUnit = (user.unit || 'Semua Unit').trim().toLowerCase();
  
  const userHasAllUnits = uUnit === 'semua unit' || uUnit === 'semua' || uUnit === 'all';
  const taskIsForAllUnits = tUnit === 'semua unit' || tUnit === 'semua' || tUnit === 'all';

  const matchesUnit =
    userHasAllUnits ||
    taskIsForAllUnits ||
    tUnit === uUnit ||
    uUnit.includes(tUnit) ||
    tUnit.includes(uUnit);

  if (!matchesUnit) return false;

  // 2. Kordinator manages all tasks in their assigned unit/building
  if (user.role === 'kordinator') {
    return true;
  }

  // 3. If no assignee specified or set to "Semua Petugas" / "Semua" / empty -> matches anyone in unit
  const assignee = (task.assignee || '').trim().toLowerCase();
  if (
    !assignee ||
    assignee === 'semua' ||
    assignee === 'semua petugas' ||
    assignee === 'semua staff' ||
    assignee === 'semua ob' ||
    assignee === 'semua og' ||
    assignee === 'semua unit' ||
    assignee === 'all' ||
    assignee === 'petugas unit'
  ) {
    return true;
  }

  // 4. Match against user's specific details
  const uUsername = (user.username || '').toLowerCase();
  const uId = (user.id || '').toLowerCase();
  const uName = (user.name || '').toLowerCase();
  const uCleanName = user.name.replace(/\(.*\)/, '').trim().toLowerCase();

  // Support comma, pipe, or semicolon separated multiple assignees
  const tokens = assignee.split(/[,|;/]+/).map((t) => t.trim().toLowerCase());
  return tokens.some((token) => {
    if (!token) return false;
    if (token === 'semua' || token === 'semua petugas' || token === 'semua staff') return true;
    return (
      token === uUsername ||
      token === uId ||
      token === uName ||
      token === uCleanName ||
      uUsername.includes(token) ||
      uName.includes(token) ||
      uCleanName.includes(token) ||
      token.includes(uUsername) ||
      token.includes(uCleanName)
    );
  });
};

