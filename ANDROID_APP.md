# Pop Organize Android

Este projeto ja esta preparado para virar um app Android real usando Capacitor.

## Requisitos na maquina

- Android Studio instalado
- JDK 17 ou mais novo
- Android SDK configurado pelo Android Studio

## Configurar a URL de producao

Como o app usa TanStack Start com funcoes de servidor, o app nativo precisa apontar para uma versao publicada do sistema em HTTPS. Para Play Store, use `CAPACITOR_APP_URL`.

No PowerShell:

```powershell
$env:CAPACITOR_APP_URL="https://seu-dominio.com"
npm run android:sync:store
```

Para testar com live reload na rede local, use uma variavel separada. Nao use isto para loja:

```powershell
$env:CAPACITOR_LIVE_RELOAD_URL="http://192.168.0.10:5173"
npm run android:sync
```

## Abrir no Android Studio

```bash
npm run android:open
```

Depois clique em Run para instalar no celular conectado por USB.

## Gerar AAB para Play Store

```powershell
$env:CAPACITOR_APP_URL="https://seu-dominio.com"
npm run android:aab
```

O AAB de release fica em:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Antes de publicar, configure a assinatura de release no Android Studio/Gradle. Para teste manual, `npm run android:apk` ainda gera APK debug.
