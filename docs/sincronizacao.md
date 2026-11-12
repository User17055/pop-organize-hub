# Sincronização — revisão de 12/11/2026

## Atualizações automáticas recebidas da VPS — build 42, 12/11/2026

Removido o botão Sincronização em Mais. Com o app em primeiro plano, o Android mantém uma requisição condicional de até 25 segundos para o espaço pessoal e a empresa selecionada. Uma gravação confirmada por `mutateDatabase` ou `saveDatabase`, no site ou na API móvel, acorda as conexões pendentes. A rota revalida a sessão, o acesso ao espaço e a visibilidade das tarefas antes de responder com a nova lista. O mesmo coordenador aplica as mudanças, preservando alterações locais ainda não confirmadas e a fila de conclusão.

O canal se reconecta automaticamente após erro e fecha o socket ao sair do primeiro plano, trocar de conta ou de empresa. Há consulta de recuperação a cada dez segundos no Android e verificação de cinco segundos dentro da espera para descobrir alterações vindas de outro processo. Sem rede utilizável não existe entrega instantânea; alterações feitas offline permanecem na fila persistente e são enviadas automaticamente quando a conexão retorna. O servidor continua sendo a origem compartilhada dos dados e os recibos evitam reaplicar um envio antigo.

Servidor publicado com saúde HTTP 200, backup `/var/www/pop-organize-sync-backup-20261112T134628Z`. Passaram 14 testes Node e os 34 cenários de regressão em cópia em memória. O teste HTTP confirmou que uma conexão da Cintia permanece esperando enquanto não há alterações e recebe a conclusão do João pelo aviso de commit antes do watchdog de cinco segundos; também conferiu resposta 304 no fim da espera e recusa de sessão inválida. Zero gravações nas tarefas reais nesses testes.

Passaram 62 testes Kotlin e dois testes instrumentados no Samsung: observação de duas versões consecutivas, envio do ETag na espera seguinte, fechamento imediato do socket ao cancelar o observador e persistência/reenvio da fila após falha simulada. O transporte desses testes no aparelho era simulado, sem gravações nas tarefas reais. As rotas HTTP também passaram após a publicação, usando uma cópia em memória e conferência dos arquivos publicados contra a compilação limpa.

Build 42 instalado como atualização no Samsung conectado. A captura `.codex-temp/build42-more.png` confirmou a retirada do botão. A conta aberta u2 ficou com zero alterações sujas, comandos de conclusão, envelopes pendentes ou recusas HTTP arquivadas; cópias históricas de recuperação preservadas.

- [Baixar Pop Organize Teste — build 42](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build42.apk).
- APK `release/Pop-Organize-1.0.15-teste-build42-live-sync.apk`, 33.946.224 bytes.
- SHA-256 `882d943d6a7484ddc075e436f63fe73939466fb873d48f5af74477f09dadda57`, confirmado no download HTTPS.

## Envio automático e ordem de chegada — build 39

Regra escolhida pelo usuário: **a edição que chegar por último à VPS prevalece no mesmo campo**. O Android envia os campos realmente alterados; uma edição de título não devolve descrição, responsáveis ou conclusão antigos ao servidor. O envio de conclusão continua independente do conteúdo.

Alterações e envelopes HTTP são persistidos antes do envio. Cada envelope tem UUID e corpo imutáveis. A VPS grava alteração e recibo na mesma transação; repetir um envio após perder a resposta devolve seu recibo sem reaplicar uma edição antiga. A confirmação e o novo cache são gravados juntos no aparelho antes de retirar o envelope da fila. Uma edição feita durante o envio permanece para o próximo lote.

WorkManager envia em segundo plano, recupera filas periodicamente e reage ao retorno de uma conexão validada. Com o app aberto, o worker acorda o coordenador da tela para evitar duas cópias concorrentes do cache. A entrega depende de rede utilizável, sessão e permissões válidas e da execução permitida pelo Android; recusas reais são informadas em Sincronização. Cópias históricas sem baseline permanecem preservadas e não são reenviadas automaticamente.

Servidor publicado com backup `/var/www/pop-organize-sync-backup-20261112T002507Z` e saúde HTTP 200. Passaram 12 testes Node, 34 cenários de integração e a validação das rotas HTTP com recibos, ordem de chegada, reenvio e visibilidade entre João e Cintia. Esses cenários usaram banco clonado em memória, com zero gravações nas tarefas reais.

