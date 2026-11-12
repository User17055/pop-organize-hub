# Pop Organize 1.0.15 — build 18

Preparado em 12/11/2026 para publicação na Google Play. Identificador de produção: `br.com.poporganize.app`. O build anterior de produção é o 17. O aplicativo de teste continua separado, em `br.com.poporganize.app.teste`.

- Enviar à Google Play: `Pop-Organize-1.0.15-build18.aab`.
- APK de produção: `Pop-Organize-1.0.15-build18.apk`.
- Notas da versão: `Pop-Organize-1.0.15-build18-notas.txt`.
- Mapeamento R8: `Pop-Organize-1.0.15-build18-mapping.txt`. O mesmo mapeamento já está incorporado no AAB.

Os artefatos incluem os ajustes aprovados no build de teste 44: sincronização automática com fila persistente, agenda com duas visualizações, zoom por pinça, ícones de conteúdo, prioridades, alinhamento da hora atual e otimizações de processamento e renderização.

## Validação

Compilação `bundleRelease` e `assembleRelease` concluída. AAB validado com o bundletool do Android Gradle Plugin. Assinaturas do APK e do AAB verificadas e iguais à do AAB de produção 17. Certificado de upload SHA-256: `15ad0895bde195be2097664b3c1aaebe07d8131fb9a48ecbc139e0cbd44f8334`.

Versão 1.0.15, código 18, API de destino 36, pacote de produção e depuração desativada conferidos no manifesto. Componentes da prévia e do receptor de teste ausentes. API HTTPS de produção presente. ZIPs íntegros; alinhamento do APK e segmentos das bibliotecas nativas de 64 bits verificados para páginas de 16 KiB. A variante de teste com o mesmo código funcional passou em 63 testes Kotlin e três testes no aparelho; suas medições de desempenho estão em `docs/android-calendario-e-atualizacao.md`.

| Artefato | Bytes | SHA-256 |
| --- | ---: | --- |
| AAB | 15.462.429 | `6dcc7bff0b239908f0d0e14239fc047f5c6378957d4a294cc64a7632e860bd48` |
| APK | 12.202.795 | `fe482c09ed6d91321d1b94732de29f21e30da9ed9bb081f54838ac58d92d7cc3` |

A preparação dos arquivos está concluída. O envio, a seleção da faixa de distribuição e a publicação na Google Play ainda serão feitos pelo responsável pela conta.
