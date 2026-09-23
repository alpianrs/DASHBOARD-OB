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
  DEFAULT_PLH_AREA_STAFF,
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
  PENDING_QUEUE: 'lz_fm_pending_sync_queue',
  TREE_WORK_ORDERS: 'lz_fm_tree_work_orders',
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
export const SEED_PLH_USERS: User[] = [
  {
    id: 'u-kord-plh',
    username: 'slamet_plh',
    password: 'password123',
    name: 'Slamet Riyadi (Kord PLH)',
    role: 'kordinator',
    division: 'PLH',
    unit: 'Semua Unit',
    assignedArea: 'Semua Area (Supervisi)',
    status: 'Aktif',
    phone: '08129999001',
  },
  {
    id: 'u-plh-01',
    username: 'bambang_plh',
    password: 'password123',
    name: 'Bambang Irawan (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Semua Unit',
    assignedArea: 'Area Pos 1',
    status: 'Aktif',
    phone: '08129999002',
  },
  {
    id: 'u-plh-02',
    username: 'surya_plh',
    password: 'password123',
    name: 'Surya Wijaya (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Semua Unit',
    assignedArea: 'Area Pos 2',
    status: 'Aktif',
    phone: '08129999003',
  },
  {
    id: 'u-plh-03',
    username: 'kusnadi_plh',
    password: 'password123',
    name: 'Kusnadi (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Semua Unit',
    assignedArea: 'Area Khaldun',
    status: 'Aktif',
    phone: '08129999004',
  },
  {
    id: 'u-plh-04',
    username: 'fauzi_plh',
    password: 'password123',
    name: 'Ahmad Fauzi (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Semua Unit',
    assignedArea: 'Area Ex Minifarm',
    status: 'Aktif',
    phone: '08129999005',
  },
  {
    id: 'u-plh-05',
    username: 'darmanto_plh',
    password: 'password123',
    name: 'Darmanto (PLH)',
    role: 'user',
    division: 'PLH',
    unit: 'Semua Unit',
    assignedArea: 'Area Kolam Renang',
    status: 'Aktif',
    phone: '08129999006',
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

// Seed Master Tasks for PLH (Pekerja Lingkungan Hidup)
// Khusus 5 Area Luar: Area Pos 1, Area Pos 2, Area Khaldun, Area Ex Minifarm, Area Kolam Renang
export const SEED_PLH_MASTER_TASKS: MasterTask[] = [
  // PRE-READINESS PLH (00:00 - 09:00)
  {
    id: 'mt-plh-pr-01',
    title: 'Pre-Readiness: Penyiraman Taman & Perapihan Area Pos 1',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Siram seluruh tanaman hias, pohon kecil, dan rumput di sekitar gerbang dan Area Pos 1 sebelum terik pagi.',
      'Sapu bersih daun gugur dan ranting di paving dan trotoar akses utama.',
      'Pastikan selang air dirapikan kembali dan tidak melintang di jalan.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 30,
    area: 'Area Pos 1',
    isActive: true,
  },
  {
    id: 'mt-plh-pr-02',
    title: 'Pre-Readiness: Kebersihan Taman & Drainase Area Pos 2',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Sapu bersih daun kering dan sampah luar di sekeliling Area Pos 2.',
      'Periksa grill penutup selokan drainase air hujan dari sumbatan daun/plastik.',
      'Siram tanaman pot dan tanaman pagar di sekitar Pos 2.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 25,
    area: 'Area Pos 2',
    isActive: true,
  },
  {
    id: 'mt-plh-pr-03',
    title: 'Pre-Readiness: Perawatan Lanskap & Taman Terbuka Area Khaldun',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'pre_readiness',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Siram tanaman lanskap terbuka dan rumput di Area Khaldun.',
      'Kumpulkan daun kering ke keranjang untuk bahan komposter.',
      'Pastikan area pedestrian Khaldun bersih dari lumut dan genangan air.',
    ],
    photoRequired: true,
    estimatedMinutes: 25,
    area: 'Area Khaldun',
    isActive: true,
  },

  // ANYTIME / OPERASIONAL HARIAN PLH
  {
    id: 'mt-plh-at-01',
    title: 'Pemeliharaan Tanaman, Bedengan & Kompos Area Ex Minifarm',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Pangkas gulma / rumput liar (weeding) di sekitar bedengan dan tanaman produktif Ex Minifarm.',
      'Kelola bak komposter organik daun dan semprotkan cairan pengurai jika perlu.',
      'Rapikan tumpukan daun dan pastikan area pembibitan bersih dan tertata.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb2251a?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 45,
    area: 'Area Ex Minifarm',
    isActive: true,
  },
  {
    id: 'mt-plh-at-02',
    title: 'Pembersihan Daun, Bibir Kolam & Saluran Area Kolam Renang',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Jaring daun-daun dan ranting yang jatuh ke permukaan kolam renang.',
      'Sapu dan sikat deck pinggir kolam dari lumut dan kotoran tanah.',
      'Pangkas dahan pohon yang menjuntai terlalu dekat ke air kolam.',
    ],
    photoRequired: true,
    estimatedMinutes: 40,
    area: 'Area Kolam Renang',
    isActive: true,
  },
  {
    id: 'mt-plh-at-03',
    title: 'Pemangkasan Dahan Rendah & Pengecekan Pohon Rawan Tumbang',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Inspeksi keliling 5 area luar untuk mengecek pohon yang condong atau ranting lapuk.',
      'Potong dahan yang berpotensi patah atau menghalangi jalur lintasan.',
      'Laporkan ke kordinator bila ada pohon besar yang membutuhkan penanganan insidental.',
    ],
    photoRequired: false,
    estimatedMinutes: 35,
    area: 'Area Khaldun',
    isActive: true,
  },

  // CLOCK OUT PLH (09:00 - 23:59)
  {
    id: 'mt-plh-co-01',
    title: 'Clock Out: Penyiraman Sore & Cek Sirkulasi Area Kolam Renang',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Siram kembali tanaman lanskap di sekitar Kolam Renang dan Area Pos 1.',
      'Pastikan saluran overflow kolam bersih dari dedaunan.',
      'Matikan kran air utama luar setelah penyiraman sore selesai.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 30,
    area: 'Area Kolam Renang',
    isActive: true,
  },
  {
    id: 'mt-plh-co-02',
    title: 'Clock Out: Perapihan Peralatan, Mesin Rumput & Gudang PLH',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Bersihkan dan keringkan gunting tanaman, sabit, cangkul, dan mesin potong rumput.',
      'Gulung rapi seluruh selang air pada tempatnya di Area Ex Minifarm / Pos.',
      'Kunci gudang penyimpanan alat kerja PLH dengan aman.',
    ],
    photoRequired: true,
    estimatedMinutes: 20,
    area: 'Area Ex Minifarm',
    isActive: true,
  },
  {
    id: 'mt-plh-co-03',
    title: 'Clock Out: Pengangkutan Sampah Dedaunan 5 Area Luar ke TPS',
    unit: 'Semua Unit',
    category: 'Harian',
    timingType: 'clock_out',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Angkut seluruh hasil sapuan daun kering dari Pos 1, Pos 2, Khaldun, Ex Minifarm, dan Kolam Renang ke TPS.',
      'Pastikan tidak ada tumpukan daun berserakan di trotoar atau pinggir lapangan.',
      'Tutup rapat bak sampah luar agar tidak diacak hewan.',
    ],
    photoRequired: true,
    estimatedMinutes: 30,
    area: 'Area Pos 1',
    isActive: true,
  },

  // MINGGUAN PLH (Reset Setiap Hari Senin)
  {
    id: 'mt-plh-wk-01',
    title: 'Mingguan: Pemangkasan Pagar Tanaman, Semak & Topiary 5 Area Luar',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Gunakan gunting dahan dan mesin pemotong semak untuk meratakan tinggi pagar tanaman.',
      'Bentuk rapi tanaman hias di sepanjang trotoar Pos 1, Pos 2, Khaldun, dan Minifarm.',
      'Sapu bersih serpihan daun hasil pangkasan dan kumpulkan ke polybag kompos.',
    ],
    photoRequired: true,
    standardPhotoUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb2251a?auto=format&fit=crop&w=800&q=80',
    estimatedMinutes: 60,
    area: '5 Area Luar PLH',
    isActive: true,
  },
  {
    id: 'mt-plh-wk-02',
    title: 'Mingguan: Pemupukan Organik, Penggemburan Tanah & Penanganan Hama Kutu Daun',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Gemburkan tanah di sekeliling perakaran tanaman pot dan bedengan Ex Minifarm.',
      'Berikan pupuk kompos organik matang secukupnya pada media tanam.',
      'Cek tanda kutu putih atau jamur pada batang/daun dan semprotkan cairan pestisida nabati jika perlu.',
    ],
    photoRequired: true,
    estimatedMinutes: 50,
    area: 'Area Ex Minifarm',
    isActive: true,
  },
  {
    id: 'mt-plh-wk-03',
    title: 'Mingguan: Pembersihan Sedimen Lumpur & Sampah Saluran Drainase Terbuka Luar',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Buka penutup grill besi selokan di sepanjang lintasan luar dan Area Pos 2.',
      'Keruk endapan lumpur, pasir, dan daun busuk yang menumpuk di dasar saluran air hujan.',
      'Siram saluran dengan air hingga aliran lancar menuju pembuangan kota.',
    ],
    photoRequired: true,
    estimatedMinutes: 55,
    area: 'Area Pos 2',
    isActive: true,
  },
  {
    id: 'mt-plh-wk-04',
    title: 'Mingguan: Deep Cleaning Kolam Renang (Vacuum Dasar Keramik & Sikat Dinding)',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Pasang selang vacuum head dan jalankan penyedotan endapan kotoran dasar kolam.',
      'Sikat lumut pada sambungan keramik dinding kolam renang.',
      'Lakukan backwash dan rinse pada tabung filter pompa sirkulasi kolam.',
    ],
    photoRequired: true,
    estimatedMinutes: 75,
    area: 'Area Kolam Renang',
    isActive: true,
  },
  {
    id: 'mt-plh-wk-05',
    title: 'Mingguan: Piket Kebersihan & Kesiapan Aula Masjid (Rolling Mingguan PLH)',
    unit: 'Semua Unit',
    category: 'Mingguan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Tugas ini bergilir otomatis setiap minggu (reset Senin) untuk Area Pos 2, Kolam Renang, Ex Minifarm, dan Khaldun (Area Pos 1 Dikecualikan).',
      'Vacuum seluruh karpet sajadah Aula Masjid dari debu dan kotoran.',
      'Lap mimbar, rak Al-Quran, jendela kaca, dan wudhu luar masjid.',
      'Pastikan pendingin/kipas angin dan wewangian karpet terpasang rapi untuk ibadah.',
    ],
    photoRequired: true,
    estimatedMinutes: 45,
    area: 'Aula Masjid (Rolling PLH)',
    isActive: true,
  },

  // BULANAN PLH (Reset Setiap Tanggal 1)
  {
    id: 'mt-plh-mo-01',
    title: 'Bulanan: Inspeksi & Treatment Kanopi Pohon Rimbun Seluruh Kampus',
    unit: 'Semua Unit',
    category: 'Bulanan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Inspeksi keliling seluruh pohon besar di 5 area luar kampus Lazuardi.',
      'Identifikasi pohon rimbun yang membahayakan genteng atau kabel listrik (Work Order Pohon).',
      'Lakukan penanganan internal untuk dahan rendah, dan jadwalkan Vendor Luar untuk treatment pohon besar/tinggi.',
    ],
    photoRequired: true,
    estimatedMinutes: 90,
    area: '5 Area Luar PLH',
    isActive: true,
  },
  {
    id: 'mt-plh-mo-02',
    title: 'Bulanan: Pemanenan & Pengayakan Kompos Matang Ex Minifarm',
    unit: 'Semua Unit',
    category: 'Bulanan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Bongkar bak komposter daun organik yang sudah terurai sempurna di Minifarm.',
      'Ayak kompos halus dan masukkan ke karung penyimpanan.',
      'Distribusikan kompos matang ke area taman TK, SD, SMP, dan pot koridor.',
    ],
    photoRequired: true,
    estimatedMinutes: 80,
    area: 'Area Ex Minifarm',
    isActive: true,
  },
  {
    id: 'mt-plh-mo-03',
    title: 'Bulanan: Overhaul & Servis Rutin Mesin Potong Rumput & Alat Kerja PLH',
    unit: 'Semua Unit',
    category: 'Bulanan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Ganti oli mesin potong rumput dan bersihkan busi serta filter udara.',
      'Asah mata pisau pemotong rumput dan gunting dahan agar tajam maksimal.',
      'Periksa selang air, sambungan kran luar, dan inventaris alat di gudang PLH.',
    ],
    photoRequired: true,
    estimatedMinutes: 60,
    area: 'Area Ex Minifarm',
    isActive: true,
  },
  {
    id: 'mt-plh-mo-04',
    title: 'Bulanan: Pengecatan Ulang & Perbaikan Fisik Batas Taman / Pagar Luar',
    unit: 'Semua Unit',
    category: 'Bulanan',
    timingType: 'anytime',
    division: 'PLH',
    assignee: 'Semua Petugas',
    instructions: [
      'Cat ulang pembatas taman / kansteen yang kusam atau berlumut di sekitar Pos 1 & Khaldun.',
      'Perbaiki tiang bambu penyangga pohon muda yang patah atau miring.',
      'Pastikan papan penunjuk tanaman dan marka taman terbaca jelas.',
    ],
    photoRequired: true,
    estimatedMinutes: 90,
    area: 'Area Pos 1',
    isActive: true,
  },
];

