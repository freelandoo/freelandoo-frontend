/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do desvio CURTO → POST para vídeo deitado.
//
// Curto é vertical (9:16 ou 4:5) por definição; quem chega com vídeo 16:9 é
// convidado a publicar como Post, a superfície que enquadra em 1920x1080.
//
// Padrão da casa: fill-if-absent. Uso: node scripts/i18n-curto-landscape-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMPOSER = {
  "curto.landscapeTitle": [
    "Esse vídeo é deitado",
    "This video is landscape",
    "Este video es horizontal",
  ],
  "curto.landscapeBody": [
    "Curto é vertical. Publique como Post para manter o 16:9.",
    "Shorts are vertical. Publish it as a Post to keep 16:9.",
    "El Corto es vertical. Publícalo como Post para mantener el 16:9.",
  ],
  "curto.landscapeSwitch": [
    "Publicar como Post",
    "Publish as Post",
    "Publicar como Post",
  ],
  "curto.landscapeKeep": [
    "Continuar no Curto",
    "Stay on Short",
    "Seguir en Corto",
  ],
};

const NAMESPACES = { Composer: COMPOSER };

let added = 0;

for (let i = 0; i < LOCALES.length; i++) {
  const locale = LOCALES[i];
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added}`);
