import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FolderSync,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Code,
  Wrench,
  CloudUpload,
  CloudDownload,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { SyncConfig } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE, GoogleSheetsService } from '../services/googleSheets';
import { StorageService } from '../services/storage';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  onPushSync: () => Promise<void>;
  onPullSync: () => Promise<void>;
  onResetData: () => void;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  onPushSync,
  onPullSync,
  onResetData,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [webAppUrl, setWebAppUrl] = useState<string>(
    syncConfig.webAppUrl || StorageService.getSyncConfig().webAppUrl || ''
  );
  const [showCode, setShowCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedUrlSuccess, setSavedUrlSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    const trimmed = webAppUrl.trim();
    const updated = {
      ...syncConfig,
      webAppUrl: trimmed,
      isGoogleConnected: !!trimmed,
    };
    StorageService.saveSyncConfig(updated);
    setSavedUrlSuccess(true);
    setTimeout(() => setSavedUrlSuccess(false), 3000);
    setMessage({
      type: 'success',
      text: 'Web App URL berhasil disimpan. Sinkronisasi 2 arah aktif!',
    });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handlePush = async () => {
    try {
      setLoading(true);
      setMessage(null);
      await onPushSync();
      setMessage({
        type: 'success',
        text: 'Data lokal berhasil diunggah (Push) ke Google Sheets & Drive Lazuardi GCS.',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Gagal sinkron: ' + (err.message || 'Periksa koneksi Google Sheet'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    try {
      setLoading(true);
      setMessage(null);
      await onPullSync();
      setMessage({
        type: 'success',
        text: 'Data terbaru berhasil ditarik (Pull) dari Google Sheets.',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Gagal memuat: ' + (err.message || 'Coba lagi'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSetupDatabase = async () => {
    try {
      setSetupLoading(true);
      setMessage(null);
      const res = await GoogleSheetsService.triggerRemoteSetup();
      if (res.success) {
        await onPullSync();
        setMessage({
          type: 'success',
          text: 'Database otomatis di-setup dan tersinkronisasi 2 arah dengan Google Sheet!',
        });
      } else {
        setMessage({
          type: 'error',
          text: res.message || 'Gagal setup database.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Gagal setup: ' + (err.message || 'Pastikan Apps Script telah di-deploy.'),
      });
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-600 rounded-xl text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight tracking-tight">
                Integrasi 2-Arah Google Sheets
              </h3>
              <p className="text-xs text-slate-400">Facility Management Lazuardi GCS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {message && (
            <div
              className={`p-3.5 rounded-xl flex items-start gap-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{message.text}</span>
            </div>
          )}

          {/* Connected Resource Links */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">Spreadsheet & Drive Terhubung:</label>

            <a
              href={syncConfig.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Google Spreadsheet (Users, MasterTask, TaskLogs)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {syncConfig.sheetId}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </a>

            <a
              href={syncConfig.driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
                  <FolderSync className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    Folder Google Drive Foto Bukti Pekerjaan
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {syncConfig.driveFolderId}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            </a>
          </div>

          {/* Web App URL Configuration */}
          <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-sky-950 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>Google Apps Script Web App URL (Endpoint 2-Arah):</span>
              </label>
              {savedUrlSuccess && (
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tersimpan
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-sky-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <button
                onClick={handleSaveUrl}
                className="px-3 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold text-xs cursor-pointer transition shrink-0 shadow-xs"
              >
                Simpan URL
              </button>
            </div>
            <div className="text-[11px] text-sky-900 bg-sky-100/70 p-2.5 rounded-lg space-y-1">
              <p className="font-bold text-sky-950">Cara Deploy & Mengatasi "Akses ditolak: DriveApp":</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                <li>Buka Google Sheet &gt; <strong>Ekstensi &gt; Apps Script</strong>.</li>
                <li>Tempel seluruh kode <strong>Code.gs</strong> (salin dari tombol di bawah).</li>
                <li>Klik tombol <strong>Deploy &gt; New deployment</strong> (atau Manage deployments &gt; Edit jika update).</li>
                <li>Pilih <strong>Web app</strong>:
                  <ul className="list-disc list-inside ml-2">
                    <li>Execute as: <strong>Me (email Anda)</strong></li>
                    <li>Who has access: <strong>Anyone</strong> (Siapa saja)</li>
                  </ul>
                </li>
                <li>Klik <strong>Deploy</strong> &gt; <strong>Authorize Access</strong> &gt; Pilih Akun &gt; <strong>Advanced &gt; Go to (unsafe) &gt; Allow</strong> agar Apps Script diizinkan mengakses Google Drive & Spreadsheet.</li>
                <li>Salin <strong>Web App URL</strong> yang berakhiran <code>/exec</code> ke kolom di atas.</li>
              </ol>
            </div>
          </div>

          {/* Action Box: Setup Database Otomatis & Script Code */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-white">Setup Database Otomatis di Google Sheet</span>
              </div>
              <button
                onClick={() => setShowCode(!showCode)}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{showCode ? 'Sembunyikan Script' : 'Lihat Script Apps Script'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Klik tombol di bawah untuk membuat seluruh tab (Users, MasterTask, TaskLogs, JobBareng, dll) beserta kolom dan data SOP Lazuardi di Google Sheet Anda secara otomatis.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleAutoSetupDatabase}
                disabled={setupLoading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{setupLoading ? 'Menjalankan Setup...' : '⚡ Setup / Reset Database di Google Sheet'}</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin!' : 'Salin Script (Code.gs)'}</span>
              </button>
            </div>

            {/* Script Code Viewer */}
            {showCode && (
              <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                  <span>Kode Google Apps Script (Code.gs)</span>
                  <button
                    onClick={handleCopyCode}
                    className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? 'Tersalin ke Clipboard' : 'Salin Seluruh Kode'}
                  </button>
                </div>
                <pre className="max-h-52 overflow-y-auto font-mono text-[10px] text-emerald-400 p-2 bg-slate-900/90 rounded-lg leading-relaxed whitespace-pre">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            )}
          </div>

          {/* Sync Trigger Controls */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <span className="font-bold text-slate-800 block">Manual Sync Data:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePush}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className="w-4 h-4 text-sky-400" />
                <span>{loading ? 'Sinkron...' : 'Push ke Sheets'}</span>
              </button>

              <button
                onClick={handlePull}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <CloudDownload className="w-4 h-4" />
                <span>Tarik dari Sheets</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Waktu Sinkron Terakhir:</span>
              <strong className="text-slate-800">
                {syncConfig.lastSyncTime
                  ? new Date(syncConfig.lastSyncTime).toLocaleTimeString('id-ID') + ' WIB'
                  : 'Belum pernah'}
              </strong>
            </div>
          </div>

          {/* Reset Demo Data Button */}
          <div className="pt-2 flex justify-between items-center text-slate-500 border-t border-slate-100">
            <button
              onClick={() => {
                if (confirm('Kembalikan semua data ke sampel awal Lazuardi GCS?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Data Lokal</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
