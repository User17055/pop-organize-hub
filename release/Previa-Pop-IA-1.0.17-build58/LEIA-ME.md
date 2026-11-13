# Pop Organize — prévia 1.0.17, build 58

APK de teste separado da versão de produção (`br.com.poporganize.app.teste`). Sem envio à Google Play. Tudo da build 57, mais:

- Esfera do Pop maior, como um sol de fogo azul: três camadas de labaredas animadas e brilho em volta. As labaredas sobem e a esfera pulsa enquanto o Pop fala; ficam médias ouvindo e calmas parado. Encolhe quando falta altura (teclado ou rascunho na tela). O ícone pequeno da caixa de mensagem não mudou.
- "Pop falando" é estimado pela legenda da fala que chega: a animação pode baixar um pouco antes do fim do áudio.

Correções do servidor feitas junto, **ainda não publicadas na VPS** (valem só depois do deploy):

- Login por código de e-mail: tentativas erradas passam a ser contadas; o código é bloqueado após 5 erros.
- Envio do aplicativo com tarefa nova sem permissão não é mais recusado inteiro; só essa tarefa é pulada (`rejectedCreations`).
- Sessões vencidas deixam de valer na API do aplicativo e são removidas do banco.
- "Hoje" no site e no Pop usa o dia de São Paulo, igual ao aplicativo.
- Modo de desenvolvimento não entra mais sem login.

Validação: 88 testes Node (3 novos em `scripts/test-mobile-api.mjs`), verificação de tipos e compilação Android. A animação não foi conferida visualmente no aparelho.

Build 58 instalado pelo USB por cima da 57, mantendo os dados.
