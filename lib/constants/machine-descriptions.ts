// Descrições resumidas das máquinas — usadas em selects/tooltips no cadastro.
// Indexadas por slug do tb_machine.
export const MACHINE_DESCRIPTIONS: Record<string, string> = {
  "views":
    "Para quem cria, edita ou impulsiona conteúdo em vídeos, cortes, thumbnails, YouTube, TikTok e Reels.",
  "divulgacao":
    "Para influenciadores, creators, afiliados e profissionais que divulgam marcas, produtos e campanhas.",
  "limpeza":
    "Para serviços de limpeza residencial, comercial, pós-obra, organização e cuidados com ambientes.",
  "construcao":
    "Para profissionais de obra, reformas, elétrica, pintura, hidráulica, marcenaria e instalação.",
  "negocios":
    "Para serviços que ajudam empresas a vender, operar, atender, criar presença digital e crescer.",
  "oportunidades":
    "Para profissionais gerais, multitarefas, suporte, atendimento, captação, promoção e serviços locais.",
  "saude-beleza":
    "Para estética, beleza, massagem, cabelo, unhas, sobrancelhas, terapias corporais e bem-estar.",
  "saude-pet":
    "Para banho, tosa, pet sitter, dog walker, adestramento, cuidados, transporte e serviços veterinários.",
}

export function machineDescription(slug?: string | null): string {
  if (!slug) return ""
  return MACHINE_DESCRIPTIONS[slug] || ""
}
