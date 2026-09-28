// Monetização de 2026-09-28: taxa da Freelandoo no delivery (mig 267), selo
// verificado (mig 268) e relatório de mercado local. Idempotente, fill-if-absent.
//   node scripts/i18n-monetization-0928-merge.js
const fs = require("fs")
const path = require("path")
const dir = path.join(__dirname, "..", "messages")

const NS = {
  Verified: {
    badgeLabel: ["Perfil verificado", "Verified profile", "Perfil verificado"],
    title: ["Selo verificado", "Verified badge", "Sello verificado"],
    intro: [
      "Um selo que brilha ao lado do seu nome no perfil, no feed e na vitrine — para quem chega saber que tem gente de verdade por trás da conta.",
      "A badge that glows next to your name on your profile, in the feed and in search — so visitors know there's a real person behind the account.",
      "Un sello que brilla junto a tu nombre en el perfil, en el feed y en la búsqueda — para que quien llegue sepa que hay una persona real detrás de la cuenta.",
    ],
    loadError: ["Não foi possível carregar.", "Could not load.", "No se pudo cargar."],
    processing: [
      "Pagamento recebido — o selo aparece assim que ele for confirmado.",
      "Payment received — the badge shows up as soon as it's confirmed.",
      "Pago recibido — el sello aparece en cuanto se confirme.",
    ],
    payError: ["Não foi possível iniciar o pagamento.", "Could not start the payment.", "No se pudo iniciar el pago."],
    cancelConfirm: [
      "Cancelar a renovação? O selo continua até o fim do período pago.",
      "Cancel the renewal? The badge stays until the end of the paid period.",
      "¿Cancelar la renovación? El sello sigue hasta el final del período pagado.",
    ],
    canceled: ["Renovação cancelada.", "Renewal canceled.", "Renovación cancelada."],
    cancelError: ["Não foi possível cancelar.", "Could not cancel.", "No se pudo cancelar."],
    confirming: ["Confirmando o pagamento…", "Confirming the payment…", "Confirmando el pago…"],
    loading: ["Carregando…", "Loading…", "Cargando…"],
    activeTitle: ["Seu selo está ativo", "Your badge is active", "Tu sello está activo"],
    byAdmin: [
      "Você administra a Freelandoo, então o selo já vem com a conta — sem cobrança.",
      "You administer Freelandoo, so the badge comes with the account — no charge.",
      "Administras Freelandoo, así que el sello viene con la cuenta — sin cargo.",
    ],
    renewsOn: ["Renova sozinho em {date}.", "Renews automatically on {date}.", "Se renueva solo el {date}."],
    activeUntil: ["Ativo até {date}.", "Active until {date}.", "Activo hasta el {date}."],
    pastDue: [
      "A última cobrança não passou. O selo fica até a data acima; confira o cartão.",
      "The last charge didn't go through. The badge stays until the date above; check your card.",
      "El último cobro no pasó. El sello sigue hasta la fecha de arriba; revisa tu tarjeta.",
    ],
    cancel: ["Cancelar renovação", "Cancel renewal", "Cancelar renovación"],
    renewCard: ["Renovar no cartão todo mês", "Renew monthly on card", "Renovar cada mes con tarjeta"],
    notForSale: [
      "O selo verificado não está à venda agora.",
      "The verified badge isn't for sale right now.",
      "El sello verificado no está a la venta ahora.",
    ],
    perMonth: ["/mês", "/month", "/mes"],
    perk1: ["O selo aparece em todos os seus perfis.", "The badge shows on all your profiles.", "El sello aparece en todos tus perfiles."],
    perk2: ["No perfil, no feed e na vitrine de busca.", "On your profile, in the feed and in search.", "En el perfil, en el feed y en la búsqueda."],
    perk3: [
      "Cancele quando quiser — o selo fica até o fim do mês pago.",
      "Cancel anytime — the badge stays until the end of the paid month.",
      "Cancela cuando quieras — el sello sigue hasta el final del mes pagado.",
    ],
    payCard: ["Assinar no cartão", "Subscribe with card", "Suscribirse con tarjeta"],
    payCardHint: [
      "Renova sozinho todo mês. Dá para cancelar quando quiser.",
      "Renews automatically every month. Cancel anytime.",
      "Se renueva solo cada mes. Puedes cancelar cuando quieras.",
    ],
    payPix: ["Pagar um mês no Pix", "Pay one month with Pix", "Pagar un mes con Pix"],
  },
  MarketReport: {
    title: ["Mercado local", "Local market", "Mercado local"],
    intro: [
      "Quanto se cobra na sua cidade, na sua região e na sua comunidade — a partir dos preços que profissionais e vizinhos cadastraram na Freelandoo.",
      "What people charge in your city, region and community — based on the prices professionals and neighbors listed on Freelandoo.",
      "Cuánto se cobra en tu ciudad, tu región y tu comunidad — según los precios que profesionales y vecinos publicaron en Freelandoo.",
    ],
    loadError: ["Não foi possível montar o relatório.", "Could not build the report.", "No se pudo armar el informe."],
    scopeCommunity: ["Comunidade", "Community", "Comunidad"],
    scopeRegion: ["Região", "Region", "Región"],
    scopeCountry: ["Brasil", "Brazil", "Brasil"],
    kindService: ["Serviços", "Services", "Servicios"],
    kindProduct: ["Produtos", "Products", "Productos"],
    kindListing: ["Vitrine dos vizinhos", "Neighbors' showcase", "Vitrina de los vecinos"],
    enxame: ["Enxame", "Swarm", "Enjambre"],
    anyEnxame: ["Todos", "All", "Todos"],
    profession: ["Profissão", "Profession", "Profesión"],
    anyProfession: ["Todas", "All", "Todas"],
    productCategory: ["Categoria", "Category", "Categoría"],
    anyProductCategory: ["Todas", "All", "Todas"],
    listingKind: ["Anúncios de", "Listings of", "Anuncios de"],
    filterName: ["Nome (ex.: corte)", "Name (e.g. haircut)", "Nombre (ej.: corte)"],
    filterNamePlaceholder: ["Opcional", "Optional", "Opcional"],
    community: ["Minha comunidade", "My community", "Mi comunidad"],
    noCommunity: ["Não — usar o lugar", "No — use the place", "No — usar el lugar"],
    state: ["Estado", "State", "Estado"],
    anyState: ["Brasil inteiro", "All of Brazil", "Todo Brasil"],
    city: ["Cidade", "City", "Ciudad"],
    run: ["Ver o mercado", "See the market", "Ver el mercado"],
    sampleLine: ["{n} preços de {p} vendedores", "{n} prices from {p} sellers", "{n} precios de {p} vendedores"],
    empty: [
      "Ainda não há preços cadastrados para esse recorte. Tente alargar: tire a cidade, ou escolha o estado inteiro.",
      "No prices listed for this selection yet. Try widening it: remove the city, or pick the whole state.",
      "Aún no hay precios para este recorte. Prueba ampliarlo: quita la ciudad o elige el estado entero.",
    ],
    median: ["Preço mais comum (mediana)", "Most common price (median)", "Precio más común (mediana)"],
    middleRange: ["Metade cobra entre {a} e {b}", "Half charge between {a} and {b}", "La mitad cobra entre {a} y {b}"],
    min: ["Menor", "Lowest", "Menor"],
    avg: ["Média", "Average", "Promedio"],
    max: ["Maior", "Highest", "Mayor"],
    lowSample: [
      "Poucos preços neste recorte — o número pode ser o de uma pessoa só. Alargue o recorte para comparar.",
      "Few prices in this selection — the number may reflect a single person. Widen it to compare.",
      "Pocos precios en este recorte — el número puede ser de una sola persona. Amplía el recorte para comparar.",
    ],
    compareTitle: ["Comparado com o entorno", "Compared with the surroundings", "Comparado con el entorno"],
    pricesCount: ["{n} preços", "{n} prices", "{n} precios"],
    distributionTitle: ["Como os preços se espalham", "How prices are spread", "Cómo se distribuyen los precios"],
    distributionAria: ["Distribuição dos preços em faixas", "Price distribution in ranges", "Distribución de precios por rangos"],
    itemsTitle: ["Por item", "By item", "Por ítem"],
    colItem: ["Item", "Item", "Ítem"],
    colMedian: ["Mediana", "Median", "Mediana"],
    colRange: ["Faixa", "Range", "Rango"],
    colCount: ["Preços", "Prices", "Precios"],
    footnote: [
      "Contam só preços fechados e ativos: serviço sob orçamento, preço zero e anúncio fora do ar ficam de fora.",
      "Only fixed, active prices count: quote-only services, zero prices and inactive listings are left out.",
      "Solo cuentan precios cerrados y activos: servicios a presupuesto, precio cero y anuncios fuera de línea quedan fuera.",
    ],
  },
  Account: {
    marketTool: ["Mercado local", "Local market", "Mercado local"],
    marketToolAria: [
      "Mercado local: quanto se cobra na sua região",
      "Local market: what people charge in your region",
      "Mercado local: cuánto se cobra en tu región",
    ],
    verifiedTool: ["Selo verificado", "Verified badge", "Sello verificado"],
    verifiedToolAria: [
      "Selo verificado: assine por R$9,90 por mês",
      "Verified badge: subscribe for R$9.90 a month",
      "Sello verificado: suscríbete por R$9,90 al mes",
    ],
  },
  Community: {
    delPlatformFee: ["· {v} ficam com a Freelandoo", "· {v} goes to Freelandoo", "· {v} queda para Freelandoo"],
    listBillToPlatform: [
      "A mensalidade é paga à Freelandoo, não ao líder da comunidade.",
      "The monthly fee is paid to Freelandoo, not to the community leader.",
      "La mensualidad se paga a Freelandoo, no al líder de la comunidad.",
    ],
  },
}

function load(f) { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }
function save(f, o) { fs.writeFileSync(path.join(dir, f), JSON.stringify(o, null, 2) + "\n", "utf8") }
for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, keys] of Object.entries(NS)) {
    if (!d[ns]) d[ns] = {}
    for (const [k, vals] of Object.entries(keys)) if (!(k in d[ns])) { d[ns][k] = vals[idx]; added++ }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
