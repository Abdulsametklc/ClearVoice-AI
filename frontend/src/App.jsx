import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  CloudUpload,
  Download,
  FileAudio,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

const ACCEPT =
  ".mp3,.mp4,.wav,.m4a,.aac,.flac,.ogg,.webm,.mkv,audio/*,video/*";

/** Empty = same-origin (Docker/HF). Set VITE_API_BASE for GitHub Pages. */
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [strength, setStrength] = useState(90);
  const [method, setMethod] = useState("denoiser");
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

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="glass flex items-center justify-between rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/25">
              <AudioLines size={22} strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                ClearVoice AI
              </h1>
              <p className="text-sm text-slate-400">
                Premium ses gürültü temizleme
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:flex">
            <Sparkles size={14} />
            Yerel AI işlem
          </div>
        </header>

        <main className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
              Upload
            </h2>

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
                "group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                dragging
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-slate-600/70 bg-slate-900/35 hover:border-emerald-400/50 hover:bg-slate-900/50",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-emerald-300 ring-1 ring-white/10">
                <CloudUpload size={28} />
              </div>
              <p className="text-base font-semibold text-slate-100">
                Drag & drop audio file here
              </p>
              <p className="mt-1 text-sm text-slate-400">
                or click to browse · MP3, WAV, M4A, MP4…
              </p>
            </div>

            {file && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-900/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                    <FileAudio size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    resetResult();
                  }}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Dosyayı kaldır"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </section>

          <section className="glass flex flex-col rounded-2xl p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
              Settıngs
            </h2>

            <label className="mb-2 flex items-center justify-between text-sm text-slate-300">
              <span>Noise Reduction Strength</span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
                {strength}%
              </span>
            </label>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="mb-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-400"
            />

            <label className="mb-2 text-sm text-slate-300">Method</label>
            <div className="mb-5 grid grid-cols-3 gap-2">
              {[
                { id: "denoiser", label: "AI" },
                { id: "noisereduce", label: "Classic" },
                { id: "combo", label: "Strong" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id)}
                  className={[
                    "rounded-xl px-2 py-2.5 text-sm font-medium transition",
                    method === opt.id
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                      : "bg-slate-800/70 text-slate-300 hover:bg-slate-700/80",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="mb-2 text-sm text-slate-300">Output</label>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {[
                { id: "wav", label: "WAV" },
                { id: "mp3", label: "MP3" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormat(opt.id)}
                  className={[
                    "rounded-xl px-2 py-2.5 text-sm font-medium transition",
                    format === opt.id
                      ? "bg-white/90 text-slate-900"
                      : "bg-slate-800/70 text-slate-300 hover:bg-slate-700/80",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!file || processing}
              onClick={cleanAudio}
              className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-3.5 text-base font-semibold text-slate-950 shadow-xl shadow-emerald-500/25 transition enabled:hover:brightness-105 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {processing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  AI is processing…
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Clean Audio
                </>
              )}
            </button>

            {error && (
              <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
          </section>
        </main>

        {(originalUrl || cleanedUrl || processing) && (
          <section className="grid gap-5 md:grid-cols-2">
            <article className="glass rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Original Audio
                </h3>
                <span className="rounded-full bg-slate-700/60 px-2.5 py-1 text-[11px] text-slate-300">
                  Source
                </span>
              </div>
              {originalUrl ? (
                <audio controls src={originalUrl} className="w-full" />
              ) : (
                <p className="text-sm text-slate-500">Dosya seçilmedi</p>
              )}
            </article>

            <article className="glass rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Cleaned Audio
                </h3>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] text-emerald-300">
                  Result
                </span>
              </div>
              {processing ? (
                <div className="flex min-h-[54px] items-center gap-3 text-sm text-slate-300">
                  <Loader2 className="animate-spin text-emerald-400" size={18} />
                  Cleaning in progress…
                </div>
              ) : cleanedUrl ? (
                <>
                  <audio controls src={cleanedUrl} className="mb-4 w-full" />
                  <a
                    href={cleanedUrl}
                    download={cleanedName}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    <Download size={16} />
                    Download Result
                  </a>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Temizlenmiş ses burada görünecek
                </p>
              )}
            </article>
          </section>
        )}

        <footer className="pb-2 text-center text-xs text-slate-500">
          ClearVoice AI · Dosyalarınız cihazınızda işlenir
        </footer>
      </div>
    </div>
  );
}
