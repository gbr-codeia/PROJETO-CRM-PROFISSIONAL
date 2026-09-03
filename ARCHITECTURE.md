# EDITFLOW CRM — Arquitetura

## 1. Visão geral

Backend de um CRM para editores de vídeo, construído sobre **Next.js App Router**
(Route Handlers como API REST) com **PostgreSQL + Prisma**. O sistema substitui um
Trello (produção) e a parte financeira de um Notion, integrando os dois fluxos:

```
                 ┌─────────────────────────────────────────────────────────┐
                 │                      USER (multi-tenant)                 │
                 └─────────────────────────────────────────────────────────┘
                                          │  (todo dado é escopado por userId)
        ┌───────────────┬─────────────────┼───────────────────┬─────────────────┐
        ▼               ▼                 ▼                   ▼                 ▼
     CLIENT   ┌──►  PROJECT  ──►  PROJECT_KANBAN ──►  KANBAN_COLUMN     ACTIVITY (log)
        │     │        │                                   │
        │     │        │  (mover p/ coluna "Entregue"  ◄───┘  isDeliveredColumn = true)
        │     │        ▼
        │     │   AUTOMAÇÃO: cria/atualiza 1 FINANCIAL_RECORD (INCOME)
        │     │        ▼
        └─────┴──►  FINANCIAL_RECORD  ──►  PAYMENT (pagamentos parciais)
                         │
                         ▼
                 DASHBOARD / REPORTS (agregações por mês de referência)
```

### Princípio-chave: **entregue ≠ pago**

| Dimensão | Campo | Valores |
|----------|-------|---------|
| Produção | `Project.status` | `NEW → WAITING_MATERIAL → EDITING → REVIEW → ADJUSTMENTS → DELIVERED` / `CANCELLED` |
| Recebimento (projeto) | `Project.paymentStatus` | `PENDING` · `PARTIAL` · `PAID` |
| Recebimento (lançamento) | `FinancialRecord.status` | `PENDING` · `PARTIAL` · `PAID` · `CANCELLED` |

O faturamento é separado em **previsto** (`amount`), **realizado/recebido**
(`paidAmount` = Σ pagamentos) e **pendente** (`amount − paidAmount`).

---

## 2. Camadas

```
Route Handler  (src/app/api/**/route.ts)
   │  withAuth() → sessão + params + searchParams + tratamento de erro
   ▼
Schema Zod     (src/schemas/*)          valida/normaliza a entrada
   ▼
Service        (src/services/*)         regras de negócio + transações + automações + activity log
   ▼
Repository     (src/repositories/*)     acesso Prisma + `include`/`select` reutilizáveis
   ▼
Prisma Client  (src/lib/prisma.ts)      singleton
   ▼
PostgreSQL
```

- **`src/lib/api-handler.ts`** — `withAuth` (rotas privadas) e `withHandler` (públicas):
  resolvem sessão, normalizam `params`/`searchParams`, capturam exceções.
- **`src/lib/api-response.ts`** — envelope padrão `ok/created/noContent/fail` e
  `toErrorResponse` (mapeia `ZodError`, `AppError`, erros conhecidos do Prisma).
- **`src/lib/errors.ts`** — hierarquia `AppError` (`NotFoundError`, `ConflictError`,
  `UnprocessableError`, …) com `status` + `code`.
- **`src/lib/serialize.ts`** — converte linhas do Prisma em DTOs: `Decimal → number`,
  cálculo de `remainingAmount`, achatamento de relações.
- **`src/lib/auth.ts`** — Auth.js v5, provider **Credentials** + estratégia **JWT**,
  `PrismaAdapter` (pronto para OAuth futuro). `session.user.id` injetado via callbacks.

### Serviços

| Serviço | Responsabilidade |
|---------|------------------|
| `user.service` | Registro (hash bcrypt), bootstrap do board, `me`. |
| `client.service` | CRUD, busca, bloqueio de exclusão com projetos vinculados. |
| `project.service` | CRUD, filtros, `move` (Kanban), orquestra automações; `placeCard` mantém posições densas. |
| `kanban.service` | Colunas: defaults idempotentes, CRUD, `reorder`, exclusão com realocação de cards, `board`. |
| `automation.service` | **Coração do sistema** — Kanban ↔ Financeiro (ver §4). |
| `financial.rules` | Funções puras: `deriveFinancialStatus`, mapeamentos status↔paymentStatus, `inferIncomeCategory`. |
| `financial.service` | CRUD de lançamentos, `recomputeFinancialRecord` (Σ pagamentos → status + sync do projeto). |
| `payment.service` | Registrar/remover pagamentos, guarda contra overpay, recálculo. |
| `dashboard.service` | Resumo mensal + payloads de 5 gráficos (`groupBy` por mês de referência). |
| `report.service` | Relatório mensal (projetos entregues no mês) + export CSV (arquitetura format-agnostic). |
| `activity.service` | `logActivity` (aceita `tx`) + listagem paginada. |

