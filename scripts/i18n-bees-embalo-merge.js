// Bees pelo embalo + cor do patamar de alcance (2026-11-08).
// Namespaces Post (anel) e Bees/Profile (textos da vida do bee). OVERRIDE nos textos
// que falavam do teto de 7 dias; chaves novas entram também. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": {
    Post: {
      reachTierArea: "Alcance: a área",
      reachTierRegion: "Alcance: a região",
      reachTierState: "Alcance: o estado",
      reachTierViral: "Viral: chegou ao Brasil todo",
    },
    Bees: {
      emptyTimelineDescription: "Bees são os stories da Freelandoo. Quando alguém publicar, eles aparecem aqui — e ficam no ar enquanto continuam ganhando engajamento.",
      loginDescription: "Os bees são os stories da Freelandoo — vídeos que ficam no ar enquanto ganham engajamento (sem nenhum, somem em 24 h).",
    },
    "*noSavedBees": "Bees salvos somem quando expiram — um bee fica no ar enquanto continua ganhando engajamento.",
  },
  en: {
    Post: {
      reachTierArea: "Reach: the area",
      reachTierRegion: "Reach: the region",
      reachTierState: "Reach: the state",
      reachTierViral: "Viral: reached all of Brazil",
    },
    Bees: {
      emptyTimelineDescription: "Bees are Freelandoo's stories. When someone posts, they show up here — and stay up as long as they keep getting engagement.",
      loginDescription: "Bees are Freelandoo's stories — videos that stay up while they get engagement (with none, they're gone in 24 h).",
    },
    "*noSavedBees": "Saved bees disappear when they expire — a bee stays up as long as it keeps getting engagement.",
  },
  es: {
    Post: {
      reachTierArea: "Alcance: el área",
      reachTierRegion: "Alcance: la región",
      reachTierState: "Alcance: el estado",
      reachTierViral: "Viral: llegó a todo Brasil",
    },
    Bees: {
      emptyTimelineDescription: "Los bees son los stories de Freelandoo. Cuando alguien publique, aparecen aquí — y quedan mientras sigan ganando engagement.",
      loginDescription: "Los bees son los stories de Freelandoo — videos que quedan mientras ganan engagement (sin nada, desaparecen en 24 h).",
    },
    "*noSavedBees": "Los bees guardados desaparecen al expirar — un bee queda mientras siga ganando engagement.",
  },
}
for (const [loc, groups] of Object.entries(TEXT)) {
  const file = path.join(DIR, loc + ".json")
  const raw = fs.readFileSync(file, "utf8")
  const json = JSON.parse(raw)
  let n = 0
  for (const [ns, add] of Object.entries(groups)) {
    if (ns.startsWith("*")) {
      // chave que mora em algum namespace (achar onde está e trocar)
      const key = ns.slice(1)
      for (const v of Object.values(json)) if (v && typeof v === "object" && key in v && v[key] !== add) { v[key] = add; n++ }
      continue
    }
    const o = (json[ns] = json[ns] || {})
    for (const [k, v] of Object.entries(add)) if (o[k] !== v) { o[k] = v; n++ }
  }
  const crlf = raw.includes("\r\n")
  let out = JSON.stringify(json, null, 2) + "\n"
  if (crlf) out = out.replace(/\n/g, "\r\n")
  fs.writeFileSync(file, out)
  console.log(loc, "~" + n)
}
