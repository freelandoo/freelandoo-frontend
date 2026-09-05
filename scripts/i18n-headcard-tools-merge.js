/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do gatilho de ferramentas e das avaliações.
//
// - `Profile.tools`: o gatilho do menu do headcard deixou de ser engrenagem e
//   virou ferramenta (o ícone gear ficou reservado ao menu da CONTA, no banner,
//   que é outra coisa). O rótulo acompanhou o ícone.
// - `Profile.noRatings`: escoteiro — o "Sem avaliações" do
//   components/profile/avatar-rating-star.tsx estava em pt cravado no JSX, e
//   en/es mostravam português em silêncio.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-headcard-tools-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const PROFILE = {
  tools: ["Ferramentas", "Tools", "Herramientas"],
  noRatings: ["Sem avaliações", "No ratings", "Sin valoraciones"],
};

const NAMESPACES = { Profile: PROFILE };

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
