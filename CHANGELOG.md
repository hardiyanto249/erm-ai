# CHANGELOG — ERM ZISWAF
**Enterprise Risk Management System for Lembaga Amil Zakat**

Semua perubahan signifikan pada proyek ini didokumentasikan di file ini.
Format mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]
- Notifikasi otomatis saat data baru di-upload
- Versioning model prediksi
- Otomatisasi pipeline retraining

---

## [1.3.0] — 2026-04-10
### 🤖 AI Predictive Analytics — Rolling Window & What-If Simulator

#### Added
- **`RHAPredictionForm.tsx`** — Halaman baru "AI Prediction" di sidebar
  - Kartu prediksi otomatis RHA & ACR berbasis regresi multivariat
  - Badge status *Aman* / *Melewati Batas* per metrik
  - Progress bar akurasi model (R²)
  - Informasi prediktor utama yang digunakan model
- **What-If Simulator** — Fitur simulasi skenario interaktif
  - Toggle target: **Simulasi RHA** / **Simulasi ACR**
  - Input nilai prediktor dengan label dinamis (sesuai prediktor dominan dari data)
  - Auto-populate nilai dari data historis terkini
  - Hasil simulasi instan dengan threshold syariah (RHA: 12.5%, ACR: 20%)
- **Rolling Window 5 Tahun** — Backend hanya menggunakan data 5 tahun terakhir
  - Query SQL difilter: `recorded_at >= NOW() - INTERVAL '5 years'`
  - Mendukung pendekatan *Rolling Window Approach* (Jarvis/Siska recommendation)
- **Data Freshness Banner** — Menampilkan periode data aktif model
  - Contoh: *"Data dari: 2019-01-01 s/d 2023-12-31"*
  - Label *"♻️ Auto-Retrain setiap request"*
- **Menu AI Prediction** ditambahkan ke Sidebar dengan ikon lampu

#### Changed
- `analytics_handlers.go` — Tambah tracking `data_from`, `data_to`, `window` di response prediksi
- `App.tsx` — Tambah route `'prediction'` ke type `View` dan `renderView()`
- `Sidebar.tsx` — Tambah `PredictionIcon` dan nav item *AI Prediction*
- `RHAPredictionForm.tsx` — Query param `?laz_id=X` dikirim untuk support admin impersonation

#### Fixed
- What-If Simulator tidak responsif ketika `lazId === 0` (admin view)
- Label prediktor hardcoded "PromotionCost" diganti menjadi dinamis dari API response

---

## [1.2.0] — 2026-04-10
### 🔐 Perbaikan Login & Register Flow

#### Fixed
- **JSON Parse Error saat login gagal** — Backend Go mengirim plain text saat error,
  frontend sekarang membaca response sebagai teks terlebih dahulu, lalu mencoba parse JSON.
  Error pesan kini ditampilkan dengan jelas alih-alih crash dengan pesan teknis.
- **404 saat login** — Backend perlu direstart dengan `go run main.go` (bukan executable lama)
  agar semua route `/api/auth/login` dan `/api/auth/register` terdaftar dengan benar.

#### Changed
- `Login.tsx` — `handleLogin` dan `handleRegister` menggunakan `res.text()` + JSON.parse fallback

---

## [1.1.0] — 2026-04-10
### ⚙️ Konfigurasi & Setup Deployment Lokal

#### Changed
- `vite.config.ts` — Port frontend diubah dari `3000` ke `5173` untuk menghindari bentrok
  dengan AI Hub (Siska) yang berjalan di port `3000`

#### Fixed
- Konflik port antara ERM Ziswaf frontend dan AI Hub (ClawdBot)

#### Notes
- Go compile error *"not enough space on disk"* diatasi dengan environment variable:
  ```
  $env:GOTMPDIR = "D:\GoTemp"
  $env:GOCACHE  = "D:\GoCache"
  ```

---

## [1.0.0] — 2026-04-08
### 🚀 Initial Release — Setup & Deployment

#### Tech Stack
| Layer | Teknologi |
|---|---|
| Backend | Go (Golang) 1.21+, `net/http`, `lib/pq` |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| Database | PostgreSQL 14+ |
| AI | Google Gemini 2.0 Flash API |

#### Backend Features (Go)
- **Auto-migration** — Tabel dibuat otomatis saat pertama kali dijalankan
- **Auto-seeding** — Data LAZ, risiko, metrik, ZIS di-seed otomatis
- **Auth System** — Register LAZ + Admin, Login dengan token `laz:<ID>`
- **Risk Management API** — CRUD risiko dengan mitigation tracking
- **Analytics API**:
  - `/api/analytics/anomaly` — Deteksi anomali real-time RHA & ACR
  - `/api/analytics/prediction` — Prediksi multivariat (auto-select predictor)
  - `/api/analytics/trends` — Tren historis RHA & ACR
  - `/api/analytics/benchmark` — Perbandingan benchmark antar LAZ
- **Data Import API** — Upload XLSX/CSV dengan dukungan format Wide & Long
- **Early Warning System (EWS)** — Alert otomatis di dashboard

#### Frontend Features (React)
- **Dashboard** — KPI cards, EWS alert, prediction summary, charts
- **Risk Management** — Tabel risiko, tambah/edit/hapus, filter kategori
- **Sharia Compliance** — Checklist kepatuhan syariah
- **ZIS Tracking** — Visualisasi zakat, infaq, wakaf, distribusi ashnaf
- **Configuration** — Setting RHA/ACR limit, manajemen LAZ (admin)
- **Import Historical Data** — Upload data historis XLSX ke database

#### Environment Variables
```
# Backend
DATABASE_URL=postgres://postgres:postgres@localhost:5432/erm_ziswaf?sslmode=disable
PORT=8080
GEMINI_API_KEY=<your-key>

# Frontend
VITE_API_BASE_URL=http://localhost:8080
```

#### Default Admin Credentials (Seeded)
```
Email    : admin@erm.com
Password : admin123
```

---

## Catatan Riset & Konteks Tesis

**Judul Riset:** Implementasi Enterprise Risk Management (ERM) berbasis AI Predictive Analytics
untuk Lembaga Amil Zakat (LAZ) — Pendekatan Syariah Governance

**Data yang Digunakan:**
- `rha_bzn.xlsx` — Data historis Rasio Hak Amil (RHA) BAZNAS 2019–2023
- `acr_bzn.xlsx` — Data historis Amil Cost Ratio (ACR) BAZNAS 2019–2023

**Alur Penggunaan untuk LAZ Baru:**
1. Register → LAZ & admin account dibuat
2. Login → akses dashboard
3. Import XLSX historis (sekali saja) → model AI dilatih otomatis
4. Gunakan What-If Simulator → analisis skenario RHA/ACR
5. Upload data baru kapan saja → model retrain otomatis

**Metodologi Prediksi:**
- Primary: Regresi Linear Multivariat (auto-select prediktor dominan)
- Fallback 1: Regresi single predictor terbaik (jika data tidak cukup)
- Fallback 2: Time-Series Trend (jika tidak ada prediktor eksternal)
- Rolling Window: 5 tahun terakhir (sesuai rekomendasi best practice ML)

---

*Dikembangkan dengan bantuan Antigravity AI (Google DeepMind) & Jarvis/Siska (AI Hub)*
*Maintainer: Yan Hardiyanto*
