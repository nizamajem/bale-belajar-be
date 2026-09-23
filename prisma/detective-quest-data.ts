// Bank soal Quest Detectivia bertingkat: Pemula -> Dasar -> Menengah ->
// Mahir -> Expert. Dibaca oleh seedDetectiveQuestPath() di seed.ts.
//
// Setiap level = 1 Chapter berisi 6 Quest (satu per kompetensi DET-*),
// setiap Quest berisi 10 soal. Tipe soal sengaja dibatasi ke tipe yang
// dinilai otomatis dan sudah teruji di Flutter (lihat quest-evaluation.util.ts):
// SINGLE_CHOICE, BINARY_CHOICE, MULTIPLE_SELECT, ORDERING, TIMELINE_BUILDER,
// MATCHING. EVIDENCE_BOARD tidak dipakai karena payload Flutter
// ("evidenceId:kategori") belum cocok dengan evaluator backend.
//
// Flutter tidak menampilkan stimulusText, jadi seeder menggabungkan
// stimulus/caseText ke dalam questionText.

export type DetectiveSkillKey =
  | "DET-OBSERVASI"
  | "DET-MEMORI"
  | "DET-KRONOLOGI"
  | "DET-SUMBER"
  | "DET-PENALARAN"
  | "DET-ETIKA";

export type DetectiveQuestion =
  | { kind: "single"; text: string; correct: string; wrong: [string, string, string]; stimulus?: string }
  | { kind: "binary"; text: string; answer: boolean; stimulus?: string }
  | { kind: "multi"; text: string; correct: string[]; wrong: string[]; stimulus?: string }
  | { kind: "order"; text: string; steps: string[]; stimulus?: string }
  | { kind: "timeline"; text: string; events: Array<[string, string]>; stimulus?: string }
  | { kind: "match"; text: string; pairs: Array<[string, string]>; stimulus?: string };

export type DetectiveQuest = {
  code: string;
  skill: DetectiveSkillKey;
  title: string;
  story: string;
  objective: string;
  instruction: string;
  hints: string[];
  // Kasus bersama - ditempel di atas setiap soal yang tidak punya stimulus sendiri.
  caseText?: string;
  questions: DetectiveQuestion[];
};

export type DetectiveLevel = {
  level: number;
  chapterCode: string;
  chapterNumber: number;
  rank: string;
  title: string;
  story: string;
  goal: string;
  completionIndicator: string;
  chapterDifficulty: string;
  questionDifficulty: string;
  bloomLevel: string;
  measurementCategory: string;
  estimatedMinutes: number;
  xpRewardFirst: number;
  questionXp: number;
  secondsPerQuestion: number;
  quests: DetectiveQuest[];
};

const S = (
  text: string,
  correct: string,
  wrong: [string, string, string],
  stimulus?: string,
): DetectiveQuestion => ({ kind: "single", text, correct, wrong, stimulus });
const B = (text: string, answer: boolean, stimulus?: string): DetectiveQuestion => ({
  kind: "binary",
  text: `Benar atau salah? ${text}`,
  answer,
  stimulus,
});
const M = (text: string, correct: string[], wrong: string[], stimulus?: string): DetectiveQuestion => ({
  kind: "multi",
  text,
  correct,
  wrong,
  stimulus,
});
const O = (text: string, steps: string[], stimulus?: string): DetectiveQuestion => ({
  kind: "order",
  text,
  steps,
  stimulus,
});
const T = (text: string, events: Array<[string, string]>, stimulus?: string): DetectiveQuestion => ({
  kind: "timeline",
  text,
  events,
  stimulus,
});
const X = (text: string, pairs: Array<[string, string]>, stimulus?: string): DetectiveQuestion => ({
  kind: "match",
  text,
  pairs,
  stimulus,
});

// ---------------------------------------------------------------------------
// LEVEL 1 - PEMULA (Rekrut Detektif)
// ---------------------------------------------------------------------------

