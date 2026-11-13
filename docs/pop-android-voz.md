# Pop no Android — voz masculina

Primeira integração na versão **1.0.17-teste, build 53**. Os artefatos anteriores de produção não foram substituídos.

## Implementação

- Tela nativa Compose com acesso pelo botão Pop, chamada, microfone, transcrição e confirmação de tarefas.
- GPT-Live (`gpt-live-1`), voz **Tempo**, masculina brasileira. Backend de tarefas `gpt-6-luna`, configurável por `OPENAI_POP_BACKEND_MODEL`.
- WebRTC em um asset local restrito do Android System WebView. A interface é nativa; o asset transporta áudio e eventos. Não abre o site nem recebe token de login ou chave OpenAI.
- `POST /api/mobile/pop` autentica o token do app, confere o espaço e a permissão `tasks.create`, negocia a conexão na VPS e valida rascunhos. O backend de voz não tem ferramenta de criação automática.
- A confirmação usa a mesma política de cadastro do site (`createTaskInWorkspace`). O recibo e a criação são gravados na mesma transação. Repetir a confirmação não duplica nem recria uma tarefa posteriormente excluída.
- A ponte JavaScript aceita somente conexão e preparação. Criar depende do botão nativo. A permissão de captura é limitada ao microfone da origem local do asset.
- Captura encerrada ao sair da chamada ou colocar o app em segundo plano. A chamada tem limite de 15 minutos no cliente. O transporte aguarda o fechamento da sessão por até oito segundos antes da liberação final.
- Identidade e voz do fluxo Realtime existente do site também passaram para o masculino (Cedar). **A migração de API para GPT-Live desta entrega é do Android.**

## Custos e limites

GPT-Live cobra pela duração da sessão, além do modelo de backend. Reduzir tokens do backend não elimina o custo do tempo da chamada. A integração não constitui um sistema comercial de franquias ou cobrança: existem limites de requisições por usuário e encerramento no cliente, mas cotas comerciais persistentes e limites de duração impostos pelo servidor ainda precisam ser implementados antes da oferta em planos.

## Validação

- Compilação e instalação no Samsung conectado por USB: build 53.
- Tela conferida no aparelho; renderização do transporte local corrigida para não cobrir a interface.
- Usuário confirmou que ouviu a voz masculina respondendo no celular.
- 55 testes Node existentes e novos passaram, além da verificação de tipos e compilação web.
- Oito cenários da API de Pop, incluindo autenticação, escopo, horário, duração, checklist e idempotência, passaram em memória sem gravações persistentes.
- 38 cenários de sincronização passaram em memória.
- Teste de áudio sintético na API GPT-Live: entrada falada, transcrições, saída de áudio com Tempo, delegação e rascunho às 09:00 com 30 minutos; sessão encerrada com confirmação, sem criar tarefas reais.
- Endpoint publicado na VPS, saúde pública HTTP 200 e requisição sem autenticação HTTP 401.

A instalação é de teste. Não foi publicado um novo AAB na Google Play. A sensação de conversa, interrupções em ambientes com ruído e custo de uso prolongado devem continuar sendo avaliados com chamadas reais.

Referências: [sessões e vozes GPT-Live](https://developers.openai.com/api/docs/guides/live-conversations), [WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live), [delegação](https://developers.openai.com/api/docs/guides/live-delegation).

## Revisão — build 54

- Acesso integrado à barra inferior, sem botão flutuante sobre as atividades.
- Tela de voz com animação discreta e abertura da chamada ao entrar. Legendas opcionais pelo controle no topo; preferência guardada no aparelho, desligada por padrão.
- Tom mais alegre, simpático e natural, preservando respostas curtas.
- Resumo da atividade com responsável, data e campos **Início** e **Até**. Esses campos abrem o seletor de horário já usado pelo app; a data abre o calendário existente. Tarefas sem duração não recebem um término inventado.
- Corrigido o evento enviado ao GPT-Live após a criação: `session.instructions.append` exige `content`, não `text`. O evento anterior podia produzir erro na voz depois de a VPS já ter salvo a tarefa.
- Confirmação de criação separada dos avisos de áudio e da atualização da lista. Após sucesso da VPS, falhas desses avisos não viram falhas de cadastro.
- Se a resposta da criação se perder, o aparelho preserva o mesmo identificador e o mesmo rascunho, inclusive ao reabrir a tela. **Verificar criação** reutiliza esse pedido para impedir duplicações. Recusas definitivas de validação permitem revisar os dados.
- 57 testes Node passaram. O teste com áudio na API inclui o evento sintético de confirmação com `content`, sem erros de protocolo e sem gravações reais de tarefas. Oito cenários da API de Pop e 38 de sincronização foram repetidos após a publicação em memória isolada.
- API publicada com backup em `/var/www/pop-organize-sync-backup-20261113T144557Z`.
- Build 54 instalado pelo USB e assinatura verificada. Barra inferior e tela de voz conferidas no aparelho; observado o estado **Atividade criada com sucesso** sem o erro anterior. A inspeção solicitada do resumo de horários não foi concluída: na leitura seguinte, o aparelho já exibia a lista de tarefas.
