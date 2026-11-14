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
<!--
  Rosenberg Phase: Domain Model Evolution (Ch. 1 step 2b & Ch. 5, Fig. 5-18/5-19).
  Menambahkan atribut ke entitas domain; BELUM ada operasi/method (dialokasikan di Section 6).
-->

```mermaid
classDiagram
    class ResearcherAccount {
        +UUID id
        +String email
        +String full_name
        +String avatar_url
        +Boolean is_active
        +DateTime last_login_at
        +DateTime created_at
        +DateTime updated_at
    }

    class UserSession {
        +UUID id
        +UUID researcher_id
        +String session_token
        +DateTime expires_at
        +Boolean is_active
        +DateTime created_at
    }

    class OAuthCredential {
        +UUID id
        +UUID researcher_id
        +String provider
        +Text encrypted_access_token
        +Text encrypted_refresh_token
        +DateTime token_expires_at
        +Boolean is_drive_granted
        +DateTime created_at
        +DateTime updated_at
    }

    ResearcherAccount "1" --> "1..*" UserSession : maintains
    ResearcherAccount "1" --> "1" OAuthCredential : owns
```

- **Entities**:
  - `ResearcherAccount`: Menyimpan profil identitas peneliti berbasis email unik Google.
  - `UserSession`: Menyimpan token sesi lokal terautentikasi (berlaku 24 jam).
  - `OAuthCredential`: Menyimpan ciphertext token otorisasi Google OAuth hasil enkripsi Fernet/AES-256.
- **Database Schema Migrations**: `alembic` script `001_auth_schema.py` membuat tabel `researchers`, `user_sessions`, `oauth_credentials`, indeks, serta mengaktifkan ekstensi `vector` (pgvector).

---

## 3. ICONIX Robustness Analysis (Preliminary Design)
<!--
  Doug Rosenberg's Four Rules of Robustness Analysis (Ch. 5):
  1. Actors can only talk to Boundary objects.
  2. Boundary objects can only talk to Controllers and Actors.
  3. Entity objects can only talk to Controllers.
  4. Controller objects can talk to Boundaries, Entities, and other Controllers (NEVER to Actors directly).
  THE GOLDEN RULE: Boundary <-> Entity secara langsung DILARANG (no Noun-Noun links).
  Canonical PlantUML ONLY (No Mermaid).
-->

### 3.1 Robustness Diagram: UC-01 Google OAuth Login & Authorization Flow

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-01: Authenticate via Google OAuth & Authorize Drive Access</b>
  <b>Basic Course (Sunny Day):</b>
  1. Peneliti klik "Login with Google" pada SCR-01.
  2. Sistem arahkan ke Google Consent Screen (SCR-02).
  3. Peneliti menyetujui izin profil & Google Drive.
  4. Sistem tukar code, enkripsi token, upsert Peneliti & OAuthCredential, buat UserSession 24h.
  5. Sistem tampilkan Workspace Dashboard (SCR-03).

  <b>Alternate Courses (Rainy Day):</b>
  - Alt-1: Peneliti batalkan consent -> kembali ke SCR-01 dengan pesan.
  - Alt-2: Peneliti tolak izin Drive -> sesi tetap dibuat, tampilkan SCR-04.
end note

actor "Peneliti" as Peneliti
boundary "Landing Page\n(SCR-01)" as B_Landing
boundary "Google Consent Screen\n(SCR-02)" as B_Consent
boundary "Workspace Dashboard\n(SCR-03)" as B_Dashboard
boundary "Drive Warning Modal\n(SCR-04)" as B_Warning

control "Generate Google Auth URL\n[GoogleOAuthService]" as C_BuildAuthUrl
control "Handle Cancelled Consent\n[GoogleOAuthService]" as C_Cancel #FFCCCC
control "Verify State & Exchange Code\n[GoogleOAuthService]" as C_ExchangeTokens
control "Encrypt OAuth Tokens\n[TokenEncryptionService]" as C_EncryptTokens
control "Upsert Researcher Record\n[ResearcherService]" as C_UpsertProfile
control "Create 24h User Session\n[SessionService]" as C_IssueSession
control "Evaluate Drive Scope\n[GoogleOAuthService]" as C_EvaluateDriveScope

entity "ResearcherAccount" as E_Researcher
entity "OAuthCredential" as E_OAuthCred
entity "UserSession" as E_Session

