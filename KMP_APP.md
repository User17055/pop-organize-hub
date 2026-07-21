# Arquitetura Pop Organize

```text
Web (React/TanStack) ----------\
                               > API HTTPS na VPS -> MySQL privado
Android ---- Compose KMP ------/
iOS -------- Compose KMP -----/
```

O painel web continua em `src/`. Android e iOS compartilham interface, modelos e regras em `android/composeApp/src/commonMain`. Código que depende do aparelho fica em `androidMain`/`iosMain` ou no host Android.

Funcionalidades presentes no Compose compartilhado:

- onboarding, conta Google/Apple/e-mail e modo sem conta;
- Meu espaço e lista suspensa de empresas;
- empresa com nome e descrição;
- tarefas pessoais e empresariais, conclusão e remoção animadas;
- atribuição para pessoa, setor ou grupo;
- equipe, setores e grupos liberados depois de criar uma empresa;
- visão geral, calendário e tema claro/escuro;
- estado local compartilhado e pontes para notificações.

Próxima etapa de produção: publicar endpoints REST em `/api/native`, apontar `POP_API_BASE_URL` para a VPS e registrar tokens FCM/APNs. O MySQL deve continuar inacessível aos aplicativos.
