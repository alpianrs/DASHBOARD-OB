import { TreeWorkOrder, JobBareng, DivisionType, DEFAULT_PLH_AREA_STAFF, TaskLog, MasterTask, User } from '../types';
import { formatJakartaDisplayDate, getJakartaDateString } from './dateHelper';
import { getMondayOfWeek } from './masjidRolling';
import { formatGoogleDriveImageUrl, getGoogleDriveViewLink, extractGoogleDriveFileId } from './driveHelper';
import { isTaskAssignedToUser } from '../services/storage';

/**
 * Utility Sanitasi Nama Staf PLH Resmi (mencegah munculnya nama dummy / demo akun)
 */
export const sanitizePlhStaffName = (name?: string, area?: string): string => {
  if (!name) return '';
  const lower = name.toLowerCase();
  const dummy = [
    'kusnadi',
    'slamet',
    'bambang',
    'surya wijaya',
    'ahmad fauzi',
    'petugas kolam',
  ];
  if (dummy.some((d) => lower.includes(d))) {
    if (area && DEFAULT_PLH_AREA_STAFF[area] && !dummy.some((d) => DEFAULT_PLH_AREA_STAFF[area].name.toLowerCase().includes(d))) {
      return DEFAULT_PLH_AREA_STAFF[area].name;
    }
    return 'Rahmat Hidayat (Kord PLH)';
  }
  return name;
};

/**
 * Utility Generator PDF & Printable Work Order resmi Lazuardi GCS Facility Management
 * Mendukung format cetak resmi (A4, Kop Surat Yayasan, Foto Before-After, QR Code Stamp, Tanda Tangan)
 */

const getLazuardiLetterhead = (divisionText: string, docTitle: string, docNumber: string) => `
  <div style="border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 16px;">
      <div style="width: 65px; height: 65px; border-radius: 12px; background: linear-gradient(135deg, #047857, #065f46); color: #ffffff; display: flex; align-items: center; justify-content: center; font-family: sans-serif; font-weight: 900; font-size: 24px; letter-spacing: -1px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
        LZ
      </div>
      <div>
        <h1 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          YAYASAN LAZUARDI HAYATI - GLOBAL COMPASSIONATE SCHOOL
        </h1>
        <h2 style="font-size: 13px; font-weight: 700; color: #047857; margin: 2px 0 0 0; text-transform: uppercase;">
          FACILITY MANAGEMENT (FM)
        </h2>
        <p style="font-size: 10px; color: #64748b; margin: 3px 0 0 0; line-height: 1.3;">
          Sekolah Lazuardi GCS • Griya Cinere I Jl. Garuda Ujung No.35, Cinere, Kec. Limo, Kota Depok, Jawa Barat 16515 • Hotline FM: (021) 753-4888 • Divisi: <strong>${divisionText}</strong>
        </p>
      </div>
    </div>
    <div style="text-align: right; border-left: 2px solid #e2e8f0; padding-left: 14px;">
      <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">No. Dokumen:</div>
      <div style="font-size: 11px; font-weight: 800; color: #0f172a; font-family: monospace;">${docNumber}</div>
      <div style="font-size: 9px; color: #047857; font-weight: 700; margin-top: 3px;">STATUS: VERIFIED</div>
    </div>
  </div>
  <div style="text-align: center; margin-bottom: 18px;">
    <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; display: inline-block; padding-bottom: 3px;">
      ${docTitle}
    </h3>
  </div>
`;

const getPrintStyles = () => `
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm 15mm 12mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-before: always;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
      font-size: 10.5px;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-urgent { background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .badge-medium { background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-low { background-color: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
    .badge-completed { background-color: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .badge-vendor { background-color: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
    .badge-internal { background-color: #f0fdf4; color: #166534; border: 1px solid #86efac; }
    .meta-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 15px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 20px;
    }
    .meta-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 3px;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
      font-size: 10px;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 30px;
      text-align: center;
    }
    .signature-box {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      margin-top: 55px;
      font-size: 10px;
      color: #0f172a;
    }
  </style>
`;

/**
 * 1. Unduh / Cetak Work Order Pohon Tunggal (Surat Perintah Kerja Resmi)
 */
