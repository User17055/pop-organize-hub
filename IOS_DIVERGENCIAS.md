# Onde o iPhone diverge do Android — e por quê

Os dois apps são separados (o iOS vive em `android/composeApp`, KMP; o Android em `android/app`),
mas os mesmos dois funcionários usam um e outro e precisam enxergar a mesma realidade. Divergir sem
motivo é defeito. Este arquivo lista as divergências **deliberadas** e o motivo de cada uma, para
que ninguém as "conserte" de volta por engano.

Quando o comportamento for igual, não está aqui.

---

## Login

| iPhone | Android | Por quê |
| --- | --- | --- |
| Botão nativo `ASAuthorizationAppleIDButton` | não tem login Apple | App Store Review 4.8 exige o botão desenhado pelo sistema. Reproduzi-lo em Compose é perseguir um alvo que a Apple move a cada versão. |
| Três estágios (escolher → e-mail → código) | tudo numa lista rolável | Com o teclado aberto num iPhone, ~40% da tela some. O botão de ação nascia fora de vista e o toque parecia não ter feito nada. |
| O código confirma sozinho no 6º dígito | esconde o teclado e espera o toque | Sobrava um toque no fim de todo login, sem nada a decidir naquele momento. |
| Erro e aviso em variáveis separadas | uma variável só, sempre com a cor de erro | "Código enviado para seu e-mail" aparecia **em vermelho** e era lido como falha. |
| Respeita o tema do aparelho | fixa `Color(0xFF2C2C2C)` | Um app que ignora o modo escuro do sistema destoa de todo o resto do iPhone. |
| Erro inline abaixo do botão | `Toast` | Não existe `Toast` no iOS, e a mensagem inline não some antes de ser lida. |

### Aberto, não divergente

O `ASAuthorizationController` em `MainViewController.kt` é variável local e só o delegate fica
retido — padrão clássico de bug em que o controller morre antes do callback. **Nunca foi testado em
aparelho real.** Deixado para confirmar em hardware antes de mexer, em vez de corrigir no escuro.

O toque do botão da Apple **não** está ligado no controle nativo: o `UIKitView` entra só como
aparência, com `userInteractionEnabled = false`, e uma camada do Compose por cima recebe o clique.
Ligar no próprio `UIControl` exigiria um alvo Objective-C com selector retido por conta própria —
exatamente o padrão do bug acima. A aparência, que é o que a revisão verifica, continua sendo a que
o sistema desenha.

O botão usa o inicializador padrão em vez de `buttonWithType:style:`: as constantes de estilo do
Objective-C não resolveram no binding do Kotlin/Native (as de *tipo*, do mesmo cabeçalho,
resolvem). Em fundo claro o branco se perde, então uma borda faz o papel do estilo `WhiteOutline`.
Se alguém descobrir o nome certo da constante, dá para simplificar.

---

## Calendário

| iPhone | Android | Por quê |
| --- | --- | --- |
| Até 3 marcadores por dia e um "+N" | até 20 bolinhas de 2dp em órbita num círculo de 38dp | Acima de meia dúzia vira um borrão que ninguém consegue contar. O número ainda tem a vantagem de não exigir distinguir matiz. |
| "Hoje" contornado, dia selecionado preenchido | os dois pintados igual | Com outro dia escolhido, não havia como achar hoje na grade. |
| `seg ter qua qui sex sáb dom` | `S T Q Q S S D` | Segunda e sábado são a mesma letra; quarta e quinta também. |
| Botão "Hoje" | não tem | Voltar de uma navegação de vários meses só era possível mês a mês. |
| Grade fecha na última semana | 42 células fixas | A sexta linha fica inteira vazia na maioria dos meses, gastando altura de tela à toa. |
| Grade + agenda contínua | grade + só o dia tocado | Numa tela alta de iPhone cabe a pergunta "o que vem pela frente" sem precisar tocar dia a dia. |
| Tarefa sem data fica fora, com aviso no rodapé | — | A tela antiga do iPhone agrupava essas tarefas sob um cabeçalho em branco. Agora saem da agenda, mas o rodapé diz quantas são para não sumirem caladas. |

### Ainda não portado

