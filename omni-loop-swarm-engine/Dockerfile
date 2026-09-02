# ---- frontend build stage ----
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- backend runtime stage ----
FROM python:3.12-slim AS runtime
WORKDIR /app

RUN groupadd --system appuser && useradd --system --create-home --gid appuser appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY config.py llm.py swarm.py jobs.py seo.py app.py ./
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV PORT=5000 \
    FLASK_DEBUG=false \
    PYTHONUNBUFFERED=1

EXPOSE 5000
USER appuser

# /api/execute returns almost instantly now (it hands work to a background
# thread and returns a job id -- see jobs.py) so gunicorn's own request
# timeout can stay at a normal value. Single worker, multiple threads: this
# workload is I/O-bound (network calls to LLM providers), so threads give
# real concurrency without the GIL being a bottleneck -- and jobs.py's
# in-memory store only works within one process, so multiple workers would
# each have their own inconsistent view of job state.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 1 --threads 8 --timeout 60 app:app"]
