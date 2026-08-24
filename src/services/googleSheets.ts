import { StorageService } from './storage';
import { getCachedAccessToken } from './auth';
import {
  User,
  MasterTask,
  TaskLog,
  JobBareng,
  DinasRequest,
  PeerInspection,
  WeeklyScore,
} from '../types';
import { parseInstructionSteps } from '../utils/instructionHelper';

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
  
  // 1. Setup Sheet: Users (dengan kolom Password)
  var usersHeader = ["ID", "Username", "Password", "Name", "Role", "Unit", "Status", "Phone"];
  var initialUsers = [
    ["u-admin-1", "admin", "password123", "Alpian (Admin FM)", "admin", "Pelangi Direktorat", "Aktif", "08123456789"],
    ["u-kord-tk", "kordinator_tk", "password123", "Kordinator Unit TK", "kordinator", "TK", "Aktif", "08129876543"],
    ["u-kord-sd", "kordinator_sd", "password123", "Kordinator Unit SD", "kordinator", "SD", "Aktif", "08129876544"],
    ["u-kord-smp", "kordinator_smp", "password123", "Kordinator Unit SMP", "kordinator", "SMP", "Aktif", "08129876545"],
    ["u-ob-1", "budi_tk", "password123", "Budi Santoso", "user", "TK", "Aktif", "08120000001"],
    ["u-ob-2", "agus_sd", "password123", "Agus Setiawan", "user", "SD", "Aktif", "08120000002"],
    ["u-ob-3", "joko_smp", "password123", "Joko Susilo", "user", "SMP", "Aktif", "08120000003"],
    ["u-ob-4", "hendra_dir", "password123", "Hendra Wijaya", "user", "Pelangi Direktorat", "Aktif", "08120000004"],
    ["u-ob-5", "deni_arazi", "password123", "Deni Prasetyo", "user", "Gedung Ar Razi", "Aktif", "08120000005"],
    ["u-ob-6", "rizky_khaldun", "password123", "Rizky Firmansyah", "user", "Gedung Ibnu Khaldun", "Aktif", "08120000006"]
  ];
  createOrSetupSheet(ss, "Users", usersHeader, initialUsers, "#0f172a");

  // 2. Setup Sheet: MasterTask (Standar Kebersihan Lazuardi)
  var masterTaskHeader = ["ID", "Title", "Unit", "Category", "TimingType", "Instructions", "PhotoRequired", "IsActive", "Area", "Assignee", "StandardPhotoURL"];
  var initialMasterTasks = [
    // Pre-Readiness Pagi (00:00 - 09:00 WIB)
    ["mt-001", "Pre-Readiness: Pembersihan & Sanitasi Toilet", "Semua Unit", "Harian", "pre_readiness", "Kuras & bersihkan kloset | Isi sabun cuci tangan & tisu | Pel lantai disinfektan", "YA", "AKTIF", "Toilet & Selasar", "Budi Santoso (OB)", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80"],
    ["mt-002", "Pre-Readiness: Sapu, Pel & Kerapihan Ruang Kelas", "Semua Unit", "Harian", "pre_readiness", "Sapu bersih debu & sampah kolong meja | Pel lantai wangi | Rapikan formasi meja-kursi", "YA", "AKTIF", "Ruang Kelas", "Siti Aminah (OG)", "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80"],
    ["mt-003", "Pre-Readiness: Penyemprotan Disinfektan Handle Pintu & Meja Guru", "Semua Unit", "Harian", "pre_readiness", "Lap handle pintu & saklar | Bersihkan meja & kursi guru", "YA", "AKTIF", "Area Umum & Guru", "Agus Setiawan (OB)", ""],
    ["mt-004", "Pre-Readiness: Pengosongan Seluruh Tempat Sampah", "Semua Unit", "Harian", "pre_readiness", "Angkut seluruh tempat sampah kelas & selasar ke TPS | Pasang trashbag baru", "YA", "AKTIF", "Selasar & Koridor", "Ratih Purwasih (OG)", ""],
    
    // Anytime / Operasional Harian
    ["mt-005", "Pembersihan Rutin Selasar, Koridor & Tangga", "Semua Unit", "Harian", "anytime", "Sapu selasar | Pel jika ada noda atau licin | Cek kebersihan handrail tangga", "YA", "AKTIF", "Koridor & Tangga", "Semua Petugas", "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80"],
    ["mt-006", "Pengecekan Dispenser & Air Minum Galon", "Semua Unit", "Harian", "anytime", "Cek ketersediaan air galon siswa & guru | Lap baki tetesan dispenser", "TIDAK", "AKTIF", "Pantry & Koridor", "Semua Petugas", ""],

    // Clock Out Sore / Penutupan (09:00 - 23:59 WIB)
    ["mt-007", "Clock Out: Penguncian Pintu, Jendela & Matikan AC/Lampu", "Semua Unit", "Harian", "clock_out", "Pastikan seluruh AC & lampu mati | Kunci jendela & pintu ruangan", "YA", "AKTIF", "Seluruh Ruangan Unit", "Hendra Wijaya (OB)", ""],
    ["mt-008", "Clock Out: Pembersihan Akhir Toilet & Wastafel", "Semua Unit", "Harian", "clock_out", "Keringkan lantai | Matikan keran air | Pastikan tidak ada air terbuang", "YA", "AKTIF", "Toilet Unit", "Maya Indah (OG)", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80"],
    ["mt-009", "Clock Out: Pengangkutan Sampah Sore ke TPS Akhir", "Semua Unit", "Harian", "clock_out", "Pastikan tidak ada sisa sampah organik di dalam gedung", "YA", "AKTIF", "TPS Luar", "Dodi Firmansyah (OB)", ""],

    // Job Bareng (Kolom F ada kata 'Job Bareng' / Kategori 'Job Bareng')
    ["mt-010", "General Cleaning Lapangan & Area Parkir (Job Bareng)", "Semua Unit", "Job Bareng", "anytime", "Pembersihan bersama tim FM seluruh unit | Sapu daun gugur | Semprot saluran drainase", "YA", "AKTIF", "Lapangan & Parkir", "Semua Petugas", ""],
    ["mt-011", "Cuci Toren & Filter Air Utama (Job Bareng)", "Semua Unit", "Job Bareng", "anytime", "Pembersihan toren air bersama tim teknik & FM", "YA", "AKTIF", "Rooftop Toren", "Semua Petugas", ""],

    // Mingguan & Bulanan
    ["mt-012", "Pembersihan Kaca Jendela Luar & Dalam", "Semua Unit", "Mingguan", "anytime", "Gunakan wiper & pembersih kaca | Lap bingkai kusen", "YA", "AKTIF", "Jendela Gedung", "Ilham Saputra (OB)", "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"],
    ["mt-013", "Deep Cleaning Saluran Air & Drainase Selokan", "Semua Unit", "Mingguan", "anytime", "Angkat endapan lumpur | Pastikan aliran air lancar bebas jentik", "YA", "AKTIF", "Saluran Selokan", "Fajar Ramadhan (OB)", ""],
    ["mt-014", "Pembersihan Sawang Langit-langit & Plafon Tinggi", "Semua Unit", "Bulanan", "anytime", "Gunakan stik panjang sawang | Bersihkan exhaust fan", "YA", "AKTIF", "Plafon & Exhaust", "Semua Petugas", ""]
  ];
  createOrSetupSheet(ss, "MasterTask", masterTaskHeader, initialMasterTasks, "#1e3a8a");

  // 3. Setup Sheet: TaskLogs (Mencatat Keterlambatan, Alasan, Status Laporan, dan Foto Drive)
  var taskLogsHeader = [
    "ID", "Timestamp", "Date", "UserID", "UserName", "Unit", 
    "TaskTitle", "Category", "TimingType", "Status", "IsLate", 
    "LateReason", "LateReportStatus", "PhotoURL", "Notes", "KordinatorScore", "KordinatorNotes", 
    "PeerInspector", "PeerStatus", "PeerNotes"
  ];
  createOrSetupSheet(ss, "TaskLogs", taskLogsHeader, [], "#065f46");

  // 4. Setup Sheet: JobBareng (Tugas Insidental)
  var jobBarengHeader = ["ID", "Title", "Description", "Date", "TargetUnit", "TargetArea", "Status", "Participants", "CompletedUsers", "CreatedAt", "AssignmentType", "AssignedUsers"];
  var initialJobBareng = [
    ["jb-001", "Kerja Bakti Lapangan & Area Parkir Utama", "Pembersihan massal menyambut acara sekolah. Seluruh OB/OG bergabung.", Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"), "Semua Unit", "Lapangan Utama", "Aktif", "u-ob-1, u-ob-2, u-ob-3", "", new Date().toISOString(), "all", "Semua Petugas"]
  ];
  createOrSetupSheet(ss, "JobBareng", jobBarengHeader, initialJobBareng, "#3730a3");

  // 5. Setup Sheet: DinasRequests
  var dinasHeader = ["ID", "Date", "UserID", "UserName", "Unit", "Reason", "Destination", "Status", "ApprovedBy", "ApprovedAt", "CreatedAt"];
  createOrSetupSheet(ss, "DinasRequests", dinasHeader, [], "#92400e");

  // 6. Setup Sheet: PeerInspections (Inspeksi Silang Tim / Checklist Tanpa Nilai Angka)
  var peerHeader = ["ID", "Date", "InspectorID", "InspectorName", "InspectorUnit", "InspectedUserID", "InspectedUserName", "InspectedUnit", "Area", "Status", "Notes", "PhotoURL", "ChecklistJSON", "Timestamp"];
  createOrSetupSheet(ss, "PeerInspections", peerHeader, [], "#831843");

  // 7. Setup Sheet: WeeklyScores (Penilaian Kordinator & Admin Skala 1 - 4 Berdasarkan Tanggal Hari Sabtu)
  var weeklyHeader = ["ID", "UserID", "UserName", "Unit", "SaturdayDate", "Year", "DateRange", "Score", "KordinatorName", "CategoryScoresJSON", "Notes", "Timestamp"];
  createOrSetupSheet(ss, "WeeklyScores", weeklyHeader, [], "#1f2937");

  return { success: true, message: "Database Lazuardi FM berhasil disetup otomatis!" };
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
 * Mengambil seluruh data database atau mengeksekusi aksi setup.
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

    var result = {
      users: readSheet(ss, "Users"),
      masterTasks: readSheet(ss, "MasterTask"),
      taskLogs: readSheet(ss, "TaskLogs"),
      jobBareng: readSheet(ss, "JobBareng"),
      dinasRequests: readSheet(ss, "DinasRequests"),
      peerInspections: readSheet(ss, "PeerInspections"),
      weeklyScores: readSheet(ss, "WeeklyScores"),
      timestamp: new Date().toISOString()
    };

    return jsonOutput({ success: true, data: result });
  } catch (err) {
    return jsonOutput({ success: false, error: String(err) });
  }
}

/**
 * Web App POST Endpoint:
 * Menerima real-time log task baru, sync data pengguna, upload foto Google Drive, atau batch update.
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var payload = JSON.parse(rawContents);

    // 1. Single Task Log Real-time Append / Upsert (Simpan foto ke Google Drive & rekam alasan keterlambatan)
    if (payload.action === "logTask" && payload.logRow) {
      var sheet = ss.getSheetByName("TaskLogs");
      if (!sheet) {
        setupDatabase();
        sheet = ss.getSheetByName("TaskLogs");
      }

      // Check PhotoURL (index 13 in 20-col format, or index 12 if legacy)
      var photoIdx = payload.logRow.length >= 20 ? 13 : 12;
      if (payload.logRow[photoIdx] && typeof payload.logRow[photoIdx] === "string" && (payload.logRow[photoIdx].indexOf("data:image") === 0 || payload.logRow[photoIdx].length > 500)) {
        var staffName = (payload.logRow[4] || "staff").toString().replace(/\s+/g, "_");
        var fn = "bukti_" + staffName + "_" + (new Date().getTime()) + ".jpg";
        payload.logRow[photoIdx] = saveBase64ImageToDrive(payload.logRow[photoIdx], fn);
      }

      // Upsert: Periksa apakah TaskLog ID atau (UserID + TaskTitle + Date) sudah ada di sheet
      var lastRow = sheet.getLastRow();
      var existingRowIndex = -1;

      if (lastRow > 1) {
        var data = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 10)).getValues();
        var targetId = String(payload.logRow[0] || "");
        var targetUserId = String(payload.logRow[3] || "");
        var targetDate = String(payload.logRow[2] || "");
        var targetTitle = String(payload.logRow[6] || "").toLowerCase().trim();

        for (var r = 0; r < data.length; r++) {
          var rowId = String(data[r][0] || "");
          var rowDate = String(data[r][2] || "");
          var rowUserId = String(data[r][3] || "");
          var rowTitle = String(data[r][6] || "").toLowerCase().trim();

          if (rowId === targetId || (rowUserId === targetUserId && rowDate === targetDate && rowTitle === targetTitle)) {
            existingRowIndex = r + 2; // +2 for 1-based index and header row
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
        message: "Task log & alasan keterlambatan tersimpan di Google Sheet!", 
        photoUrl: payload.logRow[photoIdx] 
      });
    }

    // 2. Upload Photo Proof to Google Drive Folder
    if (payload.action === "uploadPhoto" && payload.base64) {
      var driveUrl = saveBase64ImageToDrive(payload.base64, payload.filename);
      return jsonOutput({
        success: true,
        driveUrl: driveUrl,
        webViewLink: driveUrl
      });
    }

    // 3. Setup Database Trigger
    if (payload.action === "setupDatabase") {
      var setupResult = setupDatabase();
      return jsonOutput(setupResult);
    }

    // 4. Batch Sync Full Data
    if (payload.users && payload.users.length) writeSheet(ss, "Users", payload.users);
    if (payload.masterTasks && payload.masterTasks.length) writeSheet(ss, "MasterTask", payload.masterTasks);
    if (payload.taskLogs && payload.taskLogs.length) writeSheet(ss, "TaskLogs", payload.taskLogs);
    if (payload.jobBareng && payload.jobBareng.length) writeSheet(ss, "JobBareng", payload.jobBareng);
    if (payload.dinasRequests && payload.dinasRequests.length) writeSheet(ss, "DinasRequests", payload.dinasRequests);
    if (payload.peerInspections && payload.peerInspections.length) writeSheet(ss, "PeerInspections", payload.peerInspections);
    if (payload.weeklyScores && payload.weeklyScores.length) writeSheet(ss, "WeeklyScores", payload.weeklyScores);

    return jsonOutput({ 
      success: true, 
      message: "Sinkronisasi 2 arah berhasil diperbarui di Google Sheet!", 
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    return jsonOutput({ success: false, error: String(err) });
  }
}

// Baca data sheet dan abaikan baris header
function readSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1);
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
        if (row && row[12] && typeof row[12] === "string" && (row[12].indexOf("data:image") === 0 || row[12].length > 500)) {
          var staff = (row[4] || "staff").toString().replace(/\\s+/g, "_");
          row[12] = saveBase64ImageToDrive(row[12], "bukti_" + staff + "_" + r + "_" + (new Date().getTime()) + ".jpg");
        }
      }
    } else if (sheetName === "MasterTask") {
      for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (row && row[10] && typeof row[10] === "string" && (row[10].indexOf("data:image") === 0 || row[10].length > 500)) {
          row[10] = saveBase64ImageToDrive(row[10], "standar_sop_" + r + "_" + (new Date().getTime()) + ".jpg");
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
  var photoRange = sheet.getRange(2, 13, lastRow - 1, 1); // Kolom M (PhotoURL)
  var values = photoRange.getValues();
  
  for (var i = 0; i < values.length; i++) {
    var cellValue = String(values[i][0] || "").trim();
    if (cellValue && (cellValue.indexOf("data:image") === 0 || cellValue.length > 500)) {
      var staffName = sheet.getRange(i + 2, 5).getValue() || "staff";
      var fn = "bukti_" + String(staffName).replace(/\\s+/g, "_") + "_" + (i + 1) + ".jpg";
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
    const syncConfig = StorageService.getSyncConfig();
    const token = getCachedAccessToken();

    // 1. Try Apps Script Web App upload (if configured)
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const res = await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'uploadPhoto',
            base64: dataUrl,
            filename: filename || `lz_bukti_${Date.now()}.jpg`,
          }),
        });
        const resJson = await res.json();
        if (resJson && resJson.success && resJson.driveUrl) {
          return { driveUrl: resJson.driveUrl, fileId: resJson.fileId };
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

  // Real-time single TaskLog direct append to Google Sheet
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

    const logRow = [
      log.id,
      log.timestamp,
      log.date,
      log.userId,
      log.userName,
      log.unit,
      log.taskTitle,
      log.category,
      log.timingType,
      log.status,
      isLate ? 'YA' : 'TIDAK',
      log.lateReason || '',
      lateReportStatus,
      log.photoUrl || '',
      log.notes || '',
      log.kordinatorScore || '',
      log.kordinatorNotes || '',
      log.peerInspectorName || '',
      (log as any).peerStatus || log.peerScore || '',
      log.peerNotes || '',
    ];

    // 1. Post to Apps Script Web App (if configured)
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'logTask',
            logRow,
          }),
        });
      } catch (err) {
        console.warn('Real-time task log post failed, will be included in full sync:', err);
      }
    }

    // 2. Direct Google Sheets REST API append fallback (if OAuth token present)
    if (token) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/TaskLogs!A:T:append?valueInputOption=USER_ENTERED`,
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

    // 1. Prepare Users values (Include Password column for Google Sheet direct management)
    const users = StorageService.getUsers();
    const userRows = [
      ['ID', 'Username', 'Password', 'Name', 'Role', 'Unit', 'Status', 'Phone'],
      ...users.map((u) => [
        u.id,
        u.username,
        u.password || 'password123',
        u.name,
        u.role,
        u.unit,
        u.status,
        u.phone || '',
      ]),
    ];

    // 2. Prepare MasterTask values
    const tasks = StorageService.getMasterTasks();
    const taskRows = [
      ['ID', 'Title', 'Unit', 'Category', 'TimingType', 'Instructions', 'PhotoRequired', 'IsActive', 'Area', 'Assignee', 'StandardPhotoURL'],
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
      ]),
    ];

    // 3. Prepare TaskLogs values
    const logs = StorageService.getTaskLogs();
    const logRows = [
      [
        'ID',
        'Timestamp',
        'Date',
        'UserID',
        'UserName',
        'Unit',
        'TaskTitle',
        'Category',
        'TimingType',
        'Status',
        'IsLate',
        'LateReason',
        'LateReportStatus',
        'PhotoURL',
        'Notes',
        'KordinatorScore',
        'KordinatorNotes',
        'PeerInspector',
        'PeerStatus',
        'PeerNotes',
      ],
      ...logs.map((l) => {
        const isLate = l.isLate || l.status === 'Terlambat';
        const hasReason = Boolean(l.lateReason && l.lateReason.trim().length > 0);
        const lateReportStatus = isLate
          ? hasReason
            ? 'SUDAH LAPOR ALASAN'
            : 'BELUM LAPOR ALASAN'
          : l.status === 'Dinas Luar'
          ? 'DINAS LUAR'
          : 'TEPAT WAKTU';

        return [
          l.id,
          l.timestamp,
          l.date,
          l.userId,
          l.userName,
          l.unit,
          l.taskTitle,
          l.category,
          l.timingType,
          l.status,
          isLate ? 'YA' : 'TIDAK',
          l.lateReason || '',
          lateReportStatus,
          l.photoUrl || '',
          l.notes || '',
          l.kordinatorScore || '',
          l.kordinatorNotes || '',
          l.peerInspectorName || '',
          (l as any).peerStatus || l.peerScore || '',
          l.peerNotes || '',
        ];
      }),
    ];

    // 4. Prepare JobBareng values
    const jobs = StorageService.getJobBareng();
    const jobRows = [
      ['ID', 'Title', 'Description', 'Date', 'TargetUnit', 'TargetArea', 'Status', 'Participants', 'CompletedUsers', 'CreatedAt', 'AssignmentType', 'AssignedUsers'],
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
        ];
      }),
    ];

    // 5. Prepare Dinas Requests values
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

    // 6. Prepare Peer Inspections values
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

    // 7. Prepare Weekly Scores values (1-4 scale)
    const weeklyScores = StorageService.getWeeklyScores();
    const weeklyRows = [
      ['ID', 'UserID', 'UserName', 'Unit', 'SaturdayDate', 'Year', 'DateRange', 'Score', 'KordinatorName', 'CategoryScoresJSON', 'Notes', 'Timestamp'],
      ...weeklyScores.map((w) => [
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
      ]),
    ];

    // Check if Web App URL is provided for direct Apps Script push
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const payload = {
          users: userRows,
          masterTasks: taskRows,
          taskLogs: logRows,
          jobBareng: jobRows,
          dinasRequests: dinasRows,
          peerInspections: peerRows,
          weeklyScores: weeklyRows,
        };
        await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          mode: 'no-cors', // standard Apps Script trigger
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        syncConfig.lastSyncTime = now;
        syncConfig.isGoogleConnected = true;
        syncConfig.syncError = null;
        StorageService.saveSyncConfig(syncConfig);

        return {
          success: true,
          message: 'Data berhasil disinkronkan otomatis 2 arah via Apps Script & Spreadsheet!',
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
        { range: 'Users!A1:H' + (userRows.length + 10), values: userRows },
        { range: 'MasterTask!A1:K' + (taskRows.length + 10), values: taskRows },
        { range: 'TaskLogs!A1:T' + (logRows.length + 20), values: logRows },
        { range: 'JobBareng!A1:L' + (jobRows.length + 10), values: jobRows },
        { range: 'DinasRequests!A1:K' + (dinasRows.length + 10), values: dinasRows },
        { range: 'PeerInspections!A1:N' + (peerRows.length + 10), values: peerRows },
        { range: 'WeeklyScores!A1:L' + (weeklyRows.length + 10), values: weeklyRows },
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
        message: 'Berhasil sinkronisasi 2 arah ke Google Sheets & Drive Lazuardi GCS.',
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
    const token = getCachedAccessToken();
    const syncConfig = StorageService.getSyncConfig();
    const now = new Date().toISOString();

    // 1. Try Apps Script Web App if configured
    if (syncConfig.webAppUrl && syncConfig.webAppUrl.startsWith('http')) {
      try {
        const response = await fetch(syncConfig.webAppUrl);
        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          const {
            users: rUsers,
            masterTasks: rTasks,
            taskLogs: rLogs,
            jobBareng: rJobs,
            dinasRequests: rDinas,
            peerInspections: rPeer,
            weeklyScores: rWeekly,
          } = resJson.data;

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

                return {
                  id: row[0] || `u-sheet-${i}`,
                  username,
                  password: password || 'password123',
                  name,
                  role: (role === 'admin' || role === 'kordinator' ? role : 'user') as any,
                  unit: unit as any,
                  status: (status.toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif') as any,
                  phone,
                };
              });
            if (parsedUsers.length > 0) {
              StorageService.saveUsers(parsedUsers);
            }
          }

          if (rTasks && rTasks.length > 0) {
            const parsedTasks: MasterTask[] = rTasks
              .filter((row: any[]) => row && row.length > 1 && String(row[1] || '').trim().length > 0)
              .map((row: any[], i: number) => {
                const rawTitle = String(row[1] || 'Tugas Kebersihan').trim();
                const rawUnit = String(row[2] || 'Semua Unit').trim();
                const rawCategory = String(row[3] || 'Harian').trim();
                const rawTiming = String(row[4] || 'pre_readiness').trim().toLowerCase();
                const rawInstructions = String(row[5] || '');
                const isJobBareng = rawCategory.toLowerCase().includes('job bareng') || rawInstructions.toLowerCase().includes('job bareng');

                // Normalize timingType
                let timingType: 'pre_readiness' | 'clock_out' | 'anytime' = 'anytime';
                if (rawTiming.includes('pre') || rawTiming.includes('pagi')) {
                  timingType = 'pre_readiness';
                } else if (rawTiming.includes('clock') || rawTiming.includes('out') || rawTiming.includes('sore')) {
                  timingType = 'clock_out';
                }

                // Normalize category
                let category: 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng' = 'Harian';
                if (isJobBareng) {
                  category = 'Job Bareng';
                } else if (rawCategory.toLowerCase().includes('mingguan')) {
                  category = 'Mingguan';
                } else if (rawCategory.toLowerCase().includes('bulanan')) {
                  category = 'Bulanan';
                }

                const inactiveWords = ['nonaktif', 'false', '0', 'tidak', 'off', 'inactive'];
                const isActive = !inactiveWords.includes(String(row[7] || '').trim().toLowerCase());
                const rawAssignee = String(row[9] || '').trim();
                const standardPhotoUrl = String(row[10] || '').trim();

                return {
                  id: row[0] || `mt-sheet-${i}`,
                  title: rawTitle,
                  unit: isJobBareng ? 'Semua Unit' : (rawUnit || 'Semua Unit'),
                  category,
                  timingType: isJobBareng ? 'anytime' : timingType,
                  instructions: parseInstructionSteps(rawInstructions),
                  photoRequired: String(row[6] || '').toUpperCase() === 'YA',
                  isActive,
                  area: String(row[8] || 'Area Unit').trim(),
                  assignee: rawAssignee || 'Semua Petugas',
                  standardPhotoUrl: standardPhotoUrl || undefined,
                };
              });
            if (parsedTasks.length > 0) {
              StorageService.saveMasterTasks(parsedTasks);
            }
          }

          if (rLogs !== undefined) {
            const masterTasks = StorageService.getMasterTasks();
            const existingLocalLogs = StorageService.getTaskLogs();
            const parsedLogs: TaskLog[] = (rLogs || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => {
                const rawTaskVal = String(row[6] || '').trim();
                let resolvedTaskId = rawTaskVal;
                let resolvedTaskTitle = rawTaskVal;
                const matchedTask = masterTasks.find(
                  (t) => t.id === rawTaskVal || t.title.toLowerCase() === rawTaskVal.toLowerCase()
                );
                if (matchedTask) {
                  resolvedTaskId = matchedTask.id;
                  resolvedTaskTitle = matchedTask.title;
                }

                // Robust date parsing
                let parsedDate = '';
                const rawDate = row[2];
                if (rawDate instanceof Date) {
                  parsedDate = rawDate.toISOString().split('T')[0];
                } else if (typeof rawDate === 'string' && rawDate.trim().length > 0) {
                  const s = rawDate.trim();
                  if (s.includes('T')) {
                    parsedDate = s.split('T')[0];
                  } else if (s.includes('/')) {
                    const parts = s.split('/');
                    if (parts.length === 3) {
                      if (parts[2].length === 4) {
                        parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      } else if (parts[0].length === 4) {
                        parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                      } else {
                        parsedDate = s;
                      }
                    } else {
                      parsedDate = s;
                    }
                  } else {
                    parsedDate = s;
                  }
                } else if (row[1]) {
                  const ts = String(row[1]).trim();
                  parsedDate = ts.includes('T') ? ts.split('T')[0] : ts;
                } else {
                  parsedDate = now.split('T')[0];
                }

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

                return {
                  id: row[0] || `tl-${i}`,
                  timestamp: row[1] || now,
                  date: parsedDate,
                  userId: row[3] || '',
                  userName: row[4] || '',
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
                };
              });

            // Merge local and sheet logs by ID to retain all historical test data
            const logMap = new Map<string, TaskLog>();
            existingLocalLogs.forEach((l) => logMap.set(l.id, l));
            parsedLogs.forEach((l) => logMap.set(l.id, l));
            const mergedLogs = Array.from(logMap.values()).sort((a, b) => {
              const dateA = a.date || a.timestamp || '';
              const dateB = b.date || b.timestamp || '';
              return dateB.localeCompare(dateA);
            });

            StorageService.saveTaskLogs(mergedLogs);
          }

          if (rJobs !== undefined) {
            const parsedJobs: JobBareng[] = (rJobs || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => {
                const participantsRaw = row[7] ? String(row[7]).split(',').map((s) => s.trim()).filter(Boolean) : [];
                const completedRaw = row[8] ? String(row[8]).split(',').map((s) => s.trim()).filter(Boolean) : [];
                const assignmentType = (row[10] && String(row[10]).toLowerCase() === 'specific') ? 'specific' : 'all';
                const assignedRaw = row[11] ? String(row[11]).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
                return {
                  id: row[0] || `jb-${i}`,
                  title: row[1] || 'Job Bareng',
                  description: row[2] || '',
                  date: row[3] || now.split('T')[0],
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
                  createdAt: row[9] || now,
                };
              });
            StorageService.saveJobBareng(parsedJobs);
          }

          if (rDinas !== undefined) {
            const parsedDinas: DinasRequest[] = (rDinas || [])
              .filter((row: any[]) => row && row.length > 0 && row[0])
              .map((row: any[], i: number) => ({
                id: row[0] || `dr-${i}`,
                date: row[1] || now.split('T')[0],
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
            StorageService.saveDinasRequests(parsedDinas);
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
                  date: row[1] || now.split('T')[0],
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
            StorageService.savePeerInspections(parsedPeer);
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
                  unit: row[3] || 'TK',
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

          syncConfig.lastSyncTime = now;
          syncConfig.isGoogleConnected = true;
          StorageService.saveSyncConfig(syncConfig);

          return {
            success: true,
            message: 'Data berhasil dimuat dari Google Sheets via Apps Script!',
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
        'Users!A2:H',
        'MasterTask!A2:K',
        'TaskLogs!A2:T',
        'JobBareng!A2:L',
        'DinasRequests!A2:K',
        'PeerInspections!A2:N',
        'WeeklyScores!A2:L',
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

            return {
              id: row[0] || `u-sheet-${i}`,
              username,
              password: password || 'password123',
              name,
              role: (role === 'admin' || role === 'kordinator' ? role : 'user') as any,
              unit: unit as any,
              status: (status.toLowerCase() === 'nonaktif' ? 'Nonaktif' : 'Aktif') as any,
              phone,
            };
          });
        if (remoteUsers.length > 0) {
          StorageService.saveUsers(remoteUsers);
        }
      }

      // 1. Parse MasterTasks if present (Column F Job Bareng support & Column K Standar Kebersihan Photo)
      if (valueRanges[1]?.values?.length > 0) {
        const remoteTasks: MasterTask[] = valueRanges[1].values
          .filter((row: any[]) => row && row.length > 1 && String(row[1] || '').trim().length > 0)
          .map((row: any[], i: number) => {
            const rawTitle = String(row[1] || 'Tugas Kebersihan').trim();
            const rawUnit = String(row[2] || 'Semua Unit').trim();
            const rawCategory = String(row[3] || 'Harian').trim();
            const rawTiming = String(row[4] || 'pre_readiness').trim().toLowerCase();
            const rawInstructions = String(row[5] || '');
            const isJobBareng = rawCategory.toLowerCase().includes('job bareng') || rawInstructions.toLowerCase().includes('job bareng');

            let timingType: 'pre_readiness' | 'clock_out' | 'anytime' = 'anytime';
            if (rawTiming.includes('pre') || rawTiming.includes('pagi')) {
              timingType = 'pre_readiness';
            } else if (rawTiming.includes('clock') || rawTiming.includes('out') || rawTiming.includes('sore')) {
              timingType = 'clock_out';
            }

            let category: 'Harian' | 'Mingguan' | 'Bulanan' | 'Job Bareng' = 'Harian';
            if (isJobBareng) {
              category = 'Job Bareng';
            } else if (rawCategory.toLowerCase().includes('mingguan')) {
              category = 'Mingguan';
            } else if (rawCategory.toLowerCase().includes('bulanan')) {
              category = 'Bulanan';
            }

            const inactiveWords = ['nonaktif', 'false', '0', 'tidak', 'off', 'inactive'];
            const isActive = !inactiveWords.includes(String(row[7] || '').trim().toLowerCase());
            const rawAssignee = String(row[9] || '').trim();
            const standardPhotoUrl = String(row[10] || '').trim();

            return {
              id: row[0] || `mt-sheet-${i}`,
              title: rawTitle,
              unit: isJobBareng ? 'Semua Unit' : (rawUnit || 'Semua Unit'),
              category,
              timingType: isJobBareng ? 'anytime' : timingType,
              instructions: parseInstructionSteps(rawInstructions),
              photoRequired: String(row[6] || '').toUpperCase() === 'YA',
              isActive,
              area: String(row[8] || 'Area Unit').trim(),
              assignee: rawAssignee || 'Semua Petugas',
              standardPhotoUrl: standardPhotoUrl || undefined,
            };
          });
        if (remoteTasks.length > 0) {
          StorageService.saveMasterTasks(remoteTasks);
        }
      }

      // 2. Parse TaskLogs if present (including LateReason, LateReportStatus, PhotoURL)
      if (valueRanges[2]?.values?.length > 0) {
        const masterTasks = StorageService.getMasterTasks();
        const existingLocalLogs = StorageService.getTaskLogs();
        const parsedLogs: TaskLog[] = valueRanges[2].values
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => {
            const rawTaskVal = String(row[6] || '').trim();
            let resolvedTaskId = rawTaskVal;
            let resolvedTaskTitle = rawTaskVal;
            const matchedTask = masterTasks.find(
              (t) => t.id === rawTaskVal || t.title.toLowerCase() === rawTaskVal.toLowerCase()
            );
            if (matchedTask) {
              resolvedTaskId = matchedTask.id;
              resolvedTaskTitle = matchedTask.title;
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

            return {
              id: row[0] || `tl-sheet-${i}`,
              timestamp: row[1] || now,
              date: row[2] || now.split('T')[0],
              userId: row[3] || '',
              userName: row[4] || '',
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
            };
          });

        const logMap = new Map<string, TaskLog>();
        existingLocalLogs.forEach((l) => logMap.set(l.id, l));
        parsedLogs.forEach((l) => logMap.set(l.id, l));
        StorageService.saveTaskLogs(Array.from(logMap.values()));
      }

      // 3. Parse JobBareng if present
      if (valueRanges[3]?.values?.length > 0) {
        const existingLocalJobs = StorageService.getJobBareng();
        const parsedJobs: JobBareng[] = valueRanges[3].values
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => {
            const participantsRaw = row[7] ? String(row[7]).split(',').map((s) => s.trim()).filter(Boolean) : [];
            const completedRaw = row[8] ? String(row[8]).split(',').map((s) => s.trim()).filter(Boolean) : [];
            const assignmentType = (row[10] && String(row[10]).toLowerCase() === 'specific') ? 'specific' : 'all';
            const assignedRaw = row[11] ? String(row[11]).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
            return {
              id: row[0] || `jb-${i}`,
              title: row[1] || 'Job Bareng',
              description: row[2] || '',
              date: row[3] || now.split('T')[0],
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
              createdAt: row[9] || now,
            };
          });

        const jobMap = new Map<string, JobBareng>();
        existingLocalJobs.forEach((j) => jobMap.set(j.id, j));
        parsedJobs.forEach((j) => {
          const existing = jobMap.get(j.id);
          if (existing) {
            const mergedParticipants = Array.from(new Set([...(existing.participantNames || existing.participantIds || []), ...(j.participantNames || j.participantIds || [])]));
            const mergedCompleted = Array.from(new Set([...(existing.completedUserNames || existing.completedUserIds || []), ...(j.completedUserNames || j.completedUserIds || [])]));
            jobMap.set(j.id, {
              ...existing,
              ...j,
              participantNames: mergedParticipants,
              participantIds: mergedParticipants,
              completedUserNames: mergedCompleted,
              completedUserIds: mergedCompleted,
            });
          } else {
            jobMap.set(j.id, j);
          }
        });
        StorageService.saveJobBareng(Array.from(jobMap.values()));
      }

      // 4. Parse DinasRequests if present
      if (valueRanges[4]?.values?.length > 0) {
        const parsedDinas: DinasRequest[] = valueRanges[4].values
          .filter((row: any[]) => row && row.length > 0 && row[0])
          .map((row: any[], i: number) => ({
            id: row[0] || `dr-${i}`,
            date: row[1] || now.split('T')[0],
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
        StorageService.saveDinasRequests(parsedDinas);
      }

      // 5. Parse PeerInspections if present
      if (valueRanges[5]?.values?.length > 0) {
        const parsedPeer: PeerInspection[] = valueRanges[5].values
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
              date: row[1] || now.split('T')[0],
              inspectorId: row[2] || '',
              inspectorName: row[3] || '',
              inspectorUnit: row[4] || 'TK',
              targetUserId: row[5] || '',
              targetUserName: row[6] || '',
              targetUnit: row[7] || 'TK',
              area: row[8] || '',
              status: (row[9] || 'Sesuai') as any,
              notes: row[10] || '',
              photoUrl: row[11] || undefined,
              checklist,
              timestamp: row[13] || now,
            };
          });
        StorageService.savePeerInspections(parsedPeer);
      }

      // 6. Parse WeeklyScores if present
      if (valueRanges[6]?.values?.length > 0) {
        const parsedScores: WeeklyScore[] = valueRanges[6].values
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
              unit: row[3] || 'TK',
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
  },
};
