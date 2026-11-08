// Paint: espera de 20 s e sem "vaga vazia vira computador" no texto (2026-11-08).
// OVERRIDE no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": { paintWaitingBots: "Esperando jogadores {n}/{k} · {s}", paintModeBotsNote: "Espera até 20 segundos" },
  en: { paintWaitingBots: "Waiting for players {n}/{k} · {s}", paintModeBotsNote: "Waits up to 20 seconds" },
  es: { paintWaitingBots: "Esperando jugadores {n}/{k} · {s}", paintModeBotsNote: "Espera hasta 20 segundos" },
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
