# Pop: diálogo por chamada no site

## Problema e mudança

O problema relatado ocorre na conversa por chamada. O fluxo anterior recebia a transcrição do Realtime, enviava cada fala ao `askPop` e mandava o Realtime ler a resposta desse outro fluxo. O sanitizador de chat podia recusar perguntas de orientação e substituir responsáveis desconhecidos pelo usuário atual.

A chamada agora mantém o diálogo na sessão nativa de voz. A ferramenta `preparar_rascunho` envia o rascunho completo ao servidor para validar pessoas, destino, datas e horários no espaço autenticado. Ela não usa outra chamada de modelo e não grava tarefas. Orientações e perguntas gerais continuam na conversa, sem passar pelo sanitizador do chat.

A criação continua no botão **Confirmar e criar**. Somente depois da resposta de sucesso do cadastro o aplicativo informa à voz que a atividade foi criada. Início e duração são enviados ao cadastro e preservados na próxima ocorrência recorrente.

Nomes desconhecidos ou ambíguos ficam pendentes; não são substituídos silenciosamente. Eventos duplicados não executam a ferramenta novamente. Operações são serializadas e retornos de uma chamada encerrada não modificam a próxima. Trocar de espaço ou de usuário desmonta a sessão anterior.

## Validação

- `npm run typecheck` e compilação de produção local.
- Compilação independente na VPS, em diretório de preparação.
- 18 testes de política e transporte: `scripts/test-pop-call.mjs` e `scripts/test-pop-call-transport.mjs`.
- 31 testes existentes de conclusão, permissões, duração e sincronização.
- 38 cenários de integração de sincronização com banco isolado em memória e zero gravações persistentes.
- Conversa sintética na API Realtime com saída de áudio: saudação, tarefa para Ana às 09:00 por 30 minutos, troca para João às 10:00 preservando data e duração, orientação, resumo e nome desconhecido. Ferramentas somente de validação, sem criação de tarefas reais.

O teste sintético envia texto à sessão de voz e verifica a transcrição da resposta de áudio. Não substitui uma chamada com microfone real no navegador: reconhecimento em ambiente com ruído, interrupções e sensação de latência ainda precisam dessa conferência.

Esta revisão é do site. Não altera os artefatos Android de produção já gerados, nem inclui gravação de reuniões ou identificação de participantes.

## Publicação

Publicada na VPS em 13/11/2026 às 03:43 UTC. O endpoint público de saúde retornou HTTP 200, com aplicação e banco disponíveis. A publicação conferiu os hashes dos oito arquivos alterados e manteve backup do código e da saída anterior para reversão.
