# MatriFix React <> Laravel API Migration Map

Dokumen ini jadi kontrak endpoint API untuk semua halaman React yang sudah dimigrasi.

## 1) Endpoint Yang Sudah Ada

- `POST /api/auth/login`
- `POST /api/auth/logout` (auth:sanctum)
- `GET /api/auth/me` (auth:sanctum)
- `GET /api/revisi/dashboard` (auth:sanctum)
- `GET /api/revisi/create-request/meta` (auth:sanctum)
- `GET /api/revisi/collect-data` (auth:sanctum)
- `POST /api/revisi/requests` (auth:sanctum)
- `GET /api/revisi/requests` (auth:sanctum)
- `PUT /api/revisi/requests/{id}` (auth:sanctum)
- `DELETE /api/revisi/requests/{id}` (auth:sanctum)
- `GET /api/revisi/requests/{id}` (auth:sanctum)
- `GET /api/revisi/process-requests` (auth:sanctum)
- `POST /api/revisi/process-requests/{id}/actions` (auth:sanctum)
- `GET /api/revisi/reports` (auth:sanctum)
- `GET /api/revisi/reports/download` (auth:sanctum)
- `GET /api/revisi/users` (auth:sanctum)
- `POST /api/revisi/users` (auth:sanctum)
- `GET /api/revisi/users/{username}` (auth:sanctum)
- `PUT /api/revisi/users/{username}` (auth:sanctum)
- `DELETE /api/revisi/users/{username}` (auth:sanctum)

## 2) Endpoint Target Yang Perlu Ditambahkan

### Revisi Material

- `GET /api/revisi/requests`
  - Query: `page`, `per_page`, `search`, `status`, `sort_by`, `sort_dir`
  - Response:
  ```json
  {
    "data": [
      {
        "id": 1,
        "kodepermintaan": "REQ-2026-0001",
        "tanggalpermintaan": "2026-04-14",
        "jenispermintaan": "Cataloging",
        "materialcode": "MAT-0001",
        "status": "Selesai"
      }
    ],
    "meta": {
      "page": 1,
      "per_page": 10,
      "total": 1
    }
  }
  ```

- `GET /api/revisi/process-requests`
  - Query: `page`, `per_page`, `search`, `status`, `sort_by`, `sort_dir`
  - Response:
  ```json
  {
    "data": [
      {
        "id": 1,
        "kodepermintaan": "REQ-2026-0002",
        "nama": "Bambang Tressando",
        "jenispermintaan": "Perubahan PO Text/Spesifikasi",
        "status": "Menunggu Approval",
        "posisipermintaan": "AVP User"
      }
    ],
    "meta": {
      "page": 1,
      "per_page": 10,
      "total": 1
    }
  }
  ```

- `GET /api/revisi/reports`
  - Query: `year`
  - Response:
  ```json
  {
    "data": [
      {
        "periode": "Januari",
        "triwulan": "I",
        "jumlah_permintaan": 25,
        "jumlah_selesai": 20,
        "presentase": 80
      }
    ],
    "meta": {
      "year": 2026
    }
  }
  ```

- `GET /api/revisi/create-request/meta`
  - Response:
  ```json
  {
    "tanggalPermintaan": "2026-04-17",
    "nama": "Bambang Tressando",
    "username": "3143265",
    "unitkerja": "Identifikasi dan Standarisasi Material",
    "role": "Officer Identifikasi dan Standarisasi Material",
    "jenisPermintaanOptions": [
      { "value": "Cataloging", "label": "Cataloging" }
    ],
    "stafOptions": [
      {
        "value": "Dendi (Staf Identifikasi dan Standarisasi Material)",
        "label": "Dendi (Staf Identifikasi dan Standarisasi Material)"
      }
    ],
    "requiresDiprosesOleh": true
  }
  ```

