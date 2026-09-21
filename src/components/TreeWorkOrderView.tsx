import React, { useState } from 'react';
import {
  TreePine,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Camera,
  X,
  Copy,
  Check,
  Building2,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit3,
  Download,
} from 'lucide-react';
import {
  User,
  TreeWorkOrder,
  TreeCondition,
  TreeTreatmentType,
  TreeHandlerType,
  PLH_AREAS,
} from '../types';
import { StorageService } from '../services/storage';
import { getJakartaDateString, formatJakartaDisplayDate } from '../utils/dateHelper';

interface TreeWorkOrderViewProps {
  activeUser: User;
  onClose?: () => void;
  isModal?: boolean;
}

export const TreeWorkOrderView: React.FC<TreeWorkOrderViewProps> = ({
  activeUser,
  onClose,
  isModal = false,
}) => {
  const [orders, setOrders] = useState<TreeWorkOrder[]>(() =>
    StorageService.getTreeWorkOrders()
  );
  const [activeTab, setActiveTab] = useState<
    'all' | 'weekly_vendor' | 'internal' | 'urgent' | 'completed'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('Semua');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<TreeWorkOrder | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);

  // Form Fields
  const [formArea, setFormArea] = useState<string>(PLH_AREAS[0]);
  const [formTreeName, setFormTreeName] = useState<string>('');
  const [formCondition, setFormCondition] = useState<TreeCondition>('Rimbun');
  const [formTreatment, setFormTreatment] = useState<TreeTreatmentType>(
    'Penjarangan Kanopi Rimbun'
  );
  const [formHandlerType, setFormHandlerType] =
    useState<TreeHandlerType>('Internal PLH');
  const [formVendorName, setFormVendorName] = useState<string>('');
  const [formVendorCost, setFormVendorCost] = useState<string>('');
  const [formScheduledWeek, setFormScheduledWeek] = useState<string>(
    'Minggu ke-4 September 2026'
  );
  const [formUrgency, setFormUrgency] = useState<
    'Rendah' | 'Sedang' | 'Tinggi / Bahaya'
  >('Sedang');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formPhotoBefore, setFormPhotoBefore] = useState<string>('');
  const [formPhotoAfter, setFormPhotoAfter] = useState<string>('');
  const [formStatus, setFormStatus] = useState<
    'Perlu Penanganan' | 'Dijadwalkan' | 'Sedang Dikerjakan' | 'Selesai'
  >('Perlu Penanganan');

  const today = getJakartaDateString();

  // Reload data
  const refreshData = () => {
    setOrders(StorageService.getTreeWorkOrders());
  };

  const openNewForm = () => {
    setEditingOrder(null);
    setFormArea(PLH_AREAS[0]);
    setFormTreeName('');
    setFormCondition('Rimbun');
    setFormTreatment('Penjarangan Kanopi Rimbun');
    setFormHandlerType('Internal PLH');
    setFormVendorName('');
    setFormVendorCost('');
    setFormScheduledWeek('Minggu ke-4 September 2026');
    setFormUrgency('Sedang');
    setFormNotes('');
    setFormPhotoBefore('');
    setFormPhotoAfter('');
    setFormStatus('Perlu Penanganan');
    setIsFormOpen(true);
  };

  const openEditForm = (order: TreeWorkOrder) => {
    setEditingOrder(order);
    setFormArea(order.area);
    setFormTreeName(order.treeName);
    setFormCondition(order.condition);
    setFormTreatment(order.treatmentNeeded);
    setFormHandlerType(order.handlerType);
    setFormVendorName(order.vendorName || '');
    setFormVendorCost(order.vendorCost ? String(order.vendorCost) : '');
    setFormScheduledWeek(order.scheduledWeek || 'Minggu ke-4 September 2026');
    setFormUrgency(order.urgency);
    setFormNotes(order.notes);
    setFormPhotoBefore(order.photoBeforeUrl || '');
    setFormPhotoAfter(order.photoAfterUrl || '');
    setFormStatus(order.status);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTreeName.trim()) {
      alert('Mohon isi nama atau jenis pohon yang diperiksa!');
      return;
    }

    const isLarge = formHandlerType === 'Vendor Luar' || formTreatment.includes('Vendor Luar') || formTreatment.includes('Topping');

    if (editingOrder) {
      const updated: TreeWorkOrder = {
        ...editingOrder,
        area: formArea,
        treeName: formTreeName.trim(),
        condition: formCondition,
        treatmentNeeded: formTreatment,
        handlerType: formHandlerType,
        isLargeTreatment: isLarge,
        vendorName: formHandlerType === 'Vendor Luar' ? formVendorName.trim() : undefined,
        vendorCost: formHandlerType === 'Vendor Luar' && formVendorCost ? Number(formVendorCost) : undefined,
        scheduledWeek: formScheduledWeek,
        urgency: formUrgency,
        notes: formNotes.trim(),
        photoBeforeUrl: formPhotoBefore,
        photoAfterUrl: formPhotoAfter,
        status: formStatus,
        completedAt: formStatus === 'Selesai' ? new Date().toISOString() : editingOrder.completedAt,
        completedBy: formStatus === 'Selesai' ? activeUser.id : editingOrder.completedBy,
        completedByName: formStatus === 'Selesai' ? activeUser.name : editingOrder.completedByName,
      };
      StorageService.updateTreeWorkOrder(updated);
    } else {
      const newOrder: TreeWorkOrder = {
        id: `two-${Date.now().toString(36)}`,
        date: today,
        area: formArea,
        treeName: formTreeName.trim(),
        condition: formCondition,
        treatmentNeeded: formTreatment,
        handlerType: formHandlerType,
        isLargeTreatment: isLarge,
        vendorName: formHandlerType === 'Vendor Luar' ? formVendorName.trim() : undefined,
        vendorCost: formHandlerType === 'Vendor Luar' && formVendorCost ? Number(formVendorCost) : undefined,
        scheduledWeek: formScheduledWeek,
        urgency: formUrgency,
        notes: formNotes.trim(),
        photoBeforeUrl: formPhotoBefore,
        photoAfterUrl: formPhotoAfter,
        status: formStatus,
        reportedBy: activeUser.id,
        reportedByName: activeUser.name,
        createdAt: new Date().toISOString(),
      };
      StorageService.addTreeWorkOrder(newOrder);
    }

    setIsFormOpen(false);
    refreshData();
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus work order pohon ini?')) {
      StorageService.deleteTreeWorkOrder(id);
      refreshData();
    }
  };

  const handleQuickStatus = (order: TreeWorkOrder, status: 'Sedang Dikerjakan' | 'Selesai') => {
    const updated: TreeWorkOrder = {
      ...order,
      status,
      completedAt: status === 'Selesai' ? new Date().toISOString() : undefined,
      completedBy: status === 'Selesai' ? activeUser.id : undefined,
      completedByName: status === 'Selesai' ? activeUser.name : undefined,
    };
    StorageService.updateTreeWorkOrder(updated);
    refreshData();
  };

  // Image Upload Helper (Base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (type === 'before') {
        setFormPhotoBefore(base64);
      } else {
        setFormPhotoAfter(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Filtering
  const filteredOrders = orders.filter((o) => {
    // Area Filter
    if (selectedAreaFilter !== 'Semua' && o.area !== selectedAreaFilter) {
      return false;
    }
    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        o.treeName.toLowerCase().includes(q) ||
        o.area.toLowerCase().includes(q) ||
        o.notes.toLowerCase().includes(q) ||
        (o.vendorName && o.vendorName.toLowerCase().includes(q));
      if (!match) return false;
    }
    // Tab Filter
    if (activeTab === 'weekly_vendor') {
      return o.handlerType === 'Vendor Luar' || o.isLargeTreatment === true;
    }
    if (activeTab === 'internal') {
      return o.handlerType === 'Internal PLH';
    }
    if (activeTab === 'urgent') {
      return o.urgency === 'Tinggi / Bahaya' || o.condition === 'Miring / Rawan Tumbang';
    }
    if (activeTab === 'completed') {
      return o.status === 'Selesai';
    }
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID_WorkOrder',
      'Tanggal',
      'Area_Lokasi',
      'Nama_Pohon',
      'Kondisi',
      'Treatment_Dibutuhkan',
      'Pelaksana',
      'Nama_Vendor',
      'Biaya_Vendor',
      'Target_Minggu',
      'Tingkat_Urgensi',
      'Status',
      'Catatan_Khusus',
      'Pelapor',
    ];
    const rows = orders.map((o) => [
      o.id,
      o.date,
      `"${o.area}"`,
      `"${o.treeName}"`,
      `"${o.condition}"`,
      `"${o.treatmentNeeded}"`,
      `"${o.handlerType}"`,
      `"${o.vendorName || '-'}"`,
      o.vendorCost || 0,
      `"${o.scheduledWeek || '-'}"`,
      `"${o.urgency}"`,
      `"${o.status}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`,
      `"${o.reportedByName}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `WorkOrder_Pohon_Lazuardi_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySheetHeaders = () => {
    const headers =
      'ID_WorkOrder\tTanggal\tArea_Lokasi\tNama_Pohon\tKondisi_Pohon\tTindakan_Treatment\tPelaksana\tNama_Vendor\tBiaya_Vendor\tTarget_Minggu\tTingkat_Urgensi\tStatus\tCatatan_Khusus\tLink_Foto\tPelapor';
    navigator.clipboard.writeText(headers);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 2000);
  };

  const googleAppsScriptSnippet = `// =======================================================
// FUNGSI GOOGLE APPS SCRIPT: AUTO SETUP TAB WORK ORDER POHON
// Jalankan fungsi ini di editor Apps Script spreadsheet Anda:
// =======================================================

function setupTabWorkOrderPohon() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "WorkOrder_Pohon";
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  var headers = [
    ["ID_WorkOrder", "Tanggal_Lapor", "Area_Lokasi", "Nama_Pohon", "Kondisi_Pohon",
     "Tindakan_Treatment", "Pelaksana", "Nama_Vendor", "Biaya_Vendor", "Target_Minggu",
     "Tingkat_Urgensi", "Status", "Catatan_Khusus", "Link_Foto_Sebelum", "Pelapor", "Waktu_Update"]
  ];
  
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  sheet.getRange(1, 1, 1, headers[0].length)
    .setBackground("#15803d")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  
  sheet.setFrozenRows(1);
  ss.toast("Sheet 'WorkOrder_Pohon' berhasil disiapkan!", "Sukses", 5);
}`;

  const copyAppsScriptCode = () => {
    navigator.clipboard.writeText(googleAppsScriptSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className={`space-y-4 ${isModal ? 'max-h-[85vh] overflow-y-auto p-1' : ''}`}>
      {/* Top Banner & Action Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
            <TreePine className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white tracking-tight">
                Work Order Khusus Pohon & Penanganan Lingkungan
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Divisi PLH & Vendor Luar
              </span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
              Monitoring pohon rimbun, perapihan dahan lapuk, dan integrasi penanganan treatment besar oleh vendor luar yang disinkronkan ke Work Order Mingguan serta database Google Sheet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Instruksi Database Sheet</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-teal-300" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={openNewForm}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-emerald-950 transition cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Input Cek Pohon Baru</span>
          </button>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua Work Order ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weekly_vendor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'weekly_vendor'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>WO Mingguan: Vendor Luar ({orders.filter((o) => o.handlerType === 'Vendor Luar' || o.isLargeTreatment).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('internal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'internal'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            Internal PLH ({orders.filter((o) => o.handlerType === 'Internal PLH').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              activeTab === 'urgent'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Urgen / Bahaya ({orders.filter((o) => o.urgency === 'Tinggi / Bahaya').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white'
                : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            Selesai ({orders.filter((o) => o.status === 'Selesai').length})
          </button>
        </div>

        {/* Quick Search & Area Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pohon / catatan..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700"
          >
            <option value="Semua">Semua Area</option>
            {PLH_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Highlight Box for Treatment Besar / Vendor Luar */}
      {activeTab === 'weekly_vendor' && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <Building2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950">
            <h4 className="font-bold text-amber-900 text-sm">
              Work Order Mingguan Pohon: Penanganan Treatment Besar (Vendor Luar)
            </h4>
            <p className="mt-0.5 text-amber-800">
              Pekerjaan pemotongan pohon tinggi, kanopi ekstrem yang membahayakan kabel/atap, atau penebangan pohon lapuk masuk ke jadwal mingguan dan dikerjakan oleh pihak vendor luar dengan koordinasi Admin/Kordinator PLH.
            </p>
          </div>
        </div>
      )}

      {/* Work Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <TreePine className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-base">Belum Ada Work Order Pohon</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Gunakan tombol "Input Cek Pohon Baru" untuk mencatat kondisi pohon rimbun atau kebutuhan penanganan vendor luar.
          </p>
          <button
            type="button"
            onClick={openNewForm}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Pengecekan Pohon</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isVendor = order.handlerType === 'Vendor Luar' || order.isLargeTreatment;
            const isFinished = order.status === 'Selesai';
            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                  order.urgency === 'Tinggi / Bahaya'
                    ? 'border-rose-300 shadow-rose-100'
                    : isVendor
                    ? 'border-amber-300 shadow-amber-50'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {order.area}
                        </span>
                        {isVendor ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-amber-700" />
                            <span>Vendor Luar (Treatment Besar)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                            Internal PLH
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mt-1.5 leading-snug">
                        {order.treeName}
                      </h3>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isFinished
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'Sedang Dikerjakan'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Badges: Kondisi, Treatment, Urgensi */}
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold">Kondisi Pohon:</span>
                      <span
                        className={`font-bold ${
                          order.condition === 'Rimbun'
                            ? 'text-amber-700'
                            : order.condition === 'Miring / Rawan Tumbang'
                            ? 'text-rose-700 font-black'
                            : 'text-slate-700'
                        }`}
                      >
                        {order.condition}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold">Tindakan:</span>
                      <span className="font-bold text-slate-800 text-right truncate max-w-[170px]">
                        {order.treatmentNeeded}
                      </span>
                    </div>

                    {isVendor && (
                      <>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                          <span className="text-slate-500 font-semibold">Vendor:</span>
                          <span className="font-bold text-amber-900">
                            {order.vendorName || 'Belum Ditunjuk'}
                          </span>
                        </div>
                        {order.scheduledWeek && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-semibold">Target Minggu:</span>
                            <span className="font-bold text-amber-800">
                              {order.scheduledWeek}
                            </span>
                          </div>
                        )}
                        {order.vendorCost && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-semibold">Biaya:</span>
                            <span className="font-bold text-slate-700">
                              Rp {order.vendorCost.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Catatan Khusus */}
                  {order.notes && (
                    <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      <span className="font-bold text-amber-950 block text-[10px] uppercase tracking-wider mb-0.5">
                        Catatan Khusus Pohon:
                      </span>
                      <p className="italic">{order.notes}</p>
                    </div>
                  )}

                  {/* Foto Preview */}
                  {order.photoBeforeUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 relative max-h-36 bg-slate-100">
                      <img
                        src={order.photoBeforeUrl}
                        alt={order.treeName}
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        Foto Kondisi Pohon
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-400">
                    <span>Pelapor: {order.reportedByName}</span>
                    <span className="block">{formatJakartaDisplayDate(order.date)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isFinished && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatus(order, 'Selesai')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Selesai</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditForm(order)}
                      className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Edit Work Order"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {(activeUser.role === 'admin' || activeUser.role === 'kordinator') && (
                      <button
                        type="button"
                        onClick={() => handleDelete(order.id)}
                        className="p-1.5 rounded-lg bg-white border border-slate-300 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <TreePine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingOrder ? 'Edit Work Order Pohon' : 'Input Cek & Work Order Pohon Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">Divisi PLH & Penanganan Vendor Luar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-3.5">
              {/* Lokasi Area & Nama Pohon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi / Area Luar PLH:
                  </label>
                  <select
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    {PLH_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                    <option value="Area Lapangan Utama">Area Lapangan Utama</option>
                    <option value="Area Selasar Luar Kelas">Area Selasar Luar Kelas</option>
                    <option value="Area Belakang Gedung">Area Belakang Gedung</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama / Spesies Pohon:
                  </label>
                  <input
                    type="text"
                    required
                    value={formTreeName}
                    onChange={(e) => setFormTreeName(e.target.value)}
                    placeholder="Contoh: Pohon Trembesi Depan / Ketapang Pos 2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Kondisi & Urgensi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hasil Cek Kondisi Pohon:
                  </label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as TreeCondition)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Rimbun">🌳 Rimbun (Perlu Treatment / Pemangkasan)</option>
                    <option value="Dahan Kering / Lapuk">🍂 Dahan Kering / Lapuk (Rawan Patah)</option>
                    <option value="Miring / Rawan Tumbang">⚠️ Miring / Rawan Tumbang (Bahaya)</option>
                    <option value="Terserang Hama / Benalu">🐛 Terserang Hama / Benalu</option>
                    <option value="Normal / Sehat">✅ Normal / Sehat (Monitoring)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tingkat Urgensi:
                  </label>
                  <select
                    value={formUrgency}
                    onChange={(e) =>
                      setFormUrgency(e.target.value as 'Rendah' | 'Sedang' | 'Tinggi / Bahaya')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Rendah">Rendah (Pekerjaan Rutin)</option>
                    <option value="Sedang">Sedang (Perlu Dijadwalkan Segera)</option>
                    <option value="Tinggi / Bahaya">🚨 Tinggi / Bahaya (Membahayakan)</option>
                  </select>
                </div>
              </div>

              {/* Pelaksana: Internal vs Vendor Luar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Pelaksana Penanganan (Treatment):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormHandlerType('Internal PLH');
                      if (formTreatment.includes('Vendor Luar')) {
                        setFormTreatment('Penjarangan Kanopi Rimbun');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formHandlerType === 'Internal PLH'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <TreePine className="w-3.5 h-3.5" />
                    <span>Internal Tim PLH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormHandlerType('Vendor Luar');
                      setFormTreatment('Penebangan / Topping Pohon Tinggi (Vendor Luar)');
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formHandlerType === 'Vendor Luar'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Vendor Luar (Treatment Besar)</span>
                  </button>
                </div>

                {formHandlerType === 'Vendor Luar' && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                        Nama Vendor Luar:
                      </label>
                      <input
                        type="text"
                        value={formVendorName}
                        onChange={(e) => setFormVendorName(e.target.value)}
                        placeholder="Contoh: CV Duta Hijau / Vendor Dinas"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                        Target Minggu Pengerjaan:
                      </label>
                      <input
                        type="text"
                        value={formScheduledWeek}
                        onChange={(e) => setFormScheduledWeek(e.target.value)}
                        placeholder="Contoh: Minggu ke-4 September 2026"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-medium text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tindakan Treatment Detail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tindakan Treatment yang Dibutuhkan:
                </label>
                <select
                  value={formTreatment}
                  onChange={(e) => setFormTreatment(e.target.value as TreeTreatmentType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Penjarangan Kanopi Rimbun">✂️ Penjarangan Kanopi Rimbun</option>
                  <option value="Pemangkasan Ringan (Pruning Dahan Bawah)">
                    🌿 Pemangkasan Ringan (Pruning Dahan Bawah)
                  </option>
                  <option value="Pemotongan Dahan Dekat Kabel Listrik / Atap">
                    ⚡ Pemotongan Dahan Dekat Kabel Listrik / Atap
                  </option>
                  <option value="Penebangan / Topping Pohon Tinggi (Vendor Luar)">
                    🏗️ Penebangan / Topping Pohon Tinggi (Treatment Besar - Vendor Luar)
                  </option>
                  <option value="Pemberian Nutrisi / Obat Hama Batang">
                    🧪 Pemberian Nutrisi / Obat Hama Batang
                  </option>
                  <option value="Penyangga / Penegakan Batang">
                    🪵 Pemasangan Penyangga / Penegakan Batang Miring
                  </option>
                </select>
              </div>

              {/* Catatan Khusus */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Khusus Kondisi & Penanganan Pohon:
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Jelaskan detail kerimbunan, ketinggian pohon, jarak ke genteng/kabel, atau alasan perlunya vendor luar..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Status & Foto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Pengerjaan:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(
                        e.target.value as
                          | 'Perlu Penanganan'
                          | 'Dijadwalkan'
                          | 'Sedang Dikerjakan'
                          | 'Selesai'
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Perlu Penanganan">Perlu Penanganan Segera</option>
                    <option value="Dijadwalkan">Dijadwalkan (Vendor/Tim)</option>
                    <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                    <option value="Selesai">Selesai Dikerjakan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Foto Kondisi Pohon:
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formPhotoBefore ? 'Ubah Foto' : 'Ambil / Unggah Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoUpload(e, 'before')}
                        className="hidden"
                      />
                    </label>
                    {formPhotoBefore && (
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Terunggah</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
                >
                  Simpan Work Order Pohon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Panduan & Format Database Google Sheet */}
      {isGuideOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Instruksi Format Database Google Sheet: Work Order Pohon
                  </h3>
                  <p className="text-xs text-slate-500">
                    Panduan integrasi Google Spreadsheet untuk Divisi PLH & Vendor Luar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              {/* Petunjuk Pengisian */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1.5">
                <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Aturan & Cara Pengisian di Google Sheet:</span>
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-emerald-900">
                  <li>
                    Buat Sheet baru di Spreadsheet dengan nama tepat: <strong>WorkOrder_Pohon</strong>.
                  </li>
                  <li>
                    Setiap baris mewakili 1 pohon yang dicek atau dilakukan treatment oleh staf PLH.
                  </li>
                  <li>
                    Jika pohon membutuhkan <strong>treatment besar (vendor luar)</strong>, kolom <strong>Pelaksana</strong> diisi dengan <code>Vendor Luar</code> dan kolom <strong>Nama_Vendor</strong> diisi nama penyedia jasa.
                  </li>
                  <li>
                    Data treatment besar otomatis masuk ke jadwal <strong>Work Order Mingguan</strong> di aplikasi.
                  </li>
                </ul>
              </div>

              {/* 15 Kolom Google Sheet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Struktur 15 Kolom Standar (Baris 1 / Header):
                  </span>
                  <button
                    type="button"
                    onClick={copySheetHeaders}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1"
                  >
                    {copiedHeaders ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHeaders ? 'Tersalin!' : 'Salin Header Tab'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  ID_WorkOrder | Tanggal_Lapor | Area_Lokasi | Nama_Pohon | Kondisi_Pohon | Tindakan_Treatment | Pelaksana | Nama_Vendor | Biaya_Vendor | Target_Minggu | Tingkat_Urgensi | Status | Catatan_Khusus | Link_Foto | Pelapor
                </div>
              </div>

              {/* Script Google Apps Script */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Script Otomatisasi Google Apps Script (Opsional):
                  </span>
                  <button
                    type="button"
                    onClick={copyAppsScriptCode}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold text-[11px] hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Apps Script'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tempelkan fungsi berikut di editor Apps Script spreadsheet Anda untuk membuat dan memformat sheet secara otomatis dengan warna hijau Lazuardi FM:
                </p>
                <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 border border-slate-800">
                  {googleAppsScriptSnippet}
                </pre>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                >
                  Tutup Panduan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
