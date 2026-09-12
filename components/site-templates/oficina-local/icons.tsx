/**
 * Conjunto de ícones inline.
 *
 * São SVGs próprios, com traço fino (1.5) e cantos retos, para casar com a
 * estética do banner — e para não carregar uma biblioteca inteira de ícones
 * numa página que usa doze deles. Traço herda `currentColor`.
 */

type P = React.SVGProps<SVGSVGElement>;

function Svg({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...p}
    >
      {children}
    </svg>
  );
}

export const IconFlame = (p: P) => (
  <Svg {...p}>
    <path d="M12 3c.6 3.1-1.2 4.3-2.6 5.7C7.8 10.3 7 11.7 7 13.6A5 5 0 0 0 12 19a5 5 0 0 0 5-5.4c0-2.2-1.2-3.6-2.4-5.1" />
    <path d="M12 19a2.4 2.4 0 0 0 2.4-2.6c0-1.3-1-2-1.6-3.1-.7 1-2 1.6-2 3.2A2.3 2.3 0 0 0 12 19Z" />
  </Svg>
);

export const IconBurner = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7" />
  </Svg>
);

export const IconWrench = (p: P) => (
  <Svg {...p}>
    <path d="M15.4 3.6a5 5 0 0 0-5.9 6.4L3.6 15.9a2 2 0 1 0 2.8 2.8l5.9-5.9a5 5 0 0 0 6.4-5.9l-2.8 2.8-2.5-.7-.7-2.5 2.7-2.9Z" />
  </Svg>
);

/** Fogão de piso visto de frente: mesa com quatro bocas + porta do forno. */
export const IconRefit = (p: P) => (
  <Svg {...p}>
    {/* mesa */}
    <path d="M3.2 4.2h17.6v4.2H3.2z" />
    <circle cx="7.4" cy="6.3" r="1.05" />
    <circle cx="11.6" cy="6.3" r="1.05" />
    <circle cx="15.8" cy="6.3" r="1.05" />
    {/* corpo e porta do forno */}
    <path d="M3.2 8.4h17.6v11.4H3.2z" />
    <path d="M5.4 11.2h13.2v6.6H5.4z" />
    <path d="M6.9 13.1h9.6" />
    {/* pés */}
    <path d="M5 19.8v1.4M19 19.8v1.4" />
  </Svg>
);

export const IconIndustrial = (p: P) => (
  <Svg {...p}>
    <path d="M2.8 20.2V9.4l5 3V9.4l5 3V9.4l5 3V4.6h3.4v15.6z" />
    <path d="M2.8 20.2h18.4" />
  </Svg>
);

export const IconSpray = (p: P) => (
  <Svg {...p}>
    <path d="M9 8.5h5.5v11.7H9z" />
    <path d="M10.3 8.5V5.9h2.9v2.6" />
    <path d="M17.4 5.2h2.2M17.4 8.4h2.2M17.4 11.6h2.2" />
    <path d="M9 12.7h5.5" />
  </Svg>
);

export const IconGriddle = (p: P) => (
  <Svg {...p}>
    <path d="M2.8 10.6h18.4v3.1H2.8z" />
    <path d="M5.2 13.7v4.1M18.8 13.7v4.1" />
    <path d="M6.6 7.4c0-1.2 1.2-1.2 1.2-2.4M11.4 7.4c0-1.2 1.2-1.2 1.2-2.4M16.2 7.4c0-1.2 1.2-1.2 1.2-2.4" />
  </Svg>
);

export const IconInstall = (p: P) => (
  <Svg {...p}>
    <path d="M4 20.3V8.1l8-4.4 8 4.4v12.2z" />
    <path d="M9.4 20.3v-6.1h5.2v6.1" />
    <circle cx="12" cy="10.2" r="1.5" />
  </Svg>
);

export const IconPhone = (p: P) => (
  <Svg {...p}>
    <path d="M6.2 3.6h3.1l1.6 4-2 1.4a11.4 11.4 0 0 0 5.1 5.1l1.4-2 4 1.6v3.1a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.2 5.8a2 2 0 0 1 2-2.2Z" />
  </Svg>
);

