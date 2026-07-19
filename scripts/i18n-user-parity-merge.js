// i18n da paridade user≡subperfil (perfil-conta pode ser seguido, nível/XP,
// redes sociais no headcard do /account e na página pública do user).
// Namespaces: Account (headcard + escopo do /account/xp) e Profile (página pública).
// Idempotente e não-destrutivo (fill-if-absent). Rodar: node scripts/i18n-user-parity-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT = {
  accountLevel: ["Nível {level}", "Level {level}", "Nivel {level}"],
  accountLevelHint: [
    "Nível da sua conta — sobe com curtidas, seguidores e compartilhamentos",
    "Your account level — grows with likes, followers and shares",
    "Nivel de tu cuenta — sube con me gusta, seguidores y compartidos",
  ],
  seeYourFollowers: ["Ver quem acompanha você", "See who follows you", "Ver quién te sigue"],
  followersCountLabel: ["seguidores", "followers", "seguidores"],
  accountProfileOption: ["Meu perfil (conta)", "My profile (account)", "Mi perfil (cuenta)"],
  // levelShort ("NV"/"LV") já existia no ns Account de onda anterior — reusada.
}

const PROFILE = {
  accountLevel: ["Nível {level}", "Level {level}", "Nivel {level}"],
  accountLevelHint: [
    "Nível da conta — sobe com o engajamento",
    "Account level — grows with engagement",
    "Nivel de la cuenta — sube con la interacción",
  ],
  seeFollowers: ["Ver quem acompanha", "See followers", "Ver seguidores"],
  followersLabel: ["seguidores", "followers", "seguidores"],
  followingLabel: ["acompanhados", "following", "seguidos"],
  sendMessageTo: [
    "Enviar mensagem para {name}",
    "Send a message to {name}",
    "Enviar mensaje a {name}",
  ],
  coursePriceFree: ["Gratuito", "Free", "Gratis"],
  statProfiles: ["Perfis", "Profiles", "Perfiles"],
  statClans: ["Clans", "Clans", "Clanes"],
  statCourses: ["Cursos", "Courses", "Cursos"],
  coursesTitle: ["Meus cursos", "My courses", "Mis cursos"],
  coursePublished: ["Publicado", "Published", "Publicado"],
  // Esqueleto unificado (L1): sino + menu da conta no banner do subperfil.
  openAccountMenu: ["Abrir menu da conta", "Open account menu", "Abrir menú de la cuenta"],
  openSettings: ["Abrir configurações", "Open settings", "Abrir configuración"],
  // Engrenagem do subperfil = ferramentas da conta (paridade user≡subperfil).
  metrics: ["Métricas", "Metrics", "Métricas"],
  myWallet: ["Minha Carteira", "My Wallet", "Mi Billetera"],
  dataApi: ["Conexões de Dados", "Data Connections", "Conexiones de Datos"],
  atendimentoIa: ["Atendimento IA", "AI Assistant", "Atención IA"],
  fitnessTool: ["Fitness", "Fitness", "Fitness"],
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
  added += mergeNamespace(json, "Profile", PROFILE, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
