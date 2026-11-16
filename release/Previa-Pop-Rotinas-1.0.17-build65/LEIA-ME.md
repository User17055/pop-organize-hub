# Pop Organize teste build 65

Prévia Android 1.0.17-teste, build 65, preparada em 15/11/2026.

Pacote `br.com.poporganize.app.teste`, separado do aplicativo de produção. O APK usa a configuração performance, com otimização e sem depuração da aplicação. Pode ser instalado pelo ADB com depuração Wi-Fi, como atualização compatível da prévia, sem desinstalar ou apagar dados.

## Novidades

- Mais → Rotinas e turnos, com telas nativas para modelos, impedimentos e passagem de turno.
- Quatro modelos iniciais e modelos personalizados com prévia de ativação.
- Registro Estou travado, indicação opcional de apoio e resolução de impedimentos.
- Passagem de turno por setor, resumo, pendências e confirmação de leitura.
- Atalho Estou travado no detalhe das tarefas, na lista e no calendário.
- Reenvio com identificação persistente para impedir duplicação de operações.

Os novos fluxos não chamam IA. A gravação e a consulta dessas funcionalidades exigem conexão.

## Dependência do servidor

A API `/api/mobile/operations` foi publicada em 15/11/2026, após a geração deste APK. O erro HTTP 404 observado inicialmente foi corrigido. A build 65 já instalada é compatível, sem necessidade de outro APK.

O código incorpora também as alterações locais de voz que já existiam no projeto. Esta prévia não representa uma publicação na Google Play.

## Instalação por Wi-Fi

Com o computador já pareado ao celular, use o endereço de conexão mostrado em Depuração sem fio:

```text
adb connect IP:PORTA
adb -s IP:PORTA install -r Pop-Organize-1.0.17-teste-build65.apk
```

O resumo SHA-256 está em SHA256.txt. A atualização deve preservar os dados; não desinstale a prévia anterior para instalar este arquivo.

## Verificação desta entrega

Compilação performance concluída, assinatura APK v2 validada e alinhamento de 16 KB conferido. Manifesto confirma pacote de teste, versão 1.0.17-teste e código 65.

Instalação por Wi-Fi concluída com `Success` no Samsung SM-S721B, atualizando a build 64 sem desinstalação. A conferência posterior confirmou a build 65 e conservou a data original da primeira instalação.

Após a publicação do backend, Modelos, Impedimentos e Turnos foram conferidos no Samsung com a conta conectada. A API publicada passou por 14 cenários HTTP em memória, sem gravar dados reais.
