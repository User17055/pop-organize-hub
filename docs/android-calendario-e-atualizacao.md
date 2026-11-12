# Calendário e atualização de tarefas

## Desempenho e posição da hora atual — build 44

Removido o deslocamento fixo de 5 dp do indicador de hora atual: sua posição e os rótulos usam a mesma escala temporal. Rótulos de referência que colidiriam com a hora atual ficam temporariamente ocultos. O teste cobre 10:58 antes de 11:00 nos zooms de 40%, 100% e 220%. O relógio recompõe somente o eixo da agenda; a captura `.codex-temp/device44-clock-min.png` confirmou o indicador sem rótulos sobrepostos no zoom mínimo.

A sincronização reaproveita a última versão aplicada quando o servidor e o estado local não mudaram, sem regravar o cache nem reconstruir a lista. Índices por identidade substituem buscas repetidas dentro das listas. Decodificação, comparação e preparação do JSON passam para `Dispatchers.Default`; as listas da interface só são atualizadas se o conteúdo mudou. Se uma edição, conclusão ou organização mais recente chega durante o cálculo, a preparação é refeita antes de confirmar o cache. A confirmação continua sendo gravada junto do cache e da retirada do envelope da fila.

Dados de espaços sem alterações deixam de reconstruir todos os grupos de estado a cada consulta. A preparação dos lembretes passa para IO, em sequência; uma lista de lembretes idêntica não cancela e recria os mesmos trabalhos. A geração das tarefas, documentos e regras de permissão foram preservadas. A prévia local foi corrigida para usar o valor de recorrência Diária.

Passaram 63 testes Kotlin e três testes instrumentados no Samsung: pinça/ícones, observação de alterações e persistência da fila. A coleta detalhada por amostragem não produziu um arquivo válido e deixou o processo suspenso no ART; foi encerrada e não foi usada para comparar desempenho. Depois de reiniciar o processo, foi executado o mesmo roteiro de três ciclos entre tarefas, calendário e início, com rolagem, sem alterar tarefas reais. As métricas ficam em `.codex-temp/build43-baseline-metrics.json` e `.codex-temp/build44-after-metrics.json`. O APK de depuração 44 reduziu p99 de 200 para 44 ms, mas ainda apresentou pausas isoladas; por isso a entrega final usa a variante `performance`, com R8, recursos reduzidos, sem depuração e com a mesma assinatura/pacote de teste.

Validação da variante otimizada concluída no mesmo aparelho, instalado como atualização e sem o sinalizador DEBUGGABLE. No mesmo roteiro de três ciclos, p95 passou de 12 para 10 ms e p99 de 200 para 19 ms; quadros fora do prazo passaram de 67/1.374 (4,9%) para 31/1.699 (1,8%). Os quadros com 100 ms ou mais passaram de 15 para 2; o maior intervalo do histograma caiu de 1.200 para 113 ms. Em nove ciclos posteriores, cobrindo 59,68 segundos e vários intervalos de atualização automática, foram registrados 5.255 quadros, p95 de 8 ms, p99 de 13 ms e zero quadros de 100 ms ou mais. Não houve novo ANR nem erro fatal do app durante esses testes; o registro anterior permaneceu em 11:05:36. Esses resultados descrevem os percursos medidos, não uma garantia de ausência de pausas em qualquer cenário. Métricas adicionais em `.codex-temp/build44-optimized-metrics.json` e `.codex-temp/build44-steady-metrics.json`.

[Baixar build 44 otimizado](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build44.apk). APK final `release/Pop-Organize-1.0.15-teste-build44-performance.apk`, 12.202.811 bytes, SHA-256 `02993a3a2619090c4df3f70aea91cfb9358d286543701d5a1fed9065b57b7362`, conferido no download HTTPS. O APK publicado é o da variante `performance`, não o APK intermediário de depuração. A assinatura permanece `79ede402688f77507824f6a16e60bf6f82305129cc17563e9a2db6e1ff10a49d`. A conta e o espaço foram preservados. A auditoria anterior à troca de variante encontrou zero envios pendentes; a variante otimizada não permite ler preferências por run-as. Nenhuma tarefa real foi editada nesses percursos de navegação.

