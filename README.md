# Biblioteca de design

Uma biblioteca digital de livros antigos de design: capas, excertos transcritos e informação sobre cada livro. Cada livro e cada excerto tem um link próprio, com imagem de pré-visualização, para partilhar com colegas.

O site é estático: uma pasta de ficheiros HTML que se carrega por FTP.

## Como funciona

1. **Capturar** no telemóvel, na página de captura: título, autor, foto da capa e fotos das páginas. Recortas o texto que interessa e o telemóvel faz uma primeira leitura (OCR). No fim, *Exportar .zip*.
2. **Enviar o zip ao Claude.** O Claude corrige a transcrição comparando com a foto, pesquisa o livro, preenche a ficha e escreve o contexto com fontes. Grava tudo em `library/books/`.
3. **Gerar o site:** `npm run build`. Cria a pasta `site/`.
4. **Publicar:** carregar o conteúdo de `site/` para o FTP.

## Primeira vez

Precisas do [Node.js](https://nodejs.org) 20 ou mais recente.

```
npm install
```

Para ver o site no teu computador, em http://localhost:4321:

```
npm run dev
```

## O domínio

Abre `library/config.json` e escreve o endereço completo onde o site vai ficar:

```json
"siteUrl": "https://teudominio.pt/biblioteca/"
```

Sem este endereço, as imagens de pré-visualização não aparecem quando partilhas um link. Enquanto não estiver definido, o build mostra um aviso.

Depois de mudar o endereço, corre `npm run build` outra vez e volta a carregar `site/`.

## A página de captura

A página de captura vive em `capture/`. Antes de a carregar para o FTP, prepara as bibliotecas de OCR (cerca de 30 MB, só é preciso uma vez):

```
npm run capture
```

Depois carrega a pasta `capture/` inteira para dentro da pasta do site no FTP, com um nome difícil de adivinhar, por exemplo `biblioteca/captura-k7x2/`. Guarda esse endereço no ecrã principal do telemóvel.

- A página não aparece em motores de busca e não tem ligação a partir do site.
- O trabalho fica guardado no telemóvel até exportares. Podes fechar o separador sem perder nada.
- Se a página estiver dentro da pasta do site, sugere os títulos dos livros que já existem.

Atenção: `npm run build` apaga e recria a pasta `site/` no teu computador. A página de captura não faz parte dela; carrega-a sempre à parte.

## Estrutura de um livro

```
library/books/grid-systems-muller-brockmann-1981/
  book.md          ficha + contexto
  cover.jpg        capa
  excerpts/
    01.md          texto transcrito
    01.jpg         foto da página (opcional)
```

`book.md` começa com a ficha, entre `---`:

```
---
title: Grid Systems in Graphic Design
author: Josef Müller-Brockmann
year: 1981
publisher: Niggli
edition: 1.ª edição
isbn: 3-7212-0145-0
cover_designer: Josef Müller-Brockmann
language: Inglês / Alemão
collections: [Suíço, Tipografia]
condition: Lombada gasta, miolo em bom estado
unverified: [edition]
sources:
  - label: Wikipedia
    url: https://en.wikipedia.org/wiki/Josef_Müller-Brockmann
---
Texto livre sobre o livro.
```

Só `title` e `author` são obrigatórios. Os campos em `unverified` aparecem no site com um ponto laranja, que quer dizer "a confirmar".

Cada excerto (`excerpts/01.md`):

```
---
page: "42"
note: Uma nota tua (opcional).
image: 01.jpg
---
O texto transcrito.
```

Os livros de exemplo (`library/books/exemplo-*`) servem só para ver o site a funcionar. Apaga-os quando acrescentares os teus.

## Pré-visualizações que não atualizam

O Slack, o LinkedIn e o WhatsApp guardam a imagem de pré-visualização durante algum tempo. Se mudares uma capa ou um título:

- **LinkedIn:** cola o link no [Post Inspector](https://www.linkedin.com/post-inspector/).
- **Facebook / WhatsApp:** cola o link no [Sharing Debugger](https://developers.facebook.com/tools/debug/) e carrega em *Scrape Again*.
- **Slack:** acrescenta `?v=2` ao fim do link.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Gera o site e abre-o em http://localhost:4321 |
| `npm run build` | Gera o site em `site/` |
| `npm run capture` | Prepara a página de captura para carregar por FTP |
| `npm test` | Corre os testes |
