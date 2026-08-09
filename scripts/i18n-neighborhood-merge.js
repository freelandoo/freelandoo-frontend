// i18n do Bairro (migs 202-204): namespace novo `Neighborhood` — declarar
// residência, esperar reconhecimento, reconhecer/contestar vizinho e entrar na
// comunidade do bairro. Mais os tipos de notificação novos no ns Notifications.
//
// Idempotente e não-destrutivo (fill-if-absent).
// Rodar: node scripts/i18n-neighborhood-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

const NEIGHBORHOOD = {
  title: ["Meu bairro", "My neighborhood", "Mi barrio"],
  subtitle: [
    "A comunidade de quem mora perto de você. Para entrar, declare onde você mora — seus vizinhos confirmam.",
    "The community of people who live near you. To join, tell us where you live — your neighbors confirm it.",
    "La comunidad de quienes viven cerca de ti. Para entrar, declara dónde vives — tus vecinos lo confirman.",
  ],
  loading: ["Carregando…", "Loading…", "Cargando…"],

  // ─── declarar residência ───────────────────────────────────────────────
  declareTitle: ["Onde você mora", "Where you live", "Dónde vives"],
  declareHelp: [
    "Guardamos só o CEP, o número e o complemento. A rua vem do CEP e não é salva.",
    "We store only the postal code, number and unit. The street comes from the postal code and is not saved.",
    "Guardamos solo el código postal, el número y el complemento. La calle viene del código postal y no se guarda.",
  ],
  cepLabel: ["CEP", "Postal code", "Código postal"],
  numberLabel: ["Número", "Number", "Número"],
  complementLabel: [
    "Complemento (apto, bloco) — opcional",
    "Unit (apt, block) — optional",
    "Complemento (depto, bloque) — opcional",
  ],
  declareCta: ["Declarar residência", "Declare residence", "Declarar residencia"],
  declaring: ["Confirmando…", "Confirming…", "Confirmando…"],
  cepInvalid: ["Informe um CEP com 8 dígitos.", "Enter an 8-digit postal code.", "Indica un código postal de 8 dígitos."],
  numberRequired: ["Informe o número.", "Enter the number.", "Indica el número."],
  declareFailed: [
    "Não foi possível confirmar o endereço agora. Tente de novo em instantes.",
    "We couldn't confirm the address right now. Try again in a moment.",
    "No pudimos confirmar la dirección ahora. Inténtalo de nuevo en un momento.",
  ],

  // ─── estados do vínculo ────────────────────────────────────────────────
  statusRecognized: ["Morador confirmado", "Confirmed resident", "Residente confirmado"],
  statusPending: ["Aguardando seus vizinhos", "Waiting for your neighbors", "Esperando a tus vecinos"],
  statusUnrecognized: ["Ainda não confirmado", "Not confirmed yet", "Aún no confirmado"],
  statusContested: ["Em divergência", "Disputed", "En disputa"],
  pendingHelp: [
    "Alguém já mora nesta unidade. Um vizinho precisa confirmar que você mora aí. Enquanto isso, você já pode ler o mural.",
    "Someone already lives in this unit. A neighbor needs to confirm you live there. Meanwhile you can already read the board.",
    "Alguien ya vive en esta unidad. Un vecino debe confirmar que vives ahí. Mientras tanto ya puedes leer el muro.",
  ],
  unrecognizedHelp: [
    "Ninguém respondeu a tempo. Você lê o mural, mas ainda não publica nem vota — qualquer vizinho pode confirmar você a qualquer momento.",
    "Nobody answered in time. You can read the board, but not post or vote yet — any neighbor can confirm you at any time.",
    "Nadie respondió a tiempo. Puedes leer el muro, pero aún no publicas ni votas — cualquier vecino puede confirmarte en cualquier momento.",
  ],
  contestedHelp: [
    "Um vizinho não reconheceu você. Ninguém foi removido: envie um comprovante de residência para a equipe decidir.",
    "A neighbor didn't recognize you. Nobody was removed: send proof of address for the team to decide.",
    "Un vecino no te reconoció. Nadie fue removido: envía un comprobante de domicilio para que el equipo decida.",
  ],
  leaveCta: ["Não moro mais aqui", "I don't live here anymore", "Ya no vivo aquí"],
  leaveConfirm: [
    "Encerrar seu vínculo com este endereço?",
    "End your link with this address?",
    "¿Terminar tu vínculo con esta dirección?",
  ],

  // ─── comunidade do bairro ──────────────────────────────────────────────
  communityExists: ["Comunidade do bairro", "Neighborhood community", "Comunidad del barrio"],
  openCta: ["Abrir", "Open", "Abrir"],
  joinCta: ["Entrar", "Join", "Entrar"],
  joining: ["Entrando…", "Joining…", "Entrando…"],
  memberBadge: ["Você participa", "You're in", "Participas"],
  noCommunityTitle: ["Seu bairro ainda não tem comunidade", "Your neighborhood has no community yet", "Tu barrio aún no tiene comunidad"],
  noCommunityBody: [
    "Cada bairro tem uma só. Crie a do seu e convide quem mora por perto.",
    "Each neighborhood has exactly one. Create yours and invite the people nearby.",
    "Cada barrio tiene una sola. Crea la tuya e invita a quienes viven cerca.",
  ],
  createCta: ["Criar a comunidade do bairro", "Create the neighborhood community", "Crear la comunidad del barrio"],
  creating: ["Criando…", "Creating…", "Creando…"],
  createNeedsRecognition: [
    "Só quem já foi confirmado pelos vizinhos pode criar a comunidade do bairro.",
    "Only residents already confirmed by neighbors can create the neighborhood community.",
    "Solo quienes ya fueron confirmados por los vecinos pueden crear la comunidad del barrio.",
  ],

  // ─── julgar vizinho ────────────────────────────────────────────────────
  judgeTitle: ["Seus vizinhos", "Your neighbors", "Tus vecinos"],
  judgeSubtitle: [
    "Estas pessoas dizem morar com você. Confirmar dá a elas voz no bairro.",
    "These people say they live with you. Confirming gives them a voice in the neighborhood.",
    "Estas personas dicen vivir contigo. Confirmar les da voz en el barrio.",
  ],
  judgeEmpty: ["Ninguém esperando por você.", "Nobody waiting on you.", "Nadie esperando por ti."],
  recognizeCta: ["Confirmar", "Confirm", "Confirmar"],
  contestCta: ["Não reconheço", "I don't recognize", "No reconozco"],
  contestPrompt: [
    "Por que você não reconhece esta pessoa? (opcional)",
    "Why don't you recognize this person? (optional)",
    "¿Por qué no reconoces a esta persona? (opcional)",
  ],
  contestNote: [
    "Não reconhecer não remove ninguém — abre uma divergência para a equipe olhar.",
    "Not recognizing doesn't remove anyone — it opens a dispute for the team to review.",
    "No reconocer no remueve a nadie — abre una disputa para que el equipo la revise.",
  ],
  myVoteRecognized: ["Você confirmou", "You confirmed", "Confirmaste"],
  myVoteContested: ["Você não reconheceu", "You didn't recognize", "No reconociste"],

  // ─── estado vazio / erros ──────────────────────────────────────────────
  emptyTitle: ["Você ainda não declarou onde mora", "You haven't told us where you live yet", "Aún no declaraste dónde vives"],
  genericError: ["Algo deu errado. Tente de novo.", "Something went wrong. Try again.", "Algo salió mal. Inténtalo de nuevo."],
  privacyNote: [
    "Seu endereço nunca aparece para outros moradores — eles veem só o bairro.",
    "Your address is never shown to other residents — they only see the neighborhood.",
    "Tu dirección nunca aparece para otros residentes — solo ven el barrio.",
  ],
}

const NOTIFICATIONS = {
  residence_claim_pending: [
    "{who} diz morar com você",
    "{who} says they live with you",
    "{who} dice vivir contigo",
  ],
  residence_recognized: [
    "Sua residência foi confirmada",
    "Your residence was confirmed",
    "Tu residencia fue confirmada",
  ],
  residence_contested: [
    "Um vizinho não reconheceu sua residência",
    "A neighbor didn't recognize your residence",
    "Un vecino no reconoció tu residencia",
  ],
  residence_proof_requested: [
    "Envie um comprovante de residência",
    "Send proof of address",
    "Envía un comprobante de domicilio",
  ],
  residence_ended: [
    "Seu vínculo com o endereço foi encerrado",
    "Your link with the address was ended",
    "Tu vínculo con la dirección fue terminado",
  ],
}

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
  added += mergeNamespace(json, "Neighborhood", NEIGHBORHOOD, i)
  added += mergeNamespace(json, "Notifications", NOTIFICATIONS, i)
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