## Ícones de conteúdo nas tarefas recorrentes — build 43

Os cards da agenda de horas mostram os ícones de recorrência, descrição e documento junto do horário, inclusive nos cards compactos e no zoom mínimo. A presença de cada ícone depende dos dados da própria tarefa, como nas linhas comuns. O card mantém sua altura compacta, horário abaixo do título e prioridade no topo direito. Nos cards maiores, os ícones não são repetidos na linha adicional de informações.

A prévia local inclui uma tarefa recorrente sem duração com descrição e documento para conferir os três ícones. O teste de pinça verifica também sua presença junto do horário em 100% e 40%. Não foram alteradas as regras de geração das ocorrências nem os documentos das tarefas reais.

Compilação concluída, 62 testes Kotlin e o teste instrumentado de pinça/ícones passaram no Samsung conectado. A captura `.codex-temp/device43-icons-min.png` foi inspecionada: os três ícones aparecem junto de 09:00 no card compacto em 40%; os cards adjacentes também mostram seus próprios ícones de descrição e anexo. Build 43 instalado como atualização, preferências da prévia restauradas, instrumentação removida e aplicativo normal reaberto.

[Baixar build 43](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build43.apk), 32.639.873 bytes, SHA-256 `11ee21990642bb577c70e7aa4923e696c71a559873cc859e696fd08a4b9dc09e`, conferido no download HTTPS. A sincronização automática do build 42 foi preservada.

## Cor por prioridade e ajustes da agenda — build 41

A lateral acompanha a prioridade: verde para Baixa, amarelo para Média, laranja para Alta e vermelho para Urgente, inclusive nos cards compactos. A foto do perfil no cabeçalho deixa de abrir o organizador antigo. A hora da linha atual perde o fundo e usa os mesmos 11 sp, altura de linha e peso dos horários de referência.

O card compacto passa de 44 para 40 dp na escala padrão, reduzindo o espaçamento interno e mantendo título, prioridade no topo direito e horário abaixo. O espaço continua crescendo com a escala de fonte. A duração real das tarefas permanece independente da altura mínima usada para leitura.

Compilação concluída e 62 testes Kotlin passaram. [Baixar build 41](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build41.apk). APK com 32.623.489 bytes; SHA-256 `92cbdaceb09e07356425576411d8adad4b4a51222abfdeff4af0fe2ba13ea16f`, confirmado no download HTTPS. A assinatura permanece igual à das atualizações anteriores. Após reconexão, instalado como atualização no Samsung, com versão 41 confirmada. O toque na foto manteve o calendário aberto, sem o organizador antigo. A captura `.codex-temp/calendar-build41-current-time.png` confirmou lateral verde para Baixa, laranja para Alta, prioridade no canto superior direito, card compacto com horário abaixo e linha atual às 10:35 sem fundo, com texto do tamanho dos horários de referência. Nenhuma tarefa real foi alterada durante essa conferência.

## Lateral verde e prioridade no topo — build 40

Os cards do calendário passam a ter faixa lateral verde, incluindo os compromissos sem duração. A prioridade mantém sua própria cor e fica na primeira linha, no canto superior direito, tanto nos cards compactos quanto nos maiores da agenda de horas. O horário continua abaixo do título. A prioridade das tarefas sem horário também passa a se alinhar ao topo.

Compilação concluída; build 40 instalado como atualização no Samsung conectado. [Baixar build 40](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build40.apk). SHA-256 `e456f654e46005425141e7f151755e4294d3b2d0749864c56ab868e57573b8ec`, conferido também no download HTTPS. Após o usuário abrir a agenda, a captura `.codex-temp/calendar-build40-open.png` confirmou no card “Colocar relógio” a faixa verde à esquerda, a prioridade “Baixa” no canto superior direito e o horário 08:00 abaixo do título, sem sobreposição.

## Card compacto com hora abaixo — build 38

