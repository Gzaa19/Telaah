# Research & Design Decisions: Google OAuth Login & Drive Access

**Feature**: Google OAuth Login & Drive Access Authorization (`001-google-oauth-login`)  
**Date**: 2026-09-16  
**Status**: Completed  

---

## 1. Executive Summary & Technology Choices

| Aspect | Selected Solution | Key Rationale | Alternatives Evaluated |
|---|---|---|---|
| **Frontend Runtime** | Next.js (App Router, TS) via Bun | High performance, single runtime/package manager for JS/TS tooling per Constitution Principle 5. | Node.js / npm, Vite SPA |
| **Backend Framework** | FastAPI (Python 3.12) | Official core API per Constitution Principle 5; rich Python ecosystem for encryption and AI RAG pipelines. | Node.js Express, Flask |
| **OAuth Library** | `authlib` / `google-auth` | Official, secure, standard compliant implementation for PKCE & Authorization Code flow. | Custom HTTP requests |
| **Session Storage** | HTTP-only, Secure, SameSite Cookie (JWT / Session Token) | Protects against XSS attacks; client secret and Google tokens never exposed to browser. | LocalStorage JWT, Plain Cookies |
| **Token Encryption** | `cryptography` (Fernet / AES-256-GCM) | Encrypts Google access & refresh tokens before storing in PostgreSQL to comply with Constitution Principle 2. | Plaintext storage, Base64 encoding |
| **Database** | PostgreSQL (pgvector extension ready) | Single source of truth for user records, session state, and future RAG vector storage. | SQLite, MongoDB |

---

## 2. Detailed Technical Decisions & Research

### Decision 1: OAuth 2.0 Flow Architecture
- **Choice**: Authorization Code Flow with PKCE (Proof Key for Code Exchange) initiated from Next.js -> FastAPI -> Google OAuth -> FastAPI Callback -> Next.js Workspace.
- **Rationale**: Keeps Google Client Secret strictly on the FastAPI backend. Next.js never sees Google credentials.
- **Scopes**:
  - `openid`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/drive.readonly`

### Decision 2: Token Encryption at Rest
- **Choice**: Use Python `cryptography.fernet.Fernet` with a dedicated symmetric encryption key (`ENCRYPTION_KEY` in environment).
- **Rationale**: Fulfills Constitution Principle 2 ("Token dan credential tidak boleh disimpan plaintext").
- **Implementation Note**: Both `encrypted_access_token` and `encrypted_refresh_token` are encrypted before DB insert/update and decrypted in memory only when calling Google Drive API endpoints.

### Decision 3: Session Security & Cookie Policy
- **Choice**: Server-issued HTTP-only Session Cookie (`session_id` or signed JWT `paper_gen_session`).
- **Cookie Flags**: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400` (24 jam sesuai clarification).
- **Rationale**: Prevents JavaScript client code from accessing the session token directly, guarding against XSS token theft.

### Decision 4: Database Schema & pgvector Compatibility
- **Choice**: Prepare PostgreSQL database with `CREATE EXTENSION IF NOT EXISTS vector;` in Alembic migrations.
- **Table**: `researchers`, `user_sessions`, `oauth_credentials`.
- **Rationale**: Ensures the database schema is immediately ready for subsequent RAG embedding tables while keeping auth tables clean and standard.

---

## 3. Risks & Mitigations

1. **Risk**: Google Access Token Expiration during Drive operations.  
   **Mitigation**: FastAPI backend checks token validity timestamp (`token_expires_at`). If expired, it uses the encrypted refresh token to request a new access token, or returns a 401 re-authorization prompt (`SCR-04`) if refresh fails or consent was revoked.
2. **Risk**: OAuth CSRF State Mismatch.  
   **Mitigation**: Pass a cryptographically secure random `state` parameter stored in an HTTP-only state cookie during `GET /auth/google/login` and verify it in `GET /auth/google/callback`.
