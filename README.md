# Studio Leandro Rangel — Plataforma Educacional de Avaliação e Sobrecarga

Plataforma educativa para estudantes de graduação, pós-graduandos e fisioterapeutas clínicos. Organiza um fluxo guiado de raciocínio na avaliação da dor, catálogo de instrumentos validados, reavaliação longitudinal e cálculo transparente de volume semanal de carga (volume load).

> **Aviso Regulatório e Pedagógico:** Ferramenta estritamente educacional de apoio ao raciocínio clínico. Não é um dispositivo médico, não emite diagnósticos nosológicos automáticos, não promete cura e não substitui a consulta presencial nem o julgamento clínico do profissional de saúde.

---

## 1. Visão Geral da Arquitetura

- **Framework:** Next.js 14 (App Router) com TypeScript
- **Estilização & Design Tokens:** Tailwind CSS, paleta de cores editorial (Navy `#0C2446`, Amber `#FFB908`, Superfície `#F5F7FA`, Alerta `#D10000`, Tipografia Inter/sans-serif)
- **Ícones:** Lucide React
- **Tratamento de Vídeo do Hero:** Vídeo local (`/media/hero-studio.mp4`) com poster nítido de first paint (`/media/hero-poster.jpg`), mudo garantido, loop, controle acessível de reprodução/pausa e respeito a `prefers-reduced-motion`
- **Banco de Dados & Autenticação:** Supabase Auth (Email + Google OAuth) com Row Level Security (RLS) e ativação atômica de trial via stored procedures PostgreSQL
- **Modo de Demonstração Seguro:** Rota isolada `/demo` com fixtures em memória e simulador de estados de acesso, sem tocar em registros de produção

---

## 2. Estrutura de Rotas Implementadas

| Rota | Descrição |
| :--- | :--- |
| `/` | Landing page completa com hero vídeo, 4 fases, explorador de 11 etapas, mapa corporal, gráfico de volume, oferta de 30 dias e FAQ |
| `/demo` | Demonstração interativa pública com dados fictícios (`PAC-8472`), simulador de acesso e console administrativo |
| `/login` | Tela de autenticação com login social Google e e-mail/senha, recuperação de senha e aviso de aprovação |
| `/solicitar-acesso` | Formulário para solicitação da licença de 30 dias gratuitos (estudantes, pós-graduandos e fisioterapeutas) |
| `/aguardando-aprovacao` | Estado de solicitação em análise explicando que os 30 dias só correm a partir do primeiro acesso |
| `/app` | Painel operacional protegido com métricas, licença restante, avaliação recente e lembretes metodológicos |
| `/app/avaliacoes` | Listagem de avaliações em andamento com códigos pseudonimizados |
| `/app/avaliacoes/[id]` | Fluxo completo guiado das **11 etapas da avaliação** (0 a 10) |
| `/app/evolucao` | Linha do tempo longitudinal e gráfico interativo de volume de treino |
| `/app/conteudos` | Biblioteca de lições didáticas com indicação explícita de materiais publicados e em revisão |
| `/app/glossario` | Glossário com busca e registro de referências científicas candidatas à verificação |
| `/conta/acesso` | Diagnóstico de status de acesso, data de expiração em `America/Sao_Paulo` e solicitação de renovação |
| `/admin` | Console do administrador para aprovação, pausa (congelamento), retomada, extensão e revogação de acessos com log de auditoria |
| `/privacidade` | Minuta preliminar da Política de Privacidade alinhada aos princípios de minimização e pseudonimização da LGPD |
| `/termos` | Termos de uso educacional com ressalvas éticas e legais de não diagnóstico |

---

## 3. As 11 Etapas da Avaliação Guiada

