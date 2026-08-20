# Publicar o app iOS — o que falta e quem faz

Situação em 2026-08-20: **o código não trava mais nada.** Todas as fases planejadas estão
concluídas e compilando. O que falta para publicar não depende de programação.

Este documento é a lista de tarefas até o app estar na App Store.

---

## Resumo: quem precisa fazer o quê

| Quem | O quê | Por que trava |
| --- | --- | --- |
| **Guilherme** | Conta no Apple Developer Program (US$ 99/ano) | Sem ela não existe certificado, nem TestFlight, nem envio. **Trava todo o resto.** |
| **Guilherme** | 4 secrets no GitHub | É o que deixa o robô assinar e enviar o app sozinho. Só existem depois da conta. |
| **Guilherme** | Um iPhone de verdade | Dois fluxos nunca rodaram em aparelho nenhum, e a Apple testa os dois. |
| **André** | `APPLE_CLIENT_ID` publicado na VPS | Sem isso o login com Apple não fecha o ciclo no servidor. |

Os passos 1 a 3 são uma corrente: cada um depende do anterior. O passo 4 (André) pode acontecer em
paralelo, desde que o passo 2 já tenha criado o Service ID.

---

## 1. Conta Apple — só o Guilherme

- [ ] developer.apple.com → Apple Developer Program → US$ 99/ano

Precisa de um Apple ID com verificação em duas etapas e os seus dados (pessoa física ou CNPJ).

A aprovação costuma levar de algumas horas a alguns dias, e não há como acelerar. **Por isso é o
primeiro passo, não o último** — todo o resto fica parado esperando.

---

## 2. Identidade do app — dentro da conta, depois de aprovada

Três coisas, nesta ordem:

- [ ] Criar um **App ID** com o identificador exato:

  ```
  br.com.poporganize.app
  ```

  É o que está gravado no projeto Xcode. **Não pode divergir nem por um caractere** — se divergir,
  a assinatura falha sem explicar direito o motivo.

- [ ] Habilitar nesse App ID a capacidade **Sign in with Apple**

- [ ] Criar um **Service ID** para o Sign in with Apple (é ele que vira o `APPLE_CLIENT_ID` do
      passo 4)

- [ ] Criar o app no **App Store Connect** usando o mesmo identificador

---

## 3. Chave de API → os 4 secrets no GitHub

### 3.1 Gerar a chave

- [ ] App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**
- [ ] Gerar uma chave com papel **App Manager** (ou Admin)

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

- [ ] Os quatro cadastrados

---

## 4. André, na VPS

- [ ] Publicar o `APPLE_CLIENT_ID` — o **Service ID** do Sign in with Apple, criado no passo 2

É o único item da lista que não passa pelo Guilherme nem pelo Claude.

---

## 5. Primeiro envio

Aí é um botão.

- [ ] GitHub → aba **Actions** → workflow **"iOS release (TestFlight)"** → *Run workflow*

Ele valida o ambiente, compila, assina, exporta o `.ipa` e envia ao App Store Connect sozinho.

Dois campos opcionais aparecem ao disparar:

- **build_number** — deixe vazio para usar o valor do projeto
- **upload** — deixe marcado para enviar de fato; desmarque se quiser só testar se compila e assina

O app vai como **versão 1.0.3, build 4**, cobrindo **apenas iPhone** (decisão de 2026-08-20).

Se falhar, o log do passo que quebrou diz o motivo. Os erros mais comuns são: secret com nome
errado, `.p8` colado sem base64, ou bundle identifier divergente.

---

## 6. Teste em aparelho — o passo mais importante

Instale pelo TestFlight e teste **nesta ordem de prioridade**:

- [ ] **Login com Apple.** É o maior risco técnico em aberto. Há um objeto no código
      (`ASAuthorizationController`, em `MainViewController.kt:136`) criado como variável local, que
      pode ser destruído antes de a resposta chegar — o padrão clássico de "toca no botão e não
      acontece nada". Foi deixado **sem correção de propósito**: mexer no escuro, sem conseguir
      reproduzir, costuma criar um segundo bug em vez de resolver o primeiro.

- [ ] **Exclusão de conta.** A Apple testa e rejeita se não funcionar (Review 5.1.1).

- [ ] **Calendário e tarefas.** Foram reescritos por completo e nunca foram vistos rodando.

Uma expectativa honesta: **o primeiro teste em aparelho vai achar coisa.** Compilar verde prova que
o código é válido, não que ele se comporta certo. Achar defeito aqui é o processo funcionando, não
sinal de que algo deu errado.

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

O último item importa mais do que parece: revisor que não consegue entrar rejeita sem olhar o resto.

---

## O que segue sendo feito enquanto isso

A publicação está travada; o trabalho não. Continua disponível, sem depender de ninguém:

- Projeção de ocorrências futuras no calendário (os campos de que precisa já estão no domínio)
- Itens 3 e 7 da lista do dono da São Francisco

Itens 2, 4 e 6 do dono seguem fora da fila — dependem de decisão de negócio e de mudanças de modelo
no lado do André.
