# Pop Organize 1.0.16 — build 19

Preparado em 12/11/2026. O build 18 já foi enviado à Google Play, por isso esta revisão usa um número novo.

## Arquivos

- `Pop-Organize-1.0.16-build19.aab`: enviar à Google Play Console.
- `Pop-Organize-1.0.16-build19.apk`: instalação direta da versão de produção.
- `Pop-Organize-1.0.16-build19-mapping.txt`: guardar para interpretar relatórios de falhas.
- `Pop-Organize-1.0.16-build19-verificacao.json`: assinaturas, integridade e hashes.
- `Pop-Organize-1.0.16-build19-notas.txt`: notas para a publicação.

## Alterações

Início e término ficam no mesmo seletor de horário, tanto na criação quanto na edição. A duração é calculada automaticamente, inclusive ao passar da meia-noite. O término é opcional. A data de conclusão abre um calendário sem digitação. As configurações mostram a assinatura do desenvolvedor com a logo LisonTech fornecida.

## Validação

65 testes Kotlin e um teste instrumentado no celular aprovaram os seletores, a duração, o intervalo noturno e a seleção de data. O pacote de produção foi verificado com bundletool, assinatura correspondente ao build 18, API 36, ausência das telas de depuração, integridade ZIP e alinhamento de 16 KB. O APK de produção não foi instalado sobre o aplicativo original; a revisão para o celular usa o pacote de teste separado.

Os arquivos permanecem somente neste computador. Nenhum envio à Google Play ou à VPS foi realizado.

## SHA-256

- `Pop-Organize-1.0.16-build19.aab`: `362cd62f2e4d9ddf31e55663ca2ca0108917e5d0f8c7216e4410f31ebc3e3bfe`
- `Pop-Organize-1.0.16-build19.apk`: `998df1330e38c46e57e3e86116790ceba69bd9530420750a7fe1b1478c441275`
