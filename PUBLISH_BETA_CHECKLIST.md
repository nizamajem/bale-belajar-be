# Bale Belajar Publish Beta Checklist

Status terakhir: backend dan mobile sudah siap untuk beta terbatas jika item wajib di bawah tetap hijau.

## Wajib Hijau Sebelum Beta

- `npm run prepare:curriculum`
  - `ready` harus `true`.
  - `contentQualityReady` harus `true`.
  - `blockers` harus kosong.
  - `qualityWarnings` harus kosong.
- `npm run build`
- `npm test -- --runInBand`
- `flutter analyze`
- `flutter test`
- `flutter build apk --debug`

## Flow Pelajar Yang Harus Dicek Manual

1. Register atau login sebagai siswa.
2. Selesaikan onboarding.
3. Jalankan cek awal atau placement.
4. Buka BaleVerse.
5. Pilih world.
6. Pastikan halaman materi tampil sebelum quest.
7. Baca materi, checklist, dan studi kasus.
8. Tekan `Mulai Quest`.
9. Jawab 10 soal.
10. Submit quest.
11. Pastikan skor, XP, ringkasan benar otomatis, pending review, dan rekomendasi tampil.
12. Tekan `Kembali ke Materi`.

## Catatan Konten

- Numeria, Detectivia, dan KodeX sudah punya 5 quest awal dengan 10 soal aktif per quest.
- Scientia memakai workbook kurikulum utama.
- Readiness sekarang memblokir world tanpa materi, quest kurang dari 10 soal, placement duplikat, dan soal tanpa child record penting.

## Catatan Release

- Build beta harus memakai `BALE_API_URL` production/staging yang benar.
- Jangan publish jika API production belum menjalankan pipeline kurikulum terbaru.
- Untuk Play Store internal testing, gunakan build version yang dinaikkan dari `pubspec.yaml`.