As tarefas sem duração e os intervalos curtos voltam a ter um card neutro, com o título e a hora em uma segunda linha discreta. Sem duração definida, a segunda linha mostra apenas o início; o ponto colorido indica o compromisso pontual. Quando há duração, a faixa temporal e o horário de término continuam baseados no intervalo real, independentemente do tamanho do rótulo.

A área mínima do rótulo comporta as duas linhas, inclusive no zoom reduzido e com fontes maiores. A distribuição das colunas considera esse espaço para impedir sobreposição. A pinça e as cores do tema foram mantidas. O teste instrumentado passa a verificar a hora abaixo do título em 100% e no limite de 40%, além da ausência do término fictício às 09:30.

Validação: compilação concluída, **61 testes Kotlin** e **1 teste instrumentado no Samsung SM-S721B** passaram. A captura `device-pinch38-min.png` foi inspecionada e confirmou o card compacto com início abaixo do título em 40%. O build 38 foi instalado no celular; a prévia foi restaurada, a instrumentação removida e o aplicativo normal reaberto.

[Baixar build 38](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build38.apk), SHA-256 `292f2ea6c8a035dc8497bb1e4e14043ce580ed3448835159352443a8cdc93c4e`. Assinatura de teste preservada.

## Duração real e tarefa sem duração — build 37

Retirado o intervalo padrão de 30 minutos que a grade atribuía visualmente a tarefas sem duração. Essas tarefas passam a ser marcações no horário de início, com ponto de prioridade e título, sem um bloco preenchido indicando término.

Para duração definida, a extensão temporal é calculada com os minutos reais, sem elevar uma tarefa curta para 30 minutos. Se esse intervalo não comportar o título no zoom atual, a faixa de duração mantém a altura exata e o título usa uma área de leitura separada, sem fundo preenchido que possa sugerir um intervalo maior. A altura mínima continua valendo para organizar os rótulos e impedir sobreposição, sem mudar a duração desenhada.

A tarefa de exemplo de 09:00 agora não tem duração, e o teste no aparelho verifica que ela não recebe o intervalo fictício `09:00–09:30`. Os testes de cálculo cobrem ausência de duração e uma tarefa real de cinco minutos nos zooms de 40% e 100%.

Compilação concluída e **61 testes Kotlin** passaram. Após a reconexão USB, o **build 37 foi instalado no Samsung SM-S721B** e o teste instrumentado passou: tarefa das 09:00 sem término fictício às 09:30, zoom de 100% para aproximadamente 205% e retorno, âncora do gesto preservada, texto legível no limite de 40% e rolagem com um dedo funcionando após a pinça. Foram inspecionadas as capturas `device-pinch37-before.png` e `device-pinch37-min.png`, confirmando a marcação pontual da tarefa sem duração. A prévia teve seu estado restaurado, o pacote de instrumentação foi removido e o aplicativo normal foi reaberto. As tarefas de produção não foram editadas pelo teste.

[Baixar build 37](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build37.apk), SHA-256 `c9afedf80fe8f834367fb2a26c390a8dd425e855c34dc612dba326ebbddc4bd6`. Assinatura dos builds de teste preservada.

## Texto legível no zoom mínimo e cores do tema — build 36

O título deixa de ser ocultado ou ter sua opacidade reduzida no zoom mínimo. Cada bloco tem uma altura visual mínima de 28 dp, ampliada para respeitar a fonte configurada no Android. A distribuição das colunas considera essa área mínima para evitar que títulos de tarefas próximas se sobreponham. Início, duração e término reais continuam intactos; a altura mínima é somente uma representação de leitura. O fim da grade reserva espaço para manter legível uma tarefa perto da meia-noite.

Os fundos dos cards usam `PopSurface`, os títulos `PopText` e os detalhes `PopMuted`, incluindo os temas claro e escuro. O gradiente colorido do fundo foi retirado; a prioridade usa a mesma paleta da lista original, em uma faixa lateral. Estados de conclusão e revisão mantêm as cores azul e roxa do aplicativo. O zoom por pinça, a hora atual e as transições foram preservados.

