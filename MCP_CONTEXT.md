# Badminton Cal - MCP Project Context

## 1) Muc tieu du an
Ung dung web de quan ly cac phien danh cau long va chia chi phi theo tung nguoi cho cac khoan:
- Tien san
- Tien cau
- Tien tra da
- Tien com

App ho tro tao phien moi, xem lich su, xem thong ke, export/import JSON, va dong bo du lieu voi MongoDB thong qua backend Express.

## 2) Cong nghe chinh
- Frontend: React 18 + Vite
- Backend: Express 5 (Node.js)
- Database: MongoDB (native mongodb driver)
- Dong bo va cache: localStorage + REST API

## 3) Cau truc thu muc quan trong
- src/App.jsx: Dieu huong man hinh chinh, state goc, import/export, dong bo DB.
- src/components/SessionForm.jsx: Tao/chinh sua 1 phien, them/sua/xoa tung khoan chi.
- src/components/SessionResult.jsx: Xem ket qua chi tiet va bang chia tien, danh dau da thanh toan.
- src/components/SessionHistory.jsx: Danh sach lich su phien, xoa phien.
- src/components/Stats.jsx: Thong ke theo thang/ngay/tat ca.
- src/constants.js: Danh sach thanh vien, combo nguoi choi, loai chi phi, ham tinh tien.
- src/services/mongoApi.js: API client goi backend.
- server.js: API Express + ket noi MongoDB + serve frontend build.

## 4) Data model
### Session
- id: string (uuid)
- date: string (YYYY-MM-DD)
- entries: Entry[]
- createdAt: string (ISO datetime)
- settledPlayers?: string[] (danh sach da thanh toan)

### Entry
- id: string (uuid)
- type: string (san | cau | tra-da | com)
- amount: number (DON VI NGHIN DONG)
- note: string
- payer: string
- people: string[]

## 5) Quy uoc nghiep vu quan trong
- amount duoc nhap theo nghin dong. Khi hien thi ra tien VND thi nhan 1000.
- Chia tien theo nguyen tac deu: perPerson = amount / people.length.
- calculateTotals(entries) cong don so tien moi nguoi phai chia tren tat ca entries.
- Trong man hinh ket qua:
  - paid = tong amount cua cac entry ma nguoi do la payer.
  - owe = amountCanPay - paid.
  - owe > 0: can chuyen them.
  - owe < 0: da tra du, duoc nhan lai.
- SessionResult co check settledPlayers de danh dau nguoi da thanh toan.

## 6) Luong du lieu tong quan
1. Khoi dong app:
   - Doc localStorage key badminton-sessions.
   - Neu co MongoDB: goi GET /api/sessions.
   - Neu DB rong va localStorage co du lieu: bulk import len DB.
2. Tao phien moi:
   - Nguoi dung nhap entries trong SessionForm.
   - Luu vao state sessions + localStorage.
   - Dong bo len DB qua POST /api/sessions.
3. Sua/xoa phien:
   - Cap nhat state + localStorage.
   - Goi PUT/DELETE tuong ung len backend.
4. Import JSON:
   - Doc file JSON, merge theo id, bo qua session trung id.
   - Cap nhat localStorage va bulk insert phan moi len DB.

## 7) Backend API
Base URL:
- Dev: http://localhost:3002/api
- Production: /api

Endpoints:
- GET /api/sessions
  - Tra ve tat ca sessions, sort createdAt giam dan.
- POST /api/sessions
  - Tao 1 session moi.
- PUT /api/sessions/:id
  - Cap nhat 1 session theo id cua app.
- DELETE /api/sessions/:id
  - Xoa 1 session theo id cua app.
- POST /api/sessions/bulk
  - Them nhieu session (dung cho import).

Luu y: backend loai bo truong _id cua MongoDB truoc khi tra ve client.

## 8) Scripts thuong dung
- npm run dev: chay ca backend va frontend.
- npm run dev:server: chay server Express.
- npm run dev:frontend: chay Vite.
- npm run build: build frontend.
- npm run start: chay server production.

## 9) Bien moi truong
Can dat bien sau trong file .env:
- MONGODB_URI=<your_mongodb_connection_string>
- PORT=3002 (tuy chon)

## 10) Luu y khi mo rong
- Giu don vi amount nhat quan la nghin dong de tranh sai so.
- Neu them expense type moi, cap nhat EXPENSE_TYPES trong src/constants.js.
- Neu thay doi cau truc Session/Entry, can cap nhat dong bo:
  - SessionForm
  - SessionResult
  - SessionHistory
  - Stats
  - server.js (neu anh huong API)
- Khi thay doi logic chia tien, uu tien cap nhat calculateTotals trong src/constants.js de toan app dung chung 1 logic.

## 11) Testing checklist nhanh
- Tao session moi voi nhieu entries va nhieu payer.
- Kiem tra per person hien thi dung trong form va result.
- Kiem tra sua entry, xoa entry, luu session.
- Kiem tra mark settledPlayers duoc luu sau khi reload.
- Kiem tra export -> import lai khong bi trung id.
- Kiem tra DB offline/online va fallback localStorage.

---
Tai lieu nay duoc tao de MCP co the nap nhanh context du an va giam can hỏi lai o cac request tiep theo.
