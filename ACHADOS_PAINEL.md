# Achados da exploração do painel web — 2026-08-26

Exploração **somente leitura** do painel em produção (`app.poporganize.com.br`), espaço SÃO
FRANCISCO, com dados reais. Nada foi criado, editado ou excluído.

**Estado da exploração: CONCLUÍDA.** Oito rotas visitadas, uma quebrada. O que ficou por verificar
está na seção final, nomeado.

> **Aviso importante sobre a validade destes achados:** o painel no ar roda um bundle **anterior ao
> trabalho de hoje** — nem o do André, nem o deste PR. Verificado baixando o arquivo servido
> (`index-Ch4OQqWF.js`) e procurando textos que só existem no código de hoje: `"Não repetir nestes
> dias"`, `excludedWeekDays`, `recurrenceTimes` e `manage.permissions` — **nenhum presente**. A
> aferição foi procurar `"Algo deu errado"`, que **está** lá, provando que o arquivo é o certo.
>
> Portanto: os itens de **interface** abaixo descrevem código velho e podem já estar consertados.
> Os itens de **dado** valem independentemente disso.

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

**Proposta:** a regra `react-hooks/rules-of-hooks` está ligada no `eslint.config.js` (via
`reactHooks.configs.recommended.rules`) e o código atual passa com zero erros. O primeiro passo é
**redeployar** e reconferir. Se persistir depois do redeploy, aí é bug que o eslint não vê
estaticamente, e vale caçar com build não-minificado para obter o nome do componente.

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

### B2 — 346 de 361 tarefas sem responsável

Relatórios: "Com responsável 15 / Sem responsável 346". As tarefas têm **setor**, mas ninguém
designado. Os 15 com responsável se distribuem entre as 5 pessoas.

### B3 — Dados de teste convivendo com dados reais

"kakakakak", "TESTE 1fgkhlglvlvlbllblvkvkckc", "tete andre", "Eae, tudo bem?", "Teste ADM" ao lado de
tarefas legítimas da clínica. Não é bug — é gente testando em produção.

### B4 — O deploy está atrasado

Ver o aviso no topo. Nem o trabalho do André de hoje, nem este PR.

---

## C. O que isto significa para o app iOS — e é a parte que mais importa

Todo o trabalho de hoje no iPhone foi calibrado contra uma semente de teste com **5 pessoas e 4
setores**. A realidade é **5 pessoas, 16 setores, 361 tarefas, 354 atrasadas**. Três decisões que eu
dei por resolvidas não sobrevivem a esses números:

### C1 — O cartão principal vai anunciar "354 tarefas para hoje"

O conserto de hoje (`PopOrganizeApp.kt`, `DashboardScreen`) faz `agenda` = tarefas de hoje **mais
atrasadas em aberto**, porque atrasada também é para hoje. Defensável no papel; com 354 atrasadas,
o maior texto da tela vira um número sem uso, e o anel de progresso marca perto de zero
permanentemente.

**Proposta:** separar as duas ideias. "Para hoje" conta só o que vence hoje; atrasadas ganham linha
própria com o total, sem entrar no denominador do anel. O anel volta a medir o dia.

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

- **Se o código do servidor está tão desatualizado quanto o do navegador.** Só o bundle do
  navegador foi testado. A tentativa de sondar o lado servidor falhou por erro meu, e não foi
  repetida para não mexer em produção.
- **Se o `/tarefas` quebra no código atual.** Não foi possível rodar a aplicação localmente:
  `database.server.ts` exige `DATABASE_URL` e não tem alternativa em memória. Apontar para o banco
  de produção seria escrever nele.
- **O assistente "Falar com a Pop (assistente de IA)".** Não foi aberto.
- **Detalhe de tarefa, edição, criação, convite** — todos exigiriam escrever em produção.
- **A tela `/tarefas` em si**, obviamente: nunca carregou.
- **Se as 5 linhas de "Controlar preços" são mesmo a mesma série.** A causa provável está em A4, mas
  não foi confirmada abrindo cada uma.
