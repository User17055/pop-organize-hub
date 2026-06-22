# Pop Organize iPhone

Este projeto tambem esta preparado para virar um app iOS real usando Capacitor.

## Requisitos na maquina

- Mac com macOS atualizado
- Xcode instalado pela App Store
- Node.js 20 ou mais novo
- CocoaPods, se o Xcode pedir dependencias nativas

## Configurar a URL do sistema

Como o app usa TanStack Start com funcoes de servidor, o app iOS precisa apontar para uma versao publicada do sistema.

No terminal do Mac:

```bash
export CAPACITOR_SERVER_URL="https://poporganize.com.br"
npm run ios:sync
```

Para testar na rede local, use o IP do computador:

```bash
export CAPACITOR_SERVER_URL="http://192.168.0.10:5173"
npm run ios:sync
```

## Projeto iOS

A pasta `ios/` ja foi criada neste projeto. Se ela for removida ou voce estiver em um clone antigo, recrie com:

```bash
npm run ios:add
```

Sincronize sempre que mudar o app:

```bash
npm run ios:sync
```

## Abrir no Xcode

```bash
npm run ios:open
```

No Xcode, selecione um iPhone conectado ou um simulador e clique em Run.

## Publicar na App Store

Para publicar, voce precisa de uma conta Apple Developer. No Xcode, configure o time de assinatura em Signing & Capabilities, gere um Archive e envie pelo Organizer.
