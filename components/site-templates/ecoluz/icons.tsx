// OS ÍCONES — desenhados aqui, em SVG inline.
//
// ⚠️ NÃO VEM DE CDN. O site original carregava a biblioteca de ícones do
// `unpkg`, e dentro da Freelandoo isso morre em silêncio: a CSP da plataforma
// não tem esse host, o script é bloqueado e TODO ícone da página simplesmente
// não é desenhado — sem erro visível para quem abriu o site. Um `<i>` vazio
// não parece defeito, parece espaço.
//
// ⚠️ E NÃO VEM DE `lucide-react` tampouco. A plataforma tem a biblioteca, mas
// um tema autoral que puxa o mesmo conjunto de ícones de todo mundo perde a
// única coisa que o distingue de um template. São dez desenhos, todos no mesmo
// traço de 1.5 e na mesma grade de 24.
//
// ⚠️ `IconName` É LISTA FECHADA de propósito: `content/` escolhe o ícone pelo
// NOME, e um nome torto viraria um buraco no card em vez de erro de
// compilação. Ícone novo entra no tipo E no mapa — faltando no mapa, o
// TypeScript reprova na hora.

export type IconName =
  | "home"
  | "building"
  | "battery"
  | "file"
  | "wrench"
  | "wallet"
  | "shield"
  | "leaf"
  | "sun"
  | "bolt"
  // Os diferenciais da empresa (§ "Por que escolher a Eco Luz").
  | "team"
  | "support"
  | "pin"
  // As situações de consumo (§ "O que cabe na sua conta").
  | "snow"
  | "shower"
  | "pool"
  | "grain";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </>
  ),
  building: (
    <>
      <path d="M4 20V5.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V20" />
      <path d="M14 10h5a1 1 0 0 1 1 1v9" />
      <path d="M2.5 20h19" />
      <path d="M7 8.5h4M7 12h4M7 15.5h4M17 13.5h0M17 17h0" />
    </>
  ),
  battery: (
    <>
      <rect x="2.5" y="7.5" width="16" height="9" rx="1.5" />
      <path d="M21.5 11v2" />
      <path d="M11 9.5 8.5 12.5h3L9 14.5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H6.5a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13.5h7M8.5 17h4.5" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.5 6.5a4 4 0 0 0 5 5l-8.2 8.2a2.1 2.1 0 0 1-3-3l8.2-8.2a4 4 0 0 0-5-5l2.7 2.7-1.7 3.3-3.3 1.7z" />
    </>
  ),
  wallet: (
    <>
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h12.5a1.5 1.5 0 0 1 1.5 1.5v1" />
      <rect x="3.5" y="7.5" width="17" height="11" rx="1.5" />
      <path d="M16.5 13h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.3 3 8.2 7.5 9.5 4.5-1.3 7.5-5.2 7.5-9.5V6z" />
      <path d="m8.8 12 2.3 2.3 4.1-4.4" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4c0 8-4.6 13-10 13a5 5 0 0 1-5-5C5 7.6 10.5 4 20 4Z" />
      <path d="M4 20c1.5-4.5 4.5-8 9-10" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </>
  ),
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.8a5.5 5.5 0 0 1 11 0" />
      <path d="M16.2 5.4a3.2 3.2 0 0 1 0 5.2" />
      <path d="M17.4 14.2a5.5 5.5 0 0 1 3.1 5.6" />
    </>
  ),
  support: (
    <>
      <path d="M4.5 13.5v-1.5a7.5 7.5 0 0 1 15 0v1.5" />
      <rect x="2.5" y="12.5" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="12.5" width="4" height="6" rx="1.5" />
      <path d="M19.5 18.5a3 3 0 0 1-3 3h-3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s7-6.2 7-11.1a7 7 0 1 0-14 0c0 4.9 7 11.1 7 11.1Z" />
      <circle cx="12" cy="10.4" r="2.5" />
    </>
  ),
  snow: (
    <>
      <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8" />
      <path d="M12 6.4 9.9 4.3M12 6.4l2.1-2.1M12 17.6l-2.1 2.1M12 17.6l2.1 2.1" />
    </>
  ),
  shower: (
    <>
      <path d="M4.5 20.5V7.2a2.9 2.9 0 0 1 5.8 0v1.3" />
      <path d="M7.8 10.5h12l-3 3.6h-6z" />
      <path d="M12 17.4v1.6M15 16.8v2.2M18 17.4v1.6" />
    </>
  ),
  pool: (
    <>
      <path d="M2.5 17c1.7 0 1.7 1.6 3.4 1.6S7.6 17 9.3 17s1.7 1.6 3.4 1.6S14.4 17 16.1 17s1.7 1.6 3.4 1.6" />
      <path d="M8 14.5V5.6a2.1 2.1 0 0 1 4.2 0" />
      <path d="M14.5 14.5V5.6a2.1 2.1 0 0 1 4.2 0" />
      <path d="M8 9.8h6.5" />
    </>
  ),
  grain: (
    <>
      <path d="M12 21.5V10" />
      <path d="M12 10c0-3 2-5.1 4.6-5.6C16.1 7 14.6 9.4 12 10Z" />
      <path d="M12 10C12 7 10 4.9 7.4 4.4 7.9 7 9.4 9.4 12 10Z" />
      <path d="M12 16c0-2.4 1.7-4.1 3.9-4.5-.4 2.1-1.7 4.1-3.9 4.5Z" />
      <path d="M12 16c0-2.4-1.7-4.1-3.9-4.5.4 2.1 1.7 4.1 3.9 4.5Z" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-6 w-6",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * O mesmo ícone, para ser posto DENTRO de outro SVG (os diagramas).
 *
 * ⚠️ `foreignObject` com o `<Icon>` de sempre dentro funcionaria no Chrome e é
 * frágil no Safari (tamanho e posição variam com o zoom). Um `<svg>` aninhado
 * com `x`/`y`/`width`/`height` é o jeito nativo de encaixar um desenho de
 * 24×24 numa prancha maior.
 */
export function IconAt({
  name,
  x,
  y,
  size,
  className,
}: {
  name: IconName;
  x: number;
  y: number;
  size: number;
  className?: string;
}) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * A MARCA — traçada do ARQUIVO ORIGINAL do cliente (2026-10-13).
 *
 * ⚠️ O QUE HAVIA AQUI ANTES ERA UM DESENHO DE OUVIDO, e foi por isso que o
 * cliente recusou: um círculo de sol, um raio e uma curva que o próprio
 * comentário chamava de "telhado". Na marca dele a curva não é telhado
 * nenhum — é um LIVRO ABERTO —, o sol é meia-cúpula com dezesseis raios, e
 * nada disso se adivinha. Este caminho saiu do vetor do arquivo entregue,
 * não de interpretação: redesenhar "parecido" de novo é repetir o erro.
 *
 * ⚠️ CONTINUA SVG, E NÃO O PNG, pelos mesmos motivos de antes: a marca
 * aparece na barra, no rodapé, na abertura, na intro e no Sobre, em cinco
 * tamanhos, e o desenho herda a cor do contexto. Herdar cor não é enfeite —
 * a intro RECOLORE a marca por CSS (.el-intro__logo { color: ... }), e com
 * um PNG aquela animação perde a cor.
 *
 * ⚠️ O VIEWBOX É LARGO (1,74:1) E O ANTERIOR ERA QUADRADO. Quem chama tem
 * de pedir `w-auto`: na classe `h-9 w-9` herdada do monograma antigo a
 * marca sai ACHATADA, e sai achatada em silêncio — nada quebra.
 *
 * ⚠️ DUAS CORES DIVERGEM DO ORIGINAL, DE PROPÓSITO:
 *
 *   O RAIO é `--el-ink` e não preto. No arquivo ele é preto sobre o amarelo;
 *   aqui ele é o FUNDO atravessando o sol — que é exatamente como a marca se
 *   lê na fachada da loja. Em seção clara ele volta a ser escuro sobre
 *   amarelo: mesmo efeito, sem um preto fixo brigando com o tema.
 *
 *   O LIVRO é `currentColor` e no arquivo é PRETO. É a divergência de
 *   verdade, e é obrigatória: preto sobre o fundo escuro do site é um livro
 *   que ninguém vê. Se um dia a marca for para fundo branco com as cores
 *   exatas do arquivo, é esta linha que muda.
 */
export function Monogram({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 36.8"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M 32 0.2 C 31.7 0.6, 30.8 5.7, 30.8 6.5 L 30.8 6.7 32 6.7 L 33.2 6.7 33.2 6.3 C 33 4.5, 32.1 0, 32 0.2 M 37.7 2 C 37.5 2.3, 37.2 2.9, 37 3.1 C 36.9 3.4, 36.6 3.8, 36.5 4 L 36.2 4.4 36.1 4.9 C 36.1 5.2, 35.9 5.8, 35.8 6.2 C 35.7 6.6, 35.6 7, 35.6 7.1 L 35.6 7.2 36.3 7.4 C 36.7 7.5, 37.1 7.6, 37.1 7.6 C 37.2 7.6, 37.8 4.7, 38.1 2.7 C 38.1 2.1, 38.2 1.6, 38.2 1.5 C 38.3 1.2, 38.2 1.3, 37.7 2 M 26 2.2 C 26.1 3.1, 26.6 6.3, 26.9 7.3 C 27 7.8, 26.9 7.8, 27.7 7.6 C 28 7.5, 28.4 7.4, 28.5 7.3 C 28.7 7.3, 28.8 7.3, 28.9 7.2 L 29 7.1 28.4 6 C 27.5 4.3, 26.1 1.8, 26 1.8 L 25.9 1.8 26 2.2 M 42 5.8 C 40.8 7, 40.2 7.7, 39.8 8.2 L 39.5 8.6 39.7 8.7 C 40.2 9, 41.3 9.6, 41.4 9.6 C 41.5 9.5, 42.9 5.7, 43 5 L 43.1 4.8 43 4.8 C 43 4.8, 42.5 5.2, 42 5.8 M 21.2 5.1 C 21.2 5.5, 22.6 9.4, 22.8 9.7 L 22.8 9.7 23.3 9.5 C 24 9.1, 24.6 8.8, 24.6 8.7 C 24.6 8.5, 21.4 4.9, 21.2 4.9 C 21.2 4.9, 21.2 5, 21.2 5.1 M 47.8 7.5 C 45.9 8.8, 44 10.1, 43.5 10.6 L 43.2 10.9 43.4 11.1 C 45 12.5, 45 12.5, 45.2 12.4 C 45.4 12.2, 48.8 7.1, 48.8 6.9 C 48.8 6.8, 48.7 6.9, 47.8 7.5 M 15.3 7.1 C 15.6 7.8, 18.8 12.4, 19 12.5 L 19.1 12.5 19.7 12 C 20.1 11.7, 20.5 11.3, 20.6 11.3 C 20.8 11.1, 20.8 11, 20.6 10.7 C 20.2 10.4, 18.4 9, 17.3 8.3 C 17.1 8.2, 16.6 7.8, 16.1 7.5 C 15.2 6.9, 15.1 6.8, 15.3 7.1 M 30.9 8.5 C 21.5 9.4, 13.9 18.3, 14.6 27.3 L 14.7 27.9 15 27.9 C 15.1 27.9, 15.5 28, 15.9 28 C 20.3 28.4, 25.6 30.7, 29.3 33.7 L 30 34.4 30.1 34.3 C 30.1 34.2, 30.1 33.9, 30.2 33.5 C 30.3 32.4, 30.6 29.9, 31.1 25.8 C 31.4 23.6, 31.6 21.7, 31.6 21.5 L 31.7 21.2 31.6 21.2 C 31.5 21.2, 30.5 21.4, 29.3 21.6 C 28.2 21.9, 27.2 22.1, 27.2 22 C 27.1 22, 28.7 18.2, 30 15.2 C 30.8 13.5, 32.2 10.4, 32.9 9.1 C 33.1 8.8, 33.2 8.5, 33.2 8.5 C 33.2 8.4, 31.6 8.4, 30.9 8.5 M 35.1 8.8 C 35.1 8.8, 34.9 9.4, 34.7 10 C 34.5 10.6, 34 12.1, 33.7 13.2 C 33.3 14.4, 33 15.3, 33 15.3 C 33 15.4, 33.8 15.1, 34.7 14.8 C 35.7 14.5, 36.4 14.3, 36.4 14.3 C 36.4 14.3, 36.2 14.9, 35.8 15.6 C 35.5 16.3, 35 17.4, 34.7 18 C 34.4 18.6, 34.1 19.2, 34.1 19.2 C 34.2 19.2, 34.7 19.1, 35.3 19 C 36 18.9, 36.5 18.8, 36.5 18.8 C 36.5 18.8, 35.7 20.6, 34.7 22.8 C 33.7 25, 32.9 26.8, 32.9 26.8 C 32.9 26.8, 33.4 26.7, 33.8 26.5 C 34.3 26.3, 34.7 26.1, 34.7 26.2 C 34.8 26.2, 33 29.7, 31.4 32.6 C 30.8 33.7, 30.3 34.6, 30.3 34.6 C 30.3 34.7, 30.7 35, 31 35.3 L 31.7 36 32.3 35.5 C 36.2 31.6, 43.5 28.2, 48.5 28 L 49.3 27.9 49.3 27.6 C 49.3 27.4, 49.3 26.6, 49.3 25.7 L 49.3 24.2 49.1 23.4 C 48 16.5, 42.7 10.7, 36.1 8.9 C 35.7 8.8, 35.3 8.7, 35.2 8.7 C 35.2 8.7, 35.1 8.7, 35.1 8.8 M 12.7 13.3 C 13.9 14.5, 15.9 16.3, 16 16.3 C 16.1 16.3, 17.1 14.7, 17.2 14.6 C 17.3 14.4, 14 13, 11.6 12.2 C 11.6 12.2, 12 12.7, 12.7 13.3 M 51.9 12.4 C 50.1 13, 46.9 14.4, 46.9 14.6 C 46.9 14.6, 47 14.8, 47.2 15 C 47.3 15.3, 47.6 15.6, 47.7 15.9 C 47.9 16.1, 48 16.3, 48.1 16.3 C 48.3 16.3, 52.5 12.3, 52.4 12.2 C 52.4 12.2, 52.2 12.3, 51.9 12.4 M 53.8 17.5 C 52.3 17.7, 49.5 18.2, 49.3 18.3 L 49.1 18.4 49.3 18.7 C 49.7 19.8, 49.9 20.2, 49.9 20.2 C 50 20.3, 51 19.8, 52 19.2 C 52.3 19, 52.9 18.7, 53.3 18.5 C 53.6 18.3, 54.1 18, 54.2 17.9 C 54.3 17.8, 54.6 17.7, 54.7 17.6 C 55 17.5, 55.1 17.3, 54.9 17.3 C 54.9 17.3, 54.4 17.4, 53.8 17.5 M 9.1 17.4 C 9.1 17.4, 10 18, 10.4 18.3 C 10.6 18.4, 11.1 18.7, 11.4 18.9 C 12.4 19.4, 13.8 20.2, 14 20.2 L 14.1 20.3 14.5 19.3 C 14.7 18.8, 14.9 18.4, 14.9 18.4 C 14.9 18.2, 9.1 17.2, 9.1 17.4 M 10.7 22.5 C 9.1 22.5, 7.5 22.7, 7.3 22.7 L 7.1 22.8 7.7 23 C 8.1 23.1, 8.6 23.2, 8.9 23.3 C 9.1 23.4, 10 23.6, 10.7 23.8 C 12.2 24.3, 12.7 24.4, 13 24.4 L 13.2 24.4 13.2 24.2 C 13.3 24.1, 13.3 23.7, 13.4 23.3 L 13.5 22.5 13.4 22.5 C 13.3 22.4, 12.2 22.4, 10.7 22.5 M 50.6 22.5 L 50.5 22.5 50.6 23.2 C 50.7 23.5, 50.7 23.9, 50.7 24 C 50.7 24.1, 50.7 24.2, 50.8 24.3 L 50.8 24.5 51.4 24.3 C 51.7 24.3, 52.4 24.1, 52.9 23.9 C 53.5 23.7, 54.6 23.4, 55.4 23.2 C 56.2 23, 56.8 22.7, 56.8 22.7 C 56.6 22.6, 50.9 22.3, 50.6 22.5 M 12.3 26.5 C 11.5 26.8, 9.1 27.8, 8.1 28.2 L 7.4 28.5 7.6 28.6 C 7.9 28.6, 12 28.3, 12.9 28.2 L 13.3 28.2 13.2 27.5 C 13.2 26.7, 13.1 26.3, 13.1 26.3 C 13 26.3, 12.7 26.4, 12.3 26.5 M 50.9 26.4 C 50.8 26.5, 50.7 28.1, 50.7 28.2 C 50.8 28.2, 55.5 28.6, 56.2 28.6 L 56.5 28.6 56.5 28.5 C 56.4 28.4, 54.7 27.7, 53.8 27.4 C 53.4 27.2, 52.9 27, 52.7 26.9 C 52 26.7, 51.6 26.5, 51.2 26.4 L 50.9 26.3 50.9 26.4" fill="currentColor" />
      <path d="M 16.5 33.3 C 13.6 33.5, 9.6 34.1, 5.9 34.9 C 4.4 35.3, 0.2 36.4, 0.1 36.4 L 0 36.5 0.5 36.5 C 0.8 36.5, 2.3 36.4, 3.8 36.4 C 9.4 36.2, 13 36.2, 19.7 36.1 L 26.4 36.1 27.5 36.2 C 28.9 36.3, 30.2 36.5, 30.9 36.6 C 31.2 36.6, 31.5 36.7, 31.5 36.7 L 31.6 36.6 31.1 36.3 C 27.6 34.1, 22.2 32.9, 16.5 33.3 M 43.1 33.3 C 39.1 33.5, 35.1 34.7, 32.7 36.3 C 31.9 36.8, 31.9 36.8, 32.9 36.6 C 34 36.4, 35.5 36.3, 37.7 36.2 L 39.5 36.1 45.6 36.1 C 52.9 36.2, 55.2 36.2, 61.7 36.4 C 62.9 36.5, 63.9 36.5, 64 36.5 C 64 36.4, 61 35.6, 58.6 35.1 C 52.3 33.6, 47.2 33, 43.1 33.3" fill="currentColor" />
      <path d="M 35.6 4.6 C 33.4 7.9, 31.8 11.1, 29.2 17.2 C 28 20, 27.2 22, 27.2 22 C 27.2 22, 28.2 21.8, 29.5 21.6 C 30.7 21.3, 31.7 21.2, 31.7 21.2 C 31.7 21.2, 31.7 21.5, 31.6 21.8 C 31.5 22.9, 30.6 29.8, 30.4 31.9 C 30.2 32.9, 30.1 33.9, 30.1 34.2 C 30 34.7, 30 35.1, 30.1 35 C 30.2 34.9, 34.8 26.2, 34.7 26.2 C 34.7 26.2, 33.3 26.7, 33.1 26.8 C 33 26.8, 32.9 26.9, 32.9 26.8 C 32.8 26.8, 33.4 25.5, 34.4 23.5 C 35.2 21.7, 36.5 18.9, 36.5 18.8 C 36.5 18.8, 35.9 18.9, 35.3 19 C 34.6 19.2, 34.1 19.2, 34.1 19.2 C 34.1 19.2, 34.6 18.1, 35.2 16.8 C 35.9 15.4, 36.4 14.3, 36.4 14.3 C 36.4 14.3, 35.6 14.6, 34.7 14.9 C 33.7 15.2, 33 15.4, 32.9 15.4 C 32.9 15.4, 33.2 14.7, 33.5 13.8 C 33.9 12.4, 34.1 11.8, 34.9 9.3 C 35.3 8.1, 35.4 7.6, 35.7 6.5 C 36 5.5, 36.4 3.7, 36.4 3.6 C 36.4 3.5, 36.2 3.7, 35.6 4.6" fill="var(--el-ink)" />
    </svg>
  );
}
