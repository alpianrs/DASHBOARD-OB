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
  DivisionType,
  PendingSyncItem,
  TreeWorkOrder,
  TreeInspectionRecord,
  TreeTreatmentStatus,
  AdhocDailyTask,
  DEFAULT_PLH_AREA_STAFF,
  MasjidDutyConfig,
  normalizePlhArea,
} from '../types';
import { isSameDay, getJakartaDateString, normalizeDateString } from '../utils/dateHelper';
import { isAreaOnMasjidDutyThisWeek } from '../utils/masjidRolling';

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
  PENDING_QUEUE: 'lz_fm_pending_sync_queue',
  TREE_WORK_ORDERS: 'lz_fm_tree_work_orders',
  ADHOC_DAILY_TASKS: 'lz_fm_adhoc_daily_tasks',
  MASJID_DUTY_CONFIG: 'lz_fm_masjid_duty_config',
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

// Seed Users for Lazuardi GCS Facility Management (Sesuai Database Resmi Google Sheet)
export const SEED_PLH_USERS: User[] = [
  {
    id: 'u-kord-plh',
    username: 'rahmat',
    password: 'rahmat123',
    name: 'Rahmat Hidayat (Kord PLH)',
    role: 'kordinator',
    division: 'PLH',
    unit: 'Pos 1',
    assignedArea: 'Area Pos 1',
    status: 'Aktif',
    phone: '08129999001',
  },
  {
    id: 'u-plh-01',
    username: 'syahril',
    password: 'password123',
    name: 'Ahmad Syahril (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Pos 2',
    assignedArea: 'Area Pos 2',
    status: 'Aktif',
    phone: '081234560001',
  },
  {
    id: 'u-plh-02',
    username: 'andi',
    password: 'password123',
    name: 'Andi Komala (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Area Khaldun',
    assignedArea: 'Area Khaldun',
    status: 'Aktif',
    phone: '081234560002',
  },
  {
    id: 'u-plh-03',
    username: 'dedi',
    password: 'password123',
    name: 'Dedi Junaedi (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Area Ex Minifarm',
    assignedArea: 'Area Ex Minifarm',
    status: 'Aktif',
    phone: '081234560003',
  },
  {
    id: 'u-plh-04',
    username: 'radilah',
    password: 'password123',
    name: 'Radilah (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Area Kolam Renang',
    assignedArea: 'Area Kolam Renang',
    status: 'Aktif',
    phone: '081234560004',
  },
];

export const SEED_OB_USERS: User[] = [];

// Akun Resmi Kepala Unit untuk Monitoring Unit Tertentu (TK, SD, SMP, Pelangi Direktorat, Ar Razi, Khaldun)
export const SEED_KEPALA_UNIT_USERS: User[] = [
  {
    id: 'u-ku-tk',
    username: 'kepala.tk',
    password: 'password123',
    name: 'Kepala Unit TK',
    role: 'kepala_unit',
    division: 'OB',
    unit: 'TK',
    status: 'Aktif',
    phone: '08123456701',
  },
  {
    id: 'u-ku-sd',
    username: 'kepala.sd',
    password: 'password123',
    name: 'Kepala Unit SD',
    role: 'kepala_unit',
    division: 'OB',
    unit: 'SD',
    status: 'Aktif',
    phone: '08123456702',
  },
  {
    id: 'u-ku-smp',
    username: 'kepala.smp',
    password: 'password123',
    name: 'Kepala Unit SMP',
    role: 'kepala_unit',
    division: 'OB',
    unit: 'SMP',
    status: 'Aktif',
    phone: '08123456703',
  },
  {
    id: 'u-ku-pelangi',
    username: 'kepala.pelangi',
    password: 'password123',
    name: 'Kepala Unit Pelangi',
    role: 'kepala_unit',
    division: 'OB',
    unit: 'Pelangi Direktorat',
    status: 'Aktif',
    phone: '08123456704',
  },
  {
    id: 'u-ku-arazi',
    username: 'kepala.arazi',
    password: 'password123',
    name: 'Kepala Unit Ar Razi',
    role: 'kepala_unit',
    division: 'OB',
    unit: 'Ar Razi',
    status: 'Aktif',
    phone: '08123456705',
  },
  {
    id: 'u-ku-khaldun',
    username: 'kepala.khaldun',
    password: 'password123',
    name: 'Kepala Unit Khaldun',
    role: 'kepala_unit',
    division: 'OB',
    unit: 'Khaldun',
    status: 'Aktif',
    phone: '08123456706',
  },
];

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
    name: 'Lili Ariyanto (Kord OB)',
    role: 'kordinator',
    division: 'OB',
    unit: 'Ar Razi',
    status: 'Aktif',
    phone: '081298765432',
  },
  ...SEED_KEPALA_UNIT_USERS,
  ...SEED_PLH_USERS,
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

