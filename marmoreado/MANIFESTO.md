# Marmoreado

*Manifesto de um movimento generativo: ebru e suminagashi reescritos como função inversa.*

## Filosofia

O papel marmoreado nunca foi pintado. É tinta que flutua numa cuba de água espessa e que o marmorista empurra com gotas, estiletes e pentes até lhe parecer bem, e depois um gesto só: pousar a folha e levantar. A folha não regista pinceladas, regista uma história de deslocamentos. Esta peça parte dessa ideia radical: a imagem não é desenhada, é deduzida. Cada pixel pergunta "que tinta chegou aqui?" e para responder tem de desfazer, uma a uma e por ordem inversa, todas as gotas e todos os pentes que alguma vez tocaram a cuba.

## Expressão algorítmica

Não há partículas, não há simulação de fluido, não há estado por pixel. Há uma lista de gestos. Uma gota de raio r no centro c empurra todos os pontos para fora segundo |p−c| ↦ √(|p−c|² + r²); desfazê-la é a raiz inversa, e se o ponto cair dentro do raio, encontrou a sua tinta. Um pente é uma família de linhas paralelas que arrasta a tinta ao longo da sua direcção com um perfil em arco de coseno entre dentes; um estilete é um só lobo gaussiano; uma onda é um seno; uma espiral é uma rotação que decai com a distância a um anel. Todos têm inversa exacta, porque o deslocamento nunca altera a coordenada de que depende. O fragment shader percorre até sessenta e quatro gestos para trás por pixel, cinco vezes por pixel para encontrar as fronteiras entre tintas e escurecê-las como tinta que se acumula na margem. Quando a folha enche de gestos, a imagem é cozida numa textura e a lista recomeça em cima dela: o marmoreado de uma imagem é outra imagem, e o processo nunca acaba.

## Coreografia

Uma composição é uma semente. Dela saem a paleta, quatro tintas com pesos como numa cuba real, a disposição das gotas (ao acaso ou em espiral de girassol), os raios, e um de cinco padrões clássicos: gel-git, nonpareil, bouquet, espiral, penas. O GSAP toca a sequência como o marmorista a executaria, gota a gota, pente a pente, com as gotas a crescer e os pentes a entrar devagar, e numa só timeline, para que um salto no tempo renda sempre as gotas antes da cozedura que delas depende. O dedo interrompe a qualquer momento: tocar pinga, arrastar penteia, e o que se desfaz em tempo real é a mesma matemática.

## Artesanato

Este algoritmo deve parecer o produto de um mestre que afinou cada constante durante incontáveis horas: a amplitude de cada pente nunca excede o espaçamento dos dentes, porque é isso que separa um arco de uma serrilha; o perfil do pente é liso onde o estilete é pontiagudo; a área de tinta pousada excede a área da folha em quinze a quarenta por cento, porque uma folha com papel à vista é uma folha a meio; a cor das fronteiras é a própria tinta, mais escura, e não um contorno. O papel tem fibra em duas direcções, a tinta tem grão de pigmento, e a folha respira com uma onda imperceptível para nunca parecer impressa. A beleza está no processo que a produz, sessenta vezes por segundo, e em cada gesto que o utilizador acrescenta ao fim da lista.

---

**Stack:** Three.js r128 (quad de ecrã inteiro + dois render targets para a cozedura), GLSL ES 1.0, GSAP 3.12. Um ficheiro.

**Controlo:** toca para pingar · arrasta para pentear (Pente alterna entre várias pontas e estilete, tecla C) · teclas 1 a 8 escolhem a tinta · espaço ou "Nova composição" gera outra semente · Limpar deixa só o papel · S guarda PNG quando o ficheiro é aberto directamente no browser. A semente fica no URL (`#s1234`).
