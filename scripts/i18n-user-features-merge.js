// i18n da seção "Funções" do menu lateral (UserDropside) — preferências de
// funções por usuário (mig 186). Namespace Account.
// Idempotente e não-destrutivo (fill-if-absent). Rodar: node scripts/i18n-user-features-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT = {
  functionsHeading: ["Funções", "Features", "Funciones"],
  functionsHint: [
    "Desativar esconde a função só da sua experiência — nada é apagado.",
    "Turning a feature off hides it from your experience only — nothing is deleted.",
    "Desactivar oculta la función solo de tu experiencia — nada se borra.",
  ],
  featureCourses: ["Cursos", "Courses", "Cursos"],
  featureStore: ["Loja", "Store", "Tienda"],
  featureServices: ["Serviços", "Services", "Servicios"],
  featureVaquinha: ["Vaquinha", "Crowdfunding", "Colecta"],
  featureCommunities: ["Comunidade", "Community", "Comunidad"],
  featureWallet: ["Carteira", "Wallet", "Billetera"],
  featureFitness: ["Academia", "Gym", "Gimnasio"],
  featureProfiles: ["Perfis", "Profiles", "Perfiles"],
  // Agenda vira função liga/desliga (2026-07-22): desligada, some a seção
  // AGENDA da página do perfil, a ferramenta da toolbar/engrenagem e o item
  // do menu de perfis. A agenda em si continua existindo (é da conta).
  featureAgenda: ["Agenda", "Schedule", "Agenda"],
  featureVitrine: ["Vitrine", "Showcase", "Vitrina"],
  featureVitrineHint: [
    "Desligada, seus perfis somem da vitrine pra todo mundo.",
    "When off, your profiles disappear from the showcase for everyone.",
    "Apagada, tus perfiles desaparecen de la vitrina para todos.",
  ],
  featureTurnOn: ["Ativar {feature}", "Enable {feature}", "Activar {feature}"],
  featureTurnOff: ["Desativar {feature}", "Disable {feature}", "Desactivar {feature}"],
  featureOn: ["Ativada", "Enabled", "Activada"],
  featureOff: ["Desativada", "Disabled", "Desactivada"],
  accountMenuAria: ["Menu da conta", "Account menu", "Menú de la cuenta"],
  // Sub-item de "Configurações" no menu lateral (as Funções vivem lá dentro).
  settingsMyData: ["Meus dados", "My data", "Mis datos"],
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
  added += mergeNamespace(json, "Account", ACCOUNT, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
