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

## Próxima etapa

As telas atuais usam dados demonstrativos locais. Para login, tarefas e calendário
reais, o servidor TanStack deverá expor uma API HTTPS/JSON, consumida pelo app com
um cliente Kotlin.
