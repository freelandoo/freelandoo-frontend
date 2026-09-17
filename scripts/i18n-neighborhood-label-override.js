/* eslint-disable @typescript-eslint/no-require-imports */
// "Minha rua" vira "Meu bairro" no menu dos espaços.
//
// ⚠️ ESTE É UM OVERRIDE, e não o fill-if-absent de sempre: a chave JÁ EXISTE
// nos três dicionários com a redação antiga, e DICIONÁRIO VENCE FALLBACK
// INLINE — trocar só a string no componente não mudaria uma vírgula na tela.
//
// Por que trocar: a modalidade é `neighborhood` e o território que o banco
// guarda é (UF, município, BAIRRO) — não existe rua em lugar nenhum do schema
// (a migration 202 guarda CEP + número e diz por quê: "o logradouro é
// derivável do CEP, e não guardá-lo reduz o que vaza num incidente"). A página
// já se chamava "Meu bairro", a recusa do backend já dizia "Você já está na
// comunidade de um bairro" e o próprio botão de criar já dizia "Encontrar meu
// bairro": só o rótulo do menu dizia "rua".
//
// Não era cosmético. "Rua" PROMETE UMA GRANULARIDADE MENOR do que o produto
// entrega — quem lê "Minha rua" espera os vizinhos do quarteirão e cai numa
// comunidade com o bairro inteiro, gente a dois quilômetros dali.
//
// ⚠️ As outras chaves com "rua" FICAM: `Community.streetLabel`,
// `Community.streetPlaceholder`, `Community.condoAddressPrivacy` e
// `Neighborhood.declareHelp` falam do logradouro no sentido literal (o campo
// de endereço do condomínio, e a frase que explica que a rua vem do CEP e não
// é salva). Ali "rua" é rua mesmo.
//
// Uso: node scripts/i18n-neighborhood-label-override.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — sobrescreve o que estiver lá. */
const SPACES = {
  myStreet: ["Meu bairro", "My neighborhood", "Mi barrio"],
};

const NAMESPACES = { Spaces: SPACES };

let changed = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i];
        changed++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${changed} chave(s) sobrescrita(s).`);
