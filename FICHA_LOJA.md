# Ficha da App Store — respostas prontas

O que dá para responder **sem depender do login com Apple funcionar**. Cada resposta vem amarrada à
evidência no código, para poder ser reconferida em vez de acreditada.

Os textos de marketing (descrição, palavras-chave, subtítulo) **não estão aqui de propósito** — ver
"O que ainda falta", no fim.

---

## 1. Questionário de privacidade

Estas respostas **têm de bater** com `ios/App/App/PrivacyInfo.xcprivacy`, que já está no projeto e
vai junto no binário. Divergência entre o manifesto e o questionário é motivo de rejeição, e é um
erro difícil de enxergar porque os dois são preenchidos em lugares diferentes, com meses de
distância.

Auditoria feita em 2026-08-26 sobre `PopStore.kt` e `MainViewController.kt`. As únicas rotas que o
app chama são `auth/email/request-code`, `auth/email/verify-code`, `auth/apple`, `auth/logout`,
`workspaces`, `tasks` e `account`.

### Coleta de dados: **Sim**

Quatro tipos, e só estes quatro:

| Tipo no App Store Connect | Vinculado à identidade | Usado para rastreio | Finalidade |
| --- | --- | --- | --- |
| Informações de contato → **Nome** | Sim | Não | Funcionalidade do app |
| Informações de contato → **Endereço de e-mail** | Sim | Não | Funcionalidade do app |
| Identificadores → **ID de usuário** | Sim | Não | Funcionalidade do app |
| Conteúdo do usuário → **Outro conteúdo do usuário** | Sim | Não | Funcionalidade do app |

"Outro conteúdo do usuário" são as tarefas: título, descrição, prazo, responsável e checklist.

**Todo o resto: Não.** Sem localização, sem contatos, sem fotos, sem saúde, sem finanças, sem
histórico de navegação, sem dados de uso, sem diagnósticos.

Vinculado à identidade em todos os quatro porque tudo fica preso a uma conta — não há modo anônimo
que grave no servidor.

Finalidade "Funcionalidade do app" e nada mais: sem isso o app não tem o que mostrar. Não há
analytics, personalização nem publicidade.

### Rastreio: **Não**

`NSPrivacyTracking` está `false` no manifesto, e é verdade: a busca por `firebase|analytics|`
`crashlytics|facebook|adjust|appsflyer|amplitude|mixpanel|sentry` em `android/` e `ios/` não
retorna **nada**. Não há SDK de terceiros no app. Nenhum domínio em `NSPrivacyTrackingDomains`.

Consequência prática: **não** aparece a tela de permissão de rastreio (ATT), e a pergunta sobre IDFA
se responde com Não.

### Exclusão de conta: **Sim, dentro do app**

A Apple exige desde a Review 5.1.1(v) e testa. Existe: `PopStore.kt` chama `DELETE account`. O
caminho na interface é **Mais → Configurações → Excluir minha conta**.

> ✅ **Exercido em aparelho em 2026-08-27** (build 7) e funcionando. O teste foi feito com uma
> **conta descartável**, criada por e-mail/código — não com a conta real, que seria irreversível.
>
> Esse mesmo caminho resolve a **conta de teste do revisor** exigida no envio: criar uma conta por
> e-mail, deixá-la com dados reais dentro, e entregar as credenciais no App Store Connect.

---

## 2. Categoria

- **Principal: Produtividade**
- **Secundária: Negócios**

Nesta ordem, e não o contrário. O app é uma lista de tarefas de equipe com setores, grupos e prazos
— quem procura isso procura em Produtividade. "Negócios" descreve o cliente (uma clínica), não o
que o app faz; deixá-lo em primeiro joga o app numa vitrine de ERP e CRM, onde ele desaparece.

---

## 3. Classificação etária: **4+**

Todas as perguntas do questionário se respondem com **Nenhum / Não**: sem violência, sem conteúdo
sexual, sem linguagem imprópria, sem jogos de azar, sem álcool ou drogas, sem terror.

Duas perguntas que merecem atenção porque a resposta certa não é a óbvia:

- **Conteúdo gerado por usuário sem moderação** → **Não.** As tarefas ficam visíveis só dentro da
  empresa de quem escreveu. Não há feed público, nem descoberta entre contas, nem mensagens entre
  estranhos. Responder "Sim" aqui sobe a classificação para 17+ sem motivo.
- **Acesso irrestrito à web** → **Não.** O app não tem navegador embutido nem abre URL arbitrária.

---

## 4. Conformidade de exportação (criptografia)

Já respondida **no próprio binário**, e por isso não vai ser perguntada a cada envio:
`ITSAppUsesNonExemptEncryption` está `false` no `Info.plist`.

Correto: o app usa HTTPS e só isso, que é a exceção padrão. Não implementa nem embute criptografia
própria.

---

## O que ainda falta — e por que não está aqui

Depende de ver o app rodando num iPhone, o que depende do login:

- **Capturas de tela.** Conferir os tamanhos que o App Store Connect pedir **na hora**; a Apple muda
  a exigência com frequência.
- **Descrição, subtítulo, texto promocional e palavras-chave.** Escrever antes de ver as capturas dá
  retrabalho: o texto é escolhido para não repetir o que a imagem já mostra.
- **Conta de teste para o revisor**, com dados reais dentro. Revisor que não entra rejeita sem olhar
  o resto.
- **URL pública da política de privacidade.** Precisa estar no ar antes do envio, e é do lado do
  André (VPS).

---

## 5. Textos da página do produto — prontos para colar

Escritos em 2026-09-10. **Contados por script, não estimados** — a tabela abaixo saiu da mesma
execução que gerou os textos, então os números batem com o que está aqui.

| Campo | Limite | Usado | Folga |
| --- | --- | --- | --- |
| Subtítulo | 30 | **29** | 1 |
| Texto promocional | 170 | **143** | 27 |
| Palavras-chave | 100 | **92** | 8 |
| Descrição | 4000 | **1593** | 2407 |

> Os limites vieram da própria página do App Store Connect (contadores 170, 4.000 e 100). O
> subtítulo não aparece naquela tela: ele fica em **Informações do app**, não na versão.

### Subtítulo

```
Tarefas e rotinas do seu time
```

### Texto promocional

Pode ser trocado sem enviar build novo — é o único campo assim. Serve para anunciar o que mudou.

```
Organize o que a equipe precisa fazer por setor, grupo ou pessoa. Rotinas que se repetem sozinhas e um calendário que mostra o dia por horário.
```

### Palavras-chave

```
tarefas,equipe,empresa,setor,checklist,rotina,recorrente,agenda,produtividade,gestão,delegar
```

Sem espaço depois da vírgula, de propósito: espaço conta caractere e não ajuda em nada. **Nenhuma
palavra repete o nome do app nem o subtítulo** — a Apple já indexa os dois, e repetir só gasta os
100 caracteres.

### Descrição

```
Pop Organize é o aplicativo de tarefas para quem trabalha em equipe.

Organize o que a sua empresa precisa fazer por setor, por grupo ou por pessoa, acompanhe tudo em um calendário e deixe as rotinas se repetirem sozinhas.

COMO O TRABALHO SE ORGANIZA

• Espaço da empresa e espaço pessoal, separados. O que é seu não se mistura com o que é do time.
• Tarefas atribuídas à empresa inteira, a um setor, a um grupo ou a até três pessoas.
• Prioridade, prazo, horário e descrição em cada tarefa.
• Checklist dentro da tarefa, para o que tem etapas.

ROTINAS QUE SE REPETEM

• Diária, semanal, quinzenal, mensal ou anual — e personalizada, quando nenhuma delas serve.
• Vários horários no mesmo dia, para o que acontece mais de uma vez.
• A série termina numa data escolhida, ou nunca termina.
• Exclua uma data só, sem desfazer o resto, ou a série inteira de uma vez.

O CALENDÁRIO

• Grade do mês, com a contagem do que há em cada dia.
• Agenda do dia em ordem de horário, como se espera de uma agenda.
• Filtro por setor, para quem administra olhar um time de cada vez.

REVISÃO E PERMISSÕES

• Tarefas que exigem revisão vão para o gestor responsável antes de contar como concluídas.
• Grupos de permissão definem quem cria, edita, conclui, move e exclui.

FUNCIONA JUNTO COM O PAINEL WEB

O aplicativo conversa com o mesmo espaço que a sua equipe usa no navegador. O que muda no telefone aparece no painel, e o que muda no painel aparece no telefone.

PARA ENTRAR

Entre com a Apple, com o Google ou com o seu e-mail. Você pode excluir a sua conta pelo próprio aplicativo, a qualquer momento.
```

