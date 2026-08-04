# Pop Organize Android com KMP

O Android abre a interface compartilhada em `android/composeApp/src/commonMain`. A `MainActivity` e `PopAndroidServices` contêm apenas integrações Android: Credential Manager do Google, permissão de notificações, som e WorkManager.

## Compilar e instalar

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run android:apk
npm run android:install
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Assinatura e bundle da Play Store

O projeto lê a chave por `android/keystore.properties` (ignorado pelo Git) ou pelas variáveis
`POP_ANDROID_KEYSTORE_PATH`, `POP_ANDROID_KEYSTORE_PASSWORD`, `POP_ANDROID_KEY_ALIAS` e
`POP_ANDROID_KEY_PASSWORD`.

Para criar a chave de upload uma única vez no Windows:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\scripts\create-android-upload-key.ps1
npm run native:validate:store
npm run android:aab
```

Faça backup externo do `.jks` e da senha. Sem essa chave não será possível assinar futuras
atualizações caso o Play App Signing não esteja configurado para redefinir a chave de upload.

A URL de produção usada pelo app é `https://app.poporganize.com.br/api/mobile` e pode ser
substituída por `POP_API_BASE_URL` no ambiente do build.

## Login Google

No Google Cloud, mantenha:

- cliente Android com pacote `br.com.poporganize.app` e o SHA-1 da assinatura;
- cliente Web cujo ID está em `android/app/src/main/res/values/strings.xml`.

Para listar o SHA-1:

```powershell
cd android
.\gradlew.bat signingReport
```

O cliente Android identifica o APK; o ID Web é usado pelo Credential Manager para pedir o token. A VPS deverá validar esse token antes de criar a sessão compartilhada.
