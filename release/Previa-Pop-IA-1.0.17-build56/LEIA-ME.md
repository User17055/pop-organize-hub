# Pop Organize — prévia 1.0.17, build 56

APK de teste, separado da produção. Sem publicação de AAB na Google Play.

- Esfera animada no azul do aplicativo; removido o botão de nova conversa no topo.
- Resumo mostra destino/grupo/setor, responsável, prioridade colorida, descrição, data, início, término, recorrência, revisão, checklist e etiquetas definidos.
- Criação por voz: depois de revisar uma atividade nova, diga **eu confirmo**. A fala precisa ser recente, explícita e ainda não utilizada. A confirmação passa pelo mesmo mecanismo idempotente do botão; só há anúncio de sucesso depois da confirmação da VPS.
- Pode encerrar a chamada por voz ou botão durante uma consulta; o microfone para e a resposta tardia é descartada.
- Pop continua exclusivo de administradores e limitado a criar/consultar na empresa selecionada. Não edita, conclui, reabre, cancela nem exclui tarefas existentes.
- Menor esforço de raciocínio no backend de voz, respostas concisas e consultas independentes em paralelo no chat.

Validação: 81 testes Node, dois testes Kotlin pelo JUnit, verificação de tipos, 12 cenários da API, 38 de sincronização e testes com o modelo real. Os testes de áudio de confirmação/encerramento simulam a criação sem gravar tarefas reais.

A consulta diária já traz o contexto de grupos/setores na mesma data quando não há tarefas pessoais. Resultados da voz ficam limitados a 24 KB para o transporte WebRTC. O diagnóstico local registra o código das falhas do provedor; falhas posteriores ao encerramento não geram alerta.

A duração de uma resposta continua dependendo da conexão, do modelo e da consulta solicitada.

API publicada com backup `/var/www/pop-organize-sync-backup-20261113T170113Z`. Build 56 inicial instalado. Este APK inclui o diagnóstico posterior e precisa ser reinstalado: o USB desconectou. A falha genérica relatada na chamada ainda não foi identificada no aparelho; os testes de voz com dados reais passaram sem essa falha.
