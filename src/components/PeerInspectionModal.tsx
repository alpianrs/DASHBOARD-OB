import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  Building2,
  Users,
  CheckSquare,
  Plane,
  Camera,
  Image as ImageIcon,
  Trash2,
  Eye,
} from 'lucide-react';
import { User, PeerInspection, DinasRequest } from '../types';
import { canInspectPeer } from '../services/storage';
import { getJakartaDateString } from '../utils/dateHelper';
import { GoogleSheetsService } from '../services/googleSheets';

interface PeerInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User;
  allUsers: User[];
  dinasRequests?: DinasRequest[];
  onSubmitInspection: (inspection: PeerInspection) => void;
}

const DEFAULT_CHECKLIST = [
  'Toilet: Kloset, urinal, wastafel & cermin bersih, disinfektan bebas noda/kerak',
  'Toilet: Lantai kering, wangi, tidak licin & bebas genangan air',
  'Toilet: Kran air berfungsi normal, tidak ada kebocoran, sabun & tisu terisi penuh',
  'Ruangan / Kelas: Lantai bersih, kesat, disapu & dipel bebas debu kolong meja',
  'Tempat Sampah: Seluruh tempat sampah kosong & terpasang plastik pelapis baru',
  'Aroma Ruangan: Udara segar, bersih, & tidak berbau apek / tidak sedap',
  'Kerapihan: Meja, kursi, kaca, dan perlengkapan kerja tertata rapi sesuai standar',
];

