# EDITFLOW CRM

CRM pessoal/profissional para **editores de vídeo** — full stack.
Backend (API REST + Prisma/PostgreSQL) **e** frontend (Next.js App Router, tema
escuro premium com acento turquesa) integrados no mesmo projeto.

Conceito central:

```
CLIENTE → PROJETO → KANBAN DE PRODUÇÃO → coluna "ENTREGUE"
        → LANÇAMENTO FINANCEIRO AUTOMÁTICO → DASHBOARD
```

**Entregue ≠ Pago.** Um projeto entregue entra no faturamento do mês, mas o
recebimento é controlado separadamente (`PENDING` / `PARTIAL` / `PAID`), com
pagamentos parciais.

> **Deploy na Vercel:** siga o [`DEPLOY.md`](DEPLOY.md) — precisa de um PostgreSQL
> hospedado (Supabase/Neon/Vercel Postgres) e das variáveis de ambiente no painel.

---

## Stack

| Camada        | Tecnologia                                   |
|---------------|----------------------------------------------|
| Runtime/API   | Next.js 15 (App Router, Route Handlers) + TypeScript |
| Banco         | PostgreSQL (local, Supabase ou externo)      |
| ORM           | Prisma 6                                      |
| Validação     | Zod                                          |
| Autenticação  | Auth.js (NextAuth v5) — Credentials + JWT     |
| Hash de senha | bcryptjs                                      |
| Export        | CSV nativo (arquitetura pronta p/ XLSX/PDF)   |
| UI            | Tailwind CSS + Radix UI (componentes próprios) |
| Dados no client | TanStack Query v5                           |
| Gráficos      | Recharts                                      |
| Ícones        | lucide-react                                  |
| Drag & drop   | @dnd-kit (Kanban)                             |
| Animações     | Framer Motion (sutis)                         |

---

## Frontend (aplicação web)

Tudo consome a **API real** — sem mocks. Autenticação por sessão (cookie JWT do
Auth.js); o `middleware.ts` protege todas as rotas e redireciona para `/login`.

**Páginas** (`src/app/(app)/…`):

| Rota | Conteúdo |
|------|----------|
| `/login` | Entrar / criar conta (split premium). |
| `/dashboard` | 4 stat cards (Faturamento, Recebido, Pendente, Entregues) com Δ vs. mês anterior · gráfico **Evolução Financeira** (linha, alterna Faturamento/Recebido/Lucro) · donut **Status Financeiro** · tabela **Projetos recentes** · **calendário** com prazos. |
| `/projetos` | Lista com filtros (Todos/Em andamento/Entregues/Cancelados), busca, paginação · **modal Novo/Editar projeto** · painel lateral de detalhes. |
| `/kanban` | Quadro com **drag & drop** (@dnd-kit), scroll horizontal no mobile. Soltar em "Entregue" chama a API → toast *"Projeto entregue e adicionado ao faturamento."* |
| `/clientes` + `/clientes/[id]` | Lista (WhatsApp, projetos, faturado) · ficha com totais, projetos, histórico e botão **wa.me**. |
| `/financeiro` | Resumo (Faturamento/Recebido/Pendente/Despesas/Lucro) · tabela estilo Notion · filtros (tipo, status, categoria, cliente) · **Novo lançamento** (receita/despesa) · **Registrar pagamento**. |
| `/relatorios` | Fechamento mensal + período personalizado · **Exportar CSV** · Excel/PDF preparados (desabilitados). |
| `/configuracoes` | Conta · **gerenciador de colunas do Kanban** (criar/renomear/colorir/reordenar/excluir, definir coluna de entrega). |

**Período global:** o seletor no header (`PeriodProvider`, persistido em
`localStorage`) alimenta Dashboard, Financeiro e Relatórios.

**Mobile-first:** sidebar some e vira **bottom navigation** (Dashboard · Projetos ·
Kanban · Financeiro · **Mais**); tabelas viram cards; modais e Kanban adaptados ao toque.

**Componentes reutilizáveis:** `StatCard`, `PageHeader`, `PeriodSelector`,
`FinancialChart`, `DonutChart`, `DataTable` (tabela→cards), `StatusBadge` /
`PriorityBadge` / `PaymentBadge`, `EmptyState` / `ErrorState` / `LoadingState`,
`ProjectModal`, `PaymentModal`, `FinancialModal`, `ClientModal`, `ConfirmDialog`,
`KanbanCard`, `ProjectDetailSheet` — em `src/components/`.

---

## Rodando localmente

### 1. Pré-requisitos
- Node.js **20+** (testado no 22)
- Um PostgreSQL acessível (local, Docker ou Supabase)

### 2. Instalar dependências
```bash
npm install
```
> `postinstall` já roda `prisma generate`.

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```
Edite `.env` (veja a tabela abaixo). Gere o segredo do Auth.js:
```bash
openssl rand -base64 32
```

### 4. Criar o schema no banco
```bash
# aplica as migrations versionadas
npm run prisma:deploy

