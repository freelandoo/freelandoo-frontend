/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do "Voltar" padrão de página.
//
// `Navigation.back` é o rótulo da PEÇA ÚNICA `components/tabloide/PageBackLink`
// — toda página nasce com uma saída, e o texto dela mora num lugar só. Várias
// telas já tinham um "Voltar" com chave PRÓPRIA no namespace delas
// (Wallet.back, Account.back, Fitness.back...); essas ficam como estão, porque
// dicionário vence fallback e reescrevê-las não muda nada na tela.
//
// O resto é a regra do escoteiro sobre `/clans`, que estava 100% em português
// hardcoded (en/es mostravam pt em silêncio) e foi tocada para ganhar o Voltar.
// Namespace `Account` porque é lá que já mora todo o vocabulário de clan.
//
// Uso: node scripts/i18n-back-link-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const NAVIGATION = {
  back: ["Voltar", "Back", "Volver"],
};

const ACCOUNT = {
  clansVitrineKicker: ["Times Freelandoo", "Freelandoo teams", "Equipos Freelandoo"],
  clansVitrineHighlight: ["em jogo", "in play", "en juego"],
  clansVitrineSubtitle: [
    "Times de até 6 perfis trabalhando juntos. O score combina todas as métricas dos membros.",
    "Teams of up to 6 profiles working together. The score combines every member's metrics.",
    "Equipos de hasta 6 perfiles trabajando juntos. La puntuación combina todas las métricas de los miembros.",
  ],
  clansSearchPlaceholder: [
    "Buscar por nome ou bio...",
    "Search by name or bio...",
    "Buscar por nombre o bio...",
  ],
  allEnxamesOption: ["Todos os enxames", "All swarms", "Todos los enjambres"],
  loadingClansVitrine: ["Carregando clans…", "Loading clans…", "Cargando clanes…"],
  noClansFoundTitle: ["Nenhum clan", "No clans", "Ningún clan"],
  noClansFoundDesc: [
    "Nenhum clan encontrado com esses filtros. Tente ampliar a busca.",
    "No clans matched these filters. Try widening your search.",
    "Ningún clan coincide con estos filtros. Prueba a ampliar la búsqueda.",
  ],
  noEnxameLabel: ["Sem enxame", "No swarm", "Sin enjambre"],
  pointsSuffix: ["pts", "pts", "pts"],
};

const NAMESPACES = { Navigation: NAVIGATION, Account: ACCOUNT };

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
