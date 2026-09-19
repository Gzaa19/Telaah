# Technical Plan: Google OAuth Login & Drive Access Authorization – ICONIX Process

**Branch**: `001-google-oauth-login` | **Date**: 2026-09-16 | **Spec**: [spec.md](file:///Users/gzaaa19/Telaah/specs/001-google-oauth-login/spec.md)  
**Input**: Feature specification from `/specs/001-google-oauth-login/spec.md`  
**Methodology Reference**: Doug Rosenberg & Matt Stephens, *Use Case Driven Object Modeling with UML*  

---

## 1. System Architecture & Technical Context

- **Frontend Layer**: Next.js App Router (TypeScript), Vanilla CSS, dijalankan dan di-build menggunakan **Bun** sebagai JavaScript runtime dan package manager.
- **Backend Layer**: FastAPI (Python 3.12), Pydantic v2, SQLModel / SQLAlchemy ORM. OAuth handled via `authlib` / `google-auth`. Encryption via `cryptography` (Fernet symmetric encryption).
- **Persistence & DB**: PostgreSQL dengan ekstensi `pgvector` siap diaktifkan pada migrasi Alembic.
- **Session & Cookie Security**: `httpOnly`, `Secure`, `SameSite=Lax` session cookie (`paper_gen_session`), berlaku 24 jam. Kredensial Google disimpan terenkripsi di PostgreSQL.
- **Architectural Pattern**: **Router (Boundary) → Service (Controller) → Repository/Model (Entity)**. Client secret Google terisolasi sepenuhnya di backend FastAPI.

---

## 2. Updated Domain Model

```mermaid
classDiagram
    class Peneliti {
        +UUID id
        +String email
        +String nama_lengkap
        +String url_avatar
        +Boolean apakah_aktif
        +DateTime login_terakhir_pada
        +DateTime dibuat_pada
        +DateTime diperbarui_pada
    }

    class SesiPengguna {
        +UUID id
        +UUID peneliti_id
        +String token_sesi
        +DateTime kedaluwarsa_pada
        +Boolean apakah_aktif
        +DateTime dibuat_pada
    }

    class KredensialOAuth {
        +UUID id
        +UUID peneliti_id
        +String penyedia
        +Text token_akses_terenkripsi
        +Text token_penyegaran_terenkripsi
        +DateTime token_kedaluwarsa_pada
        +Boolean apakah_drive_diizinkan
        +DateTime dibuat_pada
        +DateTime diperbarui_pada
    }

    Peneliti "1" --> "1..*" SesiPengguna : memiliki
    Peneliti "1" --> "1" KredensialOAuth : memiliki
```

- **Entities**:
  - `Peneliti`: Menyimpan profil identitas peneliti berbasis email unik Google.
  - `SesiPengguna`: Menyimpan token sesi lokal terautentikasi (berlaku 24 jam).
  - `KredensialOAuth`: Menyimpan ciphertext token otorisasi Google OAuth hasil enkripsi Fernet/AES-256.
- **Database Schema Migrations**: `alembic` script `001_auth_schema.py` membuat tabel `peneliti`, `sesi_pengguna`, `kredensial_oauth`, indeks, serta mengaktifkan ekstensi `vector` (pgvector).

---

## 3. ICONIX Robustness Analysis (Preliminary Design)

### 3.1 Robustness Diagram: UC-01 Google OAuth Login & Authorization Flow

> **ICONIX BCE Element Legend**:
> - **Actor**: Pengguna / sistem eksternal yang berinteraksi dengan sistem (`Actor: Peneliti`).
> - **Boundary Object (`[/.../]` - Cyan/Blue)**: Antarmuka batas (halaman UI, modal, router/endpoint API gateway).
> - **Controller Object (`([...])` - Amber/Orange)**: Logika aplikasi, koordinasi, dan pemrosesan aturan bisnis (harus selalu menggunakan **Frasa Kata Kerja / Verb Phrase**).
> - **Entity Object (`[(...)]` - Emerald/Green)**: Objek domain persisten (tabel/model database).

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    Actor_Peneliti["Actor: Peneliti"]:::actor

    B_Landing[/"Boundary: Landing Page (SCR-01)"/]:::boundary
    B_LoginAPI[/"Boundary: GET /auth/google/login"/]:::boundary
    B_GoogleConsent[/"Boundary: Google Consent Screen (SCR-02)"/]:::boundary
    B_CallbackAPI[/"Boundary: GET /auth/google/callback"/]:::boundary
    B_Dashboard[/"Boundary: Workspace Dashboard (SCR-03)"/]:::boundary
    B_WarningModal[/"Boundary: Drive Warning Modal (SCR-04)"/]:::boundary

    C_BuildAuthUrl(["Controller: Generate Google Auth URL"]):::controller
    C_ExchangeTokens(["Controller: Verify State & Exchange Code"]):::controller
    C_EncryptTokens(["Controller: Encrypt OAuth Tokens"]):::controller
    C_UpsertProfile(["Controller: Upsert Peneliti Record"]):::controller
    C_IssueSession(["Controller: Create 24h User Session"]):::controller
    C_EvaluateDriveScope{"Controller: Evaluate Drive Scope"}:::controller

    E_Peneliti[("Entity: Peneliti")]:::entity
    E_OAuthCred[("Entity: KredensialOAuth")]:::entity
    E_Session[("Entity: SesiPengguna")]:::entity

    Actor_Peneliti -->|"1. Clicks Login with Google"| B_Landing
    B_Landing -->|"2. Initiates OAuth Flow"| B_LoginAPI
    B_LoginAPI -->|"3. Prepares Auth Request"| C_BuildAuthUrl
    C_BuildAuthUrl -->|"4. 302 Redirect to Consent"| B_GoogleConsent
    Actor_Peneliti -->|"5. Grants Profile & Drive Permissions"| B_GoogleConsent
    B_GoogleConsent -->|"6. Callback with Code & State"| B_CallbackAPI
    B_CallbackAPI -->|"7. Passes Code & State"| C_ExchangeTokens
    C_ExchangeTokens -->|"8. Encrypts Raw Tokens"| C_EncryptTokens
    C_EncryptTokens -->|"9. Passes Ciphertext"| C_UpsertProfile
    C_UpsertProfile -->|"10. Persists Peneliti"| E_Peneliti
    C_UpsertProfile -->|"11. Persists KredensialOAuth"| E_OAuthCred
    C_UpsertProfile -->|"12. Requests Session Creation"| C_IssueSession
    C_IssueSession -->|"13. Persists Active Session"| E_Session
    C_IssueSession -->|"14. Evaluates Granted Scopes"| C_EvaluateDriveScope
    C_EvaluateDriveScope -->|"Sunny Day: Full Permissions Granted"| B_Dashboard
    C_EvaluateDriveScope -->|"Rainy Day: Drive Scope Denied"| B_WarningModal
    B_Dashboard -->|"15. Renders Workspace"| Actor_Peneliti
    B_WarningModal -->|"Renders Warning & Reconnect Action"| Actor_Peneliti
```

### 3.2 Robustness Diagram: UC-02 Terminate Session (Logout Flow)

```mermaid
flowchart TD
    classDef actor fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#f8fafc
    classDef boundary fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f0f9ff
    classDef controller fill:#451a03,stroke:#d97706,stroke-width:2px,color:#fef3c7
    classDef entity fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5

    Actor_Peneliti["Actor: Peneliti"]:::actor

    B_Dashboard[/"Boundary: Workspace Dashboard (SCR-03)"/]:::boundary
    B_LogoutAPI[/"Boundary: POST /auth/logout"/]:::boundary
    B_Landing[/"Boundary: Landing Page (SCR-01)"/]:::boundary

    C_InvalidateSession(["Controller: Invalidate Sesi Pengguna"]):::controller
    E_Session[("Entity: SesiPengguna")]:::entity

    Actor_Peneliti -->|"1. Clicks Logout Button"| B_Dashboard
    B_Dashboard -->|"2. Sends Logout Request with Session Cookie"| B_LogoutAPI
    B_LogoutAPI -->|"3. Dispatches Invalidation"| C_InvalidateSession
    C_InvalidateSession -->|"4. Sets apakah_aktif = FALSE"| E_Session
    C_InvalidateSession -->|"5. Clears Cookie & 302 Redirects"| B_Landing
    B_Landing -->|"6. Renders Public Landing View"| Actor_Peneliti
```

### 3.3 Boundary-Controller-Entity (BCE) Inventory & Method Allocation
Sesuai kaidah Doug Rosenberg, *Controller* pada Robustness Diagram adalah logika proses bisnis murni (kata kerja) yang selanjutnya dialokasikan menjadi *method* konkrit pada kelas saat memasuki Detailed Design (Sequence Diagram & Class Diagram):

| BCE Type | Element Name | Responsibility / Concrete Implementation Allocation |
|---|---|---|
| **Boundary** | `Landing Page (SCR-01)` | Frontend Next.js halaman landing publik (`frontend/src/app/page.tsx`). |
| **Boundary** | `GET /auth/google/login` | FastAPI Auth Router API Endpoint (`backend/src/auth/router.py`). |
| **Boundary** | `Google Consent Screen (SCR-02)` | Antarmuka otorisasi eksternal milik Google OAuth Server. |
| **Boundary** | `GET /auth/google/callback` | FastAPI Auth Callback Endpoint (`backend/src/auth/router.py`). |
| **Boundary** | `Workspace Dashboard (SCR-03)` | Frontend Next.js Dashboard Peneliti (`frontend/src/app/dashboard/page.tsx`). |
| **Boundary** | `Drive Warning Modal (SCR-04)` | Frontend React Component Modal Peringatan Drive (`frontend/src/components/DriveWarningModal.tsx`). |
| **Boundary** | `POST /auth/logout` | FastAPI Auth Router Endpoint Logout (`backend/src/auth/router.py`). |
| **Controller** | `Generate Google Auth URL` | `GoogleOAuthService.generate_authorization_url()` |
| **Controller** | `Verify State & Exchange Code` | `GoogleOAuthService.verify_state_and_exchange_code()` |
| **Controller** | `Encrypt OAuth Tokens` | `TokenEncryptionService.encrypt_token()` |
| **Controller** | `Upsert Peneliti Record` | `ResearcherService.upsert_researcher_with_credentials()` |
| **Controller** | `Create 24h User Session` | `SessionService.create_24h_session()` |
| **Controller** | `Evaluate Drive Scope` | `GoogleOAuthService.check_drive_scope_granted()` |
| **Controller** | `Invalidate Sesi Pengguna` | `SessionService.invalidate_session()` |
| **Entity** | `Peneliti` | Model persisten data peneliti (`backend/src/auth/models.py`). |
| **Entity** | `KredensialOAuth` | Model persisten token OAuth terenkripsi (`backend/src/auth/models.py`). |
| **Entity** | `SesiPengguna` | Model persisten sesi pengguna aktif (`backend/src/auth/models.py`). |

### 3.4 Strict BCE Rule Compliance Audit (Doug Rosenberg Rules)
- [x] **Rule 1 (Actors can only talk to Boundaries)**: Peneliti hanya berinteraksi dengan antarmuka UI (`SCR-01`, `SCR-02`, `SCR-03`, `SCR-04`).
- [x] **Rule 2 (Boundaries can only talk to Controllers and Actors)**: UI dan Endpoint API memicu Controller (verb) dan tidak pernah menyentuh Database Entity langsung.
- [x] **Rule 3 (Entities can only talk to Controllers)**: Entitas `Peneliti`, `KredensialOAuth`, dan `SesiPengguna` hanya diakses dan dimutasi melalui Controllers.
- [x] **Rule 4 (Controllers can talk to Boundaries, Controllers, and Entities, but NOT directly to Actors)**: Logika proses berkomunikasi dengan Boundaries untuk navigasi/rendering ke aktor.
- [x] **Zero Direct Boundary-to-Entity Links**: Terverifikasi 100% tidak ada jalan pintas dari Boundary langsung ke Entity.

---

## 4. Preliminary Design Review (PDR) Checkpoint Gate

| PDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Use Case Coverage** | PASS | Diagram robustness mencakup alur lengkap UC-01 (Login) dan UC-02 (Logout). |
| **2. Alternate Courses Handled** | PASS | Alur penolakan scope Drive, token expired, dan pembatalan diarahkan melalui `C1` ke `B5` (SCR-04). |
| **3. Domain Model Updated** | PASS | Tabel `peneliti`, `sesi_pengguna`, dan `kredensial_oauth` terdefinisi presisi. |
| **4. Strict BCE Adherence** | PASS | Terverifikasi TIDAK ADA hubungan langsung Boundary-ke-Entity. |

*GATE STATUS*: **[APPROVED TO PROCEED TO DETAILED DESIGN]**

---

## 5. Detailed Design: Sequence Diagrams (Behavior Allocation)

### Sequence Diagram 1: UC-01 Google OAuth Login & Callback
```mermaid
sequenceDiagram
    autonumber
    actor User as Actor: Peneliti
    participant NextJS as Boundary: Next.js Frontend
    participant GoogleGUI as Boundary: Google Consent Screen
    participant FastAPI as Boundary: FastAPI Auth Router
    participant OAuthSvc as Controller: GoogleOAuthService
    participant CryptoSvc as Controller: TokenEncryptionService
    participant ResSvc as Controller: ResearcherService
    participant SessSvc as Controller: SessionService
    participant DB as Entity: PostgreSQL DB

    User->>NextJS: Click "Login with Google" (SCR-01)
    NextJS->>FastAPI: GET /auth/google/login
    FastAPI->>OAuthSvc: generate_authorization_url()
    OAuthSvc-->>FastAPI: auth_url, state
    FastAPI-->>NextJS: 302 Redirect(auth_url, oauth_state)
    NextJS->>GoogleGUI: Navigate to Google Consent (SCR-02)

    User->>GoogleGUI: Grant Profile and Drive Scope Permissions
    GoogleGUI->>FastAPI: GET /auth/google/callback?code=XYZ&state=...
    FastAPI->>OAuthSvc: verify_state_and_exchange_code(code, state)
    OAuthSvc-->>FastAPI: google_user_info, raw_access_token, raw_refresh_token
    FastAPI->>CryptoSvc: encrypt_token(raw_access_token), encrypt_token(raw_refresh_token)
    CryptoSvc-->>FastAPI: enc_access_token, enc_refresh_token
    FastAPI->>ResSvc: upsert_researcher_with_credentials(profile, enc_tokens)
    ResSvc->>DB: INSERT / UPDATE peneliti & kredensial_oauth
    DB-->>ResSvc: Peneliti Entity
    FastAPI->>SessSvc: create_24h_session(peneliti_id)
    SessSvc->>DB: INSERT INTO sesi_pengguna (token_sesi, kedaluwarsa_pada)
    DB-->>SessSvc: SesiPengguna Entity
    FastAPI-->>NextJS: 302 Redirect to /dashboard (Set-Cookie: paper_gen_session=..., HttpOnly, Secure)
    NextJS-->>User: Render Main Workspace Dashboard (SCR-03)
```

### Sequence Diagram 2: UC-02 Logout Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Actor: Peneliti
    participant NextJS as Boundary: Next.js Frontend
    participant FastAPI as Boundary: FastAPI Auth Router
    participant SessSvc as Controller: SessionService
    participant DB as Entity: PostgreSQL DB

    User->>NextJS: Click "Logout" (SCR-03)
    NextJS->>FastAPI: POST /auth/logout (Cookie: paper_gen_session=...)
    FastAPI->>SessSvc: invalidate_session(session_token)
    SessSvc->>DB: UPDATE sesi_pengguna SET apakah_aktif = FALSE WHERE token_sesi = ...
    DB-->>SessSvc: SessionDeactivated
    FastAPI-->>NextJS: 200 OK (Set-Cookie: paper_gen_session=, Max-Age=0)
    NextJS-->>User: Redirect to Landing Page (SCR-01)
```

---

## 6. Detailed Design: Static Class Model

```mermaid
classDiagram
    class AuthRouter {
        +google_login() RedirectResponse
        +google_callback(code: String, state: String) RedirectResponse
        +get_current_user(session_token: String) ResearcherProfileResponse
        +logout(session_token: String) MessageResponse
    }

    class GoogleOAuthService {
        -client_id: String
        -client_secret: String
        -redirect_uri: String
        +generate_auth_url() Tuple~String, String~
        +exchange_code(code: String) OAuthTokenDTO
        +fetch_user_profile(access_token: String) GoogleProfileDTO
    }

    class TokenEncryptionService {
        -fernet_key: bytes
        +encrypt_token(plain_token: String) String
        +decrypt_token(cipher_text: String) String
    }

    class ResearcherService {
        -db_session: Session
        +upsert_researcher(profile: GoogleProfileDTO) Peneliti
        +save_credentials(peneliti_id: UUID, tokens: OAuthTokenDTO) KredensialOAuth
    }

    class SessionService {
        -db_session: Session
        +create_session(peneliti_id: UUID) SesiPengguna
        +validate_session(session_token: String) SesiPengguna
        +invalidate_session(session_token: String) void
    }

    AuthRouter ..> GoogleOAuthService : invokes
    AuthRouter ..> TokenEncryptionService : encrypts tokens
    AuthRouter ..> ResearcherService : manages user records
    AuthRouter ..> SessionService : manages sessions
```

### Concrete File & Method Signatures
- **Boundaries**:
  - `backend/src/auth/router.py`:
    - `GET /auth/google/login` → `RedirectResponse`
    - `GET /auth/google/callback` → `RedirectResponse`
    - `GET /auth/me` → `ResearcherProfileResponse`
    - `POST /auth/logout` → `JSONResponse`
- **Controllers**:
  - `backend/src/auth/oauth_service.py`:
    - `class GoogleOAuthService:`
      - `def build_auth_url(self) -> Tuple[str, str]:`
      - `def exchange_code(self, code: str) -> Dict[str, Any]:`
  - `backend/src/auth/crypto_service.py`:
    - `class TokenEncryptionService:`
      - `def encrypt(self, plain_text: str) -> str:`
      - `def decrypt(self, cipher_text: str) -> str:`
  - `backend/src/auth/session_service.py`:
    - `class SessionService:`
      - `def create_24h_session(self, peneliti_id: UUID) -> str:`
      - `def verify_session(self, session_token: str) -> Peneliti:`
- **Entities**:
  - `backend/src/auth/models.py`:
    - `class Peneliti(SQLModel, table=True):`
    - `class SesiPengguna(SQLModel, table=True):`
    - `class KredensialOAuth(SQLModel, table=True):`

---

## 7. Critical Design Review (CDR) Checkpoint Gate

| CDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Method Allocation** | PASS | Setiap pesan pada sequence diagram terpetakan ke method kelas yang konkret. |
| **2. Class Signatures** | PASS | Parameter, return type, dan tipe enkripsi terdefinisi lengkap. |
| **3. Test Plan Feasibility** | PASS | Seluruh controller (`OAuthManager`, `CryptoService`, `SessionService`) independen dan unit-testable dengan mock HTTP/DB. |
| **4. PDR Traceability** | PASS | Seluruh objek BCE dari analisis robustness ada dalam class diagram. |

*GATE STATUS*: **[APPROVED TO PROCEED TO IMPLEMENTATION]**

---

## 8. Version Control & Git Milestone Plan

| Milestone / Phase | Scope / Layer | Commit Type & Suggested Message | Verification Required |
|---|---|---|---|
| **Milestone 1** | Database Models & Alembic Migration | `feat(auth): add peneliti, sesi_pengguna, and kredensial_oauth schema with pgvector` | Alembic migration up/down green |
| **Milestone 2** | Crypto & OAuth Core Controllers | `feat(auth): implement token encryption and Google OAuth code exchange service` | Unit tests for Fernet crypto & OAuth mock pass |
| **Milestone 3** | FastAPI Routers & Session Flow | `feat(auth): add login, callback, logout, and me API endpoints` | Integration test for OAuth flow green |
| **Milestone 4** | Next.js Frontend Integration | `feat(auth): implement login button, dashboard session check, and logout UI` | End-to-end Bun & Next.js verification green |
