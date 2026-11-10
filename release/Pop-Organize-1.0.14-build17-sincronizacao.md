# Android 1.0.14 — build 17

Corrige a atualização de tarefas para colaboradores quando existe uma alteração local que o servidor recusa por falta de permissão.

## Diagnóstico

- A tarefa `teste` (`t2458`) da empresa SAO FRANCISCO está atribuída à conta Cintia Pazini (`u27`). A consulta do servidor inclui a tarefa e permite sua conclusão.
- Essa conta está ativa e tem `canCreateTasks: false`. Um lote contendo uma tarefa local nova é recusado com HTTP 403: “Seu grupo de permissão não pode criar tarefas.”
- O Android interrompia a busca das tarefas novas quando esse envio falhava. A atualização manual também ignorava a empresa enquanto existissem alterações locais pendentes. Isso mantinha as tarefas antigas em cache.
- O erro foi reproduzido com uma cópia em memória dos dados e o código compilado do servidor. Nenhuma tarefa, permissão ou sessão persistida foi alterada. O cache do celular da Cintia não foi inspecionado diretamente.

## Correção

- A leitura continua mesmo quando o envio de alterações locais falha.
- A seleção da empresa, a atualização manual e a atualização automática usam o mesmo fluxo.
- Alterações locais pendentes e exclusões em espera são preservadas; as permissões recebidas do servidor são atualizadas.
- Uma falha na atualização do espaço pessoal não impede a consulta da empresa.
- Respostas que já não correspondem à conta, empresa ou lista local são ignoradas.

## Validação

Cinco testes JVM passaram com JUnitCore: envio recusado com nova tarefa disponível, envio bem-sucedido, leitura sem alterações locais, falha de leitura e cancelamento. A compilação dos testes pelo Gradle passou; seu executor de testes apresentou um problema de classpath no caminho com acento, contornado pela execução direta do JUnitCore.

`assembleRelease` e `bundleRelease` concluídos com sucesso. APK com assinatura verificada pelo `apksigner`, pacote `br.com.poporganize.app`, versão `1.0.14`, código `17`.

- Play Store: `Pop-Organize-1.0.14-build17.aab`.
- APK: `Pop-Organize-1.0.14-build17.apk`.
- Mapeamento R8: `mapping-1.0.14-build17.txt`.

Os artefatos deste build precisam ser distribuídos para atualizar o aplicativo instalado. A correção não foi publicada na Play Store nem validada no aparelho da Cintia.
