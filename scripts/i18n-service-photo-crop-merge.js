/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do editor de corte da FOTO DO SERVIÇO.
//
// A foto do serviço deixou de ser enquadrada sozinha (corte central às cegas) e
// passa pelo mesmo editor de zoom e arraste das outras superfícies. O editor é
// peça compartilhada, então ele ganhou o vocabulário do serviço: até aqui ele
// só sabia falar de "foto de perfil" e "imagem do post".
//
// A moldura é FIXA em 4:5 — é a proporção do card da vitrine (`aspect-[4/5]`),
// e é ela que o texto promete.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-service-photo-crop-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const MEDIA_CROP = {
  labelService: ["foto do serviço", "service photo", "foto del servicio"],
  serviceTooBig: [
    "A foto do serviço precisa ter no máximo 3MB após otimização.",
    "The service photo must be 3MB or less after optimization.",
    "La foto del servicio debe tener como máximo 3MB tras la optimización.",
  ],
};

const ACCOUNT = {
  adjustServicePhotoTitle: [
    "Ajustar foto do serviço",
    "Adjust service photo",
    "Ajustar foto del servicio",
  ],
  adjustServicePhotoDesc: [
    "Dê zoom e arraste para escolher o que aparece na vitrine.",
    "Zoom and drag to choose what shows up in your storefront.",
    "Haz zoom y arrastra para elegir lo que aparece en tu vitrina.",
  ],
};

const NAMESPACES = { MediaCrop: MEDIA_CROP, Account: ACCOUNT };

let added = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

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
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
