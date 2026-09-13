// scripts/i18n-dns-records-merge.js
// O painel de Endereço passa a PUXAR os registros de DNS do provedor.
//
// Duas metades:
//
//   MERGE (fill-if-absent) — as chaves da lista nova de registros: o que cada
//   um serve (provar posse × colocar no ar × o www), a chamada acima deles e
//   a legenda do nome completo.
//
//   OVERRIDE — dois textos que passaram a MENTIR quando a tela deixou de
//   mostrar um registro só. Dicionário vence fallback inline, então trocar a
//   frase no componente não mudaria uma palavra na tela:
//
//     • domainPendingHint — dizia "Crie o registro TXT abaixo", no singular.
//                           Agora são de dois a quatro registros, e quem lesse
//                           a frase antiga criaria só o TXT, verificaria com
//                           sucesso e ficaria esperando um site que nunca
//                           responde — porque o que coloca no ar é o outro.
//     • domainVerifiedHint — prometia que só faltava o certificado e que era
//                            questão de minutos. Não é: sem o A/CNAME apontado
//                            o domínio fica em "Verificado" para sempre, e a
//                            frase antiga faz a pessoa esperar em vez de agir.
//
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  CommunitySite: {
    dnsRecordsIntro: [
      "Crie estes registros no painel do seu domínio e clique em Verificar.",
      "Create these records in your domain panel and click Verify.",
      "Crea estos registros en el panel de tu dominio y haz clic en Verificar.",
    ],
    dnsPurposeVerify: [
      "Confirma que o domínio é seu",
      "Confirms the domain is yours",
      "Confirma que el dominio es tuyo",
    ],
    dnsPurposeRoute: [
      "É este que coloca o site no ar",
      "This is the one that puts the site online",
      "Este es el que pone el sitio en línea",
    ],
    dnsPurposeOptional: [
      "Opcional — faz o endereço com www funcionar também",
      "Optional — makes the www address work too",
      "Opcional — hace que la dirección con www también funcione",
    ],
    dnsFullHost: ["Nome completo:", "Full name:", "Nombre completo:"],
  },
}

/** ns → chave → [pt, en, es] — SOBRESCREVE o que já está lá. */
const OVERRIDE = {
  CommunitySite: {
    domainPendingHint: [
      "Falta criar os registros abaixo no painel do seu domínio.",
      "The records below still need to be created in your domain panel.",
      "Falta crear los registros de abajo en el panel de tu dominio.",
    ],
    domainVerifiedHint: [
      "Posse confirmada. Agora falta o domínio apontar para cá — confira os registros abaixo.",
      "Ownership confirmed. Now the domain still needs to point here — check the records below.",
      "Propiedad confirmada. Ahora falta que el dominio apunte aquí — revisa los registros de abajo.",
    ],
  },
}

let added = 0
let replaced = 0

LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))

  for (const [ns, keys] of Object.entries(MERGE)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i]
        added++
      }
    }
  }

  for (const [ns, keys] of Object.entries(OVERRIDE)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i]
        replaced++
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8")
})

console.log(`i18n-dns-records-merge: ${added} chaves adicionadas, ${replaced} sobrescritas`)
