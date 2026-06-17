// Namespace "Signup" — reescrita das telas de cadastro (intenção primeiro,
// telas enxutas, localização por região). Idempotente, fill-if-absent. Rodar:
//   node scripts/i18n-signup-rewrite-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const SIGNUP = {
  // genéricas que ainda não estavam no dict (tinham só fallback inline)
  eyebrow: ["Comece grátis", "Start free", "Empieza gratis"],

  // Tela 1 — Intenção
  intentTitle: [
    "O que traz você à Freelandoo?",
    "What brings you to Freelandoo?",
    "¿Qué te trae a Freelandoo?",
  ],
  intentSubtitle: [
    "Você pode mudar isso depois. É só pra começar do jeito certo.",
    "You can change this later. It's just to start the right way.",
    "Puedes cambiarlo después. Es solo para empezar bien.",
  ],
  intentBuyerTitle: [
    "Preciso resolver um problema",
    "I need to solve a problem",
    "Necesito resolver un problema",
  ],
  intentBuyerDesc: [
    "Quero encontrar e contratar profissionais para o que eu preciso.",
    "I want to find and hire professionals for what I need.",
    "Quiero encontrar y contratar profesionales para lo que necesito.",
  ],
  intentBuyerCta: ["Começar a buscar", "Start searching", "Empezar a buscar"],
  intentSellerTitle: ["Quero ganhar dinheiro", "I want to make money", "Quiero ganar dinero"],
  intentSellerDesc: [
    "Quero criar um perfil profissional e receber contatos e pedidos.",
    "I want to create a professional profile and get contacts and orders.",
    "Quiero crear un perfil profesional y recibir contactos y pedidos.",
  ],
  intentSellerCta: ["Criar meu perfil", "Create my profile", "Crear mi perfil"],

  // Tela 2 — Identidade
  identityTitle: ["Vamos te conhecer", "Let's get to know you", "Vamos a conocerte"],
  identityDescription: [
    "Comece com o básico — leva menos de um minuto.",
    "Start with the basics — it takes less than a minute.",
    "Empieza con lo básico — toma menos de un minuto.",
  ],

  // Tela 3 — Acesso
  accessTitle: ["Crie seu acesso", "Create your login", "Crea tu acceso"],
  accessDescription: [
    "Uma senha forte e sua data de nascimento.",
    "A strong password and your date of birth.",
    "Una contraseña fuerte y tu fecha de nacimiento.",
  ],

  // Tela 4 — Perfil: localização por região
  regionLabel: ["Região", "Region", "Región"],
  regionPlaceholder: ["Selecione sua região", "Select your region", "Selecciona tu región"],
  regionSelectStateFirst: [
    "Selecione o estado primeiro",
    "Select the state first",
    "Selecciona el estado primero",
  ],
  regionEmpty: [
    "Nenhuma região disponível para este estado ainda.",
    "No regions available for this state yet.",
    "Aún no hay regiones disponibles para este estado.",
  ],

  // Razões de bloqueio dos botões (botão nunca fica "morto" sem explicação)
  blockNome: ["Preencha seu nome completo.", "Enter your full name.", "Ingresa tu nombre completo."],
  blockEmail: ["Digite um email válido.", "Enter a valid email.", "Ingresa un correo válido."],
  blockUsername: ["Escolha um nome de usuário.", "Choose a username.", "Elige un nombre de usuario."],
  blockUsernameChecking: [
    "Verificando o nome de usuário...",
    "Checking the username...",
    "Verificando el nombre de usuario...",
  ],
  blockUsernameUnavailable: [
    "Confirme um nome de usuário disponível.",
    "Confirm an available username.",
    "Confirma un nombre de usuario disponible.",
  ],
  blockBirth: ["Informe sua data de nascimento.", "Enter your date of birth.", "Ingresa tu fecha de nacimiento."],
  blockCode: [
    "Informe um código de responsável válido.",
    "Enter a valid guardian code.",
    "Ingresa un código de responsable válido.",
  ],
  blockPassword: [
    "Sua senha não atende a todos os requisitos.",
    "Your password doesn't meet all requirements.",
    "Tu contraseña no cumple todos los requisitos.",
  ],
  blockPasswordMatch: ["As senhas não coincidem.", "Passwords don't match.", "Las contraseñas no coinciden."],
  blockTerms: [
    "Aceite os termos de uso para continuar.",
    "Accept the terms of use to continue.",
    "Acepta los términos de uso para continuar.",
  ],
}

const GROUPS = { Signup: SIGNUP }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
