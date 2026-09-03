# Deploy na Vercel — do zero

> O EDITFLOW CRM precisa de um **PostgreSQL hospedado** (não serve o Postgres da
> sua máquina). Sem isso, ou sem as variáveis de ambiente, a Vercel devolve
> **500 / erro interno**.

O projeto **já está preparado**:

- `build` = `prisma generate && prisma migrate deploy && next build` → as tabelas
  são criadas no banco de produção automaticamente no primeiro deploy.
- `prisma/schema.prisma` com `binaryTargets` incluindo o runtime da Vercel.
- `.vercelignore` + `.gitignore` garantem que `.env`, `node_modules` e `.next`
  nunca sobem.

---

## Passo 1 — Banco PostgreSQL (grátis)

Escolha um:

### Supabase
1. Crie um projeto em supabase.com.
2. *Project Settings → Database* → copie **dois** URLs:
   - **Connection pooling** (porta `6543`) → será o `DATABASE_URL`.
     Acrescente ao final: `?pgbouncer=true&connection_limit=1`
   - **Direct connection** (porta `5432`) → será o `DIRECT_URL`.

### Neon  /  Vercel Postgres
- Um único connection string. Use **o mesmo valor** em `DATABASE_URL` e `DIRECT_URL`.

---

## Passo 2 — Subir o código

### Opção A — GitHub (recomendado)

```bash
cd "PROJETO CRM PROFISSIONAL"
git init
git add -A
git commit -m "EDITFLOW CRM"
git branch -M main
# crie um repo vazio no GitHub e:
git remote add origin https://github.com/SEU_USUARIO/editflow-crm.git
git push -u origin main
```

Na Vercel: **Add New → Project → Import** o repositório. Framework: *Next.js*
(detectado). **Não faça o primeiro deploy ainda** — configure as variáveis
(Passo 3) e só então "Deploy".

### Opção B — Vercel CLI

```bash
npm i -g vercel
cd "PROJETO CRM PROFISSIONAL"
vercel            # cria o projeto (responda as perguntas, aceite os padrões)
# configure as variáveis (Passo 3) e então:
vercel --prod
```

---

## Passo 3 — Variáveis de ambiente na Vercel

*Project → Settings → Environment Variables* — marque **Production** e **Preview**:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | URL do banco (Supabase: pooler `:6543` + `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | URL direto (Supabase: `:5432`; Neon/Vercel PG: igual ao `DATABASE_URL`) |
| `AUTH_SECRET` | resultado de `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXTAUTH_URL` | `https://SEU-PROJETO.vercel.app` (ajuste depois do 1º deploy se o domínio mudar) |

As três de baixo **também** são necessárias — não pule.

---

## Passo 4 — Deploy

- GitHub: clique **Deploy** (ou faça um `git push`).
- CLI: `vercel --prod`.

O build roda `prisma migrate deploy` e cria todas as tabelas. Ao abrir a URL:
vá em **/login → "Criar conta"** e comece a usar.

### (Opcional) dados de demonstração

Rodando da sua máquina, apontando para o banco de produção:

```bash
DATABASE_URL="<url_direta_de_producao>" DIRECT_URL="<url_direta_de_producao>" npm run db:seed
# login: editor@editflow.dev / editflow123
```

---

## Se der erro — leia os logs

**Vercel → Deployment → Logs**. Correspondência:

| Log | Causa | Correção |
|-----|-------|----------|
| `Environment variable not found: DATABASE_URL` / `DIRECT_URL` | variável não cadastrada | Passo 3 |
| `Can't reach database server at 127.0.0.1` | `DATABASE_URL` local | use o URL do banco hospedado |
| `Can't reach database server` (outro host) | banco pausado / IP bloqueado | ative o projeto no Supabase; permita conexões |
| `relation "users" does not exist` | migrations não aplicadas | garanta que o build rodou `prisma migrate deploy` (já está no script) |
| `MissingSecret` / `Please define a secret` | `AUTH_SECRET` ausente | Passo 3 |
| `Query engine ... could not be found` | binário Prisma | já resolvido (`binaryTargets`); refaça o deploy |
| `too many connections` / `sorry, too many clients` | conexões diretas em serverless | `DATABASE_URL` tem que ser o **pooler** (Supabase `:6543`) |
| `MIDDLEWARE_INVOCATION_FAILED` | quase sempre `AUTH_SECRET` ausente | Passo 3 |

---

## Checklist

- [ ] Banco PostgreSQL hospedado criado e ativo
- [ ] `DATABASE_URL` **não** aponta para `localhost`
- [ ] `DIRECT_URL` cadastrada (mesmo valor do `DATABASE_URL` se o provedor não separa)
- [ ] `AUTH_SECRET`, `AUTH_TRUST_HOST`, `NEXTAUTH_URL` cadastradas
- [ ] Variáveis marcadas para **Production** e **Preview**
- [ ] Deploy feito **depois** de cadastrar as variáveis
- [ ] Consegui criar conta em `/login`
