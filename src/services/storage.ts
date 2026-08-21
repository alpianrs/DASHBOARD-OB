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
    username: 'kordinator',
    password: 'password123',
    name: 'Rizky Pratama',
    role: 'kordinator',
    unit: 'Semua Unit',
    status: 'Aktif',
    phone: '081298765432',
  },
  {
    id: 'u-tk-01',
    username: 'budi_tk',
    password: 'password123',
    name: 'Budi Santoso (OB)',
    role: 'user',
    unit: 'TK',
    status: 'Aktif',
    phone: '081311112222',
  },
  {
    id: 'u-tk-02',
    username: 'siti_tk',
    password: 'password123',
    name: 'Siti Aminah (OG)',
    role: 'user',
    unit: 'TK',
    status: 'Aktif',
    phone: '081311113333',
  },
  {
    id: 'u-sd-01',
    username: 'agus_sd',
    password: 'password123',
    name: 'Agus Setiawan (OB)',
    role: 'user',
    unit: 'SD',
    status: 'Aktif',
    phone: '081322224444',
  },
  {
    id: 'u-sd-02',
    username: 'ratih_sd',
    password: 'password123',
    name: 'Ratih Purwasih (OG)',
    role: 'user',
    unit: 'SD',
    status: 'Aktif',
    phone: '081322225555',
  },
  {
    id: 'u-smp-01',
    username: 'dodi_smp',
    password: 'password123',
    name: 'Dodi Firmansyah (OB)',
    role: 'user',
    unit: 'SMP',
    status: 'Aktif',
    phone: '081333336666',
  },
  {
    id: 'u-smp-02',
    username: 'maya_smp',
    password: 'password123',
    name: 'Maya Indah (OG)',
    role: 'user',
    unit: 'SMP',
    status: 'Aktif',
    phone: '081333337777',
  },
  {
    id: 'u-pelangi-01',
    username: 'hendra_pelangi',
    password: 'password123',
    name: 'Hendra Wijaya (OB)',
    role: 'user',
    unit: 'Pelangi Direktorat',
    status: 'Aktif',
    phone: '081344448888',
  },
  {
    id: 'u-arrazi-01',
    username: 'fajar_arrazi',
    password: 'password123',
    name: 'Fajar Ramadhan (OB)',
    role: 'user',
    unit: 'Ar Razi',
    status: 'Aktif',
    phone: '081355559999',
  },
  {
    id: 'u-khaldun-01',
    username: 'ilham_khaldun',
    password: 'password123',
    name: 'Ilham Saputra (OB)',
    role: 'user',
    unit: 'Khaldun',
    status: 'Aktif',
    phone: '081366660000',
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
    assignee: 'Budi Santoso (OB)',
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
    assignee: 'Siti Aminah (OG)',
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
    assignee: 'Agus Setiawan (OB)',
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
    assignee: 'Ratih Purwasih (OG)',
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
    assignee: 'Dodi Firmansyah (OB)',
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
    assignee: 'Maya Indah (OG)',
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
    assignee: 'Hendra Wijaya (OB)',
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
    assignee: 'Fajar Ramadhan (OB)',
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
    assignee: 'Ilham Saputra (OB)',
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
    assignee: 'Budi Santoso (OB)',
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
    assignee: 'Agus Setiawan (OB)',
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

// Initial Task Logs (recent history)
const getTodayStr = () => {
  const d = new Date();
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return local.toISOString().split('T')[0];
};

const getDaysAgoStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return local.toISOString().split('T')[0];
};

const getYesterdayStr = () => getDaysAgoStr(1);

