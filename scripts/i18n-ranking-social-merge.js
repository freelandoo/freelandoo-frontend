// Social do /ranking (likes + comentários sobre perfis): merge de chaves novas
// no namespace "Ranking" em messages/{pt-BR,en,es}.json. Idempotente e
// não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
//
// Rodar: node scripts/i18n-ranking-social-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const RANKING = {
  socialLikeAria: ["Curtir", "Like", "Me gusta"],
  socialUnlikeAria: ["Remover curtida", "Unlike", "Quitar me gusta"],
  socialCommentsAria: ["Ver comentários", "View comments", "Ver comentarios"],
  panelRankBadge: ["#{n} no ranking", "#{n} in the ranking", "#{n} en el ranking"],
  panelViewProfile: ["Ver perfil", "View profile", "Ver perfil"],
  panelNote: [
    "curtidas e comentários saem pela sua conta, não por subperfil",
    "likes and comments are posted by your account, not a subprofile",
    "los me gusta y comentarios salen de tu cuenta, no de un subperfil",
  ],
  commentsEmpty: ["Seja a primeira pessoa a comentar", "Be the first to comment", "Sé la primera persona en comentar"],
  commentsLoadMore: ["Carregar mais", "Load more", "Cargar más"],
  commentPlaceholder: ["Escreva seu comentário...", "Write your comment...", "Escribe tu comentario..."],
  commentSendAria: ["Enviar comentário", "Send comment", "Enviar comentario"],
  commentDeleteAria: ["Remover comentário", "Delete comment", "Eliminar comentario"],
  commentDeleteConfirm: ["Remover este comentário?", "Delete this comment?", "¿Eliminar este comentario?"],
  errorLoadComments: ["Erro ao carregar comentários", "Failed to load comments", "Error al cargar comentarios"],
  errorLoadMore: ["Erro ao carregar mais", "Failed to load more", "Error al cargar más"],
  errorPublish: ["Erro ao publicar comentário", "Failed to post comment", "Error al publicar comentario"],
  errorDeleteComment: ["Erro ao remover comentário", "Failed to delete comment", "Error al eliminar comentario"],
  closeAria: ["Fechar", "Close", "Cerrar"],
  accountUser: ["conta de usuário", "user account", "cuenta de usuario"],
  timeNow: ["agora", "now", "ahora"],
  timeMin: ["{n}min", "{n}m", "{n}min"],
  timeHours: ["{n}h", "{n}h", "{n}h"],
  timeDays: ["{n}d", "{n}d", "{n}d"],
  timeWeeks: ["{n}sem", "{n}w", "{n}sem"],
}

const GROUPS = { Ranking: RANKING }

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
