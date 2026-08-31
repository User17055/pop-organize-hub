# Para o André

Atualizado em **2026-08-31**.

O que mudou desde a versão anterior: **o problema do `recurrenceTimes` foi consertado por você em
`da2f6fa` (28/08) e o conserto está certo** — conferido linha por linha contra o schema. A parte
técnica dele saiu deste documento, junto com tudo o mais que já foi resolvido.

**Atualizado de novo em 31/08, depois do seu deploy:** o deploy resolveu o `400` e a tela
`/tarefas`. Sobrou um problema de dado no servidor (item 1), o conserto dos acentos, e duas coisas
para a fila.

---

## 0. ✅ O deploy saiu — obrigado. E ele resolveu o que devia.

Confirmado em aparelho em 31/08: a sincronização parou de levar `400 — "Lista de tarefas
inválida."`. A tela `/tarefas` também voltou a abrir, porque o conserto dela (`14eb687`) entrou
junto no mesmo deploy.

**Mas apareceu outra coisa, e essa é do servidor.** Ver o item 1 abaixo, que substituiu o pedido de
deploy.

---

## 1. 🔴 O servidor guarda tarefa que a validação dele mesmo recusa

Agora que a carga passa pelo zod, ela chega no `replaceMobileTasks` e leva **409**:

> "Uma ocorrência recorrente só pode ser concluída quando chegar a sua data."

O problema não é a regra — é que **existe dado gravado violando ela**. Há ocorrência recorrente com
`completed = true` e `dueDate` no futuro dentro do banco. O `PUT` recusa, mas alguma outra rota
gravou. E como o servidor valida a lista inteira de uma vez, **um item assim impede qualquer tarefa
nova de subir**, de qualquer aparelho.

Pior: dá laço. O app desfazia a conclusão localmente ao receber 409, o sync seguinte passava, o
`refreshTasks` trazia a mesma conclusão de volta do servidor, e recomeçava.

**Do lado do app já está contornado** (build 10): a tarefa que viola a regra simplesmente não vai
na carga. Não destrói nada — o `replaceMobileTasks` só apaga o que vem em `deletedServerIds` — e
desbloqueia todo o resto.

**O que fica com você**, quando puder:

1. Achar por onde uma ocorrência futura é marcada como concluída sem passar por essa checagem (o
   painel e o Android são os candidatos) e aplicar a mesma regra lá.
2. Limpar as que já estão gravadas assim, senão elas seguem invisíveis para a sincronização móvel.

Enquanto isso o app funciona; só aquelas ocorrências específicas ficam sem sincronizar.

---

## 2. ~~URGENTE — falta o deploy~~ ✅ FEITO em 31/08

Mantido só para registro do que era, já que o resto do documento faz referência.

<details>
<summary>o que estava escrito aqui</summary>

**É o único item que trava alguém agora.** Não precisa de código novo: o seu conserto está pronto e
correto, só não chegou no servidor.

Enquanto não sair um deploy, **nenhuma tarefa criada em celular nenhum sobe** — iPhone e Android,
todos os espaços, todos os usuários. A tarefa fica presa no aparelho.

```bash
cd /var/www/pop-organize && bash deploy/release.sh
```

> O `bash` na frente é porque o `deploy/release.sh` está versionado sem bit de execução
> (modo `100644`). Vale corrigir com `git update-index --chmod=+x deploy/release.sh` quando sobrar
> um minuto.

**Antes de rodar, se puder, manda o que aparece aqui:**

```bash
cd /var/www/pop-organize && git log -1 --oneline && git branch --show-current
```

Serve para confirmar de que ponto o servidor saiu. Hoje não há outro jeito de perguntar isso: o
`/api/health` devolve só `status`, `database` e `timestamp` — **não informa a versão**. Se quiser,
dá para acrescentar o commit ali depois; ajudaria em toda investigação futura.

