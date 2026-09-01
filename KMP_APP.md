# Arquitetura Pop Organize

```text
Web (React/TanStack) ----------\
                               > API HTTPS na VPS -> MySQL privado
Android ---- Compose KMP ------/
iOS -------- Compose KMP -----/
```

O painel web continua em `src/`.

> **Correção de 2026-08-27.** Este documento dizia que "Android e iOS compartilham interface,
> modelos e regras". **A interface não é compartilhada.** O que os dois aplicativos compartilham de
> verdade é o **servidor** (`src/lib/mobile-api.server.ts`) e o contrato de dados.
>
> - `android/composeApp/src/commonMain` — a interface do **iPhone**, e só dele na prática.
> - `android/app/src/main/java/.../ui/PopOrganizeApp.kt` — o app **Android** nativo do André, cerca
>   de 10.900 linhas, escrito e mantido em separado.
>
> As divergências deliberadas entre os dois estão em `IOS_DIVERGENCIAS.md`. Código que depende do
> aparelho continua em `androidMain`/`iosMain` ou no host Android.

Funcionalidades presentes no módulo Compose (`commonMain`, que hoje serve o iPhone):

- onboarding, conta Google/Apple/e-mail e modo sem conta;
- Meu espaço e lista suspensa de empresas;
- empresa com nome e descrição;
- tarefas pessoais e empresariais, conclusão e remoção animadas;
- atribuição para pessoa, setor ou grupo;
- equipe, setores e grupos liberados depois de criar uma empresa;
- visão geral, calendário e tema claro/escuro;
- estado local compartilhado e pontes para notificações.

Próxima etapa de produção: publicar endpoints REST em `/api/native`, apontar `POP_API_BASE_URL` para a VPS e registrar tokens FCM/APNs. O MySQL deve continuar inacessível aos aplicativos.
