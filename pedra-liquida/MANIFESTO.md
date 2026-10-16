# Pedra Líquida

*Manifesto de um movimento generativo com uma só obra, por enquanto.*

## Filosofia

A pedra não é um objecto, é um estado. Em Lisboa pisamos todos os dias a mesma matéria em duas cores, calcário e basalto, cortada à mão e assente em ondas no Rossio como se a praça ainda fosse mar. A Pedra Líquida parte daí: um único volume que atravessa quatro estados sem nunca deixar de ser a mesma substância. Fechada, dissolvida, perfurada, assente. A beleza não está em nenhum dos quatro, está na passagem.

## Expressão algorítmica

Nada aqui é malha nem geometria. A forma existe apenas como uma função de distância assinada, e a câmara descobre-a por raymarching, pixel a pixel, passo a passo, até tocar a superfície. Quatro campos de distância são escritos à mão: um monólito torcido com uma face mordida por uma esfera, uma maré de seis gotas em órbitas de Lissajous unidas por um mínimo suave, uma casca de gyroid cortada a uma esfera, e uma laje de pequenas pedras repetidas no espaço e deslocadas pela onda do Rossio. O scroll é a maré: interpola os quatro campos e, a meio de cada passagem, injecta ruído fractal na distância para que a matéria pareça hesitar antes de decidir.

## Luz como material

A sofisticação vem da luz, não da forma. Uma luz-chave quente com sombras suaves por marcha de penumbra, um céu hemisférico frio, oclusão ambiente por cinco amostras ao longo da normal, especular GGX, e, no calcário, luz envolvente que simula a translucidez da pedra. Nas arestas, um brilho de película fina cuja tonalidade depende da semente. O chão é basalto polido e reflecte a escultura com um segundo raymarch glossy. Por cima de tudo, uma pós-produção fotográfica: profundidade de campo por disco de Poisson guiada pela profundidade, aberração cromática apenas no centro nítido, grão, vinheta e tonemapping ACES.

## Semente e variação

Cada estudo tem um número. A semente alimenta um gerador determinístico de oito valores que controlam torção, proporções, posição da mordida, raios das gotas, frequência do gyroid, fase da onda e o matiz da película. O mesmo número devolve sempre a mesma pedra. A barra de espaço dissolve-a em turbulência e faz nascer outra. A variação não é aleatoriedade: é a mesma lei aplicada a outra pedra.

## Artesanato

Este algoritmo deve parecer o produto de um mestre que passou incontáveis horas a afinar cada constante: o factor de relaxamento do raymarch que muda na Calçada porque a repetição de domínio engana a distância, o limiar de impacto que cresce com a distância, a decisão de nunca estimar a normal no chão, o peso das amostras de desfoque para que o que está nítido não sangre. Cada parâmetro foi escolhido para que a execução, em tempo real, pareça inevitável. A obra não está no frame; está no processo que o produz, sessenta vezes por segundo.

---

**Stack:** Three.js r128 (quad de ecrã inteiro + render target HDR), GLSL ES 1.0, GSAP 3.12 com ScrollTrigger. Sem dependências além disso. Um ficheiro.

**Controlo:** scroll esculpe · rato inclina a câmara e a luz · espaço ou "Nova pedra" gera outra semente · "Auto" alterna a qualidade adaptativa com a resolução máxima. A semente fica no URL (`#s1234`), para voltar à mesma pedra.
