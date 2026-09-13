/**
 * A MARCA — queimador visto de cima, com a coroa de chama.
 *
 * Ela existe para dizer a tese do site numa forma: a chama certa é AZUL.
 * Por isso a coroa é azul e não laranja, e por isso o laranja não aparece
 * aqui em circunstância nenhuma — uma marca laranja diria, na linguagem
 * do próprio site, que o queimador está desregulado.
 *
 * Componente de servidor: entra no HTML, sem custo de hidratação.
 */
export default function BrandMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* corpo do queimador */}
      <circle
        cx="24"
        cy="24"
        r="9.5"
        stroke="var(--rf-line-hi)"
        strokeWidth="1.6"
      />
      <circle cx="24" cy="24" r="3" stroke="var(--rf-line-mid)" strokeWidth="1.4" />
      {/* coroa de chama: oito saídas, como um espalhador de verdade */}
      <g
        stroke="var(--rf-flame-hi)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M24 4.5 L24 11" />
        <path d="M24 37 L24 43.5" />
        <path d="M4.5 24 L11 24" />
        <path d="M37 24 L43.5 24" />
        <path d="M10.2 10.2 L14.8 14.8" opacity="0.75" />
        <path d="M33.2 33.2 L37.8 37.8" opacity="0.75" />
        <path d="M37.8 10.2 L33.2 14.8" opacity="0.75" />
        <path d="M14.8 33.2 L10.2 37.8" opacity="0.75" />
      </g>
    </svg>
  );
}
