<!--
Sync Impact Report:
- Version change: 1.3.0 → 1.4.0
- List of modified principles:
  - Principle 1: Adjusted "1. Scientific Structure Integrity" so manuscript sections follow the target publication template (e.g., ICICoS/IEEE) instead of mandating a separate Literature Review section when the target template differs.
  - Principle 4: Expanded "4. AI-Assisted but Reviewable Development" with TDD, Unit Testing, Integration Testing, Test Execution, and Honest Reporting standards, linked to the 6-stage Spec Kit workflow and Principle 8.
- Added principles:
  - Principle 8: "8. Use Case–Driven Development & ICONIX Integration" (Use Case–Driven scope, Specification-First, ICONIX Requirements/Analysis/Design integration, Incremental Modeling, Artifact Consistency, Human Review & Revision, No Unverified Assumptions, Implementation Based on Artifacts, Incremental Delivery).
- Modified sections:
  - Development Workflow: Replaced 4-stage workflow with Project Initialization, 6-stage Feature Development Cycle (Specify → Clarify → Plan → Tasks → Analyze → Implement) with Review Gates, Feature Completion & Iteration, and Design & Code Compliance.
- Removed sections: None
- Follow-up TODOs: Align ICONIX preset templates/commands in .specify/presets/iconix-preset/ with the 6-stage workflow.
-->

# Telaah Constitution: AI Scientific Journal Paper Generator

## Core Principles

### 1. Scientific Structure Integrity (IMRaD Standard)
- Setiap paper hasil generate MUST mengikuti struktur manuskrip ilmiah yang sesuai dengan templat publikasi target (misalnya ICICoS/IEEE, Elsevier, Springer, atau jurnal terindeks Scopus/SINTA), mencakup elemen inti seperti Judul, Abstrak, Pendahuluan (*Introduction*), Metodologi (*Methods*), Hasil dan Pembahasan (*Results & Discussion*), Kesimpulan (*Conclusion*), dan Referensi (*References*), serta bagian tambahan seperti *Related Work* / Tinjauan Pustaka apabila disyaratkan oleh templat tujuan.
- Generator MUST mematuhi dan menyesuaikan struktur, tata letak, serta ketentuan penulisan dengan format publikasi target yang ditentukan.
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
- Penggunaan AI *code generation* diperbolehkan untuk mendukung penyusunan spesifikasi, pembentukan artefak pemodelan, perancangan, implementasi, dan pengujian perangkat lunak.
- Setiap fitur inti MUST mengikuti *workflow* Spec Kit yang ditetapkan pada bagian Development Workflow dan prinsip *Use Case–Driven Development & ICONIX Integration* sebelum implementasi kode dilakukan.
- Tidak ada *one-shot generation* tanpa peninjauan manusia (*human review*) untuk spesifikasi, rancangan, serta kode yang mengelola data sensitif atau logika bisnis utama.
- AI agent MUST menjelaskan perubahan yang dilakukan, komponen yang terdampak, serta asumsi yang digunakan selama pengembangan.
- **Test-Driven Development (TDD)**: Pengujian MUST disusun berdasarkan kebutuhan fungsional, *acceptance criteria*, dan skenario *use case* sebelum implementasi fungsi yang berkaitan.
- **Unit Testing**: Setiap fungsi atau komponen logika bisnis utama MUST memiliki pengujian terhadap perilaku normal, kondisi alternatif, dan penanganan kesalahan yang relevan.
- **Integration Testing**: Interaksi antarkomponen dan *endpoint* API yang mendukung skenario *use case* MUST diuji sesuai kebutuhan fitur.
- **Test Execution**: AI agent MUST menjalankan pengujian yang relevan terhadap perubahan kode. Apabila pengujian gagal, AI agent MUST mengidentifikasi penyebab, melakukan perbaikan, dan menjalankan pengujian kembali.
- **Honest Reporting**: AI agent MUST NOT menyatakan tugas selesai, pengujian berhasil, atau fitur memenuhi spesifikasi apabila pengujian belum dijalankan atau masih terdapat kegagalan. Pengujian yang belum dilakukan dan kendala yang ditemukan MUST dilaporkan kepada pengembang.
- Rationale: Menjaga kualitas, keamanan, kesesuaian implementasi, dan pemahaman pengembang terhadap perangkat lunak yang dihasilkan melalui bantuan AI.

