# BaleBelajar BE

Backend REST API BaleBelajar menggunakan NestJS, TypeScript strict, Swagger, Helmet, CORS, dan validation pipe.

## Menjalankan

```bash
npm install
npm run start:dev
```

API berjalan di `http://localhost:4000/api/v1`.

Swagger tersedia di `http://localhost:4000/docs`.

## Endpoint Awal

- `GET /api/v1/health`
- `GET /api/v1/health/database`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/student-login`
- `GET /api/v1/auth/me`
- `POST /api/v1/public/leads`
- `GET /api/v1/leads` protected: `SUPER_ADMIN`, `ADMIN`
- `GET /api/v1/schools`
- `POST /api/v1/schools`
- `GET /api/v1/schools/:id/statistics`
- `GET /api/v1/students`
- `POST /api/v1/students`
- `GET /api/v1/students/:id/assessment-history`
- `GET /api/v1/classrooms`
- `POST /api/v1/classrooms`
- `POST /api/v1/classrooms/:id/students`
- `DELETE /api/v1/classrooms/:id/students/:studentId`
- `GET /api/v1/classrooms/:id/statistics`
- `GET /api/v1/subjects`
- `POST /api/v1/subjects`
- `GET /api/v1/competencies`
- `POST /api/v1/competencies`
- `POST /api/v1/competencies/:id/prerequisites`
- `GET /api/v1/questions`
- `POST /api/v1/questions`
- `POST /api/v1/questions/:id/activate`
- `GET /api/v1/assessments`
- `POST /api/v1/assessments`
- `PATCH /api/v1/assessments/:id`
- `POST /api/v1/assessments/:id/questions`
- `DELETE /api/v1/assessments/:id/questions/:questionId`
- `POST /api/v1/assessments/:id/classrooms`
- `POST /api/v1/assessments/:id/publish`
- `POST /api/v1/assessments/:id/close`
- `GET /api/v1/assessments/:id/progress`
- `GET /api/v1/assessments/:id/results`
- `GET /api/v1/assessments/:id/heatmap`
- `GET /api/v1/assessments/:id/remedial-groups`
- `GET /api/v1/assessments/:id/export`
- `GET /api/v1/student/assessments`
- `GET /api/v1/student/assessments/:id`
- `POST /api/v1/student/assessments/:id/start`
- `GET /api/v1/student/attempts/:attemptId`
- `PUT /api/v1/student/attempts/:attemptId/answers/:questionId`
- `POST /api/v1/student/attempts/:attemptId/mark/:questionId`
- `POST /api/v1/student/attempts/:attemptId/submit`
- `GET /api/v1/student/attempts/:attemptId/result`
- `GET /api/v1/student/attempts/:attemptId/report`

## Catatan

Foundation ini sudah memakai Prisma/PostgreSQL untuk data awal dan leads.

## Database

Jalankan PostgreSQL dari root workspace:

```bash
docker compose up -d postgres
```

Lalu dari folder `BALE_BELAJAR_BE`:

```bash
npm run prisma:generate
npm run db:push
npm run seed
```

## Akun Demo

- Admin: `admin@balebelajar.id` / `Admin123!`
- Guru: `guru@balebelajar.id` / `Guru123!`
- Siswa: `BB-S001`
