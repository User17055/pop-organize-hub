# Pop Organize teste build 67

Atualização de 15/11/2026 que retira os recursos acrescentados de modelos de rotina, impedimentos, Estou travado, resolução de impedimentos e passagem de turno. As telas, os atalhos, os selos e os contratos de API dessas funcionalidades foram retirados.

Preservados o cadastro de tarefas, a repetição existente e os dados do app. As alterações de voz que já estavam no projeto continuam nesta prévia. A restauração web usa os arquivos anteriores a esses recursos, preservando os demais arquivos em produção.

Pacote `br.com.poporganize.app.teste`, versão `1.0.17-teste`, código 67. APK performance otimizado, com a mesma assinatura das prévias anteriores. Instale como atualização com `adb install -r`, sem desinstalar o aplicativo. O resumo do arquivo está em `SHA256.txt`.

Verificações: compilação web e TypeScript, 34 testes das funções existentes, cinco cenários HTTP em memória e 34 cenários de sincronização. Os cenários HTTP confirmam a retirada dos endpoints e a continuidade de autenticação, espaços e tarefas. Nenhum dado real foi alterado pelos testes.

A restauração web foi publicada em 15/11/2026, às 16h23 no horário de São Paulo. Saúde 200, endpoint de operações e página de rotinas 404, API de tarefas protegida por autenticação. Backup: `/var/www/pop-organize-withdrawal-backup-20261115T192325Z`. Assinatura APK v2 e alinhamento de 16 KB conferidos.
