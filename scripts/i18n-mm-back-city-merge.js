// Saída de todo minijogo: "Voltar à cidade" (2026-11-08). Fill-if-absent, MeuMundo. Idempotente.
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = { "pt-BR": { mmBackToCity: "Voltar à cidade" }, en: { mmBackToCity: "Back to the city" }, es: { mmBackToCity: "Volver a la ciudad" } }
for (const [loc, add] of Object.entries(TEXT)) {
  const file = path.join(DIR, loc + ".json")
  const raw = fs.readFileSync(file, "utf8")
  const json = JSON.parse(raw)
  const ns = (json.MeuMundo = json.MeuMundo || {})
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in ns)) { ns[k] = v; n++ }
  const crlf = raw.includes("\r\n")
  let out = JSON.stringify(json, null, 2) + "\n"
  if (crlf) out = out.replace(/\n/g, "\r\n")
  fs.writeFileSync(file, out)
  console.log(loc, "+" + n)
}
