import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/excluir-conta")({ component: DeleteAccountPage });

function DeleteAccountPage() {
  const subject = encodeURIComponent("Solicitação de exclusão de conta — Pop Organize");
  const body = encodeURIComponent(
    "Olá, desejo excluir minha conta e os dados associados. Meu e-mail cadastrado é: ",
  );
  return (
    <LegalPage title="Excluir minha conta" updatedAt="4 de agosto de 2026">
      <section>
        <h2>Pelo aplicativo</h2>
        <p>
          Entre na sua conta e acesse <strong>Mais → Configurações → Excluir minha conta</strong>.
          Depois da confirmação, a conta pessoal, sessões e dados associados serão removidos.
        </p>
      </section>
      <section>
        <h2>Sem acesso ao aplicativo</h2>
        <p>
          Envie uma solicitação para o suporte usando o mesmo e-mail da conta. Poderemos pedir uma
          confirmação de identidade antes de concluir a exclusão.
        </p>
        <p className="mt-4">
          <a
            className="inline-flex rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground no-underline"
            href={`mailto:contato@poporganize.com?subject=${subject}&body=${body}`}
          >
            Solicitar exclusão por e-mail
          </a>
        </p>
      </section>
      <section>
        <h2>O que acontece</h2>
        <ul>
          <li>Seu espaço pessoal, sessões e credenciais vinculadas são excluídos.</li>
          <li>Você é removido das equipes das quais participa.</li>
          <li>
            Empresas com outros integrantes são transferidas para outro membro ativo; empresas sem
            outro membro são excluídas.
          </li>
          <li>Dados exigidos por lei podem ser mantidos apenas pelo período obrigatório.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