const level1: DetectiveLevel = {
  level: 1,
  chapterCode: "DET-CH-002",
  chapterNumber: 2,
  rank: "Pemula",
  title: "Rekrut Detektif",
  story:
    "Babe menyerahkan lencana rekrut. Sebelum boleh memegang kasus sungguhan, kamu harus menguasai enam dasar: melihat, mengingat, menyusun waktu, menilai sumber, berpikir logis, dan bersikap adil.",
  goal: "Mengenal istilah dan kebiasaan dasar detektif: fakta, dugaan, sumber, kronologi, hipotesis, dan etika bertanya.",
  completionIndicator: "Menyelesaikan 6 quest Rekrut dengan skor minimal 60.",
  chapterDifficulty: "BEGINNER",
  questionDifficulty: "EASY",
  bloomLevel: "UNDERSTAND",
  measurementCategory: "FOUNDATION",
  estimatedMinutes: 8,
  xpRewardFirst: 90,
  questionXp: 20,
  secondsPerQuestion: 60,
  quests: [
    {
      code: "DET-L1-OBS",
      skill: "DET-OBSERVASI",
      title: "Kamp Observasi: Mata Rekrut",
      story:
        "Hari pertama di Kamp Observasi. Babe menunjuk ruang kelas yang berantakan dan berkata: 'Jangan menebak dulu. Lihat, catat, baru berpikir.'",
      objective: "Membedakan hasil observasi dari tebakan dan tuduhan.",
      instruction: "Pilih jawaban yang hanya berisi hal yang benar-benar bisa dilihat atau dicek.",
      hints: [
        "Observasi = apa yang terlihat, terdengar, atau tercatat.",
        "Kata 'pasti' tanpa bukti biasanya tanda tebakan.",
      ],
      questions: [
        S("Manakah yang merupakan hasil observasi, bukan tebakan?", "Ada noda lumpur di lantai dekat pintu.", [
          "Seseorang pasti baru pulang dari sawah.",
          "Pelakunya orang yang ceroboh.",
          "Noda itu sengaja dibuat untuk mengecoh.",
        ]),
        S("Saat pertama masuk ke lokasi kejadian, langkah paling tepat adalah...", "Mengamati dan mencatat keadaan tanpa memindahkan barang", [
          "Merapikan barang yang berantakan",
          "Langsung menanyai orang yang dicurigai",
          "Memotret hanya barang yang terlihat menarik",
        ]),
        B("Mencatat jam saat kamu melakukan pengamatan membuat catatanmu lebih kuat.", true),
        S(
          "Detail mana yang paling membantu memperkirakan kapan meja terakhir dipakai?",
          "Teh di gelas masih hangat",
          ["Buku terbuka di halaman 45", "Pulpen tidak bertutup", "Warna gelas"],
          "Di meja guru ada gelas berisi teh yang masih hangat, buku terbuka di halaman 45, dan pulpen tanpa tutup.",
        ),
        S("Kalimat observasi yang baik adalah...", "Jendela kelas terbuka sekitar 20 cm.", [
          "Jendelanya kelihatan mencurigakan.",
          "Pasti ada yang masuk lewat jendela.",
          "Jendela itu jelek.",
        ]),
        M(
          "Pilih semua detail yang bisa diamati langsung.",
          ["Sepatu basah di rak", "Jam dinding menunjukkan 10.15", "Kertas sobek di tempat sampah"],
          ["Pemilik sepatu sedang gugup", "Seseorang ingin menyembunyikan sesuatu"],
        ),
        S("Mengapa detektif sebaiknya tidak memindahkan barang sebelum dicatat?", "Agar posisi asli barang tetap bisa menjadi bukti", [
          "Agar ruangan terlihat berantakan",
          "Karena barang itu tidak penting",
          "Agar tidak perlu membuat laporan",
        ]),
        S(
          "Bagian mana dari kalimat Rina yang merupakan observasi?",
          "Tasnya berat",
          ["Isinya buku", "Buku itu curian", "Tidak ada observasi sama sekali"],
          "Rina berkata: 'Tasnya berat sekali, pasti isinya buku curian.'",
        ),
        X("Pasangkan kalimat dengan jenisnya.", [
          ["Lampu kamar mandi menyala", "Observasi"],
          ["Mungkin ada orang di dalam", "Dugaan"],
          ["Dia pasti bolos pelajaran", "Tuduhan"],
          ["Siapa yang terakhir memakai kamar mandi?", "Pertanyaan penyelidikan"],
        ]),
        O("Urutkan langkah observasi yang benar.", [
          "Amati keseluruhan ruangan",
          "Catat detail penting beserta waktunya",
          "Foto atau gambar posisi barang",
          "Baru buat dugaan awal",
        ]),
      ],
    },
    {
      code: "DET-L1-MEM",
      skill: "DET-MEMORI",
      title: "Lorong Ingatan: Ingat Detail",
      story:
        "Di Lorong Ingatan, setiap pintu hanya terbuka jika kamu ingat detail yang diceritakan saksi. Ingatan detektif harus rapi, bukan asal cepat.",
      objective: "Mengolah dan mengingat detail keterangan secara akurat.",
      instruction: "Baca keterangan dengan teliti, lalu jawab berdasarkan isi keterangan.",
      hints: ["Baca ulang keterangan sebelum menjawab.", "Perhatikan kata kunci: warna, arah, jumlah, dan waktu."],
      questions: [
        S("Cara terbaik agar tidak lupa detail kasus adalah...", "Mencatat detail segera setelah melihatnya", [
          "Mengandalkan ingatan sampai besok",
          "Mencatat kesimpulannya saja",
          "Menunggu teman mengingatkan",
        ]),
        S(
          "Ke mana orang itu berjalan?",
          "Ke arah kantin",
          ["Ke arah perpustakaan", "Ke arah gerbang", "Ke arah lapangan"],
          "Saksi: 'Aku melihat orang bertopi biru membawa payung hijau, berjalan ke arah kantin sekitar pukul 09.40.'",
        ),
        S(
          "Barang apa yang berwarna hijau?",
          "Payung",
          ["Topi", "Tas", "Jaket"],
          "Saksi: 'Aku melihat orang bertopi biru membawa payung hijau, berjalan ke arah kantin sekitar pukul 09.40.'",
        ),
        B("Ingatan seseorang bisa berubah jika ia sering mendengar cerita versi orang lain.", true),
        S("Teknik 'mengelompokkan' membantu mengingat karena...", "Informasi disusun menjadi beberapa kelompok kecil yang mudah diingat", [
          "Informasi menjadi lebih banyak",
          "Detail kecil boleh dibuang semua",
          "Kita tidak perlu mencatat lagi",
        ]),
        M(
          "Pilih semua barang yang ada di daftar loker.",
          ["Senter", "Buku catatan merah", "Kabel charger"],
          ["Payung", "Kunci besar"],
          "Daftar barang di loker: senter, kunci kecil, buku catatan merah, botol minum, kabel charger.",
        ),
        S("Saksi yang baru melihat kejadian sebaiknya ditanya...", "Secepatnya, sebelum ingatannya bercampur dengan cerita orang lain", [
          "Seminggu kemudian",
          "Setelah ia berdiskusi dengan semua temannya",
          "Hanya jika ia mau menebak",
        ]),
        S(
          "Loker nomor berapa yang berisi jaket?",
          "17",
          ["12", "23", "21"],
          "Loker yang terbuka: nomor 12, 17, dan 23. Loker 17 berisi jaket, loker 12 kosong, loker 23 berisi sepatu.",
        ),
        X("Pasangkan strategi mengingat dengan contohnya.", [
          ["Mencatat", "Menulis ciri orang di buku saku"],
          ["Mengelompokkan", "Membagi bukti menjadi orang, tempat, dan waktu"],
          ["Mengulang", "Membaca ulang catatan sebelum wawancara"],
          ["Menggambar", "Membuat denah ruangan kejadian"],
        ]),
        O("Urutkan cara menyimpan keterangan saksi agar tidak hilang.", [
          "Dengarkan cerita saksi sampai selesai",
          "Catat poin penting dan waktunya",
          "Baca ulang catatan bersama saksi",
          "Simpan catatan di berkas kasus",
        ]),
      ],
    },
    {
      code: "DET-L1-KRO",
      skill: "DET-KRONOLOGI",
      title: "Kota Kronologi: Jam Pertama",
      story:
        "Di Kota Kronologi, semua jam berdetak berbeda. Tugasmu: menyusun kejadian dari yang paling awal sampai paling akhir agar kasus mulai masuk akal.",
      objective: "Menyusun urutan kejadian dan menentukan rentang waktu sederhana.",
      instruction: "Perhatikan jam dan kata penunjuk waktu seperti sebelum, sesudah, dan sampai.",
      hints: ["Urutkan dari jam paling kecil ke paling besar.", "Rentang waktu = dari kapan sampai kapan."],
      questions: [
        S("Kronologi adalah...", "Urutan kejadian dari awal sampai akhir", [
          "Daftar orang yang dicurigai",
          "Kumpulan foto bukti",
          "Pendapat saksi tentang pelaku",
        ]),
        T("Susun kejadian ini dari yang paling awal.", [
          ["06.45", "Penjaga membuka gerbang sekolah"],
          ["07.00", "Bel masuk berbunyi"],
          ["07.20", "Guru menemukan kaca jendela kelas retak"],
          ["07.35", "Kepala sekolah datang ke kelas"],
        ]),
        S(
          "Kapan kemungkinan sepeda itu diambil?",
          "Antara pukul 10.00 dan 10.30",
          ["Sebelum pukul 10.00", "Setelah pukul 11.00", "Tidak bisa diperkirakan sama sekali"],
          "Sepeda masih terlihat di parkiran pukul 10.00 dan sudah tidak ada pukul 10.30.",
        ),
        B("Pukul 13.15 terjadi sebelum pukul 13.05 pada hari yang sama.", false),
        S("Kata yang menunjukkan urutan waktu adalah...", "Sesudah", ["Mungkin", "Berwarna", "Mencurigakan"]),
        S(
          "Urutan kejadian yang benar menurut Dodi adalah...",
          "Istirahat, ke toilet, kembali ke kelas, bel masuk",
          [
            "Ke toilet, istirahat, bel masuk, kembali ke kelas",
            "Bel masuk, ke toilet, istirahat, kembali ke kelas",
            "Kembali ke kelas, ke toilet, istirahat, bel masuk",
          ],
          "Dodi: 'Aku ke toilet setelah istirahat dimulai, lalu kembali ke kelas sebelum bel masuk.'",
        ),
        M(
          "Pilih semua bukti yang membantu menentukan waktu kejadian.",
          ["Jam pada rekaman CCTV", "Catatan jam di buku tamu", "Waktu terkirimnya pesan chat"],
          ["Warna baju saksi", "Merek tas korban"],
        ),
        S("Rentang waktu kejadian disebut 'sempit' jika...", "Selisih waktu awal dan akhirnya kecil", [
          "Kejadiannya di ruangan kecil",
          "Saksinya sedikit",
          "Kejadiannya tidak penting",
        ]),
        X("Pasangkan istilah dengan artinya.", [
          ["Sebelum", "Terjadi lebih dulu"],
          ["Sesudah", "Terjadi belakangan"],
          ["Bersamaan", "Terjadi pada waktu yang sama"],
          ["Rentang waktu", "Jarak antara dua waktu"],
        ]),
        S(
          "Rentang waktu hilangnya buku yang paling tepat adalah...",
          "08.15 sampai 09.00",
          ["07.30 sampai 08.15", "09.00 sampai 10.00", "07.30 sampai 10.00"],
          "Buku dipinjam pukul 07.30, masih terlihat di meja pukul 08.15, dan dilaporkan hilang pukul 09.00.",
        ),
      ],
    },
    {
      code: "DET-L1-SUM",
      skill: "DET-SUMBER",
      title: "Perpustakaan Sumber: Kenali Sumber",
      story:
        "Pustakawan Perpustakaan Sumber memberi aturan pertama: 'Sebelum percaya sebuah kabar, tanyakan dulu: dari mana kabar itu datang?'",
      objective: "Mengenali jenis sumber informasi dan membedakan sumber kuat dari kabar berantai.",
      instruction: "Nilai setiap informasi dari asalnya, bukan dari seberapa ramai dibicarakan.",
      hints: ["Sumber kuat punya asal jelas dan bisa dicek.", "Kata 'katanya' menandakan kabar dari orang lain."],
      questions: [
        S("Sumber informasi adalah...", "Asal dari mana sebuah informasi didapat", [
          "Pelaku kejadian",
          "Tempat menyimpan barang bukti",
          "Kesimpulan akhir kasus",
        ]),
        S("Manakah sumber yang paling bisa dicek ulang?", "Buku daftar peminjaman perpustakaan", [
          "Cerita kakak kelas",
          "Pesan berantai di grup",
          "Perasaan penjaga sekolah",
        ]),
        B("Informasi yang dibagikan banyak orang di grup chat pasti benar.", false),
        S("'Saksi langsung' adalah orang yang...", "Melihat atau mendengar kejadian sendiri", [
          "Mendengar cerita dari teman",
          "Membaca berita tentang kejadian",
          "Menebak apa yang terjadi",
        ]),
        X("Pasangkan contoh dengan jenis sumbernya.", [
          ["Rekaman CCTV", "Sumber otomatis"],
          ["Orang yang melihat kejadian sendiri", "Saksi langsung"],
          ["'Kata temanku...'", "Kabar dari orang lain"],
          ["Buku catatan piket", "Dokumen tertulis"],
        ]),
        S(
          "Informasi yang diterima Tia termasuk...",
          "Kabar berantai yang perlu dicek ke sumber pertama",
          ["Bukti paling kuat", "Kesaksian langsung", "Dokumen resmi"],
          "Tia mendengar dari Beni, Beni mendengar dari Caca, bahwa ada yang mengambil bola di gudang.",
        ),
        M(
          "Pilih semua ciri sumber yang kuat.",
          ["Asalnya jelas", "Punya keterangan waktu", "Bisa dicek orang lain"],
          ["Paling ramai dibicarakan", "Diceritakan dengan penuh emosi"],
        ),
        S("Langkah pertama saat menerima kabar mengejutkan di grup chat adalah...", "Mencari tahu siapa yang pertama kali memberi informasi itu", [
          "Langsung meneruskannya ke grup lain",
          "Langsung menuduh orang yang disebut",
          "Menghapus pesan tanpa membacanya",
        ]),
        S("Mengapa catatan tertulis biasanya lebih kuat daripada ingatan?", "Catatan tidak berubah walaupun waktu berlalu", [
          "Catatan selalu ditulis orang jujur",
          "Ingatan manusia tidak pernah benar",
          "Catatan selalu lebih panjang",
        ]),
        O("Urutkan sumber dari yang PALING KUAT sampai yang paling lemah.", [
          "Rekaman CCTV yang ada tanggal dan jamnya",
          "Keterangan orang yang melihat langsung",
          "Cerita teman dari orang yang melihat",
          "Rumor tanpa nama di grup",
        ]),
      ],
    },
    {
      code: "DET-L1-NAL",
      skill: "DET-PENALARAN",
      title: "Jembatan Logika: Langkah Pertama",
      story:
        "Jembatan Logika hanya bisa dilewati detektif yang tidak melompat ke kesimpulan. Setiap papan jembatan adalah satu langkah berpikir.",
      objective: "Mengenal hipotesis dan menarik kesimpulan yang tidak melebihi bukti.",
      instruction: "Pilih kesimpulan yang paling didukung informasi, bukan yang paling seru.",
      hints: ["Hipotesis = dugaan yang masih harus diuji.", "Cari penjelasan sederhana yang cocok dengan bukti."],
      questions: [
        S("Hipotesis adalah...", "Dugaan sementara yang masih harus diuji dengan bukti", [
          "Kesimpulan yang sudah pasti benar",
          "Nama pelaku",
          "Barang bukti",
        ]),
        S(
          "Hipotesis yang paling masuk akal adalah...",
          "Kucing mungkin memakan kue, tetapi perlu dicek lagi",
          ["Adik pasti mencuri kue", "Kue tidak pernah ada", "Tetangga masuk ke rumah"],
          "Kue di meja hilang. Ada remah kue di dekat kandang kucing, dan pintu kandang terbuka.",
        ),
        B("Satu bukti kecil saja sudah cukup untuk memastikan siapa pelakunya.", false),
        S("Semua lampu di rumah padam saat badai. Penyebab paling sederhana yang perlu dicek dulu adalah...", "Listrik padam karena badai", [
          "Ada yang sengaja mematikan semua lampu",
          "Semua bohlam dicuri",
          "Semua lampu rusak bersamaan tanpa sebab",
        ]),
        S("'Tanahnya basah, jadi pasti tadi hujan.' Apa kelemahan kesimpulan ini?", "Ada penyebab lain tanah basah, misalnya disiram", [
          "Tidak ada kelemahan",
          "Harus menyebut jam hujan",
          "Harus menyebut nama orang",
        ]),
        M(
          "Pilih semua sikap yang menunjukkan berpikir logis.",
          ["Mencari lebih dari satu kemungkinan", "Menguji dugaan dengan bukti", "Mau mengubah dugaan jika muncul bukti baru"],
          ["Bertahan pada tebakan pertama apa pun buktinya", "Memilih jawaban yang paling seru"],
        ),
        S(
          "Kesimpulan yang tepat adalah...",
          "Arif belum tentu anggota klub robot",
          ["Arif pasti anggota klub robot", "Arif pasti bukan anggota klub robot", "Semua orang berkaos kuning anggota klub robot"],
          "Semua anggota klub robot memakai kaos kuning hari ini. Arif memakai kaos kuning.",
        ),
        S("Bukti yang mendukung hipotesis 'jendela dibuka paksa dari luar' adalah...", "Ada bekas congkelan di sisi luar kusen", [
          "Jendela berwarna putih",
          "Ruangan terasa dingin",
          "Ada buku di dekat jendela",
        ]),
        X("Pasangkan istilah dengan artinya.", [
          ["Fakta", "Bisa diperiksa kebenarannya"],
          ["Hipotesis", "Dugaan yang perlu diuji"],
          ["Bukti", "Hal yang mendukung atau melemahkan dugaan"],
          ["Kesimpulan", "Keputusan setelah menimbang bukti"],
        ]),
        O("Urutkan cara berpikir detektif.", [
          "Kumpulkan fakta",
          "Buat beberapa hipotesis",
          "Uji hipotesis dengan bukti",
          "Tarik kesimpulan sementara",
        ]),
      ],
    },
    {
      code: "DET-L1-ETI",
      skill: "DET-ETIKA",
      title: "Ruang Wawancara: Sopan dan Adil",
      story:
        "Ruang Wawancara punya satu aturan emas: detektif yang baik membuat saksi merasa aman, bukan takut. Kebenaran lebih mudah keluar dari suasana yang tenang.",
      objective: "Menerapkan sikap sopan, adil, dan tidak menuduh saat bertanya.",
      instruction: "Pilih sikap atau pertanyaan yang paling adil dan tidak menggiring.",
      hints: ["Pertanyaan yang baik tidak menyebut jawaban yang kita harapkan.", "Tidak ada tuduhan sebelum bukti cukup."],
      questions: [
        S("Sikap detektif saat bertanya kepada saksi sebaiknya...", "Sopan, tenang, dan tidak memaksa", [
          "Membentak agar cepat mengaku",
          "Menakut-nakuti saksi",
          "Mengancam akan melapor",
        ]),
        S("Pertanyaan pembuka yang paling baik adalah...", "Boleh ceritakan apa yang kamu lihat tadi?", [
          "Kamu yang melakukannya, kan?",
          "Kenapa kamu bohong?",
          "Siapa temanmu yang nakal?",
        ]),
        B("Detektif boleh menyebarkan nama orang yang dicurigai ke grup kelas sebelum ada bukti.", false),
        S("Mengapa kita tidak boleh menuduh tanpa bukti?", "Bisa merugikan orang yang tidak bersalah", [
          "Karena kasus jadi terlalu cepat selesai",
          "Karena detektif tidak boleh bicara",
          "Karena bukti tidak penting",
        ]),
        M(
          "Pilih semua informasi yang perlu dijaga kerahasiaannya selama penyelidikan.",
          ["Nama saksi yang memberi keterangan", "Nama orang yang sedang diperiksa", "Isi catatan penyelidikan"],
          ["Jadwal pelajaran umum sekolah", "Nama sekolah"],
        ),
        S(
          "Respons terbaik detektif adalah...",
          "Menjelaskan bahwa keterangannya dijaga dan hanya dipakai untuk penyelidikan",
          ["Memintanya bercerita di depan kelas", "Mengabaikan rasa takutnya", "Menulis namanya di pengumuman"],
          "Saksi terlihat takut dan berkata, 'Aku tidak mau ada yang tahu aku cerita.'",
        ),
        S("Pertanyaan 'Kamu melihat Joko mengambilnya, kan?' disebut pertanyaan...", "Menggiring", [
          "Netral",
          "Terbuka",
          "Pembuka",
        ]),
        S("Jika saksi menjawab 'aku tidak tahu', detektif sebaiknya...", "Menerima jawaban itu dan tidak memaksa saksi menebak", [
          "Memaksanya menyebut satu nama",
          "Menganggapnya berbohong",
          "Mengulang pertanyaan sambil marah",
        ]),
        X("Pasangkan jenis pertanyaan dengan contohnya.", [
          ["Pertanyaan terbuka", "Apa yang terjadi setelah itu?"],
          ["Pertanyaan tertutup", "Apakah pintunya terkunci?"],
          ["Pertanyaan menggiring", "Pasti dia pelakunya, kan?"],
          ["Pertanyaan klarifikasi", "Maksudmu 'tadi' itu sekitar jam berapa?"],
        ]),
        O("Urutkan langkah wawancara yang baik.", [
          "Perkenalkan diri dan jelaskan tujuan",
          "Minta saksi bercerita dengan bebas",
          "Ajukan pertanyaan lanjutan yang netral",
          "Baca ulang catatan dan ucapkan terima kasih",
        ]),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// LEVEL 2 - DASAR (Detektif Junior)
// ---------------------------------------------------------------------------

const level2: DetectiveLevel = {
  level: 2,
  chapterCode: "DET-CH-003",
  chapterNumber: 3,
  rank: "Dasar",
  title: "Detektif Junior",
  story:
    "Lencana rekrutmu berganti menjadi lencana Junior. Kasus mulai datang dalam bentuk cerita pendek: kursi yang berpindah, alibi yang bolong, dan kabar yang belum tentu benar.",
  goal: "Menerapkan dasar detektif pada kasus pendek: perubahan lokasi, alibi, kekuatan bukti, motif, dan pertanyaan netral.",
  completionIndicator: "Menyelesaikan 6 quest Junior dengan skor minimal 60.",
  chapterDifficulty: "ELEMENTARY",
  questionDifficulty: "MEDIUM",
  bloomLevel: "APPLY",
  measurementCategory: "CORE",
  estimatedMinutes: 10,
  xpRewardFirst: 110,
  questionXp: 25,
  secondsPerQuestion: 75,
  quests: [
    {
      code: "DET-L2-OBS",
      skill: "DET-OBSERVASI",
      title: "Kamp Observasi: Detail yang Berubah",
      story:
        "Babe membawa dua foto ruangan: pagi dan sore. 'Detektif hebat bukan yang melihat paling banyak, tetapi yang melihat apa yang berubah.'",
      objective: "Menemukan perubahan dan anomali dengan membandingkan keadaan sebelum dan sesudah.",
      instruction: "Bandingkan keadaan, lalu pilih kesimpulan yang tidak melebihi apa yang terlihat.",
      hints: ["Cari yang berbeda dari biasanya.", "Perubahan belum tentu kejahatan; cari tahu alasannya."],
      questions: [
        S(
          "Perubahan apa yang terlihat?",
          "Satu kursi berpindah dari meja rapat ke dekat jendela",
          ["Satu kursi hilang dari ruangan", "Meja rapat diganti", "Ada kursi baru di ruangan"],
          "Foto pagi: 5 kursi mengelilingi meja rapat. Foto sore: 4 kursi di meja rapat dan 1 kursi di dekat jendela.",
        ),
        S(
          "Kesimpulan paling aman dari observasi ini adalah...",
          "Ada orang yang berjalan menuju gudang antara 11.00 dan 11.20",
          ["Petugas kebersihan pelakunya", "Gudang sudah dibobol", "Jejak itu pasti dari sepatu siswa kelas 7"],
          "Petugas selesai mengepel lorong pukul 11.00. Pukul 11.20 ada jejak sepatu berlumpur di atas lantai itu, mengarah ke gudang.",
        ),
        S("Membandingkan keadaan 'sebelum' dan 'sesudah' berguna untuk...", "Menemukan apa yang berubah di lokasi", [
          "Menentukan pelaku secara langsung",
          "Mengganti bukti yang rusak",
          "Mempercepat membuat tuduhan",
        ]),
        B(
          "Detail ini cukup untuk membuat dugaan awal bahwa tanaman belum disiram sejak Senin.",
          true,
          "Tanaman di meja layu, tanahnya kering, dan jadwal siram menulis 'Senin'. Hari ini Kamis.",
        ),
        M(
          "Pilih semua hal yang merupakan observasi langsung.",
          ["Kotak P3K terbuka", "Plester tinggal 2", "Ada catatan pemakaian pukul 08.15"],
          ["Nia terluka parah", "Seseorang mencuri plester"],
          "Di ruang UKS: kotak P3K terbuka, plester tinggal 2, dan buku UKS berisi tulisan 'Plester dipakai 3, pukul 08.15 - Nia'.",
        ),
        S(
          "Detail mana yang paling bisa membantu mengenali pemakai gelas?",
          "Bekas lipstik di gelas A",
          ["Gelas B kosong", "Jumlah gelas ada dua", "Meja berwarna cokelat"],
          "Ada dua gelas di meja: gelas A ada bekas lipstik merah muda, gelas B kosong dan bersih.",
        ),
        S("Anomali dalam observasi adalah...", "Detail yang tidak sesuai dengan keadaan biasanya", [
          "Detail yang selalu ada setiap hari",
          "Barang yang paling mahal",
          "Ruangan yang paling luas",
        ]),
        S(
          "Mengapa detail gembok itu penting?",
          "Karena berbeda dari kebiasaan dan perlu dicari tahu alasannya",
          ["Karena warna hitam tanda kejahatan", "Karena gembok kuning lebih mahal", "Karena tidak penting sama sekali"],
          "Setiap hari pintu gudang dikunci dengan gembok kuning. Hari ini gemboknya berwarna hitam.",
        ),
        X("Pasangkan bukti dengan kelompoknya.", [
          ["Sidik jari di gelas", "Barang / benda"],
          ["Pintu belakang yang terbuka", "Lokasi"],
          ["Surat izin keluar", "Dokumen"],
          ["Satpam di pos jaga", "Orang"],
        ]),
        O("Urutkan cara memeriksa ruangan secara teliti.", [
          "Berdiri di pintu dan amati seluruh ruangan",
          "Periksa dari satu sisi searah jarum jam",
          "Tandai dan catat setiap detail penting",
          "Bandingkan dengan foto atau keadaan sebelumnya",
        ]),
      ],
    },
    {
      code: "DET-L2-MEM",
      skill: "DET-MEMORI",
      title: "Lorong Ingatan: Saksi dan Detail",
      story:
        "Satpam sekolah memberi keterangan panjang tentang mobil yang parkir di gerbang samping. Babe menantangmu: 'Detail mana yang benar-benar penting untuk diingat?'",
      objective: "Mengingat detail keterangan dan memahami apa yang bisa membuat ingatan saksi berubah.",
      instruction: "Jawab berdasarkan keterangan yang diberikan, bukan tebakanmu.",
      hints: ["Detail paling unik biasanya paling berguna.", "Ingatan bisa terpengaruh obrolan orang lain."],
      questions: [
        S(
          "Berapa lama mobil itu parkir?",
          "Sekitar 15 menit",
          ["Sekitar 27 menit", "Sekitar 5 menit", "Satu jam"],
          "Satpam: 'Mobil pikap putih, bak terbuka, plat nomor berakhiran 27, parkir di gerbang samping sekitar 15 menit.'",
        ),
        S(
          "Detail mana yang paling membantu mencari mobil itu nanti?",
          "Plat nomor berakhiran 27",
          ["Mobil berwarna putih", "Baknya terbuka", "Parkir di gerbang samping"],
          "Satpam: 'Mobil pikap putih, bak terbuka, plat nomor berakhiran 27, parkir di gerbang samping sekitar 15 menit.'",
        ),
        B("Jika saksi lupa satu detail, seluruh ceritanya pasti salah.", false),
        S("Ingatan saksi paling mudah terganggu jika...", "Ia sering mendengar versi cerita orang lain", [
          "Ia langsung mencatat kejadian",
          "Ia ditanya dengan pertanyaan netral",
          "Ia diberi waktu untuk mengingat",
        ]),
        S(
          "Apa yang paling mungkin terjadi pada ingatan Lala?",
          "Ingatannya terpengaruh obrolan teman-temannya",
          ["Lala pasti berbohong sejak awal", "Jaketnya memang berganti warna", "Keterangan hari ketiga lebih bisa dipercaya karena lebih baru"],
          "Hari pertama, Lala bilang melihat 'jaket biru'. Hari ketiga, setelah banyak teman membicarakan 'jaket hitam', Lala bilang 'mungkin jaketnya hitam'.",
        ),
        M(
          "Pilih semua cara yang membantu saksi mengingat lebih akurat.",
          ["Meminta saksi membayangkan kembali tempat kejadian", "Memberi waktu tanpa terburu-buru", "Bertanya dengan kalimat netral"],
          ["Memberi tahu jawaban yang kita harapkan", "Menunjukkan foto satu orang saja"],
        ),
        S(
          "Jika polanya sama, kapan nomor A15 kemungkinan dipanggil?",
          "09.18",
          ["09.15", "09.20", "09.24"],
          "Nomor antrean A12 dipanggil pukul 09.00, A13 pukul 09.06, dan A14 pukul 09.12.",
        ),
        S("Catatan wawancara yang baik menulis kata-kata saksi...", "Apa adanya, tanpa diubah detektif", [
          "Diubah agar lebih rapi dan meyakinkan",
          "Hanya bagian yang cocok dengan dugaan",
          "Dalam bentuk kesimpulan saja",
        ]),
        X(
          "Pasangkan setiap orang dengan cirinya sesuai keterangan saksi.",
          [
            ["Orang pertama", "Topi merah"],
            ["Orang kedua", "Membawa gitar"],
            ["Orang ketiga", "Berkacamata"],
            ["Orang keempat", "Sepatu bot"],
          ],
          "Saksi: 'Orang pertama bertopi merah, orang kedua membawa gitar, orang ketiga berkacamata, dan orang keempat memakai sepatu bot.'",
        ),
        O(
          "Urutkan tindakan orang itu sesuai cerita saksi.",
          ["Keluar dari lab", "Menutup pintu", "Berjalan ke tangga", "Menelepon seseorang"],
          "Saksi: 'Aku melihat dia keluar dari lab, lalu menutup pintu, lalu berjalan ke tangga, lalu menelepon seseorang.'",
        ),
      ],
    },
    {
      code: "DET-L2-KRO",
      skill: "DET-KRONOLOGI",
      title: "Kota Kronologi: Alibi Pertama",
      story:
        "Kotak amal OSIS ditemukan terbuka. Tiga orang punya cerita tentang di mana mereka berada. Saatnya belajar memeriksa alibi dengan jam.",
      objective: "Menentukan rentang waktu kejadian dan menilai apakah alibi mencakup waktu itu.",
      instruction: "Bandingkan jam kejadian dengan jam alibi. Perhatikan bagian yang tidak tertutup.",
      hints: ["Alibi harus mencakup SELURUH rentang kejadian.", "Samakan jam semua sumber sebelum membandingkan."],
      questions: [
        T("Susun kejadian Kasus Kotak Amal dari yang paling awal.", [
          ["07.30", "Kotak amal diletakkan di meja depan"],
          ["09.45", "Bendahara OSIS mengecek kotak masih terkunci"],
          ["10.10", "Istirahat pertama dimulai"],
          ["10.35", "Kotak amal ditemukan terbuka"],
        ]),
        S(
          "Rentang waktu PALING SEMPIT yang perlu diselidiki adalah...",
          "09.45 sampai 10.35",
          ["07.30 sampai 09.45", "10.35 sampai 12.00", "07.30 sampai 10.35"],
          "Kotak amal diletakkan pukul 07.30, masih terkunci saat dicek pukul 09.45, dan ditemukan terbuka pukul 10.35.",
        ),
        S("Alibi yang kuat adalah alibi yang...", "Didukung bukti yang bisa dicek, seperti catatan atau saksi lain", [
          "Diucapkan dengan sangat yakin",
          "Diceritakan berulang kali",
          "Hanya didukung kata-kata orang itu sendiri",
        ]),
        B(
          "Alibi Andi mencakup seluruh rentang waktu kejadian.",
          true,
          "Kejadian terjadi pukul 10.00-10.20. Andi tercatat hadir di lomba cerdas cermat di sekolah lain pukul 09.30-11.00.",
        ),
        S(
          "Apa masalah alibi Beni?",
          "Alibinya tidak mencakup pukul 10.00-10.15",
          ["Tidak ada masalah sama sekali", "Perpustakaan terlalu jauh", "Beni terlalu lama di perpustakaan"],
          "Kejadian terjadi pukul 10.00-10.20. Beni berkata ia di perpustakaan pukul 10.15-10.40.",
        ),
        S(
          "Siapa yang alibinya didukung bukti tertulis selama SELURUH waktu kejadian?",
          "Citra",
          ["Dimas", "Eka", "Tidak ada"],
          "Kejadian pukul 12.00-12.15. Citra di UKS 11.50-12.30 (catatan UKS). Dimas di kantin 12.10-12.20 (struk kantin). Eka di kelas 12.00-12.15 (kata Eka sendiri).",
        ),
        M(
          "Pilih semua informasi yang dibutuhkan untuk memeriksa sebuah alibi.",
          ["Di mana orang itu berada", "Jam berapa ia berada di sana", "Siapa atau apa yang bisa membuktikannya"],
          ["Warna favoritnya", "Nilai rapornya"],
        ),
        S("Jam kamera ternyata 10 menit lebih cepat dari jam asli. Foto bertuliskan 14.30. Jam aslinya adalah...", "14.20", [
          "14.40",
          "14.30",
          "14.10",
        ]),
        X("Pasangkan istilah dengan artinya.", [
          ["Timeline", "Urutan kejadian berdasarkan waktu"],
          ["Alibi", "Bukti berada di tempat lain saat kejadian"],
          ["Jangkar waktu", "Waktu pasti dari sumber kuat seperti bel atau log"],
          ["Celah waktu", "Bagian waktu yang belum ada informasinya"],
        ]),
        S(
          "Waktu 08.00-08.40 dalam kasus ini disebut...",
          "Celah waktu yang perlu dicari informasinya",
          ["Bukti bahwa tidak ada yang terjadi", "Alibi", "Kesimpulan akhir"],
          "Pukul 08.00 pintu dikunci (log pintu). Pukul 08.40 pintu ditemukan terbuka (foto). Tidak ada data apa pun di antara kedua waktu itu.",
        ),
      ],
    },
    {
      code: "DET-L2-SUM",
      skill: "DET-SUMBER",
      title: "Perpustakaan Sumber: Bukti Kuat, Bukti Lemah",
      story:
        "Proyektor kelas rusak dan tiga kabar beredar sekaligus. Pustakawan memberimu timbangan: 'Timbang setiap kabar dari sumbernya.'",
      objective: "Membandingkan kekuatan beberapa sumber dan memilih yang paling layak dipercaya.",
      instruction: "Tanyakan: siapa sumbernya, kapan dibuat, dan bisakah dicek?",
      hints: ["Catatan petugas biasanya lebih kuat dari pendapat.", "Dua sumber menguatkan hanya jika asalnya berbeda."],
      questions: [
        S(
          "Sumber mana yang paling kuat?",
          "Catatan teknisi",
          ["Pendapat Rudi", "Pesan di grup kelas", "Ketiganya sama kuat"],
          "Tiga informasi tentang proyektor rusak: (1) catatan teknisi 'kabel putus, 09.10', (2) Rudi bilang 'kayaknya tadi disenggol', (3) grup kelas: 'katanya dirusak anak kelas sebelah'.",
        ),
        S(
          "Informasi mana yang paling lemah?",
          "Pesan grup kelas yang diawali 'katanya'",
          ["Catatan teknisi", "Pendapat Rudi", "Semua sama lemahnya"],
          "Tiga informasi tentang proyektor rusak: (1) catatan teknisi 'kabel putus, 09.10', (2) Rudi bilang 'kayaknya tadi disenggol', (3) grup kelas: 'katanya dirusak anak kelas sebelah'.",
        ),
        B("Foto tanpa keterangan waktu dan tempat lebih kuat daripada foto yang ada keterangan waktu dan tempatnya.", false),
        S("Dua sumber disebut 'saling menguatkan' jika...", "Asalnya berbeda dan isinya cocok", [
          "Keduanya dikirim orang yang sama",
          "Keduanya diucapkan dengan keras",
          "Salah satunya menyalin yang lain",
        ]),
        S(
          "Sikap terbaik adalah...",
          "Lebih mempercayai pengumuman resmi, sambil tetap bisa mengecek ke pengelola kantin",
          ["Percaya akun viral karena lebih banyak pembacanya", "Menyebarkan kedua info tanpa dicek", "Menganggap keduanya bohong"],
          "Akun 'InfoSekolahViral' menyebut kantin tutup karena ada tikus. Pengumuman resmi di papan sekolah menyebut kantin tutup karena renovasi dapur.",
        ),
        M(
          "Pilih semua pertanyaan yang tepat untuk menilai sebuah sumber.",
          ["Siapa yang membuatnya?", "Kapan dibuat?", "Apakah bisa dicek dari sumber lain?"],
          ["Apakah judulnya menarik?", "Berapa banyak emoji di dalamnya?"],
        ),
        S("Kesaksian menjadi lebih lemah jika saksi...", "Berada jauh dan penerangan gelap saat kejadian", [
          "Melihat dari jarak dekat",
          "Langsung mencatat apa yang dilihat",
          "Tidak mengenal orang-orang yang terlibat",
        ]),
        S("Bukti 'tidak langsung' adalah bukti yang...", "Tidak menunjukkan kejadiannya secara langsung, tetapi memberi petunjuk", [
          "Pasti palsu",
          "Tidak boleh dipakai sama sekali",
          "Selalu lebih kuat dari bukti langsung",
        ]),
        X("Pasangkan bukti dengan tingkat kekuatannya.", [
          ["Log akses pintu", "Kuat: otomatis dan bertanggal"],
          ["Penjaga yang melihat langsung", "Sedang: langsung, tetapi bisa keliru"],
          ["'Katanya si A lihat...'", "Lemah: kabar dari orang lain"],
          ["Tebakan di kolom komentar", "Sangat lemah: tanpa dasar"],
        ]),
        O("Urutkan langkah memeriksa kabar yang kamu terima.", [
          "Baca isi kabar dengan teliti",
          "Cari sumber pertamanya",
          "Bandingkan dengan sumber lain yang terpercaya",
          "Putuskan apakah kabar itu layak dipercaya",
        ]),
      ],
    },
    {
      code: "DET-L2-NAL",
      skill: "DET-PENALARAN",
      title: "Jembatan Logika: Motif dan Kesempatan",
      story:
        "Poster lomba kelas 8A sobek dan semua mata tertuju pada siswa yang pernah kalah dari 8A. Babe menggeleng: 'Punya alasan belum tentu punya kesempatan.'",
      objective: "Membedakan motif, kesempatan, dan bukti tindakan.",
      instruction: "Periksa apakah kesimpulan benar-benar mengikuti informasi yang ada.",
      hints: ["Motif tanpa kesempatan belum cukup.", "'Semua A adalah B' tidak berarti 'semua B adalah A'."],
      questions: [
        S("Motif adalah...", "Alasan yang mungkin mendorong seseorang melakukan sesuatu", [
          "Bukti bahwa seseorang pasti bersalah",
          "Waktu kejadian",
          "Tempat kejadian",
        ]),
        S("Kesempatan berarti seseorang...", "Berada di tempat dan waktu yang memungkinkan ia melakukannya", [
          "Pasti melakukan perbuatan itu",
          "Punya alasan yang kuat",
          "Punya banyak teman",
        ]),
        B("Jika seseorang punya motif, berarti ia pasti pelakunya.", false),
        S(
          "Kesimpulan yang tepat tentang Galih adalah...",
          "Galih punya motif, tetapi tidak punya kesempatan",
          ["Galih pasti pelakunya", "Galih punya kesempatan, tetapi tidak punya motif", "Galih punya motif dan kesempatan"],
          "Poster 8A sobek antara pukul 10.00-10.20. Galih dari 8B pernah kalah lomba dari 8A, tetapi CCTV menunjukkan Galih berada di lapangan sepanjang 10.00-10.20.",
        ),
        S(
          "Informasi ini paling membantu untuk menentukan...",
          "Siapa saja yang punya kesempatan masuk ruang guru",
          ["Siapa yang punya motif", "Siapa pelakunya dengan pasti", "Kapan kue itu dibuat"],
          "Kue ulang tahun di kulkas ruang guru hilang. Hanya tiga orang yang memegang kunci ruang guru: Bu Ani, Pak Budi, dan petugas kebersihan.",
        ),
        M(
          "Pilih semua hal yang dibutuhkan sebelum menyimpulkan seseorang terlibat.",
          ["Bukti tindakan, bukan hanya motif", "Kesempatan yang cocok dengan waktu kejadian", "Kemungkinan lain sudah diperiksa"],
          ["Ia terlihat gugup", "Banyak orang tidak menyukainya"],
        ),
        S(
          "Kesimpulan yang tepat adalah...",
          "Belum pasti Nadia lolos seleksi",
          ["Nadia pasti lolos seleksi", "Nadia pasti tidak lolos seleksi", "Semua yang mengisi formulir pasti lolos"],
          "Semua siswa yang lolos seleksi tim sudah mengisi formulir. Nadia sudah mengisi formulir.",
        ),
        S(
          "Kesimpulan yang PALING tepat adalah...",
          "Mungkin karena hujan deras, tetapi bisa juga ada penyebab lain seperti pipa bocor",
          ["Pasti tadi hujan deras", "Tidak mungkin tadi hujan", "Pipa pasti bocor"],
          "Setiap kali hujan deras, halaman sekolah tergenang. Hari ini halaman sekolah tergenang.",
        ),
        X("Pasangkan istilah dengan contohnya.", [
          ["Motif", "Ingin menang lomba"],
          ["Kesempatan", "Sendirian di ruangan saat kejadian"],
          ["Bukti tindakan", "Sidik jarinya ada di kotak yang dibuka"],
          ["Alibi", "Tercatat hadir di tempat lain saat kejadian"],
        ]),
        O("Urutkan cara menguji dugaan terhadap seseorang.", [
          "Tulis dugaan dengan jelas",
          "Periksa apakah ia punya kesempatan",
          "Cari bukti tindakan yang mendukung atau membantah",
          "Tulis kesimpulan beserta batas kepastiannya",
        ]),
      ],
    },
    {
      code: "DET-L2-ETI",
      skill: "DET-ETIKA",
      title: "Ruang Wawancara: Pertanyaan Netral",
      story:
        "Seorang saksi melihat orang berlari ke parkiran. Satu pertanyaan yang salah bisa membuat saksi 'mengingat' hal yang tidak pernah ia lihat.",
      objective: "Menyusun pertanyaan netral dan mencatat keterangan dengan jujur.",
      instruction: "Pilih pertanyaan atau tindakan yang tidak menggiring dan tidak menekan.",
      hints: ["Jangan sebut nama terduga di dalam pertanyaan.", "Catat keraguan saksi apa adanya."],
      questions: [
        S("Mana pertanyaan yang paling netral?", "Siapa saja yang kamu lihat di dekat loker?", [
          "Kamu lihat Fajar di dekat loker, kan?",
          "Fajar kelihatan mencurigakan, ya?",
          "Kenapa kamu melindungi Fajar?",
        ]),
        S(
          "Pertanyaan lanjutan terbaik adalah...",
          "Seperti apa ciri-ciri orang yang kamu lihat?",
          ["Itu pasti Hendra, kan?", "Kenapa kamu tidak mengejarnya?", "Kamu yakin tidak salah lihat? Jangan bohong, ya."],
          "Saksi: 'Aku lihat ada orang lari ke arah parkiran.'",
        ),
        B("Memberi tahu saksi siapa yang kita curigai sebelum ia bercerita bisa mempengaruhi jawabannya.", true),
        S("Saat mewawancarai dua saksi, sebaiknya mereka...", "Ditanya secara terpisah", [
          "Ditanya bersamaan agar cepat",
          "Boleh saling mendengar jawaban",
          "Diminta menyamakan cerita dulu",
        ]),
        M(
          "Pilih semua contoh pertanyaan terbuka.",
          ["Apa yang kamu dengar saat itu?", "Bagaimana posisi barang ketika kamu masuk?", "Ceritakan apa yang terjadi setelah bel."],
          ["Apakah pintunya terbuka?", "Kamu datang jam 7, kan?"],
        ),
        S(
          "Cara mencatat yang paling tepat adalah...",
          "Saksi mengira orangnya tinggi, tetapi tidak yakin",
          ["Pelaku bertubuh tinggi", "Keterangan saksi tidak berguna", "Tidak perlu dicatat"],
          "Saksi menjawab: 'Sepertinya orangnya tinggi... tapi aku tidak yakin.'",
        ),
        S("Hak orang yang dicurigai dalam penyelidikan di sekolah adalah...", "Didengar penjelasannya sebelum ada keputusan", [
          "Langsung dihukum",
          "Namanya diumumkan ke semua kelas",
          "Tidak boleh berbicara",
        ]),
        S("Jika hasil penyelidikan belum pasti, laporan kepada guru sebaiknya berisi...", "Apa yang sudah diketahui, apa yang belum, dan saran langkah berikutnya", [
          "Nama orang yang paling mungkin saja",
          "Pernyataan bahwa kasus sudah selesai",
          "Pendapat pribadi tentang siswa yang tidak disukai",
        ]),
        X("Pasangkan jenis pertanyaan dengan contohnya.", [
          ["Menggiring", "Kamu lihat dia membawa tas merah, kan?"],
          ["Netral", "Apa yang dibawa orang itu?"],
          ["Menekan", "Jawab sekarang atau kamu ikut dihukum!"],
          ["Klarifikasi", "Yang kamu maksud 'di sana' itu dekat tangga?"],
        ]),
        O("Urutkan sikap detektif saat saksi mulai bercerita.", [
          "Dengarkan tanpa memotong",
          "Catat kata-kata penting saksi",
          "Tanyakan bagian yang belum jelas",
          "Ringkas ulang dan minta saksi mengoreksi",
        ]),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// LEVEL 3 - MENENGAH (Penyelidik)
// ---------------------------------------------------------------------------

const artRoomCase =
  "Kasus Ruang Seni: Ruang seni dikunci pukul 15.00. Esok paginya pukul 07.00 ditemukan: jendela terbuka, satu kaleng cat biru tumpah di lantai, jejak kaki biru berukuran kecil menuju jendela, lukisan juara hilang, dan kaleng cat lain masih tertutup rapat di rak.";

const laptopCase =
  "Kasus Laptop Klub Jurnalistik: 13.05 laptop dipakai rapat (notulen). 13.50 rapat selesai, laptop terlihat di meja (foto grup). 14.00-14.20 kunci cadangan dipinjam petugas TU (buku pinjam kunci). 14.10 petugas piket mengunci ruang (log kunci). 14.30 ketua klub kembali, pintu masih terkunci, laptop hilang.";

const aquariumCase =
  "Kasus Akuarium Kelas: Tiga ikan di akuarium kelas mati pada Senin pagi. Data: termometer akuarium 34°C (biasanya 26°C); pemanas akuarium masih menyala; Jumat sore jendela ditutup dan AC dimatikan selama akhir pekan; wadah makanan ikan masih penuh.";

const level3: DetectiveLevel = {
  level: 3,
  chapterCode: "DET-CH-004",
  chapterNumber: 4,
  rank: "Menengah",
  title: "Penyelidik",
  story:
    "Kini kamu memegang berkas kasus dengan banyak bukti sekaligus. Bukti-bukti itu tidak selalu searah, dan tugasmu adalah menyusunnya menjadi cerita yang masuk akal tanpa menuduh sembarangan.",
  goal: "Menganalisis kasus dengan beberapa bukti: petunjuk tersembunyi, keterangan yang berbeda, timeline silang, jejak digital, uji hipotesis, dan bias.",
  completionIndicator: "Menyelesaikan 6 quest Penyelidik dengan skor minimal 60.",
  chapterDifficulty: "INTERMEDIATE",
  questionDifficulty: "MEDIUM",
  bloomLevel: "ANALYZE",
  measurementCategory: "CORE",
  estimatedMinutes: 12,
  xpRewardFirst: 130,
  questionXp: 30,
  secondsPerQuestion: 90,
  quests: [
    {
      code: "DET-L3-OBS",
      skill: "DET-OBSERVASI",
      title: "Kamp Observasi: Petunjuk Tersembunyi",
      story: artRoomCase,
      objective: "Membaca petunjuk fisik (jejak, posisi, kondisi) dan menentukan apa yang masih perlu diperiksa.",
      instruction: "Gunakan detail kasus. Hindari kesimpulan yang melebihi apa yang ditunjukkan petunjuk.",
      hints: ["Jejak menunjukkan arah dan urutan, bukan identitas pasti.", "Detail yang tidak cocok dengan cerita adalah petunjuk penting."],
      caseText: artRoomCase,
      questions: [
        S("Jejak kaki biru menuju jendela paling tepat diartikan sebagai...", "Seseorang menginjak cat yang tumpah lalu berjalan ke arah jendela", [
          "Pelakunya pasti anak kecil",
          "Cat tumpah setelah semua orang pergi dari ruangan",
          "Pintu depan dibobol paksa",
        ]),
        S("Urutan kejadian yang paling didukung jejak adalah...", "Cat tumpah dulu, lalu ada yang menginjaknya", [
          "Ada yang berjalan dulu, lalu cat tumpah",
          "Jejak dibuat sebelum ruangan dikunci pukul 15.00",
          "Urutannya tidak bisa diketahui sama sekali",
        ]),
        B("Ukuran jejak yang kecil membuktikan pelakunya siswa SD.", false),
        M("Pilih semua hal yang perlu diperiksa lebih lanjut.", [
          "Apakah jendela dibuka dari dalam atau dari luar",
          "Ukuran dan pola alas sepatu pada jejak",
          "Siapa yang terakhir mengunci ruangan",
        ], ["Warna dinding ruang seni", "Jumlah kuas di rak"]),
        S("Detail kecil yang tidak sesuai dengan cerita saksi disebut...", "Inkonsistensi", ["Motif", "Alibi", "Hipotesis"]),
        S(
          "Apa arti dari observasi ini?",
          "Jendela mungkin baru dibuka setelah hujan berhenti",
          ["Satpam pasti berbohong", "Hujan tidak pernah turun", "Jendela tidak pernah dibuka"],
          `${artRoomCase}\nTambahan: Satpam bilang hujan deras sepanjang malam, tetapi lantai di bawah jendela yang terbuka ternyata kering.`,
        ),
        S(
          "Mengapa struk itu penting?",
          "Struk itu bisa menandakan ada orang di ruangan setelah pukul 15.00",
          ["Struk menunjukkan harga fotokopi mahal", "Struk membuktikan siapa pencurinya", "Struk tidak berhubungan karena hanya kertas"],
          `${artRoomCase}\nTambahan: Di tempat sampah ruang seni ada struk fotokopi bertanggal kemarin pukul 16.40.`,
        ),
        S("Cara terbaik mendokumentasikan jejak kaki adalah...", "Memotretnya dengan penggaris sebagai pembanding ukuran", [
          "Membersihkannya agar lantai tidak licin",
          "Mendeskripsikannya dari ingatan saja",
          "Menginjaknya untuk membandingkan ukuran sepatu",
        ]),
        X("Pasangkan temuan dengan maknanya.", [
          ["Jejak kaki biru", "Menunjukkan arah gerak"],
          ["Lantai kering di bawah jendela", "Petunjuk kapan jendela dibuka"],
          ["Struk fotokopi pukul 16.40", "Kemungkinan ada orang setelah ruangan dikunci"],
          ["Kaleng lain tertutup rapat", "Hanya satu kaleng yang terganggu"],
        ]),
        O("Urutkan pemeriksaan lokasi kejadian yang baik.", [
          "Amankan lokasi agar tidak ada yang masuk",
          "Dokumentasikan keadaan dengan foto",
          "Periksa detail kecil satu per satu",
          "Bandingkan temuan dengan keterangan saksi",
        ]),
      ],
    },
    {
      code: "DET-L3-MEM",
      skill: "DET-MEMORI",
      title: "Lorong Ingatan: Mencocokkan Keterangan",
      story:
        "Dua saksi melihat orang yang sama, tetapi ceritanya tidak persis sama. Di Lorong Ingatan, kamu belajar mencocokkan keterangan tanpa buru-buru menyebut siapa yang berbohong.",
      objective: "Membandingkan beberapa keterangan dan menemukan bagian yang cocok dan yang berbeda.",
      instruction: "Bandingkan keterangan dengan teliti. Perbedaan kecil belum tentu kebohongan.",
      hints: ["Buat tabel: siapa, melihat apa, kapan.", "Detail yang disebut dua saksi yang terpisah lebih kuat."],
      questions: [
        S(
          "Detail mana yang cocok antara kedua saksi?",
          "Jaket hijau dan waktu sekitar 16.10",
          ["Jenis tas yang dibawa", "Semua detail cocok", "Tidak ada yang cocok"],
          "Saksi A: 'Orangnya pakai jaket hijau, bawa tas ransel hitam, lewat pukul 16.10.' Saksi B: 'Aku lihat jaket hijau, bawa tas selempang, sekitar pukul 16.10.'",
        ),
        S(
          "Detail mana yang perlu dicek karena berbeda?",
          "Jenis tas yang dibawa",
          ["Warna jaket", "Waktu kejadian", "Tempat kejadian"],
          "Saksi A: 'Orangnya pakai jaket hijau, bawa tas ransel hitam, lewat pukul 16.10.' Saksi B: 'Aku lihat jaket hijau, bawa tas selempang, sekitar pukul 16.10.'",
        ),
        B("Perbedaan kecil antara dua saksi sering terjadi walaupun keduanya jujur.", true),
        S("Jika semua saksi menceritakan kejadian dengan kata-kata yang persis sama, detektif perlu waspada karena...", "Mungkin mereka sudah menyamakan cerita", [
          "Itu tanda cerita pasti benar",
          "Itu membuktikan mereka pelakunya",
          "Itu tidak mungkin terjadi",
        ]),
        M(
          "Pilih semua pernyataan yang BENAR menurut catatan.",
          ["Rafi meminjam kunci dua kali", "Sinta mengembalikan kunci pada hari Selasa", "Pada hari Rabu kunci belum dikembalikan"],
          ["Sinta meminjam kunci paling lama", "Rafi selalu meminjam pada pagi hari"],
          "Catatan pinjam kunci lab: Senin - Rafi 13.00, kembali 14.00. Selasa - Sinta 10.00, kembali 10.30. Rabu - Rafi 09.00, belum kembali.",
        ),
        S("Cara terbaik membandingkan banyak keterangan saksi adalah...", "Membuat tabel: siapa, melihat apa, kapan, dan dari posisi mana", [
          "Mengingat semuanya di kepala",
          "Hanya mencatat saksi yang paling yakin",
          "Memilih cerita yang paling panjang",
        ]),
        S(
          "Langkah terbaik adalah...",
          "Menanyakan dengan sopan mengapa jamnya berbeda dan mengecek buku tamu perpustakaan",
          ["Menyimpulkan Tomi pembohong", "Memakai keterangan terbaru saja", "Mengabaikan kedua keterangan"],
          "Keterangan pertama Tomi (Senin): 'Aku sampai perpustakaan pukul 14.00.' Keterangan kedua (Rabu): 'Aku sampai perpustakaan pukul 13.30.'",
        ),
        S("Bagian ingatan yang paling mudah keliru biasanya adalah...", "Waktu yang tepat dan warna benda di tempat gelap", [
          "Nama sahabat sendiri",
          "Alamat rumah sendiri",
          "Nama sekolah sendiri",
        ]),
        X(
          "Pasangkan loker dengan isinya sesuai catatan.",
          [
            ["Loker 3", "Raket"],
            ["Loker 5", "Bola basket"],
            ["Loker 8", "Tali skipping"],
            ["Loker 9", "Cone latihan"],
          ],
          "Catatan inventaris: Loker 3 berisi raket, loker 5 berisi bola basket, loker 8 berisi tali skipping, dan loker 9 berisi cone latihan.",
        ),
        O(
          "Urutkan kejadian sesuai rangkuman saksi.",
          ["Suara kaca pecah", "Alarm berbunyi", "Satpam berlari ke lorong timur", "Lampu lorong dinyalakan"],
          "Rangkuman saksi: 'Pertama terdengar suara kaca pecah. Setelah itu alarm berbunyi. Lalu satpam berlari ke lorong timur. Terakhir lampu lorong dinyalakan.'",
        ),
      ],
    },
    {
      code: "DET-L3-KRO",
      skill: "DET-KRONOLOGI",
      title: "Kota Kronologi: Timeline Silang",
      story: laptopCase,
      objective: "Menggabungkan beberapa sumber waktu menjadi satu timeline dan menemukan celahnya.",
      instruction: "Gabungkan semua jam dari catatan yang berbeda, lalu cari rentang yang paling penting.",
      hints: ["Mulai dari waktu terakhir laptop terlihat.", "Akses ke ruangan di dalam rentang kejadian perlu diperiksa."],
      caseText: laptopCase,
      questions: [
        T("Susun kejadian dari yang paling awal.", [
          ["13.05", "Laptop dipakai rapat"],
          ["13.50", "Laptop terlihat di meja setelah rapat"],
          ["14.00", "Kunci cadangan dipinjam petugas TU"],
          ["14.10", "Ruang dikunci petugas piket"],
          ["14.30", "Laptop diketahui hilang"],
        ]),
        S("Rentang waktu paling penting untuk diselidiki adalah...", "13.50 sampai 14.30", [
          "13.05 sampai 13.50",
          "14.30 sampai 15.00",
          "13.05 sampai 14.30",
        ]),
        S("Mengapa peminjaman kunci cadangan pukul 14.00-14.20 penting?", "Karena ada akses ke ruangan di dalam rentang hilangnya laptop", [
          "Karena petugas TU pasti pelakunya",
          "Karena kunci cadangan rusak",
          "Karena tidak berhubungan dengan waktu kejadian",
        ]),
        B("Karena pintu masih terkunci pukul 14.30, laptop pasti hilang sebelum pukul 14.10.", false),
        S("Ruangan belum dikunci antara 13.50 dan 14.10. Informasi apa yang paling dibutuhkan?", "Siapa saja yang lewat atau masuk ruangan pada 13.50-14.10", [
          "Isi notulen rapat",
          "Merek laptop",
          "Jumlah anggota klub",
        ]),
        M("Pilih semua pertanyaan yang tepat untuk petugas TU.", [
          "Untuk apa kunci cadangan dipinjam?",
          "Apakah ada orang lain yang ikut masuk?",
          "Apakah laptop masih terlihat saat itu?",
        ], ["Kamu yang mengambil laptopnya, kan?", "Kenapa kamu tidak suka klub jurnalistik?"]),
        S("Jika CCTV mencatat 14.12 tetapi jam dinding di foto menunjukkan 14.05 untuk momen yang sama, langkah pertama adalah...", "Mengecek jam mana yang tidak tepat", [
          "Memilih waktu yang cocok dengan dugaan",
          "Membuang kedua bukti",
          "Mengambil rata-rata tanpa alasan",
        ]),
        S("Timeline silang berarti...", "Menggabungkan waktu dari beberapa sumber berbeda untuk melihat kecocokannya", [
          "Timeline yang digambar menyilang",
          "Timeline khusus satu orang",
          "Timeline tanpa jam",
        ]),
        X("Pasangkan sumber dengan informasi yang diberikannya.", [
          ["Notulen rapat", "Laptop dipakai 13.05"],
          ["Foto grup", "Laptop di meja 13.50"],
          ["Log kunci", "Ruang dikunci 14.10"],
          ["Buku pinjam kunci", "Kunci cadangan 14.00-14.20"],
        ]),
        S("Kesimpulan sementara yang paling adil adalah...", "Laptop hilang antara 13.50-14.30; perlu dicek siapa yang masuk sebelum ruang dikunci dan saat kunci cadangan dipakai", [
          "Petugas TU pelakunya",
          "Ketua klub berbohong",
          "Laptop tidak pernah dibawa ke rapat",
        ]),
      ],
    },
    {
      code: "DET-L3-SUM",
      skill: "DET-SUMBER",
      title: "Perpustakaan Sumber: Jejak Digital",
      story:
        "Nilai di spreadsheet kelas berubah tengah malam dan sebuah foto 'kejadian kemarin' viral. Di rak digital Perpustakaan Sumber, kamu belajar membaca jejak digital dengan hati-hati.",
      objective: "Menilai apa yang bisa dan belum bisa dibuktikan oleh log, metadata, dan tangkapan layar.",
      instruction: "Jejak digital menjawab 'apa' dan 'kapan', tetapi belum tentu 'siapa'.",
      hints: ["Akun yang dipakai bersama tidak menunjuk satu orang.", "Tangkapan layar bisa diedit; cari sumber aslinya."],
      questions: [
        S("Log login aplikasi bisa membuktikan...", "Akun mana yang masuk dan kapan", [
          "Siapa orang yang mengetik dengan pasti",
          "Alasan orang itu masuk",
          "Perasaan pemilik akun",
        ]),
        S(
          "Mengapa log ini belum cukup untuk menunjuk sekretaris kelas?",
          "Banyak orang bisa tahu password karena ditempel di papan",
          ["Karena log selalu salah", "Karena perubahan terjadi malam hari", "Karena spreadsheet tidak punya riwayat"],
          "Nilai tugas di spreadsheet kelas berubah pukul 21.14 oleh akun 'sekretaris.kelas'. Password akun itu ditempel di papan kelas.",
        ),
        B("Tangkapan layar chat bisa diedit, jadi sebaiknya dicocokkan dengan sumber aslinya.", true),
        S(
          "Kesimpulan yang tepat adalah...",
          "Foto itu kemungkinan foto lama yang disebarkan ulang",
          ["Foto pasti diambil kemarin", "Informasi file tidak mungkin benar", "Kantin sudah tutup dua tahun"],
          "Sebuah foto diklaim diambil 'kemarin' di kantin. Informasi file foto menunjukkan foto itu dibuat dua tahun lalu, dan foto yang sama muncul di unggahan lama.",
        ),
        M(
          "Pilih semua cara memeriksa keaslian foto yang viral.",
          ["Mencari foto yang sama dengan pencarian gambar", "Memeriksa detail seperti cuaca, pakaian, atau bangunan", "Menanyakan kepada orang yang pertama kali mengunggah"],
          ["Menghitung jumlah like", "Melihat seberapa marah komentarnya"],
        ),
        S("Riwayat versi dokumen berguna untuk...", "Melihat kapan dan bagian mana dokumen diubah", [
          "Mengetahui isi hati penulis",
          "Menghapus semua jejak perubahan",
          "Membuat dokumen menjadi rahasia",
        ]),
        S(
          "Sikap yang tepat adalah...",
          "Nama tampilan bisa diatur siapa saja, jadi perlu verifikasi lewat pihak berwenang",
          ["Langsung mencari siswa bernama Budi Santoso", "Menyebarkan nama itu di grup", "Membalas pesan dengan ancaman"],
          "Pesan ancaman dikirim dari nomor tak dikenal. Di aplikasi chat, nomor itu memakai nama tampilan 'Budi Santoso'.",
        ),
        S("Sumber primer untuk kasus nilai yang berubah adalah...", "Riwayat perubahan di spreadsheet asli", [
          "Cerita teman yang melihat spreadsheet",
          "Tangkapan layar dari grup lain",
          "Tebakan wali kelas",
        ]),
        X("Pasangkan jejak digital dengan informasi yang diberikannya.", [
          ["Log login", "Kapan akun masuk"],
          ["Riwayat versi", "Bagian dokumen yang diubah"],
          ["Metadata foto", "Kapan file dibuat"],
          ["Alamat pengirim email", "Dari akun mana pesan dikirim"],
        ]),
        O("Urutkan langkah memeriksa pesan mencurigakan.", [
          "Jangan klik tautan dan simpan pesannya",
          "Periksa alamat atau nomor pengirim",
          "Bandingkan dengan informasi resmi",
          "Laporkan ke guru atau pihak berwenang",
        ]),
      ],
    },
    {
      code: "DET-L3-NAL",
      skill: "DET-PENALARAN",
      title: "Jembatan Logika: Uji Hipotesis",
      story: aquariumCase,
      objective: "Menyusun beberapa hipotesis dan mengujinya dengan data yang mendukung atau melemahkan.",
      instruction: "Untuk setiap hipotesis, tanyakan: data mana yang mendukung, dan data mana yang membantah?",
      hints: ["Hipotesis terbaik cocok dengan SEMUA data.", "Satu data yang membantah bisa menjatuhkan hipotesis."],
      caseText: aquariumCase,
      questions: [
        S("Hipotesis yang paling didukung data adalah...", "Air terlalu panas karena pemanas tetap menyala di ruangan tertutup", [
          "Ikan diracun seseorang",
          "Ikan mati karena terlalu banyak makan",
          "Ikan mati karena kedinginan",
        ]),
        S("Data yang MELEMAHKAN hipotesis 'ikan kekenyangan' adalah...", "Wadah makanan ikan masih penuh", [
          "Suhu air 34°C",
          "Jendela ditutup",
          "AC dimatikan",
        ]),
        B("Data suhu 34°C membuktikan ada orang yang sengaja menaikkan suhu pemanas.", false),
        S("Cara menguji hipotesis 'pemanas terlalu panas' adalah...", "Memeriksa pengaturan suhu pemanas dan mencobanya di air tanpa ikan", [
          "Menanyai semua siswa satu per satu",
          "Mengganti ikan dengan yang baru",
          "Membuang pemanas tanpa diperiksa",
        ]),
        M("Pilih semua hipotesis lain yang masih perlu diperiksa.", [
          "Pemanas rusak sehingga tidak berhenti memanaskan",
          "Ada zat berbahaya yang masuk ke air",
          "Pompa udara mati sehingga oksigen kurang",
        ], ["Ikan mati karena hari Senin", "Ikan mati karena warna akuarium"]),
        S("Hipotesis yang baik harus...", "Bisa diuji dan bisa dibuktikan salah", [
          "Tidak mungkin dibantah",
          "Menyebut nama pelaku",
          "Didukung perasaan yang kuat",
        ]),
        S(
          "Apa yang sebaiknya dilakukan?",
          "Menganggap hipotesis itu melemah dan mencari penyebab lain",
          ["Tetap yakin sekringnya putus", "Mengabaikan data kelas sebelah", "Menyalahkan kelas sebelah"],
          "Hipotesis: 'Lampu kelas mati karena sekring putus.' Ternyata lampu kelas sebelah yang memakai sekring yang sama tetap menyala.",
        ),
        S("Mengapa penjelasan paling sederhana yang cocok dengan semua bukti sebaiknya dicek lebih dulu?", "Penyebab sederhana lebih sering terjadi dan lebih mudah diuji", [
          "Penjelasan sederhana selalu benar",
          "Penjelasan rumit selalu salah",
          "Karena tidak perlu mencari bukti lagi",
        ]),
        X("Pasangkan bagian analisis dengan contohnya dari kasus akuarium.", [
          ["Hipotesis", "Pemanas membuat air terlalu panas"],
          ["Bukti pendukung", "Suhu air 34°C"],
          ["Bukti yang melemahkan dugaan lain", "Makanan ikan masih penuh"],
          ["Uji", "Mencoba pemanas di air tanpa ikan"],
        ]),
        O("Urutkan siklus menguji hipotesis.", [
          "Amati masalah dan kumpulkan data",
          "Susun beberapa hipotesis",
          "Uji tiap hipotesis dengan bukti atau percobaan",
          "Pertahankan, ubah, atau buang hipotesis sesuai hasil",
        ]),
      ],
    },
    {
      code: "DET-L3-ETI",
      skill: "DET-ETIKA",
      title: "Ruang Wawancara: Menjaga Keadilan",
      story:
        "Seisi kelas sudah punya 'tersangka favorit'. Di Ruang Wawancara, musuh terbesar detektif bukan pelaku, tetapi prasangkanya sendiri.",
      objective: "Mengenali prasangka, bias konfirmasi, dan konflik kepentingan dalam penyelidikan.",
      instruction: "Pilih tindakan yang menjaga penyelidikan tetap objektif dan adil.",
      hints: ["Reputasi buruk bukan bukti.", "Sengaja cari bukti yang bisa membantah dugaanmu."],
      questions: [
        S(
          "Kalimat ini menunjukkan...",
          "Prasangka berdasarkan reputasi, bukan bukti",
          ["Bukti yang kuat", "Alibi", "Observasi langsung"],
          "Seorang teman berkata: 'Pasti Rio, dia kan memang suka bikin masalah.'",
        ),
        S("Bias konfirmasi adalah kecenderungan untuk...", "Hanya mencari bukti yang mendukung dugaan sendiri", [
          "Mengonfirmasi jadwal wawancara",
          "Mencatat semua bukti dengan adil",
          "Bertanya kepada banyak saksi",
        ]),
        B("Detektif yang adil tetap mencatat bukti yang bertentangan dengan dugaannya.", true),
        S(
          "Sikap yang tepat adalah...",
          "Menganggap gugup sebagai reaksi yang wajar, bukan bukti bersalah",
          ["Menyimpulkan ia bersalah", "Menekannya agar mengaku", "Menghentikan penyelidikan"],
          "Saat diwawancarai, siswa yang dicurigai terlihat gugup dan berkeringat.",
        ),
        M(
          "Pilih semua tindakan yang menjaga hak orang yang dicurigai.",
          ["Memberi kesempatan untuk menjelaskan", "Tidak menyebarkan namanya", "Memeriksa bukti yang meringankan"],
          ["Menghukum sebelum ada kesimpulan", "Mengumumkan dugaan di depan kelas"],
        ),
        S(
          "Tindakan yang paling etis adalah...",
          "Melaporkan bukti apa adanya dan meminta orang lain ikut memeriksa agar tetap objektif",
          ["Menyembunyikan bukti itu", "Mengubah bukti agar sahabatmu aman", "Memberi tahu sahabatmu agar menghapus bukti"],
          "Kamu menemukan bukti yang membuat sahabatmu terlihat bersalah.",
        ),
        S("Konflik kepentingan terjadi jika penyelidik...", "Punya hubungan pribadi yang bisa mempengaruhi keputusannya", [
          "Bertanya kepada banyak saksi",
          "Membuat laporan tertulis",
          "Bekerja dalam tim",
        ]),
        S("Tujuan utama penyelidikan di sekolah adalah...", "Menemukan apa yang benar-benar terjadi dan memperbaiki masalahnya", [
          "Mencari orang untuk disalahkan secepatnya",
          "Membuat seseorang malu",
          "Menunjukkan bahwa detektif paling pintar",
        ]),
        X("Pasangkan istilah dengan artinya.", [
          ["Prasangka", "Menilai orang dari reputasinya"],
          ["Bias konfirmasi", "Hanya mencari bukti yang cocok dengan dugaan"],
          ["Praduga tak bersalah", "Dianggap tidak bersalah sampai terbukti"],
          ["Objektif", "Menilai berdasarkan bukti"],
        ]),
        O("Urutkan langkah yang tepat jika kamu sadar sudah berprasangka.", [
          "Akui bahwa dugaanmu mungkin dipengaruhi prasangka",
          "Tulis ulang bukti yang benar-benar ada",
          "Cari bukti yang bisa membantah dugaanmu",
          "Minta orang lain memeriksa kesimpulanmu",
        ]),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// LEVEL 4 - MAHIR (Inspektur)
// ---------------------------------------------------------------------------

const printerCase =
  "Kasus Printer Sekolah: Printer ruang TU biasanya mencetak sekitar 200 lembar per hari. Minggu ini, setiap hari printer mencetak sekitar 900 lembar, semuanya antara pukul 06.00-06.30, sebelum guru dan staf datang.";

const cashCase =
  "Kasus Uang Kas Kelas: Uang kas di laci guru masih ada pukul 11.00 (dicek bendahara) dan hilang pukul 12.30. Wina: 'Aku di perpustakaan 11.00-12.30.' Buku tamu perpustakaan: Wina masuk 11.05, keluar 11.40. Struk kantin: Wina membeli makanan 11.50. Xander: 'Aku latihan basket 11.00-12.30.' Pelatih membenarkan Xander hadir penuh. Yuda: 'Aku di UKS 11.30-12.30.' Catatan UKS: Yuda masuk 11.35, keluar 12.25.";

const fakeLetterCase =
  "Kasus Surat Edaran: Beredar surat 'libur tambahan' dengan kop sekolah. Namun tanggal surat jatuh pada hari Minggu, nomor surat tidak sesuai format surat sekolah, dan tanda tangan kepala sekolah berbeda dari surat-surat resmi sebelumnya.";

const level4: DetectiveLevel = {
  level: 4,
  chapterCode: "DET-CH-005",
  chapterNumber: 5,
  rank: "Mahir",
  title: "Inspektur",
  story:
    "Sebagai Inspektur, kamu menghadapi bukti yang saling bertabrakan: pola data yang aneh, ingatan yang bisa keliru, alibi yang retak, dan dokumen yang mungkin palsu. Keputusanmu harus bisa dipertanggungjawabkan.",
  goal: "Menangani bukti yang bertentangan: analisis anomali data, keterbatasan ingatan, alibi bercelah, verifikasi silang, menimbang kemungkinan, dan menulis laporan yang bertanggung jawab.",
  completionIndicator: "Menyelesaikan 6 quest Inspektur dengan skor minimal 60.",
  chapterDifficulty: "ADVANCED",
  questionDifficulty: "HARD",
  bloomLevel: "ANALYZE",
  measurementCategory: "ADVANCED",
  estimatedMinutes: 14,
  xpRewardFirst: 160,
  questionXp: 35,
  secondsPerQuestion: 105,
  quests: [
    {
      code: "DET-L4-OBS",
      skill: "DET-OBSERVASI",
      title: "Kamp Observasi: Anomali dalam Pola",
      story:
        "Observasi tingkat Inspektur tidak hanya melihat ruangan, tetapi juga data. Kamu harus mengenali pola normal sebelum bisa menemukan yang aneh.",
      objective: "Menemukan anomali dalam pola data dan merencanakan pengumpulan data lanjutan.",
      instruction: "Tentukan dulu pola normalnya, lalu cari bagian yang menyimpang.",
      hints: ["Tanpa pola normal, tidak ada anomali.", "Anomali adalah alasan untuk bertanya, bukan alasan untuk menuduh."],
      questions: [
        S(
          "Anomali yang terlihat adalah...",
          "Pengunjung turun drastis khusus pada hari Jumat",
          ["Pengunjung turun setiap hari", "Tidak ada perubahan", "Pengunjung naik pada hari Jumat"],
          "Data pengunjung perpustakaan: rata-rata 40 orang per hari. Tiga Jumat terakhir: 5, 6, dan 4 orang. Hari lain tetap sekitar 40 orang.",
        ),
        S(
          "Hipotesis yang paling layak dicek lebih dulu adalah...",
          "Ada kegiatan baru setiap Jumat yang bentrok dengan jam buka perpustakaan",
          ["Petugas perpustakaan mengusir pengunjung", "Semua buku perpustakaan hilang", "Data pengunjung dipalsukan"],
          "Data pengunjung perpustakaan: rata-rata 40 orang per hari. Tiga Jumat terakhir: 5, 6, dan 4 orang. Hari lain tetap sekitar 40 orang.",
        ),
        B("Satu data yang berbeda dari pola selalu berarti ada kejahatan.", false),
        S("Detail paling penting dari anomali ini adalah...", "Waktu mencetak yang terjadi sebelum jam kerja", [
          "Merek printer",
          "Jumlah guru di sekolah",
          "Warna kertas",
        ], printerCase),
        M("Pilih semua data yang perlu dikumpulkan berikutnya.", [
          "Log akun yang mengirim perintah cetak",
          "Siapa yang punya akses ke ruang TU pada pagi hari",
          "Jenis dokumen yang dicetak",
        ], ["Harga printer", "Jumlah jendela di ruang TU"], printerCase),
        S("Sebelum menyebut sesuatu sebagai anomali, detektif harus tahu dulu...", "Pola normalnya", [
          "Nama pelakunya",
          "Motif pelaku",
          "Hukuman yang tepat",
        ]),
        S(
          "Langkah awal yang paling tepat adalah...",
          "Memeriksa apakah ada izin atau jadwal khusus setiap Selasa",
          ["Langsung menghukum siswa itu", "Menyita suratnya", "Menganggapnya bolos tanpa cek"],
          "Jam pulang siswa biasanya 14.00. CCTV menunjukkan seorang siswa keluar gerbang pukul 11.30 setiap Selasa sambil membawa surat.",
        ),
        S("Kebetulan perlu dipertimbangkan dalam penyelidikan karena...", "Dua kejadian bisa terjadi bersamaan tanpa saling berhubungan", [
          "Semua kebetulan adalah bukti",
          "Kebetulan tidak pernah terjadi",
          "Kebetulan selalu direncanakan",
        ]),
        X("Pasangkan istilah dengan contohnya dari kasus printer.", [
          ["Pola normal", "Printer mencetak 200 lembar per hari"],
          ["Anomali", "900 lembar sebelum jam kerja"],
          ["Data pembanding", "Log cetak minggu-minggu sebelumnya"],
          ["Langkah lanjut", "Cek akun pengirim perintah cetak"],
        ], printerCase),
        O("Urutkan cara menganalisis anomali.", [
          "Tentukan pola normal dari data lama",
          "Temukan bagian yang menyimpang",
          "Kumpulkan data tambahan tentang penyimpangan itu",
          "Uji beberapa penjelasan yang mungkin",
        ]),
      ],
    },
    {
      code: "DET-L4-MEM",
      skill: "DET-MEMORI",
      title: "Lorong Ingatan: Ingatan yang Bisa Keliru",
      story:
        "Di ujung Lorong Ingatan ada cermin yang memantulkan kenangan yang sedikit berbeda dari aslinya. Inspektur harus tahu kapan ingatan saksi bisa dipercaya, dan kapan perlu bukti lain.",
      objective: "Memahami faktor yang membuat ingatan keliru dan memilih cara wawancara yang menjaga ingatan asli.",
      instruction: "Nilai kesaksian berdasarkan kondisi saat melihat dan apa yang terjadi sesudahnya.",
      hints: ["Yakin belum tentu benar.", "Keterangan awal sebelum terpengaruh informasi luar biasanya lebih murni."],
      questions: [
        S(
          "Apa yang paling mungkin terjadi?",
          "Saksi A cenderung memperkirakan kecepatan lebih tinggi karena pilihan kata dalam pertanyaan",
          ["Kedua saksi pasti menjawab sama", "Saksi B pasti berbohong", "Pilihan kata tidak berpengaruh apa pun"],
          "Detektif bertanya kepada saksi A: 'Seberapa cepat mobil itu MENABRAK pagar?' dan kepada saksi B: 'Seberapa cepat mobil itu MENYENTUH pagar?'",
        ),
        S("Ingatan palsu adalah...", "Ingatan tentang hal yang tidak terjadi, tetapi terasa nyata bagi orangnya", [
          "Kebohongan yang disengaja",
          "Ingatan yang sudah dicatat",
          "Ingatan yang hanya dimiliki anak kecil",
        ]),
        B("Semakin yakin seorang saksi, semakin pasti ingatannya benar.", false),
        S(
          "Masalah dari cara ini adalah...",
          "Saksi cenderung mengiyakan karena hanya ada satu pilihan",
          ["Fotonya terlalu kecil", "Tidak ada masalah", "Saksi tidak boleh melihat foto apa pun"],
          "Detektif memperlihatkan satu foto siswa kepada saksi, lalu bertanya: 'Apakah ini orangnya?'",
        ),
        M(
          "Pilih semua hal yang dapat mengubah ingatan saksi setelah kejadian.",
          ["Membaca komentar orang di media sosial", "Mendengar cerita saksi lain", "Pertanyaan yang menggiring"],
          ["Mencatat segera setelah kejadian", "Diwawancarai terpisah dengan pertanyaan netral"],
        ),
        S(
          "Bagaimana kesaksian ini sebaiknya diperlakukan?",
          "Dicatat sebagai petunjuk lemah yang perlu didukung bukti lain",
          ["Dianggap bukti paling kuat", "Dibuang karena pasti salah", "Dipakai untuk langsung menunjuk pelaku"],
          "Dalam gelap, saksi melihat seseorang dari jarak 30 meter selama sekitar 2 detik.",
        ),
        S("Wawancara kognitif meminta saksi untuk...", "Membayangkan kembali suasana dan menceritakan semua detail, sekecil apa pun", [
          "Menjawab ya atau tidak saja",
          "Memilih pelaku dari satu foto",
          "Menebak jika lupa",
        ]),
        S(
          "Keterangan mana yang lebih bisa dipercaya, dan mengapa?",
          "Keterangan Senin, karena belum terpengaruh informasi dari luar",
          ["Keterangan Kamis, karena lebih baru", "Keduanya sama kuat", "Tidak ada yang bisa dipakai sama sekali"],
          "Senin, saksi berkata 'tingginya sekitar 160 cm'. Kamis, setelah mendengar kabar bahwa orang yang dicurigai tingginya 175 cm, saksi berkata 'mungkin 175 cm'.",
        ),
        X("Pasangkan faktor dengan pengaruhnya terhadap ingatan.", [
          ["Pertanyaan menggiring", "Saksi mengikuti kata-kata penanya"],
          ["Informasi setelah kejadian", "Bercampur dengan ingatan asli"],
          ["Stres tinggi", "Membuat fokus menyempit"],
          ["Pencatatan segera", "Membantu menjaga ingatan asli"],
        ]),
        O("Urutkan tahapan wawancara kognitif.", [
          "Bangun suasana nyaman dan jelaskan tujuan",
          "Minta saksi membayangkan kembali tempat dan suasana",
          "Minta saksi menceritakan semuanya tanpa dipotong",
          "Ajukan pertanyaan netral untuk detail yang belum jelas",
        ]),
      ],
    },
    {
      code: "DET-L4-KRO",
      skill: "DET-KRONOLOGI",
      title: "Kota Kronologi: Alibi yang Retak",
      story: cashCase,
      objective: "Memeriksa beberapa alibi terhadap bukti tertulis dan menemukan celah waktunya.",
      instruction: "Bandingkan kata-kata setiap orang dengan catatan tertulis. Alibi yang retak belum berarti bersalah.",
      hints: ["Hitung bagian waktu yang tidak tertutup bukti.", "Selalu pikirkan kemungkinan jujur, misalnya salah ingat."],
      caseText: cashCase,
      questions: [
        S("Alibi siapa yang paling kuat?", "Xander", ["Wina", "Yuda", "Semuanya sama kuat"]),
        S("Apa masalah pada keterangan Wina?", "Buku tamu menunjukkan ia keluar perpustakaan pukul 11.40, bukan 12.30", [
          "Wina tidak tercatat di buku tamu sama sekali",
          "Struk kantin membuktikan ia mengambil uang",
          "Tidak ada masalah",
        ]),
        B("Karena keterangan Wina tidak cocok dengan buku tamu, Wina pasti mengambil uang kas.", false),
        S("Waktu Yuda yang TIDAK tercakup catatan UKS adalah...", "11.00-11.35 dan 12.25-12.30", [
          "11.35-12.25",
          "Tidak ada",
          "12.00-12.30",
        ]),
        M("Pilih semua langkah lanjutan yang tepat.", [
          "Menanyakan ke mana Wina setelah pukul 11.40",
          "Memeriksa di mana Yuda sebelum pukul 11.35",
          "Mencari tahu siapa saja yang masuk ruang guru pukul 11.00-12.30",
        ], ["Langsung menggeledah tas Wina", "Menghapus data Xander dari laporan"]),
        T("Susun aktivitas Wina berdasarkan bukti tertulis.", [
          ["11.05", "Wina masuk perpustakaan"],
          ["11.40", "Wina keluar perpustakaan"],
          ["11.50", "Wina membeli makanan di kantin"],
          ["12.30", "Uang kas diketahui hilang"],
        ]),
        S("Alibi disebut 'retak' jika...", "Ada bagian cerita yang tidak cocok dengan bukti", [
          "Orang itu pasti pelakunya",
          "Alibinya didukung banyak saksi",
          "Alibinya diceritakan dua kali",
        ]),
        S("Kemungkinan jujur untuk ketidakcocokan keterangan Wina adalah...", "Ia salah ingat atau lupa menyebut bahwa ia pindah ke kantin", [
          "Tidak ada kemungkinan jujur",
          "Buku tamu pasti palsu",
          "Struk kantin pasti salah",
        ]),
        X("Pasangkan nama dengan penilaian alibinya.", [
          ["Wina", "Keterangan tidak cocok dengan buku tamu"],
          ["Xander", "Didukung pelatih sepanjang waktu"],
          ["Yuda", "Ada celah waktu di awal dan akhir"],
          ["Ruang guru", "Lokasi yang perlu dicek siapa saja yang masuk"],
        ]),
        S("Kesimpulan sementara yang paling adil adalah...", "Belum ada bukti tindakan; perlu klarifikasi Wina dan Yuda serta data siapa yang masuk ruang guru", [
          "Wina pelakunya",
          "Yuda pelakunya",
          "Kasus ditutup karena tidak ada saksi",
        ]),
      ],
    },
    {
      code: "DET-L4-SUM",
      skill: "DET-SUMBER",
      title: "Perpustakaan Sumber: Verifikasi Silang",
      story: fakeLetterCase,
      objective: "Memeriksa keaslian dokumen dan kabar dengan mencocokkan beberapa sumber yang berdiri sendiri.",
      instruction: "Hitung berapa sumber asli yang sebenarnya ada, lalu periksa tanda-tanda pemalsuan.",
      hints: ["Seratus akun yang menyalin satu unggahan tetap satu sumber.", "Periksa detail format: tanggal, nomor, tanda tangan."],
      questions: [
        S("Verifikasi silang berarti...", "Mencocokkan satu informasi dengan beberapa sumber yang berdiri sendiri", [
          "Memeriksa satu sumber berkali-kali",
          "Mencoret informasi yang salah",
          "Bertanya ke orang yang sama dua kali",
        ]),
        S(
          "Berapa sumber asli yang sebenarnya ada?",
          "Satu, yaitu akun anonim",
          ["Tiga", "Empat", "Tidak ada sama sekali"],
          "Tiga akun menyebarkan kabar 'lomba dibatalkan'. Ketiganya menautkan ke satu unggahan yang sama dari sebuah akun anonim.",
        ),
        B("Kabar yang dibagikan ulang oleh banyak akun otomatis menjadi lebih terpercaya.", false),
        S("Kesimpulan yang tepat tentang surat itu adalah...", "Surat kemungkinan palsu dan perlu dikonfirmasi ke pihak sekolah", [
          "Surat pasti asli karena ada kop sekolah",
          "Libur tambahan pasti ada",
          "Semua surat sekolah pasti palsu",
        ], fakeLetterCase),
        M("Pilih semua tanda yang membuat surat itu meragukan.", [
          "Tanggal jatuh pada hari Minggu",
          "Nomor surat tidak sesuai format",
          "Tanda tangan berbeda dari biasanya",
        ], ["Ada kop sekolah", "Ditulis dalam bahasa Indonesia"], fakeLetterCase),
        S("Sumber yang diuntungkan jika kabarnya dipercaya sebaiknya...", "Diperiksa lebih hati-hati dan dicocokkan dengan sumber yang netral", [
          "Selalu dipercaya",
          "Selalu dianggap bohong",
          "Tidak perlu dipertimbangkan",
        ]),
        S(
          "Penilaian terbaik adalah...",
          "Kedua kesaksian perlu diperiksa: kedekatan saksi A bisa mempengaruhi, tetapi saksi B juga bisa keliru",
          ["Saksi A pasti benar karena mengenal orang itu", "Saksi B pasti benar karena tetangga", "CCTV buram membuktikan orang itu di taman"],
          "Saksi A (teman dekat orang yang dicurigai) bilang orang itu ada di rumah. Saksi B (tetangga yang tidak akrab) bilang melihatnya di taman. Rekaman CCTV taman buram.",
        ),
        S("Kutipan tokoh terkenal yang tersebar tanpa sumber sebaiknya...", "Dicari sumber aslinya, misalnya wawancara atau tulisan resmi tokoh itu", [
          "Langsung dibagikan jika terdengar bijak",
          "Dipercaya jika ada foto tokohnya",
          "Diubah sedikit agar lebih bagus",
        ]),
        X("Pasangkan situasi dengan cara menilainya.", [
          ["Satu unggahan disebar banyak akun", "Tetap dihitung satu sumber"],
          ["Sumber berbeda yang isinya cocok", "Saling menguatkan"],
          ["Sumber yang diuntungkan", "Perlu diperiksa lebih hati-hati"],
          ["Dokumen dengan format janggal", "Kemungkinan dipalsukan"],
        ]),
        O("Urutkan langkah verifikasi silang.", [
          "Tentukan klaim yang mau dicek",
          "Cari sumber pertama klaim itu",
          "Temukan minimal dua sumber lain yang berdiri sendiri",
          "Bandingkan isi dan putuskan tingkat kepercayaannya",
        ]),
      ],
    },
    {
      code: "DET-L4-NAL",
      skill: "DET-PENALARAN",
      title: "Jembatan Logika: Menimbang Kemungkinan",
      story:
        "Jembatan Logika bagian Inspektur tidak punya jawaban hitam-putih. Kamu harus menimbang hipotesis mana yang PALING mungkin, dan jujur tentang yang belum pasti.",
      objective: "Menimbang beberapa hipotesis berdasarkan bukti pembeda, dan membedakan korelasi dari sebab-akibat.",
      instruction: "Cari bukti yang membedakan hipotesis, bukan bukti yang cocok dengan semuanya.",
      hints: ["Bukti yang cocok dengan semua hipotesis tidak membantu memilih.", "Dua hal naik bersamaan belum tentu sebab-akibat."],
      questions: [
        S(
          "Mengapa detektif perlu berhati-hati dengan kesaksian warna ini?",
          "Warna sulit dilihat saat senja, dan sepeda biru jauh lebih banyak",
          ["Karena warna merah selalu salah", "Karena saksi pasti berbohong", "Tidak perlu berhati-hati"],
          "Di sekolah ada 300 siswa bersepeda biru dan 10 siswa bersepeda merah. Seorang saksi melihat sepeda 'kemerahan' saat hari mulai gelap.",
        ),
        S("Sebuah bukti disebut 'membedakan' jika...", "Lebih mungkin muncul pada satu hipotesis daripada hipotesis lain", [
          "Muncul pada semua hipotesis sama banyaknya",
          "Paling mahal harganya",
          "Ditemukan paling awal",
        ]),
        B(
          "Bukti ini lebih mendukung hipotesis A daripada hipotesis B.",
          true,
          "Hipotesis A: listrik padam karena gangguan jaringan di daerah itu. Hipotesis B: sekring satu rumah putus. Bukti: semua rumah di satu kompleks padam bersamaan.",
        ),
        S(
          "Hipotesis yang paling layak diuji lebih dulu adalah...",
          "Sepatu Ria tertukar dengan milik orang lain",
          ["Sepatu Ria dicuri untuk dijual", "Ria tidak pernah membawa sepatu", "Sepatu diambil hewan"],
          "Sepatu olahraga Ria hilang dari rak. Rak berisi 20 pasang sepatu hitam yang mirip, dan ada satu pasang sepatu tak bertuan dengan ukuran yang sama.",
        ),
        M(
          "Pilih semua pernyataan yang benar tentang 'korelasi bukan sebab-akibat'.",
          [
            "Dua hal bisa naik bersamaan karena ada penyebab ketiga",
            "Hubungan dua data perlu diuji sebelum disebut sebab",
            "Penjualan es krim dan kasus tenggelam sama-sama naik saat musim panas",
          ],
          ["Jika dua hal terjadi bersamaan, satu pasti menyebabkan yang lain", "Korelasi selalu membuktikan sebab-akibat"],
        ),
        S(
          "Hipotesis mana yang paling didukung?",
          "Kaca pecah terkena bola voli",
          ["Kaca pecah karena angin kencang", "Kaca pecah karena dilempar batu", "Ketiganya sama kuat"],
          "Tiga hipotesis tentang kaca kelas yang pecah: terkena bola, angin kencang, atau dilempar batu. Ditemukan bola voli di dalam kelas dekat pecahan kaca, dan jadwal mencatat ada latihan voli di lapangan sebelah.",
        ),
        S("Jika sebuah bukti cocok dengan SEMUA hipotesis, bukti itu...", "Tidak membantu memilih hipotesis mana yang benar", [
          "Paling penting",
          "Membuktikan semua hipotesis benar",
          "Harus dibuang dari laporan",
        ]),
        S(
          "Sikap yang tepat adalah...",
          "Menurunkan keyakinan pada A dan menimbang ulang hipotesis lain",
          ["Tetap 90% yakin karena sudah yakin sejak awal", "Mengabaikan bukti baru", "Menganggap bukti baru pasti palsu"],
          "Seorang detektif 90% yakin pada hipotesis A. Kemudian muncul bukti kuat yang bertentangan dengan A.",
        ),
        X("Pasangkan istilah dengan artinya.", [
          ["Bukti pembeda", "Lebih cocok dengan satu hipotesis"],
          ["Bukti netral", "Cocok dengan semua hipotesis"],
          ["Korelasi", "Dua hal berubah bersamaan"],
          ["Sebab-akibat", "Satu hal benar-benar menyebabkan yang lain"],
        ]),
        O("Urutkan cara menimbang beberapa hipotesis.", [
          "Tulis semua hipotesis yang masuk akal",
          "Daftar bukti yang tersedia",
          "Nilai bukti mana yang mendukung atau melemahkan tiap hipotesis",
          "Pilih hipotesis terkuat sambil mencatat ketidakpastiannya",
        ]),
      ],
    },
    {
      code: "DET-L4-ETI",
      skill: "DET-ETIKA",
      title: "Ruang Wawancara: Laporan Bertanggung Jawab",
      story:
        "Kepala sekolah menunggu laporanmu. Seorang Inspektur tahu bahwa laporan bisa mengubah hidup seseorang, jadi setiap kalimat harus jujur tentang apa yang pasti dan apa yang belum.",
      objective: "Menyusun laporan yang memisahkan fakta, analisis, dan kesimpulan, serta bertahan dari tekanan.",
      instruction: "Pilih kalimat dan tindakan yang jujur, dapat diperiksa ulang, dan tidak menuduh berlebihan.",
      hints: ["Tulis sumber setiap bukti.", "Laporan boleh berkata 'belum dapat ditentukan'."],
      questions: [
        S("Laporan penyelidikan yang baik memisahkan...", "Fakta, analisis, dan kesimpulan sementara", [
          "Orang baik dan orang nakal",
          "Saksi kaya dan saksi miskin",
          "Bukti yang disukai dan yang tidak disukai",
        ]),
        S("Kalimat laporan yang paling bertanggung jawab adalah...", "Bukti menunjukkan laptop hilang antara 13.50-14.30; pelaku belum dapat ditentukan.", [
          "Petugas TU jelas pelakunya.",
          "Semua orang di ruangan itu patut dihukum.",
          "Kasus ini pasti ulah kelas sebelah.",
        ]),
        B("Laporan boleh menghilangkan bukti yang tidak mendukung kesimpulan agar lebih meyakinkan.", false),
        S(
          "Respons yang paling etis adalah...",
          "Menjelaskan dengan sopan temuan sementara dan bukti yang masih dibutuhkan",
          ["Menyebut nama yang paling dicurigai agar cepat selesai", "Mengarang bukti", "Menolak memberi laporan apa pun"],
          "Kepala sekolah meminta nama pelaku hari ini juga, padahal bukti belum cukup.",
        ),
        M(
          "Pilih semua bagian yang wajib ada dalam laporan akhir.",
          ["Ringkasan kasus", "Bukti utama dan sumbernya", "Batas kepastian kesimpulan", "Rekomendasi tindak lanjut"],
          ["Gosip tentang orang yang dicurigai", "Pendapat pribadi tentang kepribadian saksi"],
        ),
        S("Mengapa sumber setiap bukti perlu ditulis dalam laporan?", "Agar orang lain bisa memeriksa ulang dan menilai kekuatannya", [
          "Agar laporan terlihat tebal",
          "Agar saksi menjadi terkenal",
          "Agar pelaku merasa takut",
        ]),
        S("Rekomendasi pencegahan yang baik untuk kasus 'password akun kelas ditempel di papan' adalah...", "Mengganti password dan membuat aturan agar tidak ditempel di tempat umum", [
          "Menghukum semua siswa",
          "Menghapus akun kelas selamanya",
          "Tidak perlu rekomendasi apa pun",
        ]),
        S(
          "Tindakan yang benar adalah...",
          "Memperbarui laporan dan memberi tahu pihak yang sudah menerima laporan",
          ["Menyembunyikan bukti baru", "Tetap memakai laporan lama", "Membuang bukti baru karena terlambat"],
          "Setelah laporan diserahkan, muncul bukti baru yang mengubah kesimpulan.",
        ),
        X("Pasangkan bagian laporan dengan contohnya.", [
          ["Fakta", "Log kunci mencatat pukul 14.10"],
          ["Analisis", "Rentang kejadian 13.50-14.30"],
          ["Kesimpulan sementara", "Pelaku belum dapat ditentukan"],
          ["Rekomendasi", "Batasi peminjaman kunci cadangan"],
        ]),
        O("Urutkan bagian laporan detektif.", [
          "Ringkasan kasus",
          "Bukti dan sumbernya",
          "Analisis timeline dan hipotesis",
          "Kesimpulan sementara dan rekomendasi",
        ]),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// LEVEL 5 - EXPERT (Detektif Expert)
// ---------------------------------------------------------------------------

const scienceFairCase =
  "Kasus Pameran Sains: Malam sebelum pameran, proyek 'Pembangkit Listrik Mini' milik tim Nara rusak. Temuan: (1) kabel utama terpotong rapi, bukan putus; (2) ada serbuk kayu di lantai, padahal proyek Nara tidak memakai kayu; (3) meja tim sebelah (proyek rumah kayu) bersebelahan dengan meja Nara; (4) gunting kabel milik lab ada di rak dalam keadaan bersih; (5) log pintu aula mencatat akses pukul 19.40 memakai kartu panitia; (6) lampu aula padam pukul 19.30-20.00 karena pemadaman terjadwal.";

const threeWitnessCase =
  "Kasus Jam Tangan Pelatih: Jam tangan pelatih hilang dari ruang ganti saat pertandingan. Saksi 1 (penjaga, diwawancara 10 menit setelah kejadian): 'Sekitar babak kedua, seseorang berjaket abu-abu keluar dari ruang ganti membawa botol.' Saksi 2 (penonton, diwawancara 3 hari kemudian, setelah membaca kabar di grup sekolah tentang 'orang berjaket hitam'): 'Aku lihat jaket hitam, bawa tas.' Saksi 3 (pemain cadangan, diwawancara 1 hari kemudian): 'Ada orang berjaket gelap lewat saat jeda babak, aku tidak lihat wajahnya.'";

const savingsCase =
  "Kasus Tabungan Kelas 9C: 09.55 bendahara memotret uang tabungan di lemari (foto bertanggal). Rekaman CCTV lorong: 10.00 bel istirahat, kelas kosong; 10.07 Zaki masuk kelas, keluar 10.09 membawa botol minum; 10.12 petugas kebersihan masuk, keluar 10.20 membawa kantong sampah. 10.15 Lia menulis di grup kelas 'lemari kok kebuka?' padahal Lia sedang di kantin. 10.30 bel masuk, bendahara menemukan uang hilang. Catatan teknisi: jam CCTV lebih cepat 3 menit dari jam asli.";

const hoaxCase =
  "Kasus Video Viral: Beredar video 20 detik berjudul 'Siswa SMP Harapan merusak taman kota, kemarin!'. Temuan: (1) video pertama kali diunggah akun baru tanpa foto profil; (2) seragam di video berbeda warna dari seragam SMP Harapan; (3) pencarian video menemukan rekaman yang sama di berita tiga tahun lalu dari kota lain; (4) akun pengunggah juga membuat banyak unggahan yang menjelekkan sekolah itu; (5) ribuan orang sudah membagikan video tersebut.";

const gardenCase =
  "Kasus Kebun Sekolah: Hasil panen kebun sekolah turun 60% semester ini. Data: (1) curah hujan semester ini 40% lebih sedikit; (2) pupuk yang dipakai sama seperti tahun lalu; (3) petak yang dekat keran air hasilnya normal, petak yang jauh turun drastis; (4) ada laporan hama ulat, tetapi hanya di 2 dari 10 petak; (5) jadwal siram manual tidak berjalan selama 3 minggu karena ujian.";

const posterCase =
  "Kasus Poster OSIS: Kamu memimpin penyelidikan poster OSIS yang dicoret-coret. Bukti: CCTV buram menunjukkan seseorang berjaket klub futsal di dekat mading pukul 17.10; klub futsal punya 25 anggota; spidol biru ditemukan di tempat sampah dekat mading; Ketua OSIS mendesakmu menyebut nama 'Kevin', anggota futsal yang pernah berdebat dengannya; Kevin punya struk bimbel pukul 16.30-18.00 di luar sekolah.";

const level5: DetectiveLevel = {
  level: 5,
  chapterCode: "DET-CH-006",
  chapterNumber: 6,
  rank: "Expert",
  title: "Detektif Expert",
  story:
    "Markas Detektif Utama membuka arsip kasus terberat. Setiap berkas menggabungkan observasi, ingatan saksi, timeline, sumber digital, penalaran, dan etika. Hanya detektif yang teliti, adil, dan berani berkata 'belum pasti' yang lulus di sini.",
  goal: "Menyelesaikan kasus kompleks lintas bukti secara utuh: dari mengamankan bukti sampai menulis kesimpulan dan rekomendasi yang adil.",
  completionIndicator: "Menyelesaikan 6 kasus Expert dengan skor minimal 70.",
  chapterDifficulty: "EXPERT",
  questionDifficulty: "HARD",
  bloomLevel: "EVALUATE",
  measurementCategory: "EXPERT",
  estimatedMinutes: 18,
  xpRewardFirst: 200,
  questionXp: 40,
  secondsPerQuestion: 120,
  quests: [
    {
      code: "DET-L5-OBS",
      skill: "DET-OBSERVASI",
      title: "Kasus Expert: Sabotase Pameran Sains",
      story: scienceFairCase,
      objective: "Membedakan petunjuk kuat, petunjuk lemah, dan pengecoh dalam kasus sabotase.",
      instruction: "Baca berkas kasus di setiap soal. Nilai setiap temuan sebelum menghubungkannya.",
      hints: [
        "Potongan rapi dan putus biasa meninggalkan bekas yang berbeda.",
        "Pengecoh terlihat menarik tetapi belum tentu berhubungan dengan kejadian.",
        "Log pintu menunjukkan kartu, belum tentu orangnya.",
      ],
      caseText: scienceFairCase,
      questions: [
        S("Temuan yang paling menunjukkan kabel dirusak dengan sengaja adalah...", "Kabel terpotong rapi", [
          "Serbuk kayu di lantai",
          "Lampu aula padam",
          "Meja tim sebelah bersebelahan",
        ]),
        S("Serbuk kayu paling tepat diperlakukan sebagai...", "Petunjuk yang mungkin berasal dari proyek tetangga dan perlu dicek hubungannya", [
          "Bukti bahwa tim sebelah pelakunya",
          "Detail yang pasti tidak penting",
          "Bukti bahwa kabel putus sendiri",
        ]),
        B("Akses kartu panitia pukul 19.40 terjadi saat lampu aula sedang padam.", true),
        M("Pilih semua pemeriksaan lanjutan yang paling berguna.", [
          "Memeriksa bekas potongan untuk dicocokkan dengan jenis alat",
          "Memeriksa siapa yang memegang kartu panitia malam itu",
          "Memeriksa barang yang tertinggal di sekitar meja Nara",
        ], ["Mengukur luas aula", "Menghitung pengunjung pameran besok"]),
        S("Gunting kabel lab yang bersih di rak berarti...", "Belum tentu dipakai; alat lain juga bisa memotong rapi", [
          "Pasti alat yang dipakai pelaku",
          "Membuktikan tidak ada sabotase",
          "Membuktikan pelakunya orang lab",
        ]),
        S("Hal yang PALING perlu dicari tahu tentang akses pukul 19.40 adalah...", "Siapa yang memegang kartu panitia itu dan untuk apa masuk", [
          "Warna kartu panitia",
          "Berapa lama pemadaman direncanakan",
          "Nama proyek terbaik",
        ]),
        S("Temuan yang paling mungkin menjadi pengecoh adalah...", "Serbuk kayu, jika ternyata berasal dari proyek tetangga yang dikerjakan siang hari", [
          "Kabel yang terpotong rapi",
          "Log pintu pukul 19.40",
          "Proyek yang rusak",
        ]),
        X("Pasangkan temuan dengan maknanya.", [
          ["Kabel terpotong rapi", "Mengarah ke tindakan sengaja"],
          ["Log pintu 19.40", "Ada akses pada malam kejadian"],
          ["Pemadaman 19.30-20.00", "Kondisi gelap saat akses"],
          ["Serbuk kayu", "Petunjuk yang perlu dicek asalnya"],
        ]),
        O("Urutkan langkah observasi expert untuk kasus ini.", [
          "Amankan meja dan jangan sentuh kabel",
          "Dokumentasikan semua temuan dengan foto dan ukuran",
          "Periksa detail kecil seperti bekas potongan dan serbuk",
          "Hubungkan temuan dengan log pintu dan jadwal pemadaman",
        ]),
        S("Kesimpulan observasi yang paling tepat adalah...", "Ada indikasi kuat sabotase; akses pukul 19.40 perlu diselidiki, tetapi pelaku belum dapat ditentukan", [
          "Tim sebelah pelakunya karena ada serbuk kayu",
          "Kabel putus akibat pemadaman listrik",
          "Panitia pasti pelakunya",
        ]),
      ],
    },
    {
      code: "DET-L5-MEM",
      skill: "DET-MEMORI",
      title: "Kasus Expert: Tiga Saksi, Satu Pertandingan",
      story: threeWitnessCase,
      objective: "Menilai dan menggabungkan tiga kesaksian dengan kualitas ingatan yang berbeda.",
      instruction: "Perhatikan kapan setiap saksi diwawancarai dan informasi apa yang mungkin mempengaruhinya.",
      hints: [
        "Wawancara yang cepat biasanya menghasilkan ingatan yang lebih murni.",
        "Kabar di grup bisa mencemari ingatan saksi.",
        "Tulis deskripsi hanya sejauh yang disepakati saksi-saksi yang kuat.",
      ],
      caseText: threeWitnessCase,
      questions: [
        S("Kesaksian mana yang paling sedikit terpengaruh informasi dari luar?", "Saksi 1, karena diwawancarai 10 menit setelah kejadian", [
          "Saksi 2, karena punya waktu paling lama untuk berpikir",
          "Saksi 3, karena ia pemain",
          "Semuanya sama",
        ]),
        S("Mengapa kesaksian Saksi 2 perlu diberi bobot lebih rendah?", "Ia diwawancarai setelah membaca kabar 'jaket hitam' di grup", [
          "Karena ia hanya penonton",
          "Karena ia tidak suka pelatih",
          "Karena ia menyebut tas",
        ]),
        B("'Jaket abu-abu' dari Saksi 1 dan 'jaket gelap' dari Saksi 3 bisa saja menggambarkan jaket yang sama.", true),
        S("Perbedaan antara 'babak kedua' dan 'jeda babak' paling baik diselesaikan dengan...", "Mencocokkan dengan catatan waktu pertandingan dan rekaman yang ada", [
          "Memilih versi yang paling sering disebut",
          "Mengabaikan keterangan waktu",
          "Menanyakan pendapat penonton lain yang tidak melihat",
        ]),
        M("Pilih semua detail yang cukup konsisten di antara saksi yang kuat.", [
          "Ada seseorang di sekitar ruang ganti",
          "Jaketnya berwarna gelap atau abu-abu",
          "Kejadian sekitar pertengahan pertandingan",
        ], ["Orang itu membawa tas", "Wajah orang itu terlihat jelas"]),
        S("Detail 'membawa botol' dan 'membawa tas' sebaiknya...", "Dicatat sebagai perbedaan dan dicek dengan bukti lain", [
          "Dianggap botol karena disebut lebih dulu",
          "Dianggap tas karena lebih besar",
          "Dihapus dari laporan",
        ]),
        S("Kesalahan terbesar jika detektif hanya memakai keterangan Saksi 2 adalah...", "Mengikuti ingatan yang mungkin sudah tercemar kabar di grup", [
          "Terlalu banyak bukti",
          "Mengabaikan pelatih",
          "Laporan menjadi terlalu pendek",
        ]),
        X("Pasangkan sumber dengan penilaian kesaksiannya.", [
          ["Saksi 1", "Paling segar, diwawancarai cepat"],
          ["Saksi 2", "Kemungkinan terpengaruh kabar grup"],
          ["Saksi 3", "Jujur tentang batas pengamatannya"],
          ["Kabar di grup sekolah", "Bukan kesaksian langsung"],
        ]),
        O("Urutkan sumber dari yang PALING dapat diandalkan.", [
          "Saksi 1",
          "Saksi 3",
          "Saksi 2",
          "Kabar di grup sekolah",
        ]),
        S("Deskripsi yang paling aman ditulis di laporan adalah...", "Orang berjaket gelap atau abu-abu di sekitar ruang ganti pada pertengahan pertandingan; wajah tidak terlihat", [
          "Orang berjaket hitam yang membawa tas",
          "Pemain cadangan tim lawan",
          "Penjaga ruang ganti",
        ]),
      ],
    },
    {
      code: "DET-L5-KRO",
      skill: "DET-KRONOLOGI",
      title: "Kasus Expert: Rekonstruksi Satu Jam",
      story: savingsCase,
      objective: "Merekonstruksi kejadian dari beberapa sumber waktu, termasuk mengoreksi jam yang tidak akurat.",
      instruction: "Gabungkan semua sumber, perhatikan koreksi jam CCTV, dan tandai celah yang belum terjelaskan.",
      hints: [
        "Jam CCTV lebih cepat 3 menit: kurangi 3 menit untuk mendapat jam asli.",
        "Pastikan tidak ada jalan masuk lain sebelum memakai CCTV sebagai daftar lengkap.",
        "Pesan Lia menimbulkan pertanyaan: dari mana ia tahu?",
      ],
      caseText: savingsCase,
      questions: [
        T("Susun kejadian dari yang paling awal (gunakan jam seperti tertulis di berkas).", [
          ["09.55", "Bendahara memotret uang di lemari"],
          ["10.07", "Zaki masuk kelas"],
          ["10.12", "Petugas kebersihan masuk kelas"],
          ["10.15", "Lia menulis 'lemari kok kebuka?' di grup"],
          ["10.30", "Uang diketahui hilang"],
        ]),
        S("Karena jam CCTV lebih cepat 3 menit, jam asli Zaki masuk kelas adalah...", "10.04", ["10.10", "10.07", "10.01"]),
        S("Pesan Lia pukul 10.15 penting karena...", "Menunjukkan lemari mungkin sudah terbuka sebelum 10.15, dan Lia perlu ditanya dari mana ia tahu", [
          "Membuktikan Lia pelakunya",
          "Tidak penting karena Lia ada di kantin",
          "Membuktikan uang hilang tepat pukul 10.30",
        ]),
        B("Menurut rekaman CCTV lorong, hanya dua orang yang terekam masuk kelas selama istirahat.", true),
        M("Pilih semua pertanyaan yang harus dijawab untuk melengkapi rekonstruksi.", [
          "Dari mana Lia tahu lemari terbuka padahal ia di kantin?",
          "Apakah ada pintu atau jendela lain yang tidak terekam CCTV?",
          "Apakah lemari dalam keadaan terkunci saat difoto pukul 09.55?",
        ], ["Apa merek botol minum Zaki?", "Berapa lama istirahat tahun lalu?"]),
        S("Mengapa perlu dipastikan bahwa tidak ada jalan masuk lain ke kelas?", "Jika ada, orang lain bisa masuk tanpa terekam sehingga timeline dari CCTV tidak lengkap", [
          "Agar CCTV terlihat lebih mahal",
          "Karena Zaki pasti lewat jalan lain",
          "Tidak perlu, CCTV sudah pasti lengkap",
        ]),
        S("Rentang waktu hilangnya uang yang paling didukung bukti adalah...", "Antara foto pukul 09.55 dan saat ditemukan hilang pukul 10.30", [
          "Hanya antara 10.07-10.09",
          "Hanya antara 10.12-10.20",
          "Sebelum pukul 09.55",
        ]),
        S("Kesimpulan yang PALING TIDAK adil adalah...", "Petugas kebersihan pelakunya karena keluar membawa kantong sampah", [
          "Perlu klarifikasi dari Zaki, petugas kebersihan, dan Lia",
          "Timeline masih punya celah yang harus diperiksa",
          "Jam CCTV perlu dikoreksi 3 menit",
        ]),
        X("Pasangkan bukti dengan fungsinya dalam rekonstruksi.", [
          ["Foto pukul 09.55", "Batas awal: uang masih ada"],
          ["CCTV lorong", "Siapa yang masuk dan keluar kelas"],
          ["Pesan Lia pukul 10.15", "Petunjuk lemari sudah terbuka"],
          ["Bel pukul 10.30", "Batas akhir: uang diketahui hilang"],
        ]),
        O("Urutkan langkah rekonstruksi yang benar.", [
          "Kumpulkan semua data waktu dari setiap sumber",
          "Samakan jam antarsumber (koreksi selisih)",
          "Susun timeline gabungan dan tandai celahnya",
          "Uji setiap penjelasan terhadap timeline",
        ]),
      ],
    },
    {
      code: "DET-L5-SUM",
      skill: "DET-SUMBER",
      title: "Kasus Expert: Hoaks di Grup Sekolah",
      story: hoaxCase,
      objective: "Membongkar konten keluar konteks dengan verifikasi sumber, detail visual, dan kepentingan pengunggah.",
      instruction: "Nilai setiap temuan: apakah ia membuktikan, melemahkan, atau tidak berkaitan dengan klaim video?",
      hints: [
        "Jumlah pembagian bukan bukti kebenaran.",
        "Rekaman yang sama di berita lama adalah bukti yang sangat kuat.",
        "Periksa apakah pengunggah punya kepentingan.",
      ],
      caseText: hoaxCase,
      questions: [
        S("Temuan yang paling kuat membuktikan klaim video itu salah adalah...", "Rekaman yang sama ditemukan di berita tiga tahun lalu dari kota lain", [
          "Ribuan orang membagikannya",
          "Durasi video hanya 20 detik",
          "Judulnya memakai tanda seru",
        ]),
        S("Temuan (4) menunjukkan bahwa pengunggah...", "Mungkin punya kepentingan untuk menjelekkan sekolah itu", [
          "Pasti orang yang jujur",
          "Adalah wartawan resmi",
          "Tidak berhubungan dengan kasus",
        ]),
        B("Karena sudah dibagikan ribuan orang, video itu kemungkinan besar benar.", false),
        M("Pilih semua tanda bahwa video ini hoaks atau keluar konteks.", [
          "Seragam di video berbeda dari seragam sekolah yang dituduh",
          "Rekaman lama dari kota lain diberi judul baru",
          "Diunggah pertama kali oleh akun baru tanpa identitas",
        ], ["Durasinya pendek", "Banyak orang berkomentar"]),
        S("Istilah yang paling tepat untuk kasus ini adalah...", "Konten keluar konteks: rekaman lama diberi keterangan baru yang salah", [
          "Berita resmi",
          "Kesaksian langsung",
          "Dokumen primer",
        ]),
        S("Tindakan paling bertanggung jawab bagi siswa yang menerima video ini adalah...", "Tidak ikut membagikan, menyampaikan fakta yang ditemukan, dan melapor ke guru", [
          "Membagikannya dengan tulisan 'benar nggak nih?'",
          "Membalas dengan menjelekkan akun pengunggah",
          "Menyebarkan data pribadi pengunggah",
        ]),
        S("Untuk memastikan lebih jauh, sumber terbaik untuk dihubungi adalah...", "Media yang memuat berita asli tiga tahun lalu dan pihak sekolah", [
          "Akun pengunggah",
          "Kolom komentar",
          "Teman yang pertama kali mengirim video",
        ]),
        X("Pasangkan temuan dengan cara memverifikasinya.", [
          ["Rekaman yang sama di berita lama", "Pencarian gambar atau video terbalik"],
          ["Seragam yang berbeda", "Membandingkan detail visual"],
          ["Akun baru tanpa identitas", "Memeriksa profil pengunggah"],
          ["Klaim 'kemarin'", "Mencocokkan tanggal dengan sumber asli"],
        ]),
        O("Urutkan langkah verifikasi konten viral.", [
          "Tahan diri untuk tidak membagikan",
          "Periksa siapa pengunggah pertama",
          "Cek detail dan cari versi asli kontennya",
          "Tarik kesimpulan dan sampaikan fakta dengan sopan",
        ]),
        S("Kesimpulan akhir yang paling tepat adalah...", "Klaim video salah: rekaman lama dari kota lain diberi judul baru, dan unggahannya perlu dilaporkan ke platform", [
          "Video benar karena sudah viral",
          "Belum ada satu pun bukti tentang video itu",
          "SMP Harapan pasti merusak taman",
        ]),
      ],
    },
    {
      code: "DET-L5-NAL",
      skill: "DET-PENALARAN",
      title: "Kasus Expert: Misteri Kebun Sekolah",
      story: gardenCase,
      objective: "Memilih hipotesis terkuat di antara beberapa penyebab, merancang uji, dan memberi rekomendasi berbasis bukti.",
      instruction: "Nilai setiap data: mendukung, melemahkan, atau netral terhadap setiap hipotesis.",
      hints: [
        "Cari data yang membedakan petak yang berhasil dan yang gagal.",
        "Penyebab bisa lebih dari satu: utama dan tambahan.",
        "Rekomendasi yang baik memperbaiki sistem, bukan mencari kambing hitam.",
      ],
      caseText: gardenCase,
      questions: [
        S("Hipotesis yang paling didukung SEMUA data adalah...", "Tanaman kekurangan air karena hujan sedikit dan penyiraman terhenti", [
          "Pupuk yang dipakai salah",
          "Hama ulat menyerang semua petak",
          "Tanah sekolah berubah menjadi beracun",
        ]),
        S("Data mana yang paling MEMBEDAKAN hipotesis 'kekurangan air' dari hipotesis lain?", "Petak dekat keran normal, sedangkan petak yang jauh turun drastis", [
          "Pupuk sama seperti tahun lalu",
          "Ada laporan hama",
          "Panen turun 60%",
        ]),
        B("Hama ulat bisa menjelaskan turunnya panen di seluruh kebun.", false),
        S("Data (2) 'pupuk sama seperti tahun lalu' berguna untuk...", "Melemahkan hipotesis bahwa pupuk adalah penyebabnya", [
          "Membuktikan hama adalah penyebabnya",
          "Membuktikan hujan sedikit",
          "Tidak berguna sama sekali",
        ]),
        M("Pilih semua uji yang bisa memperkuat hipotesis kekurangan air.", [
          "Mengukur kelembapan tanah di petak dekat dan jauh dari keran",
          "Membandingkan tanggal penyiraman dengan pertumbuhan tanaman",
          "Menyiram rutin satu petak yang jauh lalu membandingkan hasilnya",
        ], ["Mengganti merek pupuk di semua petak", "Menanyakan siswa mana yang malas"]),
        S("Penjelasan penyebab yang paling masuk akal adalah...", "Kekurangan air sebagai penyebab utama, ditambah hama di 2 petak", [
          "Hanya hama",
          "Hanya pupuk",
          "Tidak ada penyebab yang jelas",
        ]),
        S("Kesalahan berpikir jika langsung menyalahkan 'siswa yang malas menyiram' adalah...", "Mengabaikan penyebab sistem, yaitu jadwal ujian yang menghentikan penyiraman", [
          "Terlalu banyak memakai data",
          "Terlalu memperhatikan hujan",
          "Tidak ada kesalahan",
        ]),
        X("Pasangkan data dengan pengaruhnya pada hipotesis.", [
          ["Hujan 40% lebih sedikit", "Mendukung dugaan kekurangan air"],
          ["Pupuk sama seperti tahun lalu", "Melemahkan dugaan pupuk"],
          ["Hama di 2 dari 10 petak", "Hanya menjelaskan sebagian kecil"],
          ["Petak dekat keran normal", "Pembeda: air adalah kuncinya"],
        ]),
        O("Urutkan langkah analisis expert.", [
          "Kumpulkan data dari semua petak",
          "Susun semua hipotesis yang mungkin",
          "Nilai setiap data: mendukung, melemahkan, atau netral",
          "Rancang uji untuk hipotesis terkuat",
        ]),
        S("Rekomendasi terbaik untuk semester depan adalah...", "Membuat jadwal siram bergilir yang tetap berjalan saat ujian dan menyambungkan selang ke petak yang jauh", [
          "Mengganti semua pupuk",
          "Menghentikan kegiatan kebun sekolah",
          "Menghukum petugas piket",
        ]),
      ],
    },
    {
      code: "DET-L5-ETI",
      skill: "DET-ETIKA",
      title: "Kasus Expert: Keputusan Akhir yang Adil",
      story: posterCase,
      objective: "Memimpin penyelidikan secara adil di bawah tekanan: memverifikasi alibi, menolak tuduhan tanpa bukti, dan menulis kesimpulan profesional.",
      instruction: "Setiap keputusan harus berdasar bukti, melindungi hak semua pihak, dan tahan terhadap tekanan.",
      hints: [
        "Pernah berdebat bukan bukti.",
        "Alibi yang kuat tetap perlu diverifikasi.",
        "Desakan dari pihak yang berkepentingan perlu dicatat.",
      ],
      caseText: posterCase,
      questions: [
        S("Desakan Ketua OSIS untuk menyebut Kevin sebaiknya dihadapi dengan...", "Tetap berpegang pada bukti dan menjelaskan bahwa belum ada bukti yang menunjuk Kevin", [
          "Menyebut Kevin agar Ketua OSIS senang",
          "Menolak berbicara dengan Ketua OSIS",
          "Menghukum semua anggota futsal",
        ]),
        S("Struk bimbel Kevin pukul 16.30-18.00 berarti...", "Kevin punya alibi kuat untuk pukul 17.10 yang perlu dicek keasliannya", [
          "Kevin pasti pelakunya",
          "Struk itu tidak ada artinya",
          "Kevin pasti menyuruh orang lain",
        ]),
        B("Jaket klub futsal di CCTV sudah cukup untuk menuduh salah satu anggota futsal.", false),
        M("Pilih semua tindakan yang adil dan profesional.", [
          "Memverifikasi struk bimbel Kevin ke tempat bimbel",
          "Memeriksa apakah jaket futsal bisa dipinjam atau dimiliki orang lain",
          "Mencatat desakan Ketua OSIS sebagai potensi konflik kepentingan",
        ], ["Mengumumkan bahwa pelakunya anak futsal", "Memaksa Kevin mengaku"]),
        S("Mengapa desakan Ketua OSIS perlu dicatat dalam laporan?", "Karena ada potensi konflik kepentingan yang bisa mempengaruhi keadilan penyelidikan", [
          "Agar Ketua OSIS dihukum",
          "Agar laporan lebih panjang",
          "Tidak perlu dicatat",
        ]),
        S("Spidol biru di tempat sampah sebaiknya...", "Diamankan dan diperiksa, misalnya dicocokkan warna tintanya dan dicari pemiliknya", [
          "Dibuang karena kotor",
          "Dijadikan bukti bahwa Kevin pelakunya",
          "Dipakai untuk menulis laporan",
        ]),
        S("Kalimat kesimpulan yang paling profesional adalah...", "Poster dicoret sekitar pukul 17.10 oleh orang berjaket futsal; identitasnya belum dapat ditentukan; alibi Kevin sedang diverifikasi.", [
          "Pelakunya Kevin karena pernah berdebat dengan Ketua OSIS.",
          "Klub futsal harus dibubarkan.",
          "Kasus ditutup karena CCTV buram.",
        ]),
        X("Pasangkan prinsip dengan penerapannya dalam kasus ini.", [
          ["Praduga tak bersalah", "Kevin tidak dituduh tanpa bukti"],
          ["Objektivitas", "Keputusan tidak mengikuti desakan Ketua OSIS"],
          ["Verifikasi", "Struk bimbel dicek ke tempat bimbel"],
          ["Kerahasiaan", "Nama yang diperiksa tidak diumumkan"],
        ]),
        O("Urutkan langkah menyelesaikan kasus ini secara adil.", [
          "Amankan bukti: rekaman CCTV dan spidol",
          "Verifikasi alibi dan kepemilikan jaket",
          "Wawancarai saksi secara netral dan terpisah",
          "Tulis laporan dengan batas kepastian dan rekomendasi",
        ]),
        S("Rekomendasi pencegahan yang paling tepat adalah...", "Memperbaiki kualitas CCTV di area mading dan membuat jadwal pengawasan mading", [
          "Melarang jaket futsal di sekolah",
          "Menghapus mading sekolah",
          "Menghukum Kevin sebagai contoh",
        ]),
      ],
    },
  ],
};

export const detectiveQuestLevels: DetectiveLevel[] = [level1, level2, level3, level4, level5];
