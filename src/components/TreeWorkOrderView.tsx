import React, { useState, useEffect, useRef } from 'react';
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
  History,
  Image as ImageIcon,
  Folder,
  ArrowRight,
  Upload,
  Wrench,
  ShieldCheck,
  Maximize2,
  Info,
  RefreshCw,
  Loader2,
  ZoomIn,
  Eye,
  HelpCircle,
  Compass,
} from 'lucide-react';
import {
  User,
  TreeWorkOrder,
  TreeCondition,
  TreeTreatmentType,
  TreeHandlerType,
  TreeTreatmentStatus,
  TreeInspectionRecord,
  TaskLog,
  PLH_AREAS,
  DEFAULT_PLH_AREA_STAFF,
  normalizePlhArea,
} from '../types';
import { StorageService, DEFAULT_TREE_SOP_INSTRUCTIONS } from '../services/storage';
import { getJakartaDateString, formatJakartaDisplayDate } from '../utils/dateHelper';
import { getMondayOfWeek, formatWeekRange } from '../utils/masjidRolling';
import { googleSheetsService } from '../services/googleSheets';
import {
  generateTreeWorkOrderPdf,
  generateTreeAreaReportPdf,
  generateTreeHistoryReportPdf,
  printHtmlAsPdf,
  sanitizePlhStaffName,
} from '../utils/pdfGenerator';
import { formatGoogleDriveImageUrl, getGoogleDriveViewLink } from '../utils/driveHelper';

interface TreeWorkOrderViewProps {
  activeUser: User;
  onClose?: () => void;
  isModal?: boolean;
  initialTreeId?: string;
  initialAction?: 'inspect' | 'treatment' | 'history';
}

/**
 * Aturan Pengecekan Pohon PLH Lazuardi:
 * Pengecekan di-reset setiap minggu (otomatis reset tiap hari Senin jam 00:00 WIB).
 * Jika pohon sudah dicek pada minggu berjalan (Senin s/d Minggu) dan kondisinya aman,
 * maka pohon tersebut berstatus SUDAH CEKLIS AMAN (Minggu Ini).
 * Jika belum dicek pada minggu ini atau ada masalah, statusnya WAJIB DICEK MINGGU INI / PERLU PENANGANAN.
 */
export function getTreeWeeklyCheckStatus(order: TreeWorkOrder): {
  isCheckedThisWeek: boolean;
  isCheckedThisMonth: boolean; // Alias untuk kompatibilitas
  daysSinceLastCheck: number;
  statusText: string;
  badgeClass: string;
  isThisWeek: boolean;
  isUnderTreatment: boolean; // true jika pohon perlu penanganan / sedang ditangani
  canDirectlyUpdate: boolean; // true jika di minggu depan ga perlu dicek ulang dari nol, tinggal update saja
} {
  const currentMonday = getMondayOfWeek();
  const lastDate = order.lastCheckedDate;

  // 1. Cek apakah pohon dalam status "Perlu Penanganan" / "Sedang Ditangani"
  // Sesuai aturan: jika pohon butuh penanganan, di minggu berikutnya fotonya tetap ada
  // dan TIDAK PERLU DICEK ULANG DARI NOL, melainkan staf tinggal melakukan update tindakan/progres penanganan saja!
  const isUnderTreatment =
    (order.status === 'Perlu Penanganan' ||
     order.status === 'Sedang Dikerjakan' ||
     order.status === 'Dijadwalkan' ||
     order.treatmentStatus === 'Belum Ditangani' ||
     order.treatmentStatus === 'Sedang Ditangani' ||
     order.checkStatusToday === 'Perlu Penanganan') &&
    order.status !== 'Selesai' &&
    order.treatmentStatus !== 'Sudah Ditangani';

  if (isUnderTreatment) {
    const isHandling = order.treatmentStatus === 'Sedang Ditangani' || order.status === 'Sedang Dikerjakan';
    const isUpdatedThisWeek = Boolean(lastDate && lastDate >= currentMonday);
    return {
      isCheckedThisWeek: isUpdatedThisWeek,
      isCheckedThisMonth: isUpdatedThisWeek,
      daysSinceLastCheck: 0,
      statusText: isUpdatedThisWeek
        ? (isHandling ? 'Sedang Ditangani (Sudah Update Minggu Ini)' : 'Perlu Penanganan (Tercatat Minggu Ini)')
        : (isHandling ? 'Sedang Ditangani (Wajib Update Minggu Ini)' : 'Perlu Penanganan (Tinggal Update)'),
      badgeClass: isHandling
        ? 'bg-amber-100 text-amber-900 border-amber-300'
        : 'bg-rose-100 text-rose-800 border-rose-300',
      isThisWeek: isUpdatedThisWeek,
      isUnderTreatment: true,
      canDirectlyUpdate: true,
    };
  }

  if (!lastDate) {
    return {
      isCheckedThisWeek: false,
      isCheckedThisMonth: false,
      daysSinceLastCheck: 999,
      statusText: 'Belum Dicek Minggu Ini',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      isThisWeek: false,
      isUnderTreatment: false,
      canDirectlyUpdate: false,
    };
  }

  const [y, m, d] = lastDate.split('-').map(Number);
  const checkTime = new Date(y, m - 1, d).getTime();
  const todayParts = getJakartaDateString().split('-').map(Number);
  const nowTime = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]).getTime();
  const diffDays = Math.max(0, Math.floor((nowTime - checkTime) / (1000 * 60 * 60 * 24)));

  const isThisWeek = lastDate >= currentMonday;

  // Syarat SUDAH CEKLIS AMAN:
  // 1. Wajib dicek pada atau setelah hari Senin minggu ini (lastDate >= currentMonday)
  // 2. checkStatusToday TIDAK bernilai 'Belum Dicek'
  // 3. Status explicit aman ('Sudah Dicek Aman' / 'Sudah Dicek') atau penanganan selesai
  const isExplicitlySafe =
    (order.checkStatusToday === 'Sudah Dicek Aman' || order.checkStatusToday === 'Sudah Dicek') ||
    (order.treatmentStatus === 'Sudah Ditangani' && order.status === 'Selesai' && order.checkStatusToday !== 'Belum Dicek');

  if (isThisWeek && isExplicitlySafe) {
    return {
      isCheckedThisWeek: true,
      isCheckedThisMonth: true,
      daysSinceLastCheck: diffDays,
      statusText: diffDays === 0 ? 'Sudah Ceklis Aman (Hari Ini)' : `Sudah Ceklis Aman (${formatJakartaDisplayDate(lastDate)})`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isThisWeek: true,
      isUnderTreatment: false,
      canDirectlyUpdate: false,
    };
  }

  return {
    isCheckedThisWeek: false,
    isCheckedThisMonth: false,
    daysSinceLastCheck: diffDays,
    statusText: diffDays > 0 ? `Belum Dicek Minggu Ini (Terakhir: ${diffDays} hari lalu)` : 'Belum Dicek Minggu Ini',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    isThisWeek: false,
    isUnderTreatment: false,
    canDirectlyUpdate: false,
  };
}

export const getTreeMonthlyCheckStatus = getTreeWeeklyCheckStatus;