// Seed Work Orders Khusus Pohon untuk PLH (5 Wilayah Lengkap)
export const SEED_TREE_WORK_ORDERS: TreeWorkOrder[] = [
  // 1. Area Kolam Renang (Darmanto)
  {
    id: 'two-2026-001',
    date: '2026-09-22',
    area: 'Area Kolam Renang',
    treeName: 'Pohon Trembesi Rimbun Dekat Kolam Renang',
    condition: 'Rimbun',
    treatmentNeeded: 'Penebangan / Topping Pohon Tinggi (Vendor Luar)',
    handlerType: 'Vendor Luar',
    isLargeTreatment: true,
    vendorName: 'CV Duta Hijau Pertamanan',
    vendorCost: 2500000,
    scheduledWeek: 'Minggu ke-4 September 2026',
    urgency: 'Tinggi / Bahaya',
    notes: 'Pohon sangat rimbun dengan tinggi ±12 meter. Dahan atas menjuntai ke kabel listrik utama PLN dan atap tribun kolam. Membutuhkan mobil crane dan vendor berpengalaman.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
    status: 'Dijadwalkan',
    reportedBy: 'u-plh-05',
    reportedByName: 'Darmanto (PLH)',
    assignedStaffId: 'u-plh-05',
    assignedStaffName: 'Darmanto (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:15 WIB',
    lastCheckedByName: 'Darmanto (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Pengecekan rutin pagi: Dahan atas dekat kabel PLN tetap stabil, vendor dijadwalkan akhir pekan ini.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:00:00.000Z',
  },
  {
    id: 'two-2026-014',
    date: '2026-09-22',
    area: 'Area Kolam Renang',
    treeName: 'Pohon Kelapa Gading Sisi Kolam Renang',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Pelepah daun tua yang mengering telah dibersihkan agar tidak jatuh ke area kolam.',
    status: 'Selesai',
    reportedBy: 'u-plh-05',
    reportedByName: 'Darmanto (PLH)',
    assignedStaffId: 'u-plh-05',
    assignedStaffName: 'Darmanto (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:30 WIB',
    lastCheckedByName: 'Darmanto (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Kondisi pelepah aman, buah kelapa tidak ada yang rawan jatuh.',
    syncedToSheet: true,
    createdAt: '2026-09-21T09:00:00.000Z',
  },
  {
    id: 'two-2026-015',
    date: '2026-09-22',
    area: 'Area Kolam Renang',
    treeName: 'Pohon Beringin Dolar Taman Kolam',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Bentuk tajuk rapi, penyiraman rutin terjaga.',
    status: 'Selesai',
    reportedBy: 'u-plh-05',
    reportedByName: 'Darmanto (PLH)',
    assignedStaffId: 'u-plh-05',
    assignedStaffName: 'Darmanto (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:45 WIB',
    lastCheckedByName: 'Darmanto (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Tajuk bulat estetis, bebas hama.',
    syncedToSheet: true,
    createdAt: '2026-09-21T09:15:00.000Z',
  },

  // 2. Area Pos 1 (Bambang Irawan)
  {
    id: 'two-2026-004',
    date: '2026-09-22',
    area: 'Area Pos 1',
    treeName: 'Pohon Beringin & Mahoni Pintu Masuk Gerbang Pos 1',
    condition: 'Rimbun',
    treatmentNeeded: 'Penjarangan Kanopi Rimbun',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    scheduledWeek: 'Minggu ke-4 September 2026',
    urgency: 'Sedang',
    notes: 'Dahan rimbun condong ke jalur drop-off penjemputan siswa. Perlu penjarangan kanopi agar pandangan pengemudi leluasa dan sirkulasi cahaya taman Pos 1 optimal.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
    status: 'Perlu Penanganan',
    reportedBy: 'u-plh-01',
    reportedByName: 'Bambang Irawan (PLH)',
    assignedStaffId: 'u-plh-01',
    assignedStaffName: 'Bambang Irawan (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '07:30 WIB',
    lastCheckedByName: 'Bambang Irawan (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Pengecekan pagi: Dahan lebat mulai menyentuh tiang lampu gerbang. Rencana pangkas siang ini.',
    syncedToSheet: true,
    createdAt: '2026-09-21T07:45:00.000Z',
  },
  {
    id: 'two-2026-006',
    date: '2026-09-22',
    area: 'Area Pos 1',
    treeName: 'Pohon Mangga Arumanis Depan Pos 1',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Pohon berbuah lebat, dahan bawah cukup tinggi dari pejalan kaki.',
    status: 'Selesai',
    reportedBy: 'u-plh-01',
    reportedByName: 'Bambang Irawan (PLH)',
    assignedStaffId: 'u-plh-01',
    assignedStaffName: 'Bambang Irawan (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '07:45 WIB',
    lastCheckedByName: 'Bambang Irawan (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Kondisi sehat, daun hijau segar, media tanah lembap seimbang.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:00:00.000Z',
  },
  {
    id: 'two-2026-007',
    date: '2026-09-22',
    area: 'Area Pos 1',
    treeName: 'Pohon Pucuk Merah Pagar Depan Pos 1',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Pagar pucuk merah tumbuh rapi dan segar, telah dilakukan pemangkasan bentuk kotak.',
    status: 'Selesai',
    reportedBy: 'u-plh-01',
    reportedByName: 'Bambang Irawan (PLH)',
    assignedStaffId: 'u-plh-01',
    assignedStaffName: 'Bambang Irawan (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:00 WIB',
    lastCheckedByName: 'Bambang Irawan (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Pucuk merah berwarna cerah merata, batas pagar rapi.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:10:00.000Z',
  },

  // 3. Area Pos 2 (Surya Wijaya)
  {
    id: 'two-2026-002',
    date: '2026-09-22',
    area: 'Area Pos 2',
    treeName: 'Pohon Ketapang Kencana Dekat Gerbang Pos 2',
    condition: 'Rimbun',
    treatmentNeeded: 'Penjarangan Kanopi Rimbun',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    scheduledWeek: 'Minggu ke-4 September 2026',
    urgency: 'Sedang',
    notes: 'Kanopi daun lebat menutupi sorot lampu penerangan malam Pos 2 dan CCTV gerbang. Dilakukan pemangkasan dahan selektif oleh tim internal PLH.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    status: 'Sedang Dikerjakan',
    reportedBy: 'u-plh-02',
    reportedByName: 'Surya Wijaya (PLH)',
    assignedStaffId: 'u-plh-02',
    assignedStaffName: 'Surya Wijaya (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:10 WIB',
    lastCheckedByName: 'Surya Wijaya (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Proses pemangkasan dahan lapis bawah sedang berjalan bersama tim.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:30:00.000Z',
  },
  {
    id: 'two-2026-008',
    date: '2026-09-22',
    area: 'Area Pos 2',
    treeName: 'Pohon Mahoni Samping Pos 2',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Batang kokoh tegak lurus, tidak ada tanda-tanda pengeroposan.',
    status: 'Selesai',
    reportedBy: 'u-plh-02',
    reportedByName: 'Surya Wijaya (PLH)',
    assignedStaffId: 'u-plh-02',
    assignedStaffName: 'Surya Wijaya (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:25 WIB',
    lastCheckedByName: 'Surya Wijaya (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Batang bersih, bebas rayap dan lumut tebal.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:45:00.000Z',
  },
  {
    id: 'two-2026-009',
    date: '2026-09-22',
    area: 'Area Pos 2',
    treeName: 'Pohon Palem Kenari Jalur Gerbang 2',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Pelepah bawah rutin dipotong, tajuk terawat rapi.',
    status: 'Selesai',
    reportedBy: 'u-plh-02',
    reportedByName: 'Surya Wijaya (PLH)',
    assignedStaffId: 'u-plh-02',
    assignedStaffName: 'Surya Wijaya (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:40 WIB',
    lastCheckedByName: 'Surya Wijaya (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Palem tegak kokoh, tidak mengganggu jalur mobil pengantar.',
    syncedToSheet: true,
    createdAt: '2026-09-21T09:00:00.000Z',
  },

  // 4. Area Khaldun (Kusnadi)
  {
    id: 'two-2026-003',
    date: '2026-09-20',
    area: 'Area Khaldun',
    treeName: 'Pohon Flamboyan Area Lanskap Khaldun',
    condition: 'Dahan Kering / Lapuk',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Sedang',
    notes: 'Terdapat 3 dahan kering rawan patah di dekat jalur pedestrian siswa. Telah dipangkas rapi dan dahan dipotong kecil untuk komposter.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    status: 'Selesai',
    reportedBy: 'u-plh-03',
    reportedByName: 'Kusnadi (PLH)',
    assignedStaffId: 'u-plh-03',
    assignedStaffName: 'Kusnadi (PLH)',
    completedAt: '2026-09-20T14:30:00.000Z',
    completedBy: 'u-plh-03',
    completedByName: 'Kusnadi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '07:50 WIB',
    lastCheckedByName: 'Kusnadi (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Bekas pangkasan telah mengering bagus, tidak ada dahan rapuh baru.',
    syncedToSheet: true,
    createdAt: '2026-09-20T09:00:00.000Z',
  },
  {
    id: 'two-2026-010',
    date: '2026-09-22',
    area: 'Area Khaldun',
    treeName: 'Pohon Angsana Belakang Gedung Khaldun',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Peneduh halaman belakang gedung Khaldun, daun lebat rindang.',
    status: 'Selesai',
    reportedBy: 'u-plh-03',
    reportedByName: 'Kusnadi (PLH)',
    assignedStaffId: 'u-plh-03',
    assignedStaffName: 'Kusnadi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:05 WIB',
    lastCheckedByName: 'Kusnadi (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Pohon kokoh, serasah daun kering telah disapu bersih.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:30:00.000Z',
  },
  {
    id: 'two-2026-011',
    date: '2026-09-22',
    area: 'Area Khaldun',
    treeName: 'Pohon Tabebuya Kuning Koridor Khaldun',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Penyangga / Penegakan Batang',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Pohon muda dengan penyangga bambu, mulai berbunga kuning.',
    status: 'Selesai',
    reportedBy: 'u-plh-03',
    reportedByName: 'Kusnadi (PLH)',
    assignedStaffId: 'u-plh-03',
    assignedStaffName: 'Kusnadi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:20 WIB',
    lastCheckedByName: 'Kusnadi (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Tali pengikat penyangga bambu kuat dan tidak melukai kulit batang.',
    syncedToSheet: true,
    createdAt: '2026-09-21T09:00:00.000Z',
  },

  // 5. Area Ex Minifarm (Ahmad Fauzi)
  {
    id: 'two-2026-005',
    date: '2026-09-22',
    area: 'Area Ex Minifarm',
    treeName: 'Pohon Mangga & Sengon Samping Bedengan Pembibitan',
    condition: 'Terserang Hama / Benalu',
    treatmentNeeded: 'Pemberian Nutrisi / Obat Hama Batang',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Sedang',
    notes: 'Ditemukan sarang benalu pada dahan utama pohon mangga dan rayap pada pangkal batang sengon. Dilakukan pembersihan benalu manual dan penyemprotan insektisida organik.',
    photoBeforeUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    status: 'Sedang Dikerjakan',
    reportedBy: 'u-plh-04',
    reportedByName: 'Ahmad Fauzi (PLH)',
    assignedStaffId: 'u-plh-04',
    assignedStaffName: 'Ahmad Fauzi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:00 WIB',
    lastCheckedByName: 'Ahmad Fauzi (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Benalu sudah dicabut 80%, penyemprotan anti-rayap organik diulang sore.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:15:00.000Z',
  },
  {
    id: 'two-2026-012',
    date: '2026-09-22',
    area: 'Area Ex Minifarm',
    treeName: 'Pohon Jambu Air Citra Minifarm',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Pohon jambu berbuah, dahan teratur rapi.',
    status: 'Selesai',
    reportedBy: 'u-plh-04',
    reportedByName: 'Ahmad Fauzi (PLH)',
    assignedStaffId: 'u-plh-04',
    assignedStaffName: 'Ahmad Fauzi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:20 WIB',
    lastCheckedByName: 'Ahmad Fauzi (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Buah jambu dibungkus plastik pelindung lalat buah, daun segar.',
    syncedToSheet: true,
    createdAt: '2026-09-21T08:45:00.000Z',
  },
  {
    id: 'two-2026-013',
    date: '2026-09-22',
    area: 'Area Ex Minifarm',
    treeName: 'Pohon Nangka Mini Area Ex Minifarm',
    condition: 'Normal / Sehat',
    treatmentNeeded: 'Pemangkasan Ringan (Pruning Dahan Bawah)',
    handlerType: 'Internal PLH',
    isLargeTreatment: false,
    urgency: 'Rendah',
    notes: 'Tumbuh subur dekat batas pagar samping minifarm.',
    status: 'Selesai',
    reportedBy: 'u-plh-04',
    reportedByName: 'Ahmad Fauzi (PLH)',
    assignedStaffId: 'u-plh-04',
    assignedStaffName: 'Ahmad Fauzi (PLH)',
    lastCheckedDate: '2026-09-22',
    lastCheckedTime: '08:35 WIB',
    lastCheckedByName: 'Ahmad Fauzi (PLH)',
    checkStatusToday: 'Sudah Dicek',
    inspectionNotes: 'Batang bersih, daun rimbun sehat terkendali.',
    syncedToSheet: true,
    createdAt: '2026-09-21T09:10:00.000Z',
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

    // Ensure all existing users have division set ('OB' by default unless PLH)
    let needsResave = false;
    let updatedUsers = normalized.map((u) => {
      if (!u.division && u.role !== 'admin') {
        const isPlh = u.id.includes('plh') || u.username.includes('plh') || u.name.includes('(PLH)');
        needsResave = true;
        return { ...u, division: isPlh ? ('PLH' as const) : ('OB' as const) };
      }
      return u;
    });

    // Ensure all 5 PLH users are present in the list
    for (const plhUser of SEED_PLH_USERS) {
      if (!updatedUsers.some((u) => u.id === plhUser.id || u.username === plhUser.username)) {
        updatedUsers.push(plhUser);
        needsResave = true;
      }
    }

    // Ensure all PLH users have assignedArea properly set
    updatedUsers = updatedUsers.map((u) => {
      if (u.division === 'PLH' && !u.assignedArea) {
        needsResave = true;
        if (u.role === 'kordinator') {
          return { ...u, assignedArea: 'Semua Area (Supervisi)' };
        }
        if (u.username === 'bambang_plh' || u.name.includes('Bambang')) {
          return { ...u, assignedArea: 'Area Pos 1' };
        }
        if (u.username === 'surya_plh' || u.name.includes('Surya')) {
          return { ...u, assignedArea: 'Area Pos 2' };
        }
        if (u.username === 'kusnadi_plh' || u.name.includes('Kusnadi')) {
          return { ...u, assignedArea: 'Area Khaldun' };
        }
        if (u.username === 'fauzi_plh' || u.name.includes('Fauzi')) {
          return { ...u, assignedArea: 'Area Ex Minifarm' };
        }
        if (u.username === 'darmanto_plh' || u.name.includes('Darmanto')) {
          return { ...u, assignedArea: 'Area Kolam Renang' };
        }
        return { ...u, assignedArea: 'Area Pos 1' };
      }
      return u;
    });

    if (
      needsResave ||
      updatedUsers.length !== users.length ||
      updatedUsers.some((u, i) => u.name !== users[i]?.name)
    ) {
      setStoredItem(STORAGE_KEYS.USERS, updatedUsers);
    }
    return updatedUsers;
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
    const tasks = getStoredItem<MasterTask[]>(STORAGE_KEYS.MASTER_TASKS, ALL_INITIAL_MASTER_TASKS);
    if (!tasks || tasks.length === 0) {
      setStoredItem(STORAGE_KEYS.MASTER_TASKS, ALL_INITIAL_MASTER_TASKS);
      return ALL_INITIAL_MASTER_TASKS;
    }
    // Ensure every task has division, assignee, and standardPhotoUrl
    let hasUpdated = false;
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

    // Ensure PLH tasks are present
    for (const plhTask of SEED_PLH_MASTER_TASKS) {
      if (!normalizedTasks.some((t) => t.id === plhTask.id)) {
        normalizedTasks.push(plhTask);
        hasUpdated = true;
      }
    }

    if (hasUpdated) {
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

  // Tree Work Orders (Penanganan Khusus Pohon untuk PLH & Vendor Luar)
  getTreeWorkOrders: (): TreeWorkOrder[] => {
    const list = getStoredItem<TreeWorkOrder[]>(STORAGE_KEYS.TREE_WORK_ORDERS, SEED_TREE_WORK_ORDERS);
    if (!list || list.length === 0) {
      setStoredItem(STORAGE_KEYS.TREE_WORK_ORDERS, SEED_TREE_WORK_ORDERS);
      return SEED_TREE_WORK_ORDERS;
    }
    let modified = false;
    let enriched = list.map((order) => {
      let changed = false;
      const ord: TreeWorkOrder = { ...order };
      if (!ord.assignedStaffName && DEFAULT_PLH_AREA_STAFF[ord.area]) {
        ord.assignedStaffId = DEFAULT_PLH_AREA_STAFF[ord.area].id;
        ord.assignedStaffName = DEFAULT_PLH_AREA_STAFF[ord.area].name;
        changed = true;
      }
      if (!ord.checkStatusToday) {
        const seedMatch = SEED_TREE_WORK_ORDERS.find((s) => s.id === ord.id || (s.area === ord.area && s.treeName === ord.treeName));
        if (seedMatch?.checkStatusToday) {
          ord.lastCheckedDate = seedMatch.lastCheckedDate;
          ord.lastCheckedTime = seedMatch.lastCheckedTime;
          ord.lastCheckedByName = seedMatch.lastCheckedByName;
          ord.checkStatusToday = seedMatch.checkStatusToday;
          ord.inspectionNotes = seedMatch.inspectionNotes;
        } else {
          ord.checkStatusToday = 'Belum Dicek';
        }
        changed = true;
      }
      if (changed) modified = true;
      return ord;
    });

    for (const seedOrder of SEED_TREE_WORK_ORDERS) {
      if (!enriched.some((o) => o.id === seedOrder.id || (o.area === seedOrder.area && o.treeName === seedOrder.treeName))) {
        enriched.push(seedOrder);
        modified = true;
      }
    }

    if (modified) {
      setStoredItem(STORAGE_KEYS.TREE_WORK_ORDERS, enriched);
    }
    return enriched;
  },
  saveTreeWorkOrders: (orders: TreeWorkOrder[]): void => {
    setStoredItem(STORAGE_KEYS.TREE_WORK_ORDERS, orders || []);
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

  if (inspectorRole === 'admin') {
    return true; // Admin can inspect ALL units
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

  // 2. Kordinator manages all tasks in their assigned division and unit/building
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

