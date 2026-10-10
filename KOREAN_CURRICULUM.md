# Korean interactive course — starter release

World: `korean-learning` (QUEST), subject `KOR`. The existing `korea` vocabulary world is preserved.

This release contains **KO-00 Hangul Foundations and KO-01 Survival Korean**, 28 units, 112 lessons, 1,120 scored exercises. It is not the complete nine-level master curriculum. Four lessons per unit progressively introduce, practice, apply and review a curated set of content; vocabulary deliberately recurs. Each lesson has ten activities: recognition, meaning, matching, Hangul input, ordering, contextual reading and cumulative review. Survival application/challenge lessons also include explicitly authored grammar and communication checks. Lesson instructions include pronunciation guidance and a practical read-aloud mission.

## Install

From the backend directory, with its configured DATABASE_URL:

```
npm run validate:korean
npm run seed:korean
```

The dedicated seed only touches this course and its vocabulary categories. It preserves UUIDs using code-based upserts, runs each unit in a transaction, and archives removed questions rather than deleting learner answers. Re-running it refreshes content without duplicating chapters or quests. Normal demo seed and production-data preparation also include the course. No schema migration is required.

## App integration

All endpoints below require the existing student JWT and use the standard response envelope.

- `GET /api/v1/student/worlds`: the course appears through the existing world discovery flow.
- `GET /api/v1/student/korean/path`: ordered units and lesson states `LOCKED`, `AVAILABLE`, `COMPLETED`; no answer keys.
- `GET /api/v1/student/quests/today?worldKey=korean-learning`: current daily lesson.
- `POST /api/v1/student/quests/next?worldKey=korean-learning`: next daily assignment, subject to the user's daily-quest setting.
- Existing start, save-answer, submit, and result endpoints are unchanged. Submit/result additionally expose `passScore` and `passed`.

The existing Flutter quest renderer supports all four seeded exercise types. The app now has a Korean entry card on its dashboard and a course screen consuming the path endpoint, with completed, available and locked lessons, progress, XP and daily-session settings. Lesson completion requires score >=75 before the next lesson unlocks. Failed lessons are retried. Targeted competency requests cannot skip prerequisites. Completing the course enables review rotation.

### Local Android preview

The app normally uses the production API. A local database seed will not appear on that server. To preview this course over USB, start the local backend on port 4000, run `adb reverse tcp:4000 tcp:4000`, then run the app with `--dart-define=BALE_API_URL=http://127.0.0.1:4000/api/v1`. The app's VS Code launch configurations include a USB-local profile and a production profile. Keep the USB forwarding and local backend running; use an account available on that backend. Rebuilding against the production API requires deploying the backend changes and seeding its database separately.

XP: 40 per lesson, 60 per unit challenge on the first pass; second pass 50%, subsequent passes 25%. Failed attempts earn no lesson XP. Existing XP ledger and daily-activity tracking are used.

## Explicit limits

- No fabricated audio URLs or fake speech scores are seeded. Listening audio, speech evaluation, AI conversation, handwriting, vocabulary/grammar SRS, badges and the remaining KO-02–KO-08 content are not implemented by this starter seed.
- Speaking is a self-practice mission, not a scored exercise.
- English and Indonesian meanings are included. Romanization is omitted.
- This course is original starter content. It does not represent official TOPIK readiness or a completed expert linguistic audit.
- The current app's audio buttons are no-ops; adding audio-only questions before fixing the player would make lessons unusable.
- Database injection does not deploy or restart a hosted backend. Restart the backend after deploying these service changes.

## Verification

`validate:korean` checks exercise count, unique unit codes, ordering size and valid answer choices. `korean-progression.spec.ts` checks ordered unlocks, the 75-point boundary, remediation, missing scores and competency bypass prevention. `verify:korean` performs read-only database QA, checking relationships, answer children, exact course counts and playable lesson payloads.
