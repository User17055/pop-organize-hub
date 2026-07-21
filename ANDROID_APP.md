# Pop Organize Android com KMP

O Android abre a interface compartilhada em `android/composeApp/src/commonMain`. A `MainActivity` e `PopAndroidServices` contêm apenas integrações Android: Credential Manager do Google, permissão de notificações, som e WorkManager.

## Compilar e instalar

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run android:apk
npm run android:install
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

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
