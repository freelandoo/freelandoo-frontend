/* eslint-disable @typescript-eslint/no-require-imports */
// Merge da engrenagem de CONFIGURAÇÃO de serviços, ao lado do "+ Serviço" na
// seção de Serviços do perfil (2026-09-06).
//
// Ela leva para `/account/profile/<id>/agenda`, que já existe e é onde moram
// disponibilidade da semana, exceções por data, preços e agendamentos.
//
// Padrão da casa: fill-if-absent, idempotente.
//
// Uso: node scripts/i18n-services-settings-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const PROFILE = {
  servicesSettingsAria: [
    "Configurar serviços e horários",
    "Configure services and hours",
    "Configurar servicios y horarios",
  ],
};

let added = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Profile = dict.Profile || {};
  for (const [key, values] of Object.entries(PROFILE)) {
    if (dict.Profile[key] === undefined) {
      dict.Profile[key] = values[idx];
      added++;
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
});
console.log(`Chaves adicionadas: ${added}`);