Passaram 62 testes Kotlin e o teste instrumentado no Samsung conectado: falha de conexão simulada, reenvio do mesmo envelope, identidade própria para a edição seguinte e restauração da fila após falha simulada na gravação. O transporte desse teste era simulado e não alterou tarefas reais. Após abrir o app atualizado, a conta u2 ficou com zero alterações sujas, zero comandos de conclusão pendentes, zero envelopes pendentes e zero recusas HTTP arquivadas. As duas cópias históricas de recuperação foram preservadas.

O teste adicional de regressão dos gestos da agenda não foi concluído: houve falha de localização da hora de exemplo e, nas tentativas seguintes, falha na injeção de toque pela automação. Isso não constitui validação do zoom neste build.

- [Baixar Pop Organize Teste — build 39](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build39.apk).
- Instalado como atualização no Samsung conectado, preservando o aplicativo e sua sessão. Pacote `br.com.poporganize.app.teste`, versão `1.0.15-teste`, build 39.
- APK: `release/Pop-Organize-1.0.15-teste-build39-durable-sync.apk`, 33.995.083 bytes.
- SHA-256: `ef30f7cacb09ce31900d9fe3387291f3fe0d66fa21d60ba8ddcb95dc4cd0747c`; conferido também no download HTTPS.

## Conclusão com envio persistente — build 26

[Baixar Pop Organize Teste — build 26](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build26.apk)

A conclusão agora é uma operação própria, gravada em fila persistente antes da animação. Um WorkManager envia essa fila independentemente da tela e do lote de conteúdo das tarefas. Falta de conexão e falhas temporárias mantêm a operação para nova tentativa; recusas de permissão aparecem em Mais → Sincronização. A fila fica separada por conta e espaço e só descarta uma operação após conferir a confirmação correspondente do servidor.

O servidor aplica a conclusão e grava sua confirmação na mesma transação MySQL. Repetir uma requisição cuja resposta se perdeu não reaplica uma conclusão antiga sobre uma reabertura posterior. O envio geral mantém o estado confirmado na origem e não usa uma cópia antiga do aparelho para desfazer a conclusão de outro colaborador. Tarefas novas são criadas antes de enviar sua conclusão.

Publicação do servidor concluída em 11/11/2026; passaram **51 testes Kotlin, 10 testes Node e 30 cenários de integração**. A rota HTTP também foi exercitada com o mesmo corpo enviado pelo Android, usando João e Cintia e a tarefa t2458 em banco clonado somente em memória, sem marcar a tarefa real. A validação física no celular do João permanece pendente porque o usuário informou estar sem o aparelho. Esta publicação não permite afirmar que todos os cenários no aparelho foram conferidos.

- APK: `release/Pop-Organize-1.0.15-teste-build26-status-sync.apk`, 33.893.815 bytes.
- SHA-256: `0a2423879f8210afd214a04e19dc76b1124a6d4536108644b2926578c40ba1aa`.
- Instalar como atualização do **Pop Organize Teste** nos aparelhos envolvidos; a assinatura e o identificador permanecem os mesmos dos builds de teste anteriores. O aplicativo original da Play Store é separado.
- Backup da publicação do servidor: `/var/www/pop-organize-sync-backup-20261111T165147Z`.

## Limpeza autorizada do histórico recorrente — SAO FRANCISCO

Em 11/11/2026, após confirmação explícita do usuário, foram removidas **1.686 ocorrências recorrentes com data até 09/11/2026**, em todos os setores do espaço c4 SAO FRANCISCO. Foram preservadas **436 tarefas sem recorrência** e as **117 tarefas existentes com data desde 10/11/2026**, sem alteração de conteúdo, data ou conclusão. Nenhum outro espaço foi alterado.

Oito séries não tinham nenhuma ocorrência restante após o corte. Para preservar sua continuidade, foram criadas suas próximas ocorrências válidas, respeitando cadência, exclusões e encerramento. Duas séries já encerradas não foram prolongadas. A simulação de geração até 11/01/2027 confirmou que o histórico eliminado não seria recriado. Os vínculos das listas foram limpos e as identificações de criações nativas excluídas foram preservadas para impedir ressurreição por reenvio.

