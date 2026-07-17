"""Ses gürültü temizleme motoru."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import librosa
import noisereduce as nr
import numpy as np
import soundfile as sf

SUPPORTED_EXTENSIONS = {".mp3", ".mp4", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".webm", ".mkv"}

_denoiser_model = None


def _device():
    import torch

    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _init_denoiser():
    """Facebook Denoiser (Demucs tabanlı konuşma iyileştirme)."""
    global _denoiser_model
    if _denoiser_model is None:
        import torch
        from denoiser import pretrained

        model = pretrained.dns64()
        model.eval()
        _denoiser_model = model.to(_device())
    return _denoiser_model


def extract_audio(input_path: str | Path, target_sr: int = 16000) -> tuple[np.ndarray, int]:
    """MP3/MP4 ve diğer formatlardan mono ses çıkarır."""
    input_path = Path(input_path)
    if not input_path.exists():
        raise FileNotFoundError(f"Dosya bulunamadı: {input_path}")

    suffix = input_path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Desteklenmeyen format: {suffix}. "
            f"Desteklenenler: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav_path = Path(tmp.name)

    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(target_sr),
            "-acodec",
            "pcm_s16le",
            str(wav_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg hatası:\n{result.stderr[-800:]}")

        audio, sr = sf.read(wav_path, dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        return audio.astype(np.float32), int(sr)
    finally:
        wav_path.unlink(missing_ok=True)


def _normalize(audio: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > 1e-8:
        return (audio / peak * 0.98).astype(np.float32)
    return audio.astype(np.float32)


def clean_with_denoiser(audio: np.ndarray, sr: int, dry: float = 0.0) -> tuple[np.ndarray, int]:
    """Yapay zeka ile konuşma gürültü temizleme (Facebook Denoiser)."""
    import torch

    model = _init_denoiser()
    target_sr = int(model.sample_rate)

    if sr != target_sr:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
        sr = target_sr

    device = next(model.parameters()).device
    dry = float(np.clip(dry, 0.0, 0.5))

    # Uzun kayıtları parçala (GPU bellek güvenliği)
    chunk_sec = 45
    hop = target_sr * chunk_sec
    pieces: list[np.ndarray] = []

    with torch.no_grad():
        for start in range(0, max(len(audio), 1), hop):
            chunk = audio[start : start + hop]
            if chunk.size == 0:
                continue
            wav = torch.from_numpy(chunk).float().to(device)
            wav = wav.unsqueeze(0).unsqueeze(0)  # (B, C, T)
            estimate = model(wav)
            if dry > 0:
                estimate = (1 - dry) * estimate + dry * wav
            pieces.append(estimate.squeeze().cpu().numpy())

    out = np.concatenate(pieces) if pieces else audio
    return _normalize(out), sr


def clean_with_noisereduce(
    audio: np.ndarray,
    sr: int,
    strength: float = 0.85,
) -> tuple[np.ndarray, int]:
    """Spektral gürültü azaltma (klasik yöntem)."""
    prop = float(np.clip(strength, 0.3, 1.0))

    # Önce sabit (stationary) gürültü, sonra hafif non-stationary
    cleaned = nr.reduce_noise(
        y=audio,
        sr=sr,
        stationary=True,
        prop_decrease=prop,
        n_fft=2048,
        hop_length=512,
    )
    if prop >= 0.7:
        cleaned = nr.reduce_noise(
            y=cleaned,
            sr=sr,
            stationary=False,
            prop_decrease=min(0.45, prop * 0.5),
            n_fft=2048,
            hop_length=512,
        )
    return _normalize(cleaned), sr


def clean_audio(
    input_path: str | Path,
    method: str = "denoiser",
    strength: float = 0.85,
    output_format: str = "wav",
) -> Path:
    """
    Girdi dosyasındaki gürültüyü temizler, temiz ses dosyası yolu döner.

    method: "denoiser" | "noisereduce" | "combo"
    """
    target_sr = 16000 if method in {"denoiser", "combo"} else 44100
    audio, sr = extract_audio(input_path, target_sr=target_sr)

    if method == "denoiser":
        # strength yüksekse daha agresif (daha az orijinal karışım)
        dry = max(0.0, 1.0 - strength) * 0.35
        cleaned, out_sr = clean_with_denoiser(audio, sr, dry=dry)
    elif method == "noisereduce":
        cleaned, out_sr = clean_with_noisereduce(audio, sr, strength=strength)
    elif method == "combo":
        dry = max(0.0, 1.0 - strength) * 0.25
        cleaned, out_sr = clean_with_denoiser(audio, sr, dry=dry)
        cleaned, out_sr = clean_with_noisereduce(cleaned, out_sr, strength=min(strength, 0.55))
    else:
        raise ValueError(f"Bilinmeyen yöntem: {method}")

    input_path = Path(input_path)
    out_dir = Path(tempfile.gettempdir()) / "ses_temiz"
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = input_path.stem + "_temiz"

    fmt = output_format.lower().lstrip(".")
    if fmt not in {"wav", "mp3"}:
        fmt = "wav"

    out_path = out_dir / f"{stem}.{fmt}"

    if fmt == "wav":
        sf.write(out_path, cleaned, out_sr, subtype="PCM_16")
    else:
        wav_tmp = out_dir / f"{stem}_tmp.wav"
        sf.write(wav_tmp, cleaned, out_sr, subtype="PCM_16")
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_tmp),
            "-codec:a",
            "libmp3lame",
            "-qscale:a",
            "2",
            str(out_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        wav_tmp.unlink(missing_ok=True)
        if result.returncode != 0:
            raise RuntimeError(f"MP3 dönüştürme hatası:\n{result.stderr[-800:]}")

    return out_path
