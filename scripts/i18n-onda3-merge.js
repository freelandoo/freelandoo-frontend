// Onda 3 do i18n (social: feed/bees/stories/composer/notificações): merge de chaves
// novas em messages/{pt-BR,en,es}.json. Idempotente e não-destrutivo: só ADICIONA
// chaves ausentes, nunca sobrescreve. Rodar com: node scripts/i18n-onda3-merge.js
//
// Placeholders {who}/{what} são preservados (substituídos em runtime via .replace).
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// Namespace novo "Bees"
const BEES = {
  chat: ["Chat", "Chat", "Chat"],
  comments: ["Comentários", "Comments", "Comentarios"],
  emptyDescription: [
    "Bees é o feed vertical 9:16. Quando alguém publicar um vídeo nesse formato, ele aparece aqui automaticamente.",
    "Bees is the vertical 9:16 feed. When someone posts a video in that format, it shows up here automatically.",
    "Bees es el feed vertical 9:16. Cuando alguien publique un video en ese formato, aparecerá aquí automáticamente.",
  ],
  emptyTitle: ["Ainda não tem Bees por aqui", "No Bees here yet", "Aún no hay Bees por aquí"],
  like: ["Curtir", "Like", "Me gusta"],
  liveButton: ["Live", "Live", "Live"],
  loadError: ["Erro ao carregar Bees", "Error loading Bees", "Error al cargar Bees"],
  loginToReport: ["Faça login para denunciar", "Log in to report", "Inicia sesión para denunciar"],
  mute: ["Mudo", "Mute", "Silenciar"],
  noVideo: ["Sem vídeo disponível", "No video available", "Sin video disponible"],
  play: ["Reproduzir", "Play", "Reproducir"],
  profileWord: ["perfil", "profile", "perfil"],
  removeBookmark: ["Remover dos salvos", "Remove from saved", "Quitar de guardados"],
  reportPost: ["Denunciar publicação", "Report post", "Denunciar publicación"],
  retry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  saveForLater: ["Salvar para depois", "Save for later", "Guardar para después"],
  share: ["Compartilhar", "Share", "Compartir"],
  unlike: ["Descurtir", "Unlike", "Quitar me gusta"],
  unmute: ["Ativar som", "Unmute", "Activar sonido"],
  viewLives: ["Ver lives", "View lives", "Ver lives"],
}

// Namespace novo "Comments"
const COMMENTS = {
  beFirst: ["Seja a primeira pessoa a comentar.", "Be the first to comment.", "Sé la primera persona en comentar."],
  close: ["Fechar", "Close", "Cerrar"],
  confirmDelete: ["Remover esse comentário?", "Delete this comment?", "¿Eliminar este comentario?"],
  daySuffix: ["d", "d", "d"],
  deleteComment: ["Remover comentário", "Delete comment", "Eliminar comentario"],
  deleteError: ["Erro ao remover", "Error removing", "Error al eliminar"],
  hourSuffix: ["h", "h", "h"],
  likeComment: ["Curtir comentário", "Like comment", "Me gusta el comentario"],
  loadError: ["Erro ao carregar", "Error loading", "Error al cargar"],
  loadMore: ["Carregar mais", "Load more", "Cargar más"],
  loadMoreError: ["Erro ao carregar mais", "Error loading more", "Error al cargar más"],
  loading: ["Carregando…", "Loading…", "Cargando…"],
  minuteSuffix: ["min", "min", "min"],
  monthSuffix: ["m", "mo", "m"],
  now: ["agora", "now", "ahora"],
  placeholder: ["Escreva um comentário…", "Write a comment…", "Escribe un comentario…"],
  postError: ["Erro ao publicar comentário", "Error posting comment", "Error al publicar el comentario"],
  profileWord: ["perfil", "profile", "perfil"],
  send: ["Enviar comentário", "Send comment", "Enviar comentario"],
  title: ["Comentários", "Comments", "Comentarios"],
  unlikeComment: ["Descurtir comentário", "Unlike comment", "Quitar me gusta del comentario"],
  weekSuffix: ["sem", "w", "sem"],
  yearSuffix: ["a", "y", "a"],
}

