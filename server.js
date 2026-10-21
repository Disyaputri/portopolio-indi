// Server utama website portofolio.
// Tugasnya: menyajikan halaman publik, menyimpan data proyek dan sertifikat,
// serta melindungi dashboard admin dengan kata sandi.

require('dotenv').config(); // membaca file .env
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.warn('PERINGATAN: ADMIN_PASSWORD belum diisi di file .env, login admin dinonaktifkan.');
}

// ---------- Penyimpanan data (file JSON) ----------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Isi awal supaya halaman tidak kosong saat pertama dijalankan.
const DATA_AWAL = {
  projects: [
    {
      id: 'awal-house-of-disya',
      title: 'House of Disya',
      description:
        'Website toko online dropship untuk fashion, tas, parfum, dan skincare. Punya halaman pembeli dan dashboard admin. Keranjang belanja mengirim daftar checkout langsung ke WhatsApp.',
      tech: ['HTML', 'CSS', 'JavaScript', 'Bootstrap'],
      repoUrl: 'https://github.com/H8-FTGO-AOH-CLASSROOM-ALL-PHASE/ftgo-rmt-19-P0-MP-Disyaputri',
      demoUrl: '',
      gambar: ''
    },
    {
      id: 'awal-product-dashboard',
      title: 'Product Dashboard',
      description:
        'Aplikasi web dengan fitur daftar akun, login, serta tambah, lihat, ubah, dan hapus produk (CRUD). Tampilan dirancang di Canva/Figma lalu dibuat dengan Bootstrap.',
      tech: ['Node.js', 'Express', 'MySQL', 'Bootstrap'],
      repoUrl: 'https://github.com/H8-FTGO-AOH-CLASSROOM-ALL-PHASE/ftgo-rmt-19-P1-GC01-V1-Disyaputri',
      demoUrl: '',
      gambar: ''
    }
  ],
  certificates: []
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DATA_AWAL, null, 2));
}

function bacaDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Tulis ke file sementara dulu, lalu ganti nama, supaya data tidak rusak jika terhenti di tengah jalan.
function tulisDb(data) {
  const sementara = DB_FILE + '.tmp';
  fs.writeFileSync(sementara, JSON.stringify(data, null, 2));
  fs.renameSync(sementara, DB_FILE);
}

const buatId = () => Date.now().toString(36) + crypto.randomBytes(3).toString('hex');

// ---------- Middleware umum ----------
app.disable('x-powered-by');
if (PRODUCTION) app.set('trust proxy', 1); // hosting biasanya berada di belakang proxy HTTPS

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '50kb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    name: 'portfolio.sid',
    cookie: {
      httpOnly: true, // tidak bisa dibaca JavaScript di browser
      sameSite: 'lax',
      secure: PRODUCTION,
      maxAge: 1000 * 60 * 60 * 8 // login berlaku 8 jam
    }
  })
);

// Hanya admin yang sudah login boleh lewat.
function wajibAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ pesan: 'Silakan login dulu' });
}

// ---------- Login admin ----------
const percobaanGagal = new Map(); // alamat IP -> { jumlah, sampai }
const MAKS_GAGAL = 5;
const JEDA_MS = 15 * 60 * 1000;

app.post('/api/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ pesan: 'ADMIN_PASSWORD belum diisi di file .env' });
  }

  const catatan = percobaanGagal.get(req.ip);
  if (catatan && catatan.sampai > Date.now() && catatan.jumlah >= MAKS_GAGAL) {
    return res.status(429).json({ pesan: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
  }

  // Bandingkan hash supaya panjang kata sandi tidak bocor lewat waktu respons.
  const hash = (teks) => crypto.createHash('sha256').update(teks).digest();
  const dikirim = String((req.body && req.body.password) || '');
  const benar = crypto.timingSafeEqual(hash(dikirim), hash(ADMIN_PASSWORD));

  if (!benar) {
    const sekarang = Date.now();
    const lama = catatan && catatan.sampai > sekarang ? catatan : { jumlah: 0, sampai: sekarang + JEDA_MS };
    lama.jumlah += 1;
    percobaanGagal.set(req.ip, lama);
    return res.status(401).json({ pesan: 'Kata sandi salah' });
  }

  percobaanGagal.delete(req.ip);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ pesan: 'Gagal membuat sesi' });
    req.session.admin = true;
    res.json({ ok: true });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('portfolio.sid');
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  res.json({ admin: Boolean(req.session && req.session.admin) });
});

// ---------- Unggah gambar ----------
const EKSTENSI = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // Nama file diacak supaya tidak bentrok dan tidak bisa ditebak.
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EKSTENSI[file.mimetype])
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 }, // maksimal 3 MB
  fileFilter: (req, file, cb) => {
    if (EKSTENSI[file.mimetype]) return cb(null, true);
    cb(new Error('Gambar harus berformat JPG, PNG, WEBP, atau GIF'));
  }
});