# — ou, em desenvolvimento, para criar/alterar migrations:
npm run prisma:migrate
```

### 5. Popular com dados de teste (6 meses de histórico)
```bash
npm run db:seed
```
Cria o usuário **`editor@editflow.dev` / `editflow123`**, 5 clientes, 17 projetos
(ativos + entregues), 33 lançamentos financeiros e pagamentos.

### 6. Subir a API
```bash
npm run dev            # http://localhost:3000
```

---

## Variáveis de ambiente

| Variável             | Obrigatória | Descrição |
|----------------------|:-----------:|-----------|
| `DATABASE_URL`       | ✅ | String de conexão PostgreSQL usada pela aplicação. Para Supabase serverless use o **pooler** (porta 6543, `?pgbouncer=true`). |
| `DIRECT_URL`         | ➖ | Conexão **direta** (não-pooled) usada por `prisma migrate`. No Supabase, porta 5432. Em dev local pode ser igual à `DATABASE_URL`. |
| `AUTH_SECRET`        | ✅ | Segredo do Auth.js (32 bytes base64). |
| `NEXTAUTH_URL`       | ✅ (prod) | URL pública da aplicação (ex.: `https://crm.seudominio.com`). |
| `AUTH_TRUST_HOST`    | ➖ | `true` em ambientes gerenciados (Vercel/Render) e em dev. |
| `SEED_USER_EMAIL`    | ➖ | E-mail do usuário criado pelo seed (default `editor@editflow.dev`). |
| `SEED_USER_PASSWORD` | ➖ | Senha do usuário do seed (default `editflow123`). |
| `SEED_USER_NAME`     | ➖ | Nome do usuário do seed. |

### Supabase (exemplo)
```env
DATABASE_URL="postgresql://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:5432/postgres"
```

---

## Prisma — comandos

| Comando | Ação |
|---------|------|
| `npm run prisma:generate` | Gera o Prisma Client. |
| `npm run prisma:migrate`  | `migrate dev` — cria/aplica migrations em desenvolvimento. |
| `npm run prisma:deploy`   | `migrate deploy` — aplica migrations existentes (produção/CI). |
| `npm run prisma:studio`   | Abre o Prisma Studio. |
| `npm run prisma:reset`    | Dropa e recria o banco (⚠️ apaga tudo) e roda o seed. |
| `npm run db:seed`         | Roda apenas o seed. |

A migration inicial está em [`prisma/migrations/20260902000000_init`](prisma/migrations).

---

## Como testar a API

### a) Verificação da automação (sem HTTP)
Exercita a cadeia Cliente → Projeto → Kanban → Entregue → Financeiro → Pagamentos → Dashboard
contra a camada de serviços, com asserts, em um usuário descartável:
```bash
npm run verify:flow
```

### b) Fluxo HTTP com `curl`
```bash
BASE=http://localhost:3000

# 1. Registrar
curl -s -XPOST $BASE/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Eu","email":"eu@ex.com","password":"segredo123"}'

# 2. Login (Auth.js Credentials — fluxo CSRF)
CSRF=$(curl -s -c cookies.txt $BASE/api/auth/csrf | sed 's/.*"csrfToken":"//;s/".*//')
curl -s -b cookies.txt -c cookies.txt -XPOST \
  $BASE/api/auth/callback/credentials \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=eu@ex.com" \
  --data-urlencode "password=segredo123" \
  --data-urlencode "json=true"

# 3. Chamadas autenticadas (cookie de sessão em cookies.txt)
curl -s -b cookies.txt $BASE/api/dashboard | jq
curl -s -b cookies.txt "$BASE/api/projects?status=EDITING&page=1&pageSize=10" | jq
curl -s -b cookies.txt -XPOST $BASE/api/clients \
  -H 'content-type: application/json' -d '{"name":"Cliente X"}' | jq
```

> Também é possível autenticar via **Prisma Studio / seed user** e usar o cookie
> retornado por `/api/auth/callback/credentials`.

---

## Endpoints

Todas as respostas seguem o envelope padrão:

