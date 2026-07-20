# Pop Organize para iPhone (SwiftUI nativo)

O alvo em `ios/App/App.xcodeproj` agora inicia uma interface SwiftUI nativa. Ele não abre mais o sistema web em uma WebView do Capacitor.

## O que já está implementado

- onboarding e login nativos;
- Continuar com Apple;
- modo sem conta e armazenamento local com `Codable`/`UserDefaults`;
- Meu espaço e múltiplas empresas;
- tarefas pessoais e empresariais;
- atribuição para pessoa, setor ou grupo;
- equipe, setores e grupos;
- calendário, conclusão e remoção animadas;
- temas claro e escuro;
- lembretes locais, badge e o som personalizado do Pop Organize;
- cliente de autenticação preparado para a API da VPS.

## Requisitos para compilar

- Mac com macOS atualizado;
- Xcode 15 ou superior;
- conta Apple Developer para executar em aparelho e publicar;
- App ID `br.com.poporganize.app` com **Sign in with Apple** habilitado.

Valide os arquivos do projeto:

```bash
npm run ios:validate
```

Abra no Xcode:

```bash
npm run ios:open
```

No Xcode, abra `Signing & Capabilities`, escolha o Team da conta Apple e confirme as capabilities **Sign in with Apple**, **Push Notifications** e **Background Modes > Remote notifications**.

## Conectar à VPS

O iPhone nunca deve acessar o MySQL diretamente. O banco fica privado na VPS e o aplicativo conversa somente com uma API HTTPS.

No target `App`, abra `Build Settings`, procure por `POP_API_BASE_URL` e informe, por exemplo:

```text
https://app.poporganize.com.br
```

O login Apple nativo enviará o token para:

```text
POST /api/native/auth/apple
```

Enquanto esse endpoint ainda não estiver publicado, o login Apple continua validando a conta no aparelho e os dados ficam armazenados localmente.

## Publicação

1. Teste em um iPhone real.
2. Configure o Team e a assinatura automática.
3. Atualize `MARKETING_VERSION` e `CURRENT_PROJECT_VERSION`.
4. Use `Product > Archive`.
5. Envie pelo Organizer para o App Store Connect.

Push entre o painel web e o iPhone precisará de APNs/FCM no servidor. Os lembretes locais já funcionam sem a VPS.
