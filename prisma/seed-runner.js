// Bootstrap kecil supaya `seed.ts` bisa dijalankan lewat ts-node tanpa kena
// bug Node 20.6+ "TypeError: Unknown file extension .ts" - itu terjadi kalau
// file .ts dilempar langsung sebagai entry point CLI (`ts-node seed.ts`),
// karena Node mencoba mendeteksi format modul entry SEBELUM ts-node sempat
// mendaftarkan compiler hook-nya. Dengan entry point berupa .js biasa lalu
// require() manual di dalamnya, resolusi .ts lewat require() hook ts-node
// yang sudah terdaftar - jadi tidak kena masalah itu.
require("ts-node/register");
require("./seed.ts");
