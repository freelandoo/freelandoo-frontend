#!/usr/bin/env node
// npm run check:safe-return — o destino de retorno pós-login (`?next=`) só
// aceita caminho da MESMA origem. Roda o módulo REAL (lib/safe-return.ts),
// transpilado com o TypeScript do projeto.
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const src = readFileSync(fileURLToPath(new URL("../lib/safe-return.ts", import.meta.url)), "utf8")
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`)

let fail = 0
const check = (name, cond) => {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    fail++
    console.log(`  ✗ ${name}`)
  }
}
const s = mod.safeInternalPath

check("aceita caminho interno", s("/arena/") === "/arena/")
check("preserva query e hash", s("/search?q=a#x") === "/search?q=a#x")
check("recusa URL absoluta", s("https://evil.com") === null)
check("recusa //host", s("//evil.com") === null)
check("recusa /\\host (barra invertida)", s("/\\evil.com") === null)
check("recusa barra invertida codificada", s("/%5Cevil.com") === null)
check("recusa //host codificado", s("/%2F%2Fevil.com") === null)
check("recusa javascript:", s("javascript:alert(1)") === null)
check("recusa caractere de controle", s("/a\u0000b") === null && s("/a%0Ab") === null)
check("recusa credencial em parâmetro", s("/arena/?token=abc") === null && s("/x?access_token=1") === null)
check("recusa vazio, nulo e longo demais", s("") === null && s(null) === null && s("/" + "a".repeat(600)) === null)
check("recusa caminho relativo", s("arena") === null)
check("isOutsideNextApp reconhece /arena", mod.isOutsideNextApp("/arena/") && mod.isOutsideNextApp("/arena") && !mod.isOutsideNextApp("/arenas"))

console.log(fail ? `\n${fail} falha(s)` : "\nok")
process.exit(fail ? 1 : 0)
