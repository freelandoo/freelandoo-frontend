// scripts/check-site-pages.mjs
//
// Exercita a tradução entre "a pilha na prancheta" e "o documento do site"
// (mig 238 — sub-páginas).
//
// ⚠️ POR QUE ESTE SCRIPT EXISTE: a função tem um modo de falhar que NÃO dá
// sintoma na hora. Gravar o retorno do canvas cru enquanto se edita uma
// sub-página substitui a home pelas seções dela: o site publicado perde a página
// inicial por causa de uma edição feita em outra página, sem erro nenhum, e só o
// recarregamento seguinte mostra o estrago. Leitura de código não pega isso de
// forma confiável — por isso aqui se confere o comportamento.
//
// Roda o MÓDULO DE VERDADE (`site-pages.ts`), transpilado com o TypeScript do
// próprio projeto. Uma cópia da lógica aqui dentro não provaria nada sobre o que
// está em produção.
//
//   node scripts/check-site-pages.mjs

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const here = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(
  here,
  "..",
  "app",
  "(header-only)",
  "comunidades",
  "[id]",
  "_components",
  "site-builder",
  "site-pages.ts"
)

// `site-pages.ts` só tem `import type`, então transpilar remove o import e o
// módulo fica sem dependência nenhuma — é o que permite carregá-lo solto.
const js = ts.transpileModule(fs.readFileSync(SRC, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "fl-site-pages-")), "m.mjs")
fs.writeFileSync(tmp, js, "utf8")
const { findActivePage, canvasConfigFor, writeCanvasChange, addSectionTo } = await import(
  `file://${tmp.split(path.sep).join("/")}`
)

let pass = 0
const fails = []
function check(label, cond) {
  if (cond) {
    pass++
    console.log(`  ok  ${label}`)
  } else {
    fails.push(label)
    console.log(`  FAIL ${label}`)
  }
}

const sec = (id) => ({ id, kind: "about", enabled: true, title: id, subtitle: "", data: {} })

/** Documento de teste: home com 2 seções, duas sub-páginas com 1 cada. */
function doc() {
  return {
    siteName: "Padaria",
    tagline: "pão quente",
    theme: { primary: "#111111" },
    textStyles: { "sec:h1": { fontSize: 40 } },
    sections: [sec("h1"), sec("h2")],
    pages: [
      { id: "p1", slug: "aguai", title: "Aguaí", subtitle: "", enabled: true, sections: [sec("a1")] },
      { id: "p2", slug: "mogi", title: "Mogi", subtitle: "", enabled: true, sections: [sec("m1")] },
    ],
  }
}
const ids = (arr) => arr.map((s) => s.id).join(",")

// ─── findActivePage ─────────────────────────────────────────────────────────
console.log("\nfindActivePage")
check("null = home", findActivePage(doc().pages, null) === null)
check("acha pelo id", findActivePage(doc().pages, "p2")?.slug === "mogi")
check("id que nao existe cai na home", findActivePage(doc().pages, "fantasma") === null)

// ─── canvasConfigFor ────────────────────────────────────────────────────────
console.log("\ncanvasConfigFor")
{
  const d = doc()
  const home = canvasConfigFor(d, null)
  check("home: o documento inteiro", ids(home.sections) === "h1,h2")

  const page = canvasConfigFor(d, d.pages[0])
  check("sub-pagina: sections sao as DELA", ids(page.sections) === "a1")
  check("sub-pagina: o tema continua do SITE", page.theme.primary === "#111111")
  check("sub-pagina: textStyles continua do SITE", !!page.textStyles["sec:h1"])
  check("sub-pagina: siteName continua do SITE", page.siteName === "Padaria")
  check("nao mutou o documento original", ids(d.sections) === "h1,h2")
}

