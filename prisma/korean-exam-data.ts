import type { KoreanExercise } from './korean-course-data';
import { koreanExamReading, ExamChoice } from './korean-exam-reading';
import { koreanExamListening } from './korean-exam-listening';

export type KoreanExamQuestion = KoreanExercise & { section: 'listening' | 'reading' | 'writing'; points: number };
export type KoreanExam = { mode: 'PBT' | 'IBT'; worldKey: string; code: string; minutes: number; questions: KoreanExamQuestion[] };
const choice = (row: ExamChoice, section: 'listening' | 'reading', points: number): KoreanExamQuestion => ({
  type: section === 'listening' ? 'AUDIO_CHOICE' : 'SINGLE_CHOICE',
  prompt: section === 'reading' ? `${row.text}\n\n${row.question}` : row.question,
  instruction: section === 'listening' ? '한국어 음성을 듣고 알맞은 답을 고르십시오.' : '글을 읽고 알맞은 답을 고르십시오.',
  answer: row.answer, choices: [row.answer, ...row.distractors], skill: row.skill,
  ...(section === 'listening' ? { audioScript: row.text } : {}), section, points,
});
const writing = (prompt: string, minCharacters: number, maxCharacters: number, points: number,
  rubric: Array<[string, string, number]>): KoreanExamQuestion => ({
  type: 'LONG_TEXT', prompt, skill: 'writing', section: 'writing', points, minCharacters, maxCharacters, rubric,
  instruction: `Tulis ${minCharacters}–${maxCharacters} karakter termasuk spasi dalam bahasa Korea. Penilaian rubrik oleh reviewer. Soal yang dilewati atau tidak memenuhi panjang minimum mendapat 0 untuk tugas yang belum dikerjakan.`,
});
const blanks: Array<[string, string, number]> = [['blank_a', 'Ketepatan konteks, grammar dan register ㉠', 50], ['blank_b', 'Ketepatan konteks, grammar dan register ㉡', 50]];
const essay: Array<[string, string, number]> = [['task_completion', 'Isi dan pemenuhan tugas', 24], ['coherence', 'Pengembangan dan organisasi', 24], ['language', 'Grammar, vocabulary, ejaan dan register', 52]];
const description: Array<[string, string, number]> = [['task_completion', 'Ketepatan isi dan penggunaan data', 23.33], ['coherence', 'Organisasi dan penghubung', 23.33], ['language', 'Grammar, vocabulary dan register', 53.34]];
const ibtRubric: Array<[string, string, number]> = [['task_completion', 'Pemenuhan tugas latihan', 30], ['coherence', 'Koherensi', 25], ['language', 'Ketepatan bahasa', 45]];
const pbtWriting = [
 writing('51. 다음 안내문의 빈칸 ㉠과 ㉡에 들어갈 말을 각각 한 문장으로 쓰십시오.\n\n독서 모임 장소 변경 안내\n이번 토요일 모임은 원래 도서관에서 열릴 예정이었습니다. 그런데 도서관 점검으로 그곳을 이용할 수 없어서 (㉠). 시작 시간은 오후 두 시로 같습니다. 새 장소를 찾기 어려운 분을 위해 길 안내를 보내 드리겠습니다. 안내가 필요한 분은 금요일까지 (㉡).\n\n두 문장을 ㉠: ..., ㉡: ... 형식으로 적으십시오.', 1, 200, 10, blanks),
 writing('52. 다음 글의 빈칸 ㉠과 ㉡에 들어갈 말을 각각 한 문장으로 쓰십시오.\n\n운동 계획을 세울 때 처음부터 긴 시간을 정하면 부담이 커질 수 있다. 부담 때문에 계획을 자주 미루게 되면 (㉠). 반면 짧은 시간부터 규칙적으로 실천하면 습관을 만들기가 쉬워진다. 따라서 운동을 시작하는 사람은 (㉡).\n\n두 문장을 ㉠: ..., ㉡: ... 형식으로 적으십시오.', 1, 200, 10, blanks),
 writing('53. 다음 가상의 조사 자료를 설명하는 글을 200~300자로 쓰십시오. 제목은 쓰지 마십시오.\n\n지역 도서관 전자책 이용률\n2022년: 20%\n2024년: 35%\n2026년: 45%\n조사 대상: 각 연도 지역 도서관 회원\n\n전체 변화와 두 기간의 증가 폭을 비교하십시오. 자료에 제시되지 않은 증가 원인을 확정해서 쓰지 마십시오.', 200, 300, 30, description),
 writing('54. 공공 서비스를 온라인으로 제공하는 일이 늘고 있다. 다음 세 가지 내용을 모두 포함하여 자신의 생각을 600~700자로 쓰십시오.\n\n1. 온라인 공공 서비스가 이용자에게 어떤 도움을 줄 수 있는가?\n2. 온라인 서비스만 제공할 때 어떤 문제가 생길 수 있는가?\n3. 편의와 접근성을 함께 높이려면 어떤 방법과 조건이 필요한가?\n\n제목이나 문제 문장을 그대로 옮겨 쓰지 말고 주장, 근거, 반론에 대한 대응을 논리적으로 구성하십시오.', 600, 700, 50, essay),
];
const ibtWriting = [
 writing('1. 담당자에게 보내는 이메일을 완성하십시오.\n\n다음 주 금요일에 신청한 강좌에 참석하기 어렵게 되었습니다. 다음 달에 같은 강좌를 수강할 수 있는지 문의하려고 합니다. 변경을 요청하는 이유와 확인하고 싶은 사항을 포함하여 정중한 이메일을 쓰십시오.\n\n이 과제의 50~200자 범위는 Bale Belajar 연습 목표이며 공식 IBT 모든 문항의 분량을 뜻하지 않습니다.', 50, 200, 20, ibtRubric),
 writing('2. 다음 가상의 자료를 비교하여 200~300자로 설명하십시오.\n\n주민 강좌 신청 경로\n2023년: 온라인 40%, 방문 60%\n2026년: 온라인 65%, 방문 35%\n\n두 경로의 변화와 관계를 설명하십시오. 이 자료만으로 알 수 없는 원인을 사실처럼 쓰지 마십시오.\n\n이 과제의 분량과 배점은 자체 연습 설계입니다.', 200, 300, 30, ibtRubric),
 writing('3. 학교에서 공동 과제와 개인 과제를 어떻게 활용해야 하는지 자신의 의견을 400~500자로 쓰십시오. 공동 과제의 장점과 한계를 설명하고, 자신의 제안을 뒷받침하는 두 가지 근거를 포함하십시오. 특정 방식이 모든 학습자에게 항상 효과적이라고 단정하지 마십시오.', 400, 500, 50, ibtRubric),
];
const balanced = [...Array.from({ length: 10 }, (_, i) => i), ...Array.from({ length: 10 }, (_, i) => i + 20), ...Array.from({ length: 10 }, (_, i) => i + 40)];
export const koreanExams: KoreanExam[] = [
 { mode: 'PBT', worldKey: 'korean-topik-pbt', code: 'KOR-EXAM-PBT-01', minutes: 180,
   questions: [...koreanExamListening.map(row => choice(row, 'listening', 2)), ...pbtWriting, ...koreanExamReading.map(row => choice(row, 'reading', 2))] },
 { mode: 'IBT', worldKey: 'korean-topik-ibt', code: 'KOR-EXAM-IBT-01', minutes: 125,
   questions: [...balanced.map(i => choice(koreanExamListening[i], 'listening', 100 / 30)),
     ...balanced.map(i => choice(koreanExamReading[i], 'reading', 100 / 30)), ...ibtWriting] },
];
export function validateKoreanExams() {
 if (koreanExamReading.length !== 50 || koreanExamListening.length !== 50) throw new Error('Exam banks require 50 reading and 50 listening items.');
 for (const exam of koreanExams) {
  const counts = Object.fromEntries(['listening', 'reading', 'writing'].map(section => [section, exam.questions.filter(q => q.section === section).length]));
  const expected = exam.mode === 'PBT' ? [50, 50, 4] : [30, 30, 3];
  ['listening', 'reading', 'writing'].forEach((section, i) => { if (counts[section] !== expected[i]) throw new Error(`Invalid ${exam.mode} ${section} count`); });
  for (const question of exam.questions) {
   if (question.type !== 'LONG_TEXT' && (question.choices?.length !== 4 || new Set(question.choices).size !== 4 || !question.choices.includes(question.answer!))) throw new Error(`Invalid ${exam.mode} choices`);
   if (question.type === 'LONG_TEXT' && Math.abs(question.rubric!.reduce((sum, r) => sum + r[2], 0) - 100) > 0.001) throw new Error('Invalid exam writing rubric');
  }
  for (const section of ['listening', 'reading', 'writing']) if (Math.abs(exam.questions.filter(q => q.section === section).reduce((sum, q) => sum + q.points, 0) - 100) > 0.001) throw new Error(`Invalid section weight: ${exam.mode}`);
 }
 return { mockExams: koreanExams.length, mockQuestions: koreanExams.reduce((sum, exam) => sum + exam.questions.length, 0) };
}
