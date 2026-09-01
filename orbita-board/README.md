# Órbita Board

Painel de projetos de um estúdio de design fictício — Kanban, lista e tabela, com
prazo, prioridade, filtros e edição de tarefas. Escrito em TypeScript, sem nenhuma
dependência de runtime: o build gera um único HTML autocontido.

Todos os dados são fictícios e vivem em memória. Recarregar a página volta ao estado inicial.

## Rodar

```bash
npm install
npm run build      # tsc + build.mjs
```

Abra `dist/Orbita-Board.html` no navegador. Durante o desenvolvimento, `npm run watch`
mantém o `tsc` compilando; rode `node build.mjs` para regerar o HTML.

## Estrutura

| Arquivo            | O que é                                                          |
|--------------------|------------------------------------------------------------------|
| `src/app.ts`       | Tipos, dados fictícios, filtros, quadro, painel, calendário e interações |
| `src/styles.css`   | Tokens de tema (escuro por padrão, claro em `[data-theme=light]`) |
| `src/index.html`   | Markup fixo: trilho, barra lateral, cabeçalho e barra de ações    |
| `build.mjs`        | Junta CSS + markup + JS compilado em `dist/`                      |
| `dist/Orbita-Board.html` | Documento completo, abre direto no navegador                |
| `dist/artifact.html`     | Só o conteúdo, para publicar como Artifact                  |

## Modelo de dados

`Project` → `Section[]` → `Task[]`. Cada tarefa tem `status`
(`todo | doing | review | done`), `priority` (`alta | media | baixa`), `due` em ISO,
etiqueta, responsáveis e contadores de link e comentário.

Para trocar o conteúdo, edite os arrays `PROJECTS` e `TASKS` no topo de `src/app.ts`.
`TODAY` é fixo em 2026-09-01 para que os prazos vencidos e "vence em breve" fiquem
estáveis na demonstração — troque por `new Date()` para usar a data real.

## As três telas

O trilho da esquerda troca de tela: **Painel** (primeiro ícone), **Projetos**
(segundo, o quadro Kanban) e **Calendário** (terceiro).

**Atribuído a mim** — o primeiro item da barra lateral, com o número de tarefas do
dia no contador. Reúne, de todos os projetos, o que está no seu nome: o que foi
agendado para hoje na linha do tempo, o que vence hoje e o que já passou do prazo.
Os recortes **Hoje / Esta semana / Tudo** ampliam a janela, e cada cartão mostra de
qual projeto veio. Kanban, lista, tabela, arrastar e filtros funcionam igual.

**Painel** — cronômetro de apontamento com play/pause ao vivo, tarefas de hoje,
reuniões de hoje, e à direita atividade da semana, rosca de horas por projeto e
lembretes. Abaixo, a agenda: linha do tempo de segunda a sexta com os blocos de
trabalho posicionados por horário, linha vermelha do "agora", intervalos hachurados
e recortes Hoje / Semana / Mês / Ano. O botão Filtros vale para a linha do tempo.
No fim, os indicadores: fluxo por status, prioridade, prazos, carga por pessoa e
progresso por projeto.

**Calendário** — abas Dia / Semana / Mês / Ano. O dia abre em **Tarefas**: os blocos
de trabalho da semana posicionados por horário, com projeto e prioridade em cada um,
e uma faixa no topo com as tarefas que vencem naquele dia. O seletor troca para
**Reuniões**, **Lembretes** ou **Tudo** — em "Tudo" as tarefas ficam à esquerda, as
reuniões numa faixa à direita e os lembretes viram fichas no topo, para nada se
cobrir. O que está acontecendo agora fica vermelho, o que já passou fica esmaecido, e
a linha do "agora" cruza o dia com a hora marcada na régua.

**Cadastro de reunião** — o botão "Novo evento" (e o "Agendar reunião" do painel)
abre um formulário com título, pauta, tipo, data, início, duração e participantes.
A reunião entra na agenda do dia escolhido; clicar nela abre o detalhe, de onde dá
para editar ou cancelar. Setas e o botão "Hoje" navegam entre os dias, o
mini-calendário marca com um ponto os dias que têm compromisso ou prazo, e a lista
do time mostra quem está online.

Os gráficos são HTML e CSS puros (sem biblioteca), com dica flutuante no passar do
mouse e um botão **Tabela** que troca cada gráfico pelos mesmos números em tabela.

As cores de status — cinza para "A fazer", amarelo para "Em andamento", azul para
"Revisão / QA" e verde para "Concluído" — preenchem por inteiro o cabeçalho de cada
coluna do quadro (cor cheia, texto preto por cima) e valem também na lista, na tabela
e nos gráficos, então tudo fala a mesma língua. O preenchimento é o mesmo nos dois
temas (`#B4BCC7`, `#FFC82E`, `#189BFF`, `#00CE86`); os tons de marca mudam por tema,
porque um mesmo amarelo não pode servir de bloco no escuro e de texto sobre branco.

Os valores foram checados com o validador de daltonismo
(`dataviz/scripts/validate_palette.js`): passam no piso de visão normal e no
contraste contra a superfície nos dois temas, e ficam na faixa de 6–8 ΔE de separação
sob protanopia e deuteranopia — permitida porque a cor nunca aparece sozinha, sempre
acompanhada do nome do status. O cinza não tem croma por definição, e o amarelo fica
acima da faixa de luminosidade sugerida para fundo escuro: as duas coisas são
consequência direta das cores escolhidas.

## O que dá para fazer na interface

- Arrastar cartões entre colunas, inclusive soltando numa posição específica
- Trocar de projeto e de frente pela lateral ou pelas abas; criar projetos
- Alternar Kanban / Lista / Tabela
- Buscar, filtrar por prioridade, etiqueta e pessoa, e filtrar pela semana no navegador de datas
- Abrir o detalhe de uma tarefa, mudar status e prioridade ali mesmo
- Criar, editar e excluir tarefas; editar nome, descrição, horas e período da frente
- Favoritar projetos (a bolinha colorida só aparece no grupo Favoritos)
- Alternar tema escuro e claro
- Alternar entre painel, quadro e calendário pelo trilho da esquerda
- Ver tudo que está no seu nome em "Atribuído a mim", no topo da lateral
- Iniciar e pausar o cronômetro de apontamento pelo painel

Animações respeitam `prefers-reduced-motion`.
