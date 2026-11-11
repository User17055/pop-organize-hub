# Referências visuais — calendário no emulador

> A revisão atual voltou ao Padrão original e separou a Agenda de horas. Consulte `docs/android-calendario-e-atualizacao.md` para o comportamento final e a correção de sincronização; abaixo fica o histórico das referências e iterações anteriores.

Foram abertas e analisadas cinco imagens diferentes do Calendário nativo da Apple. As imagens são referências de composição, não assets incorporados ao aplicativo.

| Imagem | Origem | Aplicação na proposta |
| --- | --- | --- |
| [1. Dia claro, eventos e duração](https://help.apple.com/assets/68FABD5B6EF504342600E3E5/68FABD675A41CCC23909151C/zh_TW/76af76e70301ca15324cfec9b7dc85de.png) | [Apple Support](https://support.apple.com/zh-tw/guide/iphone/iph3d110f84/ios) | Coluna de horários, cores suaves e blocos proporcionais ao tempo. |
| [2. Dia escuro e eventos simultâneos](https://wiki-tech.io/images/calendar/calendar.png) | [Wiki-Tech](https://wiki-tech.io/fr/Apple/ios-synchro-google-calendar) | Contraste no modo escuro e distribuição de eventos sobrepostos. |
| [3. Lista com lembretes](https://www.macplus.net/app/uploads/2024/09/ios-18-rappels-calendrier.jpg) | [MacPlus](https://www.macplus.net/depeche-251496-ios-18-tutoriel-ne-plus-afficher-rappels-dans-calendrier) | Lista limpa, tarefas sem horário e estados de conclusão. |
| [4. Seleção dos calendários](https://help.apple.com/assets/6633DB1C79444B6B900807F2/6633DB21F5976AEFF00E8898/pt_BR/e7a3f1529a06b5c822c4ecb521054352.png) | [Apple Support](https://support.apple.com/pt-br/guide/iphone/iph3d1110d4/ios) | Grupos discretos e indicação clara da seleção, adaptados às fotos das pessoas. |
| [5. Linha da hora atual](https://i.sstatic.net/BW2gy.png) | [Captura do app nativo](https://stackoverflow.com/questions/73685665/how-to-create-a-timeline-like-the-ios-calendar-app) | Régua de tempo e marcador de agora na visualização expandida do dia. |

## Limites da revisão

- As revisões iniciais foram instaladas e conferidas no emulador. A pedido do usuário, o build de teste 19 também foi instalado no celular por USB.
- O calendário mensal e o cabeçalho atuais continuam como base.
- A agenda alterna entre linhas compactas e horários abertos diretamente na tela. A grade também pode ser ampliada.
- Os dados e retratos da atividade de prévia são fictícios e locais, sem acesso à conta ou ao servidor.
- A prévia é uma atividade exclusiva do build debug.

## Conferência

- Build Android debug compilado e instalado somente no Pixel 7 emulado (API 35).
- Dez testes Android passaram: duração, horários, sobreposição e atualização das tarefas.
- Dois testes do formato de duração do servidor passaram.
- No emulador, selecionar Ana Oliveira reduziu a lista de cinco para duas tarefas.
- Alterar a duração de 30 minutos para 1h30 atualizou o término de 09:30 para 10:30; salvar refletiu o novo horário na agenda.
- A grade diária foi conferida com tarefas simultâneas, intervalos de 30/45/60/90 minutos e linha de agora.

## Alinhamento com o site

- A referência de identidade é `src/styles.css`: Poppins nos títulos e Inter nos textos e controles.
- A agenda Android usa os mesmos arquivos Inter 400/500/600 do pacote `@fontsource/inter` já instalado no projeto, convertidos de WOFF2 para TTF. A licença acompanha o app em `res/raw/inter_license.txt`.
- Os eventos usam fundo discreto e borda em degradê na cor da prioridade, suavizando até o fundo da página. A faixa vertical de separação foi removida.
- Títulos, horários e ações têm pesos e tamanhos próprios; os blocos de tarefas simultâneas podem usar duas linhas para facilitar a leitura.
- A revisão visual foi compilada e conferida no Pixel 7 emulado, incluindo os dois eventos simultâneos e a rolagem até a tarefa de 14:00–15:30.

### Revisão de densidade

- Bolinha de conclusão à esquerda na lista, seguindo a posição original do app.
- Início e término com entrelinha menor, cartões mais próximos e prioridade escrita na linha de apoio.
- Régua diária com 56 dp por hora (antes, 72 dp), sem linhas horizontais de separação.
- Removidos a moldura e o cabeçalho repetido da agenda aberta. A ampliação fica em um único botão ao lado de “Recolher”.
- A prévia local contém exemplos das quatro prioridades; essas alterações de exemplo não acessam o servidor.
- Revisão compilada e instalada no emulador. Foram conferidos o clique de concluir/reabrir à esquerda, as quatro cores e os intervalos curtos de 30/45 minutos na agenda aberta.
- Degradê atual: destaque no canto superior e na lateral esquerda, dissolvendo no cinza em direção à direita e à parte de baixo. Não há linha fechando o cartão nessas duas bordas.

### Versão instalada no celular

- Versão `1.0.15-teste`, build `19`, identificada como **Pop Organize Teste** (`br.com.poporganize.app.teste`).
- APK: `release/Pop-Organize-1.0.15-teste-build19-calendar.apk`.
- O app da Play Store permaneceu instalado como `br.com.poporganize.app`, versão `1.0.14`, build `16`.
- Novo degradê com início marcado e queda suave em vários pontos. O filtro fica apenas com o ícone; “Sem horário” fica depois da grade na agenda aberta e depois das tarefas agendadas na lista.
- O perfil de teste para celular desativa a atividade com dados fictícios. O ícone abre o app normal para login; a prévia offline continua disponível no perfil de desenvolvimento do emulador.
- Comando de build: `node scripts/run-android-gradle.mjs :app:assembleDebug :app:compileDebugUnitTestKotlin -PPOP_CALENDAR_TEST=true`.
- Build compilado, dez testes Android aprovados, pacote e versão conferidos no celular após a instalação.
- Conferência visual no emulador: filtro sem moldura e “Sem horário” abaixo dos eventos na visualização aberta. A prévia precisou ser reiniciada após uma demora de resposta na abertura; a navegação voltou a funcionar.

### Revisão instalada: build 20

- A pedido do usuário, as próximas conferências passam a acontecer apenas no celular.
- Cartões da lista com altura mínima de 88 dp, título maior e espaço para os indicadores da tarefa original: data/atraso, anotação, recorrência, anexo, checklist, conclusão ou revisão e prioridade. A pilha original de avatares é usada para tarefas compartilhadas.
- O destaque colorido fica somente no canto superior e na lateral esquerda. Não há contorno na direita nem embaixo; a cor se dissolve no fundo cinza nos dois eixos.
- Os eventos mais longos na grade e as tarefas sem horário também exibem indicadores adicionais quando há espaço.
- `Pop Organize Teste`, versão `1.0.15-teste`, build `20`, atualizado por USB com `install -r`, preservando os dados da instalação de teste.
- APK final: `release/Pop-Organize-1.0.15-teste-build20-calendar.apk`. Compilação e dez testes Android aprovados.
- A atividade de dados fictícios está desativada no APK instalado no celular. `POP_CALENDAR_PREVIEW=true` é uma opção separada para uso de desenvolvimento.
- Conferência feita diretamente no celular com o calendário real aberto: cartões maiores, indicadores originais visíveis e ausência do contorno fechado à direita e embaixo. Nenhuma tarefa real foi concluída, reaberta ou editada durante a conferência.

### Revisão compacta: build 21

- Após o usuário pedir para diminuir, a altura mínima passou de 88 para 58 dp, com título de 13 sp em uma linha e os indicadores reunidos em uma segunda linha.
- A prioridade voltou à direita, como na linha original, e o espaço vazio de horário foi removido das tarefas sem horário.
- Mantidos o degradê aberto, a bolinha à esquerda e os indicadores originais. O bloco sem horário na agenda expandida também foi compactado.
- Build 21 compilado, dez testes aprovados e atualização instalada por USB no celular. A aparência compacta foi conferida diretamente no calendário real, sem alterar nenhuma tarefa.
- APK: `release/Pop-Organize-1.0.15-teste-build21-calendar.apk`.

### Espaçamento: build 22

- Intervalo entre os cartões da lista aumentado de 4 para 12 dp.
- Mantida a disposição compacta em duas linhas do build 21.
- Compilação concluída e atualização instalada por USB no celular como build 22.
- APK: `release/Pop-Organize-1.0.15-teste-build22-calendar.apk`.

Para acompanhar, abra a janela **Android Emulator - Pixel_7:5554** e o app **Prévia Pop Organize**. O botão **Abrir agenda** mostra os horários diretamente na tela e traz essa área para a vista. **Recolher** volta à lista compacta; **Ampliar** abre a grade maior. As três ações foram conferidas no emulador. Toque em uma tarefa para editar a duração ou dê dois toques em uma data para criar uma tarefa de exemplo.
