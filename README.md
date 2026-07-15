# Vela BI — AI-Powered Business Intelligence Platform

## Hızlı Başlangıç

### 1. Ortam Değişkenlerini Ayarla

```bash
cp .env.example .env
# .env dosyasını düzenle ve ANTHROPIC_API_KEY ekle
```

### 2. Docker Compose ile Başlat

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### 3. İlk Kullanıcıyı Oluştur

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","full_name":"Admin","password":"admin123"}'
```

---

## Geliştirme Ortamı (Lokal)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Sadece DB ve Redis başlat
docker-compose -f ../docker-compose.dev.yml up -d

# .env oluştur
echo "DATABASE_URL=postgresql+asyncpg://vela:vela_pass_dev@localhost:5432/vela_bi" > .env
echo "REDIS_URL=redis://localhost:6379/0" >> .env
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env
echo "SECRET_KEY=dev-secret-key" >> .env
echo "ENCRYPTION_KEY=dev-encryption-key-change" >> .env

# Başlat
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Proje Yapısı

```
vela-bi/
├── backend/               # FastAPI backend
│   └── app/
│       ├── api/v1/        # REST endpoints
│       ├── models/        # SQLAlchemy models
│       ├── schemas/       # Pydantic schemas
│       ├── services/      # Business logic
│       ├── connectors/    # Data source drivers
│       ├── ai/            # Claude AI chains
│       └── utils/         # Cache, validator
├── frontend/              # React + TypeScript SPA
│   └── src/
│       ├── pages/         # Route pages
│       ├── components/    # Reusable components
│       ├── stores/        # Zustand state
│       └── lib/           # API client
└── docker-compose.yml     # Production compose
```

## Desteklenen Veri Kaynakları (MVP)
- PostgreSQL
- CSV dosyaları
- Excel dosyaları (DuckDB üzerinden)

## API Dokümantasyonu
Uygulama ayaktayken: http://localhost:8000/docs

## Önemli Endpoint'ler

| Method | Path | Açıklama |
|--------|------|----------|
| POST | /api/v1/auth/register | Yeni kullanıcı |
| POST | /api/v1/auth/login | Login → JWT |
| GET | /api/v1/connections | Bağlantı listesi |
| POST | /api/v1/connections | Bağlantı ekle |
| POST | /api/v1/connections/{id}/test | Bağlantı test |
| POST | /api/v1/datasets | Dataset oluştur |
| POST | /api/v1/datasets/{id}/profile | Profiling başlat |
| POST | /api/v1/ai/datasets/{id}/generate-dashboard | AI dashboard üret |
| POST | /api/v1/ai/datasets/{id}/save-dashboard | Dashboard kaydet |
