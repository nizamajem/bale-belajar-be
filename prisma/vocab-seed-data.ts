import { VocabLevel } from "@prisma/client";

export type VocabWordSeed = {
  english: string;
  indonesian?: string;
  korean: string;
  koreanRomanized: string;
  level: VocabLevel;
  exampleSentenceEn?: string;
  exampleSentenceKo?: string;
};

export type VocabCategorySeed = {
  key: string;
  name: string;
  words: VocabWordSeed[];
};

type Term = {
  en: string;
  ko: string;
  rom: string;
  topic: string;
  level: VocabLevel;
};

const TERMS: Term[] = [
  ["hello", "안녕하세요", "annyeonghaseyo", "greetings", VocabLevel.BEGINNER],
  ["goodbye", "안녕히 가세요", "annyeonghi gaseyo", "greetings", VocabLevel.BEGINNER],
  ["thank you", "감사합니다", "gamsahamnida", "greetings", VocabLevel.BEGINNER],
  ["sorry", "죄송합니다", "joesonghamnida", "greetings", VocabLevel.BEGINNER],
  ["yes", "네", "ne", "greetings", VocabLevel.BEGINNER],
  ["no", "아니요", "aniyo", "greetings", VocabLevel.BEGINNER],
  ["please", "제발", "jebal", "greetings", VocabLevel.BEGINNER],
  ["nice to meet you", "반갑습니다", "bangapseumnida", "greetings", VocabLevel.BEGINNER],
  ["morning", "아침", "achim", "daily-life", VocabLevel.BEGINNER],
  ["afternoon", "오후", "ohu", "daily-life", VocabLevel.BEGINNER],
  ["evening", "저녁", "jeonyeok", "daily-life", VocabLevel.BEGINNER],
  ["today", "오늘", "oneul", "daily-life", VocabLevel.BEGINNER],
  ["tomorrow", "내일", "naeil", "daily-life", VocabLevel.BEGINNER],
  ["yesterday", "어제", "eoje", "daily-life", VocabLevel.BEGINNER],
  ["water", "물", "mul", "daily-life", VocabLevel.BEGINNER],
  ["house", "집", "jip", "daily-life", VocabLevel.BEGINNER],
  ["room", "방", "bang", "daily-life", VocabLevel.BEGINNER],
  ["door", "문", "mun", "daily-life", VocabLevel.BEGINNER],
  ["window", "창문", "changmun", "daily-life", VocabLevel.BEGINNER],
  ["chair", "의자", "uija", "daily-life", VocabLevel.BEGINNER],
  ["table", "책상", "chaeksang", "daily-life", VocabLevel.BEGINNER],
  ["bag", "가방", "gabang", "daily-life", VocabLevel.BEGINNER],
  ["phone", "전화", "jeonhwa", "daily-life", VocabLevel.BEGINNER],
  ["friend", "친구", "chingu", "daily-life", VocabLevel.BEGINNER],
  ["weather", "날씨", "nalssi", "daily-life", VocabLevel.INTERMEDIATE],
  ["promise", "약속", "yaksok", "daily-life", VocabLevel.INTERMEDIATE],
  ["memory", "기억", "gieok", "daily-life", VocabLevel.INTERMEDIATE],
  ["habit", "습관", "seupgwan", "daily-life", VocabLevel.INTERMEDIATE],
  ["rice", "밥", "bap", "food", VocabLevel.BEGINNER],
  ["food", "음식", "eumsik", "food", VocabLevel.BEGINNER],
  ["restaurant", "식당", "sikdang", "food", VocabLevel.BEGINNER],
  ["coffee", "커피", "keopi", "food", VocabLevel.BEGINNER],
  ["tea", "차", "cha", "food", VocabLevel.BEGINNER],
  ["fruit", "과일", "gwail", "food", VocabLevel.BEGINNER],
  ["vegetable", "채소", "chaeso", "food", VocabLevel.BEGINNER],
  ["bread", "빵", "ppang", "food", VocabLevel.BEGINNER],
  ["meat", "고기", "gogi", "food", VocabLevel.BEGINNER],
  ["fish", "생선", "saengseon", "food", VocabLevel.BEGINNER],
  ["breakfast", "아침 식사", "achim siksa", "food", VocabLevel.INTERMEDIATE],
  ["lunch", "점심 식사", "jeomsim siksa", "food", VocabLevel.INTERMEDIATE],
  ["dinner", "저녁 식사", "jeonyeok siksa", "food", VocabLevel.INTERMEDIATE],
  ["recipe", "조리법", "joribeop", "food", VocabLevel.ADVANCED],
  ["school", "학교", "hakgyo", "school", VocabLevel.BEGINNER],
  ["teacher", "선생님", "seonsaengnim", "school", VocabLevel.BEGINNER],
  ["student", "학생", "haksaeng", "school", VocabLevel.BEGINNER],
  ["book", "책", "chaek", "school", VocabLevel.BEGINNER],
  ["homework", "숙제", "sukje", "school", VocabLevel.BEGINNER],
  ["test", "시험", "siheom", "school", VocabLevel.INTERMEDIATE],
  ["classroom", "교실", "gyosil", "school", VocabLevel.BEGINNER],
  ["question", "질문", "jilmun", "school", VocabLevel.BEGINNER],
  ["answer", "대답", "daedap", "school", VocabLevel.BEGINNER],
  ["lesson", "수업", "sueop", "school", VocabLevel.INTERMEDIATE],
  ["grade", "성적", "seongjeok", "school", VocabLevel.INTERMEDIATE],
  ["assignment", "과제", "gwaje", "school", VocabLevel.INTERMEDIATE],
  ["research", "연구", "yeongu", "school", VocabLevel.ADVANCED],
  ["analysis", "분석", "bunseok", "school", VocabLevel.ADVANCED],
  ["evidence", "증거", "jeunggeo", "school", VocabLevel.ADVANCED],
  ["family", "가족", "gajok", "family", VocabLevel.BEGINNER],
  ["mother", "어머니", "eomeoni", "family", VocabLevel.BEGINNER],
  ["father", "아버지", "abeoji", "family", VocabLevel.BEGINNER],
  ["older brother", "형", "hyeong", "family", VocabLevel.BEGINNER],
  ["older sister", "누나", "nuna", "family", VocabLevel.BEGINNER],
  ["younger sibling", "동생", "dongsaeng", "family", VocabLevel.BEGINNER],
  ["child", "아이", "ai", "family", VocabLevel.BEGINNER],
  ["grandmother", "할머니", "halmeoni", "family", VocabLevel.BEGINNER],
  ["grandfather", "할아버지", "harabeoji", "family", VocabLevel.BEGINNER],
  ["colleague", "동료", "dongnyo", "work", VocabLevel.INTERMEDIATE],
  ["meeting", "회의", "hoeui", "work", VocabLevel.INTERMEDIATE],
  ["company", "회사", "hoesa", "work", VocabLevel.INTERMEDIATE],
  ["customer", "고객", "gogaek", "work", VocabLevel.INTERMEDIATE],
  ["project", "프로젝트", "peurojekteu", "work", VocabLevel.INTERMEDIATE],
  ["deadline", "마감일", "magamil", "work", VocabLevel.INTERMEDIATE],
  ["strategy", "전략", "jeollyak", "work", VocabLevel.ADVANCED],
  ["negotiation", "협상", "hyeopsang", "work", VocabLevel.ADVANCED],
  ["presentation", "발표", "balpyo", "work", VocabLevel.INTERMEDIATE],
  ["budget", "예산", "yesan", "work", VocabLevel.ADVANCED],
  ["airport", "공항", "gonghang", "travel", VocabLevel.INTERMEDIATE],
  ["train", "기차", "gicha", "travel", VocabLevel.INTERMEDIATE],
  ["bus", "버스", "beoseu", "travel", VocabLevel.BEGINNER],
  ["taxi", "택시", "taeksi", "travel", VocabLevel.BEGINNER],
  ["map", "지도", "jido", "travel", VocabLevel.INTERMEDIATE],
  ["ticket", "표", "pyo", "travel", VocabLevel.INTERMEDIATE],
  ["hotel", "호텔", "hotel", "travel", VocabLevel.INTERMEDIATE],
  ["passport", "여권", "yeogwon", "travel", VocabLevel.INTERMEDIATE],
  ["reservation", "예약", "yeyak", "travel", VocabLevel.INTERMEDIATE],
  ["luggage", "짐", "jim", "travel", VocabLevel.BEGINNER],
  ["left", "왼쪽", "oenjjok", "travel", VocabLevel.BEGINNER],
  ["right", "오른쪽", "oreunjjok", "travel", VocabLevel.BEGINNER],
  ["straight ahead", "직진", "jikjin", "travel", VocabLevel.INTERMEDIATE],
  ["hospital", "병원", "byeongwon", "health", VocabLevel.BEGINNER],
  ["medicine", "약", "yak", "health", VocabLevel.BEGINNER],
  ["doctor", "의사", "uisa", "health", VocabLevel.BEGINNER],
  ["nurse", "간호사", "ganhosa", "health", VocabLevel.INTERMEDIATE],
  ["pain", "통증", "tongjeung", "health", VocabLevel.INTERMEDIATE],
  ["fever", "열", "yeol", "health", VocabLevel.BEGINNER],
  ["exercise", "운동", "undong", "health", VocabLevel.BEGINNER],
  ["sleep", "잠", "jam", "health", VocabLevel.BEGINNER],
  ["stress", "스트레스", "seuteureseu", "health", VocabLevel.INTERMEDIATE],
  ["recovery", "회복", "hoebok", "health", VocabLevel.ADVANCED],
  ["computer", "컴퓨터", "keompyuteo", "technology", VocabLevel.BEGINNER],
  ["internet", "인터넷", "inteonet", "technology", VocabLevel.BEGINNER],
  ["password", "비밀번호", "bimilbeonho", "technology", VocabLevel.INTERMEDIATE],
  ["screen", "화면", "hwamyeon", "technology", VocabLevel.BEGINNER],
  ["keyboard", "키보드", "kibodeu", "technology", VocabLevel.BEGINNER],
  ["message", "메시지", "mesiji", "technology", VocabLevel.BEGINNER],
  ["file", "파일", "pail", "technology", VocabLevel.BEGINNER],
  ["data", "데이터", "deiteo", "technology", VocabLevel.INTERMEDIATE],
  ["security", "보안", "boan", "technology", VocabLevel.ADVANCED],
  ["algorithm", "알고리즘", "algorijeum", "technology", VocabLevel.ADVANCED],
  ["culture", "문화", "munhwa", "society", VocabLevel.INTERMEDIATE],
  ["history", "역사", "yeoksa", "society", VocabLevel.INTERMEDIATE],
  ["society", "사회", "sahoe", "society", VocabLevel.INTERMEDIATE],
  ["economy", "경제", "gyeongje", "society", VocabLevel.ADVANCED],
  ["law", "법", "beop", "society", VocabLevel.ADVANCED],
  ["policy", "정책", "jeongchaek", "society", VocabLevel.ADVANCED],
  ["environment", "환경", "hwangyeong", "society", VocabLevel.ADVANCED],
  ["community", "공동체", "gongdongche", "society", VocabLevel.ADVANCED],
  ["responsibility", "책임", "chaegim", "society", VocabLevel.ADVANCED],
  ["opportunity", "기회", "gihoe", "society", VocabLevel.ADVANCED],
  ["problem", "문제", "munje", "academic", VocabLevel.INTERMEDIATE],
  ["solution", "해결책", "haegyeolchaek", "academic", VocabLevel.ADVANCED],
  ["reason", "이유", "iyu", "academic", VocabLevel.INTERMEDIATE],
  ["result", "결과", "gyeolgwa", "academic", VocabLevel.INTERMEDIATE],
  ["cause", "원인", "wonin", "academic", VocabLevel.ADVANCED],
  ["effect", "영향", "yeonghyang", "academic", VocabLevel.ADVANCED],
  ["hypothesis", "가설", "gaseol", "academic", VocabLevel.ADVANCED],
  ["conclusion", "결론", "gyeollon", "academic", VocabLevel.ADVANCED],
  ["method", "방법", "bangbeop", "academic", VocabLevel.INTERMEDIATE],
  ["concept", "개념", "gaenyeom", "academic", VocabLevel.ADVANCED],
].map(([en, ko, rom, topic, level]) => ({ en, ko, rom, topic, level })) as Term[];

