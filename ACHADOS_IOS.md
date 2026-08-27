# Achados verificados no app iOS e no contrato — pendentes de conserto

Levantados na revisão do PR #3 em 2026-08-26, **todos verificados lendo os dois lados do código**.
O que foi consertado está nos commits `7855357` e `4862e4e` e não se repete aqui.

Ordenado por gravidade. Cada item traz o que foi verificado, o cenário concreto e a proposta.

## Estado em 2026-08-27 (build 8)

| Item | Estado |
| --- | --- |
| 1 — resíduo de conta no disco | ✅ **consertado no build 8** |
| 2 — congelamento por 409 | ✅ **consertado no build 8** |
| 3 — `assignees` não volta | ⏸ bloqueado no item 7 |
| 4 — quatro campos descartados | ⏸ bloqueado no item 7 |
| 5 — `deleteTaskSeries` | ⏳ aberto |
| 6 — `nextRecurrenceDate` | ⏳ aberto (conserto limpo depende do servidor) |
| 7 — `recurrenceTimes` | 🔴 **confirmado em produção**, bloqueado no André |
| 8 — `nativeData` | ❓ não verificado |

**O build 8 também levou quatro defeitos achados no teste em aparelho do build 7**, que nunca
chegaram a virar item desta lista porque foram consertados no mesmo dia: espaço pessoal oferecendo
pessoas e setores de empresa, o diálogo de exclusão com botões sobrepostos, a faixa morta abaixo da
barra de abas, e o cartão principal anunciando "349 tarefas para hoje" (seção C1 do
`ACHADOS_PAINEL.md`). Detalhes na mensagem do commit.

---

## 1. ✅ CONSERTADO NO BUILD 8 — Resíduo de conta anterior fica no disco depois do logout

`PopStore.kt`, `refreshFromServer()`.

A função captura o token no início e grava o estado no fim (`state = state.copy(...)` seguido de
`persist()`) **sem reconferir se a sessão ainda existe**.

**Cenário:** puxar-para-atualizar e tocar "Sair" antes da resposta chegar. O `signOut()` zera
`companies` e `personalWorkspaceId`; a resposta chega depois e repovoa os dois; o `persist()` grava
em disco. Ficam no aparelho, numa sessão sem token, os nomes das empresas, os **e-mails dos
funcionários** e os setores da conta anterior.

**Por que isto é constrangedor:** hoje eu consertei exatamente essa corrida no `signOut()`, fazendo
o logout esperar o `syncJob`. Mas o `refreshFromServer` é disparado por outros quatro caminhos e
**não é rastreado pelo `syncJob`**. O conserto cobriu metade do problema e foi apresentado como se
cobrisse o todo.

**Conserto aplicado no build 8** — uma linha, antes do `state.copy`:

```kotlin
if (state.apiToken != token) return
```

Prioridade alta: é dado pessoal de terceiros sobrevivendo a um logout, num aparelho que pode ser
compartilhado.

## 2. ✅ CONSERTADO NO BUILD 8 — Um toque errado congela a sincronização inteira

`mobile-api.server.ts:1702` e `PopStore.kt` (`syncTasks`, `refreshTasks`).

O servidor recusa a **carga inteira** com 409 quando qualquer item vem concluído com
`recurrenceOccurrence > 1` e data futura. O app não tem defesa: ignora os campos
`canEdit`/`canComplete`/`canDelete` que o servidor manda, e não há guarda no `toggleTask` nem na
interface.

**Cenário:** na agenda, marcar por engano a ocorrência da semana que vem de uma tarefa semanal. O
PUT volta 409, o `completed = true` fica salvo no aparelho, e **todo** `update()` seguinte reenvia o
mesmo item e leva 409 de novo. As tarefas criadas depois não sobem. Mandar o app para segundo plano
e voltar dispara `refreshTasks()`, que substitui a lista pela do servidor e descarta as locais.

**Conserto aplicado no build 8**, nas duas partes propostas:

