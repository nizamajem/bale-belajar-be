// Menjalankan hanya kurikulum dan kasus Detectivia dari seed utama.
// Mode ini sengaja tidak mengulang seed user demo maupun 20 ribu kosakata.
process.env.SEED_DETECTIVE_ONLY = "true";
require("ts-node/register");
require("../prisma/seed.ts");