const ACTIONS: Term[] = [
  ["study", "공부하다", "gongbuhada", "school", VocabLevel.BEGINNER],
  ["read", "읽다", "ikda", "school", VocabLevel.BEGINNER],
  ["write", "쓰다", "sseuda", "school", VocabLevel.BEGINNER],
  ["listen", "듣다", "deutda", "school", VocabLevel.BEGINNER],
  ["speak", "말하다", "malhada", "school", VocabLevel.BEGINNER],
  ["ask", "묻다", "mutda", "school", VocabLevel.INTERMEDIATE],
  ["answer", "대답하다", "daedaphada", "school", VocabLevel.INTERMEDIATE],
  ["explain", "설명하다", "seolmyeonghada", "academic", VocabLevel.INTERMEDIATE],
  ["compare", "비교하다", "bigyohada", "academic", VocabLevel.INTERMEDIATE],
  ["analyze", "분석하다", "bunseokhada", "academic", VocabLevel.ADVANCED],
  ["evaluate", "평가하다", "pyeonggahada", "academic", VocabLevel.ADVANCED],
  ["summarize", "요약하다", "yoyakhada", "academic", VocabLevel.ADVANCED],
  ["decide", "결정하다", "gyeoljeonghada", "work", VocabLevel.INTERMEDIATE],
  ["prepare", "준비하다", "junbihada", "work", VocabLevel.INTERMEDIATE],
  ["practice", "연습하다", "yeonseuphada", "daily-life", VocabLevel.BEGINNER],
  ["remember", "기억하다", "gieokhada", "daily-life", VocabLevel.INTERMEDIATE],
  ["forget", "잊다", "itda", "daily-life", VocabLevel.INTERMEDIATE],
  ["travel", "여행하다", "yeohaenghada", "travel", VocabLevel.INTERMEDIATE],
  ["reserve", "예약하다", "yeyakhada", "travel", VocabLevel.INTERMEDIATE],
  ["recover", "회복하다", "hoebokhada", "health", VocabLevel.ADVANCED],
].map(([en, ko, rom, topic, level]) => ({ en, ko, rom, topic, level })) as Term[];

