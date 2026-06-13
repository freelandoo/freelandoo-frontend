// Namespace "Notifications" — tipos novos do sino (auditoria). Idempotente,
// fill-if-absent. Rodar: node scripts/i18n-notif-expansion-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const NOTIFICATIONS = {
  // Slice C — comercial
  productSale: ["Você vendeu um produto", "You sold a product", "Vendiste un producto"],
  courseSale: ["Você vendeu um curso", "You sold a course", "Vendiste un curso"],
  bookingReceived: ["Novo agendamento recebido", "New booking received", "Nueva reserva recibida"],
}

const GROUPS = { Notifications: NOTIFICATIONS }

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
