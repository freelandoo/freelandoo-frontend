// Compila o alvo de rastreamento da RA da Casa Views (MindAR) a partir da arte
// impressa de cada holograma.
//
// Uso: node scripts/build-casa-ra-target.mjs muay-thai
//   lê   public/casaviews/ra/<chave>-alvo.jpg
//   grava public/casaviews/ra/<chave>.mind
//
// Precisa do Playwright (Chromium). O projeto não o instala: aponte
// PLAYWRIGHT_MODULE para um `playwright/index.mjs` existente, ou rode
// `npx -p playwright node scripts/build-casa-ra-target.mjs <chave>`.

import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath, pathToFileURL } from "node:url"

const key = process.argv[2]
if (!key || !/^[a-z0-9-]+$/.test(key)) {
  console.error("uso: node scripts/build-casa-ra-target.mjs <chave>")
  process.exit(1)
}

const pw = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright"
const { chromium } = await import(pw)

const root = fileURLToPath(new URL("..", import.meta.url))
const dir = "public/casaviews/ra/"
const ORIGIN = "http://ar-build.local"
const files = {
  "/alvo.jpg": [`${dir}${key}-alvo.jpg`, "image/jpeg"],
  "/mindar/mindar-image.prod.js": [`${dir}mindar/mindar-image.prod.js`, "text/javascript"],
  "/mindar/controller-mGt1s8dJ.js": [`${dir}mindar/controller-mGt1s8dJ.js`, "text/javascript"],
  "/mindar/ui-fBadYuor.js": [`${dir}mindar/ui-fBadYuor.js`, "text/javascript"],
}
// O MindAR rastreia bem com ~500–1000 px; o .mind cresce rápido com a resolução.
const MAX_SIDE = 900

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await browser.newPage()
page.on("console", (m) => console.log("[page]", m.text()))
await page.route(`${ORIGIN}/**`, async (route) => {
  const path = new URL(route.request().url()).pathname
  if (path === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><meta charset="utf-8">' })
  const f = files[path]
  if (!f) return route.fulfill({ status: 404, body: "" })
  route.fulfill({ contentType: f[1], body: await readFile(root + f[0]) })
})
await page.goto(ORIGIN + "/")

const b64 = await page.evaluate(async (MAX_SIDE) => {
  const { Compiler } = await import("/mindar/mindar-image.prod.js")
  const img = new Image()
  img.src = "/alvo.jpg"
  await img.decode()
  const s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement("canvas")
  c.width = Math.round(img.naturalWidth * s)
  c.height = Math.round(img.naturalHeight * s)
  const g = c.getContext("2d")
  g.imageSmoothingQuality = "high"
  g.drawImage(img, 0, 0, c.width, c.height)
  const t = new Image()
  t.src = c.toDataURL("image/png")
  await t.decode()
  console.log(`alvo ${c.width}x${c.height}`)
  const compiler = new Compiler()
  let last = -10
  await compiler.compileImageTargets([t], (pct) => {
    if (pct - last >= 10) console.log(`compilando ${pct.toFixed(0)}%`), (last = pct)
  })
  const data = compiler.exportData()
  let out = ""
  for (let i = 0; i < data.length; i += 0x8000) out += String.fromCharCode(...data.subarray(i, i + 0x8000))
  return btoa(out)
}, MAX_SIDE)
await browser.close()

const out = Buffer.from(b64, "base64")
await writeFile(`${root}${dir}${key}.mind`, out)
console.log(`${dir}${key}.mind (${(out.length / 1024).toFixed(0)} KB)`)
