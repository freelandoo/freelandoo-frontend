// i18n do Bees v2 (stories viram bees, vídeos viram Curtos) — spec backend
// docs/superpowers/specs/2026-07-10-bees-v2-stories-design.md.
// Slices F1-F4 ADICIONAM chaves aqui mesmo. Idempotente e não-destrutivo:
// só adiciona chaves ausentes. Rodar com: node scripts/i18n-bees-v2-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const LOCALES = ["pt-BR", "en", "es"]

// ── F1: timeline /bees ──────────────────────────────────────────────────────
const BEES = {
  scopeGlobal: ["Global", "Global", "Global"],
  scopeFollowing: ["Quem acompanho", "Following", "A quien sigo"],
  filterMenuAria: ["Filtrar timeline", "Filter timeline", "Filtrar la línea de tiempo"],
  emptyTimelineTitle: [
    "Ainda não tem bees por aqui",
    "No bees around here yet",
    "Todavía no hay bees por aquí",
  ],
  emptyTimelineDescription: [
    "Bees são os stories da Freelandoo. Quando alguém publicar, eles aparecem aqui — os melhores ficam no ar por até 7 dias.",
    "Bees are Freelandoo's stories. When someone posts, they show up here — the best ones stay up for up to 7 days.",
    "Los bees son los stories de Freelandoo. Cuando alguien publique, aparecen aquí — los mejores quedan hasta 7 días.",
  ],
  emptyFollowingTitle: ["Nada por aqui ainda", "Nothing here yet", "Nada por aquí todavía"],
  emptyFollowing: [
    "Ninguém que você acompanha postou um bee. Mude pra Global no menu acima.",
    "Nobody you follow posted a bee. Switch to Global in the menu above.",
    "Nadie a quien sigues publicó un bee. Cambia a Global en el menú de arriba.",
  ],
  loginTitle: ["Entre pra ver os bees", "Sign in to see the bees", "Entra para ver los bees"],
  loginDescription: [
    "Os bees são os stories da Freelandoo — vídeos que duram de 24h a 7 dias, dependendo do engajamento.",
    "Bees are Freelandoo's stories — videos that last from 24h to 7 days, depending on engagement.",
    "Los bees son los stories de Freelandoo — videos que duran de 24h a 7 días, según el engagement.",
  ],
  loginCta: ["Entrar", "Sign in", "Entrar"],
  reactAria: ["Reagir com emoji", "React with emoji", "Reaccionar con emoji"],
  reactWith: ["Reagir com {emoji}", "React with {emoji}", "Reaccionar con {emoji}"],
  linkOpenAria: ["Abrir link", "Open link", "Abrir enlace"],
}

// ── F2: barra de ações do StoryPlayer (ns Stories) ──────────────────────────
const STORIES = {
  like: ["Curtir", "Like", "Me gusta"],
  unlike: ["Descurtir", "Unlike", "Quitar me gusta"],
  comments: ["Comentários", "Comments", "Comentarios"],
  share: ["Compartilhar", "Share", "Compartir"],
  linkOpenAria: ["Abrir link", "Open link", "Abrir enlace"],
}

// ── F2: aba Salvos (ns Account) — chips Posts/Curtos/Bees ───────────────────
const ACCOUNT = {
  curtosLabel: ["Curtos", "Shorts", "Cortos"],
  savedKindBees: ["Bees", "Bees", "Bees"],
  noSavedBeesTitle: ["Nenhum bee salvo", "No saved bees", "Ningún bee guardado"],
  noSavedBees: [
    "Bees salvos somem quando expiram — os melhores ficam no ar por até 7 dias.",
    "Saved bees disappear when they expire — the best ones stay up for up to 7 days.",
    "Los bees guardados desaparecen al expirar — los mejores quedan hasta 7 días.",
  ],
  openBee: ["Abrir bee", "Open bee", "Abrir bee"],
}

// ── F3: composer do bee (ns Composer) — localização + links estilizados ─────
const COMPOSER = {
  "bee.badge": ["Bee", "Bee", "Bee"],
  "bee.locationLabel": ["Localização (opcional)", "Location (optional)", "Ubicación (opcional)"],
  "bee.locationPlaceholder": ["Ex.: São Bernardo do Campo/SP", "E.g.: São Bernardo do Campo/SP", "Ej.: São Bernardo do Campo/SP"],
  "bee.linksTitle": ["Links estilizados (até 3)", "Styled links (up to 3)", "Enlaces con estilo (hasta 3)"],
  "bee.linkLabel": ["Rótulo (ex.: Orçamento)", "Label (e.g.: Quote)", "Etiqueta (ej.: Presupuesto)"],
  "bee.linkUrl": ["URL (https://…)", "URL (https://…)", "URL (https://…)"],
  "bee.linkAdd": ["Adicionar", "Add", "Añadir"],
  "bee.linkRemove": ["Remover link", "Remove link", "Quitar enlace"],
  "bee.linkInvalid": ["URL inválida — use http(s)://", "Invalid URL — use http(s)://", "URL inválida — usa http(s)://"],
  "bee.linkLabelRequired": ["Dê um rótulo pro link", "Give the link a label", "Ponle una etiqueta al enlace"],
  "bee.styleGold": ["Dourado", "Gold", "Dorado"],
  "bee.stylePaper": ["Papel", "Paper", "Papel"],
  "bee.styleInk": ["Tinta", "Ink", "Tinta"],
}

const NAMESPACES = [
  ["Bees", BEES],
  ["Stories", STORIES],
  ["Account", ACCOUNT],
  ["Composer", COMPOSER],
]

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
  for (const [ns, keys] of NAMESPACES) added += mergeNamespace(json, ns, keys, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
