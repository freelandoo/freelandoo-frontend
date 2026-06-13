// Namespace "Mei" — camada MEI/Recibo da Carteira (card + modais). Idempotente,
// fill-if-absent. O recibo IMPRESSO fica pt-BR de propósito (documento fiscal
// brasileiro) e NÃO entra aqui. Placeholders {pct}/{limit}/{day}/{n} preservados.
//   node scripts/i18n-mei-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEI = {
  title: ["MEI", "MEI", "MEI"],
  configure: ["Configurar", "Configure", "Configurar"],
  close: ["Fechar", "Close", "Cerrar"],
  save: ["Salvar", "Save", "Guardar"],
  // Termômetro
  thermoLabel: ["Faturamento via Freelandoo", "Revenue via Freelandoo", "Facturación vía Freelandoo"],
  ofLimit: ["{pct}% do teto", "{pct}% of the cap", "{pct}% del tope"],
  limitLine: ["Teto MEI: {limit}/ano", "MEI cap: {limit}/year", "Tope MEI: {limit}/año"],
  nearLimit: [
    "Você está perto do teto do MEI. Fique de olho para não desenquadrar.",
    "You're close to the MEI cap. Watch out so you don't get disqualified.",
    "Estás cerca del tope del MEI. Cuidado para no quedar fuera del régimen.",
  ],
  dasNote: ["DAS vence todo dia {day}.", "DAS is due on day {day} each month.", "El DAS vence el día {day} de cada mes."],
  disclaimer: [
    "Estimativa do que entrou pela plataforma neste ano. Receita fora da Freelandoo também conta no teto — confirme com seu contador.",
    "Estimate of what came in through the platform this year. Income outside Freelandoo also counts toward the cap — check with your accountant.",
    "Estimación de lo que entró por la plataforma este año. Los ingresos fuera de Freelandoo también cuentan para el tope — confírmalo con tu contador.",
  ],
  // Botões
  issueReceipt: ["Emitir recibo", "Issue receipt", "Emitir recibo"],
  myReceipts: ["Recibos", "Receipts", "Recibos"],
  // Modal emitir recibo
  takerName: ["Cliente (tomador)", "Client (payer)", "Cliente (tomador)"],
  takerNamePh: ["Nome de quem pagou", "Name of who paid", "Nombre de quien pagó"],
  takerDoc: ["CPF/CNPJ do cliente (opcional)", "Client tax ID (optional)", "CPF/CNPJ del cliente (opcional)"],
  description: ["Descrição do serviço", "Service description", "Descripción del servicio"],
  descriptionPh: ["Ex: design de unhas, corte e escova...", "E.g. nail design, cut and blow-dry...", "Ej: diseño de uñas, corte y peinado..."],
  amount: ["Valor (R$)", "Amount (R$)", "Importe (R$)"],
  issuedFor: ["Data", "Date", "Fecha"],
  emitAndPrint: ["Emitir e imprimir", "Issue and print", "Emitir e imprimir"],
  errTakerName: ["Informe o cliente.", "Enter the client.", "Indica el cliente."],
  errDescription: ["Descreva o serviço.", "Describe the service.", "Describe el servicio."],
  errAmount: ["Informe um valor válido.", "Enter a valid amount.", "Ingresa un importe válido."],
  errEmit: ["Não deu pra emitir", "Couldn't issue it", "No se pudo emitir"],
  // Modal configurar
  settingsTitle: ["Dados do MEI", "MEI details", "Datos del MEI"],
  isMei: ["Sou MEI", "I'm an MEI", "Soy MEI"],
  settingsHint: [
    "Esses dados aparecem como prestador nos recibos que você emitir.",
    "These details appear as the provider on the receipts you issue.",
    "Estos datos aparecen como prestador en los recibos que emitas.",
  ],
  providerName: ["Nome do prestador", "Provider name", "Nombre del prestador"],
  providerDoc: ["CPF", "Tax ID (CPF)", "CPF"],
  cnpj: ["CNPJ (MEI)", "CNPJ (MEI)", "CNPJ (MEI)"],
  providerAddress: ["Endereço", "Address", "Dirección"],
  dasReminder: ["Lembrar do DAS todo mês", "Remind me of DAS every month", "Recordar el DAS cada mes"],
  errSave: ["Não deu pra salvar", "Couldn't save", "No se pudo guardar"],
  // Lista de recibos
  receiptsTitle: ["Meus recibos", "My receipts", "Mis recibos"],
  noReceipts: ["Nenhum recibo emitido ainda.", "No receipts issued yet.", "Ningún recibo emitido aún."],
  receiptNo: ["Recibo Nº {n}", "Receipt No. {n}", "Recibo Nº {n}"],
  reprint: ["Reimprimir", "Reprint", "Reimprimir"],
}

const GROUPS = { Mei: MEI }

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
