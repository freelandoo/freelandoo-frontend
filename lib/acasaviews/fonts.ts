/**
 * As fontes Anton/Archivo/Caveat usadas pela seção A Casa Views já são
 * carregadas globalmente no layout raiz do Freelandoo (variáveis
 * --font-anton/--font-archivo/--font-caveat no <html>). Os helpers .casa-* em
 * casa.css referenciam essas variáveis diretamente, então não precisamos
 * reinjetar next/font aqui — `casaFontVars` vira string vazia e os componentes
 * que a concatenam na className continuam funcionando sem custo.
 */
export const casaFontVars = ""
