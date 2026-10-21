// Skrip halaman publik: mengambil data proyek dan sertifikat dari server, lalu menampilkannya.
// Semua teks dimasukkan lewat textContent (bukan innerHTML) supaya aman dari kode berbahaya.

document.getElementById('tahun').textContent = new Date().getFullYear();

// Fungsi bantu untuk membuat elemen HTML dengan class dan teks
function buatEl(tag, kelas, isi) {
  const el = document.createElement(tag);
  if (kelas) el.className = kelas;
  if (isi) el.textContent = isi;
  return el;
}

// Hanya izinkan link yang diawali http atau https
function linkAman(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null;
}

function buatTombol(label, url, kelas) {
  const a = buatEl('a', 'btn ' + kelas, label);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

// Kerangka kartu yang dipakai bersama oleh proyek dan sertifikat
function buatKartu(item) {
  const kolom = buatEl('div', 'col-md-6 col-lg-4');
  const kartu = buatEl('article', 'kartu-kaca kartu-item');

  if (item.gambar) {
    const img = document.createElement('img');
    img.src = item.gambar;
    img.alt = item.title;
    img.loading = 'lazy';
    kartu.appendChild(img);
  }

  const isi = buatEl('div', 'kartu-isi');
  isi.appendChild(buatEl('h3', '', item.title));
  kartu.appendChild(isi);
  kolom.appendChild(kartu);
  return { kolom, isi };
}

function tampilkanProyek(daftar) {
  const wadah = document.getElementById('daftarProyek');
  wadah.replaceChildren();

  if (daftar.length === 0) {
    wadah.appendChild(buatEl('p', 'teks-redup', 'Proyek akan segera ditambahkan.'));
    return;
  }

  daftar.forEach((p) => {
    const { kolom, isi } = buatKartu(p);

    if (p.description) isi.appendChild(buatEl('p', '', p.description));

    if (p.tech && p.tech.length) {
      const baris = buatEl('div', 'mb-2');
      p.tech.forEach((t) => baris.appendChild(buatEl('span', 'lencana', t)));
      isi.appendChild(baris);
    }

    const aksi = buatEl('div', 'kartu-aksi');
    if (linkAman(p.repoUrl)) aksi.appendChild(buatTombol('GitHub', p.repoUrl, 'btn-garis'));
    if (linkAman(p.demoUrl)) aksi.appendChild(buatTombol('Demo', p.demoUrl, 'btn-utama'));
    if (aksi.children.length) isi.appendChild(aksi);

    wadah.appendChild(kolom);
  });
}

function tampilkanSertifikat(daftar) {
  const wadah = document.getElementById('daftarSertifikat');
  wadah.replaceChildren();

  if (daftar.length === 0) {
    wadah.appendChild(buatEl('p', 'teks-redup', 'Sertifikat akan segera ditambahkan.'));
    return;
  }

  daftar.forEach((s) => {
    const { kolom, isi } = buatKartu(s);

    const keterangan = [s.issuer, s.year].filter(Boolean).join(' · ');
    if (keterangan) isi.appendChild(buatEl('p', '', keterangan));

    if (linkAman(s.credentialUrl)) {
      const aksi = buatEl('div', 'kartu-aksi');
      aksi.appendChild(buatTombol('Lihat sertifikat', s.credentialUrl, 'btn-garis'));
      isi.appendChild(aksi);
    }

    wadah.appendChild(kolom);
  });
}

// Ambil data dari server. Jika gagal, tampilkan pesan yang ramah.
async function muatData(alamat, wadahId, tampilkan) {
  try {
    const res = await fetch(alamat);
    if (!res.ok) throw new Error('Gagal memuat');
    tampilkan(await res.json());
  } catch (err) {
    const wadah = document.getElementById(wadahId);
    wadah.replaceChildren(buatEl('p', 'teks-redup', 'Data belum bisa dimuat. Coba muat ulang halaman.'));
  }
}

muatData('/api/projects', 'daftarProyek', tampilkanProyek);
muatData('/api/certificates', 'daftarSertifikat', tampilkanSertifikat);
