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
  // Slice D — chamados / O.S.
  serviceResponseReceived: ["{who} respondeu seu chamado", "{who} replied to your request", "{who} respondió tu solicitud"],
  courseResponseReceived: ["{who} respondeu seu pedido de curso", "{who} replied to your course request", "{who} respondió tu solicitud de curso"],
  productResponseNew: ["{who} respondeu seu pedido de produto", "{who} replied to your product request", "{who} respondió tu pedido de producto"],
  productRequestNew: [
    "Novo pedido de produto compatível com você",
    "New product request matching you",
    "Nuevo pedido de producto compatible contigo",
  ],
  // Slice F — social extra
  clanInvite: ["{who} convidou você para um clan", "{who} invited you to a clan", "{who} te invitó a un clan"],
  clanInviteNamed: ["{who} convidou você para o clan {clan}", "{who} invited you to the clan {clan}", "{who} te invitó al clan {clan}"],
  clanMemberJoined: ["{who} entrou no seu clan", "{who} joined your clan", "{who} se unió a tu clan"],
  liveGiftReceived: ["{who} te enviou um presente na live", "{who} sent you a gift on the live", "{who} te envió un regalo en el vivo"],
  liveGiftNamed: ["{who} te enviou {gift} na live", "{who} sent you {gift} on the live", "{who} te envió {gift} en el vivo"],
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
