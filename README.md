# WebView Wrapper Template

Template repo Android untuk **WebToApp Builder**. Repo ini menerima input dari workflow GitHub Actions, mengubah konfigurasi Capacitor, nama aplikasi, warna, dan ikon, lalu membangun APK Android yang siap dipasang.

Template memakai **Capacitor 6.2.3** karena kompatibel dengan **Java 17** di runner GitHub Actions. Capacitor 7 membutuhkan Java 21.

## Hasil build

- `android/app/build/outputs/apk/release/app-release.apk`
- Diunggah sebagai artifact GitHub Actions bernama **`app-release`**
- Retention artifact: 90 hari
- APK ditandatangani dengan **debug keystore** agar bisa langsung di-sideload. Lihat bagian [Signing](#signing) untuk produksi.

## Struktur repo

```text
webview-wrapper-template/
├── .github/
│   └── workflows/
│       └── build.yml              # workflow build APK
├── android/                       # project Android native (committed)
│   ├── app/
│   │   ├── build.gradle           # signing config & konfigurasi app
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── res/               # ikon, strings, colors
│   ├── gradle/wrapper/            # Gradle 8.2.1 (bin)
│   └── gradlew
├── scripts/
│   └── inject-config.js           # validasi input + patch config/ikon
├── www/
│   └── index.html                 # fallback lokal Capacitor
├── capacitor.config.ts            # appId, appName, server.url
├── package.json
└── package-lock.json
```

`android/` sengaja ikut di-commit. Workflow tidak menjalankan `npx cap add android`, hanya `npx cap sync android`, supaya build lebih cepat dan konfigurasi native (signing, warna, ikon) konsisten.

Folder generated seperti `android/capacitor-cordova-android-plugins/`, `android/app/src/main/assets/public/`, dan `capacitor.config.json` tidak di-commit. Semuanya dibuat ulang oleh `npx cap sync android`.

## Prasyarat

### Untuk build di GitHub Actions

- Akun GitHub dengan Actions aktif
- Repo template ini sudah di-fork atau di-publish ke akun sendiri
- Personal Access Token (PAT) dengan scope `repo` dan `workflow` (dibuat di aplikasi WebToApp)

### Untuk build lokal

- Node.js 20+
- JDK 17 (Temurin direkomendasikan)
- Android SDK Platform 34 + Build Tools 34
- `JAVA_HOME` dan `ANDROID_HOME` diatur

## Cara memakai lewat aplikasi WebToApp

1. **Fork repo template** ini ke akun GitHub kamu, atau gunakan repo yang sudah kamu publish.
2. Buka `app.json` di project aplikasi WebToApp dan isi:

   ```json
   "extra": {
     "templateRepo": "username-kamu/webview-wrapper-template"
   }
   ```

   Kalau dikosongkan, onboarding aplikasi akan meminta slug repo template secara manual.
3. Buat **classic PAT** di <https://github.com/settings/tokens/new?scopes=repo,workflow&description=WebToApp%20Builder>. Scope yang wajib: `repo` dan `workflow`.
4. Di onboarding aplikasi, masukkan:
   - slug repo template (contoh `username-kamu/webview-wrapper-template`)
   - nama repo hasil fork (default `webview-wrapper-template`)
   - PAT
5. Aktifkan **fork otomatis** agar aplikasi membuat fork `<username>/webview-wrapper-template` bila belum ada.
6. Isi form 4 langkah: URL `https://`, nama aplikasi 2–30 karakter, logo PNG/JPG maksimal 2 MB, dan warna utama.
7. Aplikasi memanggil `workflow_dispatch`, memantau run setiap 5 detik, lalu mengunduh artifact APK.

> Token hanya disimpan di perangkat (Expo SecureStore) dan dikirim langsung ke `api.github.com`. Tidak ada backend perantara.

## Build manual lewat GitHub Actions

1. Buka tab **Actions** di repo hasil fork.
2. Pilih workflow **Build WebView APK**.
3. Klik **Run workflow** dan isi input:

   | Input        | Wajib | Format / batas                                                        |
   | ------------ | ----- | --------------------------------------------------------------------- |
   | `url`        | ya    | URL lengkap dengan `https://`                                         |
   | `appName`    | ya    | 2–30 karakter, tanpa karakter kontrol                                  |
   | `logoBase64` | ya    | PNG/JPG base64, maksimal 52.000 karakter (payload `workflow_dispatch`) |
   | `themeColor` | ya    | `#RRGGBB`, default `#2563EB`                                           |

4. Tunggu hingga job **Build release APK** selesai.
5. Unduh artifact **`app-release`** dari halaman run, ekstrak ZIP-nya, lalu pasang `app-release.apk` di Android.

### Membuat `logoBase64`

Logo asli maksimal **2 MB**. Karena batas payload `workflow_dispatch` sekitar 65.535 karakter, base64 logo harus **≤ 52.000 karakter**. Aplikasi WebToApp sudah mengecilkan logo otomatis ke 512 px dan menurunkan ukuran bila perlu.

Linux/macOS:

```bash
base64 -w0 logo.png
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("logo.png"))
```

Kalau hasilnya lebih dari 52.000 karakter, kecilkan logo terlebih dahulu (misalnya 256×256 px) lalu ulangi. Prefix `data:image/png;base64,` boleh disertakan; script akan membersihkannya.

## Alur workflow

`.github/workflows/build.yml` menjalankan:

1. Checkout repo
2. Setup Node.js 20 + cache npm
3. Setup Java 17 (Temurin)
4. Setup Android SDK
5. Buat debug keystore di `$HOME/.android/debug.keystore` bila belum ada
6. `npm install --no-audit --no-fund`
7. `node scripts/inject-config.js`
8. `npx cap sync android`
9. `./gradlew assembleRelease --no-daemon`
10. Upload `app-release.apk` sebagai artifact

Workflow memakai `permissions: contents: read`, `concurrency` per branch, dan timeout 45 menit.

## Script `inject-config.js`

Script membaca environment variable:

| Variable            | Fungsi                                                          |
| ------------------- | --------------------------------------------------------------- |
| `INPUT_URL`         | URL WebView, wajib `https://`, tanpa kredensial di URL          |
| `INPUT_APPNAME`     | Nama aplikasi 2–30 karakter                                     |
| `INPUT_LOGO_BASE64` | Logo PNG/JPG base64, maksimal 2 MB setelah decode               |
| `INPUT_THEMECOLOR`  | Warna utama `#RRGGBB`                                           |

Yang diubah:

- `capacitor.config.ts` → `appName` dan `server.url`
- `android/app/src/main/res/values/strings.xml` → `app_name` dan `title_activity_main`
- `android/app/src/main/res/values/colors.xml` → `colorPrimary`, `colorPrimaryDark`, `colorAccent`
- `android/app/src/main/res/values/ic_launcher_background.xml` → warna latar adaptive icon
- `mipmap-mdpi` s/d `mipmap-xxxhdpi` → `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`

Script **fail fast**: URL non-HTTPS, nama tidak valid, base64 rusak, logo bukan PNG/JPG, atau logo > 2 MB akan menghentikan build dengan exit code 1. Semua nilai XML di-escape.

### Tes script secara lokal

```bash
# Linux/macOS
export INPUT_URL="https://example.com"
export INPUT_APPNAME="Contoh App"
export INPUT_THEMECOLOR="#2563EB"
export INPUT_LOGO_BASE64="$(base64 -w0 logo.png)"
node scripts/inject-config.js
```

```powershell
# Windows PowerShell
$env:INPUT_URL = "https://example.com"
$env:INPUT_APPNAME = "Contoh App"
$env:INPUT_THEMECOLOR = "#2563EB"
$env:INPUT_LOGO_BASE64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("logo.png"))
node scripts/inject-config.js
```

## Build lokal

```bash
npm install

export INPUT_URL="https://example.com"
export INPUT_APPNAME="Contoh App"
export INPUT_THEMECOLOR="#2563EB"
export INPUT_LOGO_BASE64="$(base64 -w0 logo.png)"

node scripts/inject-config.js
npx cap sync android

cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon
```

Windows:

```powershell
npm install
node scripts/inject-config.js
npx cap sync android
cd android
.\gradlew.bat assembleRelease --no-daemon
```

Hasil: `android/app/build/outputs/apk/release/app-release.apk`.

Untuk mengembalikan konfigurasi default setelah tes, ubah kembali `capacitor.config.ts` ke `https://example.com` dan `WebToApp`, lalu jalankan `npx cap sync android`. Ikon default juga perlu dipulihkan dari git (`git checkout -- android/app/src/main/res/mipmap-*`) bila sebelumnya diinjeksi dengan logo uji.

## Signing

Saat ini `android/app/build.gradle` memakai:

```gradle
signingConfigs {
    release {
        storeFile file(System.getProperty("user.home") + "/.android/debug.keystore")
        storePassword "android"
        keyAlias "androiddebugkey"
        keyPassword "android"
    }
}
```

Workflow membuat debug keystore standar di runner. Ini cukup untuk **sideload/testing**, bukan untuk Google Play.

Untuk produksi:

1. Buat keystore rilis sendiri:
   ```bash
   keytool -genkeypair -v -keystore release.keystore -alias release \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Simpan sebagai GitHub Actions secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
3. Decode keystore di workflow dan ganti `signingConfigs.release` agar memakai file tersebut.
4. **Jangan commit keystore rilis.** Simpan backup; kehilangan keystore berarti tidak bisa merilis update dengan package name yang sama.

> Karena setiap run workflow membuat debug keystore baru di runner, APK dari run berbeda bisa memiliki signature berbeda. Jika Android menolak update, uninstall aplikasi lama lalu pasang APK baru. Untuk update yang mulus, gunakan keystore rilis yang tetap.

## Troubleshooting

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| Workflow tidak muncul di tab Actions | Actions disabled atau workflow belum ada di branch default | Aktifkan Actions di Settings repo; pastikan `build.yml` ada di branch default |
| `401 Bad credentials` | Token salah, kedaluwarsa, atau dicabut | Buat PAT baru, simpan ulang di Pengaturan aplikasi |
| `403 Resource not accessible by personal access token` | Scope kurang | Classic PAT wajib `repo` + `workflow`; fine-grained token butuh izin Actions + Contents |
| `404 Not Found` saat dispatch | Repo/nama workflow/branch salah, atau fork belum selesai | Pastikan repo hasil fork ada, `build.yml` ada di branch `main`, dan fork sudah selesai |
| `No ref found` / workflow tidak bisa dijalankan | Repo hasil fork belum punya commit atau branch default bukan `main` | Sinkronkan fork dengan upstream, cek branch default |
| Build gagal di `npm install` (sharp) | Cache/registry bermasalah | Hapus cache npm di tab Actions, jalankan ulang |
| Build gagal `Unsupported class file major version` | Java tidak 17 | Pastikan `actions/setup-java` memakai Temurin 17 |
| Build gagal `SDK location not found` | Android SDK tidak terpasang | Workflow sudah memakai `android-actions/setup-android`; untuk lokal isi `ANDROID_HOME` |
| `Could not unzip gradle-...` | Disk runner penuh | Workflow memakai `gradle-8.2.1-bin.zip`; hapus cache Gradle bila perlu |
| Artifact tidak ditemukan | Upload gagal atau APK tidak ada | Cek step **Upload APK artifact** dan path `app-release.apk` |
| Artifact sudah kedaluwarsa | Retention 90 hari | Jalankan build ulang |
| APK tidak bisa dipasang | Signature berbeda / package bentrok | Uninstall versi lama, atau gunakan keystore yang sama |
| WebView menampilkan halaman kosong | Situs memblokir WebView, butuh login, atau bukan HTTPS | Pastikan situs bisa diakses di WebView; beberapa situs memblokir embedded browser |
| Ikon tidak berubah | Cache launcher Android | Uninstall aplikasi, pasang ulang, atau restart launcher |

## Batasan

- Hanya Android (APK). Tidak ada iOS.
- WebView membutuhkan koneksi internet; tidak ada mode offline.
- Situs yang memblokir embedded WebView (misalnya beberapa penyedia login OAuth) tidak bisa dipaksa berjalan hanya dengan template ini.
- APK default memakai debug signing; untuk distribusi serius gunakan keystore rilis.
- Kuota GitHub Actions mengikuti akun pemilik repo (gratis untuk repo publik dengan batas menit tertentu).
- Semua APK memakai `applicationId` yang sama (`com.webtoapp.wrapper`). Build baru akan menggantikan aplikasi lama dengan package yang sama; untuk memasang beberapa aplikasi sekaligus, ubah `applicationId` di `android/app/build.gradle` sebelum build.

## Lisensi

MIT.
