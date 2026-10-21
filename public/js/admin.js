// Skrip dashboard admin: login, lihat daftar, tambah, ubah, dan hapus proyek atau sertifikat.
// Teks selalu dimasukkan lewat textContent supaya aman dari kode berbahaya.

const $ = (selektor) => document.querySelector(selektor);

// ---------- Fungsi bantu ----------

// Memanggil server dan mengubah jawabannya menjadi data.
// Jika server menolak, lempar error berisi pesan dari server.
async function panggilApi(url, opsi = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...opsi });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && url !== '/api/login') {
    tampilkanLogin(); // sesi habis, kembali ke halaman login
  }
  if (!res.ok) throw new Error(data.pesan || 'Terjadi kesalahan');
  return data;
}

let penghitungPesan;
function tampilkanPesan(isi, jenis = 'success') {
  const el = $('#pesan');
  el.className = `alert alert-${jenis}`;
  el.textContent = isi;
  clearTimeout(penghitungPesan);
  penghitungPesan = setTimeout(() => el.classList.add('d-none'), 4000);
}

function buatEl(tag, kelas, isi) {
  const el = document.createElement(tag);
  if (kelas) el.className = kelas;
  if (isi) el.textContent = isi;
  return el;
}

function tampilkanLogin() {
  $('#tampilanDashboard').classList.add('d-none');
  $('#tampilanLogin').classList.remove('d-none');
}

function tampilkanDashboard() {
  $('#tampilanLogin').classList.add('d-none');
  $('#tampilanDashboard').classList.remove('d-none');
  muatDaftar('projects');
  muatDaftar('certificates');
}

// ---------- Pengaturan dua jenis data ----------
// Proyek dan sertifikat memakai kode yang sama, hanya pengaturannya yang berbeda.
const pengaturan = {
  projects: {
    alamat: '/api/projects',
    form: $('#formProyek'),
    daftar: $('#daftarProyek'),
    judulTambah: 'Tambah proyek',
    judulUbah: 'Ubah proyek',
    subjudul: (item) => (item.tech || []).join(', '),
    kosong: 'Belum ada proyek.'
  },
  certificates: {
    alamat: '/api/certificates',
    form: $('#formSertifikat'),
    daftar: $('#daftarSertifikat'),
    judulTambah: 'Tambah sertifikat',
    judulUbah: 'Ubah sertifikat',
    subjudul: (item) => [item.issuer, item.year].filter(Boolean).join(' · '),
    kosong: 'Belum ada sertifikat.'
  }
};

// ---------- Daftar data ----------
async function muatDaftar(nama) {
  const p = pengaturan[nama];
  try {
    const data = await panggilApi(p.alamat);
    p.daftar.replaceChildren();

    if (data.length === 0) {
      p.daftar.appendChild(buatEl('div', 'list-group-item teks-redup', p.kosong));
      return;
    }

    data.forEach((item) => p.daftar.appendChild(buatBaris(nama, item)));
  } catch (err) {
    tampilkanPesan(err.message, 'danger');
  }
}

function buatBaris(nama, item) {
  const p = pengaturan[nama];
  const baris = buatEl('div', 'list-group-item d-flex align-items-center gap-3');

  if (item.gambar) {
    const img = buatEl('img', 'thumb');
    img.src = item.gambar;
    img.alt = '';
    baris.appendChild(img);
  }

  const teksBaris = buatEl('div', 'flex-grow-1');
  teksBaris.appendChild(buatEl('div', 'fw-semibold', item.title));
  const sub = p.subjudul(item);
  if (sub) teksBaris.appendChild(buatEl('small', 'teks-redup', sub));
  baris.appendChild(teksBaris);

  const tombolUbah = buatEl('button', 'btn btn-garis btn-sm', 'Ubah');
  tombolUbah.type = 'button';
  tombolUbah.addEventListener('click', () => mulaiUbah(nama, item));

  const tombolHapus = buatEl('button', 'btn btn-outline-danger btn-sm', 'Hapus');
  tombolHapus.type = 'button';
  tombolHapus.addEventListener('click', () => hapusItem(nama, item));

  baris.append(tombolUbah, tombolHapus);
  return baris;
}

// ---------- Tambah dan ubah ----------
function kosongkanForm(nama) {
  const p = pengaturan[nama];
  p.form.reset();
  p.form.elements.id.value = '';
  p.form.querySelector('[data-judul-form]').textContent = p.judulTambah;
  p.form.querySelector('[data-tombol-batal]').classList.add('d-none');
}

function mulaiUbah(nama, item) {
  const p = pengaturan[nama];
  p.form.reset();

  // Isi setiap kolom form dari data yang ada (kecuali kolom file)
  Object.entries(item).forEach(([kunci, nilai]) => {
    const kolom = p.form.elements[kunci];
    if (kolom && kolom.type !== 'file') {
      kolom.value = Array.isArray(nilai) ? nilai.join(', ') : nilai;
    }
  });

  p.form.querySelector('[data-judul-form]').textContent = p.judulUbah;
  p.form.querySelector('[data-tombol-batal]').classList.remove('d-none');
  p.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function hapusItem(nama, item) {
  if (!confirm(`Hapus "${item.title}"? Data tidak bisa dikembalikan.`)) return;
  try {
    await panggilApi(`${pengaturan[nama].alamat}/${item.id}`, { method: 'DELETE' });
    tampilkanPesan('Data berhasil dihapus');
    muatDaftar(nama);
  } catch (err) {
    tampilkanPesan(err.message, 'danger');
  }
}

Object.keys(pengaturan).forEach((nama) => {
  const p = pengaturan[nama];

  p.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = p.form.elements.id.value;
    const tombol = p.form.querySelector('[data-tombol-simpan]');
    tombol.disabled = true;

    try {
      // Jika ada id berarti mengubah (PUT), jika tidak berarti menambah (POST)
      await panggilApi(id ? `${p.alamat}/${id}` : p.alamat, {
        method: id ? 'PUT' : 'POST',
        body: new FormData(p.form)
      });
      kosongkanForm(nama);
      tampilkanPesan('Data berhasil disimpan');
      muatDaftar(nama);
    } catch (err) {
      tampilkanPesan(err.message, 'danger');
    } finally {
      tombol.disabled = false;
    }
  });

  p.form.querySelector('[data-tombol-batal]').addEventListener('click', () => kosongkanForm(nama));
});

// ---------- Login dan keluar ----------
$('#formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await panggilApi('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('#password').value })
    });
    $('#password').value = '';
    tampilkanDashboard();
  } catch (err) {
    tampilkanPesan(err.message, 'danger');
  }
});

$('#tombolKeluar').addEventListener('click', async () => {
  await panggilApi('/api/logout', { method: 'POST' }).catch(() => {});
  tampilkanLogin();
});

// ---------- Saat halaman dibuka: cek apakah sudah login ----------
(async () => {
  try {
    const { admin } = await panggilApi('/api/me');
    if (admin) tampilkanDashboard();
    else tampilkanLogin();
  } catch {
    tampilkanLogin();
  }
})();
