// i18n do condomínio no núcleo territorial (migs 205-207): a portaria (planta
// torre → andar → apartamento), o "aceitar como família × rejeitar e competir",
// a disputa com comprovante filmado e o painel do síndico.
//
// Mais as chaves da casca única de comunidade: o botão quadrado amarelo com "+"
// substituiu a barra "Poste ou escreva aqui", e o condomínio ganhou textos
// próprios de recusa ("só moradores", "confirme seu apartamento").
//
// Idempotente e não-destrutivo (fill-if-absent).
// Rodar: node scripts/i18n-condo-residence-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// ─── Namespace Condo: a área de morador ──────────────────────────────────────
const CONDO = {
  // Portaria
  claimTitleNew: [
    "Qual é o seu apartamento?",
    "Which apartment is yours?",
    "¿Cuál es tu departamento?",
  ],
  claimSubtitleNew: [
    "Só morador entra. Escolha sua torre, o andar e o apartamento. Se já houver alguém, essa pessoa confirma se vocês moram juntos.",
    "Residents only. Pick your tower, floor and apartment. If someone already lives there, they confirm whether you share the home.",
    "Solo residentes. Elige tu torre, el piso y el departamento. Si ya hay alguien, esa persona confirma si viven juntos.",
  ],
  claimApprovedNew: [
    "Pronto! Você entrou no condomínio.",
    "Done! You are in.",
    "¡Listo! Ya entraste al condominio.",
  ],
  claimPendingNew: [
    "Este apartamento já tem morador. Ele vai decidir se vocês são da mesma casa.",
    "This apartment already has a resident. They will decide whether you share the home.",
    "Este departamento ya tiene residente. Esa persona decidirá si viven juntos.",
  ],
  needsAddress: [
    "Este condomínio ainda não tem endereço cadastrado. Fale com a administração.",
    "This building has no address registered yet. Talk to the management.",
    "Este condominio aún no tiene dirección registrada. Habla con la administración.",
  ],
  plantEmpty: [
    "A administração ainda não montou a planta do prédio.",
    "The management has not set up the building layout yet.",
    "La administración aún no armó el plano del edificio.",
  ],
  blockLabel: ["Torre / bloco", "Tower / block", "Torre / bloque"],
  noBlock: ["Sem torre", "No tower", "Sin torre"],
  floorLabel: ["Andar", "Floor", "Piso"],
  unitLabel: ["Apartamento", "Apartment", "Departamento"],
  occupied: ["ocupado", "taken", "ocupado"],
  free: ["livre", "free", "libre"],
  noUnitsHere: [
    "Nenhum apartamento cadastrado aqui ainda.",
    "No apartments registered here yet.",
    "Aún no hay departamentos registrados aquí.",
  ],
  myUnitTitle: ["Meu apartamento", "My apartment", "Mi departamento"],
  floorShort: ["{n}º andar", "floor {n}", "piso {n}"],
  statusPending: [
    "aguardando os vizinhos",
    "waiting for the neighbors",
    "esperando a los vecinos",
  ],
  statusContested: ["em disputa", "disputed", "en disputa"],
  statusUnrecognized: ["não reconhecido", "not recognized", "no reconocido"],

  // Família × disputa
  familyTitle: [
    "Alguém diz morar no seu apartamento",
    "Someone says they live in your apartment",
    "Alguien dice vivir en tu departamento",
  ],
  familyExplain: [
    "Se essa pessoa é da sua casa — cônjuge, filho, irmão, quem divide o aluguel — aceite. Vocês dois passam a ser moradores, e ninguém perde nada.",
    "If this person is part of your household — partner, child, sibling, flatmate — accept. You both become residents, and nobody loses anything.",
    "Si esa persona es de tu casa — pareja, hijo, hermano, quien comparte el alquiler — acepta. Los dos pasan a ser residentes y nadie pierde nada.",
  ],
  acceptFamily: ["Aceitar como família", "Accept as household", "Aceptar como familia"],
  rejectCompete: ["Rejeitar e competir", "Reject and dispute", "Rechazar y competir"],
  someone: ["Alguém", "Someone", "Alguien"],
  respondError: [
    "Não foi possível registrar.",
    "Could not save your answer.",
    "No se pudo registrar.",
  ],
  familyDone: [
    "Pronto — vocês moram juntos.",
    "Done — you share the home.",
    "Listo: viven juntos.",
  ],
  contestDone: [
    "Disputa aberta. A administração foi avisada e a conversa dos três já está no seu chat.",
    "Dispute opened. The management was notified and the three-way conversation is in your chat.",
    "Disputa abierta. La administración fue avisada y la conversación de los tres ya está en tu chat.",
  ],
  contestConfirmTitle: ["Abrir disputa", "Open a dispute", "Abrir disputa"],
  contestConfirmText: [
    "A administração será avisada e uma conversa entre você, essa pessoa e o síndico será aberta automaticamente. Quem está reivindicando terá que enviar um vídeo do comprovante de residência, e o síndico decide. Você continua morador durante todo o processo.",
    "The management will be notified and a conversation between you, that person and the building manager opens automatically. The claimant must send a video of their proof of residence, and the manager decides. You remain a resident throughout.",
    "La administración será avisada y se abrirá automáticamente una conversación entre tú, esa persona y el administrador. Quien reclama deberá enviar un video del comprobante de domicilio, y el administrador decide. Tú sigues siendo residente durante todo el proceso.",
  ],
  contestReasonPlaceholder: [
    "Por que você está contestando? (opcional)",
    "Why are you disputing? (optional)",
    "¿Por qué estás contestando? (opcional)",
  ],
  contestConfirmCta: ["Abrir disputa", "Open dispute", "Abrir disputa"],

  // Minha disputa
  myDisputeTitle: [
    "Sua reivindicação está em disputa",
    "Your claim is disputed",
    "Tu reclamo está en disputa",
  ],
  myDisputeText: [
    "Para reivindicar este apartamento você precisa enviar um vídeo do seu comprovante de residência. O síndico assiste e decide. A conversa com o síndico e com o morador atual já está aberta no seu chat.",
    "To claim this apartment you must send a video of your proof of residence. The building manager watches it and decides. The conversation with the manager and the current resident is already open in your chat.",
    "Para reclamar este departamento debes enviar un video de tu comprobante de domicilio. El administrador lo mira y decide. La conversación con el administrador y el residente actual ya está abierta en tu chat.",
  ],
  proofSend: [
    "Enviar vídeo do comprovante",
    "Send proof video",
    "Enviar video del comprobante",
  ],
  proofResend: ["Enviar outro vídeo", "Send another video", "Enviar otro video"],
  proofSent: [
    "Comprovante enviado. O síndico foi avisado.",
    "Proof sent. The building manager was notified.",
    "Comprobante enviado. El administrador fue avisado.",
  ],
  proofError: [
    "Não foi possível enviar o vídeo.",
    "Could not send the video.",
    "No se pudo enviar el video.",
  ],
  openDisputeChat: ["Abrir a conversa", "Open the conversation", "Abrir la conversación"],

  // Planta (síndico)
  plantTitle: ["Planta do prédio", "Building layout", "Plano del edificio"],
  plantHelp: [
    "Informe a torre, quantos andares e quantos apartamentos por andar. A numeração sai como 101, 102… — é um ponto de partida: depois você acrescenta a cobertura e remove o que não existe.",
    "Enter the tower, how many floors and how many apartments per floor. Numbering comes out as 101, 102… — it is a starting point: afterwards you add the penthouse and remove what does not exist.",
    "Indica la torre, cuántos pisos y cuántos departamentos por piso. La numeración sale como 101, 102… — es un punto de partida: después agregas el penthouse y quitas lo que no existe.",
  ],
  blockNamePlaceholder: ["Torre A", "Tower A", "Torre A"],
  floorsPlaceholder: ["Andares", "Floors", "Pisos"],
  perFloorPlaceholder: ["Aptos por andar", "Apts per floor", "Deptos por piso"],
  firstFloorPlaceholder: ["1º andar", "First floor", "Primer piso"],
  blockCreateCta: [
    "Criar torre e gerar apartamentos",
    "Create tower and generate apartments",
    "Crear torre y generar departamentos",
  ],
  blockNeedsName: ["Dê um nome à torre.", "Name the tower.", "Dale un nombre a la torre."],
  blockError: [
    "Não foi possível criar a torre.",
    "Could not create the tower.",
    "No se pudo crear la torre.",
  ],
  blockCreated: [
    "Torre criada com {n} apartamentos.",
    "Tower created with {n} apartments.",
    "Torre creada con {n} departamentos.",
  ],
  plantUnitsTitle: ["Apartamentos", "Apartments", "Departamentos"],
  unitDelete: ["Excluir apartamento", "Delete apartment", "Eliminar departamento"],
  unitDeleteError: [
    "Não foi possível excluir.",
    "Could not delete.",
    "No se pudo eliminar.",
  ],

  // Disputas (síndico)
  disputesTitle: [
    "Reivindicações em disputa",
    "Disputed claims",
    "Reclamos en disputa",
  ],
  disputesEmpty: ["Nenhuma disputa aberta.", "No open disputes.", "Sin disputas abiertas."],
  disputeParties: [
    "{claimant} reivindica · {contester} contestou",
    "{claimant} is claiming · {contester} disputed",
    "{claimant} reclama · {contester} contestó",
  ],
  watchProof: [
    "Assistir ao comprovante",
    "Watch the proof",
    "Ver el comprobante",
  ],
  proofPending: [
    "Comprovante ainda não enviado",
    "Proof not sent yet",
    "Comprobante aún no enviado",
  ],
  proofUrlError: [
    "Não foi possível abrir o vídeo.",
    "Could not open the video.",
    "No se pudo abrir el video.",
  ],
  disputeApprove: [
    "Aceitar como morador",
    "Accept as resident",
    "Aceptar como residente",
  ],
  disputeReject: ["Recusar", "Reject", "Rechazar"],
  disputeApproveHint: [
    "Aceitar não remove o morador atual — os dois passam a morar no apartamento.",
    "Accepting does not remove the current resident — both will live in the apartment.",
    "Aceptar no quita al residente actual: los dos pasan a vivir en el departamento.",
  ],
  decideError: [
    "Não foi possível decidir.",
    "Could not record the decision.",
    "No se pudo decidir.",
  ],
}

// ─── Namespace Community: a casca única ──────────────────────────────────────
// `beeLabel` já existe com o valor "Bee" nos três idiomas: era a chave órfã do
// rename do Bees v2 (quando "Bee" ainda apontava para vídeo). Voltou a ser
// usada — e agora com o sentido CERTO, o bee de verdade. Fill-if-absent não a
// sobrescreve, e não precisa: o valor está correto.
const COMMUNITY = {
  composeCta: ["Publicar", "Post", "Publicar"],
  composeHint: ["Publicar no mural", "Post to the wall", "Publicar en el muro"],
  residentToPost: [
    "Confirme seu apartamento para publicar.",
    "Confirm your apartment to post.",
    "Confirma tu departamento para publicar.",
  ],
  condoResidentsOnly: ["Só moradores", "Residents only", "Solo residentes"],
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
  added += mergeNamespace(json, "Condo", CONDO, i)
  added += mergeNamespace(json, "Community", COMMUNITY, i)
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
