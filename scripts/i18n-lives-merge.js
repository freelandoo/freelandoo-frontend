// i18n de Lives: modal "em construção" (gate ao entrar em Lives via /bees) +
// textos do lives-view.tsx (regra do escoteiro — arquivo tocado sai traduzido).
// Namespace novo "Lives". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-lives-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const LIVES = {
  // Modal "em construção"
  soonTitle: ["Estamos construindo", "We're building this", "Estamos construyendo"],
  soonSubtitle: ["Em breve.", "Coming soon.", "Muy pronto."],
  soonClose: ["Fechar", "Close", "Cerrar"],
  // lives-view
  loadError: ["Erro ao carregar lives", "Error loading lives", "Error al cargar las lives"],
  backToBees: ["Voltar para Bees", "Back to Bees", "Volver a Bees"],
  refresh: ["Atualizar", "Refresh", "Actualizar"],
  retry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  emptyTitle: ["Nenhuma live no ar agora", "No live on air right now", "Ninguna live al aire ahora"],
  emptyDesc: ["Seja o primeiro a transmitir. Toque em “Ir ao vivo” e mostre o seu trampo em tempo real.", "Be the first to broadcast. Tap “Go live” and show your work in real time.", "Sé el primero en transmitir. Toca “Ir en vivo” y muestra tu trabajo en tiempo real."],
  goLive: ["Ir ao vivo", "Go live", "Ir en vivo"],
}

const GROUPS = { Lives: LIVES }

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
