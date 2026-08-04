import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacidade")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="4 de agosto de 2026">
      <section>
        <h2>Dados tratados</h2>
        <p>
          O Pop Organize trata dados de conta, como nome, e-mail e foto, e o conteúdo que você
          adiciona ao serviço, incluindo empresas, equipes, tarefas, prazos e listas. Também podemos
          registrar informações técnicas estritamente necessárias para autenticação, segurança e
          funcionamento do aplicativo.
        </p>
      </section>
      <section>
        <h2>Finalidades</h2>
        <p>
          Usamos os dados para autenticar sua conta, sincronizar suas informações entre
          dispositivos, permitir colaboração com sua equipe, enviar avisos solicitados e prestar
          suporte. Não vendemos dados pessoais.
        </p>
      </section>
      <section>
        <h2>Compartilhamento e armazenamento</h2>
        <p>
          Dados podem ser tratados por provedores essenciais de hospedagem, e-mail, autenticação e
          inteligência artificial, somente para prestar as funcionalidades solicitadas. Integrantes
          de uma empresa veem apenas o conteúdo permitido por suas funções e permissões.
        </p>
      </section>
      <section>
        <h2>Seus direitos e exclusão</h2>
        <p>
          Você pode corrigir dados e excluir sua conta pelo próprio aplicativo. Também pode iniciar
          uma solicitação na página <a href="/excluir-conta">Excluir minha conta</a>. Dados que
          precisem ser mantidos por obrigação legal poderão ser retidos somente pelo prazo
          necessário.
        </p>
      </section>
      <section>
        <h2>Contato</h2>
        <p>
          Dúvidas sobre privacidade podem ser enviadas para{" "}
          <a href="mailto:contato@poporganize.com">contato@poporganize.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