// ─── writeCanvasChange — o invariante que importa ───────────────────────────
console.log("\nwriteCanvasChange")
{
  const d = doc()
  // O canvas devolve a home com uma seção a mais.
  const next = { ...canvasConfigFor(d, null), sections: [sec("h1"), sec("h2"), sec("h3")] }
  const out = writeCanvasChange(d, null, next)
  check("home: grava as seções na home", ids(out.sections) === "h1,h2,h3")
  check("home: as sub-paginas ficam intactas", ids(out.pages[0].sections) === "a1")
}
{
  const d = doc()
  // Editando a página "aguai": o canvas devolve a pilha DELA com uma seção nova.
  const next = { ...canvasConfigFor(d, d.pages[0]), sections: [sec("a1"), sec("a2")] }
  const out = writeCanvasChange(d, "p1", next)

  // ⚠️ O teste que justifica o arquivo: sem a tradução, a home viraria "a1,a2".
  check("sub-pagina: A HOME NAO MUDA", ids(out.sections) === "h1,h2")
  check("sub-pagina: as seções vão para a página certa", ids(out.pages[0].sections) === "a1,a2")
  check("sub-pagina: a outra página fica intacta", ids(out.pages[1].sections) === "m1")
  check("sub-pagina: metadados da página preservados", out.pages[0].slug === "aguai")
  check("sub-pagina: nº de páginas preservado", out.pages.length === 2)
}
{
  // O canvas também edita a CASCA (nome do site, cores) de dentro de qualquer
  // página: isso tem que subir, senão renomear o site na sub-página não salva.
  const d = doc()
  const next = {
    ...canvasConfigFor(d, d.pages[1]),
    siteName: "Padaria Nova",
    theme: { primary: "#ff0000" },
    sections: [sec("m1")],
  }
  const out = writeCanvasChange(d, "p2", next)
  check("sub-pagina: renomear o site sobe", out.siteName === "Padaria Nova")
  check("sub-pagina: trocar a cor sobe", out.theme.primary === "#ff0000")
  check("sub-pagina: a home segue intacta", ids(out.sections) === "h1,h2")
}
{
  // Página apagada (por outra aba) com uma edição em voo.
  const d = doc()
  const next = { ...canvasConfigFor(d, d.pages[0]), sections: [sec("a1"), sec("a9")] }
  const out = writeCanvasChange(d, "fantasma", next)
  check("pagina que sumiu: nao inventa pagina", (out.pages || []).length === 2)
  check("pagina que sumiu: nao descarta em silencio", out === next)
}

// ─── addSectionTo ───────────────────────────────────────────────────────────
console.log("\naddSectionTo")
{
  const d = doc()
  const out = addSectionTo(d, null, sec("novo"))
  check("home: empilha na home", ids(out.sections) === "h1,h2,novo")
  check("home: sub-paginas intactas", ids(out.pages[0].sections) === "a1")
}
{
  const d = doc()
  const out = addSectionTo(d, "p2", sec("novo"))
  check("sub-pagina: empilha NA PAGINA", ids(out.pages[1].sections) === "m1,novo")
  check("sub-pagina: a home NAO recebe a seção", ids(out.sections) === "h1,h2")
  check("sub-pagina: a outra pagina nao recebe", ids(out.pages[0].sections) === "a1")
}
{
  // Documento antigo, sem `pages` — o site de uma página só, que é o que está
  // publicado hoje. Nada pode mudar de forma para ele.
  const d = { siteName: "X", tagline: "", theme: {}, sections: [sec("h1")] }
  check("documento sem pages: findActivePage", findActivePage(d.pages || [], null) === null)
  check("documento sem pages: canvasConfigFor", canvasConfigFor(d, null) === d)
  const out = addSectionTo(d, null, sec("novo"))
  check("documento sem pages: addSectionTo", ids(out.sections) === "h1,novo")
  const next = { ...d, sections: [sec("h1"), sec("h2")] }
  check("documento sem pages: writeCanvasChange", writeCanvasChange(d, null, next) === next)
}

fs.rmSync(path.dirname(tmp), { recursive: true, force: true })

console.log(`\n${pass} passaram, ${fails.length} falharam`)
if (fails.length) {
  fails.forEach((f) => console.log(`  - ${f}`))
  process.exit(1)
}
