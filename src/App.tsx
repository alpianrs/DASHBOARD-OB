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
  const [activeUser, setActiveUser] = useState<User>(() => StorageService.getActiveUser());
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

  // Initial state check on mount & Background 2-Way Sync
  useEffect(() => {
    refreshAllStateFromStorage();

    // Auto pull from Google Sheets on initial load
    GoogleSheetsService.pullFromSheets()
      .then((res) => {
        if (res.success) {
          refreshAllStateFromStorage();
        }
      })
      .catch(console.warn);

    // Auto pull on window focus (so edits in Google Sheet reflect immediately when returning to tab)
    const handleWindowFocus = () => {
      GoogleSheetsService.pullFromSheets()
        .then((res) => {
          if (res.success) {
            refreshAllStateFromStorage();
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

  // Switch User handler
  const handleSelectUser = (user: User) => {
    setActiveUser(user);
    StorageService.setActiveUser(user);
    showToast(`Berhasil login sebagai ${user.name} (${user.role.toUpperCase()})`);
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoginModalOpen(true);
    showToast('Silakan login dengan akun Anda', 'info');
  };

  // Start Task Handler
  const handleStartTask = (task: MasterTask, isLate: boolean) => {
    setActiveTaskTarget(task);
    setActiveJobBarengTarget(null);
    setIsLateTaskProgress(isLate);

    if (isLate && task.timingType === 'pre_readiness') {
      // Prompt for Late Reason first
      setIsLateModalOpen(true);
    } else {
      setPendingLateReason(null);
      setIsCameraModalOpen(true);
    }
  };

  // Late Reason Submitted
  const handleLateReasonSubmitted = (reason: string) => {
    setPendingLateReason(reason);
    setIsLateModalOpen(false);
    setIsCameraModalOpen(true);
  };

  // Photo Captured & Task Completed Handler
  const handlePhotoCaptured = async (photoDataUrl: string, notes: string) => {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    // 1. Upload photo to Drive asynchronously
    const filename = `LZ_PROOF_${activeUser.unit}_${activeUser.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    const driveUpload = await GoogleSheetsService.uploadPhotoToDrive(photoDataUrl, filename);

    if (activeJobBarengTarget) {
      // Completed a Job Bareng
      const updatedJob: JobBareng = {
        ...activeJobBarengTarget,
        completedUserIds: Array.from(
          new Set([...activeJobBarengTarget.completedUserIds, activeUser.id])
        ),
        completedUserNames: Array.from(
          new Set([...(activeJobBarengTarget.completedUserNames || []), activeUser.name])
        ),
      };
      StorageService.updateJobBareng(updatedJob);
      setJobBarengList(StorageService.getJobBareng());

      // Create a TaskLog entry for Job Bareng
      const newLog: TaskLog = {
        id: `tl-${Date.now()}`,
        timestamp,
        date: today,
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: activeUser.role,
        unit: activeUser.unit,
        taskId: activeJobBarengTarget.id,
        taskTitle: `[JOB BARENG] ${activeJobBarengTarget.title}`,
        category: 'Job Bareng',
        timingType: 'anytime',
        status: 'Selesai',
        isLate: false,
        photoUrl: driveUpload.driveUrl,
        driveFileId: driveUpload.fileId,
        notes: notes || 'Pekerjaan Job Bareng bersama selesai.',
      };

      StorageService.addTaskLog(newLog);
      setTaskLogs(StorageService.getTaskLogs());
      setActiveJobBarengTarget(null);

      // Trigger real-time direct append to Google Sheets TaskLogs
      GoogleSheetsService.logTaskToSheets(newLog).catch(console.warn);

      // Trigger Confetti
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      showToast('Berhasil menyelesaikan Job Bareng! Tercatat di Google Sheet.');
    } else if (activeTaskTarget) {
      // Regular / Master Task Completed
      const isLate = isLateTaskProgress;
      const status = isLate ? 'Terlambat' : 'Selesai';

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
        lateReason: pendingLateReason || undefined,
        photoUrl: driveUpload.driveUrl,
        driveFileId: driveUpload.fileId,
        notes,
      };

      StorageService.addTaskLog(newLog);
      setTaskLogs(StorageService.getTaskLogs());

      // Trigger real-time direct append to Google Sheets TaskLogs
      GoogleSheetsService.logTaskToSheets(newLog).catch(console.warn);

      // Confetti celebration
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      showToast(`Pekerjaan "${activeTaskTarget.title}" tersimpan & terekam di Google Sheet!`);
    }

    setActiveTaskTarget(null);
    setPendingLateReason(null);

    // Auto push sync to Google Sheets (Full Batch Backup)
    GoogleSheetsService.pushAllToSheets().catch(console.warn);
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
    showToast(`Inspeksi untuk ${inspection.targetUserName} berhasil disimpan!`);
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

  // Google 2-Way Sync
  const handlePushSync = async () => {
    const res = await GoogleSheetsService.pushAllToSheets();
    refreshAllStateFromStorage();
    if (!res.success) throw new Error(res.message);
  };

  const handlePullSync = async () => {
    const res = await GoogleSheetsService.pullFromSheets();
    refreshAllStateFromStorage();
    if (!res.success) throw new Error(res.message);
  };

  const handleResetData = () => {
    StorageService.resetAllData();
    refreshAllStateFromStorage();
    showToast('Data berhasil direset ke sampel Lazuardi GCS.');
  };

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
