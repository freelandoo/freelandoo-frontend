// Feed Interativo (2026-11-15): Throw, Stash, Baú, Cápsula, Paths, Sync.
// Namespace "FeedFx". Idempotente: fill-if-absent; OVERRIDE troca valor que já existe.
// Rodar: node scripts/i18n-feed-interativo-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FEEDFX = {
  // ── gesto (F1/F2) ──
  throwFailed: ["NÃO FOI", "DIDN'T GO", "NO SE ENVIÓ"],
  thrownStamp: ["LANÇADO · {n}", "THROWN · {n}", "LANZADO · {n}"],
  saveFailed: ["NÃO SALVOU", "NOT SAVED", "NO SE GUARDÓ"],
  alreadySaved: ["JÁ ESTAVA SALVO", "ALREADY SAVED", "YA ESTABA GUARDADO"],
  savedStamp: ["SALVO", "SAVED", "GUARDADO"],
  throwAllHint: ["Solte para lançar a {n}", "Release to throw to {n}", "Suelta para lanzar a {n}"],
  throwNobody: ["Ninguém para lançar ainda", "No one to throw to yet", "Aún no hay a quién lanzar"],
  trayHint: [
    "Solte em cima de alguém para mandar só para essa pessoa",
    "Drop on someone to send it only to them",
    "Suelta sobre alguien para enviarlo solo a esa persona",
  ],
  saveZone: ["Salvar", "Save", "Guardar"],
  // ── chegada + painel /feed/lancar (F2) ──
  thrownBy: ["Lançado por @{u}", "Thrown by @{u}", "Lanzado por @{u}"],
  giftFrom: ["Presente de @{u}", "Gift from @{u}", "Regalo de @{u}"],
  capsuleFrom: ["Mensagem programada de @{u}", "Scheduled message from @{u}", "Mensaje programado de @{u}"],
  panelEyebrow: ["Feed interativo", "Interactive feed", "Feed interactivo"],
  panelTitle: ["Quem pode lançar", "Who can throw", "Quién puede lanzar"],
  panelLead: [
    "Segure um post no feed e jogue para cima: ele cai no feed de quem aceitou. Segure mais um pouco para escolher uma pessoa só. Puxe para baixo para salvar.",
    "Hold a post in the feed and flick it up: it lands in the feed of everyone who accepted. Hold a little longer to pick just one person. Pull down to save.",
    "Mantén un post en el feed y lánzalo hacia arriba: cae en el feed de quien aceptó. Mantén un poco más para elegir a una sola persona. Tira hacia abajo para guardar.",
  ],
  needLogin: ["Entre na sua conta para usar.", "Sign in to use this.", "Inicia sesión para usarlo."],
  inviteTitle: ["Convidar alguém", "Invite someone", "Invitar a alguien"],
  inviteTerms: [
    "Ao aceitar, a pessoa permite que você jogue conteúdos direto no feed dela. Ela pode silenciar ou tirar a permissão quando quiser.",
    "By accepting, the person lets you throw content straight into their feed. They can mute you or remove the permission at any time.",
    "Al aceptar, la persona te permite lanzar contenido directo a su feed. Puede silenciarte o quitar el permiso cuando quiera.",
  ],
  inviteCta: ["Convidar", "Invite", "Invitar"],
  inviteSent: [
    "Convite enviado! Quando aceitar, você lança no feed dela.",
    "Invite sent! Once they accept, you can throw into their feed.",
    "¡Invitación enviada! Cuando acepte, podrás lanzar a su feed.",
  ],
  alreadyActive: ["Essa pessoa já recebe seus lançamentos.", "This person already receives your throws.", "Esta persona ya recibe tus lanzamientos."],
  alreadyPending: ["O convite já está esperando resposta.", "The invite is already waiting for an answer.", "La invitación ya está esperando respuesta."],
  genericError: ["Não deu certo", "That didn't work", "No funcionó"],
  pendingIn: ["Querem lançar no seu feed", "Want to throw into your feed", "Quieren lanzar a tu feed"],
  pendingNote: ["convite", "invite", "invitación"],
  accept: ["Aceitar", "Accept", "Aceptar"],
  decline: ["Recusar", "Decline", "Rechazar"],
  block: ["Bloquear", "Block", "Bloquear"],
  unblock: ["Desbloquear", "Unblock", "Desbloquear"],
  activeIn: ["Lançam no seu feed", "Throw into your feed", "Lanzan a tu feed"],
  activeInEmpty: ["Ninguém ainda.", "No one yet.", "Nadie todavía."],
  activeNote: ["ativo", "active", "activo"],
  silencedNote: ["silenciado", "muted", "silenciado"],
  blockedNote: ["bloqueado", "blocked", "bloqueado"],
  revokedNote: ["permissão retirada", "permission removed", "permiso retirado"],
  waitingNote: ["esperando resposta", "waiting for answer", "esperando respuesta"],
  silence: ["Silenciar", "Mute", "Silenciar"],
  unsilence: ["Reativar", "Unmute", "Reactivar"],
  revoke: ["Tirar permissão", "Remove permission", "Quitar permiso"],
  closedIn: ["Sem permissão / bloqueados", "No permission / blocked", "Sin permiso / bloqueados"],
  sending: ["Para quem você lança", "Who you throw to", "A quién lanzas"],
  sendingEmpty: ["Convide alguém pelo @ aí em cima.", "Invite someone by @ above.", "Invita a alguien por @ arriba."],
  cancelInvite: ["Cancelar convite", "Cancel invite", "Cancelar invitación"],
  stopThrowing: ["Parar de lançar", "Stop throwing", "Dejar de lanzar"],
  privacyTitle: ["Quem pode me convidar", "Who can invite me", "Quién puede invitarme"],
  policyAll: ["Qualquer pessoa", "Anyone", "Cualquier persona"],
  policyMutual: ["Só quem eu sigo e me segue", "Only people I follow who follow me", "Solo quien sigo y me sigue"],
  policyNobody: ["Ninguém", "No one", "Nadie"],
  fxTitle: ["Som e vibração do feed", "Feed sound and vibration", "Sonido y vibración del feed"],
  soundOn: ["Som ligado", "Sound on", "Sonido activado"],
  soundOff: ["Som desligado", "Sound off", "Sonido desactivado"],
  hapticOn: ["Vibração ligada", "Vibration on", "Vibración activada"],
  hapticOff: ["Vibração desligada", "Vibration off", "Vibración desactivada"],
  noVibrate: [
    "Este aparelho não vibra pelo navegador (o iPhone não deixa).",
    "This device can't vibrate from the browser (iPhone doesn't allow it).",
    "Este dispositivo no vibra desde el navegador (el iPhone no lo permite).",
  ],
  soundTest: ["Ouvir os sons", "Listen to the sounds", "Escuchar los sonidos"],
  toastInvite: ["@{u} quer lançar posts no seu feed", "@{u} wants to throw posts into your feed", "@{u} quiere lanzar posts a tu feed"],
  toastSee: ["Ver", "See", "Ver"],
  toastAccepted: [
    "@{u} aceitou: agora você lança no feed dele(a)",
    "@{u} accepted: now you can throw into their feed",
    "@{u} aceptó: ahora puedes lanzar a su feed",
  ],
}

const FEED = {
  fxThrowers: ["Quem pode lançar", "Who can throw", "Quién puede lanzar"],
  fxNoTargets: [
    "Ninguém aceitou receber seus lançamentos ainda.",
    "No one has accepted your throws yet.",
    "Nadie ha aceptado tus lanzamientos todavía.",
  ],
  fxInvite: ["Convidar", "Invite", "Invitar"],
}

const OVERRIDE = {}

const GROUPS = { FeedFx: FEEDFX, Feed: FEED }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  let changed = 0
  for (const [ns, keys] of Object.entries(GROUPS)) {
    if (!d[ns]) d[ns] = {}
    for (const [key, vals] of Object.entries(keys)) {
      if (!(key in d[ns])) {
        d[ns][key] = vals[idx]
        added++
      }
    }
  }
  for (const [ns, keys] of Object.entries(OVERRIDE)) {
    if (!d[ns]) d[ns] = {}
    for (const [key, vals] of Object.entries(keys)) {
      if (d[ns][key] !== vals[idx]) {
        d[ns][key] = vals[idx]
        changed++
      }
    }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves, ${changed} trocadas`)
}