- `GET /api/revisi/requests/{id}`
  - Response:
  ```json
  {
    "id": 10,
    "kodepermintaan": "FCM4108451",
    "tanggalpermintaan": "2026-04-15",
    "nama": "Arif Erdianto",
    "username": "3072470",
    "unitkerja": "Pemeliharaan Instrumen",
    "jenispermintaan": "Perubahan Data MRP (MRP Type/Strategi Stok)",
    "materialcode": "9000000",
    "detailpermintaan": "<p>Rubah Pak</p>",
    "status": "Data Sedang Diproses oleh Officer Identifikasi dan Standarisasi Material",
    "documents": ["SHP.xlsx"],
    "diapprovaloleh": "Endin Komarudin (AVP User Pemeliharaan Instrumen)",
    "approval": "Ya",
    "catatan": "oke",
    "tanggalapproval": "2026-04-16",
    "diprosesoleh": "",
    "diprosesolehDisplay": "-",
    "keterangan": "",
    "tanggalproses": "2026-04-15",
    "stafOptions": [
      "Dendi (Staf Identifikasi dan Standarisasi Material)"
    ],
    "processMeta": {
      "role": "Officer Identifikasi dan Standarisasi Material",
      "canUseRevisi": true,
      "requiresDiprosesOleh": true,
      "requiresKeterangan": false
    }
  }
  ```

- `PUT /api/revisi/requests/{id}`
  - Body: `multipart/form-data`
  - Fields:
    - `jenispermintaan`
    - `materialcode`
    - `detailpermintaan`
    - `diprosesoleh`
    - `document_existing_1..10`
    - `document_name_1..10`
    - `document_file_1..10`
  - Response:
  ```json
  {
    "success": true,
    "message": "Permintaan berhasil diperbarui.",
    "redirectTo": "/permintaan",
    "data": {
      "id": 10,
      "kodepermintaan": "FCM4108451",
      "status": "Data Sedang Diproses oleh AVP User Pemeliharaan Instrumen",
      "tanggalpermintaan": "2026-04-15"
    }
  }
  ```

- `DELETE /api/revisi/requests/{id}`
  - Response:
  ```json
  {
    "success": true,
    "message": "Request deleted",
    "data": {
      "id": 10
    }
  }
  ```

- `POST /api/revisi/process-requests/{id}/actions`
  - Body:
  ```json
  {
    "approval": "Ya",
    "catatan": "oke",
    "keterangan": "",
    "diprosesoleh": "Dendi (Staf Identifikasi dan Standarisasi Material)"
  }
  ```
  - Response:
  ```json
  {
    "success": true,
    "redirectTo": "/butuhproses",
    "message": "Approval berhasil disetujui."
  }
  ```

- `GET /api/revisi/collect-data`
  - Query: `q`
  - Response:
  ```json
  {
    "data": [
      {
        "id": 1,
        "kodepermintaan": "REQ-2026-0001",
        "tanggalpermintaan": "2026-04-14",
        "nama": "Bambang Tressando",
        "username": "3143265",
        "nomorbadge": "3143265",
        "jenispermintaan": "Cataloging",
        "materialcode": "MAT-0001",
        "detailpermintaan": "Detail permintaan",
        "documentsText": "files/dokumen-a.pdf",
        "dokumenreferensi": "files/dokumen-a.pdf",
        "catatan": "-",
        "catatanapproval": "-",
        "tanggalproses": "2026-04-20",
        "tanggalselesai": "2026-04-20",
        "status": "Selesai"
      }
    ],
    "meta": {
      "total": 1
    }
  }
  ```

- `GET /api/revisi/users`
  - Query: `q`, `role`, `unitkerja`
  - Response:
  ```json
  {
    "data": [
      {
        "nama": "Bambang Tressando",
        "username": "3143265",
        "role": "Officer Identifikasi dan Standarisasi Material",
        "unitkerja": "Identifikasi dan Standarisasi Material",
        "kode": "BT001"
      }
    ],
    "meta": {
      "total": 1
    },
    "filters": {
      "roles": ["Officer Identifikasi dan Standarisasi Material"],
      "units": ["Identifikasi dan Standarisasi Material"]
    }
  }
  ```

- `POST /api/revisi/users`
  - Body:
  ```json
  {
    "nama": "Bambang Tressando",
    "email": "bambang@example.com",
    "phone": "08123456789",
    "username": "3143265",
    "password": "Secret!234",
    "role": "Officer Identifikasi dan Standarisasi Material",
    "unitkerja": "Identifikasi dan Standarisasi Material",
    "kode": "FCM005"
  }
  ```

