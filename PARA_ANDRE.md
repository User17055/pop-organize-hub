# Para o André — dois problemas no endpoint móvel de tarefas

Encaminhar as duas versões: a curta explica o efeito, a técnica explica a causa.

---

## Versão curta

> André, achamos dois problemas no `PUT /api/mobile/tasks` que fazem o app **recusar toda
> sincronização de tarefas**. Um deles é do código de recorrência que você subiu hoje, e ele
> derruba o Android também — não é só o iPhone.
>
> **O que acontece na prática:** qualquer app que sincronize tarefas recebe de volta um erro 400
> ("Lista de tarefas inválida"). Nenhuma tarefa sobe. E como o servidor valida a lista inteira de
> uma vez, basta um item para reprovar tudo: se a pessoa tiver 40 tarefas e uma delas tropeçar,
> as 40 ficam paradas no aparelho.
>
> **A causa do lado novo:** o campo `recurrenceTimes` (tarefa que repete em vários horários) foi
> declarado exigindo no mínimo 2 horários, mas com valor padrão de lista vazia. A lista vazia não
> passa na própria exigência de "mínimo 2", então **até quem não manda o campo é recusado**. Como
> o app hoje não manda esse campo, todo mundo cai nisso.
>
> **A causa do lado antigo:** quatro campos que o app envia como "nulo" (`serverId`,
> `assignmentType`, `assignmentTargetId`, `assignmentTargetLabel`) são declarados como opcionais
> no servidor — e "opcional" aceita o campo faltando, mas recusa o campo presente valendo nulo.
> Esse a gente já consertou do lado do app; não precisa de nada seu.
>
> O primeiro só você consegue consertar, porque é o schema do servidor e depende de deploy. É uma
> linha.

---

## Versão técnica

### Problema 1 — `recurrenceTimes` recusa o próprio valor padrão (introduzido hoje, quebra Android e iOS)

**Arquivo:** `src/routes/api/mobile/tasks.ts`, linhas 21–25.

```ts
recurrenceTimes: z
  .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
  .min(2)
  .max(12)
  .optional()
  .default([]),
```

O zod **valida o valor que o `.default()` produz**. Quando a chave está ausente, ele substitui por
`[]` e roda o schema interno em cima — e `[]` reprova no `.min(2)`. Resultado: a chave ausente é
recusada.

Isolei o comportamento (zod 3.25.76, a versão do projeto):

```js
z.object({ t: z.array(z.string()).min(2).max(12).optional().default([]) }).safeParse({})
// -> RECUSA: "Array must contain at least 2 element(s)"

z.object({ t: z.array(z.string()).max(12).optional().default([]) }).safeParse({})
// -> PASSA (default [] aplicado)
```

Como `mobileTasksPayloadSchema` valida `tasks` como array e a rota faz um `safeParse` só, **um
item reprovado derruba a carga inteira** — `tasks.ts:87` devolve 400 "Lista de tarefas inválida."
para todas as tarefas, não só a que tropeçou.

**Correção sugerida** — tirar o `.min(2)` do schema e mover a regra para onde ela realmente vale,
permitindo o vazio:

```ts
recurrenceTimes: z
  .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
  .max(12)
  .optional()
  .default([])
  .refine((v) => v.length === 0 || v.length >= 2, {
    message: "Informe pelo menos dois horários, ou nenhum.",
  }),
```

Assim "nenhum horário" continua sendo estado válido (que é o que 100% dos clientes mandam hoje) e
"um horário só" segue recusado, que era a intenção do `.min(2)`.

### Problema 2 — nulos explícitos contra campos `.optional()` (antigo, já consertado no app)

**Contexto, porque o padrão pode repetir:** o `ApiTask` do lado Kotlin tem quatro campos nuláveis
com padrão `null` — `serverId`, `assignmentType`, `assignmentTargetId`, `assignmentTargetLabel`. O
serializador estava configurado com `encodeDefaults = true`, que escrevia os quatro como `null`
explícito no JSON. No `mobileTaskSchema` os quatro são `.optional()`, e em zod isso aceita a chave
**ausente** e recusa `null`.

Testado contra o schema real extraído de `tasks.ts`:

```
RECUSA  (nulls explicitos)
  -> tasks.0.serverId: Expected string, received null
  -> tasks.0.assignmentType: Expected 'company'|'department'|'group'|'user', received null
  -> tasks.0.assignmentTargetId: Expected string, received null
  -> tasks.0.assignmentTargetLabel: Expected string, received null
```

`assignmentTargetId` é nulo em toda tarefa "Sem responsável", então isso valia para quase toda
carga.

**Já corrigido do lado do app** (`PopStore.kt`), com `explicitNulls = false` somado ao
`encodeDefaults = true`: os 18 campos obrigatórios do schema continuam sendo escritos e os nulos
somem. Não precisa de nada no servidor.

Se preferir blindar os dois lados, `.nullish()` no lugar de `.optional()` nesses quatro campos
tornaria o schema tolerante — mas aí `authenticateMobileApple` e afins passam a receber `null`
onde o tipo diz `string | undefined`, então exigiria normalizar com `?? undefined`. Fica a seu
critério; do lado do app já está resolvido.

---

## Três achados menores, para a fila (não urgentes)

1. **`assignees` não faz o caminho de volta.** O servidor manda a lista de responsáveis e no PUT
   faz `item.assignees ? … : [item.assignee]`. O `ApiTask` não tem esse campo, então cai sempre no
   ramo de trás — e o que o app manda em `assignee` é o rótulo do **alvo** (o setor), não as
   pessoas. Numa tarefa de setor com dois responsáveis, sincronizar do celular zera os dois.
   Mesma família: `reminder`, `attachmentName`, `duration` e `assignedBy`.

2. **`nativeData` tem precedência sobre a recorrência real** em `taskToMobileTask`
   (`native?.recurrenceRule ?? recurrence.rule`), e nenhum caminho do painel web atualiza o
   `nativeData`. Recorrência editada no painel volta para o valor antigo quando o celular
   sincroniza.

3. **`existing.dueDate = item.dueDate`** (`mobile-api.server.ts:1768`) adota a data que o celular
   manda. Combinado com "excluir somente esta ocorrência", que no app é aritmética de data no
   cliente, uma série com dias da semana marcados sai da fase. O conserto limpo seria o servidor
   expor a próxima data da série.
