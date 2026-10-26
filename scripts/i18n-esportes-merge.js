/**
 * Plataforma Fitness → ESPORTES (2026-10-26, mig 306 do backend).
 *
 * - RENOMEIA (sobrescreve) os rótulos que diziam "Fitness" para a comunidade:
 *   o dicionário vence o fallback inline, então trocar só no JSX não mudaria
 *   uma vírgula na tela.
 * - ACRESCENTA (fill-if-absent) as chaves novas: abas, modal do esporte, aba
 *   da academia, seletor de esporte no composer e o "conectar" das academias.
 *
 * Idempotente. Uso: node scripts/i18n-esportes-merge.js
 */
const fs = require("fs")
const path = require("path")

const LOCALES = ["pt-BR", "en", "es"]
const DIR = path.join(__dirname, "..", "messages")

const RENAME = {
  Fitness: {
    platformTitle: ["Esportes", "Sports", "Deportes"],
    feedLoadError: ["Não deu pra abrir o feed de Esportes.", "Couldn't open the Sports feed.", "No se pudo abrir el feed de Deportes."],
    publishCta: ["Publicar em Esportes", "Post on Sports", "Publicar en Deportes"],
  },
  Account: {
    fitnessTool: ["Esportes", "Sports", "Deportes"],
    fitnessPill: ["Esportes", "Sports", "Deportes"],
  },
  Profile: { fitnessTool: ["Esportes", "Sports", "Deportes"] },
  Spaces: {
    qpFitness: ["Esportes", "Sports", "Deportes"],
    visitorFitness: ["Esportes", "Sports", "Deportes"],
  },
  Academies: { eyebrow: ["Esportes · Freelandoo", "Sports · Freelandoo", "Deportes · Freelandoo"] },
}

const ADD = {
  Sports: {
    eyebrow: ["Esportes", "Sports", "Deportes"],
    tabAll: ["Geral", "All", "General"],
    tabMine: ["Meu esporte", "My sport", "Mi deporte"],
    tabsAria: ["Seções de Esportes", "Sports sections", "Secciones de Deportes"],
    pickTitleFirst: ["Qual é o seu esporte?", "What's your sport?", "¿Cuál es tu deporte?"],
    pickTitle: ["Trocar meu esporte", "Change my sport", "Cambiar mi deporte"],
    pickDescription: [
      "A aba Meu esporte mostra só os posts dele. O feed Geral continua com todos os esportes.",
      "The My sport tab shows only its posts. The All feed keeps every sport.",
      "La pestaña Mi deporte muestra solo sus posts. El feed General sigue con todos los deportes.",
    ],
    pickError: ["Não deu para salvar. Tente de novo.", "Couldn't save. Try again.", "No se pudo guardar. Inténtalo de nuevo."],
    mySportIs: ["Seu esporte: {sport}", "Your sport: {sport}", "Tu deporte: {sport}"],
    noSportYet: ["Você ainda não escolheu seu esporte.", "You haven't picked your sport yet.", "Aún no elegiste tu deporte."],
    changeSport: ["Trocar", "Change", "Cambiar"],
    chooseSport: ["Escolher esporte", "Pick a sport", "Elegir deporte"],
    addAcademy: ["Adicionar academia", "Add gym", "Agregar gimnasio"],
    shareAcademy: ["Compartilhar academia", "Share gym", "Compartir gimnasio"],
    ranking: ["Ranking", "Ranking", "Ranking"],
    postToAcademy: ["Postar na comunidade", "Post to the community", "Publicar en la comunidad"],
    shareText: ["Treine comigo na {name}!", "Train with me at {name}!", "¡Entrena conmigo en {name}!"],
    shareCopied: ["Link da academia copiado.", "Gym link copied.", "Enlace del gimnasio copiado."],
    unlink: ["Desconectar academia", "Disconnect gym", "Desconectar gimnasio"],
    unlinkConfirm: [
      "Desconectar sua matrícula desta academia?",
      "Disconnect your membership from this gym?",
      "¿Desconectar tu matrícula de este gimnasio?",
    ],
    unlinked: ["Academia desconectada.", "Gym disconnected.", "Gimnasio desconectado."],
    unlinkError: ["Não deu para desconectar agora.", "Couldn't disconnect right now.", "No se pudo desconectar ahora."],
  },
  Academies: {
    backToSports: ["Voltar para Esportes", "Back to Sports", "Volver a Deportes"],
    connectSubtitle: [
      "Toque na sua academia e confirme com o CPF da matrícula — ela vira uma aba em Esportes.",
      "Tap your gym and confirm with your membership CPF — it becomes a tab in Sports.",
      "Toca tu gimnasio y confirma con el CPF de la matrícula — se vuelve una pestaña en Deportes.",
    ],
    registerMine: ["Cadastrar minha academia", "Register my gym", "Registrar mi gimnasio"],
    loginToConnect: [
      "Entre na sua conta para conectar sua academia.",
      "Sign in to connect your gym.",
      "Inicia sesión para conectar tu gimnasio.",
    ],
    connectOk: ["Academia conectada!", "Gym connected!", "¡Gimnasio conectado!"],
    connectSubmit: ["Conectar", "Connect", "Conectar"],
    connectCta: ["Conectar", "Connect", "Conectar"],
    staffOpenPage: ["Sou da equipe", "I'm staff", "Soy del equipo"],
  },
  Composer: {
    "details.sportLabel": ["Esporte do post", "Post sport", "Deporte del post"],
    "details.sportNone": ["Sem esporte (só no Geral)", "No sport (All feed only)", "Sin deporte (solo en General)"],
  },
}

let renamed = 0
let added = 0
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, keys] of Object.entries(RENAME)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[idx]) {
        dict[ns][key] = values[idx]
        renamed += 1
      }
    }
  }
  for (const [ns, keys] of Object.entries(ADD)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[idx]
        added += 1
      }
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`)
})

console.log(`i18n esportes: ${renamed} renomeada(s), ${added} adicionada(s).`)
