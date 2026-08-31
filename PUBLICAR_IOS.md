# Publicar o app iOS — o que falta e quem faz

Situação em **2026-08-31**: o código não trava a publicação. O que trava é **um deploy na VPS** —
sem ele a sincronização de tarefas está morta, e isso reprova na revisão da Apple — e depois a
**ficha da loja** (capturas, descrição, conta do revisor).

Este documento é a lista de tarefas até o app estar na App Store.

---

## Resumo: quem precisa fazer o quê

| Quem | O quê | Estado |
| --- | --- | --- |
| ~~Guilherme~~ | ~~Conta no Apple Developer Program~~ | ✅ **feito em 24/08** — Organização, Team `HK842S5TK9` |
| ~~Guilherme~~ | ~~4 secrets no GitHub~~ | ✅ **feito em 24/08** — provado: os builds 7 e 8 foram assinados e enviados pela esteira |
| ~~Guilherme~~ | ~~Um iPhone de verdade~~ | ✅ **feito em 27/08** — login com Apple e exclusão de conta exercidos. Ver §6 |
| ~~André~~ | ~~`APPLE_CLIENT_ID` na VPS~~ | ✅ **feito** — provado: o login com Apple funcionou em aparelho em 27/08, e ele não fecha sem isso |
| **André** | **Deploy da `main` na VPS** | 🔴 **PENDENTE — é o que trava agora.** Ver abaixo |
| **Guilherme** | Ficha da loja | ⏳ capturas, descrição e conta do revisor. Ver §7 |

> **Correção de 31/08:** até hoje esta tabela listava os quatro primeiros itens como pendentes, com
> as caixas desmarcadas, muito depois de estarem prontos. Documento que envelhece sem aviso faz
> perder tempo procurando trabalho que já foi feito.

### O que trava de verdade hoje: o deploy

A sincronização de tarefas está **morta** — nenhuma tarefa criada em celular sobe, iOS e Android. O
conserto existe (`da2f6fa`, do André) e está no `main`; falta sair do GitHub e entrar na VPS.

```bash
cd /var/www/pop-organize && bash deploy/release.sh
```

**Isto bloqueia a submissão, não só o conforto:** a Apple exige conta de teste com dados reais, e um
revisor que criar uma tarefa e vir a sincronização falhar rejeita por Review 2.1. Detalhes e o
pedido pronto em [`PARA_ANDRE.md`](PARA_ANDRE.md).

---

## 1. Conta Apple — ✅ FEITO em 24/08

- [x] developer.apple.com → Apple Developer Program → US$ 99/ano

Precisa de um Apple ID com verificação em duas etapas e os seus dados (pessoa física ou CNPJ).

A aprovação costuma levar de algumas horas a alguns dias, e não há como acelerar. **Por isso é o
primeiro passo, não o último** — todo o resto fica parado esperando.

---

## 2. Identidade do app — ✅ FEITO em 24/08

Três coisas, nesta ordem:

- [x] Criar um **App ID** com o identificador exato:

  ```
  br.com.poporganize.app
  ```

  É o que está gravado no projeto Xcode. **Não pode divergir nem por um caractere** — se divergir,
  a assinatura falha sem explicar direito o motivo.

- [x] Habilitar nesse App ID a capacidade **Sign in with Apple**

- [x] Criar um **Service ID** para o Sign in with Apple (é ele que vira o `APPLE_CLIENT_ID` do
      passo 4)

- [x] Criar o app no **App Store Connect** usando o mesmo identificador

---

## 3. Chave de API → os 4 secrets no GitHub — ✅ FEITO em 24/08

### 3.1 Gerar a chave

- [x] App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**
- [x] Gerar uma chave com papel **App Manager** (ou Admin)

O papel importa: é o que permite ao Xcode criar e baixar sozinho o certificado de distribuição e o
provisioning profile. Com papel menor, o build falha na assinatura.

A chave baixa um arquivo `AuthKey_XXXXXXXXXX.p8`. **Só dá para baixar uma vez.** Se perder, não tem
recuperação — só gerar outra.

### 3.2 Converter o `.p8` para base64

**Este passo é obrigatório e fácil de errar.** O workflow faz `base64 --decode` no valor do secret,
então colar o conteúdo do arquivo direto **não funciona**.

