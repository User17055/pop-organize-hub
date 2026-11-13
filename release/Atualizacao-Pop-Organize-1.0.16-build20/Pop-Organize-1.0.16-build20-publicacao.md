# Pop Organize 1.0.16 — build 20

Pacotes de produção preparados em 12/11/2026. Use este build para a atualização; o build 19 anterior permanece preservado.

- `Pop-Organize-1.0.16-build20.aab`: enviar à Google Play Console.
- `Pop-Organize-1.0.16-build20.apk`: instalação direta de produção.
- `Pop-Organize-1.0.16-build20-mapping.txt`: guardar para interpretar relatórios de falhas.
- `Pop-Organize-1.0.16-build20-verificacao.json`: resultados e hashes dos artefatos.
- `Pop-Organize-1.0.16-build20-fontes.json`: identificação do código utilizado.
- `Pop-Organize-1.0.16-build20-notas.txt`: notas da versão.

## Conteúdo

Consolida os ajustes de calendário, agenda de horas, filtros, fontes, cores, prioridade, fotos dos responsáveis, assinatura LisonTech, seletor de data e início/término. Inclui a correção de conclusão por colaboradores autorizados mesmo quando a atribuição é de outra pessoa.

O Android mostra “Concluída por: nome” nas tarefas e no rodapé dos detalhes. O servidor registra a conta que concluiu, preserva o registro em reenvios e limpa a autoria ao reabrir. A próxima conclusão registra o novo autor. Conclusões antigas sem autoria salva aparecem como “não registrado”.

## Validação

31 testes Node, verificação de tipos e 38 cenários de integração passaram. As simulações usam dados em memória e não modificam tarefas reais. Os 65 testes Kotlin e o teste físico dos seletores aprovados anteriormente permanecem como evidência das funcionalidades anteriores; o novo rodapé de autoria não recebeu nova validação visual em aparelho nesta entrega.

Bundletool, assinatura, integridade, API 36, ausência de componentes de depuração, alinhamento ZIP e bibliotecas de 16 KB foram conferidos no pacote final. A assinatura de produção corresponde ao build 18 já enviado à Play.

Os arquivos AAB/APK estão somente neste computador e não foram enviados à Google Play nem distribuídos na VPS. O backend de autoria foi atualizado separadamente na VPS. A IA de chamadas e reuniões é planejamento para a próxima versão, sem novas funcionalidades de IA implementadas neste build.

## SHA-256

- `Pop-Organize-1.0.16-build20.aab`: `b856936597c58f2c30120f6deff11510ef42101a18468330cb75ae8a771eb072`
- `Pop-Organize-1.0.16-build20.apk`: `6139a4c2b7e67b595b9a1c11d8c18e3d1c1cd3215d6b3f8aed913ae5c71a4567`
