// scripts/i18n-site-services-merge.js
//
// Chaves da vitrine de serviços do site da comunidade, depois que ela passou a
// ler o cadastro real em vez de texto livre (2026-09-04).
//
// Fill-if-absent, como todo merge deste projeto: rodar duas vezes não muda
// nada, e nenhuma tradução existente é sobrescrita.
//
// Ficam ÓRFÃS de propósito (padrão da casa — não apagar, não reaproveitar):
// serviceTitle, serviceDescription, servicePrice, serviceDuration,
// serviceCtaText, serviceCtaUrl, serviceAdd e serviceRemove. Elas nomeavam os
// campos que o líder digitava quando o card era texto livre; agora o conteúdo
// vem do cadastro e não há o que digitar.

const fs = require("fs")
const path = require("path")

const COMMUNITY_SITE = {
  // ⚠️ serviceColumns era USADA pelo canvas e nunca esteve em dicionário
  // nenhum — en/es mostravam o fallback em português em silêncio. Entra aqui
  // pela regra do escoteiro, junto das chaves novas.
  serviceColumns: ["Colunas", "Columns", "Columnas"],

  serviceCta: ["Quero este", "I want this", "Lo quiero"],
  serviceEmptyHint: [
    "Esta vitrine mostra os serviços do seu perfil. Cadastre em Meu perfil → Serviços e eles aparecem aqui.",
    "This showcase lists the services on your profile. Add them under My profile → Services and they show up here.",
    "Esta vitrina muestra los servicios de tu perfil. Agrégalos en Mi perfil → Servicios y aparecerán aquí.",
  ],
  // Sufixos de duração: "1h30", "45min". Separados do número porque a abreviação
  // muda de idioma e a conta (90 → 1h30) é feita em JS.
  serviceHourSuffix: ["h", "h", "h"],
  serviceMinSuffix: ["min", "min", "min"],
}

const LOCALES = ["pt-BR", "en", "es"]

let added = 0
LOCALES.forEach((locale, index) => {
  const file = path.join(__dirname, "..", "messages", `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.CommunitySite = dict.CommunitySite || {}

  for (const [key, values] of Object.entries(COMMUNITY_SITE)) {
    if (dict.CommunitySite[key] === undefined) {
      dict.CommunitySite[key] = values[index]
      added += 1
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8")
})

console.log(`i18n-site-services-merge: ${added} chave(s) adicionada(s).`)
