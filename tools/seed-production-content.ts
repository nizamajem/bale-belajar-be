import {
  MissionStatus,
  Prisma,
  PrismaClient,
  QuestionStatus,
  QuestQuestionType,
} from "@prisma/client";

const prisma = new PrismaClient();

type WorldSeed = {
  key: string;
  name: string;
  subjectCode: string;
  subjectName: string;
  characterClass: string;
  themeDescription: string;
  orderNumber: number;
  chapter: {
    code: string;
    title: string;
    story: string;
    goal: string;
  };
  competency: {
    code: string;
    name: string;
    description: string;
    gradeLevel?: number;
  };
  quests: Array<{
    code: string;
    title: string;
    story: string;
    objective: string;
    instruction: string;
    type?: QuestQuestionType;
    question: string;
    options?: Array<{ id: string; label: string; correct: boolean }>;
    codeConfig?: {
      language: string;
      initialCode: string;
      expectedOutput: string;
      testCases: Prisma.InputJsonValue;
    };
  }>;
};

type SeedQuestion = {
  code: string;
  question: string;
  instruction: string;
  options: Array<{ id: string; label: string; correct: boolean }>;
};

const worlds: WorldSeed[] = [
  {
    key: "numeria",
    name: "Numeria",
    subjectCode: "MTK",
    subjectName: "Matematika",
    characterClass: "Arsitek Logika",
    themeDescription: "Latihan matematika lewat teka-teki ringan.",
    orderNumber: 1,
    chapter: {
      code: "NUM-CH-001",
      title: "Gerbang Distribusi",
      story:
        "Babe membuka gerbang angka pertama dan mengajakmu mengenali pola dasar.",
      goal: "Memahami operasi dasar dan pola sederhana.",
    },
    competency: {
      code: "NUM-POLA-DASAR",
      name: "Pola dan Operasi Dasar",
      description: "Mengenali pola, operasi hitung, dan alasan sederhana.",
      gradeLevel: 7,
    },
    quests: [
      {
        code: "NUM-QST-001",
        title: "Pola Angka Pertama",
        story: "Urutan angka di papan desa hilang satu.",
        objective: "Menentukan angka berikutnya dari pola sederhana.",
        instruction: "Pilih jawaban yang melanjutkan pola.",
        question: "Pola 2, 4, 6, 8, ... dilanjutkan dengan angka berapa?",
        options: [
          { id: "A", label: "9", correct: false },
          { id: "B", label: "10", correct: true },
          { id: "C", label: "12", correct: false },
          { id: "D", label: "16", correct: false },
        ],
      },
      {
        code: "NUM-QST-002",
        title: "Gerbang Penjumlahan",
        story: "Dua batu angka harus digabung agar gerbang terbuka.",
        objective: "Menghitung penjumlahan cepat.",
        instruction: "Pilih hasil yang tepat.",
        question: "Berapakah 18 + 7?",
        options: [
          { id: "A", label: "23", correct: false },
          { id: "B", label: "24", correct: false },
          { id: "C", label: "25", correct: true },
          { id: "D", label: "26", correct: false },
        ],
      },
      {
        code: "NUM-QST-003",
        title: "Kunci Perkalian",
        story: "Kunci kuning hanya cocok dengan hasil perkalian yang benar.",
        objective: "Menggunakan perkalian dasar.",
        instruction: "Pilih hasil perkalian.",
        question: "Berapakah 6 x 7?",
        options: [
          { id: "A", label: "36", correct: false },
          { id: "B", label: "42", correct: true },
          { id: "C", label: "48", correct: false },
          { id: "D", label: "49", correct: false },
        ],
      },
      {
        code: "NUM-QST-004",
        title: "Angka yang Hilang",
        story: "Satu angka terhapus dari papan misi.",
        objective: "Mencari nilai yang belum diketahui.",
        instruction: "Pilih nilai x.",
        question: "Jika x + 9 = 15, maka x adalah...",
        options: [
          { id: "A", label: "4", correct: false },
          { id: "B", label: "5", correct: false },
          { id: "C", label: "6", correct: true },
          { id: "D", label: "7", correct: false },
        ],
      },
      {
        code: "NUM-QST-005",
        title: "Bandingkan Nilai",
        story: "Dua peti angka harus dibandingkan sebelum dibuka.",
        objective: "Membandingkan bilangan sederhana.",
        instruction: "Pilih pernyataan yang benar.",
        question: "Manakah yang benar?",
        options: [
          { id: "A", label: "35 lebih besar dari 53", correct: false },
          { id: "B", label: "53 lebih besar dari 35", correct: true },
          { id: "C", label: "35 sama dengan 53", correct: false },
          { id: "D", label: "53 lebih kecil dari 35", correct: false },
        ],
      },
    ],
  },
  {
    key: "detectivia",
    name: "Detectivia",
    subjectCode: "DETEKTIF",
    subjectName: "Deteksi & Logika",
    characterClass: "Bale Sleuth",
    themeDescription: "Observasi dan analisis bukti lewat kasus ringan.",
    orderNumber: 2,
    chapter: {
      code: "DET-CH-001",
      title: "Kamp Observasi",
      story: "Babe mengajakmu melihat petunjuk kecil sebelum menyimpulkan.",
      goal: "Membedakan fakta, asumsi, dan bukti pendukung.",
    },
    competency: {
      code: "DET-OBS-DASAR",
      name: "Observasi Bukti Dasar",
      description: "Mengamati detail dan menyimpulkan berdasarkan bukti.",
      gradeLevel: 7,
    },
    quests: [
      {
        code: "DET-QST-001",
        title: "Fakta atau Dugaan",
        story: "Ada jejak sepatu di dekat taman sekolah.",
        objective: "Membedakan fakta dan dugaan.",
        instruction: "Pilih pernyataan yang benar-benar fakta.",
        question: "Manakah yang termasuk fakta?",
        options: [
          { id: "A", label: "Pelakunya pasti berlari.", correct: false },
          { id: "B", label: "Ada jejak sepatu di tanah basah.", correct: true },
          { id: "C", label: "Pemilik sepatu pasti bersalah.", correct: false },
          { id: "D", label: "Semua orang panik.", correct: false },
        ],
      },
      {
        code: "DET-QST-002",
        title: "Bukti Terkuat",
        story: "Tiga bukti ditemukan di ruang kelas.",
        objective: "Memilih bukti paling kuat.",
        instruction: "Pilih bukti yang paling bisa dicek.",
        question: "Bukti mana yang paling kuat?",
        options: [
          { id: "A", label: "Rumor dari koridor.", correct: false },
          { id: "B", label: "Catatan waktu dari kamera.", correct: true },
          { id: "C", label: "Tebakan teman.", correct: false },
          { id: "D", label: "Perasaan saksi.", correct: false },
        ],
      },
      {
        code: "DET-QST-003",
        title: "Kesimpulan Adil",
        story: "Seseorang terlihat dekat lemari sebelum barang hilang.",
        objective: "Menghindari tuduhan tanpa bukti cukup.",
        instruction: "Pilih kesimpulan yang paling adil.",
        question: "Kesimpulan mana yang paling aman?",
        options: [
          { id: "A", label: "Dia pasti mengambil barang.", correct: false },
          {
            id: "B",
            label: "Dia perlu ditanya karena berada di dekat lemari.",
            correct: true,
          },
          { id: "C", label: "Semua saksi salah.", correct: false },
          { id: "D", label: "Kasus selesai.", correct: false },
        ],
      },
      {
        code: "DET-QST-004",
        title: "Urutan Kejadian",
        story: "Bel, chat, dan foto memberi petunjuk waktu.",
        objective: "Menggunakan waktu sebagai jangkar kronologi.",
        instruction: "Pilih bukti yang membantu menyusun urutan.",
        question: "Bukti apa yang paling membantu menyusun kronologi?",
        options: [
          { id: "A", label: "Warna tas.", correct: false },
          { id: "B", label: "Jam pada log pintu.", correct: true },
          { id: "C", label: "Komentar lucu teman.", correct: false },
          { id: "D", label: "Ukuran ruangan.", correct: false },
        ],
      },
      {
        code: "DET-QST-005",
        title: "Pertanyaan Netral",
        story: "Saksi belum yakin dengan ciri orang yang dilihat.",
        objective: "Memilih pertanyaan yang tidak menuduh.",
        instruction: "Pilih pertanyaan paling netral.",
        question: "Pertanyaan mana yang paling netral untuk saksi?",
        options: [
          { id: "A", label: "Kamu yakin dia pelakunya, kan?", correct: false },
          {
            id: "B",
            label: "Apa saja yang kamu lihat saat itu?",
            correct: true,
          },
          { id: "C", label: "Kenapa kamu tidak mengejar dia?", correct: false },
          { id: "D", label: "Dia terlihat bersalah?", correct: false },
        ],
      },
    ],
  },
  {
    key: "kodex",
    name: "KodeX",
    subjectCode: "KODEX",
    subjectName: "Informatika",
    characterClass: "Penyusun Algoritma",
    themeDescription: "Belajar logika komputer tanpa terasa berat.",
    orderNumber: 3,
    chapter: {
      code: "KDX-CH-001",
      title: "Langkah Algoritma",
      story:
        "Babe menyalakan terminal pertama dan mengajakmu menyusun instruksi.",
      goal: "Mengenal urutan, kondisi, dan kode sederhana.",
    },
    competency: {
      code: "KDX-ALG-DASAR",
      name: "Algoritma Dasar",
      description: "Menyusun langkah logis dan membaca kode sederhana.",
      gradeLevel: 7,
    },
    quests: [
      {
        code: "KDX-QST-001",
        title: "Urutan Instruksi",
        story: "Robot kecil harus diberi perintah yang runtut.",
        objective: "Mengenali urutan algoritma.",
        instruction: "Pilih langkah pertama.",
        question:
          "Untuk membuat teh, langkah pertama yang paling tepat adalah...",
        options: [
          { id: "A", label: "Minum teh.", correct: false },
          { id: "B", label: "Siapkan gelas.", correct: true },
          { id: "C", label: "Buang gelas.", correct: false },
          { id: "D", label: "Matikan lampu.", correct: false },
        ],
      },
      {
        code: "KDX-QST-002",
        title: "Kondisi Jika",
        story: "Pintu digital hanya terbuka jika kode benar.",
        objective: "Memahami kondisi if.",
        instruction: "Pilih arti kondisi.",
        question: "Arti dari 'jika hujan, pakai payung' adalah...",
        options: [
          { id: "A", label: "Selalu pakai payung.", correct: false },
          { id: "B", label: "Pakai payung hanya saat hujan.", correct: true },
          { id: "C", label: "Tidak pernah pakai payung.", correct: false },
          { id: "D", label: "Hujan selalu berhenti.", correct: false },
        ],
      },
      {
        code: "KDX-QST-003",
        title: "Output Kode",
        story: "Terminal menampilkan hasil dari perintah kecil.",
        objective: "Memprediksi output sederhana.",
        instruction: "Pilih output program.",
        question: "Jika program menjalankan print('Bale'), outputnya adalah...",
        options: [
          { id: "A", label: "Bale", correct: true },
          { id: "B", label: "print", correct: false },
          { id: "C", label: "Error selalu", correct: false },
          { id: "D", label: "Kosong", correct: false },
        ],
      },
      {
        code: "KDX-QST-004",
        title: "Perbaiki Variabel",
        story: "Kode singkat perlu dilengkapi agar menampilkan sapaan.",
        objective: "Menulis potongan kode sederhana.",
        instruction: "Lengkapi kode agar outputnya Halo Bale.",
        type: QuestQuestionType.CODE_INPUT,
        question:
          "Tulis kode Python yang menyimpan nama 'Bale' lalu mencetak 'Halo Bale'.",
        codeConfig: {
          language: "python",
          initialCode: 'nama = "Bale"\n# tulis kodemu di bawah ini\n',
          expectedOutput: "Halo Bale",
          testCases: [{ input: "", expectedOutput: "Halo Bale" }],
        },
      },
      {
        code: "KDX-QST-005",
        title: "Bug Sederhana",
        story: "Satu baris logika membuat robot salah jalan.",
        objective: "Mengenali bug sederhana.",
        instruction: "Pilih penyebab bug.",
        question:
          "Jika robot diminta maju 3 langkah tapi hanya maju 2, kemungkinan bug-nya adalah...",
        options: [
          {
            id: "A",
            label: "Jumlah pengulangan terlalu sedikit.",
            correct: true,
          },
          { id: "B", label: "Warna robot salah.", correct: false },
          { id: "C", label: "Nama robot terlalu panjang.", correct: false },
          { id: "D", label: "Layar terlalu terang.", correct: false },
        ],
      },
    ],
  },
];

