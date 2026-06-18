# Pop Organize Android

Este projeto ja esta preparado para virar um app Android real usando Capacitor.

## Requisitos na maquina

- Android Studio instalado
- JDK 17 ou mais novo
- Android SDK configurado pelo Android Studio

## Configurar a URL do sistema

Como o app usa TanStack Start com funcoes de servidor, o APK precisa apontar para uma versao publicada do sistema.

No PowerShell:

```powershell
$env:CAPACITOR_SERVER_URL="https://seu-dominio.com"
npm run android:sync
```

Para testar na rede local, use o IP do computador:

```powershell
$env:CAPACITOR_SERVER_URL="http://192.168.0.10:5173"
npm run android:sync
```

## Abrir no Android Studio

```bash
npm run android:open
```

Depois clique em Run para instalar no celular conectado por USB.

## Gerar APK

```bash
npm run android:apk
```

O APK debug fica em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Esse arquivo pode ser enviado para um Android e instalado manualmente.
