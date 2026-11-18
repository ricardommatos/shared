# C&T Stacks — trabalhar localmente no Mac

## Abrir
1. Descompacta a pasta e abre o Terminal dentro dela.
2. Corre: `python3 local/serve.py`
3. Abre no browser: http://localhost:8000
   - Ver como membro da equipa (sem editar): http://localhost:8000/?role=viewer

O macOS já traz `python3`. Se pedir para instalar as "Command Line Tools", aceita.

## Ajustar
- Tudo está num só ficheiro: **index.html** (CSS no topo, depois o HTML, depois o JavaScript).
- Grava e recarrega o browser. Não há build.
- As cores base estão no bloco `:root` no início do CSS. A cor de fundo do espaço muda-se na própria app (ícone de ajustes).

## Dados locais
- Começa com 4 pilhas e 9 imagens de exemplo.
- Tudo o que crias fica no browser (localStorage). Uploads vão para `local/_blob/`.
- Para voltar ao início: abre a consola do browser e corre `resetLocalData()`.

## Publicar outra vez
A pasta `local/` é só para testar e não vai para a versão publicada.
Quando estiveres contente, manda-me o `index.html` (ou faz push para o branch) e eu publico no mesmo link:
https://claude.ai/artifact/1NjU4zVKxuVU3zNkBUYMDH
