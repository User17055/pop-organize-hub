# Pop Organize — prévia 1.0.17, build 55

APK de teste separado do aplicativo de produção. Não foi enviado um AAB à Google Play. Mantém a assinatura de teste das prévias anteriores.

- Pop azul no centro da navegação, exclusivo de administradores da empresa.
- Chat com texto, arquivos e conversa por voz masculina; legendas opcionais.
- Esfera em SVG com luzes azuis em movimento contínuo, versão vetorial nativa, controles alinhados e compositor de mensagem ajustado ao teclado. A conversa acompanha novas mensagens automaticamente.
- Consulta tarefas reais, equipe, setores, grupos, permissões, convites e indicadores da empresa selecionada. “Minhas tarefas hoje” filtra o usuário conectado.
- Se não há tarefas pessoais para hoje, procura também nos grupos e setores vinculados ao usuário, distinguindo as tarefas compartilhadas e seus responsáveis.
- Cria novas atividades somente após confirmação. Para tarefas existentes, apenas sugere e permite copiar; não edita, conclui, reabre, cancela nem exclui.
- Ranking identifica quem concluiu, separado de quem era responsável; registros sem autoria ficam separados.

Validação: 74 testes locais; 12 cenários da API e 38 de sincronização em memória; 10 cenários com o modelo real, incluindo arquivos HTML e PDF, mais a consulta contextual de grupos/setores; testes de voz para rascunho e consulta de tarefas com contexto de conversa. Consulta administrativa de SAO FRANCISCO comparada com os totais atuais do banco, sem gravar tarefas.

API publicada com verificação de saúde e backup em `/var/www/pop-organize-sync-backup-20261113T160928Z`.

Consulta contextual de grupos/setores publicada com backup em `/var/www/pop-organize-sync-backup-20261113T162025Z`, conferida com a conta conectada no aparelho.

Arquivos: até três por mensagem, 5 MB cada e 8 MB no total. Arquivos são analisados pelo chat, não anexados automaticamente às atividades. Não há implementação de franquias comerciais nesta prévia.

Se havia uma chamada aberta antes da atualização da API, encerre-a e abra uma conversa nova para carregar as ferramentas de consulta.