No Windows, PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\caminho\AuthKey_XXXXXXXXXX.p8"))
```

No Git Bash ou no macOS:

```bash
base64 -w0 AuthKey_XXXXXXXXXX.p8
```

O resultado é uma linha longa de letras e números. É esse texto que vai no secret.

### 3.3 Cadastrar os secrets

GitHub → o repositório → **Settings** → **Secrets and variables** → **Actions** → *New repository
secret*.

Os nomes têm de bater **letra por letra** — são os que o workflow procura:

| Nome do secret | O que colocar | Onde encontrar |
| --- | --- | --- |
| `APPSTORE_TEAM_ID` | Team ID de 10 caracteres | Apple Developer → Membership |
| `APPSTORE_API_KEY_ID` | Key ID da chave | App Store Connect, ao lado da chave gerada |
| `APPSTORE_API_ISSUER_ID` | Issuer ID | App Store Connect, no topo da tela de chaves |
| `APPSTORE_API_PRIVATE_KEY` | **o `.p8` em base64** (passo 3.2) | o texto gerado acima |

- [x] Os quatro cadastrados

---

## 4. André, na VPS — ✅ APPLE_CLIENT_ID feito; falta o DEPLOY (ver o resumo no topo)

- [x] Publicar o `APPLE_CLIENT_ID` — o **Service ID** do Sign in with Apple, criado no passo 2

É o único item da lista que não passa pelo Guilherme nem pelo Claude.

---

## 5. Primeiro envio — ✅ FEITO; o último foi o build 8

Aí é um botão.

- [x] GitHub → aba **Actions** → workflow **"iOS release (TestFlight)"** → *Run workflow*

Ele valida o ambiente, compila, assina, exporta o `.ipa` e envia ao App Store Connect sozinho.

Dois campos opcionais aparecem ao disparar:

- **build_number** — deixe vazio para usar o valor do projeto
- **upload** — deixe marcado para enviar de fato; desmarque se quiser só testar se compila e assina

O app vai como **versão 1.0.3**, cobrindo **apenas iPhone** (decisão de 2026-08-20).

> **O número do build é manual e o projeto tem `4` fixo.** O workflow não incrementa
> `CURRENT_PROJECT_VERSION` sozinho: quem disparar sem preencher `build_number` reenvia um número já
> usado, e o App Store Connect recusa por duplicidade sem explicar direito o porquê. **Último
> enviado: 8** (2026-08-27, versão 1.0.3). O próximo tem de ser 9 ou maior — **atualizar esta linha
> a cada envio**, porque não há outro lugar que guarde esse número.
>
> A correção definitiva seria o workflow usar `github.run_number` como padrão quando a entrada vier
> vazia, ou consultar o último build pela API do App Store Connect.

Se falhar, o log do passo que quebrou diz o motivo. Os erros mais comuns são: secret com nome
errado, `.p8` colado sem base64, ou bundle identifier divergente.

---

## 6. Teste em aparelho — FEITO em 2026-08-27, build 7

Os três fluxos que nunca tinham rodado em aparelho nenhum foram exercidos. Resultado:

- [x] **Login com Apple — FUNCIONA.** Era o maior risco técnico em aberto, e por dois motivos: o
      `ASAuthorizationController` como variável local (padrão clássico de "toca e não acontece
      nada"), e um `encodeDefaults` que mandava `name:null,email:null` e fazia o servidor recusar a
      credencial com 400 depois de o Face ID ter dado certo. O segundo foi consertado no build 7 e
      **confirmado em aparelho**; o primeiro nunca se manifestou.

- [x] **Exclusão de conta — FUNCIONA.** Testada com uma conta descartável, criada por e-mail/código
      justamente para não apagar a conta real. A Apple testa e rejeita se não funcionar (Review
      5.1.1). Esse mesmo caminho serve para produzir a **conta de teste do revisor** do §7.

- [x] **Calendário e tarefas — rodam.** Junto com os gestos de arraste.

A expectativa se confirmou: **o primeiro teste em aparelho achou coisa.** Quatro defeitos visuais e
de comportamento, todos consertados no build 8 — e um quinto que não é do app, e sim do servidor
(`recurrenceTimes`, ver `PARA_ANDRE.md`). Achar defeito aqui é o processo funcionando.

---

## 7. Submissão

Além do app em si, a Apple pede:

- [ ] Ícone
- [ ] Capturas de tela — **confira os tamanhos que o App Store Connect pedir na hora**; a Apple muda
      essa exigência com frequência e qualquer lista escrita aqui envelhece
- [ ] Descrição e categoria
- [ ] **URL pública** da política de privacidade
- [ ] Questionário de privacidade respondido
- [ ] **Conta de teste com dados reais** para o revisor entrar

**Categoria, questionário de privacidade, classificação etária e criptografia já estão respondidos
em [`FICHA_LOJA.md`](FICHA_LOJA.md)**, prontos para copiar, cada um com a evidência no código. As
respostas de privacidade precisam bater com `ios/App/App/PrivacyInfo.xcprivacy` — divergir entre os
dois é motivo de rejeição, e o erro é difícil de ver porque são preenchidos em lugares diferentes.

O último item importa mais do que parece: revisor que não consegue entrar rejeita sem olhar o resto.

---

## O que segue sendo feito enquanto isso

A publicação está travada; o trabalho não. Continua disponível, sem depender de ninguém:

- Projeção de ocorrências futuras no calendário (os campos de que precisa já estão no domínio)
- Itens 3 e 7 da lista do dono da São Francisco

Itens 2, 4 e 6 do dono seguem fora da fila — dependem de decisão de negócio e de mudanças de modelo
no lado do André.
