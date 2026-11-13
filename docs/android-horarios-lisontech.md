# Horários e assinatura LisonTech

Revisão de 12/11/2026: produção 1.0.16 (20), consolidando os ajustes abaixo. O build 18 já foi enviado à Google Play; o build 19 anterior foi preservado. A última revisão de teste instalada por USB foi o build 51.

## Comportamento

- Criação e edição usam o mesmo seletor de início e término opcional. O aplicativo calcula a duração existente no modelo de dados, sem alterar o protocolo de sincronização.
- Um término anterior ao início representa o dia seguinte. Horários iguais só representam 24 horas quando o usuário ativa essa opção explicitamente.
- A data de conclusão mostra apenas a data e abre um calendário. Não há campo de digitação nessa seleção.
- A assinatura nas configurações usa a logo original fornecida em `assets/branding/lison.svg`, convertida em vetor nativo sem dependência de rede. A base escura preserva o contraste da parte branca do símbolo nos dois temas.
- No teste build 46, a lista de configurações termina na assinatura: não há margem inferior extra de 40 dp nem efeito de esticar a lista ao alcançar o fim. O pacote de produção 19 gerado anteriormente ainda não inclui esse ajuste posterior de rolagem.
- No teste build 47, data e horário não mostram a seta de expansão, pois abrem seletores separados. O ícone da prioridade usa a mesma cor do valor selecionado. O campo Responsável mostra até três fotos sobrepostas, com iniciais quando não há imagem, preservando os nomes e o alinhamento. Os seletores usam as cores explícitas do tema, sem elevação tonal no diálogo, e a seleção de horário tem destaque azul suave. Esses ajustes posteriores também ainda não integram os arquivos de produção 19 já gerados.
- No teste build 48, o diálogo de horário usa rodas menores e ações na mesma linha. O término opcional mostra “Definir” até ser escolhido, evitando o texto cortado. As fotos dos responsáveis passam a 32 dp, com cada pessoa em uma linha e sem sobreposição; a coluna de texto mantém o alinhamento dos outros campos.
- No teste build 49, o título do campo Responsáveis fica separado de todas as pessoas. Cada foto aparece ao lado de seu próprio nome, com 24 dp para acompanhar os ícones. O seletor de horário usa pesos de fonte mais fortes, a paleta do aplicativo e não mostra a mensagem “Término opcional”.
- No teste build 50, as fotos usam o tamanho intermediário de 28 dp e a ação “Remover término” usa o vermelho do tema.
- No teste build 51, a mensagem de conclusão não afirma exclusividade do responsável. A regra central de conclusão foi corrigida e aplicada à VPS; detalhes em `conclusao-compartilhada.md`.

## Validação

65 testes Kotlin passaram, incluindo cálculo de duração, intervalo noturno e valores inválidos. Um teste instrumentado no Samsung SM-S721B com Android 16 verificou criação, edição, remoção do término, seleção de data e assinatura nos dois temas. O teste usa uma atividade isolada de depuração, sem gravar tarefas ou consultar a API; essa atividade não integra os pacotes otimizados.

Os pacotes finais devem ser conferidos pelo relatório de verificação da pasta `release/Atualizacao-Pop-Organize-1.0.16-build20`. A geração e a instalação por USB não publicam os arquivos de distribuição na VPS nem na Google Play.

## Entrega de produção atual

Usar `release/Atualizacao-Pop-Organize-1.0.16-build20`. Inclui os ajustes visuais das revisões de teste e a identificação de quem concluiu, descrita em `registro-de-conclusao.md`. A proposta da próxima versão está em `plano-pop-ia-1.0.17.md`; as novas funcionalidades de IA permanecem em planejamento.
