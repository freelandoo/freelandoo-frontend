// Meu Mundo 3D — mm3d-09 (interiores, sentar, convites e visitas).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-mm3d09-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  netMoved: ["Mudando de lugar…", "Moving…", "Cambiando de lugar…"],
  stand: ["Levantar", "Stand up", "Levantarse"],
  exitHouse: ["Sair da casa", "Leave the house", "Salir de la casa"],
  exitGoToDoor: ["Vá até a porta para sair", "Walk to the door to leave", "Ve hasta la puerta para salir"],
  sit: ["Sentar", "Sit", "Sentarse"],
  visitHostLine: ["Visita de {name}", "Visit from {name}", "Visita de {name}"],
  visitGuestLine: ["Você está visitando {name}", "You are visiting {name}", "Estás visitando a {name}"],
  visitPendingLine: ["Convite para {name} aguardando", "Invite to {name} pending", "Invitación a {name} pendiente"],
  visitNone: ["Sem visita", "No visit", "Sin visita"],
  houseCanvasAria: ["Interior da casa", "House interior", "Interior de la casa"],
  houseOf: ["Casa de {name}", "{name}'s house", "Casa de {name}"],
  houseSub: ["Casa {n} · nível {l}", "House {n} · level {l}", "Casa {n} · nivel {l}"],
  insideNow: ["{n} aqui dentro", "{n} inside", "{n} aquí dentro"],
  invite: ["Convidar", "Invite", "Invitar"],
  houseInfo: ["Informações da casa", "House details", "Información de la casa"],
  houseInfoShort: ["Casa", "House", "Casa"],
  seatTaken: ["Esse lugar já está ocupado", "That seat is taken", "Ese lugar ya está ocupado"],
  seatDenied: ["Chegue mais perto para sentar", "Get closer to sit", "Acércate más para sentarte"],
  infoOwner: ["Titular", "Owner", "Titular"],
  infoLevel: ["Nível", "Level", "Nivel"],
  infoPlace: ["Bairro e número", "Neighborhood and number", "Barrio y número"],
  infoFloors: ["Andares", "Floors", "Pisos"],
  infoVisit: ["Visita", "Visit", "Visita"],
  houseLoading: ["Abrindo a casa…", "Opening the house…", "Abriendo la casa…"],
  houseErrorTitle: ["A casa não abriu", "The house did not open", "La casa no abrió"],
  transMoving: ["Mudando de lugar…", "Moving…", "Cambiando de lugar…"],
  transFailed: [
    "Não deu para trocar de lugar. Tente de novo.",
    "Could not change places. Try again.",
    "No se pudo cambiar de lugar. Inténtalo de nuevo.",
  ],
  transEnter: ["Entrando na casa…", "Entering the house…", "Entrando en la casa…"],
  transExit: ["Saindo para a rua…", "Going out to the street…", "Saliendo a la calle…"],
  visitEndedNotice: ["A visita a {name} terminou.", "The visit to {name} ended.", "La visita a {name} terminó."],
  transVisit: ["Indo para a casa do anfitrião…", "Going to the host's house…", "Yendo a la casa del anfitrión…"],
  transHome: ["Voltando para casa…", "Going back home…", "Volviendo a casa…"],
  endVisit: ["Encerrar visita", "End visit", "Terminar visita"],
  visitingName: ["Visitando {name}", "Visiting {name}", "Visitando a {name}"],
  backHome: ["Voltar para casa", "Go back home", "Volver a casa"],
  outgoingLine: ["Convite para {name} · {time}", "Invite to {name} · {time}", "Invitación a {name} · {time}"],
  cancelInvite: ["Cancelar", "Cancel", "Cancelar"],
  inviteReceived: ["Convite de visita", "Visit invite", "Invitación de visita"],
  inviteFrom: ["{name} te chamou", "{name} invited you", "{name} te invitó"],
  inviteDesc: [
    "Casa {n} · {nb}. O convite vale por {time}.",
    "House {n} · {nb}. The invite is valid for {time}.",
    "Casa {n} · {nb}. La invitación vale por {time}.",
  ],
  accept: ["Aceitar", "Accept", "Aceptar"],
  decline: ["Recusar", "Decline", "Rechazar"],
  inviteTitle: ["Convidar para sua casa", "Invite to your house", "Invitar a tu casa"],
  inviteRule: [
    "Uma visita por vez. O convite expira em 5 minutos.",
    "One visit at a time. The invite expires in 5 minutes.",
    "Una visita a la vez. La invitación vence en 5 minutos.",
  ],
  loadingShort: ["Carregando…", "Loading…", "Cargando…"],
  inviteNoCandidates: [
    "Ninguém conectado agora. Digite o @ de quem você quer chamar.",
    "Nobody online right now. Type the @ of who you want to invite.",
    "Nadie conectado ahora. Escribe el @ de quien quieres invitar.",
  ],
  inVisit: ["Em visita", "Visiting", "De visita"],
  invitePlaceholder: ["@usuario", "@username", "@usuario"],
  inviteConfirm: ["Convidar @{name}", "Invite @{name}", "Invitar a @{name}"],
  myHouseAction: ["Sua casa", "Your house", "Tu casa"],
  enterVisit: ["Entrar na casa {n}", "Enter house {n}", "Entrar en la casa {n}"],
  visitingChip: ["Visitando {name} · casa {n}", "Visiting {name} · house {n}", "Visitando a {name} · casa {n}"],
  needsInvite: [
    "Esta casa só abre com convite do morador.",
    "This house only opens with the resident's invite.",
    "Esta casa solo se abre con invitación del residente.",
  ],
  enterHouse: ["Entrar", "Enter", "Entrar"],
  changeLevelTest: ["Alterar nível — teste", "Change level — test", "Cambiar nivel — prueba"],
  levelOccupied: [
    "Peça para todos saírem da casa antes de trocar o nível.",
    "Ask everyone to leave the house before changing the level.",
    "Pide a todos que salgan de la casa antes de cambiar el nivel.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm3d-09: ${added} chaves adicionadas`)