const extraQuestionBanks: Record<string, SeedQuestion[]> = {
  "NUM-QST-001": [
    choice("Q2", "Pola 5, 10, 15, 20, ... dilanjutkan dengan angka berapa?", "Pilih angka berikutnya.", "25", ["22", "24", "30"]),
    choice("Q3", "Apa aturan pola 3, 6, 9, 12, ...?", "Pilih aturan yang paling tepat.", "Tambah 3", ["Tambah 2", "Kali 3", "Kurang 3"]),
    choice("Q4", "Pola 1, 4, 7, 10, ... memiliki beda tetap berapa?", "Pilih beda antar angka.", "3", ["2", "4", "7"]),
    choice("Q5", "Angka yang hilang pada 8, 11, __, 17 adalah...", "Isi angka yang hilang.", "14", ["12", "13", "15"]),
    choice("Q6", "Jika pola naik 4 dimulai dari 6, tiga angka pertama adalah...", "Pilih urutan yang benar.", "6, 10, 14", ["6, 9, 12", "4, 8, 12", "10, 14, 18"]),
    choice("Q7", "Pola 20, 18, 16, 14, ... dilanjutkan dengan angka berapa?", "Perhatikan pola menurun.", "12", ["10", "13", "15"]),
    choice("Q8", "Manakah urutan yang mengikuti pola tambah 5?", "Pilih pola yang konsisten.", "7, 12, 17, 22", ["7, 11, 16, 20", "5, 12, 19, 25", "8, 12, 16, 21"]),
    choice("Q9", "Pada pola 2, 4, 8, 16, ... aturan yang dipakai adalah...", "Pilih aturan pola.", "Kali 2", ["Tambah 2", "Kali 4", "Kurang 2"]),
    choice("Q10", "Angka berikutnya dari 100, 90, 80, 70, ... adalah...", "Pilih kelanjutan pola.", "60", ["50", "65", "80"]),
  ],
  "NUM-QST-002": [
    choice("Q2", "Berapakah 34 + 8?", "Hitung penjumlahan.", "42", ["40", "41", "43"]),
    choice("Q3", "Berapakah 27 + 15?", "Pilih hasil yang tepat.", "42", ["32", "41", "52"]),
    choice("Q4", "Jika kamu punya 19 koin lalu mendapat 6 koin lagi, totalnya...", "Hitung total koin.", "25", ["23", "24", "26"]),
    choice("Q5", "Berapakah 48 + 12?", "Gunakan strategi puluhan.", "60", ["50", "58", "62"]),
    choice("Q6", "15 + 16 sama dengan...", "Pilih hasil penjumlahan.", "31", ["29", "30", "32"]),
    choice("Q7", "Bilangan mana yang jika ditambah 9 menjadi 40?", "Cari bilangan awal.", "31", ["29", "30", "32"]),
    choice("Q8", "Berapakah 75 + 25?", "Pilih hasilnya.", "100", ["90", "95", "105"]),
    choice("Q9", "12 + 18 + 10 sama dengan...", "Jumlahkan bertahap.", "40", ["30", "38", "42"]),
    choice("Q10", "Cara cepat menghitung 49 + 11 adalah...", "Pilih strategi yang benar.", "50 + 10 = 60", ["40 + 10 = 50", "49 - 11 = 38", "49 x 11"]),
  ],
  "NUM-QST-003": [
    choice("Q2", "Berapakah 8 x 5?", "Pilih hasil perkalian.", "40", ["35", "45", "50"]),
    choice("Q3", "7 x 3 sama dengan...", "Hitung perkalian.", "21", ["18", "24", "28"]),
    choice("Q4", "Jika 4 kotak masing-masing berisi 6 batu, jumlah batu adalah...", "Gunakan perkalian.", "24", ["10", "20", "26"]),
    choice("Q5", "9 x 2 dapat dibaca sebagai...", "Pilih makna perkalian.", "9 kelompok berisi 2 atau 2 kelompok berisi 9", ["9 ditambah 2 saja", "9 dikurangi 2", "9 dibagi 2"]),
    choice("Q6", "Berapakah 6 x 6?", "Pilih hasilnya.", "36", ["30", "32", "42"]),
    choice("Q7", "5 x 7 memiliki hasil yang sama dengan...", "Pakai sifat pertukaran.", "7 x 5", ["7 + 5", "7 - 5", "5 x 5"]),
    choice("Q8", "Jika 3 baris kursi masing-masing 8 kursi, total kursi adalah...", "Hitung total.", "24", ["11", "21", "32"]),
    choice("Q9", "10 x 12 sama dengan...", "Pilih hasil perkalian.", "120", ["100", "112", "122"]),
    choice("Q10", "Perkalian yang hasilnya 48 adalah...", "Pilih pasangan faktor.", "6 x 8", ["5 x 8", "7 x 7", "9 x 4"]),
  ],
  "NUM-QST-004": [
    choice("Q2", "Jika x + 5 = 12, maka x adalah...", "Cari nilai x.", "7", ["5", "6", "8"]),
    choice("Q3", "Jika 20 - x = 13, maka x adalah...", "Cari bilangan yang dikurangi.", "7", ["6", "8", "9"]),
    choice("Q4", "Jika 3 x n = 18, maka n adalah...", "Gunakan pembagian.", "6", ["5", "7", "9"]),
    choice("Q5", "Jika a + 10 = 28, maka a adalah...", "Cari nilai a.", "18", ["16", "17", "20"]),
    choice("Q6", "Jika 2n = 14, maka n adalah...", "Cari setengah dari 14.", "7", ["6", "8", "12"]),
    choice("Q7", "Jika y - 4 = 9, maka y adalah...", "Balikkan operasi.", "13", ["5", "12", "14"]),
    choice("Q8", "Jika m/5 = 3, maka m adalah...", "Pilih nilai m.", "15", ["8", "10", "20"]),
    choice("Q9", "Kalimat 'suatu angka ditambah 6 hasilnya 11' ditulis sebagai...", "Pilih bentuk aljabar.", "x + 6 = 11", ["x - 6 = 11", "6x = 11", "x/6 = 11"]),
    choice("Q10", "Langkah pertama menyelesaikan x + 8 = 19 adalah...", "Pilih operasi balik.", "Kurangi 19 dengan 8", ["Tambah 19 dan 8", "Kali 19 dengan 8", "Bagi 8 dengan 19"]),
  ],
  "NUM-QST-005": [
    choice("Q2", "Manakah yang lebih besar?", "Bandingkan bilangan.", "81", ["18", "8", "80"]),
    choice("Q3", "Tanda yang tepat untuk 45 __ 54 adalah...", "Pilih tanda perbandingan.", "<", [">", "=", "+"]),
    choice("Q4", "Urutan dari kecil ke besar adalah...", "Pilih urutan benar.", "12, 21, 32", ["32, 21, 12", "21, 12, 32", "12, 32, 21"]),
    choice("Q5", "Bilangan 607 lebih besar dari...", "Pilih bilangan yang lebih kecil.", "570", ["670", "760", "706"]),
    choice("Q6", "Jika skor A = 88 dan skor B = 82, maka...", "Pilih pernyataan benar.", "Skor A lebih tinggi", ["Skor B lebih tinggi", "Skor sama", "Tidak bisa dibandingkan"]),
    choice("Q7", "Tanda yang tepat untuk 100 __ 99 adalah...", "Pilih tanda.", ">", ["<", "=", "-"]),
    choice("Q8", "Manakah bilangan terkecil?", "Bandingkan semua pilihan.", "305", ["350", "503", "530"]),
    choice("Q9", "Urutan 9, 19, 90 dari besar ke kecil adalah...", "Pilih urutan benar.", "90, 19, 9", ["9, 19, 90", "19, 90, 9", "90, 9, 19"]),
    choice("Q10", "Ketika membandingkan 456 dan 465, digit yang menentukan adalah...", "Pilih digit pembeda.", "Puluhan", ["Ratusan", "Satuan saja", "Tidak ada"]),
  ],
  "DET-QST-001": [
    choice("Q2", "Pernyataan mana yang termasuk dugaan?", "Bedakan fakta dan dugaan.", "Pelaku mungkin lewat pintu belakang.", ["Ada pintu belakang.", "Lantai basah.", "Ada foto pukul 08.10."]),
    choice("Q3", "Fakta harus bisa...", "Pilih ciri fakta.", "Diperiksa atau dibuktikan", ["Ditebak", "Disukai semua orang", "Mengikuti rumor"]),
    choice("Q4", "Kalimat 'tas merah ada di meja' termasuk...", "Klasifikasikan pernyataan.", "Fakta jika bisa diamati", ["Dugaan pasti", "Tuduhan", "Motif"]),
    choice("Q5", "Kalimat 'ia pasti marah' termasuk...", "Klasifikasikan pernyataan.", "Dugaan", ["Fakta langsung", "Bukti fisik", "Data waktu"]),
    choice("Q6", "Mengapa dugaan belum boleh jadi kesimpulan?", "Pilih alasan terbaik.", "Karena perlu bukti pendukung", ["Karena selalu salah", "Karena tidak menarik", "Karena terlalu pendek"]),
    choice("Q7", "Bukti yang paling dekat dengan fakta adalah...", "Pilih bukti observasi.", "Rekaman kamera", ["Gosip grup", "Tebakan teman", "Perasaan penyelidik"]),
    choice("Q8", "Saat melihat jejak sepatu, kesimpulan awal yang aman adalah...", "Pilih kesimpulan netral.", "Ada orang yang melewati tanah basah", ["Pemilik sepatu bersalah", "Semua saksi bohong", "Kasus selesai"]),
    choice("Q9", "Pernyataan 'gelas pecah di lantai' adalah...", "Klasifikasikan.", "Fakta pengamatan", ["Motif", "Tuduhan", "Dugaan emosi"]),
    choice("Q10", "Langkah setelah membuat dugaan adalah...", "Pilih langkah investigasi.", "Mencari bukti pendukung", ["Langsung menuduh", "Menghapus data", "Mengabaikan saksi"]),
  ],
  "DET-QST-002": [
    choice("Q2", "Bukti terkuat biasanya memiliki sifat...", "Pilih ciri bukti kuat.", "Bisa diverifikasi", ["Paling ramai dibicarakan", "Paling dramatis", "Paling cepat ditebak"]),
    choice("Q3", "Mana bukti yang paling lemah?", "Pilih bukti lemah.", "Katanya seseorang melihat sesuatu", ["Log waktu pintu", "Foto jelas", "Catatan absensi"]),
    choice("Q4", "Jika dua bukti bertentangan, sikap terbaik adalah...", "Pilih tindakan tepat.", "Periksa sumber dan waktunya", ["Pilih yang paling seru", "Buang semuanya", "Tutup kasus"]),
    choice("Q5", "Bukti foto menjadi lebih kuat jika...", "Pilih penguat bukti.", "Ada waktu dan lokasi jelas", ["Warnanya bagus", "Banyak stiker", "Filternya menarik"]),
    choice("Q6", "Catatan kamera pukul 09.00 termasuk...", "Klasifikasikan bukti.", "Bukti data waktu", ["Rumor", "Dugaan motif", "Pertanyaan"]),
    choice("Q7", "Mengapa bukti fisik perlu dijaga?", "Pilih alasan.", "Agar tidak berubah atau rusak", ["Agar terlihat rahasia saja", "Agar tidak perlu dicatat", "Agar saksi lupa"]),
    choice("Q8", "Bukti kuat harus relevan dengan...", "Pilih target relevansi.", "Pertanyaan kasus", ["Warna favorit", "Nama penyelidik", "Cuaca tahun lalu"]),
    choice("Q9", "Jika saksi berubah-ubah ceritanya, kita perlu...", "Pilih langkah.", "Mencocokkan dengan bukti lain", ["Percaya versi terakhir saja", "Langsung menolak semua bukti", "Mengganti topik"]),
    choice("Q10", "Contoh bukti digital adalah...", "Pilih contoh.", "Log akses aplikasi", ["Bau ruangan", "Ukuran meja", "Warna tembok"]),
  ],
  "DET-QST-003": [
    choice("Q2", "Kesimpulan adil harus berdasarkan...", "Pilih dasar kesimpulan.", "Bukti yang cukup", ["Rasa curiga", "Popularitas", "Kecepatan menjawab"]),
    choice("Q3", "Kalimat paling aman saat bukti belum lengkap adalah...", "Pilih kalimat.", "Data belum cukup untuk memastikan pelaku", ["Dia pasti pelaku", "Tidak perlu tanya lagi", "Semua bukti salah"]),
    choice("Q4", "Mengapa menuduh terlalu cepat berbahaya?", "Pilih alasan.", "Bisa salah dan merugikan orang", ["Membuat kasus terlalu mudah", "Selalu benar", "Tidak butuh bukti"]),
    choice("Q5", "Saat ada satu saksi, penyelidik sebaiknya...", "Pilih langkah.", "Mencari konfirmasi tambahan", ["Menutup kasus", "Mengabaikan bukti fisik", "Menyuruh saksi menebak"]),
    choice("Q6", "Kesimpulan 'mungkin terlibat' berarti...", "Pilih makna.", "Masih perlu bukti lanjut", ["Sudah pasti bersalah", "Bukti tidak penting", "Kasus tidak ada"]),
    choice("Q7", "Yang bukan kesimpulan adil adalah...", "Pilih pernyataan buruk.", "Dia bersalah karena tampak gugup", ["Ia berada di lokasi", "Perlu dimintai keterangan", "Belum ada bukti cukup"]),
    choice("Q8", "Sebelum menyimpulkan, data perlu...", "Pilih tindakan.", "Dibandingkan dari beberapa sumber", ["Dihapus", "Ditebak", "Dipilih yang paling pendek"]),
    choice("Q9", "Jika bukti hanya menunjukkan seseorang dekat lokasi, kesimpulan aman adalah...", "Pilih kesimpulan.", "Ia berada dekat lokasi", ["Ia pasti mengambil barang", "Ia pemimpin kasus", "Ia memalsukan semua bukti"]),
    choice("Q10", "Kata yang menunjukkan kehati-hatian adalah...", "Pilih kata.", "Kemungkinan", ["Pasti tanpa bukti", "Selalu", "Mustahil diperiksa"]),
  ],
  "DET-QST-004": [
    choice("Q2", "Kronologi berarti...", "Pilih definisi.", "Urutan kejadian berdasarkan waktu", ["Daftar tersangka", "Warna barang", "Perasaan saksi"]),
    choice("Q3", "Bukti terbaik untuk urutan waktu adalah...", "Pilih bukti.", "Timestamp foto", ["Ukuran sepatu", "Warna jaket", "Jenis tas"]),
    choice("Q4", "Jika A terjadi pukul 08.00 dan B pukul 08.15, maka...", "Pilih urutan.", "A terjadi sebelum B", ["B terjadi sebelum A", "A dan B sama", "Tidak ada urutan"]),
    choice("Q5", "Mengapa kronologi penting?", "Pilih alasan.", "Untuk melihat apakah cerita masuk akal", ["Untuk menghias laporan", "Untuk menambah rumor", "Untuk menghapus bukti"]),
    choice("Q6", "Jika saksi berkata melihat kejadian pukul 10.00 tetapi kamera menunjukkan lokasi kosong, maka...", "Pilih tindakan.", "Perlu cek ulang kesaksian", ["Saksi pasti benar", "Kamera pasti bohong", "Kasus selesai"]),
    choice("Q7", "Data yang tidak membantu kronologi adalah...", "Pilih data.", "Warna pulpen saksi", ["Jam masuk", "Log pintu", "Waktu pesan"]),
    choice("Q8", "Urutan 07.50, 08.10, 08.05 yang benar adalah...", "Pilih urutan naik.", "07.50, 08.05, 08.10", ["08.10, 08.05, 07.50", "08.05, 07.50, 08.10", "07.50, 08.10, 08.05"]),
    choice("Q9", "Alibi kuat jika...", "Pilih ciri alibi.", "Didukung bukti waktu dan lokasi", ["Hanya diucapkan keras", "Tidak bisa dicek", "Bertentangan dengan semua data"]),
    choice("Q10", "Saat menyusun timeline, mulai dari...", "Pilih langkah.", "Data waktu paling awal", ["Kesimpulan akhir", "Tebakan pelaku", "Komentar paling populer"]),
  ],
  "DET-QST-005": [
    choice("Q2", "Pertanyaan netral tidak boleh...", "Pilih ciri pertanyaan buruk.", "Menggiring jawaban", ["Membuka ruang cerita", "Meminta detail", "Menanyakan waktu"]),
    choice("Q3", "Mana pertanyaan paling netral?", "Pilih pertanyaan.", "Apa yang terjadi setelah bel berbunyi?", ["Dia pelakunya, ya?", "Kenapa kamu diam saja?", "Kamu pasti lupa, kan?"]),
    choice("Q4", "Pertanyaan terbuka berguna karena...", "Pilih alasan.", "Saksi bisa menjelaskan dengan lengkap", ["Membatasi jawaban", "Memaksa setuju", "Menghapus detail"]),
    choice("Q5", "Contoh pertanyaan menggiring adalah...", "Pilih contoh.", "Kamu melihat Raka mengambil buku itu, kan?", ["Apa yang kamu lihat?", "Kapan kamu tiba?", "Di mana kamu berdiri?"]),
    choice("Q6", "Saat saksi ragu, penyelidik sebaiknya...", "Pilih sikap.", "Meminta detail yang diingat tanpa memaksa", ["Memaksa menebak", "Mengubah jawaban saksi", "Menutup catatan"]),
    choice("Q7", "Pertanyaan 'Siapa saja yang ada di ruangan?' termasuk...", "Klasifikasikan.", "Netral", ["Menuduh", "Menggiring", "Tidak relevan selalu"]),
    choice("Q8", "Tujuan bertanya ke saksi adalah...", "Pilih tujuan.", "Mengumpulkan informasi", ["Membuat saksi takut", "Menentukan pelaku tanpa bukti", "Memenangkan debat"]),
    choice("Q9", "Jika jawaban saksi belum jelas, kita bisa...", "Pilih tindak lanjut.", "Meminta contoh atau detail tambahan", ["Mengarang detail sendiri", "Menghapus jawaban", "Langsung menyimpulkan"]),
    choice("Q10", "Pertanyaan yang baik biasanya...", "Pilih ciri.", "Singkat, jelas, dan tidak menuduh", ["Panjang dan membingungkan", "Memaksa jawaban tertentu", "Penuh ancaman"]),
  ],
  "KDX-QST-001": [
    choice("Q2", "Algoritma adalah...", "Pilih definisi.", "Langkah-langkah untuk menyelesaikan masalah", ["Nama komputer", "Warna layar", "Jenis kabel"]),
    choice("Q3", "Urutan yang benar untuk membuka aplikasi adalah...", "Pilih urutan logis.", "Nyalakan perangkat, cari aplikasi, buka aplikasi", ["Buka aplikasi, cari aplikasi, nyalakan perangkat", "Matikan perangkat, buka aplikasi, cari aplikasi", "Cari aplikasi, matikan perangkat, buka aplikasi"]),
    choice("Q4", "Mengapa urutan instruksi penting?", "Pilih alasan.", "Komputer mengikuti langkah sesuai urutan", ["Komputer selalu menebak", "Urutan tidak pernah berpengaruh", "Agar layar berwarna"]),
    choice("Q5", "Langkah pertama sebelum mengirim pesan adalah...", "Pilih langkah awal.", "Membuka aplikasi pesan", ["Menekan kirim dulu", "Menghapus kontak", "Mematikan internet selalu"]),
    choice("Q6", "Instruksi yang ambigu adalah...", "Pilih instruksi tidak jelas.", "Kerjakan itu nanti", ["Klik tombol masuk", "Ketik nama", "Simpan file"]),
    choice("Q7", "Robot akan salah jika instruksi...", "Pilih penyebab.", "Tidak lengkap atau tidak urut", ["Terlalu jelas", "Memiliki tujuan", "Ditulis singkat tapi tepat"]),
    choice("Q8", "Contoh langkah berurutan adalah...", "Pilih contoh.", "Ambil buku, buka halaman, baca paragraf", ["Baca paragraf, ambil buku, buka halaman", "Buka halaman tanpa buku", "Simpan buku sebelum diambil"]),
    choice("Q9", "Dalam algoritma, satu langkah sebaiknya...", "Pilih ciri.", "Jelas dan bisa dilakukan", ["Membingungkan", "Bertentangan", "Tidak punya aksi"]),
    choice("Q10", "Jika hasil salah, langkah yang perlu dicek adalah...", "Pilih tindakan.", "Urutan dan isi instruksi", ["Warna ikon saja", "Ukuran meja", "Nama kelas"]),
  ],
  "KDX-QST-002": [
    choice("Q2", "Kondisi if digunakan untuk...", "Pilih fungsi.", "Menjalankan aksi jika syarat terpenuhi", ["Menghapus semua data", "Mengganti warna saja", "Membuat komputer tidur"]),
    choice("Q3", "Jika nilai >= 75 maka lulus. Nilai 80 berarti...", "Pilih hasil.", "Lulus", ["Tidak lulus", "Belum bisa ditentukan", "Error selalu"]),
    choice("Q4", "Jika lampu merah, berhenti. Saat lampu hijau, aksi berhenti...", "Tentukan apakah syarat terpenuhi.", "Tidak dijalankan", ["Selalu dijalankan", "Dijalankan dua kali", "Menghapus lampu"]),
    choice("Q5", "Syarat pada kondisi harus menghasilkan...", "Pilih jenis hasil.", "Benar atau salah", ["Warna saja", "Gambar saja", "Musik saja"]),
    choice("Q6", "Contoh kondisi adalah...", "Pilih contoh.", "Jika baterai kurang dari 20%, isi daya", ["Baterai meja langit", "Isi daya tanpa sebab selalu", "Warna biru enak"]),
    choice("Q7", "Pada 'jika hujan pakai payung', syaratnya adalah...", "Pilih syarat.", "Hujan", ["Pakai payung", "Berjalan", "Cuaca kemarin"]),
    choice("Q8", "Pada 'jika lapar makan', aksinya adalah...", "Pilih aksi.", "Makan", ["Lapar", "Jika", "Diam"]),
    choice("Q9", "Else dipakai saat...", "Pilih fungsi else.", "Syarat if tidak terpenuhi", ["Syarat selalu benar", "Tidak ada pilihan lain", "Kode selesai sebelum mulai"]),
    choice("Q10", "Jika suhu > 30 maka nyalakan kipas. Suhu 28 berarti...", "Pilih hasil.", "Kipas tidak dinyalakan oleh kondisi itu", ["Kipas pasti menyala", "Suhu menjadi 30", "Kode hilang"]),
  ],
  "KDX-QST-003": [
    choice("Q2", "Output adalah...", "Pilih definisi.", "Hasil yang ditampilkan program", ["Kode yang dihapus", "Nama keyboard", "Kesalahan mengetik selalu"]),
    choice("Q3", "print(3 + 2) menghasilkan...", "Prediksi output.", "5", ["3 + 2", "32", "Error selalu"]),
    choice("Q4", "print('3' + '2') pada banyak bahasa berarti...", "Pilih output string.", "32", ["5", "1", "Kosong"]),
    choice("Q5", "Jika nama = 'Bale', print(nama) menampilkan...", "Prediksi output variabel.", "Bale", ["nama", "print", "Kosong"]),
    choice("Q6", "Perintah print digunakan untuk...", "Pilih fungsi.", "Menampilkan nilai", ["Menyimpan file selalu", "Mematikan komputer", "Menghapus variabel"]),
    choice("Q7", "Output dari print('Halo') adalah...", "Prediksi output.", "Halo", ["'Halo' dengan tanda kutip selalu", "print", "Tidak ada"]),
    choice("Q8", "Jika x = 4, print(x * 2) menghasilkan...", "Hitung output.", "8", ["6", "42", "x * 2"]),
    choice("Q9", "Kesalahan output bisa terjadi karena...", "Pilih penyebab.", "Kode atau nilai variabel salah", ["Monitor terlalu besar saja", "Kursi bergeser", "Nama file bagus"]),
    choice("Q10", "Untuk memprediksi output, kita perlu...", "Pilih strategi.", "Membaca kode baris demi baris", ["Menebak dari ikon", "Mengabaikan variabel", "Menutup terminal"]),
  ],
  "KDX-QST-004": [
    choice("Q2", "Variabel digunakan untuk...", "Pilih fungsi variabel.", "Menyimpan nilai", ["Menghapus layar", "Mengubah keyboard", "Membuat internet"]),
    choice("Q3", "Pada nama = 'Bale', nama adalah...", "Pilih bagian kode.", "Variabel", ["Output", "Komentar", "Error"]),
    choice("Q4", "Nilai dari variabel umur = 12 adalah...", "Pilih nilai.", "12", ["umur", "=", "Tidak ada"]),
    choice("Q5", "Komentar dalam kode biasanya dipakai untuk...", "Pilih fungsi komentar.", "Memberi catatan untuk pembaca", ["Selalu dieksekusi", "Menghapus program", "Mencetak otomatis"]),
    choice("Q6", "Kode yang mencetak variabel nama adalah...", "Pilih kode.", "print(nama)", ["nama(print)", "cetak = nama", "hapus(nama)"]),
    choice("Q7", "Jika ingin output 'Halo Bale', teks yang perlu muncul adalah...", "Pilih output.", "Halo Bale", ["Bale Halo?", "nama", "print nama"]),
    choice("Q8", "Kesalahan penulisan print(nama adalah...", "Pilih masalah.", "Kurung tutup hilang", ["Variabel terlalu pendek", "Teks terlalu ramah", "Tidak ada masalah"]),
    choice("Q9", "String dalam Python biasanya ditulis dengan...", "Pilih tanda.", "Tanda kutip", ["Tanda persen saja", "Tanda tanya saja", "Tanpa aturan"]),
    choice("Q10", "Sebelum menjalankan kode, periksa...", "Pilih pemeriksaan.", "Nama variabel dan tanda baca", ["Warna meja", "Ukuran ikon", "Nama teman"]),
  ],
  "KDX-QST-005": [
    choice("Q2", "Bug adalah...", "Pilih definisi.", "Kesalahan pada program atau logika", ["Fitur yang selalu benar", "Nama aplikasi", "Jenis layar"]),
    choice("Q3", "Debugging berarti...", "Pilih definisi.", "Mencari dan memperbaiki kesalahan", ["Menambah warna", "Menghapus semua file", "Mematikan komputer"]),
    choice("Q4", "Jika loop berjalan 2 kali padahal harus 3 kali, kemungkinan...", "Pilih penyebab.", "Batas pengulangan salah", ["Warna teks salah", "Nama robot lucu", "Baterai penuh"]),
    choice("Q5", "Langkah pertama saat menemukan bug adalah...", "Pilih langkah.", "Membaca pesan/hasil kesalahan", ["Panik", "Menghapus semua kode", "Menutup mata"]),
    choice("Q6", "Bug logika berarti kode berjalan tetapi...", "Pilih ciri.", "Hasilnya tidak sesuai tujuan", ["Selalu tidak bisa dibuka", "Tidak punya warna", "Tidak punya ikon"]),
    choice("Q7", "Cara mengecek bug pada urutan adalah...", "Pilih cara.", "Ikuti langkah satu per satu", ["Melompati langkah", "Mengubah topik", "Menebak hasil"]),
    choice("Q8", "Jika variabel salah nama, program bisa...", "Pilih akibat.", "Tidak menemukan nilai yang dimaksud", ["Menjadi gambar", "Mencetak musik", "Selalu benar"]),
    choice("Q9", "Perbaikan bug sebaiknya diuji dengan...", "Pilih cara uji.", "Menjalankan ulang contoh kasus", ["Membaca judul saja", "Mengganti wallpaper", "Menebak dari warna"]),
    choice("Q10", "Catatan bug yang baik berisi...", "Pilih isi catatan.", "Apa yang terjadi dan langkah memunculkannya", ["Hanya emoji", "Nama makanan", "Warna sepatu"]),
  ],
};

