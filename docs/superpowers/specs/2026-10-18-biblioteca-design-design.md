# Biblioteca de Design — documento de design

Data: 2026-10-18
Estado: para revisão

## 1. Objetivo

Uma biblioteca digital dos livros antigos de design do Ricardo. Para cada livro: a capa, excertos transcritos a partir de fotografias, e informação sobre o livro (ficha + contexto) recolhida pelo Claude. Cada livro e cada excerto tem um link próprio, partilhável com colegas, que mostra **sempre** uma imagem de pré-visualização.

**Sucesso quando:**
- Acrescentar um livro com capa e 2–3 excertos leva poucos minutos ao Ricardo (captura no telemóvel).
- Um link colado no Slack, WhatsApp, iMessage, LinkedIn ou email mostra a imagem de partilha correta.
- O site corre em qualquer alojamento FTP, sem servidor nem base de dados.

**Pressupostos (confirmados na conversa):**
- Só o Ricardo acrescenta conteúdo; os colegas apenas leem.
- Alojamento: FTP do Ricardo, site estático.
- Fluxo misto: captura numa página web no telemóvel, enriquecimento feito pelo Claude.
- Referência visual: Atlas for Mac (atlasformac.com).
- Domínio ainda desconhecido: fica num único valor de configuração.

**Fora da v1:** pesquisa avançada, comentários, contas de utilizador, edição no browser, upload automático por FTP.

## 2. Linguagem visual (a partir do Atlas)

- Grotesca neutra: **Inter**, alojada no próprio site.
- Títulos em duas tonalidades: primeira frase em preto (`#1a1a1a`), continuação em cinza claro (`#c4c4c4`).
- Paleta quase só de brancos e cinzas: fundo `#ffffff`, superfícies `#f4f4f4`, linhas `#e8e8e8`, texto secundário `#8a8a8a`. A cor vem das capas.
- Capas sobre tiles cinza suaves, cantos levemente arredondados.
- Botões e segmentados em *pill*; botão primário preto, secundário cinza claro.
- Muito espaço em branco, sem decoração.
- Modo escuro via `prefers-color-scheme` (mesma lógica, valores invertidos).

## 3. Dados

Cada livro é uma pasta em `library/books/<slug>/`:

```
library/
  config.json            ← { "siteUrl", "title", "tagline", "owner" }
  books/
    <slug>/
      book.md
      cover.jpg
      excerpts/
        01.md
        01.jpg           (opcional)
```

`slug` = `titulo-autor-ano` em minúsculas, sem acentos, com hífens.

### `book.md`

Front matter YAML + corpo Markdown.

| Campo | Tipo | Obrigatório |
|---|---|---|
| `title` | texto | sim |
| `author` | texto ou lista | sim |
| `year` | número | não |
| `publisher` | texto | não |
| `edition` | texto | não |
| `isbn` | texto | não |
| `cover_designer` | texto | não |
| `language` | texto | não |
| `collections` | lista de etiquetas | não |
| `condition` | texto (estado do exemplar do Ricardo) | não |
| `unverified` | lista de nomes de campos ainda por confirmar | não |
| `sources` | lista de `{ label, url }` | não |

Corpo: descrição e contexto. Afirmações sem fonte confirmada são marcadas no texto com `(a confirmar)` e os campos correspondentes listados em `unverified`; o site mostra-os com um indicador discreto.

### `excerpts/NN.md`

Front matter: `page` (texto, ex. `42` ou `xii`), `note` (texto, opcional), `image` (nome do ficheiro, opcional). Corpo: o texto transcrito.

### Validação

O gerador falha com mensagem clara (livro + campo) quando: falta `title`/`author`, falta `cover.jpg`, ou um excerto tem corpo vazio. Campos desconhecidos geram aviso, não erro.

## 4. Fluxo

1. **Capturar** — página de captura no telemóvel → exporta `<slug>.zip` com a mesma estrutura de pastas da secção 3 (com o texto do OCR como rascunho).
2. **Enriquecer** — o Ricardo envia o zip ao Claude; o Claude corrige a transcrição comparando com a foto, pesquisa o livro, preenche a ficha, escreve o contexto com fontes, e grava em `library/books/`.
3. **Gerar** — `npm run build` → pasta `site/`.
4. **Publicar** — o Ricardo carrega `site/` por FTP.

## 5. Site público

Gerado em `site/`. URLs limpos, uma pasta por página (`index.html`), para funcionar em qualquer FTP:

- `/` — biblioteca
- `/c/<etiqueta>/` — coleção
- `/excertos/` — todos os excertos
- `/<slug>/` — livro
- `/<slug>/<NN>/` — excerto

### Biblioteca
- Topo: nome da biblioteca + frase em duas tonalidades (de `config.json`).
- Barra lateral: Todos, coleções com contadores, Excertos. Em ecrã estreito passa a fila horizontal de etiquetas deslizante.
- Grelha de capas sobre tiles cinza, título e ano por baixo. Segmentado *Grelha / Lista* (preferência guardada no browser, opcional).

### Livro
- Título; linha cinza *Autor · Ano · Editora*.
- Ações à direita: *Partilhar* (Web Share API no telemóvel, copiar link no desktop) e *ⓘ* (abre a ficha completa).
- Capa grande centrada sobre cinza.
- Contexto, ficha em duas colunas, fontes.
- Lista de excertos (primeiras linhas + página), cada um ligado à sua página.

### Excerto
- Texto como citação, em tamanho de leitura.
- *Título do livro, p. NN* com ligação ao livro; nota do Ricardo se existir.
- "Ver original" mostra a foto da página, se existir.
- *Partilhar*.

### Meta tags (todas as páginas)
`<title>`, `description`, `og:title`, `og:description`, `og:image` (URL absoluto a partir de `siteUrl`), `og:image:width=1200`, `og:image:height=630`, `og:url`, `og:type`, `twitter:card=summary_large_image`.

## 6. Imagens de partilha (1200 × 630 PNG)

Geradas no build com **Satori** (HTML/CSS → SVG) e **@resvg/resvg-js** (SVG → PNG), com a Inter. Guardadas ao lado de cada página como `og.png`.

- **Livro:** fundo `#f4f4f4`; capa à esquerda com sombra suave, quase toda a altura; à direita, alinhado em baixo: título em preto, *Autor · Ano* em cinza, nome da biblioteca pequeno.
- **Excerto:** fundo branco; citação grande cortada a ~4 linhas com "…"; em baixo, miniatura da capa, *Título, p. NN*, nome da biblioteca.
- **Biblioteca e coleções:** mosaico das primeiras capas + nome da biblioteca/coleção.

## 7. Página de captura

Ficheiro único `capture/index.html` (+ JS), servido à parte do site público (não incluído em `site/`, ou publicado num caminho não ligado).

- Passo 1 — Livro: escolher existente (lista de `library/index.json` se disponível) ou criar novo (título + autor).
- Passo 2 — Capa: `<input type="file" accept="image/*" capture="environment">`.
- Passo 3 — Excertos: foto → recorte com o dedo → OCR com **Tesseract.js** (`por+eng`) → texto editável + página + nota.
- Trabalho guardado em IndexedDB (sobrevive a fechar o separador).
- *Exportar .zip* com **JSZip**, na estrutura da secção 3.
- Imagens redimensionadas no telemóvel para máx. 2400 px no lado maior antes de guardar.

## 8. Parte técnica

- Node 20+, sem framework de site. Dependências: `gray-matter`, `marked`, `satori`, `@resvg/resvg-js`, `sharp`.
- `npm run build` — lê `library/`, valida, gera HTML, imagens reduzidas (grelha 600 px, detalhe 1600 px, WebP + JPG) e `og.png`.
- `npm run dev` — build + servidor local para ver o site.
- `npm test` — testes do gerador.
- CSS num ficheiro único com tokens em `:root`.

## 9. Testes

- Unitários: parse de `book.md`/excertos, criação de slugs, validação (casos com campos em falta).
- Sobre o site gerado a partir de uma biblioteca de exemplo:
  - cada página tem `og:image` com URL absoluto que começa por `siteUrl`;
  - cada `og.png` existe e mede 1200×630;
  - nenhum link interno está partido.
- Captura: teste manual no telemóvel (foto → recorte → OCR → exportar → zip abre e o build aceita-o).

## 10. Riscos

- **Qualidade do OCR em livros antigos** (papel amarelado, tipografia invulgar): o OCR do telemóvel é só rascunho; a transcrição final é revista pelo Claude contra a foto.
- **Cache das pré-visualizações**: Slack/LinkedIn guardam a imagem; uma alteração pode demorar a aparecer. Documentar como forçar atualização.
- **Direitos de autor**: excertos curtos com referência são a prática habitual; as páginas não são indexadas por motores de busca (`noindex` por omissão, configurável).
