# Desempenho Android — build 28

Revisão de 11/11/2026 sobre o build 27, mantendo as visualizações Padrão e Agenda de horas e o envio persistente das conclusões.

- Fotos de perfil: cache compartilhado limitado a 4 MiB, com chaves SHA-256, miniaturas de até 256 pixels no maior lado e limite de 8 MiB por imagem recebida. Chamadas simultâneas da mesma foto compartilham o carregamento; a tabela de bloqueios tem tamanho fixo. A troca de pessoa na linha reinicia o estado da foto.
- Anexos: leitura do arquivo, Base64 e decodificação da prévia passam da composição da tela para `Dispatchers.IO`. A imagem mantém a redução de resolução já existente.
- Calendário Padrão: cada tarefa vira um item próprio da `LazyColumn`, com chave estável e tipo de conteúdo, permitindo compor apenas a janela visível e a antecipação do Compose.
- Agenda de horas: intervalos, distribuição dos blocos simultâneos e tarefas sem horário são reaproveitados até a lista mudar. A atualização do indicador de hora ocorre em um composable próprio, sem invalidar todos os cartões.
- Grade mensal: os indicadores de cada dia são calculados quando as tarefas mudam, em vez de filtrar listas durante cada desenho do Canvas. Continua o limite visual de 20 marcadores por dia, com pendentes primeiro.
- Entrada na conta: a migração da fila de conclusões e sua gravação em disco ocorrem em `Dispatchers.IO`.

A revisão não altera o intervalo de consulta das tarefas nem o protocolo de confirmação das conclusões. A versão anterior foi compilada como aplicativo de teste; este build também mantém a mesma assinatura e o mesmo identificador para instalação como atualização.

Não foram medidos tempo de abertura, consumo de bateria ou frames no aparelho: o usuário informou estar sem o celular e não autorizou uso de emulador. Os efeitos descritos acima são mudanças verificáveis de execução e de limites de memória; não representam um ganho percentual medido.

Validação: `:app:assembleDebug` e `:app:compileDebugUnitTestKotlin` concluídos; **51 testes Kotlin passaram**, incluindo agenda, atualização, reconciliação, conclusão, fila de envio e sincronização compartilhada. Identificador `br.com.poporganize.app.teste`, versão 28, assinatura igual à dos builds de teste anteriores.

[Baixar APK — build 28](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build28.apk). Arquivo local: `release/Pop-Organize-1.0.15-teste-build28-performance.apk`. SHA-256: `8b4852bd4e26508d1b14ef840a7020fc6aeae578e68975438868c0290bd71325`.