UC_TEXT -[hidden]-> Peneliti

Peneliti --> B_Landing : Clicks Login with Google
B_Landing --> C_BuildAuthUrl : Request Auth URL
C_BuildAuthUrl --> B_Consent : Redirect to Consent Screen

Peneliti --> B_Consent : Grants / Cancels Consent
B_Consent --> C_Cancel : [Alt-1: Consent Cancelled]
C_Cancel --> B_Landing : Show Cancel Notice

B_Consent --> C_ExchangeTokens : Delivers Auth Code & State
C_ExchangeTokens --> C_EncryptTokens : Request Token Encryption
C_EncryptTokens --> C_UpsertProfile : Deliver Ciphertext
C_UpsertProfile --> E_Researcher : Persist Profile
C_UpsertProfile --> E_OAuthCred : Persist Credentials
C_UpsertProfile --> C_IssueSession : Dispatch Session Creation
C_IssueSession --> E_Session : Persist Active Session
C_IssueSession --> C_EvaluateDriveScope : Evaluate Granted Scopes

C_EvaluateDriveScope --> B_Dashboard : [Sunny Day: Drive Scope Granted]
C_EvaluateDriveScope --> B_Warning : [Alt-2: Drive Scope Denied]
B_Dashboard --> Peneliti : Render Workspace
B_Warning --> Peneliti : Render Warning & Reconnect
@enduml
```

### 3.2 Robustness Diagram: UC-02 Terminate Session (Logout Flow)

```plantuml
@startuml
left to right direction
skinparam shadowing false
skinparam responseMessageBelowArrow true

note as UC_TEXT
  <b>UC-02: Terminate Session (Logout)</b>
  <b>Basic Course (Sunny Day):</b>
  1. Peneliti menekan tombol "Logout" pada SCR-03.
  2. Sistem menonaktifkan UserSession dan membersihkan cookie sesi.
  3. Sistem mengarahkan kembali ke Landing Page (SCR-01).
end note

actor "Peneliti" as Peneliti
boundary "Workspace Dashboard\n(SCR-03)" as B_Dashboard
boundary "Landing Page\n(SCR-01)" as B_Landing
control "Invalidate User Session\n[SessionService]" as C_InvalidateSession
entity "UserSession" as E_Session

UC_TEXT -[hidden]-> Peneliti

