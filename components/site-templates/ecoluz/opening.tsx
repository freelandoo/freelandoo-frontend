// A ABERTURA DA HOME — três atos sobre um palco só.
//
// Substitui o banner único que existia aqui (`hero.tsx`, removido). O pedido do
// cliente foi explícito: "no início, três sessões diferentes, com animações no
// scroll; um vídeo dividido em frames, e conforme rolar as três sessões isso se
// dá por um vídeo".
//
// A leitura: a rolagem não muda de página, muda de FRASE. O fundo é um só e
// contínuo — o vídeo sendo arrastado —, e o texto por cima troca três vezes. É
// o oposto de três banners empilhados, onde cada um recomeça do zero.
//
// Os três atos são a ordem da decisão de quem chega, a mesma que a home já
// seguia: a CONTA que já está sendo paga → o que o sol faz com ela → quem
// executa.
//
// ═══ O QUE É SERVIDOR E O QUE É CLIENTE ═══════════════════════════════════
//
// Este arquivo é de SERVIDOR: todo o texto, o `<h1>` e os links saem no HTML
// que o buscador lê. Quem tem gesto é o `OpeningMotion`, de cliente, que não
// desenha nada — só escreve estilo nos elementos que já estão aqui.
//
// ⚠️ É ISSO QUE FAZ A DEGRADAÇÃO SER REAL. Sem JavaScript (robô, JS bloqueado,
// erro no pacote) o atributo `data-scrub` nunca é escrito e os três atos ficam
// EMPILHADOS como três blocos de texto normais, legíveis e navegáveis. A
// abertura degrada para conteúdo, nunca para tela vazia.
//
// ⚠️ E O PALCO NÃO DEPENDE DO VÍDEO. Com `OPENING.count === 0` — que é o
// estado de hoje, o vídeo ainda não foi entregue — os três atos se cruzam do
// mesmo jeito sobre o fundo que o tema já pinta. Quando os quadros entrarem,
// eles aparecem POR BAIXO do que já está funcionando.
//
// ⚠️ NENHUM ATO USA `data-reveal`. Aquele atributo esconde o bloco no CSS e o
// GSAP o revela UMA vez; aqui a opacidade é governada pela POSIÇÃO da rolagem,
// e os dois brigariam pelo mesmo `opacity` — com o GSAP vencendo no fim e
// deixando os três atos acesos ao mesmo tempo, um por cima do outro.
//
// ⚠️ E A MANCHETE NÃO USA `data-line`. Aquele atributo tem uma regra de CSS
// que o esconde a 108% até o GSAP ir buscá-lo — e o GSAP só trata quem estiver
// dentro de um `[data-reveal="lines"]`, que aqui não existe. Usá-lo aqui
// deixaria o `<h1>` do site invisível para sempre, sem um único erro aparecer.
// A máscara daqui é própria (`el-open-line`) e a entrada é do CSS.

import { WA_DEFAULT, whatsappLink } from "./content/business";
import { Monogram } from "./icons";
import { PAGE, pageHref, type TemplateLinks } from "./lib";
import OpeningMotion from "./opening-motion";

/** A mensagem de quem chega pelo terceiro ato, já sabendo o que quer. */
const WA_ESPECIALISTA =
  "Olá! Vim pelo site da EcoLuz e quero falar com um especialista sobre energia solar.";

