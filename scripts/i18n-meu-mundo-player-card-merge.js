// Meu Mundo 3D — mm3d-31: card de perfil de outro jogador (toque no boneco).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-player-card-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  pcTitle: ["Perfil do jogador", "Player profile", "Perfil del jugador"],
  pcClose: ["Fechar", "Close", "Cerrar"],
  pcAvatarAlt: ["Foto de {name}", "{name}'s photo", "Foto de {name}"],
  pcOnline: ["Online", "Online", "En línea"],
  pcWorld: ["Meu Mundo", "Meu Mundo", "Meu Mundo"],
  pcLeft: ["Saiu daqui", "Left this place", "Se fue de aquí"],
  pcLoading: ["Carregando perfil…", "Loading profile…", "Cargando perfil…"],
  pcGone: ["Esse jogador não está mais aqui.", "This player isn't here anymore.", "Este jugador ya no está aquí."],
  pcError: ["Não deu para carregar o perfil.", "Couldn't load the profile.", "No se pudo cargar el perfil."],
  pcRetry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  pcUnavailable: ["Perfil indisponível", "Profile unavailable", "Perfil no disponible"],
  pcUnavailableHint: ["Este perfil não está disponível para você.", "This profile isn't available to you.", "Este perfil no está disponible para ti."],
  pcPosts: ["Posts", "Posts", "Posts"],
  pcFollowers: ["Seguidores", "Followers", "Seguidores"],
  pcFollowing: ["Seguindo", "Following", "Siguiendo"],
  pcNoRatings: ["Sem avaliações", "No reviews", "Sin reseñas"],
  pcRatingsOne: ["{avg} · 1 avaliação", "{avg} · 1 review", "{avg} · 1 reseña"],
  pcRatingsMany: ["{avg} · {n} avaliações", "{avg} · {n} reviews", "{avg} · {n} reseñas"],
  pcViewProfile: ["Ver perfil", "View profile", "Ver perfil"],
  pcMessage: ["Mensagem", "Message", "Mensaje"],
  pcFollow: ["Seguir", "Follow", "Seguir"],
  pcFollowingBtn: ["Seguindo", "Following", "Siguiendo"],
  pcFollowError: ["Não deu para seguir agora.", "Couldn't update follow right now.", "No se pudo seguir ahora."],
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
console.log(`i18n meu-mundo player-card: ${added} chaves adicionadas`)
