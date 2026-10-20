import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  TrendingUp,
  MapPin,
  Filter,
  Plus,
  Image as ImageIcon,
  Award,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { AdhocDailyTask, User } from '../types';
import { StorageService } from '../services/storage';
import { GoogleSheetsService } from '../services/googleSheets';
import { getJakartaDateString, formatJakartaDisplayDate, isSameDay } from '../utils/dateHelper';
import { formatGoogleDriveImageUrl } from '../utils/driveHelper';

interface InitiativeDiagramSectionProps {
  activeUser: User;
  allUsers: User[];
  isCoordinator?: boolean;
  isAdmin?: boolean;
}

export const InitiativeDiagramSection: React.FC<InitiativeDiagramSectionProps> = ({
  activeUser,
  allUsers,
  isCoordinator = false,
  isAdmin = false,
}) => {
  const todayStr = getJakartaDateString();

  // Filter mode: perhari, mingguan, bulanan, custom
  const [filterMode, setFilterMode] = useState<'perhari' | 'mingguan' | 'bulanan' | 'custom'>('perhari');
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [divisionFilter, setDivisionFilter] = useState<'Semua' | 'PLH' | 'OB'>('PLH');

  // Adhoc tasks data state
  const [adhocTasks, setAdhocTasks] = useState<AdhocDailyTask[]>(() =>
    StorageService.getAdhocDailyTasks()
  );

  // Photo modal preview
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Add initiative modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaffId, setNewStaffId] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState('Area Khaldun');
  const [newNotes, setNewNotes] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState(30);
  const [newStatus, setNewStatus] = useState<'Selesai' | 'Sedang Dikerjakan'>('Selesai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PLH staff list for quick selection
  const plhStaffList = useMemo(() => {
    return allUsers.filter(
      (u) =>
        (u.division === 'PLH' || (u.username && u.username.includes('plh'))) &&
        u.status === 'Aktif'
    );
  }, [allUsers]);

  // Helper date range check
  const isDateInRange = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const taskDate = dateStr.slice(0, 10);

    if (filterMode === 'perhari') {
      return isSameDay(taskDate, selectedDay) || taskDate === selectedDay;
    }

    if (filterMode === 'mingguan') {
      const now = new Date(todayStr);
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      const past7Str = past7.toISOString().split('T')[0];
      return taskDate >= past7Str && taskDate <= todayStr;
    }

    if (filterMode === 'bulanan') {
      const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
      return taskDate.startsWith(currentMonthPrefix);
    }

    if (filterMode === 'custom') {
      if (customStartDate && taskDate < customStartDate) return false;
      if (customEndDate && taskDate > customEndDate) return false;
      return true;
    }

    return true;
  };

  // Filtered tasks based on timeframe and division
  const filteredTasks = useMemo(() => {
    return adhocTasks.filter((t) => {
      if (divisionFilter !== 'Semua' && (t.division || 'PLH') !== divisionFilter) {
        return false;
      }
      return isDateInRange(t.date || t.createdAt);
    });
  }, [adhocTasks, filterMode, selectedDay, customStartDate, customEndDate, divisionFilter]);

  // Group by staff to calculate initiative diagram stats
  const staffStats = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        area: string;
        tasksCount: number;
        completedCount: number;
        pendingCount: number;
        tasks: AdhocDailyTask[];
      }
    >();

    // Initialize all active PLH staff so everyone appears in the diagram
    const targetStaffs = divisionFilter === 'OB'
      ? allUsers.filter((u) => (u.division || 'OB') === 'OB' && u.role === 'user' && u.status === 'Aktif')
      : plhStaffList;

    targetStaffs.forEach((u) => {
      map.set(u.id, {
        userId: u.id,
        userName: u.name,
        area: u.assignedArea || u.unit || 'Area Lingkungan',
        tasksCount: 0,
        completedCount: 0,
        pendingCount: 0,
        tasks: [],
      });
    });

    // Populate with actual initiative tasks
    filteredTasks.forEach((t) => {
      const existing = map.get(t.userId);
      if (existing) {
        existing.tasksCount += 1;
        if (t.status === 'Selesai') existing.completedCount += 1;
        else existing.pendingCount += 1;
        existing.tasks.push(t);
      } else {
        map.set(t.userId, {
          userId: t.userId,
          userName: t.userName,
          area: t.area || 'Area Lingkungan',
          tasksCount: 1,
          completedCount: t.status === 'Selesai' ? 1 : 0,
          pendingCount: t.status === 'Sedang Dikerjakan' ? 1 : 0,
          tasks: [t],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.tasksCount - a.tasksCount);
  }, [filteredTasks, plhStaffList, allUsers, divisionFilter]);

  // Aggregate metrics
  const totalStaffWithInitiative = staffStats.filter((s) => s.tasksCount > 0).length;
  const totalInitiativeTasks = filteredTasks.length;
  const totalCompletedTasks = filteredTasks.filter((t) => t.status === 'Selesai').length;
  const maxStaffTasks = Math.max(1, ...staffStats.map((s) => s.tasksCount));
  const topStaff = staffStats[0]?.tasksCount > 0 ? staffStats[0] : null;

  // Handle save manual initiative from modal
  const handleCreateInitiative = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const staff = allUsers.find((u) => u.id === newStaffId) || activeUser;
    setIsSubmitting(true);
    const now = new Date();
    const newTask: AdhocDailyTask = {
      id: `adhoc-${Date.now()}`,
      date: filterMode === 'perhari' ? selectedDay : todayStr,
      userId: staff.id,
      userName: staff.name,
      division: (staff.division as any) || 'PLH',
      area: newArea || staff.assignedArea || 'Area Pos 1',
      title: newTitle.trim(),
      notes: newNotes.trim() || 'Inisiatif tugas mandiri tambahan lingkungan hidup.',
      estimatedMinutes: Number(newEstimatedMinutes) || 30,
      status: newStatus,
      completedAt: newStatus === 'Selesai' ? now.toISOString() : undefined,
      createdAt: now.toISOString(),
    };

    StorageService.addAdhocDailyTask(newTask);
    const updated = StorageService.getAdhocDailyTasks();
    setAdhocTasks(updated);

    // Sync to Sheets
    GoogleSheetsService.saveAdhocDailyTasksToSheets(updated).catch(console.warn);

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewNotes('');
    setIsSubmitting(false);
  };

  const getFilterLabel = () => {
    if (filterMode === 'perhari') {
      return `Hari Ini (${formatJakartaDisplayDate(selectedDay)})`;
    }
    if (filterMode === 'mingguan') {
      return '7 Hari Terakhir (Pekan Ini)';
    }
    if (filterMode === 'bulanan') {
      return `Bulan Ini (${todayStr.slice(0, 7)})`;
    }
    return `Rentang: ${customStartDate} s/d ${customEndDate}`;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6 animate-in fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1 border border-emerald-300">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Diagram & Rekap Inisiatif</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
              Divisi: {divisionFilter}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
              {getFilterLabel()}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Grafik Partisipasi Tugas Tambahan & Inisiatif Tim</span>
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl">
            Pantau dan apresiasi staf yang mengambil tugas inisiatif tambahan (mandiri) di luar rutinitas standar, seperti penyemaian bibit, pembenahan drainase, pengayakan kompos, atau perapihan darurat.
          </p>
        </div>

        {/* Action Button: Input Inisiatif Tambahan */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {(isAdmin || isCoordinator) && (
            <button
              onClick={() => {
                setNewStaffId(plhStaffList[0]?.id || activeUser.id);
                setNewArea(plhStaffList[0]?.assignedArea || 'Area Pos 1');
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Inisiatif Staf</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs: Per Hari, Mingguan, Bulanan, Custom */}
      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setFilterMode('perhari')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'perhari'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Per Hari</span>
            </button>

            <button
              onClick={() => setFilterMode('mingguan')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'mingguan'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Per Minggu</span>
            </button>

            <button
              onClick={() => setFilterMode('bulanan')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'bulanan'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Bulanan</span>
            </button>

            <button
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'custom'
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Custom Tanggal</span>
            </button>
          </div>

          {/* Division Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 font-semibold mr-1">Divisi:</span>
            {(['PLH', 'OB', 'Semua'] as const).map((div) => (
              <button
                key={div}
                onClick={() => setDivisionFilter(div)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  divisionFilter === div
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Secondary Inputs based on selected FilterMode */}
        {filterMode === 'perhari' && (
          <div className="flex items-center gap-3 pt-1 text-xs">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>Pilih Tanggal:</span>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            {selectedDay !== todayStr && (
              <button
                onClick={() => setSelectedDay(todayStr)}
                className="text-[11px] text-emerald-700 hover:underline font-bold cursor-pointer"
              >
                Reset ke Hari Ini
              </button>
            )}
          </div>
        )}

        {filterMode === 'custom' && (
          <div className="flex items-center gap-3 pt-1 text-xs flex-wrap">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>Dari:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>
        )}
      </div>

      {/* Top Matrix Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200/80 space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] uppercase font-bold tracking-wider">Staf Berinisiatif</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950">
            {totalStaffWithInitiative} <span className="text-xs font-semibold text-emerald-700">Orang</span>
          </div>
          <p className="text-[10.5px] text-emerald-700">
            {staffStats.length > 0 ? `${Math.round((totalStaffWithInitiative / staffStats.length) * 100)}% Partisipasi Tim` : '-'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Tugas Tambahan</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950">
            {totalInitiativeTasks} <span className="text-xs font-semibold text-amber-700">Tugas</span>
          </div>
          <p className="text-[10.5px] text-amber-700">
            {totalCompletedTasks} Tugas Selesai Dikerjakan
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/40 border border-sky-200/80 space-y-1">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[10px] uppercase font-bold tracking-wider">Staf Paling Aktif</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-base font-black text-sky-950 truncate" title={topStaff?.userName || '-'}>
            {topStaff ? topStaff.userName.replace(/\s*\(.*?\)/, '') : '-'}
          </div>
          <p className="text-[10.5px] text-sky-700">
            {topStaff ? `${topStaff.tasksCount} Inisiatif Dilakukan` : 'Belum ada inisiatif'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/40 border border-purple-200/80 space-y-1">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[10px] uppercase font-bold tracking-wider">Status di Database</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-base font-black text-purple-950">
            Tersimpan Aktif
          </div>
          <p className="text-[10.5px] text-purple-700">
            Tersinkron ke Sheet & Storage
          </p>
        </div>
      </div>

      {/* Visual Diagram: Horizontal Bar per Petugas */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Diagram Sebaran Inisiatif per Anggota Tim</span>
          </h4>
          <span className="text-xs text-slate-500 font-semibold">
            Urutan berdasarkan jumlah inisiatif terbanyak
          </span>
        </div>

        <div className="space-y-3 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/70">
          {staffStats.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">
              Tidak ada data staf yang terdaftar pada filter ini.
            </p>
          ) : (
            staffStats.map((st) => {
              const percentage = Math.round((st.tasksCount / maxStaffTasks) * 100);
              const hasTasks = st.tasksCount > 0;

              return (
                <div key={st.userId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          hasTasks
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {st.userName.charAt(0)}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 mr-1.5">{st.userName}</span>
                        <span className="text-[10.5px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {st.area}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasTasks ? (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-[11px] border border-emerald-300">
                            {st.tasksCount} Inisiatif
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({st.completedCount} Selesai)
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium italic">
                          Belum ada tugas tambahan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar Chart */}
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        hasTasks
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-xs'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${hasTasks ? Math.max(8, percentage) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail List of Inisiatif Tasks in Selected Period */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Daftar Pekerjaan Inisiatif pada Periode Terpilih ({filteredTasks.length})</span>
          </h4>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold">Belum ada tugas tambahan atau inisiatif yang dicatat pada periode ini.</p>
            {(isAdmin || isCoordinator) && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Catat Inisiatif Staf Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{t.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                          t.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                      <span className="font-semibold text-slate-800">{t.userName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {t.area}
                      </span>
                    </div>
                  </div>

                  {t.photoUrl && (
                    <button
                      onClick={() => setSelectedPhoto(t.photoUrl!)}
                      className="shrink-0 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer"
                      title="Lihat foto bukti"
                    >
                      <img
                        src={formatGoogleDriveImageUrl(t.photoUrl)}
                        alt="Bukti Inisiatif"
                        className="w-10 h-10 object-cover rounded-md"
                      />
                    </button>
                  )}
                </div>

                {t.notes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 italic">
                    "{t.notes}"
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Tanggal: {formatJakartaDisplayDate(t.date || t.createdAt)}</span>
                  <span>Estimasi: {t.estimatedMinutes || 30} menit</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Input Inisiatif Tambahan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Catat Inisiatif / Tugas Tambahan
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tersimpan permanen di database & masuk ke grafik diagram
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInitiative} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Pilih Staf yang Berinisiatif:
                </label>
                <select
                  value={newStaffId}
                  onChange={(e) => {
                    setNewStaffId(e.target.value);
                    const matched = allUsers.find((u) => u.id === e.target.value);
                    if (matched?.assignedArea) setNewArea(matched.assignedArea);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50 focus:bg-white"
                >
                  {(plhStaffList.length > 0 ? plhStaffList : allUsers).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — ({u.assignedArea || u.unit || u.division})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Area Lokasi Pengerjaan:
                  </label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="Contoh: Area Khaldun / Pos 2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Estimasi Waktu (Menit):
                  </label>
                  <input
                    type="number"
                    value={newEstimatedMinutes}
                    onChange={(e) => setNewEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    min="5"
                    step="5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Judul Inisiatif / Pekerjaan Tambahan:
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Misal: Penyemaian Bibit Pohon Tabebuya & Pupuk"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan / Uraian Inisiatif:
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Jelaskan tindakan inisiatif yang dilakukan staf..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Status Pekerjaan:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('Selesai')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition cursor-pointer ${
                      newStatus === 'Selesai'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    ✓ Sudah Selesai
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('Sedang Dikerjakan')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition cursor-pointer ${
                      newStatus === 'Sedang Dikerjakan'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    ⏳ Sedang Dikerjakan
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan ke Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-4 space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-900">Foto Bukti Inisiatif</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={formatGoogleDriveImageUrl(selectedPhoto)}
              alt="Bukti Inisiatif"
              className="w-full max-h-[60vh] object-contain rounded-xl bg-slate-900"
            />
          </div>
        </div>
      )}
    </div>
  );
};
