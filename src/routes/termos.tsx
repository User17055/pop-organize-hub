import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/termos")({ component: TermsPage });

function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="4 de agosto de 2026">
      <section>
        <h2>Uso do serviço</h2>
        <p>
          O Pop Organize oferece ferramentas de organização pessoal e de equipes. Você é responsável
          pela exatidão do conteúdo inserido, pela segurança do acesso à sua conta e por utilizar o
          serviço de forma lícita.
        </p>
      </section>
      <section>
        <h2>Conteúdo e equipes</h2>
        <p>
          Você mantém os direitos sobre o conteúdo que cadastra. Ao participar de uma empresa, suas
          ações e tarefas podem ser visíveis aos demais integrantes conforme as permissões
          configuradas.
        </p>
      </section>
      <section>
        <h2>Disponibilidade</h2>
        <p>
          Buscamos manter o serviço seguro e disponível, mas manutenções e eventos fora de nosso
          controle podem causar interrupções. Funcionalidades podem evoluir para melhorar segurança
          e experiência.
        </p>
      </section>
      <section>
        <h2>Encerramento</h2>
        <p>
          Você pode deixar de usar o serviço e excluir sua conta a qualquer momento nas
          configurações do aplicativo ou em <a href="/excluir-conta">nossa página de exclusão</a>.
        </p>
      </section>
      <section>
        <h2>Contato</h2>
        <p>
          Fale com <a href="mailto:contato@poporganize.com">contato@poporganize.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
