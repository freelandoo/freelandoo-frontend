// O BANNER DA HOME — o primeiro quadro.
//
// ⚠️ SEM FOTOGRAFIA, E ISSO É DECISÃO. Não existe nenhuma foto de uma obra da
// EcoLuz. A saída fácil seria uma foto de banco de imagens com painéis num
// telhado e céu azul — e é exatamente o que o ramo inteiro faz, o que já a
// esvazia de efeito. Pior: aqui é o primeiro quadro, onde a promessa visual é
// feita, e aquela foto mostraria a obra de OUTRA empresa num telhado que não é
// de ninguém que o cliente conhece.
//
// O peso visual vem do corpo do tipo, do halo solar do fundo (`theme.css`) e
// do vazio. Quando houver foto real de instalação — telhado entregue, equipe
// no local —, o lugar dela é aqui: uma coluna à direita do texto, com o
// mesmo `<img>` e `loading="eager"`, e o bloco da marca desce para o rodapé do
// banner.

import { WA_DEFAULT, whatsappLink } from "./content/business";
import { Monogram } from "./icons";
import { PAGE, pageHref, type TemplateLinks } from "./lib";

export default function Hero({ links }: { links: TemplateLinks }) {
  return (
    <section className="relative flex min-h-[86svh] items-center pb-16 pt-32 md:min-h-[92svh] md:pb-24 md:pt-40">
      {/* ⚠️ O HALO DO BANNER É LOCAL E RECORTADO PELO PRÓPRIO BANNER — não é a
          camada do tamanho da janela, que continua pintada uma vez e nunca
          animada. É daqui que vem a profundidade quando a página começa a
          rolar: ele anda mais devagar que o texto. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="el-hero-glow" data-parallax="14" />
      </div>

      <div
        className="relative mx-auto w-full max-w-[78rem]"
        style={{ paddingInline: "var(--el-pad)" }}
      >
        <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow text-[var(--el-sun)]" data-reveal="up">
              Energia solar · São Luís / MA
            </p>

            {/* ⚠️ O H1 DA HOME SAI AQUI, e é o único da página. O
                `SectionHead` das seções abaixo desenha `h2` por padrão
                justamente para não haver um segundo.

                ⚠️ AS LINHAS SÃO QUEBRADAS À MÃO, e é isso que dispensa uma
                biblioteca de recorte de texto: cada linha vira a própria
                máscara (`.el-line`) e o interior sobe por baixo dela. Medir
                linha em tempo de execução custaria um plugin inteiro para
                descobrir o que aqui já está escrito.

                ⚠️ A MÁSCARA PRECISA DE FOLGA VERTICAL. O `leading-[0.95]`
                aperta a caixa da linha, e sem a folga do `.el-line` o "j" de
                "já" sai com o rabo cortado — defeito que ninguém liga à
                animação, porque ele aparece parado. */}
            <h1
              className="display mt-6 text-[2.75rem] leading-[0.95] text-[var(--el-cream)] sm:text-[3.75rem] md:text-[5rem] lg:text-[5.75rem]"
              data-reveal="lines"
            >
              <span className="el-line">
                <span data-line>A conta de luz</span>
              </span>
              <span className="el-line">
                <span data-line className="text-[var(--el-sun)]">
                  já é o seu
                </span>
              </span>
              <span className="el-line">
                <span data-line>investimento.</span>
              </span>
            </h1>

            <p
              className="mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--el-cream-dim)] md:text-[1.1875rem]"
              data-reveal="up"
              data-reveal-delay="240"
            >
              Ela só não volta para você. A EcoLuz projeta, instala e homologa
              sistemas de energia solar — conectados à rede ou off-grid, com
              baterias — para casas, empresas e sítios em São Luís e na Ilha do
              Maranhão.
            </p>

            <div
              className="mt-9 flex flex-wrap gap-3"
              data-reveal="up"
              data-reveal-delay="320"
            >
              <a
                href={whatsappLink(WA_DEFAULT)}
                target="_blank"
                rel="noopener"
                className="btn btn-solid"
              >
                Analisar a minha conta
              </a>
              <a href="#economia" className="btn btn-ghost">
                Ver quanto custa esperar
              </a>
            </div>
          </div>

          {/* O bloco da marca: o monograma grande e as três frases que o site
              vai sustentar nas páginas de dentro. Não são números — números
              aqui teriam que ser inventados.

              ⚠️ ELE TEM REVEAL **E** PARALAXE, e os dois convivem: o reveal
              anda em pixels (`y`) e a paralaxe em porcentagem (`yPercent`), que
              o GSAP compõe no mesmo transform. Ver a nota em
              `scroll-motion.tsx` sobre a limpeza que pula quem tem paralaxe. */}
          <aside
            className="panel p-7 md:p-8"
            data-reveal="up"
            data-reveal-delay="400"
            data-parallax="-5"
          >
            <Monogram className="h-12 w-12 text-[var(--el-sun)]" />
            <ul className="mt-6 grid gap-5">
              {[
                {
                  t: "Dimensionado pela sua conta",
                  d: "O projeto começa pelo seu consumo real, não por um pacote de prateleira.",
                },
                {
                  t: "Com bateria ou sem",
                  d: "On-grid para reduzir a conta, off-grid e híbrido para ter autonomia.",
                },
                {
                  t: "Homologação por nossa conta",
                  d: "A documentação e o processo na concessionária ficam com a EcoLuz.",
                },
              ].map((item) => (
                <li key={item.t} className="border-l-2 border-[var(--el-sun)] pl-4">
                  <p className="display text-[1rem] text-[var(--el-cream)]">{item.t}</p>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--el-cream-faint)]">
                    {item.d}
                  </p>
                </li>
              ))}
            </ul>

            <a
              href={pageHref(links, PAGE.servicos)}
              className="mt-7 inline-flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.14em] text-[var(--el-sun-hi)] transition-colors hover:text-[var(--el-sun)]"
            >
              Ver os serviços
              <span aria-hidden="true">→</span>
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
