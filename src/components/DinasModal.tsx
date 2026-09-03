import React, { useState } from 'react';
import { Plane, Calendar, MapPin, FileText, Send, X, CheckCircle2 } from 'lucide-react';
import { User, DinasRequest } from '../types';
import { getJakartaDateString } from '../utils/dateHelper';

interface DinasModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: User;
  onSubmitDinas: (request: DinasRequest) => void;
}

export const DinasModal: React.FC<DinasModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  onSubmitDinas,
}) => {
  const today = getJakartaDateString();
  const [date, setDate] = useState<string>(today);
  const [destination, setDestination] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !reason.trim()) {
      setError('Mohon isi tujuan lokasi dan keperluan dinas luar secara lengkap.');
      return;
    }

    const newRequest: DinasRequest = {
      id: `dn-${Date.now()}`,
      date,
      userId: activeUser.id,
      userName: activeUser.name,
      unit: activeUser.unit,
      destination: destination.trim(),
      reason: reason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    onSubmitDinas(newRequest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-amber-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight tracking-tight">Pengajuan Izin Dinas Luar</h3>
              <p className="text-xs text-slate-400">Penonaktifan Tugas Harian oleh Admin FM</p>
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
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 leading-relaxed">
            Pengajuan dinas luar akan dikirim ke <strong>Admin Facility Management</strong>.
            Setelah disetujui, tugas harian otomatis berstatus <strong>Dinas Luar</strong> tanpa
            mengurangi persentase kehadiran tugas.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Tanggal Dinas:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Tujuan / Lokasi Dinas Luar:
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setError(null);
              }}
              placeholder="Contoh: Toko Bangunan Mitra Pusat / Kantor Cabang / Bank..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Alasan & Keperluan Lengkap:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder="Contoh: Pembelian chemical stok bulanan, perbaikan pompa air, atau penugasan resmi pimpinan..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

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
              <span>Kirim Permintaan Dinas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
