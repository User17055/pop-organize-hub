# Próxima versão — Pop IA por voz e reuniões

Proposta para discussão, preparada em 12/11/2026. A versão atual é 1.0.16, build 20; as funcionalidades abaixo pertencem à próxima versão, sugerida como 1.0.17. Esta proposta não inicia a implementação da IA nova.

## Experiência recomendada

Uma única Pop com duas formas de começar: **Conversar com a Pop** e **Nova reunião**. Ambas produzem tarefas no calendário que já existe, com início, término, duração, responsável, prioridade, descrição e checklist quando fizer sentido.

Na chamada, a Pop conversa naturalmente, aceita interrupções e mostra um resumo da tarefa enquanto ela é montada. Ela pergunta apenas o que faltar. “Pode criar” ou “agende isso” autoriza a criação por voz, sem abrir outra confirmação para cada campo. Ao final, informa o que efetivamente foi salvo e atribuído. Se a pessoa só pedir sugestões, mantém um rascunho.

Na reunião gravada pelo aplicativo, a transcrição aparece durante a gravação e a análise acompanha os trechos já confirmados. O resumo, as decisões e as propostas de tarefas vão sendo atualizados ao longo da conversa. Ao encerrar, a Pop consolida o que já processou e resolve o que ficou pendente. Também será possível enviar um arquivo já gravado, com processamento progressivo. O organizador pode ajustar os responsáveis, datas e horários e criar todas as selecionadas de uma vez. Cada proposta mantém o trecho e o instante da gravação que justificam sua criação. A conversa gravada é material para análise; as ações no aplicativo vêm da decisão do usuário que está operando a Pop.

Exemplo de chamada: “Preciso revisar o estoque amanhã.” A Pop pode perguntar qual estoque e sugerir um intervalo disponível; a pessoa responde “às nove, com a Cintia, por meia hora”. O rascunho passa a mostrar 09:00–09:30. Ao ouvir “pode criar”, o servidor valida e grava a tarefa, e os colaboradores a recebem pelo fluxo atual de sincronização.

## Como sugerir a pessoa certa

Primeiro respeitar quem foi explicitamente indicado na conversa ou assumiu a atividade na reunião. Quando faltar um nome, considerar função, setor, grupo, competências cadastradas, permissões, carga de tarefas e horários disponíveis. Mostrar um motivo curto para a sugestão e oferecer alternativas.

O cadastro atual tem nome, cargo, setor e grupo, mas não contém um mapa completo de competências, turnos e indisponibilidades. Esses dados precisam ser incluídos para sustentar recomendações de adequação e disponibilidade. Até lá, a Pop deve explicar quais informações tem e consultar a pessoa quando faltar contexto. Distinguir duas vozes em uma gravação também não identifica automaticamente os funcionários: o organizador poderá vincular “Participante 1” a uma pessoa cadastrada.

## O que já existe no código

- `src/lib/pop-ai.server.ts`: geração estruturada de rascunhos, transcrição de áudio e criação de sessão Realtime com credencial temporária.
- `src/components/tasks/pop-assistant.tsx`: interface web com áudio, eventos de chamada e interrupções.
- O rascunho atual prevê prazo, prioridade, destino, responsável, recorrência e checklist, mas ainda não representa início, término e duração de forma completa.
- O Android usa Kotlin/Compose. A chamada precisa de uma experiência própria no aplicativo, aproveitando o backend existente.
- As tarefas já possuem horários, duração, atribuição, permissões e sincronização. O trabalho deve reaproveitar esses contratos.

## Sequência de entrega proposta

| Etapa | Entrega | Condição de aceite |
| --- | --- | --- |
| 1 — Criar por conversa | Chamada no Android, rascunho visível, início/término, pergunta sobre dados faltantes e criação autorizada por voz | Uma conversa cria a tarefa correta uma única vez; responsável e intervalo chegam aos demais aparelhos |
| 2 — Reuniões | Gravar com transcrição ao vivo e análise incremental; separar participantes; receber arquivos; revisar propostas em lote | O texto e as propostas surgem durante a gravação; cada tarefa aponta para um trecho; é possível corrigir e criar somente as propostas escolhidas |
| 3 — Delegação contextual | Competências, turnos, indisponibilidades e recomendação com motivo e alternativas | A sugestão usa dados cadastrados, respeita o que foi decidido e sinaliza conflitos de horário |

Minha recomendação é começar pela chamada para criação de tarefas. Isso aproveita mais da base já pronta e permite acertar a conversa, os horários e o salvamento antes de adicionar reuniões longas e recomendações mais complexas.

