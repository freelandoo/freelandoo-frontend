// i18n — caça-string pt-hardcoded (Onda 6, métrica de cobertura).
// Heurística: varre .tsx de app/ e components/ procurando texto VISÍVEL em pt
// (nós de texto JSX + atributos placeholder/title/aria-label/alt) que NÃO está
// dentro de um t(...)/tr(...). É aproximado — serve como métrica e radar de
// restos, não como prova. Exclui admin (dark utilitário de propósito), páginas
// legais (revisão jurídica → pt fixo), messages/ e scripts/.
//
// Uso:
//   node scripts/i18n-coverage.js            # resumo + top 30 arquivos
//   node scripts/i18n-coverage.js --all      # lista todos os arquivos
//   node scripts/i18n-coverage.js <path>     # detalhe (linhas) de um arquivo
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const SCAN_DIRS = ["app", "components"]

// Diretórios/arquivos fora de escopo de tradução.
const EXCLUDE_RE = [
  /[\\/]administracao[\\/]/i,
  /[\\/]admin[\\/]/i,
  /[\\/]node_modules[\\/]/,
  /[\\/]messages[\\/]/,
  // Páginas legais (ficam pt-BR de propósito).
  /app[\\/]\(with-footer\)[\\/](terms|privacy-policy|cookies-policy|subscription-terms|affiliate-terms|return-policy|polens-terms|marketplace-terms)[\\/]/i,
]

// Caracteres tipicamente pt (acentos/cedilha) — sinal forte de texto humano pt.
const PT_CHARS = /[ãõçáéíóúâêôàÀ-ÿ]/
// Stopwords pt comuns (pega texto sem acento). Palavra inteira.
const PT_WORDS = /\b(não|nao|você|voce|para|com|sem|seu|sua|você|carregar|buscar|salvar|enviar|cancelar|comprar|vender|perfil|conta|aplicar|remover|fechar|voltar|entrar|sair|pesquisar|nenhum|nenhuma|aguarde|carregando|pagamento|saldo|gratis|grátis)\b/i

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (EXCLUDE_RE.some((re) => re.test(full))) continue
    if (e.isDirectory()) walk(full, acc)
    else if (e.name.endsWith(".tsx")) acc.push(full)
  }
  return acc
}

// Tira ocorrências dentro de t("...")/tr("...") pra não contar fallback já traduzido.
function stripTranslated(line) {
  return line.replace(/\b(?:t|tr)\(\s*"[^"]*"\s*(?:,\s*"[^"]*"\s*)?\)/g, " ")
}

function looksPt(s) {
  const txt = s.trim()
  if (txt.length < 3) return false
  if (!/[a-zA-ZÀ-ÿ]/.test(txt)) return false
  return PT_CHARS.test(txt) || PT_WORDS.test(txt)
}

// Acha candidatos numa linha: texto JSX entre > < e atributos de UI.
function findCandidates(rawLine) {
  const line = stripTranslated(rawLine)
  const hits = []

  // Atributos de UI com string literal: placeholder/title/aria-label/alt="..."
  const attrRe = /\b(placeholder|title|aria-label|alt)\s*=\s*"([^"]+)"/g
  let m
  while ((m = attrRe.exec(line))) {
    if (looksPt(m[2])) hits.push(`${m[1]}="${m[2]}"`)
  }

  // Texto JSX simples: >Texto< (sem tags/expressões no meio).
  const textRe = />\s*([^<>{}\n][^<>{}\n]*?)\s*</g
  while ((m = textRe.exec(line))) {
    const txt = m[1]
    if (/^[\s\d\W]*$/.test(txt)) continue
    if (looksPt(txt)) hits.push(txt.trim())
  }

  return hits
}

const files = SCAN_DIRS.flatMap((d) => {
  const dir = path.join(ROOT, d)
  return fs.existsSync(dir) ? walk(dir, []) : []
})

const arg = process.argv[2]

// Modo detalhe: node scripts/i18n-coverage.js <path>
if (arg && !arg.startsWith("--")) {
  const target = path.resolve(ROOT, arg)
  const lines = fs.readFileSync(target, "utf8").split("\n")
  let n = 0
  lines.forEach((ln, i) => {
    const hits = findCandidates(ln)
    if (hits.length) {
      n += hits.length
      console.log(`  ${String(i + 1).padStart(4)}: ${hits.join(" | ")}`)
    }
  })
  console.log(`\n${arg}: ${n} candidato(s) pt hardcoded`)
  process.exit(0)
}

const perFile = []
let total = 0
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split("\n")
  let count = 0
  for (const ln of lines) count += findCandidates(ln).length
  if (count > 0) perFile.push([path.relative(ROOT, f), count])
  total += count
}
perFile.sort((a, b) => b[1] - a[1])

const filesWithHits = perFile.length
const scanned = files.length
console.log(`\ni18n coverage (heurístico) — Onda 6`)
console.log(`Arquivos .tsx varridos (fora admin/legal): ${scanned}`)
console.log(`Arquivos com texto pt suspeito: ${filesWithHits}`)
console.log(`Total de candidatos pt hardcoded: ${total}`)
console.log(`Cobertura aproximada (arquivos limpos): ${(((scanned - filesWithHits) / scanned) * 100).toFixed(1)}%\n`)

const show = arg === "--all" ? perFile : perFile.slice(0, 30)
console.log(`Top ${show.length} arquivos a revisar:`)
for (const [f, c] of show) console.log(`  ${String(c).padStart(4)}  ${f}`)
if (arg !== "--all" && perFile.length > 30) {
  console.log(`  ... +${perFile.length - 30} (use --all). Detalhe: node scripts/i18n-coverage.js <path>`)
}
