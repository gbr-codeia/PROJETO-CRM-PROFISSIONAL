# Deploy na Vercel — do zero

> O EDITFLOW CRM precisa de um **PostgreSQL hospedado** (não serve o Postgres da
> sua máquina). Sem isso, ou sem as variáveis de ambiente cadastradas **na Vercel**,
> o deploy quebra.

---

## ⚠️ Se seu build falhou com `P1001 ... 127.0.0.1:5432`

O log mostrava algo como:

```
Variáveis de ambiente carregadas do arquivo .env
Fonte de dados "db": ... em "127.0.0.1:5432"
Erro: P1001: Não foi possível acessar o servidor de banco de dados em `127.0.0.1:5432`
```

Duas coisas aconteceram:

1. **Um arquivo `.env` foi enviado no deploy** (com o endereço `127.0.0.1` da sua
   máquina). Isso só acontece quando o deploy **não** vem de um repositório Git
   limpo — normalmente `vercel` CLI enviando a pasta inteira.
2. **As variáveis de ambiente não estavam cadastradas na Vercel**, então o Prisma
   usou o `.env` enviado.

**Correção definitiva → faça o deploy pelo GitHub** (o `.env` está no `.gitignore`
e nunca entra no repositório) e **cadastre as variáveis na Vercel antes de fazer
o deploy**. Passos abaixo.

> O `build` já **não** acessa mais o banco (`prisma generate && next build`).
> As migrations você roda **uma vez, à parte** (Passo 4).

---

## Passo 1 — Banco PostgreSQL (grátis)

### Supabase
1. Crie um projeto em supabase.com.
2. *Project Settings → Database*, copie **dois** URLs:
   - **Connection pooling** (porta `6543`) → `DATABASE_URL`.
     Acrescente ao final: `?pgbouncer=true&connection_limit=1`
   - **Direct connection** (porta `5432`) → `DIRECT_URL`.

### Neon / Vercel Postgres
- Um único connection string. Use **o mesmo valor** em `DATABASE_URL` e `DIRECT_URL`.

---

## Passo 2 — Subir para o GitHub

O repositório Git já está inicializado (sem o `.env`).

```bash
cd "PROJETO CRM PROFISSIONAL"
# crie um repositório VAZIO no GitHub (sem README), e:
git remote add origin https://github.com/SEU_USUARIO/editflow-crm.git
git push -u origin main
```

Confirme no GitHub que **não existe** um arquivo `.env` no repositório.

---

## Passo 3 — Projeto na Vercel + variáveis

1. Se você já tem um projeto "editflow" quebrado na Vercel, **apague-o**
   (*Settings → Advanced → Delete Project*) — ele tem o `.env` velho embutido.
2. **Add New → Project → Import** o repositório do GitHub. Framework: *Next.js*
   (detectado sozinho). **NÃO clique em Deploy ainda.**
3. Abra **Environment Variables** e cadastre (marque **Production** e **Preview**):

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | URL do banco (Supabase: pooler `:6543` + `?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | URL direto `:5432` (Neon/Vercel PG: **igual** ao `DATABASE_URL`) |
| `AUTH_SECRET` | saída de `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXTAUTH_URL` | `https://SEU-PROJETO.vercel.app` |

4. Agora clique em **Deploy**.

---

## Passo 4 — Criar as tabelas no banco (uma vez)

Rode da sua máquina, apontando para o banco de **produção**:

```bash
cd "PROJETO CRM PROFISSIONAL"
DATABASE_URL="<URL_DIRETA_DE_PRODUCAO>" DIRECT_URL="<URL_DIRETA_DE_PRODUCAO>" \
  npx prisma migrate deploy
```

Saída esperada: `2 migrations ... applied`.

### (Opcional) dados de demonstração

```bash
DATABASE_URL="<URL_DIRETA_DE_PRODUCAO>" DIRECT_URL="<URL_DIRETA_DE_PRODUCAO>" \
  npm run db:seed
# login: editor@editflow.dev / editflow123
```

Se não rodar o seed, é só abrir a URL → **/login → "Criar conta"**.

---

## Passo 5 — Abrir

`https://SEU-PROJETO.vercel.app` → `/login`. Pronto.

Sempre que fizer `git push`, a Vercel refaz o deploy. Rode o Passo 4 de novo
**só quando criar novas migrations**.

---

## Tabela de erros (Vercel → Deployment → Logs)

| Log | Causa | Correção |
|-----|-------|----------|
| `P1001 ... 127.0.0.1:5432` + `carregadas do arquivo .env` | `.env` local foi para o deploy e não há variável na Vercel | deploy pelo **GitHub** + cadastrar variáveis (Passos 2–3) |
| `Environment variable not found: DATABASE_URL` / `DIRECT_URL` | variável não cadastrada | Passo 3 |
| `P1001` (outro host) | banco pausado / bloqueado | ative o projeto no Supabase; libere conexões |
| `relation "users" does not exist` | migrations não aplicadas | Passo 4 (`prisma migrate deploy`) |
| `MissingSecret` / `MIDDLEWARE_INVOCATION_FAILED` | `AUTH_SECRET` ausente | Passo 3 |
| `Query engine ... could not be found` | binário Prisma | já resolvido (`binaryTargets`); refaça o deploy |
| `too many connections` | conexões diretas em serverless | `DATABASE_URL` tem que ser o **pooler** (`:6543`) |

---

## Checklist

- [ ] Banco PostgreSQL hospedado, ativo
- [ ] Repositório no GitHub **sem** `.env`
- [ ] Projeto Vercel importado do GitHub (o antigo, se existir, apagado)
- [ ] 5 variáveis cadastradas (Production + Preview)
- [ ] Deploy feito **depois** das variáveis
- [ ] `npx prisma migrate deploy` rodado contra o banco de produção
- [ ] `/login` abre e consigo criar conta
