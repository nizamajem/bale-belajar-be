// Bootstrap yang sama seperti seed-runner.js - lihat komentar di file itu
// untuk alasan kenapa entry point harus .js lalu require() manual ke .ts,
// bukan menjalankan ts-node langsung ke file .ts sebagai entry CLI.
require("ts-node/register");
require("./import-curriculum.ts");