Foram acrescentados testes de área legível com fontes ampliadas, distribuição de tarefas próximas no zoom mínimo sem alterar sua duração e tarefa no último minuto do dia. O teste no aparelho passou a incluir redução até 40% e presença do título da tarefa curta nesse limite.

Validação: compilação concluída, **59 testes Kotlin** e **1 teste instrumentado no Samsung SM-S721B** passaram. A captura `device-pinch36-min.png` foi inspecionada e confirmou o título visível no zoom de 40%, com o fundo neutro do tema. O build foi instalado e o aplicativo normal foi reaberto; a prévia foi restaurada ao estado original e o pacote de teste foi removido.

[Baixar build 36](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build36.apk), SHA-256 `e43281eea2e7b6d02fdbfa36a64151478b832814c98bae56db75d988a82dcd54`. Assinatura dos builds de teste preservada.

## Remoção da dica de zoom — build 35

Retirado o texto “Ajuste o zoom com dois dedos” abaixo do título das tarefas. O gesto de pinça, a escala contínua e as transições do build 34 foram preservados.

Compilação e assinatura verificadas. [Baixar build 35](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build35.apk), SHA-256 `8edd5c169161a45b947054414475dda7b0cfd1f9d8e43033dbb74f8c5357590b`.

## Pinça contínua e transições — build 34

Os botões de zoom foram substituídos por pinça com dois dedos na grade de horários. A escala varia continuamente de 40% a 220%, sem passos fixos nem salto automático para a hora atual. A preferência antiga é aproveitada e o valor contínuo é salvo ao terminar o gesto, por conta/espaço.

O centro do gesto mantém o mesmo minuto sob os dedos: escala e posição da lista são atualizadas na mesma medição. A rolagem com um dedo permanece na lista principal. Depois de reconhecer a pinça, o detector mantém a posse dos eventos até os dedos serem levantados para evitar que o fim do gesto abra um card. A pinça não atua no calendário mensal nem em “Sem horário”.

Os detalhes dos cards aparecem gradualmente conforme ganham espaço. Intervalos de meia hora também surgem suavemente ao ampliar. A troca de visualização tem transição de opacidade nos itens e animação de seleção dos botões; cálculos de duração e simultaneidade permanecem independentes da escala visual.

