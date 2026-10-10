/** Curated starter release. Stable codes are content IDs, never Prisma UUIDs. */
export type KoreanWord = { ko: string; id: string; en: string };
export type KoreanUnit = {
  code: string; level: string; title: string; goal: string; explanation: string;
  pronunciation: string; culture: string; words: KoreanWord[];
  phrases: KoreanWord[]; mission: string;
};

const words = (rows: string[]): KoreanWord[] => rows.map(row => {
  const [ko, id, en] = row.split('|');
  if (!ko || !id || !en) throw new Error(`Invalid Korean content: ${row}`);
  return { ko, id, en };
});
type Row = [string, string, string, string[], string[], string, string];
const hangul: Row[] = [
  ['Mengenal Hangul', 'Mengenali huruf dan membaca blok 아, 이.', 'Hangul ditulis dalam blok suku kata. ㅇ pada awal blok tidak berbunyi. Gabungkan ㅇ dengan ㅏ menjadi 아, dengan ㅣ menjadi 이.',
    ['아|blok dengan vokal ㅏ|syllable with vowel ㅏ', '이|blok dengan vokal ㅣ|syllable with vowel ㅣ', '아이|anak|child', '아아|dua blok 아|two 아 syllables'], ['아 이|아 lalu 이|아 then 이', '아이|anak|child'], 'Mulut terbuka untuk ㅏ; lidah lebih tinggi dan bibir tidak membulat untuk ㅣ.', 'Baca 아, 이, 아이; tulis dua blok dengan posisi huruf yang tepat.'],
  ['Vokal inti', 'Membedakan dan membaca ㅓ, ㅗ, ㅜ, ㅡ.', 'Baca 어, 오, 우, 으. ㅓ dan ㅗ berbeda; ㅡ tidak menggunakan bibir bulat seperti ㅜ. Audio adalah acuan, bukan padanan huruf Latin.',
    ['어|blok dengan vokal ㅓ|syllable with vowel ㅓ', '오|blok dengan vokal ㅗ|syllable with vowel ㅗ', '우|blok dengan vokal ㅜ|syllable with vowel ㅜ', '으|blok dengan vokal ㅡ|syllable with vowel ㅡ'], ['어 오|어 lalu 오|어 then 오', '우 으|우 lalu 으|우 then 으'], 'Bandingkan bibir pada 오 dan 어; pertahankan bibir tidak bulat untuk 으.', 'Baca empat vokal lalu salin 어, 오, 우, 으.'],
  ['Konsonan pertama', 'Merakit suku kata dengan ㄴ, ㅁ, ㄱ, ㄷ.', 'Konsonan awal ditempatkan di kiri vokal vertikal. ㄴ + ㅏ → 나. ㅁ + ㅜ → 무: vokal horizontal berada di bawah konsonan.',
    ['나|blok ㄴ + ㅏ|syllable ㄴ + ㅏ', '무|blok ㅁ + ㅜ|syllable ㅁ + ㅜ', '가|blok ㄱ + ㅏ|syllable ㄱ + ㅏ', '도|blok ㄷ + ㅗ|syllable ㄷ + ㅗ'], ['나무|pohon|tree', '가구|perabot|furniture'], 'ㄴ memakai ujung lidah; ㅁ memakai penutupan bibir. Bunyi ㄱ dan ㄷ bervariasi menurut lingkungan.', 'Rakit dan baca 나무 serta 가구 tanpa romanisasi.'],
  ['Konsonan berikutnya', 'Membaca kata dengan ㄹ, ㅂ, ㅅ, ㅈ, ㅎ.', 'Latih 라, 바, 사, 자, 하. ㄹ di antara vokal biasanya berupa sentuhan lidah singkat; jangan otomatis memakai getaran r Indonesia.',
    ['머리|kepala atau rambut|head or hair', '바다|laut|sea', '모자|topi|hat', '하나|satu|one'], ['머리|kepala atau rambut|head or hair', '모자 하나|satu topi|one hat'], 'Perhatikan posisi lidah ㄹ. ㅎ memerlukan aliran udara; ㅂ memakai kedua bibir.', 'Baca 머리, 바다, 모자, 하나 lalu tulis dua kata.'],
  ['Bentuk blok dan vokal y', 'Membaca blok vertikal, horizontal, dan vokal berawalan y.', 'ㅑ, ㅕ, ㅛ, ㅠ memiliki unsur luncuran awal. Latih 야, 여, 요, 유. Bentuk blok mengikuti arah vokal, bukan jumlah huruf dalam satu baris.',
    ['야구|bisbol|baseball', '여우|rubah|fox', '우유|susu|milk', '요리|masakan atau memasak|cooking'], ['야구|bisbol|baseball', '요리|masakan atau memasak|cooking'], 'Ucapkan vokal y sebagai satu gerakan tersambung, bukan dua suku kata.', 'Rakit 야 dan 요 lalu baca 야구 dan 요리.'],
  ['Konsonan aspiratif', 'Mengenali ㅋ, ㅌ, ㅍ, ㅊ.', 'Konsonan aspiratif memakai aliran udara lebih kuat. Bandingkan ㄱ/ㅋ, ㄷ/ㅌ, ㅂ/ㅍ, ㅈ/ㅊ dengan contoh audio bila tersedia.',
    ['코|hidung|nose', '타다|naik kendaraan|ride', '포도|anggur|grape', '차|teh atau mobil|tea or car'], ['포도|anggur|grape', '코|hidung|nose'], 'Rasakan hembusan udara pada ㅋ, ㅌ, ㅍ, ㅊ tanpa menambahkan vokal ekstra.', 'Baca 코, 타다, 포도, 차; tandai konsonan aspiratifnya.'],
  ['받침 sonoran', 'Membaca ㄴ, ㅁ, ㅇ, ㄹ sebagai konsonan akhir.', '받침 ditulis di bawah blok. 산 berakhir ㄴ; 밤 berakhir ㅁ; 공 berakhir bunyi nasal belakang; 물 berakhir ㄹ.',
    ['산|gunung|mountain', '밤|malam atau kastanya|night or chestnut', '공|bola|ball', '물|air|water'], ['산|gunung|mountain', '물|air|water'], 'Jangan menambah vokal setelah 받침. ㅇ awal diam, tetapi ㅇ akhir berbunyi.', 'Baca empat kata lalu tulis kata untuk air dan gunung.'],
  ['받침 obstruen', 'Membedakan ejaan akhir dan realisasi bunyinya.', 'Konsonan akhir obstruen tidak dilepas seperti konsonan awal. 옷 pada akhir ujaran memakai bunyi akhir kelompok ㄷ; jangan membacanya dengan s lepas.',
    ['책|buku|book', '옷|pakaian|clothes', '밥|nasi atau makanan|rice or meal', '밖|luar|outside'], ['책|buku|book', '밥|nasi atau makanan|rice or meal'], 'Tutup artikulasi akhir tanpa tambahan vokal. Ejaan tetap dipertahankan walau bunyi akhir dinetralkan.', 'Baca 책, 옷, 밥, 밖 dan tulis dua kata dari maknanya.'],
  ['Konsonan tegang', 'Mengenali ㄲ, ㄸ, ㅃ, ㅆ, ㅉ.', 'Konsonan tegang merupakan kategori bunyi berbeda, bukan sekadar konsonan yang dibaca lebih panjang atau lebih keras.',
    ['꼬리|ekor|tail', '딸|anak perempuan|daughter', '뿌리|akar|root', '씨|biji|seed'], ['짜다|asin|salty', '딸|anak perempuan|daughter'], 'Latih kategori plain, aspiratif, tegang perlahan. Hindari menahan napas berlebihan.', 'Tandai konsonan tegang pada lima contoh lalu baca kata.'],
  ['Vokal gabungan', 'Membaca kombinasi vokal yang umum.', 'Pelajari ㅐ, ㅔ, ㅒ, ㅖ, ㅘ, ㅝ, ㅙ, ㅞ, ㅚ, ㅟ, ㅢ melalui kata. ㅐ/ㅔ sering tidak dibedakan jelas dalam ujaran modern; 의 juga bervariasi menurut fungsi.',
    ['과일|buah|fruit', '귀|telinga|ear', '왜|mengapa|why', '의자|kursi|chair'], ['과일|buah|fruit', '의자|kursi|chair'], 'Latih perpindahan mulut pada 와/워. Dengarkan variasi; jangan memaksakan perbedaan ㅐ/ㅔ yang tidak terdengar.', 'Baca 과일, 귀, 왜, 의자 dan tulis dua kata.'],
  ['Bunyi tersambung', 'Mengenali penghubungan bunyi dan perubahan umum.', 'Pada 한국어, ㄱ akhir terhubung ke vokal berikutnya. 같이 lazim terdengar [가치]; 좋아요 terdengar [조아요]. 국물 memperkenalkan nasalisasi [궁물].',
    ['한국어|bahasa Korea|Korean language', '같이|bersama|together', '좋아요|baik atau bagus|good', '국물|kuah|broth'], ['한국어|bahasa Korea|Korean language', '같이|bersama|together'], 'Baca antarblok secara tersambung. Bentuk [ ] menjelaskan bunyi, bukan ejaan pengganti.', 'Baca empat kata; cocokkan ejaan 같이 dengan penjelasan bunyinya.'],
  ['Hangul mastery', 'Membaca dan menulis kata serta ungkapan pendek.', 'Gabungkan kemampuan huruf, 받침, dan perubahan bunyi. 안녕하세요 dan 감사합니다 diperkenalkan sebagai ungkapan utuh. 받침 rangkap dibaca sesuai lingkungan: 읽다 [익따], 읽어요 [일거요].',
    ['안녕하세요|halo (sopan)|hello (polite)', '감사합니다|terima kasih|thank you', '이름|nama|name', '읽다|membaca|read'], ['안녕하세요|halo (sopan)|hello (polite)', '감사합니다|terima kasih|thank you'], 'Baca perlahan tanpa romanisasi. Perhatikan 감사합니다 [감사함니다] dan penghubungan pada 이름.', 'Baca ungkapan, tulis nama dengan bantuan, dan rekam read-aloud sendiri.'],
];

