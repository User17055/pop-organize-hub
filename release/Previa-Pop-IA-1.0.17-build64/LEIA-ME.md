# Pop Organize — prévia 1.0.17, build 64

APK de teste separado da versão de produção (`br.com.poporganize.app.teste`). Sem envio à Google Play.

- Mudo: a esfera e o botão do microfone ficam vermelhos. O Pop continua falando (o mudo só fecha a escuta) e a esfera continua reagindo à fala dele; calada, não pulsa.
- Consulta demorada: depois de 4 s, e a cada 4 s (até 3 vezes), o app pede à voz uma frase curtinha como "Quase lá…" (`session.commentary.append`), sem adiantar resultado.
- Eventos de mudo e de contexto passam a levar `event_id`, como a documentação da API Live exige.

Servidor — **ainda não publicado na VPS**: português correto e bem articulado, sem gírias; pronúncia paulistana neutra com exemplos fonéticos (s sibilante, r sem aspirar), por recomendação do guia "Prompting GPT-Live"; ao consultar, diz "Um momentinho, estou consultando."; continua falando se o microfone for desligado.

Validação: 89 testes Node (1 novo para o "quase lá"), verificação de tipos e compilação Android. Voz não conferida no aparelho.

Build 64 instalado pelo USB por cima da 63, mantendo os dados.