const SEED_TASK_LOGS: TaskLog[] = [
  // HARI INI (TODAY) LOGS
  {
    id: 'tl-today-001',
    timestamp: `${getTodayStr()}T06:45:00Z`,
    date: getTodayStr(),
    userId: 'u-tk-01',
    userName: 'Budi Santoso (OB)',
    userRole: 'user',
    unit: 'TK',
    taskId: 'mt-pr-01',
    taskTitle: 'Sanitasi & Pembersihan Toilet Pagi (Wastafel, Kloset, Lantai Kering)',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    notes: 'Toilet TK bersih dan wangi, wastafel disinfektan.',
    verifiedByKordinator: true,
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    kordinatorScore: 4,
    kordinatorNotes: 'Pekerjaan sangat baik dan rapi.',
  },
  {
    id: 'tl-today-002',
    timestamp: `${getTodayStr()}T07:15:00Z`,
    date: getTodayStr(),
    userId: 'u-sd-01',
    userName: 'Agus Setiawan (OB)',
    userRole: 'user',
    unit: 'SD',
    taskId: 'mt-pr-03',
    taskTitle: 'Penyediaan Air Minum Galon & Perlengkapan Sanitasi Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=400&q=80',
    notes: 'Galon terisi penuh di semua lantai SD.',
    verifiedByKordinator: true,
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    kordinatorScore: 4,
  },
  {
    id: 'tl-today-003',
    timestamp: `${getTodayStr()}T09:20:00Z`,
    date: getTodayStr(),
    userId: 'u-smp-01',
    userName: 'Dodi Firmansyah (OB)',
    userRole: 'user',
    unit: 'SMP',
    taskId: 'mt-co-01',
    taskTitle: 'Pengosongan & Pembuangan Semua Tempat Sampah ke TPS Akhir',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Terlambat',
    isLate: true,
    lateReason: 'Membantu persiapan sound system acara terlebih dahulu di aula SMP.',
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    notes: 'Sampah TPS sudah diangkut semua.',
    verifiedByKordinator: true,
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    kordinatorScore: 3,
    kordinatorNotes: 'Alasan terverifikasi terlambat karena tugas mendadak.',
  },
  {
    id: 'tl-today-004',
    timestamp: `${getTodayStr()}T07:30:00Z`,
    date: getTodayStr(),
    userId: 'u-pelangi-01',
    userName: 'Hendra Wijaya (OB)',
    userRole: 'user',
    unit: 'Pelangi Direktorat',
    taskId: 'mt-pr-01',
    taskTitle: 'Sanitasi & Pembersihan Toilet Pagi (Wastafel, Kloset, Lantai Kering)',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    notes: 'Toilet direktorat wangi dan bersih.',
    inspectedByPeer: true,
    peerInspectorId: 'u-arrazi-01',
    peerInspectorName: 'Fajar Ramadhan (OB)',
    peerInspectorUnit: 'Ar Razi',
    peerScore: 4,
    peerNotes: 'Mantap bang Hendra, sangat kinclong.',
  },
  {
    id: 'tl-today-005',
    timestamp: `${getTodayStr()}T08:10:00Z`,
    date: getTodayStr(),
    userId: 'u-arrazi-01',
    userName: 'Fajar Ramadhan (OB)',
    userRole: 'user',
    unit: 'Ar Razi',
    taskId: 'mt-pr-04',
    taskTitle: 'Penyapuan Koridor, Lobby Utama, & Tangga Area Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80',
    notes: 'Lobby Ar Razi bersih dan keset rapi.',
  },
  {
    id: 'tl-today-006',
    timestamp: `${getTodayStr()}T07:50:00Z`,
    date: getTodayStr(),
    userId: 'u-kord-01',
    userName: 'Rizky Pratama',
    userRole: 'kordinator',
    unit: 'Semua Unit',
    taskId: 'mt-pr-01',
    taskTitle: 'Inspeksi & Quality Control Kesiapan Fasilitas Pagi Seluruh Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    notes: 'QC unit TK, SD, SMP selesai sebelum pukul 08:00 WIB.',
  },

  // KEMARIN (YESTERDAY) LOGS
  {
    id: 'tl-001',
    timestamp: `${getYesterdayStr()}T07:30:00Z`,
    date: getYesterdayStr(),
    userId: 'u-tk-01',
    userName: 'Budi Santoso (OB)',
    userRole: 'user',
    unit: 'TK',
    taskId: 'mt-pr-01',
    taskTitle: 'Sanitasi & Pembersihan Toilet Pagi (Wastafel, Kloset, Lantai Kering)',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    notes: 'Toilet TK bersih, sabun dan handuk kertas sudah diisi.',
    verifiedByKordinator: true,
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    kordinatorScore: 4,
    kordinatorNotes: 'Pekerjaan sangat bersih dan rapi.',
  },
  {
    id: 'tl-002',
    timestamp: `${getYesterdayStr()}T08:15:00Z`,
    date: getYesterdayStr(),
    userId: 'u-sd-01',
    userName: 'Agus Setiawan (OB)',
    userRole: 'user',
    unit: 'SD',
    taskId: 'mt-pr-02',
    taskTitle: 'Pembersihan & Penataan Ruang Kelas / Kantor Guru Sebelum Jam Masuk',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=400&q=80',
    notes: 'Kelas SD 1A - 3B sudah disapu dan meja ditata rapi.',
    verifiedByKordinator: true,
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    kordinatorScore: 4,
  },
  {
    id: 'tl-003',
    timestamp: `${getYesterdayStr()}T09:45:00Z`,
    date: getYesterdayStr(),
    userId: 'u-smp-01',
    userName: 'Dodi Firmansyah (OB)',
    userRole: 'user',
    unit: 'SMP',
    taskId: 'mt-pr-01',
    taskTitle: 'Sanitasi & Pembersihan Toilet Pagi (Wastafel, Kloset, Lantai Kering)',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Terlambat',
    isLate: true,
    lateReason: 'Membantu angkat kursi upacara terlebih dahulu di lapangan utama.',
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    notes: 'Toilet SMP putra dan putri selesai.',
    verifiedByKordinator: true,
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    kordinatorScore: 3,
    kordinatorNotes: 'Alasan terverifikasi, tapi ke depan usahakan delegasikan.',
  },
  {
    id: 'tl-004',
    timestamp: `${getDaysAgoStr(2)}T07:15:00Z`,
    date: getDaysAgoStr(2),
    userId: 'u-pelangi-01',
    userName: 'Hendra Wijaya (OB)',
    userRole: 'user',
    unit: 'Pelangi Direktorat',
    taskId: 'mt-pr-01',
    taskTitle: 'Sanitasi & Pembersihan Toilet Pagi (Wastafel, Kloset, Lantai Kering)',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    notes: 'Toilet direktorat wangi dan bersih.',
    inspectedByPeer: true,
    peerInspectorId: 'u-arrazi-01',
    peerInspectorName: 'Fajar Ramadhan (OB)',
    peerInspectorUnit: 'Ar Razi',
    peerScore: 4,
    peerNotes: 'Mantap bang Hendra, sangat kinclong.',
  },
  {
    id: 'tl-005',
    timestamp: `${getDaysAgoStr(3)}T08:00:00Z`,
    date: getDaysAgoStr(3),
    userId: 'u-sd-02',
    userName: 'Ratih Purwasih (OG)',
    userRole: 'user',
    unit: 'SD',
    taskId: 'mt-pr-04',
    taskTitle: 'Penyapuan Koridor, Lobby Utama, & Tangga Area Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Selesai',
    isLate: false,
    photoUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80',
    notes: 'Koridor lantai 1 & 2 bersih.',
  },
  {
    id: 'tl-006',
    timestamp: `${getDaysAgoStr(4)}T09:30:00Z`,
    date: getDaysAgoStr(4),
    userId: 'u-tk-02',
    userName: 'Siti Aminah (OG)',
    userRole: 'user',
    unit: 'TK',
    taskId: 'mt-pr-02',
    taskTitle: 'Pembersihan & Penataan Ruang Kelas / Kantor Guru Sebelum Jam Masuk',
    category: 'Harian',
    timingType: 'pre_readiness',
    status: 'Terlambat',
    isLate: true,
    lateReason: 'Menunggu perbaikan kran air wastafel TK dari teknisi.',
    photoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=400&q=80',
    notes: 'Ruang kelas TK A & B siap digunakan.',
  },
];