### O que ainda precisa de decisão sua

| Campo | O que colocar |
| --- | --- |
| **URL de suporte** | `https://app.poporganize.com.br` — mas veja o aviso abaixo |
| **URL de marketing** | opcional; pode deixar vazio |
| **Copyright** | o ano seguido da razão social da conta Apple — que é o nome que aparecerá como vendedor na loja, e não "Pop Organize". Não fica anotado aqui por ser dado da empresa; o Guilherme tem. |
| **Versão** | ⚠️ conferir se bate com o `MARKETING_VERSION` do projeto Xcode — um build só aparece em "Adicionar compilação" sob o registro cuja versão é igual à dele |

> ⚠️ **A URL de suporte merece atenção.** A Apple espera uma página onde a pessoa consiga **pedir
> ajuda** — um contato, um e-mail, um formulário. Apontar para a tela de login do painel já foi
> motivo de rejeição em outros apps (Review 1.5). Se `app.poporganize.com.br` cair direto no login,
> vale criar uma página simples com um e-mail de contato antes de enviar. **Isto é candidato, não
> fato:** não testei o que essa URL mostra para quem não tem conta.

### O que estes textos afirmam, e por que dá para afirmar

Nenhuma frase acima descreve recurso que o app não tenha. Cada bloco corresponde a algo que existe
no código: espaço pessoal e de empresa (`WorkspaceKind`), alvo empresa/setor/grupo/pessoa
(`AssignmentKind`), até três responsáveis, checklist (`ChecklistItem`), as seis recorrências
incluindo personalizada (`RecurrenceFrequency`), múltiplos horários (`recurrenceTimes`), fim por
data (`recurrenceEndMode`), excluir ocorrência ou série (desde 04/09), grade e agenda do
calendário, filtro por setor (build 13), fluxo de revisão (`requiresReview`) e grupos de permissão.

**Descrição que promete o que o app não faz é rejeição na revisão**, e é o tipo de erro que ninguém
percebe até chegar lá.

---

## 6. Notas para a equipe de revisão — prontas para colar

Campo **Notas**, na seção "Informações para a equipe de revisão dos apps". Limite 4.000; usadas
**2001**.

> **Por que isto importa mais do que parece.** O revisor tem poucos minutos e nenhuma familiaridade
> com o produto. Se ele não conseguir entrar, ou entrar e ver telas vazias, reprova sem olhar o
> resto. Estas notas existem para que ele saiba entrar, saiba o que olhar, e saiba onde está a
> exclusão de conta — que a Apple **sempre** testa (diretriz 5.1.1(v)).

