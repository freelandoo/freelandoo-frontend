/**
 * OS ORNAMENTOS — o vocabulário déco desenhado em SVG.
 *
 * ⚠️ TUDO É DESENHADO, nada é arquivo de imagem. Não por purismo: um tema
 * autoral precisa sobreviver à portagem para dentro da plataforma, e arte em
 * arquivo vira mais um caminho para conferir e mais bytes para servir. Traço
 * em SVG escala em qualquer tamanho, herda a cor por `currentColor` e custa
 * alguns bytes de HTML.
 *
 * ⚠️ TODOS SÃO `aria-hidden` por padrão. São ornamento, não informação — um
 * leitor de tela anunciando "tesoura, tesoura, navalha" entre os títulos
 * transforma a página numa lista de ruído. O glifo que ACOMPANHA um nome de
 * serviço já tem o nome ao lado, em texto.
 *
 * ⚠️ NENHUM É COMPONENTE DE CLIENTE. São funções puras que devolvem SVG, e
 * por isso saem no HTML do servidor — que é onde o buscador e o primeiro
 * quadro da página os encontram.
 */

type GlyphProps = {
  className?: string;
  /** Espessura do traço. O padrão serve para 24–48px; acima disso, subir. */
  width?: number;
};

/* ── A MARCA ─────────────────────────────────────────────────────────────── */

/**
 * O monograma "EC" dentro do losango déco.
 *
 * É a marca do site: aparece na barra, no rodapé e no ícone da aba. Não é um
 * logotipo entregue pelo cliente — é uma marca tipográfica construída aqui, e
 * está dito em voz alta para que ninguém a confunda com identidade oficial.
 * No dia em que o Enzo tiver um logo de verdade, ele substitui ESTE
 * componente e mais nenhum.
 */
export function Monogram({ className = "", width = 1.2 }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth={width}
    >
      {/* losango externo */}
      <path d="M24 2.5 45.5 24 24 45.5 2.5 24Z" />
      {/* losango interno, o "fio duplo" que é a assinatura do déco */}
      <path d="M24 7.5 40.5 24 24 40.5 7.5 24Z" opacity="0.45" />
      {/* E */}
      <path d="M17.5 17.5h-4.2v13h4.2M13.3 24h3.4" strokeLinecap="square" />
      {/* C */}
      <path
        d="M34.7 19.4a6.6 6.6 0 0 0-4.6-1.9 6.5 6.5 0 0 0 0 13 6.6 6.6 0 0 0 4.6-1.9"
        strokeLinecap="square"
      />
    </svg>
  );
}

/* ── DIVISOR ─────────────────────────────────────────────────────────────── */

/**
 * O filete com losango ao centro — o divisor de seção.
 *
 * As duas metades carregam `data-rule`, então elas se abrem da esquerda para
 * a direita quando entram em cena (ver `experience/motion.tsx`). O losango do
 * meio não anima: ele é o ponto fixo em torno do qual as réguas abrem.
 */
export function DecoDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span
        data-rule
        className="h-px w-full max-w-[10rem] flex-1 bg-[var(--ec-line)]"
      />
      <svg viewBox="0 0 24 12" width="18" height="9" fill="none" className="shrink-0">
        <path d="M12 1 22 6 12 11 2 6Z" stroke="var(--ec-volt)" strokeWidth="1" />
        <path d="M12 4 16 6 12 8 8 6Z" fill="var(--ec-volt)" />
      </svg>
      <span
        data-rule
        className="h-px w-full max-w-[10rem] flex-1 bg-[var(--ec-line)]"
      />
    </div>
  );
}

/**
 * O raio de sol déco — o leque de linhas que abre de um ponto.
 *
 * Usado uma vez só, atrás do topo da home. Uma vez só é a dose: repetido em
 * cada seção ele deixa de ser assinatura e vira papel de parede.
 */
