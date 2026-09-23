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
  FileText,
  Printer,
} from 'lucide-react';
import {
  User,
  TreeWorkOrder,
  TreeCondition,
  TreeTreatmentType,
  TreeHandlerType,
  PLH_AREAS,
  DEFAULT_PLH_AREA_STAFF,
} from '../types';
import { StorageService } from '../services/storage';
import { getJakartaDateString, formatJakartaDisplayDate } from '../utils/dateHelper';
import { googleSheetsService } from '../services/googleSheets';
import {
  generateTreeWorkOrderPdf,
  generateTreeAreaReportPdf,
  printHtmlAsPdf,
} from '../utils/pdfGenerator';

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
  // Guard eksklusif: Modul Work Order Pohon hanya dapat diakses oleh PLH (staff & kordinator) atau Admin FM
  const isPLHAllowed = (activeUser.division || 'OB') === 'PLH' || activeUser.role === 'admin';

  if (!isPLHAllowed) {
    return (
      <div className="p-6 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 text-center space-y-2">
        <p className="font-bold text-sm text-slate-900">Akses Khusus Divisi PLH</p>
        <p className="text-xs text-slate-500">
          Modul Work Order Khusus Pohon & Penanganan hanya diperuntukkan bagi Petugas Lingkungan Hidup (PLH) dan Kordinator PLH.
        </p>
      </div>
    );
  }

  const [orders, setOrders] = useState<TreeWorkOrder[]>(() =>
    StorageService.getTreeWorkOrders()
  );
  const [activeTab, setActiveTab] = useState<
    'all' | 'weekly_vendor' | 'internal' | 'urgent' | 'completed' | 'area_breakdown'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('Semua');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<TreeWorkOrder | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);

  // Daily Inspection State
  const [inspectingOrder, setInspectingOrder] = useState<TreeWorkOrder | null>(null);
  const [inspectStatus, setInspectStatus] = useState<'Sudah Dicek Aman' | 'Perlu Penanganan' | 'Belum Dicek'>('Sudah Dicek Aman');
  const [inspectCondition, setInspectCondition] = useState<TreeCondition>('Normal / Sehat');
  const [inspectNotes, setInspectNotes] = useState<string>('');

  // Auto Database Setup & Sample State
  const [isSettingUpDb, setIsSettingUpDb] = useState(false);
  const [dbSetupResult, setDbSetupResult] = useState<{ success: boolean; message: string } | null>(null);
  const [guideTab, setGuideTab] = useState<'setup_auto' | 'sample_pohon' | 'sample_master' | 'sample_logs' | 'sample_job' | 'sample_weekly'>('setup_auto');
  const [copiedSample, setCopiedSample] = useState<string | null>(null);

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
    const defaultArea =
      activeUser.assignedArea && PLH_AREAS.includes(activeUser.assignedArea as any)
        ? activeUser.assignedArea
        : PLH_AREAS[0];
    setFormArea(defaultArea);
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
    const areaStaff = DEFAULT_PLH_AREA_STAFF[formArea] || {
      id: activeUser.id,
      name: activeUser.name,
    };

    if (editingOrder) {
      const updated: TreeWorkOrder = {
        ...editingOrder,
        area: formArea,
        assignedStaffId: editingOrder.assignedStaffId || areaStaff.id,
        assignedStaffName: editingOrder.assignedStaffName || areaStaff.name,
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
        assignedStaffId: areaStaff.id,
        assignedStaffName: areaStaff.name,
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

  // Open Quick Daily Inspection Modal
  const openInspectionModal = (order: TreeWorkOrder) => {
    setInspectingOrder(order);
    setInspectStatus(order.checkStatusToday || 'Sudah Dicek Aman');
    setInspectCondition(order.condition || 'Normal / Sehat');
    setInspectNotes(order.inspectionNotes || '');
  };

  // Save Quick Daily Inspection
  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const updated: TreeWorkOrder = {
      ...inspectingOrder,
      condition: inspectCondition,
      checkStatusToday: inspectStatus,
      lastCheckedDate: today,
      lastCheckedTime: timeStr,
      lastCheckedByName: activeUser.name,
      inspectionNotes: inspectNotes.trim() || undefined,
      status: inspectStatus === 'Sudah Dicek Aman' && inspectingOrder.status === 'Perlu Penanganan' ? 'Selesai' : inspectingOrder.status,
    };

    StorageService.updateTreeWorkOrder(updated);
    refreshData();
    setInspectingOrder(null);
  };

  // Quick check all trees in area
  const handleCheckAllInArea = (area: string) => {
    const areaOrders = orders.filter((o) => o.area === area);
    if (areaOrders.length === 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const updatedList = orders.map((o) => {
      if (o.area === area) {
        return {
          ...o,
          checkStatusToday: 'Sudah Dicek Aman' as const,
          lastCheckedDate: today,
          lastCheckedTime: timeStr,
          lastCheckedByName: activeUser.name,
          inspectionNotes: 'Pengecekan rutin terverifikasi aman & bersih oleh petugas area.',
        };
      }
      return o;
    });

    StorageService.saveTreeWorkOrders(updatedList);
    refreshData();
    alert(`Semua ${areaOrders.length} pohon di ${area} berhasil ditandai SUDAH DICEK AMAN hari ini oleh ${activeUser.name} (${timeStr}).`);
  };

  // Trigger setup database otomatis ke Apps Script
  const handleTriggerAutoDbSetup = async () => {
    setIsSettingUpDb(true);
    setDbSetupResult(null);
    try {
      const res = await googleSheetsService.setupDatabase();
      setDbSetupResult({
        success: res.success,
        message: res.message || 'Database Sheet OB & PLH berhasil disiapkan otomatis di Google Spreadsheet!',
      });
    } catch (err: any) {
      setDbSetupResult({
        success: false,
        message: err.message || 'Gagal menjalankan setup database.',
      });
    } finally {
      setIsSettingUpDb(false);
    }
  };

  const copySampleData = (type: string, data: string) => {
    navigator.clipboard.writeText(data);
    setCopiedSample(type);
    setTimeout(() => setCopiedSample(null), 2500);
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
            onClick={() => {
              const areaTitle = selectedAreaFilter === 'Semua' ? 'Seluruh Area Sekolah Lazuardi GCS' : selectedAreaFilter;
              printHtmlAsPdf(
                generateTreeAreaReportPdf(areaTitle, filteredOrders, activeUser.name),
                `Rekap_Pohon_${selectedAreaFilter}`
              );
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition cursor-pointer flex items-center gap-1.5"
            title="Cetak dan Simpan sebagai Dokumen PDF Resmi"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-300" />
            <span>Cetak Rekap (PDF)</span>
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

      {/* PLH User Personal Area Banner */}
      {activeUser.division === 'PLH' && (
        <div className="p-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/60 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
              <TreePine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white">Petugas PLH: {activeUser.name}</span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-400 text-emerald-950">
                  {activeUser.assignedArea || 'Penanggung Jawab Area'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Setiap staf PLH memegang area pohon masing-masing. Anda dapat langsung mengunduh laporan PDF resmi untuk area tanggung jawab Anda.
              </p>
            </div>
          </div>
          {activeUser.assignedArea && (
            <button
              type="button"
              onClick={() => {
                const areaOrders = orders.filter((o) => o.area === activeUser.assignedArea);
                printHtmlAsPdf(
                  generateTreeAreaReportPdf(activeUser.assignedArea!, areaOrders, activeUser.name),
                  `Laporan_Area_${activeUser.assignedArea}`
                );
              }}
              className="px-3.5 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              <span>Unduh PDF Laporan Area Saya</span>
            </button>
          )}
        </div>
      )}

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
            onClick={() => setActiveTab('area_breakdown')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'area_breakdown'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-teal-800 bg-teal-50 hover:bg-teal-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Laporan per Area PLH ({PLH_AREAS.length} Area)</span>
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

      {/* Work Orders List or Area Breakdown */}
      {activeTab === 'area_breakdown' ? (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3">
            <FileText className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-950">
              <h4 className="font-bold text-teal-900 text-sm">
                Rekapitulasi & Laporan Kerja Pemeliharaan Lingkungan Hidup (PLH) per 5 Area
              </h4>
              <p className="mt-0.5 text-teal-800">
                Setiap petugas PLH memegang area pohon masing-masing (Pos 1, Pos 2, Khaldun, Ex Minifarm, Kolam Renang). Anda dapat mengunduh file PDF resmi lengkap dengan tabel rincian status pohon dan tanda tangan pengesahan Kordinator/Admin FM untuk setiap area.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLH_AREAS.map((area) => {
              const staff = DEFAULT_PLH_AREA_STAFF[area] || { name: 'Petugas PLH', id: '' };
              const areaOrders = orders.filter((o) => o.area === area);
              const totalTrees = areaOrders.length;
              const safeCount = areaOrders.filter((o) => o.condition === 'Normal / Sehat' || o.status === 'Selesai').length;
              const pruningCount = areaOrders.filter((o) => o.condition === 'Rimbun' && o.status !== 'Selesai').length;
              const urgentCount = areaOrders.filter((o) => o.urgency === 'Tinggi / Bahaya' && o.status !== 'Selesai').length;
              const vendorCount = areaOrders.filter((o) => o.handlerType === 'Vendor Luar' || o.isLargeTreatment).length;
              const totalCost = areaOrders.reduce((sum, o) => sum + (o.vendorCost || 0), 0);
              const checkedTodayCount = areaOrders.filter(
                (o) => o.lastCheckedDate === today && o.checkStatusToday === 'Sudah Dicek Aman'
              ).length;
              const isAllCheckedToday = totalTrees > 0 && checkedTodayCount === totalTrees;

              const isUserArea = activeUser.assignedArea === area;

              return (
                <div
                  key={area}
                  className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                    isUserArea
                      ? 'border-emerald-500 ring-2 ring-emerald-300/60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {area}
                          </span>
                          {isUserArea && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-600 text-white">
                              Area Anda
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1.5 flex items-center gap-1.5">
                          <span className="text-slate-500 font-normal text-xs">Penanggung Jawab:</span>
                          <span className="text-emerald-950 font-black">{staff.name}</span>
                        </h3>
                      </div>
                    </div>

                    {/* Daily Check Status Badge & Progress */}
                    <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pengecekan Hari Ini:</span>
                        </span>
                        <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded-md ${
                          isAllCheckedToday 
                            ? 'bg-emerald-600 text-white' 
                            : checkedTodayCount > 0 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {checkedTodayCount} / {totalTrees} Dicek
                        </span>
                      </div>
                      <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${totalTrees > 0 ? (checkedTodayCount / totalTrees) * 100 : 0}%` }}
                        />
                      </div>
                      {!isAllCheckedToday && totalTrees > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCheckAllInArea(area)}
                          className="w-full mt-1 py-1 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Tandai Semua Pohon di {area} Sudah Dicek Aman</span>
                        </button>
                      )}
                    </div>

                    {/* Stats Matrix */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Terdata</span>
                        <span className="font-black text-slate-900 text-base">{totalTrees} Pohon</span>
                      </div>
                      <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 font-bold block uppercase">Aman / Selesai</span>
                        <span className="font-black text-emerald-800 text-base">{safeCount}</span>
                      </div>
                      <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-amber-700 font-bold block uppercase">Perlu Pruning</span>
                        <span className="font-black text-amber-800 text-base">{pruningCount}</span>
                      </div>
                      <div className="p-2 bg-rose-50/70 rounded-xl border border-rose-100">
                        <span className="text-[10px] text-rose-700 font-bold block uppercase">Urgen / Rawan</span>
                        <span className="font-black text-rose-800 text-base">{urgentCount}</span>
                      </div>
                    </div>

                    {/* Vendor Treatment Box */}
                    {vendorCount > 0 && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                        <div>
                          <span className="font-bold block text-[11px]">Treatment Vendor Luar:</span>
                          <span className="text-[10px] text-amber-800">{vendorCount} pohon dijadwalkan</span>
                        </div>
                        {totalCost > 0 && (
                          <span className="font-bold text-amber-950 text-xs">
                            Rp {totalCost.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Trees List preview with Inspection details */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Daftar Pohon & Status Laporan Hari Ini:
                      </span>
                      {areaOrders.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Belum ada work order pohon tercatat.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {areaOrders.map((o) => {
                            const isCheckedToday = o.lastCheckedDate === today;
                            return (
                              <div
                                key={o.id}
                                className="text-[11px] p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl flex flex-col gap-1 border border-slate-200/70 transition"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-bold text-slate-900 truncate max-w-[140px]">
                                    {o.treeName}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                        o.checkStatusToday === 'Sudah Dicek Aman'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : o.checkStatusToday === 'Perlu Penanganan'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}
                                    >
                                      {isCheckedToday ? (o.checkStatusToday || 'Sudah Dicek') : 'Belum Dicek Hari Ini'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openInspectionModal(o)}
                                      className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-extrabold text-[9px] cursor-pointer"
                                      title="Input / Update Pengecekan Hari Ini"
                                    >
                                      Cek
                                    </button>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                  <span>Kondisi: <strong className="text-slate-700">{o.condition}</strong></span>
                                  <span>{o.lastCheckedTime ? `Jam ${o.lastCheckedTime}` : (o.lastCheckedDate || '-')}</span>
                                </div>
                                {o.lastCheckedByName && (
                                  <div className="text-[9px] text-slate-400">
                                    Pemeriksa: {o.lastCheckedByName}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAreaFilter(area);
                        setActiveTab('all');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                    >
                      Filter Area Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        printHtmlAsPdf(
                          generateTreeAreaReportPdf(area, areaOrders, staff.name),
                          `Laporan_Area_${area}`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Unduh Laporan Area (PDF)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
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

                  {/* Panel Pengecekan / Laporan Hari Ini */}
                  <div className="p-2.5 rounded-xl border text-xs space-y-1.5 bg-emerald-50/50 border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>Laporan Cek Hari Ini:</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        order.lastCheckedDate === today && order.checkStatusToday === 'Sudah Dicek Aman'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : order.checkStatusToday === 'Perlu Penanganan'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {order.lastCheckedDate === today ? (order.checkStatusToday || 'Sudah Dicek') : 'Belum Dicek Hari Ini'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Waktu Cek:</span>
                      <span className="font-semibold text-slate-800">
                        {order.lastCheckedDate ? `${order.lastCheckedDate} ${order.lastCheckedTime ? `(${order.lastCheckedTime})` : ''}` : 'Belum tercatat'}
                      </span>
                    </div>

                    {order.lastCheckedByName && (
                      <div className="text-[10px] text-slate-500">
                        Pemeriksa: <strong className="text-slate-800">{order.lastCheckedByName}</strong>
                      </div>
                    )}

                    {order.inspectionNotes && (
                      <p className="text-[10px] italic text-slate-600 bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                        "{order.inspectionNotes}"
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => openInspectionModal(order)}
                      className="w-full mt-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Input / Update Laporan Cek Hari Ini</span>
                    </button>
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

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        printHtmlAsPdf(
                          generateTreeWorkOrderPdf(order),
                          `SPK_Pohon_${order.id}`
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-slate-300"
                      title="Unduh Surat Perintah Kerja (SPK) Pohon format PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span>SPK PDF</span>
                    </button>
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

      {/* Modal Cek / Laporan Pohon Hari Ini */}
      {inspectingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-emerald-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Cek / Laporan Pohon Hari Ini
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inspectingOrder.area} • {inspectingOrder.treeName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInspection} className="mt-4 space-y-3.5 text-xs text-slate-700">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">Petugas Pemeriksa:</span>
                  <span className="font-black text-emerald-950 text-xs">{activeUser.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">Tanggal Pengecekan:</span>
                  <span className="font-bold text-emerald-950 text-xs">{formatJakartaDisplayDate(today)}</span>
                </div>
              </div>

              {/* Status Pengecekan Hari Ini */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Status Hasil Pengecekan Hari Ini:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectStatus('Sudah Dicek Aman')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      inspectStatus === 'Sudah Dicek Aman'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Sudah Dicek Aman</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectStatus('Perlu Penanganan')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      inspectStatus === 'Perlu Penanganan'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Perlu Penanganan</span>
                  </button>
                </div>
              </div>

              {/* Kondisi Fisik Terkini */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Kondisi Fisik Pohon Terkini:
                </label>
                <select
                  value={inspectCondition}
                  onChange={(e) => setInspectCondition(e.target.value as TreeCondition)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Normal / Sehat">🌳 Normal / Sehat & Bersih</option>
                  <option value="Rimbun">🌿 Rimbun (Perlu Pruning Dahan Bawah)</option>
                  <option value="Dahan Patah / Kering">🍂 Dahan Patah / Kering</option>
                  <option value="Dekat Kabel / Atap">⚡ Dekat Kabel Listrik / Atap</option>
                  <option value="Miring / Rawan Tumbang">⚠️ Miring / Rawan Tumbang (Bahaya)</option>
                  <option value="Sarang Hama / Ulat">🐛 Sarang Hama / Ulat</option>
                  <option value="Batang Lapuk / Berongga">🪵 Batang Lapuk / Berongga</option>
                </select>
              </div>

              {/* Catatan Pemeriksaan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan Lapangan & Hasil Pengecekan:
                </label>
                <textarea
                  rows={3}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="Contoh: Pohon sudah dicek pasca hujan lebat, tidak ada dahan rapuh yang menjuntai ke jalan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Hasil Pengecekan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Panduan & Setup Database Google Sheet Otomatis beserta Contoh Input */}
      {isGuideOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Setup Database Google Sheet & Contoh Input Data PLH
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem pemisahan database sheet khusus PLH vs OB & Work Order Pohon
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

            {/* Sub-Navigation Tabs */}
            <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setGuideTab('setup_auto')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  guideTab === 'setup_auto'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Setup Database Otomatis</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('sample_pohon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  guideTab === 'sample_pohon'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TreePine className="w-3.5 h-3.5" />
                <span>Contoh: WorkOrder_Pohon</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('sample_master')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  guideTab === 'sample_master'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Contoh: MasterTask_PLH
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('sample_logs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  guideTab === 'sample_logs'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Contoh: TaskLogs_PLH
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('sample_job')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  guideTab === 'sample_job'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Contoh: JobBareng_PLH
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('sample_weekly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  guideTab === 'sample_weekly'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Contoh: WeeklyScores_PLH
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
              {/* TAB 1: SETUP DATABASE OTOMATIS */}
              {guideTab === 'setup_auto' && (
                <div className="space-y-4">
                  {/* Action Banner: Eksekusi Otomatis */}
                  <div className="p-4 bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-emerald-700/60">
                    <div>
                      <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>Eksekusi Setup Database Otomatis ke Google Sheets</span>
                      </h4>
                      <p className="text-emerald-200/90 text-xs mt-1">
                        Aplikasi akan membuat dan memformat seluruh sheet terpisah secara otomatis: <strong>MasterTask_PLH</strong>, <strong>TaskLogs_PLH</strong>, <strong>JobBareng_PLH</strong>, <strong>WeeklyScores_PLH</strong>, dan <strong>WorkOrder_Pohon</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSettingUpDb}
                      onClick={handleTriggerAutoDbSetup}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition disabled:opacity-50"
                    >
                      {isSettingUpDb ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Menyiapkan Sheet...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Jalankan Setup Database Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {dbSetupResult && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2 animate-in fade-in duration-150 ${
                        dbSetupResult.success
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}
                    >
                      {dbSetupResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                      )}
                      <span>{dbSetupResult.message}</span>
                    </div>
                  )}

                  {/* Penjelasan Pemisahan Sheet */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                      <span className="font-extrabold text-slate-900 block text-xs">
                        🏢 Sheet Divisi OB (Cleaning Service):
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                        <li><code>MasterTask</code> (Tugas harian, pre-readiness & clock-out OB)</li>
                        <li><code>TaskLogs</code> (Riwayat log pengerjaan harian OB)</li>
                        <li><code>JobBareng</code> (Pekerjaan bersama tim OB)</li>
                        <li><code>WeeklyScores</code> (Nilai evaluasi mingguan OB)</li>
                      </ul>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5">
                      <span className="font-extrabold text-emerald-950 block text-xs">
                        🌿 Sheet Divisi PLH (Lingkungan & Pohon):
                      </span>
                      <ul className="list-disc pl-4 space-y-0.5 text-emerald-900 text-[11px]">
                        <li><code>MasterTask_PLH</code> (Tugas perawatan taman & kebun PLH)</li>
                        <li><code>TaskLogs_PLH</code> (Log penyiraman & pemeliharaan PLH)</li>
                        <li><code>JobBareng_PLH</code> (Kerja bakti drainase & taman PLH)</li>
                        <li><code>WeeklyScores_PLH</code> (Nilai evaluasi mingguan PLH)</li>
                        <li><code>WorkOrder_Pohon</code> (Inventaris & laporan pohon 5 area)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Kode Apps Script Snippet */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Kode Google Apps Script Cadangan (Bila ingin menjalankan dari Editor Spreadsheet):
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
                    <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto max-h-40 border border-slate-800">
                      {googleAppsScriptSnippet}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTOH INPUT DATA POHON */}
              {guideTab === 'sample_pohon' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Contoh Baris Input: Sheet `WorkOrder_Pohon` (25 Kolom)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Digunakan untuk inventaris pohon, laporan pengecekan harian, dan pekerjaan vendor luar.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copySampleData(
                          'pohon',
                          `two-pos1-01\t2026-09-23\tArea Pos 1\tPohon Trembesi Gerbang\tRimbun\tPenjarangan Kanopi Rimbun\tInternal PLH\t-\t0\tMinggu ke-4 September 2026\tSedang\tPerlu Penanganan\tCabang rimbun menutupi lampu jalan\thttps://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600\t-\tu-plh-pos1\tPetugas Pos 1\t2026-09-23\t08:15 WIB\tPetugas Pos 1\tSudah Dicek Aman\tKondisi dahan terpantau aman pasca hujan\t-\t-\t2026-09-23T08:15:00.000Z
two-kolam-02\t2026-09-23\tArea Kolam Renang\tPohon Flamboyan Kolam\tMiring / Rawan Tumbang\tPenebangan / Topping Pohon Tinggi (Vendor Luar)\tVendor Luar\tCV Duta Hijau\t1500000\tMinggu ke-4 September 2026\tTinggi / Bahaya\tDijadwalkan\tAkar miring ke arah dinding kolam renang\thttps://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600\t-\tu-plh-kolam\tPetugas Kolam\t2026-09-23\t09:30 WIB\tPetugas Kolam\tPerlu Penanganan\tWajib pengawasan ekstra saat anak-anak renang\t-\t-\t2026-09-23T09:30:00.000Z`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedSample === 'pohon' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSample === 'pohon' ? 'Data Tersalin!' : 'Salin Contoh Data (Tinggal Paste)'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                      <thead className="bg-emerald-700 text-white font-bold">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Tanggal</th>
                          <th className="p-2">Area</th>
                          <th className="p-2">Nama Pohon</th>
                          <th className="p-2">Kondisi</th>
                          <th className="p-2">Tindakan</th>
                          <th className="p-2">Pelaksana</th>
                          <th className="p-2">Vendor / Biaya</th>
                          <th className="p-2">Cek Terakhir</th>
                          <th className="p-2">Status Cek Hari Ini</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="p-2 font-mono text-slate-500">two-pos1-01</td>
                          <td className="p-2">2026-09-23</td>
                          <td className="p-2 font-bold text-emerald-800">Area Pos 1</td>
                          <td className="p-2 font-bold text-slate-900">Pohon Trembesi Gerbang</td>
                          <td className="p-2 text-amber-700 font-bold">Rimbun</td>
                          <td className="p-2">Penjarangan Kanopi</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">Internal PLH</span></td>
                          <td className="p-2 text-slate-400">-</td>
                          <td className="p-2">23/09 08:15 WIB</td>
                          <td className="p-2 font-bold text-emerald-700">Sudah Dicek Aman</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-2 font-mono text-slate-500">two-kolam-02</td>
                          <td className="p-2">2026-09-23</td>
                          <td className="p-2 font-bold text-emerald-800">Area Kolam Renang</td>
                          <td className="p-2 font-bold text-slate-900">Pohon Flamboyan Kolam</td>
                          <td className="p-2 text-rose-700 font-bold">Miring / Rawan Tumbang</td>
                          <td className="p-2">Penebangan / Topping</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">Vendor Luar</span></td>
                          <td className="p-2 font-bold text-slate-900">CV Duta (Rp 1.500.000)</td>
                          <td className="p-2">23/09 09:30 WIB</td>
                          <td className="p-2 font-bold text-rose-700">Perlu Penanganan</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTOH INPUT MASTER TASK PLH */}
              {guideTab === 'sample_master' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Contoh Baris Input: Sheet `MasterTask_PLH`
                      </h4>
                      <p className="text-xs text-slate-500">
                        Katalog tugas standar harian, mingguan, dan berkala khusus divisi PLH.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copySampleData(
                          'master_plh',
                          `mt-plh-01\tPenyiraman & Pemupukan Rutin Tanaman\tSemua Unit\tHarian\tpre_readiness\t1. Siapkan selang dan nozzle semprot\n2. Siram area taman merata sebelum terik matahari\n3. Bersihkan daun kering di pot\tYA\tAktif\tArea Taman Utama & Pos\tSemua Petugas\thttps://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600\tPLH
mt-plh-02\tPemangkasan Rumput & Pruning Dahan Bawah\tSemua Unit\tMingguan\tanytime\t1. Gunakan mesin potong rumput safety APD\n2. Potong rumput dengan ketinggian rata 3 cm\n3. Sapu dan masukkan sisa rumput ke bak kompos\tYA\tAktif\tArea Lapangan & Sekitar Masjid\tSemua Petugas\thttps://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=600\tPLH`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedSample === 'master_plh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSample === 'master_plh' ? 'Data Tersalin!' : 'Salin Contoh Data (Tinggal Paste)'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                      <thead className="bg-emerald-700 text-white font-bold">
                        <tr>
                          <th className="p-2">ID_Task</th>
                          <th className="p-2">Judul Tugas</th>
                          <th className="p-2">Unit</th>
                          <th className="p-2">Kategori</th>
                          <th className="p-2">Waktu Pengerjaan</th>
                          <th className="p-2">Wajib Foto</th>
                          <th className="p-2">Divisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="p-2 font-mono text-slate-500">mt-plh-01</td>
                          <td className="p-2 font-bold text-slate-900">Penyiraman & Pemupukan Rutin Tanaman</td>
                          <td className="p-2">Semua Unit</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Harian</span></td>
                          <td className="p-2">pre_readiness (Pagi)</td>
                          <td className="p-2 font-bold text-emerald-700">YA</td>
                          <td className="p-2 font-black text-emerald-800">PLH</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-2 font-mono text-slate-500">mt-plh-02</td>
                          <td className="p-2 font-bold text-slate-900">Pemangkasan Rumput & Pruning Dahan Bawah</td>
                          <td className="p-2">Semua Unit</td>
                          <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">Mingguan</span></td>
                          <td className="p-2">anytime</td>
                          <td className="p-2 font-bold text-emerald-700">YA</td>
                          <td className="p-2 font-black text-emerald-800">PLH</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: CONTOH INPUT TASK LOGS PLH */}
              {guideTab === 'sample_logs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Contoh Baris Input: Sheet `TaskLogs_PLH`
                      </h4>
                      <p className="text-xs text-slate-500">
                        Data real-time bukti pengerjaan harian staf PLH di sekolah.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copySampleData(
                          'logs_plh',
                          `tl-plh-01\t2026-09-23T07:45:00.000Z\t2026-09-23\tu-plh-pos1\tPetugas Pos 1\tTK\tPenyiraman Tanaman Area Pos 1\tHarian\tpre_readiness\tSelesai\tTIDAK\t-\t-\thttps://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600\tTanaman disiram merata, kondisi basah segar\t5\tBagus & tepat waktu\t-\t-\t-\tPLH`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedSample === 'logs_plh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSample === 'logs_plh' ? 'Data Tersalin!' : 'Salin Contoh Data (Tinggal Paste)'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                      <thead className="bg-emerald-700 text-white font-bold">
                        <tr>
                          <th className="p-2">ID_Log</th>
                          <th className="p-2">Tanggal</th>
                          <th className="p-2">Petugas PLH</th>
                          <th className="p-2">Nama Tugas</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Terlambat</th>
                          <th className="p-2">Nilai Kordinator</th>
                          <th className="p-2">Divisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="p-2 font-mono text-slate-500">tl-plh-01</td>
                          <td className="p-2">2026-09-23</td>
                          <td className="p-2 font-bold text-slate-900">Petugas Pos 1</td>
                          <td className="p-2">Penyiraman Tanaman Area Pos 1</td>
                          <td className="p-2 font-bold text-emerald-700">Selesai</td>
                          <td className="p-2 text-slate-500">TIDAK</td>
                          <td className="p-2 font-black text-emerald-800">5.0 (Bagus)</td>
                          <td className="p-2 font-black text-emerald-800">PLH</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: CONTOH INPUT JOB BARENG PLH */}
              {guideTab === 'sample_job' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Contoh Baris Input: Sheet `JobBareng_PLH`
                      </h4>
                      <p className="text-xs text-slate-500">
                        Pekerjaan gotong royong perawatan lingkungan & taman bersama seluruh staf PLH.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copySampleData(
                          'job_plh',
                          `jb-plh-01\tPembersihan Saluran Air & Drainase Taman Hujan\tPembersihan endapan lumpur dan daun kering di saluran air seluruh area sekolah\t2026-09-23\tSemua Unit\tArea Saluran Utama Khaldun & Pos 1\tAktif\tu-plh-1,u-plh-2\tu-plh-1\t2026-09-23T06:00:00.000Z\tall\t-\tPLH`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedSample === 'job_plh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSample === 'job_plh' ? 'Data Tersalin!' : 'Salin Contoh Data (Tinggal Paste)'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                      <thead className="bg-emerald-700 text-white font-bold">
                        <tr>
                          <th className="p-2">ID_Job</th>
                          <th className="p-2">Judul Job Bareng</th>
                          <th className="p-2">Tanggal</th>
                          <th className="p-2">Area Target</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Divisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="p-2 font-mono text-slate-500">jb-plh-01</td>
                          <td className="p-2 font-bold text-slate-900">Pembersihan Saluran Air & Drainase Taman Hujan</td>
                          <td className="p-2">2026-09-23</td>
                          <td className="p-2">Area Saluran Utama Khaldun & Pos 1</td>
                          <td className="p-2 font-bold text-blue-700">Aktif</td>
                          <td className="p-2 font-black text-emerald-800">PLH</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: CONTOH INPUT WEEKLY SCORES PLH */}
              {guideTab === 'sample_weekly' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Contoh Baris Input: Sheet `WeeklyScores_PLH`
                      </h4>
                      <p className="text-xs text-slate-500">
                        Rekapitulasi skor performa mingguan staf PLH oleh Kordinator PLH.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copySampleData(
                          'weekly_plh',
                          `ws-plh-01\tu-plh-pos1\tPetugas Pos 1\tTK\t2026-09-26\t2026\t21 Sep - 26 Sep 2026\t4.85\tKordinator PLH\t{"kebersihan":4.8,"ketertiban":5.0,"kerapian":4.75}\tPemeliharaan area taman pos 1 sangat rapi dan tanaman terawat prima\t2026-09-26T12:00:00.000Z`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedSample === 'weekly_plh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSample === 'weekly_plh' ? 'Data Tersalin!' : 'Salin Contoh Data (Tinggal Paste)'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                      <thead className="bg-emerald-700 text-white font-bold">
                        <tr>
                          <th className="p-2">ID_Score</th>
                          <th className="p-2">Petugas PLH</th>
                          <th className="p-2">Periode Tanggal</th>
                          <th className="p-2">Nilai Rata-rata</th>
                          <th className="p-2">Penilai</th>
                          <th className="p-2">Catatan Evaluasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="p-2 font-mono text-slate-500">ws-plh-01</td>
                          <td className="p-2 font-bold text-slate-900">Petugas Pos 1</td>
                          <td className="p-2">21 Sep - 26 Sep 2026</td>
                          <td className="p-2 font-black text-emerald-800 text-xs">4.85 / 5.0</td>
                          <td className="p-2">Kordinator PLH</td>
                          <td className="p-2 italic text-slate-600">Pemeliharaan area taman pos 1 sangat rapi</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end mt-4">
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
      )}
    </div>
  );
};
