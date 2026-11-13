# Pop Organize — prévia 1.0.17, build 59

APK de teste separado da versão de produção (`br.com.poporganize.app.teste`). Sem envio à Google Play. Substitui o visual de "sol" da build 58.

- Esfera do Pop como núcleo de energia: a esfera azul no centro, um equalizador circular de 72 barras finas que sobe enquanto o Pop fala, um anel de arcos segmentados girando, um anel de marcações girando ao contrário e um cometa de luz percorrendo a borda. Ciclo contínuo de 8 s, sem salto.
- Intensidade: forte com o Pop falando, média ouvindo, discreta parada. A esfera aparece ao iniciar a conversa por voz (ou com o histórico vazio). O ícone pequeno da caixa de mensagem não mudou.
- "Pop falando" é estimado pela legenda da fala que chega: o equalizador pode baixar um pouco antes do fim do áudio.

Servidor publicado na VPS às 15:07 (backup dos arquivos em `/var/www/pop-organize-sync-backup-20261113T180625Z`, build anterior em `/var/www/pop-organize/.output-before-security-20261113T180625Z`):

- Login por código de e-mail conta as tentativas erradas e bloqueia o código após 5 erros.
- Tarefa nova sem permissão é pulada (`rejectedCreations`) em vez de recusar o envio inteiro do aparelho.
- Sessões vencidas deixam de valer e saem do banco na próxima gravação.
- "Hoje" no site e no Pop usa o dia de São Paulo.
- Modo de desenvolvimento não entra mais sem login.

Validação: 88 testes Node, verificação de tipos, compilação Android e web; health público 200 após a publicação. A animação não foi conferida visualmente no aparelho.

Build 59 instalado pelo USB por cima da 58, mantendo os dados.
