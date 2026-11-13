# Pop Organize — prévia 1.0.17, build 57

APK de teste separado da versão de produção. Sem envio à Google Play.

- Consultas por pessoa, setor, grupo, prioridade, período e nome da tarefa, com nomes resolvidos no servidor.
- Continuidade da conversa: “e amanhã?”, “só as urgentes”, “quem é o responsável dessa?” e mudança para outro setor/grupo, sem repetir informações já claras.
- Busca por tarefa nomeada inclui outras datas e concluídas quando não houver restrição explícita, com prioridade para títulos exatos e registros recentes.
- Resumo se adapta ao teclado para manter o envio acessível; preserva grupo/destino, responsável, prioridade e os demais campos definidos.
- Mantidas esfera animada, confirmação de criação por “eu confirmo”, encerramento durante consulta e diagnóstico de erros da chamada.
- Exclusivo de administradores, limitado à empresa selecionada. Cria novas tarefas mediante confirmação e consulta dados; não edita, conclui, reabre, cancela nem exclui tarefas existentes.

Validação: 85 testes Node, verificação de tipos, compilações web e Android; nove etapas de conversa no modelo real; três turnos falados mantendo contexto; 12 cenários da API e 38 de sincronização em memória. Consulta com dados reais encontrou a tarefa “teste” vinculada à Cintia, com data 10/11/2026 e status concluída.

Encerre uma chamada antiga e inicie outra para carregar as novas instruções e ferramentas. O chat de texto usa a API atualizada em cada mensagem.

A falha genérica de chamada anteriormente relatada não apareceu nos testes. O build registra o código do provedor para diagnóstico se voltar a ocorrer; a causa daquela ocorrência ainda não foi confirmada.

Publicações da API com backup em `/var/www/pop-organize-sync-backup-20261113T172624Z` e `/var/www/pop-organize-sync-backup-20261113T173600Z`. Build 57 instalado pelo USB; a revisão automática bloqueou a última conferência visual após a instalação, sem fornecer motivo detalhado.