1. `toggleTask` recusa concluir ocorrência futura de série recorrente e explica o motivo, em vez de
   deixar o toque passar e o servidor recusar depois.
2. `syncTasks`, ao receber **409**, reverte localmente as conclusões que a regra do servidor proíbe,
   em vez de deixá-las envenenando toda sincronização futura.

A regra foi reimplementada no cliente (`completed && recurrenceOccurrence > 1 && dueDate > hoje`)
espelhando `mobile-api.server.ts:1702`. A alternativa fiel seria ler os flags `canComplete` que o
servidor já manda — mas isso exige campo novo no `ApiTask`, e **o item 7 explica por que acrescentar
campo ali é perigoso hoje**. Quando o item 7 sair, vale trocar a regra local pelo flag.

## 3. `assignees` não faz o caminho de volta — sincronizar zera os responsáveis

`Domain.kt` (`ApiTask`), `PopStore.kt` (`toApiTask`), `mobile-api.server.ts:1506`.

O servidor manda a lista de responsáveis em `assignees` e no PUT faz
`item.assignees ? … : [item.assignee]`. O `ApiTask` **não tem esse campo** — verificado, zero
ocorrências — então cai sempre no ramo de trás. E o que o app manda em `assignee` é o rótulo do
**alvo** (o setor), não as pessoas, porque `toPopTask` prefere `assignmentTargetLabel`.

**Cenário:** tarefa de empresa com alvo no setor "Comercial" e Ana e Bruno como responsáveis.
Concluir **outra** tarefa qualquer no iPhone reenvia a lista visível inteira; o servidor procura um
funcionário chamado "Comercial", não acha, e grava `responsibleIds = []`. Ana e Bruno perdem a
tarefa no Android e no painel.

**Proposta:** `assignees: List<String> = emptyList()` no `ApiTask`, carregado cru no `PopTask` como
já é feito com os seis campos de recorrência, e devolvido em `toApiTask()`.

> **Atenção antes de implementar:** ver o item 7. Adicionar campo ao `ApiTask` interage com o
> `encodeDefaults`, e um passo em falso quebra toda a sincronização.

## 4. Quatro campos que o app recebe, descarta e devolve como padrão

`reminder`, `attachmentName`, `duration` e `assignedBy`. Mesma mecânica do item 3.

O `reminder` é o pior porque o servidor grava **sem nenhuma condição**
(`mobile-api.server.ts:1717`): marcar um lembrete pelo painel e depois concluir uma tarefa qualquer
no iPhone apaga os lembretes do usuário no espaço inteiro. O `attachmentName` zera o contador de
anexos e **não é por usuário** — atinge todo mundo.

**Proposta:** mesmo padrão do cofre de recorrência. Carregar cru e devolver intacto.

## 5. "Excluir toda a recorrência" não exclui nada

`PopStore.kt`, `deleteTaskSeries()`. Duas falhas somadas, ambas verificadas:

1. **Não alimenta `pendingDeletedServerIds`** — compare com `deleteTask`, que alimenta. O PUT só
   apaga o que vem nessa lista; tarefa ausente da carga é ignorada. E o `syncTasks` chama
   `refreshTasks()` logo depois, então o que sumiu da tela volta na mesma rodada.
2. **`recurrenceSeriesId` só é preenchido em tarefa criada no aparelho** (`PopStore.kt:237`, dentro
   do `addTask`). O `toPopTask()` nunca o preenche, então **toda tarefa vinda do servidor tem
   `null`**, o `seriesId` vira o próprio id, e o filtro casa exatamente uma tarefa.

**Cenário:** tarefa semanal vinda do servidor, menu "excluir toda a recorrência". Some **uma** linha
da tela; as outras ficam; um a dois segundos depois a que sumiu reaparece.

**Proposta:** o conserto completo depende de o servidor expor o id da série (`recurrenceParentId`
não vai no `MobileTask`). O parcial — juntar os `serverId` removidos em `pendingDeletedServerIds` —
pelo menos faz a exclusão valer para a tarefa tocada, em vez de não fazer nada.

