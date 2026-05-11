# MBG-Track Final — Panduan Setup Lengkap
## WebSocket Real-time + Live GPS + Bukti Wajib

---

## STRUKTUR FOLDER

```
mbg-track-final/
├── mbg-track-mysql/      ← Backend Next.js + MySQL + WebSocket
└── mbg_track_flutter/    ← Android App Flutter
```

---

## BAGIAN 1 — BACKEND (Next.js + WebSocket)

### 1. Buat database MySQL
```sql
CREATE DATABASE mbg_track
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 2. Konfigurasi .env
```bash
cd mbg-track-mysql
cp .env.example .env
```
Edit `.env`:
```env
DATABASE_URL="mysql://root:PASSWORD@localhost:3306/mbg_track"
VAPID_PUBLIC_KEY="..."   # generate di langkah 3
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@mbg.go.id"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."   # sama dengan VAPID_PUBLIC_KEY
```

### 3. Generate VAPID keys (Web Push)
```bash
npm install
node scripts/generate-vapid.js
# Salin output ke .env
```

### 4. Migrate database dan seed
```bash
npm run db:migrate
npm run db:seed
```

### 5. Jalankan server (WebSocket built-in)
```bash
npm run dev
# Server: http://localhost:3000
# WebSocket: ws://localhost:3000/ws
```

---

## BAGIAN 2 — FLUTTER (Android)

### 1. Konfigurasi baseUrl
Edit `lib/services/api_service.dart`:
```dart
// Emulator Android
static const String baseUrl = 'http://10.0.2.2:3000';

// HP fisik (ganti dengan IP komputer di jaringan WiFi yang sama)
static const String baseUrl = 'http://192.168.x.x:3000';

// Production
static const String baseUrl = 'https://domain-anda.com';
```

### 2. Build dan jalankan
```bash
cd mbg_track_flutter
flutter clean
flutter pub get
flutter run
```

### 3. Build APK release
```bash
flutter build apk --release
# APK: build/app/outputs/flutter-apk/app-release.apk
```

---

## AKUN DEFAULT

| Role    | Email                       | Password       |
|---------|-----------------------------|----------------|
| Admin   | admin@mbg.go.id             | Admin@MBG2025! |
| Sekolah | sdn01.menteng@mbg.go.id     | Sekolah@2025!  |
| Sekolah | sdn02.kebayoran@mbg.go.id   | Sekolah@2025!  |
| Kurir   | ahmad.rifai@mbg.go.id       | Kurir@2025!    |
| Kurir   | rudi.hermawan@mbg.go.id     | Kurir@2025!    |

---

## FITUR REAL-TIME (WebSocket)

| Event                | Pengirim   | Penerima           | Keterangan                          |
|----------------------|------------|--------------------|-------------------------------------|
| `order_new`          | Sekolah    | Semua Admin        | Permintaan baru masuk               |
| `order_updated`      | Server     | Admin + Sekolah    | Status order berubah                |
| `proof_submitted`    | Kurir      | Admin + Sekolah    | Bukti foto dikirim                  |
| `location_update`    | Kurir      | Semua Admin        | GPS kurir real-time (5 detik)       |
| `location_stop`      | Kurir      | Semua Admin        | Kurir berhenti berbagi lokasi       |
| `inventory_updated`  | Server     | Admin              | Stok berubah                        |
| `stats_updated`      | Server     | Admin              | Statistik dashboard berubah         |

---

## VALIDASI BUKTI WAJIB

Kurir **tidak dapat** menyelesaikan pengiriman tanpa mengirim bukti foto.
- Server menolak `advance_status` ke `delivered` jika tidak ada `DeliveryProof`
- Flutter menampilkan modal peringatan dan memaksa kurir kirim foto + GPS dulu
- Warning merah muncul di kartu order selama bukti belum dikirim

---

## LIVE GPS TRACKING

1. Kurir memulai pengiriman → GPS otomatis aktif
2. Koordinat dikirim via WebSocket setiap 5 detik
3. Admin dapat melihat lokasi real-time di:
   - **Web**: Tab "Live Tracking" → tampil peta static + koordinat
   - **Web**: Klik tombol "Live Lokasi" di baris order tabel pesanan
   - **Flutter**: Indikator "GPS Live" di kartu order admin
4. Saat kurir selesai / disconnect → lokasi dihapus dari semua client

---


---

## TROUBLESHOOTING

**"WebSocket connection failed"**
→ Pastikan server berjalan dengan `npm run dev` (bukan next dev)
→ Periksa baseUrl di Flutter sudah benar (10.0.2.2 untuk emulator)

**"Bukti wajib" tapi sudah kirim foto**
→ Pastikan POST /api/delivery-proof berhasil (cek network tab)
→ Folder public/uploads/proofs harus writable

**GPS tidak akurat**
→ Test di luar ruangan
→ Berikan izin lokasi "Selalu Izinkan" di pengaturan HP

**Status tidak auto-update di web**
→ Cek koneksi WebSocket di header (indikator hijau/merah)
→ Refresh halaman jika WebSocket reconnect gagal
