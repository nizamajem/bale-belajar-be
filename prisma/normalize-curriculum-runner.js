// Bootstrap yang sama seperti seed-runner.js/import-curriculum-runner.js -
// lihat komentar di seed-runner.js untuk alasan kenapa entry point harus
// .js lalu require() manual ke .ts, bukan menjalankan ts-node langsung ke
// file .ts sebagai entry CLI.
require("ts-node/register");
require("./normalize-curriculum.ts");
