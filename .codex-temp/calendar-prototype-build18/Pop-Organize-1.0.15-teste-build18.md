# Pop Organize Teste — 1.0.15-teste (18)

**Protótipo rejeitado e retirado do aparelho em 10/11/2026.** O telefone voltou à versão original 1.0.14 (build 16), com assinatura da Play Store. A interface também foi restaurada no código. As próximas alterações serão feitas primeiro no emulador, a partir do calendário anterior, para revisão gradual.

Instalado no aparelho Android conectado por USB, substituindo a instalação da Play Store conforme autorizado.

## Calendário

A referência é o Calendário nativo da Apple, especialmente a visualização diária com horários na lateral e eventos posicionados no tempo. O código do app iPhone do Pop Organize não foi usado como referência para a implementação final.

- Alternância entre mês e dia, seleção da semana e botão Hoje.
- Agenda diária de 24 horas com linhas de horário e indicador da hora atual.
- Tarefas com duração ocupam o intervalo correspondente; horários sobrepostos são exibidos em colunas.
- Tarefas sem horário aparecem em uma área separada, expansível.
- Botão Filtros com ícone de ajustes, texto e contagem de opções ativas.
- Fotos dos colaboradores na seleção de pessoa e na opção selecionada; iniciais quando não há foto.

## Duração

Criação e edição aceitam opções rápidas de 15, 30, 45, 60, 90 e 120 minutos, além de um intervalo personalizado de até 24 horas. Uma tarefa com duração exige horário inicial; o término é calculado e mostrado. Intervalos que passam da meia-noite também aparecem na agenda do dia seguinte.

O servidor armazena a duração e mantém a validação das permissões de edição. Esse suporte foi publicado na VPS após compilar e validar uma cópia isolada.

## Validação

- Build Android debug concluído.
- Dez testes JVM passaram (sincronização e organização dos intervalos).
- Dois testes Node passaram para conversão/validação de duração.
- TypeScript validado e servidor compilado.
- Integração do servidor verificada em memória: criação, edição, remoção da duração e recusa de alterações sem permissão.
- Endpoint de saúde da produção confirmou aplicação e banco saudáveis após a atualização.

## Acesso na versão USB

O Google recusou a assinatura debug por não estar registrada para OAuth. É possível entrar com o mesmo e-mail da conta existente usando o código de confirmação. Para habilitar o Google neste APK de teste, registrar no cliente Android OAuth o pacote `br.com.poporganize.app` e o SHA-1 `28:33:16:89:6B:8D:B8:3C:CC:06:B6:A5:6C:25:15:EA:30:7D:92:20`.