## 6. `nextRecurrenceDate` continua com a conta errada — e o efeito é permanente

Já documentado no KDoc da própria função (corrigido no commit `4862e4e`), mas **o defeito segue de
pé**. Resumo: o servidor faz `existing.dueDate = item.dueDate`, ou seja, **adota** a data que o
aparelho manda. Não recalcula. Com a recorrência por dias da semana que entrou hoje, a conta do
cliente erra em três casos — semanal com dias marcados, diária com dias excluídos, e mensal com dia
do mês.

**Proposta:** o conserto limpo não cabe no cliente. Ou o servidor passa a expor a próxima data da
série, ou "excluir somente esta ocorrência" vira exclusão de verdade via `pendingDeletedServerIds`.

## 7. 🔴 `recurrenceTimes` — CONFIRMADO EM PRODUÇÃO, bloqueado no André

> **27/08:** deixou de ser dedução. Um espaço **pessoal** com **uma** tarefa trivial recebeu
> `400 — "Lista de tarefas inválida."` do servidor de produção. O JSON exato foi reconstruído e
> validado: passa no schema antigo, reprova no atual, em `recurrenceTimes`. **A sincronização de
> tarefas está morta para iOS e Android, em todos os espaços.** Ver `PARA_ANDRE.md`.

O campo é novo no contrato (`d89358a`) e o `ApiTask` não o tem. O zod é
`.min(2).max(12).optional().default([])`, e **o zod valida o próprio valor padrão**: `[]` reprova no
`.min(2)`, então a chave ausente é recusada. Isolado e provado.

**A armadilha:** o `json` do `PopStore.kt` tem `encodeDefaults = true` — que é **obrigatório**,
porque o schema móvel tem 18 campos estritamente exigidos que no `ApiTask` têm valor padrão. Somar
`recurrenceTimes: List<String> = emptyList()` faria toda sincronização mandar `[]`, e o `.min(2)`
reprovaria **tudo**.

Ou seja: **não dá para consertar do lado do app** enquanto o schema do servidor for esse. Depende do
André afrouxar o `.min(2)` para aceitar lista vazia. Proposta pronta em `PARA_ANDRE.md`.

## 8. NÃO VERIFICADO — `nativeData` com precedência sobre a recorrência real

Um revisor apontou que `taskToMobileTask` lê `native?.recurrenceRule ?? recurrence.rule`, dando
precedência ao `nativeData`, e que nenhum caminho do painel web atualiza esse campo — o que faria
uma recorrência editada no painel voltar ao valor antigo quando o celular sincroniza.

**Não confirmei.** Fica como candidato, não como fato.

---

## Dívida operacional

**O número do build do TestFlight é manual.** O `ios-release.yml` não incrementa
`CURRENT_PROJECT_VERSION` sozinho, e o projeto tem `4` fixo. Quem disparar sem passar
`build_number` explicitamente reenvia um número já usado, e o App Store Connect recusa por
duplicidade — sem explicar direito o porquê.

**Último número enviado: 7** (2026-08-26, versão 1.0.3). O próximo tem de ser 8 ou maior — e o
lote de 2026-08-27 foi preparado justamente para ir como **build 8**. Atualizar esta linha assim que
ele subir.

**Proposta:** fazer o workflow usar `github.run_number` como padrão quando a entrada vier vazia,
ou ler o último build do App Store Connect pela API.

---

## Onde está o resto

- **Painel web:** `ACHADOS_PAINEL.md`
- **O que depende do André:** `PARA_ANDRE.md`
- **Ficha da App Store:** `FICHA_LOJA.md`
- **Calibração das telas do iPhone contra dados reais:** seção C do `ACHADOS_PAINEL.md` — 16
  setores, 361 tarefas, 354 atrasadas. É o item de maior impacto e não está nesta lista porque não
  é bug, é decisão de design a refazer.
