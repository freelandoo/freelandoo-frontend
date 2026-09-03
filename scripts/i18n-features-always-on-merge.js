/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente da chave da seção "Funções" que virou lista de leitura.
//
// A preferência pessoal (liga/desliga por usuário, mig 186) foi descontinuada
// na mig 218: função de usuário é sempre ligada. O texto de ajuda antigo
// ("Desativar esconde a função só da sua experiência") passou a descrever um
// botão que não existe mais.
//
// CHAVE NOVA em vez de reescrever a antiga: o merge é fill-if-absent e NÃO
// sobrescreve — trocar só o fallback inline não mudaria a tela, porque o
// dicionário vence o fallback. `Account.functionsHint`, `featureTurnOn`,
// `featureTurnOff`, `featureOn`, `featureOff` e `featureVitrineHint` ficam
// órfãs no dicionário, padrão da casa.
//
// Uso: node scripts/i18n-features-always-on-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const ACCOUNT = {
  // Escoteiro: 5 chaves do MESMO menu lateral que nunca tiveram entrada em
  // dicionário nenhum — en/es mostravam português em silêncio.
  xpLabel: ["Métricas", "Metrics", "Métricas"],
  openChamadoLabel: ["Abrir chamado", "Open a request", "Abrir solicitud"],
  chamadoModeService: ["Serviço", "Service", "Servicio"],
  chamadoModeProduct: ["Produto", "Product", "Producto"],
  chamadoModeCourse: ["Curso", "Course", "Curso"],

  functionsHintAlwaysOn: [
    "As funções da sua conta ficam sempre ativas.",
    "Your account features are always on.",
    "Las funciones de tu cuenta están siempre activas.",
  ],
};

const NAVIGATION = {
  // Escoteiro (mesmo menu): "Rever tour" também nunca teve entrada.
  reviewTour: ["Rever tour", "Replay tour", "Repetir tour"],
};

const NAMESPACES = { Account: ACCOUNT, Navigation: NAVIGATION };

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
  console.log(`[i18n] ${locale} atualizado`);
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
