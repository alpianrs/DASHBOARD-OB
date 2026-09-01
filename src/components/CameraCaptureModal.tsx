import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  SwitchCamera,
  ArrowLeft,
  Zap,
  Upload,
} from 'lucide-react';
import { User, MasterTask } from '../types';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: MasterTask;
  activeUser: User;
  onPhotoCaptured: (photoDataUrl: string, notes: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  task,
  activeUser,
  onPhotoCaptured,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start Camera
  const startCamera = async (mode: 'environment' | 'user') => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Tidak dapat membuka kamera otomatis (Izin browser belum aktif atau kamera sedang digunakan). Silakan gunakan tombol "Ambil Foto via Kamera HP" di bawah.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setNotes('');
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Watermark drawing helper with responsive scaling
  const applyWatermarkToCanvas = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const bannerHeight = Math.min(130, Math.max(90, Math.round(height * 0.22)));

    // Dark gradient overlay at bottom
    const gradient = ctx.createLinearGradient(0, height - bannerHeight, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.85)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Watermark Header
    ctx.fillStyle = '#10B981'; // Emerald
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✓ LAZUARDI GCS — FACILITY MANAGEMENT', 16, height - bannerHeight + 28);

    // Unit & Task Info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px sans-serif';
    const taskNameTrunc =
      task.title.length > 45 ? task.title.substring(0, 42) + '...' : task.title;
    ctx.fillText(`Tugas: ${taskNameTrunc}`, 16, height - bannerHeight + 50);

    ctx.font = 'normal 12px sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(
      `Petugas: ${activeUser.name} | Unit: ${activeUser.unit}`,
      16,
      height - bannerHeight + 70
    );

    // Timestamp & Anti-tamper tag
    ctx.fillStyle = '#FCD34D'; // Amber
    ctx.font = 'bold 11px monospace';
    ctx.fillText(
      `WAKTU: ${dateFormatted} ${timeFormatted} WIB | ON-SITE`,
      16,
      height - bannerHeight + 90
    );
  };

  // Generate watermarked photo from current video frame (Optimized size & compression)
  const generateWatermarkedImage = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const rawWidth = video.videoWidth || 640;
    const rawHeight = video.videoHeight || 480;

    // Downscale to max 800px width/height for fast phone saving (<50KB)
    const MAX_DIM = 800;
    let targetWidth = rawWidth;
    let targetHeight = rawHeight;
    if (targetWidth > targetHeight) {
      if (targetWidth > MAX_DIM) {
        targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
        targetWidth = MAX_DIM;
      }
    } else {
      if (targetHeight > MAX_DIM) {
        targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
        targetHeight = MAX_DIM;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw base video frame
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    applyWatermarkToCanvas(ctx, targetWidth, targetHeight);

    return canvas.toDataURL('image/jpeg', 0.68);
  };

  // Handle native file camera input fallback
  const handleNativeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const MAX_DIM = 800;
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > MAX_DIM) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          }
        } else {
          if (h > MAX_DIM) {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          applyWatermarkToCanvas(ctx, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.68);
          setCapturedImage(dataUrl);

          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Capture only (to preview & add notes)
  const handleCapture = () => {
    const dataUrl = generateWatermarkedImage();
    if (!dataUrl) return;

    setCapturedImage(dataUrl);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Instant capture and submit in 1 click ("Bisa Langsung Simpan")
  const handleInstantCaptureAndSave = () => {
    const dataUrl = generateWatermarkedImage();
    if (!dataUrl) return;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setIsSubmitting(true);
    onPhotoCaptured(dataUrl, 'Foto bukti langsung diambil & disimpan.');
    setIsSubmitting(false);
    onClose();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleSubmit = () => {
    if (!capturedImage) return;
    setIsSubmitting(true);
    onPhotoCaptured(capturedImage, notes);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Hidden Native File Picker for Camera/Gallery Fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeFileInput}
          className="hidden"
        />

        {/* Top Header with Back / Cancel Button */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Kembali ke daftar pekerjaan"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                Bukti Foto Pekerjaan
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">{task.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Rule Notice & Standar Kebersihan Benchmark Photo Reference */}
        <div className="bg-amber-950/40 border-b border-amber-800/30 px-4 py-2 text-[11px] text-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              Watermark otomatis Lazuardi GCS (Tanggal, Jam, Staff & Unit).
            </span>
          </div>
          {task.standardPhotoUrl && (
            <a
              href={task.standardPhotoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-amber-300 hover:text-amber-100 font-bold underline shrink-0 flex items-center gap-0.5"
            >
              Lihat Acuan Standar Kebersihan ↗
            </a>
          )}
        </div>

        {/* Camera or Preview Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[280px] max-h-[50vh] overflow-hidden">
          {cameraError && !capturedImage ? (
            <div className="p-6 text-center text-rose-300 max-w-sm space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
              <p className="text-xs font-medium leading-relaxed">{cameraError}</p>
              
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>📷 Buka Kamera HP / Pilih Foto</span>
                </button>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          ) : !capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[50vh]"
              />

              {/* Viewfinder Target Guidelines */}
              <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between items-center text-[10px] text-white/80 font-mono bg-black/50 px-2 py-0.5 rounded w-fit">
                  <span>KAMERA AKTIF</span>
                </div>
                <div className="text-center text-[11px] text-white/90 font-medium bg-black/60 backdrop-blur-xs py-1 px-3 rounded-xl self-center border border-white/10">
                  Arahkan ke area yang telah dibersihkan
                </div>
              </div>

              {/* Camera Switcher Button & Native Camera Trigger */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-800 shadow-md cursor-pointer transition text-xs font-bold flex items-center gap-1"
                  title="Gunakan Kamera Bawaan HP"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleFacingMode}
                  className="p-2.5 rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-800 shadow-md cursor-pointer transition"
                  title="Ganti Kamera Depan/Belakang"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured Proof"
                className="max-h-[50vh] w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <Check className="w-3.5 h-3.5" />
                <span>Foto Berhasil Diambil</span>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Watermark Processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls & Prominent Buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          {!capturedImage ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {/* 1-Click Instant Capture and Save */}
                <button
                  onClick={handleInstantCaptureAndSave}
                  disabled={!!cameraError || isSubmitting}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                  title="Ambil foto dan langsung selesaikan pekerjaan"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Ambil & Langsung Simpan</span>
                </button>

                {/* Regular Capture to preview */}
                <button
                  onClick={handleCapture}
                  disabled={!!cameraError}
                  className="py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                  title="Ambil foto untuk dicek terlebih dahulu"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil & Cek Foto</span>
                </button>
              </div>

              {/* Native Mobile Camera Button as an Alternative */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl font-semibold text-xs transition cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Buka Kamera Bawaan HP / Galeri</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-1.5 text-slate-400 hover:text-slate-200 text-[11px] text-center font-medium transition cursor-pointer"
              >
                Batal / Kembali ke Tugas
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Optional Notes */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Catatan Pekerjaan (Opsional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Sabun wastafel terisi penuh, lantai kering..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons: Save & Submit or Retake */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleRetake}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Foto Ulang</span>
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>✓ Simpan Pekerjaan</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-1.5 text-slate-400 hover:text-slate-200 text-[11px] text-center font-medium transition cursor-pointer"
              >
                Batal dan Kembali
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
