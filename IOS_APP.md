# Pop Organize no iPhone com KMP

O iPhone agora usa a mesma interface Compose e o mesmo estado Kotlin do Android. O Xcode mantém apenas `AppDelegate.swift`, que é o host mínimo obrigatório para abrir `ComposeApp.framework`.

## Estrutura

- `android/composeApp/src/commonMain`: telas, modelos, tema e regras compartilhadas;
- `android/composeApp/src/iosMain`: entrada UIKit, persistência, login Apple e permissões do iOS;
- `ios/App/App.xcodeproj`: assinatura, capabilities, ícone e publicação na App Store.

O build phase **Build ComposeApp framework** executa:

```bash
./gradlew :composeApp:embedAndSignAppleFrameworkForXcode
```

## Abrir no Mac

```bash
npm run ios:validate
npm run ios:open
```

No Xcode, escolha seu Team em **Signing & Capabilities** e confirme **Sign in with Apple**, **Push Notifications** e **Background Modes > Remote notifications**. Use iOS 15 ou superior.

O iOS não pode ser compilado no Windows. A validação deste repositório confere a ligação KMP; a compilação final e o Archive devem ser feitos em um Mac com Xcode.

## VPS

O aplicativo nunca acessa o MySQL diretamente. Defina `POP_API_BASE_URL` com a URL HTTPS da API na VPS; Android, iOS e web usarão essa API para sincronizar conta, empresa e tarefas.
