# Pop no Android — voz masculina

## Revisão atual — build 57 e consultas da empresa

- Filtros próprios por pessoa, setor, grupo, prioridade e intervalo de datas, além do título/descrição. Busca normaliza acentos, aceita nomes parciais e pequenas diferenças de transcrição de nomes; retorna os nomes resolvidos e os filtros não reconhecidos.
- Busca textual também considera responsáveis e destinos. Consultas por título priorizam correspondências exatas e datas recentes; perguntas por uma tarefa nomeada, sem restrição explícita, procuram em qualquer data e status.
- Instruções de conversa compartilhadas entre texto e voz preservam pessoa, período e critérios em continuações como “e amanhã?”, “só as urgentes” e “quem é responsável dessa?”. Uma mudança de assunto limpa os filtros anteriores incompatíveis. Resultado vazio descreve o recorte consultado, não a inexistência de dados no sistema.
- Removidas ofertas repetidas de criar/reorganizar após consultas. O Pop responde com os detalhes já pedidos, sem pedir que o usuário descreva a tela.
- Metadados da tarefa incluem o autor real da conclusão e o horário registrado, separados do responsável. Ausência de autoria histórica permanece nula.
- Resumo de atividade se adapta ao teclado para manter o campo de mensagem e o envio acessíveis. Build 57 instalado pelo USB, preservando a versão de produção.
- Validação: 85 testes Node e tipos TypeScript; nove etapas de conversa no modelo real, incluindo mudança de assunto e recuperação de histórico antigo que dizia não ter acesso; três turnos falados (“Cíntia hoje”, “e amanhã?”, “só as urgentes”) sem perder contexto; 12 cenários da API e 38 de sincronização em memória. Consulta real encontrou a tarefa “teste” da Cintia, com data 10/11/2026 e status concluída.
- A falha genérica de chamada anteriormente relatada não apareceu nos testes de voz. Esta versão registra o código do provedor para identificar uma eventual recorrência; a causa daquela ocorrência específica ainda não foi confirmada.
- API de consultas/conversa publicada com backup `/var/www/pop-organize-sync-backup-20261113T172624Z`; ordenação por correspondência exata/recência publicada com backup `/var/www/pop-organize-sync-backup-20261113T173600Z`. Ambas passaram pela verificação de saúde. A última conferência visual por USB foi bloqueada pela revisão automática, após a instalação já ter sido confirmada; o ajuste adaptável ao teclado não recebeu essa conferência final.

## Revisão — build 56