---

## 3. Modelo de dados

Nomes de tabela em `snake_case` (via `@@map`). Todo modelo de negócio referencia `userId`.

### `users`
`id · name · email (unique) · passwordHash? · image? · emailVerified? · createdAt · updatedAt`
Relações: `accounts[]`, `sessions[]` (Auth.js), `clients[]`, `projects[]`,
`kanbanColumns[]`, `financialRecords[]`, `activities[]`.
Tabelas do adapter Auth.js: `accounts`, `sessions`, `verification_tokens`.

### `clients`
`id · userId → users · name · companyName? · email? · phone? · whatsapp? · instagram? · notes? · timestamps`
`1 client → N projects` · `1 client → N financial_records`.
Índices: `(userId)`, `(userId, name)`.

### `projects`
```
id · userId → users · clientId → clients (onDelete: Restrict)
title · description? · projectType?
value            Decimal(12,2)  default 0
entryDate        DateTime       default now()
deadline?        deliveredAt?   completedAt?
status           ProjectStatus  default NEW
priority         Priority       default MEDIUM
paymentStatus    PaymentStatus  default PENDING
paymentMethod?   notes?         timestamps
```
Relações: `kanban ProjectKanban?` (1:1), `financialRecords[]`, `activities[]`.
Índices: `(userId)`, `(userId,status)`, `(userId,clientId)`, `(userId,deliveredAt)`.

### `kanban_columns`
```
id · userId → users · name · slug
position           Int
color?
isDeliveredColumn  Boolean default false   ← gatilho da automação
isDefault          Boolean default false
timestamps
@@unique([userId, slug])
```
Board padrão criado on-demand: **Novos Projetos · Aguardando Material · Em Edição ·
Revisão · Ajustes · Entregue** (esta com `isDeliveredColumn = true`).
No máximo **uma** coluna de entrega por usuário (garantido no service).

### `project_kanban` (posição do card)
```
id · projectId → projects (unique, onDelete: Cascade)
columnId → kanban_columns (onDelete: Restrict)
position Int default 0
@@index([columnId, position])
```
`projectId @unique` ⇒ um projeto está em exatamente uma coluna. Posições
renumeradas densamente (0..n-1) a cada movimento (`placeCard`).

### `financial_records`
```
id · userId → users
projectId?  → projects (onDelete: SetNull)
clientId?   → clients  (onDelete: SetNull)
type            FinancialType    (INCOME | EXPENSE)
category        String           (texto livre; sugestões em financial.schema.ts)
description     String
amount          Decimal(12,2)    ← faturamento previsto
paidAmount      Decimal(12,2) default 0   ← Σ payments (denormalizado)
status          FinancialStatus  default PENDING
dueDate? · paidAt?
referenceMonth  Int    referenceYear Int   ← competência (dashboard/relatórios)
paymentMethod? · notes?
autoGenerated       Boolean default false
autoSourceProjectId String? @unique        ← garante 1 lançamento auto por projeto
timestamps
```
Índices: `(userId)`, `(userId,type)`, `(userId,status)`,
`(userId,referenceYear,referenceMonth)`, `(projectId)`.

> **Por que `autoSourceProjectId @unique` e não `@@unique([projectId, autoGenerated])`?**
> Precisamos permitir vários lançamentos manuais para o mesmo projeto, mas **no
> máximo um** automático. Um campo escalar nullable com `@unique` no Postgres
> permite múltiplos `NULL` (manuais) e um único valor não-nulo por projeto (o auto).

### `payments`
```
id · financialRecordId → financial_records (onDelete: Cascade)
amount Decimal(12,2) · paymentDate DateTime default now()
paymentMethod? · notes? · createdAt
```
Fonte da verdade do recebido. Cada insert/delete dispara `recomputeFinancialRecord`.

