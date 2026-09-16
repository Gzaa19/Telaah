<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- List of modified principles:
  - Initialized Principle 1: 1. Scientific Structure Integrity
  - Initialized Principle 2: 2. Secure Auth & Data Access
  - Initialized Principle 3: 3. Retrieval Accuracy (RAG/Embedding)
  - Initialized Principle 4: 4. AI-Assisted but Reviewable Development
  - Initialized Principle 5: 5. Performance & Runtime Efficiency
- Added sections:
  - Additional Constraints
  - Development Workflow
  - Governance
- Removed sections: None
- Follow-up TODOs: None
-->

# Paper Generator Constitution

## Core Principles

### 1. Scientific Structure Integrity
- Setiap paper hasil generate MUST mengikuti struktur ilmiah standar yang mencakup Judul, Abstrak, Pendahuluan, Metodologi, Hasil, Diskusi, dan Referensi.
- Generator MUST mematuhi dan menyesuaikan dengan format template target yang ditentukan (misalnya template iciCos atau jurnal/konferensi sejenis).
- Rationale: Menjaga standar akademis dan kemudahan pengajuan (submission) paper ke jurnal/konferensi target tanpa merusak format baku.

### 2. Secure Auth & Data Access
- Autentikasi pengguna wajib memakai Google OAuth 2.0.
- Akses ke Google Drive MUST dibatasi hanya pada scope minimal (least privilege) yang diizinkan oleh pengguna.
- Token OAuth dan kredensial sensitif MUST NOT disimpan dalam bentuk plaintext di sistem (wajib terenkripsi saat disimpan dan ditransmisikan).
- Rationale: Memastikan kerahasiaan dokumen pribadi dan data referensi milik pengguna serta mencegah kebocoran kredensial.

### 3. Retrieval Accuracy (RAG/Embedding)
- Semua dokumen referensi yang diimpor dari Google Drive MUST disimpan sebagai embedding pada PostgreSQL menggunakan ekstensi `pgvector`.
- Similarity search MUST menghasilkan pencarian presisi tinggi dan setiap potongan konteks/sitasi MUST dapat ditelusuri balik (traceable) ke dokumen serta lokasi sumber aslinya.
- Sistem MUST menerapkan validasi pencegahan fabrikasi sitasi atau referensi palsu (hallucination).
- Rationale: Kejujuran akademis dan akurasi referensi adalah syarat mutlak dalam pembuatan paper ilmiah.

### 4. AI-Assisted but Reviewable Development
- Penggunaan AI code generation (vibe coding) diperbolehkan untuk percepatan implementasi.
- Setiap fitur inti (misalnya autentikasi, integrasi Google Drive, pipeline embedding, dan generator LaTeX) MUST melalui alur `/speckit.specify` dan `/speckit.plan` sebelum eksekusi kode dilakukan.
- Tidak ada one-shot generation tanpa peninjauan manusia (human review) untuk kode yang mengelola data sensitif atau logika bisnis utama.
- Rationale: Menjaga kualitas, keamanan, dan pemahaman arsitektur sistem oleh pengembang.

### 5. Performance & Runtime Efficiency
- Layer yang membutuhkan I/O tinggi atau penanganan berkas/streaming cepat memanfaatkan Bun sebagai runtime tambahan untuk mempercepat eksekusi service JavaScript/TypeScript dan proses perkakas frontend.
- FastAPI (Python) MUST tetap menjadi core API backend utama yang bertanggung jawab atas logika AI, pemrosesan embedding, dan integrasi database.
- Rationale: Mengoptimalkan kecepatan build/tooling TS/JS sekaligus mempertahankan keunggulan ekosistem Python untuk AI/LLM.

## Additional Constraints

- **Frontend**: Next.js (App Router, TypeScript), dijalankan dan dibangun menggunakan Bun sebagai JavaScript runtime dan package manager.
- **Backend Utama**: FastAPI (Python) menyediakan REST API, mengelola auth flow, serta mengorkestrasi alur kerja AI/LLM.
- **Database**: PostgreSQL yang dilengkapi ekstensi `pgvector` untuk penyimpanan dan pencarian vektor embedding dokumen referensi.
- **Autentikasi**: Google OAuth 2.0 (Google Identity Services).
- **Penyimpanan Referensi**: Google Drive API untuk pembacaan dan pengambilan dokumen sumber.
- **Batasan Runtime**: Bun diperbolehkan untuk tooling frontend (build, dev server, script utilities) dan/atau service Node/TS pendukung, tetapi MUST NOT menggantikan FastAPI sebagai backend inti untuk fitur AI dan database.

## Development Workflow

- **Urutan Pengembangan Fitur Baru**: Setiap pengembangan fitur baru MUST mengikuti alur sekuensial Spec Kit:
  1. `/speckit.specify` (Definisikan spesifikasi kebutuhan fitur)
  2. `/speckit.plan` (Buat rencana arsitektur dan teknis implementasi)
  3. `/speckit.tasks` (Rincikan tugas-tugas terukur dan independen)
  4. `/speckit.implement` (Eksekusi implementasi kode berdasarkan daftar tugas)
- **Perubahan Skema & Auth**: Perubahan apapun pada skema database (`pgvector`) atau alur autentikasi (OAuth) MUST memicu pembuatan ulang atau re-run `/speckit.plan`.
- **Pengujian Retrieval**: Setiap tugas yang berhubungan dengan pemrosesan embedding atau `pgvector` MUST menyertakan tes akurasi retrieval minimal, termasuk pengujian similarity score dan verifikasi ketelusuran (traceability) balik ke dokumen sumber.

## Governance

- **Otoritas**: Dokumen Constitution ini merupakan hukum tertinggi dalam proyek Paper Generator dan mengungguli praktik pengkodean ad-hoc lainnya.
- **Prosedur Amandemen**: Constitution dapat diamandemen hanya melalui perintah `/speckit.constitution`. Setiap amandemen MUST mencantumkan alasan perubahan dan perubahan tersebut dicatat dalam changelog proyek.
- **Aturan Penomoran Versi**: Versi constitution mengikuti ketentuan Semantic Versioning (`MAJOR.MINOR.PATCH`):
  - **MAJOR**: Perubahan yang tidak kompatibel ke belakang (removal atau redefinisi mendasar pada Core Principles).
  - **MINOR**: Penambahan prinsip baru atau perluasan substansial pada panduan teknis/workflow.
  - **PATCH**: Perbaikan kata, klarifikasi, atau koreksi tipografi tanpa mengubah esensi kebijakan.
- **Kepatuhan**: Setiap peninjauan kode (PR/Code Review) MUST memverifikasi kepatuhan terhadap prinsip dan batasan dalam constitution ini.

**Version**: 1.0.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-09-16
