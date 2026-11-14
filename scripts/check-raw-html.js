// scripts/check-raw-html.js — Segurança A4 (XSS), roda no `npm run lint`.
//
// Falha se algum `dangerouslySetInnerHTML` recebe `JSON.stringify(...)` cru (ou uma variável
// montada com `JSON.stringify` no mesmo arquivo): o JSON não escapa `<` e texto de usuário com
// `</script>` vira script. Use `safeJsonLd` de `@/lib/json-ld`.
// Também prova que o escape funciona (o mesmo código do helper, sem compilar TS).
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const DIRS = ["app", "components", "features", "lib"]
const bad = []

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (!/node_modules|\.next/.test(p)) walk(p)
    } else if (/\.(tsx|ts|jsx|js)$/.test(p)) check(p)
  }
}

function check(file) {
  const src = fs.readFileSync(file, "utf8")
  if (!src.includes("dangerouslySetInnerHTML")) return
  // variáveis montadas com JSON.stringify cru no arquivo
  const rawVars = new Set()
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*JSON\.stringify\(/g)) rawVars.add(m[1])
  for (const m of src.matchAll(/__html\s*:\s*([^}\n]+)/g)) {
    const expr = m[1].trim()
    const line = src.slice(0, m.index).split("\n").length
    const usesRawStringify = /^JSON\.stringify\(/.test(expr) && !/\.replace\(\/<\/g/.test(expr)
    const usesRawVar = /^(\w+)\s*,?$/.test(expr) && rawVars.has(expr.replace(/[,\s]/g, ""))
    if (usesRawStringify || usesRawVar) bad.push(`${path.relative(ROOT, file)}:${line}  ${expr.slice(0, 80)}`)
  }
}

for (const d of DIRS) walk(path.join(ROOT, d))

// o escape (mesma regra do lib/json-ld.ts)
const esc = (data) =>
  (JSON.stringify(data ?? null) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029")
const attack = { name: "</script><script>alert(1)</script>" }
const out = esc(attack)
if (/<\/?script/i.test(out) || JSON.parse(out).name !== attack.name) bad.push("lib/json-ld.ts: o escape não segura `</script>`")

const helper = fs.readFileSync(path.join(ROOT, "lib", "json-ld.ts"), "utf8")
if (!helper.includes('.replace(/</g, "\\\\u003c")')) bad.push("lib/json-ld.ts: escape de `<` sumiu")

if (bad.length) {
  console.error("JSON cru em dangerouslySetInnerHTML (use safeJsonLd de @/lib/json-ld):\n" + bad.join("\n"))
  process.exit(1)
}
console.log("check-raw-html: ok")