const QUALITIES: Term[] = [
  ["good", "좋다", "jota", "daily-life", VocabLevel.BEGINNER],
  ["bad", "나쁘다", "nappeuda", "daily-life", VocabLevel.BEGINNER],
  ["big", "크다", "keuda", "daily-life", VocabLevel.BEGINNER],
  ["small", "작다", "jakda", "daily-life", VocabLevel.BEGINNER],
  ["fast", "빠르다", "ppareuda", "daily-life", VocabLevel.BEGINNER],
  ["slow", "느리다", "neurida", "daily-life", VocabLevel.BEGINNER],
  ["easy", "쉽다", "swipda", "school", VocabLevel.BEGINNER],
  ["difficult", "어렵다", "eoryeopda", "school", VocabLevel.BEGINNER],
  ["important", "중요하다", "jungyohada", "academic", VocabLevel.INTERMEDIATE],
  ["necessary", "필요하다", "pillyohada", "academic", VocabLevel.INTERMEDIATE],
  ["accurate", "정확하다", "jeonghwakhada", "academic", VocabLevel.ADVANCED],
  ["logical", "논리적이다", "nollijeogida", "academic", VocabLevel.ADVANCED],
  ["efficient", "효율적이다", "hyoyuljeogida", "work", VocabLevel.ADVANCED],
  ["responsible", "책임감 있다", "chaegimgam itda", "society", VocabLevel.ADVANCED],
].map(([en, ko, rom, topic, level]) => ({ en, ko, rom, topic, level })) as Term[];

