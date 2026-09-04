/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da comunidade comum que nasce VAZIA (mig 219):
// o bloco de enxame dentro da página (que substituiu o formulário de criação) e
// os títulos da tela de cadastro, que passou a servir só academia e condomínio.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-common-draft-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  // ── Bloco "Enxame" no modo de edição da página ──────────────────────────
  // (enxameLabel e createError já existem no dicionário e ficam como estão.)
  enxameTitle: ["Enxame", "Swarm", "Enjambre"],
  enxameNone: ["— escolher depois", "— choose later", "— elegir después"],
  enxameHint: [
    "É por ele que a comunidade aparece nos filtros da vitrine. Dá para escolher depois.",
    "It is how the community shows up in the showcase filters. You can choose it later.",
    "Es como la comunidad aparece en los filtros del escaparate. Puedes elegirlo después.",
  ],

  // ── Tela de cadastro (só academia e condomínio) ─────────────────────────
  registerTitle: ["Cadastrar", "Register", "Registrar"],
  registerSubtitle: [
    "Academia e condomínio precisam de alguns dados antes de existir. Para uma comunidade comum, use “Criar comunidade” — ela nasce pronta para editar.",
    "Gyms and buildings need a few details before they exist. For a regular community, use “Create community” — it is born ready to edit.",
    "Gimnasios y condominios necesitan algunos datos antes de existir. Para una comunidad común, usa “Crear comunidad” — nace lista para editar.",
  ],
};

const NAMESPACES = { Community: COMMUNITY };

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
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added}`);
