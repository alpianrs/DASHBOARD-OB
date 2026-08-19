import React, { useState } from 'react';
import { AlertTriangle, Clock, Send, X, ShieldAlert } from 'lucide-react';
import { MasterTask } from '../types';

interface LateReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: MasterTask;
  onSubmitReason: (reason: string) => void;
}

const COMMON_REASONS = [
  'Membantu setup acara / upacara pagi sekolah',
  'Penanganan mendadak pipa air / listrik / saluran',
  'Membantu pemindahan barang berat guru/kantor',
  'Kondisi cuaca hujan lebat / genangan air',
  'Kendala operasional / darurat di unit',
];

export const LateReasonModal: React.FC<LateReasonModalProps> = ({
  isOpen,
  onClose,
  task,
  onSubmitReason,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim()
      ? customReason.trim()
      : selectedPreset;

    if (!finalReason) {
      setError('Wajib mengisi atau memilih alasan keterlambatan Pre-Readiness.');
      return;
    }

    onSubmitReason(finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight tracking-tight">
                Alasan Keterlambatan Pre-Readiness
              </h3>
              <p className="text-xs text-slate-400">Batas Waktu: 09:00 WIB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 mb-0.5">Pekerjaan: {task.title}</p>
              <p className="text-amber-800">
                Pekerjaan diselesaikan setelah pukul 09:00 WIB. Berdasarkan SOP Facility
                Management Lazuardi, alasan akan dicatat di laporan harian Admin.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Alasan Umum:
            </label>
            <div className="space-y-1.5">
              {COMMON_REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => {
                    setSelectedPreset(r);
                    setError(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    selectedPreset === r
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100/80'
                  }`}
                >
                  • {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Atau Tuliskan Alasan Lengkap:
            </label>
            <textarea
              rows={3}
              value={customReason}
              onChange={(e) => {
                setCustomReason(e.target.value);
                setError(null);
              }}
              placeholder="Contoh: Menangani kebocoran kran air di toilet lantai 2 sebelum memulai pembersihan kelas..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>Simpan Alasan & Lanjutkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
