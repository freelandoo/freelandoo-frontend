# Banners de Manifestação

Coloque aqui as **30 imagens** dos banners de manifestação.

## Regras

- **Proporção:** 16:9 (recomendado 1600×900).
- **Formato:** `.png` (preferido). `.jpg`, `.jpeg` e `.webp` também funcionam,
  mas o seed do banco aponta para `.png` — se usar outro formato, ajuste a
  migration `089_manifestation_unlock_library.sql` ou renomeie para `.png`.
- **Nome do arquivo:** exatamente o `slug` da manifestação (minúsculo, sem acento).
- As imagens ficam públicas em `https://<dominio>/banners-manifestacao/<slug>.png`.
- Se um arquivo faltar, a loja **não quebra** — o card mostra um fundo gradiente
  de fallback no lugar da imagem.

## Os 30 arquivos esperados

### Motivacionais

```
prosperidade.png
resiliencia.png
ambicao.png
disciplina.png
evolucao.png
coragem.png
foco.png
vitoria.png
liberdade.png
determinacao.png
```

### Emoções

```
alegria.png
bravo.png
raiva.png
feliz.png
alegre.png
cansado.png
ansioso.png
depre.png
fome.png
carente.png
solteiro.png
apaixonado.png
confiante.png
esperancoso.png
grato.png
ousado.png
sereno.png
livre.png
calmo.png
inspirado.png
```

O catálogo (nomes, headlines, descrições, preço de 50 Poléns) é populado
automaticamente pela migration `089_manifestation_unlock_library.sql` a cada
deploy do backend — basta colocar as imagens com os nomes acima.