const CATEGORY_NAMES: Record<string, string> = {
  greetings: "Sapaan & Ungkapan Dasar",
  "daily-life": "Kehidupan Sehari-hari",
  food: "Makanan & Minuman",
  school: "Sekolah & Belajar",
  family: "Keluarga & Relasi",
  work: "Kerja & Bisnis",
  travel: "Perjalanan & Arah",
  health: "Kesehatan",
  technology: "Teknologi",
  society: "Budaya & Masyarakat",
  academic: "Akademik Lanjutan",
  "sentence-patterns": "Pola Kalimat Praktis",
  "advanced-collocations": "Kolokasi Mahir",
};

const INDONESIAN_TERMS: Record<string, string> = {
  hello: "halo",
  goodbye: "selamat tinggal",
  "thank you": "terima kasih",
  sorry: "maaf",
  yes: "ya",
  no: "tidak",
  please: "tolong",
  "nice to meet you": "senang bertemu denganmu",
  morning: "pagi",
  afternoon: "siang",
  evening: "malam",
  today: "hari ini",
  tomorrow: "besok",
  yesterday: "kemarin",
  water: "air",
  house: "rumah",
  room: "ruangan",
  door: "pintu",
  window: "jendela",
  chair: "kursi",
  table: "meja",
  bag: "tas",
  phone: "telepon",
  friend: "teman",
  weather: "cuaca",
  promise: "janji",
  memory: "ingatan",
  habit: "kebiasaan",
  rice: "nasi",
  food: "makanan",
  restaurant: "restoran",
  coffee: "kopi",
  tea: "teh",
  fruit: "buah",
  vegetable: "sayuran",
  bread: "roti",
  meat: "daging",
  fish: "ikan",
  breakfast: "sarapan",
  lunch: "makan siang",
  dinner: "makan malam",
  recipe: "resep",
  school: "sekolah",
  teacher: "guru",
  student: "siswa",
  book: "buku",
  homework: "pekerjaan rumah",
  test: "ujian",
  classroom: "ruang kelas",
  question: "pertanyaan",
  answer: "jawaban",
  lesson: "pelajaran",
  grade: "nilai",
  assignment: "tugas",
  research: "penelitian",
  analysis: "analisis",
  evidence: "bukti",
  family: "keluarga",
  mother: "ibu",
  father: "ayah",
  "older brother": "kakak laki-laki",
  "older sister": "kakak perempuan",
  "younger sibling": "adik",
  child: "anak",
  grandmother: "nenek",
  grandfather: "kakek",
  colleague: "rekan kerja",
  meeting: "rapat",
  company: "perusahaan",
  customer: "pelanggan",
  project: "proyek",
  deadline: "tenggat waktu",
  strategy: "strategi",
  negotiation: "negosiasi",
  presentation: "presentasi",
  budget: "anggaran",
  airport: "bandara",
  train: "kereta",
  bus: "bus",
  taxi: "taksi",
  map: "peta",
  ticket: "tiket",
  hotel: "hotel",
  passport: "paspor",
  reservation: "reservasi",
  luggage: "barang bawaan",
  left: "kiri",
  right: "kanan",
  "straight ahead": "lurus ke depan",
  hospital: "rumah sakit",
  medicine: "obat",
  doctor: "dokter",
  nurse: "perawat",
  pain: "nyeri",
  fever: "demam",
  exercise: "olahraga",
  sleep: "tidur",
  stress: "stres",
  recovery: "pemulihan",
  computer: "komputer",
  internet: "internet",
  password: "kata sandi",
  screen: "layar",
  keyboard: "papan ketik",
  message: "pesan",
  file: "berkas",
  data: "data",
  security: "keamanan",
  algorithm: "algoritma",
  culture: "budaya",
  history: "sejarah",
  society: "masyarakat",
  economy: "ekonomi",
  law: "hukum",
  policy: "kebijakan",
  environment: "lingkungan",
  community: "komunitas",
  responsibility: "tanggung jawab",
  opportunity: "kesempatan",
  problem: "masalah",
  solution: "solusi",
  reason: "alasan",
  result: "hasil",
  cause: "penyebab",
  effect: "dampak",
  hypothesis: "hipotesis",
  conclusion: "kesimpulan",
  method: "metode",
  concept: "konsep",
  study: "belajar",
  read: "membaca",
  write: "menulis",
  listen: "mendengarkan",
  speak: "berbicara",
  ask: "bertanya",
  explain: "menjelaskan",
  compare: "membandingkan",
  analyze: "menganalisis",
  evaluate: "mengevaluasi",
  summarize: "merangkum",
  decide: "memutuskan",
  prepare: "menyiapkan",
  practice: "berlatih",
  remember: "mengingat",
  forget: "melupakan",
  travel: "bepergian",
  reserve: "memesan",
  recover: "pulih",
  good: "baik",
  bad: "buruk",
  big: "besar",
  small: "kecil",
  fast: "cepat",
  slow: "lambat",
  easy: "mudah",
  difficult: "sulit",
  important: "penting",
  necessary: "perlu",
  accurate: "akurat",
  logical: "logis",
  efficient: "efisien",
  responsible: "bertanggung jawab",
};

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