// Seed Master Tasks for PLH (Sesuai Resmi Database Google Sheet MasterTask_PLH)
// Khusus 5 Area Luar: Area Pos 1, Area Pos 2, Area Khaldun, Area Ex Minifarm, Area Kolam Renang
export const SEED_PLH_MASTER_TASKS: MasterTask[] = [
  {
    id: 'mt-plh-01',
    title: 'Pre-Readiness: Penyiraman Taman & Perapihan Area Pos 1',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    division: 'PLH',
    assignee: 'Rahmat Hidayat (Kord PLH)',
    instructions: [
      'Siram tanaman hias & rumput gerbang utama sebelum terik.',
      'Sapu daun gugur paving drop-off dan trotoar akses utama.',
      'Rapikan selang air pada tempatnya dan pastikan kran tertutup rapat.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 30,
    area: 'Area Pos 1',
    isActive: true,
  },
  {
    id: 'mt-plh-02',
    title: 'Pre-Readiness: Kebersihan Taman & Drainase Area Pos 2',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    division: 'PLH',
    assignee: 'Ahmad Syahril (PLH)',
    instructions: [
      'Sapu serasah daun kering sekeliling Pos 2.',
      'Periksa grill penutup saluran drainase air hujan dari sumbatan dedaunan.',
      'Siram tanaman pot dan tanaman pagar di sekitar Pos 2.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 25,
    area: 'Area Pos 2',
    isActive: true,
  },
  {
    id: 'mt-plh-03',
    title: 'Perawatan Lanskap Terbuka, Taman & Jalur Pedestrian Khaldun',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Andi Komala (PLH)',
    instructions: [
      'Siram tanaman lanskap terbuka dan rumput di Area Khaldun.',
      'Bersihkan jalur pedestrian dari lumut atau daun gugur.',
      'Cek kesehatan pohon dan tanaman peneduh di sekeliling Khaldun.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 30,
    area: 'Area Khaldun',
    isActive: true,
  },
  {
    id: 'mt-plh-04',
    title: 'Pemeliharaan Bedengan Pembibitan, Kompos & Gulma Ex Minifarm',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Dedi Junaedi (PLH)',
    instructions: [
      'Kelola bak komposter organik daun dan semprotkan cairan pengurai bila perlu.',
      'Rapikan bedengan tanaman produktif dan pembibitan.',
      'Cabut rumput liar (weeding) di sekitar area tanam Ex Minifarm.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb2251a?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 45,
    area: 'Area Ex Minifarm',
    isActive: true,
  },
  {
    id: 'mt-plh-05',
    title: 'Pembersihan Daun, Bibir Kolam & Saluran Area Kolam Renang',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Radilah (PLH)',
    instructions: [
      'Jaring serasah dedaunan di permukaan kolam renang.',
      'Sikat deck pinggir kolam renang dari kotoran dan lumut.',
      'Cek sirkulasi pompa filter air dan pastikan saluran overflow lancar.',
    ],
    photoRequired: true,
    estimatedMinutes: 40,
    area: 'Area Kolam Renang',
    isActive: true,
  },
  {
    id: 'mt-plh-06',
    title: 'Clock Out: Perapihan Selang Air, Mesin Rumput & Kerapihan Area',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Bersihkan & keringkan gunting dahan, cangkul, dan mesin potong rumput.',
      'Gulung rapi seluruh selang air pada tempatnya.',
      'Kunci gudang penyimpanan peralatan kerja PLH dengan aman.',
    ],
    photoRequired: true,
    estimatedMinutes: 20,
    area: 'Area Pos 1',
    isActive: true,
  },
];

// Standar Operasional Prosedur (SOP) & Instruksi Pemeriksaan Monitoring Pohon Lazuardi
export const DEFAULT_TREE_SOP_INSTRUCTIONS = [
  'Sudut Pengambilan Foto: Ambil foto dari jarak 5–10 meter agar seluruh pohon tampak utuh (kanopi atas, batang utama, dan perakaran bawah).',
  'Pemeriksaan Kanopi & Dahan: Periksa kerimbunan daun, pastikan bebas dahan rapuh/kering yang rawan patah atau menjuntai ke kabel listrik PLN/atap.',
  'Pemeriksaan Batang & Benalu: Pastikan batang kokoh tegak, bebas dari sarang rayap, lubang lapuk berongga, dan benalu parasit.',
  'Pemeriksaan Daun & Hama: Amati kesegaran daun, pastikan tidak terserang hama ulat bulu, kutu putih, atau jamur daun.',
  'Pemeriksaan Perakaran & Kebersihan: Pastikan tanah perakaran stabil tidak gembur/amblas, serta sekeliling pohon bersih dari serasah sampah.',
];

// Work Orders Khusus Pohon murni bersumber dari Database Resmi Google Sheet (15 Pohon per 5 Area Tanggung Jawab)
export const SEED_TREE_WORK_ORDERS: TreeWorkOrder[] = [
  // 1. Area Kolam Renang (Radilah)
  {
    id: 'two-2026-001',
    date: '2026-09-22',
    area: 'Area Kolam Renang',
    treeName: 'Pohon Trembesi Rimbun Dekat Kolam Renang',
    condition: 'Rimbun',
    treatmentNeeded: 'Penebangan / Topping Pohon Tinggi (Vendor Luar)',
    handlerType: 'Vendor Luar',
    vendorName: 'CV Duta Hijau Pertamanan',
    vendorCost: 2500000,
    scheduledWeek: 'Minggu ke-4 September 2026',
    urgency: 'Tinggi / Bahaya',
    status: 'Dijadwalkan',
    treatmentStatus: 'Belum Ditangani',
    notes: 'Dahan atas menjuntai ke kabel PLN dan atap tribun.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
    reportedBy: 'u-plh-04',
    reportedByName: 'Radilah (PLH)',
    assignedStaffId: 'u-plh-04',
    assignedStaffName: 'Radilah (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:15 WIB',
    lastCheckedByName: 'Radilah (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Pengecekan: dahan tetap stabil.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-014',
    date: '2026-09-22',
    area: 'Area Kolam Renang',
    treeName: 'Pohon Kelapa Gading Sisi Kolam Renang',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Pelepah daun tua dibersihkan.',
    reportedBy: 'u-plh-04',
    reportedByName: 'Radilah (PLH)',
    assignedStaffId: 'u-plh-04',
    assignedStaffName: 'Radilah (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:30 WIB',
    lastCheckedByName: 'Radilah (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Kondisi pelepah aman, bebas hama.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-015',
    date: '2026-09-22',
    area: 'Area Kolam Renang',
    treeName: 'Pohon Beringin Dolar Taman Kolam',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Tajuk rapi dan terawat.',
    reportedBy: 'u-plh-04',
    reportedByName: 'Radilah (PLH)',
    assignedStaffId: 'u-plh-04',
    assignedStaffName: 'Radilah (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:45 WIB',
    lastCheckedByName: 'Radilah (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Tajuk bulat estetis, bebas hama.',
    createdAt: new Date().toISOString(),
  },

  // 2. Area Pos 1 (Rahmat Hidayat)
  {
    id: 'two-2026-004',
    date: '2026-09-22',
    area: 'Area Pos 1',
    treeName: 'Pohon Beringin & Mahoni Pintu Masuk Gerbang Pos 1',
    condition: 'Rimbun',
    treatmentNeeded: 'Penjarangan Kanopi Rimbun',
    handlerType: 'Internal PLH',
    scheduledWeek: 'Minggu ke-4 September 2026',
    urgency: 'Sedang',
    status: 'Perlu Penanganan',
    treatmentStatus: 'Belum Ditangani',
    notes: 'Dahan rimbun condong ke jalur drop-off.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
    reportedBy: 'u-kord-plh',
    reportedByName: 'Rahmat Hidayat (Kord PLH)',
    assignedStaffId: 'u-kord-plh',
    assignedStaffName: 'Rahmat Hidayat (Kord PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '07:30 WIB',
    lastCheckedByName: 'Rahmat Hidayat (Kord PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Pengecekan: dahan lebat mulai sentuh tiang lampu.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-006',
    date: '2026-09-22',
    area: 'Area Pos 1',
    treeName: 'Pohon Mangga Arumanis Depan Pos 1',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Pohon berbuah lebat, dahan bawah tinggi.',
    reportedBy: 'u-kord-plh',
    reportedByName: 'Rahmat Hidayat (Kord PLH)',
    assignedStaffId: 'u-kord-plh',
    assignedStaffName: 'Rahmat Hidayat (Kord PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '07:45 WIB',
    lastCheckedByName: 'Rahmat Hidayat (Kord PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Kondisi sehat, daun hijau segar.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-007',
    date: '2026-09-22',
    area: 'Area Pos 1',
    treeName: 'Pohon Pucuk Merah Pagar Depan Pos 1',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Pagar pucuk merah tumbuh rapi dan segar.',
    reportedBy: 'u-kord-plh',
    reportedByName: 'Rahmat Hidayat (Kord PLH)',
    assignedStaffId: 'u-kord-plh',
    assignedStaffName: 'Rahmat Hidayat (Kord PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:00 WIB',
    lastCheckedByName: 'Rahmat Hidayat (Kord PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Pucuk merah berwarna cerah merata.',
    createdAt: new Date().toISOString(),
  },

  // 3. Area Pos 2 (Ahmad Syahril)
  {
    id: 'two-2026-002',
    date: '2026-09-22',
    area: 'Area Pos 2',
    treeName: 'Pohon Ketapang Kencana Dekat Gerbang Pos 2',
    condition: 'Rimbun',
    treatmentNeeded: 'Penjarangan Kanopi Rimbun',
    handlerType: 'Internal PLH',
    scheduledWeek: 'Minggu ke-4 September 2026',
    urgency: 'Sedang',
    status: 'Sedang Dikerjakan',
    treatmentStatus: 'Sedang Ditangani',
    notes: 'Kanopi daun lebat tutupi lampu malam Pos 2.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    reportedBy: 'u-plh-01',
    reportedByName: 'Ahmad Syahril (PLH)',
    assignedStaffId: 'u-plh-01',
    assignedStaffName: 'Ahmad Syahril (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:10 WIB',
    lastCheckedByName: 'Ahmad Syahril (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Proses pemangkasan berjalan.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-008',
    date: '2026-09-22',
    area: 'Area Pos 2',
    treeName: 'Pohon Mahoni Samping Pos 2',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Batang kokoh tegak lurus, bebas rayap.',
    reportedBy: 'u-plh-01',
    reportedByName: 'Ahmad Syahril (PLH)',
    assignedStaffId: 'u-plh-01',
    assignedStaffName: 'Ahmad Syahril (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:25 WIB',
    lastCheckedByName: 'Ahmad Syahril (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Batang bersih, bebas rayap dan lumut.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-009',
    date: '2026-09-22',
    area: 'Area Pos 2',
    treeName: 'Pohon Palem Kenari Jalur Gerbang 2',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Pelepah rapi tidak menghalangi spanduk.',
    reportedBy: 'u-plh-01',
    reportedByName: 'Ahmad Syahril (PLH)',
    assignedStaffId: 'u-plh-01',
    assignedStaffName: 'Ahmad Syahril (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:40 WIB',
    lastCheckedByName: 'Ahmad Syahril (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Pelepah kering sudah dipangkas tuntas.',
    createdAt: new Date().toISOString(),
  },

  // 4. Area Khaldun (Andi Komala)
  {
    id: 'two-2026-003',
    date: '2026-09-20',
    area: 'Area Khaldun',
    treeName: 'Pohon Flamboyan Area Lanskap Khaldun',
    condition: 'Dahan Kering / Lapuk',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Sedang',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: '3 dahan kering dipangkas rapi.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    reportedBy: 'u-plh-02',
    reportedByName: 'Andi Komala (PLH)',
    assignedStaffId: 'u-plh-02',
    assignedStaffName: 'Andi Komala (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '07:50 WIB',
    lastCheckedByName: 'Andi Komala (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Bekas pangkasan mengering bagus.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-010',
    date: '2026-09-22',
    area: 'Area Khaldun',
    treeName: 'Pohon Angsana Belakang Gedung Khaldun',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Tajuk rindang peneduh taman.',
    reportedBy: 'u-plh-02',
    reportedByName: 'Andi Komala (PLH)',
    assignedStaffId: 'u-plh-02',
    assignedStaffName: 'Andi Komala (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:05 WIB',
    lastCheckedByName: 'Andi Komala (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Daun rimbun hijau merata, aman.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-011',
    date: '2026-09-22',
    area: 'Area Khaldun',
    treeName: 'Pohon Tabebuya Kuning Koridor Khaldun',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Pertumbuhan bunga stabil, perakaran aman.',
    reportedBy: 'u-plh-02',
    reportedByName: 'Andi Komala (PLH)',
    assignedStaffId: 'u-plh-02',
    assignedStaffName: 'Andi Komala (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:20 WIB',
    lastCheckedByName: 'Andi Komala (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Batang bersih, bebas parasit.',
    createdAt: new Date().toISOString(),
  },

  // 5. Area Ex Minifarm (Dedi Junaedi)
  {
    id: 'two-2026-005',
    date: '2026-09-22',
    area: 'Area Ex Minifarm',
    treeName: 'Pohon Mangga & Sengon Samping Bedengan Pembibitan',
    condition: 'Terserang Hama / Benalu',
    treatmentNeeded: 'Pemberian Nutrisi / Obat Hama Batang',
    handlerType: 'Internal PLH',
    urgency: 'Sedang',
    status: 'Sedang Dikerjakan',
    treatmentStatus: 'Sedang Ditangani',
    notes: 'Benalu dahan utama dan rayap sengon.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    reportedBy: 'u-plh-03',
    reportedByName: 'Dedi Junaedi (PLH)',
    assignedStaffId: 'u-plh-03',
    assignedStaffName: 'Dedi Junaedi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:00 WIB',
    lastCheckedByName: 'Dedi Junaedi (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Benalu dicabut 80%, semprot organik sore.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-012',
    date: '2026-09-22',
    area: 'Area Ex Minifarm',
    treeName: 'Pohon Jambu Air Citra Minifarm',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Tajuk rapi di sekeliling bedengan.',
    reportedBy: 'u-plh-03',
    reportedByName: 'Dedi Junaedi (PLH)',
    assignedStaffId: 'u-plh-03',
    assignedStaffName: 'Dedi Junaedi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:15 WIB',
    lastCheckedByName: 'Dedi Junaedi (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Buah mulai pentil, bebas lalat buah.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'two-2026-013',
    date: '2026-09-22',
    area: 'Area Ex Minifarm',
    treeName: 'Pohon Nangka Mini Area Ex Minifarm',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    urgency: 'Rendah',
    status: 'Selesai',
    treatmentStatus: 'Sudah Ditangani',
    notes: 'Batang pendek produktif, tanah gembur.',
    reportedBy: 'u-plh-03',
    reportedByName: 'Dedi Junaedi (PLH)',
    assignedStaffId: 'u-plh-03',
    assignedStaffName: 'Dedi Junaedi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:30 WIB',
    lastCheckedByName: 'Dedi Junaedi (PLH)',
    checkStatusToday: 'Sudah Dicek Aman',
    inspectionNotes: 'Batang kokoh, buah aman terbungkus.',
    createdAt: new Date().toISOString(),
  },
];

// Combine all MasterTasks (OB + PLH)
export const ALL_INITIAL_MASTER_TASKS: MasterTask[] = [
  ...SEED_MASTER_TASKS.map((t) => ({ ...t, division: t.division || ('OB' as const) })),
  ...SEED_PLH_MASTER_TASKS,
];

// Initial Task Logs (Seed is empty, sourced from Google Sheets)
const SEED_TASK_LOGS: TaskLog[] = [];
const SEED_JOB_BARENG: JobBareng[] = [];
const SEED_DINAS_REQUESTS: DinasRequest[] = [];
const SEED_PEER_INSPECTIONS: PeerInspection[] = [];
const SEED_WEEKLY_SCORES: WeeklyScore[] = [];

export const SEED_ADHOC_TASKS: AdhocDailyTask[] = [];

// In-memory active read/write cache to eliminate repeated JSON.parse overhead
const memoryFallbackCache = new Map<string, any>();

// Storage Helper Functions with in-memory caching for maximum speed
export const getStoredItem = <T>(key: string, defaultValue: T): T => {
  if (memoryFallbackCache.has(key)) {
    return memoryFallbackCache.get(key) as T;
  }
  try {
    const item = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (item) {
      const parsed = JSON.parse(item);
      memoryFallbackCache.set(key, parsed);
      return parsed;
    }
    return defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
};

// Clean up heavy base64 data URLs from past days' task logs to prevent localStorage bloat and keep app fast
const freeLocalStorageSpace = () => {
  try {
    const rawLogs = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TASK_LOGS) : null;
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.TASK_LOGS, JSON.stringify(pruned));
      }
      memoryFallbackCache.set(STORAGE_KEYS.TASK_LOGS, pruned);
    }
  } catch (err) {
    console.warn('Could not free localStorage space:', err);
  }
};