A exclusão ocorreu em transação com backup privado das tarefas, listas e identificações de criação antes da gravação: `/var/backups/pop-organize/recurring-history-2026-11-11T18-19-20-102Z`. A leitura posterior conferiu a remoção e a igualdade das tarefas protegidas. Restaram 552 tarefas no espaço, incluindo as oito próximas ocorrências preservadas. O script de manutenção recusa anexos com blobs sem um backup específico; nenhuma ocorrência removida tinha esse tipo de anexo.

## Correção de conclusão — build 25

[Baixar Pop Organize Teste — build 25](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build25.apk)

A tarefa compartilhada do relato é **t2458**, “teste”, de **10/11/2026**, em **MED VETERINARIOS**, com responsáveis **João Victor Passareli (u24)** e **Cintia Pazini (u27)**. A primeira consulta deste atendimento confundiu essa tarefa com outra “teste” de hoje; o diagnóstico final foi refeito com a tarefa e as contas corretas.

Foi encontrada uma corrida na tela de tarefas: a marcação visual começava imediatamente, mas a alteração da lista só acontecia depois de 620 ms dentro do escopo da animação. Fechar essa tela cancelava a corrotina e podia cancelar a própria conclusão. Agora a lista e o cache persistente são atualizados antes da animação, e o envio é iniciado no escopo da aplicação, independente da tela de detalhes. A animação continua sem controlar a gravação.

O cenário João → Cintia passou com as funções publicadas e também pelo endpoint HTTP real, em um servidor temporário local com banco interceptado em memória, verificando validação do payload, autenticação, conclusão nas duas contas e invalidação dos ETags. Nenhuma conclusão foi gravada na tarefa real. Foram adicionados três testes de cancelamento/ordem de gravação; **39 testes Kotlin e 23 cenários de integração passaram**. Os 10 testes Node anteriores continuam válidos para a lógica de reconciliação não alterada.

O número do build aparece em Mais → Sincronização, e o `User-Agent` das consultas/envios de tarefas identifica a versão sem registrar tokens ou conteúdo das tarefas.

- Arquivo: `release/Pop-Organize-1.0.15-teste-build25-completion.apk`, 32.557.953 bytes.
- SHA-256: `c7771b2f380b267a710c6ac7e970b72ebd368ea00b6c7c1ea1a5d75b0f23bff5`.
- O usuário informou estar sem o celular do João. A reprodução e a conferência no aparelho continuam pendentes; a corrida corrigida não foi confirmada como a causa única do teste relatado.

## Fluxo implementado

- Uma operação por conta e espaço: captura local → envio das alterações → leitura do servidor → reconciliação → persistência.
- Um envio recusado não impede a leitura. Esse era o bloqueio observado com colaboradores que não podem criar tarefas.
- Cada espaço conserva suas listas pelo ID, inclusive quando a ordem das empresas muda. Respostas de sessões anteriores não são aplicadas.
- A versão de origem das tarefas fica persistida por conta/espaço. O aplicativo envia somente tarefas alteradas, acompanhadas dessa versão (`baseTasks`).
- O servidor compara a versão de origem dentro da transação MySQL. Campos diferentes podem ser combinados; alterações concorrentes no mesmo campo retornam 409 e não gravam parcialmente o lote.
- Exclusões são explícitas, verificam alterações concorrentes e só saem da fila quando estavam no envio confirmado. Repetir criação ou exclusão não duplica nem ressuscita tarefas.
- Dados recebidos prevalecem para permissões e identidade. Checklist e anexo vazios são remoções válidas, e não motivo para restaurar a cópia antiga.
- Respostas de sucesso sem uma lista válida não limpam dados locais. Escritas só são confirmadas após uma resposta válida com `ok: true`.
- Alterações durante uma requisição continuam pendentes sobre a nova versão aceita.
- A seleção pessoal é explícita; não depende de qual empresa ficou ativa na sessão do servidor.
- A ordem manual tem um envio explícito e uma ordem de origem. Alterar conteúdo não reordena tarefas; conflitos de ordenação também exigem revisão.
- Pastas e listas têm cache local, fila de reenvio, proteção por versão de origem e conferência da sessão/espaço antes de atualizar a tela. A conversão de IDs locais para IDs do servidor preserva os vínculos das listas com tarefas novas.
- Versão de origem, conteúdo e estado pendente são persistidos juntos, para que a morte do processo não transforme uma cópia antiga em uma edição nova.
- Novas tarefas recebem uma identificação de criação independente do número exibido pelo aparelho. Duas criações offline com o mesmo número continuam sendo tarefas distintas. O registro de criações também impede que um reenvio sem resposta ressuscite uma tarefa já excluída.
- No Android conectado, o servidor gera as ocorrências recorrentes. Concluir uma ocorrência não cria outra série local em paralelo. O modo visitante conserva a geração local.