function choice(
  code: string,
  question: string,
  instruction: string,
  correct: string,
  distractors: string[],
): SeedQuestion {
  return {
    code,
    question,
    instruction,
    options: [
      { id: "A", label: correct, correct: true },
      { id: "B", label: distractors[0], correct: false },
      { id: "C", label: distractors[1], correct: false },
      { id: "D", label: distractors[2], correct: false },
    ],
  };
}

async function upsertPlacementCodeInput() {
  await prisma.placementQuestionTemplate.upsert({
    where: { code: "TPL-CODE-INPUT-001" },
    update: {
      orderNumber: 10,
      questionType: "CODE_INPUT",
      prompt: "Lengkapi kode agar mencetak Halo Bale.",
      payload: {
        id: "TPL-CODE-INPUT-001",
        questionType: "CODE_INPUT",
        title: "Template 10 - Code Input",
        mascotMessage: "Hai, aku Babe! Sekarang tulis sedikit kode sederhana.",
        prompt: "Lengkapi kode agar mencetak Halo Bale.",
        instruction: "Gunakan Python sederhana.",
        codeConfig: {
          language: "python",
          initialCode: 'nama = "Bale"\n# tulis kodemu di bawah ini\n',
          expectedOutput: "Halo Bale",
          backendExecutionEnabled: false,
        },
      },
      isActive: true,
    },
    create: {
      code: "TPL-CODE-INPUT-001",
      orderNumber: 10,
      questionType: "CODE_INPUT",
      prompt: "Lengkapi kode agar mencetak Halo Bale.",
      payload: {
        id: "TPL-CODE-INPUT-001",
        questionType: "CODE_INPUT",
        title: "Template 10 - Code Input",
        mascotMessage: "Hai, aku Babe! Sekarang tulis sedikit kode sederhana.",
        prompt: "Lengkapi kode agar mencetak Halo Bale.",
        instruction: "Gunakan Python sederhana.",
        codeConfig: {
          language: "python",
          initialCode: 'nama = "Bale"\n# tulis kodemu di bawah ini\n',
          expectedOutput: "Halo Bale",
          backendExecutionEnabled: false,
        },
      },
      source: "PRODUCTION_MINIMUM_SEED",
      isActive: true,
    },
  });
}