export function buildVocabSeed(targetWordCount = 20_000): VocabCategorySeed[] {
  const buckets = new Map<string, VocabWordSeed[]>();
  const seenByCategory = new Map<string, Set<string>>();

  const add = (
    key: string,
    entry: VocabWordSeed,
    example?: { en: string; ko: string },
  ) => {
    const normalizedEnglish = entry.english.trim().replace(/\s+/g, " ");
    const seen = seenByCategory.get(key) ?? new Set<string>();
    if (seen.has(normalizedEnglish.toLowerCase())) return;
    seen.add(normalizedEnglish.toLowerCase());
    seenByCategory.set(key, seen);

    const words = buckets.get(key) ?? [];
    words.push({
      ...entry,
      english: normalizedEnglish,
      indonesian: entry.indonesian ?? toIndonesian(normalizedEnglish),
      exampleSentenceEn: entry.exampleSentenceEn ?? example?.en,
      exampleSentenceKo: entry.exampleSentenceKo ?? example?.ko,
    });
    buckets.set(key, words);
  };

  for (const term of TERMS) {
    add(term.topic, {
      english: term.en,
      korean: term.ko,
      koreanRomanized: term.rom,
      level: term.level,
      exampleSentenceEn: `I am learning the word "${term.en}".`,
      exampleSentenceKo: `저는 "${term.ko}"라는 단어를 배우고 있어요.`,
    });
  }

  for (const action of ACTIONS) {
    add(action.topic, {
      english: `to ${action.en}`,
      korean: action.ko,
      koreanRomanized: action.rom,
      level: action.level,
      exampleSentenceEn: `I want to ${action.en}.`,
      exampleSentenceKo: `저는 ${verbStem(action.ko)}고 싶어요.`,
    });
  }

  for (const quality of QUALITIES) {
    add(quality.topic, {
      english: quality.en,
      korean: quality.ko,
      koreanRomanized: quality.rom,
      level: quality.level,
      exampleSentenceEn: `This is ${quality.en}.`,
      exampleSentenceKo: `이것은 ${qualityToPredicate(quality.ko)}.`,
    });
  }

  const allTerms = TERMS.filter((term) => !["greetings"].includes(term.topic));
  const learningFrames = [
    {
      level: VocabLevel.BEGINNER,
      en: (t: Term) => `I like ${article(t.en)} ${t.en}`,
      ko: (t: Term) => `저는 ${objectPhrase(t)} 좋아해요`,
      rom: (t: Term) => `jeoneun ${t.rom}${objectRomanized(t.ko)} joahaeyo`,
    },
    {
      level: VocabLevel.BEGINNER,
      en: (t: Term) => `This is ${article(t.en)} ${t.en}`,
      ko: (t: Term) => `이것은 ${subjectPhrase(t)}예요`,
      rom: (t: Term) => `igeoseun ${t.rom}${topicRomanized(t.ko)}yeyo`,
    },
    {
      level: VocabLevel.INTERMEDIATE,
      en: (t: Term) => `I need ${article(t.en)} ${t.en}`,
      ko: (t: Term) => `저는 ${subjectPhrase(t)} 필요해요`,
      rom: (t: Term) => `jeoneun ${t.rom}${subjectRomanized(t.ko)} pillyohaeyo`,
    },
    {
      level: VocabLevel.INTERMEDIATE,
      en: (t: Term) => `Please explain ${article(t.en)} ${t.en}`,
      ko: (t: Term) => `${objectPhrase(t)} 설명해 주세요`,
      rom: (t: Term) => `${t.rom}${objectRomanized(t.ko)} seolmyeonghae juseyo`,
    },
    {
      level: VocabLevel.ADVANCED,
      en: (t: Term) => `I can talk about ${t.en}`,
      ko: (t: Term) => `저는 ${t.ko}에 대해 말할 수 있어요`,
      rom: (t: Term) => `jeoneun ${t.rom}e daehae malhal su isseoyo`,
    },
    {
      level: VocabLevel.ADVANCED,
      en: (t: Term) => `This topic is related to ${t.en}`,
      ko: (t: Term) => `이 주제는 ${t.ko}와 관련이 있어요`,
      rom: (t: Term) => `i juje-neun ${t.rom}wa gwanlyeoni isseoyo`,
    },
  ];

  for (const term of allTerms) {
    for (const frame of learningFrames) {
      add("sentence-patterns", {
        english: frame.en(term),
        korean: frame.ko(term),
        koreanRomanized: frame.rom(term),
        level: maxLevel(term.level, frame.level),
      });
    }
  }

  for (const action of ACTIONS) {
    add("sentence-patterns", {
      english: `I want to ${action.en}`,
      korean: `저는 ${verbStem(action.ko)}고 싶어요`,
      koreanRomanized: `jeoneun ${verbStem(action.rom)}go sipeoyo`,
      level: action.level,
    });
    add("sentence-patterns", {
      english: `I have to ${action.en}`,
      korean: `저는 ${verbStem(action.ko)}야 해요`,
      koreanRomanized: `jeoneun ${verbStem(action.rom)}ya haeyo`,
      level: maxLevel(action.level, VocabLevel.INTERMEDIATE),
    });
    add("sentence-patterns", {
      english: `I am learning to ${action.en}`,
      korean: `저는 ${verbStem(action.ko)}는 것을 배우고 있어요`,
      koreanRomanized: `jeoneun ${verbStem(action.rom)}neun geoseul baeugo isseoyo`,
      level: VocabLevel.ADVANCED,
    });
  }

  const relationFrames = [
    {
      level: VocabLevel.BEGINNER,
      en: (a: Term, b: Term) => `${a.en} and ${b.en}`,
      ko: (a: Term, b: Term) => `${a.ko}와 ${b.ko}`,
      rom: (a: Term, b: Term) => `${a.rom}wa ${b.rom}`,
    },
    {
      level: VocabLevel.INTERMEDIATE,
      en: (a: Term, b: Term) => `the relationship between ${a.en} and ${b.en}`,
      ko: (a: Term, b: Term) => `${a.ko}와 ${b.ko}의 관계`,
      rom: (a: Term, b: Term) => `${a.rom}wa ${b.rom}ui gwangye`,
    },
    {
      level: VocabLevel.ADVANCED,
      en: (a: Term, b: Term) => `compare ${a.en} with ${b.en}`,
      ko: (a: Term, b: Term) => `${a.ko}와 ${b.ko}를 비교하다`,
      rom: (a: Term, b: Term) => `${a.rom}wa ${b.rom}reul bigyohada`,
    },
    {
      level: VocabLevel.ADVANCED,
      en: (a: Term, b: Term) => `the difference between ${a.en} and ${b.en}`,
      ko: (a: Term, b: Term) => `${a.ko}와 ${b.ko}의 차이`,
      rom: (a: Term, b: Term) => `${a.rom}wa ${b.rom}ui chai`,
    },
  ];

  for (let leftIndex = 0; leftIndex < allTerms.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < allTerms.length; rightIndex += 1) {
      const left = allTerms[leftIndex];
      const right = allTerms[rightIndex];
      for (const frame of relationFrames) {
        add("advanced-collocations", {
          english: frame.en(left, right),
          korean: frame.ko(left, right),
          koreanRomanized: frame.rom(left, right),
          level: maxLevel(left.level, right.level, frame.level),
        });
        if (totalWords(buckets) >= targetWordCount) return toSeedArray(buckets);
      }
    }
  }

  return toSeedArray(buckets);
}