## Revisão pelo usuário

Em **Mais → Sincronização**, é possível comparar cópias pendentes e escolher a versão do aparelho ou do servidor. A escolha local atualiza a versão de origem e faz um novo envio protegido; uma edição posterior no servidor continua produzindo conflito.

Na primeira atualização de uma instalação antiga, alterações sem versão de origem não são reenviadas cegamente. A cópia anterior fica preservada para revisão. Exclusões antigas sem origem verificável são restauradas na lista e precisam ser revistas. Rascunhos sem permissão de criação permanecem locais e não bloqueiam outras atualizações.

No módulo compartilhado usado pelo iOS, as exclusões também são separadas por espaço. Alterações offline são preservadas por proprietário ao sair da conta e só são restauradas quando esse proprietário entra novamente.

## Caso da Cintia

A conta correta é **Cintia Pazini**, u27, no espaço c4 **SAO FRANCISCO**. A API retorna a tarefa **teste**, t2458, atribuída a ela, mesmo depois de uma tentativa de criação recusada. A tarefa tem data **10/11/2026**: na agenda diária, selecionar essa data; em Tarefas, usar a visualização que inclui tarefas anteriores.

## Verificação

- Testes de reconciliação e duração em Node: `node --test scripts/test-mobile-task-sync.mjs scripts/test-task-duration.mjs`.
- Testes Kotlin: `CalendarAgendaTest`, `TaskRefreshTest`, `TaskSyncTest`, `TaskSyncWireTest`, `PopStoreSyncTest`.
- Integração com as funções compiladas do servidor: 22 cenários executados em uma cópia do banco exclusivamente em memória. Nenhuma tarefa, sessão ou permissão real foi modificada. O interceptor bloqueia qualquer chamada de escrita persistente. O roteiro é `scripts/verify-live-sync-readonly.mjs` e deve ser executado no diretório da compilação, com o ambiente do servidor carregado. Se houver chunks antigos preservados, `MOBILE_SYNC_REFERENCE_DIR` deve indicar a compilação limpa de referência; o roteiro confere os arquivos antes de importar.
- TypeScript e compilação web verificados separadamente da aplicação em execução.

Resultado final: **36 testes Kotlin, 10 testes Node e 22 cenários de integração passaram**. A validação estrutural do projeto iOS também passou. O serviço publicado respondeu com HTTP 200; as rotas de tarefas e listas continuaram exigindo autenticação.

## APK Android

[Baixar Pop Organize Teste — build 24](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build24.apk)

- Versão: `1.0.15-teste`, código `24`, pacote `br.com.poporganize.app.teste`.
- Assinatura compatível com os builds de teste anteriores; a atualização conserva a instalação existente.
- Arquivo: `release/Pop-Organize-1.0.15-teste-build24-sync.apk`, 33.828.596 bytes.
- SHA-256: `f2c303f2dd0ce2bbe9120d450cdc39e94ecc89ca2297a3ca02ee506d7d4047f1`.
- Download público verificado por checksum. A atividade de prévia está desabilitada.
- Servidor final publicado com backup de origem em `/var/www/pop-organize-sync-backup-20261111T153106Z` e versão anterior em `.output-before-sync24-20261111T153106Z`.

## Limites de distribuição

O protocolo anterior continua aceito para compatibilidade. A proteção por versão de origem exige os aplicativos novos; versões antigas não passam a enviar versões de origem por receber uma atualização do servidor.

O código compartilhado do iOS é compilado e testado em JVM neste ambiente Windows. Isso não substitui uma compilação nativa em macOS nem testes em um iPhone. A revisão Android conserva as duas visualizações de calendário já preparadas: Padrão e Agenda de horas.

Os testes automatizados não equivalem à validação de conectividade, suspensão e retomada no celular físico. Não foi usado emulador nesta revisão.
