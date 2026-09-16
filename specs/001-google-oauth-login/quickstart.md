# Quickstart & Verification Guide: Google OAuth Login

**Feature**: Google OAuth Login & Drive Access (`001-google-oauth-login`)  
**Target Environment**: Local Development (Bun + Next.js + FastAPI + PostgreSQL)  

---

## 1. Environment Setup & Prerequisites

### 1.1 Environment Variables
Create `/backend/.env` with the following variables:
```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=paper_generator
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

ENCRYPTION_KEY=32_bytes_base64_fernet_key_here
SECRET_KEY=session_signing_secret_here
```

Create `/frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 2. Database Migration & Service Startup

### 2.1 Backend Startup (FastAPI + Python)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload --port 8000
```

### 2.2 Frontend Startup (Bun + Next.js)
```bash
cd frontend
bun install
bun run dev
```
Open peramban di `http://localhost:3000`.

---

## 3. End-to-End Verification Scenarios

### Scenario 1: Sunny Day Login Flow
1. Buka `http://localhost:3000` (SCR-01).
2. Klik tombol **"Login with Google"**.
3. Peramban dialihkan ke dialog Google Consent (`SCR-02`).
4. Pilih akun Google dan setujui izin profil & Google Drive.
5. Google melakukan callback ke `http://localhost:8000/auth/google/callback?code=...`.
6. Backend memverifikasi otorisasi, mengenkripsi token ke DB, mengatur cookie `paper_gen_session` (httpOnly), dan mengarahkan ke `http://localhost:3000/dashboard` (`SCR-03`).
7. Dashboard menampilkan nama peneliti dan status `Google Drive Connected: Active`.

### Scenario 2: Verification of Encrypted Tokens in Database
Jalankan query PostgreSQL untuk memastikan token tidak tersimpan plaintext (Prinsip Konstitusi 2):
```sql
SELECT encrypted_access_token, encrypted_refresh_token FROM oauth_credentials;
```
*Expected Outcome*: Token berupa ciphertext string Fernet (bukan bermula `ya29.` mentah).

### Scenario 3: Logout Verification
1. Pada `http://localhost:3000/dashboard`, klik tombol **"Logout"**.
2. Request `POST /auth/logout` dikirim.
3. Cookie `paper_gen_session` dibersihkan (`Max-Age=0`).
4. Tampilan dialihkan kembali ke `http://localhost:3000` (SCR-01).
5. Percobaan memanggil `GET http://localhost:8000/auth/me` mengembalikan status `401 Unauthorized`.

---

## 4. Test Suite Execution

### 4.1 Backend Unit & Integration Tests (FastAPI)
```bash
cd backend
pytest tests/test_auth.py -v
```
*Expected Results*:
- `test_google_login_redirect` PASSED
- `test_google_callback_creates_user` PASSED
- `test_token_encryption_decryption` PASSED
- `test_session_invalidation_on_logout` PASSED
- `test_relogin_prompt_on_expired_token` PASSED