function toSeedArray(buckets: Map<string, VocabWordSeed[]>): VocabCategorySeed[] {
  return Array.from(buckets.entries()).map(([key, words]) => ({
    key,
    name: CATEGORY_NAMES[key] ?? titleCase(key),
    words,
  }));
}

function totalWords(buckets: Map<string, VocabWordSeed[]>) {
  return Array.from(buckets.values()).reduce((total, words) => total + words.length, 0);
}

function toIndonesian(english: string) {
  const value = english.toLowerCase();
  if (INDONESIAN_TERMS[value]) return INDONESIAN_TERMS[value];
  if (value.startsWith("to ")) {
    return INDONESIAN_TERMS[value.slice(3)] ?? value.slice(3);
  }

  const patterns: Array<[RegExp, (...parts: string[]) => string]> = [
    [/^i like (?:a |an )?(.+)$/, (term) => `saya suka ${translateTerm(term)}`],
    [/^this is (?:a |an )?(.+)$/, (term) => `ini adalah ${translateTerm(term)}`],
    [/^i need (?:a |an )?(.+)$/, (term) => `saya butuh ${translateTerm(term)}`],
    [/^please explain (?:a |an )?(.+)$/, (term) => `tolong jelaskan ${translateTerm(term)}`],
    [/^i can talk about (.+)$/, (term) => `saya bisa berbicara tentang ${translateTerm(term)}`],
    [/^this topic is related to (.+)$/, (term) => `topik ini berkaitan dengan ${translateTerm(term)}`],
    [/^i want to (.+)$/, (term) => `saya ingin ${translateTerm(term)}`],
    [/^i have to (.+)$/, (term) => `saya harus ${translateTerm(term)}`],
    [/^i am learning to (.+)$/, (term) => `saya sedang belajar ${translateTerm(term)}`],
    [/^(.+) and (.+)$/, (left, right) => `${translateTerm(left)} dan ${translateTerm(right)}`],
    [
      /^the relationship between (.+) and (.+)$/,
      (left, right) => `hubungan antara ${translateTerm(left)} dan ${translateTerm(right)}`,
    ],
    [
      /^compare (.+) with (.+)$/,
      (left, right) => `bandingkan ${translateTerm(left)} dengan ${translateTerm(right)}`,
    ],
    [
      /^the difference between (.+) and (.+)$/,
      (left, right) => `perbedaan antara ${translateTerm(left)} dan ${translateTerm(right)}`,
    ],
  ];

  for (const [regex, render] of patterns) {
    const match = value.match(regex);
    if (match) return render(...match.slice(1));
  }

  return english;
}

