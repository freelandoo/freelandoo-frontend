// F3.S1 — First Load JS por rota, medido no HTML REAL servido.
//
// Por que assim: o build usa Turbopack (Next 16), que não emite
// app-build-manifest.json nem funciona com @next/bundle-analyzer (webpack-only),
// e o `next build` não imprime mais a coluna de tamanhos. Medir os <script src>
// e <link rel="preload" as="script"> do HTML é a régua mais honesta — reflete
// exatamente o que o browser baixa no primeiro paint, inclusive o ganho de
// next/dynamic (chunks lazy NÃO aparecem como script tag).
//
// Uso:
//   npm run build
//   npx next start -p 3300        (noutro terminal)
//   npm run bundle:report          (ou: node scripts/bundle-baseline.mjs /rota1 /rota2)
//
// Teto acordado: 250KB raw por rota. Atualizar docs/BUNDLE_BASELINE.md
// sempre que um slice de renderização mexer numa rota.

import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { fileURLToPath } from "node:url"

const BASE = process.env.BUNDLE_BASE_URL || "http://localhost:3300"
const LIMIT_KB = 250

// Rotas-chave (tráfego + alvos do plano F3). Params usam valores dummy:
// o shell client da rota é servido igual; o fetch de dados falha só no browser.
const DEFAULT_ROUTES = [
  "/",
  "/search",
  "/feed",
  "/bees",
  "/account",
  "/mensagens",
  "/freelancer/1",
  "/wallet",
  "/ranking",
  "/enxame/1",
  "/cursos",
  "/loja-polens",
  "/blog",
]

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const nextDir = path.join(root, ".next")

function chunkSizeFromDisk(src) {
  // src: /_next/static/chunks/xyz.js → .next/static/chunks/xyz.js
  const rel = src.replace(/^\/_next\//, "").split("?")[0]
  const p = path.join(nextDir, rel)
  if (!fs.existsSync(p)) return null
  const raw = fs.statSync(p).size
  const gz = zlib.gzipSync(fs.readFileSync(p)).length
  return { raw, gz }
}

async function measure(route) {
  const res = await fetch(BASE + route, { redirect: "follow" })
  const html = await res.text()
  const srcs = new Set()
  for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)) srcs.add(m[1])
  for (const m of html.matchAll(/<link[^>]+rel="preload"[^>]+href="([^"]+\.js[^"]*)"[^>]*as="script"/g)) srcs.add(m[1])
  let raw = 0
  let gz = 0
  let missing = 0
  for (const src of srcs) {
    if (!src.startsWith("/_next/")) continue
    const s = chunkSizeFromDisk(src)
    if (!s) { missing++; continue }
    raw += s.raw
    gz += s.gz
  }
  return { route, status: res.status, scripts: srcs.size, rawKb: raw / 1024, gzKb: gz / 1024, missing }
}

const routes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROUTES

try {
  await fetch(BASE + "/")
} catch {
  console.error(`Servidor não respondeu em ${BASE} — rode \`npx next start -p 3300\` antes.`)
  process.exit(1)
}

const results = []
for (const r of routes) {
  try {
    results.push(await measure(r))
  } catch (e) {
    results.push({ route: r, status: "ERR", scripts: 0, rawKb: 0, gzKb: 0, missing: 0, err: String(e?.message || e) })
  }
}

results.sort((a, b) => b.rawKb - a.rawKb)
console.log(`| Rota | HTTP | First Load JS raw (KB) | gzip (KB) |`)
console.log(`|------|------|----------------------:|----------:|`)
for (const r of results) {
  const flag = r.rawKb > LIMIT_KB ? " ⚠️" : ""
  console.log(`| \`${r.route}\` | ${r.status} | ${r.rawKb.toFixed(0)}${flag} | ${r.gzKb.toFixed(0)} |`)
}
const over = results.filter((r) => r.rawKb > LIMIT_KB)
console.log(`\nTeto: ${LIMIT_KB}KB raw · rotas acima: ${over.length}/${results.length}`)
