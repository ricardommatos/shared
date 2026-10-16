# The Clock Everyone Watched

O poster do relógio de parede IBM transformado num relógio a sério. Um ficheiro, só vector.

## O que faz

- Os ponteiros do SVG original marcam a hora local do visitante.
- O ponteiro dos minutos salta no impulso do minuto, com o ressalto dos relógios escravos IBM das escolas. O dos segundos varre.
- Os 60 traços do mostrador acendem um por segundo: o mostrador é a barra de progresso do minuto.
- A cada impulso o poster corta para a variante seguinte, azul → preto → ciano, sem transição.
- Os ponteiros têm sombra real (filtro SVG) e a luz segue o rato.
- Podes arrastar o ponteiro dos minutos. Ele volta sempre, com peso de mecanismo. Ninguém consegue fazer o relógio andar mais depressa.

## Controlo

- Teclas 1, 2, 3 fixam uma variante (desliga o corte automático). A reactiva.
- Arrastar no mostrador roda o ponteiro dos minutos.

## Fontes

Em `source/` estão os três SVGs originais (Frame 44, 45 e 46). O título, o mostrador, o ponteiro dos segundos e os logótipos foram extraídos do Frame 44 tal como desenhados; os ponteiros das horas e dos minutos foram redesenhados como formas rectas alinhadas ao eixo para poderem rodar. A nota de rodapé é texto vivo em IBM Plex Sans.
