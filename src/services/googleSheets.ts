import { StorageService } from './storage';
import { getCachedAccessToken } from './auth';
import {
  User,
  UserRole,
  UnitType,
  MasterTask,
  TaskLog,
  JobBareng,
  DinasRequest,
  PeerInspection,
  WeeklyScore,
  TreeWorkOrder,
} from '../types';
import { parseInstructionSteps } from '../utils/instructionHelper';
import { normalizeDateString, getJakartaDateString } from '../utils/dateHelper';
import { extractGoogleDriveFileId } from '../utils/driveHelper';

const SPREADSHEET_ID = '1McKt_ubKY3NmUivMTgep2C6tipg34rq51FZRVbVhtXU';
const DRIVE_FOLDER_ID = '1MURpjYWLXdg8mOtjO2ucl2tESHYVWfZO';

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
}

// Convert base64 dataURL to Blob for upload
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: LAZUARDI FM 2-WAY SYNC & AUTO DATABASE SETUP
 * =========================================================================
 * 
 * PANDUAN CEPAT (1 MENIT):
 * 1. Buka Google Spreadsheet Lazuardi GCS:
 *    https://docs.google.com/spreadsheets/d/1McKt_ubKY3NmUivMTgep2C6tipg34rq51FZRVbVhtXU/edit
 * 2. Di menu atas spreadsheet, klik: Ekstensi (Extensions) > Apps Script
 * 3. Hapus semua teks bawaan di "Code.gs", lalu Paste (Tempel) SELURUH kode di bawah ini.
 * 4. Klik ikon "Simpan" (Save 💾).
 * 5. Klik fungsi "setupDatabase" di dropdown atas lalu klik tombol "Run" (Jalankan)
 *    -> Ini akan OTOMATIS membuat seluruh Sheet, Kolom, Password, dan Standar Kebersihan Master Task Lazuardi!
 * 6. Untuk menghubungkan ke Web App:
 *    - Klik tombol biru "Deploy" (Terapkan) di kanan atas > "New deployment" (Penerapan baru)
 *    - Pilih jenis: "Web app" (Aplikasi web)
 *    - Execute as: Me (Email Anda)
 *    - Who has access: Anyone (Siapa saja)  <-- PENTING!
 *    - Klik "Deploy" > Berikan Izin Akun Google Anda > Salin "Web app URL"
 *    - Tempelkan URL tersebut ke menu Pengaturan Sinkronisasi di aplikasi Lazuardi FM.
 */

var SPREADSHEET_ID = "1McKt_ubKY3NmUivMTgep2C6tipg34rq51FZRVbVhtXU";
var DRIVE_FOLDER_ID = "1MURpjYWLXdg8mOtjO2ucl2tESHYVWfZO";

// Helper output JSON yang aman dan kompatibel
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Menu kustom otomatis di Google Sheet saat dibuka
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("🏢 Lazuardi FM")
      .addItem("🚀 Setup / Reset Database Otomatis", "setupDatabase")
      .addSeparator()
      .addItem("🖼️ Konversi Foto Base64 di Sheet ke Link Google Drive", "convertExistingBase64PhotosToDrive")
      .addItem("📥 Cek Status & Jumlah Data", "checkDatabaseStats")
      .addItem("🧹 Bersihkan Baris Kosong", "cleanupEmptyRows")
      .addToUi();
  } catch (e) {
    // Non-UI context
  }
}

// Helper: Simpan Base64 ke Google Drive dan kembalikan link publik view
function saveBase64ImageToDrive(base64Str, filename) {
  if (!base64Str || typeof base64Str !== "string") return "";
  var str = base64Str.trim();
  if (str.indexOf("http://") === 0 || str.indexOf("https://") === 0) {
    return str; // Sudah berupa URL Drive
  }
  if (str.indexOf("data:image") === -1 && str.length < 200) {
    return str;
  }
  try {
    var folder = null;
    try {
      if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID.length > 5) {
        folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      }
    } catch (eFolder) {
      folder = null;
    }

    if (!folder) {
      try {
        var folders = DriveApp.getFoldersByName("Lazuardi FM - Foto Bukti Pekerjaan");
        folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Lazuardi FM - Foto Bukti Pekerjaan");
      } catch (eFolder2) {
        folder = DriveApp.getRootFolder();
      }
    }
    
    var cleanBase64 = str;
    if (cleanBase64.indexOf(",") > -1) {
      cleanBase64 = cleanBase64.split(",")[1];
    }
    var decodedBytes = Utilities.base64Decode(cleanBase64);
    var fn = filename || ("bukti_" + (new Date().getTime()) + ".jpg");
    var blob = Utilities.newBlob(decodedBytes, "image/jpeg", fn);
    var file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Ignore if workspace domain restrictions prevent public link sharing
    }

    return "https://drive.google.com/file/d/" + file.getId() + "/view?usp=sharing";
  } catch (err) {
    // If any error occurs, do not throw ugly error into sheet, fallback to placeholder
    return "https://drive.google.com/file/d/upload_failed_" + (new Date().getTime());
  }
}