### `activities`
```
id · userId → users · projectId? → projects (onDelete: SetNull)
action     ActivityAction     (PROJECT_CREATED, PROJECT_MOVED, PROJECT_DELIVERED,
                               PAYMENT_REGISTERED, CLIENT_CREATED, FINANCIAL_*, …)
description String
metadata   Json?              (ids, diffs, gatilho, valores)
createdAt
@@index([userId, createdAt])
```
Escrito dentro da mesma transação da mutação (o helper aceita `tx`).

### Enums
`ProjectStatus` · `Priority` · `PaymentStatus` · `FinancialType` · `FinancialStatus` · `ActivityAction`.

### Diagrama de relacionamentos (resumo)

```
User 1─┬─N Client 1─────N Project 1─1 ProjectKanban N─1 KanbanColumn 1─N ... (User)
       │                   │  │
       │                   │  └─1─N Activity
       │                   └─────N FinancialRecord 1─N Payment
       ├─N FinancialRecord (avulsos: despesas, receitas manuais)
       ├─N KanbanColumn
       └─N Activity
Client 1─N FinancialRecord (opcional)
```

---

## 4. Automação Kanban ↔ Financeiro (detalhe)

Arquivo: [`src/services/automation.service.ts`](src/services/automation.service.ts).
Todas as funções recebem um `Prisma.TransactionClient` — rodam **dentro da mesma
transação** da ação que as disparou (atomicidade e consistência do activity log).

### `onProjectDelivered(tx, project, { deliveredAt?, reason })`
Disparado por: `move` para coluna `isDeliveredColumn`, ou `status → DELIVERED`, ou
criação já entregue.
1. `project.status = DELIVERED`; preenche `deliveredAt` (e `completedAt` se vazio).
2. Se `value ≤ 0` → não cria lançamento (uma futura alteração de valor cria).
3. `upsert` por `autoSourceProjectId = project.id`:
   - **novo** → `FinancialRecord` `INCOME`, `category = inferIncomeCategory(projectType)`,
     `amount = value`, `referenceMonth/Year` de `deliveredAt`, `status` = mapeado de
     `project.paymentStatus`, `autoGenerated = true`. Log `FINANCIAL_CREATED`.
   - **existente** → atualiza `amount`/descrição/competência, **preserva `paidAmount`**,
     recalcula `status` via `deriveFinancialStatus`.

### `onProjectReopened(tx, project, newStatus)`
Projeto entregue volta para coluna não-entrega / sai de `DELIVERED`.
Limpa `deliveredAt`/`completedAt`. Se o lançamento automático **não tem pagamentos**
e não está `CANCELLED`, é **removido** (evita faturar trabalho não entregue). Ao
reentregar, `onProjectDelivered` recria — sempre **um só** (`@unique`).

### `onProjectValueChanged(tx, project)`
Alteração de `value` sem mudança de status. Se existe lançamento auto: atualiza
`amount` e recalcula status vs. pago. `value → 0` sem pagamentos ⇒ `CANCELLED`.
Se não existe e o projeto já está `DELIVERED` com valor > 0 ⇒ cria agora.

### `onProjectCancelled(tx, project, policy)`
`policy = "keep"` → não mexe no financeiro (histórico preservado).
`policy = "cancel"` → lançamentos do projeto em `PENDING`/`PARTIAL` viram `CANCELLED`.
Via query `?financial=keep|cancel` (DELETE) ou `financialPolicy` no body (PUT/PATCH).

### `recomputeFinancialRecord(recordId, tx)` — `financial.service.ts`
Após qualquer insert/delete de `Payment` ou alteração de `amount`:
`paidAmount = Σ payments` → `status = deriveFinancialStatus(amount, paidAmount, status)`
→ `paidAt` (data do último pagamento se `PAID`, senão `null`) → **sincroniza
`Project.paymentStatus`** (`financialToPaymentStatus`). `CANCELLED` é preservado.

### Anti-duplicidade — resumo das garantias
| Cenário | Garantia |
|---------|----------|
| Mover ↔ várias vezes entre colunas | `autoSourceProjectId @unique` + upsert |
| Entregar → reabrir → reentregar | reabrir remove o auto sem pagamentos; reentregar recria 1 |
| Alterar valor várias vezes | sempre `update` do mesmo registro |
| Excluir projeto | `financialRecords` são **desanexados** (`projectId = null`), não deletados |