## Processamento durante a gravação e economia

Requisito definido pelo usuário: o trabalho deve acontecer durante a reunião, com pouco reprocessamento e consumo controlado. A transcrição ao vivo e o modelo que analisa tarefas são etapas separadas.

1. **Capturar e transcrever continuamente.** Mostrar as palavras que chegam como texto provisório. Somente os trechos confirmados pelo motor de áudio alimentam a análise de decisões e tarefas, para evitar agir sobre uma frase que ainda vai ser corrigida.
2. **Analisar blocos novos.** Agrupar falas confirmadas, inicialmente em janelas adaptativas de 30–60 segundos, e antecipar a análise quando houver uma decisão completa. Não chamar o modelo a cada palavra ou durante uma pausa sem conteúdo novo. Essa janela é uma configuração inicial a medir no piloto, não uma garantia de latência.
3. **Conservar um estado compacto.** Enviar o trecho novo, um resumo curto e as decisões/tarefas abertas. Guardar a transcrição completa na VPS e recuperar apenas os trechos necessários quando houver uma dúvida. Não reenviar a reunião inteira a cada atualização.
4. **Separar cálculo de linguagem.** A VPS calcula conflitos de horário, candidatos autorizados, disponibilidade e carga de tarefas. A IA recebe somente os dados relevantes e as poucas opções elegíveis para aquela atividade.
5. **Retornar apenas alterações.** Atualizar o responsável, o prazo ou o título da proposta já existente quando a pessoa corrigir uma decisão. Cada proposta tem identificador estável e referências às falas; repetição da transcrição não cria tarefas duplicadas.
6. **Escalonar só quando necessário.** Começar a análise com uma opção econômica validada em português. Acionar uma análise mais capaz apenas em ambiguidades e conflitos que a primeira etapa não resolver. Medir precisão antes de escolher modelos ou fixar uma estimativa de custo.
7. **Concluir com uma revisão curta.** Ao encerrar, usar o estado consolidado e os pontos pendentes. Não retranscrever nem reanalisar todo o áudio como rotina. Guardar o original para consulta e correção quando necessário.
8. **Medir custos separados.** Acompanhar minutos de áudio, processamento de falantes, tokens de entrada/saída, chamadas, armazenamento e repetições. Estabelecer um orçamento por empresa e comparar custo por hora de reunião com qualidade e demora da resposta. Economizar tokens de texto não elimina o custo de transcrição do áudio.

No celular, manter buffers pequenos, guardar a gravação progressivamente e enviar blocos com confirmação e retomada. A análise fica fora da interface, sem carregar uma reunião inteira na memória do aparelho. Quando a rede cair, a gravação continua localmente; o aplicativo informa o que ainda está aguardando processamento e retoma do último bloco confirmado.

## Separação de falantes

Durante a conversa, a interface pode apresentar “Participante 1”, “Participante 2” e assim por diante. Associar uma voz a um funcionário é outra operação: a pessoa poderá indicar quem é cada participante. Em sobreposição de vozes, fala muito curta ou áudio ruim, o sistema deve conservar a dúvida em vez de atribuir uma tarefa ao nome errado. O mesmo participante precisa manter uma identidade estável quando o processamento troca de bloco ou reconecta.

