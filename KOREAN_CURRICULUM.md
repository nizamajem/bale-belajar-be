# Korean course — Hangul to TOPIK II level 6 preparation

World: `korean-learning` (QUEST), subject `KOR`. The existing `korea` vocabulary world is preserved.

Version `hangul-topik6-v2` contains **130 units, 520 lessons, 6,016 activities** across KO00–KO08. Four lessons per unit introduce, practice, apply and review content. Starter lessons have ten activities; extended lessons have twelve including contextual reading, actual Korean TTS listening and controlled writing or manually reviewed free writing. Vocabulary and passages deliberately recur: 6,016 activities does not mean 6,016 distinct texts.

| Level | Units | Focus |
|---|---:|---|
| KO00 Hangul | 12 | Blocks, vowels, consonants, final sounds, connected pronunciation |
| KO01 Survival | 16 | Polite interaction, introductions, numbers, ordering, directions |
| KO02 Everyday | 18 | Daily life, reasons, plans, comparisons, ability, health |
| KO03 Travel | 14 | Airport, transport, accommodation, shopping, resolving problems |
| KO04 Intermediate | 18 | Modifiers, conditionals, reported speech, register, notices |
| KO05 University | 12 | Academic interaction, assignments, research, presentations |
| KO06 Workplace | 14 | Professional communication, reports, coordination, negotiation |
| KO07 Advanced | 14 | Abstract discourse, inference, evidence, counterarguments, synthesis |
| KO08 TOPIK I–II | 12 | Exam preparation skills, data interpretation, comprehension and essays |

University/workplace branch from intermediate and are optional for advanced. TOPIK I units 1–4 branch from everyday; TOPIK II units 5–8 from intermediate; units 9–12 require advanced. Units unlock only after their prerequisite chapter is complete. There are 98 free-writing tasks; final essays target 600–700 characters including spaces. Advanced and TOPIK II use 22 independent listening texts so listening answers cannot simply be copied from the reading task. Earlier units pair reading/listening for guided practice.

## Install

From the backend directory, with its configured DATABASE_URL:

```
npm run validate:korean
npm run seed:korean
npm run verify:korean
npm run verify:korean-writing
npm run verify:korean-exams
```

The dedicated seed touches this course, its vocabulary categories and the two Korean mock worlds. It preserves UUIDs using code-based upserts, runs each unit in a transaction, and archives removed questions rather than deleting learner answers. Re-running it refreshes content without duplicating chapters or quests. Normal demo seed and production-data preparation also include the course. No schema migration is required.

## App integration

All endpoints below require the existing student JWT and use the standard response envelope.

- `GET /api/v1/student/worlds`: the course appears through the existing world discovery flow.
- `GET /api/v1/student/korean/path`: unit competency IDs, optional branches and states `LOCKED`, `AVAILABLE`, `COMPLETED`, `REVIEW_PENDING`; no answer keys.
- `GET /api/v1/student/quests/today?worldKey=korean-learning`: current daily lesson.
- `POST /api/v1/student/quests/next?worldKey=korean-learning`: next daily assignment, subject to the user's daily-quest setting.
- Existing start, save-answer, submit, and result endpoints are unchanged. Submit/result additionally expose `passScore` and `passed`.

Flutter supports six seeded types, with Android Korean TTS playback and a real essay input with character counter. Listening requires an installed ko-KR voice pack; unsupported platforms show an error. Scripts are sent to the device for synthesis but not displayed during listening: this is learning content, not a secure examination. Lesson passing requires an overall score >=75 plus completed human review and a writing score >=75 when free writing is present. Pending writing cannot unlock the next unit or earn passing XP. Blank/undersized course writing cannot be submitted; empty or invalid-length mock writing earns zero when the exam is submitted. Targeted competency requests cannot skip prerequisites or the daily session limit.

### Writing review

Only active ADMIN/SUPER_ADMIN JWTs can use `GET /api/v1/student/korean/writing-reviews` (oldest 100 pending answers) and `POST /api/v1/student/korean/writing-reviews/:answerId`. Submit all rubric criteria once, each scored 0–100, and feedback. Rubric weights: task completion 30%, coherence 25%, grammar/register 25%, vocabulary/spelling/spacing 20%. Review records the reviewer, mastery evidence, final score and eligible XP; repeated grading is rejected. An admin review screen is not included: use the authenticated API/Swagger.

```json
{"criteria":[{"criterionId":"task_completion","score":80},{"criterionId":"coherence","score":75},{"criterionId":"grammar","score":75},{"criterionId":"vocabulary","score":80}],"feedback":"Jelaskan hubungan bukti dengan kesimpulan dan periksa spasi."}
```

### Local Android preview

