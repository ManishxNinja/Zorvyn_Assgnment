import { prisma } from "../lib/prisma.js";
import type { User } from "@prisma/client";
import type { EntryType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { dashboardUserFilter } from "./policies.js";

function dateRangeWhere(
  user: User,
  from?: Date,
  to?: Date,
): Prisma.FinancialRecordWhereInput {
  const scope = dashboardUserFilter(user);
  const dateFilter: Prisma.FinancialRecordWhereInput =
    from || to
      ? {
          entryDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};
  return { ...scope, ...dateFilter };
}

export async function getSummary(
  user: User,
  from?: Date,
  to?: Date,
): Promise<{ totalIncome: string; totalExpense: string; net: string }> {
  const where = dateRangeWhere(user, from, to);

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: { ...where, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.aggregate({
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const income = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
  const expense = expenseAgg._sum.amount ?? new Prisma.Decimal(0);
  const net = income.minus(expense);

  return {
    totalIncome: income.toFixed(2),
    totalExpense: expense.toFixed(2),
    net: net.toFixed(2),
  };
}

export async function getByCategory(
  user: User,
  from?: Date,
  to?: Date,
): Promise<{ category: string; type: EntryType; total: string }[]> {
  const where = dateRangeWhere(user, from, to);

  const rows = await prisma.financialRecord.groupBy({
    by: ["category", "type"],
    where,
    _sum: { amount: true },
  });

  return rows
    .map((r) => ({
      category: r.category,
      type: r.type,
      total: (r._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export type Granularity = "week" | "month";

export async function getTrends(
  user: User,
  granularity: Granularity,
  from: Date,
  to: Date,
): Promise<{ periodStart: string; income: string; expense: string; net: string }[]> {
  const scope = dashboardUserFilter(user);
  const userClause = scope.userId
    ? Prisma.sql`AND fr.user_id = ${scope.userId}`
    : Prisma.empty;

  const bucketExpr =
    granularity === "week"
      ? Prisma.sql`date_trunc('week', fr.entry_date::timestamp)`
      : Prisma.sql`date_trunc('month', fr.entry_date::timestamp)`;

  const rows = await prisma.$queryRaw<
    { bucket: Date; income: Prisma.Decimal; expense: Prisma.Decimal }[]
  >(
    Prisma.sql`
      SELECT
        ${bucketExpr} AS bucket,
        COALESCE(SUM(CASE WHEN fr.type = 'INCOME' THEN fr.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN fr.type = 'EXPENSE' THEN fr.amount ELSE 0 END), 0) AS expense
      FROM financial_records fr
      WHERE fr.entry_date >= ${from}::date
        AND fr.entry_date <= ${to}::date
        ${userClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  );

  return rows.map((r) => {
    const income = r.income ?? new Prisma.Decimal(0);
    const expense = r.expense ?? new Prisma.Decimal(0);
    const net = income.minus(expense);
    return {
      periodStart: r.bucket.toISOString().slice(0, 10),
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      net: net.toFixed(2),
    };
  });
}

export async function getRecent(
  user: User,
  limit: number,
): Promise<
  {
    id: string;
    amount: string;
    type: EntryType;
    category: string;
    entryDate: string;
    notes: string | null;
    userId: string;
  }[]
> {
  const scope = dashboardUserFilter(user);
  const rows = await prisma.financialRecord.findMany({
    where: Object.keys(scope).length ? scope : undefined,
    orderBy: { entryDate: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    amount: r.amount.toFixed(2),
    type: r.type,
    category: r.category,
    entryDate: r.entryDate.toISOString().slice(0, 10),
    notes: r.notes,
    userId: r.userId,
  }));
}