// Seed Job Bareng (Ad-hoc urgent collective work order)
const SEED_JOB_BARENG: JobBareng[] = [
  {
    id: 'jb-001',
    title: 'Kerja Bakti Bersih Area Lapangan & Panggung Acara HUT Lazuardi',
    description:
      'Pembersihan rumput liar, penyapuan daun kering, penataan panggung dan pembersihan tribun penonton untuk persiapan acara.',
    date: getTodayStr(),
    timeTarget: '13:00 - 15:30 WIB',
    targetUnit: 'Semua Unit',
    targetArea: 'Lapangan Utama & Panggung',
    createdBy: 'u-adm-01',
    createdByName: 'Alpian (FM Head)',
    status: 'Aktif',
    participantIds: ['u-tk-01', 'u-sd-01', 'u-smp-01', 'u-pelangi-01'],
    completedUserIds: ['u-tk-01'],
    createdAt: `${getTodayStr()}T08:00:00Z`,
  },
];

// Seed Dinas Requests
const SEED_DINAS_REQUESTS: DinasRequest[] = [
  {
    id: 'dn-001',
    date: getTodayStr(),
    userId: 'u-khaldun-01',
    userName: 'Ilham Saputra (OB)',
    unit: 'Khaldun',
    reason: 'Pembelian chemical stok bulanan dan sparepart kran di Toko Bangunan Mitra Pusat.',
    destination: 'Mitra Bangunan Cinere & Depo',
    status: 'Disetujui',
    approvedBy: 'u-adm-01',
    approvedByName: 'Alpian (FM Head)',
    approvedAt: `${getTodayStr()}T08:30:00Z`,
    createdAt: `${getTodayStr()}T06:30:00Z`,
  },
];