const survival: Row[] = [
  ['Salam dan sopan santun', 'Membuka, menutup, dan merespons interaksi.', '안녕하세요, 감사합니다, 죄송합니다 adalah ungkapan sopan. 안녕히 가세요 ditujukan kepada orang yang pergi; 안녕히 계세요 kepada orang yang tinggal.',
    ['안녕하세요|halo|hello', '감사합니다|terima kasih|thank you', '죄송합니다|maaf|sorry', '괜찮아요|tidak apa-apa|it is okay'], ['안녕하세요.|Halo.|Hello.', '감사합니다.|Terima kasih.|Thank you.'], 'Perhatikan 합니다 [함니다]. Jangan menambah vokal pada akhir 입니다.', 'Sapa orang baru lalu ucapkan terima kasih atas bantuannya.'],
  ['Memperkenalkan diri', 'Menyebut nama dan pekerjaan.', '은 setelah 받침, 는 setelah vokal menandai topik. 입니다 adalah kopula formal sopan; nama + 입니다. 저는 니나입니다. Bukan 저는 니나 있어요.',
    ['저|saya (rendah hati)|I (humble)', '이름|nama|name', '학생|pelajar|student', '선생님|guru|teacher'], ['저는 니나입니다.|Saya Nina.|I am Nina.', '저는 학생입니다.|Saya pelajar.|I am a student.'], '입니다 terdengar [임니다]. Latih batas kata 저는 / 니나입니다.', 'Perkenalkan nama dan peran dalam dua kalimat.'],
  ['Asal dan bahasa', 'Menanyakan asal dan menyebut bahasa.', '이에요 setelah 받침; 예요 setelah vokal. 아니에요 menyatakan bukan. 인도네시아 사람이에요. 이름이 뭐예요? Gunakan 아니에요, bukan 아니예요.',
    ['인도네시아|Indonesia|Indonesia', '한국|Korea|Korea', '사람|orang|person', '한국어|bahasa Korea|Korean language'], ['저는 인도네시아 사람이에요.|Saya orang Indonesia.|I am Indonesian.', '이름이 뭐예요?|Siapa nama Anda?|What is your name?'], '한국어 memakai penghubungan bunyi. Latih 사람이에요 tanpa berhenti di setiap blok.', 'Sebutkan asal lalu tanyakan nama lawan bicara.'],
  ['Orang dan benda', 'Mengidentifikasi benda dekat dan jauh.', '이거 dekat penutur, 그거 dekat lawan bicara atau sudah disebut, 저거 jauh dari keduanya. 이/가 menandai subjek: 받침 + 이, vokal + 가.',
    ['이거|ini (benda)|this thing', '그거|itu (dekat lawan bicara)|that thing', '저거|itu di sana|that over there', '책|buku|book'], ['이거 뭐예요?|Ini apa?|What is this?', '이거 책이에요.|Ini buku.|This is a book.'], 'Perhatikan 책이에요: 받침 terhubung dengan vokal berikutnya.', 'Tanyakan dan identifikasi dua benda di sekitar Anda.'],
  ['Nomor dan kontak', 'Membaca serta mengonfirmasi nomor.', 'Gunakan angka Sino-Korea 일, 이, 삼, 사, 오, 육, 칠, 팔, 구, 십. Nomor telepon dibaca digit demi digit; 0 lazim 공 dalam konteks ini.',
    ['번호|nomor|number', '전화|telepon|telephone', '공|nol pada nomor telepon|zero in phone numbers', '삼|tiga (Sino-Korea)|three (Sino-Korean)'], ['전화번호가 뭐예요?|Berapa nomor telepon Anda?|What is your phone number?', '공일공이에요.|Angkanya 010.|It is 010.'], 'Baca digit dengan jeda yang membantu konfirmasi; jangan menyatukan seluruh nomor menjadi bilangan besar.', 'Baca nomor contoh 010 lalu minta konfirmasi.'],
  ['Jumlah dan usia', 'Menyebut jumlah serta menanyakan usia secara tepat.', 'Angka asli: 하나, 둘, 셋, 넷 menjadi 한, 두, 세, 네 sebelum counter. 한 개, 두 명, 세 살. Usia adalah informasi pribadi; tanyakan hanya bila relevan.',
    ['개|counter benda|general item counter', '명|counter orang|person counter', '살|counter usia|age counter', '두|dua sebelum counter|two before a counter'], ['두 명이에요.|Ada dua orang.|There are two people.', '사과 한 개 주세요.|Tolong beri satu apel.|One apple, please.'], '한/두/세/네 adalah bentuk counter, bukan kesalahan dari bentuk kamusnya.', 'Sebut jumlah dua orang dan minta satu apel.'],
  ['Jam dan jadwal', 'Menanyakan jam dan waktu kegiatan.', 'Jam memakai angka asli; menit memakai Sino-Korea. 세 시 삼십 분 = 03.30. 에 menandai waktu: 세 시에 만나요.',
    ['시간|waktu|time', '시|jam (counter)|hour counter', '분|menit|minute', '지금|sekarang|now'], ['지금 몇 시예요?|Sekarang jam berapa?|What time is it now?', '세 시에 만나요.|Mari bertemu pukul tiga.|Let us meet at three.'], '시 menggunakan bunyi yang dipengaruhi ㅣ; fokus pada kejelasan angka.', 'Baca 03.30 dan tulis janji bertemu pukul tiga.'],
  ['Hari dan tanggal', 'Menyebut tanggal dan menanyakan hari.', '월 dan 일 memakai Sino-Korea. 유월 dan 시월 adalah bentuk khusus untuk Juni dan Oktober. 언제 berarti kapan; 월요일에 menandai hari kegiatan.',
    ['오늘|hari ini|today', '내일|besok|tomorrow', '월요일|Senin|Monday', '생일|ulang tahun|birthday'], ['오늘은 월요일이에요.|Hari ini hari Senin.|Today is Monday.', '생일이 언제예요?|Kapan ulang tahun Anda?|When is your birthday?'], 'Latih 월 dan 일 tanpa vokal tambahan pada ㄹ akhir.', 'Sebutkan hari ini lalu tanyakan tanggal ulang tahun dalam roleplay.'],
  ['Tempat dan keberadaan', 'Menanyakan lokasi fasilitas.', 'N이/가 있어요/없어요 menyatakan ada/tidak ada. Tempat + 에 menunjukkan lokasi keberadaan. 학교에 있어요. 어디예요? menanyakan lokasi.',
    ['화장실|toilet|restroom', '학교|sekolah|school', '여기|di sini|here', '어디|di mana|where'], ['화장실이 어디예요?|Toilet ada di mana?|Where is the restroom?', '여기에 있어요.|Ada di sini.|It is here.'], '화장실의 ㄹ akhir ditutup tanpa tambahan vokal; di 화장실이 bunyi terhubung.', 'Tanyakan toilet lalu jawab dengan lokasi.'],
  ['Aktivitas dasar', 'Menyebut kegiatan dengan objek.', '을 setelah 받침 dan 를 setelah vokal menandai objek. -아요/어요 memakai stem predikat; 하다 → 해요. 밥을 먹어요, 물을 마셔요.',
    ['먹다|makan|eat', '마시다|minum|drink', '공부하다|belajar|study', '물|air|water'], ['물을 마셔요.|Saya minum air.|I drink water.', '한국어를 공부해요.|Saya belajar bahasa Korea.|I study Korean.'], '마셔요 merupakan kontraksi 마시어요. Jangan membaca sebagai empat blok terpisah.', 'Sebutkan sesuatu yang Anda makan dan minum.'],
  ['Memesan di kafe', 'Memesan dan mengonfirmasi minuman.', 'N 주세요 meminta benda dengan sopan. 잔 menghitung cangkir/gelas: 한 잔, 두 잔. Tidak perlu mengulang saya pada setiap pesanan.',
    ['커피|kopi|coffee', '차|teh|tea', '잔|counter gelas atau cangkir|cup or glass counter', '주세요|tolong berikan|please give'], ['커피 한 잔 주세요.|Tolong satu cangkir kopi.|One cup of coffee, please.', '차 두 잔 주세요.|Tolong dua cangkir teh.|Two cups of tea, please.'], 'Latih 주세요 sebagai permintaan sopan, dengan intonasi yang jelas.', 'Pesan satu kopi lalu ubah jumlah dalam latihan mandiri.'],
  ['Memesan di restoran', 'Memesan dua item dan menyatakan preferensi.', '하고 menghubungkan nomina: 밥하고 물. 안 sebelum predikat menyatakan negasi sederhana: 안 먹어요. Untuk permintaan bahan spesifik gunakan ungkapan bantuan, bukan asumsi menu.',
    ['밥|nasi|rice', '김밥|gimbap|gimbap', '메뉴|menu|menu', '매워요|pedas|spicy'], ['김밥하고 물 주세요.|Tolong gimbap dan air.|Gimbap and water, please.', '매운 음식은 안 먹어요.|Saya tidak makan makanan pedas.|I do not eat spicy food.'], '김밥 sering terdengar dengan tensifikasi pada ㅂ. Pertahankan ejaan 김밥.', 'Pesan dua item lalu sampaikan preferensi makanan.'],
  ['Harga dan belanja', 'Menanyakan harga dan memilih barang.', '얼마예요? menanyakan harga. 원 memakai angka Sino-Korea. 이거 주세요 meminta barang tertentu. Harga yang ditampilkan adalah contoh latihan.',
    ['얼마|berapa (harga)|how much', '원|won|won', '카드|kartu|card', '현금|uang tunai|cash'], ['이거 얼마예요?|Ini berapa harganya?|How much is this?', '오천 원이에요.|Harganya lima ribu won.|It is five thousand won.'], '천 dan 원 perlu dibaca jelas agar nominal tidak salah dipahami.', 'Tanyakan harga barang contoh lalu pilih yang akan dibeli.'],
  ['Arah dan transportasi', 'Menanyakan arah dan menyebut tujuan.', '에 가요 menunjukkan tujuan. -(으)로 menunjukkan arah/cara: 받침 + 으로, vokal atau ㄹ + 로. 오른쪽으로 가세요 adalah ungkapan arah sopan.',
    ['역|stasiun|station', '버스|bus|bus', '오른쪽|kanan|right', '왼쪽|kiri|left'], ['역이 어디예요?|Stasiun ada di mana?|Where is the station?', '오른쪽으로 가세요.|Silakan ke kanan.|Go to the right, please.'], 'Jangan menambahkan vokal setelah 역. Perhatikan bunyi akhir 오른쪽.', 'Tanyakan stasiun lalu ikuti petunjuk kanan/kiri.'],
  ['Bantuan dan masalah', 'Meminta bantuan dan pengulangan.', 'Verb stem + -아/어 주세요 meminta tindakan. 다시 말해 주세요 meminta pengulangan. 도와주세요 adalah bentuk bantu yang umum; 모르는 informasi boleh diklarifikasi.',
    ['다시|lagi|again', '천천히|pelan-pelan|slowly', '도와주세요|tolong bantu|please help', '몰라요|tidak tahu|do not know'], ['다시 말해 주세요.|Tolong katakan lagi.|Please say it again.', '천천히 말해 주세요.|Tolong bicara pelan-pelan.|Please speak slowly.'], 'Gunakan jeda pendek sebelum permintaan. Kejelasan komunikasi lebih penting daripada kecepatan.', 'Minta lawan bicara mengulang dan berbicara lebih pelan.'],
  ['Korean Survival Day', 'Menyelesaikan interaksi dasar secara mandiri.', 'Review topik, kopula, permintaan, waktu, harga, dan lokasi. Pilih bentuk berdasarkan fungsi komunikasi. Tugas akhir menggunakan materi yang sudah dipelajari.',
    ['학생|pelajar|student', '커피|kopi|coffee', '화장실|toilet|restroom', '감사합니다|terima kasih|thank you'], ['저는 학생이에요.|Saya pelajar.|I am a student.', '커피 한 잔 주세요.|Tolong satu cangkir kopi.|One cup of coffee, please.'], 'Perhatikan 받침 pada 학생 dan 잔; jangan menambah vokal akhir.', 'Perkenalkan diri, pesan kopi, tanyakan harga dan toilet, lalu ucapkan terima kasih.'],
];

