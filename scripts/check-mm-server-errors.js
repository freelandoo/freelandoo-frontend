// Toda mensagem de erro dos serviços do Meu Mundo tem tradução?
// Texto novo no back sem entrada aqui sai em português para quem joga em
// inglês ou espanhol. node scripts/check-mm-server-errors.js [pasta do back]
const fs = require("fs")
const path = require("path")
const BACK = process.argv[2] || path.join(__dirname, "..", "..", "..", "freelandoo-backend")
const svc = path.join(BACK, "src", "services")
const files = fs.readdirSync(svc).filter((f) => f.startsWith("MeuMundo")).map((f) => path.join(svc, f))
files.push(path.join(BACK, "src", "controllers", "MeuMundoController.js"))
const found = new Set()
for (const f of files) {
  const s = fs.readFileSync(f, "utf8")
  for (const m of s.matchAll(/error:\s*(["`])((?:(?!\1).)+)\1/g)) found.add(m[2].replace(/\$\{[^}]+\}/g, "{n}"))
  for (const m of s.matchAll(/\b\w+:\s*\["([^"]+)",\s*\d{3}\]/g)) found.add(m[1])
  for (const m of s.matchAll(/\|\| \["([^"]+)", \d{3}\]/g)) found.add(m[1])
  for (const m of s.matchAll(/fail\("([^"]+ [^"]+)"/g)) found.add(m[1])
}
let bad = 0
for (const loc of ["pt-BR", "en", "es"]) {
  const ns = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "messages", `${loc}.json`), "utf8")).MeuMundoServer || {}
  const miss = [...found].filter((k) => typeof ns[k] !== "string")
  bad += miss.length
  console.log(`${loc}: ${found.size - miss.length}/${found.size}`)
  miss.forEach((k) => console.log(`  falta: ${k}`))
}
process.exit(bad ? 1 : 0)