export const generateTreeWorkOrderPdf = (order: TreeWorkOrder): string => {
  const isVendor = order.handlerType === 'Vendor Luar' || order.isLargeTreatment;
  const urgencyBadge =
    order.urgency === 'Tinggi / Bahaya'
      ? 'badge-urgent'
      : order.urgency === 'Sedang'
      ? 'badge-medium'
      : 'badge-low';

  const docNumber = `WO-PLH-${order.id.toUpperCase()}`;

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${docNumber} - Work Order Pohon Lazuardi</title>
      ${getPrintStyles()}
    </head>
    <body>
      ${getLazuardiLetterhead('PLH (PEMELIHARAAN LINGKUNGAN HIDUP)', 'SURAT PERINTAH KERJA & WORK ORDER POHON', docNumber)}

      <div class="meta-box">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">ID Work Order:</span>
            <span class="meta-value">${order.id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tanggal Pelaporan:</span>
            <span class="meta-value">${formatJakartaDisplayDate(order.date)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Area Tanggung Jawab:</span>
            <span class="meta-value" style="color: #047857;">${order.area}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Petugas Penanggung Jawab Area:</span>
            <span class="meta-value">${sanitizePlhStaffName(order.assignedStaffName || order.reportedByName, order.area)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tingkat Urgensi:</span>
            <span class="badge ${urgencyBadge}">${order.urgency}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Status Penanganan:</span>
            <span class="badge badge-completed">${order.status}</span>
          </div>
        </div>
      </div>

      <h4 style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; text-transform: uppercase;">
        A. SPESIFIKASI POHON & DIAGNOSA LINGKUNGAN
      </h4>
      <table>
        <tr>
          <th style="width: 28%;">Nama & Karakteristik Pohon</th>
          <td style="font-weight: 700; font-size: 11px; color: #0f172a;">${order.treeName}</td>
        </tr>
        <tr>
          <th>Kondisi Fisik Pohon</th>
          <td style="font-weight: 700; color: ${order.condition === 'Miring / Rawan Tumbang' ? '#dc2626' : '#0f172a'};">
            ${order.condition}
          </td>
        </tr>
        <tr>
          <th>Tindakan / Treatment Dibutuhkan</th>
          <td style="font-weight: 700; color: #047857;">${order.treatmentNeeded}</td>
        </tr>
        <tr>
          <th>Catatan Khusus Lapangan</th>
          <td style="font-style: italic; color: #475569;">${order.notes || 'Tidak ada catatan khusus tambahan.'}</td>
        </tr>
      </table>

      <h4 style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; text-transform: uppercase;">
        B. PELAKSANA & ANGGARAN PEKERJAAN
      </h4>
      <table>
        <tr>
          <th style="width: 28%;">Klasifikasi Pelaksana</th>
          <td>
            <span class="badge ${isVendor ? 'badge-vendor' : 'badge-internal'}">
              ${order.handlerType} ${isVendor ? '(Treatment Besar)' : ''}
            </span>
          </td>
        </tr>
        ${
          isVendor
            ? `
          <tr>
            <th>Vendor Rekanan Ditunjuk</th>
            <td style="font-weight: 700; color: #9a3412;">${order.vendorName || 'Dalam Proses Penunjukan Vendor'}</td>
          </tr>
          <tr>
            <th>Target Pengerjaan Mingguan</th>
            <td style="font-weight: 700;">${order.scheduledWeek || 'Minggu berjalan'}</td>
          </tr>
          <tr>
            <th>Estimasi Biaya Vendor</th>
            <td style="font-weight: 800; font-size: 12px; color: #0f172a;">
              ${order.vendorCost ? `Rp ${order.vendorCost.toLocaleString('id-ID')}` : 'Estimasi Pengajuan'}
            </td>
          </tr>
        `
            : `
          <tr>
            <th>Tim Pelaksana</th>
            <td style="font-weight: 700;">Internal Tim Divisi PLH Lazuardi (Peralatan Standar FM)</td>
          </tr>
          <tr>
            <th>Target Waktu Selesai</th>
            <td>Pekerjaan rutin harian / mingguan</td>
          </tr>
        `
        }
        ${
          order.completedAt
            ? `
          <tr>
            <th>Waktu Penyelesaian</th>
            <td style="font-weight: 700; color: #047857;">
              Selesai pada ${new Date(order.completedAt).toLocaleString('id-ID')} oleh ${sanitizePlhStaffName(order.completedByName, order.area) || '-'}
            </td>
          </tr>
        `
            : ''
        }
      </table>

      <!-- Standar Acuan Foto & SOP Pemeriksaan -->
      ${
        order.standardPhotoAngleGuide || order.standardPhotoUrl
          ? `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; margin: 10px 0;">
          <div style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 3px;">
            📸 STANDAR & PANDUAN PENGAMBILAN FOTO MONITORING POHON (SOP PLH)
          </div>
          <div style="font-size: 9.5px; color: #14532d; line-height: 1.4;">
            <strong>Sudut & Jarak Pengambilan:</strong> ${order.standardPhotoAngleGuide || 'Foto utuh dari jarak 5–10 meter agar seluruh profil pohon tampak (tajuk atas, batang, dan perakaran bawah).'}<br/>
            <strong>Standar SOP 5 Poin:</strong> 1. Foto Utuh (5-10m) • 2. Kanopi & Dahan Bebas Kabel PLN • 3. Batang Bebas Rayap/Benalu • 4. Daun Sehat Bebas Ulat • 5. Perakaran Stabil & Bersih Serasah.
          </div>
        </div>
      `
          : ''
      }

      <!-- Dokumentasi Foto -->
      ${
        order.photoBeforeUrl || order.photoAfterUrl || order.standardPhotoUrl
          ? `
        <h4 style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; text-transform: uppercase;">
          C. DOKUMENTASI FOTO LAPANGAN
        </h4>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
          ${
            order.standardPhotoUrl
              ? `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; text-align: center; background-color: #f8fafc;">
              <div style="font-size: 9px; font-weight: 800; color: #166534; margin-bottom: 4px;">FOTO ACUAN STANDAR RESMI</div>
              <img src="${formatGoogleDriveImageUrl(order.standardPhotoUrl)}" style="max-height: 130px; max-width: 100%; object-fit: cover; border-radius: 4px;" alt="Standar Acuan" />
              <div style="font-size: 8px; color: #475569; margin-top: 3px;">Tolok Ukur Sudut Lapangan</div>
            </div>
          `
              : ''
          }
          ${
            order.photoBeforeUrl || order.drivePhotoBeforeUrl
              ? `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; text-align: center; background-color: #f8fafc;">
              <div style="font-size: 9px; font-weight: 700; color: #475569; margin-bottom: 4px;">FOTO SEBELUM (KONDISI AWAL)</div>
              <img src="${formatGoogleDriveImageUrl(order.photoBeforeUrl || order.drivePhotoBeforeUrl)}" style="max-height: 130px; max-width: 100%; object-fit: cover; border-radius: 4px;" alt="Before" />
              <a href="${getGoogleDriveViewLink(order.drivePhotoBeforeUrl || order.photoBeforeUrl)}" target="_blank" style="font-size: 8px; color: #0284c7; text-decoration: underline; display: block; margin-top: 4px; word-break: break-all;">🔗 Buka di Drive</a>
            </div>
          `
              : ''
          }
          ${
            order.photoAfterUrl || order.drivePhotoAfterUrl
              ? `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; text-align: center; background-color: #f8fafc;">
              <div style="font-size: 9px; font-weight: 700; color: #047857; margin-bottom: 4px;">FOTO SESUDAH PENANGANAN</div>
              <img src="${formatGoogleDriveImageUrl(order.photoAfterUrl || order.drivePhotoAfterUrl)}" style="max-height: 130px; max-width: 100%; object-fit: cover; border-radius: 4px;" alt="After" />
              <a href="${getGoogleDriveViewLink(order.drivePhotoAfterUrl || order.photoAfterUrl)}" target="_blank" style="font-size: 8px; color: #0284c7; text-decoration: underline; display: block; margin-top: 4px; word-break: break-all;">🔗 Buka di Drive</a>
            </div>
          `
              : ''
          }
        </div>
      `
          : ''
      }

      <!-- Lembar Tanda Tangan Resmi -->
      <div class="signature-grid">
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PETUGAS PENANGGUNG JAWAB AREA</div>
          <div class="signature-box">
            <strong>${sanitizePlhStaffName(order.assignedStaffName || order.reportedByName, order.area)}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Staff PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KORDINATOR DIVISI PLH</div>
          <div class="signature-box">
            <strong>Rahmat Hidayat</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kordinator Divisi PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KEPALA BAGIAN FM</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kepala Bagian Facility Management</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * 1B. Unduh / Cetak Laporan Riwayat Pengecekan & Penanganan Pohon Lengkap (History Log PDF)
 */
export const generateTreeHistoryReportPdf = (order: TreeWorkOrder): string => {
  const docNumber = `HIST-PLH-${order.id.toUpperCase()}-${getJakartaDateString().replace(/-/g, '')}`;
  const historyList = order.inspectionHistory || [];

  const lastDate = order.lastCheckedDate || order.date;
  let weeklyStatusText = 'Belum pernah dicek';
  let isCeklisAman = false;
  if (lastDate) {
    const currentMonday = getMondayOfWeek();
    const isThisWeek = lastDate >= currentMonday;
    const isAman =
      order.checkStatusToday === 'Sudah Dicek Aman' ||
      order.checkStatusToday === 'Sudah Dicek' ||
      order.condition === 'Normal / Sehat' ||
      order.status === 'Selesai' ||
      order.treatmentStatus === 'Sudah Ditangani';

    if (isThisWeek && isAman) {
      isCeklisAman = true;
      weeklyStatusText = `✅ SUDAH CEKLIS AMAN (Minggu Ini - Reset Tiap Senin)`;
    } else if (order.checkStatusToday === 'Perlu Penanganan' || (order.treatmentStatus === 'Belum Ditangani' && order.status === 'Perlu Penanganan')) {
      weeklyStatusText = `🚨 PERLU PENANGANAN (Ditemukan Masalah)`;
    } else {
      weeklyStatusText = `⚠️ WAJIB PENGECEKAN MINGGU INI (Reset Tiap Senin)`;
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${docNumber} - Riwayat Pengecekan Pohon ${order.treeName}</title>
      ${getPrintStyles()}
    </head>
    <body>
      ${getLazuardiLetterhead('PLH (PEMELIHARAAN LINGKUNGAN HIDUP)', 'LAPORAN RIWAYAT PENGECEKAN & PENANGANAN POHON', docNumber)}

      <!-- Meta Info Box -->
      <div class="meta-box">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Nama / Jenis Pohon:</span>
            <span class="meta-value">${order.treeName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Wilayah / Area Tanggung Jawab:</span>
            <span class="meta-value">${order.area}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Penanggung Jawab Area:</span>
            <span class="meta-value"><strong>${sanitizePlhStaffName(order.assignedStaffName || order.reportedByName, order.area) || '-'}</strong> (${order.area})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Status Pengecekan Mingguan:</span>
            <span class="meta-value" style="font-weight: 800; color: ${isCeklisAman ? '#047857' : '#b45309'};">${weeklyStatusText}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Kondisi Fisik Saat Ini:</span>
            <span class="meta-value">${order.condition}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Pengecekan Terakhir:</span>
            <span class="meta-value">${order.lastCheckedDate || order.date} ${order.lastCheckedTime ? `(${order.lastCheckedTime})` : ''} oleh ${sanitizePlhStaffName(order.lastCheckedByName || order.reportedByName, order.area)}</span>
          </div>
        </div>
      </div>

      <!-- Dokumentasi Foto Before & After -->
      ${
        order.photoBeforeUrl || order.photoAfterUrl
          ? `
        <h4 style="font-size: 11px; font-weight: 800; color: #0f172a; margin: 14px 0 6px 0; text-transform: uppercase;">
          DOKUMENTASI FOTO KOMPARASI (BEFORE & AFTER PENANGANAN)
        </h4>
        <div style="display: flex; gap: 14px; margin-bottom: 15px;">
          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center; background-color: #f8fafc;">
            <div style="font-size: 9.5px; font-weight: 800; color: #b45309; margin-bottom: 6px; text-transform: uppercase;">
              📸 FOTO SEBELUM (BEFORE - TEMUAN AWAL)
            </div>
            ${
              order.photoBeforeUrl || order.drivePhotoBeforeUrl
                ? `<img src="${formatGoogleDriveImageUrl(order.photoBeforeUrl || order.drivePhotoBeforeUrl)}" style="max-height: 150px; max-width: 100%; object-fit: cover; border-radius: 6px;" alt="Before" />
                   <a href="${getGoogleDriveViewLink(order.drivePhotoBeforeUrl || order.photoBeforeUrl)}" target="_blank" style="font-size: 8px; color: #0284c7; text-decoration: underline; display: block; margin-top: 4px; word-break: break-all;">🔗 Buka Foto Sebelum di Google Drive</a>`
                : '<div style="height: 100px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; font-style: italic;">Belum ada foto sebelum</div>'
            }
          </div>
          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; text-align: center; background-color: #f8fafc;">
            <div style="font-size: 9.5px; font-weight: 800; color: #047857; margin-bottom: 6px; text-transform: uppercase;">
              📸 FOTO SESUDAH (AFTER - SETELAH PENANGANAN)
            </div>
            ${
              order.photoAfterUrl || order.drivePhotoAfterUrl
                ? `<img src="${formatGoogleDriveImageUrl(order.photoAfterUrl || order.drivePhotoAfterUrl)}" style="max-height: 150px; max-width: 100%; object-fit: cover; border-radius: 6px;" alt="After" />
                   <a href="${getGoogleDriveViewLink(order.drivePhotoAfterUrl || order.photoAfterUrl)}" target="_blank" style="font-size: 8px; color: #0284c7; text-decoration: underline; display: block; margin-top: 4px; word-break: break-all;">🔗 Buka Foto Sesudah di Google Drive</a>`
                : '<div style="height: 100px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; font-style: italic;">Belum ada foto sesudah penanganan</div>'
            }
          </div>
        </div>
      `
          : ''
      }

      <!-- Laporan Hasil Penanganan Jika Ada -->
      ${
        order.treatmentReport || order.handledByName
          ? `
        <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
          <h5 style="margin: 0 0 4px 0; font-size: 10.5px; font-weight: 800; color: #065f46; text-transform: uppercase;">
            HASIL PELAKSANAAN TINDAKAN / PENANGANAN:
          </h5>
          <div style="font-size: 10px; color: #0f172a; line-height: 1.4;">
            <div><strong>Pelaksana:</strong> ${sanitizePlhStaffName(order.handledByName || order.completedByName, order.area) || '-'} ${order.handledAt ? `• Tanggal: ${order.handledAt}` : ''}</div>
            <div style="margin-top: 3px;"><strong>Laporan Pengerjaan:</strong> ${order.treatmentReport || order.notes || 'Penanganan telah selesai dilaksanakan sesuai SOP.'}</div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Tabel Riwayat Pengecekan Lengkap -->
      <h4 style="font-size: 11px; font-weight: 800; color: #0f172a; margin: 16px 0 6px 0; text-transform: uppercase;">
        LOG RIWAYAT PEMERIKSAAN OLEH TIM PLH (${historyList.length} Catatan Pemeriksaan)
      </h4>
      <table>
        <thead>
          <tr>
            <th style="width: 4%;">No</th>
            <th style="width: 15%;">Waktu Pengecekan</th>
            <th style="width: 16%;">Petugas PLH</th>
            <th style="width: 15%;">Kondisi Fisik</th>
            <th style="width: 14%;">Status Cek</th>
            <th style="width: 36%;">Catatan, Penanganan & Foto Bukti</th>
          </tr>
        </thead>
        <tbody>
          ${
            historyList.length === 0
              ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; font-style: italic; padding: 12px;">Belum ada riwayat pengecekan tersimpan.</td></tr>`
              : historyList
                  .map(
                    (rec, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                  <td><strong>${formatJakartaDisplayDate(rec.date)}</strong><br/><span style="font-size: 9px; color: #64748b;">${rec.time}</span></td>
                  <td><strong>${sanitizePlhStaffName(rec.inspectorName, order.area)}</strong></td>
                  <td><span style="font-weight: 600; color: ${rec.condition === 'Normal / Sehat' ? '#047857' : '#b45309'};">${rec.condition}</span></td>
                  <td>
                    <span class="badge ${rec.checkStatus === 'Sudah Dicek Aman' || rec.checkStatus === 'Sudah Ditangani' ? 'badge-low' : 'badge-urgent'}">
                      ${rec.checkStatus}
                    </span>
                    ${rec.treatmentStatus ? `<div style="font-size: 8px; color: #64748b; margin-top: 2px;">${rec.treatmentStatus}</div>` : ''}
                  </td>
                  <td>
                    <div style="font-size: 10px; font-weight: 600;">${rec.notes || '-'}</div>
                    ${rec.treatmentReport ? `<div style="font-size: 9px; color: #047857; margin-top: 3px; background-color: #f0fdf4; padding: 4px; border-radius: 4px; border: 1px solid #bbf7d0;"><strong>Tindakan:</strong> ${rec.treatmentReport} (${sanitizePlhStaffName(rec.handledByName, order.area) || '-'})</div>` : ''}
                    ${
                      rec.photoBeforeUrl || rec.photoAfterUrl || rec.drivePhotoBeforeUrl || rec.drivePhotoAfterUrl
                        ? `
                      <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
                        ${
                          rec.photoBeforeUrl || rec.drivePhotoBeforeUrl
                            ? `<div style="text-align: center;">
                                 <span style="font-size: 7.5px; color: #b45309; font-weight: bold; display: block;">Before:</span>
                                 <img src="${formatGoogleDriveImageUrl(rec.photoBeforeUrl || rec.drivePhotoBeforeUrl)}" style="height: 52px; width: 72px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" alt="Before" />
                                 <a href="${getGoogleDriveViewLink(rec.drivePhotoBeforeUrl || rec.photoBeforeUrl)}" target="_blank" style="font-size: 7px; color: #0284c7; text-decoration: underline; display: block; margin-top: 2px;">Drive</a>
                               </div>`
                            : ''
                        }
                        ${
                          rec.photoAfterUrl || rec.drivePhotoAfterUrl
                            ? `<div style="text-align: center;">
                                 <span style="font-size: 7.5px; color: #047857; font-weight: bold; display: block;">After:</span>
                                 <img src="${formatGoogleDriveImageUrl(rec.photoAfterUrl || rec.drivePhotoAfterUrl)}" style="height: 52px; width: 72px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" alt="After" />
                                 <a href="${getGoogleDriveViewLink(rec.drivePhotoAfterUrl || rec.photoAfterUrl)}" target="_blank" style="font-size: 7px; color: #0284c7; text-decoration: underline; display: block; margin-top: 2px;">Drive</a>
                               </div>`
                            : ''
                        }
                      </div>
                    `
                        : ''
                    }
                  </td>
                </tr>
              `
                  )
                  .join('')
          }
        </tbody>
      </table>

      <!-- Tanda Tangan -->
      <div class="signature-grid" style="margin-top: 35px;">
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PETUGAS PENANGGUNG JAWAB AREA</div>
          <div class="signature-box">
            <strong>${sanitizePlhStaffName(order.assignedStaffName || order.reportedByName, order.area)}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Petugas Area PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KORDINATOR DIVISI PLH</div>
          <div class="signature-box">
            <strong>Rahmat Hidayat</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kordinator Lingkungan Hidup</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KEPALA BAGIAN FM</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kepala Bagian Facility Management</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export interface TreePdfFilterOptions {
  startMonth?: string; // YYYY-MM
  endMonth?: string;   // YYYY-MM
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  handlerType?: 'Semua' | 'Internal PLH' | 'Vendor Luar';
}

/**
 * 2. Unduh / Cetak Laporan Rekapitulasi Pemeliharaan Pohon per Area (Divisi PLH)
 * Mendukung filter periode bulan (dari bulan apa sampai bulan apa) dan menampilkan seluruh history penanganan
 */
export const generateTreeAreaReportPdf = (
  areaName: string,
  orders: TreeWorkOrder[],
  assignedStaffName?: string,
  filterOptions?: TreePdfFilterOptions
): string => {
  const docNumber = `REP-PLH-HIST-${areaName.replace(/\s+/g, '').toUpperCase()}-${getJakartaDateString().replace(/-/g, '')}`;
  const totalTrees = orders.length;

  const startMonth = filterOptions?.startMonth;
  const endMonth = filterOptions?.endMonth;
  const handlerFilter = filterOptions?.handlerType && filterOptions.handlerType !== 'Semua' ? filterOptions.handlerType : null;

  // Filter riwayat pemeriksaan & penanganan per pohon
  let totalFilteredHistoryCount = 0;
  let totalInternalCount = 0;
  let totalVendorCount = 0;

  const ordersWithFilteredHistory = orders.map((o) => {
    let history = o.inspectionHistory || [];

    // Jika order belum punya inspectionHistory tapi ada lastCheckedDate / notes, buat fallback record
    if (history.length === 0 && (o.lastCheckedDate || o.notes || o.inspectionNotes)) {
      history = [
        {
          id: `fallback-${o.id}`,
          treeId: o.id,
          date: o.lastCheckedDate || o.date,
          time: o.lastCheckedTime || '08:00 WIB',
          inspectorId: o.reportedBy || 'u-kord-plh',
          inspectorName: o.lastCheckedByName || o.reportedByName || 'Staff PLH',
          condition: o.condition,
          checkStatus: (o.checkStatusToday as any) || (o.status === 'Selesai' ? 'Sudah Ditangani' : 'Sudah Dicek Aman'),
          notes: o.inspectionNotes || o.notes,
          treatmentNeeded: o.treatmentNeeded,
          treatmentStatus: o.treatmentStatus,
          handlerType: o.handlerType,
          handledByName: o.handledByName,
          handledAt: o.handledAt,
          treatmentReport: o.treatmentReport,
          photoBeforeUrl: o.photoBeforeUrl,
          photoAfterUrl: o.photoAfterUrl,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    if (startMonth) {
      history = history.filter((rec) => {
        const ym = (rec.date || '').substring(0, 7);
        return ym >= startMonth;
      });
    }

    if (endMonth) {
      history = history.filter((rec) => {
        const ym = (rec.date || '').substring(0, 7);
        return ym <= endMonth;
      });
    }

    if (handlerFilter) {
      history = history.filter((rec) => {
        const recHandler = rec.handlerType || o.handlerType;
        return recHandler === handlerFilter;
      });
    }

    totalFilteredHistoryCount += history.length;
    history.forEach((rec) => {
      const hType = rec.handlerType || o.handlerType;
      if (hType === 'Vendor Luar') totalVendorCount++;
      else totalInternalCount++;
    });

    return {
      ...o,
      filteredHistory: history,
    };
  });

  const periodText = startMonth || endMonth
    ? `${startMonth ? `Bulan ${startMonth}` : 'Awal'} s/d ${endMonth ? `Bulan ${endMonth}` : 'Sekarang'}`
    : 'Semua Periode Riwayat (All Time)';

  const needVendor = orders.filter((o) => o.handlerType === 'Vendor Luar' || o.isLargeTreatment).length;
  const finished = orders.filter((o) => o.status === 'Selesai').length;
  const totalVendorCost = orders.reduce((sum, o) => sum + (o.vendorCost || 0), 0);

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Riwayat Penanganan Pohon - ${areaName}</title>
      ${getPrintStyles()}
    </head>
    <body>
      ${getLazuardiLetterhead('PLH (PEMELIHARAAN LINGKUNGAN HIDUP)', `LAPORAN RIWAYAT & REKAP PENANGANAN POHON: ${areaName.toUpperCase()}`, docNumber)}

      <div class="meta-box">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Nama Wilayah Tanggung Jawab:</span>
            <span class="meta-value" style="color: #047857; font-size: 11.5px; font-weight: 800;">${areaName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Filter Periode Bulan:</span>
            <span class="meta-value" style="color: #0284c7; font-weight: 700;">${periodText}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tanggal Cetak Laporan:</span>
            <span class="meta-value">${formatJakartaDisplayDate(getJakartaDateString())}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Pohon & Log Riwayat:</span>
            <span class="meta-value">${totalTrees} Pohon (${totalFilteredHistoryCount} Catatan Riwayat)</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Pekerjaan Tim Internal vs Vendor:</span>
            <span class="meta-value">${totalInternalCount} Internal PLH • ${totalVendorCount} Vendor Luar</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Estimasi Anggaran Vendor:</span>
            <span class="meta-value" style="color: #0f172a; font-weight: 800;">Rp ${totalVendorCost.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      <h4 style="font-size: 11px; font-weight: 800; color: #0f172a; margin: 14px 0 8px 0; text-transform: uppercase;">
        DAFTAR INVENTARIS & SELURUH RIWAYAT PENANGANAN POHON - ${areaName.toUpperCase()}
      </h4>

      <table>
        <thead>
          <tr>
            <th style="width: 4%;">No</th>
            <th style="width: 22%;">Nama / Jenis Pohon & Lokasi</th>
            <th style="width: 12%;">Kondisi</th>
            <th style="width: 16%;">Tindakan Treatment</th>
            <th style="width: 36%;">Riwayat & History Penanganan</th>
            <th style="width: 10%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            ordersWithFilteredHistory.length === 0
              ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 15px;">Belum ada data pohon tercatat di area ini.</td></tr>`
              : ordersWithFilteredHistory
                  .map(
                    (o, idx) => `
            <tr>
              <td style="text-align: center; font-weight: 700; vertical-align: top;">${idx + 1}</td>
              <td style="vertical-align: top;">
                <div style="font-weight: 800; color: #0f172a; font-size: 10px;">${o.treeName}</div>
                <div style="font-size: 8.5px; color: #047857; font-weight: 700; margin-top: 2px;">Wilayah: ${o.area}</div>
                ${o.notes ? `<div style="font-size: 8px; color: #64748b; font-style: italic; margin-top: 2px;">Info: ${o.notes}</div>` : ''}
              </td>
              <td style="vertical-align: top;">
                <span style="font-weight: 700; font-size: 9.5px; color: ${o.condition === 'Normal / Sehat' ? '#047857' : o.condition === 'Miring / Rawan Tumbang' ? '#dc2626' : '#b45309'};">
                  ${o.condition}
                </span>
              </td>
              <td style="vertical-align: top; font-size: 9px;">
                <div style="font-weight: 700; color: #0f172a;">${o.treatmentNeeded}</div>
                <div style="margin-top: 3px;">
                  <span class="badge ${o.handlerType === 'Vendor Luar' ? 'badge-vendor' : 'badge-internal'}" style="font-size: 8px;">
                    ${o.handlerType}
                  </span>
                </div>
                ${o.vendorCost ? `<div style="font-size: 8px; font-weight: 800; color: #0f172a; margin-top: 2px;">Rp ${o.vendorCost.toLocaleString('id-ID')}</div>` : ''}
              </td>
              <td style="vertical-align: top;">
                ${
                  o.filteredHistory.length === 0
                    ? `<div style="font-size: 8.5px; color: #94a3b8; font-style: italic; padding: 4px 0;">Tidak ada catatan riwayat pada periode ini.</div>`
                    : `<div style="display: flex; flex-direction: column; gap: 5px;">
                        ${o.filteredHistory
                          .map(
                            (rec, recIdx) => `
                          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid ${rec.checkStatus === 'Sudah Dicek Aman' || rec.checkStatus === 'Sudah Ditangani' ? '#047857' : '#dc2626'}; border-radius: 4px; padding: 4px 6px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px;">
                              <span style="font-weight: 800; color: #0f172a;">${formatJakartaDisplayDate(rec.date)} ${rec.time ? `• ${rec.time}` : ''}</span>
                              <span class="badge ${rec.checkStatus === 'Sudah Dicek Aman' || rec.checkStatus === 'Sudah Ditangani' ? 'badge-low' : 'badge-urgent'}" style="font-size: 7.5px; padding: 1px 4px;">
                                ${rec.checkStatus}
                              </span>
                            </div>
                            <div style="font-size: 8px; color: #475569; margin-top: 2px;">
                              <strong>Pemeriksa:</strong> ${sanitizePlhStaffName(rec.inspectorName, o.area)}
                              ${rec.handlerType ? ` • <strong>Pelaksana:</strong> <span style="font-weight: 700; color: ${rec.handlerType === 'Vendor Luar' ? '#c2410c' : '#047857'};">${rec.handlerType}</span>` : ''}
                            </div>
                            ${rec.notes ? `<div style="font-size: 8px; color: #334155; font-style: italic; margin-top: 2px;">"${rec.notes}"</div>` : ''}
                            ${rec.treatmentReport ? `<div style="font-size: 8px; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 3px; padding: 2px 4px; margin-top: 2px; font-weight: 700;">🛠️ Hasil: ${rec.treatmentReport} ${rec.handledByName ? `(Oleh: ${sanitizePlhStaffName(rec.handledByName, o.area)})` : ''}</div>` : ''}
                            ${
                              rec.photoBeforeUrl || rec.photoAfterUrl || rec.drivePhotoBeforeUrl || rec.drivePhotoAfterUrl || (recIdx === 0 && (o.photoBeforeUrl || o.photoAfterUrl))
                                ? `
                              <div style="display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap;">
                                ${
                                  rec.photoBeforeUrl || rec.drivePhotoBeforeUrl || (recIdx === 0 && (o.photoBeforeUrl || o.drivePhotoBeforeUrl))
                                    ? `
                                  <div style="text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px; background: #ffffff;">
                                    <span style="font-size: 7px; color: #b45309; font-weight: 800; display: block; text-transform: uppercase;">📸 Before (Temuan)</span>
                                    <img src="${formatGoogleDriveImageUrl(rec.photoBeforeUrl || rec.drivePhotoBeforeUrl || o.photoBeforeUrl || o.drivePhotoBeforeUrl)}" style="height: 52px; width: 72px; object-fit: cover; border-radius: 3px; margin-top: 2px;" alt="Before" />
                                    <a href="${getGoogleDriveViewLink(rec.drivePhotoBeforeUrl || rec.photoBeforeUrl || o.drivePhotoBeforeUrl || o.photoBeforeUrl)}" target="_blank" style="font-size: 7px; color: #0284c7; text-decoration: underline; display: block; margin-top: 2px;">Drive</a>
                                  </div>
                                `
                                    : ''
                                }
                                ${
                                  rec.photoAfterUrl || rec.drivePhotoAfterUrl || (recIdx === 0 && (o.photoAfterUrl || o.drivePhotoAfterUrl))
                                    ? `
                                  <div style="text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px; background: #ffffff;">
                                    <span style="font-size: 7px; color: #047857; font-weight: 800; display: block; text-transform: uppercase;">📸 After (Penanganan)</span>
                                    <img src="${formatGoogleDriveImageUrl(rec.photoAfterUrl || rec.drivePhotoAfterUrl || o.photoAfterUrl || o.drivePhotoAfterUrl)}" style="height: 52px; width: 72px; object-fit: cover; border-radius: 3px; margin-top: 2px;" alt="After" />
                                    <a href="${getGoogleDriveViewLink(rec.drivePhotoAfterUrl || rec.photoAfterUrl || o.drivePhotoAfterUrl || o.photoAfterUrl)}" target="_blank" style="font-size: 7px; color: #0284c7; text-decoration: underline; display: block; margin-top: 2px;">Drive</a>
                                  </div>
                                `
                                    : ''
                                }
                              </div>
                            `
                                : ''
                            }
                          </div>
                        `
                          )
                          .join('')}
                      </div>`
                }
              </td>
              <td style="vertical-align: top; text-align: center;">
                <span class="badge ${o.status === 'Selesai' ? 'badge-completed' : o.urgency === 'Tinggi / Bahaya' ? 'badge-urgent' : 'badge-medium'}">
                  ${o.status}
                </span>
              </td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>

      <!-- Tanda Tangan Resmi Yayasan Lazuardi FM -->
      <div class="signature-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 35px;">
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PETUGAS PENANGGUNG JAWAB AREA</div>
          <div class="signature-box">
            <strong>${sanitizePlhStaffName(assignedStaffName, areaName) || 'Petugas Area'}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Staff Divisi PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KORDINATOR DIVISI PLH</div>
          <div class="signature-box">
            <strong>Rahmat Hidayat</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kordinator Lapangan PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KEPALA BAGIAN FM</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kepala Bagian Facility Management</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * 3. Unduh / Cetak Surat Perintah Kerja Job Bareng / Insidental (Bisa untuk Divisi OB maupun PLH)
 */
export const generateJobBarengPdf = (job: JobBareng): string => {
  const division = job.division || 'OB';
  const divisionText = division === 'PLH' ? 'PLH (PEMELIHARAAN LINGKUNGAN HIDUP)' : 'OB & OG (OFFICE BOY & OFFICE GIRL)';
  const docNumber = `SPK-JOB-${division}-${job.id.toUpperCase()}`;

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${docNumber} - Surat Perintah Kerja Job Bareng</title>
      ${getPrintStyles()}
    </head>
    <body>
      ${getLazuardiLetterhead(divisionText, 'SURAT PERINTAH KERJA (SPK) JOB BARENG & TUGAS TIM', docNumber)}

      <div class="meta-box">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Judul Pekerjaan:</span>
            <span class="meta-value" style="font-size: 12px; color: #047857;">${job.title}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tanggal Pelaksanaan:</span>
            <span class="meta-value">${formatJakartaDisplayDate(job.date)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Divisi Sasaran:</span>
            <span class="meta-value">${division === 'Semua' ? 'Seluruh Divisi FM (OB & OG & PLH)' : division === 'OB' ? 'Divisi OB & OG (Office Boy & Office Girl)' : `Divisi ${division}`}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Unit / Area Target:</span>
            <span class="meta-value">${job.targetUnit} • ${job.targetArea || 'Area Terkait'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Jenis Penugasan:</span>
            <span class="badge ${job.taskType === 'insidental' ? 'badge-urgent' : 'badge-vendor'}">
              ${job.taskType === 'insidental' ? 'Insidental / Darurat' : 'Job Bareng / Kerja Bakti'}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Status Pekerjaan:</span>
            <span class="badge badge-completed">${job.status}</span>
          </div>
        </div>
      </div>

      <h4 style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; text-transform: uppercase;">
        A. DESKRIPSI & PETUNJUK TEKNIS PEKERJAAN
      </h4>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 11px; line-height: 1.6; margin-bottom: 15px;">
        ${job.description || 'Lakukan pembersihan dan penataan sesuai standar SOP Facility Management Lazuardi.'}
      </div>

      <h4 style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; text-transform: uppercase;">
        B. TIM PETUGAS YANG DITUGASKAN & KEHADIRAN
      </h4>
      <table>
        <thead>
          <tr>
            <th style="width: 6%;">No</th>
            <th style="width: 45%;">Nama Petugas Ditugaskan</th>
            <th style="width: 25%;">Peran / Divisi</th>
            <th style="width: 24%;">Status Penyelesaian</th>
          </tr>
        </thead>
        <tbody>
          ${
            job.assignedUserNames && job.assignedUserNames.length > 0
              ? job.assignedUserNames
                  .map((name, idx) => {
                    const isDone = job.completedUserNames?.includes(name);
                    return `
                <tr>
                  <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                  <td style="font-weight: 700; color: #0f172a;">${name}</td>
                  <td>Staff Divisi ${division}</td>
                  <td>
                    <span class="badge ${isDone ? 'badge-completed' : 'badge-medium'}">
                      ${isDone ? 'Selesai Dikerjakan' : 'Ditugaskan'}
                    </span>
                  </td>
                </tr>
              `;
                  })
                  .join('')
              : `
            <tr>
              <td colspan="4" style="text-align: center; padding: 10px; color: #64748b;">
                Tugas bersama terbuka untuk seluruh staf Unit ${job.targetUnit} / Divisi ${division}
              </td>
            </tr>
          `
          }
        </tbody>
      </table>

      <!-- Tanda Tangan -->
      <div class="signature-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 40px;">
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PEMBUAT TUGAS / PELAPOR</div>
          <div class="signature-box">
            <strong>${job.createdByName || 'Kordinator FM'}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kordinator Lapangan</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PERWAKILAN TIM PETUGAS</div>
          <div class="signature-box">
            <strong>${job.completedUserNames?.[0] || job.assignedUserNames?.[0] || 'Ketua Tim'}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Pelaksana Tugas</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KEPALA BAGIAN FM</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kepala Bagian Facility Management</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export interface WorkOrderSummaryPdfOptions {
  division?: 'Semua' | 'OB' | 'PLH';
  startDate?: string;
  endDate?: string;
  unitFilter?: string;
  statusFilter?: string;
  staffName?: string;
  title?: string;
}

/**
 * 4. Unduh / Cetak Rekapitulasi Work Order Tugas Harian Resmi untuk Seluruh OB & PLH
 * Mendukung filter divisi (OB / PLH / Semua), rentang tanggal/bulan, status, dan menampilkan bukti foto live pengerjaan
 */
export const generateWorkOrderSummaryPdf = (
  taskLogs: TaskLog[],
  masterTasks: MasterTask[],
  jobBarengList: JobBareng[],
  users: User[],
  options?: WorkOrderSummaryPdfOptions
): string => {
  const division = options?.division || 'Semua';
  const divisionText =
    division === 'OB'
      ? 'OB & OG (OFFICE BOY & OFFICE GIRL)'
      : division === 'PLH'
      ? 'PLH (PEMELIHARAAN LINGKUNGAN HIDUP)'
      : 'SELURUH DIVISI FM (OB & OG & PLH)';

  const docNumber = `SPK-WO-${division === 'OB' ? 'OB-OG' : division.toUpperCase()}-${getJakartaDateString().replace(/-/g, '')}`;

  const startDate = options?.startDate;
  const endDate = options?.endDate;
  const unitFilter = options?.unitFilter && options.unitFilter !== 'Semua' ? options.unitFilter : null;
  const statusFilter = options?.statusFilter && options.statusFilter !== 'Semua' ? options.statusFilter : null;
  const staffFilter = options?.staffName && options.staffName !== 'Semua' ? options.staffName : null;

  // 1. Tentukan rentang tanggal
  const today = getJakartaDateString();
  const startD = startDate || today;
  const endD = endDate || startD;

  const dateSet = new Set<string>();
  if (startD === endD) {
    dateSet.add(startD);
  } else {
    taskLogs.forEach((l) => {
      const d = l.date || (l.timestamp ? l.timestamp.substring(0, 10) : '');
      if (d && d >= startD && d <= endD) {
        dateSet.add(d);
      }
    });
    dateSet.add(startD);
    dateSet.add(endD);
  }
  const datesInRange = Array.from(dateSet).sort();

  // 2. Tentukan target staf pelaksana
  let targetUsers = (users || []).filter((u) => {
    if (u.role === 'admin') return false;
    if (division !== 'Semua' && u.division && u.division !== division) return false;
    if (staffFilter) {
      const sf = staffFilter.trim().toLowerCase();
      const un = (u.name || '').trim().toLowerCase();
      const us = (u.username || '').trim().toLowerCase();
      const ui = (u.id || '').trim().toLowerCase();
      const match = un === sf || us === sf || ui === sf || un.includes(sf) || sf.includes(un);
      if (!match) return false;
    }
    if (unitFilter && u.unit !== unitFilter && u.unit !== 'Semua Unit') return false;
    return true;
  });

  // Jika daftar targetUsers kosong (misal data ditarik dari sheet / nama di taskLog), ekstrak dari taskLogs
  if (targetUsers.length === 0) {
    let userNames = Array.from(new Set(taskLogs.map((l) => l.userName).filter(Boolean)));
    if (staffFilter) {
      const sf = staffFilter.trim().toLowerCase();
      userNames = userNames.filter((name) => {
        const nLower = name.trim().toLowerCase();
        return nLower === sf || nLower.includes(sf) || sf.includes(nLower);
      });
    }
    targetUsers = userNames.map((name) => {
      const log = taskLogs.find((l) => l.userName === name);
      return {
        id: log?.userId || `user-${name}`,
        username: log?.userId || name,
        name: name,
        role: log?.userRole || 'user',
        division: log?.division || (division === 'PLH' ? 'PLH' : 'OB'),
        unit: log?.unit || 'Semua Unit',
        status: 'Aktif',
      } as User;
    });
  }

  // 3. Bangun daftar komprehensif: Beban Kerja Riil (Expected Master Tasks) vs Log yang Diserahkan
  interface WorkOrderItem {
    id: string;
    date: string;
    timestamp?: string;
    timingType?: string;
    division: string;
    unit: string;
    area?: string;
    taskTitle: string;
    category: string;
    userName: string;
    userRole?: string;
    status: string;
    isLate?: boolean;
    lateReason?: string;
    photoUrl?: string;
    notes?: string;
    kordinatorScore?: number;
    kordinatorNotes?: string;
    isDone: boolean;
  }

  const items: WorkOrderItem[] = [];
  const processedLogIds = new Set<string>();

  targetUsers.forEach((user) => {
    datesInRange.forEach((d) => {
      // Dapatkan tugas master yang aktif dan ditugaskan ke user ini
      let assignedMasterTasks = (masterTasks || []).filter(
        (t) => (t.isActive !== false) && isTaskAssignedToUser(t, user)
      );

      // Fallback komprehensif: jika belum ada tugas spesifik yang cocok, pastikan seluruh tugas master aktif di divisi ini diperiksa
      if (assignedMasterTasks.length === 0) {
        assignedMasterTasks = (masterTasks || []).filter(
          (t) => (t.isActive !== false) && (t.division || 'OB') === (user.division || 'OB')
        );
      }

      assignedMasterTasks.forEach((mTask) => {
        // Cari apakah ada log tugas yang diserahkan untuk user & tanggal ini
        const matchLog = taskLogs.find((l) => {
          if (processedLogIds.has(l.id)) return false;
          const isUserMatch =
            l.userId === user.id ||
            (l.userName && user.name && (
              l.userName.trim().toLowerCase() === user.name.trim().toLowerCase() ||
              l.userName.toLowerCase().includes(user.name.toLowerCase()) ||
              user.name.toLowerCase().includes(l.userName.toLowerCase())
            )) ||
            (l.userName && user.username && (
              l.userName.trim().toLowerCase() === user.username.trim().toLowerCase()
            ));
          const logDate = l.date || (l.timestamp ? l.timestamp.substring(0, 10) : '');
          const isDateMatch = logDate === d;
          const isTaskMatch =
            (l.taskId && l.taskId === mTask.id) ||
            (l.taskTitle && mTask.title && (
              l.taskTitle.trim().toLowerCase() === mTask.title.trim().toLowerCase() ||
              l.taskTitle.toLowerCase().includes(mTask.title.toLowerCase()) ||
              mTask.title.toLowerCase().includes(l.taskTitle.toLowerCase())
            ));
          return isUserMatch && isDateMatch && isTaskMatch;
        });

        if (matchLog) {
          processedLogIds.add(matchLog.id);
          const rawStatus = (matchLog.status || '').trim();
          const isDone = rawStatus === 'Selesai' || rawStatus === 'Dinas Luar';
          const finalStatus = isDone
            ? (matchLog.isLate ? 'Selesai (Terlambat)' : rawStatus)
            : 'Tidak Dikerjakan';
          items.push({
            id: matchLog.id,
            date: d,
            timestamp: matchLog.timestamp,
            timingType: matchLog.timingType || mTask.timingType,
            division: user.division || matchLog.division || 'OB',
            unit: matchLog.unit || user.unit || mTask.unit,
            area: matchLog.area || mTask.area,
            taskTitle: matchLog.taskTitle || mTask.title,
            category: matchLog.category || mTask.category,
            userName: user.name,
            userRole: user.role,
            status: finalStatus,
            isLate: matchLog.isLate,
            lateReason: matchLog.lateReason,
            photoUrl: matchLog.photoUrl,
            notes: matchLog.notes || (isDone ? '' : 'Tugas belum diselesaikan / tidak dikerjakan.'),
            kordinatorScore: matchLog.kordinatorScore,
            kordinatorNotes: matchLog.kordinatorNotes,
            isDone,
          });
        } else {
          // TUGAS TIDAK DIKERJAKAN! (Sesuai komplain user: pre-readiness atau clock-out yang diabaikan petugas)
          items.push({
            id: `notdone-${user.id}-${mTask.id}-${d}`,
            date: d,
            timestamp: '',
            timingType: mTask.timingType,
            division: user.division || 'OB',
            unit: user.unit || mTask.unit,
            area: mTask.area,
            taskTitle: mTask.title,
            category: mTask.category,
            userName: user.name,
            userRole: user.role,
            status: 'Tidak Dikerjakan',
            isLate: false,
            lateReason: '',
            photoUrl: '',
            notes: 'Tugas wajib jadwal ini tidak dikerjakan / belum diselesaikan oleh petugas.',
            isDone: false,
          });
        }
      });

      // Tambahkan juga log insidental / tugas tambahan yang tidak ada di master task
      const extraLogs = taskLogs.filter((l) => {
        if (processedLogIds.has(l.id)) return false;
        const isUserMatch =
          l.userId === user.id ||
          (l.userName && user.name && (
            l.userName.trim().toLowerCase() === user.name.trim().toLowerCase() ||
            l.userName.toLowerCase().includes(user.name.toLowerCase()) ||
            user.name.toLowerCase().includes(l.userName.toLowerCase())
          )) ||
          (l.userName && user.username && (
            l.userName.trim().toLowerCase() === user.username.trim().toLowerCase()
          ));
        const logDate = l.date || (l.timestamp ? l.timestamp.substring(0, 10) : '');
        return isUserMatch && logDate === d;
      });

      extraLogs.forEach((l) => {
        processedLogIds.add(l.id);
        const rawStatus = (l.status || '').trim();
        const isDone = rawStatus === 'Selesai' || rawStatus === 'Dinas Luar';
        const finalStatus = isDone
          ? (l.isLate ? 'Selesai (Terlambat)' : rawStatus)
          : 'Tidak Dikerjakan';
        items.push({
          id: l.id,
          date: d,
          timestamp: l.timestamp,
          timingType: l.timingType || 'anytime',
          division: user.division || l.division || 'OB',
          unit: l.unit || user.unit,
          area: l.area,
          taskTitle: l.taskTitle,
          category: l.category || 'Insidental',
          userName: user.name,
          userRole: user.role,
          status: finalStatus,
          isLate: l.isLate,
          lateReason: l.lateReason,
          photoUrl: l.photoUrl,
          notes: l.notes || (isDone ? '' : 'Tugas insidental tidak dikerjakan.'),
          kordinatorScore: l.kordinatorScore,
          kordinatorNotes: l.kordinatorNotes,
          isDone,
        });
      });
    });
  });

  // Fallback jika tidak ada master task cocok (misal filter khusus atau data murni log)
  if (items.length === 0) {
    taskLogs.forEach((l) => {
      items.push({
        id: l.id,
        date: l.date || (l.timestamp ? l.timestamp.substring(0, 10) : today),
        timestamp: l.timestamp,
        timingType: l.timingType || 'anytime',
        division: l.division || 'OB',
        unit: l.unit,
        area: l.area,
        taskTitle: l.taskTitle,
        category: l.category,
        userName: l.userName,
        userRole: l.userRole,
        status: l.status,
        isLate: l.isLate,
        lateReason: l.lateReason,
        photoUrl: l.photoUrl,
        notes: l.notes,
        kordinatorScore: l.kordinatorScore,
        kordinatorNotes: l.kordinatorNotes,
        isDone: l.status === 'Selesai' || l.status === 'Dinas Luar',
      });
    });
  }

  // Filter berdasarkan status jika diminta
  let displayedItems = items;
  if (statusFilter) {
    if (statusFilter === 'Tidak Dikerjakan') {
      displayedItems = items.filter((i) => i.status === 'Tidak Dikerjakan');
    } else if (statusFilter === 'Terlambat') {
      displayedItems = items.filter((i) => i.isLate || i.status === 'Terlambat');
    } else if (statusFilter === 'Selesai') {
      displayedItems = items.filter((i) => i.status === 'Selesai' && !i.isLate);
    } else {
      displayedItems = items.filter((i) => i.status === statusFilter);
    }
  }

  // Pengurutan tabel: tanggal desc, lalu timingType (pre_readiness -> anytime -> clock_out), lalu nama petugas
  const timingOrder: Record<string, number> = { pre_readiness: 1, anytime: 2, clock_out: 3 };
  displayedItems.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    const orderA = timingOrder[a.timingType || 'anytime'] || 2;
    const orderB = timingOrder[b.timingType || 'anytime'] || 2;
    if (orderA !== orderB) return orderA - orderB;
    return a.userName.localeCompare(b.userName);
  });

  const totalAssigned = items.length;
  const finishedTasks = items.filter((i) => i.isDone).length;
  const notDoneTasks = items.filter((i) => !i.isDone).length;
  const percentDone = totalAssigned > 0 ? Math.round((finishedTasks / totalAssigned) * 100) : 0;
  const percentNotDone = totalAssigned > 0 ? 100 - percentDone : 0;
  const withPhotos = items.filter((i) => Boolean(i.photoUrl)).length;
  const uniqueStaff = Array.from(new Set(items.map((i) => i.userName).filter(Boolean)));

  const periodText =
    startDate || endDate
      ? `${startDate ? formatJakartaDisplayDate(startDate) : 'Awal'} s/d ${endDate ? formatJakartaDisplayDate(endDate) : 'Sekarang'}`
      : `Hari Ini (${formatJakartaDisplayDate(getJakartaDateString())})`;

  const docHeading = options?.title || 'REKAP REALISASI WORK ORDER TUGAS';

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${docHeading} - Divisi ${division === 'OB' ? 'OB & OG' : division}</title>
      ${getPrintStyles()}
    </head>
    <body>
      ${getLazuardiLetterhead(divisionText, docHeading, docNumber)}

      <!-- Meta Summary Box -->
      <div class="meta-box">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Divisi Sasaran:</span>
            <span class="meta-value" style="color: #047857; font-size: 11.5px; font-weight: 800;">${divisionText}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Periode Tanggal / Waktu:</span>
            <span class="meta-value" style="color: #0284c7; font-weight: 700;">${periodText}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Beban Tugas:</span>
            <span class="meta-value" style="font-weight: 800; color: #0f172a;">${totalAssigned} Tugas (${finishedTasks} Selesai, ${notDoneTasks} Tidak Dikerjakan)</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Staf Petugas Terdata:</span>
            <span class="meta-value">${uniqueStaff.length} Petugas (${uniqueStaff.slice(0, 3).join(', ')}${uniqueStaff.length > 3 ? '...' : ''})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Persentase Realisasi Pengerjaan:</span>
            <span class="meta-value" style="color: ${percentDone >= 80 ? '#047857' : '#dc2626'}; font-weight: 800; font-size: 12.5px;">
              ${percentDone}% Selesai (${percentNotDone}% Tidak Dikerjakan)
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Dokumentasi Foto Bukti (Drive):</span>
            <span class="meta-value">${withPhotos} Tugas Terlampir Foto Bukti Google Drive</span>
          </div>
        </div>
      </div>

      <h4 style="font-size: 11px; font-weight: 800; color: #0f172a; margin: 14px 0 8px 0; text-transform: uppercase;">
        RINCIAN REALISASI PELAKSANAAN WORK ORDER & TUGAS HARIAN
      </h4>

      <table>
        <thead>
          <tr>
            <th style="width: 4%;">No</th>
            <th style="width: 14%;">Waktu & Jadwal</th>
            <th style="width: 14%;">Divisi & Unit / Area</th>
            <th style="width: 26%;">Uraian Pekerjaan & Standar SOP</th>
            <th style="width: 14%;">Petugas Pelaksana</th>
            <th style="width: 16%;">Status & Foto Bukti (Drive)</th>
            <th style="width: 12%;">Catatan / Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${
            displayedItems.length === 0
              ? `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">Tidak ada catatan work order pada periode ini.</td></tr>`
              : displayedItems
                  .map(
                    (item, idx) => `
            <tr style="${!item.isDone ? 'background-color: #fffbfb;' : ''}">
              <td style="text-align: center; font-weight: 700; vertical-align: top;">${idx + 1}</td>
              <td style="vertical-align: top;">
                <div style="font-weight: 800; color: #0f172a; font-size: 9.5px;">${formatJakartaDisplayDate(item.date)}</div>
                ${
                  item.timestamp
                    ? `<div style="font-size: 8.5px; color: #64748b; font-family: monospace; margin-top: 2px;">
                         ${new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                       </div>`
                    : `<div style="font-size: 8px; color: #dc2626; font-weight: 800; margin-top: 2px;">JADWAL HARIAN</div>`
                }
                <div style="margin-top: 3px;">
                  <span class="badge ${item.timingType === 'pre_readiness' ? 'badge-urgent' : item.timingType === 'clock_out' ? 'badge-completed' : 'badge-low'}" style="font-size: 7.5px;">
                    ${item.timingType === 'pre_readiness' ? 'Pre-Readiness (Pagi)' : item.timingType === 'clock_out' ? 'Clock-Out (Sore)' : 'Standar Rutin'}
                  </span>
                </div>
              </td>
              <td style="vertical-align: top;">
                <span class="badge ${item.division === 'PLH' ? 'badge-internal' : 'badge-completed'}" style="font-size: 8px;">
                  ${item.division || 'OB'}
                </span>
                <div style="font-weight: 700; color: #0f172a; font-size: 9.5px; margin-top: 2px;">
                  ${item.unit}
                </div>
                ${item.area ? `<div style="font-size: 8px; color: #047857; font-weight: 600;">${item.area}</div>` : ''}
              </td>
              <td style="vertical-align: top;">
                <div style="font-weight: 800; color: ${item.isDone ? '#0f172a' : '#b91c1c'}; font-size: 10px;">${item.taskTitle}</div>
                <div style="font-size: 8px; color: #64748b; margin-top: 2px;">
                  Kategori: <strong>${item.category}</strong>
                </div>
              </td>
              <td style="vertical-align: top;">
                <div style="font-weight: 800; color: #0f172a; font-size: 9.5px;">${item.userName}</div>
                <div style="font-size: 8px; color: #64748b;">${item.userRole === 'kordinator' ? 'Kordinator Lapangan' : 'Staff Pelaksana'}</div>
              </td>
              <td style="vertical-align: top;">
                <div>
                  <span class="badge ${
                    item.status === 'Tidak Dikerjakan'
                      ? 'badge-urgent'
                      : item.status === 'Selesai' && !item.isLate
                      ? 'badge-low'
                      : item.status === 'Terlambat' || item.isLate
                      ? 'badge-urgent'
                      : item.status === 'Dinas Luar'
                      ? 'badge-medium'
                      : 'badge-completed'
                  }" style="font-size: 8px; ${item.status === 'Tidak Dikerjakan' ? 'background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171; font-weight: 800;' : ''}">
                    ${item.status === 'Tidak Dikerjakan' ? '❌ Tidak Dikerjakan' : item.isLate ? 'Selesai (Terlambat)' : item.status}
                  </span>
                </div>
                ${
                  item.photoUrl
                    ? `
                  <div style="margin-top: 4px;">
                    <img
                      src="${formatGoogleDriveImageUrl(item.photoUrl)}"
                      onerror="if(this.getAttribute('data-fid') && this.src.indexOf('thumbnail')===-1){this.src='https://drive.google.com/thumbnail?id='+this.getAttribute('data-fid')+'&sz=w600';}"
                      data-fid="${extractGoogleDriveFileId(item.photoUrl) || ''}"
                      style="height: 50px; width: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; background-color: #f1f5f9; display: block;"
                      alt="Foto Pengerjaan"
                    />
                    <a href="${getGoogleDriveViewLink(item.photoUrl)}" target="_blank" style="font-size: 7.5px; color: #0284c7; text-decoration: underline; display: block; margin-top: 2px; word-break: break-all; font-weight: 700;">🔗 Link Foto Drive</a>
                  </div>
                `
                    : `<div style="font-size: 7.5px; color: ${item.isDone ? '#94a3b8' : '#dc2626'}; font-style: italic; margin-top: 3px; font-weight: 600;">${item.isDone ? 'Tanpa foto bukti' : '(Tanpa Foto - Tidak Dikerjakan)'}</div>`
                }
              </td>
              <td style="vertical-align: top; font-size: 8.5px;">
                ${item.status === 'Tidak Dikerjakan' ? `<div style="color: #dc2626; font-weight: 600; font-style: italic;">${item.notes}</div>` : ''}
                ${item.isLate && item.lateReason ? `<div style="color: #b91c1c; font-style: italic;">"Alasan: ${item.lateReason}"</div>` : ''}
                ${item.notes && item.status !== 'Tidak Dikerjakan' && !item.isLate ? `<div style="color: #334155; font-style: italic;">"${item.notes}"</div>` : ''}
                ${
                  item.kordinatorScore
                    ? `
                  <div style="margin-top: 3px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 3px; padding: 2px 4px; color: #065f46; font-size: 8px;">
                    <strong>Nilai Kord:</strong> ${item.kordinatorScore}/10
                    ${item.kordinatorNotes ? `<div>${item.kordinatorNotes}</div>` : ''}
                  </div>
                `
                    : ''
                }
                ${item.isDone && !item.notes && !item.lateReason && !item.kordinatorScore ? '<span style="color: #94a3b8;">-</span>' : ''}
              </td>
            </tr>
          `
                  )
                  .join('')
          }
        </tbody>
      </table>

      <!-- Tanda Tangan Resmi Yayasan Lazuardi FM -->
      <div class="signature-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 35px;">
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PERWAKILAN TIM PETUGAS</div>
          <div class="signature-box">
            <strong>${uniqueStaff[0] || 'Staff Pelaksana'}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Tim Pelaksana FM</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">
            ${division === 'PLH' ? 'KORDINATOR DIVISI PLH' : division === 'OB' ? 'KORDINATOR DIVISI OB & OG' : 'KORDINATOR LAPANGAN FM'}
          </div>
          <div class="signature-box">
            <strong>${division === 'PLH' ? 'Rahmat Hidayat' : division === 'OB' ? 'Lili Ariyanto' : 'Lili Ariyanto / Rahmat Hidayat'}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kordinator Lapangan FM</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KEPALA BAGIAN FM</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kepala Bagian Facility Management</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Trigger window printing atau fallback download printable HTML
 * Menunggu seluruh aset gambar (termasuk foto Google Drive) selesai dimuat agar tidak blank/rusak
 */
export const printHtmlAsPdf = (htmlContent: string, title: string) => {
  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    const triggerPrint = () => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.warn('Print trigger error:', e);
        }
      }, 500);
    };

    const imgs = Array.from(printWindow.document.images || []);
    if (imgs.length === 0) {
      triggerPrint();
    } else {
      let loadedCount = 0;
      let printTriggered = false;
      const onImageSettled = () => {
        loadedCount++;
        if (!printTriggered && loadedCount >= imgs.length) {
          printTriggered = true;
          triggerPrint();
        }
      };

      imgs.forEach((img) => {
        if (img.complete) {
          onImageSettled();
        } else {
          img.addEventListener('load', onImageSettled, { once: true });
          img.addEventListener('error', onImageSettled, { once: true });
        }
      });

      // Safety timeout: jika ada gambar yang lambat, cetak tetap terbuka maksimal 2.8s
      setTimeout(() => {
        if (!printTriggered) {
          printTriggered = true;
          triggerPrint();
        }
      }, 2800);
    }
  } else {
    // Fallback using hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      const triggerIframePrint = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print error:', e);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }, 500);
      };

      const imgs = Array.from(doc.images || []);
      if (imgs.length === 0) {
        triggerIframePrint();
      } else {
        let loaded = 0;
        let triggered = false;
        const onSettled = () => {
          loaded++;
          if (!triggered && loaded >= imgs.length) {
            triggered = true;
            triggerIframePrint();
          }
        };
        imgs.forEach((img) => {
          if (img.complete) {
            onSettled();
          } else {
            img.addEventListener('load', onSettled, { once: true });
            img.addEventListener('error', onSettled, { once: true });
          }
        });
        setTimeout(() => {
          if (!triggered) {
            triggered = true;
            triggerIframePrint();
          }
        }, 2800);
      }
    }
  }
};