```jsonc
// sucesso
{ "success": true, "data": <payload>, "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
// erro
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos", "details": { ... } } }
```

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status da API + banco. |
| `POST` | `/api/auth/register` | Cria conta (bootstrap do board Kanban). |
| `*` | `/api/auth/*` | Auth.js (`csrf`, `session`, `callback/credentials`, `signout`). |
| `GET` | `/api/me` | Usuário autenticado. |
| `GET` | `/api/dashboard` | Resumo do mês (`?month=&year=`). |
| `GET` | `/api/dashboard/charts` | Dados de gráficos (`?months=6&year=`). |
| `GET` `POST` | `/api/clients` | Lista (paginação, `?search=`, `sortBy`) / cria. |
| `GET` `PUT` `PATCH` `DELETE` | `/api/clients/:id` | Detalhe / atualiza / remove (bloqueia se houver projetos). |
| `GET` `POST` | `/api/projects` | Lista (filtros abaixo) / cria. |
| `GET` `PUT` `PATCH` `DELETE` | `/api/projects/:id` | Detalhe / atualiza / remove (`?financial=keep\|cancel`). |
| `POST` `PUT` | `/api/projects/:id/move` | Move no Kanban (`{ columnId, position? }`) — dispara automações. |
| `GET` `POST` | `/api/kanban/columns` | Lista (cria defaults on-demand) / cria coluna. |
| `GET` `PUT` `PATCH` `DELETE` | `/api/kanban/columns/:id` | Detalhe / edita / remove (`?moveTo=<columnId>`). |
| `PUT` `POST` | `/api/kanban/columns/reorder` | Reordena (`{ order: [id, ...] }`). |
| `GET` | `/api/kanban/board` | Board agrupado por coluna (pronto p/ drag-and-drop). |
| `GET` `POST` | `/api/financial` | Lista (filtros abaixo) / cria lançamento. |
| `GET` `PUT` `PATCH` `DELETE` | `/api/financial/:id` | Detalhe / atualiza / remove. |
| `GET` `POST` | `/api/financial/:id/payments` | Lista / registra pagamento (parcial). |
| `DELETE` | `/api/financial/:id/payments/:paymentId` | Remove pagamento (recalcula status). |
| `GET` | `/api/reports/monthly` | Relatório mensal (`?month=&year=&clientId=`). |
| `GET` | `/api/reports/export/csv` | Exporta CSV (`?month=&year=` ou `?from=&to=`, `clientId`, `type`). |
| `GET` | `/api/activities` | Histórico de atividades (`?page=&pageSize=&projectId=`). |

### Filtros suportados

- **Projetos** (`/api/projects`): `status` (repetível), `priority`, `paymentStatus`,
  `clientId`, `columnId`, `month`+`year` **ou** `from`+`to` (por `entryDate`),
  `search`, `page`, `pageSize`, `sortBy`, `sortDir`.
- **Financeiro** (`/api/financial`): `type`, `status` (repetível), `category`,
  `clientId`, `projectId`, `month`+`year` **ou** `from`+`to`, `autoGenerated`,
  `search`, paginação/ordenação.

---

## Automações Kanban ↔ Financeiro

| Gatilho | Efeito |
|---------|--------|
| Projeto **movido** para coluna `isDeliveredColumn` **ou** `status = DELIVERED` | `status → DELIVERED`, `deliveredAt`/`completedAt` preenchidos, cria **1** `FinancialRecord` `INCOME` (mês/ano de `deliveredAt`), status conforme `paymentStatus` do projeto. |
| Projeto entregue **movido de volta** (sem pagamentos) | Remove o lançamento automático prematuro; ao reentregar, recria **um só**. |
| **Duplicidade** | Impossível: `FinancialRecord.autoSourceProjectId` é `@unique`. |
| **Valor do projeto alterado** | Atualiza `amount` do lançamento automático e recalcula o status vs. pago. Valor → 0 sem pagamentos ⇒ lançamento `CANCELLED`. |
| Projeto **cancelado** (`?financial=`/`financialPolicy=`) | `keep` = mantém histórico · `cancel` = lançamentos `PENDING`/`PARTIAL` → `CANCELLED`. |
| **Pagamento** registrado/removido | Recalcula `paidAmount`, saldo e status (`PENDING`/`PARTIAL`/`PAID`) e sincroniza `Project.paymentStatus`. |

---

## Segurança

- Toda rota (exceto `/api/health` e `/api/auth/*`) exige sessão — `withAuth` retorna `401` sem sessão.
- **Ownership**: todas as consultas são escopadas por `userId`; acesso a recurso de outro usuário retorna `404`.
- Senhas com `bcrypt` (cost 12). Sessão JWT assinada com `AUTH_SECRET`.
- Validação de entrada 100% via Zod (dinheiro, datas, IDs, e-mails, telefones, enums, obrigatoriedade).
- Erros centralizados e padronizados (`ZodError → 422`, `Prisma P2025 → 404`, `P2002 → 409`, etc.).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | `prisma generate` + build de produção. |
| `npm start` | Servidor de produção. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint (flat config). |
| `npm run verify:flow` | Teste de integração das automações (precisa de DB). |

---

## Estrutura de pastas

```
prisma/
  schema.prisma          modelo de dados
  migrations/            migrations versionadas
  seed.ts               seed (6 meses de histórico)
scripts/
  verify-flow.ts        teste e2e da automação (camada de serviço)
src/
  app/
    api/**/route.ts      Route Handlers (REST)
    layout.tsx page.tsx
  lib/                   prisma, auth, envelope de resposta, wrapper de rota, erros, paginação, serializers
  schemas/               schemas Zod (1 por domínio) + common
  services/              regras de negócio (client, project, kanban, financial, payment, automation, dashboard, report, activity, user)
  repositories/          acesso a dados (Prisma) + selects reutilizáveis
  types/                 DTOs e contratos compartilhados
  utils/                 money (Decimal), date (mês de referência), csv, slug
```

Detalhes completos de arquitetura e relacionamentos em [`ARCHITECTURE.md`](ARCHITECTURE.md).