function hapusBerkasUnggahan(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}

// Hapus gambar lama dari disk (hanya yang ada di folder uploads).
function hapusGambarLama(urlGambar) {
  if (urlGambar && urlGambar.startsWith('/uploads/')) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(urlGambar)), () => {});
  }
}

// ---------- Pembersihan dan pemeriksaan isian ----------
const teks = (nilai, maks) => String(nilai == null ? '' : nilai).trim().slice(0, maks);

// Hanya link http/https yang diterima. Mengembalikan null jika tidak valid.
function urlAman(nilai) {
  const s = teks(nilai, 300);
  if (!s) return '';
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

function bersihkanProyek(body = {}) {
  const title = teks(body.title, 100);
  if (!title) return { error: 'Judul proyek wajib diisi' };
  const repoUrl = urlAman(body.repoUrl);
  const demoUrl = urlAman(body.demoUrl);
  if (repoUrl === null || demoUrl === null) {
    return { error: 'Link harus diawali http:// atau https://' };
  }
  const tech = teks(body.tech, 300)
    .split(',')
    .map((t) => t.trim().slice(0, 30))
    .filter(Boolean)
    .slice(0, 12);
  return { data: { title, description: teks(body.description, 600), tech, repoUrl, demoUrl } };
}

function bersihkanSertifikat(body = {}) {
  const title = teks(body.title, 100);
  if (!title) return { error: 'Nama sertifikat wajib diisi' };
  const credentialUrl = urlAman(body.credentialUrl);
  if (credentialUrl === null) return { error: 'Link harus diawali http:// atau https://' };
  return {
    data: { title, issuer: teks(body.issuer, 100), year: teks(body.year, 10), credentialUrl }
  };
}

// ---------- Rute CRUD (dipakai untuk proyek dan sertifikat) ----------
// CRUD = Create (tambah), Read (lihat), Update (ubah), Delete (hapus).
function buatCrud(koleksi, bersihkan) {
  const rute = `/api/${koleksi}`;

  // Lihat semua: boleh diakses siapa saja (untuk halaman publik).
  app.get(rute, (req, res) => {
    res.json(bacaDb()[koleksi]);
  });

  // Tambah: khusus admin. wajibAdmin dijalankan sebelum upload supaya orang asing tidak bisa mengunggah.
  app.post(rute, wajibAdmin, upload.single('gambar'), (req, res) => {
    const hasil = bersihkan(req.body);
    if (hasil.error) {
      hapusBerkasUnggahan(req.file);
      return res.status(400).json({ pesan: hasil.error });
    }
    const db = bacaDb();
    const item = { id: buatId(), ...hasil.data, gambar: req.file ? `/uploads/${req.file.filename}` : '' };
    db[koleksi].unshift(item); // item terbaru tampil paling atas
    tulisDb(db);
    res.status(201).json(item);
  });

  // Ubah: khusus admin.
  app.put(`${rute}/:id`, wajibAdmin, upload.single('gambar'), (req, res) => {
    const db = bacaDb();
    const item = db[koleksi].find((x) => x.id === req.params.id);
    if (!item) {
      hapusBerkasUnggahan(req.file);
      return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    }
    const hasil = bersihkan(req.body);
    if (hasil.error) {
      hapusBerkasUnggahan(req.file);
      return res.status(400).json({ pesan: hasil.error });
    }
    Object.assign(item, hasil.data);
    if (req.file) {
      hapusGambarLama(item.gambar);
      item.gambar = `/uploads/${req.file.filename}`;
    }
    tulisDb(db);
    res.json(item);
  });

  // Hapus: khusus admin.
  app.delete(`${rute}/:id`, wajibAdmin, (req, res) => {
    const db = bacaDb();
    const urutan = db[koleksi].findIndex((x) => x.id === req.params.id);
    if (urutan === -1) return res.status(404).json({ pesan: 'Data tidak ditemukan' });
    const [dihapus] = db[koleksi].splice(urutan, 1);
    hapusGambarLama(dihapus.gambar);
    tulisDb(db);
    res.json({ ok: true });
  });
}

buatCrud('projects', bersihkanProyek);
buatCrud('certificates', bersihkanSertifikat);

app.use('/api', (req, res) => res.status(404).json({ pesan: 'Rute tidak ditemukan' }));

// ---------- Berkas statis dan halaman ----------
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ---------- Penanganan error ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const pesan = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran gambar maksimal 3 MB' : 'Gambar tidak dapat diunggah';
    return res.status(400).json({ pesan });
  }
  if (err && err.message && err.message.startsWith('Gambar harus')) {
    return res.status(400).json({ pesan: err.message });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ pesan: 'Data yang dikirim tidak valid' });
  }
  console.error(err);
  res.status(500).json({ pesan: 'Terjadi kesalahan di server' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Dashboard admin di http://localhost:${PORT}/admin`);
});
