# Achados da exploração do painel web — 2026-08-26

Exploração **somente leitura** do painel em produção (`app.poporganize.com.br`), espaço SÃO
FRANCISCO, com dados reais. Nada foi criado, editado ou excluído.

**Estado da exploração: CONCLUÍDA.** Oito rotas visitadas, uma quebrada. O que ficou por verificar
está na seção final, nomeado.

> ## ⚠️ CORREÇÃO de 27/08/2026 — leia antes do resto
>
> Este documento afirmava, no dia 26, que **o servidor no ar era antigo**, e usava isso para
> descontar os achados de interface ("descrevem código velho, podem já estar consertados").
>
> **Essa ressalva está retirada.** No dia 27, o app no iPhone recebeu do servidor de **produção**
> uma recusa que só o código do `d89358a` (26/08) produz — provado reconstruindo o JSON exato e
> validando contra os dois schemas com o zod do projeto (detalhe em `PARA_ANDRE.md`). Ou seja: **o
> servidor em produção está atualizado.**
>
> **De onde veio o erro.** A conclusão do dia 26 saiu de uma evidência *indireta*: baixei o bundle
> servido (`index-Ch4OQqWF.js`) e não achei `recurrenceTimes`, `excludedWeekDays`, `"Não repetir
> nestes dias"` nem `manage.permissions`. A aferição — procurar `"Algo deu errado"`, que estava lá
> — só provava que o arquivo era o certo, **não** que era o mais recente; um bundle em cache
> passaria igual nessa prova. O aparelho é evidência direta e ganha da inferência.
>
> **Consequência, e ela é o motivo desta correção existir:** o achado **A1** (`/tarefas` quebrada)
> deixa de ser "provavelmente já consertado" e passa a ser **candidato a defeito no código atual**.
> Foi assim que ele entrou no `PARA_ANDRE.md`.
>
> As duas evidências ainda não foram plenamente reconciliadas — pode ser cache de CDN, pode ser
> deploy parcial (servidor sem cliente). A conferência barata é reabrir o painel e procurar
> `recurrenceTimes` no bundle servido agora. **Está listado na seção E como não verificado.**

---

## Mapa das rotas

| Rota | Estado |
| --- | --- |
| `/` Dashboard | ✅ |
| `/tarefas` | 🔴 **quebrada** |
| `/calendario` | ✅ |
| `/setores` | ✅ |
| `/grupos` | ✅ (vazio) |
| `/relatorios` | ✅ |
| `/funcionarios` | ✅ |
| `/permissoes` | ✅ |
| `/empresas` | ✅ |

---

## A. Bugs

### A1 — `/tarefas` quebra por completo (GRAVE)

**Evidência:** tela "Algo deu errado". Console: `Minified React error #310` — *"Rendered more hooks
than during the previous render"*, violação das Rules of Hooks. Três ocorrências por carregamento,
sempre em `index-Ch4OQqWF.js:9:114462`.

**Testado nos dois extremos:** espaço pessoal **vazio** (0 tarefas) e SÃO FRANCISCO com **361**. Quebra
igual. **Não é caminho de estado vazio nem dependente de volume — é incondicional.**

**Proposta (revista em 27/08):** a regra `react-hooks/rules-of-hooks` está ligada no
`eslint.config.js` (via `reactHooks.configs.recommended.rules`) e o código atual passa com zero
erros — então é bug que o eslint **não vê estaticamente**. Como a hipótese "é só deploy velho" caiu
(ver a correção no topo), redeployar deixou de ser o primeiro passo. O caminho é caçar com build
**não minificado**, que devolve o nome do componente no stack. Repassado ao André.

### A2 — Acentos corrompidos nos dados importados

**Evidência:** `"Gest?o e opera??es da empresa SAO FRANCISCO"` na descrição da empresa e do setor
Administrativo. Aparece igual na resposta de rede, ou seja, **está gravado assim no banco**, não é
erro de renderização.

**Não é global:** "Alimentação dos Equinos" e "RECEPÇÃO" aparecem corretos. Atinge os registros
vindos de `tarefas_importar.xlsx` e os criados junto com a empresa.