export default function Opening({ links }: { links: TemplateLinks }) {
  return (
    <div className="el-open" data-open-stage>
      <div className="el-open__sticky">
        {/* ⚠️ O CANVAS É `aria-hidden` E NÃO CARREGA INFORMAÇÃO NENHUMA. Tudo
            que precisa ser lido está nos atos, em texto. Um vídeo de fundo que
            carregasse conteúdo seria conteúdo invisível para metade das
            pessoas. */}
        <canvas className="el-open__canvas" data-open-canvas aria-hidden="true" />

        {/* ⚠️ O VÉU É UM CANTO, NÃO UMA CAMADA SOBRE A IMAGEM INTEIRA. Ele
            saiu por decisão do Alex ("deixe sem véu, coloque só drop shadow") e
            voltou no pedido seguinte, no molde do anexo que ele mandou: preto
            ancorado à ESQUERDA, onde o texto vive, soltando a metade direita
            para a fotografia aparecer. É o contrário do que havia antes, que
            escurecia a tela toda de forma homogênea.

            ⚠️ E A SOMBRA DO TEXTO FICOU. Ela não é redundante: sobre o preto do
            canto uma sombra preta é INVISÍVEL e não custa nada, e é ela que
            segura o texto justamente onde o véu se desfaz — a ponta das linhas
            longas no monitor largo e a metade direita do parágrafo no celular,
            onde o texto ocupa a tela inteira e o canto não alcança. Tirar uma
            das duas reabre um buraco que a outra não cobre. */}
        <div className="el-open__veil" aria-hidden="true" />

        <div className="el-open__acts">
          {/* ── ATO 1 — A CONTA ─────────────────────────────────────────── */}
          <article className="el-open__act" data-open-act>
            <p className="eyebrow text-[var(--el-sun)]">Energia solar · São Luís / MA e região</p>

            {/* ⚠️ AS LINHAS SÃO QUEBRADAS À MÃO, e é isso que dispensa uma
                biblioteca de recorte de texto: cada linha vira a própria
                máscara e o interior sobe por baixo dela. Medir linha em tempo
                de execução custaria um plugin inteiro para descobrir o que
                aqui já está escrito. */}
            <h1 className="display el-open__title">
              <span className="el-open-line">
                <span data-open-line>Sua conta de energia</span>
              </span>
              <span className="el-open-line">
                <span data-open-line className="text-[var(--el-sun)]">
                  pode ser diferente.
                </span>
              </span>
            </h1>

            <p className="el-open__lead">
              Gere sua própria energia e tenha mais controle sobre o que você
              paga todo mês. A EcoLuz projeta, instala e homologa sistemas
              solares — com bateria ou sem — para casas, empresas e sítios.
            </p>

            <div className="el-open__cta">
              {/* ⚠️ O PRIMEIRO BOTÃO NÃO VAI PARA O WHATSAPP, E É DELIBERADO.
                  Quem acabou de chegar ainda não tem o que perguntar — mandar
                  para a conversa agora produz o "oi" sem contexto que faz o
                  atendimento recomeçar do zero. A calculadora transforma a
                  dúvida em NÚMERO e termina no WhatsApp: é o mesmo destino,
                  com a pessoa sabendo o que quer. Quem já sabe tem o segundo
                  botão, o botão flutuante e um CTA em cada seção abaixo. */}
              <a href="#economia" className="btn btn-solid">
                Quero saber quanto posso economizar
              </a>
              <a
                href={whatsappLink(WA_DEFAULT)}
                target="_blank"
                rel="noopener"
                className="btn btn-ghost"
              >
                Falar com um especialista
              </a>
            </div>

            {/* A dica de rolagem existe porque a abertura tem três telas: sem
                ela, a primeira parece a página inteira. Ela desaparece junto
                com o ato, então não acompanha quem já entendeu. */}
            <p className="el-open__hint" aria-hidden="true">
              <span className="el-open__hint-rail" />
              role para ver
            </p>
          </article>

          {/* ── ATO 2 — O QUE O SOL FAZ ─────────────────────────────────── */}
          <article className="el-open__act" data-open-act>
            <p className="eyebrow text-[var(--el-sun)]">O que muda</p>

            <h2 className="display el-open__title">
              O sol paga a parte
              <br />
              cara da sua conta.
            </h2>

            <p className="el-open__lead">
              Durante o dia o sistema gera e o consumo sai dele. O excedente
              vira crédito na concessionária e volta à noite. O que continua na
              conta é o custo de disponibilidade e os tributos — e é por isso
              que nenhum sistema honesto promete conta zerada.
            </p>

            {/* Três marcas curtas, não um bloco de texto: a leitura aqui
                acontece em movimento, e parágrafo longo num ato que passa é
                texto que ninguém termina. */}
            <ul className="el-open__marks">
              <li>
                <span className="numeral">01</span>
                Dimensionado pelo seu consumo real
              </li>
              <li>
                <span className="numeral">02</span>
                On-grid, off-grid ou híbrido
              </li>
              <li>
                <span className="numeral">03</span>
                Homologação conduzida por nós
              </li>
            </ul>
          </article>

          {/* ── ATO 3 — QUEM FAZ ────────────────────────────────────────── */}
          <article className="el-open__act" data-open-act>
            <Monogram className="h-11 w-11 text-[var(--el-sun)]" />

            <h2 className="display el-open__title el-open__title--tight">
              Projeto, instalação
              <br />
              e homologação.
            </h2>

            <p className="el-open__lead">
              Equipe própria no Maranhão, do diagnóstico da conta ao
              acompanhamento depois de ligado. A etapa em que mais gente trava
              sozinha — o processo na concessionária — é conduzida pela EcoLuz.
            </p>

            <div className="el-open__cta">
              <a
                href={whatsappLink(WA_ESPECIALISTA)}
                target="_blank"
                rel="noopener"
                className="btn btn-solid"
              >
                Falar com a EcoLuz
              </a>
              <a href={pageHref(links, PAGE.servicos)} className="btn btn-ghost">
                Ver as soluções
              </a>
            </div>
          </article>
        </div>
      </div>

      {/* ⚠️ O MOTOR É O ÚLTIMO FILHO E FICA DENTRO DO PALCO. Ele procura o
          `[data-open-stage]` sob `.tpl-ecoluz`, então precisa estar montado
          depois que o palco existe no DOM. E não desenha nada: devolve `null`.

          ⚠️ SE UM DIA HOUVER UM SEGUNDO PALCO NUMA PÁGINA, o seletor do motor
          pega o PRIMEIRO. Hoje só a home tem abertura; um segundo exigiria
          descer o elemento por referência em vez de procurá-lo. */}
      <OpeningMotion />
    </div>
  );
}