Referências para o tratamento de eventos: [gestos de múltiplos toques no Compose](https://developer.android.com/develop/ui/compose/touch-input/pointer-input/multi-touch) e [posicionamento na próxima medição com LazyListState](https://developer.android.com/reference/kotlin/androidx/compose/foundation/lazy/LazyListState).

Validação: **56 testes Kotlin** passaram. O teste instrumentado `AgendaPinchZoomDeviceTest` também passou no **Samsung SM-S721B conectado por USB, Android 16**, com a agenda de exemplo: pinça sobre card clicável, ampliação de 100% para aproximadamente 205%, retorno a 100%, conservação do minuto sob os dedos (tolerância de 2 minutos), preferência salva e rolagem com um dedo após o gesto. Foram conferidas as capturas de antes, ampliação e redução. O teste precisou limpar o cache de acessibilidade para medir posições atuais após a mudança de escala. A atividade de prévia teve seu estado original restaurado e o pacote de instrumentação foi removido; nenhuma tarefa de produção foi concluída ou editada.

O build 34 foi instalado no celular e o aplicativo normal foi reaberto. [Baixar build 34](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build34.apk), SHA-256 `ec1fa60b5f9f99e7d0bd89c3c07fedb3d7f5b1f3a6634a7c4469be879668800f`. A assinatura dos builds de teste foi preservada. Não foi medida taxa de quadros nem testado outro modelo de aparelho.

## Rolagem livre, zoom e leitura dos cards — build 33

Foi removido o posicionamento automático na hora atual ao abrir o modo de horas ou mudar o dia. A linha da hora atual permanece na grade de hoje, atualizada a cada 30 segundos e acima dos cards, sem comandar a rolagem.

Controles − e + ajustam o zoom entre 60% e 160%, em passos de 20%. A preferência é salva usando a mesma chave de conta/espaço dos filtros do calendário. A escala de 100% corresponde a 96 dp por hora. Rótulos, blocos com duração e indicador da hora atual compartilham a mesma escala; os horários reais das tarefas permanecem iguais. Em zoom reduzido os blocos curtos priorizam o título; mais zoom libera o intervalo e as informações complementares. O modo Padrão mantém seu tamanho.

Os cards têm título de 13 sp com recuo constante, mais espaço interno, cantos de 12 dp e fundo com acento mais suave. O intervalo continua sendo exibido em horas (`09:00–09:30`), e o horário de término permanece abaixo do início na lista Padrão. A tela ampliada não foi reintroduzida.

Compilação e **52 testes Kotlin** concluídos. [Baixar build 33](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build33.apk), SHA-256 `c35997aa08b27eb9d2aba302d6c068cf9fdc8e0d8fef69f4185eb38300d44f6f`. Assinatura de teste preservada; a conferência visual e de interação do zoom no celular permanece pendente.

## Linha da hora atual — build 32

Na visualização de hoje, ao entrar na agenda de horas, a rolagem principal passa a posicionar a hora atual na região visível. A grade continua cobrindo o dia inteiro e compartilhando a rolagem da página. O indicador permanece restrito ao dia atual, atualiza a cada 30 segundos e é desenhado acima dos cards, com ponto de 6 dp e linha de 1,5 dp. O horário recebe fundo da página para não se sobrepor aos rótulos da grade. Nenhum botão de expansão foi reintroduzido.

O posicionamento inicial usa o item específico da linha do tempo, separado do item de controles para não depender da altura das opções do calendário. Sem medição visual em aparelho nesta revisão.

Compilação e assinatura verificadas. [Baixar build 32](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build32.apk), SHA-256 `55fac8385d015b704053242f0ca39ed1826460125fbb2df510f783ba032c9e2b`.

## Alinhamento e horário final — build 31

O título e a contagem das tarefas usam o mesmo cabeçalho nos dois modos. Foi retirada a opção de ampliar e sua tela separada. Na grade, os horários partem da mesma margem externa da lista, e os títulos dos cards mantêm tamanho e recuo constantes em blocos de diferentes durações.

No Padrão, abaixo do início aparece o **horário de término**, em texto secundário, em vez da quantidade de minutos. Na grade, o intervalo aparece como `09:00–09:30`. O horário final depende de uma duração configurada; tarefas sem duração não recebem um término inventado. `+1` indica que o término ocorre no dia seguinte. Foi adicionado um teste de cálculo do término, incluindo passagem pela meia-noite, duração de 24 horas e entradas inválidas.

Compilação e **52 testes Kotlin** concluídos. [Baixar build 31](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build31.apk), SHA-256 `2c4ec6cf0c5ea993c89de3c7ba1cdd76dcdf238136831130cbcfbb38c5b4f7ac`. Assinatura de teste preservada; conferência visual no celular pendente.

## Cards e duração — build 30

- Agenda de horas: título com mais espaço, horário e duração em texto secundário, informação adicional conforme a altura do bloco e destaque discreto da prioridade à esquerda. Sem contorno superior; o fundo e o acento se dissipam nas bordas. A escala passa a 80 dp por hora para que um bloco de 30 minutos comporte duas linhas, mantendo a duração proporcional e o tratamento de simultaneidade.
- Agenda do dia (Padrão): duração configurada abaixo do horário, com texto menor e discreto. Tarefas sem duração não recebem uma duração inventada.
- A data por extenso que aparecia novamente abaixo de “Tarefas de hoje” foi retirada. O botão de ampliar fica na mesma linha do título e da contagem.
- Mantidas a rolagem contínua, a posição do cabeçalho do build 29 e a fila persistente de sincronização.

Compilação e 51 testes Kotlin concluídos. [Baixar build 30](https://app.poporganize.com.br/downloads/pop-organize-teste-1.0.15-build30.apk), SHA-256 `4d6044ccc19ba0e4910ffad16e458ac47c69032c02858783440021d8d5d257ac`, com assinatura de teste preservada. Conferência visual no celular pendente.

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