function translateTerm(term: string) {
  return INDONESIAN_TERMS[term.toLowerCase()] ?? term;
}

function article(word: string) {
  return VOWELS.has(word[0]?.toLowerCase()) ? "an" : "a";
}

function verbStem(value: string) {
  return value.endsWith("하다") ? value.slice(0, -2) + "하" : value.replace(/다$/, "");
}

function qualityToPredicate(korean: string) {
  return korean.endsWith("다") ? korean.replace(/다$/, "요") : `${korean}예요`;
}

function objectPhrase(term: Term) {
  return `${term.ko}${hasFinalConsonant(term.ko) ? "을" : "를"}`;
}

function subjectPhrase(term: Term) {
  return `${term.ko}${hasFinalConsonant(term.ko) ? "이" : "가"}`;
}

function objectRomanized(korean: string) {
  return hasFinalConsonant(korean) ? "eul" : "reul";
}

function subjectRomanized(korean: string) {
  return hasFinalConsonant(korean) ? "i" : "ga";
}

function topicRomanized(korean: string) {
  return hasFinalConsonant(korean) ? "i" : "ga";
}

function hasFinalConsonant(value: string) {
  const lastHangul = [...value].reverse().find((char) => {
    const code = char.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
  if (!lastHangul) return false;
  return (lastHangul.charCodeAt(0) - 0xac00) % 28 !== 0;
}

function maxLevel(...levels: VocabLevel[]) {
  if (levels.includes(VocabLevel.ADVANCED)) return VocabLevel.ADVANCED;
  if (levels.includes(VocabLevel.INTERMEDIATE)) return VocabLevel.INTERMEDIATE;
  return VocabLevel.BEGINNER;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