// Immediately execute cleanup on startup to prune old heavy photos
try {
  freeLocalStorageSpace();
} catch (e) {
  // ignore
}

export const setStoredItem = <T>(key: string, value: T): void => {
  // Always update in-memory cache instantly for zero latency
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

// Safe timestamp parser that handles timezone strings (WIB, WITA, WIT, etc.) without returning NaN
export function parseSafeTimestamp(dateStr?: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const cleanDate = dateStr.trim();
  const cleanTime = (timeStr || '00:00')
    .replace(/(WIB|WITA|WIT|UTC|GMT|\(|\))/gi, '')
    .trim();

  const dateParts = cleanDate.split('-');
  if (dateParts.length === 3) {
    const y = parseInt(dateParts[0], 10);
    const m = parseInt(dateParts[1], 10) - 1;
    const d = parseInt(dateParts[2], 10);
    const timeParts = cleanTime.split(':');
    const hh = timeParts[0] ? parseInt(timeParts[0], 10) || 0 : 0;
    const mm = timeParts[1] ? parseInt(timeParts[1], 10) || 0 : 0;
    const ss = timeParts[2] ? parseInt(timeParts[2], 10) || 0 : 0;
    const parsed = new Date(y, m, d, hh, mm, ss).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  const direct = new Date(cleanDate).getTime();
  return isNaN(direct) ? 0 : direct;
}

// Storage Service API
export const StorageService = {
  getUsers: (): User[] => {
    const users = getStoredItem<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    if (!users || users.length === 0) {
      setStoredItem(STORAGE_KEYS.USERS, SEED_USERS);
      return SEED_USERS;
    }
    // Clean up old legacy mock users with outdated dummy IDs
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
        !u.name.toLowerCase().includes('ratih purwasih')
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

    // Filter out old obsolete demo usernames so storage strictly matches Google Sheet Users
    const dummyUsernames = [
      'darmanto_plh',
      'slamet_plh',
      'budi_tk',
      'agus_sd',
      'joko_smp',
      'hendra_dir',
      'deni_arazi',
      'rizky_khaldun',
    ];
    const dummyNames = [
      'darmanto',
      'slamet riyadi',
      'budi santoso',
      'agus setiawan',
      'joko susilo',
      'hendra wijaya',
      'deni prasetyo',
      'rizky firmansyah',
    ];
    const demoIds = new Set<string>([]);

    let cleaned = normalized.filter((u) => {
      if (demoIds.has(u.id)) return false;
      const uLower = (u.username || '').toLowerCase();
      const nLower = (u.name || '').toLowerCase();
      if (dummyUsernames.includes(uLower)) return false;
      if (dummyNames.some((d) => nLower.includes(d))) return false;
      return true;
    });

    let needsResave = false;
    if (cleaned.length !== normalized.length) {
      needsResave = true;
    }

    if (cleaned.length === 0) {
      setStoredItem(STORAGE_KEYS.USERS, SEED_USERS);
      return SEED_USERS;
    }

    // Ensure all existing users have division set ('OB' by default unless PLH)
    let updatedUsers = cleaned.map((u) => {
      let mod = { ...u };
      let changed = false;
      if (!mod.division && mod.role !== 'admin') {
        const isPlh = mod.id.includes('plh') || mod.username.includes('plh') || mod.name.includes('(PLH)');
        mod.division = isPlh ? ('PLH' as const) : ('OB' as const);
        changed = true;
      }

      // Pastikan unit & assignedArea staf PLH tersinkronisasi untuk rolling unit tahunan
      if (mod.division === 'PLH' && mod.role !== 'admin') {
        const uUnitLower = (mod.unit || '').trim().toLowerCase();
        if (!mod.unit || uUnitLower === 'semua unit' || uUnitLower === 'semua' || uUnitLower === 'tk') {
          const seedMatch = SEED_PLH_USERS.find((sp) => sp.id === mod.id || sp.username === mod.username);
          if (seedMatch) {
            mod.unit = seedMatch.unit;
            mod.assignedArea = seedMatch.assignedArea;
            changed = true;
          } else if (mod.assignedArea) {
            mod.unit = mod.assignedArea;
            changed = true;
          }
        } else {
          const normArea = normalizePlhArea(mod.unit);
          if (mod.assignedArea !== normArea) {
            mod.assignedArea = normArea;
            changed = true;
          }
        }
      }

      if (changed) {
        needsResave = true;
      }
      return mod;
    });

    // Ensure core seed users (admin, lili, rahmat) are present
    for (const coreUser of SEED_USERS) {
      if (!updatedUsers.some((u) => u.id === coreUser.id || u.username.toLowerCase() === coreUser.username.toLowerCase())) {
        updatedUsers.push(coreUser);
        needsResave = true;
      }
    }

    if (needsResave) {
      setStoredItem(STORAGE_KEYS.USERS, updatedUsers);
    }
    return updatedUsers;
  },
  saveUsers: (users: User[]): void => {
    let list = [...(users || [])];
    // Ensure core seed users are never lost
    for (const coreUser of SEED_USERS) {
      if (!list.some((u) => u.id === coreUser.id || u.username.toLowerCase() === coreUser.username.toLowerCase())) {
        list.push(coreUser);
      }
    }
    setStoredItem(STORAGE_KEYS.USERS, list);
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
    const user = getStoredItem<User | null>(STORAGE_KEYS.ACTIVE_USER, null);
    if (!user) return null;
    const dummyUsernames = [
      'darmanto_plh',
      'slamet_plh',
      'budi_tk',
      'agus_sd',
      'joko_smp',
      'hendra_dir',
      'deni_arazi',
      'rizky_khaldun',
    ];
    const dummyNames = [
      'darmanto',
      'slamet riyadi',
      'budi santoso',
      'agus setiawan',
      'joko susilo',
      'hendra wijaya',
      'deni prasetyo',
      'rizky firmansyah',
    ];
    const uLower = (user.username || '').toLowerCase();
    const nLower = (user.name || '').toLowerCase();
    if (dummyUsernames.includes(uLower) || dummyNames.some((d) => nLower.includes(d))) {
      removeStoredItem(STORAGE_KEYS.ACTIVE_USER);
      return null;
    }
    return user;
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
    const rawTasks = getStoredItem<MasterTask[]>(STORAGE_KEYS.MASTER_TASKS, ALL_INITIAL_MASTER_TASKS);
    if (!rawTasks || rawTasks.length === 0) {
      setStoredItem(STORAGE_KEYS.MASTER_TASKS, ALL_INITIAL_MASTER_TASKS);
      return ALL_INITIAL_MASTER_TASKS;
    }

    // Bersihkan task dummy PLH lama (mt-plh-pr-*, mt-plh-at-*, mt-plh-co-*, mt-plh-wk-*, mt-plh-mo-*)
    // Terutama: "Pre-Readiness: Perawatan Lanskap & Taman Terbuka Area Khaldun"
    const dummyPlhIds = new Set([
      'mt-plh-pr-01', 'mt-plh-pr-02', 'mt-plh-pr-03',
      'mt-plh-at-01', 'mt-plh-at-02', 'mt-plh-at-03',
      'mt-plh-co-01', 'mt-plh-co-02', 'mt-plh-co-03',
      'mt-plh-wk-01', 'mt-plh-wk-02', 'mt-plh-wk-03', 'mt-plh-wk-04', 'mt-plh-wk-05',
      'mt-plh-mo-01', 'mt-plh-mo-02', 'mt-plh-mo-03', 'mt-plh-mo-04'
    ]);
    const cleanedTasks = rawTasks.filter((t) => {
      if (dummyPlhIds.has(t.id)) return false;
      if (t.title.includes('Perawatan Lanskap & Taman Terbuka Area Khaldun')) return false;
      return true;
    });

    const tasks = cleanedTasks.length > 0 ? cleanedTasks : ALL_INITIAL_MASTER_TASKS;
    let hasUpdated = cleanedTasks.length !== rawTasks.length;

    // Ensure every task has division, assignee, and standardPhotoUrl
    let normalizedTasks = tasks.map((t) => {
      let modified = false;
      const updated = { ...t };
      if (!updated.division) {
        const isPlh = updated.id.includes('plh') || updated.title.toLowerCase().includes('plh');
        updated.division = isPlh ? ('PLH' as const) : ('OB' as const);
        modified = true;
      }
      if (!updated.assignee) {
        const seedMatch = ALL_INITIAL_MASTER_TASKS.find((st) => st.id === t.id);
        updated.assignee = seedMatch?.assignee || 'Semua Petugas';
        modified = true;
      }
      if (!updated.standardPhotoUrl) {
        const seedMatch = ALL_INITIAL_MASTER_TASKS.find((st) => st.id === t.id);
        if (seedMatch?.standardPhotoUrl) {
          updated.standardPhotoUrl = seedMatch.standardPhotoUrl;
          modified = true;
        }
      }
      if (modified) {
        hasUpdated = true;
      }
      return updated;
    });

    if (hasUpdated) {
      setStoredItem(STORAGE_KEYS.MASTER_TASKS, normalizedTasks);
    }
    return normalizedTasks;
  },
  saveMasterTasks: (tasks: MasterTask[]): void => {
    setStoredItem(STORAGE_KEYS.MASTER_TASKS, tasks || []);
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
    const dummyKeywords = ['kusnadi', 'slamet', 'petugas kolam'];
    let modified = cleanLogs.length !== (logs || []).length;
    const sanitizedLogs = cleanLogs.map((l) => {
      const uName = (l.userName || '').toLowerCase();
      if (dummyKeywords.some((d) => uName.includes(d))) {
        modified = true;
        return {
          ...l,
          userName: 'Rahmat Hidayat (Kord PLH)',
          userId: 'u-kord-plh',
        };
      }
      return l;
    });
    if (modified) {
      setStoredItem(STORAGE_KEYS.TASK_LOGS, sanitizedLogs);
    }
    return sanitizedLogs;
  },
  saveTaskLogs: (logs: TaskLog[]): void => {
    setStoredItem(STORAGE_KEYS.TASK_LOGS, logs);
  },
  mergeTaskLogs: (remoteLogs: TaskLog[]): TaskLog[] => {
    const localLogs = StorageService.getTaskLogs();
    const mergedMap = new Map<string, TaskLog>();
    // Fast O(1) lookup index: key `${userId/name}_${taskId}_${date}` -> remoteLogId
    const remoteIndexMap = new Map<string, string>();

    // 1. First index remote logs
    remoteLogs.forEach((rLog) => {
      if (rLog && (rLog.id || rLog.taskId)) {
        mergedMap.set(rLog.id, { ...rLog });

        const rDate = normalizeDateString(rLog.date) || normalizeDateString(rLog.timestamp) || '';
        const rTask = (rLog.taskId || '').trim().toLowerCase();
        if (rDate && rTask) {
          if (rLog.userId) {
            remoteIndexMap.set(`${rLog.userId.trim().toLowerCase()}_${rTask}_${rDate}`, rLog.id);
          }
          if (rLog.userName) {
            remoteIndexMap.set(`${rLog.userName.trim().toLowerCase()}_${rTask}_${rDate}`, rLog.id);
          }
        }
      }
    });

    // 2. Merge local logs without losing newly completed work (O(1) lookups)
    localLogs.forEach((lLog) => {
      let matchedKey: string | null = null;
      if (mergedMap.has(lLog.id)) {
        matchedKey = lLog.id;
      } else {
        const lDate = normalizeDateString(lLog.date) || normalizeDateString(lLog.timestamp) || '';
        const lTask = (lLog.taskId || '').trim().toLowerCase();
        if (lDate && lTask) {
          if (lLog.userId && remoteIndexMap.has(`${lLog.userId.trim().toLowerCase()}_${lTask}_${lDate}`)) {
            matchedKey = remoteIndexMap.get(`${lLog.userId.trim().toLowerCase()}_${lTask}_${lDate}`)!;
          } else if (lLog.userName && remoteIndexMap.has(`${lLog.userName.trim().toLowerCase()}_${lTask}_${lDate}`)) {
            matchedKey = remoteIndexMap.get(`${lLog.userName.trim().toLowerCase()}_${lTask}_${lDate}`)!;
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

    const sorted = Array.from(mergedMap.values()).sort((a, b) => {
      const dateA = a.date || a.timestamp || '';
      const dateB = b.date || b.timestamp || '';
      return dateB.localeCompare(dateA);
    });

    // Keep active logs lightweight (maximum 250 rows in local cache) while protecting all of today's work
    const today = getJakartaDateString();
    let result = sorted;
    if (sorted.length > 250) {
      const todayLogs = sorted.filter((l) => isSameDay(l.date, today) || isSameDay(l.timestamp, today));
      const olderLogs = sorted.filter((l) => !isSameDay(l.date, today) && !isSameDay(l.timestamp, today)).slice(0, 250 - todayLogs.length);
      result = [...todayLogs, ...olderLogs];
    }

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
    const dummyIds = new Set(['jb-001', 'jb-plh-001', 'jb-dummy', 'jb-test']);
    const cleanJobs = (jobs || []).filter((j) => {
      if (!j || !j.id) return false;
      if (dummyIds.has(j.id)) return false;
      const t = (j.title || '').toLowerCase();
      if (t.includes('pasca hujan lebat') || t.includes('kerja bakti lapangan & area parkir')) return false;
      return true;
    });
    if (cleanJobs.length !== (jobs || []).length) {
      setStoredItem(STORAGE_KEYS.JOB_BARENG, cleanJobs);
    }
    return cleanJobs;
  },
  saveJobBareng: (jobs: JobBareng[]): void => {
    setStoredItem(STORAGE_KEYS.JOB_BARENG, jobs || []);
  },
  mergeJobBareng: (remoteJobs: JobBareng[]): JobBareng[] => {
    const dummyIds = new Set(['jb-001', 'jb-plh-001', 'jb-dummy', 'jb-test']);
    const cleanRemote = (remoteJobs || []).filter((j) => {
      if (!j || !j.id || dummyIds.has(j.id)) return false;
      const t = (j.title || '').toLowerCase();
      if (t.includes('pasca hujan lebat') || t.includes('kerja bakti lapangan & area parkir')) return false;
      return true;
    });

    const pendingQueue = StorageService.getPendingQueue();
    const pendingJobIds = new Set(
      pendingQueue.filter((p) => p.type === 'jobBareng').map((p) => p.payload?.id).filter(Boolean)
    );

    const localJobs = StorageService.getJobBareng();
    const jobMap = new Map<string, JobBareng>();

    cleanRemote.forEach((rJob) => {
      jobMap.set(rJob.id, { ...rJob });
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
      } else if (pendingJobIds.has(lJob.id)) {
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
  mergeWeeklyScores: (remoteScores: WeeklyScore[]): WeeklyScore[] => {
    const local = StorageService.getWeeklyScores();
    const map = new Map<string, WeeklyScore>();

    remoteScores.forEach((r) => {
      if (r && r.id) {
        map.set(r.id, { ...r });
      }
    });

    local.forEach((l) => {
      if (!map.has(l.id)) {
        map.set(l.id, l);
      } else {
        const r = map.get(l.id)!;
        const kordScore = r.kordinatorScore ?? l.kordinatorScore ?? (r.evaluatorRole === 'kordinator' ? r.score : l.score);
        const kuScore = r.kepalaUnitScore ?? l.kepalaUnitScore;
        let accScore = r.accumulatedScore ?? l.accumulatedScore;
        if (kordScore !== undefined && kuScore !== undefined) {
          accScore = Number(((kordScore + kuScore) / 2).toFixed(2));
        } else if (kordScore !== undefined) {
          accScore = kordScore;
        } else if (kuScore !== undefined) {
          accScore = kuScore;
        }

        map.set(l.id, {
          ...r,
          kordinatorScore: kordScore,
          kordinatorName: r.kordinatorName || l.kordinatorName,
          kepalaUnitScore: kuScore,
          kepalaUnitName: r.kepalaUnitName || l.kepalaUnitName,
          kepalaUnitNotes: r.kepalaUnitNotes || l.kepalaUnitNotes,
          accumulatedScore: accScore,
          score: accScore ?? r.score,
          evaluatorRole: (kordScore !== undefined && kuScore !== undefined) ? 'gabungan' : (r.evaluatorRole || l.evaluatorRole),
        });
      }
    });

    const result = Array.from(map.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    StorageService.saveWeeklyScores(result);
    return result;
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
      const existing = list[existingIndex];
      let merged: WeeklyScore = { ...existing };

      if (score.evaluatorRole === 'kepala_unit') {
        const kuScore = score.kepalaUnitScore ?? score.score;
        merged.kepalaUnitScore = kuScore;
        merged.kepalaUnitName = score.kepalaUnitName || score.kordinatorName;
        merged.kepalaUnitNotes = score.kepalaUnitNotes || score.notes;
        merged.kepalaUnitCategoryScores = score.kepalaUnitCategoryScores || score.categoryScores;
        merged.timestamp = new Date().toISOString();

        // Akumulasi dengan nilai Kordinator jika sudah ada
        if (existing.kordinatorScore !== undefined && existing.kordinatorScore > 0) {
          merged.accumulatedScore = Number(((existing.kordinatorScore + kuScore) / 2).toFixed(2));
          merged.score = merged.accumulatedScore;
          merged.evaluatorRole = 'gabungan';
        } else if (existing.score > 0 && existing.evaluatorRole !== 'kepala_unit') {
          merged.kordinatorScore = existing.score;
          merged.accumulatedScore = Number(((existing.score + kuScore) / 2).toFixed(2));
          merged.score = merged.accumulatedScore;
          merged.evaluatorRole = 'gabungan';
        } else {
          merged.accumulatedScore = kuScore;
          merged.score = kuScore;
          merged.evaluatorRole = 'kepala_unit';
        }
      } else {
        // Penilaian dari Kordinator
        const kordScore = score.kordinatorScore ?? score.score;
        merged.kordinatorScore = kordScore;
        merged.kordinatorName = score.kordinatorName;
        merged.kordinatorNotes = score.kordinatorNotes || score.notes;
        merged.kordinatorCategoryScores = score.categoryScores;
        merged.categoryScores = score.categoryScores;
        merged.notes = score.notes;
        merged.timestamp = new Date().toISOString();

        // Akumulasi dengan nilai Kepala Unit jika sudah ada
        if (existing.kepalaUnitScore !== undefined && existing.kepalaUnitScore > 0) {
          merged.accumulatedScore = Number(((kordScore + existing.kepalaUnitScore) / 2).toFixed(2));
          merged.score = merged.accumulatedScore;
          merged.evaluatorRole = 'gabungan';
        } else {
          merged.accumulatedScore = kordScore;
          merged.score = kordScore;
          merged.evaluatorRole = 'kordinator';
        }
      }

      list[existingIndex] = merged;
    } else {
      // Data baru
      const newScore: WeeklyScore = { ...score };
      if (newScore.evaluatorRole === 'kepala_unit') {
        newScore.kepalaUnitScore = newScore.kepalaUnitScore ?? newScore.score;
        newScore.accumulatedScore = newScore.kepalaUnitScore;
      } else {
        newScore.kordinatorScore = newScore.kordinatorScore ?? newScore.score;
        newScore.accumulatedScore = newScore.kordinatorScore;
        newScore.evaluatorRole = 'kordinator';
      }
      list.unshift(newScore);
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

  // Offline / Retry Pending Queue for 100% Reliable Sync to Google Sheets
  getPendingQueue: (): PendingSyncItem[] => {
    return getStoredItem<PendingSyncItem[]>(STORAGE_KEYS.PENDING_QUEUE, []);
  },
  addToPendingQueue: (item: Omit<PendingSyncItem, 'retryCount'>): void => {
    const queue = StorageService.getPendingQueue();
    const existingIdx = queue.findIndex((q) => q.id === item.id);
    if (existingIdx >= 0) {
      queue[existingIdx] = { ...queue[existingIdx], ...item, retryCount: queue[existingIdx].retryCount || 0 };
    } else {
      queue.push({ ...item, retryCount: 0 });
    }
    setStoredItem(STORAGE_KEYS.PENDING_QUEUE, queue);
  },
  removeFromPendingQueue: (id: string): void => {
    const queue = StorageService.getPendingQueue().filter((q) => q.id !== id);
    setStoredItem(STORAGE_KEYS.PENDING_QUEUE, queue);
  },
  incrementPendingRetry: (id: string): void => {
    const queue = StorageService.getPendingQueue().map((q) => {
      if (q.id === id) {
        return { ...q, retryCount: (q.retryCount || 0) + 1 };
      }
      return q;
    });
    setStoredItem(STORAGE_KEYS.PENDING_QUEUE, queue);
  },
  clearPendingQueue: (): void => {
    setStoredItem(STORAGE_KEYS.PENDING_QUEUE, []);
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

  // Tree Work Orders (Murni bersumber dari database Google Sheet WorkOrder_Pohon)
  getTreeWorkOrders: (): TreeWorkOrder[] => {
    const rawList = getStoredItem<TreeWorkOrder[]>(STORAGE_KEYS.TREE_WORK_ORDERS, SEED_TREE_WORK_ORDERS);
    const list = rawList && rawList.length > 0 ? rawList : SEED_TREE_WORK_ORDERS;
    if (!list || list.length === 0) {
      return [];
    }
    let modified = false;
    let enriched = list.map((order) => {
      let changed = false;
      const ord: TreeWorkOrder = { ...order };

      // Pastikan nama penanggung jawab dan pelapor sinkron dengan data resmi Google Sheet
      const dummyKeywords = [
        'kusnadi',
        'bambang',
        'surya wijaya',
        'ahmad fauzi',
        'petugas kolam',
        'slamet',
        'slamet riyadi',
      ];
      const correctStaff = (ord.area && DEFAULT_PLH_AREA_STAFF[ord.area])
        ? DEFAULT_PLH_AREA_STAFF[ord.area]
        : { id: 'u-kord-plh', name: 'Rahmat Hidayat (Kord PLH)' };

      const isDummyStaff =
        !ord.assignedStaffName ||
        dummyKeywords.some((d) => (ord.assignedStaffName || '').toLowerCase().includes(d));

      if (isDummyStaff) {
        ord.assignedStaffId = correctStaff.id;
        ord.assignedStaffName = correctStaff.name;
        changed = true;
      }

      if (!ord.reportedByName || dummyKeywords.some((d) => (ord.reportedByName || '').toLowerCase().includes(d))) {
        ord.reportedByName = correctStaff.name;
        ord.reportedBy = correctStaff.id;
        changed = true;
      }

      if (!ord.lastCheckedByName || dummyKeywords.some((d) => (ord.lastCheckedByName || '').toLowerCase().includes(d))) {
        ord.lastCheckedByName = correctStaff.name;
        changed = true;
      }

      if (ord.completedByName && dummyKeywords.some((d) => ord.completedByName!.toLowerCase().includes(d))) {
        ord.completedByName = correctStaff.name;
        ord.completedBy = correctStaff.id;
        changed = true;
      }

      if (ord.handledByName && dummyKeywords.some((d) => ord.handledByName!.toLowerCase().includes(d))) {
        ord.handledByName = correctStaff.name;
        changed = true;
      }

      if (ord.inspectionHistory && ord.inspectionHistory.length > 0) {
        ord.inspectionHistory = ord.inspectionHistory.map((rec) => {
          const updatedRec = { ...rec };
          if (!updatedRec.inspectorName || dummyKeywords.some((d) => (updatedRec.inspectorName || '').toLowerCase().includes(d))) {
            updatedRec.inspectorName = correctStaff.name;
            updatedRec.inspectorId = correctStaff.id;
            changed = true;
          }
          if (updatedRec.handledByName && dummyKeywords.some((d) => updatedRec.handledByName!.toLowerCase().includes(d))) {
            updatedRec.handledByName = correctStaff.name;
            changed = true;
          }
          return updatedRec;
        });
      }

      // Initialize Treatment Status if not present
      if (!ord.treatmentStatus) {
        if (ord.status === 'Selesai') {
          ord.treatmentStatus = 'Sudah Ditangani';
        } else if (ord.status === 'Sedang Dikerjakan') {
          ord.treatmentStatus = 'Sedang Ditangani';
        } else if (ord.status === 'Perlu Penanganan' || ord.status === 'Dijadwalkan') {
          ord.treatmentStatus = 'Belum Ditangani';
        } else {
          ord.treatmentStatus = ord.condition === 'Normal / Sehat' ? 'Tidak Perlu Penanganan' : 'Belum Ditangani';
        }
        changed = true;
      }

      // Initialize Inspection History if empty
      if (!ord.inspectionHistory || ord.inspectionHistory.length === 0) {
        ord.inspectionHistory = [
          {
            id: `tir-init-${ord.id}`,
            treeId: ord.id,
            date: ord.lastCheckedDate || ord.date,
            time: ord.lastCheckedTime || '08:00 WIB',
            inspectorId: ord.reportedBy,
            inspectorName: ord.lastCheckedByName || ord.reportedByName,
            condition: ord.condition,
            checkStatus: ord.status === 'Perlu Penanganan' ? 'Perlu Penanganan' : 'Sudah Dicek Aman',
            notes: ord.inspectionNotes || ord.notes,
            treatmentNeeded: ord.treatmentNeeded,
            treatmentStatus: ord.treatmentStatus,
            handledByName: ord.handledByName || (ord.status === 'Selesai' ? ord.completedByName : undefined),
            handledAt: ord.handledAt || (ord.status === 'Selesai' ? ord.completedAt : undefined),
            treatmentReport: ord.treatmentReport,
            photoBeforeUrl: ord.photoBeforeUrl,
            photoAfterUrl: ord.photoAfterUrl,
            drivePhotoBeforeUrl: ord.drivePhotoBeforeUrl,
            drivePhotoAfterUrl: ord.drivePhotoAfterUrl,
            timestamp: ord.createdAt || new Date().toISOString(),
          },
        ];
        changed = true;
      }

      if (!ord.checkStatusToday) {
        ord.checkStatusToday = ord.status === 'Perlu Penanganan' ? 'Perlu Penanganan' : 'Belum Dicek';
        changed = true;
      }

      // Pastikan standar foto & instruksi SOP monitoring pohon selalu lengkap dan tersinkron
      if (!ord.standardPhotoUrl || !ord.standardPhotoAngleGuide || !ord.standardInstructions || ord.standardInstructions.length === 0) {
        const seedMatch = SEED_TREE_WORK_ORDERS.find((s) => s.id === ord.id || (s.area === ord.area && s.treeName === ord.treeName));
        if (seedMatch) {
          if (!ord.standardPhotoUrl && seedMatch.standardPhotoUrl) {
            ord.standardPhotoUrl = seedMatch.standardPhotoUrl;
            changed = true;
          }
          if (!ord.standardPhotoAngleGuide && seedMatch.standardPhotoAngleGuide) {
            ord.standardPhotoAngleGuide = seedMatch.standardPhotoAngleGuide;
            changed = true;
          }
          if ((!ord.standardInstructions || ord.standardInstructions.length === 0) && seedMatch.standardInstructions) {
            ord.standardInstructions = seedMatch.standardInstructions;
            changed = true;
          }
        }
        if (!ord.standardInstructions || ord.standardInstructions.length === 0) {
          ord.standardInstructions = DEFAULT_TREE_SOP_INSTRUCTIONS;
          changed = true;
        }
        if (!ord.standardPhotoAngleGuide) {
          ord.standardPhotoAngleGuide = 'Ambil foto dari jarak 5–10 meter agar seluruh pohon tampak utuh (kanopi atas, batang utama, dan perakaran bawah).';
          changed = true;
        }
      }

      if (changed) modified = true;
      return ord;
    });

    if (modified) {
      setStoredItem(STORAGE_KEYS.TREE_WORK_ORDERS, enriched);
    }
    return enriched;
  },
  saveTreeWorkOrders: (orders: TreeWorkOrder[]): void => {
    setStoredItem(STORAGE_KEYS.TREE_WORK_ORDERS, orders || []);
  },
  mergeTreeWorkOrders: (remoteOrders: TreeWorkOrder[]): TreeWorkOrder[] => {
    const local = StorageService.getTreeWorkOrders();
    const map = new Map<string, TreeWorkOrder>();

    // Index remote trees first
    remoteOrders.forEach((r) => {
      if (r && r.id) {
        map.set(r.id, { ...r });
      }
    });

    const today = getJakartaDateString();

    // Merge with local trees so local checks / inspections / photos are never lost
    local.forEach((l) => {
      if (!map.has(l.id)) {
        map.set(l.id, l);
      } else {
        const r = map.get(l.id)!;
        // Merge inspection histories safely
        const historyMap = new Map<string, any>();
        (r.inspectionHistory || []).forEach((h) => {
          if (h && h.id) historyMap.set(h.id, h);
        });
        (l.inspectionHistory || []).forEach((h) => {
          if (h && h.id && !historyMap.has(h.id)) historyMap.set(h.id, h);
        });
        const mergedHistory = Array.from(historyMap.values()).sort(
          (a, b) =>
            parseSafeTimestamp(b.timestamp || b.date, b.time) -
            parseSafeTimestamp(a.timestamp || a.date, a.time)
        );

        // Check which one has newer inspection using timezone-safe timestamp parser
        const lTime = parseSafeTimestamp(l.lastCheckedDate, l.lastCheckedTime);
        const rTime = parseSafeTimestamp(r.lastCheckedDate, r.lastCheckedTime);
        const isLocalToday = l.lastCheckedDate === today;
        const isRemoteToday = r.lastCheckedDate === today;

        let isLocalNewerOrEqual = false;
        if (isLocalToday && !isRemoteToday) {
          isLocalNewerOrEqual = true;
        } else if (lTime > 0 && rTime > 0) {
          isLocalNewerOrEqual = lTime >= rTime;
        } else if (l.lastCheckedDate && (!r.lastCheckedDate || l.lastCheckedDate >= r.lastCheckedDate)) {
          isLocalNewerOrEqual = true;
        } else if (
          l.checkStatusToday &&
          l.checkStatusToday !== 'Belum Dicek' &&
          (!r.checkStatusToday || r.checkStatusToday === 'Belum Dicek')
        ) {
          isLocalNewerOrEqual = true;
        }

        map.set(l.id, {
          ...(isLocalNewerOrEqual ? r : l),
          ...(isLocalNewerOrEqual ? l : r),
          inspectionHistory: mergedHistory.length > 0 ? mergedHistory.slice(0, 15) : undefined,
          checkStatusToday: isLocalNewerOrEqual
            ? (l.checkStatusToday || r.checkStatusToday)
            : (r.checkStatusToday || l.checkStatusToday),
          lastCheckedDate: isLocalNewerOrEqual
            ? (l.lastCheckedDate || r.lastCheckedDate)
            : (r.lastCheckedDate || l.lastCheckedDate),
          lastCheckedTime: isLocalNewerOrEqual
            ? (l.lastCheckedTime || r.lastCheckedTime)
            : (r.lastCheckedTime || l.lastCheckedTime),
          lastCheckedByName: isLocalNewerOrEqual
            ? (l.lastCheckedByName || r.lastCheckedByName)
            : (r.lastCheckedByName || l.lastCheckedByName),
          // Crucial: preserve photos from both local and remote so a photo is NEVER lost!
          photoBeforeUrl: l.photoBeforeUrl || r.photoBeforeUrl,
          photoAfterUrl: l.photoAfterUrl || r.photoAfterUrl,
          drivePhotoBeforeUrl: l.drivePhotoBeforeUrl || r.drivePhotoBeforeUrl,
          drivePhotoAfterUrl: l.drivePhotoAfterUrl || r.drivePhotoAfterUrl,
          lastCheckedPhotoUrl:
            l.lastCheckedPhotoUrl ||
            r.lastCheckedPhotoUrl ||
            l.photoBeforeUrl ||
            r.photoBeforeUrl,
          treatmentStatus:
            (isLocalNewerOrEqual ? l.treatmentStatus : r.treatmentStatus) ||
            l.treatmentStatus ||
            r.treatmentStatus,
          status:
            (isLocalNewerOrEqual ? l.status : r.status) || l.status || r.status,
          condition:
            (isLocalNewerOrEqual ? l.condition : r.condition) ||
            l.condition ||
            r.condition,
          treatmentNeeded:
            (isLocalNewerOrEqual ? l.treatmentNeeded : r.treatmentNeeded) ||
            l.treatmentNeeded ||
            r.treatmentNeeded,
          notes:
            (isLocalNewerOrEqual ? l.notes : r.notes) || l.notes || r.notes,
          inspectionNotes:
            (isLocalNewerOrEqual ? l.inspectionNotes : r.inspectionNotes) ||
            l.inspectionNotes ||
            r.inspectionNotes,
          standardPhotoUrl: l.standardPhotoUrl || r.standardPhotoUrl,
          standardPhotoAngleGuide:
            l.standardPhotoAngleGuide || r.standardPhotoAngleGuide,
          standardInstructions:
            l.standardInstructions || r.standardInstructions,
        });
      }
    });

    const result = Array.from(map.values());
    StorageService.saveTreeWorkOrders(result);
    return result;
  },
  addTreeWorkOrder: (order: TreeWorkOrder): void => {
    const list = StorageService.getTreeWorkOrders();
    list.unshift(order);
    StorageService.saveTreeWorkOrders(list);
  },
  updateTreeWorkOrder: (order: TreeWorkOrder): void => {
    const list = StorageService.getTreeWorkOrders();
    const index = list.findIndex((o) => o.id === order.id);
    if (index !== -1) {
      list[index] = order;
      StorageService.saveTreeWorkOrders(list);
    }
  },
  deleteTreeWorkOrder: (id: string): void => {
    const list = StorageService.getTreeWorkOrders().filter((o) => o.id !== id);
    StorageService.saveTreeWorkOrders(list);
  },

  // Pekerjaan Tambahan / Mandiri Harian Staf PLH (Hanya Masuk Work Order Hari Itu Saja)
  getAdhocDailyTasks: (date?: string): AdhocDailyTask[] => {
    const raw = getStoredItem<AdhocDailyTask[]>(STORAGE_KEYS.ADHOC_DAILY_TASKS, []);
    const list = Array.isArray(raw) ? raw : [];
    const cleaned = list.filter(
      (t) =>
        t &&
        t.id &&
        !t.id.startsWith('adhoc-seed-') &&
        !t.id.toLowerCase().includes('dummy') &&
        !t.id.toLowerCase().includes('seed')
    );
    if (cleaned.length !== list.length) {
      StorageService.saveAdhocDailyTasks(cleaned);
    }
    if (!date) return cleaned;
    return cleaned.filter((t) => isSameDay(t.date, date) || isSameDay(t.createdAt, date));
  },
  saveAdhocDailyTasks: (tasks: AdhocDailyTask[]): void => {
    setStoredItem(STORAGE_KEYS.ADHOC_DAILY_TASKS, tasks);
  },
  addAdhocDailyTask: (task: AdhocDailyTask): void => {
    const list = StorageService.getAdhocDailyTasks();
    list.unshift(task);
    StorageService.saveAdhocDailyTasks(list);

    // Otomatis masukkan log ke TaskLogs (sync ke TaskLogs_PLH di Google Sheet)
    const logId = `tl-adhoc-${task.id}`;
    const taskLog: TaskLog = {
      id: logId,
      timestamp: task.createdAt || new Date().toISOString(),
      date: task.date,
      userId: task.userId,
      userName: task.userName,
      userRole: 'user',
      division: task.division || 'PLH',
      unit: 'Semua Unit',
      taskId: task.id,
      taskTitle: `[Tugas Tambahan PLH] ${task.title} (${task.area})`,
      category: 'Insidental',
      isIncidental: true,
      timingType: 'anytime',
      status: task.status === 'Selesai' ? 'Selesai' : 'Pending',
      isLate: false,
      photoUrl: task.photoUrl,
      notes: task.notes,
      area: task.area,
    };
    const logs = StorageService.getTaskLogs();
    if (!logs.some((l) => l.id === logId)) {
      logs.unshift(taskLog);
      StorageService.saveTaskLogs(logs);
    }
  },

  // Record a new inspection in tree history
  addTreeInspectionRecord: (treeId: string, record: TreeInspectionRecord): TreeWorkOrder | null => {
    const list = StorageService.getTreeWorkOrders();
    const index = list.findIndex((o) => o.id === treeId);
    if (index === -1) return null;

    const order = { ...list[index] };
    const history = [...(order.inspectionHistory || [])];
    history.unshift(record);
    // Keep max 15 inspection records to avoid localStorage quota issues
    order.inspectionHistory = history.slice(0, 15);
    order.lastCheckedDate = record.date;
    order.lastCheckedTime = record.time;
    order.lastCheckedByName = record.inspectorName;
    order.condition = record.condition;
    order.checkStatusToday = record.checkStatus === 'Perlu Penanganan' ? 'Perlu Penanganan' : 'Sudah Dicek Aman';
    order.inspectionNotes = record.notes || order.inspectionNotes || 'Pemeriksaan rutin: Kondisi terpantau aman.';
    order.notes = record.notes || order.inspectionNotes || order.notes || 'Pemeriksaan rutin: Kondisi terpantau aman.';

    if (record.photoBeforeUrl || record.photoUrl) {
      order.photoBeforeUrl = record.photoBeforeUrl || record.photoUrl;
      order.lastCheckedPhotoUrl = record.photoBeforeUrl || record.photoUrl;
    }
    if (record.photoAfterUrl) {
      order.photoAfterUrl = record.photoAfterUrl;
    }
    if (record.drivePhotoBeforeUrl || record.drivePhotoUrl) {
      order.drivePhotoBeforeUrl = record.drivePhotoBeforeUrl || record.drivePhotoUrl;
      order.lastCheckedDrivePhotoUrl = record.drivePhotoBeforeUrl || record.drivePhotoUrl;
      if (!order.photoBeforeUrl || order.photoBeforeUrl.startsWith('data:')) {
        order.photoBeforeUrl = order.drivePhotoBeforeUrl;
      }
      if (!order.lastCheckedPhotoUrl || order.lastCheckedPhotoUrl.startsWith('data:')) {
        order.lastCheckedPhotoUrl = order.drivePhotoBeforeUrl;
      }
    }
    if (record.drivePhotoAfterUrl) {
      order.drivePhotoAfterUrl = record.drivePhotoAfterUrl;
      if (!order.photoAfterUrl || order.photoAfterUrl.startsWith('data:')) {
        order.photoAfterUrl = record.drivePhotoAfterUrl;
      }
    }

    if (record.treatmentStatus) {
      order.treatmentStatus = record.treatmentStatus;
      if (record.treatmentStatus === 'Sudah Ditangani') {
        order.status = 'Selesai';
        order.completedAt = record.handledAt || new Date().toISOString();
        order.completedByName = record.handledByName || record.inspectorName;
      } else if (record.treatmentStatus === 'Sedang Ditangani') {
        order.status = 'Sedang Dikerjakan';
      } else if (record.treatmentStatus === 'Belum Ditangani') {
        order.status = 'Perlu Penanganan';
      }
    } else if (record.checkStatus === 'Perlu Penanganan') {
      order.status = 'Perlu Penanganan';
      order.treatmentStatus = 'Belum Ditangani';
    }

    if (record.treatmentNeeded) {
      order.treatmentNeeded = record.treatmentNeeded as any;
    }
    if (record.handlerType) {
      order.handlerType = record.handlerType;
      order.isLargeTreatment = record.isLargeTreatment !== undefined ? record.isLargeTreatment : record.handlerType === 'Vendor Luar';
    }
    if (record.vendorName !== undefined) {
      order.vendorName = record.vendorName;
    }
    if (record.vendorCost !== undefined) {
      order.vendorCost = record.vendorCost;
    }
    if (record.treatmentReport) {
      order.treatmentReport = record.treatmentReport;
    }
    if (record.handledByName) {
      order.handledByName = record.handledByName;
    }
    if (record.handledAt) {
      order.handledAt = record.handledAt;
    }

    list[index] = order;
    StorageService.saveTreeWorkOrders(list);
    return order;
  },

  // Update treatment report & after photo
  updateTreeTreatmentReport: (
    treeId: string,
    data: {
      treatmentStatus: TreeTreatmentStatus;
      handledByName: string;
      handledAt: string;
      treatmentReport: string;
      photoAfterUrl?: string;
      drivePhotoAfterUrl?: string;
      condition?: any;
      inspectorUser: User;
    }
  ): TreeWorkOrder | null => {
    const list = StorageService.getTreeWorkOrders();
    const index = list.findIndex((o) => o.id === treeId);
    if (index === -1) return null;

    const order = { ...list[index] };
    order.treatmentStatus = data.treatmentStatus;
    order.handledByName = data.handledByName;
    order.handledAt = data.handledAt;
    order.treatmentReport = data.treatmentReport;

    if (data.photoAfterUrl) {
      order.photoAfterUrl = data.photoAfterUrl;
    }
    if (data.drivePhotoAfterUrl) {
      order.drivePhotoAfterUrl = data.drivePhotoAfterUrl;
      if (!order.photoAfterUrl || order.photoAfterUrl.startsWith('data:')) {
        order.photoAfterUrl = data.drivePhotoAfterUrl;
      }
    }
    if (data.condition) {
      order.condition = data.condition;
    }

    if (data.treatmentStatus === 'Sudah Ditangani') {
      order.status = 'Selesai';
      order.completedAt = data.handledAt;
      order.completedBy = data.inspectorUser.id;
      order.completedByName = data.handledByName;
      order.checkStatusToday = 'Sudah Dicek Aman';
    } else if (data.treatmentStatus === 'Sedang Ditangani') {
      order.status = 'Sedang Dikerjakan';
    }

    // Append to inspection history
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const dateStr = getJakartaDateString();

    const historyRecord: TreeInspectionRecord = {
      id: `tir-${Date.now()}`,
      treeId: order.id,
      date: dateStr,
      time: timeStr,
      inspectorId: data.inspectorUser.id,
      inspectorName: data.inspectorUser.name,
      condition: data.condition || order.condition,
      checkStatus: data.treatmentStatus === 'Sudah Ditangani' ? 'Sudah Ditangani' : 'Dalam Penanganan',
      notes: `Update Penanganan: ${data.treatmentReport}`,
      treatmentNeeded: order.treatmentNeeded,
      treatmentStatus: data.treatmentStatus,
      handledByName: data.handledByName,
      handledAt: data.handledAt,
      treatmentReport: data.treatmentReport,
      photoBeforeUrl: order.photoBeforeUrl,
      photoAfterUrl: data.photoAfterUrl || order.photoAfterUrl,
      drivePhotoBeforeUrl: order.drivePhotoBeforeUrl,
      drivePhotoAfterUrl: data.drivePhotoAfterUrl || order.drivePhotoAfterUrl,
      timestamp: now.toISOString(),
    };

    order.inspectionHistory = [historyRecord, ...(order.inspectionHistory || [])];
    list[index] = order;
    StorageService.saveTreeWorkOrders(list);
    return order;
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
    setStoredItem(STORAGE_KEYS.TREE_WORK_ORDERS, SEED_TREE_WORK_ORDERS);
    setStoredItem(STORAGE_KEYS.MASJID_DUTY_CONFIG, {});
  },

  // Configuration for Rolling Piket Aula Masjid (Area & Waktu Pelaksanaan)
  getMasjidDutyConfig: (): MasjidDutyConfig => {
    return getStoredItem<MasjidDutyConfig>(STORAGE_KEYS.MASJID_DUTY_CONFIG, {});
  },
  saveMasjidDutyConfig: (config: MasjidDutyConfig): void => {
    setStoredItem(STORAGE_KEYS.MASJID_DUTY_CONFIG, config);
  },

  // Reset Tree Work Orders specifically to initial official 15 trees
  resetTreeWorkOrdersToDefault: (): TreeWorkOrder[] => {
    setStoredItem(STORAGE_KEYS.TREE_WORK_ORDERS, SEED_TREE_WORK_ORDERS);
    return SEED_TREE_WORK_ORDERS;
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
  targetUnit: UnitType | string,
  inspectorDivision?: DivisionType,
  targetDivision?: DivisionType
): boolean => {
  // Cross-division inspection between OB and PLH is not permitted
  if (inspectorDivision && targetDivision && inspectorDivision !== targetDivision) {
    return false;
  }

  if (inspectorRole === 'admin' || inspectorRole === 'kordinator') {
    return true; // Admin dan Kordinator dapat menginspeksi seluruh anggota/unit di divisinya
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

  // 0. Strict Division Separation (OB vs PLH)
  const userDivision = user.division || 'OB';
  const taskDivision = task.division || 'OB';
  if (userDivision !== taskDivision) {
    return false;
  }

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

  // 1b. PLH Area & User Enforcement: Staf & Kordinator PLH hanya melihat tugas hariannya masing-masing
  if (userDivision === 'PLH') {
    // Tugas Piket Rolling Masjid: Hanya untuk staf yang sedang giliran piket masjid minggu ini!
    const isMasjidRollingTask =
      task.id === 'mt-plh-wk-05' ||
      task.id.toLowerCase().includes('rolling') ||
      task.title.toLowerCase().includes('aula masjid') ||
      task.title.toLowerCase().includes('rolling') ||
      task.title.toLowerCase().includes('piket rolling') ||
      (task.area || '').toLowerCase().includes('rolling') ||
      (task.area || '').toLowerCase().includes('aula masjid');

    if (isMasjidRollingTask) {
      const userArea = user.assignedArea || user.unit || '';
      if (!isAreaOnMasjidDutyThisWeek(userArea)) {
        return false;
      }
    }

    const assignee = (task.assignee || '').trim().toLowerCase();
    const uUsername = (user.username || '').toLowerCase();
    const uId = (user.id || '').toLowerCase();
    const uName = (user.name || '').toLowerCase();
    const uCleanName = user.name.replace(/\(.*\)/, '').trim().toLowerCase();
    const userArea = (user.assignedArea || user.unit || '').trim().toLowerCase();
    const taskArea = (task.area || '').trim().toLowerCase();

    // 1. Cek apakah tugas secara spesifik ditugaskan ke user ini
    const isAssignedToThisUser = Boolean(
      (assignee && (
        assignee.includes(uUsername) ||
        assignee.includes(uId) ||
        assignee.includes(uName) ||
        assignee.includes(uCleanName) ||
        uName.includes(assignee) ||
        uCleanName.includes(assignee)
      )) ||
      (task.assigneeId && (task.assigneeId === user.id || task.assigneeId === user.username)) ||
      (task.assigneeName && (
        task.assigneeName.toLowerCase().includes(uCleanName) ||
        uName.includes(task.assigneeName.toLowerCase())
      ))
    );

    // 2. Daftar nama staf PLH lainnya untuk proteksi agar tugas staf lain (seperti Dedi) tidak masuk ke Rahmat Hidayat
    const knownPlhStaffTokens = ['rahmat', 'syahril', 'komala', 'andi', 'junaedi', 'dedi', 'radilah'];
    const otherStaffMentioned = knownPlhStaffTokens.filter(
      (token) => !uName.includes(token) && !uCleanName.includes(token) && assignee.includes(token)
    );

    if (otherStaffMentioned.length > 0 && !isAssignedToThisUser) {
      // Tugas ini milik staf lain secara spesifik -> jangan tampilkan!
      return false;
    }

    if (isAssignedToThisUser) {
      return true;
    }

    // 3. Jika tugas memiliki area spesifik PLH (Area Pos 1, Area Pos 2, Area Khaldun, Area Ex Minifarm, Area Kolam Renang)
    if (taskArea && userArea && taskArea !== 'semua unit' && taskArea !== 'semua area' && !taskArea.includes('rolling')) {
      const isAreaMatch = taskArea === userArea || taskArea.includes(userArea) || userArea.includes(taskArea);
      if (isAreaMatch) {
        return true;
      } else {
        // Area berbeda (misal Rahmat di Area Pos 1 sedangkan tugas di Area Ex Minifarm milik Dedi)
        return false;
      }
    }

    // 4. Tugas umum bersama seluruh PLH (misal: mt-plh-06 Clock Out / perapihan gudang alat)
    const isForAllPlh =
      !assignee ||
      assignee === 'semua' ||
      assignee === 'semua petugas' ||
      assignee === 'semua petugas (plh)' ||
      assignee === 'semua staff' ||
      assignee === 'semua plh';

    if (isForAllPlh) {
      return true;
    }

    return false;
  }

  // 2. Kordinator manages all tasks in their assigned division and unit/building (Untuk OB)
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
    assignee === 'petugas unit' ||
    assignee.startsWith('petugas unit') ||
    assignee.startsWith('semua petugas')
  ) {
    // If assignee explicitly mentions a specific unit like "Petugas Unit TK (OB)" or "Petugas Unit SD (OB)":
    const unitKeywords = ['tk', 'sd', 'smp', 'pelangi', 'ar razi', 'khaldun', 'pos 1', 'pos 2', 'kolam'];
    const specifiedUnit = unitKeywords.find((kw) => assignee.includes(kw));
    if (specifiedUnit) {
      if (userHasAllUnits) return true;
      if (uUnit.includes(specifiedUnit) || specifiedUnit.includes(uUnit)) return true;
      return false;
    }
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
    if (
      token === 'semua' ||
      token === 'semua petugas' ||
      token === 'semua staff' ||
      token === 'semua ob' ||
      token === 'semua og' ||
      token.startsWith('petugas unit')
    ) {
      return true;
    }
    return (
      token === uUsername ||
      token === uId ||
      token === uName ||
      token === uCleanName ||
      uUsername.includes(token) ||
      uName.includes(token) ||
      uCleanName.includes(token) ||
      token.includes(uUsername) ||
      token.includes(uCleanName) ||
      (uUnit && (token.includes(uUnit) || uUnit.includes(token)))
    );
  });
};

