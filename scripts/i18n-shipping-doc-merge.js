// Coleta de CPF/CNPJ para etiqueta do Melhor Envio (produção).
//   - ns Product: campo de documento no checkout de produto físico.
//   - ns Account: campos de origem (CPF/CNPJ, número, complemento) nas settings
//     do subperfil vendedor.
// Idempotente, fill-if-absent. Cada chave = [pt-BR, en, es].
//   node scripts/i18n-shipping-doc-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const PRODUCT = {
  documentPlaceholder: ["CPF ou CNPJ", "Tax ID (CPF/CNPJ)", "CPF o CNPJ"],
  documentHint: [
    "Necessário para emitir a etiqueta de envio.",
    "Required to issue the shipping label.",
    "Necesario para emitir la etiqueta de envío.",
  ],
  documentRequired: [
    "Informe um CPF ou CNPJ válido para o envio",
    "Enter a valid tax ID (CPF/CNPJ) for shipping",
    "Ingresa un CPF o CNPJ válido para el envío",
  ],
}

const GROUPS = { Product: PRODUCT }

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