```
Pop Organize é um app de gestão de tarefas para equipes de empresas. O acesso é sempre autenticado: não há modo visitante, porque todo o conteúdo pertence a uma conta e a um espaço de trabalho.

COMO ENTRAR
Use a conta de teste abaixo. Na tela inicial, toque em "Entrar com e-mail", informe o endereço e o código de seis dígitos que chega por e-mail. A conta já está dentro de uma empresa com setores, pessoas e tarefas cadastradas, para que as telas não apareçam vazias.

O login com Apple e o login com Google também funcionam e criam contas reais.

O QUE VER, NA ORDEM
1. Início — resumo do dia e das tarefas em aberto.
2. Tarefas — a lista. Toque no círculo à esquerda para concluir; toque no cartão para abrir os detalhes; o menu de três pontos oferece reatribuir e excluir.
3. Calendário — alterne entre a grade do mês e a agenda do dia, que lista as tarefas em ordem de horário.
4. Mais — setores, grupos, pessoas e as configurações.

EXCLUSÃO DE CONTA
Está em Mais → Configurações → Excluir minha conta, dentro do aplicativo, conforme a diretriz 5.1.1(v). A exclusão é definitiva. Se quiser testá-la, por favor crie uma conta descartável pelo login por e-mail em vez de usar a conta de teste fornecida, senão as demais telas ficam sem dados para o restante da revisão.

Também existe uma página pública equivalente em https://app.poporganize.com.br/excluir-conta

SOBRE OS DADOS
O app não usa rastreio, não tem publicidade e não integra SDK de terceiros. Os dados tratados são nome, e-mail, identificador de usuário e o conteúdo criado pela pessoa (tarefas e listas), todos vinculados à conta e usados apenas para o funcionamento do serviço. Isso está declarado no manifesto de privacidade e corresponde ao questionário preenchido.

SUPORTE
https://app.poporganize.com.br/suporte — contato@poporganize.com

O app é apenas para iPhone (TARGETED_DEVICE_FAMILY = 1) e requer conexão com a internet, já que o espaço de trabalho é compartilhado com o painel web e com o app Android da mesma equipe.
```

### Os outros campos da mesma seção

| Campo | O que preencher |
| --- | --- |
| **Início de sessão obrigatório** | ✅ marcar — o app não tem modo visitante |
| **Nome do usuário** | o e-mail da conta de teste |
| **Senha** | ⚠️ ver abaixo |
| **Nome / Sobrenome / Telefone / E-mail** | seus dados de contato |

> ⚠️ **O app não usa senha.** O login por e-mail é com código de seis dígitos enviado na hora, e o
> campo "Senha" do App Store Connect é obrigatório quando "Início de sessão obrigatório" está
> marcado. Duas saídas, e a segunda é a boa:
>
> 1. preencher com algo como `codigo-por-email` e explicar nas Notas — que já explicam;
> 2. **deixar a caixa de entrada da conta de teste acessível ao revisor**, informando nas Notas o
>    endereço e a senha do e-mail. É o que a Apple espera quando o acesso depende de código, e evita
>    o cenário em que ele pede o código e ninguém responde a tempo.
>
> A escolha é sua, e depende de você conseguir criar uma caixa descartável. **Se escolher a 2, me
> avise que eu reescrevo as Notas** incluindo as instruções do e-mail.

---

## 7. Capturas de tela — o que tirar, em que ordem

As três primeiras são as que aparecem na listagem de busca da App Store. Elas decidem a instalação,
então a ordem importa:

| # | Tela | Por que esta |
| --- | --- | --- |
| 1 | **Tarefas**, lista cheia, com prioridades e prazos visíveis | é o que o app é |
| 2 | **Calendário**, agenda do dia por horário | é o diferencial que a descrição promete |
| 3 | **Calendário**, grade do mês com as contagens | mostra alcance, e é visualmente forte |
| 4 | Detalhe de uma tarefa, com checklist | mostra profundidade |
| 5 | Setores ou Pessoas | mostra que é de equipe, não pessoal |

**Antes de capturar:**

- Use uma empresa com **dados realistas** — nomes de setor plausíveis, tarefas com títulos de
  verdade. Tela de brinquedo aparece na hora.
- **Confira os acentos** nas telas que for capturar. Era o risco de reprovação número um, e uma
  captura com "Gest?o" carimba o defeito na loja mesmo depois de corrigido no banco.
- Modo claro rende melhor na listagem, mas não é regra.
- Capture do **build já testado em aparelho**, nunca de um build não exercido.

**Sobre os tamanhos:** a página do App Store Connect pedia, na aba iPhone, tela de 6,5 pol. em
1242 × 2688, 2688 × 1242, 1284 × 2778 ou 2778 × 1284. **A Apple muda essa exigência com frequência
— confira o que aparecer na hora**, e olhe as outras abas de tamanho que ela oferecer.

Se as capturas do seu aparelho saírem em resolução diferente da pedida, **me mande os arquivos que
eu redimensiono** para o tamanho exato, sem distorcer.
