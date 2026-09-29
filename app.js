require('dotenv').config(); // 1. Wajib di baris paling atas

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Data sementara di memori
let mahasiswa = [
  { id: 1, nama: 'Andi', jurusan: 'Sistem Informasi' },
  { id: 2, nama: 'Budi', jurusan: 'Informatika' },
];
let nextId = 3;

// --- MIDDLEWARE GLOBAL ---

// 2. Logger: Mencatat method, url, dan waktu request
function logger(req, res, next) {
  const waktu = new Date().toISOString();
  console.log(`[${waktu}] ${req.method} ${req.url}`);
  next();
}
app.use(logger);

// 3. CORS: Mengizinkan akses dari origin tertentu
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// 4. Body Parser: Membaca format JSON
app.use(express.json());

// --- MIDDLEWARE ROUTE / KEAMANAN ---

// Auth Middleware sederhana
function cekApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: 'API key tidak valid' });
  }

  next();
}

// Helper untuk membuat objek error dengan HTTP status
function errorHttp(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// --- ROUTES ---

// GET / -> Cek server
app.get('/', (req, res) => {
  res.send('Server Express.js berjalan!');
});

// GET /mahasiswa
app.get('/mahasiswa', (req, res) => {
  const { jurusan } = req.query;
  if (jurusan) {
    const hasil = mahasiswa.filter((m) => m.jurusan === jurusan);
    return res.json(hasil);
  }
  res.json(mahasiswa);
});

// GET /mahasiswa/:id
app.get('/mahasiswa/:id', (req, res, next) => {
  const id = parseInt(req.params.id);
  const data = mahasiswa.find((m) => m.id === id);

  if (!data) return next(errorHttp(404, 'Data tidak ditemukan'));
  res.json(data);
});

// POST /mahasiswa (Dilindungi cekApiKey)
app.post('/mahasiswa', cekApiKey, (req, res, next) => {
  const { nama, jurusan } = req.body;

  if (!nama || !jurusan) {
    return next(errorHttp(400, 'nama dan jurusan wajib diisi'));
  }

  const baru = { id: nextId++, nama, jurusan };
  mahasiswa.push(baru);
  res.status(201).json(baru);
});

// PUT /mahasiswa/:id (Dilindungi cekApiKey)
app.put('/mahasiswa/:id', cekApiKey, (req, res, next) => {
  const id = parseInt(req.params.id);
  const index = mahasiswa.findIndex((m) => m.id === id);

  if (index === -1) return next(errorHttp(404, 'Data tidak ditemukan'));

  mahasiswa[index] = { ...mahasiswa[index], ...req.body, id };
  res.json(mahasiswa[index]);
});

// DELETE /mahasiswa/:id (Dilindungi cekApiKey)
app.delete('/mahasiswa/:id', cekApiKey, (req, res, next) => {
  const id = parseInt(req.params.id);
  const index = mahasiswa.findIndex((m) => m.id === id);

  if (index === -1) return next(errorHttp(404, 'Data tidak ditemukan'));

  mahasiswa.splice(index, 1);
  res.status(204).send();
});

// Route simulasi error 500 untuk pengujian
app.get('/error-uji', () => {
  throw new Error('Kesalahan tak terduga untuk pengujian');
});

// --- ERROR HANDLING MIDDLEWARE ---

// Handler 404: Rute tidak ditemukan
app.use((req, res) => {
  res.status(404).json({ message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan` });
});

// Error Handler Terpusat (Wajib 4 parameter)
app.use((err, req, res, next) => {
  // Tangani JSON rusak
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Format JSON tidak valid' });
  }

  const status = err.status || 500;

  if (status === 500) {
    console.error(err.stack); // Stacktrace tetap dicatat di terminal server
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }

  res.status(status).json({ message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});