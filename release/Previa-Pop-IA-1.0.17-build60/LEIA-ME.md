# Pop Organize — prévia 1.0.17, build 60

APK de teste separado da versão de produção (`br.com.poporganize.app.teste`). Sem envio à Google Play. Substitui o visual "núcleo de energia" da build 59.

- Pop como personagem: a esfera azul com olhinhos que piscam e passeiam. Enquanto ele fala, quica, estica e balança; parado, flutua de leve. Esfera maior (até ~185 dp).
- Microfone mudo: a esfera fica vermelha.
- Rascunho recusado sai da tela: botão **Descartar** no cartão; por texto, quando a pessoa recusa ("não", "cancela", "deixa pra lá"); por voz, pela ferramenta `descartar_rascunho`.
- Removido o texto "Voz por IA" embaixo dos botões da chamada.

Servidor (instruções da voz e do chat) — **ainda não publicado na VPS**:

- Fala mais devagar e com sotaque paulistano, pelas instruções da voz. A API Live não aceita ajuste de velocidade (`audio.output.speed` e `session.speed` respondem "Unknown parameter").
- Ferramenta `descartar_rascunho` na voz e campo `discardDraft` no chat de texto.
- Sem a publicação, o botão Descartar funciona, mas a recusa falada ou escrita não tira o rascunho da tela.

Validação: 88 testes Node, verificação de tipos e compilação Android. Animação e voz não conferidas no aparelho.
