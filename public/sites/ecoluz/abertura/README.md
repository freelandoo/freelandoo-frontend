# A abertura em vídeo da EcoLuz

Aqui moram os quadros que a rolagem da home arrasta. Duas pastas:

    w1600/0001.webp ...   o conjunto largo (monitor)
    w900/0001.webp  ...   o conjunto estreito (celular)

**Não edite nada aqui na mão.** Quem gera é:

    node scripts/ecoluz-frames.mjs <video.mp4>

O script apaga as duas pastas, extrai os quadros, confere que os dois conjuntos
saíram com a mesma contagem e grava esse número em
`components/site-templates/ecoluz/content/frames.ts`.

## Por que os quadros ficam em `public/` e não no R2

O `matcher` do `proxy.ts` da plataforma exclui todo caminho terminado em
extensão. Então `/sites/ecoluz/abertura/...` é servido como arquivo estático nas
**três** origens em que este site responde — `freelandoo.com.br/c/ecoluz`, o
subdomínio e o domínio próprio do cliente — sem reescrita, sem CORS e sem
configuração. Eles precisam estar **no git**: é do repositório que a Vercel monta
o deploy.

## O número de quadros é uma escolha de PESO

Mais quadros = vídeo mais fluido e download maior. O script imprime o peso de
cada conjunto no fim; com 120 quadros o largo fica perto de 5 MB. Se pesar
demais, rode de novo com `--frames=90`.