- Removido o botão de nova conversa no topo. A esfera permanece animada, com azul e contraste ajustados à paleta do app.
- O administrador pode criar a atividade nova revisada dizendo **eu confirmo**, além do botão. A ponte nativa verifica a fala recente e explícita, impede reutilizar a mesma confirmação, exige um rascunho pronto e usa a mesma confirmação idempotente da VPS. O modelo não fornece outro rascunho nem identificador de gravação nessa ação.
- O sucesso só é anunciado depois de `created=true` da VPS. Sugestões para tarefas existentes continuam sem edição, conclusão, cancelamento ou exclusão.
- Pedir para encerrar/desligar a chamada interrompe o microfone inclusive durante uma consulta. Respostas tardias da consulta são descartadas; encerrar não conclui tarefas.
- Resumo mostra destino (grupo, setor, empresa ou pessoa), responsável, prioridade nas cores do app, descrição, início/término, data, recorrência, revisão, checklist e etiquetas quando definidos.
- Backend de voz com raciocínio reduzido e respostas curtas; chat permite consultas independentes em paralelo. Confirmações e ações dependentes continuam em sequência. Referência: [redução de latência em GPT-Live](https://developers.openai.com/api/docs/guides/live-delegation#reduce-backend-latency).
- Consulta diária sem tarefas pessoais inclui os grupos/setores na mesma busca e na mesma data, evitando uma rodada adicional do modelo. Resultados de voz são resumidos e limitados a 24 KB para o canal WebRTC, preservando totais reais.
- Falhas do provedor registram código e mensagem técnica no diagnóstico local. Eventos de erro recebidos após o encerramento são descartados.
- Validação: 81 testes Node, verificação de tipos, dois testes Kotlin da política de confirmação executados pelo JUnit, e testes com áudio sintético na API para confirmar a criação e encerrar a chamada. Os testes de áudio simulam o retorno de criação, sem gravar tarefas reais.
- Build 56 inicial instalado pelo USB. A revisão de diagnóstico posterior foi compilada e assinada, mas ainda não reinstalada porque o USB desconectou. A falha genérica relatada no aparelho não foi reproduzida no teste de voz com consulta real; o diagnóstico específico permanece pendente da conexão do aparelho.
- API revisada publicada com backup `/var/www/pop-organize-sync-backup-20261113T170113Z`, saúde HTTP 200 e acesso sem autenticação bloqueado com 401. O teste de voz consultou tarefas pessoais e contexto de grupos/setores com uma única chamada à ferramenta e filtro da mesma data.

## Revisão — build 55

- Pop centralizado na barra inferior, com ícone e nome azuis, disponível somente para administradores de uma empresa. O bloqueio é conferido também na API Android e nas funções existentes do site.
- Chat de texto como tela inicial, com compositor arredondado, anexos e botão animado de voz quando o campo está vazio. O transporte de áudio só carrega ao iniciar uma chamada. Legendas continuam opcionais.
- Análise de imagens, PDF, textos e documentos compatíveis, até três arquivos, 5 MB por arquivo e 8 MB no total. HTML é tratado como documento; scripts e macros não são executados. Os arquivos não são anexados automaticamente à atividade criada.
- Histórico local de texto por sessão/espaço e contexto recente compartilhado com a chamada. Arquivos precisam ser selecionados novamente após reabrir o aplicativo.
- Consultas de tarefas reais, inclusive “minhas tarefas hoje”, com horário, prioridade e sugestões de organização. Dados administrativos incluem equipe, setores, grupos, permissões, convites, atrasos por setor e conclusões por pessoa na empresa selecionada.
- Quando não há tarefas pessoais para hoje, consulta também os grupos e setores vinculados ao usuário. Mostra esse contexto separadamente, com horários e responsáveis, sem transformar tarefas dos colegas em atribuições pessoais. Se não há vínculo cadastrado, informa isso.
- Rankings usam `completedById`, nunca presumem que o responsável foi quem concluiu. Registros antigos sem autoria ficam separados. Contagem de conclusões não representa avaliação de produtividade.
- **O Pop apenas cria e consulta.** Novas atividades dependem de **Confirmar e criar**. Para atividades existentes, apresenta sugestões com **Copiar sugestão**; não edita, conclui, reabre, cancela nem exclui. Não existe ação de atualização na API do Pop nem na ponte de voz.
- Limite de corpo HTTP, validação dos arquivos, respostas estruturadas, prazo de atendimento das chamadas ao modelo e confirmação idempotente preservados.
- Esfera SVG com camadas nativas vetoriais, luzes azuis em movimento contínuo e controles de voz uniformes. A animação usa transformações de camadas, sem carregar WebView ou fazer chamadas à IA. Campo de texto e teclado alinhados aos botões de anexo e envio; novas mensagens acompanham a rolagem.
- Validação: 74 testes locais; 12 cenários da API e 38 de sincronização sem gravações persistentes; 10 consultas ao modelo com texto, tarefas e arquivos, mais o cenário de consulta aos grupos/setores quando não há tarefas pessoais; áudio sintético para preparar uma atividade e consultar tarefas pessoais com histórico. A consulta de indicadores de SAO FRANCISCO correspondeu aos totais reais do banco.
- API publicada com backup `/var/www/pop-organize-sync-backup-20261113T160928Z` e saúde HTTP 200. Requisições sem autenticação retornam 401. A prévia continua separada da versão de produção da Google Play.
- Consulta contextual de grupos/setores publicada com backup `/var/www/pop-organize-sync-backup-20261113T162025Z`. No aparelho, a conta conectada recebeu o resultado de três tarefas nos grupos/setor vinculados, separado das atribuições pessoais.

As seções abaixo registram as revisões anteriores.

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
