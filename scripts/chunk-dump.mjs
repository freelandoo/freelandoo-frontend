// Uso interno (avaliação do slice do shell): lista cada chunk do First Load
// de uma rota com tamanho raw/gzip, ordenado. node scripts/chunk-dump.mjs /rota
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { fileURLToPath } from "node:url"

const BASE = process.env.BUNDLE_BASE_URL || "http://localhost:3300"
const route = process.argv[2] || "/cursos"
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const nextDir = path.join(root, ".next")

const res = await fetch(BASE + route, { redirect: "follow" })
const html = await res.text()
const srcs = new Set()
for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)) srcs.add(m[1])
for (const m of html.matchAll(/<link[^>]+rel="preload"[^>]+href="([^"]+\.js[^"]*)"[^>]*as="script"/g)) srcs.add(m[1])

const rows = []
for (const src of srcs) {
  if (!src.startsWith("/_next/")) continue
  const rel = src.replace(/^\/_next\//, "").split("?")[0]
  const p = path.join(nextDir, rel)
  if (!fs.existsSync(p)) continue
  const raw = fs.statSync(p).size
  const gz = zlib.gzipSync(fs.readFileSync(p)).length
  rows.push({ rel, raw, gz })
}
rows.sort((a, b) => b.raw - a.raw)
let traw = 0
for (const r of rows) {
  traw += r.raw
  console.log(`${(r.raw / 1024).toFixed(0).padStart(6)} KB  gz ${(r.gz / 1024).toFixed(0).padStart(5)}  ${r.rel}`)
}
console.log(`TOTAL ${(traw / 1024).toFixed(0)} KB em ${rows.length} chunks — rota ${route} (HTTP ${res.status})`)
