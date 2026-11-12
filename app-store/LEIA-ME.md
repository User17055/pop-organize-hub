# Textos da App Store

Fonte dos textos que o `scripts/asc-loja.mjs` grava na versão da App Store pela App Store Connect
API. O que estiver aqui é o que vai para a loja: editar aqui, não no site, senão o próximo envio
volta o texto.

| Arquivo | Campo na App Store Connect | Limite |
| --- | --- | --- |
| `novidades/<versão>.txt` | Novidades desta versão (uma por versão; obrigatório para enviar) | 4000 |
| `pt-BR/descricao.txt` | Descrição | 4000 |
| `pt-BR/palavras-chave.txt` | Palavras-chave (separadas por vírgula) | 100 |
| `pt-BR/texto-promocional.txt` | Texto promocional (hoje vazio na loja; sem arquivo) | 170 |
| `pt-BR/url-suporte.txt` | URL de suporte | — |
| `notas-revisao.txt` | Notas para a revisão (em inglês) | 4000 |

Arquivo ausente = o campo fica como está na loja.

Nas notas, `<DEMO E-MAIL>` é trocado na hora pelo e-mail da conta de revisão, que vem do secret
`APPSTORE_REVISAO` e nunca entra no repositório nem no log. Contato e conta de revisão também
vêm só desse secret, em JSON:

```json
{
  "contactFirstName": "...",
  "contactLastName": "...",
  "contactPhone": "+55 ...",
  "contactEmail": "...",
  "demoAccountName": "...",
  "demoAccountPassword": "..."
}
```

Sem o secret, as informações de revisão ficam como estão (a Apple copia da versão anterior) e o
script só confere se estão preenchidas.

Capturas de tela, nome, subtítulo, categoria, classificação etária e privacidade não passam por
aqui: são da ficha do app e continuam de uma versão para a outra.