export const IconWhatsapp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2.1 22l5.36-1.4a9.83 9.83 0 0 0 4.58 1.15h.01c5.43 0 9.84-4.4 9.84-9.84 0-2.63-1.03-5.1-2.89-6.96A9.77 9.77 0 0 0 12.04 2Zm0 17.92h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.18.83.85-3.1-.2-.32a8.14 8.14 0 0 1-1.25-4.37c0-4.51 3.68-8.18 8.2-8.18a8.13 8.13 0 0 1 5.78 2.4 8.1 8.1 0 0 1 2.4 5.78c0 4.52-3.68 8.28-8.13 8.28Zm4.49-6.13c-.24-.13-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12s-.63.8-.77.96c-.14.17-.28.19-.52.06a6.7 6.7 0 0 1-1.97-1.21 7.4 7.4 0 0 1-1.36-1.7c-.14-.24-.02-.37.1-.5.11-.1.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.13-.55-1.33-.76-1.82-.2-.47-.4-.4-.55-.41h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.85 2.03c0 1.2.87 2.35.99 2.51.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.45-.6 1.65-1.17.2-.58.2-1.07.14-1.17-.06-.11-.22-.17-.46-.3Z" />
  </svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
  </Svg>
);

export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M4 12h15M13.2 6.2 19 12l-5.8 5.8" />
  </Svg>
);

export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 6.8V12l3.4 2" />
  </Svg>
);

export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21.2s6.6-5.5 6.6-10.4A6.6 6.6 0 0 0 5.4 10.8C5.4 15.7 12 21.2 12 21.2Z" />
    <circle cx="12" cy="10.6" r="2.5" />
  </Svg>
);

export const IconCard = (p: P) => (
  <Svg {...p}>
    <path d="M2.8 5.6h18.4v12.8H2.8z" />
    <path d="M2.8 9.8h18.4M6 14.6h3.6" />
  </Svg>
);

export const IconWifi = (p: P) => (
  <Svg {...p}>
    <path d="M2.6 9.1a13.4 13.4 0 0 1 18.8 0M5.9 12.6a8.7 8.7 0 0 1 12.2 0M9.2 16a4 4 0 0 1 5.6 0" />
    <path d="M12 19.4h.01" strokeWidth={2.2} />
  </Svg>
);

export const IconPark = (p: P) => (
  <Svg {...p}>
    <path d="M3.6 3.6h16.8v16.8H3.6z" />
    <path d="M9.4 16.6V7.6h3.2a2.9 2.9 0 0 1 0 5.8H9.4" />
  </Svg>
);

export const IconStar = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <path d="m12 2.8 2.86 5.8 6.4.93-4.63 4.51 1.1 6.37L12 17.4l-5.73 3.01 1.1-6.37-4.63-4.5 6.4-.94L12 2.8Z" />
  </svg>
);

export const IconQuote = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    <path d="M9.6 5.2 7.9 8.4c1.9.2 3.2 1.7 3.2 3.6a3.6 3.6 0 0 1-7.2.1c0-1.1.3-2.2.9-3.4l2.4-4.5 2.4 1Zm9.6 0-1.7 3.2c1.9.2 3.2 1.7 3.2 3.6a3.6 3.6 0 0 1-7.2.1c0-1.1.3-2.2.9-3.4l2.4-4.5 2.4 1Z" />
  </svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.9 4.6 6v6c0 4.4 3.1 8.3 7.4 9.2 4.3-.9 7.4-4.8 7.4-9.2V6L12 2.9Z" />
    <path d="m8.8 12 2.3 2.3 4.1-4.6" />
  </Svg>
);

export const IconSpark = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.6v4.2M12 17.2v4.2M2.6 12h4.2M17.2 12h4.2" />
    <path d="m5.3 5.3 3 3M15.7 15.7l3 3M18.7 5.3l-3 3M8.3 15.7l-3 3" />
    <circle cx="12" cy="12" r="2.4" />
  </Svg>
);

export const IconGauge = (p: P) => (
  <Svg {...p}>
    <path d="M3.6 17.4a8.9 8.9 0 1 1 16.8 0" />
    <path d="m12 12.9 4-3.9" />
    <circle cx="12" cy="14" r="1.4" />
  </Svg>
);

/** Mapa usado pelas artes/cartões de serviço. */
export const SERVICE_ICONS = {
  burner: IconBurner,
  refit: IconRefit,
  industrial: IconIndustrial,
  clean: IconSpray,
  griddle: IconGriddle,
  install: IconInstall,
} as const;
