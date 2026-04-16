# MatriFix Frontend (React)

Frontend MatriFix berjalan di React (Vite), sementara `matrifix-laravel` menjadi backend API.

## Menjalankan Project

1. Pastikan backend Laravel aktif di `http://127.0.0.1:8000`.
2. Copy `.env.example` menjadi `.env`.
3. Jalankan frontend:

```bash
npm install
npm run dev
```

## Konfigurasi API

- Default API di frontend menggunakan `VITE_API_BASE_URL=/api`.
- Saat mode development, Vite akan proxy `/api/*` ke Laravel (`http://127.0.0.1:8000`).
- Endpoint login saat ini: `POST /api/login`.

## Struktur Dasar

- `src/lib/api.js`: helper request ke backend.
- `src/services/auth.js`: service endpoint auth (login).
- `src/App.jsx`: UI login React.
"# matrifix" 
