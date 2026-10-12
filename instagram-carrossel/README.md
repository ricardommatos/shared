# Extrator de Carrosséis do Instagram

Uma pequena app que corre no teu Mac. Colas o link de um post do Instagram
e recebes todas as imagens do carrossel na resolução original, numeradas
pela ordem em que aparecem (`01.jpg`, `02.jpg`, …).

## Como usar

1. Descarrega esta pasta (`instagram-carrossel`) para o teu Mac.
2. Faz duplo clique em **Abrir Extrator.command**.
   - Na primeira vez o macOS pode bloquear o ficheiro. Nesse caso, clica
     com o botão direito › **Abrir** › **Abrir**. Só tens de fazer isto uma vez.
   - A primeira vez demora um pouco porque instala o que é preciso.
3. Abre-se uma página no browser. Cola o link do post, escolhe o browser
   onde tens sessão iniciada no Instagram e clica **Extrair**.
4. As imagens aparecem numa grelha. Podes guardar uma a uma, descarregar
   tudo num `.zip` ou abrir a pasta no Finder.

As imagens ficam em **Transferências › Instagram › _código-do-post_**.

Para fechar a app, fecha a janela do Terminal.

## Notas

- **Tens de ter sessão iniciada no Instagram** no browser que escolhes.
  A app usa essa sessão para pedir as imagens, tal como se estivesses a
  vê-las. Também funciona com contas privadas que segues.
- **Safari:** o macOS protege os cookies do Safari. Se der erro, vai a
  Definições do Sistema › Privacidade e Segurança › Acesso total ao disco
  e ativa o **Terminal**. Com o Chrome isto não é preciso.
- Funciona também com reels (descarrega o vídeo).
- Cada vez que abres a app, a ferramenta que fala com o Instagram
  (`gallery-dl`) é atualizada automaticamente, para continuar a funcionar
  quando o Instagram muda.
- Usa para referências, moodboards e conteúdo próprio ou de clientes.
  Republicar imagens de terceiros requer autorização.
