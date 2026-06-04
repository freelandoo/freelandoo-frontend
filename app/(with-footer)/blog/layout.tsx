import type { ReactNode } from "react"
import "@/app/acasaviews/casa.css"

/**
 * Layout do Blog — adota a identidade visual da Casa Views (tabloide de papel:
 * paleta papel/tinta/magenta/dourado, fonte Anton display, sombras duras,
 * halftone). O tema `.casa-rank .casa-paper` fica escopado só ao /blog; o
 * resto do site segue dark.
 */
export default function BlogLayout({ children }: { children: ReactNode }) {
  return <div className="casa-rank casa-paper relative min-h-[100dvh]">{children}</div>
}