---

## 5. Dashboard e relatórios

### `GET /api/dashboard?month=&year=`
Agrega `financial_records` por **mês de referência** (`referenceMonth/Year`, status ≠ `CANCELLED`):

| Campo | Cálculo |
|-------|---------|
| `revenue.forecast` | Σ `amount` de INCOME |
| `revenue.received` | Σ `paidAmount` de INCOME |
| `revenue.pending` | `forecast − received` (≥ 0) |
| `expenses.total / paid / pending` | idem para EXPENSE |
| `netProfit` | `received − expenses.paid` |
| `projectedNetProfit` | `forecast − expenses.total` |
| `projects.delivered` | projetos com `deliveredAt` no mês |
| `projects.total` | projetos com `entryDate` no mês |
| `projects.inProgress` | snapshot: status ∉ {DELIVERED, CANCELLED} |
| `averageTicket` | `forecast / nº de lançamentos INCOME do mês` |

### `GET /api/dashboard/charts?months=6&year=`
Um único `groupBy(referenceYear, referenceMonth, type)` monta *buckets* mensais →
payloads prontos para Recharts/Chart.js:
1. **`monthlyRevenue`** — previsto × recebido × pendente por mês.
2. **`incomeVsExpense`** — receitas × despesas × líquido por mês.
3. **`projectsByStatus`** — snapshot atual (`count`, `value`) por status.
4. **`financialEvolution`** — acumulado (previsto/recebido) + líquido mensal.
5. **`monthComparison`** — mês atual × anterior (`change`, `changePct`).

### `GET /api/reports/monthly?month=&year=&clientId=`
Lista os **projetos entregues no mês** (`deliveredAt` no intervalo, status ≠ CANCELLED):
`cliente · projeto · valor · statusPagamento · recebido · pendente · dataEntrega`.
Resumo: `grossRevenue · totalReceived · totalPending · averageTicket · jobsCount`.

### `GET /api/reports/export/csv`
Colunas: `Data · Cliente · Projeto · Categoria · Tipo · Valor Total · Valor Recebido
· Valor Pendente · Status`. `text/csv; charset=utf-8` + BOM (Excel) + `Content-Disposition`.
`buildExportRows()` é format-agnostic: um exporter **XLSX/PDF** consome a mesma saída
(`utils/csv.ts` define o contrato `CsvColumn<Row>`).

---

## 6. Decisões e trade-offs

| Decisão | Motivo |
|---------|--------|
| **Route Handlers** em vez de backend separado | Menos infra; mesmo deploy do frontend futuro; `withAuth` centraliza auth/erros. |
| **Camada de serviço explícita** | Automações e transações não pertencem às rotas; reutilizável pelo seed e pelo `verify:flow`. |
| **`Decimal(12,2)`** para dinheiro | Sem erros de ponto flutuante; `utils/money.ts` converte para `number` só na borda (DTO). |
| **`referenceMonth/Year` além de datas** | Competência ≠ data de vencimento/pagamento; agregação de dashboard vira índice simples. |
| **`paidAmount` denormalizado** | Evita `SUM(payments)` em toda leitura; recalculado transacionalmente. |
| **Reabrir remove lançamento auto sem pagamento** | Cumpre "projeto só entra no financeiro quando entregue" sem criar duplicatas. |
| **Exclusão de projeto desanexa o financeiro** | Preserva histórico/relatórios de meses fechados. |
| **JWT session (sem tabela de sessão ativa)** | Stateless, compatível com serverless/Supabase pooler. |
| **Sem `middleware.ts`** | `auth()` com Credentials/bcrypt não roda no edge; `withAuth` protege cada rota no runtime Node. |
| **`autoSourceProjectId @unique` nullable** | Dedupe do lançamento automático no nível do banco, sem impedir lançamentos manuais para o mesmo projeto. |

---

## 7. Preparado para o frontend (próxima etapa)

- Next.js 15 + React 19 já instalados; **Tailwind** configurado com paleta do design
  de referência (tema escuro + acento esmeralda) em `tailwind.config.ts`.
- Todos os endpoints retornam DTOs serializados (números, ISO dates) — consumo direto.
- `GET /api/kanban/board` já entrega o quadro agrupado por coluna com os cards
  ordenados, pronto para uma lib de drag-and-drop.
- Envelope de resposta uniforme facilita um `fetcher`/react-query genérico.
