# Método LR

Site e área de trabalho do Método LR, de Leandro Rangel. Profissionais e estudantes de Educação Física usam para registrar a avaliação do aluno, montar o treino em cima dela e acompanhar a evolução semana a semana.

O site está no ar em [metodolr.vercel.app](https://metodolr.vercel.app/).

## O que tem aqui

- `/`: a landing, com o mapa corporal interativo e um caso demonstrativo.
- `/demo`: o fluxo inteiro com dados fictícios. Não precisa de conta.
- `/app`: a área do profissional. Alunos, avaliações (dá para comparar duas datas), treinos com histórico de versões, catálogo de exercícios, gráficos de evolução e uma biblioteca com conteúdos, glossário e referências.
- `/aluno`: o aluno abre o treino que o professor publicou e registra cada sessão. Carga, esforço e dor ficam em campos separados.
- `/admin`: toda conta nova passa por aprovação, e é aqui que o administrador aprova, pausa ou revoga o acesso.

As sugestões de treino saem de regras fixas e mostram de onde vieram. Não fazem diagnóstico nem definem dose: quem decide é o profissional.

## Tecnologias

- Next.js 16 (App Router), React 19 e TypeScript
- Tailwind CSS 4, shadcn/ui e GSAP nas animações da landing
- Supabase para login, banco e armazenamento de fotos, com Row Level Security
- Hospedagem na Vercel, região São Paulo (`gru1`)

O backend (migrações, políticas e Edge Functions do Supabase) fica em outro repositório.

## Rodando localmente

Precisa do Node.js 20 ou mais recente.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

O site tem dois modos, escolhidos por `NEXT_PUBLIC_APP_MODE` no `.env.local`:

- `demo`: os dados são fictícios e ficam só no navegador. Dispensa o Supabase, então é o caminho mais curto para ver o site rodando.
- `supabase`: contas e dados reais. Nesse caso preencha também `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Sem o modo definido, o build de produção para com erro. Assim uma demonstração não vai ao ar por engano. O build também recusa chave secreta do Supabase em variável pública.

## Comandos

| Comando | O que faz |
| :--- | :--- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run start` | serve o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | checagem de tipos |
| `npm run test:domain` | testes de regras, permissões e telas |
| `npm run brand` | gera os arquivos da marca em `public/brand` |
| `npm run optimize:hero` | reprocessa o vídeo do hero |

`node scripts/build-editorial-pb.mjs` gera as versões em preto e branco das fotos da landing.

Alguns testes leem as migrações do backend e falham se a pasta `backend/` não estiver dentro do projeto.

## Estrutura

```
src/
  app/          rotas (landing, demo, área do profissional, área do aluno, login, admin)
  components/   componentes por área: landing, assessment, training, catalog...
  lib/          regras de domínio, acesso ao Supabase, validação e conteúdo
  styles/       tokens de cor e estilos da landing
public/         imagens, vídeos e arquivos da marca
scripts/        testes e scripts de geração de mídia
```
