/**
 * O FAQ DA CASA — o da home, que é diferente dos FAQs de página.
 *
 * ⚠️ NENHUMA PERGUNTA SE REPETE ENTRE ESTE ARQUIVO E OS FAQS DOS SERVIÇOS
 * OU DOS BAIRROS. Duas páginas marcando a MESMA pergunta em `FAQPage` é a
 * forma mais fácil de transformar marcação válida em conteúdo duplicado —
 * e o Google escolhe uma das duas para mostrar, que pode não ser a que
 * interessa. Aqui ficam só as perguntas que são do NEGÓCIO (endereço,
 * horário, formas de pagamento, como marcar); as de serviço ficam na página
 * do serviço, e as de bairro na página do bairro.
 *
 * ⚠️ E NENHUMA RESPOSTA AFIRMA O QUE NÃO FOI INFORMADO. Não há pergunta
 * sobre formas de pagamento, estacionamento, acessibilidade nem tempo de
 * atendimento — nada disso foi dito, e FAQ é justamente onde a invenção
 * fica mais convincente e mais perigosa, porque o Google publica a resposta
 * direto no resultado de busca.
 */

import { livePriced } from "./prices";
import type { Faq } from "./services";

// Os preços das respostas são MARCADORES resolvidos pelo cadastro — ver `prices.ts`.
const RAW_FAQ: Faq[] = [
  {
    q: "Onde fica a Enzo Cortes?",
    a: "Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo/SP, CEP 09854-740. É na região do Alvarenga, na zona sul do município.",
  },
  {
    q: "Qual o horário de funcionamento?",
    a: "De segunda a sábado, das 09h às 19h. Domingo não abre.",
  },
  {
    q: "Quanto custa cortar o cabelo?",
    a: "Corte {corte}. Barba {barba}. Sobrancelha {sobrancelha}. Risco ou desenho a partir de {risco}. Corte e barba juntos saem por {cb}, e corte, barba e sobrancelha por {cbs}.",
  },
  {
    q: "Vale mais a pena pagar o combinado?",
    a: "Vale, e a conta é simples: corte e barba avulsos dariam {cb:soma} e o combinado é {cb}. Os três avulsos dariam {cbs:soma} e o combinado é {cbs}. A economia é de {cb:eco} e {cbs:eco}, respectivamente.",
  },
  {
    q: "Preciso marcar horário?",
    a: "Não é obrigatório. Mas marcar pela agenda do site antes de sair de casa evita chegar e encontrar a cadeira ocupada — e no sábado isso faz bastante diferença.",
  },
  {
    q: "Atende quem não é do Jardim Pinheiros?",
    a: "Atende quem chegar. A barbearia fica no Jardim Pinheiros, e boa parte de quem vem é dos bairros vizinhos da mesma região do Alvarenga, como Jardim Represa e Batistini.",
  },
];

export const SITE_FAQ: Faq[] = RAW_FAQ.map((f) => livePriced(f));
