import { redirect } from "next/navigation"

/**
 * A seção A Casa Views foi enxugada para conter apenas os rankings ao vivo.
 * A raiz /acasaviews redireciona direto para a landing dos rankings.
 */
export default function AcasaviewsIndex() {
  redirect("/acasaviews/rankings")
}