- `GET /api/revisi/users/{username}`
  - Response:
  ```json
  {
    "nama": "Bambang Tressando",
    "email": "bambang@example.com",
    "phone": "08123456789",
    "username": "3143265",
    "role": "Officer Identifikasi dan Standarisasi Material",
    "unitkerja": "Identifikasi dan Standarisasi Material",
    "kode": "FCM005"
  }
  ```

- `PUT /api/revisi/users/{username}`
  - Body:
  ```json
  {
    "nama": "Bambang Tressando",
    "email": "bambang@example.com",
    "phone": "08123456789",
    "password": "",
    "role": "Officer Identifikasi dan Standarisasi Material",
    "unitkerja": "Identifikasi dan Standarisasi Material",
    "kode": "FCM005"
  }
  ```

- `DELETE /api/revisi/users/{username}`
  - Response:
  ```json
  {
    "message": "Pengguna berhasil dihapus."
  }
  ```

### Stock Opname

- `GET /api/stock/dashboard-counts`
  - Response:
  ```json
  {
    "counts": {
      "Positif": 10,
      "Negatif": 5,
      "Balance": 20,
      "Unknown": 1
    }
  }
  ```

- `GET /api/stock/master-data`
  - Query: `page`, `rows`, `search`, `sortColumn`, `sortDirection`, `filters`, `only_discrepancy`
  - Response:
  ```json
  {
    "rows": [
      {
        "id": 1,
        "Material": "MAT-0001",
        "Bulan": "2026-04-01",
        "Material_Description": "Packing Seal",
        "Stock_on_Hand": 120,
        "Bin_Loc": "A-01-01",
        "Plant": "PL01",
        "Storage_Location": "SL01",
        "Status_Selisih": "Negatif"
      }
    ],
    "total": 1,
    "info": "Display 1 to 1 out of 1 data"
  }
  ```

- `GET /api/stock/pids`
  - Query: `status`
  - Response:
  ```json
  {
    "data": [
      {
        "pid": "PID-20260414-0001",
        "plant": "PL01",
        "storage": "SL01",
        "snapshot": "2026-04-14",
        "status": "OPEN",
        "item_count": 12
      }
    ]
  }
  ```

- `POST /api/stock/pids`
  - Body:
  ```json
  {
    "pid": "PID-20260414-0001",
    "plant": "PL01",
    "storage": "SL01",
    "snapshot": "2026-04-14",
    "status": "OPEN",
    "materials": [
      {
        "Material": "MAT-0001",
        "Material_Description": "Packing Seal",
        "Stock_on_Hand": 120,
        "Bin_Loc": "A-01-01"
      }
    ]
  }
  ```
  - Response:
  ```json
  {
    "success": true,
    "pid": "PID-20260414-0001",
    "count": 1,
    "applied_to_master": 0,
    "applied_error": null
  }
  ```

- `POST /api/stock/pids/delete`
  - Body:
  ```json
  { "pid": "PID-20260414-0001" }
  ```
  - Response:
  ```json
  { "success": true }
  ```

- `POST /api/stock/pids/clear`
  - Response:
  ```json
  { "success": true, "deleted": 10 }
  ```

- `GET /api/stock/telusur`
  - Response:
  ```json
  {
    "data": [
      {
        "id": 1,
        "Material": "MAT-0001",
        "Material_Description": "Packing Seal",
        "Bin_Loc": "A-01-01",
        "Stock_on_Hand": 120,
        "Stok_Fisik": 118,
        "Selisih_Stok_Fisik_dan_SAP": -2,
        "Stok_Fisik_Telusur": null,
        "Keterangan_Setelah_Telusur": null
      }
    ]
  }
  ```

- `GET /api/stock/verifikasi-telusur`
  - Response:
  ```json
  {
    "data": [
      {
        "id": 1,
        "Material": "MAT-0001",
        "Material_Description": "Packing Seal",
        "In": 0,
        "Out": 0,
        "Stok_Fisik_Telusur": 118,
        "Selisih_Stok_Setelah_Telusur": -2
      }
    ]
  }
  ```

