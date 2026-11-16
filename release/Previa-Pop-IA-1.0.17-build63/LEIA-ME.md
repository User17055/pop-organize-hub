# Pop Organize — prévia 1.0.17, build 63

APK de teste separado da versão de produção (`br.com.poporganize.app.teste`). Sem envio à Google Play.

- Esfera redesenhada: azul de vidro com nuvens de luz suaves (branco, ciano, anil e lilás) circulando por dentro, brilho no alto e borda mais escura. Falando, cresce e diminui de forma aleatória e as nuvens aceleram e se afastam; no mudo fica azul e parada, sem pulsar, e o botão do microfone fica vermelho. O ícone pequeno da caixa de mensagem usa o mesmo desenho.
- Removidos os desenhos vetoriais antigos `pop_orb.xml` e `pop_orb_flow.xml`, sem uso.

Servidor — **ainda não publicado na VPS**: novo prompt da voz seguindo o guia "Prompting GPT-Live" da OpenAI. Sem interjeições enquanto o usuário fala e sem interromper nas pausas; jeito animado, caloroso e brasileiro (sai o "fale devagar", que deixava a voz para baixo); sotaque paulistano; frase curta ("Beleza, deixa eu ver aqui") antes de consultar, para não parecer travado; regras do cadastro mais enxutas; tarefas na ordem do horário, sem abrir pelas pendentes.

Validação: 88 testes Node, verificação de tipos, compilação Android e prévia estática da esfera. Voz não conferida no aparelho.

Build 63 instalado pelo USB por cima da 62, mantendo os dados.
