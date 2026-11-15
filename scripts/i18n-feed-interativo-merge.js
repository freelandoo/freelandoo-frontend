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

  // ── baú + cápsula (F3/F4) ──
  capStatusCanceled: ["cancelada", "canceled", "cancelada"],
  capStatusDelivered: ["entregue", "delivered", "entregada"],
  capStatusFailed: ["não entregue", "not delivered", "no entregada"],
  capStatusScheduled: ["lacrada", "sealed", "sellada"],
  capsuleCancel: ["Cancelar", "Cancel", "Cancelar"],
  capsuleEmpty: ["Nenhuma ainda.", "None yet.", "Ninguna todavía."],
  capsuleLead: [
    "Escreva agora, entregue depois: para você mesmo no futuro ou para quem aceitou seus lançamentos.",
    "Write now, deliver later: to your future self or to anyone who accepted your throws.",
    "Escribe ahora, entrega después: para tu yo del futuro o para quien aceptó tus lanzamientos.",
  ],
  capsuleList: ["Suas cápsulas", "Your capsules", "Tus cápsulas"],
  capsuleMessagePh: ["Querido eu do futuro…", "Dear future me…", "Querido yo del futuro…"],
  capsulePost: ["Junto, um post seu (opcional)", "Along with it, one of your posts (optional)", "Junto, un post tuyo (opcional)"],
  capsuleSaved: ["Cápsula lacrada. Ela abre na hora marcada.", "Capsule sealed. It opens at the set time.", "Cápsula sellada. Se abre a la hora marcada."],
  capsuleSeal: ["Lacrar a cápsula", "Seal the capsule", "Sellar la cápsula"],
  capsuleSealedStamp: ["LACRADA", "SEALED", "SELLADA"],
  capsuleTitle: ["Cápsula do tempo", "Time capsule", "Cápsula del tiempo"],
  capsuleToMe: ["Para mim", "To me", "Para mí"],
  capsuleWhen: ["Quando abrir", "When to open", "Cuándo abrir"],
  capsuleWhere: ["Onde entregar", "Where to deliver", "Dónde entregar"],
  capsuleWhereBoth: ["Nos dois", "Both", "En los dos"],
  capsuleWhereChat: ["Nas mensagens", "In messages", "En los mensajes"],
  capsuleWhereFeed: ["No feed", "In the feed", "En el feed"],
  capsuleWritten: ["Escrita em {d}", "Written on {d}", "Escrita el {d}"],
  chestKind: ["Baú", "Chest", "Cofre"],
  chestLead: [
    "O baú cai no feed de quem aceitou seus lançamentos. Só a pessoa vê o que tem dentro quando abrir.",
    "The chest lands in the feed of someone who accepted your throws. Only they see what's inside when they open it.",
    "El cofre cae en el feed de quien aceptó tus lanzamientos. Solo esa persona ve lo que hay dentro al abrirlo.",
  ],
  chestLucky: ["Na sorte", "Lucky draw", "A la suerte"],
  chestMessage: ["Mensagem", "Message", "Mensaje"],
  chestMessagePh: ["Escreva algo curto (opcional)", "Write something short (optional)", "Escribe algo corto (opcional)"],
  chestNoTargets: ["Ninguém aceitou receber seus lançamentos ainda.", "No one has accepted your throws yet.", "Nadie ha aceptado tus lanzamientos todavía."],
  chestReaction: ["Reação surpresa", "Surprise reaction", "Reacción sorpresa"],
  chestSend: ["Mandar o baú", "Send the chest", "Enviar el cofre"],
  chestSticker: ["Figurinha", "Sticker", "Figurita"],
  chestTitle: ["Mandar um baú", "Send a chest", "Enviar un cofre"],
  chestTo: ["Para quem", "To whom", "Para quién"],
  collection: ["Sua coleção", "Your collection", "Tu colección"],
  giftCollected: ["A figurinha foi para a sua coleção.", "The sticker went to your collection.", "La figurita fue a tu colección."],
  giftLucky: ["Caiu para você na sorte!", "It came to you by luck!", "¡Te tocó a la suerte!"],
  giftOpen: ["Abrir o baú", "Open the chest", "Abrir el cofre"],
  giftOpenFailed: ["Esse baú não abriu. Tente de novo mais tarde.", "This chest didn't open. Try again later.", "Este cofre no se abrió. Inténtalo más tarde."],
  giftSent: ["Baú enviado! Vai cair no feed da pessoa.", "Chest sent! It will land in their feed.", "¡Cofre enviado! Caerá en su feed."],
  giftSentLucky: ["A sorte escolheu @{u}!", "Luck picked @{u}!", "¡La suerte eligió a @{u}!"],
  giftTapToOpen: ["Toque para abrir", "Tap to open", "Toca para abrir"],
  giftsOff: ["Não recebo baús", "I don't receive chests", "No recibo cofres"],
  giftsOn: ["Recebo baús", "I receive chests", "Recibo cofres"],
  none: ["Nenhuma", "None", "Ninguna"],
  toastGiftOpened: ["@{u} abriu o seu baú!", "@{u} opened your chest!", "¡@{u} abrió tu cofre!"],
  sticker_coroa: ["Coroa", "Crown", "Corona"],
  sticker_raio: ["Raio", "Bolt", "Rayo"],
  sticker_chama: ["Chama", "Flame", "Llama"],
  sticker_estrela: ["Estrela", "Star", "Estrella"],
  sticker_coracao: ["Coração", "Heart", "Corazón"],
  sticker_foguete: ["Foguete", "Rocket", "Cohete"],
  sticker_gema: ["Gema", "Gem", "Gema"],
  sticker_sol: ["Sol", "Sun", "Sol"],
  sticker_lua: ["Lua", "Moon", "Luna"],
  sticker_nota: ["Nota", "Note", "Nota"],
  sticker_trofeu: ["Troféu", "Trophy", "Trofeo"],
  sticker_faisca: ["Faísca", "Spark", "Chispa"],
  rarity_comum: ["comum", "common", "común"],
  rarity_raro: ["rara", "rare", "rara"],
  rarity_lendario: ["lendária", "legendary", "legendaria"],
  chest_madeira: ["Madeira", "Wood", "Madera"],
  chest_ferro: ["Ferro", "Iron", "Hierro"],
  chest_ouro: ["Ouro", "Gold", "Oro"],
  reaction_confete: ["Confete", "Confetti", "Confeti"],
  reaction_fogos: ["Fogos", "Fireworks", "Fuegos"],
  "reaction_chuva-de-mel": ["Chuva de mel", "Honey rain", "Lluvia de miel"],
  reaction_coracoes: ["Corações", "Hearts", "Corazones"],
}

const FEED = {
  fxThrowers: ["Quem pode lançar", "Who can throw", "Quién puede lanzar"],
  fxNoTargets: [
    "Ninguém aceitou receber seus lançamentos ainda.",
    "No one has accepted your throws yet.",
    "Nadie ha aceptado tus lanzamientos todavía.",
  ],
  fxInvite: ["Convidar", "Invite", "Invitar"],
  fxChest: ["Mandar um baú", "Send a chest", "Enviar un cofre"],
  fxCapsule: ["Cápsula do tempo", "Time capsule", "Cápsula del tiempo"],
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
