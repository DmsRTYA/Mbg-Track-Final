# MBG-Track — Panduan Setup Lengkap
## Next.js (MySQL) + Flutter (Android/iOS)

---

## STRUKTUR FOLDER

```
mbg-track-complete/
├── mbg-track-mysql/        ← Backend + Web (Next.js + MySQL)
└── mbg_track_flutter/      ← Mobile App (Flutter)
```

---

# BAGIAN 1 — SETUP BACKEND (Next.js + MySQL)

## Prasyarat
- Node.js >= 18
- MySQL 8.0 (lokal atau cloud)

## Langkah 1 — Buat Database MySQL

Login ke MySQL lalu jalankan:
```sql
CREATE DATABASE mbg_track
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

## Langkah 2 — Konfigurasi .env

```bash
cd mbg-track-mysql
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="mysql://root:PASSWORD_ANDA@localhost:3306/mbg_track"
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

## Langkah 3 — Install, Migrate, Seed

```bash
npm install
npm run db:migrate     # buat semua tabel di MySQL
npm run db:seed        # isi data awal
npm run dev            # jalankan server
```

Akses: http://localhost:3000

---

## DEPLOY KE VERCEL + PLANET SCALE / RAILWAY MySQL

### Opsi A — Railway (paling mudah, gratis)

1. Buka https://railway.app → New Project → Provision MySQL
2. Copy **DATABASE_URL** dari tab Variables
3. Push kode ke GitHub
4. Di Railway → New → GitHub Repo → pilih repo
5. Tambahkan environment variables:
   - `DATABASE_URL` = (dari langkah 2)
   - `NEXT_PUBLIC_API_URL` = URL Railway Anda
6. Railway otomatis deploy setiap push

### Opsi B — Vercel + PlanetScale

1. Buat database di https://planetscale.com
2. Pilih Connect → Prisma → copy DATABASE_URL
3. Push ke GitHub, import di https://vercel.com
4. Tambahkan env vars di Vercel dashboard:
   - `DATABASE_URL` = (dari PlanetScale)
   - `NEXT_PUBLIC_API_URL` = https://domain-anda.vercel.app
5. Jalankan seed sekali dari lokal dengan DATABASE_URL production

### Opsi C — VPS Sendiri (Nginx + PM2)

```bash
# Di VPS (Debian/Ubuntu)
npm install
npm run db:migrate:deploy
npm run db:seed
npm run build
pm2 start npm --name "mbg-track" -- start
```

Nginx config (simpan di /etc/nginx/sites-available/mbg-track):
```nginx
server {
    listen 80;
    server_name domain-anda.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

# BAGIAN 2 — SETUP FLUTTER (Mobile App)

## Prasyarat

1. Install Flutter SDK: https://docs.flutter.dev/get-started/install
2. Install Android Studio (untuk emulator & Android SDK)
3. Untuk iOS: Xcode di macOS

```bash
# Verifikasi instalasi Flutter
flutter doctor
```
Semua item harus centang hijau sebelum melanjutkan.

## Langkah 1 — Konfigurasi URL API

**PENTING:** Edit file `lib/services/api_service.dart`, ganti nilai `baseUrl`:

```dart
// Development (jalankan di emulator/HP, server di komputer yang sama)
static const String baseUrl = 'http://192.168.1.xxx:3000';
//   ↑ ganti dengan IP komputer Anda (cek dengan: ip addr atau ifconfig)
//   Emulator Android: gunakan http://10.0.2.2:3000
//   iOS Simulator   : gunakan http://localhost:3000

// Production (setelah deploy ke Vercel/Railway)
static const String baseUrl = 'https://mbg-track.vercel.app';
```

## Langkah 2 — Install Packages

```bash
cd mbg_track_flutter
flutter pub get
```

## Langkah 3 — Jalankan di Emulator/HP

```bash
# Cek device yang tersedia
flutter devices

# Jalankan di device tertentu
flutter run -d <device-id>

# Jalankan di semua device yang terhubung
flutter run
```

## Langkah 4 — Build APK (Android)

```bash
# Debug APK (untuk testing)
flutter build apk --debug

# Release APK (untuk distribusi)
flutter build apk --release

# APK tersimpan di:
# build/app/outputs/flutter-apk/app-release.apk
```

## Langkah 5 — Build AAB (untuk Google Play Store)

```bash
flutter build appbundle --release
# File: build/app/outputs/bundle/release/app-release.aab
```

## Langkah 6 — Build iOS (khusus macOS)

```bash
flutter build ipa --release
# Buka di Xcode untuk submit ke App Store
```

---

## AKUN DEFAULT (setelah seed)

| Role     | Email                       | Password       |
|----------|-----------------------------|----------------|
| Admin    | admin@mbg.go.id             | Admin@MBG2025! |
| Sekolah  | sdn01.menteng@mbg.go.id     | Sekolah@2025!  |
| Sekolah  | sdn02.kebayoran@mbg.go.id   | Sekolah@2025!  |
| Sekolah  | min01.cempaka@mbg.go.id     | Sekolah@2025!  |
| Kurir    | ahmad.rifai@mbg.go.id       | Kurir@2025!    |
| Kurir    | rudi.hermawan@mbg.go.id     | Kurir@2025!    |
| Kurir    | slamet.wahyudi@mbg.go.id    | Kurir@2025!    |

---

## MANAJEMEN AKUN VIA THUNDER CLIENT

### Buat Akun Sekolah Baru
```
POST  /api/users
Content-Type: application/json
```
```json
{
  "name": "SDN 10 Jakarta",
  "email": "sdn10@mbg.go.id",
  "password": "Sekolah@2025!",
  "role": "school",
  "schoolData": {
    "address": "Jl. Contoh No. 1, Jakarta",
    "principalName": "Bapak Contoh",
    "totalStudents": 300
  }
}
```

### Buat Akun Kurir Baru
```json
{
  "name": "Nama Kurir",
  "email": "kurir@mbg.go.id",
  "password": "Kurir@2025!",
  "role": "courier",
  "courierData": { "phone": "08xxxxxxxxxx" }
}
```

---

## TROUBLESHOOTING

**Flutter: "Connection refused"**
→ Pastikan server Next.js berjalan dan `baseUrl` di `api_service.dart` sudah menggunakan IP lokal, bukan `localhost`

**Android Emulator tidak bisa akses API**
→ Gunakan `http://10.0.2.2:3000` sebagai baseUrl (10.0.2.2 = host komputer dari emulator Android)

**MySQL: "Access denied"**
→ Cek user/password di DATABASE_URL, pastikan user memiliki privilege ke database mbg_track

**Prisma: "Table doesn't exist"**
→ Jalankan `npm run db:migrate` ulang

**Flutter: "Null check operator used on null value"**
→ Pastikan server API berjalan dan bisa diakses dari device