**Proposta:** problema de charset na conexão ou na leitura da planilha. Conferir se a conexão MySQL
usa `utf8mb4`. O conserto do dado já gravado é um UPDATE pontual; são poucos registros.

### A3 — No celular, o último cartão fica atrás da barra de navegação

**Evidência:** em 375×812, rolando o Dashboard até o fim, o cartão "Cancelada" fica cortado ao meio
pela barra inferior flutuante.

**Proposta:** espaço inferior no contêiner de rolagem, com a altura da barra mais a área segura.

### A4 — "Tarefas recentes" mostra a mesma tarefa cinco vezes

**Evidência:** cinco linhas idênticas de "Controlar preços da Tudo pra Pet", Ana Merino - TI, BAIXA,
Pendente.

**Causa provável:** são ocorrências distintas da **mesma série recorrente**. O
`materializeRecurringTasks` (`src/lib/recurrence.server.ts:176`) cria um registro real por
ocorrência — `workspace.tasks.unshift(task)` — caminhando da data do modelo até hoje. No calendário,
essa mesma tarefa aparece espalhada por vários dias, o que confirma.

**Proposta:** "Tarefas recentes" deveria agrupar por série (`recurrenceParentId`) e mostrar a
próxima ocorrência, não cinco linhas iguais que ocupam a lista inteira.

### A5 — Concordância: "1 pendentes"

**Evidência:** setor Administrativo em `/setores`. Mesmo defeito que foi corrigido no app iOS hoje.

### A6 — Relatórios omite "atrasadas" quando é zero

**Evidência:** todos os setores mostram "N concluídas / N atrasadas / N total"; **Marketing** mostra
só "0 concluídas / 0 total". Inconsistência de layout entre linhas da mesma tabela.

---

## B. Dados (não são bugs de código, mas explicam o resto)

### B1 — 345 tarefas com o mesmo vencimento

O dia 6 de agosto tem **345 tarefas**, com títulos todos diferentes ("Pesagem dos filhotes",
"Alimentação dos Equinos", "Ajuda no Nascimento de Filhotes"...). É a importação de
`tarefas_importar.xlsx`, que atribuiu a mesma data a tudo.

**Consequência:** as **354 atrasadas** de um total de 361 são reais, e são quase todas essa
importação. Não é bug de contagem.

### B2 — 346 de 361 tarefas sem responsável — e isto é ESPERADO, não é defeito

Relatórios: "Com responsável 15 / Sem responsável 346". As tarefas têm **setor**, mas ninguém
designado. Os 15 com responsável se distribuem entre as 5 pessoas.

**Explicação do Guilherme, e ela encerra o assunto:** o app ainda não foi lançado. A ordem
necessária é lançar, os funcionários baixarem, criarem login, e só então as tarefas serem atribuídas
a cada pessoa. Atribuir antes disso não é possível — não há a quem atribuir.

Ou seja, os 346 são o estado correto de uma empresa que carregou o trabalho por setor e está
esperando as pessoas entrarem. **Não deve ser tratado como número a corrigir**, e qualquer leitura
futura destes dados precisa levar isso em conta: é uma foto de pré-lançamento, não de operação.

Fica registrado porque eu apresentei esse número como se fosse achado, e não era.

### B3 — Dados de teste convivendo com dados reais

"kakakakak", "TESTE 1fgkhlglvlvlbllblvkvkckc", "tete andre", "Eae, tudo bem?", "Teste ADM" ao lado de
tarefas legítimas da clínica. Não é bug — é gente testando em produção.

### B4 — ~~O deploy está atrasado~~ (RETIRADO em 27/08)

Era a conclusão do dia 26. **O servidor de produção está atualizado** — provado pelo aparelho. Ver
a correção no topo. O que resta em aberto é apenas o bundle do navegador, que segue sem explicação
e está na seção E.

---

## C. O que isto significa para o app iOS — e é a parte que mais importa

Todo o trabalho de hoje no iPhone foi calibrado contra uma semente de teste com **5 pessoas e 4
setores**. A realidade é **5 pessoas, 16 setores, 361 tarefas, 354 atrasadas**. Três decisões que eu
dei por resolvidas não sobrevivem a esses números:

### C1 — O cartão principal vai anunciar "354 tarefas para hoje" — ✅ CONFIRMADO E CORRIGIDO

**Deixou de ser previsão em 27/08.** O build 7 no iPhone mostrou exatamente isto: **"349 tarefas
para hoje"**, com "348 já passaram do prazo" logo abaixo e o anel em **0%**. Só **uma** tarefa
vencia de fato naquele dia.

O conserto de 26/08 (`PopOrganizeApp.kt`, `DashboardScreen`) fazia `agenda` = tarefas de hoje
**mais atrasadas em aberto**, porque atrasada também é para hoje. Defensável no papel; com 348
atrasadas, o maior texto da tela virou um número sem uso e o anel travou em zero.

**Proposta, aplicada no build 8:** separar as duas ideias. "Para hoje" conta só o que vence hoje;
atrasadas ganham linha própria com o total, sem entrar no denominador do anel. O anel volta a medir
o dia.

Efeito nos mesmos dados: **"1 tarefa para hoje"** + "348 já passaram do prazo", com o anel medindo
a única tarefa do dia.

### C2 — A aba Tarefas abre como uma parede de dezesseis cabeçalhos fechados

A tela agrupa por setor com cabeçalhos recolhidos, e o atalho `flatList` só entra quando existe
**um** grupo. Com 16 setores, quem abre Tarefas não vê tarefa nenhuma — só títulos.

**Proposta:** abrir por padrão os setores com tarefa vencendo hoje ou atrasada, e recolher o resto.
Alternativa: uma visão "todas" achatada e ordenada por prazo como padrão, com o agrupamento por
setor virando filtro.

### C3 — O calendário nunca viu um dia com 345 tarefas

A grade mensal e a agenda foram revisadas com poucas tarefas por dia. O painel resolve com "+342
mais"; o iPhone não tem equivalente conhecido.

**Proposta:** testar a tela de calendário na prévia com uma semente que reproduza esse dia, antes de
qualquer conclusão sobre o que fazer.

### C4 — Uma correção de hoje teve exposição real igual a zero

O conserto do `permissionGroups` em `canViewTask` protege quem tem acesso amplo só por
`tasks.viewAll` — o grupo de sistema "Gestor". Em `/permissoes`, **Gestor tem 0 membros**; as cinco
pessoas estão todas em Administrador. O conserto está certo e continua valendo, mas **não havia
ninguém sendo prejudicado hoje**. Registro para não superestimar o impacto.

---

## D. Uma hipótese minha que foi refutada

Cheguei a concluir que o volume de 361 tarefas poderia ser artefato da materialização de recorrência,
e que portanto os problemas de design em C seriam sintomas de dado errado, não de decisão errada.

**Falso.** Abri o dia 6 e as 345 tarefas têm títulos distintos — é importação de planilha, não série
recorrente. O volume é real e os problemas de C são reais.

Fica registrado porque o erro foi meu e a conclusão anterior chegou a ser comunicada.

---

## E. O que NÃO foi verificado

- **Por que o bundle do navegador parecia antigo se o servidor está atual.** ~~Se o código do
  servidor está tão desatualizado quanto o do navegador.~~ Resolvido pela metade em 27/08: o
  servidor **está** atual. O bundle segue sem explicação — cache de CDN e deploy parcial são as
  duas hipóteses, nenhuma testada. **Conferência barata:** reabrir o painel e procurar
  `recurrenceTimes` no bundle servido agora.
- **Se o `/tarefas` quebra no código atual.** Continua sem resposta, e agora importa mais (ver a
  correção no topo). Não foi possível rodar a aplicação localmente: `database.server.ts` exige
  `DATABASE_URL` e não tem alternativa em memória. Apontar para o banco de produção seria escrever
  nele.
- **O assistente "Falar com a Pop (assistente de IA)".** Não foi aberto.
- **Detalhe de tarefa, edição, criação, convite** — todos exigiriam escrever em produção.
- **A tela `/tarefas` em si**, obviamente: nunca carregou.
- **Se as 5 linhas de "Controlar preços" são mesmo a mesma série.** A causa provável está em A4, mas
  não foi confirmada abrindo cada uma.