A [documentação de transcrição ao vivo da OpenAI](https://developers.openai.com/api/docs/guides/realtime-transcription) permite receber texto progressivamente. Porém, a [documentação de separação de falantes](https://developers.openai.com/api/docs/guides/speech-to-text#speaker-diarization) informa que esses rótulos não estão disponíveis nas sessões de transcrição Realtime; a opção especializada documentada está em descontinuação. Portanto, o piloto deve avaliar um motor com transcrição e falantes em streaming ou uma etapa específica de separação de vozes junto da transcrição. Não basear a versão nova em um modelo em descontinuação nem prometer identificação automática de pessoas.

A escolha do motor de áudio fica condicionada a custo por hora, suporte a português, estabilidade dos participantes entre blocos, qualidade com vozes sobrepostas e atraso até o texto/falante ficar confirmado. Preferir uma solução que evite pagar por duas transcrições completas do mesmo áudio.

## Organização técnica

- Conversa de voz para a chamada e transcrição com análise incremental para a reunião. A [Realtime API](https://developers.openai.com/api/docs/guides/realtime-conversations) documenta conversas de áudio e chamadas de funções. No modo reunião, a Pop acompanha sem gerar uma resposta falada continuamente. A separação dos dois fluxos é uma recomendação de arquitetura para este aplicativo.
- A VPS valida empresa, pessoas, horários e permissões em toda criação. A credencial permanente do provedor fica no servidor; o cliente usa uma sessão temporária.
- Reutilizar a criação existente e identificadores de operação para que queda de conexão e repetição da chamada não dupliquem tarefas.
- Reuniões viram trabalhos persistidos com estados de envio, transcrição, análise, revisão e criação. Retomar o envio de áudio após falha e preservar os rascunhos.
- A gravação terá indicação visível e controles de pausar/encerrar. Definir acesso por empresa, opção de exclusão e política de armazenamento dos áudios.
- Controlar minutos de áudio e consumo por empresa, com um limite configurável. Escolher modelos após comparar qualidade em português, demora de resposta e custo com gravações representativas.

## Verificações antes de liberar

1. Entender correções durante a chamada: “não é amanhã, é sexta”, “troca a pessoa”, “deixa para as dez”.
2. Respeitar início/término, duração, fuso de São Paulo e conflitos de agenda.
3. Perguntar quando nome ou data forem ambíguos; não criar pessoas, horários ou decisões que não foram definidos.
4. Não duplicar tarefas após falha, reconexão ou repetição de “pode criar”.
5. Reunir várias decisões da mesma reunião sem misturar responsáveis e prazos.
6. Mostrar o que foi criado, o que ficou como sugestão e o que ainda está sendo processado.
7. Manter as permissões e a sincronização atuais; a atribuição não torna a conclusão exclusiva de um responsável.
8. Testar reuniões de 30, 60 e 120 minutos: manter participantes e horários estáveis ao trocar blocos/conexões e retomar sem duplicação após queda de rede.
9. Medir atraso da transcrição, atraso das propostas, tempo de consolidação final, custo por hora e correções de falantes. Uma reunião maior não deve aumentar o contexto enviado a cada chamada proporcionalmente a todo o histórico acumulado.

## Decisões para a próxima conversa

- Priorizar Android na primeira entrega ou lançar web e Android juntos.
- Validar a ordem sugerida: chamada, reuniões, delegação contextual.
- Definir se a primeira entrega de reuniões começa com gravação pelo celular, envio de arquivos ou ambos.
- Definir quais dados de competências e disponibilidade a empresa poderá cadastrar.

## Proposta comercial inicial

Sugestão para validar com empresas-piloto, vendendo o Pop Organize com gestão de tarefas e IA. Os valores abaixo são uma proposta de posicionamento, não preços já configurados no aplicativo.

| Plano | Mensalidade proposta | Funcionários incluídos | Horas mensais de IA compartilhadas |
| --- | --- | --- | --- |
| Empresa | R$ 499 | Até 20 | 40 horas |
| Negócios | R$ 1.199 | Até 50 | 120 horas |
| Intensivo | R$ 3.990 | Até 100 | 440 horas |

Excedente proposto: R$ 10 por hora de reunião processada, com cobrança por minuto proporcional e autorização prévia da empresa para consumir excedentes. Exibir o consumo e alertar ao se aproximar da franquia; sem autorização de excedentes, parar o processamento pago ao atingir o limite e conservar os arquivos pendentes.

A franquia pertence à empresa inteira. Uma reunião compartilhada é processada uma vez. Dez funcionários gerando 440 horas de gravações diferentes cada um somam 4.400 horas, exigindo orçamento próprio por volume; o plano Intensivo não cobre 440 horas para cada funcionário.

No cenário econômico estimado anteriormente, 440 horas consomem aproximadamente R$ 800–1.100 em APIs. Uma mensalidade de R$ 3.990 deixa R$ 2.890–3.190 antes de infraestrutura, armazenamento, suporte, impostos, taxas, aquisição de clientes e remuneração do negócio. Medir esses custos e a qualidade em um piloto antes de prometer uma margem ou fechar desconto anual.

Como referência de mercado, o [Fireflies](https://fireflies.ai/pricing) anuncia Pro a US$ 10 e Business a US$ 19 por usuário/mês com cobrança anual. A proposta acima usa outra unidade comercial: empresa, funcionários incluídos e horas compartilhadas. A integração das reuniões com os responsáveis, os horários e a execução das tarefas é a proposta de valor do Pop Organize.

Recomendação de lançamento: começar com o plano de R$ 499 e um piloto pago com poucas empresas. Validar o uso real por empresa, taxa de correção das tarefas sugeridas, necessidade de suporte e custo por hora antes de ampliar a venda. Não oferecer uso ilimitado neste volume de gravações.
