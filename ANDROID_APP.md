# Pop Organize Android nativo

O aplicativo Android usa Kotlin e Jetpack Compose. A interface não depende de
Capacitor, servidor local ou WebView.

## Estrutura

- `android/app/src/main/java/br/com/poporganize/app/MainActivity.kt`: Activity nativa.
- `android/app/src/main/java/br/com/poporganize/app/ui/PopTheme.kt`: cores e tema.
- `android/app/src/main/java/br/com/poporganize/app/ui/PopOrganizeApp.kt`: telas e navegação.

## Executar no celular

Abra a pasta `android` no Android Studio, selecione o celular e clique em **Run**.

Também é possível compilar e instalar pelo PowerShell:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run android:apk
npm run android:install
```

O APK de desenvolvimento fica em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

As variantes de desenvolvimento e release usam o pacote
`br.com.poporganize.app`, mantendo a execução pelo Android Studio alinhada com a
`MainActivity` declarada no aplicativo.

## Login com Google

O fluxo nativo usa o Credential Manager. No Google Cloud, crie um cliente OAuth
Android com o pacote `br.com.poporganize.app` e o SHA-1 da assinatura usada para
instalar o aplicativo. Crie também um cliente OAuth do tipo **Aplicativo da Web**.

Copie o ID do cliente Web para `google_web_client_id` em
`android/app/src/main/res/values/strings.xml`. O cliente Android identifica o APK;
o ID do cliente Web é o valor usado para solicitar o ID token.

Para listar os certificados configurados no projeto:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
cd android
.\gradlew.bat signingReport
```

Depois do login, o app mantém localmente apenas o identificador, nome e e-mail da
conta. O ID token não é salvo. Quando a API HTTPS estiver disponível, ela deverá
receber e validar o ID token antes de criar uma sessão de servidor.

## Próxima etapa

As telas atuais usam dados demonstrativos locais. Para login, tarefas e calendário
reais, o servidor TanStack deverá expor uma API HTTPS/JSON, consumida pelo app com
um cliente Kotlin.
