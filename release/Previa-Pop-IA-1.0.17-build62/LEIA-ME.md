# Pop Organize — prévia 1.0.17, build 62

APK de teste separado da versão de produção (`br.com.poporganize.app.teste`). Sem envio à Google Play.

- Esfera azul, sem olhos, até 184 dp. Enquanto o Pop fala, cresce e diminui de forma aleatória (alvos novos a cada 90–220 ms) e as ondas de dentro aceleram e se agitam junto, como se acompanhassem a voz.
- Microfone mudo: o botão do microfone fica vermelho; a esfera continua azul e parada, sem pulsar.
- Botão Descartar no rascunho; sem o texto "Voz por IA"; mensagem de criação cita o título da tarefa.

Servidor publicado na VPS às 15:46 (build anterior em `/var/www/pop-organize/.output-before-pop-voz-20261113T184543Z`): fala devagar e com sotaque paulistano pelas instruções; recusa falada ou escrita tira o rascunho da tela; o chat reconhece a tarefa recém-criada e não abre as respostas pelas pendentes.

A publicação foi compilada fora do repositório da VPS, que continua no commit `0a2cf2c`. As mudanças de servidor (`pop-live.server.ts`, `pop-chat.server.ts`, `pop-chat-policy.ts`) precisam entrar no git antes do próximo `deploy/release.sh`; sem isso, ele recompila sem elas.

Validação: 88 testes Node, compilação web e Android, health público 200. Animação e voz não conferidas no aparelho.

Build 62 instalado pelo USB por cima da 61, mantendo os dados.