export const PeerInspectionModal: React.FC<PeerInspectionModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  allUsers,
  dinasRequests = [],
  onSubmitInspection,
}) => {
  const today = getJakartaDateString();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if active user is currently on Dinas Luar
  const activeUserDinas = dinasRequests.find(
    (d) =>
      d.userId === activeUser.id &&
      (d.date === today || d.date?.startsWith(today)) &&
      (d.status === 'Disetujui' || d.status === 'Pending')
  );

  // Filter eligible target users according to Lazuardi GCS peer cluster rule
  const eligibleUsers = allUsers.filter(
    (u) =>
      u.id !== activeUser.id &&
      u.status === 'Aktif' &&
      canInspectPeer(activeUser.role, activeUser.unit, u.unit)
  );

  const [targetUserId, setTargetUserId] = useState<string>(
    eligibleUsers[0]?.id || ''
  );
  const [area, setArea] = useState<string>('');
  const [inspectionStatus, setInspectionStatus] = useState<
    'Sesuai Standar Kebersihan' | 'Sesuai Standar SOP' | 'Ada Temuan / Perlu Perbaikan'
  >('Sesuai Standar Kebersihan');
  const [notes, setNotes] = useState<string>('');
  const [checklist, setChecklist] = useState<{ label: string; passed: boolean }[]>(
    DEFAULT_CHECKLIST.map((item) => ({ label: item, passed: true }))
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetUser = allUsers.find((u) => u.id === targetUserId);
  const targetUserDinas = targetUser
    ? dinasRequests.find(
        (d) =>
          d.userId === targetUser.id &&
          (d.date === today || d.date?.startsWith(today)) &&
          (d.status === 'Disetujui' || d.status === 'Pending')
      )
    : null;

  const toggleChecklistItem = (index: number) => {
    const next = [...checklist];
    next[index].passed = !next[index].passed;
    setChecklist(next);

    // If any item failed, suggest setting status to Ada Temuan
    const anyFailed = next.some((item) => !item.passed);
    if (anyFailed && (inspectionStatus === 'Sesuai Standar Kebersihan' || inspectionStatus === 'Sesuai Standar SOP')) {
      setInspectionStatus('Ada Temuan / Perlu Perbaikan');
    } else if (!anyFailed && inspectionStatus === 'Ada Temuan / Perlu Perbaikan') {
      setInspectionStatus('Sesuai Standar Kebersihan');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read and compress file to data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          // Add timestamp watermark
          const timeStr = new Date().toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'medium',
          });
          const watermarkText = `INSPEKSI SILANG: ${activeUser.name} -> ${targetUser?.name || 'Petugas'} | ${timeStr} WIB`;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, height - 30, width, 30);
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(watermarkText, 10, height - 10);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setPhotoDataUrl(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) {
      setError('Pilih rekan tim yang ingin diinspeksi.');
      return;
    }
    if (!area.trim()) {
      setError('Tentukan ruangan/area yang sedang diinspeksi.');
      return;
    }

    setIsUploadingPhoto(true);

    let finalPhotoUrl = photoDataUrl || undefined;
    if (photoDataUrl) {
      try {
        const filename = `INSPEKSI_${activeUser.unit}_${activeUser.name.replace(/\s+/g, '_')}_to_${targetUser.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
        const uploadResult = await GoogleSheetsService.uploadPhotoToDrive(photoDataUrl, filename);
        if (uploadResult?.driveUrl) {
          finalPhotoUrl = uploadResult.driveUrl;
        }
      } catch (uploadErr) {
        console.warn('Photo upload fallback to local URL:', uploadErr);
      }
    }

    const newInspection: PeerInspection = {
      id: `pi-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: today,
      inspectorId: activeUser.id,
      inspectorName: activeUser.name,
      inspectorRole: activeUser.role,
      inspectorUnit: activeUser.unit,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUnit: targetUser.unit,
      area: area.trim(),
      status: inspectionStatus,
      notes:
        notes.trim() ||
        (inspectionStatus === 'Sesuai Standar Kebersihan' || inspectionStatus === 'Sesuai Standar SOP'
          ? 'Kondisi area bersih dan sesuai Standar Kebersihan Lazuardi GCS.'
          : 'Terdapat catatan temuan kebersihan yang perlu dirapikan.'),
      checklistItems: checklist,
      photoUrl: finalPhotoUrl,
    };

    setIsUploadingPhoto(false);
    onSubmitInspection(newInspection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight tracking-tight">
                Inspeksi Silang Tim (Peer Review)
              </h3>
              <p className="text-xs text-slate-400">
                Unit {activeUser.unit} • Standar Kebersihan Lazuardi GCS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Active User Dinas Luar Notice if applicable */}
          {activeUserDinas && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-950 flex items-start gap-2.5">
              <Plane className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-blue-900">Anda Sedang Mengajukan / Dinas Luar Hari Ini:</strong>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Sebagai catatan, petugas yang sedang bertugas dinas luar secara resmi dibebaskan dari kewajiban pengisian tugas harian &amp; inspeksi silang. Anda tetap dapat mengirimkan laporan ini bila diinginkan.
                </p>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-900 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckSquare className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sky-950 block">Pemeriksaan Kualitas Antar Rekan:</strong>
                <p className="text-sky-800 text-[11px] mt-0.5">
                  Inspeksi silang difokuskan untuk saling mengecek Standar Kebersihan toilet &amp; area kerja serta menyertakan foto bukti. Laporan akan otomatis masuk ke data rekan yang diinspeksi dan tersinkron ke Google Sheet.
                </p>
              </div>
            </div>
          </div>

          {/* Target User Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              Pilih Rekan yang Diinspeksi (Target Inspeksi):
            </label>
            {eligibleUsers.length > 0 ? (
              <div className="space-y-1.5">
                <select
                  value={targetUserId}
                  onChange={(e) => {
                    setTargetUserId(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {eligibleUsers.map((u) => {
                    const isUOnDinas = dinasRequests.some(
                      (d) =>
                        d.userId === u.id &&
                        (d.date === today || d.date?.startsWith(today)) &&
                        (d.status === 'Disetujui' || d.status === 'Pending')
                    );
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} — Unit: {u.unit} {isUOnDinas ? '✈️ [Sedang Dinas Luar]' : ''}
                      </option>
                    );
                  })}
                </select>
                {targetUserDinas && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Rekan ini sedang dinas luar (<strong>{targetUserDinas.reason || 'Tugas Luar'}</strong>).
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-rose-600 p-2 bg-rose-50 rounded-xl border border-rose-200">
                Tidak ada rekan aktif dalam klaster unit Anda saat ini.
              </p>
            )}
          </div>

          {/* Area under inspection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              Area / Ruangan yang Diinspeksi:
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setError(null);
              }}
              placeholder="Contoh: Toilet Lantai 1, Toilet Siswa, Ruang Kelas 2B, Koridor Utama..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Foto Bukti Inspeksi Silang */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-sky-600" />
                Foto Bukti Inspeksi Silang:
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Opsional / Disarankan</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoDataUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                <img
                  src={photoDataUrl}
                  alt="Bukti Inspeksi Silang"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-sky-500"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ganti Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Foto Terlampir & Siap Simpan</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-sky-500 hover:bg-sky-50/50 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 text-xs">
                  Ambil Foto / Pilih Gambar Bukti
                </span>
                <span className="text-[10px] text-slate-500">
                  Gunakan kamera HP atau pilih file foto area/toilet yang diinspeksi
                </span>
              </div>
            )}
          </div>

          {/* Standar Kebersihan Checklist */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Standar Kebersihan (Klik untuk Ceklist):
            </label>
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => toggleChecklistItem(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    item.passed
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="font-medium pr-2">{item.label}</span>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      item.passed
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {item.passed ? '✓' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status Hasil Inspeksi (Sesuai / Ada Temuan) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Status Kesimpulan Inspeksi:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInspectionStatus('Sesuai Standar Kebersihan')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  inspectionStatus === 'Sesuai Standar Kebersihan' || inspectionStatus === 'Sesuai Standar SOP'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sesuai Standar Kebersihan</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectionStatus('Ada Temuan / Perlu Perbaikan')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  inspectionStatus === 'Ada Temuan / Perlu Perbaikan'
                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Ada Temuan Perbaikan</span>
              </button>
            </div>
          </div>

          {/* Feedback & Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Catatan Temuan / Saran untuk Rekan:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Toilet sangat bersih dan wangi, mohon pastikan tempat sampah selalu terisi plastik..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
            />
          </div>

          {error && <p className="text-rose-600 font-semibold">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={eligibleUsers.length === 0 || isUploadingPhoto}
              className="flex-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>{isUploadingPhoto ? 'Menyimpan...' : 'Simpan Catatan Inspeksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

