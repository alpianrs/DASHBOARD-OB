import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  Building2,
  Users,
  CheckSquare,
} from 'lucide-react';
import { User, PeerInspection } from '../types';
import { canInspectPeer } from '../services/storage';

interface PeerInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User;
  allUsers: User[];
  onSubmitInspection: (inspection: PeerInspection) => void;
}

const DEFAULT_CHECKLIST = [
  'Lantai bersih, kesat & bebas dari debu/pasir',
  'Wastafel, cermin, & kloset mengkilap dan tidak berkerak',
  'Tempat sampah kosong & terpasang plastik pelapis baru',
  'Aroma ruangan segar & tidak berbau apek/tidak sedap',
  'Peralatan kerja tersusun rapi pada tempatnya',
];

export const PeerInspectionModal: React.FC<PeerInspectionModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  allUsers,
  onSubmitInspection,
}) => {
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
    'Sesuai Standar SOP' | 'Ada Temuan / Perlu Perbaikan'
  >('Sesuai Standar SOP');
  const [notes, setNotes] = useState<string>('');
  const [checklist, setChecklist] = useState<{ label: string; passed: boolean }[]>(
    DEFAULT_CHECKLIST.map((item) => ({ label: item, passed: true }))
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetUser = allUsers.find((u) => u.id === targetUserId);

  const toggleChecklistItem = (index: number) => {
    const next = [...checklist];
    next[index].passed = !next[index].passed;
    setChecklist(next);

    // If any item failed, suggest setting status to Ada Temuan
    const anyFailed = next.some((item) => !item.passed);
    if (anyFailed && inspectionStatus === 'Sesuai Standar SOP') {
      setInspectionStatus('Ada Temuan / Perlu Perbaikan');
    } else if (!anyFailed && inspectionStatus === 'Ada Temuan / Perlu Perbaikan') {
      setInspectionStatus('Sesuai Standar SOP');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) {
      setError('Pilih rekan tim yang ingin diinspeksi.');
      return;
    }
    if (!area.trim()) {
      setError('Tentukan ruangan/area yang sedang diinspeksi.');
      return;
    }

    const newInspection: PeerInspection = {
      id: `pi-${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      inspectorId: activeUser.id,
      inspectorName: activeUser.name,
      inspectorRole: activeUser.role,
      inspectorUnit: activeUser.unit,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUnit: targetUser.unit,
      area: area.trim(),
      status: inspectionStatus,
      notes: notes.trim() || (inspectionStatus === 'Sesuai Standar SOP' ? 'Kondisi area bersih dan sesuai SOP Lazuardi GCS.' : 'Terdapat catatan temuan kebersihan yang perlu dirapikan.'),
      checklistItems: checklist,
    };

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
                Unit {activeUser.unit} • SOP Lazuardi GCS
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
          {/* Info Banner */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sky-900 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckSquare className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sky-950 block">Pemeriksaan Kualitas Antar Rekan:</strong>
                <p className="text-sky-800 text-[11px] mt-0.5">
                  Inspeksi silang difokuskan untuk saling mengecek checklist kebersihan &amp; memberikan catatan temuan. <em>Penilaian angka resmi dilakukan secara khusus oleh Kordinator dan Admin.</em>
                </p>
              </div>
            </div>
          </div>

          {/* Target User Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              Pilih Rekan yang Diinspeksi:
            </label>
            {eligibleUsers.length > 0 ? (
              <select
                value={targetUserId}
                onChange={(e) => {
                  setTargetUserId(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — Unit: {u.unit} ({u.role})
                  </option>
                ))}
              </select>
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
              placeholder="Contoh: Toilet Lantai 1, Ruang Kelas 2B, Koridor Utama..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* SOP Checklist */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Checklist Standar Kebersihan (Klik untuk Ceklist):
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
                  <span className="font-medium">{item.label}</span>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs ${
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
                onClick={() => setInspectionStatus('Sesuai Standar SOP')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  inspectionStatus === 'Sesuai Standar SOP'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sesuai Standar SOP</span>
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
              placeholder="Contoh: Lantai sudah sangat bersih dan wangi, mohon pastikan tempat sampah selalu terisi plastik..."
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
              disabled={eligibleUsers.length === 0}
              className="flex-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>Simpan Catatan Inspeksi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
