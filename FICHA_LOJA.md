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
