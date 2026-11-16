# Pop Organize teste build 66

Prévia Android 1.0.17-teste, preparada em 15/11/2026. Pacote `br.com.poporganize.app.teste`, com a mesma assinatura da prévia anterior e configuração performance otimizada.

## Alterações

- Retirada dos modelos de rotina: exemplos, criação, edição e ativação.
- Menu **Mais → Impedimentos e turnos**, abrindo diretamente em Impedimentos.
- Preservados o registro **Estou travado**, a resolução de impedimentos e a passagem de turno com confirmação de leitura.
- Preservados o cadastro de tarefas, a repetição existente e as tarefas anteriormente criadas.

Esses fluxos não fazem chamadas de IA e exigem conexão para consulta e gravação. O servidor já está publicado em `https://app.poporganize.com.br`. O contrato legado de modelos permanece compatível com prévias anteriores.

O código inclui as alterações locais de voz que já estavam no projeto. Esta prévia não é uma publicação na Google Play.

## Instalação

Instale como atualização, sem desinstalar a prévia anterior:

```text
adb -s SERIAL_OU_IP:PORTA install -r Pop-Organize-1.0.17-teste-build66.apk
```

O resumo SHA-256 fica em `SHA256.txt`.

## Verificações

Compilação e TypeScript web, ESLint dos arquivos alterados, 58 testes de regressão, 14 cenários HTTP e 34 cenários de sincronização. Os testes HTTP usam dados sintéticos e bloqueiam acesso ao banco real. Conferência web em desktop e celular: ausência de modelos, Impedimentos como aba inicial, registro e resolução, passagem de turno e confirmação de leitura.

A publicação web alterou somente os arquivos da tela e do menu, preservando o servidor de voz existente. Backup: `/var/www/pop-organize-operations-backup-20261115T190626Z`.

APK performance compilado, assinatura v2 e alinhamento de 16 KB validados. Instalado com `adb install -r` no Samsung SM-S721B pela conexão USB disponível, atualizando o build 65 para 66. A data da primeira instalação foi conservada. No aparelho, o menu atualizado e as abas Impedimentos e Turnos foram conferidos com a sessão existente, sem criar registros reais de teste.
