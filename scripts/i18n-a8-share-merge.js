// A8: Compartilhar do Meu Mundo (afiliado 10%) + linha "Meu Mundo" na Carteira (2026-11-08).
// Fill-if-absent nos namespaces MeuMundo e Wallet. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const TEXT = {
  "pt-BR": {
    MeuMundo: {
      shareMenu: "Compartilhar",
      shareMenuHint: "Convide e ganhe 10%",
      shareEyebrow: "Convide e ganhe",
      shareTitle: "Compartilhar o Meu Mundo",
      shareRule: "Quem entrar pelo seu link e gastar dinheiro de verdade no Meu Mundo rende {p} para você, na área de afiliados da Carteira.",
      shareRuleCounts: "Conta: Gold comprado dentro do jogo e, em breve, personagens e itens pagos em reais.",
      shareRuleNot: "Não conta: Esmeralda ganha jogando ou engajando.",
      shareRuleBond: "A primeira compra pelo seu link liga a pessoa a você; as próximas também rendem.",
      shareRuleTerms: "Compra estornada não rende. Prazo e saque seguem a regra do programa de afiliados.",
      shareLoading: "Gerando seu link…",
      shareError: "Não foi possível gerar seu link agora.",
      shareLinkLabel: "Seu link",
      shareCopy: "Copiar",
      shareCopied: "Copiado",
      shareSend: "Enviar link",
      shareClose: "Fechar",
      shareText: "Vem jogar o Meu Mundo comigo!",
      sharePaused: "O programa está pausado agora: o link funciona, mas as compras não rendem até ele voltar.",
    },
    Wallet: {
      mmTitle: "Meu Mundo",
      mmDesc: "Quem entra pelo seu link do botão Compartilhar do jogo e gasta dinheiro de verdade no Meu Mundo rende 10% para você. Esmeralda não conta; compra estornada é desfeita.",
      mmEmpty: "Nenhuma compra pelo seu link do Meu Mundo ainda.",
      mmCount: "Compras",
      mmEarned: "Comissão",
      mmRowSale: "Compra de {value}",
      mmStatusPENDING: "Pendente",
      mmStatusAPPROVED: "Aprovada",
      mmStatusPAID: "Paga",
      mmStatusREVERSED: "Estornada",
    },
  },
  en: {
    MeuMundo: {
      shareMenu: "Share",
      shareMenuHint: "Invite and earn 10%",
      shareEyebrow: "Invite and earn",
      shareTitle: "Share Meu Mundo",
      shareRule: "Anyone who joins through your link and spends real money in Meu Mundo earns you {p}, in the affiliate area of your Wallet.",
      shareRuleCounts: "Counts: Gold bought inside the game and, soon, characters and items paid in reais.",
      shareRuleNot: "Doesn't count: Emerald earned by playing or engaging.",
      shareRuleBond: "The first purchase through your link ties that person to you; their next purchases earn too.",
      shareRuleTerms: "Refunded purchases don't earn. Timing and payouts follow the affiliate program rules.",
      shareLoading: "Creating your link…",
      shareError: "Couldn't create your link right now.",
      shareLinkLabel: "Your link",
      shareCopy: "Copy",
      shareCopied: "Copied",
      shareSend: "Send link",
      shareClose: "Close",
      shareText: "Come play Meu Mundo with me!",
      sharePaused: "The program is paused right now: the link works, but purchases won't earn until it's back.",
    },
    Wallet: {
      mmTitle: "Meu Mundo",
      mmDesc: "Anyone who joins through your link from the game's Share button and spends real money in Meu Mundo earns you 10%. Emerald doesn't count; refunded purchases are undone.",
      mmEmpty: "No purchases through your Meu Mundo link yet.",
      mmCount: "Purchases",
      mmEarned: "Commission",
      mmRowSale: "Purchase of {value}",
      mmStatusPENDING: "Pending",
      mmStatusAPPROVED: "Approved",
      mmStatusPAID: "Paid",
      mmStatusREVERSED: "Refunded",
    },
  },
  es: {
    MeuMundo: {
      shareMenu: "Compartir",
      shareMenuHint: "Invita y gana 10%",
      shareEyebrow: "Invita y gana",
      shareTitle: "Compartir Meu Mundo",
      shareRule: "Quien entre por tu enlace y gaste dinero real en Meu Mundo te genera {p}, en el área de afiliados de tu Billetera.",
      shareRuleCounts: "Cuenta: Gold comprado dentro del juego y, pronto, personajes e ítems pagados en reales.",
      shareRuleNot: "No cuenta: Esmeralda ganada jugando o interactuando.",
      shareRuleBond: "La primera compra por tu enlace vincula a esa persona contigo; sus próximas compras también generan.",
      shareRuleTerms: "Las compras reembolsadas no generan. Plazos y retiros siguen las reglas del programa de afiliados.",
      shareLoading: "Generando tu enlace…",
      shareError: "No fue posible generar tu enlace ahora.",
      shareLinkLabel: "Tu enlace",
      shareCopy: "Copiar",
      shareCopied: "Copiado",
      shareSend: "Enviar enlace",
      shareClose: "Cerrar",
      shareText: "¡Ven a jugar Meu Mundo conmigo!",
      sharePaused: "El programa está en pausa ahora: el enlace funciona, pero las compras no generan hasta que vuelva.",
    },
    Wallet: {
      mmTitle: "Meu Mundo",
      mmDesc: "Quien entra por tu enlace del botón Compartir del juego y gasta dinero real en Meu Mundo te genera 10%. La Esmeralda no cuenta; las compras reembolsadas se deshacen.",
      mmEmpty: "Todavía no hay compras por tu enlace de Meu Mundo.",
      mmCount: "Compras",
      mmEarned: "Comisión",
      mmRowSale: "Compra de {value}",
      mmStatusPENDING: "Pendiente",
      mmStatusAPPROVED: "Aprobada",
      mmStatusPAID: "Pagada",
      mmStatusREVERSED: "Reembolsada",
    },
  },
}

for (const [loc, spaces] of Object.entries(TEXT)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  let n = 0
  for (const [ns, keys] of Object.entries(spaces)) {
    dict[ns] = dict[ns] || {}
    for (const [k, v] of Object.entries(keys)) {
      if (dict[ns][k] === undefined) {
        dict[ns][k] = v
        n++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
