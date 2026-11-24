import React from "react";
import Link from "next/link";
import LegalDocument, { ContactEmail, type LegalSection } from "@/components/legal/LegalDocument";
import { LEGAL, controllerLabel } from "@/lib/legal";

const sections: LegalSection[] = [
  {
    id: "quem-somos",
    title: "Quem somos e a quem esta política se aplica",
    body: (
      <>
        <p>
          O {LEGAL.platform} é uma plataforma para profissionais e estudantes de Educação Física organizarem avaliações, montarem treinos e
          acompanharem a evolução dos seus alunos. A plataforma é mantida por {controllerLabel()}, com endereço em {LEGAL.address}.
        </p>
        <p>Esta política vale para:</p>
        <ul>
          <li>quem visita o site;</li>
          <li>quem pede acesso e quem tem conta de profissional, estudante ou administração;</li>
          <li>os alunos, cujos dados o profissional registra e que podem receber acesso para ver o próprio treino.</li>
        </ul>
      </>
    ),
  },
  {
    id: "papeis",
    title: "Quem decide sobre cada dado",
    body: (
      <>
        <p>
          <strong>Dados da sua conta</strong> (nome, e-mail, perfil, plano): nós somos os controladores, ou seja, decidimos como esses dados são tratados.
        </p>
        <p>
          <strong>Dados dos alunos</strong> (fichas, avaliações, fotos, treinos e registros de execução): quem decide é o profissional que
          atende o aluno. Ele é o controlador desses dados, e nós agimos como operadores, guardando e processando as informações só para que
          ele use a plataforma. Não usamos dados de alunos para nenhuma finalidade própria.
        </p>
        <p>
          Se você é aluno e quer acessar, corrigir ou apagar seus dados, fale primeiro com o seu profissional. Também pode escrever para{" "}
          <ContactEmail />: encaminharemos o pedido a ele e ajudaremos no que estiver ao nosso alcance.
        </p>
      </>
    ),
  },
  {
    id: "dados",
    title: "Quais dados tratamos",
    body: (
      <>
        <p>
          <strong>Pedido de acesso:</strong> nome e e-mail.
        </p>
        <p>
          <strong>Conta:</strong> nome, e-mail, perfil de atuação (profissional, estudante, aluno ou administração) e, quando informados, registro
          profissional e instituição. A senha é guardada pelo serviço de autenticação apenas em forma cifrada (hash): ninguém da equipe consegue
          lê-la. Se você entrar com o Google, recebemos dele o seu nome e o seu e-mail. Contas de administração usam um segundo fator de
          autenticação (aplicativo autenticador).
        </p>
        <p>
          <strong>Dados dos alunos registrados pelo profissional:</strong> código e nome de exibição, ano de nascimento, objetivo e experiência
          com treino, e-mail (só quando o aluno recebe acesso), avaliações e anamnese, mapa de dores e sintomas, fotos posturais e as marcações
          feitas sobre elas, planos de treino, agenda de sessões, registros de execução (cargas, repetições, esforço percebido e sintomas) e
          relatos do aluno.
        </p>
        <p>
          Parte dessas informações são <strong>dados pessoais sensíveis</strong> referentes à saúde (art. 5º, II, da LGPD) e recebem cuidado
          reforçado, descrito na seção de segurança.
        </p>
        <p>
          <strong>Assinatura</strong> (quando a contratação estiver aberta): plano escolhido, situação dos pagamentos e os identificadores da
          cobrança no Asaas. Os dados do cartão e os demais dados de pagamento são digitados no ambiente do próprio Asaas e não passam pelos
          nossos servidores.
        </p>
        <p>
          <strong>Registros técnicos:</strong> datas de criação e de acesso da conta, decisões da administração sobre acessos (aprovação,
          bloqueio, prorrogação), quem visualizou cada foto postural e quando, e tentativas usadas para limitar abusos, apagadas em 48 horas. Os
          provedores de hospedagem e de autenticação também registram dados de conexão, como endereço IP, data e hora.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Para que usamos os dados e com qual base legal",
    body: (
      <>
        <ul>
          <li>
            <strong>Analisar pedidos, criar e manter contas, enviar convites e avisos da conta:</strong> execução do contrato e dos procedimentos
            que o antecedem (art. 7º, V, da LGPD).
          </li>
          <li>
            <strong>Proteger contas, evitar fraudes e abusos e manter a plataforma segura:</strong> legítimo interesse (art. 7º, IX) e, para dados
            sensíveis, a garantia da prevenção à fraude e da segurança do titular (art. 11, II, g).
          </li>
          <li>
            <strong>Cobrar planos e emitir comprovantes:</strong> execução do contrato e cumprimento de obrigação legal (art. 7º, II e V).
          </li>
          <li>
            <strong>Guardar registros de acesso à aplicação por seis meses:</strong> obrigação legal (Marco Civil da Internet, Lei 12.965/2014,
            art. 15).
          </li>
          <li>
            <strong>Dados dos alunos:</strong> tratados conforme as instruções do profissional, para avaliação, prescrição e acompanhamento do
            treino. Cabe ao profissional ter base legal para isso, em geral o consentimento específico do aluno ou do seu responsável legal (art.
            11, I) ou a tutela da saúde em procedimento feito por profissional de saúde (art. 11, II, f). A plataforma registra, para cada
            conjunto de fotos posturais, se o consentimento foi documentado.
          </li>
        </ul>
        <p>
          Não vendemos dados, não exibimos publicidade e não usamos os dados para marketing de terceiros. As sugestões de treino da plataforma
          são geradas por regras fixas a partir da avaliação e só valem depois de revisadas e aprovadas pelo profissional; nenhuma decisão sobre
          o aluno é tomada de forma automática.
        </p>
      </>
    ),
  },
  {
    id: "acesso",
    title: "Quem vê os dados dentro da plataforma",
    body: (
      <ul>
        <li>Cada profissional vê apenas os alunos que ele mesmo cadastrou.</li>
        <li>
          A administração vê os dados das contas para analisar pedidos, liberar ou suspender acessos e dar suporte. Ela não tem acesso, pela
          plataforma, às fichas, avaliações, fotos e treinos dos alunos.
        </li>
        <li>
          O aluno que recebe acesso vê só o próprio treino, quando o profissional o disponibiliza, e os registros de execução que ele mesmo fez.
          Ele não vê as avaliações nem as anotações do profissional.
        </li>
        <li>O profissional que supervisiona um estudante vê os dados da conta desse estudante.</li>
      </ul>
    ),
  },
  {
    id: "compartilhamento",
    title: "Com quem compartilhamos",
    body: (
      <>
        <p>Usamos fornecedores que tratam dados em nosso nome, cada um só para a sua função:</p>
        <ul>
          <li>
            <strong>Supabase:</strong> banco de dados, autenticação e armazenamento das fotos. Os dados ficam em servidores em São Paulo.
          </li>
          <li>
            <strong>Vercel:</strong> hospedagem do site.
          </li>
          <li>
            <strong>Google:</strong> login com a conta Google, para quem escolhe essa opção, e envio dos e-mails da plataforma (convites e links de
            senha).
          </li>
          <li>
            <strong>Asaas:</strong> cobrança das assinaturas, quando a contratação estiver aberta.
          </li>
        </ul>
        <p>
          Os vídeos de alguns exercícios são exibidos diretamente do <strong>wger</strong> (wger.de), um catálogo aberto de exercícios. Ao
          reproduzir um desses vídeos, o seu navegador se conecta ao servidor do wger, que recebe dados técnicos da conexão, como o endereço IP.
        </p>
        <p>Também podemos fornecer dados a autoridades, quando houver obrigação legal ou ordem judicial.</p>
      </>
    ),
  },
  {
    id: "internacional",
    title: "Transferência internacional",
    body: (
      <p>
        O banco de dados e as fotos ficam no Brasil. Alguns fornecedores, como a Vercel e o Google, são empresas estrangeiras e podem processar
        dados fora do país, por exemplo ao entregar páginas ou e-mails. Nesses casos, a transferência se apoia nas garantias contratuais desses
        fornecedores, como prevê o art. 33 da LGPD.
      </p>
    ),
  },
  {
    id: "retencao",
    title: "Por quanto tempo guardamos",
    body: (
      <ul>
        <li>Os dados da conta e os dados dos alunos ficam guardados enquanto a conta existir.</li>
        <li>
          Quando o período de teste termina sem um plano pago, a conta passa a ser só de consulta e os dados continuam guardados, para que você
          possa contratar um plano sem perder nada.
        </li>
        <li>
          Ao pedir o encerramento da conta, apagamos os dados em até 15 dias. Ficam guardados apenas os dados que a lei obriga a manter: os
          registros de acesso, por seis meses (Marco Civil da Internet), e os registros de pagamento, pelo prazo da legislação fiscal.
        </li>
        <li>As tentativas usadas para limitar abusos são apagadas em 48 horas.</li>
        <li>As cópias de segurança são substituídas no ciclo normal do provedor.</li>
      </ul>
    ),
  },
  {
    id: "seguranca",
    title: "Como protegemos os dados",
    body: (
      <>
        <ul>
          <li>Toda a comunicação com o site é criptografada (HTTPS).</li>
          <li>As regras de acesso ficam no próprio banco de dados: mesmo que alguém altere o site, cada conta só alcança os dados que pode ver.</li>
          <li>
            As fotos posturais ficam em armazenamento privado, abrem só por links temporários e cada visualização fica registrada.
          </li>
          <li>As contas de administração exigem segundo fator de autenticação.</li>
          <li>Links de convite e de nova senha valem por 24 horas e funcionam uma única vez.</li>
        </ul>
        <p>
          Nenhum sistema é totalmente imune a falhas. Se houver um incidente de segurança que possa causar risco ou dano relevante, avisaremos a
          Autoridade Nacional de Proteção de Dados (ANPD) e as pessoas afetadas, como manda o art. 48 da LGPD.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies e armazenamento no navegador",
    body: (
      <>
        <p>
          Usamos apenas cookies necessários para manter você conectado com segurança. Não usamos cookies de publicidade nem ferramentas de
          análise de audiência.
        </p>
        <p>
          O site também guarda no seu navegador as suas preferências (tema e efeitos visuais), rascunhos não salvos, fotos que ainda aguardam
          envio e, no modo demonstração, os dados fictícios da demonstração. Essas informações ficam só no seu aparelho e podem ser apagadas nas
          configurações do navegador.
        </p>
      </>
    ),
  },
  {
    id: "menores",
    title: "Crianças e adolescentes",
    body: (
      <p>
        As contas de profissional e de estudante são para maiores de 18 anos. Os alunos podem ser menores de idade: nesse caso, o profissional é
        responsável por obter a autorização do responsável legal antes de registrar dados, fazer fotos ou dar acesso ao aluno. Dados de crianças
        (até 12 anos incompletos) exigem o consentimento específico de pelo menos um dos pais ou do responsável legal (art. 14 da LGPD).
      </p>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos",
    body: (
      <>
        <p>Pela LGPD (art. 18), você pode pedir, a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
          <li>portabilidade dos dados a outro fornecedor;</li>
          <li>eliminação dos dados tratados com base no seu consentimento e revogação desse consentimento;</li>
          <li>informação sobre com quem compartilhamos seus dados e sobre o que acontece se você não der o consentimento.</li>
        </ul>
        <p>
          Os pedidos são feitos por <ContactEmail />. Podemos pedir uma confirmação de identidade antes de atender. Respondemos em até 15 dias. Se
          não ficar satisfeito, você também pode reclamar à ANPD (gov.br/anpd).
        </p>
      </>
    ),
  },
  {
    id: "encarregado",
    title: "Encarregado de dados",
    body: (
      <p>
        O encarregado pelo tratamento de dados pessoais é {LEGAL.dpo}, que atende pelo e-mail <ContactEmail />.
      </p>
    ),
  },
  {
    id: "mudancas",
    title: "Mudanças nesta política",
    body: (
      <p>
        Esta política pode mudar quando a plataforma ganhar recursos novos ou quando a lei exigir. A data de vigência no topo da página sempre
        indica a versão atual. Mudanças relevantes serão avisadas por e-mail ou dentro da plataforma antes de valer. Veja também os{" "}
        <Link href="/termos" className="font-semibold underline underline-offset-2">
          Termos de uso
        </Link>
        .
      </p>
    ),
  },
];

export default function PrivacidadePage() {
  return (
    <LegalDocument
      eyebrow="Privacidade e proteção de dados"
      title="Política de privacidade"
      summary={
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Guardamos só o necessário para a sua conta e para o trabalho do profissional com os alunos.</li>
          <li>As fichas dos alunos pertencem ao profissional que os atende. Só ele as vê pela plataforma.</li>
          <li>Os dados ficam em servidores no Brasil, com acesso controlado no próprio banco de dados.</li>
          <li>Não vendemos dados, não exibimos publicidade e não usamos rastreadores.</li>
          <li>
            Para qualquer pedido sobre seus dados, escreva para <ContactEmail />.
          </li>
        </ul>
      }
      sections={sections}
    />
  );
}
