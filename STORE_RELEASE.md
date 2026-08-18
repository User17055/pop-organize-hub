# Publicação nas lojas

## Artefatos e credenciais locais

- Android App Bundle: `android/app/build/outputs/bundle/release/app-release.aab`
- Chave de upload: `android/pop-organize-upload.jks`
- Dados da chave: `android/keystore.properties`

Os dois arquivos da chave são ignorados pelo Git. Guarde uma cópia criptografada fora deste
computador antes de enviar o primeiro bundle.

## Google Play Console

1. Crie o app com o pacote `br.com.poporganize.app` e ative o Play App Signing.
2. Envie o AAB ao teste interno antes da produção.
3. Cadastre o SHA-1 do certificado de assinatura fornecido pelo Play Console no cliente Android do
   Google Cloud. A chave de upload local não substitui o certificado de assinatura da Play.
4. Use `https://app.poporganize.com.br/privacidade` como Política de Privacidade.
5. Use `https://app.poporganize.com.br/excluir-conta` no campo de exclusão de conta.
6. Preencha Segurança dos dados declarando nome, e-mail, ID do usuário e conteúdo do app como
   dados vinculados à conta e usados para funcionalidade. O app não usa esses dados para publicidade
   ou rastreamento.
7. Informe que o app usa permissão de notificação e forneça as credenciais/instruções de acesso
   solicitadas pela revisão.

## App Store Connect

### Onde o build é gerado

O MacBook Air Early 2015 (Monterey 12.7.6, Xcode 14.2) **não pode gerar o binário de envio**: a
Apple exige Xcode recente com o SDK do iOS correspondente para aceitar uploads no App Store
Connect. Use o workflow `.github/workflows/ios-release.yml`, que roda em runner macOS com Xcode
atual. Os detalhes e os secrets estão em [IOS_APP.md](IOS_APP.md).

### Antes do primeiro envio

1. Matricule-se no Apple Developer Program (US$ 99/ano). Sem isso não há App ID, nem TestFlight,
   nem envio.
2. Registre o App ID `br.com.poporganize.app` com a capability **Sign in with Apple**.
   Não habilite Push Notifications: o app não usa APNs.
3. Confirme no servidor `APPLE_CLIENT_ID=br.com.poporganize.app` e publique o backend antes do
   teste. O login Apple envia o `identityToken` para `POST /auth/apple` e o servidor precisa
   validá-lo contra as chaves públicas da Apple.
4. Crie o app no App Store Connect com o mesmo bundle ID.
5. Gere a chave da App Store Connect API com papel App Manager e cadastre os quatro secrets no
   GitHub.

### Envio

1. Rode o workflow **iOS release (TestFlight)** pelo botão *Run workflow*. Informe o número do
   build se quiser sobrescrever o `CURRENT_PROJECT_VERSION`.
2. O build cai no TestFlight. Teste em aparelho real antes de submeter à revisão.
3. Use as mesmas URLs de privacidade e exclusão da seção da Play. Responda ao questionário de
   privacidade de forma consistente com `PrivacyInfo.xcprivacy`.
4. Informe nome, e-mail, ID de usuário e conteúdo do usuário como dados vinculados à identidade e
   usados para funcionalidade; marque rastreamento como não.
5. Preencha a classificação etária e forneça uma conta de teste com dados reais para a revisão.
   Contas vazias são um motivo comum de rejeição.
6. Confirme que a exclusão de conta dentro do app funciona de ponta a ponta. A Apple testa esse
   fluxo (Review 5.1.1(v)) e ele já existe em Mais > Excluir minha conta.
7. O app suporta iPhone e iPad (`TARGETED_DEVICE_FAMILY = 1,2`). A revisão testa no iPad; se a
   interface não estiver pronta para tela grande, reduza para `1` antes de enviar.

### Sobre o login Google no iPhone

O iOS oferece e-mail e Sign in with Apple. O botão do Google não aparece
(`supportsGoogleSignIn = false`). Se um dia o Google entrar no iPhone, o Sign in with Apple
continua obrigatório enquanto houver login social de terceiros (Review 4.8).

## Validação antes de cada envio

No Windows:

```powershell
npm run check
npm run ios:validate
npm run native:validate:store
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run android:aab
```

`npm run ios:validate` confere a ligação KMP <-> Xcode, o formato do `.xcodeproj`, a integridade do
catálogo de assets e a coerência da configuração de push. `npm run native:validate:store` confere a
URL de produção, a assinatura do Android e se a versão do iOS bate com a do Android.

A compilação do iOS em si é verificada pelo workflow `.github/workflows/ios-build.yml` a cada push.

Depois de publicar o backend, teste em aparelhos reais: login por e-mail, Google/Apple, troca de
espaço, criação/edição/exclusão de tarefas, sincronização entre plataformas e exclusão da conta.
