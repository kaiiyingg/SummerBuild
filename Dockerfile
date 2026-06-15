FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend ./frontend

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm ci --prefix frontend
RUN npm run build --prefix frontend


FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
