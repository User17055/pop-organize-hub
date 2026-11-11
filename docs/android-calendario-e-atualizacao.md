# Calendário e atualização de tarefas

## Cabeçalho mais alto — build 29

O conteúdo principal passa a consumir os insets já aplicados pelo Scaffold. O cabeçalho usa `statusBarsPadding()` em vez de somar diretamente a altura da barra de status novamente; sua margem superior extra passa de 14 para 4 dp. Isso sobe o seletor do espaço (incluindo SAO FRANCISCO) e a foto de perfil, preservando a área da barra do Android. O aviso de sincronização também respeita a barra de status quando visível.

Build Android concluído e assinatura conferida. [Baixar build 29](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build29.apk), SHA-256 `8e856cbdc1f72061363905ff648dc8fce561ecaeac74c11e0ed321bb281af719`. A conferência visual no celular permanece pendente.

## Rolagem da agenda de horas — build 27

A grade de horas agora participa da mesma rolagem vertical do calendário, como a lista Padrão. Foi removido o quadro de altura fixa de 420 dp e sua rolagem interna. Os horários, os blocos com duração e todas as tarefas sem horário seguem no mesmo fluxo; “Sem horário” permanece ao final, sem outra lista limitada a 104 dp. Na visualização ampliada, um único scroll engloba a grade e as tarefas sem horário. O layout Padrão e a sincronização do build 26 foram preservados.

[Baixar Pop Organize Teste — build 27](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build27.apk)

Validação: `:app:assembleDebug` concluído, identificador `br.com.poporganize.app.teste`, versão 27 e assinatura igual à das versões de teste anteriores. SHA-256: `5e52613c2410081fd120b342ac6570db119e53830b7912b7f9d1f3fcbea04329`. A conferência visual no aparelho permanece pendente; não foi utilizado emulador.

## Registro da revisão 23

Atualização: o **build 24** conserva estas duas visualizações e inclui a revisão completa de sincronização. Consulte [sincronizacao.md](sincronizacao.md) para os testes e o APK mais recente. O restante deste documento registra a revisão 23.

## Duas formas de exibição

- **Padrão:** lista original do calendário, usando `TaskRow`, com as mesmas fontes, indicadores, prioridade e controles de conclusão. A função `CalendarDayAgenda` foi restaurada integralmente a partir da versão original do repositório.
- **Agenda de horas:** grade diária com início, duração, tarefas simultâneas e seção “Sem horário” no final. A ampliação permanece disponível nesse modo.
- A escolha fica acima das tarefas do dia. O aplicativo começa em Padrão e salva a opção por conta/espaço.
- As telas originais de Início e Tarefas continuam sendo a base do aplicativo.

## Correção de atualização

O envio de alterações locais não pode bloquear a leitura de tarefas atribuídas. A atualização da conta agora usa o mesmo fluxo independente de envio/leitura já utilizado nas empresas.

- Uma rejeição de envio por permissão ainda permite buscar e incluir novas atribuições.
- Alterações locais ainda pendentes são preservadas enquanto as novas tarefas chegam.
- Uma exclusão local rejeitada não pode esconder uma tarefa que o servidor permite visualizar, mas não excluir.
- Uma leitura negada pelo servidor continua sendo negada. A correção não concede permissões nem muda o grupo do colaborador.
- Respostas de uma conta que foi deixada durante a requisição não são aplicadas à conta atual.

## Caso Cintia

Em 11/11/2026, uma auditoria com o código da API implantado e uma cópia dos dados em memória confirmou:

- Cintia Pazini é membro ativo de SAO FRANCISCO.
- Sua permissão de criar tarefas continua desativada.
- A tarefa “teste” (`t2458`) é retornada para ela, com data de **10/11/2026**.
- Uma tentativa de criar um rascunho foi rejeitada com 403, e a tarefa atribuída continuou visível na leitura seguinte.
- O teste não gravou tarefas, sessões nem permissões no banco real; as simulações de escrita ficaram em memória.

Para procurar essa tarefa no calendário, deve ser selecionado 10/11. Na tela Tarefas, a visualização Todas também permite encontrar tarefas de outras datas.

## Entrega

APK preparado: `release/Pop-Organize-1.0.15-teste-build23-calendar.apk`.

Download direto: [Pop Organize Teste — build 23](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build23.apk). Link publicado a pedido do usuário e conferido por HTTPS, com status 200, tamanho e checksum correspondentes ao APK preparado.

- Nome: Pop Organize Teste.
- Pacote: `br.com.poporganize.app.teste`.
- Versão: `1.0.15-teste`, build `23`.
- Build sem atividade de dados fictícios habilitada.
- O usuário pediu para preparar a revisão primeiro; esta revisão ainda não foi instalada no celular.
- Compilação concluída; 12 testes executados com JUnitCore e aprovados. Também foi conferida a igualdade entre a função da lista Padrão e a função original do repositório.
- SHA-256 do APK: `52F637C03E8817178A83D3524F1A7B1AE3808AE52803A87080C5B22DF0E6F7C5`.

A validação no aparelho afetado ainda depende da instalação desta revisão. O resultado do teste da API não substitui essa conferência no Android da Cintia.
