<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- List of modified principles:
  - Added Principle 6: 6. Ponytail Engineering (Simplicity & Anti-Overengineering)
  - Added Principle 7: 7. Anti-Slop Frontend Design (Taste-Skill Compliance)
  - Clarified Scope: Telaah is an AI Scientific Journal Paper & Manuscript Generator (target: Scopus, SINTA, IEEE, Elsevier), NOT a funding/grant proposal generator.
- Added sections:
  - Frontend Component & Iconography Constraints
- Removed sections: None
- Follow-up TODOs: None
-->

# Telaah Constitution: AI Scientific Journal Paper Generator

## Core Principles

### 1. Scientific Structure Integrity (IMRaD Standard)
- Setiap paper hasil generate MUST mengikuti struktur manuskrip ilmiah standar yang mencakup Judul, Abstrak, Pendahuluan (Introduction), Tinjauan Pustaka / State of the Art, Metodologi (Methods), Hasil dan Pembahasan (Results & Discussion), Kesimpulan (Conclusion), dan Referensi (References).
- Generator MUST mematuhi dan menyesuaikan dengan format publikasi target yang ditentukan (misalnya template IEEE, Elsevier, Springer, atau jurnal terindeks Scopus/SINTA).
- Sistem ini secara eksplisit adalah **Penyusun Draf Paper Jurnal Ilmiah**, BUKAN proposal hibah/pendanaan riset.
- Rationale: Menjaga standar akademis dan kemudahan pengajuan (*submission*) paper ke jurnal/konferensi target tanpa merusak format baku.

### 2. Secure Auth & Data Access
- Autentikasi pengguna wajib memakai Google OAuth 2.0 (Google Identity Services).
- Akses ke Google Drive MUST dibatasi hanya pada scope minimal (*least privilege*): `drive.readonly`.
- Token OAuth dan kredensial sensitif MUST NOT disimpan dalam bentuk plaintext di sistem (wajib terenkripsi menggunakan Fernet/AES-256 saat disimpan dan ditransmisikan).
- Rationale: Memastikan kerahasiaan berkas riset pribadi milik peneliti dan mencegah kebocoran kredensial.

### 3. Retrieval Accuracy (RAG/Embedding)
- Semua dokumen literatur ilmiah yang diimpor dari Google Drive MUST disimpan sebagai embedding pada PostgreSQL menggunakan ekstensi `pgvector`.
- Similarity search MUST menghasilkan pencarian presisi tinggi dan setiap potongan konteks/sitasi MUST dapat ditelusuri balik (*traceable*) ke dokumen PDF serta nomor halaman aslinya.
- Sistem MUST menerapkan validasi pencegahan fabrikasi sitasi atau referensi palsu (*anti-hallucination*).
- Rationale: Integritas ilmiah dan akurasi sitasi adalah syarat mutlak dalam publikasi jurnal ilmiah.