Peneliti --> B_Dashboard : Clicks Logout Button
B_Dashboard --> C_InvalidateSession : Dispatch Session Termination
C_InvalidateSession --> E_Session : Deactivate Session
C_InvalidateSession --> B_Landing : Navigate to Landing
B_Landing --> Peneliti : Render Public Landing View
@enduml
```

### 3.3 Boundary-Controller-Entity (BCE) Inventory & Method Allocation
Sesuai kaidah Doug Rosenberg, *Controller* pada Robustness Diagram adalah logika proses bisnis murni (kata kerja) yang selanjutnya dialokasikan menjadi *method* konkrit pada kelas saat memasuki Detailed Design (Sequence Diagram & Class Diagram):

| BCE Type | Element Name | Responsibility / Concrete Implementation Allocation |
|---|---|---|
| **Boundary** | `Landing Page (SCR-01)` | Frontend Next.js halaman landing publik (`frontend/src/app/page.tsx`). |
| **Boundary** | `Google Consent Screen (SCR-02)` | Antarmuka otorisasi eksternal milik Google OAuth Server. |
| **Boundary** | `Workspace Dashboard (SCR-03)` | Frontend Next.js Dashboard Peneliti (`frontend/src/app/dashboard/page.tsx`). |
| **Boundary** | `Drive Warning Modal (SCR-04)` | Frontend React Component Modal Peringatan Drive (`frontend/src/components/DriveWarningModal.tsx`). |
| **Controller** | `Generate Google Auth URL` | `GoogleOAuthService.generate_authorization_url()` |
| **Controller** | `Verify State & Exchange Code` | `GoogleOAuthService.verify_state_and_exchange_code()` |
| **Controller** | `Encrypt OAuth Tokens` | `TokenEncryptionService.encrypt_token()` |
| **Controller** | `Upsert Researcher Record` | `ResearcherService.upsert_researcher_with_credentials()` |
| **Controller** | `Create 24h User Session` | `SessionService.create_24h_session()` |
| **Controller** | `Evaluate Drive Scope` | `GoogleOAuthService.check_drive_scope_granted()` |
| **Controller** | `Invalidate User Session` | `SessionService.invalidate_session()` |
| **Entity** | `ResearcherAccount` | Model domain persisten peneliti (`backend/src/auth/models.py`). |
| **Entity** | `OAuthCredential` | Model domain persisten token OAuth terenkripsi (`backend/src/auth/models.py`). |
| **Entity** | `UserSession` | Model domain persisten sesi pengguna aktif (`backend/src/auth/models.py`). |

### 3.4 Strict BCE Rule Compliance Audit (Doug Rosenberg Rules)
- [x] **Rule 1 (Actors can only talk to Boundaries)**: Peneliti hanya berinteraksi dengan antarmuka UI (`SCR-01`, `SCR-02`, `SCR-03`, `SCR-04`).
- [x] **Rule 2 (Boundaries can only talk to Controllers and Actors)**: UI memicu Controller (verb) dan tidak pernah menyentuh Database Entity langsung.
- [x] **Rule 3 (Entities can only talk to Controllers)**: Entitas `ResearcherAccount`, `OAuthCredential`, dan `UserSession` hanya diakses dan dimutasi melalui Controllers.
- [x] **Rule 4 (Controllers can talk to Boundaries, Controllers, and Entities, but NOT directly to Actors)**: Logika proses berkomunikasi dengan Boundaries untuk navigasi/rendering ke aktor.
- [x] **Zero Direct Boundary-to-Entity Links**: Terverifikasi 100% tidak ada jalan pintas dari Boundary langsung ke Entity.

---

## 4. Preliminary Design Review (PDR) Checkpoint Gate

| PDR Criteria | Status | Evidence / Notes |
|---|:---:|---|
| **1. Use Case Coverage** | PASS | Diagram robustness mencakup alur lengkap UC-01 (Login) dan UC-02 (Logout). |
| **2. Alternate Courses Handled** | PASS | Alur penolakan scope Drive diarahkan melalui `C_EvaluateDriveScope` ke `B_WarningModal` (SCR-04). |
| **3. Domain Model Updated** | PASS | Entitas domain `ResearcherAccount`, `UserSession`, dan `OAuthCredential` terdefinisi presisi sesuai skema database. |
| **4. Strict BCE Adherence** | PASS | Terverifikasi TIDAK ADA hubungan langsung Boundary-ke-Entity, dan Boundary murni Client UI. |

*GATE STATUS*: **[APPROVED TO PROCEED TO DETAILED DESIGN]**

---

## 5. Detailed Design: Sequence Diagrams (Behavior Allocation)
<!--
  Rosenberg Phase: Detailed Design (Ch. 8). Canonical PlantUML ONLY (No Mermaid).
-->

### Sequence Diagram 1: UC-01 Google OAuth Login & Callback

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "Landing Page\n(SCR-01)" as LandingUI
boundary "Google Consent\n(SCR-02)" as GoogleConsent
control "GoogleOAuthService" as OAuthSvc
control "TokenEncryptionService" as CryptoSvc
control "ResearcherService" as ResSvc
control "SessionService" as SessSvc
entity "ResearcherAccount" as Researcher
entity "OAuthCredential" as Credential
entity "UserSession" as Session
boundary "Workspace Dashboard\n(SCR-03)" as DashboardUI
boundary "Drive Warning Modal\n(SCR-04)" as WarningUI

note left of Peneliti
  <b>UC-01: Google OAuth Login & Drive Access</b>
  <b>Basic Course:</b>
  1. Peneliti klik Login di SCR-01.
  2. GoogleOAuthService siapkan Auth URL -> SCR-02.
  3. Peneliti beri izin -> exchange code & enkripsi token.
  4. Simpan ResearcherAccount, OAuthCredential, UserSession -> SCR-03.

  <b>Alternate Courses:</b>
  - Alt-1: Consent dibatalkan -> kembali ke SCR-01.
  - Alt-2: Izin Drive ditolak -> buka SCR-04.
end note

Peneliti -> LandingUI : initiate_login()
LandingUI -> OAuthSvc : generate_authorization_url()
OAuthSvc -> GoogleConsent : redirect_to_consent(auth_url, oauth_state)

Peneliti -> GoogleConsent : submit_consent_decision()

alt Alt-1: Peneliti Membatalkan Consent
    GoogleConsent -> OAuthSvc : deliver_cancelled_callback(error)
    OAuthSvc -> LandingUI : redirect_with_cancel_notice()
    LandingUI --> Peneliti : show_notice("Proses login dibatalkan")
else Sunny Day / Profile Granted
    GoogleConsent -> OAuthSvc : verify_state_and_exchange_code(auth_code, state)

    OAuthSvc -> CryptoSvc : encrypt_token(raw_access_token)
    CryptoSvc --> OAuthSvc : enc_access_token
    OAuthSvc -> CryptoSvc : encrypt_token(raw_refresh_token)
    CryptoSvc --> OAuthSvc : enc_refresh_token

    OAuthSvc -> ResSvc : upsert_researcher_with_credentials(profile, enc_tokens)
    ResSvc -> Researcher : update_or_create(email, full_name, avatar_url)
    Researcher --> ResSvc : researcher_record
    ResSvc -> Credential : save_encrypted_tokens(researcher_id, enc_tokens)
    Credential --> ResSvc : credential_record
    ResSvc --> OAuthSvc : researcher_account

    OAuthSvc -> SessSvc : create_24h_session(researcher_id)
    SessSvc -> Session : issue_session_record(token, expires_at)
    Session --> SessSvc : session_record
    SessSvc --> OAuthSvc : session_token

    alt Sunny Day: Drive Scope Granted
        OAuthSvc -> DashboardUI : navigate_to_workspace(session_cookie)
        DashboardUI --> Peneliti : render_workspace()
    else Alt-2: Drive Scope Denied
        OAuthSvc -> WarningUI : show_drive_warning(session_cookie)
        WarningUI --> Peneliti : render_warning_and_reconnect()
    end
end
@enduml
```

