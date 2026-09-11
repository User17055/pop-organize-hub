import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/suporte")({ component: SupportPage });

function SupportPage() {
  return (
    <LegalPage title="Suporte" updatedAt="11 de setembro de 2026">
      <section>
        <h2>Como falar com a gente</h2>
        <p>
          Escreva para <a href="mailto:contato@poporganize.com">contato@poporganize.com</a>{" "}
          descrevendo o que aconteceu. Respondemos em até dois dias úteis.
        </p>
        <p>
          Para agilizar, conte em qual empresa ou espaço o problema ocorreu, o que você esperava que
          acontecesse e o que aconteceu no lugar. Se for algo que você vê no aplicativo do iPhone,
          uma captura de tela ajuda bastante.
        </p>
      </section>
      <section>
        <h2>O que é o Pop Organize</h2>
        <p>
          É um serviço de organização de tarefas para equipes. As atividades podem ser atribuídas à
          empresa inteira, a um setor, a um grupo ou a pessoas específicas, com prazo, prioridade,
          checklist e repetição. O mesmo espaço é acessado pelo navegador e pelo aplicativo, e o que
          muda em um aparece no outro.
        </p>
      </section>
      <section>
        <h2>Dúvidas mais comuns</h2>
        <p>
          <strong>Não consigo entrar.</strong> O acesso é feito com Apple, com Google ou com o seu
          e-mail e um código enviado na hora. Se o código não chegar, confira a caixa de spam antes
          de pedir outro.
        </p>
        <p>
          <strong>Fui convidado e o convite não aparece.</strong> O convite vai para o endereço de
          e-mail exato que a pessoa cadastrou. Entrar com um endereço diferente cria uma conta nova,
          sem vínculo com a empresa.
        </p>
        <p>
          <strong>Uma tarefa aguarda revisão e eu não consigo concluir.</strong> Tarefas que exigem
          revisão só são concluídas pela pessoa responsável por revisá-las. Para as demais, o
          aplicativo mostra que a tarefa está aguardando.
        </p>
        <p>
          <strong>Quero excluir minha conta.</strong> Dá para fazer isso dentro do aplicativo, em
          Mais → Configurações → Excluir minha conta, ou pela página{" "}
          <a href="/excluir-conta">Excluir minha conta</a>.
        </p>
      </section>
      <section>
        <h2>Privacidade e termos</h2>
        <p>
          A <a href="/privacidade">Política de Privacidade</a> descreve quais dados são tratados e
          para quê. Os <a href="/termos">Termos de Uso</a> descrevem as regras do serviço.
        </p>
      </section>
    </LegalPage>
  );
}
