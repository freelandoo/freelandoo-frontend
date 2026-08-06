// i18n do cadastro de academia migrado para a criação de comunidade:
// o formulário (nome/estado/cidade/URL+token da Gym Provider API) passou a
// viver em /comunidades/criar no tipo "Academia" (ns Community), e a página
// /academias virou só vitrine/busca (ns Academies).
// Idempotente e não-destrutivo (fill-if-absent). Rodar: node scripts/i18n-academy-create-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const COMMUNITY = {
  academyCreateIntro: [
    "Grátis. Informe a URL e o token da API do software da sua academia (Gym Provider API) — é por ela que puxamos catraca e pagamentos.",
    "Free. Enter the URL and token of your gym software API (Gym Provider API) — that is how we pull turnstile and payment data.",
    "Gratis. Indica la URL y el token de la API del software de tu gimnasio (Gym Provider API) — por ahí traemos torniquete y pagos.",
  ],
  academyNameLabel: ["Nome da academia", "Gym name", "Nombre del gimnasio"],
  academyNamePlaceholder: ["Ex.: Academia Coliseu", "E.g.: Coliseu Gym", "Ej.: Gimnasio Coliseu"],
  academyApiUrlLabel: ["URL da API (Gym Provider)", "API URL (Gym Provider)", "URL de la API (Gym Provider)"],
  academyApiTokenLabel: ["Token da API", "API token", "Token de la API"],
  academyProviderHint: [
    "Seu software precisa expor a Gym Provider API. O Coliseu já é compatível; outros softwares podem implementar o contrato público.",
    "Your software must expose the Gym Provider API. Coliseu already supports it; other systems can implement the public contract.",
    "Tu software debe exponer la Gym Provider API. Coliseu ya es compatible; otros sistemas pueden implementar el contrato público.",
  ],
  academyMissing: [
    "Preencha nome, estado, cidade, URL da API e token.",
    "Fill in name, state, city, API URL and token.",
    "Completa nombre, estado, ciudad, URL de la API y token.",
  ],
  academyCreateCta: ["Cadastrar academia", "Register gym", "Registrar gimnasio"],
  academyCreateError: [
    "Não foi possível cadastrar a academia.",
    "Could not register the gym.",
    "No se pudo registrar el gimnasio.",
  ],
}

const ACADEMIES = {
  emptySearch: [
    "Nenhuma academia encontrada. Ajuste a busca.",
    "No gyms found. Adjust your search.",
    "No se encontraron gimnasios. Ajusta la búsqueda.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  added += mergeNamespace(json, "Community", COMMUNITY, i)
  added += mergeNamespace(json, "Academies", ACADEMIES, i)
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