async function deleteGeneratedTemplateQuestions(questId: string) {
  const questions = await prisma.questQuestion.findMany({
    where: { questId, code: { contains: "_TPL_Q" } },
    select: { id: true },
  });
  const ids = questions.map((question) => question.id);
  if (ids.length === 0) return;

  await prisma.questQuestionOption.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questMatchingPair.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questOrderItem.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questAcceptedAnswer.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questRubricCriterion.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questMedia.deleteMany({ where: { questQuestionId: { in: ids } } });
  await prisma.questHotspotArea.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questEvidenceItem.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questCodeConfig.deleteMany({
    where: { questQuestionId: { in: ids } },
  });
  await prisma.questQuestion.deleteMany({ where: { id: { in: ids } } });
}

async function upsertChoiceQuestion(input: {
  questId: string;
  competencyId: string;
  code: string;
  orderNumber: number;
  questionText: string;
  instruction: string;
  skillTags: string[];
  options: Array<{ id: string; label: string; correct: boolean }>;
}) {
  const question = await prisma.questQuestion.upsert({
    where: { code: input.code },
    update: {
      questId: input.questId,
      questionType: QuestQuestionType.SINGLE_CHOICE,
      competencyId: input.competencyId,
      orderNumber: input.orderNumber,
      questionText: input.questionText,
      instruction: input.instruction,
      status: QuestionStatus.ACTIVE,
    },
    create: {
      questId: input.questId,
      code: input.code,
      questionType: QuestQuestionType.SINGLE_CHOICE,
      competencyId: input.competencyId,
      measurementCategory: "FOUNDATION",
      difficulty: "EASY",
      bloomLevel: "UNDERSTAND",
      orderNumber: input.orderNumber,
      questionText: input.questionText,
      instruction: input.instruction,
      skillTags: input.skillTags,
      masteryPoint: 1,
      xpReward: 20,
      estimatedTimeSeconds: 60,
      status: QuestionStatus.ACTIVE,
    },
  });

  await prisma.questCodeConfig.deleteMany({
    where: { questQuestionId: question.id },
  });
  await prisma.questQuestionOption.deleteMany({
    where: { questQuestionId: question.id },
  });
  await prisma.questQuestionOption.createMany({
    data: input.options.map((option, index) => ({
      questQuestionId: question.id,
      optionId: option.id,
      label: option.label,
      isCorrect: option.correct,
      displayOrder: index + 1,
      misconception: option.correct
        ? undefined
        : "Cek lagi informasi pada soal dan hubungkan dengan materi.",
    })),
  });
}