export const TreeWorkOrderView: React.FC<TreeWorkOrderViewProps> = ({
  activeUser,
  onClose,
  isModal = false,
  initialTreeId,
  initialAction,
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

  // Hak akses area: Kordinator PLH dan Admin FM memiliki hak supervisi penuh seluruh area
  const isCoordinatorPLH =
    activeUser.role === 'admin' ||
    (activeUser.role === 'kordinator' && (activeUser.division === 'PLH' || !activeUser.division));
  const isSuperUser = isCoordinatorPLH;
  const userAssignedArea = activeUser.assignedArea || activeUser.unit || '';

  const [orders, setOrders] = useState<TreeWorkOrder[]>(() =>
    StorageService.getTreeWorkOrders()
  );
  const [activeTab, setActiveTab] = useState<
    | 'all'
    | 'need_action'
    | 'in_progress'
    | 'completed'
    | 'has_photos'
    | 'weekly_vendor'
    | 'internal'
    | 'urgent'
    | 'area_breakdown'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>(() => {
    if (!isCoordinatorPLH && userAssignedArea) {
      const match = PLH_AREAS.find(
        (a) => a.toLowerCase().includes(userAssignedArea.toLowerCase()) || userAssignedArea.toLowerCase().includes(a.toLowerCase())
      );
      return match || userAssignedArea;
    }
    return 'Semua';
  });

  // Filter Mingguan Dashboard: Semua, Minggu Ini, Belum Dicek Minggu Ini, Sudah Aman Minggu Ini, dsb.
  const [weeklyFilter, setWeeklyFilter] = useState<
    'all' | 'this_week' | 'this_week_unchecked' | 'this_week_safe' | 'need_treatment' | 'last_week'
  >('all');

  // Guard: Fitur Laporan per Area PLH hanya dapat diakses oleh Kordinator PLH & Admin FM
  useEffect(() => {
    if (!isCoordinatorPLH && activeTab === 'area_breakdown') {
      setActiveTab('all');
    }
  }, [isCoordinatorPLH, activeTab]);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<TreeWorkOrder | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);

  // Daily Inspection State
  const hasOpenedInitialRef = useRef<string | null>(null);
  const [inspectingOrder, setInspectingOrder] = useState<TreeWorkOrder | null>(null);
  const [inspectStatus, setInspectStatus] = useState<'Sudah Dicek Aman' | 'Perlu Penanganan' | 'Belum Dicek'>('Sudah Dicek Aman');
  const [inspectCondition, setInspectCondition] = useState<TreeCondition>('Normal / Sehat');
  const [inspectNotes, setInspectNotes] = useState<string>('');
  const [inspectTreatmentNeeded, setInspectTreatmentNeeded] = useState<string>('Penjarangan Kanopi Rimbun');
  const [inspectHandlerType, setInspectHandlerType] = useState<TreeHandlerType>('Internal PLH');
  const [inspectVendorName, setInspectVendorName] = useState<string>('');
  const [inspectVendorCost, setInspectVendorCost] = useState<string>('');
  const [inspectUrgency, setInspectUrgency] = useState<'Rendah' | 'Sedang' | 'Tinggi / Bahaya'>('Sedang');
  const [inspectPhotoBefore, setInspectPhotoBefore] = useState<string>('');
  const [inspectDrivePhotoBefore, setInspectDrivePhotoBefore] = useState<string>('');
  const [inspectPhotoType, setInspectPhotoType] = useState<'full_tree' | 'detail_issue'>('full_tree');
  const [showSopChecklist, setShowSopChecklist] = useState<boolean>(true);
  const [selectedTreeGuide, setSelectedTreeGuide] = useState<TreeWorkOrder | null>(null);
  const [showFullStandardPhoto, setShowFullStandardPhoto] = useState<string | null>(null);
  const [editingBenchmarkTree, setEditingBenchmarkTree] = useState<TreeWorkOrder | null>(null);
  const [benchmarkInputUrl, setBenchmarkInputUrl] = useState<string>('');
  const [benchmarkInputAngle, setBenchmarkInputAngle] = useState<string>('');
  const [isUploadingBenchmarkPhoto, setIsUploadingBenchmarkPhoto] = useState<boolean>(false);
  const [isSavingBenchmark, setIsSavingBenchmark] = useState<boolean>(false);
  const [isUploadingInspectPhoto, setIsUploadingInspectPhoto] = useState<boolean>(false);
  const [isSavingInspection, setIsSavingInspection] = useState<boolean>(false);
  const [isSyncingAllTrees, setIsSyncingAllTrees] = useState<boolean>(false);

  // Modal Filter & Unduh Dokumen PDF History Penanganan (Bisa filter dari bulan apa sampai bulan apa)
  const [showPdfFilterModal, setShowPdfFilterModal] = useState<boolean>(false);
  const [pdfStartMonth, setPdfStartMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01`;
  });
  const [pdfEndMonth, setPdfEndMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });
  const [pdfAreaSelection, setPdfAreaSelection] = useState<string>('Semua');
  const [pdfHandlerSelection, setPdfHandlerSelection] = useState<'Semua' | 'Internal PLH' | 'Vendor Luar'>('Semua');

  // In-app Notification Feedback State (Replaces window.alert)
  const [feedbackNotification, setFeedbackNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    treeName?: string;
    area?: string;
    statusText?: string;
    notes?: string;
    syncNote?: string;
  } | null>(null);

  // Modal Database Sample 15 Pohon Resmi per Area (WorkOrder_Pohon)
  const [showSampleTreesModal, setShowSampleTreesModal] = useState<boolean>(false);

  // Treatment Update Modal State (Laporan Penanganan)
  const [treatmentModalOrder, setTreatmentModalOrder] = useState<TreeWorkOrder | null>(null);
  const [treatmentStatus, setTreatmentStatus] = useState<TreeTreatmentStatus>('Sudah Ditangani');
  const [treatmentHandledByName, setTreatmentHandledByName] = useState<string>('');
  const [treatmentHandledAt, setTreatmentHandledAt] = useState<string>('');
  const [treatmentReportText, setTreatmentReportText] = useState<string>('');
  const [treatmentPhotoAfter, setTreatmentPhotoAfter] = useState<string>('');
  const [treatmentDrivePhotoAfter, setTreatmentDrivePhotoAfter] = useState<string>('');
  const [isUploadingTreatmentPhoto, setIsUploadingTreatmentPhoto] = useState<boolean>(false);

  // History & Comparison Modal State
  const [historyModalOrder, setHistoryModalOrder] = useState<TreeWorkOrder | null>(null);
  const [compareModalOrder, setCompareModalOrder] = useState<TreeWorkOrder | null>(null);

  // Auto Database Setup & Sample State
  const [isSettingUpDb, setIsSettingUpDb] = useState(false);
  const [dbSetupResult, setDbSetupResult] = useState<{ success: boolean; message: string } | null>(null);
  const [guideTab, setGuideTab] = useState<'setup_auto' | 'sample_pohon' | 'sample_master' | 'sample_logs' | 'sample_job' | 'sample_weekly'>('setup_auto');
  const [copiedSample, setCopiedSample] = useState<string | null>(null);

  // Form Fields
  const [formArea, setFormArea] = useState<string>(PLH_AREAS[0]);
  const [formStaffName, setFormStaffName] = useState<string>('');
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
  const [formDrivePhotoBefore, setFormDrivePhotoBefore] = useState<string>('');
  const [formDrivePhotoAfter, setFormDrivePhotoAfter] = useState<string>('');
  const [formStatus, setFormStatus] = useState<
    'Perlu Penanganan' | 'Dijadwalkan' | 'Sedang Dikerjakan' | 'Selesai'
  >('Perlu Penanganan');
  const [formTreatmentStatus, setFormTreatmentStatus] = useState<TreeTreatmentStatus>('Belum Ditangani');
  const [formStandardPhotoUrl, setFormStandardPhotoUrl] = useState<string>('');
  const [formStandardPhotoAngleGuide, setFormStandardPhotoAngleGuide] = useState<string>('');
  const [isUploadingFormPhoto, setIsUploadingFormPhoto] = useState<boolean>(false);
  const [isUploadingFormStandardPhoto, setIsUploadingFormStandardPhoto] = useState<boolean>(false);

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
    setFormStaffName(DEFAULT_PLH_AREA_STAFF[defaultArea]?.name || activeUser.name);
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
    setFormDrivePhotoBefore('');
    setFormDrivePhotoAfter('');
    setFormStandardPhotoUrl('');
    setFormStandardPhotoAngleGuide('Foto utuh dari jarak 5–10 meter agar seluruh profil pohon terlihat jelas.');
    setFormStatus('Perlu Penanganan');
    setFormTreatmentStatus('Belum Ditangani');
    setIsFormOpen(true);
  };

  const openEditForm = (order: TreeWorkOrder) => {
    setEditingOrder(order);
    setFormArea(order.area);
    setFormStaffName(order.assignedStaffName || DEFAULT_PLH_AREA_STAFF[order.area]?.name || '');
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
    setFormDrivePhotoBefore(order.drivePhotoBeforeUrl || '');
    setFormDrivePhotoAfter(order.drivePhotoAfterUrl || '');
    setFormStandardPhotoUrl(order.standardPhotoUrl || '');
    setFormStandardPhotoAngleGuide(order.standardPhotoAngleGuide || '');
    setFormStatus(order.status);
    setFormTreatmentStatus(order.treatmentStatus || (order.status === 'Selesai' ? 'Sudah Ditangani' : order.status === 'Perlu Penanganan' ? 'Belum Ditangani' : 'Tidak Perlu Penanganan'));
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
    const finalStaffName = formStaffName.trim() || areaStaff.name;

    if (editingOrder) {
      const updated: TreeWorkOrder = {
        ...editingOrder,
        area: formArea,
        assignedStaffId: editingOrder.assignedStaffId || areaStaff.id,
        assignedStaffName: finalStaffName,
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
        drivePhotoBeforeUrl: formDrivePhotoBefore,
        drivePhotoAfterUrl: formDrivePhotoAfter,
        standardPhotoUrl: formStandardPhotoUrl.trim() || undefined,
        standardPhotoAngleGuide: formStandardPhotoAngleGuide.trim() || undefined,
        status: formStatus,
        treatmentStatus: formTreatmentStatus,
        completedAt: formStatus === 'Selesai' ? (editingOrder.completedAt || new Date().toISOString()) : undefined,
        completedBy: formStatus === 'Selesai' ? (editingOrder.completedBy || activeUser.id) : undefined,
        completedByName: formStatus === 'Selesai' ? (editingOrder.completedByName || activeUser.name) : undefined,
      };
      StorageService.updateTreeWorkOrder(updated);
      googleSheetsService.saveTreeWorkOrdersToSheets().catch(console.warn);
    } else {
      const initialRecord: TreeInspectionRecord = {
        id: `tir-${Date.now()}`,
        treeId: `two-${Date.now().toString(36)}`,
        date: today,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        inspectorId: activeUser.id,
        inspectorName: activeUser.name,
        condition: formCondition,
        checkStatus: formStatus === 'Perlu Penanganan' ? 'Perlu Penanganan' : 'Sudah Dicek Aman',
        notes: formNotes.trim() || 'Pemeriksaan awal kondisi pohon.',
        treatmentNeeded: formTreatment,
        treatmentStatus: formTreatmentStatus,
        photoBeforeUrl: formPhotoBefore || undefined,
        photoAfterUrl: formPhotoAfter || undefined,
        drivePhotoBeforeUrl: formDrivePhotoBefore || undefined,
        drivePhotoAfterUrl: formDrivePhotoAfter || undefined,
        timestamp: new Date().toISOString(),
      };

      const newOrder: TreeWorkOrder = {
        id: initialRecord.treeId,
        date: today,
        area: formArea,
        assignedStaffId: areaStaff.id,
        assignedStaffName: finalStaffName,
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
        drivePhotoBeforeUrl: formDrivePhotoBefore,
        drivePhotoAfterUrl: formDrivePhotoAfter,
        standardPhotoUrl: formStandardPhotoUrl.trim() || undefined,
        standardPhotoAngleGuide: formStandardPhotoAngleGuide.trim() || undefined,
        status: formStatus,
        treatmentStatus: formTreatmentStatus,
        reportedBy: activeUser.id,
        reportedByName: activeUser.name,
        lastCheckedDate: today,
        lastCheckedTime: initialRecord.time,
        lastCheckedByName: activeUser.name,
        checkStatusToday: formStatus === 'Perlu Penanganan' ? 'Perlu Penanganan' : 'Sudah Dicek Aman',
        inspectionNotes: formNotes.trim() || undefined,
        inspectionHistory: [initialRecord],
        createdAt: new Date().toISOString(),
      };
      StorageService.addTreeWorkOrder(newOrder);
      googleSheetsService.saveTreeWorkOrdersToSheets().catch(console.warn);
    }

    setIsFormOpen(false);
    refreshData();
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus data pohon dan riwayat pemeriksaannya?')) {
      StorageService.deleteTreeWorkOrder(id);
      refreshData();
      googleSheetsService.saveTreeWorkOrdersToSheets().catch(console.warn);
    }
  };

  const handleQuickStatus = (order: TreeWorkOrder, status: 'Sedang Dikerjakan' | 'Selesai') => {
    const isDone = status === 'Selesai';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const historyRecord: TreeInspectionRecord = {
      id: `tir-${Date.now()}`,
      treeId: order.id,
      date: today,
      time: timeStr,
      inspectorId: activeUser.id,
      inspectorName: activeUser.name,
      condition: isDone ? 'Normal / Sehat' : order.condition,
      checkStatus: isDone ? 'Sudah Ditangani' : 'Dalam Penanganan',
      notes: isDone ? 'Penanganan selesai dikerjakan dan diverifikasi aman.' : 'Penanganan sedang dikerjakan oleh tim.',
      treatmentNeeded: order.treatmentNeeded,
      treatmentStatus: isDone ? 'Sudah Ditangani' : 'Sedang Ditangani',
      handledByName: activeUser.name,
      handledAt: `${today} (${timeStr})`,
      photoBeforeUrl: order.photoBeforeUrl,
      photoAfterUrl: order.photoAfterUrl,
      drivePhotoBeforeUrl: order.drivePhotoBeforeUrl,
      drivePhotoAfterUrl: order.drivePhotoAfterUrl,
      timestamp: now.toISOString(),
    };

    const updated: TreeWorkOrder = {
      ...order,
      status,
      treatmentStatus: isDone ? 'Sudah Ditangani' : 'Sedang Ditangani',
      condition: isDone ? 'Normal / Sehat' : order.condition,
      checkStatusToday: isDone ? 'Sudah Dicek Aman' : 'Perlu Penanganan',
      completedAt: isDone ? now.toISOString() : undefined,
      completedBy: isDone ? activeUser.id : undefined,
      completedByName: isDone ? activeUser.name : undefined,
      handledByName: activeUser.name,
      handledAt: `${today} (${timeStr})`,
      inspectionHistory: [historyRecord, ...(order.inspectionHistory || [])],
    };

    StorageService.updateTreeWorkOrder(updated);
    refreshData();
    googleSheetsService.saveTreeWorkOrdersToSheets().catch(console.warn);
  };

  // Open Benchmark Standard Photo Editor Modal
  const openBenchmarkModal = (order: TreeWorkOrder) => {
    setEditingBenchmarkTree(order);
    setBenchmarkInputUrl(order.standardPhotoUrl || '');
    setBenchmarkInputAngle(order.standardPhotoAngleGuide || '');
  };

  // Save Benchmark Standard Photo & Angle Guide
  const handleSaveBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBenchmarkTree) return;

    setIsSavingBenchmark(true);
    const updated: TreeWorkOrder = {
      ...editingBenchmarkTree,
      standardPhotoUrl: benchmarkInputUrl.trim() || undefined,
      standardPhotoAngleGuide: benchmarkInputAngle.trim() || undefined,
    };

    StorageService.updateTreeWorkOrder(updated);
    refreshData();
    if (selectedTreeGuide && selectedTreeGuide.id === updated.id) {
      setSelectedTreeGuide(updated);
    }
    if (inspectingOrder && inspectingOrder.id === updated.id) {
      setInspectingOrder(updated);
    }

    try {
      await googleSheetsService.saveTreeWorkOrdersToSheets();
    } catch (err) {
      console.warn('Sync benchmark photo warning:', err);
    }

    setIsSavingBenchmark(false);
    setEditingBenchmarkTree(null);

    setFeedbackNotification({
      show: true,
      type: 'success',
      title: 'Foto Acuan Standar Berhasil Disimpan!',
      message: `Foto acuan standar resmi untuk ${updated.treeName} berhasil diperbarui.`,
      treeName: updated.treeName,
      area: updated.area,
      statusText: 'Database Tersinkron',
      syncNote: 'Tersimpan di database lokal & otomatis disinkronkan ke Google Sheet (WorkOrder_Pohon Kolom AG).',
    });
  };

  // Open Quick Daily Inspection Modal
  const openInspectionModal = (order: TreeWorkOrder) => {
    setInspectingOrder(order);
    setInspectStatus(order.checkStatusToday || (order.status === 'Perlu Penanganan' ? 'Perlu Penanganan' : 'Sudah Dicek Aman'));
    setInspectCondition(order.condition || 'Normal / Sehat');
    setInspectNotes(order.inspectionNotes || '');
    setInspectTreatmentNeeded(order.treatmentNeeded || 'Penjarangan Kanopi Rimbun');
    setInspectHandlerType(order.handlerType || 'Internal PLH');
    setInspectVendorName(order.vendorName || '');
    setInspectVendorCost(order.vendorCost ? String(order.vendorCost) : '');
    setInspectUrgency(order.urgency || 'Sedang');
    setInspectPhotoBefore(order.lastCheckedPhotoUrl || order.photoBeforeUrl || '');
    setInspectDrivePhotoBefore(order.lastCheckedDrivePhotoUrl || order.drivePhotoBeforeUrl || '');
    setInspectPhotoType('full_tree');
    setShowSopChecklist(true);
  };

  // Save Quick Daily Inspection
  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const isPerluPenanganan = inspectStatus === 'Perlu Penanganan';
    const trimmedNotes = inspectNotes.trim() || 'Pemeriksaan rutin: Kondisi terpantau aman dan terawat.';
    const costNum = isPerluPenanganan && inspectHandlerType === 'Vendor Luar' && inspectVendorCost ? parseInt(inspectVendorCost, 10) || 0 : undefined;

    const newRecord: TreeInspectionRecord = {
      id: `tir-${Date.now()}`,
      treeId: inspectingOrder.id,
      date: today,
      time: timeStr,
      inspectorId: activeUser.id,
      inspectorName: activeUser.name,
      condition: inspectCondition,
      checkStatus: isPerluPenanganan ? 'Perlu Penanganan' : 'Sudah Dicek Aman',
      notes: trimmedNotes,
      treatmentNeeded: isPerluPenanganan ? inspectTreatmentNeeded : undefined,
      treatmentStatus: isPerluPenanganan ? 'Belum Ditangani' : 'Tidak Perlu Penanganan',
      handlerType: isPerluPenanganan ? inspectHandlerType : inspectingOrder.handlerType,
      isLargeTreatment: isPerluPenanganan ? inspectHandlerType === 'Vendor Luar' : inspectingOrder.isLargeTreatment,
      vendorName: isPerluPenanganan && inspectHandlerType === 'Vendor Luar' ? (inspectVendorName || inspectingOrder.vendorName) : undefined,
      vendorCost: costNum,
      photoUrl: inspectPhotoBefore || inspectingOrder.lastCheckedPhotoUrl || inspectingOrder.photoBeforeUrl,
      drivePhotoUrl: inspectDrivePhotoBefore || inspectingOrder.lastCheckedDrivePhotoUrl || inspectingOrder.drivePhotoBeforeUrl,
      photoBeforeUrl: inspectPhotoBefore || inspectingOrder.photoBeforeUrl,
      drivePhotoBeforeUrl: inspectDrivePhotoBefore || inspectingOrder.drivePhotoBeforeUrl,
      photoType: inspectPhotoType,
      photoAngleGuide: inspectingOrder.standardPhotoAngleGuide,
      timestamp: now.toISOString(),
    };

    const treeName = inspectingOrder.treeName;
    const treeArea = inspectingOrder.area;
    setIsSavingInspection(true);

    try {
      // 1. Simpan ke database pohon & riwayat inspeksi
      StorageService.addTreeInspectionRecord(inspectingOrder.id, newRecord);

      // 2. Buat log tugas harian PLH agar tercatat di Work Order Hari Ini & Sheet TaskLogs_PLH
      const plhTaskLog: TaskLog = {
        id: `tl-tree-${Date.now()}`,
        timestamp: now.toISOString(),
        taskId: inspectingOrder.id,
        taskTitle: `Inspeksi Ceklis: ${treeName} (${treeArea})`,
        unit: 'Semua Unit',
        category: 'Harian',
        timingType: 'anytime',
        division: 'PLH',
        date: today,
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: activeUser.role,
        status: isPerluPenanganan ? 'Pending' : 'Selesai',
        isLate: false,
        notes: trimmedNotes,
        photoUrl: inspectDrivePhotoBefore || inspectPhotoBefore || inspectingOrder.drivePhotoBeforeUrl || inspectingOrder.photoBeforeUrl,
        area: treeArea,
      };
      StorageService.addTaskLog(plhTaskLog);
      googleSheetsService.logTaskToSheets(plhTaskLog).catch(console.warn);

      refreshData();

      // 3. Sinkronkan langsung ke Google Sheet (WorkOrder_Pohon, TaskLogs_Pohon, & TaskLogs_PLH)
      await googleSheetsService.saveTreeWorkOrdersToSheets();

      setInspectingOrder(null);
      // Pastikan pohon yang baru dicek tetap terlihat dan tidak hilang sendiri karena filter tab atau filter area
      setActiveTab('all');
      setSearchQuery('');
      if (!isSuperUser && userAssignedArea) {
        const match = PLH_AREAS.find((a) => a.toLowerCase().includes(userAssignedArea.toLowerCase()));
        setSelectedAreaFilter(match || userAssignedArea);
      } else if (selectedAreaFilter !== 'Semua' && selectedAreaFilter !== treeArea) {
        setSelectedAreaFilter('Semua');
      }
      setFeedbackNotification({
        show: true,
        type: 'success',
        title: 'Hasil Pemeriksaan Pohon Berhasil Disimpan!',
        message: isPerluPenanganan
          ? `Status: Perlu Penanganan • Ditugaskan ke: ${inspectHandlerType} ${inspectHandlerType === 'Vendor Luar' ? '(Vendor Luar)' : '(Tim Internal PLH)'}`
          : 'Pohon dalam kondisi aman dan terawat prima.',
        treeName,
        area: treeArea,
        statusText: isPerluPenanganan ? `Perlu Penanganan (${inspectHandlerType})` : 'Sudah Dicek Aman',
        notes: trimmedNotes,
        syncNote: 'Data tersinkronisasi otomatis ke Google Sheet (WorkOrder_Pohon, TaskLogs_Pohon, & TaskLogs_PLH).',
      });
    } catch (err: any) {
      console.warn('Sync tree inspection warning:', err);
      setInspectingOrder(null);
      setFeedbackNotification({
        show: true,
        type: 'info',
        title: 'Pemeriksaan Disimpan di Perangkat!',
        message: `Pemeriksaan untuk "${treeName}" berhasil disimpan secara lokal di aplikasi.`,
        treeName,
        area: treeArea,
        statusText: isPerluPenanganan ? 'Perlu Penanganan' : 'Sudah Ceklis Aman',
        notes: trimmedNotes,
        syncNote: 'Sinkronisasi Google Sheet akan diteruskan otomatis saat koneksi stabil.',
      });
    } finally {
      setIsSavingInspection(false);
    }
  };

  // Sinkronkan seluruh 15 pohon resmi ke Google Sheet (WorkOrder_Pohon & TaskLogs_Pohon)
  const handleSyncAll15TreesToSheets = async () => {
    setIsSyncingAllTrees(true);
    try {
      const allTrees = StorageService.getTreeWorkOrders();
      const res = await googleSheetsService.saveTreeWorkOrdersToSheets(allTrees);
      setShowSampleTreesModal(false);
      setFeedbackNotification({
        show: true,
        type: 'success',
        title: '15 Pohon Resmi Berhasil Disimpan ke Google Sheet!',
        message: `Seluruh 15 data pohon per 5 area resmi Lazuardi FM telah berhasil disimpan dan disinkronkan ke Google Sheet (WorkOrder_Pohon & TaskLogs_Pohon).`,
        syncNote: `Waktu Sinkronisasi: ${res.timestamp || new Date().toLocaleTimeString('id-ID')}. Total 15 pohon aktif.`,
      });
    } catch (err: any) {
      setFeedbackNotification({
        show: true,
        type: 'error',
        title: 'Gagal Menyimpan ke Google Sheet',
        message: err.message || 'Koneksi ke Google Sheet terputus atau URL Web App belum diset.',
      });
    } finally {
      setIsSyncingAllTrees(false);
    }
  };

  // Muat ulang 15 pohon default resmi Lazuardi GCS
  const handleResetTo15OfficialTrees = async () => {
    StorageService.resetTreeWorkOrdersToDefault();
    refreshData();
    try {
      const defaultTrees = StorageService.getTreeWorkOrders();
      await googleSheetsService.saveTreeWorkOrdersToSheets(defaultTrees);
      setShowSampleTreesModal(false);
      setFeedbackNotification({
        show: true,
        type: 'success',
        title: 'Database 15 Pohon Berhasil Dimuat Ulang!',
        message: '15 pohon resmi Lazuardi GCS per 5 area telah dimuat dan disinkronkan langsung ke WorkOrder_Pohon.',
        syncNote: 'Seluruh pohon diatur dengan penanggung jawab resmi masing-masing area.',
      });
    } catch (e: any) {
      setShowSampleTreesModal(false);
      setFeedbackNotification({
        show: true,
        type: 'info',
        title: 'Database 15 Pohon Dimuat di Aplikasi!',
        message: '15 pohon resmi telah dimuat ke aplikasi lokal. Sinkronkan ke sheet saat online.',
      });
    }
  };

  // Open Treatment Modal (Laporan Penanganan)
  const openTreatmentModal = (order: TreeWorkOrder) => {
    setTreatmentModalOrder(order);
    setTreatmentStatus(order.treatmentStatus === 'Sedang Ditangani' ? 'Sudah Ditangani' : order.treatmentStatus || 'Sudah Ditangani');
    setTreatmentHandledByName(order.handledByName || activeUser.name);
    setTreatmentHandledAt(
      order.handledAt || `${today} (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB)`
    );
    setTreatmentReportText(order.treatmentReport || '');
    setTreatmentPhotoAfter(order.photoAfterUrl || '');
    setTreatmentDrivePhotoAfter(order.drivePhotoAfterUrl || '');
  };

  // Save Treatment Report & After Photo
  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatmentModalOrder) return;

    const treeName = treatmentModalOrder.treeName;
    const treeArea = treatmentModalOrder.area;
    const reportText = treatmentReportText.trim() || 'Tindakan penanganan telah selesai dilaksanakan sesuai SOP oleh tim.';

    StorageService.updateTreeTreatmentReport(treatmentModalOrder.id, {
      treatmentStatus,
      handledByName: treatmentHandledByName.trim() || activeUser.name,
      handledAt: treatmentHandledAt.trim() || `${today} (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB)`,
      treatmentReport: reportText,
      photoAfterUrl: treatmentPhotoAfter || undefined,
      drivePhotoAfterUrl: treatmentDrivePhotoAfter || undefined,
      condition: treatmentStatus === 'Sudah Ditangani' ? 'Normal / Sehat' : treatmentModalOrder.condition,
      inspectorUser: activeUser,
    });

    refreshData();
    setTreatmentModalOrder(null);
    googleSheetsService.saveTreeWorkOrdersToSheets().catch(console.warn);

    setFeedbackNotification({
      show: true,
      type: 'success',
      title: 'Laporan Penanganan Berhasil Disimpan!',
      message: `Tindakan penanganan untuk "${treeName}" telah dicatat ke riwayat pemeriksaan & Google Sheet.`,
      treeName,
      area: treeArea,
      statusText: treatmentStatus,
      notes: reportText,
      syncNote: 'Data penanganan & foto after tersimpan di WorkOrder_Pohon dan TaskLogs_Pohon.',
    });
  };

  // Open History Timeline Modal
  const openHistoryModal = (order: TreeWorkOrder) => {
    setHistoryModalOrder(order);
  };

  // Open Before/After Comparison Modal
  const openCompareModal = (order: TreeWorkOrder) => {
    setCompareModalOrder(order);
  };

  // Handle initialTreeId and initialAction from parent component (strictly opens once)
  useEffect(() => {
    if (initialTreeId && hasOpenedInitialRef.current !== `${initialTreeId}-${initialAction || 'inspect'}`) {
      const match = orders.find((o) => o.id === initialTreeId);
      if (match) {
        hasOpenedInitialRef.current = `${initialTreeId}-${initialAction || 'inspect'}`;
        if (initialAction === 'treatment') {
          openTreatmentModal(match);
        } else if (initialAction === 'history') {
          openHistoryModal(match);
        } else {
          openInspectionModal(match);
        }
      }
    }
  }, [initialTreeId, initialAction, orders]);

  // Quick check all trees in area (requires explicit confirmation to prevent accidental mass-checking)
  const handleCheckAllInArea = (area: string) => {
    const areaOrders = orders.filter((o) => o.area === area);
    if (areaOrders.length === 0) return;

    const confirmMsg = `Konfirmasi Pemeriksaan Serentak:\nApakah Anda yakin ingin menandai seluruh ${areaOrders.length} pohon di ${area} sebagai 'Sudah Dicek Aman'?\n\nPastikan seluruh pohon telah selesai ditinjau langsung di lapangan.`;
    if (!window.confirm(confirmMsg)) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const updatedList = orders.map((o) => {
      if (o.area === area) {
        const historyRecord: TreeInspectionRecord = {
          id: `tir-${Date.now()}-${o.id}`,
          treeId: o.id,
          date: today,
          time: timeStr,
          inspectorId: activeUser.id,
          inspectorName: activeUser.name,
          condition: o.condition || 'Normal / Sehat',
          checkStatus: 'Sudah Dicek Aman',
          notes: 'Pengecekan serentak area terverifikasi aman & bersih oleh petugas.',
          treatmentStatus: o.treatmentStatus || 'Tidak Perlu Penanganan',
          photoBeforeUrl: o.photoBeforeUrl,
          photoAfterUrl: o.photoAfterUrl,
          drivePhotoBeforeUrl: o.drivePhotoBeforeUrl,
          drivePhotoAfterUrl: o.drivePhotoAfterUrl,
          timestamp: now.toISOString(),
        };

        return {
          ...o,
          checkStatusToday: 'Sudah Dicek Aman' as const,
          lastCheckedDate: today,
          lastCheckedTime: timeStr,
          lastCheckedByName: activeUser.name,
          inspectionNotes: 'Pengecekan rutin terverifikasi aman & bersih oleh petugas area.',
          inspectionHistory: [historyRecord, ...(o.inspectionHistory || [])],
        };
      }
      return o;
    });

    StorageService.saveTreeWorkOrders(updatedList);
    refreshData();
    googleSheetsService.saveTreeWorkOrdersToSheets().catch(console.warn);
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

  // Image Upload with Auto Fast Client-Side Compression (<120KB) & Google Drive Upload Helper
  const handlePhotoUploadGeneric = (
    e: React.ChangeEvent<HTMLInputElement>,
    prefix: string,
    setLoading: (l: boolean) => void,
    onSuccess: (dataUrl: string, driveUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const rawBase64 = uploadEvent.target?.result as string;
      if (!rawBase64) {
        setLoading(false);
        return;
      }

      // Ultra-Fast Lightweight Image Compressor: Resize to max 640px with JPEG quality 0.55 (~35KB) to completely eliminate camera lag, memory bloat, and storage quota overflow
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 640;
          let width = img.width || 640;
          let height = img.height || 480;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);

            // Watermark overlay for documentation integrity
            const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
            const dateStr = getJakartaDateString();
            const bannerH = 24;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.fillRect(0, height - bannerH, width, bannerH);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`PLH: ${prefix.replace(/_/g, ' ')} • ${dateStr} ${timeStr} • ${activeUser.name}`, 8, height - 7);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.55);

            // Instant lightweight local preview
            onSuccess(compressedBase64, '');

            // Upload lightweight image to Google Drive in background (<1s)
            const cleanPrefix = prefix.replace(/\s+/g, '_').toLowerCase();
            const filename = `${cleanPrefix}_${Date.now()}.jpg`;
            const driveRes = await googleSheetsService.uploadPhotoToDrive(compressedBase64, filename);
            if (driveRes.driveUrl) {
              onSuccess(driveRes.driveUrl, driveRes.driveUrl);
            }
          } else {
            onSuccess(rawBase64, '');
          }
        } catch (compErr) {
          console.warn('Compression error fallback:', compErr);
          onSuccess(rawBase64, '');
        } finally {
          setLoading(false);
        }
      };
      img.onerror = () => {
        onSuccess(rawBase64, '');
        setLoading(false);
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  // Filtering
  const filteredOrders = orders.filter((o) => {
    // Restriksi Area: Masing-masing staf PLH hanya bisa melihat pohon di area tanggung jawabnya
    if (!isSuperUser && userAssignedArea) {
      const uClean = userAssignedArea.toLowerCase().replace(/[^a-z0-9]/g, '');
      const oClean = o.area.toLowerCase().replace(/[^a-z0-9]/g, '');
      const uNorm = normalizePlhArea(userAssignedArea).toLowerCase().replace(/[^a-z0-9]/g, '');
      const oNorm = normalizePlhArea(o.area).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        !oClean.includes(uClean) &&
        !uClean.includes(oClean) &&
        !oNorm.includes(uNorm) &&
        !uNorm.includes(oNorm)
      ) {
        return false;
      }
    } else if (selectedAreaFilter !== 'Semua' && o.area !== selectedAreaFilter) {
      return false;
    }
    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        o.treeName.toLowerCase().includes(q) ||
        o.area.toLowerCase().includes(q) ||
        o.notes.toLowerCase().includes(q) ||
        (o.treatmentReport && o.treatmentReport.toLowerCase().includes(q)) ||
        (o.vendorName && o.vendorName.toLowerCase().includes(q));
      if (!match) return false;
    }
    // Tab Filter
    if (activeTab === 'need_action') {
      return o.treatmentStatus === 'Belum Ditangani' || (o.status === 'Perlu Penanganan' && o.treatmentStatus !== 'Sudah Ditangani');
    }
    if (activeTab === 'in_progress') {
      return o.treatmentStatus === 'Sedang Ditangani' || o.status === 'Sedang Dikerjakan';
    }
    if (activeTab === 'completed') {
      return o.treatmentStatus === 'Sudah Ditangani' || o.status === 'Selesai';
    }
    if (activeTab === 'has_photos') {
      return Boolean(o.photoBeforeUrl && o.photoAfterUrl);
    }
    if (activeTab === 'weekly_vendor') {
      return o.handlerType === 'Vendor Luar' || o.isLargeTreatment === true;
    }
    if (activeTab === 'internal') {
      return o.handlerType === 'Internal PLH';
    }
    if (activeTab === 'urgent') {
      return o.urgency === 'Tinggi / Bahaya' || o.condition === 'Miring / Rawan Tumbang';
    }
    // Weekly Filter
    const currentMon = getMondayOfWeek();
    if (weeklyFilter === 'this_week_unchecked') {
      const status = getTreeWeeklyCheckStatus(o);
      return !status.isCheckedThisWeek;
    }
    if (weeklyFilter === 'this_week_safe') {
      const status = getTreeWeeklyCheckStatus(o);
      return status.isCheckedThisWeek && !status.isUnderTreatment;
    }
    if (weeklyFilter === 'need_treatment') {
      const status = getTreeWeeklyCheckStatus(o);
      return status.isUnderTreatment;
    }
    if (weeklyFilter === 'this_week') {
      // Tampilkan seluruh pohon yang masuk target minggu berjalan
      return true;
    }
    if (weeklyFilter === 'last_week') {
      return Boolean(o.lastCheckedDate && o.lastCheckedDate < currentMon);
    }

    return true;
  });

  // Manual Reset Siklus Ceklis Mingguan (Reset Tiap Senin)
  const handleManualWeeklyReset = () => {
    if (confirm('Konfirmasi Reset Siklus Mingguan:\nApakah Anda ingin mereset status pemeriksaan pohon untuk siklus minggu baru ini?\n\nPohon yang sehat akan berstatus "Belum Dicek Minggu Ini". Seluruh riwayat foto dan penanganan terdahulu tetap tersimpan aman di TaskLogs_Pohon.')) {
      const updated = StorageService.resetWeeklyTreeCheckCycle();
      setOrders(updated);
      googleSheetsService.saveTreeWorkOrdersToSheets(updated).catch(console.warn);
      setFeedbackNotification({
        show: true,
        type: 'success',
        title: 'Siklus Ceklis Mingguan Berhasil Direset!',
        message: 'Status ceklis pohon telah kembali segar untuk minggu berjalan. Data historis di TaskLogs_Pohon tetap tersimpan utuh.',
        statusText: 'Siklus Minggu Baru (Senin)',
        syncNote: 'Perubahan disinkronkan ke WorkOrder_Pohon.',
      });
    }
  };

  // Export CSV Lengkap untuk Rekapitulasi & Manajemen Pohon
  const handleExportCSV = () => {
    const currentMon = getMondayOfWeek();
    const headers = [
      'ID_WorkOrder',
      'Tanggal_Lapor',
      'Area_Lokasi',
      'Nama_Pohon',
      'Kondisi_Pohon',
      'Tindakan_Treatment',
      'Pelaksana',
      'Nama_Vendor',
      'Biaya_Vendor',
      'Target_Minggu',
      'Tingkat_Urgensi',
      'Status_Pohon',
      'Status_Minggu_Ini',
      'Tanggal_Terakhir_Cek',
      'Jam_Cek',
      'Petugas_Pemeriksa',
      'Catatan_Pemeriksaan',
      'Status_Penanganan',
      'Laporan_Hasil_Penanganan',
      'Petugas_Penanganan',
      'Waktu_Penanganan',
      'Link_Foto_Before',
      'Link_Foto_After',
      'Link_Foto_Acuan_Standar',
      'Panduan_Sudut_Foto'
    ];
    const rows = orders.map((o) => {
      const status = getTreeWeeklyCheckStatus(o);
      return [
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
        `"${status.statusText}"`,
        `"${o.lastCheckedDate || '-'}"`,
        `"${o.lastCheckedTime || '-'}"`,
        `"${o.lastCheckedByName || '-'}"`,
        `"${(o.inspectionNotes || o.notes || '').replace(/"/g, '""')}"`,
        `"${o.treatmentStatus || '-'}"`,
        `"${(o.treatmentReport || '').replace(/"/g, '""')}"`,
        `"${o.handledByName || '-'}"`,
        `"${o.handledAt || '-'}"`,
        `"${o.drivePhotoBeforeUrl || o.photoBeforeUrl || '-'}"`,
        `"${o.drivePhotoAfterUrl || o.photoAfterUrl || '-'}"`,
        `"${o.standardPhotoUrl || '-'}"`,
        `"${(o.standardPhotoAngleGuide || '').replace(/"/g, '""')}"`
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_WorkOrder_Pohon_Lazuardi_${today}.csv`);
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

  // Unduh & Cetak PDF Dokumen Resmi dengan Filter Periode Bulan & Pelaksana
  const handleGenerateFilteredPdf = () => {
    let targetOrders = orders;
    if (pdfAreaSelection !== 'Semua') {
      targetOrders = targetOrders.filter((o) => o.area === pdfAreaSelection);
    }
    if (pdfHandlerSelection !== 'Semua') {
      targetOrders = targetOrders.filter((o) => o.handlerType === pdfHandlerSelection);
    }
    const areaTitle = pdfAreaSelection === 'Semua' ? 'Seluruh Wilayah Sekolah Lazuardi GCS (5 Wilayah)' : pdfAreaSelection;
    const staff = pdfAreaSelection !== 'Semua' ? DEFAULT_PLH_AREA_STAFF[pdfAreaSelection]?.name : activeUser.name;

    const html = generateTreeAreaReportPdf(areaTitle, targetOrders, staff, {
      startMonth: pdfStartMonth || undefined,
      endMonth: pdfEndMonth || undefined,
      handlerType: pdfHandlerSelection,
    });

    printHtmlAsPdf(
      html,
      `Laporan_History_Pohon_${pdfAreaSelection.replace(/\s+/g, '_')}_${pdfStartMonth || 'Awal'}_sd_${pdfEndMonth || 'Sekarang'}`
    );
    setShowPdfFilterModal(false);
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
              setPdfAreaSelection(selectedAreaFilter === 'Semua' ? 'Semua' : selectedAreaFilter);
              setShowPdfFilterModal(true);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition cursor-pointer flex items-center gap-1.5"
            title="Filter Periode Bulan & Unduh Dokumen PDF Riwayat Penanganan Resmi"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-300" />
            <span>Cetak Rekap History (PDF)</span>
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
            onClick={() => setShowSampleTreesModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-amber-950 transition cursor-pointer shadow-sm flex items-center gap-1.5"
            title="Kelola dan Simpan 15 Database Pohon Resmi per Area ke Sheet WorkOrder_Pohon"
          >
            <TreePine className="w-4 h-4 text-emerald-950" />
            <span>Database 15 Pohon (Sheet)</span>
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

      {/* PANEL KONTROL SIKLUS MINGGUAN & UNDUH REKAP POHON (RESET TIAP SENIN) */}
      {(() => {
        const currentMon = getMondayOfWeek();
        const weekLabel = formatWeekRange(currentMon);
        const totalTrees = orders.length;
        const uncheckedTrees = orders.filter((o) => !getTreeWeeklyCheckStatus(o).isCheckedThisWeek);
        const safeTrees = orders.filter((o) => {
          const st = getTreeWeeklyCheckStatus(o);
          return st.isCheckedThisWeek && !st.isUnderTreatment;
        });
        const treatmentTrees = orders.filter((o) => getTreeWeeklyCheckStatus(o).isUnderTreatment);
        const lastWeekTrees = orders.filter((o) => o.lastCheckedDate && o.lastCheckedDate < currentMon);

        return (
          <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 shadow-xs space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Siklus Minggu Ini: {weekLabel}</span>
                  </span>
                  <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-emerald-600" />
                    <span>Otomatis Reset Setiap Hari Senin Jam 00:00 WIB</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="font-bold text-slate-800">
                    Progres Pemeriksaan Minggu Ini:
                  </span>
                  <span className="font-extrabold text-emerald-800">
                    {safeTrees.length} / {totalTrees} Pohon Aman
                  </span>
                  {treatmentTrees.length > 0 && (
                    <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                      • {treatmentTrees.length} Butuh Penanganan
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Unduh Excel/CSV, Cetak PDF, Reset Manual */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Unduh rekapitulasi data seluruh pohon ke file spreadsheet (Excel / CSV)"
                >
                  <Download className="w-4 h-4 text-emerald-200" />
                  <span>Unduh Rekap Pohon (Excel / CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfAreaSelection(selectedAreaFilter === 'Semua' ? 'Semua' : selectedAreaFilter);
                    setShowPdfFilterModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Buka pilihan periode dan cetak laporan resmi pohon ke format PDF"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Cetak Laporan PDF</span>
                </button>
                {isSuperUser && (
                  <button
                    type="button"
                    onClick={handleManualWeeklyReset}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    title="Manual reset siklus minggu ini (kembalikan status pohon sehat ke Belum Dicek)"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Reset Siklus Senin</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Cepat Mingguan */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Filter Tampilan Mingguan:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setWeeklyFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    weeklyFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua Pohon ({totalTrees})
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyFilter('this_week_unchecked')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    weeklyFilter === 'this_week_unchecked'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Belum Dicek Minggu Ini ({uncheckedTrees.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyFilter('this_week_safe')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    weeklyFilter === 'this_week_safe'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sudah Ceklis Aman ({safeTrees.length})</span>
                </button>
                {treatmentTrees.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWeeklyFilter('need_treatment')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      weeklyFilter === 'need_treatment'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Perlu Penanganan Aktif ({treatmentTrees.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWeeklyFilter('last_week')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    weeklyFilter === 'last_week'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pernah Dicek Sebelum Minggu Ini ({lastWeekTrees.length})</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
          {/* Fitur Laporan per Area PLH: Khusus Kordinator PLH & Admin FM */}
          {isSuperUser && (
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
          )}
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
          {!isSuperUser && userAssignedArea ? (
            <div className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Area Anda: {selectedAreaFilter}</span>
            </div>
          ) : (
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
          )}
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

      {/* Work Orders List or Area Breakdown (Khusus Kordinator & Admin FM) */}
      {activeTab === 'area_breakdown' && isSuperUser ? (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3">
            <FileText className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-950">
              <h4 className="font-bold text-teal-900 text-sm">
                Rekapitulasi & Laporan Kerja Pemeliharaan Lingkungan Hidup (PLH) per 5 Area (Khusus Kordinator PLH)
              </h4>
              <p className="mt-0.5 text-teal-800">
                Fitur ini dikhususkan bagi Kordinator PLH dan Pengelola FM untuk memantau status pohon di 5 area tanggung jawab (Pos 1, Pos 2, Khaldun, Ex Minifarm, Kolam Renang), mengecek kepatuhan jadwal mingguan (reset tiap Senin), dan mencetak laporan resmi PDF.
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
              const checkedThisWeekCount = areaOrders.filter(
                (o) => getTreeWeeklyCheckStatus(o).isCheckedThisWeek
              ).length;
              const isAllCheckedThisWeek = totalTrees > 0 && checkedThisWeekCount === totalTrees;

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
                          <span className="text-emerald-950 font-black">{sanitizePlhStaffName(staff.name, area)}</span>
                        </h3>
                      </div>
                    </div>

                    {/* Status Pengecekan Mingguan Sesuai SOP PLH (Reset Tiap Senin) */}
                    <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ceklis Aman Minggu Ini:</span>
                        </span>
                        <span className={`font-extrabold text-[11px] px-2 py-0.5 rounded-md ${
                          isAllCheckedThisWeek 
                            ? 'bg-emerald-600 text-white' 
                            : checkedThisWeekCount > 0 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {checkedThisWeekCount} / {totalTrees} Aman
                        </span>
                      </div>
                      <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${totalTrees > 0 ? (checkedThisWeekCount / totalTrees) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-emerald-800 font-medium">
                        * Pengecekan di-reset otomatis setiap hari Senin (Siklus Mingguan).
                      </div>
                      {!isAllCheckedThisWeek && totalTrees > 0 && (
                        <button
                          type="button"
                          onClick={() => handleCheckAllInArea(area)}
                          className="w-full mt-1 py-1 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Ceklis Aman Seluruh Pohon ({area})</span>
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
                                    Pemeriksa: {sanitizePlhStaffName(o.lastCheckedByName, o.area)}
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
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-600 flex-wrap">
                        <span className="font-semibold text-slate-500">Penanggung Jawab:</span>
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {order.assignedStaffName || DEFAULT_PLH_AREA_STAFF[order.area]?.name || 'Petugas PLH'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-emerald-800">{order.area}</span>
                      </div>
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
                      <span className="text-slate-500 font-semibold">Tindakan Dibutuhkan:</span>
                      <span className="font-bold text-slate-800 text-right truncate max-w-[170px]">
                        {order.treatmentNeeded}
                      </span>
                    </div>

                    {/* Status Penanganan */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Status Penanganan:</span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] flex items-center gap-1 ${
                          order.treatmentStatus === 'Sudah Ditangani' || order.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : order.treatmentStatus === 'Sedang Ditangani' || order.status === 'Sedang Dikerjakan'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : order.treatmentStatus === 'Belum Ditangani' || order.status === 'Perlu Penanganan'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {order.treatmentStatus === 'Sudah Ditangani' || order.status === 'Selesai' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Sudah Ditangani</span>
                          </>
                        ) : order.treatmentStatus === 'Sedang Ditangani' || order.status === 'Sedang Dikerjakan' ? (
                          <>
                            <Wrench className="w-3 h-3 text-blue-600" />
                            <span>Sedang Ditangani</span>
                          </>
                        ) : order.treatmentStatus === 'Belum Ditangani' || order.status === 'Perlu Penanganan' ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Belum Ditangani</span>
                          </>
                        ) : (
                          <span>Tidak Perlu Penanganan</span>
                        )}
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

                  {/* Laporan Penanganan Jika Sudah/Sedang Ditangani */}
                  {(order.treatmentReport || order.handledByName) && (
                    <div className="p-2.5 rounded-xl border text-xs space-y-1 bg-emerald-50/70 border-emerald-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-emerald-700" />
                          <span>Laporan Hasil Penanganan:</span>
                        </span>
                        {order.handledAt && (
                          <span className="text-[9.5px] font-bold text-emerald-700">
                            {order.handledAt}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-950 font-semibold">
                        Oleh: <strong>{sanitizePlhStaffName(order.handledByName || order.completedByName, order.area)}</strong>
                      </div>
                      {order.treatmentReport && (
                        <p className="text-[10.5px] text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-100 italic">
                          "{order.treatmentReport}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tombol Update Penanganan jika belum selesai atau perlu penanganan */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openTreatmentModal(order)}
                      className="py-1.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      title="Update tindakan, status penanganan, dan upload foto sesudah (After)"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Update Penanganan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openHistoryModal(order)}
                      className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[11px] transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      title="Lihat seluruh log riwayat pemeriksaan dan tindakan oleh tim PLH"
                    >
                      <History className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Riwayat ({order.inspectionHistory?.length || 0})</span>
                    </button>
                  </div>

                  {/* Standar Foto & Sudut Pengambilan Pohon (Panduan Resmi PLH) */}
                  <div className="p-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/70 space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5 text-emerald-950 font-extrabold text-[11px]">
                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Standar Foto & Sudut Pengambilan:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTreeGuide(order)}
                        className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs hover:bg-emerald-50 transition"
                      >
                        <Info className="w-3 h-3 text-emerald-600" />
                        <span>SOP 5 Poin</span>
                      </button>
                    </div>

                    <div className="flex items-start gap-2.5">
                      {order.standardPhotoUrl ? (
                        <div
                          onClick={() => setSelectedTreeGuide(order)}
                          className="w-16 h-12 rounded-lg overflow-hidden border border-emerald-300 bg-slate-200 shrink-0 cursor-pointer relative group shadow-2xs"
                          title="Klik untuk memperbesar foto acuan standar resmi"
                        >
                          <img
                            src={formatGoogleDriveImageUrl(order.standardPhotoUrl)}
                            alt="Standar Pohon"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-[7.5px] font-bold text-white text-center py-0.5">
                            Acuan
                          </span>
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-lg border border-dashed border-emerald-300 bg-emerald-100/50 flex items-center justify-center text-emerald-700 text-[10px] font-bold shrink-0">
                          Acuan
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[10.5px] text-emerald-950 font-medium leading-snug">
                          {order.standardPhotoAngleGuide || 'Foto utuh dari jarak 5–10 meter agar seluruh profil pohon terlihat jelas.'}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200/90 text-emerald-950">
                            Jarak 5–10m Utuh
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedTreeGuide(order)}
                            className="text-[9.5px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                          >
                            Panduan Lengkap & Foto HD ↗
                          </button>
                          <button
                            type="button"
                            onClick={() => openBenchmarkModal(order)}
                            className="text-[9.5px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition"
                            title="Ganti foto acuan standar dengan link foto di Google Drive"
                          >
                            <Edit3 className="w-3 h-3 text-amber-600" />
                            <span>Ganti Foto Acuan (Drive)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel Pengecekan Berkala (Reset Setiap Minggu Sesuai SOP PLH) */}
                  {(() => {
                    const weeklyStatus = getTreeWeeklyCheckStatus(order);
                    return (
                      <div className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                        weeklyStatus.isCheckedThisWeek
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : order.checkStatusToday === 'Perlu Penanganan'
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-amber-50/70 border-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${weeklyStatus.isCheckedThisWeek ? 'text-emerald-600' : 'text-amber-600'}`} />
                            <span>Pengecekan Mingguan:</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${weeklyStatus.badgeClass}`}>
                            {weeklyStatus.isCheckedThisWeek ? '✅ Ceklis Aman' : weeklyStatus.statusText}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 flex items-center justify-between">
                          <span>Terakhir Dicek:</span>
                          <span className="font-bold text-slate-800">
                            {order.lastCheckedDate ? `${formatJakartaDisplayDate(order.lastCheckedDate)} ${order.lastCheckedTime ? `(${order.lastCheckedTime})` : ''}` : 'Belum pernah dicek'}
                          </span>
                        </div>

                        {weeklyStatus.isCheckedThisWeek ? (
                          <div className="text-[10px] font-medium text-emerald-900 bg-emerald-100/70 px-2 py-1 rounded-lg border border-emerald-200 flex items-center justify-between">
                            <span>Status Pengecekan:</span>
                            <strong className="text-emerald-950 font-bold">Aman Minggu Ini (Reset Tiap Senin)</strong>
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Wajib dilakukan pengecekan pohon minggu ini! (Reset Tiap Senin)</span>
                          </div>
                        )}

                        {order.lastCheckedByName && (
                          <div className="text-[10px] text-slate-500">
                            Pemeriksa: <strong className="text-slate-800">{sanitizePlhStaffName(order.lastCheckedByName, order.area)}</strong>
                          </div>
                        )}

                        {order.inspectionNotes && (
                          <p className="text-[10px] italic text-slate-600 bg-white/90 p-1.5 rounded-lg border border-slate-200">
                            "{order.inspectionNotes}"
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => openInspectionModal(order)}
                          className="w-full mt-1 py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Input / Update Pemeriksaan Pohon</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Catatan Khusus */}
                  {order.notes && (
                    <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      <span className="font-bold text-amber-950 block text-[10px] uppercase tracking-wider mb-0.5">
                        Catatan Khusus Pohon:
                      </span>
                      <p className="italic">{order.notes}</p>
                    </div>
                  )}

                  {/* Komparasi Foto Before & After */}
                  {(order.photoBeforeUrl || order.photoAfterUrl) && (
                    <div className="mt-2 p-2 bg-slate-100/80 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-emerald-600" />
                          <span>Foto Before & After:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openCompareModal(order)}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                          <span>Bandingkan</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Before */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-200 h-28 group">
                          {order.photoBeforeUrl || order.drivePhotoBeforeUrl ? (
                            <>
                              <img
                                src={formatGoogleDriveImageUrl(order.photoBeforeUrl || order.drivePhotoBeforeUrl)}
                                alt="Before"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200 cursor-pointer"
                                onClick={() => openCompareModal(order)}
                              />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-black bg-amber-600/90 text-white backdrop-blur-xs">
                                BEFORE
                              </span>
                              {(order.drivePhotoBeforeUrl || order.photoBeforeUrl?.startsWith('http')) && (
                                <a
                                  href={getGoogleDriveViewLink(order.drivePhotoBeforeUrl || order.photoBeforeUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute bottom-1 right-1 p-1 rounded-md bg-black/70 hover:bg-black text-white text-[8px] flex items-center gap-0.5 backdrop-blur-xs"
                                  title="Buka foto di Google Drive"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <span className="text-[9px] font-semibold italic">Belum ada foto sebelum</span>
                            </div>
                          )}
                        </div>

                        {/* After */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-200 h-28 group">
                          {order.photoAfterUrl || order.drivePhotoAfterUrl ? (
                            <>
                              <img
                                src={formatGoogleDriveImageUrl(order.photoAfterUrl || order.drivePhotoAfterUrl)}
                                alt="After"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200 cursor-pointer"
                                onClick={() => openCompareModal(order)}
                              />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-black bg-emerald-600/90 text-white backdrop-blur-xs">
                                AFTER
                              </span>
                              {(order.drivePhotoAfterUrl || order.photoAfterUrl?.startsWith('http')) && (
                                <a
                                  href={getGoogleDriveViewLink(order.drivePhotoAfterUrl || order.photoAfterUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute bottom-1 right-1 p-1 rounded-md bg-black/70 hover:bg-black text-white text-[8px] flex items-center gap-0.5 backdrop-blur-xs"
                                  title="Buka foto di Google Drive"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-slate-100">
                              <span className="text-[9px] font-semibold italic text-slate-500">Belum ada foto sesudah</span>
                              <button
                                type="button"
                                onClick={() => openTreatmentModal(order)}
                                className="mt-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold cursor-pointer"
                              >
                                + Upload Foto
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-400">
                    <span>Pelapor: {sanitizePlhStaffName(order.reportedByName, order.area)}</span>
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
                      <span>SPK</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        printHtmlAsPdf(
                          generateTreeHistoryReportPdf(order),
                          `Laporan_Riwayat_Pohon_${order.id}`
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-emerald-300"
                      title="Unduh Laporan Riwayat Lengkap & Foto (PDF)"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-700" />
                      <span>PDF Riwayat</span>
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
              {/* Lokasi Area, Nama Petugas Penanggung Jawab & Nama Pohon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi / Area Luar PLH:
                  </label>
                  <select
                    value={formArea}
                    onChange={(e) => {
                      const newArea = e.target.value;
                      setFormArea(newArea);
                      setFormStaffName(DEFAULT_PLH_AREA_STAFF[newArea]?.name || activeUser.name);
                    }}
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
                    Petugas Penanggung Jawab:
                  </label>
                  <input
                    type="text"
                    value={formStaffName}
                    onChange={(e) => setFormStaffName(e.target.value)}
                    placeholder="Contoh: Bambang Irawan (PLH)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
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
                    Upload Foto Kondisi Pohon (Google Drive):
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition">
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{formPhotoBefore ? 'Ubah Foto' : 'Ambil / Unggah Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) =>
                            handlePhotoUploadGeneric(
                              e,
                              `pohon_${formTreeName || 'baru'}`,
                              setIsUploadingFormPhoto,
                              (b64, driveUrl) => {
                                setFormPhotoBefore(b64);
                                if (driveUrl) setFormDrivePhotoBefore(driveUrl);
                              }
                            )
                          }
                          className="hidden"
                        />
                      </label>
                      {isUploadingFormPhoto && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Mengupload ke Drive...</span>
                        </div>
                      )}
                      {formPhotoBefore && !isUploadingFormPhoto && (
                        <span className="text-[10px] text-emerald-600 font-bold">✓ Terunggah</span>
                      )}
                    </div>

                    {formPhotoBefore && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 w-32 h-24 bg-slate-100">
                        <img
                          src={formatGoogleDriveImageUrl(formPhotoBefore || formDrivePhotoBefore)}
                          alt="Preview Pohon"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {formDrivePhotoBefore && (
                      <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Tersimpan di Google Drive</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Foto Acuan Standar Resmi (Benchmark URL Drive / Upload) */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Foto Acuan Standar Resmi (Benchmark Google Drive):</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700">
                    Disinkronkan ke Kolom AG Sheet
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      URL Link Foto Google Drive:
                    </label>
                    <input
                      type="text"
                      value={formStandardPhotoUrl}
                      onChange={(e) => setFormStandardPhotoUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view atau https://..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block italic">
                      Mendukung URL share Google Drive ("Anyone with link"). Otomatis tampil di profil acuan pohon.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Panduan Sudut & Jarak Pengambilan Foto (Instruksi Staf):
                    </label>
                    <input
                      type="text"
                      value={formStandardPhotoAngleGuide}
                      onChange={(e) => setFormStandardPhotoAngleGuide(e.target.value)}
                      placeholder="Contoh: Foto dari jarak 5–10 meter agar seluruh profil pohon tampak utuh..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formStandardPhotoUrl ? 'Ganti Foto Acuan (Upload)' : 'Unggah Foto Acuan ke Drive'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) =>
                          handlePhotoUploadGeneric(
                            e,
                            `benchmark_${formTreeName || 'pohon'}`,
                            setIsUploadingFormStandardPhoto,
                            (b64, driveUrl) => {
                              if (driveUrl) {
                                setFormStandardPhotoUrl(driveUrl);
                              } else if (b64) {
                                setFormStandardPhotoUrl(b64);
                              }
                            }
                          )
                        }
                        className="hidden"
                      />
                    </label>
                    {isUploadingFormStandardPhoto && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Mengupload ke Drive...</span>
                      </div>
                    )}
                    {formStandardPhotoUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-emerald-300 w-20 h-14 bg-slate-900 shrink-0 shadow-2xs">
                        <img
                          src={formatGoogleDriveImageUrl(formStandardPhotoUrl)}
                          alt="Preview Acuan"
                          className="w-full h-full object-cover"
                        />
                      </div>
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-emerald-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                    <span>Cek / Laporan Pohon Hari Ini</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Standar SOP PLH
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inspectingOrder.area} • <strong className="text-slate-800">{inspectingOrder.treeName}</strong>
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

            <form onSubmit={handleSaveInspection} className="mt-4 space-y-4 text-xs text-slate-700 overflow-y-auto pr-1">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">Petugas Pemeriksa:</span>
                  <span className="font-black text-emerald-950 text-xs">{activeUser.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">Tanggal Pengecekan:</span>
                  <span className="font-bold text-emerald-950 text-xs">{formatJakartaDisplayDate(today)}</span>
                </div>
              </div>

              {/* PANDUAN & STANDAR PENGAMBILAN FOTO POHON (AGAR TERLIHAT UTUH & JELAS) */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-300 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>Panduan Standar Foto Pohon (Biar Terlihat Pohonnya)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSopChecklist(!showSopChecklist)}
                    className="text-[10.5px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs transition"
                  >
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{showSopChecklist ? 'Tutup Checklist SOP' : 'Lihat Standar SOP (5 Poin)'}</span>
                  </button>
                </div>

                {/* Grid Foto Acuan Standar & Panduan Sudut */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white/90 p-3 rounded-xl border border-emerald-200/80">
                  {/* Visual Benchmark Acuan */}
                  <div className="sm:col-span-5 space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                      ★ Foto Acuan Standar Resmi:
                    </span>
                    {inspectingOrder.standardPhotoUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-slate-100 h-32 group shadow-2xs">
                        <img
                          src={formatGoogleDriveImageUrl(inspectingOrder.standardPhotoUrl)}
                          alt="Acuan Standar"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFullStandardPhoto(inspectingOrder.standardPhotoUrl!)}
                          className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-white font-bold text-xs gap-1"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>Perbesar Foto Acuan</span>
                        </button>
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[8.5px] font-extrabold bg-emerald-900/90 text-white shadow-2xs">
                          Acuan Resmi Lazuardi
                        </span>
                      </div>
                    ) : (
                      <div className="h-32 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 flex flex-col items-center justify-center text-emerald-800 p-2 text-center text-xs">
                        <TreePine className="w-6 h-6 mb-1 text-emerald-600" />
                        <span className="font-bold">Foto Acuan Standar</span>
                      </div>
                    )}
                  </div>

                  {/* Instruksi Sudut & Jarak */}
                  <div className="sm:col-span-7 space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
                      <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block mb-0.5">
                        📍 Rekomendasi Sudut & Jarak Foto:
                      </span>
                      <p className="text-[11px] font-bold text-emerald-950 leading-snug">
                        {inspectingOrder.standardPhotoAngleGuide ||
                          'Foto utuh dari jarak 5–10 meter agar seluruh profil pohon tampak (tajuk atas, batang, dan perakaran tanah).'}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-600 space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kriteria Foto yang Benar:</span>
                      </div>
                      <p className="leading-snug">
                        Mundur sejauh <strong>5–10 meter</strong> agar tajuk daun paling atas hingga pangkal batang dan perakaran tanah masuk ke dalam frame kamera. Hindari foto terlalu dekat hanya pada kulit batang!
                      </p>
                    </div>
                  </div>
                </div>

                {/* SOP 5 Poin Checklist Pemeriksaan Pohon */}
                {showSopChecklist && (
                  <div className="p-3 bg-white/95 rounded-xl border border-emerald-200 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Standar Operasional Prosedur (SOP) Pemeriksaan Pohon PLH:</span>
                      </span>
                      <span className="text-[9.5px] text-emerald-800 font-bold">5 Poin Baku</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                          1
                        </span>
                        <div>
                          <strong className="text-slate-900 block">Foto Utuh Seluruh Pohon:</strong>
                          <span className="text-slate-600">Ambil dari jarak 5–10 meter agar tajuk atas, dahan, batang, dan perakaran bawah terlihat.</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                          2
                        </span>
                        <div>
                          <strong className="text-slate-900 block">Pemeriksaan Kanopi & Dahan:</strong>
                          <span className="text-slate-600">Bebas dahan kering/rapuh, tidak menjuntai ke kabel listrik PLN atau atap gedung/tribun.</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                          3
                        </span>
                        <div>
                          <strong className="text-slate-900 block">Pemeriksaan Batang & Benalu:</strong>
                          <span className="text-slate-600">Batang kokoh tegak, bebas sarang rayap, paku/kawat liar, dan benalu parasit.</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                          4
                        </span>
                        <div>
                          <strong className="text-slate-900 block">Pemeriksaan Daun & Hama:</strong>
                          <span className="text-slate-600">Daun hijau segar terawat, tidak terserang wabah ulat bulu, kutu putih, atau jamur.</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 sm:col-span-2 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                          5
                        </span>
                        <div>
                          <strong className="text-slate-900 block">Pemeriksaan Perakaran & Kebersihan:</strong>
                          <span className="text-slate-600">Tanah perakaran stabil tidak amblas/terangkat, serta piringan lingkar pohon bersih bebas sampah.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* INPUT & UPLOAD FOTO MONITORING POHON */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <label className="block text-xs font-bold text-slate-900">
                      📸 Foto Monitoring Pohon Hari Ini:
                    </label>
                    <p className="text-[10.5px] text-slate-500">
                      Pilih jenis foto yang ingin Anda unggah agar dokumentasi akurat
                    </p>
                  </div>
                  {inspectPhotoBefore && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Foto Terkini Siap</span>
                    </span>
                  )}
                </div>

                {/* Pemilihan Jenis Foto: Foto Utuh vs Foto Detail Masalah */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectPhotoType('full_tree')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      inspectPhotoType === 'full_tree'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Camera className={`w-3.5 h-3.5 ${inspectPhotoType === 'full_tree' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>1. Foto Utuh Seluruh Pohon</span>
                    </div>
                    <div className="text-[9.5px] text-slate-500 mt-1 leading-snug">
                      Jarak 5–10 meter agar tampak tajuk atas hingga akar bawah
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectPhotoType('detail_issue')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      inspectPhotoType === 'detail_issue'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertTriangle className={`w-3.5 h-3.5 ${inspectPhotoType === 'detail_issue' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span>2. Foto Detail Temuan / Masalah</span>
                    </div>
                    <div className="text-[9.5px] text-slate-500 mt-1 leading-snug">
                      Close-up (1–2 meter) jika ada ranting lapuk, kabel, atau ulat
                    </div>
                  </button>
                </div>

                {/* Tombol Ambil / Upload Foto */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="px-3.5 py-2.5 rounded-xl border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2 transition shadow-xs">
                    <Camera className="w-4 h-4" />
                    <span>
                      {inspectPhotoBefore
                        ? inspectPhotoType === 'full_tree'
                          ? 'Ganti Foto Utuh Pohon'
                          : 'Ganti Foto Detail Temuan'
                        : inspectPhotoType === 'full_tree'
                        ? 'Ambil / Upload Foto Utuh Pohon'
                        : 'Ambil / Upload Foto Detail Temuan'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) =>
                        handlePhotoUploadGeneric(
                          e,
                          `pohon_${inspectPhotoType}_${inspectingOrder.treeName}`,
                          setIsUploadingInspectPhoto,
                          (b64, driveUrl) => {
                            setInspectPhotoBefore(b64);
                            if (driveUrl) setInspectDrivePhotoBefore(driveUrl);
                          }
                        )
                      }
                      className="hidden"
                    />
                  </label>

                  {isUploadingInspectPhoto && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-2 rounded-xl">
                      <Clock className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      <span>Mengupload foto ke Google Drive...</span>
                    </div>
                  )}

                  {inspectDrivePhotoBefore && !isUploadingInspectPhoto && (
                    <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 bg-emerald-100/80 px-2.5 py-1.5 rounded-lg border border-emerald-300">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersimpan di Google Drive</span>
                    </div>
                  )}
                </div>

                {/* KOMPARASI BERDAMPINGAN: ACUAN STANDAR VS FOTO YANG BARU DIAMBIL */}
                {inspectPhotoBefore && (
                  <div className="p-3 bg-white rounded-xl border border-slate-300/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Komparasi: Foto Acuan Standar vs Foto Jepretan Anda:</span>
                      </span>
                      <span className="text-[9.5px] font-bold text-emerald-700">
                        {inspectPhotoType === 'full_tree' ? 'Tipe: Foto Utuh Pohon' : 'Tipe: Foto Detail Temuan'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Acuan */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-bold text-slate-500 block">1. Acuan Standar Resmi:</span>
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-28">
                          {inspectingOrder.standardPhotoUrl ? (
                            <img
                              src={formatGoogleDriveImageUrl(inspectingOrder.standardPhotoUrl)}
                              alt="Acuan Standar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                              Tidak ada acuan
                            </div>
                          )}
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-900/80 text-white">
                            Standar
                          </span>
                        </div>
                      </div>

                      {/* Hasil Jepretan */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-bold text-emerald-700 block">2. Foto Hasil Jepretan Anda:</span>
                        <div className="relative rounded-xl overflow-hidden border border-emerald-400 bg-slate-100 h-28 ring-2 ring-emerald-500/20">
                          <img
                            src={formatGoogleDriveImageUrl(inspectPhotoBefore || inspectDrivePhotoBefore)}
                            alt="Hasil Pengecekan"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-600 text-white">
                            Terkini
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-950 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Pastikan foto Anda sudah menampilkan seluruh pohon dari kanopi hingga tanah seperti acuan standar.</span>
                    </div>
                  </div>
                )}
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
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
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
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
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

              {/* Opsi Tambahan jika Perlu Penanganan */}
              {inspectStatus === 'Perlu Penanganan' && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Rekomendasi Tindakan Penanganan</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tindakan Penanganan yang Dibutuhkan:
                    </label>
                    <select
                      value={inspectTreatmentNeeded}
                      onChange={(e) => setInspectTreatmentNeeded(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="Penjarangan Kanopi Rimbun">Penjarangan Kanopi Rimbun</option>
                      <option value="Pemangkasan Dahan Rendah / Rawan">Pemangkasan Dahan Rendah / Rawan</option>
                      <option value="Pemotongan Dahan Dekat Kabel">Pemotongan Dahan Dekat Kabel</option>
                      <option value="Tebang Habis (Pohon Mati / Bahaya)">Tebang Habis (Pohon Mati / Bahaya)</option>
                      <option value="Pembersihan Benalu / Parasit">Pembersihan Benalu / Parasit</option>
                      <option value="Pemberian Penyangga Batang Miring">Pemberian Penyangga Batang Miring</option>
                      <option value="Penyemprotan Hama Ulat / Jamur">Penyemprotan Hama Ulat / Jamur</option>
                    </select>
                  </div>

                  {/* Pilihan Pelaksana Penanganan: Vendor Luar vs Tim Internal PLH */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
                      Pelaksana Penanganan yang Ditugaskan:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectHandlerType('Internal PLH')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                          inspectHandlerType === 'Internal PLH'
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${inspectHandlerType === 'Internal PLH' ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span>Tim Internal PLH</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                          Pekerjaan mandiri oleh tim lapangan PLH
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectHandlerType('Vendor Luar')}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                          inspectHandlerType === 'Vendor Luar'
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Building2 className={`w-3.5 h-3.5 ${inspectHandlerType === 'Vendor Luar' ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span>Vendor Luar</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 leading-snug">
                          Pekerjaan pohon besar, butuh crane / chainsaw
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Jika Vendor Luar: Form Estimasi Biaya & Nama Vendor */}
                  {inspectHandlerType === 'Vendor Luar' && (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                            Nama Vendor / Rekanan (Opsional):
                          </label>
                          <input
                            type="text"
                            value={inspectVendorName}
                            onChange={(e) => setInspectVendorName(e.target.value)}
                            placeholder="Contoh: CV Spesialis Pohon Lestari"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                            Estimasi Anggaran Biaya (Rp):
                          </label>
                          <input
                            type="number"
                            value={inspectVendorCost}
                            onChange={(e) => setInspectVendorCost(e.target.value)}
                            placeholder="Contoh: 1500000"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-medium text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Urgensi Penanganan */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Tingkat Urgensi Penanganan:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Rendah', 'Sedang', 'Tinggi / Bahaya'] as const).map((urg) => (
                        <button
                          key={urg}
                          type="button"
                          onClick={() => setInspectUrgency(urg)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            inspectUrgency === urg
                              ? urg === 'Tinggi / Bahaya'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                                : urg === 'Sedang'
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                                : 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {urg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingInspection}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingInspection ? 'Menyimpan...' : 'Simpan Hasil Pengecekan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Update Penanganan (Laporan Hasil Tindakan & Foto After) */}
      {treatmentModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Laporan Pelaksanaan & Penanganan Pohon
                  </h3>
                  <p className="text-xs text-slate-500">
                    {treatmentModalOrder.area} • {treatmentModalOrder.treeName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTreatmentModalOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTreatment} className="mt-4 space-y-3.5 text-xs text-slate-700">
              {/* Info Pohon & Rekomendasi Tindakan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Kondisi Pohon:</span>
                  <span className="font-extrabold text-slate-900">{treatmentModalOrder.condition}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Rencana Tindakan:</span>
                  <span className="font-extrabold text-slate-900">{treatmentModalOrder.treatmentNeeded}</span>
                </div>
              </div>

              {/* Status Penanganan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Update Status Penanganan Saat Ini:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTreatmentStatus('Belum Ditangani')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      treatmentStatus === 'Belum Ditangani'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Belum Ditangani</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreatmentStatus('Sedang Ditangani')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      treatmentStatus === 'Sedang Ditangani'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Sedang Ditangani</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreatmentStatus('Sudah Ditangani')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      treatmentStatus === 'Sudah Ditangani'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sudah Ditangani</span>
                  </button>
                </div>
              </div>

              {/* Pelaksana & Waktu Penanganan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nama Petugas / Tim Pelaksana Penanganan:
                  </label>
                  <input
                    type="text"
                    value={treatmentHandledByName}
                    onChange={(e) => setTreatmentHandledByName(e.target.value)}
                    placeholder="Contoh: Petugas Khaldun (PLH) / Vendor CV Pohon Asri"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tanggal & Waktu Pengerjaan:
                  </label>
                  <input
                    type="text"
                    value={treatmentHandledAt}
                    onChange={(e) => setTreatmentHandledAt(e.target.value)}
                    placeholder="2026-09-24 (10:30 WIB)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Laporan Keterangan Penanganan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Laporan Hasil Penanganan (Rincian Pekerjaan):
                </label>
                <textarea
                  rows={3}
                  value={treatmentReportText}
                  onChange={(e) => setTreatmentReportText(e.target.value)}
                  placeholder="Contoh: Telah dilakukan pemangkasan dahan kering sebanyak 4 cabang di bagian barat. Sampah ranting sudah dibersihkan dan diangkut ke komposter..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Komparasi Foto Sebelum vs Sesudah di Modal Penanganan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block">
                  Dokumentasi Foto Before & After (Tersimpan ke Google Drive):
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Foto Before */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      📸 1. Foto Sebelum (Before)
                    </span>
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-200 h-28 flex items-center justify-center">
                      {treatmentModalOrder.photoBeforeUrl || treatmentModalOrder.drivePhotoBeforeUrl ? (
                        <>
                          <img
                            src={formatGoogleDriveImageUrl(treatmentModalOrder.photoBeforeUrl || treatmentModalOrder.drivePhotoBeforeUrl)}
                            alt="Before"
                            className="w-full h-full object-cover"
                          />
                          {(treatmentModalOrder.drivePhotoBeforeUrl || treatmentModalOrder.photoBeforeUrl?.startsWith('http')) && (
                            <a
                              href={getGoogleDriveViewLink(treatmentModalOrder.drivePhotoBeforeUrl || treatmentModalOrder.photoBeforeUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-1 right-1 p-1 rounded bg-black/70 text-white text-[8px] flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Drive</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">Belum ada foto sebelum</span>
                      )}
                    </div>
                  </div>

                  {/* Foto After */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      📸 2. Foto Sesudah (After Penanganan)
                    </span>
                    <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-200 h-28 flex items-center justify-center">
                      {treatmentPhotoAfter || treatmentDrivePhotoAfter ? (
                        <>
                          <img
                            src={formatGoogleDriveImageUrl(treatmentPhotoAfter || treatmentDrivePhotoAfter)}
                            alt="After"
                            className="w-full h-full object-cover"
                          />
                          {(treatmentDrivePhotoAfter || treatmentPhotoAfter?.startsWith('http')) && (
                            <a
                              href={getGoogleDriveViewLink(treatmentDrivePhotoAfter || treatmentPhotoAfter)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-1 right-1 p-1 rounded bg-black/70 text-white text-[8px] flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>Drive</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-[9px] text-slate-400 italic block mb-1">Belum ada foto sesudah</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="w-full py-1.5 px-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-[10.5px] font-bold cursor-pointer flex items-center justify-center gap-1 shadow-xs transition">
                        <Camera className="w-3 h-3 text-emerald-600" />
                        <span>{treatmentPhotoAfter ? 'Ganti Foto After' : '+ Upload Foto After'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) =>
                            handlePhotoUploadGeneric(
                              e,
                              `penanganan_after_${treatmentModalOrder.treeName}`,
                              setIsUploadingTreatmentPhoto,
                              (b64, driveUrl) => {
                                setTreatmentPhotoAfter(b64);
                                if (driveUrl) setTreatmentDrivePhotoAfter(driveUrl);
                              }
                            )
                          }
                          className="hidden"
                        />
                      </label>
                    </div>

                    {isUploadingTreatmentPhoto && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Mengupload foto After ke Google Drive...</span>
                      </div>
                    )}
                    {treatmentDrivePhotoAfter && (
                      <span className="text-[9.5px] text-emerald-700 font-bold block">
                        ✓ Foto After tersimpan di Google Drive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTreatmentModalOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Laporan Penanganan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 📜 Riwayat & History Pengecekan Lengkap Pohon */}
      {historyModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Riwayat Pemeriksaan & Penanganan Pohon</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {historyModalOrder.inspectionHistory?.length || 0} Log Catatan
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {historyModalOrder.area} • {historyModalOrder.treeName} • Penanggung Jawab: {sanitizePlhStaffName(historyModalOrder.assignedStaffName, historyModalOrder.area) || '-'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Header Action Bar */}
            <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-slate-800">
                  Status Terkini: <span className="text-emerald-700">{historyModalOrder.treatmentStatus || (historyModalOrder.status === 'Selesai' ? 'Sudah Ditangani' : historyModalOrder.status)}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Kondisi: <strong>{historyModalOrder.condition}</strong> • Pemeriksaan Terakhir: {historyModalOrder.lastCheckedDate || historyModalOrder.date} oleh {sanitizePlhStaffName(historyModalOrder.lastCheckedByName || historyModalOrder.reportedByName, historyModalOrder.area)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openTreatmentModal(historyModalOrder)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>+ Update Penanganan</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printHtmlAsPdf(
                      generateTreeHistoryReportPdf(historyModalOrder),
                      `Laporan_Riwayat_${historyModalOrder.id}`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Unduh PDF Riwayat</span>
                </button>
              </div>
            </div>

            {/* Komparasi Foto Before & After Banner di Modal Riwayat */}
            {(historyModalOrder.photoBeforeUrl || historyModalOrder.photoAfterUrl) && (
              <div className="mt-3 p-3 bg-gradient-to-r from-slate-50 to-emerald-50/50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Komparasi Foto Before & After (Terkoneksi Google Drive):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openCompareModal(historyModalOrder)}
                    className="text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Lihat Ukuran Penuh</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative rounded-xl overflow-hidden border border-amber-200 bg-white h-36 flex items-center justify-center group">
                    {historyModalOrder.photoBeforeUrl || historyModalOrder.drivePhotoBeforeUrl ? (
                      <>
                        <img
                          src={formatGoogleDriveImageUrl(historyModalOrder.photoBeforeUrl || historyModalOrder.drivePhotoBeforeUrl)}
                          alt="Before"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200 cursor-pointer"
                          onClick={() => openCompareModal(historyModalOrder)}
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-600 text-white shadow-xs">
                          BEFORE (TEMUAN AWAL)
                        </span>
                        {(historyModalOrder.drivePhotoBeforeUrl || historyModalOrder.photoBeforeUrl?.startsWith('http')) && (
                          <a
                            href={getGoogleDriveViewLink(historyModalOrder.drivePhotoBeforeUrl || historyModalOrder.photoBeforeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/80 hover:bg-black text-white text-[9px] font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka di Drive</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Belum ada foto sebelum</span>
                    )}
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-white h-36 flex items-center justify-center group">
                    {historyModalOrder.photoAfterUrl || historyModalOrder.drivePhotoAfterUrl ? (
                      <>
                        <img
                          src={formatGoogleDriveImageUrl(historyModalOrder.photoAfterUrl || historyModalOrder.drivePhotoAfterUrl)}
                          alt="After"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200 cursor-pointer"
                          onClick={() => openCompareModal(historyModalOrder)}
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white shadow-xs">
                          AFTER (HASIL PENANGANAN)
                        </span>
                        {(historyModalOrder.drivePhotoAfterUrl || historyModalOrder.photoAfterUrl?.startsWith('http')) && (
                          <a
                            href={getGoogleDriveViewLink(historyModalOrder.drivePhotoAfterUrl || historyModalOrder.photoAfterUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/80 hover:bg-black text-white text-[9px] font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka di Drive</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="text-center p-3">
                        <span className="text-[10px] text-slate-400 italic block mb-1">Belum ada foto sesudah penanganan</span>
                        <button
                          type="button"
                          onClick={() => openTreatmentModal(historyModalOrder)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                        >
                          + Upload Foto After
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Daftar Pemeriksaan & Penanganan */}
            <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1 space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Timeline Riwayat Pemeriksaan Petugas PLH:
              </span>

              {!historyModalOrder.inspectionHistory || historyModalOrder.inspectionHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs italic">
                  Belum ada log riwayat pemeriksaan tersimpan untuk pohon ini.
                </div>
              ) : (
                historyModalOrder.inspectionHistory.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 transition space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {formatJakartaDisplayDate(rec.date)} {rec.time ? `• ${rec.time}` : ''}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Pemeriksa: <strong className="text-slate-700">{sanitizePlhStaffName(rec.inspectorName, historyModalOrder.area)}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            rec.checkStatus === 'Sudah Dicek Aman' || rec.checkStatus === 'Sudah Ditangani'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : rec.checkStatus === 'Perlu Penanganan'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {rec.checkStatus}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                          {rec.condition}
                        </span>
                      </div>
                    </div>

                    {rec.notes && (
                      <div className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-[9.5px] font-bold text-slate-500 block uppercase">Catatan Pemeriksaan:</span>
                        <p className="italic text-[11px] mt-0.5">"{rec.notes}"</p>
                      </div>
                    )}

                    {/* Jika ada informasi tindakan penanganan di log ini */}
                    {(rec.treatmentReport || rec.handledByName) && (
                      <div className="text-xs bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900">
                          <span>PELAKSANAAN TINDAKAN:</span>
                          <span>{rec.handledAt || '-'}</span>
                        </div>
                        <div className="text-[11px]">
                          <strong>Dikerjakan oleh:</strong> {sanitizePlhStaffName(rec.handledByName, historyModalOrder.area) || '-'}
                        </div>
                        {rec.treatmentReport && (
                          <p className="italic text-[10.5px] text-emerald-900 bg-white/80 p-1.5 rounded-lg border border-emerald-100">
                            "{rec.treatmentReport}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setHistoryModalOrder(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Tutup Riwayat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Komparasi Foto Before & After Ukuran Penuh */}
      {compareModalOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Komparasi Foto Before & After Penanganan
                  </h3>
                  <p className="text-xs text-slate-500">
                    {compareModalOrder.area} • {compareModalOrder.treeName} • Status: {compareModalOrder.treatmentStatus || compareModalOrder.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom Before */}
              <div className="border border-amber-300 rounded-2xl p-3 bg-amber-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-600 text-white uppercase">
                      📸 BEFORE (TEMUAN AWAL)
                    </span>
                    {compareModalOrder.drivePhotoBeforeUrl && (
                      <a
                        href={compareModalOrder.drivePhotoBeforeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka di Google Drive</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Kondisi Awal: <strong>{compareModalOrder.condition}</strong> • Kebutuhan: {compareModalOrder.treatmentNeeded}
                  </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-100 min-h-64 flex items-center justify-center">
                  {compareModalOrder.photoBeforeUrl || compareModalOrder.drivePhotoBeforeUrl ? (
                    <img
                      src={formatGoogleDriveImageUrl(compareModalOrder.photoBeforeUrl || compareModalOrder.drivePhotoBeforeUrl)}
                      alt="Before Full"
                      className="w-full max-h-80 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Belum ada foto sebelum penanganan</span>
                  )}
                </div>
              </div>

              {/* Kolom After */}
              <div className="border border-emerald-300 rounded-2xl p-3 bg-emerald-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white uppercase">
                      📸 AFTER (SESUDAH PENANGANAN)
                    </span>
                    {compareModalOrder.drivePhotoAfterUrl && (
                      <a
                        href={compareModalOrder.drivePhotoAfterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka di Google Drive</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Pelaksana: <strong>{sanitizePlhStaffName(compareModalOrder.handledByName || compareModalOrder.completedByName, compareModalOrder.area) || '-'}</strong> {compareModalOrder.handledAt ? `(${compareModalOrder.handledAt})` : ''}
                  </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-100 min-h-64 flex items-center justify-center">
                  {compareModalOrder.photoAfterUrl || compareModalOrder.drivePhotoAfterUrl ? (
                    <img
                      src={formatGoogleDriveImageUrl(compareModalOrder.photoAfterUrl || compareModalOrder.drivePhotoAfterUrl)}
                      alt="After Full"
                      className="w-full max-h-80 object-contain"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-xs text-slate-400 italic block mb-2">Belum ada foto sesudah penanganan</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCompareModalOrder(null);
                          openTreatmentModal(compareModalOrder);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                      >
                        + Upload Foto After Penanganan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {compareModalOrder.treatmentReport && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <span className="font-extrabold text-slate-700 uppercase block text-[10px] mb-1">
                  Catatan Laporan Penanganan:
                </span>
                <p className="text-slate-800 italic">"{compareModalOrder.treatmentReport}"</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setCompareModalOrder(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Tutup Komparasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Gambar Penuh (Lightbox Foto Standar) */}
      {showFullStandardPhoto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 bg-slate-900/90 flex items-center justify-between border-b border-slate-800 text-white text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Camera className="w-4 h-4" />
                <span>Foto Acuan Standar Resmi Lazuardi</span>
              </span>
              <button
                type="button"
                onClick={() => setShowFullStandardPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/50 max-h-[75vh]">
              <img
                src={formatGoogleDriveImageUrl(showFullStandardPhoto)}
                alt="Foto Acuan Penuh"
                className="max-h-[70vh] max-w-full object-contain rounded-xl"
              />
            </div>
            <div className="p-3 bg-slate-900 text-slate-300 text-[11px] text-center border-t border-slate-800">
              Gunakan foto ini sebagai tolok ukur sudut dan jarak saat mengambil foto monitoring di lapangan.
            </div>
          </div>
        </div>
      )}

      {/* Modal Standar & Panduan Foto Pohon Lengkap (SOP 5 Poin PLH) */}
      {selectedTreeGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-emerald-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                    <span>Standar & Panduan Foto Pohon</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      SOP Resmi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedTreeGuide.area} • <strong className="text-slate-800">{selectedTreeGuide.treeName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTreeGuide(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700 overflow-y-auto pr-1">
              {/* Foto Acuan HD */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>1. Foto Acuan Standar Resmi (Benchmark):</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openBenchmarkModal(selectedTreeGuide)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-xs transition"
                      title="Ganti foto acuan standar dengan link Google Drive"
                    >
                      <Edit3 className="w-3 h-3 text-slate-950" />
                      <span>Ganti Pakai URL Drive</span>
                    </button>
                    <span className="text-[10px] text-emerald-700 font-bold hidden sm:inline">
                      Tolok Ukur Sudut
                    </span>
                  </div>
                </div>

                {selectedTreeGuide.standardPhotoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-slate-900 h-56 sm:h-64 shadow-md group">
                    <img
                      src={formatGoogleDriveImageUrl(selectedTreeGuide.standardPhotoUrl)}
                      alt="Foto Standar"
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 p-3 flex flex-col justify-between">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openBenchmarkModal(selectedTreeGuide)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] flex items-center gap-1 backdrop-blur-xs cursor-pointer shadow-xs"
                          title="Ganti foto acuan standar dengan link Google Drive"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Ganti URL Drive</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFullStandardPhoto(selectedTreeGuide.standardPhotoUrl!)}
                          className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white font-bold text-[10px] flex items-center gap-1 backdrop-blur-xs cursor-pointer shadow-xs"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Perbesar Foto</span>
                        </button>
                      </div>
                      <div className="text-white space-y-0.5">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white inline-block">
                          Foto Acuan Lazuardi
                        </span>
                        <h4 className="text-sm font-bold">{selectedTreeGuide.treeName}</h4>
                        <p className="text-[10.5px] text-slate-200">{selectedTreeGuide.area}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 flex flex-col items-center justify-center text-emerald-800 p-4 text-center">
                    <TreePine className="w-8 h-8 mb-1.5 text-emerald-600" />
                    <span className="font-bold">Foto Acuan Standar Belum Diunggah</span>
                    <span className="text-[11px] text-slate-500 mt-1 mb-2">Gunakan foto pohon utuh dari jarak 5–10 meter.</span>
                    <button
                      type="button"
                      onClick={() => openBenchmarkModal(selectedTreeGuide)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Input URL Foto Drive</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Panduan Sudut & Jarak Pengambilan */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-[10.5px] font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>2. Panduan Sudut & Jarak Pengambilan Foto (Agar Pohon Tampak Utuh):</span>
                </span>
                <p className="text-xs font-bold text-emerald-950 leading-relaxed bg-white/90 p-3 rounded-xl border border-emerald-200">
                  {selectedTreeGuide.standardPhotoAngleGuide ||
                    'Ambil foto dari jarak 5–10 meter agar seluruh profil pohon tampak utuh (kanopi atas, batang utama, dan perakaran bawah).'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] text-slate-700 pt-1">
                  <div className="p-2 rounded-lg bg-white/80 border border-emerald-100 flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Jarak Ideal:</strong> Mundur sejauh 5–10 meter agar pucuk kanopi atas hingga pangkal akar tanah masuk ke frame.</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 border border-emerald-100 flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Pencahayaan:</strong> Ambil foto saat pagi (06:30–09:00) atau sore (15:00–16:30) agar tidak silau backlight.</span>
                  </div>
                </div>
              </div>

              {/* 5 Standar Operasional Prosedur (SOP) Pemeriksaan Pohon */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>3. Standar SOP Pemeriksaan Pohon Lazuardi (5 Poin):</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">Wajib Dicek</span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      num: '1',
                      title: 'Foto Utuh Seluruh Pohon',
                      desc: 'Ambil foto dari jarak 5–10 meter agar seluruh pohon tampak utuh (kanopi atas, batang utama, dan perakaran bawah).',
                    },
                    {
                      num: '2',
                      title: 'Pemeriksaan Kanopi & Dahan',
                      desc: 'Periksa kerimbunan daun, pastikan bebas dahan rapuh/kering yang rawan patah atau menjuntai ke kabel listrik PLN/atap.',
                    },
                    {
                      num: '3',
                      title: 'Pemeriksaan Batang & Benalu',
                      desc: 'Pastikan batang kokoh tegak, bebas dari sarang rayap, lubang lapuk berongga, dan benalu parasit.',
                    },
                    {
                      num: '4',
                      title: 'Pemeriksaan Daun & Hama',
                      desc: 'Amati kesegaran daun, pastikan tidak terserang hama ulat bulu, kutu putih, atau jamur daun.',
                    },
                    {
                      num: '5',
                      title: 'Pemeriksaan Perakaran & Kebersihan',
                      desc: 'Pastikan tanah perakaran stabil tidak gembur/amblas, serta sekeliling piringan pohon bersih dari serasah sampah.',
                    },
                  ].map((sop) => (
                    <div key={sop.num} className="p-2.5 rounded-xl bg-white border border-slate-200/90 flex items-start gap-2.5 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {sop.num}
                      </span>
                      <div>
                        <strong className="text-slate-900 text-xs block">{sop.title}</strong>
                        <p className="text-[11px] text-slate-600 leading-snug">{sop.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 mt-3">
              <button
                type="button"
                onClick={() => setSelectedTreeGuide(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup Panduan
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetOrder = selectedTreeGuide;
                  setSelectedTreeGuide(null);
                  openInspectionModal(targetOrder);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Ceklis & Foto Pohon Ini ↗</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit / Update Foto Acuan Standar Resmi (Benchmark URL Drive / Upload) */}
      {editingBenchmarkTree && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-emerald-100 max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                    <span>Ganti Foto Acuan Standar (Benchmark)</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Tersimpan di Database & Sheet
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingBenchmarkTree.area} • <strong className="text-slate-800">{editingBenchmarkTree.treeName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBenchmarkTree(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBenchmark} className="mt-4 space-y-4 overflow-y-auto pr-1">
              {/* Petunjuk Penggunaan Link Drive */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Apakah ini tersimpan di database?</span>
                </div>
                <p className="leading-relaxed">
                  <strong>Ya, tersimpan langsung di database aplikasi & Google Sheets (Tab WorkOrder_Pohon Kolom AG).</strong> Anda dapat menempelkan URL file foto Google Drive di bawah ini atau mengunggah langsung dari galeri/kamera.
                </p>
              </div>

              {/* Input URL Google Drive */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    URL Foto Acuan di Google Drive:
                  </label>
                  <span className="text-[10px] font-medium text-slate-500">
                    Mendukung link share Drive ("Anyone with link")
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={benchmarkInputUrl}
                    onChange={(e) => setBenchmarkInputUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1a2b3c4d5e.../view?usp=sharing"
                    className="w-full pl-3 pr-20 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  {benchmarkInputUrl && (
                    <button
                      type="button"
                      onClick={() => setBenchmarkInputUrl('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <p className="text-[10.5px] text-slate-500 italic">
                  Format link Google Drive (view link, export=view, atau lh3) otomatis dikonversi menjadi gambar tampilan resmi.
                </p>
              </div>

              {/* Atau Unggah Foto Baru ke Google Drive */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Atau Ambil / Unggah Foto Acuan Baru (Otomatis Masuk Drive):
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition shadow-2xs">
                    <Camera className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{benchmarkInputUrl ? 'Unggah Ganti Foto' : 'Pilih Foto dari Galeri / Kamera'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) =>
                        handlePhotoUploadGeneric(
                          e,
                          `benchmark_${editingBenchmarkTree.treeName || 'pohon'}`,
                          setIsUploadingBenchmarkPhoto,
                          (b64, driveUrl) => {
                            if (driveUrl) {
                              setBenchmarkInputUrl(driveUrl);
                            } else if (b64) {
                              setBenchmarkInputUrl(b64);
                            }
                          }
                        )
                      }
                      className="hidden"
                    />
                  </label>

                  {isUploadingBenchmarkPhoto && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah ke Google Drive...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview Foto Acuan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Live Preview Foto Acuan Standar:
                </label>
                {benchmarkInputUrl.trim() ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-300 bg-slate-900 h-48 sm:h-56 shadow-inner group">
                    <img
                      src={formatGoogleDriveImageUrl(benchmarkInputUrl)}
                      alt="Preview Foto Acuan"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-700/90 text-white shadow-xs backdrop-blur-xs">
                        ✓ Preview Berhasil Ditampilkan
                      </span>
                      {benchmarkInputUrl.includes('drive.google.com') && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-sky-700/90 text-white shadow-xs backdrop-blur-xs">
                          Google Drive Link
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-36 rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 p-3 text-center">
                    <TreePine className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-xs font-bold">Belum Ada URL Foto Acuan</span>
                    <span className="text-[10.5px] text-slate-400 mt-0.5">
                      Tempel URL Drive di atas atau klik unggah untuk melihat pratinjau.
                    </span>
                  </div>
                )}
              </div>

              {/* Panduan Sudut & Jarak Pengambilan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Panduan Sudut & Jarak Pengambilan (Instruksi Staf):
                </label>
                <textarea
                  rows={2}
                  value={benchmarkInputAngle}
                  onChange={(e) => setBenchmarkInputAngle(e.target.value)}
                  placeholder="Contoh: Foto dari jarak 6–8 meter arah jalan utama. Seluruh tajuk atas dekat kabel PLN dan batang pohon tampak utuh."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500 font-bold">Template Cepat:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setBenchmarkInputAngle(
                        'Foto dari jarak 5–10 meter agar seluruh profil pohon tampak utuh dari pucuk kanopi atas hingga pangkal akar tanah.'
                      )
                    }
                    className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                  >
                    + Jarak 5-10m Utuh
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBenchmarkInputAngle(
                        'Foto dari samping jarak 7 meter. Perhatikan jarak dahan ke kabel listrik PLN dan bangunan atap terdekat.'
                      )
                    }
                    className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                  >
                    + Cek Jarak Kabel PLN
                  </button>
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingBenchmarkTree(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingBenchmark}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingBenchmark ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Foto Acuan ke Database</span>
                    </>
                  )}
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
                          `mt-plh-01\tPenyiraman & Pemupukan Rutin Tanaman\tSemua Unit\tHarian\tpre_readiness\t1. Siapkan selang dan nozzle semprot\n2. Siram area taman merata sebelum terik matahari\n3. Bersihkan daun kering di pot\tYA\tAktif\tArea Pos 1\tSemua Petugas\thttps://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600\tPLH
mt-plh-02\tPemangkasan Rumput & Pruning Dahan Bawah\tSemua Unit\tMingguan\tanytime\t1. Gunakan mesin potong rumput safety APD\n2. Potong rumput dengan ketinggian rata 3 cm\n3. Sapu dan masukkan sisa rumput ke bak kompos\tYA\tAktif\tArea Pos 2\tSemua Petugas\thttps://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=600\tPLH`
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

      {/* Modal Notifikasi Sukses / Hasil Pemeriksaan & Penanganan (Pengganti Alert) */}
      {feedbackNotification && feedbackNotification.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-slate-800 border border-emerald-200 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-md ${
                  feedbackNotification.type === 'error'
                    ? 'bg-rose-100 text-rose-600'
                    : feedbackNotification.type === 'info'
                    ? 'bg-sky-100 text-sky-600'
                    : 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50'
                }`}
              >
                {feedbackNotification.type === 'error' ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
              </div>

              <h3 className="text-base font-black text-slate-900">
                {feedbackNotification.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs">
                {feedbackNotification.message}
              </p>
            </div>

            {(feedbackNotification.treeName || feedbackNotification.notes) && (
              <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                {feedbackNotification.treeName && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Nama Pohon:</span>
                    <span className="font-extrabold text-slate-900 text-right">
                      {feedbackNotification.treeName}
                    </span>
                  </div>
                )}
                {feedbackNotification.area && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Wilayah / Area:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                      {feedbackNotification.area}
                    </span>
                  </div>
                )}
                {feedbackNotification.statusText && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">Status Ceklis:</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded-md text-[11px] ${
                        feedbackNotification.statusText === 'Perlu Penanganan'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {feedbackNotification.statusText}
                    </span>
                  </div>
                )}
                {feedbackNotification.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-bold block text-[11px] mb-0.5">
                      Catatan / Noted Pemeriksaan:
                    </span>
                    <p className="text-slate-800 font-medium italic bg-white p-2.5 rounded-xl border border-slate-200/80">
                      "{feedbackNotification.notes}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {feedbackNotification.syncNote && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackNotification.syncNote}</span>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setFeedbackNotification(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm transition"
              >
                Tutup & Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Database Sample 15 Pohon Resmi per 5 Area (WorkOrder_Pohon) */}
      {showSampleTreesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <TreePine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Database Sample 15 Pohon Resmi Lazuardi GCS
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftar master pohon resmi per 5 area tanggung jawab PLH untuk sheet <strong>WorkOrder_Pohon</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSampleTreesModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {PLH_AREAS.map((areaName) => {
                const areaTrees = orders.filter((o) => o.area === areaName);
                const areaStaff = DEFAULT_PLH_AREA_STAFF[areaName] || 'Petugas PLH';

                return (
                  <div key={areaName} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{areaName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {areaTrees.length} Pohon
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        PJ Area: <strong>{areaStaff}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {areaTrees.map((t, idx) => (
                        <div key={t.id || idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex flex-col justify-between shadow-2xs">
                          <div>
                            <div className="font-bold text-slate-800 line-clamp-2">{t.treeName}</div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Kondisi: <strong className="text-emerald-700">{t.condition}</strong>
                            </div>
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-mono">{t.id}</span>
                            <span className="text-emerald-700 font-bold">{t.checkStatusToday || 'Sudah Dicek'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetTo15OfficialTrees}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                title="Muat ulang ke data awal 15 pohon resmi jika terjadi perubahan yang keliru"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Database ke 15 Pohon Default</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowSampleTreesModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isSyncingAllTrees}
                  onClick={handleSyncAll15TreesToSheets}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncingAllTrees ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Sheet...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan ke Google Sheet WorkOrder_Pohon</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Filter & Unduh Dokumen PDF History Penanganan (Dari bulan apa sampai bulan apa) */}
      {showPdfFilterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 my-8 animate-in fade-in zoom-in-95 duration-200 border border-emerald-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Unduh Dokumen PDF History Penanganan Pohon
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Format Resmi Yayasan Lazuardi FM • Lengkap dengan seluruh riwayat pemeriksaan & penanganan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfFilterModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              {/* Filter Wilayah / Area */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  1. Pilih Wilayah / Area Tanggung Jawab:
                </label>
                <select
                  value={pdfAreaSelection}
                  onChange={(e) => setPdfAreaSelection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Semua">🌳 Seluruh 5 Wilayah PLH Lazuardi (Semua Pohon)</option>
                  {PLH_AREAS.map((a) => (
                    <option key={a} value={a}>
                      📍 {a} {DEFAULT_PLH_AREA_STAFF[a] ? `(PJ: ${DEFAULT_PLH_AREA_STAFF[a].name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Periode Bulan: Dari Bulan Apa Sampai Bulan Apa */}
              <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-sky-950 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-700" />
                    <span>2. Filter Rentang Bulan (Dari Bulan Apa s/d Bulan Apa):</span>
                  </label>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                    Sesuai Permintaan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Dari Bulan:
                    </label>
                    <input
                      type="month"
                      value={pdfStartMonth}
                      onChange={(e) => setPdfStartMonth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Sampai Bulan:
                    </label>
                    <input
                      type="month"
                      value={pdfEndMonth}
                      onChange={(e) => setPdfEndMonth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Quick Period Buttons */}
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold mr-1">Pilihan Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfStartMonth('');
                      setPdfEndMonth('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer transition ${
                      !pdfStartMonth && !pdfEndMonth
                        ? 'bg-sky-600 text-white border-sky-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Semua Riwayat (All Time)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const cur = `${d.getFullYear()}-${mm}`;
                      setPdfStartMonth(cur);
                      setPdfEndMonth(cur);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Bulan Berjalan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      setPdfStartMonth(`${d.getFullYear()}-01`);
                      setPdfEndMonth(`${d.getFullYear()}-12`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Tahun 2026 Penuh
                  </button>
                </div>
              </div>

              {/* Filter Pelaksana Penanganan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  3. Filter Pelaksana Penanganan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Semua', 'Internal PLH', 'Vendor Luar'] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setPdfHandlerSelection(h)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                        pdfHandlerSelection === h
                          ? h === 'Vendor Luar'
                            ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 shadow-2xs'
                            : h === 'Internal PLH'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {h === 'Semua' ? 'Semua Penanganan' : h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview info ringkasan */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Wilayah Terpilih:</span>
                  <strong className="text-slate-900">{pdfAreaSelection === 'Semua' ? 'Seluruh 5 Wilayah' : pdfAreaSelection}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Rentang Periode Bulan:</span>
                  <strong className="text-sky-700">
                    {pdfStartMonth || pdfEndMonth
                      ? `${pdfStartMonth ? `Bulan ${pdfStartMonth}` : 'Awal'} s/d ${pdfEndMonth ? `Bulan ${pdfEndMonth}` : 'Sekarang'}`
                      : 'Semua Riwayat (All Time)'}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Filter Penanganan:</span>
                  <strong className="text-emerald-700">{pdfHandlerSelection}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPdfFilterModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleGenerateFilteredPdf}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Unduh & Cetak Dokumen PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