- `POST /api/stock/telusur/save`
  - Body:
  ```json
  {
    "id": 1,
    "Material": "MAT-0001",
    "Plant": "PL01",
    "Storage_Location": "SL01",
    "In": 0,
    "Out": 0,
    "Keterangan_Setelah_Telusur": "Selisih karena pencatatan",
    "Stok_Fisik_Telusur": 118
  }
  ```
  - Response:
  ```json
  {
    "success": true,
    "message": "updated"
  }
  ```

## 3) Mapping Service React -> Endpoint

- `src/features/auth/services/auth.js`
  - `login()` -> `POST /api/auth/login`
  - `logout()` -> `POST /api/auth/logout`
  - `fetchCurrentUser()` -> `GET /api/auth/me`

- `src/features/dashboard/services/dashboard.js`
  - `getRevisiDashboard()` -> `GET /api/revisi/dashboard`

- `src/features/revisi/services/revisi.js`
  - `getCreateRequestMeta()` -> `GET /api/revisi/create-request/meta`
  - `submitCreateRequest()` -> `POST /api/revisi/requests`
  - `getMyRequests()` -> `GET /api/revisi/requests`
  - `getRequestDetail()` -> `GET /api/revisi/requests/{id}`
  - `getProcessRequests()` -> `GET /api/revisi/process-requests`
  - `submitProcessRequestActionById()` -> `POST /api/revisi/process-requests/{id}/actions`
  - `getRequestReports()` -> `GET /api/revisi/reports`
  - `downloadRequestReport()` -> `GET /api/revisi/reports/download`
  - `getCollectData()` -> `GET /api/revisi/collect-data`
  - `getDataPengguna()` -> `GET /api/revisi/users`
  - `getDataPenggunaDetail()` -> `GET /api/revisi/users/{username}`
  - `createDataPengguna()` -> `POST /api/revisi/users`
  - `updateDataPengguna()` -> `PUT /api/revisi/users/{username}`
  - `deleteDataPengguna()` -> `DELETE /api/revisi/users/{username}`

- `src/services/stock.js`
  - `getStockDashboardCounts()` -> `GET /api/stock/dashboard-counts`
  - `getMasterStockData()` -> `GET /api/stock/master-data`
  - `getStockPidList()` -> `GET /api/stock/pids`
  - `saveStockPid()` -> `POST /api/stock/pids`
  - `deleteStockPid()` -> `POST /api/stock/pids/delete`
  - `clearStockPid()` -> `POST /api/stock/pids/clear`
  - `getStockTelusur()` -> `GET /api/stock/telusur`
  - `getStockVerifikasiTelusur()` -> `GET /api/stock/verifikasi-telusur`
  - `saveStockTelusur()` -> `POST /api/stock/telusur/save`

## 4) Rekomendasi `routes/api.php`

Tambahkan semua route di atas ke group `auth:sanctum`.
Controller API bisa:

- Reuse query dari `RevisiDashboardApiController` + ekstrak logic `RevisiMaterialController`.
- Reuse query dari `StockOpnameController` (method fetch/list/save yang sudah JSON-ready), lalu bungkus ke namespace API.

## 5) Status React Saat Ini

- Sudah full JSON murni:
  - Login / logout / current user
  - Dashboard revisi
  - Create Request
  - My Request list
  - Process Request list
  - Request Detail
  - Process Request action
  - Request Report
  - Request Report download
  - Collect Data
  - Data Pengguna
  - CRUD Data Pengguna
- Masih hybrid / pending migrasi penuh:
  - Sebagian flow Stock Opname
- Revisi Material sudah tidak lagi memakai route web/blade Laravel lama sebagai jalur aktif.
- Dependency internal ke `RevisiMaterialController` sudah dilepas total; list, process action, dan route API revisi sekarang berjalan lewat service API dedicated.
- Sisa cleanup utama sekarang:
  - pembersihan helper legacy kecil yang masih tersisa di frontend/service transisi
  - migrasi modul Stock Opname
- Auth React sekarang sudah digeser ke `Sanctum + session cookie` dengan `axios` `withCredentials: true`, tanpa menyimpan token autentikasi di `localStorage`.
- Controller token lama yang tidak dipakai lagi sudah dipensiunkan dari backend Laravel.