### 4. AI-Assisted but Reviewable Development
- Penggunaan AI code generation diperbolehkan untuk percepatan implementasi.
- Setiap fitur inti MUST melalui alur Spec Kit (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`) sebelum eksekusi kode dilakukan.
- Tidak ada *one-shot generation* tanpa peninjauan manusia (*human review*) untuk kode yang mengelola data sensitif atau logika bisnis utama.
- Rationale: Menjaga kualitas, keamanan, dan pemahaman arsitektur sistem oleh pengembang.

### 5. Performance & Runtime Efficiency
- Tooling dan runtime JavaScript/TypeScript memanfaatkan Bun untuk build dan dependency management cepat.
- FastAPI (Python) MUST tetap menjadi core API backend utama yang bertanggung jawab atas logika AI, pemrosesan embedding, dan integrasi database.
- Rationale: Mengoptimalkan kecepatan tooling frontend sekaligus mempertahankan keunggulan ekosistem Python untuk AI/LLM.

### 6. Ponytail Engineering (Simplicity & Anti-Overengineering)
- **YAGNI Mandate**: Sebelum menulis kode baru, selalu evaluasi: apakah kode ini benar-benar dibutuhkan sekarang? Dapatkah fitur standar platform / standard library menyelesaikannya?
- **Anti-Bloat**: Dilarang membuat abstraksi berlapis yang tidak diminta (*no unrequested abstractions*), library pihak ketiga yang berlebihan (*no avoidable dependencies*), dan boilerplate kosong.
- **Minimum Working Solution**: Bangun solusi paling sederhana dan elegan yang langsung bekerja. Tandai penyederhanaan arsitektural yang disengaja dengan komentar: `// ponytail: <alasan/penjelasan>`.
- Rationale: Menjaga codebase tetap ringan, mudah dirawat (*maintainable*), cepat, dan bebas dari beban teknis berlebih.

### 7. Anti-Slop Frontend Design (Taste-Skill Compliance)
- **Teknologi Utama**: Frontend MUST menggunakan **Next.js App Router**, **Tailwind CSS**, dan **shadcn/ui**.
- **Struktur Folder Komponen**:
  - Primitif antarmuka wajib berada di `src/components/ui/` mengikuti konvensi standar shadcn (`button.tsx`, `card.tsx`, `badge.tsx`, dll.).
  - Komponen fitur domain berada di `src/components/` atau `src/components/features/`.
- **Larangan Ikon (Iconography Rule)**:
  - **STRICT BAN: Dilarang menggunakan `lucide-react`!**
  - Seluruh ikon wajib menggunakan **`@phosphor-icons/react`** (atau `@radix-ui/react-icons`).
  - Wajib mempertahankan keseragaman satu keluarga ikon (*one family per project*) dengan *stroke weight* yang konsisten.
- **Tipografi & Estetika Warna**:
  - Tipografi wajib menggunakan font kurasi modern seperti **`Geist`** dan **`Geist Mono`** (via `next/font`), bukan generic Inter atau serif dekoratif sembarangan.
  - Palet warna wajib berbasis kanvas gelap yang elegan (*Slate/Zinc dark canvas*), aksen tunggal berbobot kontras tinggi (*Electric Blue* atau *Emerald*), kontras teks memenuhi standar aksesibilitas WCAG AA (min 4.5:1), dan bebas dari gradien ungu/pink AI murahan (*no AI-purple gradient slop*) serta palet cokelat/beige kusam.
- Rationale: Menghasilkan antarmuka bereputasi tinggi yang terasa presisi, akademis, profesional, dan tidak terlihat seperti template AI generik.

## Additional Constraints

- **Frontend**: Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, `@phosphor-icons/react`, dijalankan menggunakan Bun.
- **Backend Utama**: FastAPI (Python 3.12) menyediakan REST API, mengelola auth flow, serta mengorkestrasi pipeline AI/LLM.
- **Database**: PostgreSQL dengan ekstensi `pgvector` untuk penyimpanan dan pencarian vektor embedding dokumen referensi.
- **Autentikasi**: Google OAuth 2.0 (Google Identity Services).
- **Penyimpanan Referensi**: Google Drive API (`drive.readonly`) untuk pembacaan literatur ilmiah.

## Development Workflow

- **Urutan Pengembangan Fitur Baru**: Mengikuti alur Spec Kit:
  1. `/speckit-specify` (Definisikan spesifikasi kebutuhan fitur)
  2. `/speckit-plan` (Buat rencana arsitektur dan teknis implementasi ICONIX)
  3. `/speckit-tasks` (Rincikan tugas-tugas terukur dan sekuensial)
  4. `/speckit-implement` (Eksekusi implementasi kode berdasarkan tasks.md)
- **Kepatuhan Desain & Kode**: Setiap PR/implementasi UI wajib diverifikasi terhadap Prinsip 6 (Ponytail) dan Prinsip 7 (Taste-Skill).

## Governance

- **Otoritas**: Dokumen Constitution ini merupakan hukum tertinggi dalam proyek Telaah dan mengungguli instruksi ad-hoc lainnya.
- **Prosedur Amandemen**: Constitution dapat diamandemen hanya melalui perintah `/speckit-constitution`. Setiap amandemen MUST mencantumkan alasan perubahan dan dicatat dalam changelog proyek.
- **Aturan Penomoran Versi**:
  - **MAJOR**: Perubahan mendasar atau penghapusan Core Principles.
  - **MINOR**: Penambahan prinsip baru (seperti Ponytail & Taste-Skill) atau pembaruan batasan arsitektur.
  - **PATCH**: Koreksi tipografi atau perbaikan kata minor.

**Version**: 1.1.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-09-16