### 5. Performance & Runtime Efficiency
- Tooling dan runtime JavaScript/TypeScript memanfaatkan Bun untuk build dan dependency management cepat.
- FastAPI (Python) MUST tetap menjadi core API backend utama yang bertanggung jawab atas logika AI, pemrosesan embedding, dan integrasi database.
- Rationale: Mengoptimalkan kecepatan tooling frontend sekaligus mempertahankan keunggulan ekosistem Python untuk AI/LLM.

### 6. Ponytail Engineering (Simplicity, Anti-Overengineering & Agent Token Efficiency)
- **YAGNI Mandate**: Sebelum menulis kode baru, selalu evaluasi: apakah kode ini benar-benar dibutuhkan sekarang? Dapatkah fitur standar platform / standard library menyelesaikannya?
- **Anti-Bloat**: Dilarang membuat abstraksi berlapis yang tidak diminta (*no unrequested abstractions*), library pihak ketiga yang berlebihan (*no avoidable dependencies*), dan boilerplate kosong.
- **Minimum Working Solution**: Bangun solusi paling sederhana dan elegan yang langsung bekerja. Tandai penyederhanaan arsitektural yang disengaja dengan komentar: `// ponytail: <alasan/penjelasan>`.
- **Agent Token Hygiene & RTK CLI Proxy**:
  - AI agent MUST meminimalkan pemborosan token (*Token Tax*) dan mencegah polusi *context window* saat menjalankan perintah terminal.
  - Jika CLI proxy **`rtk`** (Rust Token Killer) terpasang di sistem pengguna (misal: `/opt/homebrew/bin/rtk`), AI agent MUST memprioritaskan penggunaan `rtk <command>` untuk perintah terminal yang menghasilkan output panjang atau bising (seperti `rtk pytest`, `rtk git status`, `rtk git diff`, `rtk bun run build`, `rtk ls`, `rtk find`, dll.).
  - Jika `rtk` tidak tersedia di environment tertentu (misal: CI/CD runner), AI agent MUST menggunakan flag hening/ringkas (seperti `-q`, `--compact`, atau piping spesifik) untuk mencegah *context buffer exhaustion*.
- Rationale: Menjaga codebase tetap ringan, mudah dirawat (*maintainable*), cepat, serta menghemat konsumsi token konteks LLM hingga 60–90% selama siklus pengembangan agenik otonom.

### 7. Anti-Slop Frontend Design (Academic Editorial Canvas & Taste-Skill Compliance)
- **Desain Inti (Core Aesthetic)**: Antarmuka Telaah MUST menggunakan **Academic Editorial Canvas** yang terinspirasi dari estetika manuskrip dan jurnal ilmiah prestisius, menghadirkan suasana ruang baca riset yang hangat, elegan, dan berwibawa (*scholarly publishing house*).
- **Teknologi Utama**: Frontend MUST menggunakan **Next.js App Router**, **Tailwind CSS**, dan **shadcn/ui**.
- **Struktur Folder Komponen**:
  - Primitif antarmuka wajib berada di `src/components/ui/` mengikuti konvensi standar shadcn (`button.tsx`, `card.tsx`, `badge.tsx`, dll.).
  - Komponen fitur domain berada di `src/components/` atau `src/components/features/`.
- **Tipografi Kurasi Akademis**:
  - Judul dan Display Editorial wajib menggunakan font serif terkurasi **`Newsreader`** (via `next/font`), menghadirkan nuansa jurnal akademis klasik.
  - Teks Isi (*Body Text*), tabel, dan elemen interaktif wajib menggunakan sans-serif **`Inter`** untuk keterbacaan (*legibility*) maksimal pada layar kerja panjang.
  - Angka metrik, chunk ID, checksum, dan data teknis wajib menggunakan **`JetBrains Mono`**.