The app normally uses the production API. A local database seed will not appear on that server. To preview this course over USB, start the local backend on port 4000, run `adb reverse tcp:4000 tcp:4000`, then run the app with `--dart-define=BALE_API_URL=http://127.0.0.1:4000/api/v1`. The app's VS Code launch configurations include a USB-local profile and a production profile. Keep the USB forwarding and local backend running; use an account available on that backend. Rebuilding against the production API requires deploying the backend changes and seeding its database separately.

XP: 40 per lesson, 60 per unit challenge on the first pass; second pass 50%, subsequent passes 25%. Failed attempts earn no lesson XP. Existing XP ledger and daily-activity tracking are used.

## Explicit limits

- Listening uses synthetic speech, not native-speaker recordings. Speech scoring, AI conversation, handwriting, adaptive SRS and badges are not implemented.
- Speaking is a self-practice mission, not a scored exercise.
- English and Indonesian meanings are included. Romanization is omitted.
- This original preparation course covers a path through the target level, but completing it does not prove TOPIK 6 readiness or guarantee passing. The bank is compact (four focus words and one passage per added unit); extensive reading, varied authentic listening and external writing feedback remain necessary. It is not an independent expert linguistic certification.
- Mocks use the app question interface, a global timer and typed responses. Paper grids, official IBT interactions, enforced section transitions and calibrated readiness predictions are not implemented. Internal passing scores are not official TOPIK scores.
- Database injection does not deploy or restart a hosted backend. Restart the backend after deploying these service changes.

## Verification

[NIIED's official TOPIK overview](https://www.niied.go.kr/web/NIIED/contents/niiedEng/eng_topikOverview) distinguishes TOPIK I, TOPIK II and the separate speaking exam. TOPIK II PBT level 6 starts at 230/300, IBT at 431/600; timing and item counts differ. This course and its mocks use original practice content; they are not official papers or validated score predictors.

`validate:korean` checks exercise counts, unique codes, acyclic prerequisites, complete vocabulary/examples, rubric weights, ordering size and valid choices. `korean-progression.spec.ts` checks unlocks, branches, the 75-point boundary, remediation and competency bypass prevention. `korean-writing-review.spec.ts` checks grading, reviewer audit, XP, failed writing and duplicate review prevention. `verify:korean` performs read-only database QA including counts, relationships, scoring, independent advanced listening, app discovery and hidden answer keys. `verify:korean-writing` exercises real database review, feedback, mastery and XP using temporary data inside a transaction that is deliberately rolled back.

## Timed TOPIK II practice

The Korean path also exposes `practiceExams` and opens two separate QUEST worlds:

| World | Questions | Global time | Sections |
|---|---:|---:|---|
| `korean-topik-pbt` | 104 | 180 minutes | 50 listening, 4 writing, 50 reading |
| `korean-topik-ibt` | 63 | 125 minutes | 30 listening, 30 reading, 3 writing |

The course remains 130 units / 520 lessons / 6,016 activities. Adding these 167 mock activities gives 6,183 activities and 105 free-writing tasks overall. The bank has 50 new reading questions and 28 new listening scripts; another 22 listening scripts reuse advanced course material. IBT draws a balanced subset of that bank, so the two mocks are not independent test forms.

The server sets an absolute deadline when an attempt starts and rejects answers after it expires. Reopening preserves the deadline and saved answers. Flutter autosaves drafts, allows previous/next navigation and early submission, and submits when the timer expires while the attempt screen is active. Closed apps do not submit in the background; reopening an expired attempt submits it. Unanswered items earn zero. Section timing is guidance rather than enforced section locks.

All valid writing responses require human review. Results show listening, reading and writing separately; total and passing XP remain pending until every writing task is reviewed. Each writing task must reach 75 for passing XP. First-pass mock reward is 120 XP, with the existing repeat reductions.

PBT writing uses two contextual completion tasks worth 10 points each, a 200–300-character data description worth 30, and a 600–700-character argument worth 50. Description rubric proportions follow 7/7/16 and argument 12/12/26. The summed section result is labelled practice points out of 300, never an official result. IBT uses internal exercise weights and character targets; its normalized practice grades are not converted into the official 600-point scale or TOPIK levels. See [NIIED format information](https://www.niied.go.kr/web/NIIED/contents/niiedEng/eng_topikOverview), [official PBT writing guidance](https://exam.topik.go.kr/nasdata/webnas/raonkeditordata/uploadId/2024/02/20240227_175504804_07236.pdf) and the [IBT writing tutorial sample](https://www.topik.go.kr/asset/vendor/tutorial/exam2/write_exam.html).

`verify:korean-exams` checks both seeded formats and runs real submit/review/expiry flows inside rolled-back database transactions. Backend exam tests cover absolute deadlines, weighted sections, pending writing and unanswered items. Flutter tests cover resume, expiry submission, draft saving, writing character bounds and missing Korean voice support.