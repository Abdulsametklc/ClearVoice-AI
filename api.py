"""ClearVoice AI — FastAPI backend. Wraps cleaner.py without changing its logic."""

from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from cleaner import SUPPORTED_EXTENSIONS, clean_audio

ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT / "frontend" / "dist"
TEMP_ROOT = Path(tempfile.gettempdir()) / "clearvoice_jobs"
TEMP_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ClearVoice AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "ClearVoice AI"}


@app.post("/api/clean")
async def clean(
    file: UploadFile = File(...),
    strength: float = Form(90),
    method: str = Form("denoiser"),
    output_format: str = Form("wav"),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya adı eksik.")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Desteklenmeyen format: {suffix}. "
                f"Desteklenen: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    if method not in {"denoiser", "noisereduce", "combo"}:
        method = "denoiser"

    fmt = "mp3" if output_format.lower().startswith("mp3") else "wav"
    strength_norm = max(0.3, min(1.0, float(strength) / 100.0))

    job_dir = TEMP_ROOT / str(uuid.uuid4())
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / f"input{suffix}"

    try:
        with input_path.open("wb") as out:
            shutil.copyfileobj(file.file, out)

        out_path = clean_audio(
            input_path,
            method=method,
            strength=strength_norm,
            output_format=fmt,
        )
    except Exception as exc:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"İşlem başarısız: {exc}") from exc
    finally:
        await file.close()

    media = "audio/mpeg" if fmt == "mp3" else "audio/wav"
    download_name = f"{Path(file.filename).stem}_cleaned.{fmt}"

    return FileResponse(
        path=str(out_path),
        media_type=media,
        filename=download_name,
    )


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "7861"))
    print(f"ClearVoice AI -> http://{host}:{port}")
    uvicorn.run(
        "api:app",
        host=host,
        port=port,
        reload=False,
    )