### O mesmo deploy conserta a tela `/tarefas`, de brinde

A tela quebrar em produção (`Minified React error #310`, *"Rendered more hooks than during the
previous render"*) **não é bug aberto.** O conserto é o commit `14eb687`, de 21/08, e está no
`main` desde o merge `74b062e`.

O que mantém o erro no ar é a versão publicada:

| Verificação | Resultado |
| --- | --- |
| `14eb687` (conserto do `/tarefas`) está em `d89358a`? | **não** |
| `d89358a` (schema novo) está em `74b062e`? | sim |
| `14eb687` está em `74b062e`? | sim |

Os dois só se encontram no merge, de 26/08 16h52. O `d89358a` é de 26/08 13h58. E o servidor
publicado tem o schema do `d89358a` (comprovado em aparelho no dia 27). Ou seja: **o que está no ar
saiu da janela entre 13h58 e 16h52 daquele dia** — tem o schema novo e não tem o conserto da tela.

Uma causa só explica os dois sintomas. Um `systemctl restart` resolve os dois, porque o endpoint
móvel e o painel são o **mesmo processo Node**.

</details>

---

## 3. Acentos corrompidos — e duas correções ao que eu te mandei antes

`"Gest?o e opera??es da empresa SAO FRANCISCO"`, na descrição da empresa e na do setor
Administrativo. Aparece igual na resposta de rede, então está gravado assim.

**Desculpa: a versão anterior deste documento te deu duas pistas erradas.**

### Errado #1 — "conferir se a conexão usa `utf8mb4`"

Não é a conexão. No **mesmo banco** há texto acentuado correto — "Alimentação dos Equinos" e
"RECEPÇÃO". Charset errado na conexão quebraria esses também. A corrupção entrou na importação da
planilha, e o importador não está neste repositório, então só você consegue evitar que se repita na
próxima importação.

### Errado #2 — "é um UPDATE pontual, são poucos registros"

Não existem "registros" no plural. A plataforma inteira é **uma linha só**: tabela `app_state`,
`id = 'default'`, uma coluna `data JSON` (`src/lib/database.server.ts`, na criação do schema e nas
quatro consultas que a usam).

### E o principal: o dado original se perdeu

`Gestão` virou `Gest?o` — o acento virou literalmente `?`. Isso é substituição, não codificação
errada: **não dá para decodificar de volta.** Os textos precisam ser **redigitados**.

### Dois cuidados na hora de corrigir

- **Não faça leitura-e-gravação com o serviço no ar sem transação.** Se alguém salvar qualquer
  coisa pelo painel entre a sua leitura e a sua gravação, você apaga o que a pessoa fez. Ou use
  `SELECT ... FOR UPDATE` dentro de transação, como o `mutateDatabase` já faz, ou pare o serviço
  durante a correção.
- **Cuidado ao varrer por `?`** — é pontuação legítima em texto normal. Conferir cada ocorrência
  antes de trocar.

Conhecidos até agora: descrição da empresa e do setor Administrativo. Pode haver mais, vindos da
mesma importação.

---

## 4. Para a fila — o app não consegue excluir tarefa recorrente

Sem pressa, mas registro porque a causa foi confirmada e **não tem conserto possível do lado do
app**.

No iPhone, o menu de exclusão de uma tarefa recorrente oferece "Somente esta data" e "Toda a
recorrência". **Nenhuma das duas funciona**, e a segunda ainda corrompe dado.

### Por que "toda a recorrência" não funciona

O `MobileTask` não expõe o id da série. O app não tem como saber quais tarefas pertencem à mesma
série, então apaga uma linha só. O servidor **tem** o campo — `recurrenceParentId`, em
`src/lib/domain.ts` — e o `src/lib/recurrence.server.ts` já usa exatamente
`task.recurrenceParentId ?? task.id`.

### Por que "somente esta data" também não funciona

Esta é a parte que eu tinha entendido errado até hoje. Mesmo que o app mandasse o `serverId` da
ocorrência em `deletedServerIds` e ela fosse apagada de verdade, **o `materializeRecurringTasks`
recria a linha na chamada seguinte**: ele caminha da data do modelo até hoje e cria toda data que
não esteja em `existingDates` **nem em `recurrenceExcludedDates`**.

E `recurrenceExcludedDates` **não existe no contrato móvel** — zero ocorrências em
`mobile-api.server.ts` e em `routes/api/mobile/tasks.ts`. O app não tem como dizer "exclua esta
data".

Some-se a isso que o PUT faz `existing.dueDate = item.dueDate`, ou seja, **adota** a data que o
aparelho manda. Hoje o app avança a data localmente ao "excluir só esta ocorrência", o servidor
grava essa data, e a série sai de fase — **de forma permanente, e também para o Android e o
painel**.

### O que destravaria

Duas linhas, se você concordar com a forma:

```ts
// em taskToMobileTask, e os campos correspondentes no schema de tasks.ts
recurrenceSeriesId: task.recurrenceParentId ?? task.id,
recurrenceExcludedDates: task.recurrenceExcludedDates ?? [],
```

Do lado do app eu faço o resto. **Sem risco para quem já está no ar:** o `mobileTaskSchema` é um
`z.object` sem `.strict()`, então campo desconhecido é descartado, não recusado — as duas pontas
podem subir em ordem qualquer.

Enquanto isso não existe, vou desligar no app a opção que corrompe a data, para parar o sangramento.

---

## 5. Também na fila — campos que o app recebe, descarta e devolve como padrão

Continuam abertos, mesma mecânica: o `ApiTask` do lado Kotlin não tem esses campos, então o app os
devolve com o valor padrão e o servidor grava por cima.

- **`assignees`** — o servidor manda a lista de responsáveis e no PUT faz
  `item.assignees ? … : [item.assignee]`. Como o campo não existe no app, cai sempre no ramo de
  trás — e o que o app manda em `assignee` é o rótulo do **alvo** (o setor), não as pessoas. Numa
  tarefa de setor com dois responsáveis, sincronizar do celular zera os dois.
- **`reminder`** — o pior do grupo, porque o servidor grava **sem nenhuma condição**. Marcar um
  lembrete pelo painel e depois concluir uma tarefa qualquer no iPhone apaga os lembretes do
  usuário no espaço inteiro.
- **`attachmentName`** — zera o contador de anexos, e **não é por usuário**: atinge todo mundo.
- **`duration`** e **`assignedBy`** — mesma família, efeito menor.

O conserto é do lado do app (carregar cru e devolver intacto, como já é feito com os campos de
recorrência) e **eu faço**. Está aqui só para você saber que existe, e porque acrescentar campo ao
`ApiTask` mexe com serialização — se algum deles for mudar de forma no servidor, é melhor eu saber
antes.

### Um candidato, não confirmado

`taskToMobileTask` lê `native?.recurrenceRule ?? recurrence.rule`, dando precedência ao
`nativeData`. Se nenhum caminho do painel atualiza esse campo, uma recorrência editada no painel
voltaria ao valor antigo quando o celular sincronizasse. **Não verifiquei** — fica como suspeita,
não como fato.

---

## Já resolvido — não precisa de nada seu

- **`recurrenceTimes` recusava o próprio valor padrão.** Consertado por você em `da2f6fa`, com
  `.refine()` aceitando zero ou dois-ou-mais. Conferido: é exatamente o que faltava. **Falta só o
  deploy** (item 1).
- **Nulos explícitos contra campos `.optional()`** (`serverId`, `assignmentType`,
  `assignmentTargetId`, `assignmentTargetLabel`). Era o serializador do app escrevendo `null`
  explícito onde o zod aceita a chave ausente mas recusa `null`. Resolvido do lado do app com
  `explicitNulls = false`.