export const koreanUnits: KoreanUnit[] = [
  ...hangul.map((row, index) => makeUnit('KO00', row, index)),
  ...survival.map((row, index) => makeUnit('KO01', row, index)),
];
function makeUnit(level: string, row: Row, index: number): KoreanUnit {
  const [title, goal, explanation, vocabulary, phrases, pronunciation, mission] = row;
  return {
    code: `KOR-${level}-U${String(index + 1).padStart(2, '0')}`, level, title, goal,
    explanation, pronunciation, words: words(vocabulary), phrases: words(phrases), mission,
    culture: level === 'KO00'
      ? 'Hangul ditampilkan sebagai bentuk utama. Nama asing dapat ditranskripsikan dengan bantuan; tidak selalu ada satu ejaan tunggal.'
      : 'Gunakan tingkat tutur sopan untuk orang yang belum dikenal. Pilihan sapaan bergantung relasi dan konteks; hindari asumsi tentang semua orang Korea.',
  };
}

export type KoreanExercise = {
  type: 'SINGLE_CHOICE' | 'MATCHING' | 'ORDERING' | 'SHORT_TEXT';
  prompt: string; instruction: string; skill: string; answer?: string;
  choices?: string[]; pairs?: KoreanWord[]; tokens?: string[];
};
// Communication and form checks are authored explicitly, not generated by replacing random particles.
const survivalChecks: Array<[string, string, string[], string, string, string[]]> = [
  ['Anda pergi sementara tuan rumah tinggal. Pilih salam perpisahan yang sesuai.', '안녕히 계세요.', ['안녕히 계세요.', '안녕히 가세요.', '이름이 뭐예요?'], 'Orang membantu Anda. Apa yang Anda katakan?', '감사합니다.', ['감사합니다.', '얼마예요?', '어디예요?']],
  ['Pilih perkenalan sebagai pelajar dalam bentuk formal sopan.', '저는 학생입니다.', ['저는 학생입니다.', '저는 학생이에요.', '저는 학생 있어요.'], 'Perkenalkan diri dengan nama Nina.', '저는 니나입니다.', ['저는 니나입니다.', '저는 학생입니다.', '감사합니다.']],
  ['Pilih kopula yang benar setelah 사람.', '사람이에요.', ['사람이에요.', '사람예요.', '사람예이에요.'], 'Anda bukan guru. Pilih jawaban yang tepat.', '선생님이 아니에요.', ['선생님이 아니에요.', '선생님이에요.', '선생님 있어요.']],
  ['Benda dekat Anda. Pilih pertanyaan untuk benda tersebut.', '이거 뭐예요?', ['이거 뭐예요?', '저거 뭐예요?', '저는 학생이에요.'], 'Pilih kopula yang tepat setelah 책.', '책이에요.', ['책이에요.', '책예요.', '책이예요.']],
  ['Baca nomor 010 digit demi digit.', '공일공', ['공일공', '일공일', '공삼공'], 'Anda membutuhkan nomor telepon. Pilih pertanyaan.', '전화번호가 뭐예요?', ['전화번호가 뭐예요?', '생일이 언제예요?', '화장실이 어디예요?']],
  ['Pilih bentuk satu yang tepat sebelum counter 개.', '한 개', ['한 개', '하나 개', '일 명'], 'Terdapat dua orang. Pilih respons.', '두 명이에요.', ['두 명이에요.', '두 잔이에요.', '두 살이에요.']],
  ['Pilih tulisan untuk pukul 03.30.', '세 시 삼십 분', ['세 시 삼십 분', '삼 시 서른 분', '세 분 삼십 시'], 'Lengkapi makna: bertemu pukul tiga.', '세 시에 만나요.', ['세 시에 만나요.', '세 시를 만나요.', '세 시하고 만나요.']],
  ['Pilih nama bulan Juni yang benar.', '유월', ['유월', '육월', '시월'], 'Anda ingin mengetahui tanggal ulang tahun.', '생일이 언제예요?', ['생일이 언제예요?', '생일이 어디예요?', '생일이 얼마예요?']],
  ['Pilih penanda lokasi keberadaan yang benar.', '학교에 있어요.', ['학교에 있어요.', '학교를 있어요.', '학교하고 있어요.'], 'Anda mencari toilet. Pilih pertanyaan.', '화장실이 어디예요?', ['화장실이 어디예요?', '화장실이 얼마예요?', '화장실이 몇 시예요?']],
  ['Pilih partikel objek yang tepat setelah 물.', '물을 마셔요.', ['물을 마셔요.', '물를 마셔요.', '물에 마셔요.'], 'Nyatakan bahwa Anda belajar bahasa Korea.', '한국어를 공부해요.', ['한국어를 공부해요.', '한국어를 마셔요.', '한국어를 먹어요.']],
  ['Pilih bentuk satu cangkir yang benar.', '커피 한 잔 주세요.', ['커피 한 잔 주세요.', '커피 하나 잔 주세요.', '커피 한 명 주세요.'], 'Anda memesan dua cangkir teh.', '차 두 잔 주세요.', ['차 두 잔 주세요.', '차 한 잔 주세요.', '커피 두 잔 주세요.']],
  ['Pilih ungkapan untuk menghubungkan gimbap dan air.', '김밥하고 물 주세요.', ['김밥하고 물 주세요.', '김밥에 물 주세요.', '김밥을 물 주세요.'], 'Anda tidak makan makanan pedas.', '매운 음식은 안 먹어요.', ['매운 음식은 안 먹어요.', '매운 음식을 먹어요.', '물을 마셔요.']],
  ['Tanyakan harga benda ini.', '이거 얼마예요?', ['이거 얼마예요?', '이거 어디예요?', '이거 몇 시예요?'], 'Pilih nilai lima ribu won.', '오천 원', ['오천 원', '오백 원', '천 원']],
  ['Pilih bentuk arah yang benar setelah 오른쪽.', '오른쪽으로 가세요.', ['오른쪽으로 가세요.', '오른쪽로 가세요.', '오른쪽을 가세요.'], 'Petunjuk meminta Anda pergi ke kanan.', '오른쪽으로 가세요.', ['오른쪽으로 가세요.', '왼쪽으로 가세요.', '역이 어디예요?']],
  ['Pilih permintaan tindakan yang sopan.', '다시 말해 주세요.', ['다시 말해 주세요.', '다시 말해요 주세요.', '다시 말하다 주세요.'], 'Anda kesulitan mengikuti kecepatan bicara.', '천천히 말해 주세요.', ['천천히 말해 주세요.', '이거 주세요.', '오천 원이에요.']],
  ['Setelah orang memberi petunjuk, pilih respons penutup.', '감사합니다.', ['감사합니다.', '얼마예요?', '학생이에요.'], 'Pesan satu kopi dengan sopan.', '커피 한 잔 주세요.', ['커피 한 잔 주세요.', '커피 하나 명 주세요.', '커피 한 잔 있어요.']],
];
function orderingTokens(text: string): string[] {
  if (text.includes(' ')) return text.split(' ');
  const blocks = Array.from(text.replace(/[.!?]/g, ''));
  if (blocks.length > 1) return blocks;
  const syllable = text.charCodeAt(0) - 0xac00;
  if (syllable < 0 || syllable >= 11172) throw new Error(`Cannot build Hangul block: ${text}`);
  const initials = Array.from('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ');
  const vowels = Array.from('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ');
  const finals = Array.from('ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ');
  return [initials[Math.floor(syllable / 588)], vowels[Math.floor(syllable % 588 / 28)],
    ...(syllable % 28 ? [finals[syllable % 28 - 1]] : [])];
}
export function buildKoreanExercises(unit: KoreanUnit, stage: number, previous?: KoreanUnit): KoreanExercise[] {
  const selected = unit.words.map((_, index) => unit.words[(index + stage - 1) % unit.words.length]);
  const phrase = unit.phrases[(stage - 1) % unit.phrases.length];
  const choice = (prompt: string, answer: string, choices: string[], skill: string): KoreanExercise => ({
    type: 'SINGLE_CHOICE', prompt, answer, choices: [...new Set(choices)], skill,
    instruction: 'Pilih satu jawaban yang sesuai.',
  });
  const exercises: KoreanExercise[] = selected.map(word => stage % 2 === 1
    ? choice(`Apa arti atau deskripsi ${word.ko}?`, word.id, selected.map(w => w.id), 'vocabulary')
    : choice(`Pilih tulisan Korea untuk: ${word.id}.`, word.ko, selected.map(w => w.ko), 'reading'));
  if (unit.level === 'KO01' && stage >= 3) {
    const check = survivalChecks[Number(unit.code.slice(-2)) - 1];
    exercises[0] = choice(check[0], check[1], check[2], 'grammar');
    exercises[1] = choice(check[3], check[4], check[5], 'communication');
  }
  exercises.push({ type: 'MATCHING', prompt: 'Pasangkan tulisan Korea dengan makna atau deskripsinya.',
    instruction: 'Hubungkan setiap item kiri ke makna yang tepat.', skill: 'vocabulary', pairs: selected });
  exercises.push({ type: 'SHORT_TEXT', prompt: `Tulis dengan Hangul: ${selected[0].id}.`,
    instruction: 'Gunakan keyboard Korea. Jangan gunakan romanisasi.', skill: 'writing', answer: selected[0].ko });
  exercises.push({ type: 'ORDERING', prompt: `Susun tulisan untuk: ${phrase.id}.`,
    instruction: phrase.ko.includes(' ') ? 'Susun potongan kata dalam urutan yang benar.' : 'Susun blok Hangul dalam urutan yang benar.',
    skill: 'reading', tokens: orderingTokens(phrase.ko) });
  exercises.push(choice(`Baca: ${phrase.ko}\nApa makna tulisan tersebut?`, phrase.id,
    [phrase.id, ...selected.map(w => w.id).filter(x => x !== phrase.id).slice(0, 3)], 'reading'));
  exercises.push({ type: 'SHORT_TEXT', prompt: `Lengkapi bagian kosong: ${phrase.ko.replace(selected.find(w => phrase.ko.includes(w.ko))?.ko ?? phrase.ko, '____')}\nMakna lengkap: ${phrase.id}`,
    instruction: 'Tulis hanya bagian yang hilang, sama seperti bentuk yang dipelajari.', skill: 'writing',
    answer: selected.find(w => phrase.ko.includes(w.ko))?.ko ?? phrase.ko });
  const review = previous?.words[stage % previous.words.length] ?? selected[1];
  exercises.push(choice(`Review: pilih tulisan untuk ${review.id}.`, review.ko,
    [review.ko, ...selected.map(w => w.ko).filter(x => x !== review.ko).slice(0, 3)], 'review'));
  return exercises;
}

export function validateKoreanCourse() {
  const codes = new Set<string>();
  for (const [index, unit] of koreanUnits.entries()) {
    if (codes.has(unit.code)) throw new Error(`Duplicate unit: ${unit.code}`);
    codes.add(unit.code);
    for (let stage = 1; stage <= 4; stage++) {
      const exercises = buildKoreanExercises(unit, stage, koreanUnits[index - 1]);
      if (exercises.length !== 10) throw new Error(`Expected 10 exercises: ${unit.code}`);
      for (const exercise of exercises) {
        if (exercise.type === 'SINGLE_CHOICE' && (!exercise.choices?.includes(exercise.answer!) || exercise.choices.length < 2)) throw new Error(`Invalid choices: ${unit.code}`);
        if (exercise.type === 'ORDERING' && (exercise.tokens?.length ?? 0) < 2) throw new Error(`Invalid ordering: ${unit.code}`);
      }
    }
  }
  return { units: koreanUnits.length, lessons: koreanUnits.length * 4, questions: koreanUnits.length * 40 };
}