export function DecoSunburst({ className = "" }: { className?: string }) {
  // 13 raios, ímpar de propósito: com número par existe um raio exatamente
  // na vertical E o espelho dele, e o leque lê como grade em vez de leque.
  const rays = Array.from({ length: 13 }, (_, i) => {
    const angle = -90 + (i - 6) * 7.5;
    const rad = (angle * Math.PI) / 180;
    return { x: 200 + Math.cos(rad) * 190, y: 200 + Math.sin(rad) * 190 };
  });
  return (
    <svg
      viewBox="0 0 400 200"
      fill="none"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMax slice"
    >
      {rays.map((r, i) => (
        <line
          key={i}
          x1="200"
          y1="200"
          x2={r.x.toFixed(1)}
          y2={r.y.toFixed(1)}
          stroke="var(--ec-volt-deep)"
          strokeWidth="1"
          opacity={i === 6 ? 0.55 : 0.28}
        />
      ))}
      <path d="M20 200a180 180 0 0 1 360 0" stroke="var(--ec-volt-deep)" strokeWidth="1" opacity="0.3" />
      <path d="M70 200a130 130 0 0 1 260 0" stroke="var(--ec-volt-deep)" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

/* ── OS GLIFOS DE SERVIÇO ────────────────────────────────────────────────── */

/**
 * Um traço por serviço.
 *
 * ⚠️ A CHAVE VEM DO `art` DO SERVIÇO, e a lista é FECHADA no tipo
 * `ServiceArt`. Serviço novo com `art` fora da lista é erro de compilação —
 * e não um card com um buraco no lugar do desenho, descoberto na tela depois
 * do deploy.
 */
export type GlyphName = "scissors" | "razor" | "brow" | "liner" | "duo" | "trio";

const GLYPHS: Record<GlyphName, React.ReactNode> = {
  // Tesoura
  scissors: (
    <>
      <circle cx="7" cy="25" r="3.4" />
      <circle cx="7" cy="7" r="3.4" />
      <path d="M9.6 23.4 27 6.2M9.6 8.6 27 25.8" strokeLinecap="square" />
      <path d="M16 16h1.6" strokeLinecap="round" />
    </>
  ),
  // Navalha aberta
  razor: (
    <>
      <path d="M4 22.5 19 7.5a3 3 0 0 1 4.2 4.2L8.2 26.7Z" />
      <path d="M22.5 8.8 27 4.3" strokeLinecap="square" />
      <path d="M6.4 20 21 5.4" opacity="0.4" />
    </>
  ),
  // Sobrancelha + olho
  brow: (
    <>
      <path d="M4 11.5c4.5-4.2 12-5.4 17.5-2.6l6.5 3.3" strokeLinecap="round" />
      <path d="M5.5 22.5c4.2-5 13-5 17.2 0-4.2 5-13 5-17.2 0Z" />
      <circle cx="14.1" cy="22.5" r="2.6" />
    </>
  ),
  // Risco / navalha traçando linha
  liner: (
    <>
      <path d="M3 26 15 14" strokeLinecap="square" />
      <path d="M13.4 12.4 20 5.8a2.6 2.6 0 0 1 3.7 3.7l-6.6 6.6Z" />
      <path d="M4 8h8M4 12h5" opacity="0.5" strokeLinecap="round" />
      <path d="M20 22h8M23 26h5" opacity="0.5" strokeLinecap="round" />
    </>
  ),
  // Dois — tesoura + navalha cruzadas
  duo: (
    <>
      <circle cx="6" cy="25.5" r="2.8" />
      <path d="M8.2 24 24 8.2" strokeLinecap="square" />
      <path d="M23 6.6a2.3 2.3 0 0 1 3.2 3.2" />
      <circle cx="26" cy="25.5" r="2.8" />
      <path d="M23.8 24 8 8.2" strokeLinecap="square" />
      <path d="M9 6.6A2.3 2.3 0 0 0 5.8 9.8" />
    </>
  ),
  // Três — o losango completo, com os três traços
  trio: (
    <>
      <path d="M16 2.5 29.5 16 16 29.5 2.5 16Z" />
      <path d="M16 8 24 16l-8 8-8-8Z" opacity="0.45" />
      <path d="M16 12.5v7M12.5 16h7" strokeLinecap="round" />
    </>
  ),
};

export function ServiceGlyph({
  name,
  className = "",
  width = 1.3,
}: GlyphProps & { name: GlyphName }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinejoin="round"
    >
      {GLYPHS[name]}
    </svg>
  );
}
