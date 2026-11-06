// Fill-if-absent: rótulo do pill Site nas comunidades com site externo.
const fs = require("fs")
const path = require("path")
const VALUES = {
  "pt-BR": "Ver o site do negócio",
  en: "View the business website",
  es: "Ver el sitio del negocio",
}
for (const [locale, value] of Object.entries(VALUES)) {
  const file = path.join(__dirname, "..", "messages", `${locale}.json`)
  const raw = fs.readFileSync(file, "utf8")
  const dict = JSON.parse(raw)
  const ns = Object.keys(dict).find((k) => dict[k] && dict[k].sitePillAria)
  if (!ns) throw new Error(`sitePillAria não encontrado em ${locale}`)
  if (!dict[ns].sitePillViewAria) dict[ns].sitePillViewAria = value
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + (raw.endsWith("\n") ? "\n" : ""))
}