// Seed Peer Inspections
const SEED_PEER_INSPECTIONS: PeerInspection[] = [
  {
    id: 'pi-001',
    timestamp: `${getYesterdayStr()}T10:00:00Z`,
    date: getYesterdayStr(),
    inspectorId: 'u-tk-02',
    inspectorName: 'Siti Aminah (OG)',
    inspectorRole: 'user',
    inspectorUnit: 'TK',
    targetUserId: 'u-tk-01',
    targetUserName: 'Budi Santoso (OB)',
    targetUnit: 'TK',
    area: 'Area Bermain & Ruang Kelas TK B',
    score: 9,
    notes: 'Lantai sangat bersih, mainan tersusun rapi di rak.',
    checklistItems: [
      { label: 'Lantai bebas debu & kotoran', passed: true },
      { label: 'Wastafel & cermin mengkilap', passed: true },
      { label: 'Tempat sampah kosong & terpasang plastik', passed: true },
      { label: 'Aroma ruangan segar / tidak apek', passed: true },
    ],
  },
  {
    id: 'pi-002',
    timestamp: `${getTodayStr()}T09:30:00Z`,
    date: getTodayStr(),
    inspectorId: 'u-arrazi-01',
    inspectorName: 'Fajar Ramadhan (OB)',
    inspectorRole: 'user',
    inspectorUnit: 'Ar Razi',
    targetUserId: 'u-pelangi-01',
    targetUserName: 'Hendra Wijaya (OB)',
    targetUnit: 'Pelangi Direktorat',
    area: 'Lobby & Ruang Rapat Pelangi',
    score: 9,
    notes: 'Kaca bersih, meja rapat rapi, dispenser air penuh.',
    checklistItems: [
      { label: 'Lantai bebas debu & kotoran', passed: true },
      { label: 'Wastafel & cermin mengkilap', passed: true },
      { label: 'Tempat sampah kosong & terpasang plastik', passed: true },
      { label: 'Aroma ruangan segar / tidak apek', passed: true },
    ],
  },
];

// Seed Weekly Scores (Given by Coordinator using 1-4 scale and 15 specific categories)
const SEED_WEEKLY_SCORES: WeeklyScore[] = [
  {
    id: 'ws-001',
    weekNumber: 33,
    year: 2026,
    dateRange: 'Minggu ke-33 (17 - 22 Agu 2026)',
    userId: 'u-tk-01',
    userName: 'Budi Santoso (OB)',
    unit: 'TK',
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    score: 3.8, // 1.0 - 4.0 scale
    categoryScores: {
      'Lantai & nat': 4,
      'Pintu, kusen, dinding, dan jendela': 4,
      'kaca pintu & jendela luar dan dalam': 3,
      'Toilet': 4,
      'Furniture': 4,
      'Kipas angin & ac': 4,
      'Karpet': 4,
      'Sink': 4,
      'Loker': 3,
      'Meja': 4,
      'Rak': 4,
      'Porselene Toilet': 4,
      'Koridor': 4,
      'Halaman': 3,
      'Tanaman Indoor/Outdoor': 4,
    },
    cleanlinessScore: 3.9,
    speedScore: 3.8,
    sopScore: 3.9,
    notes: 'Kinerja sangat baik dan konsisten. Sanitasi toilet dan kebersihan lantai TK sangat rapi dan wangi.',
    timestamp: `${getYesterdayStr()}T16:00:00Z`,
  },
  {
    id: 'ws-002',
    weekNumber: 33,
    year: 2026,
    dateRange: 'Minggu ke-33 (17 - 22 Agu 2026)',
    userId: 'u-sd-01',
    userName: 'Agus Setiawan (OB)',
    unit: 'SD',
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    score: 3.4,
    categoryScores: {
      'Lantai & nat': 3,
      'Pintu, kusen, dinding, dan jendela': 3,
      'kaca pintu & jendela luar dan dalam': 3,
      'Toilet': 4,
      'Furniture': 3,
      'Kipas angin & ac': 3,
      'Karpet': 3,
      'Sink': 4,
      'Loker': 3,
      'Meja': 4,
      'Rak': 3,
      'Porselene Toilet': 4,
      'Koridor': 4,
      'Halaman': 3,
      'Tanaman Indoor/Outdoor': 3,
    },
    cleanlinessScore: 3.5,
    speedScore: 3.3,
    sopScore: 3.4,
    notes: 'Kerapihan ruang kelas SD sangat baik. Mohon cek berkala kaca pintu dan sela-sela jendela luar.',
    timestamp: `${getYesterdayStr()}T16:15:00Z`,
  },
  {
    id: 'ws-003',
    weekNumber: 33,
    year: 2026,
    dateRange: 'Minggu ke-33 (17 - 22 Agu 2026)',
    userId: 'u-smp-01',
    userName: 'Dodi Firmansyah (OB)',
    unit: 'SMP',
    kordinatorId: 'u-kord-01',
    kordinatorName: 'Rizky Pratama',
    score: 3.1,
    categoryScores: {
      'Lantai & nat': 3,
      'Pintu, kusen, dinding, dan jendela': 3,
      'kaca pintu & jendela luar dan dalam': 3,
      'Toilet': 3,
      'Furniture': 3,
      'Kipas angin & ac': 3,
      'Karpet': 3,
      'Sink': 3,
      'Loker': 3,
      'Meja': 3,
      'Rak': 3,
      'Porselene Toilet': 3,
      'Koridor': 4,
      'Halaman': 3,
      'Tanaman Indoor/Outdoor': 3,
    },
    cleanlinessScore: 3.2,
    speedScore: 3.0,
    sopScore: 3.1,
    notes: 'Cukup baik, perlu ditingkatkan ketepatan waktu penyelesaian pre-readiness pagi hari.',
    timestamp: `${getYesterdayStr()}T16:30:00Z`,
  },
];

