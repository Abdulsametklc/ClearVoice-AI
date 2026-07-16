# ---- Frontend build ----
FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Python runtime ----
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOST=0.0.0.0 \
    PORT=7860 \
    TORCH_HOME=/tmp/torch \
    HF_HOME=/tmp/huggingface

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU PyTorch first (smaller image for Spaces / free tiers)
RUN pip install --upgrade pip \
    && pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

COPY requirements-docker.txt .
RUN pip install -r requirements-docker.txt

COPY cleaner.py api.py ./
COPY --from=frontend /app/frontend/dist ./frontend/dist

EXPOSE 7860

CMD ["python", "api.py"]
