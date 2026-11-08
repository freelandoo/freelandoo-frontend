// mm3d-78e: Jetpack no celular sem ◀ ▶ — arrastar o dedo dirige (2026-11-08).
// OVERRIDE no namespace MeuMundo (o texto antigo citava os botões). Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": { jetHintTouch: "Segure PROPULSOR para subir · arraste o dedo para os lados" },
  en: { jetHintTouch: "Hold THRUST to climb · drag your finger sideways to steer" },
  es: { jetHintTouch: "Mantén PROPULSOR para subir · arrastra el dedo hacia los lados" },
}
for (const [loc, set] of Object.entries(TEXT)) {
  const file = path.join(DIR, loc + ".json")
  const raw = fs.readFileSync(file, "utf8")
  const json = JSON.parse(raw)
  const ns = (json.MeuMundo = json.MeuMundo || {})
  let n = 0
  for (const [k, v] of Object.entries(set)) if (ns[k] !== v) { ns[k] = v; n++ }
  const crlf = raw.includes("\r\n")
  let out = JSON.stringify(json, null, 2) + "\n"
  if (crlf) out = out.replace(/\n/g, "\r\n")
  fs.writeFileSync(file, out)
  console.log(loc, "~" + n)
}
