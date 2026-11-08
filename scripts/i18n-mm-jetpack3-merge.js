// mm3d-78: Jetpack 3.0 — indicador de altitude e avisos de limite (2026-11-08).
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": { jetAltitude: "Altitude", jetAltShort: "Alt", jetLimitTop: "Limite superior", jetLimitBottom: "Limite inferior" },
  en: { jetAltitude: "Altitude", jetAltShort: "Alt", jetLimitTop: "Ceiling limit", jetLimitBottom: "Floor limit" },
  es: { jetAltitude: "Altitud", jetAltShort: "Alt", jetLimitTop: "Límite superior", jetLimitBottom: "Límite inferior" },
}
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