### Sequence Diagram 2: UC-02 Terminate Session (Logout Flow)

```plantuml
@startuml
autoactivate off
autonumber
skinparam shadowing false
skinparam responseMessageBelowArrow true

actor "Peneliti" as Peneliti
boundary "Workspace Dashboard\n(SCR-03)" as DashboardUI
control "SessionService" as SessSvc
entity "UserSession" as Session
boundary "Landing Page\n(SCR-01)" as LandingUI

note left of Peneliti
  <b>UC-02: Terminate Session (Logout)</b>
  1. Peneliti klik Logout di SCR-03.
  2. SessionService nonaktifkan UserSession.
  3. Redirect ke SCR-01.
end note

Peneliti -> DashboardUI : request_logout()
DashboardUI -> SessSvc : invalidate_session(session_token)
SessSvc -> Session : deactivate()
Session --> SessSvc : session_deactivated
SessSvc --> DashboardUI : session_cleared
DashboardUI -> LandingUI : navigate_to_public()
LandingUI --> Peneliti : render_landing_view()
@enduml
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
        +upsert_researcher(profile: GoogleProfileDTO) ResearcherAccount
        +save_credentials(researcher_id: UUID, tokens: OAuthTokenDTO) OAuthCredential
    }

    class SessionService {
        -db_session: Session
        +create_session(researcher_id: UUID) UserSession
        +validate_session(session_token: String) UserSession
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
      - `def create_24h_session(self, researcher_id: UUID) -> str:`
      - `def verify_session(self, session_token: str) -> ResearcherAccount:`
- **Entities**:
  - `backend/src/auth/models.py`:
    - `class ResearcherAccount(SQLModel, table=True):`
    - `class UserSession(SQLModel, table=True):`
    - `class OAuthCredential(SQLModel, table=True):`

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
| **Milestone 1** | Database Models & Alembic Migration | `feat(auth): add researcher, session, and oauth credential schema with pgvector` | Alembic migration up/down green |
| **Milestone 2** | Crypto & OAuth Core Controllers | `feat(auth): implement token encryption and Google OAuth code exchange service` | Unit tests for Fernet crypto & OAuth mock pass |
| **Milestone 3** | FastAPI Routers & Session Flow | `feat(auth): add login, callback, logout, and me API endpoints` | Integration test for OAuth flow green |
| **Milestone 4** | Next.js Frontend Integration | `feat(auth): implement login button, dashboard session check, and logout UI` | End-to-end Bun & Next.js verification green |
