import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed: one demo user with a realistic 6-month history so the dashboard,
 * charts and monthly reports have data to render.
 *
 * Run with:  npm run db:seed
 */
const prisma = new PrismaClient();

const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "editor@editflow.dev";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "editflow123";
const SEED_NAME = process.env.SEED_USER_NAME ?? "Editor Demo";

const DEFAULT_COLUMNS = [
  { name: "Novos Projetos", slug: "novos-projetos", color: "#64748b", isDeliveredColumn: false },
  { name: "Aguardando Material", slug: "aguardando-material", color: "#f59e0b", isDeliveredColumn: false },
  { name: "Em Edição", slug: "em-edicao", color: "#3b82f6", isDeliveredColumn: false },
  { name: "Revisão", slug: "revisao", color: "#a855f7", isDeliveredColumn: false },
  { name: "Ajustes", slug: "ajustes", color: "#ef4444", isDeliveredColumn: false },
  { name: "Entregue", slug: "entregue", color: "#22e0a1", isDeliveredColumn: true },
];

function monthsAgo(n: number, day = 12): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, day, 12, 0, 0));
}
function ref(d: Date) {
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}
const D = (v: number) => new Prisma.Decimal(v);

async function main() {
  console.log("→ Seeding EDITFLOW CRM…");

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: SEED_EMAIL },
    update: { name: SEED_NAME, passwordHash },
    create: { email: SEED_EMAIL, name: SEED_NAME, passwordHash },
  });
  console.log(`  user: ${user.email} (id=${user.id})`);

  // Clean previous demo data for an idempotent seed.
  await prisma.payment.deleteMany({ where: { financialRecord: { userId: user.id } } });
  await prisma.financialRecord.deleteMany({ where: { userId: user.id } });
  await prisma.activity.deleteMany({ where: { userId: user.id } });
  await prisma.projectKanban.deleteMany({ where: { project: { userId: user.id } } });
  await prisma.project.deleteMany({ where: { userId: user.id } });
  await prisma.kanbanColumn.deleteMany({ where: { userId: user.id } });
  await prisma.client.deleteMany({ where: { userId: user.id } });

  // Kanban board
  const columns = await Promise.all(
    DEFAULT_COLUMNS.map((c, i) =>
      prisma.kanbanColumn.create({
        data: { ...c, userId: user.id, position: i, isDefault: true },
      }),
    ),
  );
  const col = (slug: string) => columns.find((c) => c.slug === slug)!;
  console.log(`  kanban: ${columns.length} colunas`);

  // Clients
  const clientsData = [
    { name: "Empresa Alpha", companyName: "Alpha Comunicação Ltda", email: "contato@alpha.com", phone: "+55 11 3000-1000", whatsapp: "+55 11 90000-1000", instagram: "alpha.oficial" },
    { name: "Clínica Vital", companyName: "Clínica Vital Saúde", email: "marketing@clinicavital.com", phone: "+55 21 3222-4444", whatsapp: "+55 21 98888-4444", instagram: "clinicavital" },
    { name: "Agência Next", companyName: "Next Creative Agency", email: "projetos@agencianext.com", phone: "+55 11 4004-2020", whatsapp: "+55 11 97777-2020", instagram: "agencia.next" },
    { name: "João Silva", companyName: null, email: "joao.silva@gmail.com", phone: "+55 31 99999-1234", whatsapp: "+55 31 99999-1234", instagram: "joaosilva.filma" },
    { name: "Studio XYZ", companyName: "Studio XYZ Produções", email: "falecom@studioxyz.com", phone: "+55 47 3333-7777", whatsapp: "+55 47 96666-7777", instagram: "studioxyz" },
  ];
  const clients = await Promise.all(
    clientsData.map((c) => prisma.client.create({ data: { ...c, userId: user.id } })),
  );
  const client = (name: string) => clients.find((c) => c.name === name)!;
  console.log(`  clients: ${clients.length}`);

  // ── Active projects spread across the board ──────────────────
  const activePlan: Array<{
    title: string;
    client: string;
    columnSlug: string;
    status: "NEW" | "WAITING_MATERIAL" | "EDITING" | "REVIEW" | "ADJUSTMENTS";
    value: number;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    projectType: string;
  }> = [
    { title: "Campanha Institucional 2026", client: "Empresa Alpha", columnSlug: "novos-projetos", status: "NEW", value: 4200, priority: "HIGH", projectType: "Edição de Vídeo" },
    { title: "Série de Reels — Saúde da Mulher", client: "Clínica Vital", columnSlug: "aguardando-material", status: "WAITING_MATERIAL", value: 1800, priority: "MEDIUM", projectType: "Edição de Vídeo" },
    { title: "Aftermovie Evento Next", client: "Agência Next", columnSlug: "em-edicao", status: "EDITING", value: 3500, priority: "HIGH", projectType: "Filmagem e Edição" },
    { title: "Vlog Pessoal — Ep. 07", client: "João Silva", columnSlug: "em-edicao", status: "EDITING", value: 650, priority: "LOW", projectType: "Edição de Vídeo" },
    { title: "Clipe Musical — Studio XYZ", client: "Studio XYZ", columnSlug: "revisao", status: "REVIEW", value: 5200, priority: "URGENT", projectType: "Projeto Especial" },
    { title: "VSL Produto Alpha", client: "Empresa Alpha", columnSlug: "ajustes", status: "ADJUSTMENTS", value: 2900, priority: "MEDIUM", projectType: "Edição de Vídeo" },
  ];

  for (const [i, p] of activePlan.entries()) {
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        clientId: client(p.client).id,
        title: p.title,
        projectType: p.projectType,
        value: D(p.value),
        status: p.status,
        priority: p.priority,
        paymentStatus: "PENDING",
        entryDate: monthsAgo(0, 2 + i),
        deadline: monthsAgo(-1, 15),
      },
    });
    await prisma.projectKanban.create({
      data: { projectId: project.id, columnId: col(p.columnSlug).id, position: i },
    });
    await prisma.activity.create({
      data: {
        userId: user.id,
        projectId: project.id,
        action: "PROJECT_CREATED",
        description: `Projeto "${project.title}" criado`,
      },
    });
  }
  console.log(`  active projects: ${activePlan.length}`);

  // ── Delivered projects over the last 6 months (with auto financial records) ──
  const deliveredPlan: Array<{
    title: string;
    client: string;
    value: number;
    monthsAgo: number;
    category: string;
    pay: "PENDING" | "PARTIAL" | "PAID";
    partial?: number;
  }> = [
    { title: "Vídeo Institucional Empresa Alpha", client: "Empresa Alpha", value: 2500, monthsAgo: 5, category: "Edição de Vídeo", pay: "PAID" },
    { title: "Depoimentos de Pacientes — Vital", client: "Clínica Vital", value: 1600, monthsAgo: 5, category: "Edição de Vídeo", pay: "PAID" },
    { title: "Reels Institucional Next", client: "Agência Next", value: 2200, monthsAgo: 4, category: "Edição de Vídeo", pay: "PARTIAL", partial: 1000 },
    { title: "Cobertura Casamento — João", client: "João Silva", value: 3800, monthsAgo: 4, category: "Filmagem", pay: "PAID" },
    { title: "Teaser Lançamento — Studio XYZ", client: "Studio XYZ", value: 1500, monthsAgo: 3, category: "Projeto Especial", pay: "PAID" },
    { title: "Vídeo Clínica XYZ", client: "Clínica Vital", value: 2500, monthsAgo: 3, category: "Edição de Vídeo", pay: "PENDING" },
    { title: "Motion Graphics — Alpha", client: "Empresa Alpha", value: 3200, monthsAgo: 2, category: "Projeto Especial", pay: "PARTIAL", partial: 1600 },
    { title: "Ensaio Fotográfico Produto", client: "Studio XYZ", value: 900, monthsAgo: 2, category: "Fotografia", pay: "PAID" },
    { title: "Podcast Multicam — Ep. 12", client: "Agência Next", value: 1750, monthsAgo: 1, category: "Edição de Vídeo", pay: "PAID" },
    { title: "Vídeo Recrutamento Vital", client: "Clínica Vital", value: 2100, monthsAgo: 1, category: "Edição de Vídeo", pay: "PENDING" },
    { title: "Aftermovie Workshop", client: "Agência Next", value: 1400, monthsAgo: 0, category: "Edição de Vídeo", pay: "PARTIAL", partial: 700 },
  ];

  let deliveredCount = 0;
  for (const [i, p] of deliveredPlan.entries()) {
    const delivered = monthsAgo(p.monthsAgo, 10);
    const r = ref(delivered);
    const paid =
      p.pay === "PAID" ? p.value : p.pay === "PARTIAL" ? (p.partial ?? p.value / 2) : 0;
    const status = p.pay === "PAID" ? "PAID" : p.pay === "PARTIAL" ? "PARTIAL" : "PENDING";

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        clientId: client(p.client).id,
        title: p.title,
        projectType: p.category,
        value: D(p.value),
        status: "DELIVERED",
        priority: "MEDIUM",
        paymentStatus: p.pay,
        entryDate: monthsAgo(p.monthsAgo + 1, 20),
        deadline: monthsAgo(p.monthsAgo, 5),
        deliveredAt: delivered,
        completedAt: delivered,
      },
    });
    await prisma.projectKanban.create({
      data: { projectId: project.id, columnId: col("entregue").id, position: i },
    });

    const record = await prisma.financialRecord.create({
      data: {
        userId: user.id,
        projectId: project.id,
        clientId: project.clientId,
        type: "INCOME",
        category: p.category,
        description: project.title,
        amount: D(p.value),
        paidAmount: D(paid),
        status,
        referenceMonth: r.month,
        referenceYear: r.year,
        dueDate: delivered,
        paidAt: p.pay === "PAID" ? delivered : null,
        paymentMethod: "PIX",
        autoGenerated: true,
        autoSourceProjectId: project.id,
      },
    });

    if (paid > 0) {
      await prisma.payment.create({
        data: {
          financialRecordId: record.id,
          amount: D(paid),
          paymentDate: p.pay === "PAID" ? delivered : monthsAgo(p.monthsAgo, 18),
          paymentMethod: "PIX",
          notes: p.pay === "PARTIAL" ? "Entrada (50%)" : "Pagamento integral",
        },
      });
    }

    await prisma.activity.createMany({
      data: [
        { userId: user.id, projectId: project.id, action: "PROJECT_DELIVERED", description: `Projeto "${project.title}" entregue` },
        { userId: user.id, projectId: project.id, action: "FINANCIAL_CREATED", description: `Lançamento automático criado (${r.month}/${r.year})` },
      ],
    });
    deliveredCount++;
  }
  console.log(`  delivered projects + auto income: ${deliveredCount}`);

  // ── Recurring expenses across the last 6 months ─────────────
  const expenseTemplates = [
    { category: "Assinaturas", description: "Adobe Creative Cloud", amount: 320 },
    { category: "Software", description: "Frame.io / plugins", amount: 90 },
    { category: "Assinaturas", description: "Armazenamento em nuvem", amount: 55 },
  ];
  const oneOffExpenses = [
    { category: "Equipamentos", description: "SSD externo 2TB", amount: 780, monthsAgo: 4 },
    { category: "Freelancer", description: "Motion designer (freela)", amount: 1200, monthsAgo: 3 },
    { category: "Marketing", description: "Tráfego pago — portfólio", amount: 400, monthsAgo: 2 },
    { category: "Transporte", description: "Deslocamento gravação externa", amount: 260, monthsAgo: 1 },
  ];

  let expenseCount = 0;
  for (let m = 5; m >= 0; m--) {
    const d = monthsAgo(m, 5);
    const r = ref(d);
    for (const t of expenseTemplates) {
      await prisma.financialRecord.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          category: t.category,
          description: t.description,
          amount: D(t.amount),
          paidAmount: D(t.amount),
          status: "PAID",
          referenceMonth: r.month,
          referenceYear: r.year,
          dueDate: d,
          paidAt: d,
          paymentMethod: "Cartão de crédito",
        },
      });
      expenseCount++;
    }
  }
  for (const e of oneOffExpenses) {
    const d = monthsAgo(e.monthsAgo, 8);
    const r = ref(d);
    await prisma.financialRecord.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        category: e.category,
        description: e.description,
        amount: D(e.amount),
        paidAmount: D(e.amount),
        status: "PAID",
        referenceMonth: r.month,
        referenceYear: r.year,
        dueDate: d,
        paidAt: d,
        paymentMethod: "PIX",
      },
    });
    expenseCount++;
  }
  console.log(`  expenses: ${expenseCount}`);

  const counts = {
    clients: await prisma.client.count({ where: { userId: user.id } }),
    projects: await prisma.project.count({ where: { userId: user.id } }),
    financial: await prisma.financialRecord.count({ where: { userId: user.id } }),
    payments: await prisma.payment.count({ where: { financialRecord: { userId: user.id } } }),
  };
  console.log("✔ Seed concluído:", counts);
  console.log(`\n  Login:  ${SEED_EMAIL}  /  ${SEED_PASSWORD}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
