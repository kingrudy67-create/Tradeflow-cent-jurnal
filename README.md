# TradeFlow Cent Journal

Aplikasi SPA jurnal trading akun cent (USC), dibuat dengan HTML/CSS/JavaScript tanpa library eksternal. Semua kalkulasi dan penyimpanan berjalan lokal di perangkat.

## Fitur

- Registrasi dan login lokal per username.
- Data transaksi, catatan, profil, modal, dan kurs dipisahkan per akun.
- Input P/L dalam USC; USD = USC / 100; IDR = USD × kurs.
- Dashboard, multi-posisi per tanggal, edit/hapus, filter dan pencarian.
- Grafik equity dan win/loss berbasis SVG lokal (tanpa Chart.js/CDN agar benar-benar offline).
- Catatan evaluasi terpisah dari transaksi.
- Ekspor CSV dan backup JSON.
- PWA + service worker untuk cache aset inti.

## Struktur

```text
tradeflow-cent-journal/
├── index.html
├── app.js
├── manifest.json
├── sw.js
├── README.md
├── icon-192.png
└── icon-512.png
```

## Menjalankan di Android

Service Worker dan instalasi PWA membutuhkan secure context: HTTPS atau localhost. Membuka `index.html` langsung melalui `file://` tidak mengaktifkan service worker.

### Opsi A — Hosting HTTPS

1. Unggah seluruh isi folder ke repository GitHub.
2. Aktifkan GitHub Pages pada branch/folder yang benar.
3. Buka URL HTTPS dari Chrome Android.
4. Buka menu Chrome → **Install app** atau **Add to Home screen**.
5. Setelah halaman berhasil dibuka sekali dan aset inti tersimpan, aplikasi dapat dibuka kembali tanpa koneksi untuk penggunaan lokal.

### Opsi B — PWABuilder

1. Deploy folder ke URL HTTPS terlebih dahulu.
2. Masukkan URL tersebut ke PWABuilder.
3. Periksa manifest, ikon, dan service worker.
4. Ikuti proses packaging Android yang disediakan PWABuilder.

AppYet atau pembungkus WebView lain memiliki prosedur sendiri; pastikan wrapper mengizinkan penyimpanan lokal dan tidak menghapus data saat aplikasi ditutup.

## Ikon PWA

Buat ikon PNG ukuran 192×192 dan 512×512 bernama `icon-192.png` dan `icon-512.png`, atau ganti path ikon pada manifest. Ikon tidak memengaruhi fungsi aplikasi di browser.

## Catatan penting: keamanan & privasi

- Ini adalah **offline authentication**, bukan sistem keamanan setara layanan online. Data berada di browser/perangkat dan dapat hilang jika data aplikasi/browser dibersihkan, aplikasi dihapus, atau perangkat rusak.
- Password diproses menggunakan SHA-256 + salt melalui Web Crypto. Ini lebih baik daripada menyimpan password mentah, tetapi SHA-256 bukan algoritma password hashing khusus seperti Argon2id/bcrypt. Jangan gunakan password yang dipakai pada akun lain.
- JavaScript yang berjalan pada origin yang sama berpotensi mengakses data aplikasi. Jangan menganggap jurnal ini sebagai brankas rahasia.
- Multi-user di sini berarti pemisahan data berdasarkan username dalam penyimpanan browser yang sama, bukan akun terenkripsi terpisah pada tingkat OS.
- Ekspor backup JSON secara berkala dan simpan di tempat aman.
- Nilai equity adalah perhitungan jurnal: modal awal + akumulasi P/L yang dicatat. Aplikasi tidak terhubung ke broker dan tidak membaca saldo akun secara langsung.

## Rumus

- `USD = USC / 100`
- `IDR = USD × kurs USD/IDR`
- `Equity (USC) = modal awal (USC) + total P/L (USC)`
- `ROI (%) = total P/L / modal awal × 100`

## Grafik

Grafik menggunakan SVG native, bukan Chart.js. Keputusan ini menghindari dependensi CDN sehingga aset grafik tetap tersedia tanpa internet sejak instalasi pertama. Semua file runtime aplikasi berada di folder ini.
