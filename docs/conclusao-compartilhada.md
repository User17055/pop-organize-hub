# Conclusão por colaboradores com acesso

Correção aplicada à VPS e ao Android de teste 1.0.16 (build 51), em 12/11/2026.

A atribuição de responsáveis não concede exclusividade para concluir. Depois de validar que a pessoa pode acessar a tarefa, a hierarquia permite a conclusão; o grupo de permissões continua decidindo se ela pode concluir ou reabrir. Editar conteúdo, excluir, atribuir e aprovar revisão continuam com suas regras próprias. A visibilidade das tarefas não foi ampliada por esta alteração.

O ajuste é central em `src/lib/permissions.ts`, usado pelo site, pela apresentação móvel, pelos comandos de conclusão e pela sincronização de snapshots. O Android usa a autorização retornada pelo servidor e substitui a mensagem incorreta “Somente o responsável pode concluir” por uma mensagem correspondente à conclusão, reabertura ou revisão.

## Validação e implantação

- 24 testes Node passaram, incluindo sete cenários específicos de permissões, sincronização e duração.
- A verificação de tipos TypeScript passou.
- O site compilou em uma cópia isolada dos fontes da VPS com apenas a correção de permissões.
- 36 cenários de integração passaram antes e depois da implantação. Dois cenários novos comprovam que um colaborador fora dos responsáveis conclui por comando e por snapshot, que outro usuário recebe a conclusão e que os responsáveis permanecem intactos.
- Os testes de integração interceptam as gravações em memória: nenhum dado de auditoria é persistido no banco real.
- A implantação mantém cópia dos fontes e do bundle anterior para reversão. O serviço respondeu com saúde 200 após reiniciar.
- O APK de teste foi compilado com otimização e instalado por USB. A revisão posterior de produção 20 consolida esta correção e inclui o registro de autoria; ver `registro-de-conclusao.md`.

SHA-256 do fonte de permissões implantado: `da4c981855eb9b022cae488b6c22e83a71c4bf4e2fe8ddd79debef30756aa5ad`.