0. **Início e Contexto:** Boas-vindas, orientações pedagógicas, mapa do percurso e status de acesso.
1. **Dados do Paciente:** Código gerado (`PAC-8472`), iniciais (`M.R.`), idade, rotina e queixa principal. Vedada a coleta de nomes completos na V1 (LGPD).
2. **Sinais de Alerta (Red Flags):** Rastreio estruturado de cauda equina, fratura estrutural, neoplasia e infecção grave, com alerta persistente e sem algoritmos arbitrários.
3. **Anamnese SINSS & Mapa da Dor:** Gravidade (EVA), Irritabilidade, Natureza, Estágio temporal, Estabilidade e mapa anatômico interativo (vistas anterior e posterior).
4. **Hipóteses de Mecanismo da Dor:** Raciocínio sobre componentes nociceptivo, neuropático e nociplástico, com suporte a apresentações mistas e justificativa clínica em prosa livre.
5. **Catálogo de Ferramentas:** Fichas conceituais estruturadas (DN4, PainDETECT, CSI, TSK, ODI, EVA) com referências no Brasil e respeito ao licenciamento autoral.
6. **Exame Físico:** Sensibilidade dermatomérica, reflexos tendinosos profundos, força miotômica, testes neurodinâmicos (SLR e Slump) e algometria de pressão.
7. **Fatores Psicossociais:** Avaliação educativa de sono, estresse e crenças de medo-evitação sem rotulação estigmatizante.
8. **Plano de Acompanhamento:** Até 3 metas funcionais centradas na pessoa, justificativa clínica profissional, exercícios planejados e data de reavaliação.
9. **Evolução e Volume:** Linha do tempo longitudinal e integração com o cálculo de volume de treino.
10. **Glossário e Referências:** Terminologia científica padronizada e repositório de evidências candidatas.

---

## 4. Regras do Volume de Carga (Volume Load)

- **Fórmula:** $$\text{Volume de carga (kg)} = \sum (\text{repetições concluídas} \times \text{carga externa em kg})$$
- Séries planejadas ou não concluídas não entram na soma.
- Atividades com peso corporal, elásticos ou Pilates são classificadas como "Não se aplica" (N/A) para sobrecarga em kg, sem estimativas arbitrárias.
- As semanas são agrupadas de Segunda a Domingo no fuso `America/Sao_Paulo`.
- Os totais de **Fevereiro de 2027** são derivados dinamicamente das séries:
  - Semana 1 (01/02 - 07/02): **1.200 kg**
  - Semana 2 (08/02 - 14/02): **1.400 kg**
  - Semana 3 (15/02 - 21/02): **1.300 kg**
  - Semana 4 (22/02 - 28/02): **1.600 kg**
  - **Total:** **5.500 kg**
- Proteção nativa contra divisão por zero em variações percentuais sem base histórica.

---

## 5. Regras do Ciclo de Vida do Acesso (Trial de 30 Dias)

1. Usuários iniciam com status `pending` (pendente).
2. A moderação aprova o acesso (`status = 'active'`).
3. A contagem de exatamente 30 dias se inicia atomicamente no **primeiro acesso** à área restrita (`trial_started_at` e `trial_expires_at` gravados em UTC e exibidos em `America/Sao_Paulo`).
4. **Pausar:** congela os segundos restantes do período (`paused_remaining_seconds`).
5. **Retomar:** define uma nova data de expiração baseada no saldo congelado a partir do instante da retomada.
6. **Revogar:** cessa o acesso imediatamente.
7. **Ao expirar:** o site permanece continuamente online, nenhum dado pessoal é deletado e o usuário é direcionado para a tela de status e renovação.

---

## 6. Instruções de Execução Local

```bash
# 1. Instalar dependências
npm install

# 2. Executar em modo desenvolvimento
npm run dev

# 3. Compilar para produção e iniciar
npm run build
npm run start
```

Acesse em [http://localhost:3000](http://localhost:3000).

Para rodar os testes automatizados das regras de domínio:
```bash
npx ts-node --compiler-options "{\"module\":\"commonjs\"}" scripts/test-domain.ts
```

---

## 7. Manifesto de Arquivos de Mídia e Imagens

- `/public/media/hero-studio.mp4` — Versão otimizada do vídeo-fonte (gerada por `npm run optimize:hero`).
- `/public/media/hero-poster.jpg` — Frame de primeiro paint extraído diretamente do vídeo original na resolução 1280 × 720.
