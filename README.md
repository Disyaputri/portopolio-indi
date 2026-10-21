# Website Portofolio Indi Nasya Putri

Website portofolio dengan halaman publik dan dashboard admin untuk menambah proyek serta sertifikat.
Dibuat dengan HTML, CSS, Bootstrap, JavaScript, Node.js, dan Express.

## Cara menjalankan di komputer sendiri

Langkah-langkahnya satu per satu:

1. **Pasang Node.js** (versi 18 atau lebih baru) dari https://nodejs.org jika belum ada.
2. **Buka terminal** di dalam folder proyek ini (folder yang berisi `server.js`).
3. **Pasang paket yang dibutuhkan:**
   ```
   npm install
   ```
4. **Buat file `.env`** dengan menyalin `.env.example`:
   - Windows (Command Prompt): `copy .env.example .env`
   - Mac/Linux: `cp .env.example .env`
5. **Buka file `.env`** lalu ganti `ADMIN_PASSWORD` dengan kata sandimu sendiri, dan isi `SESSION_SECRET` dengan teks acak yang panjang.
6. **Jalankan server:**
   ```
   npm start
   ```
7. **Buka di browser:**
   - Website: http://localhost:3000
   - Dashboard admin: http://localhost:3000/admin

Untuk menghentikan server, tekan `Ctrl + C` di terminal.

## Cara memakai dashboard

1. Buka `/admin`, masukkan kata sandi dari file `.env`.
2. Pilih tab **Proyek** atau **Sertifikat**.
3. Isi formulir lalu klik **Simpan**. Data langsung muncul di website.
4. Tombol **Ubah** dan **Hapus** ada di samping setiap data.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `server.js` | Server Express: login, API, penyimpanan data, unggah gambar |
| `public/index.html` | Halaman publik portofolio |
| `public/css/style.css` | Tampilan (tema gelap biru malam, tosca, dan oranye) |
| `public/js/main.js` | Mengambil data dari server untuk halaman publik |
| `public/admin.html` | Halaman dashboard admin |
| `public/js/admin.js` | Logika dashboard (login, tambah, ubah, hapus) |
| `data/db.json` | Tempat data tersimpan (dibuat otomatis saat pertama dijalankan) |
| `data/uploads/` | Tempat gambar yang diunggah |

## Cara kerja singkat

- Browser membuka halaman, lalu `main.js` meminta data ke server lewat alamat `/api/projects` dan `/api/certificates`.
- Server membaca `data/db.json` dan mengirim datanya.
- Untuk menambah, mengubah, atau menghapus, server memeriksa dulu apakah pengunjung sudah login sebagai admin.

## Menaruh website online (agar punya link)

Website ini memakai Express, jadi tidak bisa ditaruh di hosting file statis seperti GitHub Pages. Gunakan layanan yang menjalankan Node.js, misalnya Render, Railway, atau Fly.io.

Garis besar langkahnya:
1. Unggah proyek ini ke GitHub (file `.env` dan folder `data` sudah dikecualikan lewat `.gitignore`).
2. Di layanan hosting, buat **Web Service** dari repo tersebut.
3. Perintah build: `npm install`, perintah start: `npm start`.
4. Isi **Environment Variables**: `ADMIN_PASSWORD`, `SESSION_SECRET`, dan `NODE_ENV=production`.
5. Setelah selesai, kamu mendapat link seperti `https://nama-kamu.onrender.com`.

**Penting:** di paket gratis, banyak hosting menghapus file yang dibuat saat berjalan (termasuk `data/db.json` dan gambar unggahan) setiap kali server dibangun ulang atau dimulai ulang. Ada dua cara mengatasinya:
- Pasang **disk permanen** di hosting, lalu isi `DATA_DIR` dengan lokasi disk itu, atau
- Pindahkan penyimpanan data ke **MySQL**. Ini langkah lanjutan yang pas dengan materi yang sedang kamu pelajari.

## Catatan keamanan

- Jangan membagikan file `.env` dan jangan mengunggahnya ke GitHub.
- Gunakan kata sandi admin yang panjang. Login dibatasi 5 kali salah per 15 menit.
- Saat sudah online dengan HTTPS, aktifkan `NODE_ENV=production`. Jika dijalankan di komputer sendiri, biarkan baris itu tidak aktif.
