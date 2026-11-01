import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, Check, X } from 'lucide-react';

interface PhotoCaptureFieldProps {
  value: string;
  onChange: (dataUrlOrUrl: string) => void;
  label?: string;
}

export const PhotoCaptureField: React.FC<PhotoCaptureFieldProps> = ({
  value,
  onChange,
  label = 'Employee Photograph'
}) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam capture is not supported in this browser environment. Please upload an image file.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 400 }, height: { ideal: 400 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      setCameraError(
        err?.message || 'Camera permission denied or no camera hardware detected. Use Upload Photo instead.'
      );
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 320, video.videoHeight || 320);
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const sx = ((video.videoWidth || 320) - size) / 2;
      const sy = ((video.videoHeight || 320) - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onChange(dataUrl);
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2 text-xs">
      <span className="block font-semibold text-slate-700">{label}</span>
      <div className="flex flex-wrap items-center gap-4 p-3 bg-white rounded-xl border border-slate-200">
        <img
          src={
            value ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
          }
          alt="Employee preview"
          className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-100 shrink-0 bg-slate-100"
        />

        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {!cameraOpen ? (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Capture via Webcam</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Close Camera</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Photo</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Supports live webcam snapshot or JPG/PNG/WebP upload (persisted with employee profile).
          </p>
        </div>
      </div>

      {cameraError && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
          {cameraError}
        </div>
      )}

      {cameraOpen && (
        <div className="p-3 bg-slate-900 rounded-xl text-white space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Camera Preview
            </span>
            <button
              type="button"
              onClick={stopCamera}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-40 h-40 rounded-xl object-cover border border-slate-700 bg-black"
            />
            <div className="space-y-2">
              <p className="text-xs text-slate-300">
                Center the employee&apos;s face in the frame and click Capture Snapshot.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Capture Snapshot</span>
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