// Storage Helper Functions
export const getStoredItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
};

export const setStoredItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
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
    return users;
  },
  saveUsers: (users: User[]): void => {
    if (users && users.length > 0) {
      setStoredItem(STORAGE_KEYS.USERS, users);
    }
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

  getActiveUser: (): User => {
    return getStoredItem<User>(STORAGE_KEYS.ACTIVE_USER, SEED_USERS[0]); // Default to Admin
  },
  setActiveUser: (user: User): void => {
    setStoredItem(STORAGE_KEYS.ACTIVE_USER, user);
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
    const logs = getStoredItem<TaskLog[]>(STORAGE_KEYS.TASK_LOGS, SEED_TASK_LOGS);
    if (!logs || logs.length === 0) {
      setStoredItem(STORAGE_KEYS.TASK_LOGS, SEED_TASK_LOGS);
      return SEED_TASK_LOGS;
    }
    return logs;
  },
  saveTaskLogs: (logs: TaskLog[]): void => {
    setStoredItem(STORAGE_KEYS.TASK_LOGS, logs);
  },
  addTaskLog: (log: TaskLog): void => {
    const logs = StorageService.getTaskLogs();
    const existingIndex = logs.findIndex(
      (l) =>
        l.id === log.id ||
        (l.userId === log.userId &&
          l.taskId === log.taskId &&
          l.date === log.date)
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
    return getStoredItem<JobBareng[]>(STORAGE_KEYS.JOB_BARENG, SEED_JOB_BARENG);
  },
  saveJobBareng: (jobs: JobBareng[]): void => {
    setStoredItem(STORAGE_KEYS.JOB_BARENG, jobs);
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
    return getStoredItem<DinasRequest[]>(STORAGE_KEYS.DINAS_REQUESTS, SEED_DINAS_REQUESTS);
  },
  saveDinasRequests: (requests: DinasRequest[]): void => {
    setStoredItem(STORAGE_KEYS.DINAS_REQUESTS, requests);
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
    return getStoredItem<PeerInspection[]>(STORAGE_KEYS.PEER_INSPECTIONS, SEED_PEER_INSPECTIONS);
  },
  savePeerInspections: (inspections: PeerInspection[]): void => {
    setStoredItem(STORAGE_KEYS.PEER_INSPECTIONS, inspections);
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

  getWeeklyScores: (): WeeklyScore[] => {
    return getStoredItem<WeeklyScore[]>(STORAGE_KEYS.WEEKLY_SCORES, SEED_WEEKLY_SCORES);
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

    const checkDateStr = dateStr || new Date().toISOString().split('T')[0];
    
    // 1. Check if manually marked as holiday today (only if checking current active date)
    const todayActual = new Date().toISOString().split('T')[0];
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

