// Meu Mundo 3D — admin escolhe o Domínio e a parte no portão (24/11, pedido do Alex).
// Namespace "MeuMundo". Idempotente: preenche o que falta; OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-mm-dominio-admin-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  domAdminJump: ["Admin · entrar direto em {name}", "Admin · jump straight into {name}", "Admin · entrar directo en {name}"],
  domAdminPart: ["Parte {n}", "Part {n}", "Parte {n}"],
  domAdminSectors: ["Setores {a}–{b}", "Sectors {a}–{b}", "Sectores {a}–{b}"],
  domAdminEnterSector: ["Entrar no setor {n}", "Enter at sector {n}", "Entrar en el sector {n}"],
  domAdminSectorNote: [
    "Admin: nasce na parte {p}, na frente do setor {n}.",
    "Admin: you spawn in part {p}, in front of sector {n}.",
    "Admin: apareces en la parte {p}, frente al sector {n}.",
  ],
}

// valores que mudaram depois de publicados (vazio por enquanto)
const OVERRIDE = {}

const LOCALES = ["pt-BR", "en", "es"]
LOCALES.forEach((loc, i) => {
  const file = path.join(dir, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const ns = (dict.MeuMundo = dict.MeuMundo || {})
  let added = 0
  let changed = 0
  for (const [k, v] of Object.entries(KEYS)) {
    if (!(k in ns)) {
      ns[k] = v[i]
      added++
    }
  }
  for (const [k, v] of Object.entries(OVERRIDE)) {
    if (ns[k] !== v[i]) {
      ns[k] = v[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(`${loc}: +${added} ~${changed}`)
})
