# Pop Organize no iPhone com KMP

O iPhone usa a mesma interface Compose e o mesmo estado Kotlin do Android. O Xcode mantém apenas
`AppDelegate.swift`, que é o host mínimo obrigatório para abrir `ComposeApp.framework`.

## Estrutura

- `android/composeApp/src/commonMain`: telas, modelos, tema e regras compartilhadas;
- `android/composeApp/src/iosMain`: entrada UIKit, persistência, login Apple, notificações locais;
- `ios/App/App.xcodeproj`: assinatura, capabilities, ícone e publicação na App Store.

O build phase **Build ComposeApp framework** resolve o `JAVA_HOME` (o Xcode não herda o shell do
usuário) e executa:

```bash
./gradlew :composeApp:embedAndSignAppleFrameworkForXcode
```

## O que este Mac consegue fazer

| Máquina | macOS | Xcode máximo | Serve para |
| --- | --- | --- | --- |
| MacBook Air (13-inch, Early 2015) | Monterey 12.7.6 | **14.2** | abrir o projeto, estudar o código, tentar rodar no simulador |

O `.xcodeproj` foi rebaixado para `objectVersion = 56`, que é o formato máximo que o Xcode 14.x
abre. Sem isso o Xcode 14.2 recusa o projeto com erro de formato.

**Este Mac não consegue publicar na App Store.** A Apple exige que todo binário enviado ao App
Store Connect seja compilado com uma versão recente do Xcode (desde abril de 2026, Xcode 26 com o
SDK do iOS 26). O Xcode 26 pede macOS 15.5 ou superior, e o MacBook Air Early 2015 parou no
Monterey. Confirme o mínimo vigente em <https://developer.apple.com/news/upcoming-requirements/>
antes de cada envio.

Além disso, Kotlin 2.1.20 e Compose Multiplatform 1.8.2 são homologados contra Xcode 16+. A
compilação Kotlin/Native no Xcode 14.2 não foi validada e pode falhar no linker. Trate o Mac local
como ferramenta de leitura e experimentação, não como máquina de release.

## Abrir no Mac

```bash
npm run ios:validate
npm run ios:open
```

No Xcode, escolha seu Team em **Signing & Capabilities** e confirme **Sign in with Apple**.
Deployment target: iOS 15.

## Publicar: o caminho que funciona a partir do Windows

O repositório traz dois workflows do GitHub Actions que rodam em runner macOS com Xcode atual:

- `.github/workflows/ios-build.yml` — compila o framework Kotlin/Native e o alvo do Xcode sem
  assinatura a cada push. É assim que se descobre, sem Mac, que o código iOS quebrou.
- `.github/workflows/ios-release.yml` — dispara manualmente, gera o Archive assinado e envia ao
  App Store Connect / TestFlight.

Secrets necessários em **Settings > Secrets and variables > Actions**:

| Secret | Onde obter |
| --- | --- |
| `APPSTORE_TEAM_ID` | Apple Developer > Membership > Team ID |
| `APPSTORE_API_KEY_ID` | App Store Connect > Users and Access > Integrations > App Store Connect API |
| `APPSTORE_API_ISSUER_ID` | mesma tela, campo Issuer ID |
| `APPSTORE_API_PRIVATE_KEY` | o arquivo `AuthKey_XXXX.p8` convertido em base64 |

A chave da API precisa do papel **App Manager** ou **Admin**: o `-allowProvisioningUpdates` usa
essa chave para criar e baixar o certificado de distribuição e o provisioning profile sozinho, sem
guardar certificado nenhum no repositório.

Para gerar o base64 da chave no Windows:

```bash
node -e "console.log(require('fs').readFileSync('AuthKey_XXXX.p8').toString('base64'))"
```

Runner macOS consome minutos do GitHub Actions numa taxa 10x maior que Linux em repositório
privado. Um build limpo de Kotlin/Native leva bastante tempo; o cache de `~/.konan` e `~/.gradle`
já está configurado nos workflows.

### Alternativas ao GitHub Actions

- Alugar um Mac por hora (Scaleway, MacStadium, MacinCloud) e rodar o Archive lá.
- Xcode Cloud, se você já tiver acesso a um Mac com Xcode recente para a configuração inicial.
- Instalar macOS Sequoia neste MacBook Air via OpenCore Legacy Patcher. É possível, mas não é
  suportado pela Apple, e um i5 dual-core de 1,6 GHz com 8 GB compilando Compose Multiplatform
  é uma experiência ruim. Não recomendo como caminho principal.

## Notificações

O iOS usa **notificações locais** (`UNUserNotificationCenter`), espelhando os lembretes do Android:
distintivo com o total de atividades pendentes e um alerta agendado para cada atividade com data e
hora futuras, respeitando o limite de 64 notificações pendentes do sistema.

Não há APNs. O entitlement `aps-environment` e o background mode `remote-notification` foram
removidos porque não existe servidor de push em nenhuma plataforma — declarar capability sem uso é
motivo de rejeição (App Store Review 2.5.4). Quando existir push de verdade, restaure os três
juntos: entitlement, background mode e o tratamento de
`didRegisterForRemoteNotificationsWithDeviceToken` no `AppDelegate`. O `npm run ios:validate`
verifica que os três andam juntos.

O som personalizado `pop_notification.mp3` fica no bundle mas não é usado pelo alerta: o iOS só
aceita CAF, AIFF ou WAV em `UNNotificationSound`. Converta o arquivo se quiser o som próprio.

## VPS

O aplicativo nunca acessa o MySQL diretamente. Defina `POP_API_BASE_URL` com a URL HTTPS da API na
VPS; Android, iOS e web usarão essa API para sincronizar conta, empresa e tarefas.
