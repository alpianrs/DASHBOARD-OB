import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  MasterTask,
  TaskLog,
  JobBareng,
  DinasRequest,
  PeerInspection,
  WeeklyScore,
  SyncConfig,
} from './types';
import { StorageService } from './services/storage';
import { GoogleSheetsService } from './services/googleSheets';
import { getJakartaDateString, isSameDay } from './utils/dateHelper';
import { Navbar } from './components/Navbar';
import { UserTaskView } from './components/UserTaskView';
import { KordinatorView } from './components/KordinatorView';
import { AdminDashboard } from './components/AdminDashboard';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { LateReasonModal } from './components/LateReasonModal';
import { DinasModal } from './components/DinasModal';
import { PeerInspectionModal } from './components/PeerInspectionModal';
import { LoginModal } from './components/LoginModal';
import { SyncStatusModal } from './components/SyncStatusModal';

export default function App() {
  // App Core State
  const [activeUser, setActiveUser] = useState<User | null>(() => StorageService.getActiveUser());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [masterTasks, setMasterTasks] = useState<MasterTask[]>(() =>
    StorageService.getMasterTasks()
  );
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>(() => StorageService.getTaskLogs());
  const [jobBarengList, setJobBarengList] = useState<JobBareng[]>(() =>
    StorageService.getJobBareng()
  );
  const [dinasRequests, setDinasRequests] = useState<DinasRequest[]>(() =>
    StorageService.getDinasRequests()
  );
  const [peerInspections, setPeerInspections] = useState<PeerInspection[]>(() =>
    StorageService.getPeerInspections()
  );
  const [weeklyScores, setWeeklyScores] = useState<WeeklyScore[]>(() =>
    StorageService.getWeeklyScores()
  );
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() =>
    StorageService.getSyncConfig()
  );

  // Modals & Triggers
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isDinasModalOpen, setIsDinasModalOpen] = useState<boolean>(false);
  const [isPeerInspectionModalOpen, setIsPeerInspectionModalOpen] = useState<boolean>(false);

  // Active Task In-Progress
  const [activeTaskTarget, setActiveTaskTarget] = useState<MasterTask | null>(null);
  const [isLateTaskProgress, setIsLateTaskProgress] = useState<boolean>(false);
  const [pendingLateReason, setPendingLateReason] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isLateModalOpen, setIsLateModalOpen] = useState<boolean>(false);

  // Active Job Bareng in completion flow
  const [activeJobBarengTarget, setActiveJobBarengTarget] = useState<JobBareng | null>(null);

  // Alert Toast State
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync Connection States
  const [isConnectingSheet, setIsConnectingSheet] = useState<boolean>(true);
  const [initialSyncDone, setInitialSyncDone] = useState<boolean>(false);

  // Initial state check on mount & Background 2-Way Sync
  useEffect(() => {
    refreshAllStateFromStorage();

    // Auto pull & connect to Google Sheets immediately on initial load
    setIsConnectingSheet(true);
    GoogleSheetsService.pullFromSheets()
      .then((res) => {
        if (res.success) {
          refreshAllStateFromStorage();
          setInitialSyncDone(true);
          showToast('✅ Google Sheets terhubung & data terbaru berhasil dimuat!', 'success');
        } else {
          console.warn('Initial sheet pull:', res.message);
        }
      })
      .catch((err) => {
        console.warn('Initial sheet connection error:', err);
      })
      .finally(() => {
        setIsConnectingSheet(false);
      });

    // Auto pull on window focus (so edits in Google Sheet reflect immediately when returning to tab)
    const handleWindowFocus = () => {
      GoogleSheetsService.pullFromSheets()
        .then((res) => {
          if (res.success) {
            refreshAllStateFromStorage();
            setInitialSyncDone(true);
          }
        })
        .catch(console.warn);
    };
    window.addEventListener('focus', handleWindowFocus);

    // Periodic interval 2-way pull (every 60 seconds)
    const syncInterval = setInterval(() => {
      GoogleSheetsService.pullFromSheets()
        .then((res) => {
          if (res.success) {
            refreshAllStateFromStorage();
            setInitialSyncDone(true);
          }
        })
        .catch(console.warn);
    }, 60000);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(syncInterval);
    };
  }, []);

  // Sync state helpers
  const refreshAllStateFromStorage = () => {
    setActiveUser(StorageService.getActiveUser());
    setUsers(StorageService.getUsers());
    setMasterTasks(StorageService.getMasterTasks());
    setTaskLogs(StorageService.getTaskLogs());
    setJobBarengList(StorageService.getJobBareng());
    setDinasRequests(StorageService.getDinasRequests());
    setPeerInspections(StorageService.getPeerInspections());
    setWeeklyScores(StorageService.getWeeklyScores());
    setSyncConfig(StorageService.getSyncConfig());
  };

  // Switch User / Login handler
  const handleSelectUser = (user: User) => {
    setActiveUser(user);
    StorageService.setActiveUser(user);
    setIsLoginModalOpen(false);
    showToast(`Berhasil login sebagai ${user.name} (${user.role.toUpperCase()})`);
  };

  // Logout handler
  const handleLogout = () => {
    StorageService.clearActiveUser();
    setActiveUser(null);
    setIsLoginModalOpen(false);
    showToast('Anda telah keluar dari akun.', 'info');
  };

  // Start Task Handler
  const handleStartTask = (task: MasterTask, isLate: boolean) => {
    setActiveTaskTarget(task);
    setActiveJobBarengTarget(null);
    setIsLateTaskProgress(isLate);

    const isPreReadiness =
      task.timingType === 'pre_readiness' ||
      (task.category && task.category.toLowerCase().includes('pre')) ||
      (task.title && task.title.toLowerCase().includes('pre-readiness'));

    if (isLate && isPreReadiness) {
      // Prompt for Late Reason first
      setIsLateModalOpen(true);
    } else {
      setPendingLateReason(null);
      setIsCameraModalOpen(true);
    }
  };

  // Late Reason Submitted
  const handleLateReasonSubmitted = async (reason: string, capturePhoto: boolean) => {
    setPendingLateReason(reason);
    setIsLateModalOpen(false);

    if (activeTaskTarget) {
      const today = getJakartaDateString();
      const timestamp = new Date().toISOString();
      const isLate = true;
      const status = 'Terlambat';

      const newLog: TaskLog = {
        id: `tl-${Date.now()}`,
        timestamp,
        date: today,
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: activeUser.role,
        unit: activeUser.unit,
        taskId: activeTaskTarget.id,
        taskTitle: activeTaskTarget.title,
        category: activeTaskTarget.category,
        timingType: activeTaskTarget.timingType,
        status,
        isLate,
        lateReason: reason,
        notes: `Alasan Keterlambatan: ${reason}`,
      };

      StorageService.addTaskLog(newLog);
      setTaskLogs(StorageService.getTaskLogs());

      // Trigger real-time direct append / update to Google Sheets
      GoogleSheetsService.logTaskToSheets(newLog).catch(console.warn);
      GoogleSheetsService.pushAllToSheets().catch(console.warn);

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      showToast(`Alasan keterlambatan "${activeTaskTarget.title}" tersimpan & tercatat di Google Sheet!`);
    }

    if (capturePhoto) {
      setIsCameraModalOpen(true);
    } else {
      setActiveTaskTarget(null);
      setPendingLateReason(null);
    }
  };

  // Photo Captured & Task Completed Handler (Optimistic UI - Instant completion)
  const handlePhotoCaptured = async (photoDataUrl: string, notes: string) => {
    const today = getJakartaDateString();
    const timestamp = new Date().toISOString();
    const targetTask = activeTaskTarget;
    const targetJob = activeJobBarengTarget;
    const isLate = isLateTaskProgress;
    const status = isLate ? 'Terlambat' : 'Selesai';
    const reason = pendingLateReason || undefined;

    // Reset modals and active targets immediately
    setActiveTaskTarget(null);
    setActiveJobBarengTarget(null);
    setPendingLateReason(null);

    const filename = `LZ_PROOF_${activeUser.unit}_${activeUser.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;

    if (targetJob) {
      // 1. Optimistic immediate local save for Job Bareng
      const updatedJob: JobBareng = {
        ...targetJob,
        completedUserIds: Array.from(
          new Set([...targetJob.completedUserIds, activeUser.id])
        ),
        completedUserNames: Array.from(
          new Set([...(targetJob.completedUserNames || []), activeUser.name])
        ),
      };
      StorageService.updateJobBareng(updatedJob);
      setJobBarengList(StorageService.getJobBareng());

      const newLog: TaskLog = {
        id: `tl-${Date.now()}`,
        timestamp,
        date: today,
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: activeUser.role,
        unit: activeUser.unit,
        taskId: targetJob.id,
        taskTitle: `[JOB BARENG] ${targetJob.title}`,
        category: 'Job Bareng',
        timingType: 'anytime',
        status: 'Selesai',
        isLate: false,
        photoUrl: photoDataUrl, // Immediate local preview
        notes: notes || 'Pekerjaan Job Bareng bersama selesai.',
      };

      StorageService.addTaskLog(newLog);
      setTaskLogs(StorageService.getTaskLogs());

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      showToast('Berhasil menyelesaikan Job Bareng! Tersimpan & sedang disinkronkan.');

      // Background Drive & Sheet sync
      (async () => {
        try {
          const driveUpload = await GoogleSheetsService.uploadPhotoToDrive(photoDataUrl, filename);
          if (driveUpload.driveUrl && driveUpload.driveUrl.startsWith('http')) {
            newLog.photoUrl = driveUpload.driveUrl;
            newLog.driveFileId = driveUpload.fileId;
            StorageService.updateTaskLog(newLog);
            setTaskLogs(StorageService.getTaskLogs());
          }
          await GoogleSheetsService.logTaskToSheets(newLog);
          await GoogleSheetsService.pushAllToSheets();
        } catch (err) {
          console.warn('Background sync error for job bareng log:', err);
          GoogleSheetsService.logTaskToSheets(newLog).catch(console.warn);
        }
      })();
    } else if (targetTask) {
      // 2. Optimistic immediate local save for Regular/Master Task (Strictly by targetTask.id)
      const currentLogs = StorageService.getTaskLogs();
      const existingLogIdx = currentLogs.findIndex(
        (l) =>
          (l.taskId === targetTask.id || (l.taskId && targetTask.id && l.taskId.trim() === targetTask.id.trim())) &&
          (l.userId === activeUser.id || (l.userName && l.userName.trim().toLowerCase() === activeUser.name.trim().toLowerCase())) &&
          (isSameDay(l.date, today) || isSameDay(l.timestamp, today))
      );

      let targetLog: TaskLog;

      if (existingLogIdx >= 0) {
        targetLog = {
          ...currentLogs[existingLogIdx],
          photoUrl: photoDataUrl,
          notes: notes
            ? `${currentLogs[existingLogIdx].notes ? currentLogs[existingLogIdx].notes + ' | ' : ''}${notes}`
            : currentLogs[existingLogIdx].notes,
          lateReason: reason || currentLogs[existingLogIdx].lateReason,
          status: isLate || currentLogs[existingLogIdx].isLate ? 'Terlambat' : 'Selesai',
          isLate: isLate || currentLogs[existingLogIdx].isLate,
        };
        StorageService.updateTaskLog(targetLog);
      } else {
        targetLog = {
          id: `tl-${Date.now()}`,
          timestamp,
          date: today,
          userId: activeUser.id,
          userName: activeUser.name,
          userRole: activeUser.role,
          unit: activeUser.unit,
          taskId: targetTask.id,
          taskTitle: targetTask.title,
          category: targetTask.category,
          timingType: targetTask.timingType,
          status,
          isLate,
          lateReason: reason,
          photoUrl: photoDataUrl,
          notes,
        };
        StorageService.addTaskLog(targetLog);
      }

      setTaskLogs(StorageService.getTaskLogs());

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      showToast(`Pekerjaan "${targetTask.title}" selesai & tersimpan!`);

      // Background Drive & Sheet sync
      (async () => {
        try {
          const driveUpload = await GoogleSheetsService.uploadPhotoToDrive(photoDataUrl, filename);
          if (driveUpload.driveUrl && driveUpload.driveUrl.startsWith('http')) {
            targetLog.photoUrl = driveUpload.driveUrl;
            targetLog.driveFileId = driveUpload.fileId;
            StorageService.updateTaskLog(targetLog);
            setTaskLogs(StorageService.getTaskLogs());
          }
          await GoogleSheetsService.logTaskToSheets(targetLog);
          await GoogleSheetsService.pushAllToSheets();
        } catch (err) {
          console.warn('Background sync error for task log:', err);
          GoogleSheetsService.logTaskToSheets(targetLog).catch(console.warn);
        }
      })();
    }
  };

  // Join Job Bareng
  const handleJoinJobBareng = (jobId: string) => {
    const target = jobBarengList.find((j) => j.id === jobId);
    if (!target) return;

    const updated: JobBareng = {
      ...target,
      participantIds: Array.from(new Set([...target.participantIds, activeUser.id])),
      participantNames: Array.from(new Set([...(target.participantNames || []), activeUser.name])),
    };
    StorageService.updateJobBareng(updated);
    setJobBarengList(StorageService.getJobBareng());
    showToast('Anda telah bergabung dalam Job Bareng!');
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  // Complete Job Bareng Trigger
  const handleCompleteJobBareng = (job: JobBareng) => {
    setActiveJobBarengTarget(job);
    setActiveTaskTarget({
      id: job.id,
      title: `[JOB BARENG] ${job.title}`,
      unit: job.targetUnit,
      category: 'Job Bareng',
      timingType: 'anytime',
      instructions: [job.description],
      photoRequired: true,
      isActive: true,
    });
    setIsLateTaskProgress(false);
    setPendingLateReason(null);
    setIsCameraModalOpen(true);
  };

  // Submit Dinas Request
  const handleSubmitDinas = (request: DinasRequest) => {
    StorageService.addDinasRequest(request);
    setDinasRequests(StorageService.getDinasRequests());
    showToast('Pengajuan dinas luar terkirim. Menunggu persetujuan Admin FM.');
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  // Submit Peer Inspection
  const handleSubmitPeerInspection = (inspection: PeerInspection) => {
    StorageService.addPeerInspection(inspection);
    setPeerInspections(StorageService.getPeerInspections());
    showToast(`Inspeksi kebersihan untuk ${inspection.targetUserName} berhasil disimpan & tercatat di Google Sheet!`);
    GoogleSheetsService.logPeerInspectionToSheets(inspection).catch(console.warn);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  // Submit Coordinator Weekly Score
  const handleSubmitWeeklyScore = (score: WeeklyScore) => {
    StorageService.addWeeklyScore(score);
    setWeeklyScores(StorageService.getWeeklyScores());
    showToast(`Penilaian mingguan untuk ${score.userName} berhasil disimpan!`);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  // Coordinator Verify Task
  const handleVerifyTaskLog = (logId: string, score: number, notes: string) => {
    const target = taskLogs.find((l) => l.id === logId);
    if (!target) return;

    const updated: TaskLog = {
      ...target,
      verifiedByKordinator: true,
      kordinatorId: activeUser.id,
      kordinatorName: activeUser.name,
      kordinatorScore: score,
      kordinatorNotes: notes,
    };
    StorageService.updateTaskLog(updated);
    setTaskLogs(StorageService.getTaskLogs());
    showToast('Pekerjaan berhasil diverifikasi oleh Kordinator.');
  };

  // Admin Actions
  const handleUpdateUser = (updatedUser: User) => {
    StorageService.updateUser(updatedUser);
    setUsers(StorageService.getUsers());
    showToast(`Data staff ${updatedUser.name} diperbarui.`);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleAddUser = (newUser: User) => {
    StorageService.addUser(newUser);
    setUsers(StorageService.getUsers());
    showToast(`Staff baru ${newUser.name} ditambahkan.`);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleAddMasterTask = (task: MasterTask) => {
    StorageService.addMasterTask(task);
    setMasterTasks(StorageService.getMasterTasks());
    showToast(`Master task "${task.title}" berhasil ditambahkan.`);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleUpdateMasterTask = (task: MasterTask) => {
    StorageService.updateMasterTask(task);
    setMasterTasks(StorageService.getMasterTasks());
    showToast(`Master task "${task.title}" diperbarui.`);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleDeleteMasterTask = (taskId: string) => {
    StorageService.deleteMasterTask(taskId);
    setMasterTasks(StorageService.getMasterTasks());
    showToast('Master task dihapus.');
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleCreateJobBareng = (job: JobBareng) => {
    StorageService.addJobBareng(job);
    setJobBarengList(StorageService.getJobBareng());
    showToast(`Job Bareng "${job.title}" telah dipublikasikan ke semua staff!`);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleApproveDinas = (requestId: string, approve: boolean) => {
    const target = dinasRequests.find((d) => d.id === requestId);
    if (!target) return;

    const updated: DinasRequest = {
      ...target,
      status: approve ? 'Disetujui' : 'Ditolak',
      approvedBy: activeUser.id,
      approvedByName: activeUser.name,
      approvedAt: new Date().toISOString(),
    };
    StorageService.updateDinasRequest(updated);
    setDinasRequests(StorageService.getDinasRequests());

    if (approve) {
      // Create a TaskLog mark as Dinas Luar
      const today = target.date;
      const dinasLog: TaskLog = {
        id: `tl-dn-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: today,
        userId: target.userId,
        userName: target.userName,
        userRole: 'user',
        unit: target.unit,
        taskId: 'dinas-exempt',
        taskTitle: `[DINAS LUAR] ${target.destination}`,
        category: 'Harian',
        timingType: 'anytime',
        status: 'Dinas Luar',
        isLate: false,
        notes: `Dinas Luar Resmi Disetujui: ${target.reason}`,
      };
      StorageService.addTaskLog(dinasLog);
      setTaskLogs(StorageService.getTaskLogs());
    }

    showToast(`Permintaan dinas luar ${approve ? 'disetujui' : 'ditolak'}.`);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleUpdateTaskLog = (updatedLog: TaskLog) => {
    StorageService.updateTaskLog(updatedLog);
    setTaskLogs(StorageService.getTaskLogs());
    showToast(`Log tugas "${updatedLog.taskTitle}" (${updatedLog.userName}) berhasil diperbarui & disimpan.`);
    // Realtime sync this specific log to Google Sheets and push all
    GoogleSheetsService.logTaskToSheets(updatedLog).catch(console.warn);
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  const handleDeleteTaskLog = (logId: string) => {
    StorageService.deleteTaskLog(logId);
    setTaskLogs(StorageService.getTaskLogs());
    showToast('Log tugas berhasil dihapus.');
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
  };

  // Google 2-Way Sync
  const handlePushSync = async () => {
    const res = await GoogleSheetsService.pushAllToSheets();
    refreshAllStateFromStorage();
    if (!res.success) throw new Error(res.message);
  };

  const handlePullSync = async () => {
    try {
      setIsConnectingSheet(true);
      const res = await GoogleSheetsService.pullFromSheets();
      refreshAllStateFromStorage();
      if (!res.success) throw new Error(res.message);
      setInitialSyncDone(true);
      showToast('Data terbaru berhasil disinkronkan dari Google Sheets (2-Arah).');
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat dari Google Sheets', 'error');
      throw err;
    } finally {
      setIsConnectingSheet(false);
    }
  };

  const handleResetData = () => {
    StorageService.resetAllData();
    refreshAllStateFromStorage();
    showToast('Data berhasil direset ke sampel Lazuardi GCS.');
  };

  // If no user is logged in (first time open or logged out), render dedicated Login screen
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-sky-500 selection:text-white">
        {/* Background glow effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/40 via-slate-950 to-slate-950 pointer-events-none" />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
            <div
              className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 backdrop-blur-md ${
                toastMessage.type === 'error'
                  ? 'bg-rose-900/90 text-white border-rose-700'
                  : toastMessage.type === 'info'
                  ? 'bg-slate-900/90 text-white border-slate-700'
                  : 'bg-slate-900/90 text-white border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Mandatory Login Form */}
        <LoginModal
          isOpen={true}
          isMandatory={true}
          allUsers={users}
          onSelectUser={handleSelectUser}
          onRefreshUsers={() => {
            refreshAllStateFromStorage();
            setInitialSyncDone(true);
            showToast('Data user diperbarui dari Google Sheet');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-900/90 text-white border-rose-700'
                : toastMessage.type === 'info'
                ? 'bg-slate-900/90 text-white border-slate-700'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeUser={activeUser}
        onSwitchUser={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        syncConfig={syncConfig}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenDinasModal={() => setIsDinasModalOpen(true)}
        onOpenPeerInspectionModal={() => setIsPeerInspectionModalOpen(true)}
        onQuickPull={handlePullSync}
        isConnectingSheet={isConnectingSheet}
        initialSyncDone={initialSyncDone}
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {activeUser.role === 'admin' ? (
          <AdminDashboard
            activeUser={activeUser}
            allUsers={users}
            masterTasks={masterTasks}
            taskLogs={taskLogs}
            jobBarengList={jobBarengList}
            dinasRequests={dinasRequests}
            peerInspections={peerInspections}
            weeklyScores={weeklyScores}
            syncConfig={syncConfig}
            onUpdateUser={handleUpdateUser}
            onAddUser={handleAddUser}
            onAddMasterTask={handleAddMasterTask}
            onUpdateMasterTask={handleUpdateMasterTask}
            onDeleteMasterTask={handleDeleteMasterTask}
            onCreateJobBareng={handleCreateJobBareng}
            onApproveDinas={handleApproveDinas}
            onUpdateTaskLog={handleUpdateTaskLog}
            onDeleteTaskLog={handleDeleteTaskLog}
            onTriggerSync={() => setIsSyncModalOpen(true)}
          />
        ) : activeUser.role === 'kordinator' ? (
          <KordinatorView
            activeUser={activeUser}
            allUsers={users}
            masterTasks={masterTasks}
            taskLogs={taskLogs}
            jobBarengList={jobBarengList}
            dinasRequests={dinasRequests}
            peerInspections={peerInspections}
            weeklyScores={weeklyScores}
            onStartTask={handleStartTask}
            onJoinJobBareng={handleJoinJobBareng}
            onCompleteJobBareng={handleCompleteJobBareng}
            onCreateJobBareng={handleCreateJobBareng}
            onOpenDinasModal={() => setIsDinasModalOpen(true)}
            onOpenPeerInspectionModal={() => setIsPeerInspectionModalOpen(true)}
            onSubmitWeeklyScore={handleSubmitWeeklyScore}
            onVerifyTaskLog={handleVerifyTaskLog}
          />
        ) : (
          <UserTaskView
            activeUser={activeUser}
            masterTasks={masterTasks}
            taskLogs={taskLogs}
            jobBarengList={jobBarengList}
            dinasRequests={dinasRequests}
            peerInspections={peerInspections}
            weeklyScores={weeklyScores}
            onStartTask={handleStartTask}
            onJoinJobBareng={handleJoinJobBareng}
            onCompleteJobBareng={handleCompleteJobBareng}
            onOpenDinasModal={() => setIsDinasModalOpen(true)}
            onOpenPeerInspectionModal={() => setIsPeerInspectionModalOpen(true)}
          />
        )}
      </main>

      {/* Camera Capture Modal (Strict Live Camera) */}
      {isCameraModalOpen && activeTaskTarget && (
        <CameraCaptureModal
          isOpen={isCameraModalOpen}
          onClose={() => {
            setIsCameraModalOpen(false);
            setActiveTaskTarget(null);
            setActiveJobBarengTarget(null);
          }}
          task={activeTaskTarget}
          activeUser={activeUser}
          onPhotoCaptured={handlePhotoCaptured}
        />
      )}

      {/* Late Reason Modal (Enforced if past 09:00 WIB) */}
      {isLateModalOpen && activeTaskTarget && (
        <LateReasonModal
          isOpen={isLateModalOpen}
          onClose={() => {
            setIsLateModalOpen(false);
            setActiveTaskTarget(null);
          }}
          task={activeTaskTarget}
          onSubmitReason={handleLateReasonSubmitted}
        />
      )}

      {/* Dinas Luar Modal */}
      <DinasModal
        isOpen={isDinasModalOpen}
        onClose={() => setIsDinasModalOpen(false)}
        activeUser={activeUser}
        onSubmitDinas={handleSubmitDinas}
      />

      {/* Peer Inspection Modal */}
      <PeerInspectionModal
        isOpen={isPeerInspectionModalOpen}
        onClose={() => setIsPeerInspectionModalOpen(false)}
        activeUser={activeUser}
        allUsers={users}
        onSubmitInspection={handleSubmitPeerInspection}
      />

      {/* Login & Role Switcher Modal (100% Google Sheets) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        allUsers={users}
        onSelectUser={handleSelectUser}
        onRefreshUsers={() => {
          refreshAllStateFromStorage();
          showToast('Data user diperbarui dari Google Sheet');
        }}
      />

      {/* Google Sheets & Drive 2-Way Sync Status Modal */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncConfig={syncConfig}
        onPushSync={handlePushSync}
        onPullSync={handlePullSync}
        onResetData={handleResetData}
      />
    </div>
  );
}
