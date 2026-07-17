import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  CloudUpload,
  Download,
  FileAudio,
  Loader2,
  Play,
  Sparkles,
  X,
} from "lucide-react";

const ACCEPT =
  ".mp3,.mp4,.wav,.m4a,.aac,.flac,.ogg,.webm,.mkv,audio/*,video/*";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

const METHODS = [
  { id: "noisereduce", label: "Klasik" },
  { id: "denoiser", label: "Yapay zeka" },
  { id: "combo", label: "Güçlü" },
];

const FORMATS = [
  { id: "wav", label: "WAV" },
  { id: "mp3", label: "MP3" },
];

const STRENGTH_PRESETS = [50, 60, 70, 80, 90];

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function WaveBars({ active }) {
  const heights = [28, 44, 22, 52, 36, 48, 18, 40, 56, 30, 46, 24, 50, 34, 42, 20, 48, 38, 26, 54, 32, 44, 22, 40];
  return (
    <div className={`wave ${active ? "opacity-100" : "opacity-40"}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export default function App() {
  const inputRef = useRef(null);
  const cleanedAudioRef = useRef(null);
  const [file, setFile] = useState(null);
  const [strength, setStrength] = useState(70);
  const [method, setMethod] = useState("noisereduce");
  const [format, setFormat] = useState("wav");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [cleanedUrl, setCleanedUrl] = useState("");
  const [cleanedName, setCleanedName] = useState("");

  const originalUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  useEffect(() => {
    return () => {
      if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
    };
  }, [cleanedUrl]);

  function resetResult() {
    if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
    setCleanedUrl("");
    setCleanedName("");
    setError("");
  }

  function onPickFile(next) {
    if (!next) return;
    setFile(next);
    resetResult();
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onPickFile(dropped);
  }

  async function cleanAudio() {
    if (!file || processing) return;
    setProcessing(true);
    setError("");
    if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
    setCleanedUrl("");
    setCleanedName("");

    const body = new FormData();
    body.append("file", file);
    body.append("strength", String(strength));
    body.append("method", method);
    body.append("output_format", format);

    try {
      const res = await fetch(`${API_BASE}/api/clean`, { method: "POST", body });
      if (!res.ok) {
        let detail = "İşlem başarısız.";
        try {
          const data = await res.json();
          detail = data.detail || detail;
        } catch {
          /* ignore */
        }
        throw new Error(detail);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      setCleanedUrl(url);
      setCleanedName(match?.[1] || `${file.name.replace(/\.[^.]+$/, "")}_cleaned.${format}`);
    } catch (err) {
      setError(err.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      setProcessing(false);
    }
  }

  function playCleaned() {
    cleanedAudioRef.current?.play?.();
  }

  const methodLabel = METHODS.find((m) => m.id === method)?.label || method;

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7dcf6a] to-[#e89a3c] text-[#111] shadow-lg shadow-orange-500/20">
              <AudioLines size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                ClearVoice AI
              </h1>
              <p className="text-sm text-[#9a9aa3]">Ses gürültü temizleme stüdyosu</p>
            </div>
          </div>
          <p className="max-w-sm text-right text-xs leading-relaxed text-[#8a8a94]">
            Online sürüm hızlı deneme içindir. En iyi AI kalitesi için lokal kurulum önerilir.
          </p>
        </header>

        <main className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          {/* LEFT — output / actions */}
          <section className="studio-panel flex flex-col p-5 sm:p-6">
            <h2 className="text-[1.65rem] font-extrabold leading-tight tracking-tight text-white sm:text-[1.9rem]">
              kayıttaki <span className="text-[#e89a3c]">gürültüyü temizle</span>
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#9a9aa3]">
              Dosya yükle, yöntemi ve gücü seç, temiz sesi anında dinle veya indir.
            </p>

            <div className="mt-5 rounded-2xl border border-[#2a2a30] bg-[#1a1a1e] p-4">
              <WaveBars active={Boolean(cleanedUrl) || processing} />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {cleanedUrl
                      ? cleanedName || "Temiz ses"
                      : file
                        ? file.name
                        : "Henüz dosya yok"}
                  </p>
                  <p className="text-xs text-[#8a8a94]">
                    {methodLabel} · {strength}% güç · {format.toUpperCase()}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2a2a30] bg-[#141416] text-[#e89a3c]">
                  <AudioLines size={18} />
                </div>
              </div>

              {cleanedUrl && (
                <div className="mt-3">
                  <audio ref={cleanedAudioRef} controls src={cleanedUrl} />
                </div>
              )}
              {originalUrl && !cleanedUrl && (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-[#6f6f78]">Orijinal</p>
                  <audio controls src={originalUrl} />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={!file || processing}
                onClick={cleanAudio}
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    İşleniyor…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Gürültüyü temizle
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-ghost"
                disabled={!cleanedUrl}
                onClick={playCleaned}
              >
                <Play size={15} />
                Temiz sesi çal
              </button>

              {cleanedUrl ? (
                <a href={cleanedUrl} download={cleanedName} className="btn-ghost">
                  <Download size={15} />
                  İndir
                </a>
              ) : (
                <button type="button" className="btn-ghost" disabled>
                  <Download size={15} />
                  İndir
                </button>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm font-medium text-[#e89a3c]">{error}</p>
            )}
            {processing && (
              <p className="mt-3 flex items-center gap-2 text-sm text-[#9a9aa3]">
                <Loader2 className="animate-spin text-[#e89a3c]" size={16} />
                Ses temizleniyor, lütfen bekleyin…
              </p>
            )}
          </section>

          {/* RIGHT — settings */}
          <section className="studio-panel p-5 sm:p-6">
            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-white">Dosya</p>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                }}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={[
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-7 text-center transition",
                  dragging
                    ? "border-[#e89a3c] bg-[rgba(232,154,60,0.08)]"
                    : "border-[#2a2a30] bg-[#1a1a1e] hover:border-[#3f3f48]",
                ].join(" ")}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
                <CloudUpload className="mb-2 text-[#e89a3c]" size={26} />
                <p className="text-sm font-semibold text-white">Sürükle-bırak veya seç</p>
                <p className="mt-1 text-xs text-[#8a8a94]">MP3, WAV, M4A, MP4…</p>
              </div>

              {file && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#2a2a30] bg-[#1a1a1e] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileAudio className="shrink-0 text-[#e89a3c]" size={16} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{file.name}</p>
                      <p className="text-xs text-[#8a8a94]">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      resetResult();
                    }}
                    className="rounded-lg p-1.5 text-[#8a8a94] hover:bg-[#222] hover:text-white"
                    aria-label="Kaldır"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-white">Yöntem</p>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`pill ${method === opt.id ? "pill-active" : ""}`}
                    onClick={() => setMethod(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-white">Çıktı formatı</p>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`pill ${format === opt.id ? "pill-active" : ""}`}
                    onClick={() => setFormat(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-white">Hızlı güç</p>
              <div className="flex flex-wrap gap-2">
                {STRENGTH_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`pill ${strength === v ? "pill-active" : ""}`}
                    onClick={() => setStrength(v)}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Temizlik gücü</p>
                <span className="text-sm font-bold text-[#e89a3c]">{strength}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="accent-slider"
              />
              <p className="mt-2 text-xs text-[#8a8a94]">
                60–75% genelde daha doğal; çok yüksek değer konuşmayı boğabilir.
              </p>
            </div>
          </section>
        </main>

        <footer className="pb-2 text-center text-xs text-[#6f6f78]">
          ClearVoice AI · Teknofest ekipleri için ücretsiz gürültü temizleme
        </footer>
      </div>
    </div>
  );
}
