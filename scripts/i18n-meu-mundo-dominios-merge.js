// Meu Mundo 3D — lore v2 D1: os Domínios (portal na praça, a travessia, a cena e a luta do setor).
// Namespace "MeuMundo". Idempotente: preenche o que falta; OVERRIDE troca valor que mudou.
// Rodar: node scripts/i18n-meu-mundo-dominios-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const KEYS = {
  centerDomains: ["Portal dos Domínios", "Domains Portal", "Portal de los Dominios"],
  // os seis, na ordem da travessia
  domName_floresta: ["Floresta da Lua", "Moon Forest", "Bosque de la Luna"],
  domName_canion: ["Cânion das Tempestades", "Storm Canyon", "Cañón de las Tormentas"],
  domName_gelo: ["Mar de Gelo", "Ice Sea", "Mar de Hielo"],
  domName_fabrica: ["Fábrica de Bronze", "Bronze Factory", "Fábrica de Bronce"],
  domName_vulcao: ["Vulcão de Kragor", "Kragor's Volcano", "Volcán de Kragor"],
  domName_orbital: ["Cidade Orbital", "Orbital City", "Ciudad Orbital"],
  domGod_noctis: ["Noctis", "Noctis", "Noctis"],
  domGod_zephyra: ["Zéphyra", "Zéphyra", "Zéphyra"],
  domGod_maru: ["Marú", "Marú", "Marú"],
  domGod_aeryn: ["Aeryn", "Aeryn", "Aeryn"],
  domGod_kragor: ["Kragor", "Kragor", "Kragor"],
  domGod_iris: ["Íris", "Íris", "Iris"],
  // a tela do portal
  domPortalEyebrow: ["A travessia", "The crossing", "La travesía"],
  domPortalHow: [
    "Os seis Domínios são uma travessia. Vencer o setor 10 abre a passagem para o próximo; quem já atravessou volta direto ao começo de qualquer um.",
    "The six Domains are one crossing. Beating sector 10 opens the way to the next; once you've crossed, you can go straight back to the start of any of them.",
    "Los seis Dominios son una travesía. Vencer el sector 10 abre el paso al siguiente; quien ya cruzó vuelve directo al inicio de cualquiera.",
  ],
  domGodOf: ["Domínio de {god}", "Domain of {god}", "Dominio de {god}"],
  domTrainer: ["Treinador nv. {n}", "Trainer lv. {n}", "Entrenador nv. {n}"],
  domYourPower: ["Seu Poder: {n}", "Your Power: {n}", "Tu Poder: {n}"],
  domRecommended: ["Poder recomendado {a} → {b}", "Recommended Power {a} → {b}", "Poder recomendado {a} → {b}"],
  domProgress: ["Setor {n} de 10 vencido", "Sector {n} of 10 beaten", "Sector {n} de 10 vencido"],
  domFresh: ["Nenhum setor vencido", "No sector beaten yet", "Ningún sector vencido"],
  domCrossed: ["Atravessado", "Crossed", "Cruzado"],
  domLockTrainer: ["Abre no nível {n} do treinador", "Opens at trainer level {n}", "Se abre en el nivel {n} del entrenador"],
  domLockCrossing: ["Atravesse antes: {name}", "Cross first: {name}", "Cruza antes: {name}"],
  domEnter: ["Entrar", "Enter", "Entrar"],
  domEnterAgain: ["Voltar ao começo", "Back to the start", "Volver al inicio"],
  domEntering: ["Entrando…", "Entering…", "Entrando…"],
  domAdmin: ["Admin: passa direto", "Admin: goes straight in", "Admin: pasa directo"],
  // dentro do Domínio
  domEntrance: ["Entrada", "Entrance", "Entrada"],
  domPassage: ["Passagem", "Passage", "Paso"],
  domSectorTag: ["Setor {n}", "Sector {n}", "Sector {n}"],
  domFight: ["Lutar · {mob}", "Fight · {mob}", "Pelear · {mob}"],
  domGuardInfo: ["Setor {n} · Nv. {lv} · Poder recomendado {p}", "Sector {n} · Lv. {lv} · Recommended Power {p}", "Sector {n} · Nv. {lv} · Poder recomendado {p}"],
  domFarm: ["Setor vencido: lute de novo para treinar", "Sector beaten: fight again to train", "Sector vencido: pelea otra vez para entrenar"],
  domGateClosed: ["O portão abre quando o guardião do setor cair", "The gate opens when the sector's guardian falls", "La puerta se abre cuando caiga el guardián del sector"],
  domExit: ["Voltar à praça", "Back to the square", "Volver a la plaza"],
  domCross: ["Atravessar para {name}", "Cross into {name}", "Cruzar hacia {name}"],
  domCrossLocked: ["{name} abre no nível {n} do treinador", "{name} opens at trainer level {n}", "{name} se abre en el nivel {n} del entrenador"],
  domLoading: ["Entrando: {name}…", "Entering: {name}…", "Entrando: {name}…"],
  domErrorTitle: ["O Domínio não abriu", "The Domain didn't open", "El Dominio no se abrió"],
  domWon: ["Setor {n} vencido! O portão abriu.", "Sector {n} beaten! The gate is open.", "¡Sector {n} vencido! La puerta se abrió."],
  domCrossedNow: ["Você atravessou {name}! A passagem abriu.", "You crossed {name}! The passage is open.", "¡Cruzaste {name}! El paso se abrió."],
  domFightFail: ["A luta não abriu: {e}", "The fight didn't start: {e}", "La pelea no empezó: {e}"],
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
