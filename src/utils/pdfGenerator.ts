import { TreeWorkOrder, JobBareng, DivisionType } from '../types';
import { formatJakartaDisplayDate, getJakartaDateString } from './dateHelper';

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
          DEPARTEMEN OPERASIONAL & FACILITY MANAGEMENT (FM)
        </h2>
        <p style="font-size: 10px; color: #64748b; margin: 3px 0 0 0; line-height: 1.3;">
          Kampus Lazuardi GCS • Jl. Merak No. 9, Cinere, Depok • Hotline FM: (021) 753-4888 • Divisi: <strong>${divisionText}</strong>
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
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
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
            <span class="meta-value">${order.assignedStaffName || order.reportedByName}</span>
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
              Selesai pada ${new Date(order.completedAt).toLocaleString('id-ID')} oleh ${order.completedByName || '-'}
            </td>
          </tr>
        `
            : ''
        }
      </table>

      <!-- Dokumentasi Foto -->
      ${
        order.photoBeforeUrl || order.photoAfterUrl
          ? `
        <h4 style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin: 12px 0 6px 0; text-transform: uppercase;">
          C. DOKUMENTASI FOTO LAPANGAN
        </h4>
        <div style="display: flex; gap: 14px; margin-bottom: 15px;">
          ${
            order.photoBeforeUrl
              ? `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; text-align: center; background-color: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">FOTO SEBELUM (KONDISI AWAL)</div>
              <img src="${order.photoBeforeUrl}" style="max-height: 140px; max-width: 100%; object-fit: cover; border-radius: 4px;" alt="Before" />
            </div>
          `
              : ''
          }
          ${
            order.photoAfterUrl
              ? `
            <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px; text-align: center; background-color: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #047857; margin-bottom: 4px;">FOTO SESUDAH PENANGANAN (HASIL)</div>
              <img src="${order.photoAfterUrl}" style="max-height: 140px; max-width: 100%; object-fit: cover; border-radius: 4px;" alt="After" />
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
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PELAPOR / PETUGAS AREA</div>
          <div class="signature-box">
            <strong>${order.assignedStaffName || order.reportedByName}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Staff PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PELAKSANA PEKERJAAN</div>
          <div class="signature-box">
            <strong>${isVendor ? (order.vendorName || 'Vendor Rekanan') : 'Tim Internal PLH'}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Teknisi / Operator</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KORDINATOR LAPANGAN</div>
          <div class="signature-box">
            <strong>Slamet Riyadi</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kordinator Divisi PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">MENGETAHUI & MENYETUJUI</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Head of Facility Management</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * 2. Unduh / Cetak Laporan Rekapitulasi Pemeliharaan Pohon per Area (Divisi PLH)
 */
export const generateTreeAreaReportPdf = (
  areaName: string,
  orders: TreeWorkOrder[],
  assignedStaffName?: string
): string => {
  const docNumber = `REP-PLH-AREA-${areaName.replace(/\s+/g, '').toUpperCase()}-${getJakartaDateString().replace(/-/g, '')}`;
  const totalTrees = orders.length;
  const needVendor = orders.filter((o) => o.handlerType === 'Vendor Luar' || o.isLargeTreatment).length;
  const finished = orders.filter((o) => o.status === 'Selesai').length;
  const totalVendorCost = orders.reduce((sum, o) => sum + (o.vendorCost || 0), 0);

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Laporan Pohon - ${areaName}</title>
      ${getPrintStyles()}
    </head>
    <body>
      ${getLazuardiLetterhead('PLH (PEMELIHARAAN LINGKUNGAN HIDUP)', `LAPORAN PEMELIHARAAN POHON: ${areaName.toUpperCase()}`, docNumber)}

      <div class="meta-box">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Nama Area Tanggung Jawab:</span>
            <span class="meta-value" style="color: #047857; font-size: 12px;">${areaName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Petugas Penanggung Jawab:</span>
            <span class="meta-value">${assignedStaffName || 'Petugas Area PLH'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tanggal Cetak Laporan:</span>
            <span class="meta-value">${formatJakartaDisplayDate(getJakartaDateString())}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Pohon Terdata:</span>
            <span class="meta-value">${totalTrees} Pohon (${finished} Selesai, ${totalTrees - finished} Proses)</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Penanganan Vendor Luar:</span>
            <span class="meta-value">${needVendor} Pohon (Treatment Besar)</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Anggaran Vendor:</span>
            <span class="meta-value" style="color: #0f172a;">Rp ${totalVendorCost.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      <h4 style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin: 15px 0 8px 0; text-transform: uppercase;">
        DAFTAR INVENTARIS & REKAPITULASI WORK ORDER POHON - ${areaName.toUpperCase()}
      </h4>

      <table>
        <thead>
          <tr>
            <th style="width: 4%;">No</th>
            <th style="width: 22%;">Nama / Jenis Pohon</th>
            <th style="width: 13%;">Kondisi</th>
            <th style="width: 18%;">Tindakan Treatment</th>
            <th style="width: 14%;">Pelaksana</th>
            <th style="width: 17%;">Pengecekan Terakhir / Laporan</th>
            <th style="width: 12%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            orders.length === 0
              ? `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 15px;">Belum ada data pohon tercatat di area ini.</td></tr>`
              : orders
                  .map(
                    (o, idx) => `
            <tr>
              <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
              <td style="font-weight: 700; color: #0f172a;">
                ${o.treeName}
                ${o.notes ? `<div style="font-size: 8.5px; color: #64748b; font-style: italic; font-weight: normal; margin-top: 2px;">Catatan: ${o.notes}</div>` : ''}
              </td>
              <td>${o.condition}</td>
              <td style="font-size: 9px;">${o.treatmentNeeded}</td>
              <td>
                <span class="badge ${o.handlerType === 'Vendor Luar' ? 'badge-vendor' : 'badge-internal'}">
                  ${o.handlerType}
                </span>
                ${o.vendorCost ? `<div style="font-size: 8.5px; font-weight: 700; color: #0f172a; margin-top: 2px;">Rp ${o.vendorCost.toLocaleString('id-ID')}</div>` : ''}
              </td>
              <td>
                <div style="font-size: 9px; font-weight: 700; color: ${o.checkStatusToday === 'Sudah Dicek Aman' ? '#047857' : o.checkStatusToday === 'Perlu Penanganan' ? '#dc2626' : '#b45309'};">
                  ${o.checkStatusToday || 'Belum Dicek'}
                </div>
                <div style="font-size: 8px; color: #64748b; margin-top: 1px;">
                  ${o.lastCheckedDate ? `${formatJakartaDisplayDate(o.lastCheckedDate)} ${o.lastCheckedTime ? `(${o.lastCheckedTime})` : ''}` : 'Belum tercatat'}
                </div>
                ${o.lastCheckedByName ? `<div style="font-size: 8px; color: #0f172a; font-weight: 600;">Oleh: ${o.lastCheckedByName}</div>` : ''}
                ${o.inspectionNotes ? `<div style="font-size: 7.5px; color: #475569; font-style: italic;">"${o.inspectionNotes}"</div>` : ''}
              </td>
              <td>
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

      <!-- Tanda Tangan -->
      <div class="signature-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 40px;">
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PETUGAS PENANGGUNG JAWAB AREA</div>
          <div class="signature-box">
            <strong>${assignedStaffName || 'Petugas Area'}</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Staff Divisi PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">KORDINATOR DIVISI PLH</div>
          <div class="signature-box">
            <strong>Slamet Riyadi</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Kordinator Lapangan PLH</span>
          </div>
        </div>
        <div>
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">HEAD OF FACILITY MANAGEMENT</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Departemen FM Lazuardi</span>
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
  const divisionText = division === 'PLH' ? 'PLH (PEMELIHARAAN LINGKUNGAN HIDUP)' : 'OB (OFFICE BOY & SANITASI)';
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
            <span class="meta-value">${division === 'Semua' ? 'Seluruh Divisi (OB & PLH)' : `Divisi ${division}`}</span>
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
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">HEAD OF FACILITY MANAGEMENT</div>
          <div class="signature-box">
            <strong>Alpian</strong><br/>
            <span style="font-size: 8.5px; color: #64748b;">Departemen FM Lazuardi</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Trigger window printing atau fallback download printable HTML
 */
export const printHtmlAsPdf = (htmlContent: string, title: string) => {
  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 450);
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
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2500);
      }, 500);
    }
  }
};