- **Palet Warna & Kontras WCAG AA**:
  - Latar belakang wajib menggunakan kanvas kertas hangat (*light warm paper surface* `#fcf9f8`, container `#f0eded` / `#f6f3f2`), bukan putih silau murni (*no harsh stark white #ffffff*) ataupun template AI dark theme generik.
  - Tipografi wajib menggunakan tinta gelap pekat berkontras tinggi (*Deep Charcoal Ink* `#1c1b1b` dan slate `#434655`) yang memenuhi standar aksesibilitas WCAG AA (rasio kontras min 4.5:1).
  - Aksen riset wajib berbasis **Scholarly Royal Blue** (`#0037b0` / `#1d4ed8`) untuk elemen interaktif primer dan **Archival Emerald** (`#006c4a` / `#82f5c1`) untuk status keberhasilan serta integritas terverifikasi.
  - Larangan keras terhadap gradien ungu/pink AI murahan (*no AI-purple gradient slop*) dan palet cokelat/beige kusam yang tidak kontras.
- **Larangan Ikon (Iconography Rule)**:
  - **STRICT BAN: Dilarang menggunakan `lucide-react`!**
  - Seluruh ikon wajib menggunakan **`@phosphor-icons/react`** (atau `@radix-ui/react-icons`).
  - Wajib mempertahankan keseragaman satu keluarga ikon (*one family per project*) dengan *stroke weight* yang konsisten (`regular`, `bold`, atau `duotone`).
- Rationale: Menghasilkan antarmuka bereputasi tinggi yang terasa presisi, akademis, profesional, dan mencerminkan kualitas publikasi jurnal internasional tanpa kesan template AI murah.

### 8. Use Case–Driven Development & ICONIX Integration
- **Use Case–Driven Development**: Setiap fitur utama MUST dikembangkan berdasarkan *use case* utama yang telah ditentukan oleh pengembang. Satu *use case* utama menjadi dasar satu siklus pengembangan Spec Kit dan dapat diperinci menjadi beberapa *sub-use case* sesuai cakupan fitur.
- **Single Feature Scope**: Setiap iterasi MUST memiliki ruang lingkup pengembangan yang jelas. AI agent MUST NOT menambahkan fitur di luar *use case* utama yang sedang dikembangkan tanpa persetujuan pengembang.
- **Specification-First**: AI agent MUST menggunakan kebutuhan perangkat lunak, deskripsi awal *use case*, dan Constitution sebagai acuan dalam menghasilkan spesifikasi fitur. Implementasi kode MUST NOT dilakukan sebelum spesifikasi, rancangan, dan tugas implementasi disusun serta ditinjau.
- **ICONIX Requirements Integration**: Pada tahap *Specify*, AI agent MUST menghasilkan artefak *requirements* ICONIX yang mencakup *GUI storyboard*, *use case diagram*, deskripsi *use case*, dan *initial domain model*. Artefak disusun berdasarkan kebutuhan dan cakupan *use case* utama yang diberikan.
- **ICONIX Analysis & Design Integration**: Pada tahap *Plan*, AI agent MUST menghasilkan artefak analisis dan desain berdasarkan spesifikasi fitur:
  - *Analysis/Preliminary Design*: pembaruan *domain model*, *robustness diagram*, dan *Preliminary Design Review* (PDR).
  - *Detailed Design*: *sequence diagram*, *static class model*, dan *Critical Design Review* (CDR).
- **Incremental Modeling**: Artefak ICONIX MUST dibentuk sesuai cakupan fitur yang sedang dikembangkan. *Class diagram* tidak harus mencakup seluruh aplikasi dalam satu iterasi. Komponen dari iterasi sebelumnya MUST digunakan kembali atau diperbarui apabila diperlukan, dengan menjaga konsistensi model dan arsitektur yang telah tersedia.
- **Artifact Consistency**: Setiap artefak yang dihasilkan MUST mengacu pada kebutuhan dan skenario *use case* yang telah ditetapkan. Perubahan terhadap spesifikasi MUST diikuti peninjauan terhadap artefak desain dan tugas implementasi yang terdampak.
- **Human Review & Revision**: AI agent MUST memberikan kesempatan kepada pengembang untuk meninjau spesifikasi dan rancangan sebelum melanjutkan tahap berikutnya. Apabila terdapat ketidaksesuaian, AI agent MUST memperbarui artefak terkait dan melakukan pemeriksaan ulang.
- **No Unverified Assumptions**: AI agent MUST NOT menetapkan kebutuhan baru, mengubah perilaku sistem, atau mengambil keputusan yang berdampak terhadap ruang lingkup pengembangan tanpa dasar yang jelas. Ketidakjelasan kebutuhan MUST diselesaikan melalui *Clarify* atau konfirmasi kepada pengembang.
- **Implementation Based on Artifacts**: Kode program MUST dikembangkan berdasarkan `spec.md`, `plan.md`, `tasks.md`, dan artefak ICONIX yang telah ditinjau. Apabila ditemukan perubahan yang diperlukan selama implementasi, AI agent MUST menjelaskan dampaknya dan memperbarui artefak terkait setelah memperoleh persetujuan pengembang.
- **Incremental Delivery**: Setelah implementasi dan pengujian suatu *use case* utama selesai, pengembangan dapat dilanjutkan ke *use case* utama berikutnya tanpa mengulang pembentukan Constitution.
- Rationale: Menjaga agar pengembangan berbantuan AI tetap terarah pada kebutuhan pengguna, memiliki rancangan yang dapat ditinjau, serta menghasilkan implementasi secara bertahap berdasarkan *use case* melalui integrasi *ICONIX Process* dan *Specification-Driven Development*.

## Additional Constraints

- **Frontend**: Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, `@phosphor-icons/react`, dijalankan menggunakan Bun.
- **Backend Utama**: FastAPI (Python 3.12) menyediakan REST API, mengelola auth flow, serta mengorkestrasi pipeline AI/LLM.
- **Database**: PostgreSQL dengan ekstensi `pgvector` untuk penyimpanan dan pencarian vektor embedding dokumen referensi.
- **Autentikasi**: Google OAuth 2.0 (Google Identity Services).
- **Penyimpanan Referensi**: Google Drive API (`drive.readonly`) untuk pembacaan literatur ilmiah.

## Development Workflow

### A. Project Initialization
1. Constitution MUST ditetapkan pada awal pengembangan sebagai acuan seluruh fitur Telaah.
2. Templat Spec Kit MUST disesuaikan dengan kebutuhan pemodelan *ICONIX Process*.
3. Pengembang MUST mengidentifikasi *use case* utama berdasarkan kebutuhan perangkat lunak dan menentukan urutan pengembangan berdasarkan prioritas serta ketergantungan antarfitur.
4. Constitution dan templat yang telah ditetapkan MUST digunakan kembali pada setiap iterasi pengembangan fitur.

### B. Feature Development Cycle
Setiap *use case* utama dikembangkan melalui satu siklus Spec Kit. AI agent MUST mengikuti tahapan berikut secara berurutan.

#### 1. Specify — ICONIX Requirements
- **Command**: `/speckit-specify`
- **Input**:
  - Identitas dan nama *use case* utama.
  - Deskripsi awal *use case*.
  - Kebutuhan fungsional dan nonfungsional yang relevan.
  - Constitution.
  - Konteks fitur yang telah dikembangkan sebelumnya.
- **Activities**:
  - Menentukan ruang lingkup fitur.
  - Merinci *use case* utama menjadi *sub-use case* apabila diperlukan.
  - Menyusun spesifikasi kebutuhan fitur dan *acceptance criteria*.
  - Menghasilkan *GUI storyboard*.
  - Menghasilkan *use case diagram* dan deskripsi *use case*.
  - Menghasilkan *initial domain model*.
- **Output**:
  - `spec.md`.
  - Artefak *requirements* ICONIX.
- AI agent MUST mempertahankan identitas *use case* utama yang diberikan pengembang. Setiap *sub-use case* MUST memiliki identitas yang unik dan konsisten pada seluruh artefak pengembangan.

#### 2. Clarify — Specification Review
- **Command**: `/speckit-clarify`
- **Input**:
  - `spec.md`.
  - Artefak *requirements* ICONIX.
- **Activities**:
  - Mengidentifikasi kebutuhan yang belum jelas atau belum lengkap.
  - Mengajukan pertanyaan klarifikasi kepada pengembang.
  - Meninjau kesesuaian spesifikasi dengan kebutuhan dan *use case* awal.
  - Memperbarui spesifikasi dan artefak yang terdampak berdasarkan hasil klarifikasi.
- **Review Gate**:
  - Apabila terdapat ketidaksesuaian, revisi spesifikasi dan artefak terkait.
  - Apabila spesifikasi telah disetujui, lanjutkan ke *Plan*.
- **Output**:
  - Spesifikasi fitur yang telah diklarifikasi dan ditinjau.

#### 3. Plan — ICONIX Analysis & Design
- **Command**: `/speckit-plan`
- **Input**:
  - `spec.md` yang telah ditinjau.
  - Constitution.
  - Artefak *requirements* ICONIX.
  - Struktur aplikasi dan komponen yang telah tersedia.
- **Activities**:
  - **Analysis/Preliminary Design**:
    - Meninjau dan memperbarui *domain model*.
    - Menghasilkan *robustness diagram* berdasarkan deskripsi *use case*.
    - Mengidentifikasi tanggung jawab *boundary*, *control*, dan *entity*.
    - Melakukan *Preliminary Design Review* (PDR).
  - **Detailed Design**:
    - Menghasilkan *sequence diagram* berdasarkan *use case* dan *robustness analysis*.
    - Menghasilkan *static class model* dalam cakupan fitur.
    - Menentukan interaksi komponen, operasi kelas, dan rancangan teknis.
    - Melakukan *Critical Design Review* (CDR).
- **Review Gate**:
  - Ketidaksesuaian pada PDR MUST diperbaiki sebelum *Detailed Design*.
  - Ketidaksesuaian pada CDR MUST diperbaiki sebelum *Tasks*.
  - Rancangan MUST diperiksa terhadap Constitution.
  - Apabila perubahan desain memengaruhi kebutuhan, tinjau kembali `spec.md` dan artefak yang terdampak.
- **Output**:
  - `plan.md`.
  - Artefak *analysis* dan *detailed design* ICONIX.
  - Dokumen pendukung rancangan teknis sesuai kebutuhan fitur.

#### 4. Tasks — Implementation Breakdown
- **Command**: `/speckit-tasks`
- **Input**:
  - `spec.md`.
  - `plan.md`.
  - Artefak ICONIX yang telah ditinjau.
- **Activities**:
  - Menguraikan rancangan menjadi tugas implementasi yang terukur.
  - Mengelompokkan tugas berdasarkan *sub-use case*.
  - Menentukan urutan dan ketergantungan antartugas.
  - Mengidentifikasi komponen atau berkas yang akan dibuat atau diperbarui.
  - Menempatkan tugas penulisan pengujian sebelum implementasi fungsi yang berkaitan.
- **Output**:
  - `tasks.md`.
- Setiap tugas MUST memiliki identitas, deskripsi pekerjaan, dan hubungan dengan *sub-use case* apabila relevan. Tugas MUST cukup jelas agar dapat dilaksanakan tanpa menambahkan kebutuhan yang tidak tercantum dalam spesifikasi.

#### 5. Analyze — Cross-Artifact Consistency Review
- **Command**: `/speckit-analyze`
- **Input**:
  - Constitution.
  - `spec.md`.
  - `plan.md`.
  - `tasks.md`.
- **Activities**:
  - Memeriksa konsistensi kebutuhan, rancangan, dan tugas implementasi.
  - Mengidentifikasi kebutuhan yang belum terakomodasi dalam rancangan atau tugas.
  - Mengidentifikasi ketidaksesuaian istilah, duplikasi, dan ketergantungan yang belum ditangani.
  - Meninjau kesesuaian pembagian pekerjaan dengan *sub-use case* yang dikembangkan.
- **Review Gate**:
  - Temuan *Analyze* MUST dilaporkan sebelum implementasi.
  - *Analyze* MUST NOT mengubah artefak secara langsung.
  - Apabila terdapat temuan yang memengaruhi implementasi, lakukan revisi pada *Specify*, *Plan*, atau *Tasks* sesuai sumber permasalahan.
  - Jalankan kembali pemeriksaan setelah revisi dilakukan.
- **Output**:
  - Hasil pemeriksaan konsistensi.
  - Artefak pengembangan yang telah diperbarui apabila diperlukan.

#### 6. Implement — Implementation & Testing
- **Command**: `/speckit-implement`
- **Input**:
  - `spec.md`.
  - `plan.md`.
  - `tasks.md`.
  - Artefak ICONIX.
  - Hasil peninjauan *Analyze*.
- **Activities**:
  - Menyusun kode pengujian sesuai tugas dan skenario *use case*.
  - Menjalankan pengujian awal terhadap perilaku yang belum diimplementasikan.
  - Mengimplementasikan kode berdasarkan rancangan dan tugas.
  - Menjalankan *unit testing* dan *integration testing* yang relevan.
  - Memperbaiki implementasi apabila pengujian gagal.
  - Meninjau hasil perubahan kode.
  - Memperbarui status penyelesaian tugas berdasarkan hasil pelaksanaan.
- **Output**:
  - Kode implementasi fitur.
  - Kode dan hasil pengujian.
  - Status penyelesaian tugas.
  - Pembaruan artefak apabila terdapat perubahan yang telah disetujui.

### C. Feature Completion & Iteration
Satu siklus pengembangan dinyatakan selesai apabila:
- Seluruh pekerjaan dalam cakupan *use case* utama telah diselesaikan.
- Implementasi sesuai dengan spesifikasi dan rancangan yang telah ditinjau.
- Pengujian yang relevan telah dijalankan dan memenuhi skenario yang ditetapkan.
- Tidak terdapat ketidaksesuaian yang belum diselesaikan dan menghambat penggunaan fitur.
- Perubahan terhadap spesifikasi atau rancangan telah didokumentasikan.
- Pengembang telah meninjau hasil pengembangan.

Setelah suatu *use case* utama dinyatakan selesai, pengembangan dilanjutkan pada *use case* utama berikutnya melalui pengulangan tahapan *Specify*, *Clarify*, *Plan*, *Tasks*, *Analyze*, dan *Implement*.

AI agent MUST NOT memulai pengembangan *use case* berikutnya tanpa instruksi pengembang.

### D. Design & Code Compliance
- Seluruh pengembangan MUST mematuhi prinsip kesederhanaan dan efisiensi pada Principle 6.
- Seluruh implementasi antarmuka MUST mematuhi *design system* pada Principle 7.
- Seluruh pembentukan spesifikasi, analisis, dan desain MUST mematuhi Principle 8.
- Apabila diperlukan perubahan terhadap prinsip proyek, lakukan amandemen Constitution sesuai ketentuan Governance.

## Governance

- **Otoritas**: Dokumen Constitution ini merupakan hukum tertinggi dalam proyek Telaah dan mengungguli instruksi ad-hoc lainnya.
- **Prosedur Amandemen**: Constitution dapat diamandemen hanya melalui perintah `/speckit-constitution`. Setiap amandemen MUST mencantumkan alasan perubahan dan dicatat dalam changelog proyek.
- **Aturan Penomoran Versi**:
  - **MAJOR**: Perubahan mendasar atau penghapusan Core Principles.
  - **MINOR**: Penambahan prinsip baru (seperti Ponytail & Taste-Skill) atau pembaruan batasan arsitektur/operasional agent.
  - **PATCH**: Koreksi tipografi atau perbaikan kata minor.

**Version**: 1.4.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-11-15
