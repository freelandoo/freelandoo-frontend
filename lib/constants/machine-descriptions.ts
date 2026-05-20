// Descrições resumidas dos enxames — usadas em selects/tooltips no cadastro.
// Indexadas por slug do enxame (tb_machine.slug).
export const MACHINE_DESCRIPTIONS: Record<string, string> = {
  "marketing":
    "Para estrategistas, designers, social media e quem faz marcas crescerem e venderem.",
  "tecnologia":
    "Para devs, engenheiros, dados, IA e infraestrutura — quem constrói produtos digitais.",
  "transporte":
    "Para motoristas, entregadores, logística e mudanças — quem move pessoas e cargas.",
  "artistas":
    "Para músicos, atores, ilustradores e performers — quem vive de criar e se apresentar.",
  "justica":
    "Para advogados, jornalistas, servidores e atuação política e institucional.",
  "influencer":
    "Para creators de todos os nichos que produzem conteúdo e engajam audiências.",
  "servicos_residenciais":
    "Para limpeza, cuidados, manutenção e apoio ao dia a dia da casa.",
  "construcao":
    "Para obra, reforma, instalações e acabamento — do alicerce à entrega.",
  "saude":
    "Para médicos, terapeutas e profissionais de cuidado do corpo e da mente.",
  "beleza_bem_estar":
    "Para cabelo, estética, terapias e autocuidado — quem cuida da imagem e do bem-estar.",
  "veiculos":
    "Para mecânica, estética automotiva, reparos e serviços para todo tipo de veículo.",
  "pets":
    "Para veterinária, banho e tosa, adestramento e cuidados com animais.",
  "rural":
    "Para agropecuária, máquinas, manejo e gestão da produção rural.",
  "educacao":
    "Para professores, mentores e treinadores que desenvolvem pessoas.",
  "eventos":
    "Para produção, gastronomia, animação e estrutura de festas e eventos.",
}

export function machineDescription(slug?: string | null): string {
  if (!slug) return ""
  return MACHINE_DESCRIPTIONS[slug] || ""
}