// Namespace novo "Notifications"
const NOTIFICATIONS = {
  aPermission: ["uma permissão", "a permission", "un permiso"],
  allCaughtUp: ["Tudo em dia", "All caught up", "Todo al día"],
  back: ["Voltar", "Back", "Volver"],
  daySuffix: ["d", "d", "d"],
  emptyDescription: [
    "Quando alguém curtir, comentar, seguir ou te mandar mensagem, aparece aqui.",
    "When someone likes, comments, follows, or messages you, it shows up here.",
    "Cuando alguien dé me gusta, comente, te siga o te envíe un mensaje, aparecerá aquí.",
  ],
  emptyShort: ["Sem notificações.", "No notifications.", "Sin notificaciones."],
  hourSuffix: ["h", "h", "h"],
  loading: ["Carregando notificações…", "Loading notifications…", "Cargando notificaciones…"],
  markAllRead: ["Marcar todas como lidas", "Mark all as read", "Marcar todas como leídas"],
  markAllShort: ["Marcar todas", "Mark all", "Marcar todas"],
  minuteSuffix: ["min", "min", "min"],
  now: ["agora", "now", "ahora"],
  reachedEnd: ["Você chegou ao fim.", "You've reached the end.", "Llegaste al final."],
  seeAll: ["Ver todas", "See all", "Ver todas"],
  someone: ["Alguém", "Someone", "Alguien"],
  title: ["Notificações", "Notifications", "Notificaciones"],
  weekSuffix: ["sem", "w", "sem"],
  // Frases com placeholder {who}/{what}
  likeReceived: ["{who} curtiu seu portfólio", "{who} liked your portfolio", "A {who} le gustó tu portafolio"],
  commentReceived: ["{who} comentou no seu portfólio", "{who} commented on your portfolio", "{who} comentó en tu portafolio"],
  followReceived: ["{who} começou a seguir", "{who} started following you", "{who} empezó a seguirte"],
  messageReceived: ["{who} mandou uma mensagem", "{who} sent you a message", "{who} te envió un mensaje"],
  supervisedMessageReceived: [
    "Conta supervisionada recebeu uma mensagem de {who}",
    "Supervised account received a message from {who}",
    "La cuenta supervisada recibió un mensaje de {who}",
  ],
  permissionRequest: ["{who} pediu permissão para {what}", "{who} requested permission to {what}", "{who} pidió permiso para {what}"],
  permViewFeed: ["ver o feed", "view the feed", "ver el feed"],
  permPostFeed: ["postar no feed", "post on the feed", "publicar en el feed"],
  permUseBees: ["usar Bees", "use Bees", "usar Bees"],
  permWatchCourses: ["assistir cursos", "watch courses", "ver cursos"],
  permSellCourses: ["vender cursos", "sell courses", "vender cursos"],
  permMessage: ["enviar mensagens", "send messages", "enviar mensajes"],
  permReceiveMessages: ["receber mensagens", "receive messages", "recibir mensajes"],
  permGlobalChat: ["chat global", "global chat", "chat global"],
  permMachineChat: ["chat de enxames", "swarm chat", "chat de enjambres"],
}

// Adições ao namespace existente "Feed"
const FEED = {
  createCourse: ["Curso", "Course", "Curso"],
  createLabel: ["Criar", "Create", "Crear"],
  createPost: ["Post", "Post", "Post"],
  createProfile: ["Perfil", "Profile", "Perfil"],
  regionLabel: ["Região", "Region", "Región"],
  regionTitle: ["Região", "Region", "Región"],
}

// Adições ao namespace existente "Post"
const POST = {
  likesLabelMany: ["curtidas", "likes", "me gusta"],
  likesLabelOne: ["curtida", "like", "me gusta"],
  musicLabel: ["Música", "Music", "Música"],
  muteMusic: ["Silenciar música", "Mute music", "Silenciar música"],
  unmuteMusic: ["Ativar música", "Unmute music", "Activar música"],
}

// Adições ao namespace existente "Stories"
const STORIES = {
  musicLabel: ["Música", "Music", "Música"],
  recordWithCamera: ["Gravar com a câmera (filtros)", "Record with the camera (filters)", "Grabar con la cámara (filtros)"],
}

const GROUPS = {
  Bees: BEES,
  Comments: COMMENTS,
  Notifications: NOTIFICATIONS,
  Feed: FEED,
  Post: POST,
  Stories: STORIES,
}

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
