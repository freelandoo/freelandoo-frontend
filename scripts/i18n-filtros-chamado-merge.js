// i18n do projeto "Filtros e Chamados por clique" (drill-in de Serviços/Cursos
// no FilterRail + chamado wizard 1-clique). Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-filtros-chamado-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const SEARCH = {
  backToEnxames: ["Voltar pros enxames", "Back to swarms", "Volver a los enjambres"],
}

// Subfiltros de produto dentro do modal de chamado (espelha o drill-in da Loja).
const CHAMADO = {
  refineProduct: ["Detalhe o que você procura (opcional):", "Detail what you're looking for (optional):", "Detalla lo que buscas (opcional):"],
  edit: ["Editar", "Edit", "Editar"],
  searchBrandPlaceholder: ["Buscar marca…", "Search brand…", "Buscar marca…"],
}

const GROUPS = { Search: SEARCH, Chamado: CHAMADO }

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
