# MBG-Track Flutter — Panduan Setup & Troubleshooting

## Versi yang Dibutuhkan (Sudah Dikonfigurasi)

| Komponen | Versi |
|---|---|
| Flutter SDK | >= 3.29.0 |
| Dart SDK | >= 3.3.0 |
| Android Gradle Plugin (AGP) | 8.9.1 |
| Kotlin | 2.1.20 |
| Gradle Wrapper | 8.11.1 |
| Java / JVM | 17 |
| Android compileSdk | 35 |
| Android minSdk | 21 (Android 5.0+) |

---

## Langkah Setup (Urutan WAJIB Diikuti)

### 1. Konfigurasi API URL
Edit file: `lib/services/api_service.dart`

```dart
// Emulator Android (AVD)
static const String baseUrl = 'http://10.0.2.2:3000';

// HP fisik via WiFi (cek IP dengan: ip addr / ifconfig)
static const String baseUrl = 'http://192.168.x.x:3000';

// Production (setelah deploy)
static const String baseUrl = 'https://domain-anda.vercel.app';
```

### 2. Bersihkan dan Reinstall
```bash
flutter clean
flutter pub get
```

### 3. Verifikasi
```bash
flutter doctor -v
# Pastikan semua item centang hijau

flutter analyze
# Pastikan tidak ada error
```

### 4. Jalankan
```bash
# Debug
flutter run --debug

# Release
flutter build apk --release
# APK: build/app/outputs/flutter-apk/app-release.apk
```

---

## Troubleshooting Error Umum

### "AGP version X is lower than minimum Y"
→ Sudah diperbaiki di `android/settings.gradle` (AGP 8.9.1)

### "Gradle version X will soon be dropped"
→ Sudah diperbaiki di `android/gradle/wrapper/gradle-wrapper.properties` (8.11.1)

### "Kotlin version X will soon be dropped"
→ Sudah diperbaiki di `android/settings.gradle` (Kotlin 2.1.20)

### "androidx.browser:1.9.0 requires AGP 8.9.1"
→ Sudah diperbaiki: AGP sekarang 8.9.1

### "Connection refused" di HP
→ Ganti `baseUrl` ke IP komputer Anda (bukan localhost)
→ Pastikan server Next.js berjalan
→ Pastikan HP dan komputer terhubung ke WiFi yang sama

### "Aplikasi Telah Berhenti" di release
→ Sudah diperbaiki: `android.enableR8.fullMode=false`
→ `minifyEnabled false` di release build type