**Projeção de ocorrências futuras.** O Android projeta as próximas ocorrências de uma série
recorrente na grade (`calendarTasksForMonth`). O iPhone ainda não: falta portar
`advanceRecurrenceDate` e `calendarTasksForMonth`. Decisão consciente, para não arrastar o motor de
recorrência junto com a reforma do calendário.

Os campos de que esse motor precisa **já estão no `PopTask`** desde o cofre da recorrência (abaixo),
então quando a projeção for feita o dado já estará ali.

### Cofre da recorrência

`RecurrenceKind` só representa quatro casos; o servidor guarda mais — intervalo, data de término,
dia do mês, e um tipo `"Personalizada"` sem equivalente nenhum no iPhone.

Como o PUT de tarefas faz `existing.recurrence = mobileTaskRecurrence(item)` **sem condição**
([mobile-api.server.ts:1663](src/lib/mobile-api.server.ts:1663)), e essa função reconstrói a
recorrência só a partir do que o aparelho manda, tudo que o iPhone não transportasse voltava como
default e apagava o original — inclusive para quem abre no Android ou no painel:

- `"Personalizada"` → caía no `else` do enum → voltava `"Não repetir"` → **recorrência apagada**
- `biweekly` → intervalo descartado → voltava 1 → **"a cada 2 semanas" virava "toda semana"**
- `endDate` → modo de término descartado → voltava `"Nunca"` → **"até 31/12" virava "para sempre"**

E o gatilho era qualquer ação: `update(sync = true)` dispara `syncTasks()`, cujo payload é
`visibleTasks.map { it.toApiTask() }` — o espaço inteiro por vez.

`PopTask` passou a carregar as seis strings cruas do servidor (`recurrenceRule`,
`recurrenceDetail`, `recurrenceInterval`, `recurrenceEndMode`, `recurrenceEndValue`,
`recurrenceOccurrence`). **O iPhone não as interpreta nem as exibe — só as carrega.** O
`RecurrenceKind` continua existindo, agora como valor derivado, só para a interface desenhar.

Nunca chegou a atingir ninguém: o `composeApp` não compilava antes desta semana, então nunca houve
um iPhone sincronizando de fato.

**Ainda impreciso:** `nextRecurrenceDate` (`PopStore.kt`), usado por "excluir somente esta data",
avança por período fixo e ignora o `recurrenceInterval` que agora existe. Numa série de duas em duas
semanas ele pula uma semana. O servidor recalcula na sincronização seguinte, então o efeito é
local e passageiro — mas é o primeiro lugar a corrigir quando o motor for portado.

---

## Datas

`kotlinx-datetime` **não tem localização**. O Android resolve com
`getDisplayName(TextStyle.FULL, Locale("pt","BR"))`, mas `getDisplayName` e `Locale` vêm do
`java.time` e não existem no iOS; `LocalDate.toString()` devolve sempre o ISO cru. Os nomes de mês e
dia em português ficam declarados em `PopDates.kt`, e essa é a única cópia deles.

O número do dia da semana sai de `toEpochDays()` em vez de `DayOfWeek.isoDayNumber`. Não é
preciosismo: **não há SDK do Android na máquina de desenvolvimento do iOS**, então o único
compilador é o CI e cada aposta em binding custa um build inteiro. `toEpochDays()` é membro de
`LocalDate` e não depende de import nenhum.

---

## Domínio

`RecurrenceKind` ganhou `Yearly("Anual")`. Não é divergência — é correção. O servidor manda "Anual",
o Android sempre soube ler, e o iPhone caía no `else`: a tarefa anual virava "sem recorrência",
calada. Sumia o selo, o menu de exclusão perdia a opção "toda a recorrência", e o app devolvia a
tarefa ao servidor com a recorrência apagada.

`WorkspacePermissions` passou a vir do servidor em vez de ser adivinhada por
`role.contains("admin")`. `isCurrentUserAdmin` em `PopStore.kt` ainda usa o método antigo e é a
próxima a cair.

---

## Pendências que não são de código

- Conta no Apple Developer Program — trava todo o resto.
- `APPLE_CLIENT_ID` publicado na VPS (André).
- `TARGETED_DEVICE_FAMILY` está `"1,2"` com interface de telefone, e a Apple revisa no iPad.
  Ou adaptar, ou declarar só iPhone.
- Login com Apple e exclusão de conta nunca foram testados em aparelho real. A Apple testa os dois
  (Review 5.1.1).
