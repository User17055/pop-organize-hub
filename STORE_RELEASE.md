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

1. No Mac com Xcode 26 ou posterior, selecione o Team e confirme o App ID
   `br.com.poporganize.app` com Sign in with Apple e Push Notifications.
2. Confirme no servidor `APPLE_CLIENT_ID=br.com.poporganize.app` e publique o backend antes do
   teste.
3. Gere um Archive Release, valide e envie primeiro ao TestFlight.
4. Use as mesmas URLs de privacidade e exclusão acima. Responda ao questionário de privacidade de
   forma consistente com `PrivacyInfo.xcprivacy`.
5. Informe nome, e-mail, ID de usuário e conteúdo do usuário como dados vinculados à identidade e
   usados para funcionalidade; marque rastreamento como não.
6. Preencha a classificação etária atual e forneça uma conta/instruções para a equipe de revisão.

## Validação antes de cada envio

```powershell
npm run check
npm run ios:validate
npm run native:validate:store
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run android:aab
```

Depois de publicar o backend, teste em aparelhos reais: login por e-mail, Google/Apple, troca de
espaço, criação/edição/exclusão de tarefas, sincronização entre plataformas e exclusão da conta.
