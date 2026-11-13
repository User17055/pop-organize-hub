# Quem concluiu a tarefa

Incluído no Android de produção 1.0.16, build 20, e no backend da VPS em 12/11/2026.

O servidor grava `completedById`, `completedByName` e `completedAt` ao passar a tarefa para concluída. Usa a conta autenticada que executou a ação, incluindo quando a pessoa não é a responsável atribuída. Os caminhos do site, sincronização móvel por snapshot, comando de conclusão e criação de tarefa já concluída usam a mesma regra.

Concluir novamente uma tarefa já concluída mantém o registro original. Reabrir limpa a autoria; concluir depois grava o novo autor. Aguardar revisão não equivale a uma conclusão confirmada. Uma ocorrência futura da recorrência começa sem a autoria da anterior.

O Android recebe esses campos na leitura e na confirmação do envio, conserva no cache e mostra **Concluída por: nome** na listagem e no rodapé dos detalhes. Conclusões antigas sem autoria armazenada aparecem como **não registrado**. Não se deduz o autor a partir do responsável atribuído.

## Verificação

- 31 testes Node e a verificação de tipos passaram.
- 38 cenários de integração passaram antes e depois da implantação. Comprovam autoria da sessão, entrega a outro usuário, proteção contra autoria falsa, reenvio idempotente e reabertura seguida de nova conclusão.
- A auditoria intercepta as escritas em memória; não altera tarefas reais.
- O serviço e o banco responderam saudáveis depois da implantação.
- AAB e APK de produção receberam validação de assinatura, bundle, integridade, pacote, versão, ausência de componentes de depuração e alinhamento de 16 KB.
- O novo rodapé de autoria foi compilado, mas não recebeu nova validação visual em aparelho nesta entrega de produção.

Os pacotes estão em `release/Atualizacao-Pop-Organize-1.0.16-build20`. O build 19 anterior permanece preservado. Os arquivos de distribuição não foram enviados automaticamente à Google Play ou à VPS.
