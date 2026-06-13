// Tweaks da Carteira (/wallet): rótulos novos dos botões de Vida Financeira.
// Idempotente e não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
// Rótulos de 2 palavras (quebram em 2 linhas no botão). Rodar:
//   node scripts/i18n-wallet-tweaks-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const WALLET = {
  addIncome: ["Incluir ganho", "Add income", "Incluir ingreso"],
  addExpense: ["Incluir gasto", "Add expense", "Incluir gasto"],
  fixedIncome: ["Ganho fixo", "Fixed income", "Ingreso fijo"],
  fixedExpense: ["Gasto fixo", "Fixed expense", "Gasto fijo"],
}

const GROUPS = { Wallet: WALLET }

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
