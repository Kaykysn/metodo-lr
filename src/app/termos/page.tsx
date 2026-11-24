import React from "react";
import Link from "next/link";
import LegalDocument, { ContactEmail, type LegalSection } from "@/components/legal/LegalDocument";
import { LEGAL, controllerLabel } from "@/lib/legal";

const link = "font-semibold underline underline-offset-2";

const sections: LegalSection[] = [
  {
    id: "aceite",
    title: "Aceite",
    body: (
      <>
        <p>
          Estes termos regulam o uso do {LEGAL.platform}, plataforma mantida por {controllerLabel()}, com endereço em {LEGAL.address}. Ao pedir acesso, criar a senha ou usar a
          plataforma, você concorda com eles e com a{" "}
          <Link href="/privacidade" className={link}>
            Política de privacidade
          </Link>
          .
        </p>
        <p>Se não concordar, não use a plataforma.</p>
      </>
    ),
  },
  {
    id: "servico",
    title: "O que é a plataforma",
    body: (
      <>
        <p>
          O {LEGAL.platform} é uma ferramenta de apoio ao trabalho de profissionais e estudantes de Educação Física. Com ela é possível:
        </p>
        <ul>
          <li>registrar avaliações, anamnese, mapa de dores e fotos posturais;</li>
          <li>montar, revisar e publicar planos de treino;</li>
          <li>acompanhar a execução e a evolução dos alunos.</li>
        </ul>
        <p>
          O aluno que recebe acesso do seu profissional vê o treino disponibilizado e registra o que fez. O modo demonstração usa apenas dados
          fictícios, guardados no navegador.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidade-tecnica",
    title: "A plataforma não substitui o profissional",
    body: (
      <>
        <p>
          O {LEGAL.platform} não é dispositivo médico, não faz diagnóstico e não prescreve tratamento. As sugestões de treino são geradas por
          regras a partir da avaliação e só valem depois que o profissional as revisa e aprova.
        </p>
        <p>
          A avaliação, a prescrição e o acompanhamento são responsabilidade técnica do profissional de Educação Física registrado no CREF. O
          estudante usa a plataforma para aprender e, quando atende alguém, deve estar sob a supervisão de um profissional habilitado.
        </p>
      </>
    ),
  },
  {
    id: "contas",
    title: "Contas e acesso",
    body: (
      <ul>
        <li>
          Contas de profissional e de estudante passam por análise da equipe. Com a aprovação, o convite chega por e-mail. O link vale por 24 horas
          e funciona uma única vez.
        </li>
        <li>
          A conta do aluno é criada pelo convite do seu profissional e fica ligada apenas à ficha dele. O profissional pode remover esse acesso a
          qualquer momento.
        </li>
        <li>Informe dados verdadeiros e mantenha-os atualizados.</li>
        <li>
          A conta é pessoal e intransferível. Guarde sua senha e avise imediatamente por <ContactEmail /> se suspeitar de uso indevido.
        </li>
        <li>Contas de administração precisam usar segundo fator de autenticação.</li>
        <li>As contas de profissional e de estudante são para maiores de 18 anos.</li>
      </ul>
    ),
  },
  {
    id: "teste",
    title: "Período de teste",
    body: (
      <>
        <p>
          A conta aprovada de profissional ou estudante tem 30 dias de teste gratuito. Eles começam no primeiro acesso depois da aprovação, não na
          data do pedido. Durante o teste ficam liberados os recursos do plano Completo, sem o suporte prioritário.
        </p>
        <p>
          Ao fim do teste, sem plano pago, a conta passa a ser só de consulta: nada é apagado, mas não é possível criar registros novos até a
          contratação de um plano. O acesso do aluno é sempre gratuito.
        </p>
      </>
    ),
  },
  {
    id: "planos",
    title: "Planos e pagamento",
    body: (
      <>
        <p>
          Os planos, preços e limites estão na página de{" "}
          <Link href="/planos" className={link}>
            planos
          </Link>
          . Enquanto a contratação não estiver aberta, nenhuma cobrança é feita. Quando estiver:
        </p>
        <ul>
          <li>
            A assinatura é mensal e renovada automaticamente. O pagamento é feito no ambiente do Asaas, que processa a cobrança. Antes de
            confirmar, você vê o valor, a recorrência e a data da primeira cobrança.
          </li>
          <li>Se você assinar durante o teste, a primeira cobrança acontece só quando o teste terminar.</li>
          <li>
            Você pode cancelar quando quiser. O cancelamento encerra a renovação, e o acesso pago continua até o fim do período já pago.
          </li>
          <li>
            Um pagamento em atraso não corta o período que já foi pago. Estorno ou contestação da cobrança encerram o acesso pago referente a
            ela.
          </li>
          <li>
            Na primeira contratação, você pode desistir em até 7 dias e receber de volta o valor pago, como garante o art. 49 do Código de Defesa
            do Consumidor.
          </li>
          <li>Mudanças de preço serão avisadas com pelo menos 30 dias de antecedência e só valem a partir da renovação seguinte.</li>
        </ul>
      </>
    ),
  },
  {
    id: "dados-alunos",
    title: "Responsabilidades com os dados dos alunos",
    body: (
      <>
        <p>
          Os dados que você registra sobre os seus alunos são seus e de seus alunos, não nossos. Como profissional, você é o controlador desses
          dados perante a LGPD e se compromete a:
        </p>
        <ul>
          <li>
            ter base legal para tratar os dados de saúde dos alunos, em geral o consentimento específico deles, e documentar o consentimento antes
            de fazer fotos posturais;
          </li>
          <li>obter a autorização do responsável legal quando o aluno for menor de idade;</li>
          <li>registrar só o necessário para o atendimento e manter as informações corretas;</li>
          <li>guardar sigilo profissional e não compartilhar o seu acesso;</li>
          <li>atender os pedidos dos alunos sobre os próprios dados, com o nosso apoio quando precisar.</li>
        </ul>
      </>
    ),
  },
  {
    id: "proibido",
    title: "Usos proibidos",
    body: (
      <>
        <p>Não é permitido:</p>
        <ul>
          <li>compartilhar a conta ou usar a conta de outra pessoa;</li>
          <li>tentar acessar dados de outros usuários ou burlar limites, regras de acesso e controles de segurança;</li>
          <li>registrar fotos ou dados de pessoas sem autorização;</li>
          <li>inserir conteúdo ilegal, ofensivo ou que viole direitos de terceiros;</li>
          <li>copiar, revender ou fazer engenharia reversa da plataforma, ou usar programas automáticos para extrair dados dela.</li>
        </ul>
      </>
    ),
  },
  {
    id: "suspensao",
    title: "Suspensão e encerramento",
    body: (
      <>
        <p>
          Podemos suspender ou encerrar uma conta que viole estes termos ou coloque em risco outros usuários ou a plataforma. Sempre que possível,
          avisaremos antes e explicaremos o motivo.
        </p>
        <p>
          Você pode encerrar a sua conta a qualquer momento pelo e-mail <ContactEmail />. Antes do encerramento, pode pedir uma cópia dos seus
          dados. O que acontece com os dados depois do encerramento está descrito na{" "}
          <Link href="/privacidade#retencao" className={link}>
            Política de privacidade
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "disponibilidade",
    title: "Disponibilidade",
    body: (
      <p>
        Trabalhamos para manter a plataforma disponível e os dados protegidos, com cópias de segurança. Ainda assim, pode haver interrupções para
        manutenção ou por falhas de fornecedores e da internet. Manutenções programadas serão avisadas com antecedência sempre que possível.
      </p>
    ),
  },
  {
    id: "propriedade",
    title: "Propriedade intelectual",
    body: (
      <p>
        A marca {LEGAL.platform}, o software, o design e os conteúdos didáticos da plataforma pertencem a {LEGAL.controller}. Os exercícios e
        mídias vindos do catálogo aberto wger seguem as licenças indicadas pelos seus autores, com os devidos créditos. Os métodos de avaliação
        citados pertencem aos seus autores e são referenciados para fins técnicos e educacionais.
      </p>
    ),
  },
  {
    id: "limites",
    title: "Limites de responsabilidade",
    body: (
      <p>
        Não respondemos pelas decisões técnicas do profissional, pelos resultados dos treinos prescritos nem pelo uso da plataforma em desacordo
        com estes termos. Nada nestes termos limita os direitos garantidos pelo Código de Defesa do Consumidor ou pela LGPD.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações destes termos",
    body: (
      <p>
        Estes termos podem ser atualizados. A data de vigência no topo da página indica a versão atual. Mudanças relevantes serão avisadas por
        e-mail ou dentro da plataforma antes de valer. Continuar usando a plataforma depois disso significa aceitar a nova versão.
      </p>
    ),
  },
  {
    id: "lei",
    title: "Lei aplicável e contato",
    body: (
      <p>
        Estes termos seguem as leis brasileiras. Eventuais disputas serão resolvidas no foro do domicílio do usuário. Dúvidas, sugestões e
        reclamações podem ser enviadas para <ContactEmail />.
      </p>
    ),
  },
];

export default function TermosPage() {
  return (
    <LegalDocument
      eyebrow="Condições de uso"
      title="Termos de uso"
      summary={
        <ul className="list-disc space-y-1.5 pl-5">
          <li>O {LEGAL.platform} apoia o profissional de Educação Física, mas não substitui a avaliação nem o julgamento dele.</li>
          <li>Contas de profissional e de estudante passam por aprovação e têm 30 dias de teste gratuito.</li>
          <li>A assinatura é mensal e pode ser cancelada quando você quiser.</li>
          <li>Os dados dos alunos são do profissional e dos alunos. O profissional responde pelo consentimento deles.</li>
        </ul>
      }
      sections={sections}
    />
  );
}