async function seedWorld(input: WorldSeed) {
  const subject = await prisma.subject.upsert({
    where: { code: input.subjectCode },
    update: { name: input.subjectName, isActive: true },
    create: {
      code: input.subjectCode,
      name: input.subjectName,
      description: input.themeDescription,
    },
  });

  const world = await prisma.world.upsert({
    where: { key: input.key },
    update: {
      subjectId: subject.id,
      name: input.name,
      characterClass: input.characterClass,
      themeDescription: input.themeDescription,
      isActive: true,
      orderNumber: input.orderNumber,
    },
    create: {
      subjectId: subject.id,
      key: input.key,
      name: input.name,
      characterClass: input.characterClass,
      themeDescription: input.themeDescription,
      orderNumber: input.orderNumber,
    },
  });

  const chapter = await prisma.chapter.upsert({
    where: { chapterCode: input.chapter.code },
    update: {
      worldId: world.id,
      title: input.chapter.title,
      story: input.chapter.story,
      goal: input.chapter.goal,
      status: MissionStatus.ACTIVE,
    },
    create: {
      worldId: world.id,
      chapterCode: input.chapter.code,
      chapterNumber: 1,
      title: input.chapter.title,
      story: input.chapter.story,
      goal: input.chapter.goal,
      difficulty: "FOUNDATION",
      estimatedDurationDays: 3,
      recommendedSessions: 5,
      completionIndicator: "Selesaikan semua quest awal.",
      status: MissionStatus.ACTIVE,
    },
  });

  const competency = await prisma.competency.upsert({
    where: {
      subjectId_code: {
        subjectId: subject.id,
        code: input.competency.code,
      },
    },
    update: {
      chapterId: chapter.id,
      name: input.competency.name,
      description: input.competency.description,
      gradeLevel: input.competency.gradeLevel,
      isActive: true,
    },
    create: {
      subjectId: subject.id,
      chapterId: chapter.id,
      code: input.competency.code,
      name: input.competency.name,
      description: input.competency.description,
      gradeLevel: input.competency.gradeLevel,
      orderNumber: 1,
    },
  });

  for (const [index, questInput] of input.quests.entries()) {
    const quest = await prisma.quest.upsert({
      where: { code: questInput.code },
      update: {
        worldId: world.id,
        chapterId: chapter.id,
        title: questInput.title,
        story: questInput.story,
        objective: questInput.objective,
        studentInstruction: questInput.instruction,
        estimatedMinutes: 8,
        xpRewardFirst: 90,
        status: MissionStatus.ACTIVE,
      },
      create: {
        worldId: world.id,
        chapterId: chapter.id,
        code: questInput.code,
        title: questInput.title,
        missionType: "FOUNDATION",
        story: questInput.story,
        objective: questInput.objective,
        studentInstruction: questInput.instruction,
        estimatedMinutes: 8,
        xpRewardFirst: 90,
        xpMultiplierSecond: 0.5,
        xpMultiplierThirdPlus: 0.25,
        hints: [
          "Baca pertanyaannya pelan-pelan.",
          "Cari pilihan yang paling didukung informasi.",
        ],
        status: MissionStatus.ACTIVE,
      },
    });

    const questionType = questInput.type ?? QuestQuestionType.SINGLE_CHOICE;
    await deleteGeneratedTemplateQuestions(quest.id);
    const question = await prisma.questQuestion.upsert({
      where: { code: `${questInput.code}-Q1` },
      update: {
        questId: quest.id,
        questionType,
        competencyId: competency.id,
        orderNumber: 1,
        questionText: questInput.question,
        instruction: questInput.instruction,
        status: QuestionStatus.ACTIVE,
      },
      create: {
        questId: quest.id,
        code: `${questInput.code}-Q1`,
        questionType,
        competencyId: competency.id,
        measurementCategory: "FOUNDATION",
        difficulty: "EASY",
        bloomLevel: "UNDERSTAND",
        orderNumber: 1,
        questionText: questInput.question,
        instruction: questInput.instruction,
        skillTags: [input.key, input.competency.code],
        masteryPoint: 1,
        xpReward: 20,
        estimatedTimeSeconds: 60,
        sampleAnswer: questInput.codeConfig?.expectedOutput,
        status: QuestionStatus.ACTIVE,
      },
    });

    if (
      questionType === QuestQuestionType.CODE_INPUT &&
      questInput.codeConfig
    ) {
      await prisma.questCodeConfig.upsert({
        where: { questQuestionId: question.id },
        update: questInput.codeConfig,
        create: {
          questQuestionId: question.id,
          ...questInput.codeConfig,
        },
      });
    } else {
      for (const [optionIndex, option] of (questInput.options ?? []).entries()) {
        await prisma.questQuestionOption.upsert({
          where: {
            questQuestionId_optionId: {
              questQuestionId: question.id,
              optionId: option.id,
            },
          },
          update: {
            label: option.label,
            isCorrect: option.correct,
            displayOrder: optionIndex + 1,
          },
          create: {
            questQuestionId: question.id,
            optionId: option.id,
            label: option.label,
            isCorrect: option.correct,
            displayOrder: optionIndex + 1,
          },
        });
      }
    }

    await prisma.quest.update({
      where: { id: quest.id },
      data: {
        hints: [
          `Misi ${index + 1}: baca konteksnya dulu.`,
          "Eliminasi jawaban yang tidak didukung soal.",
        ],
      },
    });

    for (const [extraIndex, extra] of (
      extraQuestionBanks[questInput.code] ?? []
    ).entries()) {
      await upsertChoiceQuestion({
        questId: quest.id,
        competencyId: competency.id,
        code: `${questInput.code}-${extra.code}`,
        orderNumber: extraIndex + 2,
        questionText: extra.question,
        instruction: extra.instruction,
        skillTags: [input.key, input.competency.code, "production-seed"],
        options: extra.options,
      });
    }
  }
}

async function main() {
  await upsertPlacementCodeInput();
  for (const world of worlds) {
    await seedWorld(world);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