/**
 * SETUP DATABASE OTOMATIS:
 * Membuat semua sheet (Users, MasterTask, TaskLogs, JobBareng, DinasRequests, PeerInspections, WeeklyScores),
 * mewarnai header, membekukan baris atas, dan mengisi data template jika kosong.
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Setup Sheet: Users (dengan kolom Division & AssignedArea)
  var usersHeader = ["ID", "Username", "Password", "Name", "Role", "Unit", "Status", "Phone", "Division", "AssignedArea"];
  var initialUsers = [
    ["u-admin-1", "admin", "password123", "Alpian (Admin FM)", "admin", "Pelangi Direktorat", "Aktif", "08123456789", "OB", "Semua Unit"],
    ["u-kord-tk", "kordinator_tk", "password123", "Kordinator Unit TK", "kordinator", "TK", "Aktif", "08129876543", "OB", "TK"],
    ["u-kord-sd", "kordinator_sd", "password123", "Kordinator Unit SD", "kordinator", "SD", "Aktif", "08129876544", "OB", "SD"],
    ["u-kord-smp", "kordinator_smp", "password123", "Kordinator Unit SMP", "kordinator", "SMP", "Aktif", "08129876545", "OB", "SMP"],
    ["u-ob-1", "budi_tk", "password123", "Budi Santoso", "user", "TK", "Aktif", "08120000001", "OB", "TK"],
    ["u-ob-2", "agus_sd", "password123", "Agus Setiawan", "user", "SD", "Aktif", "08120000002", "OB", "SD"],
    ["u-ob-3", "joko_smp", "password123", "Joko Susilo", "user", "SMP", "Aktif", "08120000003", "OB", "SMP"],
    ["u-ob-4", "hendra_dir", "password123", "Hendra Wijaya", "user", "Pelangi Direktorat", "Aktif", "08120000004", "OB", "Pelangi Direktorat"],
    ["u-ob-5", "deni_arazi", "password123", "Deni Prasetyo", "user", "Gedung Ar Razi", "Aktif", "08120000005", "OB", "Gedung Ar Razi"],
    ["u-ob-6", "rizky_khaldun", "password123", "Rizky Firmansyah", "user", "Gedung Ibnu Khaldun", "Aktif", "08120000006", "OB", "Gedung Ibnu Khaldun"],
    ["u-kord-plh", "kordinator_plh", "password123", "Slamet Riyadi (Kord PLH)", "kordinator", "Semua Unit", "Aktif", "08129999001", "PLH", "Semua Area (Supervisi)"],
    ["u-plh-01", "bambang_plh", "password123", "Bambang Irawan (PLH)", "user", "Semua Unit", "Aktif", "08129999002", "PLH", "Area Pos 1"],
    ["u-plh-02", "surya_plh", "password123", "Surya Wijaya (PLH)", "user", "Semua Unit", "Aktif", "08129999003", "PLH", "Area Pos 2"],
    ["u-plh-03", "kusnadi_plh", "password123", "Kusnadi (PLH)", "user", "Semua Unit", "Aktif", "08129999004", "PLH", "Area Khaldun"],
    ["u-plh-04", "fauzi_plh", "password123", "Ahmad Fauzi (PLH)", "user", "Semua Unit", "Aktif", "08129999005", "PLH", "Area Ex Minifarm"],
    ["u-plh-05", "darmanto_plh", "password123", "Darmanto (PLH)", "user", "Semua Unit", "Aktif", "08129999006", "PLH", "Area Kolam Renang"]
  ];
  createOrSetupSheet(ss, "Users", usersHeader, initialUsers, "#0f172a");

  // 2. Setup Sheet: MasterTask (Standar Kebersihan Khusus Divisi OB)
  var masterTaskHeader = ["ID", "Title", "Unit", "Category", "TimingType", "Instructions", "PhotoRequired", "IsActive", "Area", "Assignee", "StandardPhotoURL", "Division"];
  var initialOBMasterTasks = [
    ["mt-001", "Pre-Readiness: Pembersihan & Sanitasi Toilet", "Semua Unit", "Harian", "pre_readiness", "Kuras & bersihkan kloset | Isi sabun cuci tangan & tisu | Pel lantai disinfektan", "YA", "AKTIF", "Toilet & Selasar", "Budi Santoso (OB)", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80", "OB"],
    ["mt-002", "Pre-Readiness: Sapu, Pel & Kerapihan Ruang Kelas", "Semua Unit", "Harian", "pre_readiness", "Sapu bersih debu & sampah kolong meja | Pel lantai wangi | Rapikan formasi meja-kursi", "YA", "AKTIF", "Ruang Kelas", "Siti Aminah (OG)", "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80", "OB"],
    ["mt-003", "Pre-Readiness: Penyemprotan Disinfektan Handle Pintu & Meja Guru", "Semua Unit", "Harian", "pre_readiness", "Lap handle pintu & saklar | Bersihkan meja & kursi guru", "YA", "AKTIF", "Area Umum & Guru", "Agus Setiawan (OB)", "", "OB"],
    ["mt-004", "Pre-Readiness: Pengosongan Seluruh Tempat Sampah", "Semua Unit", "Harian", "pre_readiness", "Angkut seluruh tempat sampah kelas & selasar ke TPS | Pasang trashbag baru", "YA", "AKTIF", "Selasar & Koridor", "Ratih Purwasih (OG)", "", "OB"],
    ["mt-005", "Pembersihan Rutin Selasar, Koridor & Tangga", "Semua Unit", "Harian", "anytime", "Sapu selasar | Pel jika ada noda atau licin | Cek kebersihan handrail tangga", "YA", "AKTIF", "Koridor & Tangga", "Semua Petugas", "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80", "OB"],
    ["mt-006", "Pengecekan Dispenser & Air Minum Galon", "Semua Unit", "Harian", "anytime", "Cek ketersediaan air galon siswa & guru | Lap baki tetesan dispenser", "TIDAK", "AKTIF", "Pantry & Koridor", "Semua Petugas", "", "OB"],
    ["mt-007", "Clock Out: Penguncian Pintu, Jendela & Matikan AC/Lampu", "Semua Unit", "Harian", "clock_out", "Pastikan seluruh AC & lampu mati | Kunci jendela & pintu ruangan", "YA", "AKTIF", "Seluruh Ruangan Unit", "Hendra Wijaya (OB)", "", "OB"],
    ["mt-008", "Clock Out: Pembersihan Akhir Toilet & Wastafel", "Semua Unit", "Harian", "clock_out", "Keringkan lantai | Matikan keran air | Pastikan tidak ada air terbuang", "YA", "AKTIF", "Toilet Unit", "Maya Indah (OG)", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80", "OB"],
    ["mt-009", "Clock Out: Pengangkutan Sampah Sore ke TPS Akhir", "Semua Unit", "Harian", "clock_out", "Pastikan tidak ada sisa sampah organik di dalam gedung", "YA", "AKTIF", "TPS Luar", "Dodi Firmansyah (OB)", "", "OB"],
    ["mt-012", "Pembersihan Kaca Jendela Luar & Dalam", "Semua Unit", "Mingguan", "anytime", "Gunakan wiper & pembersih kaca | Lap bingkai kusen", "YA", "AKTIF", "Jendela Gedung", "Ilham Saputra (OB)", "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80", "OB"],
    ["mt-013", "Deep Cleaning Saluran Air & Drainase Selokan", "Semua Unit", "Mingguan", "anytime", "Angkat endapan lumpur | Pastikan aliran air lancar bebas jentik", "YA", "AKTIF", "Saluran Selokan", "Fajar Ramadhan (OB)", "", "OB"],
    ["mt-014", "Pembersihan Sawang Langit-langit & Plafon Tinggi", "Semua Unit", "Bulanan", "anytime", "Gunakan stik panjang sawang | Bersihkan exhaust fan", "YA", "AKTIF", "Plafon & Exhaust", "Semua Petugas", "", "OB"]
  ];
  createOrSetupSheet(ss, "MasterTask", masterTaskHeader, initialOBMasterTasks, "#1e3a8a");

  // 3. Setup Sheet: MasterTask_PLH (Standar Pemeliharaan Khusus Divisi PLH / Lingkungan & Taman)
  var initialPLHMasterTasks = [
    ["mt-plh-01", "Pre-Readiness: Penyiraman Seluruh Area Taman & Tanaman Pot", "Semua Unit", "Harian", "pre_readiness", "Siram tanaman merata pagi hari | Cek kelembapan media tanam", "YA", "AKTIF", "Area Taman & Pot", "Semua Petugas (PLH)", "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80", "PLH"],
    ["mt-plh-02", "Pre-Readiness: Pembersihan Serasah Daun & Gulma Area Pos 1 - 2", "Semua Unit", "Harian", "pre_readiness", "Sapu guguran daun kering | Cabut gulma pengganggu | Angkut ke komposter organik", "YA", "AKTIF", "Area Pos 1 & Pos 2", "Semua Petugas (PLH)", "", "PLH"],
    ["mt-plh-03", "Pengecekan Fisik & Kesehatan Pohon Tiap Wilayah Penugasan", "Semua Unit", "Harian", "anytime", "Cek dahan rimbun dekat kabel listrik | Deteksi dahan lapuk/hama benalu | Laporkan di modul pohon", "YA", "AKTIF", "5 Wilayah PLH", "Semua Petugas (PLH)", "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80", "PLH"],
    ["mt-plh-04", "Pembersihan Kolam Ikan & Sirkulasi Filter Air", "Semua Unit", "Harian", "anytime", "Bersihkan serasah di permukaan kolam | Cek fungsi pompa dan filter sirkulasi air", "YA", "AKTIF", "Kolam Ikan & Lanskap", "Darmanto (PLH)", "", "PLH"],
    ["mt-plh-05", "Pemotongan Rumput & Kerapihan Koridor Luar Khaldun / Minifarm", "Semua Unit", "Mingguan", "anytime", "Gunakan mesin potong rumput | Rapikan tepian jalan setapak | Buang sisa pangkasan ke TPS", "YA", "AKTIF", "Khaldun & Ex Minifarm", "Semua Petugas (PLH)", "", "PLH"],
    ["mt-plh-06", "Clock Out: Perapihan Selang Air, Mesin Rumput & Gudang Alat PLH", "Semua Unit", "Harian", "clock_out", "Gulung selang air | Bersihkan gunting dahan & cangkul | Kunci pintu gudang alat PLH", "YA", "AKTIF", "Gudang Alat PLH", "Semua Petugas (PLH)", "", "PLH"]
  ];
  createOrSetupSheet(ss, "MasterTask_PLH", masterTaskHeader, initialPLHMasterTasks, "#065f46");

  // 4. Setup Sheet: TaskLogs (Log Harian Divisi OB)
  var taskLogsHeader = [
    "ID", "Timestamp", "Date", "UserID", "UserName", "Unit", 
    "TaskTitle", "Category", "TimingType", "Status", "IsLate", 
    "LateReason", "LateReportStatus", "PhotoURL", "Notes", "KordinatorScore", "KordinatorNotes", 
    "PeerInspector", "PeerStatus", "PeerNotes", "Division"
  ];
  createOrSetupSheet(ss, "TaskLogs", taskLogsHeader, [], "#1e293b");

  // 5. Setup Sheet: TaskLogs_PLH (Log Harian Divisi PLH)
  createOrSetupSheet(ss, "TaskLogs_PLH", taskLogsHeader, [], "#047857");

  // 6. Setup Sheet: JobBareng (Tugas Bersama / Insidental OB)
  var jobBarengHeader = ["ID", "Title", "Description", "Date", "TargetUnit", "TargetArea", "Status", "Participants", "CompletedUsers", "CreatedAt", "AssignmentType", "AssignedUsers", "Division"];
  var initialOBJobBareng = [
    ["jb-001", "Kerja Bakti Lapangan & Area Parkir Utama", "Pembersihan massal menyambut acara sekolah bersama seluruh staf OB.", Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"), "Semua Unit", "Lapangan Utama", "Aktif", "u-ob-1, u-ob-2, u-ob-3", "", new Date().toISOString(), "all", "Semua Petugas OB", "OB"]
  ];
  createOrSetupSheet(ss, "JobBareng", jobBarengHeader, initialOBJobBareng, "#3730a3");

  // 7. Setup Sheet: JobBareng_PLH (Kerja Bakti & Tanggap Insidental PLH: Pohon / Taman)
  var initialPLHJobBareng = [
    ["jb-plh-001", "Kerja Bakti Penanganan Dahan Rimbun & Serasah Daun Pasca Hujan Lebat", "Pembersihan ranting gugur dan pemangkasan dahan rimbun di sepanjang jalur gerbang utama.", Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"), "Semua Unit", "Area Jalur Gerbang 1 & 2", "Aktif", "u-plh-01, u-plh-02, u-plh-03, u-plh-04, u-plh-05", "", new Date().toISOString(), "all", "Semua Petugas PLH", "PLH"]
  ];
  createOrSetupSheet(ss, "JobBareng_PLH", jobBarengHeader, initialPLHJobBareng, "#15803d");

  // 8. Setup Sheet: WeeklyScores (Nilai Mingguan OB)
  var weeklyHeader = ["ID", "UserID", "UserName", "Unit", "SaturdayDate", "Year", "DateRange", "Score", "KordinatorName", "CategoryScoresJSON", "Notes", "Timestamp"];
  createOrSetupSheet(ss, "WeeklyScores", weeklyHeader, [], "#334155");

  // 9. Setup Sheet: WeeklyScores_PLH (Nilai Mingguan Staf PLH per Area)
  createOrSetupSheet(ss, "WeeklyScores_PLH", weeklyHeader, [], "#166534");

  // 10. Setup Sheet: WorkOrder_Pohon (Inventaris Pohon & Laporan Cek Harian per 5 Wilayah)
  var treeWorkOrdersHeader = [
    "ID", "Date", "Area", "TreeName", "Condition", "TreatmentNeeded",
    "HandlerType", "VendorName", "VendorCost", "ScheduledWeek", "Urgency",
    "Status", "Notes", "PhotoBeforeURL", "PhotoAfterURL", "ReportedBy", "ReportedByName",
    "LastCheckedDate", "LastCheckedTime", "LastCheckedByName", "CheckStatusToday", "InspectionNotes",
    "CompletedAt", "CompletedByName", "CreatedAt"
  ];
  var initialTreeOrders = [
    ["two-2026-001", "2026-09-22", "Area Kolam Renang", "Pohon Trembesi Rimbun Dekat Kolam Renang", "Rimbun", "Penebangan / Topping Pohon Tinggi (Vendor Luar)", "Vendor Luar", "CV Duta Hijau Pertamanan", 2500000, "Minggu ke-4 September 2026", "Tinggi / Bahaya", "Dijadwalkan", "Dahan atas menjuntai ke kabel PLN dan atap tribun.", "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80", "", "u-plh-05", "Darmanto (PLH)", "2026-09-22", "08:15 WIB", "Darmanto (PLH)", "Sudah Dicek", "Pengecekan pagi: dahan tetap stabil.", "", "", new Date().toISOString()],
    ["two-2026-004", "2026-09-22", "Area Pos 1", "Pohon Beringin & Mahoni Pintu Masuk Gerbang Pos 1", "Rimbun", "Penjarangan Kanopi Rimbun", "Internal PLH", "", 0, "Minggu ke-4 September 2026", "Sedang", "Perlu Penanganan", "Dahan rimbun condong ke jalur drop-off.", "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80", "", "u-plh-01", "Bambang Irawan (PLH)", "2026-09-22", "07:30 WIB", "Bambang Irawan (PLH)", "Sudah Dicek", "Pengecekan pagi: dahan lebat mulai sentuh tiang lampu.", "", "", new Date().toISOString()],
    ["two-2026-002", "2026-09-22", "Area Pos 2", "Pohon Ketapang Kencana Dekat Gerbang Pos 2", "Rimbun", "Penjarangan Kanopi Rimbun", "Internal PLH", "", 0, "Minggu ke-4 September 2026", "Sedang", "Sedang Dikerjakan", "Kanopi daun lebat tutupi lampu malam Pos 2.", "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80", "", "u-plh-02", "Surya Wijaya (PLH)", "2026-09-22", "08:10 WIB", "Surya Wijaya (PLH)", "Sudah Dicek", "Proses pemangkasan berjalan.", "", "", new Date().toISOString()],
    ["two-2026-003", "2026-09-20", "Area Khaldun", "Pohon Flamboyan Area Lanskap Khaldun", "Dahan Kering / Lapuk", "Pemangkasan Ringan (Pruning Dahan Bawah)", "Internal PLH", "", 0, "", "Sedang", "Selesai", "3 dahan kering dipangkas rapi.", "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80", "", "u-plh-03", "Kusnadi (PLH)", "2026-09-22", "07:50 WIB", "Kusnadi (PLH)", "Sudah Dicek", "Bekas pangkasan mengering bagus.", "2026-09-20T14:30:00.000Z", "Kusnadi (PLH)", new Date().toISOString()],
    ["two-2026-005", "2026-09-22", "Area Ex Minifarm", "Pohon Mangga & Sengon Samping Bedengan Pembibitan", "Terserang Hama / Benalu", "Pemberian Nutrisi / Obat Hama Batang", "Internal PLH", "", 0, "", "Sedang", "Sedang Dikerjakan", "Benalu dahan utama dan rayap sengon.", "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80", "", "u-plh-04", "Ahmad Fauzi (PLH)", "2026-09-22", "08:00 WIB", "Ahmad Fauzi (PLH)", "Sudah Dicek", "Benalu dicabut 80%, semprot organik sore.", "", "", new Date().toISOString()]
  ];
  createOrSetupSheet(ss, "WorkOrder_Pohon", treeWorkOrdersHeader, initialTreeOrders, "#14532d");

  // 11. Setup Sheet: DinasRequests
  var dinasHeader = ["ID", "Date", "UserID", "UserName", "Unit", "Reason", "Destination", "Status", "ApprovedBy", "ApprovedAt", "CreatedAt"];
  createOrSetupSheet(ss, "DinasRequests", dinasHeader, [], "#92400e");

  // 12. Setup Sheet: PeerInspections
  var peerHeader = ["ID", "Date", "InspectorID", "InspectorName", "InspectorUnit", "InspectedUserID", "InspectedUserName", "InspectedUnit", "Area", "Status", "Notes", "PhotoURL", "ChecklistJSON", "Timestamp"];
  createOrSetupSheet(ss, "PeerInspections", peerHeader, [], "#831843");

  return { success: true, message: "Database Lazuardi FM (Sheet Khusus OB & PLH Terpisah + WorkOrder_Pohon) berhasil disetup otomatis!" };
}

// Helper: Buat sheet dengan format profesional jika belum ada
function createOrSetupSheet(ss, sheetName, headers, seedRows, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Jika sheet kosong, isi header dan seed data
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    if (seedRows && seedRows.length > 0) {
      sheet.getRange(2, 1, seedRows.length, seedRows[0].length).setValues(seedRows);
    }
  }

  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(headerColor || "#0f172a");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
}

/**
 * Web App GET Endpoint:
 * Mengambil data database secara cepat & ringan dari Sheet OB & PLH terpisah.
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAll";
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === "setup") {
      var setupRes = setupDatabase();
      return jsonOutput(setupRes);
    }

    if (action === "ping") {
      return jsonOutput({ success: true, message: "Lazuardi FM Apps Script Connected!" });
    }

    var limit = (e && e.parameter && e.parameter.limit) ? parseInt(e.parameter.limit, 10) : 150;
    var fetchAll = (e && e.parameter && (e.parameter.all === "true" || e.parameter.action === "getAllFull"));

    var result = {
      users: readSheet(ss, "Users", 0, true),
      masterTasks: readSheet(ss, "MasterTask", 0, true),
      masterTasks_plh: readSheet(ss, "MasterTask_PLH", 0, true),
      taskLogs: readSheet(ss, "TaskLogs", limit, fetchAll),
      taskLogs_plh: readSheet(ss, "TaskLogs_PLH", limit, fetchAll),
      jobBareng: readSheet(ss, "JobBareng", 0, true),
      jobBareng_plh: readSheet(ss, "JobBareng_PLH", 0, true),
      weeklyScores: readSheet(ss, "WeeklyScores", 100, fetchAll),
      weeklyScores_plh: readSheet(ss, "WeeklyScores_PLH", 100, fetchAll),
      workOrderPohon: readSheet(ss, "WorkOrder_Pohon", 0, true),
      dinasRequests: readSheet(ss, "DinasRequests", 0, true),
      peerInspections: readSheet(ss, "PeerInspections", 100, fetchAll),
      timestamp: new Date().toISOString()
    };

    return jsonOutput({ success: true, data: result });
  } catch (err) {
    return jsonOutput({ success: false, error: String(err) });
  }
}

/**
 * Web App POST Endpoint:
 * Menerima real-time log task baru (diarahkan ke TaskLogs atau TaskLogs_PLH sesuai divisi).
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
  } catch (lockErr) {
    // If lock fails, still attempt to proceed
  }

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = JSON.parse(rawContents);

    // 0. Targeted sheet updates
    if (payload.action === "saveUsers" && payload.users) {
      writeSheet(ss, "Users", payload.users);
      return jsonOutput({ success: true, message: "Data Users berhasil diperbarui!" });
    }
    if (payload.action === "saveMasterTasks" && payload.masterTasks) {
      writeSheet(ss, "MasterTask", payload.masterTasks);
      return jsonOutput({ success: true, message: "MasterTask (OB) berhasil diperbarui!" });
    }
    if (payload.action === "saveMasterTasks_PLH" && payload.masterTasks_plh) {
      writeSheet(ss, "MasterTask_PLH", payload.masterTasks_plh);
      return jsonOutput({ success: true, message: "MasterTask_PLH berhasil diperbarui!" });
    }
    if (payload.action === "saveJobBareng" && payload.jobBareng) {
      writeSheet(ss, "JobBareng", payload.jobBareng);
      return jsonOutput({ success: true, message: "JobBareng (OB) berhasil diperbarui!" });
    }
    if (payload.action === "saveJobBareng_PLH" && payload.jobBareng_plh) {
      writeSheet(ss, "JobBareng_PLH", payload.jobBareng_plh);
      return jsonOutput({ success: true, message: "JobBareng_PLH berhasil diperbarui!" });
    }
    if (payload.action === "saveWeeklyScores" && payload.weeklyScores) {
      writeSheet(ss, "WeeklyScores", payload.weeklyScores);
      return jsonOutput({ success: true, message: "WeeklyScores (OB) berhasil diperbarui!" });
    }
    if (payload.action === "saveWeeklyScores_PLH" && payload.weeklyScores_plh) {
      writeSheet(ss, "WeeklyScores_PLH", payload.weeklyScores_plh);
      return jsonOutput({ success: true, message: "WeeklyScores_PLH berhasil diperbarui!" });
    }
    if (payload.action === "saveWorkOrders" && payload.workOrders) {
      writeSheet(ss, "WorkOrder_Pohon", payload.workOrders);
      return jsonOutput({ success: true, message: "WorkOrder_Pohon berhasil diperbarui!" });
    }
    if (payload.action === "saveDinas" && payload.dinasRequests) {
      writeSheet(ss, "DinasRequests", payload.dinasRequests);
      return jsonOutput({ success: true, message: "DinasRequests berhasil diperbarui!" });
    }

    // 1. Single Task Log Real-time Append / Upsert (Rute otomatis ke TaskLogs_PLH vs TaskLogs)
    if (payload.action === "logTask" && payload.logRow) {
      var isPlh = false;
      if (payload.division === "PLH" || payload.division === "plh") {
        isPlh = true;
      } else if (payload.logRow.length > 20 && String(payload.logRow[20] || "").toUpperCase() === "PLH") {
        isPlh = true;
      } else if (String(payload.logRow[4] || "").indexOf("(PLH)") > -1 || String(payload.logRow[3] || "").indexOf("plh") > -1) {
        isPlh = true;
      }

      var targetSheetName = isPlh ? "TaskLogs_PLH" : "TaskLogs";
      var sheet = ss.getSheetByName(targetSheetName);
      if (!sheet) {
        setupDatabase();
        sheet = ss.getSheetByName(targetSheetName);
      }

      // Check PhotoURL
      var photoIdx = payload.logRow.length >= 20 ? 13 : 12;
      if (payload.logRow[photoIdx] && typeof payload.logRow[photoIdx] === "string" && (payload.logRow[photoIdx].indexOf("data:image") === 0 || payload.logRow[photoIdx].length > 500)) {
        var staffName = (payload.logRow[4] || "staff").toString().replace(/\s+/g, "_");
        var fn = "bukti_" + (isPlh ? "PLH_" : "OB_") + staffName + "_" + (new Date().getTime()) + ".jpg";
        payload.logRow[photoIdx] = saveBase64ImageToDrive(payload.logRow[photoIdx], fn);
      }

      var lastRow = sheet.getLastRow();
      var existingRowIndex = -1;

      if (lastRow > 1) {
        var scanCount = Math.min(100, lastRow - 1);
        var scanStart = Math.max(2, lastRow - scanCount + 1);
        var data = sheet.getRange(scanStart, 1, scanCount, Math.min(sheet.getLastColumn(), 10)).getValues();
        var targetId = String(payload.logRow[0] || "");
        var targetUserId = String(payload.logRow[3] || "");
        var targetDate = String(payload.logRow[2] || "");
        var targetTitle = String(payload.logRow[6] || "").toLowerCase().trim();

        for (var r = data.length - 1; r >= 0; r--) {
          var rowId = String(data[r][0] || "");
          var rowDate = String(data[r][2] || "");
          var rowUserId = String(data[r][3] || "");
          var rowTitle = String(data[r][6] || "").toLowerCase().trim();

          if (rowId === targetId || (rowUserId === targetUserId && rowDate === targetDate && rowTitle === targetTitle)) {
            existingRowIndex = scanStart + r;
            break;
          }
        }
      }

      if (existingRowIndex > 1) {
        sheet.getRange(existingRowIndex, 1, 1, payload.logRow.length).setValues([payload.logRow]);
      } else {
        sheet.appendRow(payload.logRow);
      }

      return jsonOutput({ 
        success: true, 
        message: "Log tersimpan di sheet " + targetSheetName + "!", 
        sheetTarget: targetSheetName,
        photoUrl: payload.logRow[photoIdx] 
      });
    }

    // 2. Single Peer Inspection Real-time
    if (payload.action === "logPeerInspection" && payload.inspectionRow) {
      var pSheet = ss.getSheetByName("PeerInspections");
      if (!pSheet) {
        setupDatabase();
        pSheet = ss.getSheetByName("PeerInspections");
      }

      var photoColIdx = 11;
      if (payload.inspectionRow[photoColIdx] && typeof payload.inspectionRow[photoColIdx] === "string" && (payload.inspectionRow[photoColIdx].indexOf("data:image") === 0 || payload.inspectionRow[photoColIdx].length > 500)) {
        var inspectorName = (payload.inspectionRow[3] || "inspector").toString().replace(/\s+/g, "_");
        var pfn = "inspeksi_" + inspectorName + "_" + (new Date().getTime()) + ".jpg";
        payload.inspectionRow[photoColIdx] = saveBase64ImageToDrive(payload.inspectionRow[photoColIdx], pfn);
      }

      var pLastRow = pSheet.getLastRow();
      var existingPeerIndex = -1;

      if (pLastRow > 1) {
        var pScanCount = Math.min(60, pLastRow - 1);
        var pScanStart = Math.max(2, pLastRow - pScanCount + 1);
        var pData = pSheet.getRange(pScanStart, 1, pScanCount, Math.min(pSheet.getLastColumn(), 8)).getValues();
        var pTargetId = String(payload.inspectionRow[0] || "");
        var pTargetInspectorId = String(payload.inspectionRow[2] || "");
        var pTargetDate = String(payload.inspectionRow[1] || "");
        var pTargetTargetUserId = String(payload.inspectionRow[5] || "");

        for (var pr = pData.length - 1; pr >= 0; pr--) {
          var prId = String(pData[pr][0] || "");
          var prDate = String(pData[pr][1] || "");
          var prInspectorId = String(pData[pr][2] || "");
          var prTargetUserId = String(pData[pr][5] || "");

          if (prId === pTargetId || (prInspectorId === pTargetInspectorId && prDate === pTargetDate && prTargetUserId === pTargetTargetUserId)) {
            existingPeerIndex = pScanStart + pr;
            break;
          }
        }
      }

      if (existingPeerIndex > 1) {
        pSheet.getRange(existingPeerIndex, 1, 1, payload.inspectionRow.length).setValues([payload.inspectionRow]);
      } else {
        pSheet.appendRow(payload.inspectionRow);
      }

      return jsonOutput({ 
        success: true, 
        message: "Laporan inspeksi silang tersimpan di Google Sheet!", 
        photoUrl: payload.inspectionRow[photoColIdx] 
      });
    }

    // 3. Upload Photo Proof to Google Drive Folder
    if (payload.action === "uploadPhoto" && payload.base64) {
      var driveUrl = saveBase64ImageToDrive(payload.base64, payload.filename);
      return jsonOutput({
        success: true,
        driveUrl: driveUrl,
        webViewLink: driveUrl
      });
    }

    // 4. Setup Database Trigger
    if (payload.action === "setupDatabase") {
      var setupResult = setupDatabase();
      return jsonOutput(setupResult);
    }

    // 5. Batch Sync Full Data (Mendukung Sheet OB dan Sheet PLH Terpisah)
    if (payload.users && payload.users.length) writeSheet(ss, "Users", payload.users);
    
    // OB Sheets
    if (payload.masterTasks && payload.masterTasks.length) writeSheet(ss, "MasterTask", payload.masterTasks);
    if (payload.taskLogs && payload.taskLogs.length) writeSheet(ss, "TaskLogs", payload.taskLogs);
    if (payload.jobBareng && payload.jobBareng.length) writeSheet(ss, "JobBareng", payload.jobBareng);
    if (payload.weeklyScores && payload.weeklyScores.length) writeSheet(ss, "WeeklyScores", payload.weeklyScores);
    
    // PLH Sheets
    if (payload.masterTasks_plh && payload.masterTasks_plh.length) writeSheet(ss, "MasterTask_PLH", payload.masterTasks_plh);
    if (payload.taskLogs_plh && payload.taskLogs_plh.length) writeSheet(ss, "TaskLogs_PLH", payload.taskLogs_plh);
    if (payload.jobBareng_plh && payload.jobBareng_plh.length) writeSheet(ss, "JobBareng_PLH", payload.jobBareng_plh);
    if (payload.weeklyScores_plh && payload.weeklyScores_plh.length) writeSheet(ss, "WeeklyScores_PLH", payload.weeklyScores_plh);
    if (payload.workOrderPohon && payload.workOrderPohon.length) writeSheet(ss, "WorkOrder_Pohon", payload.workOrderPohon);

    if (payload.dinasRequests && payload.dinasRequests.length) writeSheet(ss, "DinasRequests", payload.dinasRequests);
    if (payload.peerInspections && payload.peerInspections.length) writeSheet(ss, "PeerInspections", payload.peerInspections);

    return jsonOutput({ 
      success: true, 
      message: "Sinkronisasi 2 arah berhasil diperbarui di Google Sheet (OB & PLH terpisah)!", 
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    return jsonOutput({ success: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (eRel) {}
  }
}

// Baca data sheet cepat dengan optimasi limit baris
function readSheet(ss, sheetName, limit, fetchAll) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];

  var startRow = 2;
  var numRows = lastRow - 1;

  // Jika membaca TaskLogs dalam mode reguler, ambil baris-baris terbaru saja
  if (sheetName === "TaskLogs" && !fetchAll && numRows > 150) {
    var readLimit = limit || 150;
    startRow = Math.max(2, lastRow - readLimit + 1);
    numRows = lastRow - startRow + 1;
  } else if (limit && limit > 0 && numRows > limit && !fetchAll) {
    startRow = Math.max(2, lastRow - limit + 1);
    numRows = lastRow - startRow + 1;
  }

  var rows = sheet.getRange(startRow, 1, numRows, lastCol).getValues();
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (row[1] instanceof Date) {
      row[1] = Utilities.formatDate(row[1], "GMT+7", "yyyy-MM-dd HH:mm:ss");
    }
    if (row[2] instanceof Date) {
      row[2] = Utilities.formatDate(row[2], "GMT+7", "yyyy-MM-dd");
    }
  }
  return rows;
}

// Tulis data sheet dengan mempertahankan format header dan otomatis konversi foto base64 ke Google Drive
function writeSheet(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  if (rows && rows.length > 0) {
    // Konversi foto base64 ke Drive saat batch write
    if (sheetName === "TaskLogs") {
      for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        var photoIdx = row.length >= 20 ? 13 : 12;
        if (row && row[photoIdx] && typeof row[photoIdx] === "string" && (row[photoIdx].indexOf("data:image") === 0 || row[photoIdx].length > 500)) {
          var staff = (row[4] || "staff").toString().replace(/\s+/g, "_");
          row[photoIdx] = saveBase64ImageToDrive(row[photoIdx], "bukti_" + staff + "_" + r + "_" + (new Date().getTime()) + ".jpg");
        }
      }

      // Concurrency protection: Merge with existing rows instead of destructive clearContents
      var existingData = sheet.getDataRange().getValues();
      if (existingData.length > 1) {
        var existingMap = {};
        for (var ex = 1; ex < existingData.length; ex++) {
          var exRow = existingData[ex];
          var exId = String(exRow[0] || "");
          if (exId) existingMap[exId] = exRow;
        }
        for (var inR = 1; inR < rows.length; inR++) {
          var inRow = rows[inR];
          var inId = String(inRow[0] || "");
          if (inId) {
            existingMap[inId] = inRow;
          }
        }
        var mergedRows = [rows[0]];
        for (var key in existingMap) {
          mergedRows.push(existingMap[key]);
        }
        rows = mergedRows;
      }
    } else if (sheetName === "MasterTask") {
      for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (row && row[10] && typeof row[10] === "string" && (row[10].indexOf("data:image") === 0 || row[10].length > 500)) {
          row[10] = saveBase64ImageToDrive(row[10], "standar_sop_" + r + "_" + (new Date().getTime()) + ".jpg");
        }
      }
    } else if (sheetName === "PeerInspections") {
      for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (row && row[11] && typeof row[11] === "string" && (row[11].indexOf("data:image") === 0 || row[11].length > 500)) {
          var inspector = (row[3] || "inspector").toString().replace(/\s+/g, "_");
          row[11] = saveBase64ImageToDrive(row[11], "inspeksi_" + inspector + "_" + r + "_" + (new Date().getTime()) + ".jpg");
        }
      }
    }

    sheet.clearContents();
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    
    // Style header row
    var headerRange = sheet.getRange(1, 1, 1, rows[0].length);
    headerRange.setBackground("#0f172a");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
  }
}

// Fitur Khusus: Konversi semua sel Base64 lama di sheet TaskLogs menjadi file Google Drive
function convertExistingBase64PhotosToDrive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("TaskLogs");
  if (!sheet || sheet.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert("Info", "Sheet TaskLogs belum memiliki baris data.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var lastRow = sheet.getLastRow();
  var convertedCount = 0;
  var photoCol = sheet.getLastColumn() >= 20 ? 14 : 13; // Kolom N (14) atau M (13)
  var photoRange = sheet.getRange(2, photoCol, lastRow - 1, 1);
  var values = photoRange.getValues();
  
  for (var i = 0; i < values.length; i++) {
    var cellValue = String(values[i][0] || "").trim();
    if (cellValue && (cellValue.indexOf("data:image") === 0 || cellValue.length > 500)) {
      var staffName = sheet.getRange(i + 2, 5).getValue() || "staff";
      var fn = "bukti_" + String(staffName).replace(/\s+/g, "_") + "_" + (i + 1) + ".jpg";
      var driveLink = saveBase64ImageToDrive(cellValue, fn);
      values[i][0] = driveLink;
      convertedCount++;
    }
  }
  
  if (convertedCount > 0) {
    photoRange.setValues(values);
    SpreadsheetApp.getUi().alert("Berhasil!", convertedCount + " foto base64 berhasil diunggah ke Google Drive dan diperbarui menjadi link Drive di sheet!", SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert("Info", "Semua foto di sheet TaskLogs sudah berupa Link Google Drive atau kosong. Tidak ada data base64.", SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// Cek statistik jumlah baris data
function checkDatabaseStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ["Users", "MasterTask", "TaskLogs", "JobBareng", "DinasRequests", "PeerInspections", "WeeklyScores"];
  var report = "📊 STATISTIK DATA LAZUARDI FM:\\n\\n";
  sheets.forEach(function(name) {
    var s = ss.getSheetByName(name);
    var count = s ? Math.max(0, s.getLastRow() - 1) : 0;
    report += "• " + name + ": " + count + " data\\n";
  });
  SpreadsheetApp.getUi().alert("Status Data", report, SpreadsheetApp.getUi().ButtonSet.OK);
}

// Bersihkan baris kosong di bawah data
function cleanupEmptyRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheets().forEach(function(sheet) {
    var maxRows = sheet.getMaxRows();
    var lastRow = sheet.getLastRow();
    if (maxRows > lastRow + 5 && lastRow > 0) {
      sheet.deleteRows(lastRow + 6, maxRows - (lastRow + 5));
    }
  });
  SpreadsheetApp.getUi().alert("Selesai", "Baris kosong berhasil dirapikan!", SpreadsheetApp.getUi().ButtonSet.OK);
}
`;

// In-flight guard to prevent duplicate concurrent pull requests
let activePullPromise: Promise<SyncResult> | null = null;

export const GoogleSheetsService = {
  // Check if active access token or web app is available
  hasToken: (): boolean => {
    return !!getCachedAccessToken() || !!StorageService.getSyncConfig().webAppUrl;
  },

  // Upload photo to Google Drive folder
  uploadPhotoToDrive: async (
    dataUrl: string,
    filename: string
  ): Promise<{ driveUrl: string; fileId?: string }> => {
    if (!dataUrl) return { driveUrl: '' };
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      const fileId = extractGoogleDriveFileId(dataUrl);
      return { driveUrl: dataUrl, fileId: fileId || undefined };
    }

    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();

    // 1. Try Apps Script Web App upload (if configured)
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'uploadPhoto',
            base64: dataUrl,
            filename: filename || `lz_bukti_${Date.now()}.jpg`,
          }),
        });
        const resJson = await res.json();
        if (resJson && resJson.success && (resJson.driveUrl || resJson.webViewLink)) {
          const driveUrl = resJson.driveUrl || resJson.webViewLink;
          const fileId = resJson.fileId || extractGoogleDriveFileId(driveUrl);
          return { driveUrl, fileId: fileId || undefined };
        }
      } catch (err) {
        console.warn('Apps Script photo upload fallback to API/local:', err);
      }
    }

    // 2. Direct Google Drive REST API with Token
    if (token) {
      try {
        const blob = dataURLtoBlob(dataUrl);
        const metadata = {
          name: filename || `lz_bukti_${Date.now()}.jpg`,
          parents: [DRIVE_FOLDER_ID],
          mimeType: 'image/jpeg',
        };

        const formData = new FormData();
        formData.append(
          'metadata',
          new Blob([JSON.stringify(metadata)], { type: 'application/json' })
        );
        formData.append('file', blob);

        const response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (response.ok) {
          const result = await response.json();
          const driveUrl =
            result.webViewLink ||
            `https://drive.google.com/file/d/${result.id}/view?usp=sharing`;
          return { driveUrl, fileId: result.id };
        }
      } catch (err) {
        console.error('Error uploading photo to Drive API:', err);
      }
    }

    // Fallback: return dataUrl for instant local preview
    return { driveUrl: dataUrl };
  },

  isProcessingQueue: false,

  // Background queue processor to ensure 100% reliable delivery of pending items
  processPendingQueue: async (): Promise<void> => {
    if (GoogleSheetsService.isProcessingQueue) return;
    const queue = StorageService.getPendingQueue();
    if (!queue || queue.length === 0) return;

    const syncConfig = StorageService.getSyncConfig();
    if (!syncConfig.webAppUrl || !syncConfig.webAppUrl.startsWith('http')) return;

    GoogleSheetsService.isProcessingQueue = true;
    try {
      for (const item of queue) {
        try {
          if (item.type === 'logTask' && item.payload?.logRow) {
            const res = await fetch(syncConfig.webAppUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'logTask',
                logRow: item.payload.logRow,
              }),
            });
            if (res.ok) {
              const resJson = await res.json();
              if (resJson && resJson.photoUrl && resJson.photoUrl.startsWith('http')) {
                if (item.payload.log) {
                  item.payload.log.photoUrl = resJson.photoUrl;
                  StorageService.updateTaskLog(item.payload.log);
                }
              }
              StorageService.removeFromPendingQueue(item.id);
            } else {
              StorageService.incrementPendingRetry(item.id);
              break;
            }
          } else if (item.type === 'peerInspection' && item.payload?.peerRow) {
            const res = await fetch(syncConfig.webAppUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'logPeerInspection',
                inspectionRow: item.payload.peerRow,
              }),
            });
            if (res.ok) {
              const resJson = await res.json();
              if (resJson && resJson.photoUrl && resJson.photoUrl.startsWith('http')) {
                if (item.payload.inspection) {
                  item.payload.inspection.photoUrl = resJson.photoUrl;
                  StorageService.updatePeerInspection(item.payload.inspection);
                }
              }
              StorageService.removeFromPendingQueue(item.id);
            } else {
              StorageService.incrementPendingRetry(item.id);
              break;
            }
          } else if (item.type === 'dinas' && item.payload?.dinasRequests) {
            const res = await fetch(syncConfig.webAppUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'saveDinas',
                dinasRequests: item.payload.dinasRequests,
              }),
            });
            if (res.ok) {
              StorageService.removeFromPendingQueue(item.id);
            } else {
              StorageService.incrementPendingRetry(item.id);
              break;
            }
          } else if (item.type === 'weeklyScore' && item.payload?.weeklyScores) {
            const res = await fetch(syncConfig.webAppUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'saveWeeklyScores',
                weeklyScores: item.payload.weeklyScores,
              }),
            });
            if (res.ok) {
              StorageService.removeFromPendingQueue(item.id);
            } else {
              StorageService.incrementPendingRetry(item.id);
              break;
            }
          } else if (item.type === 'jobBareng' && item.payload?.jobBareng) {
            const res = await fetch(syncConfig.webAppUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'saveJobBareng',
                jobBareng: item.payload.jobBareng,
              }),
            });
            if (res.ok) {
              StorageService.removeFromPendingQueue(item.id);
            } else {
              StorageService.incrementPendingRetry(item.id);
              break;
            }
          }
        } catch (itemErr) {
          StorageService.incrementPendingRetry(item.id);
          break; // Stop loop on network error to allow retry on next interval
        }
      }
    } finally {
      GoogleSheetsService.isProcessingQueue = false;
    }
  },

  // Real-time single TaskLog direct append to Google Sheet with Queue & Retry
  logTaskToSheets: async (log: TaskLog): Promise<void> => {
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();
    const isLate = log.isLate || log.status === 'Terlambat';
    const hasReason = Boolean(log.lateReason && log.lateReason.trim().length > 0);
    const lateReportStatus = isLate
      ? hasReason
        ? 'SUDAH LAPOR ALASAN'
        : 'BELUM LAPOR ALASAN'
      : log.status === 'Dinas Luar'
      ? 'DINAS LUAR'
      : 'TEPAT WAKTU';

    const logTaskDisplay = log.taskId ? `[${log.taskId}] ${log.taskTitle || ''}` : (log.taskTitle || '');

    // For webAppUrl (Apps Script), Apps Script handles base64 image-to-Drive conversion directly in action="logTask"
    // Only use separate uploadPhotoToDrive if NOT using webAppUrl or if already a Drive link
    let photoUrlToSave = log.photoUrl || '';
    if (!syncConfig.webAppUrl && photoUrlToSave.startsWith('data:')) {
      try {
        const staff = (log.userName || 'staff').replace(/\s+/g, '_');
        const filename = `bukti_${staff}_${log.id}_${Date.now()}.jpg`;
        const uploadResult = await GoogleSheetsService.uploadPhotoToDrive(photoUrlToSave, filename);
        if (uploadResult.driveUrl && uploadResult.driveUrl.startsWith('http')) {
          photoUrlToSave = uploadResult.driveUrl;
          log.photoUrl = uploadResult.driveUrl;
          if (uploadResult.fileId) log.driveFileId = uploadResult.fileId;
          StorageService.updateTaskLog(log);
        }
      } catch (err) {
        console.warn('Auto upload photo on logTaskToSheets:', err);
      }
    } else if (photoUrlToSave === '[Bukti Foto Tersimpan di Perangkat]') {
      if (log.driveFileId) {
        photoUrlToSave = `https://drive.google.com/file/d/${log.driveFileId}/view`;
        log.photoUrl = photoUrlToSave;
        StorageService.updateTaskLog(log);
      }
    }

    const logRow = [
      log.id,
      log.timestamp,
      log.date,
      log.userId,
      log.userName,
      log.unit,
      logTaskDisplay,
      log.category,
      log.timingType,
      log.status,
      isLate ? 'YA' : 'TIDAK',
      log.lateReason || '',
      lateReportStatus,
      photoUrlToSave,
      log.notes || '',
      log.kordinatorScore || '',
      log.kordinatorNotes || '',
      log.peerInspectorName || '',
      (log as any).peerStatus || log.peerScore || '',
      log.peerNotes || '',
      log.division || 'OB',
    ];

    // Enqueue to pending queue first for offline resilience (avoid duplicating heavy base64 inside both logRow & log payload)
    StorageService.addToPendingQueue({
      id: log.id,
      type: 'logTask',
      payload: { logRow, log: { ...log, photoUrl: photoUrlToSave.startsWith('http') ? photoUrlToSave : undefined } },
      timestamp: new Date().toISOString(),
    });

    // 1. Post to Apps Script Web App (if configured)
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'logTask',
            logRow,
          }),
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson && resJson.photoUrl && resJson.photoUrl.startsWith('http')) {
            log.photoUrl = resJson.photoUrl;
            StorageService.updateTaskLog(log);
          }
          // Remove from pending queue on verified delivery
          StorageService.removeFromPendingQueue(log.id);
        } else {
          StorageService.incrementPendingRetry(log.id);
        }
      } catch (err) {
        console.warn('Real-time task log post failed, queued for automatic background retry:', err);
        StorageService.incrementPendingRetry(log.id);
      }
    }

    // 2. Direct Google Sheets REST API append fallback (if OAuth token present)
    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/TaskLogs!A:U:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [logRow],
            }),
          }
        );
      } catch (err) {
        console.warn('Direct REST TaskLog append fallback error:', err);
      }
    }
  },

  // Real-time single PeerInspection direct append to Google Sheet with Queue
  logPeerInspectionToSheets: async (inspection: PeerInspection): Promise<void> => {
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();

    // Ensure photo is uploaded to Google Drive if still base64 data URL
    let photoUrlToSave = inspection.photoUrl || '';
    if (!syncConfig.webAppUrl && photoUrlToSave.startsWith('data:')) {
      try {
        const inspector = (inspection.inspectorName || 'inspector').replace(/\s+/g, '_');
        const filename = `inspeksi_${inspector}_${inspection.id}_${Date.now()}.jpg`;
        const uploadResult = await GoogleSheetsService.uploadPhotoToDrive(photoUrlToSave, filename);
        if (uploadResult.driveUrl && uploadResult.driveUrl.startsWith('http')) {
          photoUrlToSave = uploadResult.driveUrl;
          inspection.photoUrl = uploadResult.driveUrl;
          StorageService.updatePeerInspection(inspection);
        }
      } catch (err) {
        console.warn('Auto upload photo on logPeerInspectionToSheets:', err);
      }
    }

    const peerRow = [
      inspection.id,
      inspection.date,
      inspection.inspectorId,
      inspection.inspectorName,
      inspection.inspectorUnit,
      inspection.targetUserId,
      inspection.targetUserName,
      inspection.targetUnit,
      inspection.area || '',
      inspection.status || 'Sesuai Standar Kebersihan',
      inspection.notes || '',
      photoUrlToSave,
      JSON.stringify(inspection.checklistItems || []),
      inspection.timestamp,
    ];

    // Enqueue for reliability
    StorageService.addToPendingQueue({
      id: inspection.id,
      type: 'peerInspection',
      payload: { peerRow, inspection: { ...inspection, photoUrl: photoUrlToSave.startsWith('http') ? photoUrlToSave : undefined } },
      timestamp: new Date().toISOString(),
    });

    // 1. Post to Apps Script Web App (if configured)
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'logPeerInspection',
            inspectionRow: peerRow,
          }),
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson && resJson.photoUrl && resJson.photoUrl.startsWith('http')) {
            inspection.photoUrl = resJson.photoUrl;
            StorageService.updatePeerInspection(inspection);
          }
          StorageService.removeFromPendingQueue(inspection.id);
        } else {
          StorageService.incrementPendingRetry(inspection.id);
        }
      } catch (err) {
        console.warn('Real-time peer inspection post failed, queued for automatic background retry:', err);
        StorageService.incrementPendingRetry(inspection.id);
      }
    }

    // 2. Direct Google Sheets REST API append fallback (if OAuth token present)
    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/PeerInspections!A:N:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [peerRow],
            }),
          }
        );
      } catch (err) {
        console.warn('Direct REST PeerInspection append fallback error:', err);
      }
    }
  },

  // Lightweight Targeted Sync: Save Users only
  saveUsersToSheets: async (usersInput?: User[]): Promise<SyncResult> => {
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();
    const now = new Date().toISOString();
    const users = usersInput || StorageService.getUsers();
    const userRows = [
      ['ID', 'Username', 'Password', 'Name', 'Role', 'Unit', 'Status', 'Phone', 'Division'],
      ...users.map((u) => [
        u.id,
        u.username,
        u.password || 'password123',
        u.name,
        u.role,
        u.unit,
        u.status,
        u.phone || '',
        u.division || 'OB',
      ]),
    ];

    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveUsers', users: userRows }),
        });
        if (res.ok) {
          syncConfig.lastSyncTime = now;
          StorageService.saveSyncConfig(syncConfig);
          return { success: true, message: 'Data Users tersimpan di Google Sheet!', timestamp: now };
        }
      } catch (e) {
        console.warn('Targeted users sync failed:', e);
      }
    }

    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Users!A1:I${userRows.length + 10}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: userRows }),
          }
        );
        return { success: true, message: 'Data Users tersimpan via REST!', timestamp: now };
      } catch (err: any) {
        return { success: false, message: err.message, timestamp: now };
      }
    }

    return { success: true, message: 'Data Users tersimpan secara lokal.', timestamp: now };
  },

  // Lightweight Targeted Sync: Save MasterTasks only
  saveMasterTasksToSheets: async (tasksInput?: MasterTask[]): Promise<SyncResult> => {
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();
    const now = new Date().toISOString();
    const tasks = tasksInput || StorageService.getMasterTasks();
    const taskRows = [
      ['ID', 'Title', 'Unit', 'Category', 'TimingType', 'Instructions', 'PhotoRequired', 'IsActive', 'Area', 'Assignee', 'StandardPhotoURL', 'Division'],
      ...tasks.map((t) => [
        t.id,
        t.title,
        t.unit,
        t.category,
        t.timingType,
        t.instructions.join(' | '),
        t.photoRequired ? 'YA' : 'TIDAK',
        t.isActive ? 'AKTIF' : 'NONAKTIF',
        t.area || '',
        t.assignee || 'Semua Petugas',
        t.standardPhotoUrl || '',
        t.division || 'OB',
      ]),
    ];

    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveMasterTasks', masterTasks: taskRows }),
        });
        if (res.ok) {
          syncConfig.lastSyncTime = now;
          StorageService.saveSyncConfig(syncConfig);
          return { success: true, message: 'MasterTask tersimpan di Google Sheet!', timestamp: now };
        }
      } catch (e) {
        console.warn('Targeted master task sync failed:', e);
      }
    }

    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/MasterTask!A1:L${taskRows.length + 10}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: taskRows }),
          }
        );
        return { success: true, message: 'MasterTask tersimpan via REST!', timestamp: now };
      } catch (err: any) {
        return { success: false, message: err.message, timestamp: now };
      }
    }

    return { success: true, message: 'MasterTask tersimpan secara lokal.', timestamp: now };
  },

  // Lightweight Targeted Sync: Save JobBareng only
  saveJobBarengToSheets: async (jobsInput?: JobBareng[]): Promise<SyncResult> => {
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();
    const now = new Date().toISOString();
    const users = StorageService.getUsers();
    const jobs = jobsInput || StorageService.getJobBareng();
    const jobRows = [
      ['ID', 'Title', 'Description', 'Date', 'TargetUnit', 'TargetArea', 'Status', 'Participants', 'CompletedUsers', 'CreatedAt', 'AssignmentType', 'AssignedUsers', 'Division'],
      ...jobs.map((j) => {
        const participantDisplay = (j.participantNames && j.participantNames.length > 0)
          ? j.participantNames.join(', ')
          : j.participantIds.map((id) => {
              const u = users.find((user) => user.id === id || user.username === id);
              return u ? u.name : id;
            }).join(', ');

        const completedDisplay = (j.completedUserNames && j.completedUserNames.length > 0)
          ? j.completedUserNames.join(', ')
          : j.completedUserIds.map((id) => {
              const u = users.find((user) => user.id === id || user.username === id);
              return u ? u.name : id;
            }).join(', ');

        const assignedDisplay = (j.assignedUserNames && j.assignedUserNames.length > 0)
          ? j.assignedUserNames.join(', ')
          : (j.assignedUserIds || []).map((id) => {
              const u = users.find((user) => user.id === id || user.username === id);
              return u ? u.name : id;
            }).join(', ');

        return [
          j.id,
          j.title,
          j.description,
          j.date,
          j.targetUnit,
          j.targetArea,
          j.status,
          participantDisplay,
          completedDisplay,
          j.createdAt,
          j.assignmentType || 'all',
          assignedDisplay || 'Semua Petugas',
          j.division || 'OB',
        ];
      }),
    ];

    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveJobBareng', jobBareng: jobRows }),
        });
        if (res.ok) {
          syncConfig.lastSyncTime = now;
          StorageService.saveSyncConfig(syncConfig);
          return { success: true, message: 'Job Bareng tersimpan di Google Sheet!', timestamp: now };
        }
      } catch (e) {
        console.warn('Targeted job bareng sync failed:', e);
      }
    }

    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/JobBareng!A1:M${jobRows.length + 10}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: jobRows }),
          }
        );
        return { success: true, message: 'Job Bareng tersimpan via REST!', timestamp: now };
      } catch (err: any) {
        return { success: false, message: err.message, timestamp: now };
      }
    }

    return { success: true, message: 'Job Bareng tersimpan secara lokal.', timestamp: now };
  },

  // Lightweight Targeted Sync: Save DinasRequests only
  saveDinasToSheets: async (dinasInput?: DinasRequest[]): Promise<SyncResult> => {
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();
    const now = new Date().toISOString();
    const dinas = dinasInput || StorageService.getDinasRequests();
    const dinasRows = [
      ['ID', 'Date', 'UserID', 'UserName', 'Unit', 'Reason', 'Destination', 'Status', 'ApprovedBy', 'ApprovedAt', 'CreatedAt'],
      ...dinas.map((d) => [
        d.id,
        d.date,
        d.userId,
        d.userName,
        d.unit,
        d.reason,
        d.destination,
        d.status,
        d.approvedByName || d.approvedBy || '',
        d.approvedAt || '',
        d.createdAt,
      ]),
    ];

    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveDinas', dinasRequests: dinasRows }),
        });
        if (res.ok) {
          syncConfig.lastSyncTime = now;
          StorageService.saveSyncConfig(syncConfig);
          return { success: true, message: 'Dinas Requests tersimpan di Google Sheet!', timestamp: now };
        }
      } catch (e) {
        console.warn('Targeted dinas sync failed:', e);
      }
    }

    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/DinasRequests!A1:K${dinasRows.length + 10}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: dinasRows }),
          }
        );
        return { success: true, message: 'Dinas Requests tersimpan via REST!', timestamp: now };
      } catch (err: any) {
        return { success: false, message: err.message, timestamp: now };
      }
    }

    return { success: true, message: 'Dinas Requests tersimpan secara lokal.', timestamp: now };
  },

  // Lightweight Targeted Sync: Save WeeklyScores only
  saveWeeklyScoresToSheets: async (scoresInput?: WeeklyScore[]): Promise<SyncResult> => {
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();
    const now = new Date().toISOString();
    const scores = scoresInput || StorageService.getWeeklyScores();
    const weeklyRows = [
      ['ID', 'UserID', 'UserName', 'Unit', 'SaturdayDate', 'Year', 'DateRange', 'Score', 'KordinatorName', 'CategoryScoresJSON', 'Notes', 'Timestamp'],
      ...scores.map((w) => [
        w.id,
        w.userId,
        w.userName,
        w.unit,
        w.saturdayDate || '',
        w.year,
        w.dateRange || '',
        w.score,
        w.kordinatorName,
        JSON.stringify(w.categoryScores || {}),
        w.notes,
        w.timestamp,
      ]),
    ];

    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveWeeklyScores', weeklyScores: weeklyRows }),
        });
        if (res.ok) {
          syncConfig.lastSyncTime = now;
          StorageService.saveSyncConfig(syncConfig);
          return { success: true, message: 'Penilaian mingguan tersimpan di Google Sheet!', timestamp: now };
        }
      } catch (e) {
        console.warn('Targeted weekly scores sync failed:', e);
      }
    }

    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/WeeklyScores!A1:L${weeklyRows.length + 10}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: weeklyRows }),
          }
        );
        return { success: true, message: 'Penilaian mingguan tersimpan via REST!', timestamp: now };
      } catch (err: any) {
        return { success: false, message: err.message, timestamp: now };
      }
    }

    return { success: true, message: 'Penilaian mingguan tersimpan secara lokal.', timestamp: now };
  },

  // Trigger remote database setup on Google Sheet
  triggerRemoteSetup: async (): Promise<SyncResult> => {
    const syncConfig = StorageService.getSyncConfig();
    const now = new Date().toISOString();

    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const setupUrl = `${syncConfig.webAppUrl}${syncConfig.webAppUrl.includes('?') ? '&' : '?'}action=setup`;
        const res = await fetch(setupUrl);
        const resJson = await res.json();
        if (resJson.success) {
          // Immediately pull fresh data
          await GoogleSheetsService.pullFromSheets();
          return {
            success: true,
            message: 'Database Google Sheet Lazuardi FM berhasil disetup & disinkronkan otomatis!',
            timestamp: now,
          };
        }
      } catch (err: any) {
        console.warn('Remote setup error:', err);
      }
    }

    // Fallback: push current local template to Sheets
    return await GoogleSheetsService.pushAllToSheets();
  },

  // Push all local data to Google Sheets (2-way sync: Push)
  pushAllToSheets: async (): Promise<SyncResult> => {
    const token = getCachedAccessToken();
    const syncConfig = StorageService.getSyncConfig();
    const now = new Date().toISOString();

    // 1. Prepare Users values (Include Password & AssignedArea column for direct sheet management)
    const users = StorageService.getUsers();
    const userRows = [
      ['ID', 'Username', 'Password', 'Name', 'Role', 'Unit', 'Status', 'Phone', 'Division', 'AssignedArea'],
      ...users.map((u) => [
        u.id,
        u.username,
        u.password || 'password123',
        u.name,
        u.role,
        u.unit,
        u.status,
        u.phone || '',
        u.division || 'OB',
        u.assignedArea || (u.division === 'PLH' ? 'Area Lingkungan' : 'Area Unit'),
      ]),
    ];

    // 2. Prepare MasterTask values (Split OB and PLH into separate sheets)
    const allTasks = StorageService.getMasterTasks();
    const mapTaskRow = (t: MasterTask) => [
      t.id,
      t.title,
      t.unit,
      t.category,
      t.timingType,
      t.instructions.join(' | '),
      t.photoRequired ? 'YA' : 'TIDAK',
      t.isActive ? 'AKTIF' : 'NONAKTIF',
      t.area || '',
      t.assignee || 'Semua Petugas',
      t.standardPhotoUrl || '',
      t.division || 'OB',
    ];

    const obTasks = allTasks.filter((t) => t.division !== 'PLH');
    const plhTasks = allTasks.filter((t) => t.division === 'PLH');

    const taskHeader = ['ID', 'Title', 'Unit', 'Category', 'TimingType', 'Instructions', 'PhotoRequired', 'IsActive', 'Area', 'Assignee', 'StandardPhotoURL', 'Division'];
    const obTaskRows = [taskHeader, ...obTasks.map(mapTaskRow)];
    const plhTaskRows = [taskHeader, ...plhTasks.map(mapTaskRow)];

    // 3. Prepare TaskLogs values (Split OB and PLH into separate sheets)
    const allLogs = StorageService.getTaskLogs();
    const mapLogRow = (l: TaskLog) => {
      const isLate = l.isLate || l.status === 'Terlambat';
      const hasReason = Boolean(l.lateReason && l.lateReason.trim().length > 0);
      const lateReportStatus = isLate
        ? hasReason
          ? 'SUDAH LAPOR ALASAN'
          : 'BELUM LAPOR ALASAN'
        : l.status === 'Dinas Luar'
        ? 'DINAS LUAR'
        : 'TEPAT WAKTU';
      const logTaskDisplay = l.taskId ? `[${l.taskId}] ${l.taskTitle || ''}` : (l.taskTitle || '');

      let safePhotoUrl = l.photoUrl || '';
      if (safePhotoUrl === '[Bukti Foto Tersimpan di Perangkat]') {
        safePhotoUrl = l.driveFileId ? `https://drive.google.com/file/d/${l.driveFileId}/view` : '';
      } else if (safePhotoUrl.startsWith('data:') && l.driveFileId) {
        safePhotoUrl = `https://drive.google.com/file/d/${l.driveFileId}/view`;
      }

      return [
        l.id,
        l.timestamp,
        l.date,
        l.userId,
        l.userName,
        l.unit,
        logTaskDisplay,
        l.category,
        l.timingType,
        l.status,
        isLate ? 'YA' : 'TIDAK',
        l.lateReason || '',
        lateReportStatus,
        safePhotoUrl,
        l.notes || '',
        l.kordinatorScore || '',
        l.kordinatorNotes || '',
        l.peerInspectorName || '',
        (l as any).peerStatus || l.peerScore || '',
        l.peerNotes || '',
        l.division || 'OB',
      ];
    };

    const logHeader = [
      'ID', 'Timestamp', 'Date', 'UserID', 'UserName', 'Unit',
      'TaskTitle', 'Category', 'TimingType', 'Status', 'IsLate',
      'LateReason', 'LateReportStatus', 'PhotoURL', 'Notes', 'KordinatorScore', 'KordinatorNotes',
      'PeerInspector', 'PeerStatus', 'PeerNotes', 'Division',
    ];

    const obLogs = allLogs.filter((l) => l.division !== 'PLH');
    const plhLogs = allLogs.filter((l) => l.division === 'PLH');
    const obLogRows = [logHeader, ...obLogs.map(mapLogRow)];
    const plhLogRows = [logHeader, ...plhLogs.map(mapLogRow)];

    // 4. Prepare JobBareng values (Split OB and PLH into separate sheets)
    const allJobs = StorageService.getJobBareng();
    const mapJobRow = (j: JobBareng) => {
      const participantDisplay = (j.participantNames && j.participantNames.length > 0)
        ? j.participantNames.join(', ')
        : j.participantIds.map((id) => {
            const u = users.find((user) => user.id === id || user.username === id);
            return u ? u.name : id;
          }).join(', ');

      const completedDisplay = (j.completedUserNames && j.completedUserNames.length > 0)
        ? j.completedUserNames.join(', ')
        : j.completedUserIds.map((id) => {
            const u = users.find((user) => user.id === id || user.username === id);
            return u ? u.name : id;
          }).join(', ');

      const assignedDisplay = (j.assignedUserNames && j.assignedUserNames.length > 0)
        ? j.assignedUserNames.join(', ')
        : (j.assignedUserIds || []).map((id) => {
            const u = users.find((user) => user.id === id || user.username === id);
            return u ? u.name : id;
          }).join(', ');

      return [
        j.id,
        j.title,
        j.description,
        j.date,
        j.targetUnit,
        j.targetArea,
        j.status,
        participantDisplay,
        completedDisplay,
        j.createdAt,
        j.assignmentType || 'all',
        assignedDisplay || 'Semua Petugas',
        j.division || 'OB',
      ];
    };

    const jobHeader = ['ID', 'Title', 'Description', 'Date', 'TargetUnit', 'TargetArea', 'Status', 'Participants', 'CompletedUsers', 'CreatedAt', 'AssignmentType', 'AssignedUsers', 'Division'];
    const obJobs = allJobs.filter((j) => j.division !== 'PLH');
    const plhJobs = allJobs.filter((j) => j.division === 'PLH');
    const obJobRows = [jobHeader, ...obJobs.map(mapJobRow)];
    const plhJobRows = [jobHeader, ...plhJobs.map(mapJobRow)];

    // 5. Prepare Weekly Scores values (Split OB and PLH into separate sheets)
    const allWeeklyScores = StorageService.getWeeklyScores();
    const mapWeeklyRow = (w: WeeklyScore) => [
      w.id,
      w.userId,
      w.userName,
      w.unit,
      w.saturdayDate || w.dateRange || `Minggu ${w.weekNumber}`,
      w.year,
      w.dateRange || `Minggu ${w.weekNumber}`,
      w.score,
      w.kordinatorName || '',
      JSON.stringify(w.categoryScores || {}),
      w.notes || '',
      w.timestamp,
    ];

    const weeklyHeader = ['ID', 'UserID', 'UserName', 'Unit', 'SaturdayDate', 'Year', 'DateRange', 'Score', 'KordinatorName', 'CategoryScoresJSON', 'Notes', 'Timestamp'];
    const obScores = allWeeklyScores.filter((w) => {
      const u = users.find((usr) => usr.id === w.userId);
      return u?.division !== 'PLH';
    });
    const plhScores = allWeeklyScores.filter((w) => {
      const u = users.find((usr) => usr.id === w.userId);
      return u?.division === 'PLH';
    });
    const obWeeklyRows = [weeklyHeader, ...obScores.map(mapWeeklyRow)];
    const plhWeeklyRows = [weeklyHeader, ...plhScores.map(mapWeeklyRow)];

    // 6. Prepare WorkOrder_Pohon values (Khusus Pohon 5 Wilayah & Vendor Luar)
    const treeOrders = StorageService.getTreeWorkOrders();
    const treeHeader = [
      'ID', 'Date', 'Area', 'TreeName', 'Condition', 'TreatmentNeeded',
      'HandlerType', 'VendorName', 'VendorCost', 'ScheduledWeek', 'Urgency',
      'Status', 'Notes', 'PhotoBeforeURL', 'PhotoAfterURL', 'ReportedBy', 'ReportedByName',
      'LastCheckedDate', 'LastCheckedTime', 'LastCheckedByName', 'CheckStatusToday', 'InspectionNotes',
      'CompletedAt', 'CompletedByName', 'CreatedAt'
    ];
    const workOrderRows = [
      treeHeader,
      ...treeOrders.map((to) => [
        to.id,
        to.date,
        to.area,
        to.treeName,
        to.condition,
        to.treatmentNeeded,
        to.handlerType,
        to.vendorName || '',
        to.vendorCost || 0,
        to.scheduledWeek || '',
        to.urgency,
        to.status,
        to.notes || '',
        to.photoBeforeUrl || '',
        to.photoAfterUrl || '',
        to.reportedBy || '',
        to.reportedByName || '',
        to.lastCheckedDate || '',
        to.lastCheckedTime || '',
        to.lastCheckedByName || '',
        to.checkStatusToday || 'Belum Dicek',
        to.inspectionNotes || '',
        to.completedAt || '',
        to.completedByName || '',
        to.createdAt || now,
      ]),
    ];

    // 7. Prepare Dinas Requests & Peer Inspections values
    const dinas = StorageService.getDinasRequests();
    const dinasRows = [
      ['ID', 'Date', 'UserID', 'UserName', 'Unit', 'Reason', 'Destination', 'Status', 'ApprovedBy', 'ApprovedAt', 'CreatedAt'],
      ...dinas.map((d) => [
        d.id,
        d.date,
        d.userId,
        d.userName,
        d.unit,
        d.reason,
        d.destination,
        d.status,
        d.approvedByName || '',
        d.approvedAt || '',
        d.createdAt,
      ]),
    ];

    const peerInspections = StorageService.getPeerInspections();
    const peerRows = [
      ['ID', 'Date', 'InspectorID', 'InspectorName', 'InspectorUnit', 'InspectedUserID', 'InspectedUserName', 'InspectedUnit', 'Area', 'Status', 'Notes', 'PhotoURL', 'ChecklistJSON', 'Timestamp'],
      ...peerInspections.map((p) => [
        p.id,
        p.date,
        p.inspectorId,
        p.inspectorName,
        p.inspectorUnit,
        p.targetUserId,
        p.targetUserName,
        p.targetUnit,
        p.area || '',
        p.status || 'Sesuai Standar Kebersihan',
        p.notes || '',
        p.photoUrl || '',
        JSON.stringify(p.checklistItems || []),
        p.timestamp,
      ]),
    ];

    // Check if Web App URL is provided for direct Apps Script push
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const payload = {
          users: userRows,
          masterTasks: obTaskRows,
          masterTasks_plh: plhTaskRows,
          taskLogs: obLogRows,
          taskLogs_plh: plhLogRows,
          jobBareng: obJobRows,
          jobBareng_plh: plhJobRows,
          weeklyScores: obWeeklyRows,
          weeklyScores_plh: plhWeeklyRows,
          workOrderPohon: workOrderRows,
          dinasRequests: dinasRows,
          peerInspections: peerRows,
        };
        await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });

        syncConfig.lastSyncTime = now;
        syncConfig.isGoogleConnected = true;
        syncConfig.syncError = null;
        StorageService.saveSyncConfig(syncConfig);

        return {
          success: true,
          message: 'Data berhasil disinkronkan otomatis 2 arah ke Google Sheet (Sheet OB & PLH terpisah)!',
          timestamp: now,
        };
      } catch (err: any) {
        console.warn('Apps script push error, checking token:', err);
      }
    }

    if (!token) {
      syncConfig.lastSyncTime = now;
      StorageService.saveSyncConfig(syncConfig);
      return {
        success: true,
        message: 'Data tersimpan di penyimpanan lokal dan siap disinkronkan ke Spreadsheet.',
        timestamp: now,
      };
    }

    try {
      const batchData = [
        { range: 'Users!A1:J' + (userRows.length + 10), values: userRows },
        { range: 'MasterTask!A1:L' + (obTaskRows.length + 10), values: obTaskRows },
        { range: 'MasterTask_PLH!A1:L' + (plhTaskRows.length + 10), values: plhTaskRows },
        { range: 'TaskLogs!A1:U' + (obLogRows.length + 20), values: obLogRows },
        { range: 'TaskLogs_PLH!A1:U' + (plhLogRows.length + 20), values: plhLogRows },
        { range: 'JobBareng!A1:M' + (obJobRows.length + 10), values: obJobRows },
        { range: 'JobBareng_PLH!A1:M' + (plhJobRows.length + 10), values: plhJobRows },
        { range: 'WeeklyScores!A1:L' + (obWeeklyRows.length + 10), values: obWeeklyRows },
        { range: 'WeeklyScores_PLH!A1:L' + (plhWeeklyRows.length + 10), values: plhWeeklyRows },
        { range: 'WorkOrder_Pohon!A1:Y' + (workOrderRows.length + 15), values: workOrderRows },
        { range: 'DinasRequests!A1:K' + (dinasRows.length + 10), values: dinasRows },
        { range: 'PeerInspections!A1:N' + (peerRows.length + 10), values: peerRows },
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: batchData,
          }),
        }
      );

      syncConfig.lastSyncTime = now;
      syncConfig.isGoogleConnected = true;
      syncConfig.syncError = null;
      StorageService.saveSyncConfig(syncConfig);

      return {
        success: true,
        message: 'Berhasil sinkronisasi 2 arah ke Google Sheets (Sheet OB & PLH terpisah).',
        timestamp: now,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Sinkronisasi: ${err.message || 'Data tersimpan lokal'}.`,
        timestamp: now,
      };
    }
  },

  // Pull latest data from Google Sheets (2-way sync: Pull)
  pullFromSheets: async (): Promise<SyncResult> => {
    if (activePullPromise) {
      return activePullPromise;
    }

    activePullPromise = (async (): Promise<SyncResult> => {
      try {
        const token = getCachedAccessToken();
        const syncConfig = StorageService.getSyncConfig();
        const now = new Date().toISOString();

        // 1. Try Apps Script Web App if configured
        if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
          try {
            const pullUrl = `${syncConfig.webAppUrl}${syncConfig.webAppUrl.includes('?') ? '&' : '?'}limit=150`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);
            const response = await fetch(pullUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            const resJson = await response.json();
            if (resJson.success && resJson.data) {
              const rUsers = resJson.data.users;
              // Merge OB and PLH sheets if separated
              const rTasks = [
                ...(resJson.data.masterTasks || []),
                ...(resJson.data.masterTasks_plh || []),
              ];
              const rLogs = [
                ...(resJson.data.taskLogs || []),
                ...(resJson.data.taskLogs_plh || []),
              ];
              const rJobs = [
                ...(resJson.data.jobBareng || []),
                ...(resJson.data.jobBareng_plh || []),
              ];
              const rWeekly = [
                ...(resJson.data.weeklyScores || []),
                ...(resJson.data.weeklyScores_plh || []),
              ];
              const rDinas = resJson.data.dinasRequests;
              const rPeer = resJson.data.peerInspections;
              const rWorkOrders = resJson.data.workOrderPohon;

          if (rUsers && rUsers.length > 0) {
            const parsedUsers: User[] = rUsers
              .filter((row: any[]) => row && row.length > 0 && (row[1] || row[0]))
              .map((row: any[], i: number) => {
                const hasColPassword = row.length >= 8;
                const username = String(row[1] || `user_${i}`).trim();
                const password = hasColPassword ? String(row[2] || 'password123').trim() : (String(row[7] || 'password123').trim());
                const name = hasColPassword ? String(row[3] || 'Staff FM').trim() : String(row[2] || 'Staff FM').trim();
                const role = hasColPassword ? String(row[4] || 'user').trim().toLowerCase() : String(row[3] || 'user').trim().toLowerCase();
                const unit = hasColPassword ? String(row[5] || 'TK').trim() : String(row[4] || 'TK').trim();
                const status = hasColPassword ? String(row[6] || 'Aktif').trim() : String(row[5] || 'Aktif').trim();
                const phone = hasColPassword ? String(row[7] || '').trim() : String(row[6] || '').trim();
                const rawDivision = row[8] ? String(row[8]).trim().toUpperCase() : '';
                const division: 'OB' | 'PLH' = (rawDivision === 'PLH' || rawDivision === 'OB')
                  ? rawDivision
                  : (username.toLowerCase().includes('plh') || name.toLowerCase().includes('plh') ? 'PLH' : 'OB');

                return {
                  id: row[0] || `u-sheet-${i}`,
                  username,
                  password: password || 'password123',
                  name,
                  role: (role === 'admin' || role === 'kordinator' ? role : 'user') as any,
                  unit: unit as any,
                  status: (status.toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif') as any,
                  phone,
                  division,
                };
              });
            if (parsedUsers.length > 0) {
              StorageService.saveUsers(parsedUsers);
            }
          }

          if (rTasks !== undefined) {
            const parsedTasks: MasterTask[] = (rTasks || [])
              .filter((row: any[]) => row && row.length > 1 && String(row[1] || '').trim().length > 0)
              .map((row: any[], i: number) => {
                const rawId = String(row[0] || '').trim();
                const rawTitle = String(row[1] || 'Tugas Kebersihan').trim();
                const rawUnit = String(row[2] || 'Semua Unit').trim();
                const rawCategory = String(row[3] || 'Harian').trim();
                const rawTiming = String(row[4] || '').trim().toLowerCase();
                const rawInstructions = String(row[5] || '');
                const isJobBareng = rawCategory.toLowerCase().includes('job bareng') || rawInstructions.toLowerCase().includes('job bareng');

                // Normalize timingType: Priority to Task ID, then TimingType column, then Title
                let timingType: 'pre_readiness' | 'clock_out' | 'anytime' = 'anytime';
                const lowerId = rawId.toLowerCase();
                const lowerTitle = rawTitle.toLowerCase();
                const lowerTiming = rawTiming.toLowerCase();

                if (isJobBareng) {
                  timingType = 'anytime';
                } else if (
                  lowerId.includes('clock') ||
                  lowerId.includes('co-') ||
                  lowerId.includes('-co') ||
                  lowerTiming.includes('clock') ||
                  lowerTiming.includes('out') ||
                  lowerTiming.includes('sore') ||
                  lowerTiming.includes('penutupan') ||
                  lowerTitle.includes('clock out') ||
                  lowerTitle.includes('clock-out') ||
                  lowerTitle.includes('penutupan') ||
                  lowerTitle.includes('sore')
                ) {
                  timingType = 'clock_out';
                } else if (
                  lowerId.includes('pre') ||
                  lowerId.includes('pr-') ||
                  lowerId.includes('-pr') ||
                  lowerTiming.includes('pre') ||
                  lowerTiming.includes('pagi') ||
                  lowerTiming.includes('readiness') ||
                  lowerTitle.includes('pre-readiness') ||
                  lowerTitle.includes('pre readiness') ||
                  lowerTitle.includes('pagi')
                ) {
                  timingType = 'pre_readiness';
                } else {
                  timingType = 'anytime';
                }

                // Normalize category
                let category: 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng' = 'Harian';
                if (isJobBareng) {
                  category = 'Job Bareng';
                } else if (rawCategory.toLowerCase().includes('mingguan') || lowerId.includes('wk-') || lowerId.includes('-wk')) {
                  category = 'Mingguan';
                } else if (rawCategory.toLowerCase().includes('bulanan') || lowerId.includes('mo-') || lowerId.includes('-mo')) {
                  category = 'Bulanan';
                }

                const inactiveWords = ['nonaktif', 'false', '0', 'tidak', 'off', 'inactive'];
                const isActive = !inactiveWords.includes(String(row[7] || '').trim().toLowerCase());
                const rawAssignee = String(row[9] || '').trim();
                const standardPhotoUrl = String(row[10] || '').trim();
                const rawDivision = row[11] ? String(row[11]).trim().toUpperCase() : '';
                const taskDivision: 'OB' | 'PLH' = (rawDivision === 'PLH' || rawDivision === 'OB')
                  ? rawDivision
                  : (rawTitle.toLowerCase().includes('plh') || rawInstructions.toLowerCase().includes('plh') ? 'PLH' : 'OB');

                const fallbackId = timingType === 'pre_readiness' 
                  ? `mt-pr-${String(i + 1).padStart(2, '0')}` 
                  : timingType === 'clock_out' 
                  ? `mt-co-${String(i + 1).padStart(2, '0')}` 
                  : `mt-at-${String(i + 1).padStart(2, '0')}`;

                return {
                  id: rawId || fallbackId,
                  title: rawTitle,
                  unit: (isJobBareng ? 'Semua Unit' : (rawUnit || 'Semua Unit')) as UnitType,
                  category,
                  timingType: isJobBareng ? 'anytime' : timingType,
                  instructions: parseInstructionSteps(rawInstructions),
                  photoRequired: String(row[6] || '').toUpperCase() === 'YA',
                  isActive,
                  area: String(row[8] || 'Area Unit').trim(),
                  assignee: rawAssignee || 'Semua Petugas',
                  standardPhotoUrl: standardPhotoUrl || undefined,
                  division: taskDivision,
                };
              });
            StorageService.saveMasterTasks(parsedTasks);
          }

          if (rLogs !== undefined) {
            const masterTasks = StorageService.getMasterTasks();
            const taskById = new Map<string, MasterTask>();
            const taskByTitle = new Map<string, MasterTask>();
            const taskByTitleAndTiming = new Map<string, MasterTask>();

            for (const t of masterTasks) {
              if (t.id) taskById.set(t.id.toLowerCase(), t);
              if (t.title) {
                const lt = t.title.trim().toLowerCase();
                taskByTitle.set(lt, t);
                taskByTitleAndTiming.set(`${lt}::${t.timingType}`, t);
              }
            }

            const parsedLogs: TaskLog[] = (rLogs || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => {
                const rawTaskVal = String(row[6] || '').trim();
                let resolvedTaskId = '';
                let resolvedTaskTitle = rawTaskVal;

                // 1. If stored in format "[mt-xxx] Title"
                const idPrefixMatch = rawTaskVal.match(/^\[([^\]]+)\]\s*(.*)$/);
                if (idPrefixMatch) {
                  resolvedTaskId = idPrefixMatch[1].trim();
                  resolvedTaskTitle = idPrefixMatch[2].trim() || rawTaskVal;
                }

                // 2. High performance O(1) indexed matching
                if (resolvedTaskId) {
                  const directMatch = taskById.get(resolvedTaskId.toLowerCase());
                  if (directMatch) {
                    resolvedTaskId = directMatch.id;
                    resolvedTaskTitle = directMatch.title || resolvedTaskTitle;
                  }
                } else {
                  const directIdMatch = taskById.get(rawTaskVal.toLowerCase());
                  if (directIdMatch) {
                    resolvedTaskId = directIdMatch.id;
                    resolvedTaskTitle = directIdMatch.title;
                  } else {
                    const logTiming = String(row[8] || '').toLowerCase();
                    const matchedTask = (logTiming && logTiming !== 'anytime')
                      ? taskByTitleAndTiming.get(`${resolvedTaskTitle.trim().toLowerCase()}::${logTiming}`)
                      : taskByTitle.get(resolvedTaskTitle.trim().toLowerCase());

                    if (matchedTask) {
                      resolvedTaskId = matchedTask.id;
                      resolvedTaskTitle = matchedTask.title;
                    } else {
                      resolvedTaskId = rawTaskVal;
                    }
                  }
                }

                // Robust date parsing using dateHelper
                const parsedDate = normalizeDateString(row[2]) || normalizeDateString(row[1]) || getJakartaDateString();

                const hasLateReportCol = row.length >= 20;
                const isLateVal = String(row[10] || '').toUpperCase() === 'YA' || String(row[9] || '').toLowerCase() === 'terlambat';
                const lateReason = row[11] || undefined;
                const lateReportStatus = hasLateReportCol ? String(row[12] || '') : (isLateVal ? (lateReason ? 'SUDAH LAPOR ALASAN' : 'BELUM LAPOR ALASAN') : 'TEPAT WAKTU');
                const photoUrl = hasLateReportCol ? row[13] : row[12];
                const notes = hasLateReportCol ? row[14] : row[13];
                const kordinatorScore = hasLateReportCol ? row[15] : row[14];
                const kordinatorNotes = hasLateReportCol ? row[16] : row[15];
                const peerInspectorName = hasLateReportCol ? row[17] : row[16];
                const peerScore = hasLateReportCol ? row[18] : row[17];
                const peerNotes = hasLateReportCol ? row[19] : row[18];

                let resolvedDivision: 'OB' | 'PLH' = 'OB';
                const rawDivCol = String(row[20] || row[row.length - 1] || '').trim().toUpperCase();
                if (rawDivCol === 'PLH' || rawDivCol === 'OB') {
                  resolvedDivision = rawDivCol;
                } else {
                  const matchedUser = StorageService.getUsers().find((u) => u.id === row[3] || u.name === row[4]);
                  if (matchedUser && matchedUser.division) {
                    resolvedDivision = matchedUser.division;
                  } else if (String(row[4] || '').toUpperCase().includes('PLH') || String(resolvedTaskTitle || '').toUpperCase().includes('PLH')) {
                    resolvedDivision = 'PLH';
                  }
                }

                return {
                  id: row[0] || `tl-${i}`,
                  timestamp: row[1] || now,
                  date: parsedDate,
                  userId: row[3] || '',
                  userName: row[4] || '',
                  userRole: 'staff' as UserRole,
                  unit: row[5] || 'TK',
                  taskId: resolvedTaskId,
                  taskTitle: resolvedTaskTitle,
                  category: (row[7] || 'Harian') as any,
                  timingType: (row[8] || 'anytime') as any,
                  status: (row[9] || 'Selesai') as any,
                  isLate: isLateVal,
                  lateReason: lateReason || undefined,
                  lateReported: lateReportStatus === 'SUDAH LAPOR ALASAN',
                  photoUrl: photoUrl || undefined,
                  notes: notes || undefined,
                  kordinatorScore: kordinatorScore && !isNaN(Number(kordinatorScore)) ? Number(kordinatorScore) : undefined,
                  kordinatorNotes: kordinatorNotes || undefined,
                  peerInspectorName: peerInspectorName || undefined,
                  peerScore: peerScore && !isNaN(Number(peerScore)) ? Number(peerScore) : undefined,
                  peerNotes: peerNotes || undefined,
                  division: resolvedDivision,
                };
              });

            // 2-way sync with local data preservation
            parsedLogs.sort((a, b) => {
              const dateA = a.date || a.timestamp || '';
              const dateB = b.date || b.timestamp || '';
              return dateB.localeCompare(dateA);
            });

            StorageService.mergeTaskLogs(parsedLogs);
          }

          if (rJobs !== undefined) {
            const parsedJobs: JobBareng[] = (rJobs || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => {
                const participantsRaw = row[7] ? String(row[7]).split(',').map((s) => s.trim()).filter(Boolean) : [];
                const completedRaw = row[8] ? String(row[8]).split(',').map((s) => s.trim()).filter(Boolean) : [];
                const assignmentType = (row[10] && String(row[10]).toLowerCase() === 'specific') ? 'specific' : 'all';
                const assignedRaw = row[11] ? String(row[11]).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                const rawDivision = row[12] ? String(row[12]).trim().toUpperCase() : '';
                const jobDivision: 'OB' | 'PLH' = (rawDivision === 'PLH' || rawDivision === 'OB')
                  ? rawDivision
                  : (String(row[1] || '').toUpperCase().includes('PLH') ? 'PLH' : 'OB');

                return {
                  id: row[0] || `jb-${i}`,
                  title: row[1] || 'Job Bareng',
                  description: row[2] || '',
                  date: normalizeDateString(row[3]) || getJakartaDateString(),
                  targetUnit: row[4] || 'Semua Unit',
                  targetArea: row[5] || 'Area Terkait',
                  status: (row[6] || 'Aktif') as any,
                  assignmentType,
                  assignedUserIds: assignedRaw,
                  assignedUserNames: assignedRaw,
                  participantIds: participantsRaw,
                  participantNames: participantsRaw,
                  completedUserIds: completedRaw,
                  completedUserNames: completedRaw,
                  createdBy: row[9] || 'system',
                  createdByName: 'Kordinator',
                  createdAt: row[9] || now,
                  division: jobDivision,
                };
              });
            StorageService.mergeJobBareng(parsedJobs);
          }

          if (rDinas !== undefined) {
            const parsedDinas: DinasRequest[] = (rDinas || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => ({
                id: row[0] || `dr-${i}`,
                date: normalizeDateString(row[1]) || getJakartaDateString(),
                userId: row[2] || '',
                userName: row[3] || '',
                unit: row[4] || 'TK',
                reason: row[5] || '',
                destination: row[6] || '',
                status: (row[7] || 'Pending') as any,
                approvedByName: row[8] || undefined,
                approvedAt: row[9] || undefined,
                createdAt: row[10] || now,
              }));
            StorageService.mergeDinasRequests(parsedDinas);
          }

          if (rPeer !== undefined) {
            const parsedPeer: PeerInspection[] = (rPeer || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => {
                let checklist: { label: string; passed: boolean }[] = [];
                try {
                  if (row[12] && typeof row[12] === 'string' && row[12].trim().startsWith('[')) {
                    checklist = JSON.parse(row[12]);
                  }
                } catch (e) {
                  checklist = [];
                }
                return {
                  id: row[0] || `pi-${i}`,
                  date: normalizeDateString(row[1]) || getJakartaDateString(),
                  inspectorId: row[2] || '',
                  inspectorName: row[3] || '',
                  inspectorRole: 'user',
                  inspectorUnit: row[4] || 'TK',
                  targetUserId: row[5] || '',
                  targetUserName: row[6] || '',
                  targetUnit: row[7] || 'TK',
                  area: row[8] || '',
                  status: (row[9] || 'Sesuai Standar Kebersihan') as any,
                  notes: row[10] || '',
                  photoUrl: row[11] || undefined,
                  checklistItems: checklist,
                  timestamp: row[13] || row[11] || now,
                };
              });
            StorageService.mergePeerInspections(parsedPeer);
          }

          if (rWeekly !== undefined) {
            const parsedWeekly: WeeklyScore[] = (rWeekly || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => {
                let categoryScores: Record<string, number> = {};
                try {
                  if (row[9] && typeof row[9] === 'string' && row[9].trim().startsWith('{')) {
                    categoryScores = JSON.parse(row[9]);
                  }
                } catch (e) {
                  categoryScores = {};
                }
                const hasCategoryJson = Object.keys(categoryScores).length > 0;
                const notes = hasCategoryJson ? (row[10] || '') : (row[9] || '');
                const timestamp = hasCategoryJson ? (row[11] || now) : (row[10] || now);

                return {
                  id: row[0] || `ws-${i}`,
                  userId: row[1] || '',
                  userName: row[2] || '',
                  unit: (row[3] || 'TK') as UnitType,
                  kordinatorId: row[8] ? `u-kord-${row[8]}` : 'u-kordinator',
                  saturdayDate: row[4] || '',
                  weekNumber: isNaN(Number(row[4])) ? 1 : Number(row[4]),
                  year: isNaN(Number(row[5])) ? new Date().getFullYear() : Number(row[5]),
                  dateRange: row[6] || row[4] || '',
                  score: Number(row[7]) || 4,
                  kordinatorName: row[8] || '',
                  categoryScores,
                  notes,
                  timestamp,
                };
              });
            StorageService.saveWeeklyScores(parsedWeekly);
          }

          if (rWorkOrders && rWorkOrders.length > 0) {
            const parsedWorkOrders: TreeWorkOrder[] = rWorkOrders
              .filter((row: any[]) => row && row.length > 0 && row[0] && row[0] !== 'ID')
              .map((row: any[], i: number) => ({
                id: row[0] || `two-${i}`,
                date: normalizeDateString(row[1]) || getJakartaDateString(),
                area: row[2] || 'Area Pos 1',
                treeName: row[3] || 'Pohon Trembesi',
                condition: (row[4] || 'Ringan') as any,
                treatmentNeeded: row[5] || 'Pemangkasan Cabang Kering',
                handlerType: (row[6] || 'internal') as any,
                vendorName: row[7] || undefined,
                vendorCost: Number(row[8]) || undefined,
                scheduledWeek: row[9] || undefined,
                urgency: (row[10] || 'Sedang') as any,
                status: (row[11] || 'Tercatat') as any,
                notes: row[12] || undefined,
                photoBeforeUrl: row[13] || undefined,
                photoAfterUrl: row[14] || undefined,
                reportedBy: row[15] || undefined,
                reportedByName: row[16] || undefined,
                lastCheckedDate: row[17] || undefined,
                lastCheckedTime: row[18] || undefined,
                lastCheckedByName: row[19] || undefined,
                checkStatusToday: (row[20] || 'Belum Dicek') as any,
                inspectionNotes: row[21] || undefined,
                completedAt: row[22] || undefined,
                completedByName: row[23] || undefined,
                createdAt: row[24] || now,
              }));
            if (parsedWorkOrders.length > 0) {
              StorageService.saveTreeWorkOrders(parsedWorkOrders);
            }
          }

          syncConfig.lastSyncTime = now;
          syncConfig.isGoogleConnected = true;
          StorageService.saveSyncConfig(syncConfig);

          return {
            success: true,
            message: 'Data berhasil dimuat dari Google Sheets via Apps Script (Sheet OB & PLH terpisah)!',
            timestamp: now,
          };
        }
      } catch (err) {
        console.warn('Pull via webAppUrl error, trying API:', err);
      }
    }

    if (!token) {
      return {
        success: true,
        message: 'Menggunakan data lokal terkini.',
        timestamp: now,
      };
    }

    try {
      const ranges = [
        'Users!A2:J',             // 0
        'MasterTask!A2:L',        // 1
        'MasterTask_PLH!A2:L',    // 2
        'TaskLogs!A2:U',          // 3
        'TaskLogs_PLH!A2:U',      // 4
        'JobBareng!A2:M',         // 5
        'JobBareng_PLH!A2:M',     // 6
        'DinasRequests!A2:K',     // 7
        'PeerInspections!A2:N',   // 8
        'WeeklyScores!A2:L',      // 9
        'WeeklyScores_PLH!A2:L',  // 10
        'WorkOrder_Pohon!A2:Y',   // 11
      ];
      const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Google Sheets fetch error: ${res.statusText}`);
      }

      const data = await res.json();
      const valueRanges = data.valueRanges || [];

      // 0. Parse Users if present
      if (valueRanges[0]?.values?.length > 0) {
        const remoteUsers: User[] = valueRanges[0].values
          .filter((row: any[]) => row && row.length > 0 && (row[1] || row[0]))
          .map((row: any[], i: number) => {
            const hasColPassword = row.length >= 8;
            const username = String(row[1] || `user_${i}`).trim();
            const password = hasColPassword ? String(row[2] || 'password123').trim() : (String(row[7] || 'password123').trim());
            const name = hasColPassword ? String(row[3] || 'Staff FM').trim() : String(row[2] || 'Staff FM').trim();
            const role = hasColPassword ? String(row[4] || 'user').trim().toLowerCase() : String(row[3] || 'user').trim().toLowerCase();
            const unit = hasColPassword ? String(row[5] || 'TK').trim() : String(row[4] || 'TK').trim();
            const status = hasColPassword ? String(row[6] || 'Aktif').trim() : String(row[5] || 'Aktif').trim();
            const phone = hasColPassword ? String(row[7] || '').trim() : String(row[6] || '').trim();
            const rawDivision = row[8] ? String(row[8]).trim().toUpperCase() : '';
            const division: 'OB' | 'PLH' = (rawDivision === 'PLH' || rawDivision === 'OB')
              ? rawDivision
              : (username.toLowerCase().includes('plh') || name.toLowerCase().includes('plh') ? 'PLH' : 'OB');

            return {
              id: row[0] || `u-sheet-${i}`,
              username,
              password: password || 'password123',
              name,
              role: (role === 'admin' || role === 'kordinator' ? role : 'user') as any,
              unit: unit as any,
              status: (status.toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif') as any,
              phone,
              division,
            };
          });
        if (remoteUsers.length > 0) {
          StorageService.saveUsers(remoteUsers);
        }
      }

      // 1. Parse MasterTasks if present (Combine MasterTask and MasterTask_PLH)
      const combinedTaskRows = [
        ...(valueRanges[1]?.values || []),
        ...(valueRanges[2]?.values || []),
      ];
      if (combinedTaskRows.length > 0) {
        const remoteTasks: MasterTask[] = combinedTaskRows
          .filter((row: any[]) => row && row.length > 1 && String(row[1] || '').trim().length > 0)
          .map((row: any[], i: number) => {
            const rawId = String(row[0] || '').trim();
            const rawTitle = String(row[1] || 'Tugas Kebersihan').trim();
            const rawUnit = String(row[2] || 'Semua Unit').trim();
            const rawCategory = String(row[3] || 'Harian').trim();
            const rawTiming = String(row[4] || '').trim().toLowerCase();
            const rawInstructions = String(row[5] || '');
            const isJobBareng = rawCategory.toLowerCase().includes('job bareng') || rawInstructions.toLowerCase().includes('job bareng');

            // Normalize timingType: Priority to Task ID, then TimingType column, then Title
            let timingType: 'pre_readiness' | 'clock_out' | 'anytime' = 'anytime';
            const lowerId = rawId.toLowerCase();
            const lowerTitle = rawTitle.toLowerCase();
            const lowerTiming = rawTiming.toLowerCase();

            if (isJobBareng) {
              timingType = 'anytime';
            } else if (
              lowerId.includes('clock') ||
              lowerId.includes('co-') ||
              lowerId.includes('-co') ||
              lowerTiming.includes('clock') ||
              lowerTiming.includes('out') ||
              lowerTiming.includes('sore') ||
              lowerTiming.includes('penutupan') ||
              lowerTitle.includes('clock out') ||
              lowerTitle.includes('clock-out') ||
              lowerTitle.includes('penutupan') ||
              lowerTitle.includes('sore')
            ) {
              timingType = 'clock_out';
            } else if (
              lowerId.includes('pre') ||
              lowerId.includes('pr-') ||
              lowerId.includes('-pr') ||
              lowerTiming.includes('pre') ||
              lowerTiming.includes('pagi') ||
              lowerTiming.includes('readiness') ||
              lowerTitle.includes('pre-readiness') ||
              lowerTitle.includes('pre readiness') ||
              lowerTitle.includes('pagi')
            ) {
              timingType = 'pre_readiness';
            } else {
              timingType = 'anytime';
            }

            // Normalize category
            let category: 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng' = 'Harian';
            if (isJobBareng) {
              category = 'Job Bareng';
            } else if (rawCategory.toLowerCase().includes('mingguan') || lowerId.includes('wk-') || lowerId.includes('-wk')) {
              category = 'Mingguan';
            } else if (rawCategory.toLowerCase().includes('bulanan') || lowerId.includes('mo-') || lowerId.includes('-mo')) {
              category = 'Bulanan';
            }

            const inactiveWords = ['nonaktif', 'false', '0', 'tidak', 'off', 'inactive'];
            const isActive = !inactiveWords.includes(String(row[7] || '').trim().toLowerCase());
            const rawAssignee = String(row[9] || '').trim();
            const standardPhotoUrl = String(row[10] || '').trim();
            const rawDivision = row[11] ? String(row[11]).trim().toUpperCase() : '';
            const taskDivision: 'OB' | 'PLH' = (rawDivision === 'PLH' || rawDivision === 'OB')
              ? rawDivision
              : (rawTitle.toLowerCase().includes('plh') || rawInstructions.toLowerCase().includes('plh') ? 'PLH' : 'OB');

            const fallbackId = timingType === 'pre_readiness' 
              ? `mt-pr-${String(i + 1).padStart(2, '0')}` 
              : timingType === 'clock_out' 
              ? `mt-co-${String(i + 1).padStart(2, '0')}` 
              : `mt-at-${String(i + 1).padStart(2, '0')}`;

            return {
              id: rawId || fallbackId,
              title: rawTitle,
              unit: (isJobBareng ? 'Semua Unit' : (rawUnit || 'Semua Unit')) as UnitType,
              category,
              timingType: isJobBareng ? 'anytime' : timingType,
              instructions: parseInstructionSteps(rawInstructions),
              photoRequired: String(row[6] || '').toUpperCase() === 'YA',
              isActive,
              area: String(row[8] || 'Area Unit').trim(),
              assignee: rawAssignee || 'Semua Petugas',
              standardPhotoUrl: standardPhotoUrl || undefined,
              division: taskDivision,
            };
          });
        if (remoteTasks.length > 0) {
          StorageService.saveMasterTasks(remoteTasks);
        }
      }

      // 2. Parse TaskLogs if present (Combine TaskLogs and TaskLogs_PLH)
      const combinedLogRows = [
        ...(valueRanges[3]?.values || []),
        ...(valueRanges[4]?.values || []),
      ];
      if (combinedLogRows.length > 0) {
        const masterTasks = StorageService.getMasterTasks();
        const taskById = new Map<string, MasterTask>();
        const taskByTitle = new Map<string, MasterTask>();
        const taskByTitleAndTiming = new Map<string, MasterTask>();

        for (const t of masterTasks) {
          if (t.id) taskById.set(t.id.toLowerCase(), t);
          if (t.title) {
            const lt = t.title.trim().toLowerCase();
            taskByTitle.set(lt, t);
            taskByTitleAndTiming.set(`${lt}::${t.timingType}`, t);
          }
        }

        const parsedLogs: TaskLog[] = combinedLogRows
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => {
            const rawTaskVal = String(row[6] || '').trim();
            let resolvedTaskId = '';
            let resolvedTaskTitle = rawTaskVal;

            // 1. If stored in format "[mt-xxx] Title"
            const idPrefixMatch = rawTaskVal.match(/^\[([^\]]+)\]\s*(.*)$/);
            if (idPrefixMatch) {
              resolvedTaskId = idPrefixMatch[1].trim();
              resolvedTaskTitle = idPrefixMatch[2].trim() || rawTaskVal;
            }

            // 2. Fast O(1) indexed matching
            if (resolvedTaskId) {
              const directMatch = taskById.get(resolvedTaskId.toLowerCase());
              if (directMatch) {
                resolvedTaskId = directMatch.id;
                resolvedTaskTitle = directMatch.title || resolvedTaskTitle;
              }
            } else {
              const directIdMatch = taskById.get(rawTaskVal.toLowerCase());
              if (directIdMatch) {
                resolvedTaskId = directIdMatch.id;
                resolvedTaskTitle = directIdMatch.title;
              } else {
                const logTiming = String(row[8] || '').toLowerCase();
                const matchedTask = (logTiming && logTiming !== 'anytime')
                  ? taskByTitleAndTiming.get(`${resolvedTaskTitle.trim().toLowerCase()}::${logTiming}`)
                  : taskByTitle.get(resolvedTaskTitle.trim().toLowerCase());

                if (matchedTask) {
                  resolvedTaskId = matchedTask.id;
                  resolvedTaskTitle = matchedTask.title;
                } else {
                  resolvedTaskId = rawTaskVal;
                }
              }
            }

            const hasLateReportCol = row.length >= 20;
            const isLateVal = String(row[10] || '').toUpperCase() === 'YA' || String(row[9] || '').toLowerCase() === 'terlambat';
            const lateReason = row[11] || undefined;
            const photoUrl = hasLateReportCol ? row[13] : row[12];
            const notes = hasLateReportCol ? row[14] : row[13];
            const kordinatorScore = hasLateReportCol ? row[15] : row[14];
            const kordinatorNotes = hasLateReportCol ? row[16] : row[15];
            const peerInspectorName = hasLateReportCol ? row[17] : row[16];
            const peerStatus = hasLateReportCol ? row[18] : row[17];
            const peerNotes = hasLateReportCol ? row[19] : row[18];

            let resolvedDivision: 'OB' | 'PLH' = 'OB';
            const rawDivCol = String(row[20] || row[row.length - 1] || '').trim().toUpperCase();
            if (rawDivCol === 'PLH' || rawDivCol === 'OB') {
              resolvedDivision = rawDivCol;
            } else {
              const matchedUser = StorageService.getUsers().find((u) => u.id === row[3] || u.name === row[4]);
              if (matchedUser && matchedUser.division) {
                resolvedDivision = matchedUser.division;
              } else if (String(row[4] || '').toUpperCase().includes('PLH') || String(resolvedTaskTitle || '').toUpperCase().includes('PLH')) {
                resolvedDivision = 'PLH';
              }
            }

            return {
              id: row[0] || `tl-sheet-${i}`,
              timestamp: row[1] || now,
              date: normalizeDateString(row[2]) || normalizeDateString(row[1]) || getJakartaDateString(),
              userId: row[3] || '',
              userName: row[4] || '',
              userRole: 'staff' as UserRole,
              unit: row[5] || 'TK',
              taskId: resolvedTaskId,
              taskTitle: resolvedTaskTitle,
              category: (row[7] || 'Harian') as any,
              timingType: (row[8] || 'anytime') as any,
              status: (row[9] || 'Selesai') as any,
              isLate: isLateVal,
              lateReason,
              photoUrl: photoUrl || undefined,
              notes: notes || undefined,
              kordinatorScore: kordinatorScore ? Number(kordinatorScore) : undefined,
              kordinatorNotes: kordinatorNotes || undefined,
              peerInspectorName: peerInspectorName || undefined,
              peerStatus: peerStatus || undefined,
              peerNotes: peerNotes || undefined,
              division: resolvedDivision,
            };
          });

        parsedLogs.sort((a, b) => {
          const dateA = a.date || a.timestamp || '';
          const dateB = b.date || b.timestamp || '';
          return dateB.localeCompare(dateA);
        });

        StorageService.mergeTaskLogs(parsedLogs);
      }

      // 3. Parse JobBareng if present (Combine JobBareng and JobBareng_PLH)
      const combinedJobRows = [
        ...(valueRanges[5]?.values || []),
        ...(valueRanges[6]?.values || []),
      ];
      if (combinedJobRows.length > 0) {
        const parsedJobs: JobBareng[] = combinedJobRows
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => {
            const participantsRaw = row[7] ? String(row[7]).split(',').map((s) => s.trim()).filter(Boolean) : [];
            const completedRaw = row[8] ? String(row[8]).split(',').map((s) => s.trim()).filter(Boolean) : [];
            const assignmentType = (row[10] && String(row[10]).toLowerCase() === 'specific') ? 'specific' : 'all';
            const assignedRaw = row[11] ? String(row[11]).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
            const rawDivision = row[12] ? String(row[12]).trim().toUpperCase() : '';
            const jobDivision: 'OB' | 'PLH' = (rawDivision === 'PLH' || rawDivision === 'OB')
              ? rawDivision
              : (String(row[1] || '').toUpperCase().includes('PLH') ? 'PLH' : 'OB');

            return {
              id: row[0] || `jb-${i}`,
              title: row[1] || 'Job Bareng',
              description: row[2] || '',
              date: normalizeDateString(row[3]) || getJakartaDateString(),
              targetUnit: row[4] || 'Semua Unit',
              targetArea: row[5] || 'Area Terkait',
              status: (row[6] || 'Aktif') as any,
              assignmentType,
              assignedUserIds: assignedRaw,
              assignedUserNames: assignedRaw,
              participantIds: participantsRaw,
              participantNames: participantsRaw,
              completedUserIds: completedRaw,
              completedUserNames: completedRaw,
              createdBy: row[9] || 'system',
              createdByName: 'Kordinator',
              createdAt: row[9] || now,
              division: jobDivision,
            };
          });

        StorageService.mergeJobBareng(parsedJobs);
      }

      // 4. Parse DinasRequests if present
      if (valueRanges[7]?.values?.length > 0) {
        const parsedDinas: DinasRequest[] = valueRanges[7].values
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => ({
            id: row[0] || `dr-${i}`,
            date: normalizeDateString(row[1]) || getJakartaDateString(),
            userId: row[2] || '',
            userName: row[3] || '',
            unit: row[4] || 'TK',
            reason: row[5] || '',
            destination: row[6] || '',
            status: (row[7] || 'Pending') as any,
            approvedByName: row[8] || undefined,
            approvedAt: row[9] || undefined,
            createdAt: row[10] || now,
          }));
        StorageService.mergeDinasRequests(parsedDinas);
      }

      // 5. Parse PeerInspections if present
      if (valueRanges[8]?.values?.length > 0) {
        const parsedPeer: PeerInspection[] = valueRanges[8].values
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => {
            let checklist: { label: string; passed: boolean }[] = [];
            try {
              if (row[12] && typeof row[12] === 'string' && row[12].trim().startsWith('[')) {
                checklist = JSON.parse(row[12]);
              }
            } catch (e) {
              checklist = [];
            }
            return {
              id: row[0] || `pi-${i}`,
              date: normalizeDateString(row[1]) || getJakartaDateString(),
              inspectorId: row[2] || '',
              inspectorName: row[3] || '',
              inspectorRole: 'user',
              inspectorUnit: row[4] || 'TK',
              targetUserId: row[5] || '',
              targetUserName: row[6] || '',
              targetUnit: row[7] || 'TK',
              area: row[8] || '',
              status: (row[9] || 'Sesuai Standar Kebersihan') as any,
              notes: row[10] || '',
              photoUrl: row[11] || undefined,
              checklistItems: checklist,
              timestamp: row[13] || now,
            };
          });
        StorageService.savePeerInspections(parsedPeer);
      }

      // 6. Parse WeeklyScores if present (Combine WeeklyScores and WeeklyScores_PLH)
      const combinedWeeklyRows = [
        ...(valueRanges[9]?.values || []),
        ...(valueRanges[10]?.values || []),
      ];
      if (combinedWeeklyRows.length > 0) {
        const parsedScores: WeeklyScore[] = combinedWeeklyRows
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => {
            let categoryScores = {};
            try {
              if (row[9] && typeof row[9] === 'string' && row[9].trim().startsWith('{')) {
                categoryScores = JSON.parse(row[9]);
              }
            } catch (e) {
              categoryScores = {};
            }
            return {
              id: row[0] || `ws-${i}`,
              userId: row[1] || '',
              userName: row[2] || '',
              unit: (row[3] || 'TK') as UnitType,
              kordinatorId: row[8] ? `u-kord-${row[8]}` : 'u-kordinator',
              weekNumber: 1,
              year: Number(row[5]) || new Date().getFullYear(),
              dateRange: row[6] || '',
              saturdayDate: row[4] || '',
              score: Number(row[7]) || 4.0,
              kordinatorName: row[8] || '',
              categoryScores,
              notes: row[10] || '',
              timestamp: row[11] || now,
            };
          });
        StorageService.saveWeeklyScores(parsedScores);
      }

      // 7. Parse WorkOrder_Pohon if present
      if (valueRanges[11]?.values?.length > 0) {
        const parsedWorkOrders: TreeWorkOrder[] = valueRanges[11].values
          .filter((row: any[]) => row && row.length > 0 && row[0] && row[0] !== 'ID')
          .map((row: any[], i: number) => ({
            id: row[0] || `two-${i}`,
            date: normalizeDateString(row[1]) || getJakartaDateString(),
            area: row[2] || 'Area Pos 1',
            treeName: row[3] || 'Pohon Trembesi',
            condition: (row[4] || 'Ringan') as any,
            treatmentNeeded: row[5] || 'Pemangkasan Cabang Kering',
            handlerType: (row[6] || 'internal') as any,
            vendorName: row[7] || undefined,
            vendorCost: Number(row[8]) || undefined,
            scheduledWeek: row[9] || undefined,
            urgency: (row[10] || 'Sedang') as any,
            status: (row[11] || 'Tercatat') as any,
            notes: row[12] || undefined,
            photoBeforeUrl: row[13] || undefined,
            photoAfterUrl: row[14] || undefined,
            reportedBy: row[15] || undefined,
            reportedByName: row[16] || undefined,
            lastCheckedDate: row[17] || undefined,
            lastCheckedTime: row[18] || undefined,
            lastCheckedByName: row[19] || undefined,
            checkStatusToday: (row[20] || 'Belum Dicek') as any,
            inspectionNotes: row[21] || undefined,
            completedAt: row[22] || undefined,
            completedByName: row[23] || undefined,
            createdAt: row[24] || now,
          }));
        if (parsedWorkOrders.length > 0) {
          StorageService.saveTreeWorkOrders(parsedWorkOrders);
        }
      }

      syncConfig.lastSyncTime = now;
      syncConfig.isGoogleConnected = true;
      StorageService.saveSyncConfig(syncConfig);

        return {
          success: true,
          message: 'Data berhasil diperbarui dari Google Sheets Lazuardi GCS.',
          timestamp: now,
        };
      } catch (err: any) {
        return {
          success: true,
          message: 'Menggunakan data lokal aktif.',
          timestamp: now,
        };
      }
    } finally {
      activePullPromise = null;
    }
  })();

  return activePullPromise;
},

  // Setup all sheets automatically via Apps Script or REST API
  setupDatabase: async (): Promise<SyncResult> => {
    const syncConfig = StorageService.getSyncConfig();
    const now = new Date().toISOString();

    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(`${syncConfig.webAppUrl}?action=setup`, {
          method: 'GET',
        });
        const resJson = await res.json();
        if (resJson && resJson.success) {
          return {
            success: true,
            message: resJson.message || 'Setup database sheet OB & PLH berhasil dibuat secara otomatis!',
            timestamp: now,
          };
        }
      } catch (err: any) {
        console.warn('Apps Script setup call failed:', err);
      }
    }

    // Direct pushAllToSheets as initialization
    try {
      const pushRes = await GoogleSheetsService.pushAllToSheets();
      return {
        success: pushRes.success,
        message: pushRes.message || 'Database lokal & sinkronisasi Google Sheets berhasil dikonfigurasi!',
        timestamp: now,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Gagal menjalankan setup database otomatis.',
        timestamp: now,
      };
    }
  },
};

export const googleSheetsService = GoogleSheetsService;
